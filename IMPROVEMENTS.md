# Site Improvements — tracked backlog

Senior dev + UX/UI review, started 2026-07-19. Living checklist — tick items as they ship, add new ones as they surface. Priority tiers: **P0** (do first — perf/a11y/revenue), **P1** (consistency/polish), **P2** (nice-to-have / longer term).

## P0 — highest ROI
- [ ] **Precompile the React tools.** `carpenter-pricing.html`, `pricing.html`, `dispatch.html`, root `admin.html` ship React + Babel-standalone over CDN and transpile JSX in-browser on every load (~2.5MB + transpile before paint). Worst for `carpenter-pricing.html` — its users are carpenters on MTN data/cheap Android. Add a one-time precompile step (esbuild/Babel CLI → emit plain JS beside each file); no full framework/bundler needed.
- [ ] **Accessibility pass.** Skip-to-content link; visible focus states on all interactive elements; gate hero/reveal animations behind `prefers-reduced-motion`; ensure every `contact.html`/`hire.html` field has a real `<label>`; audit contrast (gold on cream, low-opacity cream-on-green eyebrows likely fail WCAG AA at small sizes).
- [ ] **Finish WebP + set image dimensions.** Only ~7 pages use `.webp`; case studies (`nadia-dome`, `sage-centre`, etc.) still lean on `.jpg` for hero/LCP images. Add explicit `width`/`height` or `aspect-ratio` to gallery images to kill CLS.
- [ ] **Sticky mobile quote CTA + `tel:` links.** Add a persistent bottom bar / FAB on mobile for the primary action (WhatsApp/quote). Make the phone number a `tel:` link in every header/footer.

## P1 — consistency & polish
- [ ] **Re-skin `cutlist.html`** to green/gold/cream (last high-traffic page still on legacy `styles.css`).
- [ ] **Re-skin `privacy.html`** to green/gold/cream (other remaining legacy page).
- [ ] **Pricing tool nav parity** — add back-to-Tools link + shared session bar so the member area (directory + cutlist + pricing) feels like one product.
- [ ] **Nav/footer include mechanism** — nav/footer/head are hand-duplicated across ~25 pages; a minimal static-include or JS partial-injector makes a nav change one edit, not twenty-five.
- [ ] **Estimator discoverability** — prominent link to the wardrobe estimator from the product pages (high intent).
- [ ] **Self-host / subset Google fonts** — remove the render-blocking `fonts.googleapis.com` round-trip on every page.

## P2 — longer term
- [ ] **Extend structured data** — `FAQPage` schema on service pages; `BreadcrumbList` on product/case-study pages.
- [ ] **Instagram token monitor** — the homepage feed token expires every 60 days; add an alert so the feed doesn't silently go blank.
- [ ] **Shelving nav relocation** — pending owner go-ahead (move Shelving from More ▾/mobile nav to footer only).
- [ ] **Repo hygiene** — review stray root files (`1pybt70ecjdf8hhqpg2phn2tb0h80n.html` Facebook verification now also a meta tag; `neewoody-redesign-concept.html` is gitignored/local).
- [ ] **Client-facing quote PDF** (from pricing tools) and invoice generator (existing backlog).

## Done
- [x] Directory: compact click-to-reveal cards + breadcrumb + denser Tools tab (2026-07-18)
- [x] Directory: real WhatsApp logo, uniform card height (2026-07-18)
- [x] Carpenter pricing: printable client copy, editable tier/add-on multipliers, body re-skin (corners + de-mono) (2026-07-18)
- [x] Register: 3-step intake wizard (2026-07-18)
- [x] Admin payments: "Show unpaid", edit/reverse, exclude admins + lifetime founders, fixed "32 of 31" count (2026-07-18)
- [x] Pricing model copy: one-time GHS 100 lifetime for first 100 founders; GHS 50/mo after (2026-07-18)
