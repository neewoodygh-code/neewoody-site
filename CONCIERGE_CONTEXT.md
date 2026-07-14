# Carpentry Concierge — Project Context for Claude Code
*Session digest, 14 July 2026. Companion to CONCIERGE_SPEC.md — the spec says WHAT to build; this document says WHY, and where things stand. Read both before working on anything Concierge-related.*

## The vision (what Nuer is actually trying to achieve)

Nuer runs Neewoody Custom Woodwork (neewoodygh.com), a bespoke furniture business in Accra. His TikTok (@neewoodygh, ~12.1K followers) has organically become a channel for **Ghanaian carpenters**, not clients — comment sections full of tradespeople venting about shared pain points: clients disputing fair prices, scope disputes, wasted estimate time, comparing handmade work to China Mall imports.

**Carpentry Concierge** is the answer: a paid membership platform for Ghanaian carpenters. **The purpose of member intake is to build a community — a place where carpenters in Ghana collaborate, learn from each other, and get access to the tools built so far (directory, cutlist, estimator) and every tool built after.** The directory is the first expression of that community, not the whole point. Long-term components, in intended build order:

1. **Members directory** — carpenters find and hire each other (upholsterer in Tema needs a spray finisher for a week, etc.). Carpenters were already improvising this by posting phone numbers in TikTok comments — the demand is observed, not hypothetical. ✅ BUILT (Phase 1).
2. **Lone-worker safety check-in** (Phase 2) — carpenter logs a call-out before going to a consultation (client name, phone, location, expected duration), GPS check-in on arrival, check-out deadline; if overdue, system alerts their emergency contact via SMS + alerts Nuer. Built on the same pattern as the existing Neewoody Dispatch app (GPS depart/arrive/return/close). **The call-out record is the product, not just the alert:** if anything ever happens to a carpenter on a consultation, the record (who they went to see, where, when, expected return) is the starting point for an investigation. Design consequence for Phase 2: call-out records are retained after close (never auto-purged), timestamped, and admin-accessible. This is the differentiator — nobody offers this to informal-sector tradespeople in Ghana. **Do not build until ~15+ paid members exist.**
3. Later: gated tools (cutlist save/load), structured knowledge sharing, eventually a carpentry academy. (Collaboration and peer learning happen in the WhatsApp community from day one — see below; the academy formalizes it later.) The suggestion portal idea from comments = a WhatsApp poll for now, NOT software.

**The community layer is WhatsApp, deliberately.** Do not build chat, forums, or messaging — Ghanaian tradespeople live on WhatsApp and a custom platform would be a ghost town. The website is the directory + tools; WhatsApp is where members talk.

## Business model & launch state

- **Validation:** A TikTok poll video ("would you pay GHS 100/month?") hit ~4.5K views, 500 likes, 215 comments in ~23h, with dozens of explicit yeses including business accounts. Treated as strong interest signal but NOT payment validation — stated willingness ≠ MoMo payment; planning assumes ~10–15% conversion of commenters.
- **Founding offer (scripted, not yet posted):** 50 founding member spots at **GHS 50/month locked** (vs GHS 100 standard later). Intake: carpenter WhatsApps the word **FOUNDER** to 0244633464 → Nuer collects name/business/area/specialty → adds them to the WhatsApp Founders group AND registers them in the platform via admin dashboard. **Payment is collected only after the group is active** — announced inside the group with notice, manual MoMo, recorded by Nuer in the admin payments UI.
- Registration is **admin-entered by design** in Phase 1 (Nuer vets every founder personally). No public self-serve registration. This is a feature, not a gap.
- Scope decision: **construction/site carpenters are included**, not just furniture makers (specialty vocabulary in the schema reflects this).
- Economics: 50 × GHS 50 = GHS 2,500/mo against ~GHS 150/mo infrastructure. Margin is never the constraint; member acquisition is.
- **Current blocker is NOT code.** The platform is live; the founder video is not recorded. Nothing in the codebase blocks launch. If asked to prioritize, nothing should be built that delays or substitutes for member acquisition.

## What was built and deployed today (all verified working)

