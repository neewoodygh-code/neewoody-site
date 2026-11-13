# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Completed project history, catalogued projects (wardrobes/kitchens), the `pm-*` card batch log, and dated change-logs live in [`HISTORY.md`](HISTORY.md).** This file holds current architecture, standing instructions, and active projects. When an archived project becomes relevant again, read `HISTORY.md`.
>
> **Detailed notes per area live in `docs/` (split out 2026-11-13 so this file stays short). Open the one you need before working on that area:** `docs/site-redesign.md` (design system history, page migrations, case studies, nav/logo rollout) · `docs/concierge-build-log.md` (every Concierge feature, data model, API routes, payments, safety) · `docs/tools/invoice-generator.md` · `docs/tools/job-pricing.md` · `docs/tools/cutlist.md` · `docs/tools/cut-sheet.md` · `docs/tools/cms-posts.md`.

## Standing Instructions

1. At the end of every session where decisions were made, scope was clarified, features were built, or anything changed about the business, site, or tools — automatically update this CLAUDE.md file to reflect those changes without being asked. **Keep CLAUDE.md short:** put the rule or current state here in a sentence or two, and the dated change-log detail in the matching `docs/` file (create one for a new area).
2. If a correction is made during a session (wrong attribution, wrong scope, wrong technical detail) — update CLAUDE.md immediately, not at the end.
3. Never remove existing context. Only add or correct. (Relocating completed history to `HISTORY.md` or detail to `docs/` is allowed — that preserves context; deleting it is not.)
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

**Deployment:** Push to the `main` branch — the site deploys via Cloudflare Pages. **Deploy link (2026-11-13):** pushes silently stopped deploying after 12 Nov (GitHub showed no Cloudflare check run on new commits). Fixed by the owner reconnecting the Pages project `neewoody-site` to GitHub (Settings → Build → Git repository → Connect; production branch `main`, no build command, output dir empty). To make the Connect dialog list the repo, the **Cloudflare Workers and Pages GitHub app** (installed on the personal account `neewoodygh-code`) had its Repository access changed from **"All repositories" to "Only select repositories: neewoody-site"**. **If any other repo ever needs Cloudflare Git builds (a new Pages/Workers project), it must be added in GitHub → Settings → Applications → Cloudflare Workers and Pages → Repository access, or Cloudflare won't see it.** To check a deploy happened: the commit gets a "Cloudflare Pages" check run on GitHub; no check run = Cloudflare never saw the push. The `functions/` directory is automatically picked up as Cloudflare Workers.

**Cloudflare Worker env vars:** The Instagram feed function (`functions/api/instagram.js`) requires `IG_TOKEN` set in the Cloudflare Pages dashboard (not in code).

## Architecture

