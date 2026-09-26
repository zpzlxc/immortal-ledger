CREATE TABLE IF NOT EXISTS share_rooms (
  id TEXT PRIMARY KEY,
  access_token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_rooms_last_used_at ON share_rooms(last_used_at);

CREATE TABLE IF NOT EXISTS share_saves (
  room_id TEXT NOT NULL REFERENCES share_rooms(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, slot)
);

CREATE TABLE IF NOT EXISTS share_save_history (
  room_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, slot, revision),
  FOREIGN KEY (room_id, slot) REFERENCES share_saves(room_id, slot) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_save_history_saved_at ON share_save_history(saved_at);
