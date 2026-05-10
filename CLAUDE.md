# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standing Instructions

1. At the end of every session where decisions were made, scope was clarified, features were built, or anything changed about the business, site, or tools — automatically update this CLAUDE.md file to reflect those changes without being asked.

2. If a correction is made during a session (wrong attribution, wrong scope, wrong technical detail) — update CLAUDE.md immediately, not at the end.

3. Never remove existing context. Only add or correct.

4. After updating CLAUDE.md, include it in the same commit as the rest of the session's changes.

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
- **Dispatch** (`dispatch.html`): React 18 SPA loaded via unpkg CDN with Babel standalone for JSX — this is the internal crew/job management app
- **Case studies** (`projects/house-of-walker.html`, `projects/sage-centre.html`): project detail pages

### Serverless
- `functions/api/instagram.js` — Cloudflare Worker; fetches latest Instagram media and returns top 6 posts. Cached 15 minutes (`max-age=900`).

### PWA
- `sw.js` — Service Worker for Web Push notifications, used exclusively by the Dispatch app
- `manifest.json` — PWA manifest (app name: "Neewoody Dispatch")
- Push notifications open `/dispatch.html` on click

## Design system

All styling is in `/css/styles.css` using CSS custom properties. Key tokens:
- `--clr-accent`: `#A0784A` (warm wood brown — primary brand colour)
- `--clr-bg`: `#F7F4EF` (cream)
- `--clr-dark`: near-black for text
- Typography: **Playfair Display** (headings) + **DM Sans** (body), loaded from Google Fonts

Common UI patterns implemented in `/js/main.js`:
- Mobile nav toggle
- Scroll-reveal (`.reveal` class → fade-in on IntersectionObserver)
- Portfolio filter (data-filter attributes)
- FAQ accordion (single-open state)
- Instagram feed fetch from `/api/instagram`

## Key conventions

- New marketing pages should follow the existing HTML structure: same `<head>` meta/font links, nav, and footer pattern as `index.html`
- The nav includes a **Services dropdown** with tool badges for the estimator and dispatch — update it in every page when adding new pages
- Structured data (JSON-LD `LocalBusiness` schema) lives in `index.html` — update there for business info changes
- SEO files (`sitemap.xml`, `robots.txt`) are hand-maintained — update `sitemap.xml` when adding new pages
- The dispatch React app uses **no bundler** — JSX is transpiled in-browser by Babel standalone; keep it self-contained within `dispatch.html`

---

## Business Context

### The Company
Neewoody Custom Woodwork — bespoke furniture and carpentry business based in Accra, Ghana.
Owner: Nuer (admin)
Workshop: Amugi Avenue, Accra (GPS: 5.56108, -0.21373)
Email: neewoodygh@gmail.com
Google Business: 4.8 stars, 14 reviews

### Target Clients
- Expat homeowners (East Legon, Cantonments, Airport Residential, Trasacco)
- NGOs and institutional clients (e.g. Sage Centre — educational retreat centre)
- Local homeowners and developers
- Other carpenters (via the cutlist and estimator tools)

### Crew & Day Rates
- Kevin — Site Supervisor — GH₵200/day
- Lead Apprentice — GH₵150/day (acts as field supervisor on split-crew jobs)
- Work Hand — GH₵100/day
- Trainees — GH₵50/day each (cost, not free help)
- Nuer (owner) — supervisory rate varies by job tier (see pricing tiers)

### Pricing Logic
Fully loaded cost model: Materials + Labour + Overhead × Tier Multiplier × Add-on Multipliers

**Monthly Overhead: GH₵6,016**
- Rent: GH₵1,500
- Electricity: GH₵1,000
- Bits & blades: GH₵800
- Safety consumables: GH₵300
- Internet: GH₵350
- Water: GH₵200
- Airtime: GH₵200
- Rubbish collection: GH₵240
- Hosting: GH₵100
- Capital replacement reserve: GH₵1,326/month
  (Table saw GH₵179, Routers GH₵208, Spindle moulder GH₵119,
   Fasteners & drills GH₵208, Bench planer GH₵167,
   Welding machine GH₵167, Other machinery GH₵278)

