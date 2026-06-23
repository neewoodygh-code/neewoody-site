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
**Catalogue:** /catalogue.html — print-to-PDF lookbook (2026-06-05). Self-contained single file, fully inline CSS, A4 print-optimised (`@page size:A4`), uses the new green/gold/cream design system (Playfair + Lora + Jost). 6 sections: Wardrobes · Kitchens · Beds · Dining & Living · Solid Wood · Commercial & Institutional. Real project photos only (no placeholders), no pricing. Open in a browser → Save as PDF to send to clients. Listed in sitemap.xml. Not yet linked from site nav.

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
- **Nadia Dome (2025):** Full home commission — **five pieces** to one brief: (1) wave-carved Guarea chest of drawers with continuous wave pattern across all drawer fronts, integrated recessed pulls, walnut-toned finish — hero piece, one of the most distinctive in the portfolio; (2) compact kitchenette in russet laminate with dark stone-effect countertop, undermount black sink, pull-out mixer tap, matte black bar handles; (3) **fitted laundry room in light beech-effect laminate** — tall storage columns, overhead cabinets, beige stone-effect counter with undermount sink and open shelving, recessed washing-machine bay (confirmed Neewoody's work, 2026-06-23); (4) three solid wood bar stools with dark velvet upholstered seats and X-cross stretcher base; (5) full-height two-door fitted wardrobe in dark laminate with three drawers below. Kitchen island and main kitchen cabinetry visible in some photos are pre-existing — not Neewoody's work, never claim them. Kitchenette videos: TAbjiBb5Bt0, 4EWuw0lJXQw, MzB3WHXUt9w, _wg_vHSfF-U. Wave chest video: KOX5r2eqUVE. Images in `images/projects/nadia-dome/`. Case study: `projects/nadia-dome.html`. **Image filenames corrected 2026-06-23:** the folder's photos were scrambled (the `nadia-wave-chest-*` files held kitchenette shots; the real wave chest was misnamed `nadia-kitchenette-11/12`; `nadia-kitchenette-3/4/5` were laundry shots). Files were reorganised to truthful names — canonical set: `nadia-wave-chest-1/2` (chest), `nadia-kitchenette-1/2/3` (russet kitchenette), `nadia-laundry-1/2` (laundry room), `nadia-bar-stools`, `nadia-wardrobe-front/angled`. This also auto-corrected downstream refs on `portfolio.html` (Full Home Commission card → now the chest), `solid-wood.html` (Guarea card → chest), `kitchens.html` (kitchenette example), and `catalogue.html`.
- **Golf Hills Estate (2021):** Stained pine X-frame dining table, matching bench, built-in L-shaped leatherette banquette with under-seat storage, and a timber-framed wall mirror above the banquette. All four pieces built and installed as one kitchen dining zone. Kitchen cabinetry visible in the background of photos is pre-existing and was not part of this commission — never claim it as Neewoody work. Images in `images/projects/golf-hills-estate/`. Case study: `projects/golf-hills-estate.html`. **Note (2026-06-23):** the `golf-hills-before-1/2/3` files are NOT empty-room "before" shots — they show the freshly built, unstained X-frame table/bench outdoors at the workshop. The case-study section was relabelled from "The Space Before / Starting Point" to "In the Workshop / Freshly Built, Before Staining" to match.
- **Ridge Residence (2021):** Afromosia live-edge dining table with solid timber U-frame legs. Commissioned by French expatriates on posting in Ghana. Private residential client — not a French Embassy commission. Images in `images/projects/french-embassy/`. Case study: `projects/french-embassy.html`.
- **Judith East Legon (2022):** Full Hyedua dining room commission — large-format dining table, 6 upholstered chairs with linen fabric panels, console unit with full-extension drawers and waterfall edge sides. All three pieces built to one unified brief in the same timber, finished in a rich espresso. Images in `images/projects/judith-east-legon/`. Case study: `projects/judith-east-legon.html`.
- **Jerksoul Restaurant (2022):** Bar counter and dining furniture for a rooftop restaurant in Accra. Neewoody scope was dining tables, cube stools, and bar counter only. The rooftop structure/pergola belongs to the venue — never claim it as Neewoody work.
- **Sage Centre (2022–2024):** 26-month full-property teak fitout for a US-based educational NGO in Wli, Volta Region. Case study: `projects/sage-centre.html`.
- **House of Walker:** Branded structural carpentry installation for Johnnie Walker's 200-year celebration at One Airport Square, Accra. Case study: `projects/house-of-walker.html`.
- **Spintex / New York Vanities (2026):** Five solid Khaya (African mahogany) carved-door bathroom vanities for a unit in a Spintex estate development — a direct commission from a New York–based buyer, installation supervised on-site by the estate's developer. Scope: one larger master vanity, three smaller carved-door vanities, one simpler shelf vanity for the powder room. Every door carved in solid Khaya. Images in `images/projects/spintex-newyork-vanities/` (WebP + JPG fallback pairs; hero `spintex-newyork-vanity-double-sink-hero`). No standalone case study page — featured as a "species as hero" section in `solid-wood.html` (anchor `#khaya-spintex`) and a portfolio card in `portfolio.html` linking to that anchor. **Homepage deliberately not updated in this pass** (scope decision). Final approved copy is now live on the page (added in a follow-up commit). This is the **first use of `<picture>`/WebP markup on the site** — all other pages still serve plain `.jpg` via `<img>`.
- **Achimota Guesthouse — Room Conversion (2026):** Full single-room upgrade to Airbnb standard for a guesthouse owner in Achimota. Scope spanned multiple categories in one commission: queen bed + nightstand, wardrobe, dresser, desk, wall paneling, wall molding, TV unit, glass display cabinets, and wainscotting in the adjoining hallway. **Has its own case study page: `projects/achimota-guesthouse.html`** (built from the `nadia-dome.html` template — hero, stats, 4 piece sections [Bed & Nightstand · Wardrobe/Vanity/Glass Cabinets · TV Unit & Marble Wall · Wall Paneling & Wainscotting], 12-image gallery + lightbox, CTA). Listed in `sitemap.xml`. **Placement (revised 2026-06-23 — replaced the earlier inline portfolio dump):** `portfolio.html` shows a normal case-study card (in the `.pf-feat-card` featured grid) linking to the case study page — the full inline `.ag-project` section was removed. Category pages keep single representative cards linking to the case study page: `beds.html` (`achimota-bed-wardrobe-wide`), `wardrobes.html` (`achimota-wardrobe-vanity-wide`, an `<a class="wd-card">` whose image wrapper is `.no-lb` so the lightbox JS `.wd-card-img:not(.no-lb)` skips it), and `tv-units.html` (expanded TV + paneling feature section, anchor `#achimota`, 5 images, "See the full project" → case study). **Wall paneling/molding has no dedicated category page — by explicit direction it is grouped with TV Units.** Images in `images/projects/achimota-guesthouse/` (WebP + JPG `<picture>` pairs, all in this folder, referenced cross-page by path). Original 8 from the first pass + 4 added 2026-06-23 selected from the shoot extras via contact-sheet review: `achimota-hero-wide` (hero), `achimota-bed-nightstand`, `achimota-glass-cabinet-marble`, `achimota-glass-cabinet-angle`. Copy on the case study page is descriptive/factual from the photos (can be refined). Homepage not updated.
- **Portfolio featured-grid hierarchy (2026-06-23):** `portfolio.html` `.pf-featured` now has a size tier — Sage Centre is a full-width hero card (`.pf-feat-card.hero`, 600px, `grid-column:1/-1`); the other case studies (House of Walker, Nadia Dome, Jerksoul, Achimota) are medium 2-col cards (480px); basic projects remain the small `.pf-card` work grid below.

### Wardrobe Projects Catalogued

**Agbogba (2022)** — Oak-effect laminate, silver handles. Two pieces, same bedroom: (1) Built-in between two windows — overhead cabinet, hanging rail, shelving tower, drawers; (2) Freestanding full-width with integrated dresser recess, overhead cabinets, recessed spotlights. Best images: `agbogba-dresser-lit.jpg` (hero), `agbogba-builtin-interior.jpg`.

**Dansoman (2024)** — Cherry/mahogany-effect laminate. Freestanding sliding door wardrobe. 2 sliding doors on aluminium track, open top shelf, overhead 2-door cabinet, internal hanging rail and 3 drawers. Best image: `dansoman-closed-1.jpg` (hero).

**Adenta (2024)** — Light ash/white oak laminate. Alcove sliding door wardrobe. No handles (push-to-open). Left: shelf + hanging. Right: 5 shelves + 3 drawers. Best photographed wardrobe in the catalogue. Best images: `adenta-interior-left.jpg`, `adenta-interior-right.jpg`.

**Oyarifa (2025)** — Greige oak-effect laminate, matte black handles. Two floor-to-ceiling built-in wardrobes, same property: (1) Master — wall-to-wall, 4 doors, overhead cabinets, 2 central base drawers, recessed downlight, marble floor; (2) Guest — narrow alcove, overhead cabinet, 6-shelf tower left, hanging + 2 drawers right. Best images: `oyarifa-master-closed-1.jpg` (hero), `oyarifa-guest-interior.jpg`.

**Zoe, Cantonments (2026)** — Dark walnut-effect laminate, matte black handles. Freestanding wardrobe. 2-panel sliding doors above, integrated 4-drawer chest at base (2+2 configuration). Cantonments — premium target market location. Best images: `zoe-front-closed.jpg` (hero), `zoe-angled.jpg`.

**Seyram, Nmai Dzorn** — White melamine. Open wardrobe system. 4 units installed facing each other in pairs — dedicated walk-in dressing room. Multiple shelf configs, base drawers, integrated full-length mirror. Only 1 installed photo exists. Category: Open/Walk-in Systems. Best image: `seyram-installed.jpg`.

**Dobro, Nsawam Road (Dec 2025)** — Cherry-effect laminate, matte black handles. 4 wardrobes across one new-build house: master (wide, 6 drawers 3+3), kids room (narrow, 3 drawers), 2 guest bedrooms (narrow, 3 drawers each). Built-in drawer organisers with compartments in some units. Scope was wardrobes only — no other furniture. Best images: `dobro-wide-closed.jpg` (hero), `dobro-wide-interior.jpg`, `dobro-drawers-open.jpg`, `dobro-interior-cubbies.jpg`.

**Nadia standalone wardrobe, Dome (2025)** — Dark rustic/distressed walnut-effect laminate, matte black handles. Single wardrobe, 2 hinged doors, 3 drawers. Part of Nadia full home commission (see `nadia-dome.html`). Distinct from the dark walnut on Zoe — this is a distressed/rustic grain, darker overall. Best images: `nadia-wardrobe-front.jpg`, `nadia-wardrobe-angled.jpg`.

### _inbox Workflow
Raw images can be dropped in `_inbox/` with a description. Claude Code will rename, sort into `images/projects/{slug}/`, and commit. See `_inbox/README.md` for full instructions. After sorting, originals remain in `_inbox/` for manual deletion — the 9 currently unsorted files (as of 2026-05-10) are `123508`, `123515`, `123520`, `123528`, `162004`, `171115`, `190624`, `190625`, `194810`.

## Reusable Project Modal (`pm-*`) — added 2026-06-23

A self-contained "project modal" component to showcase small/medium projects **without creating a dedicated case study page** per entry. This is the preferred pattern for projects whose scope doesn't warrant a full `projects/*.html` page (full case-study pages remain for large commissions like Sage, Nadia, Achimota).

**How it works:**
- A card/element with `data-pm="<template-id>"` (any element — `button.pf-card`, a `kt-feat-img`, a gallery `figure`, an `<a>`) opens a modal populated from a matching hidden `<template>`.
- The `<template>` carries `data-eyebrow`, `data-title`, `data-meta`, the write-up as `<p>` children, and an image list as `<figure data-webp data-jpg data-alt>` inside a hidden `.pm-srcs` div.
- JS builds the modal: text column (eyebrow/title/meta/paragraphs) + media column (main image + thumbnail strip). Clicking a thumb swaps the main image; clicking the main image opens a full-screen **zoom** layer. Close via ×, backdrop click, or Esc (Esc closes zoom first, then modal).
- Component pieces (CSS `.pm-*`, the `#pm-overlay`/`#pm-zoom` markup, the `<template>`, and the IIFE script) are **injected per page** (static site has no shared includes). The injector lives at `C:/Users/Neewoody/.img-tmp/inject_modal.py`. To add the component to a new page: insert the `<style>` before `</head>` and the markup+template+`<script>` before `</body>`; it's idempotent (skips if `pm-overlay` present).
- **To add a new modal project:** drop a new `<template id="pm-yourslug" ...>` on each page that should surface it, and add a trigger element with `data-pm="pm-yourslug"`. No new page needed.
- First use: **Prampram Kitchen** (`pm-prampram`), live on `portfolio.html` (work-grid card), `kitchens.html` (featured section), and `tv-units.html` (TV-unit section). Same template duplicated on all three (static-site reality).
- Also on **`solid-wood.html`** (2026-06-23): the page now leads with the Khaya/Spintex **spread** (kept — owner likes the layout), and the species cards were **moved below it, reframed to lead with the piece built** (not the wood species — "Live-Edge Dining Table", "Six-Seat Dining Set", "Wave-Carved Chest of Drawers", with the species as a sublabel) and converted to **`pm-trigger` modal cards** (`pm-afromosia-table`, `pm-hyedua-set`, `pm-guarea-chest`). Each modal pulls images from the existing project folders and includes a "See the full case study →" link. Reusable injector for solid-wood: `C:/Users/Neewoody/.img-tmp/inject_solidwood.py` (imports the component from `inject_modal.py`, which now guards its run-loop under `if __name__=="__main__"`).

## Image Format Policy

- New projects (new photos, not yet used anywhere else on the site): 
  convert to WebP with JPG fallback using <picture> markup, per the 
  pattern established in images/projects/spintex-newyork-vanities/ 
  (commit d12c6c5). Hero images target 200-300KB, supporting/detail 
  images target 80-150KB.

- Existing/legacy images already in use on the site (plain .jpg, no 
  <picture> wrapper): leave as-is by default. Do NOT convert as a side 
  effect of an unrelated task.

- Migrating a legacy image to WebP/<picture> is only done as a deliberate, 
  scoped task — and only after first identifying every page that 
  references that image (many project photos are reused across multiple 
  pages, e.g. homepage service cards pull from individual project 
  folders). If migrating, update all referencing pages in the same pass 
  so no image exists inconsistently in both formats across the site.

- No site-wide bulk conversion sweep without an explicit, separate 
  instruction scoped to that task alone.

### Kitchen Projects Catalogued (2026-05-11)

**Spintex — Regimanuel Gray Estate (2024)** — L-shaped kitchen, dark espresso laminate, Calacatta marble-effect countertop with gold veining, black aluminium-framed frosted glass upper cabinets, undermount black sink, integrated hob, matte black handles. Private residential. Best images: `spintex-kitchen-hero.jpg` (hero), `spintex-kitchen-wide.jpg`. Before: `spintex-kitchen-during.jpg`. Images in `images/projects/spintex-kitchen/`.

**Dansoman Kitchen (2024)** — Large kitchen, cherry/teak-effect laminate, white engineered quartz countertops, freestanding island with open shelving end and seating overhang, integrated 6-burner range, undermount sink. Professionally photographed with Neewoody watermark. Best images: `dansoman-kitchen-layout.jpg` (hero), `dansoman-kitchen-island.jpg`. Images in `images/projects/dansoman-kitchen/`.

**Tantra Hill Kitchen (Uncle Jo)** — Cream high-gloss laminate, warm beige speckled granite countertops, central island, integrated Beko fridge-freezer tower, washing machine under counter. Night photography only — weaker image quality. Portfolio grid only, not featured content. Best: `tantra-kitchen-overview.jpg`. Images in `images/projects/tantra-kitchen/`.

**Danfa Kitchen (2025)** — Mediterranean-inspired, client brief. Warm beech-effect laminate, exposed sealed concrete countertops, Belfast farmhouse sink, brass handles, open-grid upper storage cabinet. No finished photos — construction/installation context only. Portfolio grid only, not featured. Best: `danfa-kitchen-layout.jpg`. Images in `images/projects/danfa-kitchen/`.

**Kokrobite Kitchen (2021)** — Burgundy/wine red high-gloss laminate, black galaxy granite countertops, island with 4 drawers, integrated fridge housing, glazed upper cabinets. Bold colour — portfolio grid only, not featured. Best: `kokrobite-kitchen-hero.jpg`. 2 images. Images in `images/projects/kokrobite-kitchen/`.

**Kukurantumi Kitchen (Eastern Region)** — Dark charcoal concrete-effect laminate, blue-grey veined granite countertops, integrated LG fridge tower, gas hob, matte black sink fittings. Notable: client in Kukurantumi, Eastern Region — 2+ hours from Accra, demonstrates geographic reach. Portfolio grid only, not featured. Best: `kukurantumi-kitchen-hero.jpg`. Images in `images/projects/kukurantumi-kitchen/`.

**Prampram Kitchen + TV Unit (2026)** — Open-plan U-shaped kitchen in warm walnut-grain laminate, grey marble-effect counters with a waterfall peninsula, integrated oven/hob/recessed microwave, under-cabinet lighting; plus a simple floating walnut TV console with wall-mounted open shelf. Commissioned by an estate developer for a newly built spec house in a **Prampram** estate being prepared for sale (kept generic — no estate/developer name by direction). Scope was kitchen + TV unit only. **First use of the reusable Project Modal** (`pm-prampram`) — no dedicated page; surfaced as a card on `portfolio.html` (work grid), a featured section on `kitchens.html`, and a TV-unit section on `tv-units.html`, all opening the modal. Images in `images/projects/prampram-kitchen/` (6, WebP+JPG): `prampram-kitchen-hero` (lead), `-corner`, `-cabinets`, `prampram-tv-unit`, `-tv-unit-shelf`, `-tv-unit-angle`. Selected via contact-sheet review from a 56-photo + 7-video shoot; remaining raw assets stay in `_inbox/Prampram Kitchen/`.

### Homepage & Service Page Updates (2026-05-11)
- `index.html` hero updated to `images/projects/oyarifa/oyarifa-master-closed-1.jpg`
- Service cards updated: Wardrobes → `oyarifa-master-closed-1.jpg`, Kitchens → `spintex-kitchen-hero.jpg`, Dining → `judith-set-installed-2.jpg`, Solid Wood → `afromosia-table-installed-1.jpg`. Beds and Shelving still have no real photos.
- `index.html` "Recent Projects" section replaced with 3 real cards: Oyarifa wardrobes, Spintex kitchen, Judith dining.
- `wardrobes.html` intro split, hinged type card, and alcove type card all updated with real project photos. Recent project image path corrected to `nadia-wardrobe-front.jpg`.
- `kitchens.html` intro split and type cards updated; 3 placeholder type cards removed; 2 featured project split sections added (Spintex, Dansoman); compact grid section added (Danfa, Kukurantumi).
- 6 kitchen project cards added to `portfolio.html`.

### Site Content Cleanup (2026-05-11)
- **portfolio.html:** 12 generic placeholder project cards removed (project-wardrobe-1 through -4, project-kitchen-1 through -3, project-bed-1 through -2, project-shelving-1 through -2, project-other-1). The 12 real named project cards (Sage Centre, House of Walker, Nadia Dome, Jerksoul, Golf Hills Estate, Afromosia Ridge, Judith East Legon, Oyarifa, Zoe Cantonments, Agbogba, Dobro, Seyram) are preserved intact.
- **dining-living.html:** The "What We Build" product type cards section removed (4 cards: dining-table.jpg, display-unit.jpg, sideboard.jpg, console-table.jpg — all placeholder images). The intro split, featured projects grid, and timber species section are preserved.
- **solid-wood.html:** The "Solid Wood Pieces We Make" product type cards section removed (4 cards: solid-wood-table.jpg, solid-wood-bed.jpg, solid-wood-bench.jpg, solid-wood-bespoke.jpg — all placeholder images). The intro split and species showcase cards are preserved.
- **index.html:** Jerksoul case study card layout bug fixed — card was outside the display:grid container. Now all 3 featured case study cards (Sage Centre, House of Walker, Jerksoul) sit inside the same 3-column grid.
- **projects/house-of-walker.html:** Two broken links to `../sage-centre.html` corrected to `sage-centre.html`. All 9 IMAGE upload instruction comments removed (all images were already uploaded: how-hero.jpg, how-brief.jpg, how-build.jpg, how-during-1.jpg, how-finished-1.jpg, how-during-2.jpg, how-finished-2.jpg, gallery upload guide, how-context.jpg).
- **projects/sage-centre.html:** Upload instruction comments removed for sage-hero.jpg, sage-brief.jpg, sage-story.jpg, and gallery guide — all images confirmed uploaded.

### Full-Site Redesign (2026-05-20)

A full visual and structural redesign is in progress. Design brief and execution plan are in `REDESIGN-BRIEF.md`. Per-page instruction sets are filed as `REDESIGN-[PAGE].md`.

**New design system (replaces the old --clr-accent / DM Sans tokens):**
- `--green: #0b1f0e` (deep forest green — primary dark)
- `--gold: #c8922a` (warm gold — accent only)
- `--cream: #f0e8d0` (main background)
- `--cream-dark: #e8dfc4` (secondary background)
- `--ink: #1c1c1a` (body text)
- `--muted: #6b6557` (secondary text)
- Fonts: Playfair Display (headings) + Lora (body) + Jost (UI/labels)

**Redesigned pages (index.html is the reference implementation):**
- `index.html` — complete. New CSS is fully inline; no `css/styles.css` dependency on this page. Nav colour toggle via IntersectionObserver. Hero: 3-slide Ken Burns crossfade (pure CSS, 26.4s cycle). WhatsApp float is inlined. Removed: "Why Neewoody" feature cards, stats row, badge pills, "How It Works" steps, SEO paragraph dump, 4-column footer.

**Pages still using old design (css/styles.css):** All other pages — will be migrated per the execution plan in REDESIGN-BRIEF.md.

**Do not add css/styles.css back to index.html.** The new design is self-contained per page.

### Homepage Service Cards + Testimonial Regroup (2026-06-23)
Two homepage directives from an earlier instruction were reported done but had **never actually been committed** (no commit existed in history; live == origin/main == local all confirmed missing the work). Re-implemented and verified live:
- **Service cards** now carry real photos via `.svc-img` (added to `.svc-card`): Wardrobes → `oyarifa-master-closed-1.jpg`, Kitchens → `spintex-kitchen-hero.jpg`, Beds → `sage-bed-overview.jpg`, Dining & Living → `judith-set-installed-2.jpg`, Solid Wood → `afromosia-table-installed-1.jpg`, all `loading="lazy"`. The **Commercial card (06) is intentionally left image-free** (different sell).
- **Testimonial section** changed from a single full-width Ben Schwartz quote to a **3-card row** (`.t-grid` / `.t-card`): Ben Schwartz, Ngminvielu Kuuire, mcdennis appau — each 5-star, with a multicolour Google "G" SVG + "Google review · [date]" badge (`.t-badge`). Stacks to 1 column ≤768px. (No pre-existing badge component existed to reuse, despite the original instruction implying one — built fresh.)
- **Still outstanding (NOT in this pass):** the original instruction's item 2 (remove Shelving from nav/dropdown, relocate to footer only) was *also* never done — Shelving is still in the desktop "More ▾" dropdown (`index.html`) and mobile nav, and is not in the footer. Flagged to owner; awaiting go-ahead before changing nav.

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
