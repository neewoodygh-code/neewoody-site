// Case study: House of Walker, One Airport Square (December 2020).
// Copy rewritten 2026-11-14 in the homepage voice; every fact is from the old page
// (docs/legacy/projects/house-of-walker.html). SEO title/description are unchanged.
// how-gallery-6.jpg is the same file as how-gallery-2.jpg, so it is left out of the set.
// Layout: src/layouts/ProductPage.astro via src/pages/projects/[slug].astro.
const P = 'images/projects/house-of-walker/';
const ph = (file, alt) => ({ img: P + file, alt, cap: '' });
export default {
  slug: 'projects-house-of-walker',
  path: '/projects/house-of-walker',
  cms: false,
  seo: {
    title: 'House of Walker Accra — Johnnie Walker 200 Years | Neewoody Custom Woodwork',
    description: "Neewoody built the branded carpentry installation for Johnnie Walker's 200-year celebration at One Airport Square, Accra. MDF cladding, curved platform, and integrated LED lighting — delivered to brand specification under event timelines.",
    ogTitle: 'House of Walker Accra — Neewoody Custom Woodwork',
    ogDescription: "Branded structural carpentry for Johnnie Walker's 200-year celebration. Black and gold cladding, LED lighting, event timelines. One Airport Square, Accra, December 2020.",
  },
  waText: 'Hi Neewoody, I saw the House of Walker project and would like to discuss a commercial brief.',
  hero: {
    lines: ['House of Walker, Accra.'],
    text: "The carpentry for Johnnie Walker's 200-year celebration: a curved platform reclad in MDF, black and gold to the brand's specification, with LED lighting built into the base.",
    facts: [['Brand', 'Johnnie Walker, 200 years'], ['Venue', 'XO Lounge, One Airport Square, Accra'], ['Year', 'December 2020']],
    img: P + 'how-hero.jpg',
    alt: 'House of Walker Accra, branded seating installation by Neewoody at One Airport Square',
    workLabel: false,
  },
  sections: [
    { kind: 'projects', title: 'The seating was too deep',
      text: [
        'Johnnie Walker chose XO Lounge at One Airport Square as the venue for House of Walker, the activation marking 200 years of the brand. The space had the right scale and the right address, but it had a structural problem.',
        "The venue's concrete seating, a large curved platform and a central cubby seating area, was too deep for the brand's planned displays. They would have sat wrong, and the activation could not go ahead until that was fixed.",
        "We were brought in to fix it and hand over a finished installation to Johnnie Walker's specification: black and gold, lit from within, and built fast.",
      ],
      photos: [
        ph('how-brief.jpg', 'Finished House of Walker branded bench seating at One Airport Square'),
        ph('how-build.jpg', 'Neewoody team building the curved platform for House of Walker during construction'),
      ] },
    { kind: 'intro', title: 'Working with what was already there',
      paras: [
        'The concrete was fixed, heavy and the wrong depth, so the job was to build onto it.',
        "We filled in the central cubby seating completely to make flush display surfaces, which the wider fit-out team then tiled. The curved platform was the part everyone saw. We modified the structure, clad it in MDF in the brand's black and gold, and ran channels for LED strip lighting along the full length of the base.",
        "Every dimension, colour and material was set by Johnnie Walker's brand guidelines, and the deadline was fixed by the event.",
      ] },
    { kind: 'projects', title: 'During the build and after',
      text: ['The same space before and after. We built or reworked every surface you can see in the finished installation.'],
      photos: [
        ph('how-during-1.jpg', 'House of Walker Accra seating installation during construction by Neewoody'),
        ph('how-finished-1.jpg', 'Finished House of Walker Accra seating installation, branded and dressed for the event'),
        ph('how-during-2.jpg', 'LED channel and cladding work during House of Walker construction'),
        ph('how-finished-2.jpg', 'Finished House of Walker Accra curved platform, wide view of the full installation'),
      ] },
    { kind: 'projects', title: 'The finished installation',
      text: ['Photographed during the House of Walker Accra activation in December 2020. The curved platform and seating became the main photo spot for thousands of guests through the month.'],
      photos: [
        ph('how-gallery-1.jpg', 'House of Walker Accra, the full curved platform at night'),
        ph('how-gallery-2.jpg', 'Guest photographed at the House of Walker Accra seating installation'),
        ph('how-gallery-3.jpg', 'Guest seated on the House of Walker bench, showing the cushions'),
        ph('how-gallery-4.jpg', 'House of Walker Accra, full platform view with Keep Walking floor graphics'),
        ph('how-gallery-5.jpg', 'Wide angle of the House of Walker Accra curved platform'),
        ph('how-gallery-7.jpg', 'Close view of the finished bench, House of Walker Accra, Estd 1820'),
      ] },
    { kind: 'details', title: 'What we built',
      text: "We modified, built and finished each of these to Johnnie Walker's brand specification.",
      items: [
        ['Infill of the central cubby seating', 'The concrete cubby seating was too deep for the planned displays. We filled in the whole structure to make flush display surfaces, ready for finishing.'],
        ['The curved platform', 'We modified the existing curved concrete platform and reclad all of it in MDF. It is the branded installation you see in the event photos.'],
        ['Cladding and finishing', "All MDF surfaces are finished in Johnnie Walker's black and gold. Every dimension and colour follows the brand guidelines."],
        ['LED lighting', 'Channels for LED strip lighting run around the full perimeter of the platform base. The continuous yellow glow in the finished photos is part of the structure we built.'],
        ['Display shelving', 'A full-wall shelving unit in black and gold, built to hold merchandise and bottles for the heritage and flavour academy sections.'],
        ['Event turnaround', 'Delivered on the event production schedule. The activation could not open until the carpentry was complete and finished correctly.'],
      ] },
    { kind: 'feature', dark: false, img: P + 'how-context.jpg', alt: 'House of Walker Accra curved platform, side angle showing its full scale',
      title: 'Commercial work, on a fixed date',
      paras: [
        'House of Walker is a different kind of job from our work in homes. The brand guidelines were exact and the opening date could not move.',
        "We delivered on time. The curved installation became the centrepiece of one of Accra's most talked-about brand activations of 2020, photographed by thousands of guests through December.",
        'If you are a developer, an event producer or a commercial client who needs carpentry built to a specification and finished by a set date, this is the project to look at.',
      ] },
    { kind: 'related', title: 'More of this kind of work', text: '', links: [['/projects/sage-centre', 'Sage Centre'], ['/projects/jerksoul', 'Jerksoul rooftop restaurant'], ['/portfolio', 'Full portfolio']] },
  ],
  footer: {
    title: 'Have a commercial or event brief?',
    text: 'If you need carpentry built to a specification and finished on schedule, for a home, a business or an event, get in touch.',
    quoteLink: true,
  },
};
