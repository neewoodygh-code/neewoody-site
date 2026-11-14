# Design review and game plan (2026-11-13)

Owner's aim: **timeless elegance**. Review done after Portfolio, Contact and Hire went live on Astro. Owner approved working through everything **one step at a time**. Nothing below has been started. Tick steps off here as they ship.

How the review was done: read all of `src/`, looked at the homepage and Wardrobes on desktop (1440) and phone (375), plus notes from building the other pages.

## Verdict
The foundation is good, but the site reads as "well-made 2025 website" more than "timeless".

Working well: the bone / espresso / walnut palette with brass used sparingly; real photos and facts; no-JS-safe build; Lighthouse 90s to 100; every product page is one content file on a shared layout.

## Findings

### Visual
1. **Too much motion.** Masked headline rise (`.mask`, `rise`), hero photo `settle` zoom, word-by-word darkening statement (`#mfText`), hover zoom on every photo, Lenis smooth scrolling (`Base.astro`), rotated side caption (`.hero-cap`), parallax classes (`par-slow` / `par-fast`). Together they are this year's award-site kit and will date first. Keep one quiet fade (`.rv`), drop the rest.
2. **Type is thin and scattered.** Cormorant Garamond at weight 300 at very large sizes is fragile. Body text is about 15px (`.92rem` to `.98rem`) in stone grey and reads small on a laptop. `global.css` has **42 distinct font sizes**; aim for six or seven steps defined as tokens.
3. **Tracked capital labels crept back** in ten places (`.label`, `.g-badge`, `.hero-facts dt`, `.hero-cap`, `.proj-cap`, `.contact-meta`, `.foot-links p`, `.g-more`, `.band figcaption`, `.frame-tag`). The owner called these an AI tell before the redesign. Cut to one or two uses.
4. **Photo quality is uneven.** Sage photos are professional; many product photos are phone shots. The Wardrobes hero (`oyarifa` grey laminate) is a flat phone picture filling half the screen. Pick heroes by photo quality; longer term, a proper shoot of three or four jobs would lift the site more than any code.
5. **Footer logo is loud.** `.contact-logo` runs the full page width on every page and fights the quiet serif.
6. **Pages are very long on phones.** Wardrobes at 375px is about 15,600px tall; its gallery alone is 7,368px (12 single-column cards with long captions). Homepage `process` section is 2,431px on phone and has large empty gaps on desktop (step `min-height`).
7. **Two voices.** Homepage copy is spare; product pages still carry the older, wordier SEO text (for example "not borrowed from a showroom"). Should sound like one person. Use the `humanize-copy` skill; keep facts and keywords.

### Structure
1. **Navigation.** `Nav.astro` links are Services / Work (both go back to homepage anchors), Portfolio, Concierge, Contact (`#contact`, the footer, not `/contact`). From a product page you cannot reach another product directly. Concierge serves carpenters, not clients, and sits in the main menu.
2. **Half the site is still the old green design.** All nine `projects/*.html` case studies, `privacy.html`, tools. "Read how we built it" on the new homepage lands on a green page. Most visible inconsistency.
3. **React is loaded for one photo scroller.** `dist/_astro/client.*.js` is about 213 KB for `WorkGallery.jsx` (under 3 KB). Rewrite as plain script in an Astro component, then remove `@astrojs/react`, `react`, `react-dom`.
4. **`src/styles/global.css` is one 465-line file with patches appended** (gallery tones, forms). Move styles into their components; keep only tokens, reset and shared atoms global.
5. **Content files have no checking.** `src/content/*.js` are plain objects; a typo fails at build or silently drops a section. Move to Astro content collections with a schema. Case studies fit this model well. Also the `P` / `ph` helpers are repeated in each file.
6. **Admin-posted projects load in the browser** (`js/cms-posts.js`): invisible to Google, and one is a 5 MB photo from the dispatch R2. Building them into the page at build time touches the dispatch side: **needs the owner's explicit go-ahead in that session** (Standing Instruction 5).
7. **Small Astro wins:** `@astrojs/sitemap` instead of the hand-kept `sitemap.xml`; a per-page share image (Base already takes `ogPhoto`, pages do not pass it); view transitions between pages.
8. Smaller notes from my own work: the viewer's write-up area is cramped (`max-height: 18vh`); Portfolio is three galleries in a row; `data-set` JSON blobs make gallery pages heavy (Portfolio HTML is 64 KB).

## Game plan (one step per session, in this order)

- [x] **Step 1. Calm it down** DONE 2026-11-14 (shared files, changes every page at once). What shipped: Lenis removed (dependency uninstalled, native `scroll-behavior: smooth` instead); mask rise, hero zoom, word-by-word statement, parallax, band reveal and every hover zoom removed; `.rv` is now a plain 0.8s opacity fade; links underline plainly. Type: seven tokens `--t-small/body/lead/h3/h2/display/hero` in `global.css` (was 42 sizes), body 17px, `--stone` darkened to `#554d43`, all serif at weight 400 (300 and italic font files dropped). Labels: only `.label` is tracked capitals; badges, captions, facts and footer headings are plain text. Footer logo 170px. Nav: "What we make" dropdown (the 7 `SERVICES` links) + Portfolio + Contact (`/contact`); Concierge and Hire are footer-only; phone menu lists the same. Homepage hero caption sits flat at top right. Verified: 750 links OK, no sideways scroll at 375px, Lighthouse phone 100/100/100/100 on home, Wardrobes, Contact and 99 on Portfolio (was 94 to 95).
  - Motion: remove Lenis, mask rise, hero zoom, word-by-word statement, parallax, hover zooms. Keep `.rv` fade.
  - Type: define a 6 to 7 step size scale as tokens; body 17 to 18px in a darker tone; headline weight 400.
  - Labels: keep tracked capitals in at most two places; the rest become plain sentence-case text.
  - Footer: logo small, not full width.
  - Nav: "What we make" menu listing every product page; Contact goes to `/contact`; Concierge moves to the footer.
  - Verify: screenshots desktop + phone on home, one product page, portfolio, contact; Lighthouse; no horizontal scroll.
