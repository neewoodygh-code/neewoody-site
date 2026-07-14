# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Completed project history, catalogued projects (wardrobes/kitchens), the `pm-*` card batch log, and dated change-logs live in [`HISTORY.md`](HISTORY.md).** This file holds current architecture, standing instructions, and active projects. When an archived project becomes relevant again, read `HISTORY.md`.

## Standing Instructions

1. At the end of every session where decisions were made, scope was clarified, features were built, or anything changed about the business, site, or tools — automatically update this CLAUDE.md file to reflect those changes without being asked.
2. If a correction is made during a session (wrong attribution, wrong scope, wrong technical detail) — update CLAUDE.md immediately, not at the end.
3. Never remove existing context. Only add or correct. (Relocating completed history to `HISTORY.md` is allowed — that preserves context; deleting it is not.)
4. After updating CLAUDE.md, include it in the same commit as the rest of the session's changes.
5. **Never touch the `neewoody-dispatch-api` Worker or its `neewoody-dispatch` KV namespace unless the owner explicitly instructs it in that same session.** This includes the Worker's code (`worker.js` in repo, and the live copy in the Cloudflare dashboard), its routes, and any `nwd-*` KV key. Blast-radius isolation is deliberate — dispatch and lead capture are load-bearing. Building *near* it (e.g. the separate `concierge-api` Worker) is fine; modifying *it* is not, absent an explicit go-ahead this session.

## What this project is

Static multi-page marketing website for **Neewoody Custom Woodwork** (Accra, Ghana), with an embedded React-based crew dispatch app and Cloudflare Workers serverless functions. No build system — all files are deployed directly.

## Development

**Local preview:** Open any `.html` file directly in a browser, or use a local server:
```
npx serve .
# or
python -m http.server 8080
```

**Deployment:** Push to the `main` branch — the site deploys via Cloudflare Pages. The `functions/` directory is automatically picked up as Cloudflare Workers.

**Cloudflare Worker env vars:** The Instagram feed function (`functions/api/instagram.js`) requires `IG_TOKEN` set in the Cloudflare Pages dashboard (not in code).

## Architecture

### Pages
- **Marketing pages** (`index.html`, `pricing.html`, `portfolio.html`, category pages): standard static HTML
- **Product category pages** (`wardrobes.html`, `kitchens.html`, `beds.html`, `shelving.html`, `tv-units.html`, `solid-wood.html`, `dining-living.html`): follow the same layout pattern
- **Tools** (`wardrobe-estimator.html`, `cutlist.html`): calculator tools, vanilla JS
- **Dispatch** (`dispatch.html`): React 18 SPA loaded via unpkg CDN with Babel standalone for JSX — the internal crew/job management app
- **Case studies** (`projects/*.html`): project detail pages
- **Concierge** (`concierge/login.html`, `directory.html`, `admin.html`): member platform frontend — see the Carpentry Concierge section

### Serverless
- `functions/api/instagram.js` — Cloudflare Worker; fetches latest Instagram media and returns top 6 posts. Cached 15 minutes (`max-age=900`).
- `functions/api/lead.js` — contact form handler.
- `concierge-api/` — the Carpentry Concierge Worker (separate; see its section).

### PWA
- `sw.js` — Service Worker for Web Push notifications, used exclusively by the Dispatch app
- `manifest.json` — PWA manifest (app name: "Neewoody Dispatch")
- Push notifications open `/dispatch.html` on click

## Design system

**Two systems currently coexist** (mid-migration — see the redesign rollout status in `HISTORY.md`):

- **Current/new (all new pages: `index.html`, `catalogue.html`, `concierge/*`):** self-contained **inline** CSS, no `css/styles.css` dependency. Tokens: `--green:#0b1f0e` (deep forest green), `--gold:#c8922a` (warm gold accent), `--cream:#f0e8d0` (bg), `--cream-dark:#e8dfc4`, `--ink:#1c1c1a`, `--muted:#6b6557`. Fonts: **Playfair Display** (headings) + **Lora** (body) + **Jost** (UI/labels). **Do not add `css/styles.css` back to `index.html`.**
- **Legacy (all other pages):** `/css/styles.css` with `--clr-accent:#A0784A` (timber gold), `--clr-bg:#F7F4EF`, `--clr-dark`, Playfair Display + DM Sans.

Common UI patterns in `/js/main.js` (legacy pages): mobile nav toggle, scroll-reveal (`.reveal` → IntersectionObserver fade-in), portfolio filter (data-filter), FAQ accordion (single-open), Instagram feed fetch from `/api/instagram`.

