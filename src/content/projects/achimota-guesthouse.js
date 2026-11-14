// Case study: one guesthouse room in Achimota, Accra (2026).
// Copy rewritten 2026-11-14 in the homepage voice; every fact is from the old page
// (docs/legacy/projects/achimota-guesthouse.html). SEO title/description are unchanged.
// Layout: src/layouts/ProductPage.astro via src/pages/projects/[slug].astro.
const P = 'images/projects/achimota-guesthouse/';
const ph = (file, alt) => ({ img: P + file, alt, cap: '' });
export default {
  slug: 'projects-achimota-guesthouse',
  path: '/projects/achimota-guesthouse',
  cms: false,
  seo: {
    title: 'Achimota Guesthouse Room Conversion — Accra | Neewoody Custom Woodwork',
    description: 'Full single-room conversion to Airbnb standard for a guesthouse in Achimota, Accra (2026) — queen bed and nightstand, built-in wardrobe and floating vanity, glass display cabinets, TV unit with marble feature wall, slat wall paneling, and hallway wainscotting. Built by Neewoody Custom Woodwork.',
    ogTitle: 'Achimota Guesthouse Room Conversion — Accra | Neewoody Custom Woodwork',
    ogDescription: 'A full single-room upgrade to Airbnb standard — bed, wardrobe, vanity, glass cabinets, TV unit with marble wall, wall paneling, and hallway wainscotting in Achimota, Accra.',
  },
  waText: 'Hi Neewoody, I saw the Achimota guesthouse project and would like to discuss a commission.',
  hero: {
    lines: ['A guesthouse room in Achimota, refitted.'],
    text: 'One room brought up to Airbnb standard: bed, wardrobe, vanity, glass display cabinets, a TV unit on a marble feature wall, wall panelling and hallway wainscotting.',
    facts: [['Client', 'Guesthouse owner'], ['Where', 'Achimota, Accra'], ['Year', '2026'], ['Finish', 'White cabinetry, walnut accents, marble, matte black and brass']],
    img: P + 'achimota-hero-wide.jpg',
    alt: 'Guesthouse room in Achimota, Accra, with built-in wardrobe, floating vanity and lit glass display cabinet under a wood-slat ceiling, built by Neewoody Custom Woodwork',
    workLabel: false,
  },
  sections: [
    { kind: 'feature', dark: false, img: P + 'achimota-bed-wardrobe-wide.jpg', alt: 'Queen bed with built-in wardrobe and vanity, Achimota guesthouse room',
      title: 'One room, one brief',
      paras: [
        'A guesthouse owner in Achimota asked us to take one room from standard guesthouse level up to Airbnb standard. That meant the furniture, the joinery and the wall treatments, designed together as one room.',
        'The brief covered work that is usually split into separate jobs: a queen bed and nightstand, a built-in wardrobe with a floating vanity desk, lit glass display cabinets, a TV unit against a marble feature wall, slat wall panelling, and wainscotting carried into the adjoining hallway.',
      ] },
    { kind: 'feature', dark: false, img: P + 'achimota-bed-nightstand.jpg', alt: 'Solid wood queen bed frame with panelled headboard and matching nightstand, Achimota guesthouse',
      title: 'Queen bed and nightstand',
      paras: [
        "A solid wood queen bed frame in a warm walnut-toned finish, with a plain panelled headboard and a matching nightstand. It sits under the room's stained wood-slat ceiling.",
        'It is simple, sturdy and sized for the room, and it is the first piece a guest sees.',
      ] },
    { kind: 'feature', dark: true, img: P + 'achimota-wardrobe-vanity-wide.jpg', alt: 'Built-in wardrobe with floating vanity desk and glass display cabinet, Achimota guesthouse',
      title: 'Built-in wardrobe, vanity and glass cabinets',
      paras: [
        'A full wall of joinery: a built-in wardrobe in white with brushed handles, a floating walnut vanity desk with a mirror and open cubbies, overhead storage, and a tall black-framed glass display cabinet lit warm from inside.',
        "Recessed strip lighting runs under the overhead units and inside the glass cabinet, so the storage is also the room's feature wall.",
      ] },
    { kind: 'feature', dark: false, img: P + 'achimota-tv-marble-wall-1.jpg', alt: 'TV unit with marble feature wall and lit glass display cabinet, Achimota guesthouse',
      title: 'TV unit and marble feature wall',
      paras: [
        'A floating media bench in white with a walnut top, set against a grey marble-effect feature wall, with a second lit glass display cabinet beside it. Drawers below keep equipment and cabling out of sight.',
        'The marble panel, the warm wood and the black-framed glass match the wardrobe wall opposite, so both sides of the room use the same materials.',
      ] },
    { kind: 'feature', dark: false, img: P + 'achimota-ac-paneling-1.jpg', alt: 'Walnut-toned slat wall panelling around the air-conditioning unit, Achimota guesthouse',
      title: 'Wall panelling and hallway wainscotting',
      paras: [
        'Vertical walnut-toned slat panelling wraps the corner around the air-conditioning unit and warms up a plain wall. Outside the room, classic white wainscotting runs along the adjoining hallway.',
        'We count panelling and wall moulding as part of the joinery, because we build and finish them in the same fit-out.',
      ] },
    { kind: 'projects', tone: 'sand', title: 'The whole room',
      text: ['Every part of the room: bed, wardrobe, vanity, glass cabinets, TV and marble wall, panelling, and the hallway wainscotting.'],
      photos: [
        ph('achimota-hero-wide.jpg', 'Room overview: wardrobe wall, glass cabinet and bed under the wood-slat ceiling'),
        ph('achimota-bed-nightstand.jpg', 'Queen bed frame with panelled headboard and nightstand'),
        ph('achimota-bed-wardrobe-wide.jpg', 'Bed with the built-in wardrobe and vanity wall beyond'),
        ph('achimota-bed-detail.jpg', 'Bed frame and room, second angle'),
        ph('achimota-wardrobe-vanity-wide.jpg', 'Built-in wardrobe, floating vanity and glass display cabinet'),
        ph('achimota-glass-cabinet-angle.jpg', 'Lit black-framed glass display cabinet, angled view'),
        ph('achimota-glass-cabinet-marble.jpg', 'Open lit glass display cabinet against the marble feature wall'),
        ph('achimota-tv-marble-wall-1.jpg', 'TV unit and marble feature wall'),
        ph('achimota-tv-marble-wall-2.jpg', 'Media bench and marble wall, second angle'),
        ph('achimota-ac-paneling-1.jpg', 'Slat wall panelling around the AC unit'),
        ph('achimota-ac-paneling-2.jpg', 'Slat wall panelling, close view'),
        ph('achimota-hallway-wainscot.jpg', 'White wainscotting in the adjoining hallway'),
      ] },
    { kind: 'related', title: 'More of this kind of work', text: '', links: [['/wardrobes', 'Wardrobes'], ['/beds', 'Beds'], ['/tv-units', 'TV units'], ['/projects/bortianor', 'A whole house, Bortianor'], ['/portfolio', 'Full portfolio']] },
  ],
  footer: {
    title: 'Planning a room or a whole property?',
    text: "One piece or a full home: get in touch and we'll talk through what's possible. We do cabinetry, hardwood furniture and custom joinery.",
    quoteLink: true,
  },
};
