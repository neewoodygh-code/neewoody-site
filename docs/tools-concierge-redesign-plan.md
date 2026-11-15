# Tools and Concierge: moving to the new look (game plan)

Written 2026-11-15 at the owner's request ("advice and put in a game plan for adapting our tools and concierge side to the new visuals and structure"). **Nothing in this plan has been built yet.** Work it one step per session and tick each step off here, the same way as `docs/design-review-plan.md`.

## Where things stand

Every marketing page is now Astro in the new design (bone `#efe9df`, espresso `#17130f`, walnut `#6b4a33`, brass `#c49455`, stone `#554d43`; Cormorant Garamond + Manrope; seven `--t-*` size tokens). The pages below still carry older designs, so a visitor who clicks from the new site into a tool or Concierge lands in a different-looking site.

| Page | Lines | Who sees it | Today's look |
|---|---|---|---|
| `concierge/index.html` | 136 | public | navy/gold/cream, own inline CSS |
| `concierge/register.html` | 432 | public (in sitemap) | navy, inline CSS |
| `concierge/login.html` | 171 | public | navy, inline CSS |
| `tools.html` | 351 | public | old green, `js/main.js` |
| `wardrobe-estimator.html` | 513 | public | old green, `js/main.js` |
| `cutlist.html` | 2020 | public + members | `css/styles.css` with token overrides, navy bars |
| `cut-sheet.html` | 1876 | public + members | `css/styles.css` with token overrides, navy bars |
| `concierge/directory.html` | 3225 | members | navy, inline CSS |
| `concierge/admin.html` | 1432 | owner | navy, inline CSS |
| `carpenter-pricing.html` | 2123 | members | React in the browser, own CSS |
| `invoice-generator.html` | 1337 | members | own CSS, navy |
| `catalogue.html` | 613 | clients (print) | old green |
| `pricing.html`, `admin.html`, `dispatch.html` | | owner / crew only | internal |

## Advice

1. **Re-skin, do not rebuild.** The tools and the member area are working applications with thousands of lines of inline script, saved-data formats, print layouts and a service worker. Rewriting them as Astro components would risk all of that for no visible gain. The safe move is to change colours, type and the header/footer while leaving markup ids, scripts and API calls untouched. `CONCIERGE_SPEC.md` also says Concierge pages stay static HTML/JS with no framework, and deviations need the owner's sign-off.
2. **One shared stylesheet for the app pages.** Today each page carries its own copy of colours and button styles, which is why they drifted. Add one small static file, `css/app.css`, holding the same tokens as `src/styles/global.css` plus the few shared pieces (buttons, form fields, cards, the guest/member bar, focus ring). Fonts are copied once into a static `/fonts/` folder so plain HTML pages can use them. After that a colour change is one edit, not fifteen.
3. **Concierge keeps its navy.** It is a sister brand with its own mark (growth rings) and the navy `#1f2f58` is how members recognise it. Recommendation: keep navy as Concierge's anchor colour and take everything else from the new system (bone page, espresso text, brass accent, Manrope, the `--t-*` sizes, calm motion). Neewoody = espresso, Concierge = navy, same family.
4. **Keep member pages light.** Members are on Android over MTN data (binding rule in `CONCIERGE_CONTEXT.md`). Member screens use Manrope only (one small font file); the serif appears only on the public front doors. No new images, no animations. Check page weight before and after each step.
5. **Printed output does not change.** Cut sheets, cutlists, quotes and invoices are documents members hand to machine shops and clients, some with the member's own letterhead. Only the on-screen chrome is restyled. Each step compares a printed PDF before and after.
6. **App pages get a slim header, not the marketing menu.** Logo, the Concierge mark, and the guest/member bar (login or badge + log out). The "What we make" dropdown belongs to the marketing site; a member in the middle of a cut list does not need it. The guest/member bar rule stays exactly as written in `CONCIERGE_CONTEXT.md`.
7. **Leave the internal pages alone.** `dispatch.html`, `pricing.html` and `admin.html` are used only by the owner and crew, and dispatch is protected by Standing Instruction 5. They gain nothing from a re-skin.

