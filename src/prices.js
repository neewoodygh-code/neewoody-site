// The "from" prices shown on the website. Change a number here and every page (price section and the
// matching FAQ answer) follows at the next build. These are the Standard rates the owner approved on
// 2026-11-27 for the developer schedule of rates (see CLAUDE.md): laminate, made, delivered in Accra and
// installed. Update UPDATED whenever a price changes.
export const UPDATED = 'November 2026';

export const PRICES = {
  wardrobe: { name: 'Built-in wardrobe', from: 9000, unit: 'per metre of width', note: 'Up to 2.4 m high and 60 cm deep, hinged doors, hanging, shelves and drawers inside.' },
  kitchenBase: { name: 'Kitchen base units', from: 5800, unit: 'per metre', note: 'On adjustable legs, with doors and drawers. Worktop priced separately.' },
  kitchenWall: { name: 'Kitchen wall units', from: 4000, unit: 'per metre', note: 'Doors and shelves.' },
  kitchenTall: { name: 'Tall larder or fridge housing', from: 5250, unit: 'each', note: '60 cm wide, full height.' },
  tv: { name: 'TV wall unit', from: 6750, unit: 'per metre of width', note: 'Floating cabinet with drawers, a panel behind the TV with a hidden cable channel, shelves.' },
};

export const ghs = (n) => 'GH₵' + n.toLocaleString('en-GH');
