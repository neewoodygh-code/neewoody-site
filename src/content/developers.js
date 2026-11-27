// Everything the For developers page says, in page order. Layout: src/layouts/ProductPage.astro.
// Built 2026-11-27 (owner: "yes build it") after the first apartment-complex enquiry. The rates come
// from src/prices.js, the same numbers as the schedule of rates we send developers.
const P = 'images/projects/';
const ph = (path, alt, cap = '') => ({ img: P + path, alt, cap });
const vid = (path, alt) => ({ img: P + path + '.jpg', video: P + path + '.mp4', alt });
export default {
  slug: 'developers',
  path: '/developers',
  seo: {
    title: 'Fitted Joinery for Apartments & Developers in Accra | Neewoody',
    description: 'Wardrobes, kitchens, TV walls, dressers and doors for apartment blocks and new builds in Accra. Rates per metre, one apartment first, made in our own workshop.',
    ogTitle: 'Fitted joinery for apartments and developers in Accra | Neewoody Custom Woodwork',
    ogDescription: 'Rates per metre for wardrobes, kitchens, TV walls, dressers and doors. We fit the first apartment, then the rest in batches.',
  },
  waText: "Hi Neewoody, I'm a developer and would like your schedule of rates for an apartment project.",
  hero: {
    lines: ['Fitted joinery for', 'apartments and new builds.'],
    text: 'Wardrobes, kitchens, TV walls, dressers and doors for apartment blocks and new houses, priced per metre before the walls are up and made in our own workshop in Accra.',
    img: P + 'bortianor/bortianor-kitchen-tall.jpg',
    alt: 'Tall walnut-grain kitchen units with built-in ovens beside a double-door fridge, Bortianor',
    caption: 'Kitchen, Bortianor',
    workLink: '#rates',
    workLabel: 'See the rates',
    facts: [['We fit', 'Wardrobes, kitchens, TV walls, dressers, doors'], ['Pricing', 'Per metre or per item'], ['Workshop', 'Amugi Avenue, Accra']],
  },
  sections: [
    { kind: 'intro', title: 'Priced before the walls are up.', paras: [
      'On a building that is still going up there is nothing to measure yet, so we work from rates: a price per metre of wardrobe, kitchen or TV wall, and a price for each door or tall unit. You can budget the whole building from the list of what each apartment needs.',
      'We start with one apartment. Once its walls are plastered we measure it, draw every unit, and give you one confirmed price for that apartment before anything is cut. When you have seen it finished and approved it, we go on to the rest in batches.',
      'Send us the list for one apartment and we will send back our full schedule of rates, with times, materials and terms.',
    ], link: ['/contact', 'Ask for the schedule of rates'] },
    { kind: 'prices', id: 'rates', title: 'Our rates.', text: 'Standard finish in laminate. A Premium level, with more finishing time and closer supervision, is in the full schedule.', items: ['wardrobe', 'tv', 'dresser', 'kitchenBase', 'kitchenWall', 'kitchenTall', 'doorHardwood', 'doorFlush'] },
    { kind: 'projects', id: 'bortianor', tone: 'dark', label: 'Bortianor, Accra, 2026', title: 'A whole new house, fitted room by room',
      text: ['Kitchen, pantry, two TV walls, a bar, a glass-front wardrobe and a bathroom vanity for one new house, fitted between September and October 2026. One look runs through every room, which is what a building of apartments needs too.'],
      photos: [
        ph('bortianor/bortianor-living-wide.jpg', 'Living room with the TV wall and the bar', 'Living room'),
        ph('bortianor/bortianor-kitchen-wide.jpg', 'Kitchen with tall units, base units and an island', 'Kitchen'),
        ph('bortianor/bortianor-master-wardrobe.jpg', 'Full-height wardrobe with black-framed glass doors', 'Wardrobe'),
      ],
      extra: [
        vid('site-work/site-work-video-boards', 'Video: boards cut and banded by machine, delivered to site for assembly'),
        vid('bortianor/bortianor-video-kitchen', 'Video: the finished kitchen, Bortianor'),
        vid('bortianor/bortianor-video-kitchen-drawers', 'Video: the deep island drawers, Bortianor'),
      ],
      link: ['/projects/bortianor', 'See the whole house'] },
    { kind: 'types', id: 'how', title: 'How a project runs.', text: 'About five weeks for the first apartment from signed drawings and deposit. We promise seven, so a late delivery doesn’t move your handover.', items: [
      ['Measure and draw', 'We measure the first apartment once its walls are plastered, draw every unit and give you one price for it.'],
      ['Cut by machine', 'Boards are cut and edge-banded by machine to our cutting lists, so every apartment gets the same parts.'],
      ['Built in our workshop', 'Wardrobes, kitchens, TV walls and dressers are assembled side by side in our workshop on Amugi Avenue.'],
      ['Fitted by our own crew', 'Our own team installs, adjusts and hands over each apartment. We don’t subcontract the fitting.'],
      ['The rest in batches', 'After you approve the first apartment, the drawings are done and we fit the others floor by floor.'],
    ] },
    { kind: 'details', title: 'What we build with.', items: [
      ['Board', '18 mm moisture-resistant laminated board or plywood in the colour you choose. Never chipboard.'],
      ['Edges', 'Every visible edge banded by machine, so no raw board shows and moisture stays out.'],
      ['Hardware', 'Concealed hinges, drawer runners sized to each drawer, hanging rails, bar or aluminium profile handles.'],
      ['Worktops', '2 cm quartz with a doubled front edge that reads 4 cm, priced when you choose the slab.'],
      ['Doors', 'Solid hardwood or flush doors, supplied with frames and architraves and fitted by us.'],
      ['Hardwood', 'Afromosia, Hyedua, Iroko, Teak and Khaya for dining tables and loose furniture.'],
    ] },
    { kind: 'gallery', id: 'work', title: 'More work for whole buildings and homes', items: [
      { badge: 'Laminate, 2026', place: 'Tall chest of drawers', img: P + 'tall-chest/tall-chest-2.jpg', alt: 'Tall laminate chest of drawers with the drawers pulled out', href: '/beds#work' },
      { badge: 'Corporate office', place: 'Office kitchen, Labone', img: P + 'labone-office-kitchen/labone-office-kitchen-2.jpg', alt: 'Black wall cabinets, tall unit and sink run, Labone office kitchen', href: '/kitchens#work' },
      { badge: 'Pantry', place: 'Tall pantry cupboards, Bortianor', img: P + 'bortianor/bortianor-pantry.jpg', alt: 'Pantry with tall dark woodgrain cupboards and open shelves', href: '/projects/bortianor' },
      { badge: 'TV wall', place: 'Bedroom TV wall, Bortianor', img: P + 'bortianor/bortianor-master-tv-wall.jpg', alt: 'TV wall in stone-look panels with a walnut-grain cabinet', href: '/tv-units' },
      { badge: 'Solid Hyedua', place: 'Live-edge table, Roman Ridge', img: P + 'roman-ridge-live-edge/live-edge-table-room.jpg', alt: 'Live-edge Hyedua dining table, Roman Ridge, Accra', href: '/dining-living#work' },
      { badge: 'Solid teak', place: 'A whole retreat, Sage Centre', img: P + 'sage-centre/sage-gallery-8.jpg', alt: 'Teak bookcase at the Sage Centre, Wli', href: '/projects/sage-centre' },
    ] },
    { kind: 'faq', title: 'Questions developers ask.', items: [
      ['Can you price a building before it is finished?', 'Yes. We price from our rates per metre and per item, using the list of what each apartment needs. Once the first apartment can be measured, we confirm its price from the real sizes before anything is cut.'],
      ['What do the rates include?', 'Making, delivery in Accra and installation by our own crew. Worktops, locks and handles, sinks, appliances, plumbing, electrical work and painting are not included.'],
      ['How long does an apartment take?', 'About five weeks for the first apartment from signed drawings and deposit, and we plan for seven. Later apartments go faster because the drawings and cutting lists are done.'],
      ['How do payments work on a large project?', 'In stages: a 70% deposit on each apartment or batch to buy materials and start, and 30% when that batch is installed. Rates are held for 60 days.'],
      ['Can you also make dining tables and loose furniture?', 'Yes. We make dining tables, beds, chairs and chests in solid hardwood, priced per piece once the design and timber are chosen.'],
      ['Do you work outside Accra?', 'Yes. We have fitted out a whole retreat in the Volta Region. Delivery outside Accra is priced separately.'],
    ] },
  ],
  footer: {
    title: 'Fitting out a building?',
    text: 'Send us the list of what one apartment needs. We’ll send back our schedule of rates, with times, materials and terms.',
    quoteLink: true,
    waText: "Hi Neewoody, I'm a developer and would like your schedule of rates for an apartment project.",
  },
};