- **`concierge-api` Worker** — separate from `neewoody-dispatch-api` (deliberate blast-radius isolation), lives in the repo at `/concierge-api/`, deployed via Wrangler. Live at `https://concierge-api.neewoodygh.workers.dev` (matches the constant hardcoded in `js/concierge.js`).
- **D1 database `concierge`** (id `25f1c339-c3f0-4398-89d1-0f3f62b7c89f`, region WEUR, committed in wrangler.toml — it's an identifier, safe in git). Migration 0001 applied remotely: `members`, `payments`, `login_attempts` + indexes.
- **Auth:** phone (PK, normalized 233…) + 5-digit PIN, PBKDF2 (SHA-256, 100k iterations, per-user salt) via Web Crypto; stateless HMAC session tokens (`SESSION_SECRET` set as a Wrangler secret — NEVER in the repo, NEVER in logs/output); 5-failed-attempts/15-min rate limit with self-pruning `login_attempts`; members can change their own PIN via `PUT /api/me`; forgotten-PIN reset is admin-only (by design — no email/SMS infra exists).
- **Frontend** (on the existing Pages site, matching the green/gold/cream editorial style, noindex, out of nav/sitemap): `/concierge/login.html`, `/concierge/directory.html` (cards, area/trade filters, WhatsApp deep links, self-profile edit), `/concierge/admin.html` (add member, status/role/founder toggles, PIN reset, payment recording).
- **Cutlist calculator stays fully open, logged-out.** It is a top-of-funnel marketing asset (TikTok→cutlist→enquiry funnel). Only a "Save" stub gates on login. NEVER hard-gate the calculator itself. Gating pattern for all tools: free to use, login to persist.
- **Verified end-to-end on a real phone over mobile data:** admin login, member creation, directory rendering (2 members: Nuer + Maxwell/Maxwell Furniture, Spintex), WhatsApp deep link. All security paths (401/403/429, suspended-member hiding, no pin_hash leakage, CORS) tested green in CC's earlier local Miniflare run.
- Commits: `67e2ba7` (Phase 1 + both post-review fixes), `b46b99f` (database_id). Pushed to origin/main after fixing a missing upstream link.

## Known technical debts / accepted trade-offs (do not "fix" without instruction)

- **Stateless tokens can't be revoked** — a PIN change doesn't kill an existing token (valid until 30-day expiry). Accepted at 50-vetted-founder scale. Revisit (sessions in D1) only if Concierge ever handles money or messaging directly.
- Payment recording upserts on (member, period) — deliberate, lets Nuer correct mistakes.
- CORS allows bare + www domain. Admin `PUT /members/:phone` can edit profile fields — deliberate, optimizes for owner speed.
- Phone numbers ARE exposed inside the members-only directory — that IS the product (members hire members). Founders are told at intake that joining = being findable.

## Infrastructure decisions (see spec addendum for full trigger table)

- Workers Paid ($5/mo) is ON — do not lower PBKDF2 iterations for free-tier CPU.
- Wrangler is being pinned to v4 via package.json in /concierge-api/ (deploy was done on 3.114; next deploy runs v4 — if a future deploy misbehaves, the version jump is suspect #1).
- Upgrade triggers pre-decided (spec addendum): Cloudflare Images at ~20 member photos; SMS provider (Hubtel/Africa's Talking) at Phase 2 start (safety alerts MUST be SMS — emergency contacts aren't app users); Paystack at >100 members or >2hr/wk manual reconciliation. Rejected permanently: third-party auth (Auth0/Clerk/etc.), email providers, non-Cloudflare databases.
- Cloudflare Access rule on `/concierge/admin.html` (free, allow only Nuer's email) — pending, Nuer's task in the dashboard.

## Standing instructions for Claude Code on this project

1. **NEVER touch the `neewoody-dispatch-api` Worker or its KV namespace** unless Nuer explicitly instructs it in that session. It runs the live dispatch app his crew uses daily and holds lead data. (This instruction also belongs in CLAUDE.md — add it if not yet present.)
2. **Secrets discipline:** SESSION_SECRET, future payment/SMS API keys, and member PINs are never committed, logged, echoed into output, or included in generated files. Identifiers (database_id, account IDs, URLs) are fine.
3. Deviations from CONCIERGE_SPEC.md require asking first. Additive choices where the spec is silent: proceed, but flag them explicitly at the end (this worked well in the Phase 1 build).
4. Mobile-first always — members are on Android over MTN data. Pages must stay light.
5. Wrangler credentials are now on this machine (`wrangler login` completed) — CC CAN run remote migrations, secrets, and deploys directly in future sessions. Announce before any `--remote` or `deploy` action.
6. CLAUDE.md is oversized (45k+ chars, performance warning fired). Pending task: compress — keep architecture/standing instructions/active projects, move completed history to HISTORY.md.

## Phase 2 preview (do not start yet — separate spec will follow)

Safety check-in: `callouts` table (member, client name/phone, location, expected end, status), member-facing create/check-in/check-out flow, **Worker cron trigger** scanning for overdue call-outs every ~15 min, SMS alert to emergency contact + notification to Nuer. Alerting logic behind a provider-swappable interface. **Records are evidence, not ephemera:** call-outs are retained after close/resolution (no auto-purge), fully timestamped (created / arrived / checked-out / alerted), and admin-queryable — if a member is ever harmed or goes missing on a consultation, the trail is the starting point for an investigation. Trigger to begin: 15+ paying members.

## The one-line summary

Everything technical exists and works. The project's critical path runs through a 60-second TikTok video and a WhatsApp inbox, not through this codebase. Build what's asked, keep it small, and never let the code become the reason the launch waits.
