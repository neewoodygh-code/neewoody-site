-- Shared "Clients" registry (2026-10-05, owner-directed): both the member Job
-- Pricing tool (carpenter-pricing.html) and the Cut Sheet Generator
-- (cut-sheet.html) reference a client by id, so a member sees one client's
-- cut-list projects AND quotes together instead of each tool keeping its own
-- disconnected idea of "who this is for." A client is a SOFT reference —
-- quotes/projects keep their own denormalized display name alongside an
-- optional clientId, so nothing breaks if a client row is later deleted.
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_clients_member ON clients(member_phone, updated_at DESC);
