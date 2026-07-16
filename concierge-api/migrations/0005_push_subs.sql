-- Job alerts via Web Push (2026-07-16). One row per device subscription;
-- a member can have several (phone + workshop tablet). Endpoint is unique —
-- re-subscribing the same device upserts. Expired subs (push service returns
-- 404/410) are pruned by the Worker during sends.
CREATE TABLE push_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  endpoint TEXT NOT NULL UNIQUE,
  sub TEXT NOT NULL,                 -- full PushSubscription JSON (endpoint + keys)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_push_subs_member ON push_subs(member_phone);
