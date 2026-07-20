-- Feature suggestion box: members propose platform features/improvements from
-- the Support tab; admin reviews them. (Distinct from service_catalog, which is
-- the curated vocabulary of services members OFFER.)
CREATE TABLE suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',   -- 'new' | 'seen' | 'planned' | 'done' | 'declined'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sugg_member ON suggestions(member_phone, id);
