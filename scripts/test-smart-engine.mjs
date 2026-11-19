// Parity test: the Smart Generator engine (js/smart/engine.js) against the wardrobe cutlist
// (cutlist.html calculate()) on a range of wardrobes. Every part name, size and count must match,
// and the engine's placed parts must not clash. Run: node scripts/test-smart-engine.mjs
// (starts a local web server on port 8766; needs Playwright, which this repo's environment has).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');  // CommonJS lookup finds a globally installed Playwright
import { spawn } from 'node:child_process';

const PORT = 8766;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const CASES = [
  ['default wardrobe', {}],
  ['2 units, 4 sections', { units: 2, secs: 4 }],
  ['drawers with no door (outside fronts)', { noDoor3: true }],
  ['nail-on back, flush toe kick', { back: 'nailon', tk: 'flush' }],
  ['separate plinth under box units', { sf: 'separate', units: 2, secs: 4 }],
  ['sliding doors', { sliding: true }],
  ['extended end panels + pelmet', { end: 'extended', pelmet: true }],
  ['5 sections, 1 unit, own clearances', { secs: 5, clear: { 'i-overlay': 3, 'i-dgap': 3, 'i-rungap': 26, 'i-groove': 10, 'i-chfgap': 2 } }],
  ['3 units, 6 sections, manual mid-rails', { units: 3, secs: 6, mid: 5 }],
];

const b = await chromium.launch();
const p = await b.newPage();
let failed = 0;
for (const [label, c] of CASES) {
  await p.goto(`http://localhost:${PORT}/cutlist.html`);
  await p.addScriptTag({ url: `/js/smart/engine.js?t=${Date.now()}` });
  const res = await p.evaluate((c) => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; };
    if (c.secs) { set('i-secs', c.secs); onSecsChange(); }
    if (c.units) set('mod-units', c.units);
    if (c.back) set('i-back', c.back);
    if (c.tk) set('tk-style', c.tk);
    if (c.sf) set('tk-mode', c.sf);
    if (c.mid) { set('tk-mr-mode', 'manual'); set('tk-mr-qty', c.mid); }
    if (c.end) setSP(c.end);
    if (c.pelmet) document.getElementById('pel-en').checked = true;
    if (c.clear) for (const k in c.clear) set(k, c.clear[k]);
    sync();
    if (c.noDoor3) S.secs[2].door.on = false;
    if (c.sliding) S.secs.forEach(s => { s.door.type = 'sliding'; });
    const r = calculate();
    const spec = {
      w: S.w, h: S.h, d: S.d, units: S.modUnits,
      sections: S.secs.map(s => ({ zones: s.zones, door: s.door })),
      shop: {
        thick: S.thick, backType: S.backType, backThick: S.backThick, groove: S.groove,
        shelfClear: S.clear, edgeClear: S.overlay, doorGap: S.dgap, topGap: S.topgap, botGap: S.botgap, doorThick: S.doorThick,
        runGap: S.runGap, chest: { set: S.chSet, gap: S.chGap, over: S.chOver, fgap: S.chFGap },
        sub: { mode: S.sfMode, h: S.tkH, style: S.tkStyle, setback: S.tkSetback, thick: S.tkThick, gap: S.tkGap, midRails: S.tkMrMode === 'manual' ? S.tkMrQty : 'auto' },
        end: { type: S.spType, left: S.spL > 0, right: S.spR > 0, thick: S.spThick, extendH: S.spEH, extendD: S.spED, scribe: S.spSW },
        pelmet: { on: S.pelEn, h: S.pelH }
      }
    };
    const e = SmartEngine.build(spec);
    const key = (n, a, b) => n + ' | ' + Math.min(a, b) + 'x' + Math.max(a, b);
    const A = {}, B = {};
    r.parts.forEach(x => { const k = key(x.name, x.w, x.d); A[k] = (A[k] || 0) + x.qty; });
    e.parts.forEach(x => { const k = key(x.name, x.a, x.b); B[k] = (B[k] || 0) + x.qty; });
    const diff = [];
    new Set([...Object.keys(A), ...Object.keys(B)]).forEach(k => { if ((A[k] || 0) !== (B[k] || 0)) diff.push(k + '  cutlist ' + (A[k] || 0) + ', engine ' + (B[k] || 0)); });
    return { parts: Object.values(A).reduce((a, b) => a + b, 0), diff, clashes: e.clashes, warnings: e.warnings };
  }, c);
  const ok = !res.diff.length && !res.clashes.length;
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + ': ' + res.parts + ' parts' + (res.warnings.length ? ' (warnings: ' + res.warnings.join('; ') + ')' : ''));
  res.diff.forEach(d => console.log('   differs: ' + d));
  res.clashes.forEach(d => console.log('   clash: ' + d));
}
await b.close();
server.kill();
console.log(failed ? `\n${failed} of ${CASES.length} failed` : `\nAll ${CASES.length} wardrobes match the cutlist, no clashes`);
process.exit(failed ? 1 : 0);
