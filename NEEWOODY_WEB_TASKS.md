# Neewoody Web Improvement Tasks
> Work through these one at a time. Each task is self-contained. Check off as you go.

---

## Phase 1 — Fix What Is Actively Broken

### ~~Task 01 — Fix the contact form~~ ✅ DONE

**What was built:**

The form had no submit handler at all — no `action`, no `fetch`, nothing. Implemented as a Cloudflare Pages Function instead of Formspree.

**Files changed:**
- `functions/api/lead.js` — new Pages Function: validates required fields, honeypot check, saves lead to KV as `nwd-leads` (newest-first array), sends Web Push to admin (sub-cr01) if VAPID keys available. Returns `{ok:true}` / `{ok:false, error}`.
- `contact.html` — added submit event listener: client-side field validation with inline errors, POST JSON to `/api/lead`, loading/success/error states, GA4 `form_submit` event on success.

**Sub-task also completed — Leads tab in Dispatch admin:**
- `functions/api/leads.js` — `GET /api/leads`, auth via `X-NWD-Key` header, reads `nwd-leads` from KV sorted newest-first.
- `dispatch.html` — `LeadsTab` component added to `AdminDash`: lazy-fetches on first tab select, shows name/timestamp, tap-to-call phone, email if set, project type/dims/budget/location, message block, WhatsApp button with pre-filled message. Badge shows lead count. Additive only — no existing components modified.

**One manual step still required:**
> Cloudflare Pages dashboard → neewoody-site → Settings → Functions → KV namespace bindings
> Add: Variable name = `KV` | Namespace = `neewoody-dispatch`
> Without this, leads are accepted (form returns success) but not stored.

---

### Task 02 — Fix or remove the Instagram grid
**Problem:** `IG_TOKEN` is not set in Cloudflare Pages environment variables. The grid section renders blank.

**Files to check:** `index.html`, the Cloudflare Pages Function for Instagram (likely `functions/instagram.js` or similar).

**Actions:**
1. Check if a valid long-lived Instagram token is available in Cloudflare Pages → Settings → Environment Variables
2. **If token exists:** Set `IG_TOKEN` in Pages env vars and redeploy — the grid should work
3. **If no token:** Remove the Instagram grid section from `index.html` entirely until the token is set up. A blank section is worse than no section. Add an HTML comment: `<!-- Instagram grid removed until IG_TOKEN is configured -->`

**Verify:** Homepage loads with either a working grid or no grid section — no blank/broken area.

---

### Task 03 — Fix GA4 event tracking
**Problem:** Only 1 GA4 event is firing sitewide. Key conversion actions are invisible.

**Files to check:** `index.html`, `cutlist.html`, all service pages, case study pages.

**Actions — add tracking for each of these:**

1. **WhatsApp button clicks** — every WhatsApp link (`wa.me` href) across the site:
```js
gtag('event', 'whatsapp_click', { event_category: 'engagement', event_label: document.title });
```

2. **Contact form submission** — fire on successful fetch response:
```js
gtag('event', 'form_submit', { event_category: 'lead', event_label: 'contact_form' });
```

3. **Cutlist generate** — fire when the cutlist output is generated in `cutlist.html`:
```js
gtag('event', 'cutlist_generate', { event_category: 'tool_use' });
```

4. **Wardrobe estimator use** — fire when estimator calculates a result:
```js
gtag('event', 'estimator_calculate', { event_category: 'tool_use' });
```

5. **Page scroll depth** — add to all pages, fires at 50% and 90% scroll:
```js
let fired = { 50: false, 90: false };
window.addEventListener('scroll', () => {
  const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  [50, 90].forEach(d => {
    if (pct >= d && !fired[d]) {
      fired[d] = true;
      gtag('event', 'scroll_depth', { event_category: 'engagement', event_label: d + '%', page: location.pathname });
    }
  });
});
```

**Verify:** Open GA4 → DebugView, trigger each action, confirm events appear.

---

### Task 04 — Move VAPID keys out of client source
**Problem:** Web push VAPID public/private keys are exposed in browser-readable source code in `dispatch.html` or the Worker. The private key must never reach the client.

**Files to check:** `dispatch.html`, `worker.js`.

**Actions:**
1. In `worker.js`: move `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` to Cloudflare Worker environment variables (Worker → Settings → Variables → Encrypt)
2. Remove any hardcoded key strings from `worker.js` and reference them as `env.VAPID_PRIVATE_KEY` / `env.VAPID_PUBLIC_KEY`
3. In `dispatch.html`: the VAPID **public** key may remain client-side (it is public), but confirm no private key is present
4. Redeploy the Worker

