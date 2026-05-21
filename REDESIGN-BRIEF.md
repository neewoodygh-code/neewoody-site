# Neewoody Website Redesign — Master Brief

Read this in full before executing any instruction set. This document explains the why behind every change. Do not skip it.

---

## What This Project Is

A full visual and structural redesign of neewoodygh.com. The site was originally built with AI assistance and carries the hallmarks of that: SaaS-style landing page structure, generic feature card sections, stats rows, badge pills, and a predictable layout skeleton that could belong to any business in any industry. The goal is to replace that with a design language that reads as the work of a genuine craftsman — editorial, image-led, quiet.

The content and copy are largely good. The structure underneath it is the problem.

---

## Design Philosophy

**What this site should feel like:** A maker's portfolio. Not a product catalogue, not a service website. Think editorial magazine layout crossed with a craftsman's studio — the kind of site where the photography does the selling and the text gets out of the way.

**Reference sites studied:** Kyle Cook Custom (kylecookcustom.com), Kristian Pettifor (kristianpettifor.co.uk), George Nakashima Woodworkers (nakashimawoodworkers.com). Note what they share: single strong hero images, restrained typography, no feature cards, no stats rows, no "Why Choose Us" sections. The work speaks.

**What we are moving away from:**
- SaaS landing page structure (hero → feature cards → how it works → CTA)
- Generic section patterns (icon cards, stats rows, numbered step cards)
- Centered layouts with equal-weight elements
- The "Claude look": Inter/system fonts, white backgrounds, purple/blue accents, card grids

**What we are moving toward:**
- Editorial, asymmetric layouts
- Cream backgrounds instead of white
- Large serif typography with generous negative space
- Image-led storytelling
- One strong voice, not bullet points

---

## Design System

These tokens must be applied consistently across every page. Do not introduce new colors or fonts.

### Colors
```css
--green:      #0b1f0e;   /* deep forest green — primary dark */
--gold:       #c8922a;   /* warm gold — accent only */
--cream:      #f0e8d0;   /* main background */
--cream-dark: #e8dfc4;   /* secondary background, hover states */
--ink:        #1c1c1a;   /* body text */
--muted:      #6b6557;   /* secondary text, labels */
```

### Typography
```css
--display: 'Playfair Display', Georgia, serif;   /* all headings */
--body:    'Lora', Georgia, serif;               /* body copy */
--ui:      'Jost', sans-serif;                   /* labels, nav, buttons, small caps */
```

Google Fonts import string:
```
https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Lora:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500;600&display=swap
```

### Typographic Rules
- Headings: Playfair Display, weight 400 or 500. Never bold (700) for display headings.
- Body: Lora, 0.9–0.95rem, line-height 1.8–1.85
- Labels / eyebrows / nav: Jost, 0.6–0.72rem, letter-spacing 0.18–0.32em, text-transform uppercase
- Gold is used for: labels/eyebrows, italic headline accents, case study numbers, link underlines on dark backgrounds
- Never use gold as a background color except for primary CTA buttons

### Spacing
- Section padding: 6rem 3rem (desktop)
- Feature sections (dark background): 7–8rem vertical padding
- Gap between grid items: 1–2px (creates thin ruled lines, not gaps)

---

## Hero — Ken Burns + Crossfade Gallery

