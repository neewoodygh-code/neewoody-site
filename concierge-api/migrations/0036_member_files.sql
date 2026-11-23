-- My files (2026-11-23, owner-directed: "member storage ... reached from your profile ... a folder structure of all
-- your saves from different tools"; "try not to lose anyone's data in the process").
-- ADDITIVE ONLY: one new table; nothing existing is changed or moved. The older tools (cutlists, cut sheets, quotes,
-- invoices) keep their own tables and are only LISTED on the profile page.
-- Folders = client (soft reference to the shared clients registry, like quotes and cut-sheet projects) then job
-- (free text). A deleted client leaves client_id pointing nowhere and the file shows under "No client"; nothing is lost.
CREATE TABLE member_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  client_id INTEGER,                         -- clients.id (soft), NULL = no client
  job TEXT NOT NULL DEFAULT '',              -- e.g. 'Kitchen', 'Laundry'
  tool TEXT NOT NULL,                        -- 'smart' (Smart Generator) for now
  name TEXT NOT NULL,
  data TEXT NOT NULL,                        -- JSON written by the tool
  size INTEGER NOT NULL DEFAULT 0,           -- bytes of data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_member_files_member ON member_files(member_phone, updated_at DESC);