## Two decisions for the owner before Step 1

**DECIDED 2026-11-15 (owner: "Yes, both"): A = Concierge keeps navy with the new neutrals; B = the public front doors are rebuilt as Astro pages with their scripts embedded unchanged.** Step 1 is clear to start.

- **A. Concierge colour:** keep navy with the new neutrals (recommended), or move Concierge to espresso like Neewoody.
- **B. Public front doors:** rebuild `tools.html`, the estimator and the Concierge landing/login/register as Astro pages sharing the site's header and footer, with their scripts embedded unchanged, the way Contact and Hire were done (recommended, since these are the pages a visitor crosses into from the new site), or only re-skin them in place.

## Steps (one per session)

- [x] **Step 1: shared foundation. DONE 2026-11-15.** `css/app.css` (tokens copied from `src/styles/global.css`, plus `--navy`; base rules scoped to `<body class="app">` with `:where()` so they never out-rank a page's own styles; `app-navy` for the Concierge navy page; shared pieces `.ui-panel`, `.ui-field`, `.ui-label`, `.ui-input`, `.ui-btn` (+ `.wide`, `.on-dark`), `.ui-link`, and `.app .msg` / `.msg.error` / `.msg.ok` because the page scripts set those class names). `/fonts/` holds four woff2 files copied from `@fontsource` (Manrope 400/500/600, Cormorant Garamond 400; 65 KB together, a page downloads only the ones it uses); `_headers` caches `/fonts/*` for a year. Proven on `concierge/login.html`: Google Fonts link and the page's own colour/button CSS removed, growth-rings mark above the heading, sentence-case labels, navy pill button; **the script block is byte-for-byte unchanged**. Checked locally at desktop and 375 px (no sideways scroll, fonts load, phone validation message, error colour with `fetch` stubbed, nothing sent to the live API), and `npm run build` publishes the new files. Gotcha: the build only copies git-tracked files, so `git add` new files before a local build check.
- [ ] **Step 2: public front doors.** `concierge/index.html`, `register.html`, `login.html`, `tools.html`, `wardrobe-estimator.html`. Per decision B. Addresses must not change (`/concierge/` scope of `concierge/sw.js`, `login.html?next=`, sitemap entries, the Paystack return address on register).
- [ ] **Step 3: public tools.** `cutlist.html`, `cut-sheet.html`: slim header, footer, screen skin, drop `css/styles.css`. Print layouts untouched.
- [ ] **Step 4: member area.** `concierge/directory.html` (tabs, cards, modals, bell), then `concierge/admin.html`. Colour and type through tokens only; no markup restructure. Add a "What's new" entry.
- [ ] **Step 5: member tools.** `invoice-generator.html`, `carpenter-pricing.html`: screen chrome only. The document style panel and member letterheads are untouched.
- [ ] **Step 6: catalogue.** `catalogue.html` redone in the new palette with the straightened photos; owner checks the printed PDF. Client-facing, so it could move earlier if a client asks for it.
- [ ] **Step 7: clean-up.** Delete `css/styles.css`, `js/main.js`, `js/tool-guide.js` once nothing loads them; check `concierge/academy/`; mark the Forest-and-timber table in `CLAUDE.md` as history; Lighthouse on every changed page; one design rule set for the whole site.

## Checks for every step

- Read `CONCIERGE_CONTEXT.md` and `CONCIERGE_SPEC.md` first.
- Never a real form submit, payment or sign-up: stub `window.fetch`, or run `wrangler dev --local` with throwaway accounts for logged-in screens.
- Before/after: screenshots at 375 px and desktop, a printed PDF for any page that prints, page weight, and the browser console clean.
- Saved data still loads: a saved cut list, cut sheet, quote and invoice made before the change open correctly after it.
- Bump `?v=` on any changed js/css; bump `concierge.js?v=` only if it changes.
- No Worker deploy is needed for any step. If one turns out to be needed, announce it first.
- The site will look mixed between steps; that is expected, as it was during the marketing migration.
