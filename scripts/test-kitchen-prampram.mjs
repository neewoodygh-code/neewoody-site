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
    ] },
    { name: 'Right wall, wall cabinets', wall: 'right', at: 800, off: OFF, depth: 280, kind: 'wall', bottom: 1335, height: 1365, ceilingFiller: 100, units: [
      { type: 'wall', name: 'G upper', w: 400, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'H upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'I upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
      { type: 'wall', name: 'J upper', w: 600, doors: 1, shelves: 3, fixed: 1 },
    ] },
  ],
};

const r = E.build(SPEC);
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
