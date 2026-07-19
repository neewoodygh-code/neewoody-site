-- Vendor product categories (what they sell) — JSON array of fixed-vocab keys,
-- powering the Sourcing category filter; distinct from carpenter trade specialties.
-- Plus an optional business/call number so a member needn't expose their personal
-- login number for business contact.
ALTER TABLE members ADD COLUMN vendor_categories TEXT;
ALTER TABLE members ADD COLUMN business_phone TEXT;
