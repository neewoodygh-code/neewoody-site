-- Members can hide their personal (login) number from other members.
-- When set, contact CTAs and the directory payload use the business number
-- only; the personal number is redacted from member-facing responses.
-- Enforced server-side: can only be enabled when a business_phone exists.
ALTER TABLE members ADD COLUMN hide_phone INTEGER NOT NULL DEFAULT 0;
