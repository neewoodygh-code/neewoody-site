-- Member identity type: distinguishes carpenters from interior designers and
-- vendors/suppliers. Drives the profile-card badge and whether the carpenter
-- skill ladder (apprentice→master) applies. Existing members default to
-- 'carpenter'; the two current vendors are re-typed by admin after this ships.
ALTER TABLE members ADD COLUMN member_type TEXT NOT NULL DEFAULT 'carpenter';