**Daily Overhead Rate: GH₵274/day** (GH₵6,016 ÷ 22 billable days)
Applied across total job days (workshop days + site days combined)

**Pricing Tiers (internal names — never show clients):**
- Basic Build — just the essentials, functional — ×1.45 — Nuer rate GH₵200/day
- Standard Build — functional and presentable — ×1.65 — Nuer rate GH₵400/day
- Premium — we take our time — ×1.90 — Nuer rate GH₵600/day
- Luxury — at your beck and call — ×2.10 — Nuer rate GH₵700/day

**Add-on Multipliers:**
- Rush: +20%
- Custom design: +12%
- CNC/carved: +18%
- Remote install: +8%

**Output to client: one encapsulated price only. Never show cost breakdown.**

### Job Types
**Cabinetry** — kitchens, wardrobes, office furniture, laminate work
Default materials: Boards, Back panels, Edge band, Edge banding application, Cutting, Fixtures, Finishing materials, Abrasives, Consumables, Protective packaging

**Hardwood / General Furniture** — doors, staircases, pergolas, solid wood, dining, beds
Default materials: Timber, Fixtures, Abrasives, Wood filler/grain filler, Stain, Finishes, Joinery hardware, Consumables, Protective packaging

Both types share: Logistics (Primary, Secondary with return trip toggle, Tertiary site visits)
Optional add-ons: Stone material, Stone fabrication, Templates/jigs, Glass
All jobs have workshop prep days. Pergolas: air dry, cut rafter tails, pre-stain in workshop, then site.

### Machinery (Capital Reserve Reference)
- Table saw — GH₵15,000 replacement
- Routers — GH₵5,000 (urgent — 2yr lifespan, replace soon)
- Spindle moulder — GH₵10,000
- Fasteners & drills — GH₵10,000
- Bench top planer — GH₵7,000
- Welding machine — GH₵4,000 (urgent — 2yr lifespan)
- Other (hand planers, clamps, multitools, circular saws, grinders, sanders etc) — GH₵10,000

### Tools & Infrastructure
**Dispatch app:** /dispatch.html — crew job management PWA
**Pricing tool:** /pricing.html — admin only, internal cost calculator with quotes
**Cutlist generator:** /cutlist.html — parametric wardrobe cutlist for carpenters
**Wardrobe estimator:** /wardrobe-estimator.html — client-facing price range tool