The hero is a full-viewport gallery. Three images cycle with:
- 7 second hold per image
- 1.8 second crossfade between images
- Each image has its own Ken Burns motion (different per slide so they don't feel repetitive)
- Pure CSS — no JavaScript for the gallery

Slide 1 — Wardrobes: `images/projects/oyarifa/oyarifa-master-closed-1.jpg` — Ken Burns: slow zoom out from scale(1.08) to scale(1.0)
Slide 2 — Kitchens: `images/projects/spintex-kitchen/spintex-kitchen-hero.jpg` — Ken Burns: pan right + slight zoom
Slide 3 — Solid Wood: check `images/projects/sage-centre/` for a strong hero-worthy image. If none found, use `images/projects/french-embassy/afromosia-table-installed-1.jpg` — Ken Burns: zoom in from top-left

Timing formula: 26.4s cycle (8.8s per slide). Slide 2 animation-delay: 8.8s. Slide 3 animation-delay: 17.6s.

The nav sits over the hero. When the hero is in view, nav links and logo should be cream/light. When the user scrolls past the hero, the nav background becomes cream with slight blur and text becomes dark. Use IntersectionObserver for this toggle.

---

## Sections — What to Remove and Why

These sections exist on the current site and must be completely removed. Do not attempt to restyle them — they are structurally wrong for this design direction.

| Section | Reason for removal |
|---|---|
| "Why Neewoody" — 6 feature cards | Generic beyond recovery. "Made to Measure / Built to Last / Clear Communication" exists on 10,000 sites. The photos make this argument better than any card. |
| Stats row (200+ projects, 5+ years, 100% custom-built) | The Sage Centre 26-month case study is more credible than any stat. Stat rows read as filler. |
| Badge pills on hero ("Made-to-measure only · Based in Accra · Free consultations") | SaaS template artifact. Undermines the editorial tone. |
| "How It Works" numbered step cards | Generic. Every service business has this section. Can be replaced with a single short paragraph if needed. |
| SEO paragraph dump (bottom of homepage) | Wall of keyword text. No visitor reads it. Damages the tone of everything above. Can be replaced with a hidden semantic block if SEO preservation is needed. |
| Four-column footer | Simplified to two-column: brand/tagline left, nav links right. |

---

## Sections — What to Add or Restructure

### Featured Case Study (dark green, full-width, below hero)
The Sage Centre fitout is Neewoody's strongest proof point. It should be the second thing a visitor sees, not buried in a portfolio grid. Structure: image left (50%), text right (50%), stat strip below spanning full width.

Stat strip content: 26 months · 18 bunk beds · 100% Ghanaian teak · International client standards

### Services Grid (replaces the current service cards)
6 items in a 3×2 grid. Each item: number (01–06) in gold, heading in Playfair Display, 1–2 line description in Lora. Grid gap is 1px (shows as a thin ruled line). Top bar reveals on hover in gold. No icons.

### Maker's Statement
A single italic pullquote in large Playfair Display on a cream-dark background. Replaces "Why Neewoody". No heading, no attribution beyond "Neewoody Custom Woodwork · Accra". Content: *"Every piece is built for your exact space — not a showroom floor. That's the only brief we accept."*

### Work Grid (asymmetric)
3 projects. Grid: `3fr 2fr` columns, first card spans 2 rows. Images fill their cells. On hover: image darkens, project label slides up. Dark overlay gradient at bottom of each card.

### Testimonial (dark green, full-width)
Ben Schwartz's review, set large in italic Playfair Display. No star rating graphic. Name in Jost uppercase gold. Role/source in small muted text below.

### CTA Section
Two-column: large headline left ("Let's talk about your project" — italic "your project" in gold), contact options right. Two buttons only: WhatsApp (gold fill) and Request a Quote (outline). No third button.

### Footer
Two-column: brand + tagline left, nav links right (stacked, right-aligned). Single bottom rule with copyright. Dark green background, cream text.

---

## What to Preserve — Non-Negotiable

Every implementation must preserve these exactly:

1. **GA4 tracking tag** — `G-ZP77WR6BNH` — must remain in `<head>` on every page
2. **WhatsApp floating button** — the fixed-position WhatsApp CTA must remain functional
3. **All existing `href` links** — do not change paths to other pages
4. **All image paths** — do not rename, move, or alter any image file references
5. **Meta tags** — preserve all existing SEO meta tags, og tags, and canonical URLs
6. **Formspree contact form** — preserve the form action and all field names on contact.html
7. **Page titles** — preserve existing `<title>` tags

---

## Reference File

The file `neewoody-redesign-concept.html` in the project root contains the full visual mockup for the homepage redesign. When implementing index.html, treat this file as the primary design reference. Read it before writing any code.

---

## Execution Plan

Pages are implemented one at a time. Do not proceed to the next page until instructed.

| # | Cue | File | Status |
|---|---|---|---|
| 1 | Go index.html | index.html | **done** |
| 2 | Go nav-footer | All 13 pages — nav + footer only | **done** |
| 3 | Go wardrobes | wardrobes.html | **done** |
| 4 | Go kitchens | kitchens.html | **done** |
| 5 | Go beds | beds.html | **done** |
| 6 | Go dining | dining-living.html | **done** |
| 7 | Go tvunits | tv-units.html | **done** |
| 8 | Go shelving | shelving.html | **done** |
| 9 | Go solidwood | solid-wood.html | **done** |
| 10 | Go portfolio | portfolio.html | **done** |
| 11 | Go contact | contact.html | **done** |
| 12 | Go sage | projects/sage-centre.html | **done** |
| 13 | Go walker | projects/house-of-walker.html | **done** |
| 14 | Go jerksoul | projects/jerksoul.html | **done** |

---

## Per-Session Instruction

At the start of every session, read this brief in full. Then read the specific instruction set for the current page (filed as `REDESIGN-[PAGE].md` in the project root). Then and only then begin implementation.

If anything in the instruction set conflicts with this brief, the brief takes precedence. If you encounter something not covered by either document, apply the design philosophy above and document what you did and why.
