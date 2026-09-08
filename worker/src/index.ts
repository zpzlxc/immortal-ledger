interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ALLOWED_ORIGIN?: string;
}

type PlayerRow = {
  id: string;
  username: string;
};

type SessionRow = PlayerRow & {
  expires_at: number;
};

type SaveRow = {
  revision: number;
  schema_version: number;
  state_json: string;
  created_at: number;
  updated_at: number;
};

type SaveResponse = {
  revision: number;
  schemaVersion: number;
  state: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

const MAX_SAVE_BYTES = 1_000_000;
const MAX_SUPPORTED_SCHEMA_VERSION = 18;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
// Cloudflare Workers rejects PBKDF2 iteration counts above 100,000.
const PASSWORD_ITERATIONS = 100_000;
const REQUIRED_TABLES = ['players', 'sessions', 'game_saves', 'game_save_history'] as const;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const textEncoder = new TextEncoder();

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes)
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const hexToBytes = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const randomHex = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

const derivePasswordHash = async (password: string, saltHex: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations: PASSWORD_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
};

const jsonResponse = (body: unknown, status = 200) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  },
);

const corsResponse = (request: Request, env: Env, response: Response) => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin = origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))
    ? origin
    : null;
  const headers = new Headers(response.headers);
  if (allowOrigin) {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Max-Age', '86400');
    headers.set('Vary', 'Origin');
  }
  return new Response(response.body, { status: response.status, headers });
};

const parseJsonBody = async <T>(request: Request): Promise<T> => {
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_SAVE_BYTES + 100_000) {
    throw new HttpError(413, '请求体过大');
  }
  const raw = await request.text();
  if (raw.length > MAX_SAVE_BYTES + 100_000) throw new HttpError(413, '请求体过大');
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected a JSON object');
    }
    return parsed as T;
  } catch {
    throw new HttpError(400, '请求不是有效 JSON');
  }
};

const normalizeUsername = (value: unknown) => {
  if (typeof value !== 'string') throw new HttpError(400, '用户名不能为空');
  const username = value.trim().toLowerCase();
  if (username.length < 3 || username.length > 64 || /[\s/]/u.test(username)) {
    throw new HttpError(400, '用户名需要是 3–64 位且不能包含空格或斜杠');
  }
  return username;
};

const readPassword = (value: unknown) => {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new HttpError(400, '密码需要是 8–128 位');
  }
  return value;
};

const readSlot = (value: unknown) => {
  const slot = typeof value === 'string' && value.trim() ? value.trim() : 'default';
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(slot)) throw new HttpError(400, '存档槽位名称无效');
  return slot;
};

const readSaveState = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(422, '存档状态必须是对象');
  }
  const state = value as Record<string, unknown>;
  const schemaVersion = Number(state.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > MAX_SUPPORTED_SCHEMA_VERSION) {
    throw new HttpError(422, '存档版本不受当前 Worker 支持');
  }
  if (!state.character || typeof state.character !== 'object') {
    throw new HttpError(422, '存档缺少角色状态');
  }
  if (!state.inventory || typeof state.inventory !== 'object') {
    throw new HttpError(422, '存档缺少背包状态');
  }
  if (!Array.isArray(state.ledger)) throw new HttpError(422, '存档缺少长生簿记录');
  const inventory = state.inventory as Record<string, unknown>;
  for (const key of ['spiritStones', 'herbs', 'techniqueFragments', 'healingPills']) {
    const amount = Number(inventory[key]);
    if (!Number.isFinite(amount) || amount < 0) throw new HttpError(422, `资源字段 ${key} 无效`);
  }
  const stateJson = JSON.stringify(state);
  if (new TextEncoder().encode(stateJson).byteLength > MAX_SAVE_BYTES) {
    throw new HttpError(413, '存档超过 1 MB 限制');
  }
  return { state, stateJson, schemaVersion };
};

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get('Authorization') ?? '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
};