- [x] **Step 2. Shorten the phone pages and re-pick heroes** DONE 2026-11-14. Galleries with more than 8 cards show the first 6 (`limit`, default 6; Portfolio "Made to order" 9, "From the workshop" unlimited) with a "Show all N" button; picking a filter also shows all; admin-posted cards (`.g-cms`) are never hidden; no-JS shows everything. Phones: two compact columns, caption hidden on cards (it stays in the viewer); case studies stay one column. Photo cards now align at the top (button cards were centring their content). Homepage: process steps `min-height` 60vh to 34vh, step photos 3:2 on phones, Wli band 56svh on phones. Phone page heights: Wardrobes 15,584px to about 9,800px (gallery 7,368 to 1,438), homepage 10,540 to 9,477. Heroes (owner picked from `docs/review/hero-candidates.jpg`): Wardrobes = Bortianor glass-front wardrobe (its feature block now uses `bortianor-master-room.jpg`), Beds = Sage Centre teak bed (`hero.position` crops to the bed; feature block uses `sage-bed-room.jpg`; the old Golf Hills hero photo moved into the Golf Hills gallery card). The other five product heroes were already the strongest photo and stay. Note: the Browser pane sometimes paints a hero photo black at phone size; a Lighthouse final screenshot showed it correct.
  - Galleries: show 6 with a "Show all" control, or two-column compact cards on phones; shorter captions on cards (full text stays in the viewer).
  - Homepage process section: remove the dead space.
  - Choose each product page's hero by photo quality (show the owner candidates before changing).
- [x] **Step 3. Finish the migration** DONE 2026-11-14.
  - Case studies: all 9 are Astro pages (`src/content/projects/<slug>.js` via `src/pages/projects/[slug].astro` on `ProductPage.astro`; old files in `docs/legacy/projects/`). A converter kept every sentence and photo; eyebrow labels were dropped on purpose; `how-gallery-6` (same file as `how-gallery-2`) left out. New pieces: Feature takes `paras` and opens the viewer when it has no link; `Videos.astro` (YouTube in a dialog, nothing loads until pressed); `related` links section; long quotes and long footer titles shrink.
  - Privacy and 404: `src/pages/privacy.astro` (policy wording unchanged, noindex) and `src/pages/404.astro` (root-absolute links, noindex). Old files in `docs/legacy/`.
  - React removed: `WorkGallery.astro` is plain script; the site ships no JavaScript bundles.
  - Stylesheet split into `src/styles/global.css` (every page), `home.css`, `page.css` (product pages, portfolio, case studies), `forms.css` (contact, hire, privacy, 404), each imported where it is used. Verified with a computed-style snapshot of 10 pages at 1440px and 375px: identical before and after.
  - Content check: `src/content/check.js` stops the build with a plain message when a content file has an unknown section kind or a missing field. (Chosen over Astro content collections: same protection, far less churn.)
  - Share images: every template page now uses its own hero photo (`Base` prop `ogImg`); `Base` also takes `noindex`.
  - `scripts/stage-site.mjs` skips old files owned by dynamic pages (`[slug]`).
  - Sitemap: **kept hand-maintained on purpose.** `@astrojs/sitemap` only knows Astro pages and would drop the tools, catalogue and Concierge entries; the current `sitemap.xml` already lists every public page with clean addresses.
  - Verified: 3,058 links checked (only script-built Concierge strings flagged, as before); Lighthouse phone 94 to 99 speed, 100 accessibility / best practices / SEO on home, Wardrobes, Sage, Nadia, House of Walker, Jerksoul.
  - Left as they are (not marketing pages): tools hub, catalogue, estimator, cutlist, cut sheet, pricing, Concierge.
  - Privacy policy section 4 corrected 2026-11-14 (owner said yes): the contact-form paragraph now says the form is handled by our own site on Cloudflare, not Formspree; "Last updated" is now November 2026.
- [x] **Step 4. One voice** DONE 2026-11-14 (humanize-copy skill; SEO titles and descriptions untouched).
  - Rewritten in full: the four oldest case studies (House of Walker, Jerksoul, East Legon dining room, Achimota guesthouse). Title Case headings, 88 dashes, stacked fragments and sales phrasing removed; headlines now say what the job was. Their content files are now hand-written (`src/content/projects/*.js`), no longer converter output.
  - Their old facts strips (client, venue, timber, finish), which the Step 3 converter had missed, are back as hero facts.
  - Light pass on the product pages and the other case studies: about 35 sentences changed (not-X-but-Y lines, "statement", "premium", "seamless", "perfectly", "Whether you want...", one-line closers). "Next:" removed from related links.
  - The East Legon client's first name is no longer in visible copy (standing rule: no client names unless approved); the page address `/projects/judith-east-legon` is unchanged.
  - Checked: every number from the four old pages is still present; build passes; Lighthouse 98 to 99 / 100 / 100 / 100 on two of them.
- [ ] **Step 5. Needs owner decisions**
  - Build admin-posted projects into the pages (dispatch side, explicit go-ahead required) and fix the 5 MB photo.
  - A professional photo shoot of three or four jobs.

## Still open from earlier sessions
- `scripts/check-live.mjs` + weekly run (owner said yes; not built). See CLAUDE.md "In progress".
