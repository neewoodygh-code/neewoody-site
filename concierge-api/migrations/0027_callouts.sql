-- Lone-worker safety check-in (Phase 2 flagship). A member logs a call-out
-- before a consultation; if they miss their "I'm safe" deadline (+grace), a
-- Worker cron flags it overdue and alerts admins (push + bell) with the member's
-- pin + one-tap contact to them AND their emergency contact. Records are EVIDENCE
-- — never purged, fully timestamped, admin-queryable. SMS-to-emergency-contact
-- is a later gated add; v1 relays through the admin/operator.
CREATE TABLE callouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  client_name TEXT,
  client_phone TEXT,
  location TEXT,                 -- where they're going (free text)
  lat REAL, lng REAL,           -- GPS pin captured on check-in (arrival)
  notes TEXT,
  expected_back TEXT NOT NULL,   -- ISO datetime: the "I'm safe" deadline
  status TEXT NOT NULL DEFAULT 'active',   -- active | arrived | safe | alerted | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  arrived_at TEXT,
  checked_out_at TEXT,
  alerted_at TEXT
);
CREATE INDEX idx_callout_member ON callouts(member_phone, id);
CREATE INDEX idx_callout_open ON callouts(status, expected_back);

-- Emergency contact (who we relay to if a member is overdue).
ALTER TABLE members ADD COLUMN emergency_name TEXT;
ALTER TABLE members ADD COLUMN emergency_phone TEXT;
