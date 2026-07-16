-- Client-facing job requests (2026-07-16). The public "Hire a Carpenter"
-- page posts here WITHOUT an account. Kept in a SEPARATE table from member
-- `jobs` on purpose: it's the first unauthenticated write path, so isolating
-- it means a bug or abuse here can't touch member posts. Every row starts
-- `pending` and only reaches the member board once an admin approves it.
CREATE TABLE client_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,      -- normalized phone (233…) for wa.me
  zone TEXT NOT NULL,
  trade TEXT,                        -- specialty key or NULL = any
  skill_level TEXT,                  -- level needed or NULL = any
  workers INTEGER NOT NULL DEFAULT 1,
  start_when TEXT,
  duration TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'filled'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX idx_client_jobs_status ON client_jobs(status, created_at DESC);
CREATE INDEX idx_client_jobs_contact ON client_jobs(client_contact, created_at);
