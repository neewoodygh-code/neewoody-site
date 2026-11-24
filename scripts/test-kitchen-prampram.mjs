// First real kitchen through the Smart Generator engine: the Prampram kitchen (2026-11, owner's job).
// Builds the main U run (back wall + right wall) and the wall cabinets from the agreed spec, then reports
// clashes, warnings, the cut list, hardware and the board count (the Cut Sheet's own packing, via price.js).
// Wall cabinets: 3 shelves (4 spaces), the lowest fixed and the top 2 adjustable (Amina, 2026-11-21).
// Not yet in it (owner: their own logic later): tall unit A, the folding-door pantry K, the island, the laundry.
// Run: node scripts/test-kitchen-prampram.mjs          (add --json to print the spec + parts as JSON)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['js/smart/engine.js', 'js/smart/price.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.window.SmartEngine, P = ctx.window.WardrobePrice;

const OFF = 12;   // back wall 4010, run 3986: 24 mm slack, half behind each L corner
export const SPEC = {
  type: 'kitchen', worktop: 900, room: { w: 4010 },
  runs: [
    { name: 'Back wall, base', wall: 'back', at: OFF, depth: 580, kind: 'base', units: [
      { type: 'cornerL', name: 'B', w: 800, r: 1000, returnDepth: 580, side: 'left', carousel: true, note: 'corner carousel behind bi-fold doors; check the carousel size against the 800 leg' },
      { type: 'panel', name: 'B|C' },
      { type: 'base', name: 'C', w: 600, drawers: [140, 320, 320] },              // small drawer on top (Amina)
      { type: 'base', name: 'D', w: 600, drawers: [380, 380], hob: { d: 490 } },
      { type: 'sink', name: 'E', w: 1150, doors: 2, sinkCut: { w: 720, d: 420 } },
      { type: 'panel', name: 'E|F' },
      { type: 'cornerL', name: 'F', w: 800, r: 800, returnDepth: 380, side: 'right', shelves: 1, note: 'shelf behind a folding door, hinged on the right (Amina)' },
    ] },
    { name: 'Right wall, base', wall: 'right', at: 800, off: OFF, depth: 380, kind: 'base', units: [
      { type: 'base', name: 'G', w: 400, drawers: [220, 220, 320] },
      { type: 'base', name: 'H', w: 600, drawers: [380, 380] },
      { type: 'base', name: 'I', w: 600, drawers: [220, 220, 320] },
      { type: 'base', name: 'J', w: 600, drawers: [140, 320, 320] },              // small drawer on top (Amina)
    ] },
    { name: 'Back wall, wall cabinets', wall: 'back', at: OFF, depth: 300, kind: 'wall', bottom: 1500, height: 1200, ceilingFiller: 100, units: [
      { type: 'cornerL', name: 'B upper', w: 800, r: 1000, returnDepth: 300, side: 'left', shelves: 3 },
      { type: 'filler', name: 'over B|C', w: 18 },
      { type: 'wall', name: 'C upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'D upper', w: 600, doors: 1, shelves: 3, fixed: 1, note: 'hood cabinet: adjusted on site for the Midea 60L03-B' },
      { type: 'wall', name: 'E upper 1', w: 575, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'E upper 2', w: 575, doors: 1, shelves: 3, fixed: 1 },
      { type: 'filler', name: 'over E|F', w: 18 },
      { type: 'wall', name: 'F upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'panel', name: 'F upper end', h: 1320 },                             // owner's sheet: up past the cabinet to the ceiling, scribed
    ] },
    { name: 'Right wall, wall cabinets', wall: 'right', at: 782, off: OFF, depth: 280, kind: 'wall', bottom: 1335, height: 1360, ceilingFiller: 100, units: [
      { type: 'panel', name: 'G upper end', h: 1490 },                             // owner's sheet: the open end by the empty corner, to the ceiling
      { type: 'wall', name: 'G upper', w: 400, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'H upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'I upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'J upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
    ] },
  ],
};

// The units given their own logic on 2026-11-23 (owner): tall unit A (oven + microwave, two stacked boxes, 270),
// pantry K (drawers, cubbies, shelves behind one full-height fold), the island (legs, 10 cm band, B1/B2 back to back
// with Accra sliding doors). Run with --full. A's insides follow the appliances (owner 2026-11-23): oven 595 high in a
// 600 niche; the freestanding microwave (275 high, 374 deep) in a 400 space; the island where Amina drew it: top 1200 x 2000
// from x 1500 and z 1600, base 800 deep centred under it, 300 overhang at the window end.
// Trained on the owner's own cut sheets (2026-11-24): tall units on a built-in plinth with a panel on both sides
// (scribe allowance A 45, K 75), A's lower box 1500 (microwave space 528) as on his sheet, Temax undermount runners,
// and the island on a frame: drawer unit 764 facing the end, B1/B2 391 deep back to back on one 18 mm back.
export const FULL = { ...SPEC, tallTop: 2700, kshop: { runner: 'under' }, runs: [
  ...SPEC.runs.map(r => r.name !== 'Right wall, base' ? r : { ...r, units: [...r.units,
    { type: 'panel', name: 'J|K', h: 2700, extraD: 75 },
    { type: 'tall', name: 'K', w: 800, fold: true, zones: [
      { k: 'drawer', h: 300, n: 1 }, { k: 'drawer', h: 300, n: 2 }, { k: 'drawer', h: 200, n: 3 },
      { k: 'cubby', h: 300, rows: 2, cols: 3 }, { k: 'split' }, { k: 'shelves', h: 0, n: 4 }] },
    { type: 'panel', name: 'K end', h: 2700, extraD: 75 }] }),
  { name: 'Left wall, tall', wall: 'left', at: 1012, off: OFF, depth: 580, kind: 'base', units: [
    { type: 'panel', name: 'B|A', h: 2700, extraD: 45 },
    { type: 'tall', name: 'A', w: 600, note: 'lower box 1500 on the plinth as on the owner\'s sheet: the microwave space is 528 high', zones: [
      { k: 'drawer', h: 300 }, { k: 'oven', h: 600 }, { k: 'micro', h: 528 }, { k: 'split' }, { k: 'shelves', h: 0, n: 2 }] },
    { type: 'panel', name: 'A end', h: 2700, extraD: 45 }] },
  { name: 'Island', kind: 'island', frame: true, x: 1700, z: 1600, axis: 'z', depth: 800, top: 1100, topW: 1200, ohStart: 0, ohEnd: 300, units: [
    { type: 'base', name: 'Island A', w: 764, drawers: [150, 200, 250, 300] },
    { type: 'slide', name: 'B1', name2: 'B2', w: 1080, shelves: 1 }] },
] };

// The laundry (owner's brief 2026-11-18): 127 wide, 180 long. Width side: floating quartz on a welded frame over
// the washer, wall cabinets 2 x 575 with 60 fillers. Length side: an 80 cabinet, 350 deep, doors stopping under the
// lip (874). Run with --laundry.
export const LAUNDRY = { type: 'kitchen', worktop: 950, room: { w: 1270 }, runs: [
  { name: 'Laundry, worktop frame', wall: 'back', at: 0, depth: 350, kind: 'base', carcTop: 874, units: [{ type: 'gap', w: 1270 }],
    items: ['Welded 1.5" angle frame, Hammerite black (laundry worktop)', 'Moisture-resistant board 18 mm under the slab (cut to the frame)'] },
  { name: 'Laundry, length side', wall: 'left', at: 1000, depth: 350, kind: 'base', carcTop: 874, units: [
    { type: 'base', name: 'Laundry cabinet', w: 800, doors: 2, frontTop: 874 }] },
  { name: 'Laundry, wall cabinets', wall: 'back', at: 0, depth: 300, kind: 'wall', bottom: 1500, height: 1200, ceilingFiller: 100, units: [
    { type: 'filler', name: 'left filler', w: 60 }, { type: 'wall', name: 'L1', w: 575, doors: 1, shelves: 3, fixed: 1 },
    { type: 'wall', name: 'L2', w: 575, doors: 1, shelves: 3, fixed: 1 }, { type: 'filler', name: 'right filler', w: 60 }] },
] };

const r = E.build(process.argv.includes('--full') ? FULL : process.argv.includes('--laundry') ? LAUNDRY : SPEC);
const rows = r.parts.map(p => ({ name: p.name, tag: p.tag, L: Math.max(p.a, p.b), W: Math.min(p.a, p.b), qty: p.qty, eb: E.edges(p) }));
if (process.argv.includes('--json')) { console.log(JSON.stringify({ spec: SPEC, parts: rows, hardware: r.hardware, warnings: r.warnings, clashes: r.clashes }, null, 1)); process.exit(0); }

const pieces = rows.reduce((a, p) => a + p.qty, 0);
console.log(`Parts: ${rows.length} rows, ${pieces} pieces · Clashes: ${r.clashes.length ? r.clashes.join('; ') : 'none'}`);
console.log('\nWarnings:'); r.warnings.forEach(w => console.log('  - ' + w));
console.log('\nHardware:'); Object.entries(r.hardware).forEach(([k, v]) => console.log(`  ${v} × ${k}`));
const tooLong = rows.filter(p => p.L > 2440 || p.W > 1220);
if (tooLong.length) console.log('\nOver the sheet: ' + tooLong.map(p => `${p.name} ${p.L}×${p.W}`).join('; '));
const m = P.materials(rows.filter(p => !/back panel/i.test(p.name)));
console.log(`\n18 mm boards (Cut Sheet packing, backs excluded): ${m.boards ?? JSON.stringify(m).slice(0, 200)}`);
console.log('\nCut list:');
for (const p of rows) console.log(`  ${String(p.qty).padStart(3)} × ${String(p.L).padStart(4)} × ${String(p.W).padStart(4)}  ${p.name}`);
process.exit(r.clashes.length ? 1 : 0);