const requirePlayer = async (request: Request, env: Env): Promise<PlayerRow> => {
  const token = getBearerToken(request);
  if (!token || token.length < 32) throw new HttpError(401, '请先登录云存档');
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT players.id, players.username, sessions.expires_at
     FROM sessions JOIN players ON players.id = sessions.player_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  ).bind(tokenHash, Date.now()).first<SessionRow>();
  if (!row) throw new HttpError(401, '云存档登录已过期，请重新登录');
  return { id: row.id, username: row.username };
};

const createSession = async (env: Env, playerId: string) => {
  const token = randomHex(32);
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, player_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(await sha256Hex(token), playerId, now, now + SESSION_TTL_MS).run();
  return token;
};

const handleHealth = async (env: Env) => {
  try {
    const result = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?, ?, ?)",
    ).bind(...REQUIRED_TABLES).all<{ name: string }>();
    const tables = result.results.map((row) => row.name).sort();
    const ready = REQUIRED_TABLES.every((table) => tables.includes(table));
    return jsonResponse({
      ok: ready,
      service: 'immortal-ledger-save',
      database: ready ? 'ok' : 'schema_missing',
      tables,
    }, ready ? 200 : 503);
  } catch (error) {
    console.error('D1 health check failed', error);
    return jsonResponse({
      ok: false,
      service: 'immortal-ledger-save',
      database: 'unavailable',
    }, 503);
  }
};

const authPayload = (player: PlayerRow, token: string) => ({
  token,
  user: { id: player.id, username: player.username },
});

const handleRegister = async (request: Request, env: Env) => {
  const body = await parseJsonBody<{ username?: unknown; password?: unknown }>(request);
  const username = normalizeUsername(body.username);
  const password = readPassword(body.password);
  let existing: { id: string } | null;
  try {
    existing = await env.DB.prepare('SELECT id FROM players WHERE username = ?').bind(username).first<{ id: string }>();
  } catch (error) {
    console.error('Register player lookup failed', error);
    throw new HttpError(503, '云存档数据库不可用，请稍后重试');
  }
  if (existing) throw new HttpError(409, '用户名已经存在');

  const player: PlayerRow = { id: crypto.randomUUID(), username };
  const salt = randomHex(16);
  const passwordHash = await derivePasswordHash(password, salt);
  const token = randomHex(32);
  const now = Date.now();
  const tokenHash = await sha256Hex(token);
  try {
    // D1 batches are transactional: a failed session must not leave an account behind.
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO players (id, username, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(player.id, player.username, passwordHash, salt, now),
      env.DB.prepare(
        'INSERT INTO sessions (token_hash, player_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      ).bind(tokenHash, player.id, now, now + SESSION_TTL_MS),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: players.username')) {
      throw new HttpError(409, '用户名已经存在');
    }
    console.error('Register transaction failed', error);
    throw new HttpError(503, '云存档账号创建失败，请稍后重试');
  }
  return jsonResponse(authPayload(player, token), 201);
};

const handleLogin = async (request: Request, env: Env) => {
  const body = await parseJsonBody<{ username?: unknown; password?: unknown }>(request);
  const username = normalizeUsername(body.username);
  const password = readPassword(body.password);
  const row = await env.DB.prepare(
    'SELECT id, username, password_hash, password_salt FROM players WHERE username = ?',
  ).bind(username).first<{ id: string; username: string; password_hash: string; password_salt: string }>();
  if (!row) throw new HttpError(401, '用户名或密码错误');
  const passwordHash = await derivePasswordHash(password, row.password_salt);
  if (passwordHash !== row.password_hash) throw new HttpError(401, '用户名或密码错误');
  const player = { id: row.id, username: row.username };
  const token = await createSession(env, player.id);
  return jsonResponse(authPayload(player, token));
};

const handleMe = async (request: Request, env: Env) => {
  const player = await requirePlayer(request, env);
  return jsonResponse({ user: player });
};

const handleLogout = async (request: Request, env: Env) => {
  const token = getBearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return jsonResponse({ ok: true });
};

