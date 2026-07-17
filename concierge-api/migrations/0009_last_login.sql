-- Activity visibility (2026-07-16): record each member's last successful
-- login so the admin can see who's actually using the platform and who to
-- nudge. login_attempts self-prunes (15-min window) so it can't serve this.
ALTER TABLE members ADD COLUMN last_login TEXT;