## Key conventions

- New marketing pages follow the existing HTML structure: same `<head>` meta/font links, nav, and footer pattern.
- The nav includes a **Services dropdown** with tool badges — update it in every page when adding new pages.
- Structured data (JSON-LD `LocalBusiness` schema) lives in `index.html` — update there for business info changes. (Note: WebFetch strips `<script type=ld+json>`, so the schema looks absent to external crawlers but renders/validates fine. Workshop geo is `5.56108, -0.21373`, street `Amugi Avenue`, email `neewoodygh@gmail.com`.)
- SEO files (`sitemap.xml`, `robots.txt`) are hand-maintained — update `sitemap.xml` when adding new **public** pages (Concierge pages are `noindex` and deliberately excluded).
- The dispatch React app uses **no bundler** — JSX is transpiled in-browser by Babel standalone; keep it self-contained within `dispatch.html`.

---

## Business Context

### The Company
Neewoody Custom Woodwork — bespoke furniture and carpentry business based in Accra, Ghana.
Owner: Nuer (admin). Workshop: Amugi Avenue, Accra (GPS: 5.56108, -0.21373). Email: neewoodygh@gmail.com. Google Business: 4.8 stars, 14 reviews.

### Target Clients
- Expat homeowners (East Legon, Cantonments, Airport Residential, Trasacco)
- NGOs and institutional clients (e.g. Sage Centre — educational retreat centre)
- Local homeowners and developers
- Other carpenters (via the cutlist and estimator tools, and now Carpentry Concierge)

### Crew & Day Rates
- Kevin — Site Supervisor — GH₵200/day
- Lead Apprentice — GH₵150/day (acts as field supervisor on split-crew jobs)
- Work Hand — GH₵100/day
- Trainees — GH₵50/day each (cost, not free help)
- Nuer (owner) — supervisory rate varies by job tier (see pricing tiers)

### Pricing Logic
Fully loaded cost model: Materials + Labour + Overhead × Tier Multiplier × Add-on Multipliers

**Monthly Overhead: GH₵6,016** — Rent 1,500 · Electricity 1,000 · Bits & blades 800 · Safety consumables 300 · Internet 350 · Water 200 · Airtime 200 · Rubbish 240 · Hosting 100 · Capital replacement reserve 1,326/mo (Table saw 179, Routers 208, Spindle moulder 119, Fasteners & drills 208, Bench planer 167, Welding machine 167, Other machinery 278).

**Daily Overhead Rate: GH₵274/day** (GH₵6,016 ÷ 22 billable days). Applied across total job days (workshop + site combined).

**Pricing Tiers (internal names — never show clients):**
- Basic Build — just the essentials, functional — ×1.45 — Nuer rate GH₵200/day
- Standard Build — functional and presentable — ×1.65 — Nuer rate GH₵400/day
- Premium — we take our time — ×1.90 — Nuer rate GH₵600/day
- Luxury — at your beck and call — ×2.10 — Nuer rate GH₵700/day

**Add-on Multipliers:** Rush +20% · Custom design +12% · CNC/carved +18% · Remote install +8%

**Output to client: one encapsulated price only. Never show cost breakdown.**

### Job Types
**Cabinetry** — kitchens, wardrobes, office furniture, laminate work. Default materials: Boards, Back panels, Edge band, Edge banding application, Cutting, Fixtures, Finishing materials, Abrasives, Consumables, Protective packaging.

**Hardwood / General Furniture** — doors, staircases, pergolas, solid wood, dining, beds. Default materials: Timber, Fixtures, Abrasives, Wood filler/grain filler, Stain, Finishes, Joinery hardware, Consumables, Protective packaging.

Both share Logistics (Primary, Secondary with return-trip toggle, Tertiary site visits). Optional add-ons: Stone material, Stone fabrication, Templates/jigs, Glass. All jobs have workshop prep days. Pergolas: air dry, cut rafter tails, pre-stain in workshop, then site.

### Machinery (Capital Reserve Reference)
Table saw — GH₵15,000 · Routers — GH₵5,000 (urgent, 2yr lifespan) · Spindle moulder — GH₵10,000 · Fasteners & drills — GH₵10,000 · Bench top planer — GH₵7,000 · Welding machine — GH₵4,000 (urgent, 2yr lifespan) · Other (hand planers, clamps, multitools, circular saws, grinders, sanders) — GH₵10,000.

