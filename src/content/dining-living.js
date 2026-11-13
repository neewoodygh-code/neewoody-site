// Everything the Dining and living page says, in page order. Layout: src/layouts/ProductPage.astro.
const P = 'images/projects/';
export default {
  slug: 'dining-living',
  path: '/dining-living',
  seo: {
    title: 'Dining Tables & Living Room Furniture in Accra | Neewoody',
    description: 'Custom dining tables, coffee tables, sofas, and living room furniture built in solid wood in Accra, Ghana. Made to measure by Neewoody Custom Woodwork.',
    ogTitle: 'Dining & Living Room Furniture in Accra | Neewoody Custom Woodwork',
    ogDescription: 'Custom dining tables, coffee tables, and solid wood seating made for Accra homes. Request a free quote.',
  },
  waText: "Hi Neewoody, I'm interested in custom dining or living room furniture.",
  hero: {
    lines: ['Furniture built for', 'the way you live.'],
    text: 'Dining tables, chairs, consoles and living-room pieces, built to the size of your room and finished in West African hardwood.',
    img: P + 'french-embassy/afromosia-table-installed-6.jpg',
    alt: 'Afromosia live-edge dining table with solid timber U-frame legs, Ridge, Accra',
    caption: 'Afromosia live-edge table, Ridge',
    workLink: '#work',
    facts: [['Timbers', 'Afromosia, Hyedua and other West African hardwoods'], ['Where', 'Dining rooms across Accra and the Volta Region'], ['Workshop', 'Amugi Avenue, Accra']],
  },
  sections: [
    { kind: 'intro', title: 'No two rooms are the same. Neither are our pieces.', paras: [
      'A dining table from a furniture shop comes in three sizes. Your dining room has one size. A display unit off the shelf is never quite the right width, always a bit too short or too tall, never exactly the finish you wanted.',
      'We build dining and living room furniture to your exact dimensions, seating requirements, and finish: the table that seats eight comfortably in your specific room, the console that fills that exact wall.',
      "Every piece is designed around your brief, built in West African hardwood, and finished to a standard that holds up for years. We've completed dining commissions across Accra and into the Volta Region.",
    ], link: ['/contact', 'Get a free quote'] },
    { kind: 'feature', dark: true, img: P + 'judith-east-legon/judith-set-installed-2.jpg', alt: 'Hyedua dining table, six upholstered chairs and a console, East Legon',
      label: 'East Legon, Accra, 2022', title: 'A whole dining room in Hyedua',
      lede: 'Dining table, six upholstered chairs, and a waterfall-edge console. One brief, one timber, one finish.',
      text: 'Three pieces built to one brief in solid Hyedua: a large-format dining table, six chairs with linen fabric panels, and a console unit with full-extension drawers. Rich espresso finish throughout. Private residence, East Legon.',
      link: ['/projects/judith-east-legon', 'Read the case study'] },
    { kind: 'gallery', id: 'work', title: 'More dining work', items: [
      { badge: 'With a built-in banquette', place: 'Dining set, Golf Hills Estate', img: P + 'golf-hills-estate/golf-hills-installed-6.jpg', alt: 'X-frame pine dining set and built-in banquette, Golf Hills Estate, Accra', href: '/projects/golf-hills-estate' },
      { badge: 'Solid Afromosia', place: 'Live-edge table, Ridge', img: P + 'french-embassy/afromosia-table-outdoor-1.jpg', alt: 'Afromosia live-edge dining table outdoors, Ridge, Accra', href: '/projects/french-embassy' },
      { badge: 'In the workshop', place: 'Hyedua dining table, East Legon', img: P + 'judith-east-legon/judith-table-workshop.jpg', alt: 'Hyedua dining table in the Neewoody workshop', href: '/projects/judith-east-legon' },
    ] },
    { kind: 'types', title: 'Built in genuine West African hardwood.', text: 'We work in timber that grows here, chosen for their durability, grain character, and how they age in the Accra climate. The wood is part of the brief.', items: [
      ['Afromosia', 'A premium West African hardwood with natural oil content, fine grain, and a warm honey tone. Highly durable, stable in humid climates, and an exceptional finish timber. Often specified for statement dining tables, live-edge pieces, and outdoor-facing installations.', P + 'french-embassy/afromosia-table-outdoor-2.jpg', 'Afromosia live-edge table in its natural honey tone'],
      ['Hyedua', 'A dense, heavy hardwood with a naturally deep, warm tone and tight even grain. Takes a dark stain evenly and richly, which suits dining sets, console pieces, and full room commissions where a unified, premium finish across multiple pieces is the brief.', P + 'judith-east-legon/judith-table-dusk.jpg', 'Hyedua dining table and chairs in a deep warm tone'],
    ] },
    { kind: 'review', quote: 'I’ve been really impressed with their craftsmanship and professionalism. For more than 5 years, everything Neewoody has produced for me is still looking and functioning like new, from my office to my home.', who: 'Ngminvielu Kuuire', role: 'repeat client, Accra. Google review, November 2024' },
  ],
  footer: {
    title: "Let's talk about<br />your dining room.",
    text: "Even a rough idea is enough to start: dimensions, number of seats, timber preference, or a photo of something you like. We'll take it from there.",
    quoteLink: true,
  },
};
