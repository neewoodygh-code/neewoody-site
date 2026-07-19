-- Vendor Storefront: structured items a vendor sells (name, description, free-text
-- price, one image in R2) + the vendor's shop GPS for a keyless map embed.
-- Item count is bounded per member in the Worker (<=12). The earlier free-text
-- `stock` column (migration 0011) is repurposed as a short "about the shop" blurb.
CREATE TABLE storefront_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  image_key TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_storefront_member ON storefront_items(member_phone);

ALTER TABLE members ADD COLUMN location_lat REAL;
ALTER TABLE members ADD COLUMN location_lng REAL;