**Verify:** View source on `dispatch.html` — no private key string present. Push notifications still work.

---

## Phase 2 — Infrastructure

### Task 05 — Git / Claude Code workflow
- [x] **Already done.** Claude Code is in use. Skip this task.

---

### Task 06 — KV backup for Dispatch
**Problem:** All Dispatch job and attendance data lives in a single KV namespace (`neewoody-dispatch`) with no backup. One corruption event loses everything.

**Files to check:** `worker.js`.

**Actions:**
1. Add a `GET /api/backup` route to the Worker that:
   - Lists all keys in the KV namespace using `env.KV.list()`
   - Fetches each value
   - Returns a JSON dump of all key-value pairs
2. Protect this route with the existing API key (`nwd-dispatch-2024`)
3. In the Admin Dashboard of `dispatch.html`, add a "Download backup" button that calls `/api/backup` and triggers a JSON file download
4. **Optional but recommended:** Set up a Cloudflare Cron Trigger on the Worker to run weekly and POST the backup to a fixed URL (a Google Apps Script webhook that appends to a Sheet works well)

**Verify:** Click "Download backup" — a valid JSON file downloads containing all job records.

---

## Phase 3 — Performance

### Task 07 — Image optimisation pipeline
**Problem:** Portfolio images are raw phone JPEGs, some 4–6MB. This is a critical problem for mobile users in Accra on slower connections.

**Files to check:** All `<img>` tags across the site, especially in case study pages and the portfolio/gallery sections.

**Actions:**
1. Install Squoosh CLI: `npm install -g @squoosh/cli`
2. For every image in the site repo, run:
```bash
squoosh-cli --webp '{"quality":82}' --resize '{"width":1400}' images/*.jpg
```
3. Replace all `<img src="photo.jpg">` with:
```html
<picture>
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" alt="[descriptive alt text]" loading="lazy" width="1400" height="933">
</picture>
```
4. Add `loading="lazy"` to every image that is not the first visible image on the page
5. Add `width` and `height` attributes to every `<img>` to prevent layout shift (CLS)
6. Hero images (first visible) should NOT have `loading="lazy"` — add `fetchpriority="high"` instead

**Verify:** Run Lighthouse on the homepage. LCP should improve. No images above 300KB.

---

### Task 08 — Self-host Google Fonts
**Problem:** Fonts loaded via Google's CDN block text rendering and add a third-party DNS lookup.

**Files to check:** `<head>` section of all HTML files (the font `<link>` tags).

**Actions:**
1. Go to [google-webfonts-helper](https://gwfh.mranftl.com/) and download the font files for every family currently loaded from Google
2. Place font files in `/fonts/` directory in the repo
3. Replace the Google Fonts `<link>` tags with a single `<link rel="stylesheet" href="/css/fonts.css">` tag
4. Create `/css/fonts.css` with `@font-face` declarations pointing to the local files:
```css
@font-face {
  font-family: 'YourFont';
  src: url('/fonts/yourfont.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  font-style: normal;
}
```
5. Use `woff2` only — all modern browsers support it, no need for `woff` fallback
6. Remove all `<link>` tags pointing to `fonts.googleapis.com`

**Verify:** Disable network in DevTools. Page text still renders correctly using cached local fonts.

---

## Phase 4 — SEO and Conversion

### Task 09 — LocalBusiness + Review schema on homepage
**Problem:** Real Google reviews are displayed on the homepage but there is no JSON-LD schema. Google cannot surface star ratings in search results.

**Files to check:** `index.html`.

**Actions:**
Add the following JSON-LD block inside `<head>` of `index.html`, populated with real data:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Neewoody Custom Woodwork",
  "url": "https://neewoodygh.com",
  "telephone": "+233244633464",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Accra",
    "addressCountry": "GH"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 5.6037,
    "longitude": -0.1870
  },
  "image": "https://neewoodygh.com/images/og-image.jpg",
  "priceRange": "$$",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "3"
  },
  "review": [
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Ben Schwartz" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "reviewBody": "[Ben's review text here]"
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "Ngminvielu Kuuire" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "reviewBody": "[Ngminvielu's review text here]"
    },
    {
      "@type": "Review",
      "author": { "@type": "Person", "name": "mcdennis appau" },
      "reviewRating": { "@type": "Rating", "ratingValue": "5" },
      "reviewBody": "[mcdennis's review text here]"
    }
  ]
}
</script>
```

**Verify:** Paste the homepage URL into [Google's Rich Results Test](https://search.google.com/test/rich-results). Should show LocalBusiness with reviews detected.

---

### Task 10 — Per-page OG images
**Problem:** Every page shares the same `og:image`. Sharing a case study or project page on WhatsApp shows the generic homepage image.

**Files to check:** All HTML files — look for `<meta property="og:image"`.

**Actions:**
1. For each page, identify its hero/primary image
2. Update the `og:image` meta tag to point to that page's hero image
3. Also update `og:title` and `og:description` if they are generic
4. Minimum OG image size: 1200×630px — check the hero images meet this or create cropped versions

Priority pages to fix first:
- `sage-centre.html` → use the Sage Centre hero photo
- `house-of-walker.html` → use the House of Walker hero photo
- Wardrobe service page → use a wardrobe hero photo
- Kitchen service page → use a kitchen hero photo

**Verify:** Use [opengraph.xyz](https://www.opengraph.xyz) to preview each updated page.

---

### Task 11 — Cutlist WhatsApp CTA
**Problem:** The cutlist tool calculates a result and then drops the user with no next step. It is generating intent but not converting it.

**Files to check:** `cutlist.html`.

**Actions:**
1. After the cutlist output renders, show a CTA section:
```html
<div class="cutlist-cta">
  <p>Ready to build this wardrobe? Send your cutlist to Neewoody for a quote.</p>
  <a href="https://wa.me/233244633464?text=Hi%2C%20I%20used%20your%20cutlist%20tool%20and%20I%27d%20like%20a%20quote"
     class="btn-whatsapp" target="_blank" rel="noopener">
    Get a quote on WhatsApp
  </a>
