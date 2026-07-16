-- Jobs board + badges (2026-07-16, owner-directed "Uber for carpenters" build).
-- Badges: is_business (Business badge; individuals are represented by their
-- skill-level badge) + availability (the seeker/giver signal on both sides).
ALTER TABLE members ADD COLUMN is_business INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN availability TEXT;  -- 'open_to_work'|'hiring'|'seeking_apprenticeship'|'taking_apprentices'

-- Jobs are a notice board, not a scheduler: start/duration are short free
-- text ("Monday 20 Jul", "3 days"), no rate field (rates are discussed on
-- WhatsApp — owner decision), applications happen via wa.me to the poster.
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poster_phone TEXT NOT NULL REFERENCES members(phone),
  zone TEXT NOT NULL,
  trade TEXT,                        -- specialty key, NULL = any trade
  skill_level TEXT,                  -- level needed, NULL = any level
  workers INTEGER NOT NULL DEFAULT 1,
  start_when TEXT,                   -- free text, e.g. 'ASAP' / 'Mon 20 Jul'
  duration TEXT,                     -- free text, e.g. '3 days'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'filled'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at DESC);
CREATE INDEX idx_jobs_poster ON jobs(poster_phone);
