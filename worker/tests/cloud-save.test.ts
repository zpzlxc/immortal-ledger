import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const origin = 'http://localhost:5173';
const password = 'test-password-123';
const state = {
  schemaVersion: 18, character: { name: '测试' },
  inventory: { spiritStones: 1, herbs: 2, techniqueFragments: 3, healingPills: 4 }, ledger: [],
};
let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare['getD1Database']>>;
const request = async (path: string, method = 'GET', body?: unknown, token?: string) => {
  const response = await mf.dispatchFetch(`https://example.com/api${path}`, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, headers: response.headers, body: await response.json() as any };
};

describe('Worker auth and cloud saves (real workerd + D1)', () => {
  beforeAll(async () => {
    mf = new Miniflare(convertV4MiniflareOptions({
      modules: true,
      script: stripTypeScriptTypes(readFileSync('worker/src/index.ts', 'utf8'), { mode: 'transform' }),
      compatibilityDate: '2026-08-28',
      d1Databases: ['DB'], bindings: { ALLOWED_ORIGIN: origin },
    }));
    db = await mf.getD1Database('DB');
    const migration = readFileSync('worker/migrations/0001_cloud_saves.sql', 'utf8');
    await db.batch(migration.split(';').filter(sql => sql.trim()).map(sql => db.prepare(sql)));
  });
  afterAll(async () => { await mf?.dispose(); });

  it('reports database readiness and handles preflight', async () => {
    expect((await request('/health')).body.database).toBe('ok');
    const preflight = await mf.dispatchFetch('https://example.com/api/auth/register', { method: 'OPTIONS', headers: { Origin: origin } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });

  it('rejects malformed payloads without internal errors', async () => {
    for (const body of [null, [], 'bad', {}, { username: 'aa', password }]) {
      expect((await request('/auth/register', 'POST', body)).status).toBe(400);
    }
  });

  it('registers with a Workers-compatible hash, authenticates and logs out', async () => {
    const registered = await request('/auth/register', 'POST', { username: ' TestUser ', password });
    expect(registered.status).toBe(201);
    expect(registered.body.user.username).toBe('testuser');
    expect(registered.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    const row = await db.prepare('SELECT password_hash, password_salt FROM players WHERE username = ?').bind('testuser').first<any>();
    // Local workerd may allow larger counts; enforce the production ceiling independently.
    expect(row.password_hash).toBe(pbkdf2Sync(password, Buffer.from(row.password_salt, 'hex'), 100_000, 32, 'sha256').toString('hex'));
    expect((await request('/auth/register', 'POST', { username: 'TESTUSER', password })).status).toBe(409);
    expect((await request('/auth/login', 'POST', { username: 'testuser', password: 'wrong-password' })).status).toBe(401);
    const login = await request('/auth/login', 'POST', { username: 'testuser', password });
    expect(login.status).toBe(200);
    expect((await request('/auth/me', 'GET', undefined, login.body.token)).body.user).toEqual(registered.body.user);
    expect((await request('/auth/logout', 'POST', undefined, login.body.token)).status).toBe(200);
    expect((await request('/save', 'GET', undefined, login.body.token)).status).toBe(401);
  });

  it('rolls back the account when session insertion fails, allowing retry', async () => {
    await db.prepare("CREATE TRIGGER fail_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'injected session failure'); END").run();
    try {
      expect((await request('/auth/register', 'POST', { username: 'retry-user', password })).status).toBe(503);
      expect(await db.prepare("SELECT id FROM players WHERE username = 'retry-user'").first()).toBeNull();
    } finally {
      await db.prepare('DROP TRIGGER fail_session').run();
    }
    expect((await request('/auth/register', 'POST', { username: 'retry-user', password })).status).toBe(201);
  });

  it('round-trips saves, isolates accounts, and rejects stale or concurrent revisions', async () => {
    const { body: { token } } = await request('/auth/register', 'POST', { username: 'save-user', password });
    expect((await request('/save', 'GET', undefined, token)).body.save).toBeNull();
    const first = await request('/save', 'PUT', { expectedRevision: 0, state }, token);
    expect(first.status).toBe(200);
    expect(first.body.save.revision).toBe(1);
    expect((await request('/save', 'GET', undefined, token)).body.save.state).toEqual(state);
    expect((await request('/save', 'PUT', { expectedRevision: 0, state }, token)).status).toBe(409);
    const concurrent = await Promise.all([1, 2].map(n => request('/save', 'PUT', { expectedRevision: 1, state: { ...state, ledger: [n] } }, token)));
    expect(concurrent.map(r => r.status).sort()).toEqual([200, 409]);
    const saved = (await request('/save', 'GET', undefined, token)).body.save;
    expect(saved.revision).toBe(2);
    const history = await db.prepare('SELECT state_json FROM game_save_history WHERE revision = 2').first<any>();
    expect(JSON.parse(history.state_json)).toEqual(saved.state);
    const other = await request('/auth/login', 'POST', { username: 'testuser', password });
    expect((await request('/save', 'GET', undefined, other.body.token)).body.save).toBeNull();
    expect((await request('/save')).status).toBe(401);
    expect((await request('/save', 'PUT', { state: { ...state, schemaVersion: 999 } }, token)).status).toBe(422);
  });
});
