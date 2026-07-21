# Backup & Restore Runbook

What data exists, how it's backed up, and how to recover it. Two independent systems:

| System | Store | Backup | Recovery window |
|---|---|---|---|
| **Carpentry Concierge** | D1 `concierge` | **Time Travel** (auto) + **weekly R2 export** | 30 days (Time Travel) · ~12 weeks (exports) |
| Concierge media | R2 `neewoody-media` (`concierge/…`) | none (re-uploadable) | — |
| **Dispatch** ⚠ | KV `neewoody-dispatch` | **manual export only** (script below) | none automatic |

---

## 0. Do this once — record the secrets

None of these can be recovered from the code. Losing them causes mass re-auth or broken push. **Store in a password manager now:**

- `SESSION_SECRET` (concierge-api) — loss ⇒ every member must log in again.
- `PAYSTACK_SECRET` (concierge-api) — retrievable from the Paystack dashboard, but record it anyway.
- **VAPID public + private keys** (concierge push, and separately the dispatch VAPID keys) — loss ⇒ every push subscription breaks; all members/crew must re-enable alerts.
- Dispatch API key `nwd-dispatch-2024` and the `neewoody-dispatch` KV **namespace id** (from the Cloudflare dashboard).

To view a Worker secret you can't recover otherwise, you must re-`put` a new one (which rotates it) — hence: record them before you ever need to.

---

## 1. Carpentry Concierge — D1 `concierge`

### Automatic: D1 Time Travel (30-day point-in-time recovery)
Cloudflare keeps a continuous history. To roll back an accidental bad migration or a mistaken *Purge pending*:

```bash
cd concierge-api
# find a timestamp/bookmark before the mistake
npx wrangler d1 time-travel info concierge --remote
# restore the live DB to that point (DESTRUCTIVE — overwrites current state)
npx wrangler d1 time-travel restore concierge --timestamp="2026-07-20T09:00:00Z" --remote
```

### Automatic: weekly R2 snapshot (belt-and-braces + downloadable copy)
The `concierge-api` Worker cron `0 3 * * 0` (Sun 03:00 UTC) writes a full JSON dump of every table to R2 at `concierge/backups/<YYYY-MM-DD>.json` (last ~12 kept). These are **not** served by any route — reach them only via wrangler / the R2 dashboard.

```bash
# list snapshots
npx wrangler r2 object get neewoody-media --prefix concierge/backups/ 2>/dev/null || \
  npx wrangler r2 bucket list                       # (or browse in the dashboard)
# download one
npx wrangler r2 object get "neewoody-media/concierge/backups/2026-07-20.json" --file backup.json
```

Trigger one on demand (instead of waiting for Sunday): run the scheduled event from the dashboard (Workers → concierge-api → Triggers → run cron `0 3 * * 0`), or `npx wrangler dev --test-scheduled` then hit `/__scheduled?cron=0+3+*+*+0`.

### Restore from a JSON snapshot
The snapshot is `{ generated_at, db, tables: { <table>: [rows…] } }`. Prefer **Time Travel** for accidental changes; use the JSON only for cross-account / >30-day recovery. To restore a table, generate `INSERT` statements from the JSON and apply with `npx wrangler d1 execute concierge --remote --file restore.sql`. (Schema itself is reproducible from `concierge-api/migrations/` — `npx wrangler d1 migrations apply concierge --remote` on a fresh DB, then load rows.)

---

## 2. Concierge media — R2 `neewoody-media`

Member photos/logos/storefront/call-out images live under the `concierge/` prefix, **overwrite-in-place**, no versioning. Low value (avatars are re-uploadable); logos/storefront images would need re-upload if lost. Optional hardening: enable **R2 versioning** on the bucket in the dashboard.

---

## 3. Dispatch — KV `neewoody-dispatch` ⚠ (biggest gap)

KV has **no Time Travel and no automatic backup**, and holds load-bearing crew/jobs/leads. Per Standing Instruction 5 the dispatch Worker is not modified; back it up **read-only from the CLI** with the script:

```bash
DISPATCH_KV_ID=<namespace-id-from-dashboard> ./scripts/backup-dispatch-kv.sh
```

It reads each known `nwd-*` key and writes `dispatch-backup-<date>.json` locally. Run it on a schedule (e.g. a weekly reminder) and keep the file somewhere safe. Restoring is `npx wrangler kv key put "<key>" --path <file> --namespace-id=$DISPATCH_KV_ID --remote` per key.

---

## 4. Full disaster recovery (account/worker lost)

1. Re-create resources: `npx wrangler d1 create concierge` (paste the new `database_id` into `wrangler.toml`), R2 bucket `neewoody-media`.
2. `npx wrangler d1 migrations apply concierge --remote` (schema from repo).
3. Load the newest D1 JSON snapshot (section 1) and dispatch KV backup (section 3).
4. Re-set every secret from your password manager (`npx wrangler secret put SESSION_SECRET`, `PAYSTACK_SECRET`, VAPID …).
5. `npx wrangler deploy` (concierge-api). Re-point the Paystack **Webhook** URL. Members re-enable push.
