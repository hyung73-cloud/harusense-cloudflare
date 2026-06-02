-- Harusense Cloudflare D1 account API schema
-- Cloudflare D1 콘솔에서 이 SQL을 한 번 실행하세요.

CREATE TABLE IF NOT EXISTS provider_accounts (
  institution_no TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  manager_name TEXT NOT NULL DEFAULT '',
  manager_role TEXT NOT NULL DEFAULT '',
  manager_mobile TEXT NOT NULL DEFAULT '',
  manager_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '활성',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  temp_password TEXT NOT NULL DEFAULT '',
  first_password_changed INTEGER NOT NULL DEFAULT 0,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  updated_at TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS provider_updates (
  institution_no TEXT PRIMARY KEY,
  items_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '반영',
  parking_available TEXT NOT NULL DEFAULT '',
  parking_updated_at TEXT
);
