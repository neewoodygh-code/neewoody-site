-- Skill level mechanic (2026-07-15): members self-set level + years in their
-- profile; admin can correct via the admin table. Precedes the jobs board —
-- "apprentices needed in Prampram" needs a level to hire against.
ALTER TABLE members ADD COLUMN skill_level TEXT;      -- 'apprentice' | 'carpenter' | 'master'
ALTER TABLE members ADD COLUMN years_experience INTEGER;
