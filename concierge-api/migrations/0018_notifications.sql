-- Shared notifications layer. Every feature (buy-for-me, courier pings, vendor
-- orders, order-accepted, jobs …) writes a row here; the in-app bell reads it.
-- Web Push is the optional "tap to wake" layer on top — this table is the
-- source of truth so members who never grant push permission still see events.
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  type TEXT NOT NULL,               -- 'buy_request' | 'order_new' | 'order_accepted' | 'job' | …
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                        -- in-app hash link, e.g. '#services'
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notif_member ON notifications(member_phone, read, id);
