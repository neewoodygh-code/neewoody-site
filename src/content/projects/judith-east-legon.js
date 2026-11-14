// Case study: a dining room in solid Hyedua, East Legon (2022).
// Copy rewritten 2026-11-14 in the homepage voice; every fact is from the old page
// (docs/legacy/projects/judith-east-legon.html). SEO title/description are unchanged.
// The client's first name is left out of the visible copy (standing rule: no client
// names unless the owner approves); it remains only in the page address.
// Layout: src/layouts/ProductPage.astro via src/pages/projects/[slug].astro.
const P = 'images/projects/judith-east-legon/';
const ph = (file, alt) => ({ img: P + file, alt, cap: '' });
export default {
  slug: 'projects-judith-east-legon',
  path: '/projects/judith-east-legon',
  cms: false,
  seo: {
    title: 'Full Hyedua Dining Room Commission, East Legon | Neewoody Custom Woodwork',
    description: 'Complete dining room commission in solid Hyedua for a private client in East Legon, Accra — dining table, six upholstered chairs, and a console unit with full-extension drawers. All three pieces built to a unified brief by Neewoody Custom Woodwork, 2022.',
    ogTitle: 'Full Hyedua Dining Room Commission, East Legon — Neewoody Custom Woodwork',
    ogDescription: 'Dining table, six upholstered chairs, and a console unit — all in solid Hyedua, built to one brief for an East Legon home in Accra.',
  },
  waText: 'Hi Neewoody, I saw the East Legon dining room and would like to discuss something similar.',
  hero: {
    lines: ['A dining room in solid Hyedua, East Legon.'],
    text: 'A dining table, six upholstered chairs and a console unit, all in the same timber and the same dark finish.',
    facts: [['Where', 'East Legon, Accra'], ['Year', '2022'], ['Timber', 'Hyedua (Guibourtia ehie)']],
    img: P + 'judith-set-installed-2.jpg',
    alt: 'Hyedua dining table and chairs installed in an East Legon home, built by Neewoody Custom Woodwork',
    workLabel: false,
  },
  sections: [
    { kind: 'feature', dark: false, img: P + 'judith-set-staged.jpg', alt: 'Hyedua dining set staged before delivery: table, chairs and console unit in a matched espresso finish',
      title: 'Three pieces in one timber',
      paras: [
        'The client had a clear brief for her East Legon dining room: solid hardwood throughout, every piece matching, and a rich dark finish. She commissioned a large dining table, six matching upholstered chairs and a console unit, designed as a set.',
        'We chose Hyedua, a dense West African hardwood with a deep, warm tone that takes a dark espresso finish very well. We built all three pieces in our workshop, finished them in the same stain, then delivered and installed them in her home.',
      ] },
    { kind: 'details', title: 'What we built',
      text: 'Three pieces to the same brief, in the same timber, so the room reads as a whole.',
      items: [
        ['Large dining table', 'A solid Hyedua table in an espresso finish, sized to seat the whole household, with solid timber legs that match the chairs.'],
        ['Six upholstered dining chairs', 'Six matching chairs with solid Hyedua frames and linen upholstered panels, built for daily use.'],
        ['Console unit', 'A console with full-extension drawers and waterfall-edge sides, in the same Hyedua and espresso finish as the table and chairs.'],
      ] },
    { kind: 'projects', title: 'From the workshop to the room',
      text: ['The commission at each stage, from the build in our workshop to the installed dining room.'],
      photos: [
        ph('judith-table-workshop.jpg', 'Hyedua dining table in the Neewoody workshop during the build'),
        ph('judith-set-staged.jpg', 'The full Hyedua dining set staged before delivery: table, chairs and console'),
        ph('judith-set-installed-1.jpg', 'Hyedua dining set installed in the East Legon home'),
        ph('judith-set-installed-3.jpg', 'Hyedua dining table and six upholstered chairs, the full set installed'),
        ph('judith-chairs-detail.jpg', 'Hyedua dining chairs with cream linen upholstered seats and backs'),
        ph('judith-table-dusk.jpg', 'Hyedua dining table, full length'),
      ] },
    { kind: 'intro', title: 'Hyedua (Guibourtia ehie)',
      paras: [
        "Hyedua, also sold as Ovangkol, is a dense, heavy West African hardwood with a deep, warm tone and a tight, even grain. It is harvested across Ghana and Côte d'Ivoire and has long been used for good furniture and joinery, because it is stable and takes a dark stain evenly.",
        'In an espresso finish it has a depth of colour you do not get from veneers or laminates. We designed these pieces to show the timber.',
      ] },
    { kind: 'related', title: 'More of this kind of work', text: '', links: [['/dining-living', 'Dining and living'], ['/solid-wood', 'Solid wood'], ['/projects/french-embassy', 'Afromosia table, Ridge'], ['/portfolio', 'Full portfolio']] },
  ],
  footer: {
    title: 'Want a dining room made as a set?',
    text: 'One piece or a full room: we work in solid West African hardwood and build everything to one brief.',
    quoteLink: true,
  },
};