</div>
```
2. Pre-fill the WhatsApp message with key dimensions from the cutlist output (number of bays, total height/width, door type) so Nuer gets useful context immediately
3. Fire a GA4 event when this CTA is clicked (see Task 03)

**Verify:** Generate a cutlist — the WhatsApp CTA appears. Click it — WhatsApp opens with a pre-filled message containing the job specs.

---

### Task 12 — Case study structured data
**Problem:** The Sage Centre and House of Walker pages have rich, indexable content but no schema markup. They are missing from Google rich results.

**Files to check:** `sage-centre.html`, `house-of-walker.html`.

**Actions:**
Add JSON-LD to each case study page's `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Sage Experience Centre — 26-Month Teak Fitout",
  "description": "Bespoke teak furniture and fitout for Sage Experience NGO, Wli, Volta Region.",
  "image": "https://neewoodygh.com/images/sage-centre-hero.jpg",
  "datePublished": "2024-01-01",
  "author": {
    "@type": "Organization",
    "name": "Neewoody Custom Woodwork"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Neewoody Custom Woodwork",
    "logo": {
      "@type": "ImageObject",
      "url": "https://neewoodygh.com/images/logo.png"
    }
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://neewoodygh.com" },
      { "@type": "ListItem", "position": 2, "name": "Projects", "item": "https://neewoodygh.com/#projects" },
      { "@type": "ListItem", "position": 3, "name": "Sage Experience Centre" }
    ]
  }
}
</script>
```

Repeat with appropriate data for `house-of-walker.html`.

**Verify:** [Google Rich Results Test](https://search.google.com/test/rich-results) on each page — Article and BreadcrumbList detected.

---

### Task 13 — Sitemap audit and update
**Problem:** The sitemap is hand-maintained and likely missing new pages or containing stale URLs.

**Files to check:** `sitemap.xml`.

**Actions:**
1. List every live `.html` file in the repo
2. Open `sitemap.xml` and compare — add missing pages, remove any deleted/moved pages
3. Update `<lastmod>` dates to today for any pages that have been recently modified
4. Ensure `sitemap.xml` is referenced in `robots.txt`: `Sitemap: https://neewoodygh.com/sitemap.xml`
5. Submit the updated sitemap in Google Search Console

**Verify:** Every live page appears in `sitemap.xml`. `robots.txt` references the sitemap.

---

### Task 14 — Custom 404 page
**Problem:** Broken links show a generic browser error. Visitors leave instead of finding their way back.

**Files to check:** Root of the repo, `_redirects` or `_headers` file if present.

**Actions:**
1. Create `404.html` in the repo root with:
   - Neewoody branding (header, logo, colours)
   - A clear message: "This page doesn't exist"
   - A prominent link back to the homepage
   - The WhatsApp contact button
2. Cloudflare Pages automatically serves `404.html` for missing routes — no config needed

