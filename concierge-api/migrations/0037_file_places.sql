-- My files step 3 (2026-11-23, owner chose "My files keeps its own folders"): which client and job folder a save from
-- an OLDER tool (cutlist, Cut Sheet project, Job Pricing quote, invoice) sits in on the profile page.
-- ADDITIVE ONLY: the tools' own data is never written; this only changes where My files shows a save.
-- No row = the tool's own client (as before). ref = the item's own id inside its tool.
CREATE TABLE file_places (
  member_phone TEXT NOT NULL REFERENCES members(phone),
  tool TEXT NOT NULL,                        -- 'cutlist' | 'cutsheet' | 'quote' | 'invoice'
  ref TEXT NOT NULL,                         -- the item's id in that tool
  client_id INTEGER,                         -- clients.id (soft), NULL = no client
  job TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (member_phone, tool, ref)
);
