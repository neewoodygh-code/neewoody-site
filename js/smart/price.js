/* Materials price for a wardrobe's parts (owner's prices, 2026-11-20). Used by the homeowner planner
 * (src/pages/wardrobe-planner.astro), the cutlist (cutlist.html) and anything else that has a parts list.
 * "The more you build the more price shows": every part, edge, screw and handle is counted from the parts.
 *
 * WardrobePrice.materials(parts, opt) with parts = [{name, tag, L, W, qty, eb:{t,r,b,l}}] (L = the longer size,
 * along the grain; eb = edge banding, l/r the long edges) and opt = {doorHandle: 0|30|60|100, drawerHandle: 0|30|60|100}.
 * Returns {lines:[{item, qty, cost, note}], total, unpriced:[{item, qty}], boards, bandM}.
 * Screw counts are an estimate from the joints (see SCREWS) with 10% spare, rounded up to whole boxes.
 * Plain script; sets window.WardrobePrice. */
(function (root) {
  'use strict';
  var P = {
    board: 500, boardL: 2440, boardW: 1220, kerf: 4,   // 18 mm laminate board 2440 x 1220
    bandRoll: 200, bandApply: 500, rollM: 100,          // edge band: roll of 100 m, application per roll
    screwBox: 60, screwsPerBox: 100,                    // 2" assembly screws and 1¼" external-panel screws, same price
    handle: { 30: 30, 60: 50, 100: 75 }                 // handle length in cm: price
  };

  // Guillotine shelf packing, first-fit decreasing, grain fixed (length along the board): the same method as
  // the Cut Sheet's packBoards(), so the board count here matches what the Cut Sheet says.
  function packCount(items) {
    var BL = P.boardL, BW = P.boardW, k = P.kerf, boards = [], over = 0;
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
    var lines = [], unpriced = [], boardItems = [], bandMM = 0, s2 = 0, s1 = 0, doors = 0, fronts = 0, backs = 0, drawers = 0, rails = 0;
    parts.forEach(function (p) {
      var q = p.qty || 1, L = Math.max(p.L, p.W), W = Math.min(p.L, p.W), e = p.eb || {};
      if (is(p, /back panel/)) { backs += q; return; }                       // thin back board: not the 18 mm laminate
      for (var i = 0; i < q; i++) boardItems.push({ L: L, W: W });
      bandMM += (((e.l ? 1 : 0) + (e.r ? 1 : 0)) * L + ((e.t ? 1 : 0) + (e.b ? 1 : 0)) * W) * q;
      var sc = screwsFor(p); s2 += sc[0] * q; s1 += sc[1] * q;
      if (p.tag === 'door') doors += q;
      if (is(p, /drawer front|false front/)) fronts += q;
      if (is(p, /drawer base/)) drawers += q;
    });
    (opt.rails || 0) && (rails = opt.rails);
    var pk = packCount(boardItems);
    lines.push({ item: pk.count + ' laminate board' + (pk.count === 1 ? '' : 's') + ', 2440 × 1220', qty: pk.count, cost: pk.count * P.board, note: 'GH₵' + P.board + ' a board' + (pk.oversize ? '; ' + pk.oversize + ' part' + (pk.oversize > 1 ? 's are' : ' is') + ' longer than a board and must be joined (or split the wardrobe into more carcasses)' : '') });
    var bandM = Math.ceil(bandMM / 1000), rolls = Math.ceil(bandM / P.rollM);
    if (rolls) {
      lines.push({ item: 'Edge band (' + bandM + ' m)', qty: rolls, cost: rolls * P.bandRoll, note: rolls + ' roll' + (rolls > 1 ? 's' : '') + ' of ' + P.rollM + ' m' });
      lines.push({ item: 'Edge banding application', qty: rolls, cost: rolls * P.bandApply, note: 'GH₵' + P.bandApply + ' a roll' });
    }
    var b2 = Math.ceil(s2 * 1.1 / P.screwsPerBox), b1 = Math.ceil(s1 * 1.1 / P.screwsPerBox);
    if (b2) lines.push({ item: '2" screws, assembly', qty: b2, cost: b2 * P.screwBox, note: 'about ' + s2 + ' screws, boxes of ' + P.screwsPerBox });
    if (b1) lines.push({ item: '1¼" screws, outside panels', qty: b1, cost: b1 * P.screwBox, note: 'about ' + s1 + ' screws, boxes of ' + P.screwsPerBox });
    var dh = P.handle[opt.doorHandle], fh = P.handle[opt.drawerHandle == null ? 30 : opt.drawerHandle];
    if (doors && dh) lines.push({ item: 'Door handles, ' + opt.doorHandle + ' cm', qty: doors, cost: doors * dh, note: 'GH₵' + dh + ' each' });
    if (fronts && fh) lines.push({ item: 'Drawer handles, ' + (opt.drawerHandle == null ? 30 : opt.drawerHandle) + ' cm', qty: fronts, cost: fronts * fh, note: 'GH₵' + fh + ' each' });
    // counted but not priced yet (owner to give prices)
    var hinged = parts.filter(function (p) { return p.tag === 'door' && !is(p, /sliding/); });
    var hinges = hinged.reduce(function (n, p) { return n + (p.qty || 1) * (Math.max(p.L, p.W) > 1500 ? 4 : Math.max(p.L, p.W) > 900 ? 3 : 2); }, 0);
    if (hinges) unpriced.push({ item: 'Hinges', qty: hinges });
    if (drawers) unpriced.push({ item: 'Drawer runners (pairs)', qty: drawers });
    if (rails) unpriced.push({ item: 'Hanging rails with brackets', qty: rails });
    if (parts.some(function (p) { return p.tag === 'door' && is(p, /sliding/); })) unpriced.push({ item: 'Sliding door track set', qty: 1 });
    if (backs) unpriced.push({ item: 'Back panel board (thin)', qty: backs });
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
