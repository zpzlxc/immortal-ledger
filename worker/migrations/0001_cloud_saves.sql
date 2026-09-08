CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_player_id ON sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS game_saves (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, slot)
);

CREATE TABLE IF NOT EXISTS game_save_history (
  player_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, slot, revision),
  FOREIGN KEY (player_id, slot) REFERENCES game_saves(player_id, slot) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_save_history_saved_at ON game_save_history(saved_at);