const saveResponse = (row: SaveRow) => ({
  revision: row.revision,
  schemaVersion: row.schema_version,
  state: JSON.parse(row.state_json) as Record<string, unknown>,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getCurrentSave = async (env: Env, playerId: string, slot: string) => env.DB.prepare(
  'SELECT revision, schema_version, state_json, created_at, updated_at FROM game_saves WHERE player_id = ? AND slot = ?',
).bind(playerId, slot).first<SaveRow>();

const conflictResponse = (row: SaveRow | null) => jsonResponse({
  error: '云端存档已经更新，请先同步最新版本',
  save: row ? saveResponse(row) : null,
}, 409);

const handleGetSave = async (request: Request, env: Env) => {
  const player = await requirePlayer(request, env);
  const slot = readSlot(new URL(request.url).searchParams.get('slot'));
  const row = await getCurrentSave(env, player.id, slot);
  return jsonResponse({ save: row ? saveResponse(row) : null, serverTime: Date.now() });
};

const handlePutSave = async (request: Request, env: Env) => {
  const player = await requirePlayer(request, env);
  const body = await parseJsonBody<{ slot?: unknown; expectedRevision?: unknown; state?: unknown }>(request);
  const slot = readSlot(body.slot);
  const expectedRevision = Number(body.expectedRevision ?? 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new HttpError(400, '存档版本号无效');
  }
  const { state, stateJson, schemaVersion } = readSaveState(body.state);
  const current = await getCurrentSave(env, player.id, slot);
  if (!current && expectedRevision !== 0) return conflictResponse(null);
  if (current && current.revision !== expectedRevision) return conflictResponse(current);

  const now = Date.now();
  const nextRevision = expectedRevision + 1;
  const statements = current
    ? [
      env.DB.prepare(
        `UPDATE game_saves
         SET revision = ?, schema_version = ?, state_json = ?, updated_at = ?
         WHERE player_id = ? AND slot = ? AND revision = ?`,
      ).bind(nextRevision, schemaVersion, stateJson, now, player.id, slot, expectedRevision),
      env.DB.prepare(
        `INSERT INTO game_save_history
         (player_id, slot, revision, schema_version, state_json, saved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(player.id, slot, nextRevision, schemaVersion, stateJson, now),
      env.DB.prepare(
        'DELETE FROM game_save_history WHERE player_id = ? AND slot = ? AND revision <= ?',
      ).bind(player.id, slot, Math.max(0, nextRevision - 30)),
    ]
    : [
      env.DB.prepare(
        `INSERT INTO game_saves
         (player_id, slot, revision, schema_version, state_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(player.id, slot, nextRevision, schemaVersion, stateJson, now, now),
      env.DB.prepare(
        `INSERT INTO game_save_history
         (player_id, slot, revision, schema_version, state_json, saved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(player.id, slot, nextRevision, schemaVersion, stateJson, now),
    ];
  try {
    const results = await env.DB.batch(statements);
    if (current && results[0]?.meta.changes !== 1) {
      return conflictResponse(await getCurrentSave(env, player.id, slot));
    }
  } catch (error) {
    const latest = await getCurrentSave(env, player.id, slot);
    if (latest && latest.revision !== expectedRevision) return conflictResponse(latest);
    if (!current && latest) return conflictResponse(latest);
    throw error;
  }
  const saved: SaveRow = {
    revision: nextRevision,
    schema_version: schemaVersion,
    state_json: JSON.stringify(state),
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
  return jsonResponse({ save: saveResponse(saved) });
};

const routeApi = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return handleHealth(env);
  }
  if (url.pathname === '/api/auth/register' && request.method === 'POST') return handleRegister(request, env);
  if (url.pathname === '/api/auth/login' && request.method === 'POST') return handleLogin(request, env);
  if (url.pathname === '/api/auth/me' && request.method === 'GET') return handleMe(request, env);
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env);
  if (url.pathname === '/api/save' && request.method === 'GET') return handleGetSave(request, env);
  if (url.pathname === '/api/save' && request.method === 'PUT') return handlePutSave(request, env);
  throw new HttpError(404, '接口不存在');
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return corsResponse(request, env, await routeApi(request, env));
      } catch (error) {
        if (error instanceof HttpError) {
          return corsResponse(request, env, jsonResponse({ error: error.message, details: error.details }, error.status));
        }
        console.error(error);
        return corsResponse(request, env, jsonResponse({ error: '云存档服务内部错误' }, 500));
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
