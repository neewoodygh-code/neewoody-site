-- Vendor "Storefront": free-text list of what a vendor sells (charcoal/acoustic
-- board, fluted panels, strip lighting, etc.). Kept OUT of the specialty vocab
-- so carpenter trade filters stay clean. NULL for carpenters.
ALTER TABLE members ADD COLUMN stock TEXT;
