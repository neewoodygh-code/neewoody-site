-- Pay-to-join: the tier a member chose at intake. 'founder' → one-time GHS 100
-- (lifetime, only until 100 founders exist); 'regular' → GHS 50/month.
-- This only sets what they're CHARGED — is_founder (lifetime access) is still
-- granted server-side by the payment webhook, never from the signup form.
ALTER TABLE members ADD COLUMN requested_tier TEXT NOT NULL DEFAULT 'regular';