### Tools & Infrastructure
**CMS posts (admin-uploaded project modals):** `admin.html` (React, X-NWD-Key auth) lets the owner create posts — title, location, category, **multi-page targeting**, write-up, up to 4 images (uploaded via Worker `/api/posts/upload`). `js/cms-posts.js` runs on any page with `<section id="cms-posts" data-page="<slug>">`, fetches `/api/posts?page=<slug>`, and renders cream cards that open a modal (unified with the `pm-*` two-column style — big main image + thumbnail strip + write-up + click-to-zoom; keeps its own `.cms-*` classes to avoid clashing with inline `pm-*`). Targetable pages are the `PAGES` array in `admin.html`; section labels are `PAGE_LABELS` in `cms-posts.js`. The Worker filters generically by membership in the post's `pages[]`, so **adding a new target page needs no Worker change** — add it to `PAGES` (admin), `PAGE_LABELS` (cms-posts.js), and drop a `#cms-posts[data-page=…]` section on the page. Home is wired (slug `index`, "Recent Work"); the homepage's old hardcoded cards were renamed "Featured Projects". Post fields map: category→eyebrow, title→h2, location+year→meta, write-up paragraphs→body.

**Dispatch app:** `/dispatch.html` — crew job management PWA.
**Pricing tool:** `/pricing.html` — admin only, internal cost calculator with quotes.
**Cutlist generator:** `/cutlist.html` — parametric wardrobe cutlist for carpenters.
**Wardrobe estimator:** `/wardrobe-estimator.html` — client-facing price range tool.
**Catalogue:** `/catalogue.html` — print-to-PDF lookbook. Self-contained single file, inline CSS, A4 print-optimised (`@page size:A4`), green/gold/cream system. 6 sections (Wardrobes · Kitchens · Beds · Dining & Living · Solid Wood · Commercial & Institutional). Real photos only, no pricing. In sitemap.xml; not yet linked from nav.

**Dispatch backend (⚠ do not modify without explicit instruction — see Standing Instruction 5):**
- Cloudflare Worker: `neewoody-dispatch-api` (lives only in the CF dashboard; a copy is `worker.js` in repo)
- KV namespace: `neewoody-dispatch`. API key: `nwd-dispatch-2024`
- Allowed KV keys: `nwd-crew, nwd-tools, nwd-jobs, nwd-damage, nwd-quotes, nwd-overhead, nwd-leads, nwd-config`
- Worker route: `neewoodygh.com/api/*`
- VAPID public key is in `dispatch.html`; private key is in the Worker — never replace these without forcing all crew to re-subscribe.

**Push notifications:** Browser dispatch uses Web Push (VAPID); native Android app uses Expo push tokens (stored as `expo-{crewId}` in KV); Worker sends to both simultaneously. Admin push subscription stored as `sub-cr01`.

**Workshop GPS:** 5.56108374374371, -0.21373364856801483 (Amugi Ave, Accra). Geofence radius: 100m (adjustable in admin settings).

### Dispatch Job Lifecycle
Briefed → Pre-departure (checklist locked, items packed) → Departed (GPS gated at workshop) → En route → On site (GPS gated at site) → Return check (all tools accounted for) → Closed.

**Crew roles:** Admin (Nuer) — full access · Supervisor (Kevin) — assigned jobs, can oversee two simultaneously · Lead Apprentice — field supervisor on split-crew jobs · Work Hand / Trainee — crew view only. **Split crew:** two jobs run simultaneously; lead apprentice is field supervisor on Job B, still reports to Kevin.

### Quote Reference System
Quotes saved to KV as `nwd-quotes`. Reference format `NWD-001`, `NWD-002`. Statuses: Draft → Sent → Accepted → Declined. Actual-costs tab tracks real expenditure against quoted — admin only. Net profit projection defaults: 15% income tax, 20% idle-time reserve.

### Site Key Conventions
- Deployment: push to `main` → Cloudflare Pages auto-deploys. No build system.
- Nav structure: Home · Wardrobes · Kitchens · Beds · More ▾ · Portfolio · Contact · Tools ▾
- Instagram token: `IG_TOKEN` in Cloudflare Pages dashboard (expires every 60 days — refresh required).
- Contact form: POSTs to `/api/lead` (Worker saves to KV, sends push to admin).
- Analytics: GA4 (G-ZP77WR6BNH) + Cloudflare Web Analytics (automatic).

## Reusable Project Modal (`pm-*`)

