-- Vendor "services" — what a vendor/service provider DOES (a second axis from
-- vendor_categories = what they sell). Curated keys (JSON array) so they double
-- as clean Sourcing filters; services_other is free text for anything off-list
-- (shown on the profile, never a filter). interior_design as a service also
-- fires the Interior Designer badge.
ALTER TABLE members ADD COLUMN vendor_services TEXT;
ALTER TABLE members ADD COLUMN services_other TEXT;