**Backend:**
- Cloudflare Worker: neewoody-dispatch-api
- KV namespace: neewoody-dispatch
- API key: nwd-dispatch-2024
- Allowed KV keys: nwd-crew, nwd-tools, nwd-jobs, nwd-damage, nwd-quotes, nwd-overhead, nwd-leads, nwd-config
- Worker route: neewoodygh.com/api/*
- VAPID public key is in dispatch.html — private key is in the Worker — never replace these without forcing all crew to re-subscribe

**Push notifications:**
- Browser dispatch uses Web Push (VAPID)
- Native Android app uses Expo push tokens (stored as expo-{crewId} in KV)
- Worker sends to both channels simultaneously
- Admin push subscription stored as sub-cr01

**Workshop GPS:** 5.56108374374371, -0.21373364856801483 (Amugi Ave, Accra)
Geofence radius: 100m (adjustable in admin settings)

### Dispatch Job Lifecycle
Briefed → Pre-departure (checklist locked, items packed) → Departed (GPS gated at workshop) → En route → On site (GPS gated at site) → Return check (all tools accounted for) → Closed

**Crew roles:**
- Admin (Nuer) — full access, all jobs
- Supervisor (Kevin) — assigned jobs, can oversee two simultaneous jobs
- Lead Apprentice — becomes field supervisor on split-crew jobs
- Work Hand / Trainee — crew view only

**Split crew:** Two jobs can run simultaneously. Lead apprentice is field supervisor on Job B, still reports to Kevin.

### Quote Reference System
Quotes saved to KV as nwd-quotes
Reference format: NWD-001, NWD-002 etc.
Statuses: Draft → Sent → Accepted → Declined
Actual costs tab tracks real expenditure against quoted costs — admin only, crew never see it
Net profit projection defaults: 15% income tax, 20% idle time reserve

### Site Key Conventions
- Deployment: push to main branch → Cloudflare Pages auto-deploys
- No build system — all files deployed directly
- Nav structure: Home · Wardrobes · Kitchens · Beds · More ▾ · Portfolio · Contact · Tools ▾
- Brand colours: --clr-accent #A0784A (timber gold), --clr-bg #F7F4EF (parchment), --clr-dark #1C1A17
- Fonts: Playfair Display (headings) + DM Sans (body)
- Instagram token: set as IG_TOKEN in Cloudflare Pages dashboard (expires every 60 days — refresh required)
- Contact form: POSTs to /api/lead (Worker saves to KV, sends push to admin)
- Analytics: GA4 (G-ZP77WR6BNH) + Cloudflare Web Analytics (automatic)

### Jerksoul Restaurant — Scope Clarification (2026-05-10)
The rooftop structure (pergola/polycarbonate roof) visible in Jerksoul photos and videos **belongs to the venue — it was not built by Neewoody**. Neewoody's actual scope was:
- Custom pine dining tables with branded Issacher glass tops (15+ sets)
- Upholstered cube stools paired to the dining sets and bar counter
- Large interior bar counter with reclaimed-style timber panel cladding and solid wood top

All site copy, case study text, and portfolio cards have been corrected to reflect this. Do not re-introduce pergola attribution to Neewoody in any future content.

### Project History (Key Commissions)
- **Golf Hills Estate (2021):** Stained pine X-frame dining table, matching bench, built-in L-shaped leatherette banquette with under-seat storage, and a timber-framed wall mirror above the banquette. All four pieces built and installed as one kitchen dining zone. Kitchen cabinetry visible in the background of photos is pre-existing and was not part of this commission — never claim it as Neewoody work. Images in `images/projects/golf-hills-estate/`. Case study: `projects/golf-hills-estate.html`.
- **Ridge Residence (2021):** Afromosia live-edge dining table with solid timber U-frame legs. Commissioned by French expatriates on posting in Ghana. Private residential client — not a French Embassy commission. Images in `images/projects/french-embassy/`. Case study: `projects/french-embassy.html`.
- **Judith East Legon (2022):** Full Hyedua dining room commission — large-format dining table, 6 upholstered chairs with linen fabric panels, console unit with full-extension drawers and waterfall edge sides. All three pieces built to one unified brief in the same timber, finished in a rich espresso. Images in `images/projects/judith-east-legon/`. Case study: `projects/judith-east-legon.html`.
- **Jerksoul Restaurant (2022):** Bar counter and dining furniture for a rooftop restaurant in Accra. Neewoody scope was dining tables, cube stools, and bar counter only. The rooftop structure/pergola belongs to the venue — never claim it as Neewoody work.
- **Sage Centre (2022–2024):** 26-month full-property teak fitout for a US-based educational NGO in Wli, Volta Region. Case study: `projects/sage-centre.html`.
- **House of Walker:** Branded structural carpentry installation for Johnnie Walker's 200-year celebration at One Airport Square, Accra. Case study: `projects/house-of-walker.html`.

### _inbox Workflow
Raw images can be dropped in `_inbox/` with a description. Claude Code will rename, sort into `images/projects/{slug}/`, and commit. See `_inbox/README.md` for full instructions. After sorting, originals remain in `_inbox/` for manual deletion — the 9 currently unsorted files (as of 2026-05-10) are `123508`, `123515`, `123520`, `123528`, `162004`, `171115`, `190624`, `190625`, `194810`.

### Known Pending Items (Backlog)
1. Estimator — add prominent link from service pages
2. FAQ schema markup across service pages
3. Pricing — client-facing quote PDF output
4. Cutlist — save/load named configurations
5. Android app — Expo project ID fix for push notifications (use a7e03272-e2ca-4621-b63a-19d80b825084)
6. KV backup — weekly JSON export via Cron Trigger
7. Pricing — make labour day rates configurable (not hardcoded)
8. Dispatch — offline support, damage photos, job calendar view
9. Strategic — client job status page, invoice generator, Carpentry Concierge subscription
10. Bamboo craft integration — explore for premium/sustainable product line