A self-contained "project modal" component to showcase small/medium projects **without a dedicated case-study page** (full `projects/*.html` pages remain for large commissions like Sage, Nadia, Achimota). The batch-by-batch log of cards built lives in `HISTORY.md`; the mechanism is:

- A trigger element with `data-pm="<template-id>"` (any element) opens a modal populated from a matching hidden `<template>`.
- The `<template>` carries `data-eyebrow`, `data-title`, `data-meta`, the write-up as `<p>` children, and an image list as `<figure data-webp data-jpg data-alt>` inside a hidden `.pm-srcs` div.
- JS builds a two-column modal: text (eyebrow/title/meta/paragraphs) + media (main image + thumbnail strip). Thumbs swap the main image; clicking the main image opens a full-screen **zoom**. Close via ×, backdrop, or Esc (Esc closes zoom first, then modal).
- Component pieces (CSS `.pm-*`, `#pm-overlay`/`#pm-zoom` markup, the `<template>`, the IIFE script) are **injected per page** (static site, no shared includes). Injector: `C:/Users/Neewoody/.img-tmp/inject_modal.py` (idempotent — skips if `pm-overlay` present); solid-wood variant `inject_solidwood.py`.
- **To add a new modal project:** drop a `<template id="pm-yourslug" …>` on each page that should surface it + a `data-pm="pm-yourslug"` trigger. No new page needed. `portfolio.html` currently carries 14 `pm-*` cards; also used on `kitchens.html`, `tv-units.html`, `solid-wood.html`.

## Image Format Policy

- **New projects** (new photos, not yet used anywhere on the site): convert to WebP with JPG fallback using `<picture>` markup, per the pattern in `images/projects/spintex-newyork-vanities/` (commit d12c6c5). Hero images target 200–300KB, supporting/detail 80–150KB.
- **Existing/legacy images already in use** (plain `.jpg`, no `<picture>`): leave as-is by default. Do NOT convert as a side effect of an unrelated task.
- **Migrating a legacy image** to WebP/`<picture>` is a deliberate, scoped task only — and only after identifying every page that references it (many project photos are reused across pages). Update all referencing pages in the same pass so no image exists inconsistently in both formats.
- No site-wide bulk conversion sweep without an explicit, separate instruction scoped to that alone.

## _inbox Workflow
Raw images can be dropped in `_inbox/` with a description. Claude Code renames, sorts into `images/projects/{slug}/`, and commits. See `_inbox/README.md`. Originals remain in `_inbox/` after sorting for manual deletion. (There is a standing backlog of unsorted portfolio photos in `_inbox/` awaiting a cataloguing session.)

## Carpentry Concierge — Phase 1 (built + **deployed live** 2026-07-14)

Membership platform for Ghanaian carpenters, run by Neewoody. Founding members (~50) register via WhatsApp, pay GHS 50/month by manual Mobile Money (recorded by admin), and get a members directory + save-gating on tools. **Full build spec: `CONCIERGE_SPEC.md`** (its decisions are final — do not substitute more common patterns without owner sign-off).

