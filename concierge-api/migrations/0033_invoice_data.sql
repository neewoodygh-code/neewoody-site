-- Carpentry Concierge — invoice/quote generator sync (member persistence for invoice-generator.html)
-- The admin billing tool's whole library (settings + saved invoices + counter) is
-- stored as one JSON blob per member, mirroring cutsheet_data / the pricing blobs.
-- The tool is admin-only in the UI, but the store is siloed per member_phone like
-- every other blob, so no new auth primitive is needed. GET is open to any member
-- (returns only their own row); PUT is gated by withPaid (admins are exempt).

CREATE TABLE invoice_data (
  member_phone TEXT PRIMARY KEY REFERENCES members(phone),
  data TEXT NOT NULL,                       -- JSON: {v:1, settings:{...}, list:[...], counter:N}
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
