-- Vendor orders. A member orders a vendor's LISTED storefront item (references
-- only what the vendor listed → no inane free-text orders). Vendor works the
-- queue in an Orders tab; the buyer is alerted when the vendor accepts. No money
-- in-platform — price/payment/delivery agreed on WhatsApp (connector model).
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_phone TEXT NOT NULL REFERENCES members(phone),
  buyer_phone TEXT NOT NULL REFERENCES members(phone),
  items TEXT NOT NULL,               -- JSON snapshot: [{ item_id, name, price, qty }]
  deliver_wanted INTEGER NOT NULL DEFAULT 0,
  deliver_to TEXT,                   -- zone/address when delivery is wanted
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',    -- 'new' | 'accepted' | 'fulfilled' | 'declined'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_vendor ON orders(vendor_phone, status, id);
CREATE INDEX idx_orders_buyer ON orders(buyer_phone, id);
