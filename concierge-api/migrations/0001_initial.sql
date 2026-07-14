-- Carpentry Concierge — Phase 1 initial schema
-- Applied with:  wrangler d1 migrations apply concierge --remote

CREATE TABLE members (
  phone TEXT PRIMARY KEY,                 -- 233XXXXXXXXX
  name TEXT NOT NULL,
  business_name TEXT,
  area TEXT,                              -- e.g. 'Spintex', 'Tema', 'Kasoa'
  specialties TEXT NOT NULL,              -- JSON array as text (fixed vocabulary)
  pin_hash TEXT NOT NULL,                 -- base64(salt):base64(hash) via PBKDF2
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'member',    -- 'member' | 'admin'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'suspended'
  is_founder INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,                -- ISO 8601
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  period TEXT NOT NULL,                   -- 'YYYY-MM'
  amount_ghs INTEGER NOT NULL,
  momo_ref TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_phone, period)
);

CREATE TABLE login_attempts (
  phone TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
  success INTEGER NOT NULL
);

-- Supporting indexes (additive; not required by spec but keep queries cheap)
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_payments_period ON payments(period);
CREATE INDEX idx_login_attempts_phone_time ON login_attempts(phone, attempted_at);