### Pages
- **Marketing pages** (`index.html`, `pricing.html`, `portfolio.html`, category pages): standard static HTML
- **Product category pages** (`wardrobes.html`, `kitchens.html`, `beds.html`, `shelving.html`, `tv-units.html`, `solid-wood.html`, `dining-living.html`): follow the same layout pattern
- **Tools** (`wardrobe-estimator.html`, `cutlist.html`, `cut-sheet.html`): calculator tools, vanilla JS
- **Dispatch** (`dispatch.html`): React 18 SPA loaded via unpkg CDN with Babel standalone for JSX — the internal crew/job management app
- **Case studies** (`projects/*.html`): project detail pages
- **Concierge** (`concierge/login.html`, `register.html`, `directory.html`, `admin.html`): member platform frontend — see the Carpentry Concierge section. `register.html` is the PUBLIC self-service signup (indexed, in sitemap); the rest are `noindex`.
- **Hire a Carpenter** (`hire.html`): PUBLIC client-facing page (indexed, in sitemap, new design system) — clients/non-member masters post a job with no account; it's moderated by admin then appears on the members' Jobs board. Loads `js/concierge.js` for shared vocab + `api(...,{auth:false})`. See the Carpentry Concierge section.
- **404 page** (`404.html`): custom not-found page, auto-served by Cloudflare Pages with a real HTTP 404 for unknown URLs (added 2026-07-15 — before this, Pages soft-404'd unknown URLs to `index.html` with a 200). New design system, standard nav/footer, `noindex`, deliberately excluded from `sitemap.xml`. All hrefs/asset paths are **root-absolute** (`/images/…`) because the page is served at any URL depth — keep it that way.

### Serverless
- `functions/api/instagram.js` — Cloudflare Worker; fetches latest Instagram media and returns top 6 posts. Cached 15 minutes (`max-age=900`).
- `functions/api/lead.js` — contact form handler.
- `concierge-api/` — the Carpentry Concierge Worker (separate; see its section).

### PWA
- `sw.js` — Service Worker for Web Push notifications, used exclusively by the Dispatch app. **A second, separate SW exists at `concierge/sw.js`** (scope `/concierge/`, Concierge job alerts, own VAPID keys on concierge-api) — never merge the two.
- `manifest.json` — PWA manifest (app name: "Neewoody Dispatch")
- Push notifications open `/dispatch.html` on click

## Redesign prototype (Astro, 2026-11-13)
Owner asked for a clean-slate premium redesign ("forget the rules, use React/Node, act as a senior dev"). Working prototype of the homepage lives in **`_studio/astro/`** (gitignored, local only, not deployed): Astro 7 + one React island (work gallery), `astro:assets` responsive AVIF/WebP, self-hosted fonts (Cormorant Garamond + Manrope), Lenis smooth scroll, new palette from the wood (bone `#efe9df`, espresso `#17130f`, walnut `#6b4a33`, brass `#c49455`), the logo's slanted N as the one motif (`.slash`). Content is all in static HTML (no-JS safe), services index links to the existing pages, JSON-LD + GA4 (prod domain only). Lighthouse local: mobile 98/100/100/100 at 258 KB, desktop 100x4. Copy lives in `src/data.js`; photos in `src/assets/photos/`. Run: `npm --prefix _studio/astro run build` then launch config `astro` (port 4321). Earlier throwaway versions: `_studio/site/` (Vite React SPA, superseded because it shipped empty HTML) and root `concept-premium.html`. Not yet decided: whether the whole site moves to Astro.

## Design system

### Official Neewoody colours (owner-approved 2026-11-11 — "Forest and timber")
The owner had never formally settled brand colours; after comparing four options (forest+timber, charcoal+iroko, walnut+brass, olive+clay) they chose to **make the existing palette official**. These are now THE Neewoody brand colours for the website, company profile, quotes/invoices, signage, social and video. Do not introduce new brand hues.

| Name | Hex | Role |
|---|---|---|
| Forest green | `#0B1F0E` | The anchor: headers, footers, feature panels, primary buttons (~30%) |
| Timber gold | `#C8922A` | The accent: CTAs, prices, one key highlight, large text only (~10%) |
| Cream | `#F0E8D0` | The page: backgrounds (~60%) |
| Ink | `#1C1C1A` | Body text and headlines on cream |
| Bark | `#5E584B` | Small/secondary text on cream (passes 4.5:1) |
| Deep gold | `#7F5A12` | Gold-coloured SMALL text on cream (brand gold fails contrast at small sizes) |
| Sawdust | `#E8DFC4` | Panels, dividers, alternate bands |

Rules: cream for pages, green for weight, gold as the spark (never everything gold) · never small `#C8922A` text on cream — use deep gold · cream text on green ≥ `rgba(240,232,208,0.62)` for small text · photos bring any other colour; no extra blues/reds/purples in the design · fonts stay Playfair Display + Lora + Jost. **Carpentry Concierge** uses the same gold/cream/ink with **navy `#1F2F58`** in place of the green (sister brand, related but distinct). **Legacy pages** still on `css/styles.css` use an older brown-gold `#A0784A` on `#F7F4EF` — that is NOT the brand; each page moves to the official palette when it is migrated to the new design (no separate sweep needed).

**Two systems currently coexist** (mid-migration — see the redesign rollout status in `HISTORY.md`):

- **Current/new (the homepage standard):** self-contained inline CSS, no `css/styles.css` (never add it back to `index.html`). Tokens `--green #0b1f0e`, `--gold #c8922a`, `--cream #f0e8d0`, `--cream-dark #e8dfc4`, `--ink #1c1c1a`, `--muted #5e584b`, `--gold-ink #7f5a12`; `--max` 1320px, one section spacing `--sec`, `--r` 6px (buttons/labels), `--r-card` 10px (photos/cards). Fonts Playfair Display + Lora + Jost. **`index.html` is THE template for every Neewoody page (owner, 2026-11-11).** Rules: roman headlines (no italic accent word), no eyebrows or section numbers, sentence-case untracked labels, no `·`-joined meta, no stat strips, no identical card rows, real photos (during/after pairs), split hero = photo + headline + one sentence + gold WhatsApp CTA + real facts. Shadow + gold corner (`.tile-corner`) = clickable. Floor: `:focus-visible`, `prefers-reduced-motion`, `overflow-x:clip`, `minmax(0,1fr)` tracks, img width/height. **Migrating a page** = copy the homepage's first `<style>` block + nav/mnav/footer + nav script, drop the floating WhatsApp bubble, restyle the page's own sections without reshuffling its structure or copy. **Two brands:** Neewoody = green; Carpentry Concierge = navy `#1f2f58` with the same gold/cream. **Done:** homepage, all category pages, portfolio, contact, hire, and case studies bortianor, sage-centre, nadia-dome, golf-hills-estate, french-embassy. **Still old style:** projects achimota, house-of-walker, jerksoul, judith-east-legon. Gotcha: never name a card class `hero` (the homepage `.hero` CSS catches it). CMS card templates use `data-join=", "`. Full history and per-page notes: **`docs/site-redesign.md`**. See the [[design-editorial-direction]] memory.
- **Legacy (pages not yet migrated, e.g. tools.html, pricing.html, privacy.html, wardrobe-estimator.html):** `/css/styles.css` with `--clr-accent:#A0784A`, `--clr-bg:#F7F4EF`, Playfair + DM Sans, `--max-w` 1300. Not the brand; a page moves to the new system when it is migrated. Light-touch pattern (`cutlist.html`): override the `--clr-*` tokens in a page-level `:root` after the stylesheet link. Details: `docs/site-redesign.md`.

Common UI patterns in `/js/main.js` (legacy pages): mobile nav toggle, scroll-reveal (`.reveal` → IntersectionObserver fade-in), portfolio filter (data-filter), FAQ accordion (single-open), Instagram feed fetch from `/api/instagram`.

## Key conventions

- New marketing pages follow the existing HTML structure: same `<head>` meta/font links, nav, and footer pattern.
- The nav includes a **Services dropdown** with tool badges — update it in every page when adding new pages.
- Structured data (JSON-LD `LocalBusiness` schema) lives in `index.html` — update there for business info changes. (Note: WebFetch strips `<script type=ld+json>`, so the schema looks absent to external crawlers but renders/validates fine. Workshop geo is `5.56108, -0.21373`, street `Amugi Avenue`, email `neewoodygh@gmail.com`.)
- SEO files (`sitemap.xml`, `robots.txt`) are hand-maintained — update `sitemap.xml` when adding new **public** pages (Concierge pages are `noindex` and deliberately excluded). **Canonical, og:url, JSON-LD and sitemap URLs use CLEAN addresses (no `.html`, 2026-11-09)** — Cloudflare Pages 308-redirects `/x.html` → `/x`, so `.html` canonicals pointed Google at a redirect. Relative internal links still use `.html` (kept so file:// local preview works; each costs one redirect live). Never list a `noindex` page in the sitemap (`carpenter-pricing.html` was removed for that reason). `favicon.ico` (root + `images/`, 16/32/48 from the NW logo) exists as of 2026-11-09. **Contrast (2026-11-09):** `--muted` is `#5e584b` (was `#6b6557`, failed 4.5:1 on cream-dark); small gold labels (`.section-eyebrow`, `.svc-num`, `*-type-num`, `*-scope-num`) use `var(--gold-ink,#7f5a12)` — the brand `--gold` is unchanged for large text/accents; faint cream text on green (footer tagline/nav/copy, stat labels, testimonial roles) is `rgba(240,232,208,0.62)` minimum. Use these for new small text. ~~Still open: www duplicate, no `_headers`~~ ✅ DONE 2026-11-13: a Cloudflare **Redirect Rule** (zone `neewoodygh.com`, rule "www to neewoodygh.com (301)") sends every `www.` URL to the same path on the apex, query kept; `_headers` caches `/images/*` 7 days and `/js/*` + `/css/*` 1 day (all with stale-while-revalidate), plus `Referrer-Policy` + `X-Frame-Options: SAMEORIGIN` site-wide. Bump `?v=` on any js/css change. Side effect: localStorage saved under `www.` (Concierge session, local cut sheets) stays on that origin.
- **Internal files are blocked from the public site by `_redirects` (2026-11-13).** Cloudflare Pages publishes every file in the repo, and until then CLAUDE.md, HISTORY.md, the Concierge docs, `docs/`, `concierge-api/` source, `scripts/` and `worker.js` were all readable at neewoodygh.com. `_redirects` now sends those paths to `/404` (redirects apply even when the file exists, and cost no Function invocations). **Any new internal `.md` at the root or new private folder must be added to `_redirects`.** Test with `npx wrangler pages dev .` (launch config `pages`, port 8788); plain `python -m http.server` ignores `_redirects`. Not covered: `Optimise Images.ps1` / `.bat` (spaces in the name; harmless image script).
- The dispatch React app uses **no bundler** — JSX is transpiled in-browser by Babel standalone; keep it self-contained within `dispatch.html`.

---

## Business Context

### The Company
Neewoody Custom Woodwork — bespoke furniture and carpentry business based in Accra, Ghana.
Owner: Nuer (admin) — full legal name **Nuer Kobla Adumua-Bossman** (client-facing title used on the company profile: "Founder & Master Craftsman"). Workshop: Amugi Avenue, Accra (GPS: 5.56108, -0.21373). Email: neewoodygh@gmail.com. Google Business: 4.8 stars, 14 reviews.
**Registration (from cert, 2026-08-11):** registered business name **NEEWOODY CUSTOM WOODWORK**, Business Name No. **BN208612017** (cert no. P0008306850), Registration of Business Names Act 1962 (No.151), dated **2 May 2017**. **Trading since 2015** (owner-confirmed; the earlier "since 2016" brand line is superseded — use **2015** as the established year, or "registered 2017" when the legal date is meant). Phone/WhatsApp: **+233 24 463 3464** (0244633464). Website neewoodygh.com · IG @neewoodygh.
**Client terms (owner-set, used on the company profile):** 70% deposit to commence / 30% on completion · deposit non-refundable once materials bought or production begins · quotes valid 14 days · **no indemnity on hardwood** (natural movement/checks/colour ≠ defects) · hardwood kiln/air-dry 3–6 months · delivery & install NOT included unless stated · post-sign-off changes = priced change-order · released/installed only after final payment · **lifetime limited warranty = non-user-caused faults fixed at cost, no profit**.
**Brand logo asset:** `images/logo.png` = the NW monogram, **black art on WHITE (opaque) bg**, 3300². For dark backgrounds derive a transparent white version (black→opaque white, white bg→transparent; e.g. sharp `alpha=255−luminance`) — renders as white bars with knocked-out lettering, matching the owner's navy-bg logo. See [[company-profile-brand-facts]].
### Company profile deliverable (2026-08-11)
A client-requested **Company Profile** was built as a designed 9-page A4 PDF (green/gold/cream, Playfair/Lora/Jost), rendered via headless Chrome `--print-to-pdf` from a self-contained HTML in the session scratchpad (source not committed to the repo). Pages: cover · about+founder · services · Sage Centre case study · selected-work mosaic · reviews · how-we-work · ordering & terms · contact/back cover. Photos were resized with `sharp` (installed in scratchpad) to keep the PDF ~3 MB. If asked to regenerate/edit, rebuild from these facts.

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
**CMS posts:** the owner posts projects from `admin.html` (title, location, category, target pages, write-up, ≤4 images via Worker `/api/posts/upload`). `js/cms-posts.js` renders them on pages with `<section id="cms-posts" data-page="<slug>">`, by default as that page's OWN cards via `<template id="cms-card-tpl" data-into="<grid>">`; tv-units + shelving use the standalone section. The homepage is not targeted. New target page = `#cms-posts` section + template + slug in admin `PAGES` + `PAGE_LABELS` (no Worker change). Bump `cms-posts.js?v=` on change. Details: `docs/tools/cms-posts.md`.

**Dispatch app:** `/dispatch.html` — crew job management PWA.
**Pricing tool (owner's):** `/pricing.html` — admin only, internal cost calculator with quotes (owner's private economics).
**Invoice & Quote Generator (`invoice-generator.html`):** printable Invoice / Quote / Receipt (A4/Letter) for every logged-in Concierge member; sections + client-picks-one options with ranged totals, discount, signatures, document style panel. Local-first (localStorage) with account sync of saved invoices + settings (`GET/PUT /api/invoices`, migration 0033); the working draft stays on the device. **Never leak the owner's letterhead:** `NEEWOODY_DEFAULT_SETTINGS` (real bank details, terms, logo, tagline) seeds only the admin; everyone else gets `GENERIC_BLANK_SETTINGS` from their own profile. Receives quotes from Job Pricing via localStorage `nwd-invoice-handoff`. noindex, not in sitemap or nav. Details: `docs/tools/invoice-generator.md`.
**Member pricing tool (`carpenter-pricing.html`):** React (Babel in-browser) cost-to-quote engine, multi-tenant on concierge-api (`/api/pricing/config`, `/api/pricing/quotes`); per-member overhead, tier multipliers and add-on %, letterhead/logo, private Summary vs printable client copy (Materials + Labour + Expenses + Service charge, reconciles to the quote). Quotes group under a shared `clients` registry (migration 0034, shared with the cut sheet) and carry an `item`; dashboard has search/sort/duplicate/move/delete-with-undo. Never pre-fill the owner's real numbers for members. Details: `docs/tools/job-pricing.md`.
**Cutlist generator (`cutlist.html`):** parametric wardrobe cutlist, fully usable logged out; members save/load via `/api/cutlists`. Edge Band Sheet = inline SVG in the Ghana machine-shop convention (tap an edge: 1 tick = band, 3 ticks = double then band; length/grain on the RIGHT, width on the BOTTOM; tap the middle to flip grain). Prints one section per page. Details: `docs/tools/cutlist.md`.
**In-tool help:** `js/tool-guide.js` (floating/inline tutorial panel) is no longer used by cutlist or job pricing; both now use the first-run ribbon + `<details class="help">` pattern from `cut-sheet.html`. Native app / TWA is parked per `MVP_GATES.md`. Details: `docs/tools/cutlist.md`.
**Wardrobe estimator:** `/wardrobe-estimator.html` — client-facing price range tool.
**Cut Sheet Generator (`cut-sheet.html`):** freeform parts (named list or full-screen quick grid) → board count per board/colour code (guillotine packer) + printable machine-shop box sheet, each colour on its own page with a repeating `<thead>` header (member's own logo/name/phone when logged in, Neewoody's otherwise). Inline edge banding, edge-band metres, ballpark cost (board ₵500, roll ₵200 + ₵500 application per 100 m roll). Projects = a home holding many cut lists, with a tracker library, multi-list printing, local backup/restore and account sync (`/api/cutsheets`, migration 0032). Public and free. Details: `docs/tools/cut-sheet.md`.

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
- Nav structure: Home · Wardrobes · Kitchens · Beds · More ▾ (Dining and living · TV units · Shelving · Solid wood · Hire a carpenter · Carpentry Concierge) · Portfolio · Contact; update every page when adding a page. The Carpentry Concierge growth-rings mark (`images/concierge/cc-mark.svg`, `.nav-cc` → `/concierge/`) sits right after the Neewoody brand in every header. Session-aware pages are only `tools.html`, `cutlist.html`, `cut-sheet.html` and `/concierge/*`; `hire.html` loads `concierge.js` only for vocab + an unauthenticated call. History: `docs/site-redesign.md`.
- Instagram token: `IG_TOKEN` in Cloudflare Pages dashboard (expires every 60 days — refresh required).
- Contact form: POSTs to `/api/lead` (Worker saves to KV, sends push to admin).
- Analytics: GA4 (G-ZP77WR6BNH) + Cloudflare Web Analytics (automatic).

## Reusable Project Modal (`pm-*`)

A self-contained "project modal" component to showcase small/medium projects **without a dedicated case-study page** (full `projects/*.html` pages remain for large commissions like Sage, Nadia, Achimota). The batch-by-batch log of cards built lives in `HISTORY.md`; the mechanism is:

- A trigger element with `data-pm="<template-id>"` (any element) opens a modal populated from a matching hidden `<template>`.
- The `<template>` carries `data-eyebrow`, `data-title`, `data-meta`, the write-up as `<p>` children, and an image list as `<figure data-webp data-jpg data-alt>` inside a hidden `.pm-srcs` div.
- JS builds a two-column modal: text (eyebrow/title/meta/paragraphs) + media (main image + thumbnail strip). Thumbs swap the main image; clicking the main image opens a full-screen **zoom**. Close via ×, backdrop, or Esc (Esc closes zoom first, then modal).
- Component pieces (CSS `.pm-*`, `#pm-overlay`/`#pm-zoom` markup, the `<template>`, the IIFE script) are **injected per page** (static site, no shared includes). Injector: `C:/Users/Neewoody/.img-tmp/inject_modal.py` (idempotent — skips if `pm-overlay` present); solid-wood variant `inject_solidwood.py`.
- **To add a new modal project:** drop a `<template id="pm-yourslug" …>` on each page that should surface it + a `data-pm="pm-yourslug"` trigger. No new page needed. `portfolio.html` currently carries 15 `pm-*` cards; also used on `kitchens.html`, `tv-units.html`, `solid-wood.html`. **Latest (2026-11-10): `pm-roman-ridge-table`** — live-edge Hyedua (Ovangkol) table for a private client in Roman Ridge (brief: "a rugged table, wood with character"; client name kept off the public page), 8 WebP+JPG images in `images/projects/roman-ridge-live-edge/` (4 installed, yard, 3 stills from build clips); first card under portfolio "Made to order" and first of six on Solid Wood. Matching 32 s reel lives in Video Studio `roman-ridge-table-reel/` (silent; owner records VO from `vo-script.md` — cloned voice is for Academy/Concierge only).

**Case studies and recent photo placements:** full notes (Bortianor, the New Dump sets, every migrated case study) are in `docs/site-redesign.md`. Facts to keep in mind: Hyedua = *Guibourtia ehie* (Ovangkol), use that everywhere; `afromosia-table-unfinished.jpg` is NOT the Ridge table (job unknown, ask before using it); the four Nadia Dome videos once captioned as the kitchenette show the laundry room (pending owner confirmation); copy states only what photos show, no client names unless approved.

## Image Format Policy

- **New projects** (new photos, not yet used anywhere on the site): convert to WebP with JPG fallback using `<picture>` markup, per the pattern in `images/projects/spintex-newyork-vanities/` (commit d12c6c5). Hero images target 200–300KB, supporting/detail 80–150KB.
- **Existing/legacy images already in use** (plain `.jpg`, no `<picture>`): leave as-is by default. Do NOT convert as a side effect of an unrelated task.
- **Migrating a legacy image** to WebP/`<picture>` is a deliberate, scoped task only — and only after identifying every page that references it (many project photos are reused across pages). Update all referencing pages in the same pass so no image exists inconsistently in both formats.
- No site-wide bulk conversion sweep without an explicit, separate instruction scoped to that alone.
- **Web-size resize pass (2026-11-09, owner-approved "Yes, fix them" after a Lighthouse review — homepage was 38 MB / perf 29):** every JPG over 500 KB under `images/` (129 files, 643 MB → 26 MB) was resized **in place, same filenames** (EXIF-rotated, fit inside 2000 px, mozjpeg q78 → stepped down to 1800/q74 or 1600/q72 until ≤450 KB) with sharp — no markup changed, originals remain in the owner's Pictures library + git history. **New photos must go in at web size** (≤2000 px, ≤~400 KB) — never commit straight-off-camera files again. `images/logo.png` (3300², 147 KB, used in print headers) was deliberately left full-size. Local Lighthouse after: home 64/96/100/100 at 2.1 MB (TBT 19.8 s → 0.4 s), Kitchens 75 @ 1.2 MB, Golf Hills 67 @ 1.3 MB. Remaining homepage LCP drag = render-blocking Google Fonts + the hero text reveal, not images.

## _inbox Workflow
Raw images can be dropped in `_inbox/` with a description. Claude Code renames, sorts into `images/projects/{slug}/`, and commits. See `_inbox/README.md`. Originals remain in `_inbox/` after sorting for manual deletion. (There is a standing backlog of unsorted portfolio photos in `_inbox/` awaiting a cataloguing session.) **`_inbox/` is gitignored** (2026-07-18) — it is a local staging area only; the sorted/converted outputs in `images/projects/` are what get tracked, so `_inbox` originals never enter git. **Cleaned 2026-11-06 (owner-approved, 21 GB → 2.9 GB):** removed a stray nested full copy of the repo (`_inbox/neewoody-site/`), 185 byte-identical duplicate photos, 30 loose originals already used on the site, 11 HEICs that had JPG twins, and the whole **`Photo Dump/`** (its four `pm-*` card batches were finished; the owner keeps the originals in a separate larger photo library). Removed photos went to the Recycle Bin; the nested repo copy was deleted outright (fully redundant). What remains: `Prampram Kitchen/` (57 unused shots + 7 videos) and ~94 unsorted loose photos (mostly the June 2026 `PXL_20260610`/`PXL_20260614` shoots) + 2 videos.

## Carpentry Concierge — Phase 1 (built + **deployed live** 2026-07-14)

Membership platform for Ghanaian carpenters, run by Neewoody. The intake's purpose is **community** — carpenters collaborating, learning from each other, and getting access to member tools (current and future; the flagship future tool is the Phase 2 safety check-in, whose call-out records double as an investigation starting point if a member is ever harmed on a consultation). **Pricing model (owner-set, finalized 2026-07-18):** the first **100 founding members pay a one-time GHS 100 for lifetime membership** (no recurring fee ever); after the 100 founding places fill, everyone else pays **GHS 50/month** (manual Mobile Money, recorded by admin). This replaced the earlier "50 spots at GHS 50/mo locked, GHS 100 standard" model. Members get the members directory + save-gating on tools as Phase 1.

> **Read `CONCIERGE_CONTEXT.md` AND `CONCIERGE_SPEC.md` before doing anything Concierge-related** (owner's standing instruction). The spec says WHAT to build (its decisions are final — do not substitute more common patterns without owner sign-off); the context doc says WHY and where things stand — it carries binding non-code constraints: **launch happened 2026-07-15 (founder video up, payments arriving)** so feature work is unblocked per the owner's roadmap; **NO members' WhatsApp group (owner reversal 2026-07-15)** — the platform's structured surfaces (jobs board, tutorials, sourcing) are the community layer, 1:1 `wa.me` links are the contact channel, and chat/forums stay forbidden; Phase 2 waits for 15+ *paying* members; listed trade-offs are deliberate, don't "fix" unasked; announce before any `wrangler --remote`/`deploy`; upgrade triggers are pre-decided. Vision: "the Uber for carpenters" — member area grows into tabs Directory · Jobs · Tools · Tutorials · Sourcing (roadmap section in the context doc).

**Status: LIVE.** Worker deployed at `concierge-api.neewoodygh.workers.dev`; D1 `concierge` created + migrated; `SESSION_SECRET` set; first admin (Nuer, phone `233244633464`, role admin, approved) created. `wrangler.toml` `database_id` is set and committed (`b46b99f`). Frontend pages live on Pages. Verified end-to-end in production (health, login, 401/429). *(Bootstrap gotcha that cost an hour — an argv off-by-one in the PIN-hash generator — is written up in `HISTORY.md` so it isn't repeated.)*

**Deliberately isolated architecture (do not merge into dispatch — see Standing Instruction 5):**
- **Separate Worker `concierge-api`, in-repo at `/concierge-api/`** with its own `wrangler.toml`, deployed via `wrangler deploy`. NOT added to `neewoody-dispatch-api`.
- **Cloudflare D1** database `concierge` (NOT KV), migrations in `/concierge-api/migrations/`. Member types carpenter | vendor | courier, fixed specialty / vendor-category / service vocabularies and 171 zones live in `js/concierge.js`. Full data-model notes: `docs/concierge-build-log.md`.
- **Shared R2** bucket `neewoody-media` under a `concierge/` prefix (no new bucket).
- Worker code: `/concierge-api/src/index.js` (single file — router, auth, crypto, handlers). Bindings: `DB` (D1), `MEDIA` (R2). Secret: `SESSION_SECRET` (HMAC key; never committed).

**Pay-to-join (current, 2026-07-20):** applicants self-register on `register.html` (3-step wizard), choose Founding (GHS 100 once, first 100) or Regular (GHS 50/month), and pay on Paystack; payment approves them. Pending members can only reach `/api/me` + `/api/pay/*`. `withPaid` gates benefit routes for lapsed members (admins/founders exempt); safety check-in, support and Tools stay open. History: `docs/concierge-build-log.md`.

**Auth: phone + 5-digit PIN (no email, ever, in Phase 1).**
- Phone normalized to `233XXXXXXXXX` (accepts `0XX…`, `+233…`, `00233…`); phone is the PK. Exposing phone inside the members-only directory is a **feature** (WhatsApp `wa.me/<phone>` deep links — members hire members).
- PIN hashed with PBKDF2 (Web Crypto, SHA-256, 100k iters, 16-byte salt), stored `base64(salt):base64(hash)`. Never stored/logged in plaintext.
- Session = stateless token `base64(phone.expiry).base64(HMAC-SHA-256)`, 30-day expiry, in `localStorage`, sent as `Authorization: Bearer`. `requireAuth`/`requireAdmin` middleware.
- Rate limit: 5 failed PINs per phone per 15 min → 429 (tracked in `login_attempts`; lockout blocks even a correct PIN during the window). The login handler self-prunes each phone's attempt rows older than the window, so `login_attempts` never grows unbounded.
- **Login-loop guard (2026-11-12):** login/register never fall back to a native form submit; device-side causes are explained on screen. Details: `docs/concierge-build-log.md`.
- **Forgotten-PIN reset is admin-only** (locked-out member WhatsApps the owner, who resets via the admin dashboard or directly in D1). **BUT** an authenticated member CAN change their own PIN via `PUT /api/me` (optional `pin` field, validated 5 digits, re-hashed). The changed PIN applies at next login; the current session's token stays valid (token is HMAC over phone+expiry, independent of the PIN). Directory profile-edit modal has a "New PIN — optional" field. **No public self-serve registration** — admin enters founders.

**API routes:** full list in `/concierge-api/README.md` and `docs/concierge-build-log.md`. CORS is restricted to neewoodygh.com/www + localhost.

**Features built since Phase 1** (notifications, couriers, vendor storefronts and orders, offered services, socials, Paystack, verified mark, Support + Academy tabs, safety check-in with cron alerts, member dashboard, admin insights): see `docs/concierge-build-log.md`. Working rules: bump `concierge.js?v=` whenever it changes; append a `CHANGELOG` entry in `directory.html` whenever a member-facing feature ships; the safety cron lives on concierge-api only; never self-serve PIN reset without login.

**Cutlist gating (free to use, login to persist) — persistence LIVE 2026-07-14:** `cutlist.html` calculator stays **fully usable logged-out** (top-of-funnel — never gate the calculator; settled decision, do not re-litigate). Members get real save/load: `saved_cutlists` table (migration `0002`, upsert on member+name, 50/member cap, 64KB config cap), `/api/cutlists` CRUD (list/save/get/delete, own rows only), and on `cutlist.html` a member bar (visible only with a live session) + "📂 My Cutlists" overlay + working "💾 Save" (serializes `S`+`ebState`, always mm internally; `restoreConfig()` writes state back into inputs incl. cm-mode display and re-renders). Logged-out Save → membership pitch + login link. **Tools tiering:** wardrobe cutlist free forever (the funnel); new tools (kitchen cutlist, TV-unit cutlist, …) launch member-first — they are the membership's tool library. Directory (`/concierge/directory.html`) is the member landing page and carries a "Your member tools" strip: open-generator card + coming-soon cards (kitchen/TV-unit cutlists, safety check-in) + benefits line.

**Deploy runbook & first-admin bootstrap:** `/concierge-api/README.md`.

**Out of scope for Phase 1 (do not build):** email/SMS/OTP, self-service *forgotten*-PIN reset (unauthenticated flow — still admin-only; an *authenticated* member changing their own PIN via `PUT /api/me` IS in), Paystack/payment APIs, forums/chat/suggestion portal, safety check-in (Phase 2), public self-serve registration, any site framework migration.

## Active Pending Decisions
- ~~**Shelving in nav**~~ ✅ DONE 2026-11-13 (owner go-ahead): Shelving removed from the More ▾ dropdown and phone menu on every page and added to every footer (after Portfolio, or after Services on legacy footers). Cutlist/privacy footer "Shelving & Storage" links were repointed from portfolio.html to shelving.html.
- ~~**Lifetime founders vs monthly payments UI**~~ ✅ RESOLVED 2026-07-18: founders (`is_founder=1`) are now excluded from the monthly payments population — both the "X of Y paying members" count and the "Show unpaid" list drop founders (parallel to admins), since they paid a one-time lifetime fee and never owe monthly. A founder's one-time payment row still shows in "Show who paid" as an "other payment". (If the owner later wants a dedicated founder-payment tracker, that's a separate build.)

## Done 2026-11-13 (owner: "take care of items 4, 5 and all others")
- **Instagram feed removed:** owner confirmed the embed was scrapped long ago; `functions/api/instagram.js` deleted (nothing called it). The `IG_TOKEN` variable in the Pages settings is now unused and can be deleted in the dashboard.
- **Optimiser scripts blocked:** `_redirects` uses URL-encoded names (`/Optimise%20Images.ps1`, `/Optimise%20Images%20-%20Drop%20Here.bat`); encoded rules work on Pages, so no rename was needed.
- **Keyboard / screen-reader pass on every custom widget (tested with real key presses):** the `pm-*` project modal (all 4 copies) now moves focus to Close on open, traps Tab, returns focus to the trigger, is named by its title (`aria-labelledby="pm-title"`), labels thumbnails, and the enlarge view works by keyboard; non-button triggers get `tabindex`/`role=button` (for `<figure>` triggers the role goes on the inner `<img>`, since a figure can't be a button). Same fixes in `js/cms-posts.js` (now `?v=20261113` on 8 pages; main photo alt is the post title). Wardrobes photo cards (`.wd-card-img`) reachable + focus handling; Beds viewer got a Close button + focus handling; the newer `#lb` viewer (Sage, Nadia, Golf Hills, Ridge, Judith) got a Tab trap; old Achimota / House of Walker / Jerksoul viewers got a small add-on script. FAQ accordions now update `aria-expanded` (`js/main.js?v=20261113` on all pages). Cutlist + Cut Sheet: 48 `<label for>` links + aria-labels on the cut-sheet row inputs; cutlist small gold text → `#7f5a12`, `--clr-muted` → `#5e584b`. Homepage Sage numbers now bright gold on green; Contact got the missing h2. Lighthouse accessibility: every redesigned page 100; cutlist/cut-sheet 95; old Achimota/Walker/Jerksoul 92–96 (legacy footer contrast, Jerksoul video buttons), left for the Astro rebuild.
- **Broken Concierge links fixed:** `href="//concierge/"` / `"..//concierge/"` (404) on the 404 page and old case studies → `/concierge/`.
- **Weekly D1 backup cron:** root cause of the July failure found: Cloudflare cron numbers Sunday as 1/`SUN`, so `0 3 * * 0` is rejected as invalid. `wrangler.toml` now `["*/15 * * * *", "0 3 * * SUN"]` and `scheduled()` checks `'0 3 * * SUN'`. **Deployed 2026-11-13** (version `5379e717`, both schedules registered). Wrangler is logged in again on this machine (OAuth).
- **Concierge security review (source-only, 2026-11-13):** ownership checks on every edit/delete route, parameterised SQL, Paystack webhook signature + verify-on-return, and private call-out photos all hold. **(1) FIXED + DEPLOYED 2026-11-13 (owner: "fix and deploy"):** login keeps 5 wrong PINs / 15 min and adds **10 / day per phone** (`DAILY_FAIL_MAX`; attempts now kept a day), reaching the cap pushes a "Login locked for a day" alert to admins + `login_locked` audit row; `PUT /api/me` PIN change requires `current_pin` (wrong answers count as failed logins); tokens are now `phone.expiry.stamp` where stamp = keyed HMAC of the member's `pin_hash` (never the hash), so a PIN change or admin reset ends every other session, and the PIN change returns a fresh token for the device that made it. Old 2-part tokens still work for members until they expire (≤30 days) but **admin sessions must be new-format** (owner had to log in again). `js/concierge.js` `tokenAlive()` reads expiry as the 2nd part (the old lastIndexOf version would have caused a login loop with 3-part tokens; the site was deployed BEFORE the Worker for that reason). directory.html profile form shows a Current PIN box only when a new PIN is typed; What's new #36. Tested locally (wrangler dev --local, throwaway accounts): 13/13 API checks + both lockouts + browser flow. Remaining findings awaiting owner go-ahead: originally (1) **PIN guessing**: 5 failures per phone per 15 min = 480 guesses/day with no daily cap and no cross-phone limit, and the admin phone is the public WhatsApp number; a PIN change doesn't ask for the current PIN and doesn't end existing 30-day sessions. Smallest fix: daily failure cap + owner alert, require current PIN to change it, end old sessions on PIN change/reset. (2) ~~low: members can set `photo_url` to any outside URL~~ **FIXED + DEPLOYED 2026-11-13** (Worker version `b9a7f70c`): `ownMediaUrl()` accepts only empty (clear) or this Worker's own `/api/media/members/<that phone>.<ext>[?v=n]`, in both `PUT /api/me` and the admin edit; error `invalid_photo_url`. Live check before deploy: 0 of 61 stored photos pointed elsewhere. (3) ~~low: anyone can register someone else's phone~~ **FIXED + DEPLOYED 2026-11-13**: a sign-up for a number that is already `pending` (unpaid, non-admin) now replaces it when the old one is older than 24 h and has no payment started in the last 2 h (audit `pending_replaced`); otherwise `409 pending_recent` with an explanation. Approved/suspended/admin numbers stay `member_exists`. The account deletion is the new shared `purgePending(env, onlyPhone)` (also used by the admin Purge pending button). register.html's 'already registered, log in' hint now actually shows (it compared message text to the code). Not addressed by design: phone ownership is never verified (no SMS), so a stranger can still sign up and PAY under someone else's number; the Verified mark is the admin's control for that. (4) info: initials inside an `onerror` string in directory.html (not exploitable).

## In progress (2026-11-13): live check script + weekly run (owner said yes)
- Purpose: catch silent failures (deploys not happening, internal files exposed, backups not running). Found today: `audit_log` has **zero** `backup` rows ever, i.e. no Concierge D1 backup has ever been made (manual button never used; weekly cron was invalid until today's fix).
- **Done, NOT deployed:** `scheduled()` now writes an `audit(..., 'backup', ...)` row after each weekly backup, so a script can read the last backup date from D1. The `wrangler deploy` was blocked by a permission check at the end of the session: deploy it next session (`cd concierge-api && npx wrangler deploy`), or the first Sunday backup will run but leave no log row.
- **Still to build:** `scripts/check-live.mjs` (scripts/ is already blocked publicly): Cloudflare Pages check-run on the latest main commit; key pages 200; internal files 302; www 301; image cache header; concierge-api health 200 + /api/me 401; last `backup` audit row < 8 days (`wrangler d1 execute concierge --remote`). Exit 1 on any failure. Then a weekly local scheduled task running it, and a CLAUDE.md rule to run it after every push.
- Owner action meanwhile: press "Back up now" in Concierge admin once, so a backup exists before Sunday.

## Known Pending Items (Backlog)
1. Estimator — add prominent link from service pages
2. FAQ schema markup across service pages
3. Pricing — client-facing quote PDF output
4. ~~Cutlist — save/load named configurations~~ ✅ DONE 2026-07-14 (saved_cutlists + /api/cutlists + UI). Next tools in the member library: kitchen cutlist, TV-unit cutlist (member-first)
5. Android app — Expo project ID fix for push notifications (use a7e03272-e2ca-4621-b63a-19d80b825084)
6. **Backups:** Concierge D1 → R2 weekly + admin "Back up now"; dispatch KV has no automatic backup (`scripts/backup-dispatch-kv.sh`). Runbook: `BACKUP_RESTORE.md`; notes: `docs/concierge-build-log.md`.
7. **Audit + usage instrumentation (migration 0031):** `audit_log` + `usage_events`, admin Insights and Audit log panels. Notes: `docs/concierge-build-log.md`.
7. Pricing — make labour day rates configurable (not hardcoded)
8. Dispatch — offline support, damage photos, job calendar view
9. Strategic — client job status page, invoice generator. Carpentry Concierge: Phase 1 built + deployed; Phase 2 (safety check-in, saved cutlists, richer features) awaiting a separate spec.
10. Bamboo craft integration — explore for premium/sustainable product line
