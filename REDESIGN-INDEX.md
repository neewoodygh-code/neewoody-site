# Instruction Set: index.html
## Cue: "Go index.html"

---

### Step 0 — Before you write a single line of code

1. Read `REDESIGN-BRIEF.md` in full
2. Read `neewoody-redesign-concept.html` in full — this is your visual reference
3. Read the current `index.html` in full — note what must be preserved (GA4, WhatsApp button, meta tags, all hrefs)
4. List the image files that actually exist in `images/projects/sage-centre/` — you'll need the best one for the featured case study section
5. Only then begin

---

### Step 1 — `<head>` block

Keep all existing meta tags, GA4 script, and canonical URL exactly as they are.

Replace the existing `<link>` for fonts with:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Lora:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
```

Remove any existing link to Inter, Roboto, or system font stacks in the stylesheet.

---

### Step 2 — CSS

Replace the existing stylesheet entirely with the CSS from `neewoody-redesign-concept.html`. 

Apply these adjustments on top:
- Ensure the WhatsApp floating button styles are preserved from the current `index.html` if they exist there (check — they may be in a shared CSS file instead)
- Add `scroll-behavior: smooth` to `html`
- Ensure all CSS variables are declared in `:root` at the top

Do not carry over any existing CSS from the current `index.html` stylesheet. Start clean from the mockup.

---

### Step 3 — Nav

Use the nav structure from the mockup. 

Links must match the current site's actual nav structure:
- Home → `index.html`
- Work → `portfolio.html`  
- Services → keep the Services dropdown if it currently exists, otherwise link to the first service page
- Contact → `contact.html`

The "WhatsApp Us" button in the nav should link to:
`https://wa.me/233244633464?text=Hi%20Neewoody%2C%20I%27d%20like%20to%20discuss%20a%20custom%20furniture%20project.`

Nav behaviour:
- Over the hero: logo and links are cream/light colored
- After scrolling past hero: nav gets cream background with blur, text goes dark
- Implemented via IntersectionObserver watching the `.hero` section

---

### Step 4 — Hero Gallery

Three slides, Ken Burns + crossfade. Pure CSS animation — no JavaScript.

```
Slide 1: images/projects/oyarifa/oyarifa-master-closed-1.jpg
         Ken Burns: zoom out  scale(1.08) → scale(1.0)
         
Slide 2: images/projects/spintex-kitchen/spintex-kitchen-hero.jpg
         Ken Burns: pan right  scale(1.06) translateX(-2%) → scale(1.03) translateX(2%)
         
Slide 3: [best image from images/projects/sage-centre/ — pick the strongest, 
          most hero-worthy shot. If none suitable, use 
          images/projects/french-embassy/afromosia-table-installed-1.jpg]
         Ken Burns: zoom in from top-left  scale(1.1) translate(1%,1%) → scale(1.02) translate(-1%,-1%)
```

Timing: 26.4s cycle. Slide 1: delay 0s. Slide 2: delay 8.8s. Slide 3: delay 17.6s.

Hero text (bottom-left, z-index above scrim):
- Eyebrow: "Accra, Ghana · Made to Measure" — Jost, gold
- H1: "Built for the space you live in." — Playfair Display, cream, italic on "space you live in."
- Link: "See the work ↓" — scrolls to `#work`

No badge pills. No second CTA button. One link only.

---

### Step 5 — Featured Case Study

Dark green section (`#0b1f0e`) immediately below the hero. Two columns: image left (50%), text right (50%). Minimum height 88vh.

**Image:** Use the best available image from `images/projects/sage-centre/`. Check the directory first. If you find a dining table or interior shot, use that. If the directory is empty or images are unsuitable, use `images/projects/french-embassy/afromosia-table-installed-1.jpg` and note this in a comment for later replacement.

**Text content:**
- Eyebrow (muted): "Case Study · Wli, Volta Region · 2022–2024"
- H2: "Sage Centre — Full Teak Fitout"
- Pull quote (italic gold): "26 months. 18 bunk beds. An entire property in solid Ghanaian teak."
- Body: "A US-based NGO needed furniture built to international hospitality standards in a remote location. No off-the-shelf option existed. We designed, built, and delivered everything — from bunk beds and live-edge dining tables to sofas and cabinetry — sourced, made, and finished entirely in Ghana."
- Link: "Read the case study →" linking to `projects/sage-centre.html`

**Stat strip** spanning full width below both columns, inside the dark green section:
26 months · 18 bunk beds · 100% Ghanaian teak · International client standards

---

### Step 6 — Services Grid

Cream background. Top: two-column header (large heading left, intro paragraph right). Below: 3×2 grid of service cards with 1px gaps.

