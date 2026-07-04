CREATE TABLE IF NOT EXISTS provider_positions (
  institution_no TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT '',
  position_verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  position_verified_by TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT NOT NULL DEFAULT ''
);
