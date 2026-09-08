import type { GameState } from './game/types';

const CLOUD_SESSION_KEY = 'immortal-ledger-cloud-session-v1';
const configuredApiUrl = import.meta.env.VITE_CLOUD_SAVE_API_URL?.trim() ?? '';
const API_BASE_URL = (configuredApiUrl || '/api').replace(/\/$/, '');

export type CloudSession = {
  token: string;
  user: {
    id: string;
    username: string;
  };
};

export type CloudSaveRecord = {
  revision: number;
  schemaVersion: number;
  state: GameState;
  createdAt: number;
  updatedAt: number;
};

export class CloudSaveError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly remoteSave: CloudSaveRecord | null = null,
  ) {
    super(message);
  }
}

export const isCloudSaveConfigured = () => Boolean(configuredApiUrl);

export const getCloudSession = (): CloudSession | null => {
  const raw = window.localStorage.getItem(CLOUD_SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as CloudSession;
    return session?.token && session.user?.id && session.user?.username ? session : null;
  } catch {
    return null;
  }
};

const setCloudSession = (session: CloudSession) => {
  window.localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
};

export const clearCloudSession = () => {
  window.localStorage.removeItem(CLOUD_SESSION_KEY);
};

const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const session = getCloudSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session.token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new CloudSaveError('无法连接云存档服务');
  }
  const payload = await response.json().catch(() => ({})) as T & {
    error?: string;
    save?: CloudSaveRecord | null;
  };
  if (!response.ok) {
    throw new CloudSaveError(payload.error ?? `云存档请求失败（${response.status}）`, response.status, payload.save ?? null);
  }
  return payload;
};

export const registerCloudAccount = async (username: string, password: string) => {
  const payload = await requestJson<{ token: string; user: CloudSession['user'] }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const session = { token: payload.token, user: payload.user };
  setCloudSession(session);
  return session;
};

export const loginCloudAccount = async (username: string, password: string) => {
  const payload = await requestJson<{ token: string; user: CloudSession['user'] }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  const session = { token: payload.token, user: payload.user };
  setCloudSession(session);
  return session;
};

export const logoutCloudAccount = async () => {
  try {
    await requestJson<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } finally {
    clearCloudSession();
  }
};

export const fetchCloudSave = async (slot = 'default') => {
  const payload = await requestJson<{ save: CloudSaveRecord | null }>(`/save?slot=${encodeURIComponent(slot)}`);
  return payload.save;
};

export const uploadCloudSave = async (state: GameState, expectedRevision: number, slot = 'default') => {
  const payload = await requestJson<{ save: CloudSaveRecord }>('/save', {
    method: 'PUT',
    body: JSON.stringify({ slot, expectedRevision, state }),
  });
  return payload.save;
};
