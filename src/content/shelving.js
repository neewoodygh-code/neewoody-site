// Everything the Shelving page says, in page order. Layout: src/layouts/ProductPage.astro.
const P = 'images/projects/';
export default {
  slug: 'shelving',
  path: '/shelving',
  seo: {
    title: 'Custom Shelving & Storage in Accra | Neewoody Custom Woodwork',
    description: 'Custom built-in shelving, bookshelves, home office storage, and display units made to measure in Accra, Ghana. Neewoody Custom Woodwork.',
    ogTitle: 'Custom Shelving & Storage in Accra | Neewoody Custom Woodwork',
    ogDescription: 'Built-in shelving, bookshelves, and storage units made to measure in Accra. Every centimetre used.',
  },
  waText: "Hi Neewoody, I'm interested in custom shelving and would like to discuss.",
  hero: {
    lines: ['Built into your walls,', 'every centimetre of them.'],
    text: 'Alcoves, home offices, full walls and pantries, built to the exact size of your wall and what you need to store.',
    img: P + 'sage-centre/sage-gallery-8.jpg',
    alt: 'Free-standing teak bookcase and cabinet dividing a room at the Sage Centre, Wli',
    caption: 'Teak bookcase, Sage Centre',
    workLink: '#work',
    facts: [['Build time', 'Usually 1 to 3 weeks'], ['Installation', 'Included anywhere in Accra'], ['Workshop', 'Amugi Avenue, Accra']],
  },
  sections: [
    { kind: 'intro', title: 'Shelving that belongs to the room.', paras: [
      "A freestanding shelf never quite reaches the ceiling. A flat-pack unit comes in fixed widths that don't match your wall. Alcoves always have that awkward gap at the sides or the top. Built-in shelving solves all of it: wall to wall, floor to ceiling, every centimetre used.",
      "We build shelving for home offices, living rooms, studies, children's rooms and corridors, anywhere you need organised storage that looks like it was always meant to be there. Open, closed, or a mix.",
      "Every shelving job starts with your wall dimensions and what you're storing. From there we design the layout: shelf depths and spacing sized for what you actually own, not a generic pitch.",
    ], link: ['/contact', 'Get a free quote'] },
    { kind: 'gallery', id: 'work', title: 'Shelving we have built', items: [
      { badge: 'Light strips built into the shelves', place: 'Lit shelving, Bortianor', img: P + 'bortianor/bortianor-living-tv-wall.jpg', alt: 'Lit walnut-grain shelving either side of a TV wall, Bortianor', href: '/projects/bortianor' },
      { badge: 'Cupboards and open shelves', place: 'Pantry, Bortianor', img: P + 'bortianor/bortianor-pantry.jpg', alt: 'Pantry with tall cupboards and open corner shelves, Bortianor', href: '/projects/bortianor' },
      { badge: 'Solid teak, Wli', place: 'Library shelving, Sage Centre', img: P + 'sage-centre/sage-gallery-1.jpg', alt: 'Teak library shelving behind the sofas at the Sage Centre, Wli', href: '/projects/sage-centre' },
      { badge: 'Shelf spacing sized for shoes', place: 'Shoe rack', img: P + 'shoe-racks/shoe-rack-1.jpg', alt: 'Tall open shoe rack with evenly spaced shelves', href: '/portfolio' },
    ] },
    { kind: 'types', id: 'types', title: 'Every kind of built-in storage.', text: 'Alcoves, home offices, full walls, corridors: we build around your walls, your storage requirements, and your brief.', items: [
      ['Alcove shelving', 'Chimney breast alcoves, recessed walls, and awkward nooks: we fill them exactly. Open shelves above, cupboards below, or a full open bookcase from floor to ceiling. No gap at the sides, no visible end panels.'],
      ['Home office shelving', 'Integrated shelving around a desk, above a workstation, or across a full wall, with filing, books and equipment all in reach and organised. We design around your monitor height, your equipment, and how you work.'],
      ['Display and feature shelving', "Open floating shelves for décor, books and plants, with shelf depths and spacing sized for what you're displaying, not a standard pitch. In the right materials to complement your interior."],
      ['Utility and laundry storage', "Shelving for store rooms, pantries, laundry areas, and garages, built to handle the weight of what you're storing, properly supported, properly finished. Not just particleboard and dowels."],
    ] },
    { kind: 'details', title: 'What goes into every shelving job.', items: [
      ['Fixed shelf depths', "Sized for what you're storing, not a catalogue size."],
      ['Cable management', 'Wire routing for AV and office setups built in from the start.'],
      ['Adjustable configurations', 'Shelves that move as your needs change.'],
      ['Finish to match', 'Painted, wrapped, veneered to match your existing interior.'],
      ['Hidden fixings', 'No visible brackets, no exposed screws.'],
      ['Any height', 'From a single floating shelf to a full 2.7m floor-to-ceiling unit.'],
    ] },
    { kind: 'statement', text: "A built-in shelf doesn't fight the room. It becomes part of it: wall to wall, floor to ceiling, every centimetre deliberate." },
    { kind: 'faq', title: 'Common questions about custom shelving.', items: [
      ['How long does it take to build custom shelving?', "Most shelving jobs take 1 to 3 weeks from confirmation to installation. Full-wall or multi-room commissions may take 3 to 5 weeks. We'll give you a realistic timeline when we confirm your brief."],
      ['Can you match my existing shelving or furniture finish?', "Yes. Bring photos and dimensions. We'll match the colour, finish, and hardware as closely as possible so the new piece integrates with what you already have."],
      ['Do you build shelving with integrated lighting?', "Yes. We can route LED strip lighting into recessed channels along the underside of shelves. Specify this when you enquire and we'll include it in the design and quote."],
      ['What materials do you use?', 'Primarily moisture-resistant MDF or moisture-resistant board with PVC or paint finishes for most interiors. For pantries and laundry areas we specify boards rated for the environment. We can also work in solid wood if the brief calls for it.'],
      ['Do you handle wall fixings and installation?', 'Yes. Delivery and installation is included for all jobs in Accra. We fix directly to the wall, make good around the edges, and remove all packaging and offcuts.'],
    ] },
    { kind: 'review', quote: 'I’ve been really impressed with their craftsmanship and professionalism. For more than 5 years, everything Neewoody has produced for me is still looking and functioning like new, from my office to my home.', who: 'Ngminvielu Kuuire', role: 'repeat client, Accra. Google review, November 2024' },
  ],
  footer: {
    title: "Let's talk about<br />your walls.",
    text: "Tell us the wall dimensions, what you need to store, and the finish you want. We'll come back with a layout and a clear price. No obligation, site visits free within Accra.",
    quoteLink: true,
  },
};