**Verify:** Navigate to `neewoodygh.com/doesnotexist` — custom 404 page appears.

---

## Phase 5 — Architecture

### Task 15 — Nav and footer JS partials
**Problem:** The nav (~60 lines CSS + HTML) and footer are copy-pasted into every HTML file. Any design change requires editing 17+ files and risks inconsistency.

**Files to create:** `/partials/nav.html`, `/partials/footer.html`
**Files to edit:** All HTML files.

**Actions:**
1. Create `/partials/nav.html` containing only the nav HTML (no `<html>`, `<body>`, etc.)
2. Create `/partials/footer.html` containing only the footer HTML
3. Create `/js/includes.js`:
```js
document.querySelectorAll('[data-include]').forEach(el => {
  fetch(el.dataset.include)
    .then(r => r.text())
    .then(html => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      el.replaceWith(...temp.childNodes);
    });
});
```
4. In every HTML file:
   - Replace the nav HTML block with `<div data-include="/partials/nav.html"></div>`
   - Replace the footer HTML block with `<div data-include="/partials/footer.html"></div>`
   - Add `<script src="/js/includes.js" defer></script>` before `</body>`
5. Move all shared nav/footer CSS into the main stylesheet — remove it from individual page `<style>` blocks

**Verify:** Every page loads with the correct nav and footer. Changing one word in `nav.html` updates every page.

---

### Task 16 — Mobile nav focus trap
**Problem:** When the mobile nav overlay opens, keyboard focus is not constrained to it. Users can tab into the page content behind the overlay — a WCAG 2.1 failure.

**Files to check:** The nav JS in `index.html` or the shared nav partial (after Task 15).

**Actions:**
Add this focus trap to the mobile nav open/close logic:

```js
function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'a[href], button, input, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  element.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  first.focus();
}
```

Call `trapFocus(navOverlay)` when the nav opens. When the nav closes, return focus to the hamburger button.

**Verify:** Open the mobile nav, press Tab repeatedly — focus stays within the nav. Press Escape or click close — focus returns to the hamburger button.

---

### Task 17 — Build system (Eleventy)
**Problem:** Long-term fix for the duplication problem. Partials in Task 15 solve the immediate pain, but a build system is the proper architecture.

> ⚠️ **Do Task 15 first.** Do this task after the rest of Phase 5 is stable.

**Actions:**
1. In the repo root: `npm init -y && npm install @11ty/eleventy --save-dev`
2. Create `.eleventy.js`:
```js
module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("fonts");
  return {
    dir: { input: "src", output: "dist" }
  };
};
```
3. Move all HTML files into `/src/`, create `/src/_includes/` for nav and footer partials
4. Convert pages to use Eleventy's `{% include %}` syntax for nav and footer
5. Update Cloudflare Pages build settings: Build command `npx eleventy`, Output directory `dist`
6. Add `.gitignore` entry for `dist/` (Cloudflare Pages builds it, no need to commit)

**Verify:** `npx eleventy` builds the site into `/dist/`. Cloudflare Pages deploys from `dist/`. All pages render correctly.

---

### Task 18 — Dispatch Vite build
**Problem:** `dispatch.html` loads Babel Standalone (~900KB) to transpile JSX in the browser at runtime. This is the slowest possible way to run React.

> ⚠️ **Low urgency — internal tooling. Do this last.**

**Actions:**
1. Create a `/dispatch-app/` directory
2. `npm create vite@latest dispatch-app -- --template react`
3. Move the Dispatch React components from `dispatch.html` into `/dispatch-app/src/`
4. Build: `npm run build` outputs to `/dispatch-app/dist/`
5. Copy built files into the main site repo under `/dispatch/`
6. Update the Worker to serve these static files or update Cloudflare Pages routing

**Verify:** `dispatch.html` (or `/dispatch/`) loads visibly faster. Bundle size under 200KB. All screens (Home, Pin, Crew, Admin, Job, Attendance) work correctly.

---

## Notes for Claude Code

- Tackle one task at a time. Confirm before moving to the next.
- When editing HTML files, preserve existing class names and IDs — other CSS/JS may depend on them.
- Site repo is on GitHub, deployed via Cloudflare Pages. Changes pushed to `main` deploy automatically.
- API key for Dispatch Worker: `nwd-dispatch-2024`
- Worker name: `neewoody-dispatch-api` | KV namespace: `neewoody-dispatch`
- GA4 property ID: `G-ZP77WR6BNH`
- WhatsApp number: `233244633464`
- Business phone: `0244633464`
