-- Dedicated business logo per member (separate from the profile photo/headshot).
-- Stored as a PNG in R2 at concierge/logos/<phone>.png (transparency-preserving),
-- served publicly at /api/media/logos/<phone>.png. Used on pricing-tool quote
-- letterheads now; reusable on storefronts / directory later.
ALTER TABLE members ADD COLUMN logo_url TEXT;
