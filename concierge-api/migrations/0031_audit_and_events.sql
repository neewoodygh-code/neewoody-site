-- Audit + usage instrumentation (admin-only surfacing).
-- audit_log: SENSITIVE actions (PIN changes, deleted records, role/status
--   changes, payments, admin activity, system errors) — retained, immutable.
-- usage_events: lightweight analytics (feature/tab use, searches) — high-volume,
--   prunable; powers "most-used features" and "popular searches".
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  actor       TEXT,            -- phone of the actor, or NULL for system
  actor_role  TEXT,            -- 'admin' | 'member' | 'system'
  action      TEXT NOT NULL,   -- pin_change | member_delete | purge_pending | role_change | status_change | payment_record | payment_reverse | backup | system_error
  target      TEXT,            -- phone/id acted on
  meta        TEXT             -- JSON detail
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action);

CREATE TABLE IF NOT EXISTS usage_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  phone       TEXT,            -- member who did it (nullable)
  name        TEXT NOT NULL,   -- 'tab' | 'search' | 'contact' | …
  meta        TEXT             -- JSON, e.g. {"tab":"jobs"} or {"where":"directory","q":"spray"}
);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_name    ON usage_events(name);