Grid items (number · name · description):
1. Custom Wardrobes — "Built-in, floor-to-ceiling, sliding or hinged — designed to use every centimetre of your bedroom."
2. Kitchen Cabinets — "Full kitchen fit-outs designed around your layout, your appliances, and the way you cook."
3. Custom Beds — "Bed frames, platform beds, storage beds — built in solid wood or wrapped, to your size and specification."
4. Dining & Living — "Dining tables, coffee tables, and solid-wood sofas — built to your dimensions in hardwood."
5. Solid Wood — "Teak, mahogany, iroko — specified by you, built by us. No MDF, no laminate. Furniture built to outlast the trends."
6. Commercial — "Restaurants, offices, hospitality — full commercial fit-outs built to spec, on budget, on time."

Each card links to its respective service page. Numbers and hover bar are gold. No icons.

---

### Step 7 — Maker's Statement

Cream-dark background (`#e8dfc4`). Centred. Single italic pullquote in large Playfair Display.

Content: *"Every piece is built for your exact space — not a showroom floor. That's the only brief we accept."*

Attribution below: "Neewoody Custom Woodwork · Accra" — Jost, muted, small caps

---

### Step 8 — Recent Work Grid

Section ID: `work` (so the hero scroll link works).

Asymmetric grid: `grid-template-columns: 3fr 2fr`, `grid-template-rows: 400px 280px`. First card spans both rows.

Cards (image, type label, project name):
1. `images/projects/spintex-kitchen/spintex-kitchen-hero.jpg` — Kitchens — "Full Kitchen Fit-out — Spintex"
2. `images/projects/oyarifa/oyarifa-master-closed-1.jpg` — Wardrobes — "Floor-to-Ceiling Wardrobes — Oyarifa"
3. `images/projects/judith-east-legon/judith-set-installed-2.jpg` — Dining & Living — "Hyedua Commission — East Legon"

Hover state: image darkens, label slides up from bottom.
"Full portfolio →" link top-right of section heading, links to `portfolio.html`.

---

### Step 9 — Testimonial

Dark green full-width section. Centred. Ben Schwartz's quote set large in italic Playfair Display.

Quote: *"Our guests and faculty from across Ghana and the world all complement the custom woodwork — especially the dining tables. Highly recommend if you're looking for something custom that needs to meet high standards."*

Attribution: **Ben Schwartz** / Educational Retreat Centre · Wli, Volta Region · Google Review, December 2024

No star rating graphic. No "4.8 · 14 reviews" badge.

---

### Step 10 — CTA Section

Two-column. Cream background.

Left: H2 — "Let's talk about your project." (italic on "your project", in gold)

Right:
- Short paragraph: "Send us a WhatsApp or fill in the quote form. Rough ideas are fine — we'll arrange a free site visit and take it from there."
- Two buttons only:
  - "WhatsApp Us →" — gold fill, links to WhatsApp
  - "Request a Quote" — outline, links to `contact.html`

---

### Step 11 — Footer

Two-column grid. Dark green background.

Left: Neewoody logo/wordmark + tagline "Made to measure. Built to last. Based in Accra."

Right: Stacked nav links, right-aligned:
- Work → `portfolio.html`
- Services → `wardrobes.html`
- Contact → `contact.html`
- Instagram → `https://www.instagram.com/neewoodygh`
- Privacy Policy → `privacy.html`

Bottom rule + copyright: "© 2025 Neewoody Custom Woodwork · Accra, Ghana · 0244 633 464"

---

### Step 12 — WhatsApp Floating Button

Preserve the existing floating WhatsApp button exactly. If its styles are inline in `index.html`, keep them. If they reference an external CSS file, do not remove that reference.

---

### Step 13 — Final checks before committing

- [ ] GA4 script is present in `<head>` with measurement ID `G-ZP77WR6BNH`
- [ ] All internal `href` links point to real pages in the repo
- [ ] All image `src` paths match files that actually exist in the repo
- [ ] No `console.error` in browser dev tools related to missing resources
- [ ] Nav colour toggle works: cream on dark over hero, dark on cream after scroll
- [ ] Hero gallery cycles correctly through all 3 images
- [ ] WhatsApp floating button is visible and functional
- [ ] No sections from the removal list remain (check: "Why Neewoody", stats row, badge pills, "How It Works", SEO paragraph)
- [ ] Page renders correctly at mobile width (375px) — hero text readable, no overflow

---

### On completion

Summarise:
1. What was implemented
2. Any image substitutions made (e.g. Sage Centre image fallback used)
3. Any judgment calls made that deviated from this instruction set
4. What needs to be reviewed before the next page

Do not begin any other page.
