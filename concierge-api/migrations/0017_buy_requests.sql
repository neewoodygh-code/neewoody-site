-- "Buy for me" — a member procurement/errand board (twin of the jobs board).
-- A member posts materials they need; another member nearby buys and delivers.
-- Coordination only: budget, runner fee and payment are agreed on WhatsApp
-- (the platform never handles money). items = JSON array of {name, qty}.
CREATE TABLE buy_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poster_phone TEXT NOT NULL REFERENCES members(phone),
  zone TEXT NOT NULL,                 -- deliver-to zone (drives area alerts)
  items TEXT NOT NULL,               -- JSON: [{ "name": "18mm MDF", "qty": "2 sheets" }, …]
  deliver_detail TEXT,               -- optional address/landmark within the zone
  where_to_buy TEXT,                 -- optional preferred market/shop
  budget TEXT,                       -- optional free text
  needed_by TEXT,                    -- optional free text
  notes TEXT,                        -- optional
  status TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'filled'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_buy_zone_status ON buy_requests(zone, status);
CREATE INDEX idx_buy_poster ON buy_requests(poster_phone);
