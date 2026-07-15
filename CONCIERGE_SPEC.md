# Carpentry Concierge — Build Spec (Phase 1)

**Read this entire document before writing any code. The decisions below are final unless the owner (Nuer) explicitly changes them in conversation. Do not substitute more common patterns for the ones specified here.**

## What this is

Carpentry Concierge is a membership platform for Ghanaian carpenters, run by Neewoody Custom Woodwork (neewoodygh.com). Founding members (~50 people) register via WhatsApp, pay GHS 50/month via manual Mobile Money, and get access to a members directory and member-gated features on the existing website. Phase 1 is: auth foundation + member database + directory + save-gating on existing tools.

## Non-negotiable architecture decisions

1. **Separate Worker.** Build a new Cloudflare Worker named `concierge-api`. Do NOT add routes to the existing `neewoody-dispatch-api` Worker. Blast radius isolation is deliberate: a Concierge bug must never affect dispatch or lead capture.
2. **This Worker lives in the repo.** Create it under `/concierge-api/` with its own `wrangler.toml`. It deploys via `wrangler deploy`. (The legacy dispatch worker lives only in the Cloudflare dashboard — do not attempt to import, refactor, or migrate it.)
3. **D1, not KV.** Member data goes in a Cloudflare D1 database named `concierge`. KV is not acceptable for member records. Use D1 migrations (`wrangler d1 migrations`) from the start.
4. **Auth is phone + PIN, not email + password.** There is no email infrastructure and there will be none in Phase 1. Do not build email verification, magic links, or password reset flows.
5. **Shared R2.** Member photos go in the existing `neewoody-media` R2 bucket under a `concierge/` prefix. Do not create a new bucket.
6. **Frontend pages** are static HTML/JS on the existing Cloudflare Pages site, matching the site's existing editorial/luxury visual style (look at existing pages before writing CSS). No frameworks, no build step beyond what the site already uses.

## Auth design

- **Identity:** Ghana phone number, normalized to `233XXXXXXXXX` format (accept `0XX...` input, convert). Phone is the primary key.
- **Credential:** 5-digit PIN.
  - Hash with PBKDF2 via Web Crypto (`crypto.subtle`), SHA-256, ≥100,000 iterations, 16-byte random salt per user. Store `salt:hash` encoded base64. Never store or log the PIN.
- **Session:** stateless signed token. Payload = `phone.expiry`, signature = HMAC-SHA-256 over payload using a Worker secret `SESSION_SECRET` (set via `wrangler secret put`, never committed). Token format: `base64(payload).base64(signature)`. Expiry: 30 days. Client stores token in `localStorage`, sends as `Authorization: Bearer <token>`.
- **Middleware:** a single `requireAuth(request)` helper that verifies signature + expiry and returns the member row (or 401). A `requireAdmin` variant checks `role = 'admin'`.
- **Rate limiting:** max 5 failed PIN attempts per phone per 15 minutes (track attempts in D1). Return 429 after that.
- **PIN reset:** admin-only endpoint. There is no self-service reset in Phase 1 — members contact the owner on WhatsApp, and the owner resets via admin dashboard. Do not build anything fancier.

## D1 schema (initial migration)

```sql
CREATE TABLE members (
  phone TEXT PRIMARY KEY,           -- 233XXXXXXXXX
  name TEXT NOT NULL,
  business_name TEXT,
  area TEXT,                        -- e.g. 'Spintex', 'Tema', 'Kasoa'
  specialties TEXT NOT NULL,        -- JSON array as text, see list below
  pin_hash TEXT NOT NULL,           -- salt:hash base64
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'member',   -- 'member' | 'admin'
  status TEXT NOT NULL DEFAULT 'pending',-- 'pending' | 'approved' | 'suspended'
  is_founder INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,          -- ISO 8601
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_phone TEXT NOT NULL REFERENCES members(phone),
  period TEXT NOT NULL,             -- 'YYYY-MM'
  amount_ghs INTEGER NOT NULL,
  momo_ref TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_phone, period)
);

CREATE TABLE login_attempts (
  phone TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
  success INTEGER NOT NULL
);
```

