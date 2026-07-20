-- Optional arrival photo on a safety call-out (evidence). One R2 image per
-- call-out at concierge/callouts/<id>.jpg. Served AUTHENTICATED (owner or admin
-- only) — never a public URL, since call-out ids are sequential and the photo
-- shows where a member went.
ALTER TABLE callouts ADD COLUMN has_photo INTEGER NOT NULL DEFAULT 0;
