/* Materials price for a wardrobe's parts (owner's prices, 2026-11-20). Used by the homeowner planner
 * (src/pages/wardrobe-planner.astro), the cutlist (cutlist.html) and anything else that has a parts list.
 * "The more you build the more price shows": every part, edge, screw and handle is counted from the parts.
 *
 * WardrobePrice.materials(parts, opt) with parts = [{name, tag, L, W, qty, eb:{t,r,b,l}}] (L = the longer size,
 * along the grain; eb = edge banding, l/r the long edges) and opt = {doorHandle: 0|30|60|100, drawerHandle: 0|30|60|100}.
 * opt also takes railRuns (hanging rail lengths, mm) and slidingWidth (mm of sliding doors).
 * Returns {lines:[{item, qty, cost, note, group, name, unit}] (group/name/unit feed Job Pricing, js/pricing-handoff.js), total, unpriced:[], boards, bandM}.
 * Screw counts are an estimate from the joints (see SCREWS) with 10% spare, rounded up to whole boxes.
 * Plain script; sets window.WardrobePrice. */
(function (root) {
  'use strict';
  var P = {
    board: 500, boardL: 2440, boardW: 1220, kerf: 4,   // 18 mm laminate board 2440 x 1220
    bandRoll: 200, bandApply: 500, rollM: 100,          // edge band: roll of 100 m, application per roll
    screwBox: 60, screwsPerBox: 100,                    // 2" assembly screws and 1¼" external-panel screws, same price
    handle: { 30: 30, 60: 50, 100: 75 },                // handle length in cm: price
    hingePair: 15,                                      // a pair of hinges
    runner: { 12: 35, 14: 45, 16: 55 },                 // a pair of runners: 12", 14", 16" to 22"
    rail: 120, railM: 3000,                             // hanging rail, 3 m length, comes with 2 pairs of brackets
    back: 200,                                          // thin back panel board 2440 x 1220
    track: 750, trackM: 3048                            // sliding door track set, 10 ft
  };

  // Guillotine shelf packing, first-fit decreasing, grain fixed (length along the board): the same method as
  // the Cut Sheet's packBoards(), so the board count here matches what the Cut Sheet says.
  function packCount(items, bl, bw) {
    var BL = bl || P.boardL, BW = bw || P.boardW, k = P.kerf, boards = [], over = 0;
    // a part longer (or wider) than a board has to be made from joined pieces: count those pieces so the price
    // still grows with the wardrobe, and report how many parts need joining
    var list = [];
    items.forEach(function (it) {
      if (it.L <= BL && it.W <= BW) { list.push(it); return; }
      over++;
      var nl = Math.ceil(it.L / BL), nw = Math.ceil(it.W / BW);
      for (var i = 0; i < nl * nw; i++) list.push({ L: Math.min(BL, Math.ceil(it.L / nl)), W: Math.min(BW, Math.ceil(it.W / nw)) });
    });
    list = list.sort(function (x, y) { return Math.max(y.L, y.W) - Math.max(x.L, x.W); });
    list.forEach(function (it) {
      for (var i = 0; i < boards.length; i++) if (fit(boards[i], it)) return;
      var nb = { shelves: [], usedY: 0 }; boards.push(nb); fit(nb, it);
    });
    function fit(bd, it) {
      for (var s = 0; s < bd.shelves.length; s++) { var sh = bd.shelves[s]; if (it.W <= sh.h && sh.x + it.L + k <= BL) { sh.x += it.L + k; return true; } }
      var add = (bd.usedY ? k : 0) + it.W;
      if (bd.usedY + add <= BW) { bd.usedY += add; bd.shelves.push({ h: it.W, x: it.L }); return true; }
      return false;
    }
    return { count: boards.length, oversize: over };
  }

  function is(p, re) { return re.test(p.name.toLowerCase()); }
  // Screws per piece, by joint: [2-inch assembly screws, 1¼-inch screws for fixing outside panels from inside]
  function screwsFor(p) {
    if (is(p, /back panel/)) return [0, 0];
    if (is(p, /side panel/)) return [4, 0];                                  // to the subframe from inside
    if (is(p, /top panel|bottom panel|divider|^shelf/)) return [8, 0];       // 4 each end, screwed through the sides
    if (is(p, /mid-rail/)) return [4, 0];
    if (is(p, /front rail|back rail/)) return [4, 0];
    if (is(p, /toe kick/)) return [0, 6];                                    // or glued
    if (is(p, /chest .*top\/bottom/)) return [8, 0];
    if (is(p, /chest .*side/)) return [4, 0];
    if (is(p, /filler strip/)) return [4, 0];
    if (is(p, /face strip/)) return [0, 4];
    if (is(p, /drawer box front\/back/)) return [3, 0];                     // the sides screw into front and back
    if (is(p, /drawer box side/)) return [3, 0];
    if (is(p, /drawer base/)) return [8, 0];
    if (is(p, /drawer front|false front/)) return [0, 4];                    // through the box front from inside
    if (is(p, /end panel/)) return [0, 10];
    if (is(p, /pelmet/)) return [0, 6];
    return [0, 0];
  }

  function materials(parts, opt) {
    opt = opt || {};
    var lines = [], unpriced = [], boardItems = [], backItems = [], sides = [], bandMM = 0, s2 = 0, s1 = 0, doors = 0, fronts = 0;
    parts.forEach(function (p) {
      var q = p.qty || 1, L = Math.max(p.L, p.W), W = Math.min(p.L, p.W), e = p.eb || {};
      if (is(p, /back panel/)) { for (var j = 0; j < q; j++) backItems.push({ L: L, W: W }); return; }  // thin back board, its own sheets
      for (var i = 0; i < q; i++) boardItems.push({ L: L, W: W });
      bandMM += (((e.l ? 1 : 0) + (e.r ? 1 : 0)) * L + ((e.t ? 1 : 0) + (e.b ? 1 : 0)) * W) * q;
      var sc = screwsFor(p); s2 += sc[0] * q; s1 += sc[1] * q;
      if (p.tag === 'door') doors += q;
      if (is(p, /drawer front|false front/)) fronts += q;
      if (is(p, /drawer box side/)) for (var k = 0; k < q; k++) sides.push(L);
    });
    var BL = opt.board ? opt.board[0] : P.boardL, BW = opt.board ? opt.board[1] : P.boardW;   // opt.board: [length, width] (kitchen board-size setting)
    var pk = packCount(boardItems, BL, BW);
    lines.push({ group: 'Boards', name: 'Laminate board ' + BL + ' × ' + BW, unit: P.board, item: pk.count + ' laminate board' + (pk.count === 1 ? '' : 's') + ', ' + BL + ' × ' + BW, qty: pk.count, cost: pk.count * P.board, note: 'GH₵' + P.board + ' a board' + (pk.oversize ? '; ' + pk.oversize + ' part' + (pk.oversize > 1 ? 's are' : ' is') + ' longer than a board and must be joined (or split the wardrobe into more carcasses)' : '') });
    var bandM = Math.ceil(bandMM / 1000), rolls = Math.ceil(bandM / P.rollM);
    if (rolls) {
      lines.push({ group: 'Edge band', name: 'Edge band, 100 m roll', unit: P.bandRoll, item: 'Edge band (' + bandM + ' m)', qty: rolls, cost: rolls * P.bandRoll, note: rolls + ' roll' + (rolls > 1 ? 's' : '') + ' of ' + P.rollM + ' m' });
      lines.push({ group: 'Edge banding application', name: 'Edge banding application, per roll', unit: P.bandApply, item: 'Edge banding application', qty: rolls, cost: rolls * P.bandApply, note: 'GH₵' + P.bandApply + ' a roll' });
    }
    var b2 = Math.ceil(s2 * 1.1 / P.screwsPerBox), b1 = Math.ceil(s1 * 1.1 / P.screwsPerBox);
    if (b2) lines.push({ group: 'Fixtures', name: '2" screws, box of 100', unit: P.screwBox, item: '2" screws, assembly', qty: b2, cost: b2 * P.screwBox, note: 'about ' + s2 + ' screws, boxes of ' + P.screwsPerBox });
    if (b1) lines.push({ group: 'Fixtures', name: '1¼" screws, box of 100', unit: P.screwBox, item: '1¼" screws, outside panels', qty: b1, cost: b1 * P.screwBox, note: 'about ' + s1 + ' screws, boxes of ' + P.screwsPerBox });
    var dh = P.handle[opt.doorHandle], fh = P.handle[opt.drawerHandle == null ? 30 : opt.drawerHandle];
    if (doors && dh) lines.push({ group: 'Fixtures', name: 'Door handle, ' + opt.doorHandle + ' cm', unit: dh, item: 'Door handles, ' + opt.doorHandle + ' cm', qty: doors, cost: doors * dh, note: 'GH₵' + dh + ' each' });
    if (fronts && fh) lines.push({ group: 'Fixtures', name: 'Drawer handle, ' + (opt.drawerHandle == null ? 30 : opt.drawerHandle) + ' cm', unit: fh, item: 'Drawer handles, ' + (opt.drawerHandle == null ? 30 : opt.drawerHandle) + ' cm', qty: fronts, cost: fronts * fh, note: 'GH₵' + fh + ' each' });
    // hardware (owner's prices 2026-11-20)
    var hinged = parts.filter(function (p) { return p.tag === 'door' && !is(p, /sliding/); });
    var hinges = hinged.reduce(function (n, p) { var h = Math.max(p.L, p.W); return n + (p.qty || 1) * (h > 1500 ? 4 : h > 900 ? 3 : 2); }, 0);
    if (hinges) { var hp = Math.ceil(hinges / 2); lines.push({ group: 'Fixtures', name: 'Hinges, pair', unit: P.hingePair, item: 'Hinges', qty: hp, cost: hp * P.hingePair, note: hinges + ' hinges (2 to 4 a door by height), GH₵' + P.hingePair + ' a pair' }); }
    // runners: one pair per drawer, length from the drawer box side (the longest stocked size that fits)
    var rn = {};
    for (var si = 0; si < sides.length; si += 2) {   // two sides make one drawer, one pair of runners
      var inch = Math.floor(sides[si] / 25.4), size = inch >= 16 ? 16 : inch >= 14 ? 14 : 12; rn[size] = (rn[size] || 0) + 1; }
    Object.keys(rn).forEach(function (sz) {
      var label = sz === '16' ? '16" to 22"' : sz + '"';
      lines.push({ group: 'Fixtures', name: 'Drawer runners ' + label + ', pair', unit: P.runner[sz], item: 'Drawer runners, ' + label, qty: rn[sz], cost: rn[sz] * P.runner[sz], note: rn[sz] + ' pair' + (rn[sz] > 1 ? 's' : '') + ', GH₵' + P.runner[sz] + ' a pair' });
    });
    // hanging rails: each rail cut from 3 m lengths; each length brings 2 pairs of brackets (one pair per rail)
    var runs = (opt.railRuns || []).filter(function (x) { return x > 0; }).sort(function (a, b) { return b - a; }), bins = [];
    runs.forEach(function (len) { for (var b = 0; b < bins.length; b++) if (bins[b] + len <= P.railM) { bins[b] += len; return; } bins.push(len); });
    var railLen = Math.max(bins.length, Math.ceil(runs.length / 2));
    if (railLen) lines.push({ group: 'Fixtures', name: 'Hanging rail, 3 m with brackets', unit: P.rail, item: 'Hanging rail, 3 m with brackets', qty: railLen, cost: railLen * P.rail, note: runs.length + ' rail' + (runs.length > 1 ? 's' : '') + ' cut from ' + railLen + ' length' + (railLen > 1 ? 's' : '') + ', GH₵' + P.rail + ' each' });
    if (backItems.length) { var bk = packCount(backItems).count; lines.push({ group: 'Back panels', name: 'Back panel board 2440 × 1220', unit: P.back, item: 'Back panel board, 2440 × 1220', qty: bk, cost: bk * P.back, note: bk + ' sheet' + (bk > 1 ? 's' : '') + ', GH₵' + P.back + ' a sheet' }); }
    if (opt.slidingWidth > 0) { var ts = Math.ceil(opt.slidingWidth / P.trackM); lines.push({ group: 'Fixtures', name: 'Sliding door track set, 10 ft', unit: P.track, item: 'Sliding door track, 10 ft set', qty: ts, cost: ts * P.track, note: ts + ' set' + (ts > 1 ? 's' : '') + ' for ' + Math.round(opt.slidingWidth) + ' mm, GH₵' + P.track + ' a set' }); }
    var total = lines.reduce(function (t, l) { return t + l.cost; }, 0);
    return { lines: lines, total: total, unpriced: unpriced, boards: pk.count, oversize: pk.oversize, bandM: bandM };
  }

  // "We make and install it" price range: the wardrobe estimator's formula (moved here 2026-11-20 so the
  // estimator page and the planner share it). Base prices are Neewoody's cost model at the Basic Build tier.
  var EST = {
    BASE: { small: 12000, medium: 15500, large: 23000, xlarge: 34000 }, SPREAD: 0.12, H: 2400, D: 600,
    TYPE: { hinged: 1.00, sliding: 1.15, open: 0.82 }, DOORS: { 2: 1.00, 3: 1.00, 4: 1.00, 5: 1.05, 6: 1.10 },
    INTERIOR: { basic: 0.90, standard: 1.00, premium: 1.20 }, FINISH: { laminate: 1.00, painted: 1.10, veneer: 1.20, gloss: 1.25 },
    LOCATION: { central: 1.00, outer: 1.08, outside: null }
  };
  function estimate(i) {
    if (i.location === 'outside') return null;
    var w = i.widthMm, base = w < 1500 ? EST.BASE.small : w < 2500 ? EST.BASE.medium : w < 3500 ? EST.BASE.large : EST.BASE.xlarge;
    base *= i.heightMm / EST.H; base *= i.depthMm / EST.D;
    var mid = base * EST.TYPE[i.type] * (EST.DOORS[i.doors] || (i.doors > 6 ? 1.10 : 1.00)) * EST.INTERIOR[i.interior] * EST.FINISH[i.finish] * EST.LOCATION[i.location];
    return { low: Math.round(mid * (1 - EST.SPREAD) / 500) * 500, high: Math.round(mid * (1 + EST.SPREAD) / 500) * 500 };
  }

  root.WardrobePrice = { PRICES: P, EST: EST, materials: materials, packCount: packCount, estimate: estimate };
})(typeof window !== 'undefined' ? window : this);
