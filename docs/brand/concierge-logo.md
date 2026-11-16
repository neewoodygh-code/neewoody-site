# Carpentry Concierge logo: files and rules

The mark is the owner's "growth rings" design (chosen 2026-11-11): a navy tile with two open rings, gold outside and cream inside, reading as a log's growth rings and as "CC". It replaced the placeholder CC circle and the commissioned illustrated emblem (`images/concierge-logo.svg`, kept in the repo, not used).

## Files (all published, all in git)

| File | What | Use |
|---|---|---|
| `images/concierge/cc-mark.svg` | **The master.** Vector mark, 328 bytes. | Every header, favicons, anything on screen. |
| `images/concierge/cc-mark-512.png` | Mark, 512 px, transparent corners. | App icons, social profile picture, documents that need a picture file. |
| `images/concierge/cc-icon-64.png`, `cc-icon-180.png` | Small mark files. | Browser tab icon, phone home-screen icon. |
| `images/concierge/cc-lockup-on-navy.png` | Neewoody logo, thin line, mark + "Carpentry Concierge", light on navy. 1376 x 288. | Print, slides, social banners on dark. |
| `images/concierge/cc-lockup-on-bone.png` | The same on bone, dark logo. 1376 x 288. | Print, letterheads, light backgrounds. |
| `images/brand/logo-light.png`, `logo-dark.png` | The Neewoody NW logo for dark and light backgrounds. | Paired with the mark in the lockup. |
| `scripts/brand/lockup-render.html` + `render-logo.js` | Source for the two lockup PNGs and the 512 mark. | Re-render after any change (needs `puppeteer-core` outside the repo and Chrome). |

## Colours in the mark
Navy `#1f2f58` tile, gold `#c8922a` outer ring, cream `#f0e8d0` inner ring. These are the mark's own colours as designed and are deliberately left as they are; the site around it uses brass `#c49455` and bone `#efe9df`, which sit close enough not to clash. Changing the ring colours is the owner's call.

## The lockup (owner, 2026-11-16)
"Treat the Concierge logo like the Neewoody logo: same size, with the Carpentry Concierge wording, like NW with Neewoody, with a thin line between them."
- Order: NW logo, thin vertical line (1 px, 35% of the text colour), Concierge mark, then "CARPENTRY / CONCIERGE" in Manrope 600, tracked capitals, two lines.
- The mark sits at about three quarters of the NW logo's height; the wording takes the same height as the mark.
- In every header: the Astro site header (`src/components/Nav.astro`, styles `.nav-lockup` in `src/styles/global.css`) and every plain page (`.lockup` in `css/app.css`): tools, member area, admin, job pricing, invoices, Academy.
- Links: the NW logo goes to the Neewoody homepage. The Concierge part goes to `/concierge/` on public pages and to the members area on member pages.
- Inside Concierge, the section name follows after a second thin line on wider screens (Members area, Admin, Job pricing, Invoices, Academy, Cutlist, Cut sheet). The logos never disappear.
- Very narrow phones (350 px or less) show the mark without the wording.

## Do not
- Do not stretch, recolour or outline the mark, or put it on a busy photo without its navy tile.
- Do not use the mark smaller than 24 px.
- Do not set the wording in another font or in mixed case.
