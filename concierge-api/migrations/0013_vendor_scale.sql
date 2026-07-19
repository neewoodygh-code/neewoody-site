-- Vendor shop-size scale (stall -> shop -> showroom -> warehouse): the vendor
-- parallel to a carpenter's skill_level. NULL for carpenters / when unset.
ALTER TABLE members ADD COLUMN vendor_scale TEXT;
