// Case study: Jerksoul rooftop restaurant, Accra (2022).
// Copy rewritten 2026-11-14 in the homepage voice; every fact is from the old page
// (docs/legacy/projects/jerksoul.html). SEO title/description are unchanged.
// Layout: src/layouts/ProductPage.astro via src/pages/projects/[slug].astro.
const P = 'images/projects/jerksoul/';
export default {
  slug: 'projects-jerksoul',
  path: '/projects/jerksoul',
  cms: false,
  seo: {
    title: 'Jerksoul Restaurant — Rooftop Dining Fit-out | Neewoody Custom Woodwork',
    description: 'Custom pine dining tables with branded glass tops, upholstered cube stools, and a centrepiece bar counter built by Neewoody for Jerksoul Restaurant in Accra, 2022.',
    ogTitle: 'Jerksoul Restaurant — Neewoody Custom Woodwork',
    ogDescription: 'Full commercial dining fit-out for Jerksoul Restaurant — 15+ branded dining sets, bar counter, and cube stools built for the rooftop in Accra.',
  },
  waText: 'Hi Neewoody, I saw the Jerksoul project and would like to discuss a commercial fit-out.',
  hero: {
    lines: ['Jerksoul rooftop restaurant.'],
    text: 'The furniture for a rooftop restaurant: pine dining tables with branded Issacher glass tops, upholstered cube stools, and a bar counter clad in reclaimed-style timber.',
    facts: [['Client', 'Jerksoul Restaurant'], ['Where', 'Accra, Ghana'], ['Year', '2022'], ['Type', 'Commercial, hospitality']],
    img: P + 'jerksoul-day-1.jpg',
    alt: 'Jerksoul Restaurant rooftop with dining tables, cube stools and bar counter built by Neewoody',
    workLabel: false,
  },
  sections: [
    { kind: 'feature', dark: false, img: P + 'jerksoul-day-2.jpg', alt: 'Jerksoul rooftop, bar counter and dining area built by Neewoody',
      title: 'A bare rooftop to furnish',
      paras: [
        'Jerksoul came to us with a bare rooftop and a clear brief: make it a restaurant people remember. The furniture had to suit a busy service, stand up to daily commercial use, and look like Jerksoul.',
        'We made all the custom furniture: dining tables and upholstered cube stools for the whole dining area, and a bar counter as the centrepiece. Everything was built in our workshop and installed on site, to work as one set.',
      ] },
    { kind: 'details', title: 'What we built',
      text: 'We designed and built every piece of custom furniture on the rooftop, down to the branded glass tops.',
      items: [
        ['More than 15 branded dining sets', 'Pine dining tables with custom Issacher branded glass tops, each paired with upholstered cube stools. Built for commercial use.'],
        ['Bar counter', 'A large bar counter with reclaimed-style timber panel cladding and a solid wood top. It is the centrepiece of the rooftop and built for the pace of a busy service.'],
        ['Upholstered cube stools', 'Custom stools for the dining sets and the bar counter, padded for comfort and made to take commercial wear.'],
      ] },
    { kind: 'videos', title: 'The build on video',
      text: 'Two clips and the full build playlist: the bar counter going up, the finished space, and the whole sequence from start to finish.',
      items: [
        { embed: 'https://www.youtube.com/embed/UiJU_FxjISM', title: 'Jerksoul bar counter construction', text: 'The bar counter being built on site, with its timber cladding and solid wood top.' },
        { embed: 'https://www.youtube.com/embed/SPWB-wfQDbc', title: 'Jerksoul completed dining space', text: 'The finished dining space: tables, stools and bar counter installed and ready for service.' },
        { embed: 'https://www.youtube.com/embed/videoseries?list=PLPO1KREhuGMN1LvZIuJXgIItVYhL9q1Ia', title: 'Jerksoul full build playlist', text: 'The full playlist, from workshop prep to the finished installation.' },
      ] },
    { kind: 'projects', title: 'The finished space',
      text: ['The rooftop with the dining tables, cube stools and bar counter installed and ready for service.'],
      photos: [
        { img: P + 'jerksoul-day-1.jpg', alt: 'Jerksoul Restaurant rooftop in daylight, dining sets with branded glass tables', cap: '' },
        { img: P + 'jerksoul-day-2.jpg', alt: 'Jerksoul Restaurant bar counter with reclaimed-style timber cladding and solid wood top', cap: '' },
      ] },
    { kind: 'related', title: 'More of this kind of work', text: '', links: [['/projects/house-of-walker', 'House of Walker'], ['/projects/sage-centre', 'Sage Centre'], ['/portfolio', 'Full portfolio']] },
  ],
  footer: {
    title: 'Need a commercial fit-out in Accra?',
    text: 'Restaurants, hospitality spaces, offices and shops: if your project needs custom carpentry in quantity, get in touch.',
    quoteLink: true,
  },
};
