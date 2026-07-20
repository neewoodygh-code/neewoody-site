-- Admin-granted "Verified by Carpentry Concierge Ghana" trust mark. Since the
-- directory is now pay-to-join (not proactively vetted), this is the quality
-- signal the owner personally vouches for. Admin-set only.
ALTER TABLE members ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