**Status: LIVE.** Worker deployed at `concierge-api.neewoodygh.workers.dev`; D1 `concierge` created + migrated; `SESSION_SECRET` set; first admin (Nuer, phone `233244633464`, role admin, approved) created. `wrangler.toml` `database_id` is set and committed (`b46b99f`). Frontend pages live on Pages. Verified end-to-end in production (health, login, 401/429). *(Bootstrap gotcha that cost an hour — an argv off-by-one in the PIN-hash generator — is written up in `HISTORY.md` so it isn't repeated.)*

**Deliberately isolated architecture (do not merge into dispatch — see Standing Instruction 5):**
- **Separate Worker `concierge-api`, in-repo at `/concierge-api/`** with its own `wrangler.toml`, deployed via `wrangler deploy`. NOT added to `neewoody-dispatch-api`.
- **Cloudflare D1** database `concierge` (NOT KV). Migrations: `/concierge-api/migrations/0001_initial.sql` — tables `members` (phone PK), `payments`, `login_attempts`. Specialties are a fixed vocabulary: `furniture, site_construction, upholstery, glass_aluminium, finishing_spray, cnc_machining, other`.
- **Shared R2** bucket `neewoody-media` under a `concierge/` prefix (no new bucket).
- Worker code: `/concierge-api/src/index.js` (single file — router, auth, crypto, handlers). Bindings: `DB` (D1), `MEDIA` (R2). Secret: `SESSION_SECRET` (HMAC key; never committed).

**Auth: phone + 5-digit PIN (no email, ever, in Phase 1).**
- Phone normalized to `233XXXXXXXXX` (accepts `0XX…`, `+233…`, `00233…`); phone is the PK. Exposing phone inside the members-only directory is a **feature** (WhatsApp `wa.me/<phone>` deep links — members hire members).
- PIN hashed with PBKDF2 (Web Crypto, SHA-256, 100k iters, 16-byte salt), stored `base64(salt):base64(hash)`. Never stored/logged in plaintext.
- Session = stateless token `base64(phone.expiry).base64(HMAC-SHA-256)`, 30-day expiry, in `localStorage`, sent as `Authorization: Bearer`. `requireAuth`/`requireAdmin` middleware.
- Rate limit: 5 failed PINs per phone per 15 min → 429 (tracked in `login_attempts`; lockout blocks even a correct PIN during the window). The login handler self-prunes each phone's attempt rows older than the window, so `login_attempts` never grows unbounded.
- **Forgotten-PIN reset is admin-only** (locked-out member WhatsApps the owner, who resets via the admin dashboard or directly in D1). **BUT** an authenticated member CAN change their own PIN via `PUT /api/me` (optional `pin` field, validated 5 digits, re-hashed). The changed PIN applies at next login; the current session's token stays valid (token is HMAC over phone+expiry, independent of the PIN). Directory profile-edit modal has a "New PIN — optional" field. **No public self-serve registration** — admin enters founders.

**API routes** (JSON; CORS restricted to `neewoodygh.com`/`www` + localhost; disallowed origins get the canonical origin, never reflected): `POST /api/auth/login`; member `GET/PUT /api/me`, `GET /api/directory` (approved only, incl. phone); admin `GET/POST /api/admin/members`, `PUT /api/admin/members/:phone` (status/role/is_founder/profile/reset-PIN), `POST /api/admin/payments` (upserts on member+period), `GET /api/admin/payments?period=YYYY-MM`. Full table in `/concierge-api/README.md`.

**Frontend** (static, no framework, green/gold/cream system, mobile-first, all `noindex`, out of `sitemap.xml`/nav):
- Shared helper `js/concierge.js` (`window.Concierge`: API base, token storage, `api()` fetch, `requireSession`, phone/WhatsApp helpers, specialty labels).
- `/concierge/login.html` (phone + PIN → directory), `/concierge/directory.html` (member cards + area/trade filters + WhatsApp + edit-own-profile modal), `/concierge/admin.html` (vanilla JS — add-member, members table with inline status/role/founder/reset-PIN, record + view payments; admin-gated via `/api/me`).

**Cutlist gating (free to use, login to persist):** `cutlist.html` calculator stays **fully usable logged-out** (top-of-funnel — never gate the calculator). A "💾 Save" button calls `saveCutlist()` — a Phase-1 **stub**: no token → prompt to `/concierge/login.html`; has token → "coming soon" (a `saved_cutlists` table + persistence is a later migration).

**Deploy runbook & first-admin bootstrap:** `/concierge-api/README.md`.

**Out of scope for Phase 1 (do not build):** email/SMS/OTP, self-service *forgotten*-PIN reset (unauthenticated flow — still admin-only; an *authenticated* member changing their own PIN via `PUT /api/me` IS in), Paystack/payment APIs, forums/chat/suggestion portal, safety check-in (Phase 2), public self-serve registration, any site framework migration.

## Active Pending Decisions
- **Shelving in nav:** an earlier instruction asked to remove Shelving from the desktop "More ▾" dropdown and mobile nav and relocate it to the footer only. Not yet done — flagged to owner, **awaiting go-ahead before changing nav.**

## Known Pending Items (Backlog)
1. Estimator — add prominent link from service pages
2. FAQ schema markup across service pages
3. Pricing — client-facing quote PDF output
4. Cutlist — save/load named configurations (Concierge Phase 2 — depends on `saved_cutlists` migration)
5. Android app — Expo project ID fix for push notifications (use a7e03272-e2ca-4621-b63a-19d80b825084)
6. KV backup — weekly JSON export via Cron Trigger
7. Pricing — make labour day rates configurable (not hardcoded)
8. Dispatch — offline support, damage photos, job calendar view
9. Strategic — client job status page, invoice generator. Carpentry Concierge: Phase 1 built + deployed; Phase 2 (safety check-in, saved cutlists, richer features) awaiting a separate spec.
10. Bamboo craft integration — explore for premium/sustainable product line
