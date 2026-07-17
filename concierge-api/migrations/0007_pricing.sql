-- Member-facing pricing tool (2026-07-16). Multi-tenant: each member gets
-- their OWN config + quotes, keyed by phone, in concierge-api/D1 — a new
-- build, NOT the owner's single-tenant dispatch pricing (Standing Instruction
-- 5). No owner economics are ever stored here.
CREATE TABLE pricing_configs (
  member_phone TEXT PRIMARY KEY REFERENCES members(phone),
  config TEXT NOT NULL,              -- JSON: overhead items, labour rates, tiers, add-ons
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pricing_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|sent|accepted|declined
  quote TEXT NOT NULL,                    -- JSON blob of the full quote
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pricing_quotes_member ON pricing_quotes(member_phone, updated_at DESC);
