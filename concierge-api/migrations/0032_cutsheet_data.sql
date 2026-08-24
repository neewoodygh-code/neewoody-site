-- Carpentry Concierge — cut-sheet projects sync (member persistence for cut-sheet.html)
-- The tool's whole "projects → cut lists" library is stored as one JSON blob per
-- member, mirroring the per-member config/quotes blobs of the pricing tool.
-- Members were losing local-only projects (e.g. incognito); this makes "saved"
-- mean saved across devices. GET is open to any member; PUT is gated by withPaid.

CREATE TABLE cutsheet_data (
  member_phone TEXT PRIMARY KEY REFERENCES members(phone),
  data TEXT NOT NULL,                       -- JSON: {v:2, list:[{id,name,updatedAt,lists:[...]}]}
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
