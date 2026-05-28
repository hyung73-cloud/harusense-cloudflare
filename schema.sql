CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  institution_no TEXT UNIQUE,
  name TEXT NOT NULL,
  district TEXT,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  phone TEXT,
  verified INTEGER DEFAULT 0,
  notes TEXT,
  updated_by TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS clinic_items (
  clinic_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  drug TEXT NOT NULL,
  dose TEXT NOT NULL,
  price INTEGER,
  in_stock INTEGER DEFAULT 1,
  updated_at TEXT,
  PRIMARY KEY (clinic_id, item_key),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS change_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id TEXT NOT NULL,
  institution_no TEXT,
  item_key TEXT NOT NULL,
  old_price INTEGER,
  new_price INTEGER,
  old_stock INTEGER,
  new_stock INTEGER,
  changed_at TEXT NOT NULL
);
