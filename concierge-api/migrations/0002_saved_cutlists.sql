-- Carpentry Concierge — saved cutlists (member persistence for the free wardrobe calculator)
-- "Free to use, login to persist": the calculator stays open; saving is the member benefit.

CREATE TABLE saved_cutlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  name TEXT NOT NULL,                       -- member-chosen label, e.g. 'Master bedroom — Adenta job'
  config TEXT NOT NULL,                     -- JSON: calculator state (S + ebState), always stored in mm
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_phone, name)                -- re-saving the same name updates it
);

CREATE INDEX idx_saved_cutlists_member ON saved_cutlists(member_phone, updated_at);