Specialties list (fixed vocabulary, multi-select — **revised by owner 2026-07-15**): `cabinet_construction`, `interior_work`, `solid_wood_furniture`, `upholstery`, `finishing_spray`, `outdoor_structures`, `site_construction`, `cnc_machining`, `other`. Site/construction carpenters are explicitly in scope. History: the original `furniture` was split into cabinet_construction / interior_work / solid_wood_furniture; `glass_aluminium` was retired; `outdoor_structures` (pergolas, gazebos, huts, sheds, decking — owner's "exterior carpentry framework") was added. **`finishing_spray` is deliberately kept** — "upholsterer hires a spray finisher" is the directory's canonical use case; do not remove it. Legacy keys on old rows render via a fallback label map in `js/concierge.js` and drop out on the member's next profile save.

Area vocabulary (2026-07-15): `area` stays a TEXT column, but the frontend constrains it to a fixed zone list in `js/concierge.js` (`ZONE_GROUPS`): ~22 Greater Accra zones first, then all 15 other regions (a large share of the base is outside Accra — deliberate). Legacy free-text areas are preserved as an extra option in the select until the member re-saves. Maps/GPS are deferred; the agreed later path is an optional per-member pin + "View on map" deep link (no embedded map tiles — pages must stay light on mobile data).

## API routes (`concierge-api`)

All responses JSON. CORS restricted to `https://neewoodygh.com` (+ localhost for dev).

**Public:**
- `POST /api/auth/login` — `{phone, pin}` → `{token, member}` or 401/429.

**Authenticated (member):**
- `GET /api/me` — own member record (never returns pin_hash).
- `PUT /api/me` — update own name, business_name, area, specialties, photo_url.
- `GET /api/directory` — approved members only: name, business_name, area, specialties, photo_url, phone (phone included deliberately — the product purpose is members hiring each other; WhatsApp deep links are built from it).
- `POST /api/me/photo` (body: raw `image/jpeg`, ≤300KB, JPEG magic-byte checked) — stores the member's one photo at R2 `concierge/members/<phone>.jpg` (overwrite = bounded storage) and sets `photo_url` to an absolute URL on the worker's own origin (`/api/media/members/<phone>.jpg?v=<ts>`; relative would hit the dispatch worker's route on neewoodygh.com). `DELETE /api/me/photo` removes it. The client compresses to a 512px square JPEG (~30–60KB) before upload — added 2026-07-15; the URL input field is gone from both UIs.
- `GET /api/media/members/<phone>.jpg` — public (loads in `<img>`, which can't send Authorization), `Cache-Control: public, max-age=86400` + ETag/304. Avatars only — low sensitivity by design.

**Authenticated (admin):**
- `POST /api/admin/members` — create member (registration is admin-entered in Phase 1; founders come in via WhatsApp and the owner registers them). Generates initial PIN? No — admin supplies it, tells member on WhatsApp.
- `PUT /api/admin/members/:phone` — update status/role/is_founder, reset PIN.
- `GET /api/admin/members` — full list incl. pending.
- `POST /api/admin/payments` — record a MoMo payment `{member_phone, period, amount_ghs, momo_ref}`.
- `GET /api/admin/payments?period=YYYY-MM` — who has paid this month.

No self-serve public registration endpoint in Phase 1. Do not build one.

## Frontend pages (on existing Pages site)

1. `/concierge/login.html` — phone + PIN, stores token, redirects to directory.
2. `/concierge/directory.html` — compact horizontal member cards (small photo/initials left, details right, round WhatsApp button using `wa.me/<phone>`; redesigned 2026-07-15 for 50+ member lists). Requires session; if no token, redirect to login. Filter by area (zone vocabulary) and trade (client-side is fine at 50 members). Trade chips open a popover (tap on mobile, hover on desktop) listing what the trade covers (`SPECIALTY_EXAMPLES`). Once the directory has ≥12 members it opens with "Featured today" (6 members, date-seeded shuffle — rotates daily so every member is featured equally; no backend) + a "select your area" prompt + a "Show all members" escape hatch; under 12 it just shows everyone. Admin uploads a member's photo from the members-table row (`POST /api/admin/members/:phone/photo`).
3. `/concierge/admin.html` — table of members, add-member form, approve/suspend, record payment, reset PIN. Requires admin session. This page is unlisted (no nav link).

## Gating rules for existing tools — read carefully

- **The cutlist calculator (`cutlist.html`) stays fully usable without login.** It is a top-of-funnel marketing asset. Do NOT put the calculator itself behind auth.
- Gating pattern for it and future tools: **free to use, login to persist.** Add "Save my cutlist" which requires a session (add a `saved_cutlists` table in a later migration when wiring this; acceptable to stub the button in Phase 1 with a login prompt).
- Fully member-gated: the directory, and all future Concierge features (safety check-in etc.).

## Explicitly out of scope for Phase 1 — do not build

- Email anything. SMS OTP. Self-service PIN reset.
- Paystack or any payment API (payments are manual MoMo, recorded by admin).
- Suggestion portal, forums, chat, comments.
- Safety check-in system (Phase 2 — separate spec will follow).
- Public self-serve registration.
- Any framework migration of the existing site.

## Definition of done (Phase 1)

- `wrangler deploy` from `/concierge-api/` succeeds; D1 migrations applied.
- Owner can: log in as admin, add a founder with phone+PIN, mark them approved + founder, record a payment.
- That founder can: log in on their phone, see the directory, open a WhatsApp chat to another member, edit their own profile.
- Cutlist calculator still works logged-out, exactly as before.
- No secrets in the repo. `SESSION_SECRET` set via wrangler secret.

## Context that explains the decisions (for the agent's judgment calls)

- Users are tradespeople on Android phones with intermittent data; every page must be light and work on mobile-first.
- Phone numbers double as MoMo and WhatsApp identity in Ghana — this is why phone is the PK and why exposing it inside the members-only directory is a feature.
- The owner personally knows/vets all ~50 founders; manual admin flows are acceptable and preferred at this scale. Optimize for the owner's speed in the admin dashboard, not for self-service.
- Visual style must match neewoodygh.com's existing editorial look — dark, premium, generous whitespace. Inspect existing pages first.
