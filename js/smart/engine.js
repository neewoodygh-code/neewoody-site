/* Smart Generator engine (step 2 of docs/tools/smart-cutlist-plan.md, started 2026-11-19).
 *
 * POSITIONS FIRST: every part is placed as a box in 3D (mm; x = left to right, y = floor up,
 * z = carcass front (0) to back), and the cut list is READ OFF those boxes. The cut list and the
 * 3D model therefore cannot disagree, which is the trap the wardrobe cutlist fell into (sizes first,
 * positions fitted on afterwards). clashes() lists parts that run into each other.
 *
 * Construction rules follow the owner's standard as settled in the wardrobe cutlist (2026-11-17..19):
 * full-overlay doors split shared dividers; inset back in a groove (member's depth, 1 mm play);
 * drawer boxes = opening - runner gap (27), front/back full width, sides between, base under;
 * drawers behind a door go in a separate chest (set back 80, 60 fillers, face strip = gap + overlap,
 * fronts between the strips with 3 mm gaps); subframe gridwork between full-height sides (or a
 * separate plinth under box units), mid-rails sandwiched, set back shortens the frame, glued face.
 *
 * Plain script: in a browser it sets window.SmartEngine. (The repo's package.json is "type":"module", so Node
 * treats this file as ESM; tests load it in a browser page, see scripts/test-smart-engine.mjs.)
 * No UI here. Same box shape as js/cutlist-3d.js, so Cutlist3D.mount(host, boxes) can show it. */
(function (root) {
  'use strict';

  var SHOP = {                      // the standard; a member's own values override these
    thick: 18, backType: 'inset', backThick: 3, groove: 8,
    shelfClear: 2, shelfSetback: 50, edgeClear: 2, doorGap: 2, topGap: 2, botGap: 2, doorThick: 18,
    runGap: 27, boxSetback: 100,
    chest: { set: 80, gap: 60, over: 9, fgap: 3 },
    sub: { mode: 'built', h: 100, style: 'setback', setback: 60, thick: 18, gap: 3, midRails: 'auto' },
    end: { type: 'flush', left: true, right: true, thick: 18, extendH: 50, extendD: 0, scribe: 30 },
    pelmet: { on: false, h: 80 }
  };
  var RUNNERS = [600, 550, 500, 450, 400, 350, 300, 250];

  function R(n) { return Math.round(n); }
  function floor(n) { return Math.floor(n + 1e-9); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(a, b) {            // deep copy of a with b's values laid over it
    var o = {}, k; b = b || {};
    for (k in a) o[k] = isObj(a[k]) ? merge(a[k], b[k]) : (b[k] !== undefined ? b[k] : a[k]);
    for (k in b) if (!(k in a)) o[k] = b[k];
    return o;
  }
  function autoMidRails(uw) {
    if (uw <= 700) return 2; if (uw <= 900) return 3; if (uw <= 1200) return 4;
    if (uw <= 1600) return 5; if (uw <= 2000) return 6; if (uw <= 2400) return 7;
    return Math.ceil(uw / 350) + 1;
  }

  // One wardrobe unit run. spec: { w, h, d, units, sections:[{zones:[{type,h,shelves,drawers}], door:{on,count,type,bottom}}],
  // shop: overrides of SHOP }. Zones are listed top to bottom (as in the cutlist); they are STACKED FROM THE BOTTOM
  // at their real heights and the top zone takes whatever height is left, so a drawer chest sits on the carcass bottom.
  function wardrobe(spec) {
    var s = merge(SHOP, spec.shop || {});
    var t = s.thick, w = spec.w, h = spec.h, d = spec.d, U = spec.units || 1;
    var secs = spec.sections || [], n = secs.length;
    var sub = s.sub, sep = sub.mode === 'separate', tkH = sub.h, tk = sub.thick;
    var boxes = [], warn = [];

    function add(name, tag, kind, x, y, z, bw, bh, bd, cut, note) {
      // cut = [first, second] axes ('x','y','z') naming the panel's two cut sizes in cut-list order
      var ext = { x: bw, y: bh, z: bd };
      boxes.push({ name: name, tag: tag, kind: kind || tag, x: x, y: y, z: z, w: bw, h: bh, d: bd,
        cut: [R(ext[cut[0]]), R(ext[cut[1]])], note: note || '' });
    }

    var carcH = h - tkH, innerH = carcH - 2 * t;
    var panelD = s.backType === 'inset' ? d - s.backThick : d;
    var unitW = w / U, spu = Math.ceil(n / U), divs = spu - 1;
    var openW = (unitW - 2 * t - divs * t) / spu;
    var topBotW = R(unitW - 2 * t);
    var grooveIn = Math.max(0, s.groove - 1);
    var setb = sub.style === 'setback' ? sub.setback : 0;
    var midN = sub.midRails === 'auto' ? autoMidRails(unitW) : sub.midRails;
    var railL = sep ? R(unitW) : topBotW;
    var sideH = sep ? R(carcH) : R(h), sideY = h - sideH;

    function hasFront(sc) { return !!sc && ((sc.door && sc.door.on) || sc.zones.some(function (z) { return z.type === 'drawers' && z.drawers > 0; })); }
    function edgeOv(si, side) {      // how far a front covers the panel on that side
      var nb = si + side;
      if (nb < 0 || nb >= n) return t - s.edgeClear;
      if (Math.floor(si / spu) !== Math.floor(nb / spu)) return t - s.edgeClear;
      return hasFront(secs[nb]) ? (t - s.doorGap) / 2 : t - s.edgeClear;
    }
    function span(si) { return openW + edgeOv(si, -1) + edgeOv(si, 1); }

    for (var u = 0; u < U; u++) {
      var x0 = u * unitW;
      // carcass: sides (to the floor, or on the plinth), top and bottom between them, dividers between top and bottom
      add('Side Panel', 'carcass', '', x0, sideY, 0, t, sideH, d, ['y', 'z'], sep ? 'box side, stands on the plinth' : 'full height to the floor, screwed to the subframe from inside');
      add('Side Panel', 'carcass', '', x0 + unitW - t, sideY, 0, t, sideH, d, ['y', 'z']);
      add('Top Panel', 'carcass', '', x0 + t, h - t, 0, topBotW, t, R(panelD), ['x', 'z']);
      add('Bottom Panel', 'carcass', '', x0 + t, tkH, 0, topBotW, t, R(panelD), ['x', 'z'], 'sits on the subframe, between the sides');
      for (var k = 1; k <= divs; k++) add('Internal Divider', 'carcass', '', x0 + t + k * openW + (k - 1) * t, tkH + t, 0, t, R(innerH), R(panelD), ['y', 'z']);
      if (s.backType === 'inset') add('Back Panel (Inset groove ' + s.backThick + 'mm)', 'carcass', 'back', x0 + t - grooveIn, tkH + t - grooveIn, panelD, R(topBotW + 2 * grooveIn), R(innerH + 2 * grooveIn), s.backThick, ['x', 'y'], s.groove + 'mm groove, 1mm play each side');
      else add('Back Panel (Nail-on ' + s.backThick + 'mm)', 'carcass', 'back', x0, tkH, d, R(unitW), R(carcH), s.backThick, ['x', 'y']);
      // subframe gridwork: face at the set back, front rail behind it, mid-rails sandwiched, back rail at the back
      var rx = x0 + (unitW - railL) / 2, mrLen = R(d - (setb + tk) - 2 * tk);
      add('Subframe Face Panel (Toe Kick)', 'frame', '', rx, 0, setb, railL, R(tkH - sub.gap), tk, ['x', 'y'], 'glued to the front rail (or screwed from inside) to hide the rail screws');
      add('Subframe Front Rail', 'frame', '', rx, 0, setb + tk, railL, tkH, tk, ['x', 'y']);
      add('Subframe Back Rail', 'frame', '', rx, 0, d - tk, railL, tkH, tk, ['x', 'y']);
      for (var m = 0; m < midN; m++) {
        var mx = midN > 1 ? rx + m * (railL - tk) / (midN - 1) : rx + railL / 2;
        add('Subframe Mid-Rail', 'frame', '', mx, 0, setb + 2 * tk, tk, tkH, mrLen, ['z', 'y']);
      }
    }

    secs.forEach(function (sec, si) {
      var sn = 'Sec ' + (si + 1), u = Math.floor(si / spu), j = si % spu;
      var sx = u * unitW + t + j * (openW + t), lov = edgeOv(si, -1);
      var floorY = tkH + t, ceilY = h - t;
      // stack zones from the bottom at their real heights; the top zone takes what is left
      var zs = sec.zones.slice(), y = floorY, regions = [];
      for (var zi = zs.length - 1; zi >= 0; zi--) {
        var zh = zi === 0 ? ceilY - y : Math.min(zs[zi].h, ceilY - y);
        regions[zi] = { y: y, h: zh }; y += zh;
      }
      var sumZ = zs.reduce(function (a, z) { return a + (z.h || 0); }, 0);
      if (sumZ > innerH + 1) warn.push(sn + ': zones add up to ' + sumZ + 'mm but the inside is ' + R(innerH) + 'mm tall');

      zs.forEach(function (z, zi) {
        var rg = regions[zi];
        if (z.type === 'shelves' && z.shelves > 0) {
          for (var i = 1; i <= z.shelves; i++)
            add('Shelf (' + sn + ')', 'shelf', '', sx + s.shelfClear, rg.y + i * rg.h / (z.shelves + 1) - t / 2, s.shelfSetback, R(openW - 2 * s.shelfClear), t, R(d - s.shelfSetback), ['x', 'z'], s.shelfClear + 'mm clearance each side');
        } else if (z.type === 'hanging') {
          boxes.push({ name: 'Hanging rail', tag: 'hw', kind: 'hw', x: sx + 15, y: rg.y + rg.h - 70, z: d / 2 - 12, w: openW - 30, h: 25, d: 25, cut: null, hardware: true });
        } else if (z.type === 'drawers' && z.drawers > 0) {
          var nd = z.drawers;
          if (sec.door && sec.door.on) {
            // drawers behind a door: their own chest, set back from the front
            var C = s.chest, chH = R(z.h), chW = R(openW - 2 * C.gap), chD = R(panelD - C.set);
            var cx = sx + C.gap, cz = C.set, inW = chW - 2 * t, fsW = R(C.gap + C.over);
            var cfW = floor(openW - 2 * fsW - 2 * C.fgap), slot = chH / nd, cfH = R(R(chH / nd) - s.doorGap);
            var runner = RUNNERS.filter(function (L) { return L <= chD - 10; })[0] || R(chD - 10);
            var bw = R(inW - s.runGap), bh = R((chH - 2 * t) / nd - 24), cn = 'Drawer Chest (' + sn + ')';
            add(cn + ' Side', 'drawer', '', cx, rg.y, cz, t, chH, chD, ['y', 'z'], 'chest set back ' + C.set + 'mm from the carcass front');
            add(cn + ' Side', 'drawer', '', cx + chW - t, rg.y, cz, t, chH, chD, ['y', 'z']);
            add(cn + ' Top/Bottom', 'drawer', '', cx + t, rg.y, cz, R(inW), t, chD, ['x', 'z'], 'between the chest sides');
            add(cn + ' Top/Bottom', 'drawer', '', cx + t, rg.y + chH - t, cz, R(inW), t, chD, ['x', 'z']);
            add(cn + ' Filler Strip', 'drawer', '', sx, rg.y, cz, R(C.gap), chH, t, ['y', 'x'], 'screwed to the outside front of each chest side');
            add(cn + ' Filler Strip', 'drawer', '', sx + openW - C.gap, rg.y, cz, R(C.gap), chH, t, ['y', 'x']);
            add(cn + ' Face Strip', 'drawer', '', sx, rg.y, cz - t, fsW, chH, t, ['y', 'x'], 'glued to the filler, overlaps the chest side by ' + C.over + 'mm');
            add(cn + ' Face Strip', 'drawer', '', sx + openW - fsW, rg.y, cz - t, fsW, chH, t, ['y', 'x']);
            for (var a = 0; a < nd; a++) {
              add('Drawer Front (' + sn + ', inside)', 'drawer', 'front', sx + fsW + C.fgap, rg.y + a * slot + s.doorGap / 2, cz - t, cfW, cfH, t, ['x', 'y'], C.fgap + 'mm clear of the face strips');
              box(cx + (chW - bw) / 2, rg.y + t + a * (chH - 2 * t) / nd + 6, cz, bw, bh, runner);
            }
          } else {
            // outside drawers: overlay fronts the same width as a door here
            var oh = z.h / nd, bw2 = R(openW - s.runGap), bh2 = R(R(oh) - 24), bd2 = R(d - s.boxSetback);
            var dfW = floor(span(si)), dfH = R(R(oh) - s.doorGap);
            for (var b = 0; b < nd; b++) {
              add('Drawer False Front (' + sn + ')', 'drawer', 'front', sx - lov, rg.y + b * oh + s.doorGap / 2, -s.doorThick, dfW, dfH, s.doorThick, ['x', 'y'], 'full overlay, same width as a single door here');
              box(sx + (openW - bw2) / 2, rg.y + b * oh + 6, 0, bw2, bh2, bd2);
            }
          }
        }
      });
      function box(bx, by, bz, bw, bh, bl) {   // base under, front and back full width, sides between
        add('Drawer Base (' + sn + ')', 'drawer', '', bx, by, bz, bw, t, bl, ['x', 'z'], 'box outside size');
        add('Drawer Box Front/Back (' + sn + ')', 'drawer', '', bx, by + t, bz, bw, bh, t, ['x', 'y'], 'full box width');
        add('Drawer Box Front/Back (' + sn + ')', 'drawer', '', bx, by + t, bz + bl - t, bw, bh, t, ['x', 'y']);
        add('Drawer Box Side (' + sn + ')', 'drawer', '', bx, by + t, bz + t, t, bh, R(bl - 2 * t), ['z', 'y'], 'between the box front and back');
        add('Drawer Box Side (' + sn + ')', 'drawer', '', bx + bw - t, by + t, bz + t, t, bh, R(bl - 2 * t), ['z', 'y']);
      }

      // doors
      var dr = sec.door || {};
      if (dr.on) {
        var nDoor = dr.count || 1;
        if (dr.type !== 'sliding') {
          var dH = dr.bottom === 'panel' ? R(carcH - s.topGap - s.botGap) : R(h - s.topGap - s.botGap);
          var dY = dr.bottom === 'panel' ? tkH + s.botGap : s.botGap;
          var dW = floor((span(si) - (nDoor > 1 ? s.doorGap * (nDoor - 1) : 0)) / nDoor);
          for (var q = 0; q < nDoor; q++) add('Door (' + sn + ')', 'door', 'door', sx - lov + q * (dW + s.doorGap), dY, -s.doorThick, dW, dH, s.doorThick, ['x', 'y']);
        } else {
          var lH = dr.bottom === 'panel' ? R(carcH - 20) : R(h - 20), lW = R(openW * 0.55), lY = dr.bottom === 'panel' ? tkH + 10 : 10;
          for (var p = 0; p < Math.max(2, nDoor); p++) add('Sliding Door Leaf (' + sn + ')', 'door', 'door', p % 2 ? sx + openW - lW : sx, lY, -s.doorThick * (1 + p % 2), lW, lH, s.doorThick, ['x', 'y']);
        }
      }
    });

    // applied end panels and pelmet
    var E = s.end;
    if (E.type !== 'none') {
      var eH = R(h + (E.type === 'extended' ? E.extendH : 0));
      var eD = R(d + s.doorThick + s.shelfClear + (E.type === 'extended' ? E.extendD : 0) + (E.type === 'scribing' ? E.scribe : 0));
      if (E.left) add('Left Applied End Panel', 'panel', '', -E.thick, 0, d - eD, E.thick, eH, eD, ['y', 'z']);
      if (E.right) add('Right Applied End Panel', 'panel', '', w, 0, d - eD, E.thick, eH, eD, ['y', 'z']);
    }
    if (s.pelmet.on) add('Top Pelmet', 'carcass', '', 0, h, -s.doorThick, R(w), R(s.pelmet.h), t, ['x', 'y']);

    return { boxes: boxes, warnings: warn };
  }

  // The cut list, read off the placed parts: one row per part name and size.
  function cutList(boxes) {
    var rows = {}, out = [];
    boxes.forEach(function (b) {
      if (!b.cut) return;
      var key = b.name + '|' + b.cut[0] + 'x' + b.cut[1];
      if (!rows[key]) { rows[key] = { name: b.name, tag: b.tag, a: b.cut[0], b: b.cut[1], qty: 0, note: b.note }; out.push(rows[key]); }
      rows[key].qty++;
      if (!rows[key].note && b.note) rows[key].note = b.note;
    });
    return out;
  }

  // Parts that run into each other by more than 0.5 mm (the inset back sits in its groove, so it is left out).
  function clashes(boxes) {
    var B = boxes.filter(function (b) { return !b.hardware && b.kind !== 'back'; }), list = [];
    for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++) {
      var a = B[i], b = B[j];
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y), oz = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
      if (ox > .5 && oy > .5 && oz > .5) list.push(a.name + ' / ' + b.name);
    }
    return list.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  // Boxes in the shape js/cutlist-3d.js draws (p = the part's cut-list row).
  function forViewer(boxes) {
    var rows = {};
    cutList(boxes).forEach(function (r) { rows[r.name + '|' + r.a + 'x' + r.b] = r; });
    return boxes.map(function (b) {
      var r = b.cut ? rows[b.name + '|' + b.cut[0] + 'x' + b.cut[1]] : null;
      return { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d, tag: b.tag, kind: b.kind, name: b.name, p: r ? { name: r.name, w: r.a, d: r.b, qty: r.qty } : null };
    });
  }

  // Edge banding as standard, so members take off what a job does not need instead of adding it.
  // Same rules as cutlist.html ebDefault (part names match it): {t,r,b,l}, 1 = band that edge. The box is drawn
  // the machine-shop way, length (the longer size, along the grain) on the right, so l/r are the long edges
  // and t/b the short ones.
  // shop (optional) = the spec's shop settings; the toe kick depends on them (owner 2026-11-20): flush with the doors
  // = banded all round; set back = only its bottom long edge, so dragging on the floor doesn't chip the laminate.
  function edges(p, shop) {
    var n = p.name.toLowerCase(), E = function (t, r, b, l) { return { t: t, r: r, b: b, l: l }; };
    if (n.indexOf('toe kick') !== -1) {
      var sub = merge(SHOP, shop || {}).sub;
      return (sub.style === 'flush' || !(sub.setback > 0)) ? E(1, 1, 1, 1) : E(0, 1, 0, 0);
    }
    if (p.tag === 'door' || n.indexOf('false front') !== -1 || n.indexOf('blind panel') !== -1 || /drawer front/.test(n)) return E(1, 1, 1, 1);
    if (n.indexOf('face strip') !== -1) return E(0, 1, 0, 0);   // inner long edge only: back on the carcass, bottom on the carcass, top under the shelf (owner 2026-11-20)
    if (n.indexOf('filler strip') !== -1) return E(0, 0, 0, 0);                // hidden behind the face strip
    if (n.indexOf('island top panel') !== -1) return E(0, 0, 0, 0);            // under the quartz, never seen
    if (/chest .*top\/bottom/.test(n)) return E(0, 1, 0, 0);                    // front edge (the long one)
    if (/chest .*side/.test(n)) return p.a >= p.b ? E(0, 1, 0, 0) : E(1, 0, 0, 0); // front edge = the chest height
    if (n.indexOf('drawer box front') !== -1 || n.indexOf('drawer box back') !== -1 || n.indexOf('front/back') !== -1) return E(1, 1, 0, 1);
    if (n.indexOf('drawer box side') !== -1) return E(1, 0, 0, 0);
    if (n.indexOf('drawer base') !== -1 || n.indexOf('back panel') !== -1 || p.tag === 'frame') return E(0, 0, 0, 0);
    if (n.indexOf('side panel') !== -1 || p.tag === 'panel') return E(1, 0, 1, 1);
    if (n.indexOf('top panel') !== -1 || n.indexOf('bottom panel') !== -1 || n.indexOf('divider') !== -1) return E(0, 1, 0, 0);
    if (p.tag === 'shelf' || n.indexOf('pelmet') !== -1) return E(0, 1, 0, 0);
    return E(0, 0, 0, 0);
  }

  /* ---------------- KITCHENS (step 3, started 2026-11-21; owner's rules in plan section 4a-k) ----------------
   * Base units stand on adjustable legs (10 cm standard; 4 legs up to 800 wide, 6 over, 8 under an L corner).
   * A 2 cm riser under the 2 cm slab puts the doubled 4 cm edge flush with the carcass top, so
   * carcass top = worktop - 40 and base sides = worktop - 40 - legs.
   * Base units: sides, bottom between them, NO top panel: 4 rails of 80 mm (2 flat at the top front and back,
   * 2 upright at the back, top and bottom: they square the box and are what it is screwed to the wall through).
   * Wall units: sides, top and bottom between them, 2 upright back rails (top and bottom), shelves set back 20.
   * Backs are screwed on from the back (applied side panels get +5 mm to cover them); the sink unit has no back.
   * Handles (owner 2026-11-21: a choice per kitchen): K.handle 'jprofile' = every door and drawer front is shortened by
   * the profile height (base: profile on top;
   * wall: on the bottom). L corner units: top/bottom/shelves are one piece routed out of a blank.
   * Toe kick: bought in 3 m lengths (one long board per run), set back 80; it is hardware, not on the cut list.
   * Spec: { type:'kitchen', worktop:900, room:{w}, runs:[{name, wall:'back'|'left'|'right', at, depth, kind:'base'|'wall',
   *   bottom, height, units:[...]}], shop }. Unit types: 'base' (drawers:[h top to bottom] or doors:n), 'sink',
   *   'panel' (18 mm side panel between units), 'filler', 'cornerL' (back leg w, return r, returnDepth), 'wall'.
   * Tall units, the island and the laundry (owner's answers 2026-11-23):
   *  - Board size is a setting (K.board: '4x8' 2440 x 1220 standard; '4x9' and '6x9' usually only come in chipboard).
   *    A tall box stays within the board: on 10 cm legs that is 2300 for 4x8 (240 overall). Taller units (Amina's
   *    A and K go to 270) are TWO STACKED BOXES; the lower one holds the appliances.
   *  - 'tall' unit: zones listed bottom to top, {k:'drawer'|'oven'|'micro'|'cubby'|'shelves', h (0 = the rest),
   *    n (drawers side by side, or shelves), rows, cols, open}; {k:'split'} starts the upper box. Fixed shelves
   *    between zones. Cubbies and shelves sit behind doors; u.fold = one 2-leaf folding door over all of them,
   *    full height (owner: one fold, full height).
   *  - island run: {kind:'island', x, z, axis:'z'|'x', depth, top (underside of the quartz, 1100), units}; units
   *    stand on legs with a toe kick all round (owner), carcass = top - 10 cm gloss band - legs; 'slide' units
   *    are back to back pairs (u.name and u.name2) with bottom-rolling sliding doors (owner).
   *  - laundry: a base run with carcTop (top of the carcass under the board) and units with frontTop (doors stop
   *    under the worktop lip); run.items = bought items (welded frame, moisture-resistant board). */
  var KSHOP = { handle: 'jprofile', sinkRail: 60, legH: 100, edgeDrop: 40, jH: 35, rail: 80, toeSet: 80, toeLen: 3000, wallShelfSet: 20, baseShelfSet: 50, panelExtra: 5, backThick: 3,
    board: '4x8', tallTop: 2700, bandH: 100, slideTrack: 15, slideOverlap: 30, ovenW: 560, ovenH: 600,
    // owner 2026-11-23: drawer boxes sit lower than their fronts; Accra sliding tracks (flat bottom, bigger top) need the
    // carcass set back by the track depth; pulls go at hand height; island top panel = the quartz less its doubled edge
    drawerDrop: 50, drawerMin: 80, slideD: 50, slideBot: 10, slideTop: 30, reach: 1800, edgeW: 80,
    cornerFill: 80 };   // blind corners (owner 2026-11-23): the run that meets a blind unit starts with an 80 mm filler
  var BOARDS = { '4x8': [2440, 1220], '4x9': [2745, 1220], '6x9': [2745, 1830] };
  function boardOf(K) { return BOARDS[K.board] || BOARDS['4x8']; }

  function kitchen(spec) {
    var s = merge(merge(SHOP, { backType: 'nailon' }), spec.shop || {}), K = merge(KSHOP, spec.kshop || {});
    var JP = K.handle !== 'bar', t = s.thick, bt = K.backThick, J = JP ? K.jH : 0, gap = s.doorGap, ec = s.edgeClear, DT = s.doorThick;
    var W = (spec.room && spec.room.w) || 4000, WT = spec.worktop || 900;
    var carcTop = WT - K.edgeDrop, baseSideH = carcTop - K.legH;
    var boxes = [], warn = [], hw = {};
    function tally(k, n) { hw[k] = (hw[k] || 0) + n; }
    function handle(n) { tally(JP ? 'J-profile handle (cut to front width)' : 'Handles or knobs (one per front)', n); }
    var BD = boardOf(K), tallMax = BD[0] - 140;   // 2440 board: 2300 box on 10 cm legs (owner: 240 overall max)

    // islands become one sub-run per unit (back-to-back pairs give two), each facing its own side
    var runs = [], islands = [];
    spec.runs.forEach(function (run) {
      if (run.kind !== 'island') { runs.push(run); return; }
      var D = run.depth || 800, a = 0, iTop = (run.top || 1100) - t, outA = DT, outB = DT;   // carcass top = under the top panel
      run.units.forEach(function (u, ui) {
        var nm = u.name || ('Island ' + (ui + 1)), c = { wall: 'island', kind: 'base', isl: true, carcTop: iTop, ix: run.x || 0, iz: run.z || 0, axis: run.axis || 'z', D: D, at: a, name: (run.name || 'Island') + ', ' + nm };
        if (u.type === 'slide') {
          var half = (D - 2 * bt) / 2;
          runs.push(merge(c, { face: 'a', depth: half, units: [merge(u, { name: nm })] }));
          runs.push(merge(c, { face: 'b', depth: half, units: [merge(u, { name: u.name2 || nm + ' (other side)' })] }));
        } else {
          runs.push(merge(c, { face: u.face || 'a', depth: D - bt, units: [merge(u, { name: nm, cover: true })] }));
        }
        a += u.w || 600;
      });
      islands.push({ run: run, L: a, D: D, iTop: iTop, outA: outA, outB: outB });
    });

    runs.forEach(function (run) {
      var wall = run.wall || 'back', base = (run.kind || 'base') === 'base';
      var dC = run.depth, Dr = dC + bt;                       // carcass depth (client's own), + back
      var rTop = run.carcTop || carcTop;                       // laundry and island set their own carcass top
      var yBot = base ? K.legH : run.bottom, H = base ? rTop - K.legH : run.height, yTop = yBot + H;
      // map a box from run-local (x along the run, y up, z = carcass front 0 .. wall Dr) to the room
      // (X along the back wall from the left wall, Y up, Z = out from the back wall; walls at X = 0, X = W, Z = 0)
      function put(name, tag, kind, x, y, z, bw, bh, bd, cut, note, extra) {
        var ext = { x: bw, y: bh, z: bd }, o = { name: name, tag: tag, kind: kind || tag, y: y, h: bh,
          cut: cut ? [R(ext[cut[0]]), R(ext[cut[1]])] : null, note: note || '', run: run.name };
        var a = run.at || 0, off = run.off || 0;    // off = stand-off from the wall (the slack hidden behind the L corners)
        if (wall === 'back') { o.x = a + x; o.w = bw; o.z = off + Dr - z - bd; o.d = bd; }
        else if (wall === 'left') { o.x = off + Dr - z - bd; o.w = bd; o.z = a + x; o.d = bw; }
        else if (wall === 'island') {   // z = 0 is this unit's front; face b units look the other way
          var lz = run.face === 'b' ? run.D - z - bd : z, lx = a + x;
          if (run.axis === 'x') { o.x = run.ix + lx; o.w = bw; o.z = run.iz + run.D - lz - bd; o.d = bd; }
          else { o.x = run.ix + lz; o.w = bd; o.z = run.iz + lx; o.d = bw; }
        }
        else { o.x = W - off - Dr + z; o.w = bd; o.z = a + x; o.d = bw; }
        if (extra) for (var k in extra) o[k] = extra[k];
        boxes.push(o); return o;
      }
      function hwBox(name, x, y, z, bw, bh, bd) { put(name, 'hw', 'hw', x, y, z, bw, bh, bd, null, '', { hardware: true }); }
      function legs(x0, bw, n) { tally('Cabinet legs ' + K.legH / 10 + ' cm (sets of 4)', n); }
      // drawer box height (base + sides): lower than the front by K.drawerDrop, never under K.drawerMin, never over the space
      function drawerBox(frontH, room) { return Math.min(Math.max(K.drawerMin, R(frontH - K.drawerDrop)), R(room)); }
      function drawerBoxParts(lbl, bx, by, z0, bw, boxH, runner) {
        put('Drawer Base' + lbl, 'drawer', '', bx, by, z0, bw, t, runner, ['x', 'z'], 'box outside size');
        put('Drawer Box Front/Back' + lbl, 'drawer', '', bx, by + t, z0, bw, boxH - t, t, ['x', 'y'], 'full box width; box ' + boxH + ' high overall');
        put('Drawer Box Front/Back' + lbl, 'drawer', '', bx, by + t, z0 + runner - t, bw, boxH - t, t, ['x', 'y']);
        put('Drawer Box Side' + lbl, 'drawer', '', bx, by + t, z0 + t, t, boxH - t, runner - 2 * t, ['z', 'y'], 'between the box front and back');
        put('Drawer Box Side' + lbl, 'drawer', '', bx + bw - t, by + t, z0 + t, t, boxH - t, runner - 2 * t, ['z', 'y']);
        tally('Drawer runners ' + runner + ' mm (side mount, pair)', 1);
      }
      // Accra sliding doors (owner 2026-11-23): a flat track below, a bigger track above, two overlapping leaves inside the
      // depth the carcass was set back by (zf), so the side panels stay flush with the doors
      function slidePair(lbl, xx, fw, y0, h, zf) {
        var sw = floor((fw + K.slideOverlap) / 2), sh = R(h - K.slideBot - K.slideTop);
        put('Sliding Door' + lbl, 'door', 'door', xx, y0 + K.slideBot, zf - DT - 2, sw, sh, DT, ['x', 'y'], 'back track; leaves overlap ' + K.slideOverlap);
        put('Sliding Door' + lbl, 'door', 'door', xx + fw - sw, y0 + K.slideBot, zf - 2 * DT - 6, sw, sh, DT, ['x', 'y'], 'front track');
        tally('Sliding door tracks, flat bottom and top track (set for 2 doors)', 1);
        tally('Flush pull for sliding doors', 2);
      }
      // one door front, shortened by the J-profile on the given edge
      function doorFront(nm, lbl, xx, ww, lo, hi, jEdge, note, z0) {
        var h = R(hi - lo - J), yF = JP && jEdge === 'bottom' ? lo + J : lo;
        put(nm + lbl, 'door', 'door', xx, yF, z0 == null ? -DT : z0, ww, h, DT, ['x', 'y'], (JP ? 'shortened by the ' + J + ' mm J-profile (' + jEdge + ')' : '') + (note ? (JP ? '; ' : '') + note : ''));
        handle(1);
        return h;
      }
      // DOOR TYPES (owner 2026-11-23; size ranges from Blum AVENTOS, Grass Kinvaro and Sugatsune data):
      //  'hinged'    cup hinges, the usual for base, wall and tall units
      //  'liftHinge' lift-up flap on hinges at the top, held by a gas or mechanical spring stay; single flaps about 350-600 high
      //  'liftFree'  hingeless lift fitting (parallel lift or up-and-over); up to about 800
      //  'liftFold'  bi-fold lift: two horizontal panels hinged together; cabinets about 480-1040 high
      //  'drop'      drop-down on bottom hinges with a soft-down stay (TV units); 'dropFree' the same without a stay
      //  'slide'     Accra sliding tracks (the carcass is set back, see slidePair)
      // Lift-ups follow the shelves behind them: one lift-up door per shelf space (lines = shelf centre lines).
      function doorSet(ty, un, lbl, xx, fw, lo, hi, lines, o) {
        o = o || {};
        if (ty === 'slide') { slidePair(lbl, xx, fw, lo, hi - lo, o.zf || 0); return; }
        if (ty === 'liftHinge' || ty === 'liftFree') {
          var cuts = (lines || []).filter(function (c) { return c > lo + 100 && c < hi - 100; }).sort(function (a, b) { return a - b; }), b0 = lo, bands = [];
          cuts.forEach(function (c) { bands.push([b0, c - gap / 2]); b0 = c + gap / 2; });
          bands.push([b0, hi]);
          var mx = ty === 'liftFree' ? 800 : 600;
          bands.forEach(function (bd) {
            var h = doorFront('Lift-up Door', lbl, xx, fw, bd[0], bd[1], 'bottom', 'opens upwards' + (bands.length > 1 ? '; one per shelf space' : ''));
            if (ty === 'liftFree') tally('Lift-up fitting, hingeless (set)', 1);
            else { tally('Hinges (pair, soft close)', 1); tally('Lift-up stay, gas or mechanical spring (pair)', 1); }
            if (h > mx) warn.push(un + ': lift-up door ' + h + ' high; ' + (ty === 'liftFree' ? 'hingeless lifts' : 'single lift-ups on a stay') + ' usually go up to about ' + mx + '. Use a bi-fold lift, or add a shelf to split it.');
          });
          if (bands.length > 1) warn.push(un + ': ' + bands.length + ' lift-up doors, one per shelf space: fix those shelves at the door joints.');
          if (JP && bands[0][0] + J > K.reach) warn.push(un + ': the lowest lift-up pull is at ' + R(bands[0][0] + J) + ', above reach (' + K.reach + ').');
          return;
        }
        if (ty === 'liftFold') {   // split at the shelf nearest the middle, else the middle
          var mid = (lo + hi) / 2, near = (lines || []).filter(function (c) { return c > lo + 150 && c < hi - 150; }).sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); })[0], m2 = near == null ? mid : near;
          var uh = R(hi - m2 - gap / 2);
          put('Bi-fold Lift Door, upper panel' + lbl, 'door', 'door', xx, m2 + gap / 2, -DT, fw, uh, DT, ['x', 'y'], 'hinged to the lower panel; no handle');
          doorFront('Bi-fold Lift Door, lower panel', lbl, xx, fw, lo, m2 - gap / 2, 'bottom', 'pull on the bottom edge');
          tally('Bi-fold lift-up fitting (set)', 1); tally('Hinges (pair, soft close)', 1);
          if (hi - lo < 480 || hi - lo > 1040) warn.push(un + ': bi-fold lifts usually suit fronts 480 to 1040 high; this one is ' + R(hi - lo) + '.');
          return;
        }
        var nd = o.n || 1, dw = floor((fw - gap * (nd - 1)) / nd);
        for (var q = 0; q < nd; q++) {
          if (ty === 'drop' || ty === 'dropFree') {
            var hd = doorFront('Drop-down Door', lbl, xx + q * (dw + gap), dw, lo, hi, 'top', 'hinged at the bottom' + (ty === 'drop' ? '; soft-down stay' : '; no stay'));
            tally('Drop-down flap hinges (pair)', 1);
            if (ty === 'drop') tally('Soft-down stay (choose by door height x weight)', 1);
            if (hd > 600 && q === 0) warn.push(un + ': drop-down door ' + hd + ' high; drop-downs (soft-down stays) suit short flaps such as TV units.');
          } else {
            var hh = doorFront('Door', lbl, xx + q * (dw + gap), dw, lo, hi, o.edge || 'top');
            tally('Hinges (pair, soft close)', hh > 2000 ? 3 : hh > 900 ? 2 : 1);
          }
        }
      }

      var x = 0, frontLen = 0, tallJoint = 0;   // tallJoint: where the last tall unit's boxes meet (its end panel joins there)
      run.units.forEach(function (u, ui) {
        var w = u.w, un = u.name || ('Unit ' + (ui + 1)), lbl = ' (' + un + ')';
        if (u.type === 'panel') {          // 18 mm side panel between units: floor to carcass top, covers the back (+5)
          var pd = dC + DT + K.panelExtra + (u.extraD || 0), ph = u.h || (base ? rTop : H);   // u.h: beside a tall unit; u.extraD: scribe allowance
          var pnote = K.panelExtra + ' mm deeper to cover the back' + (u.extraD ? ', +' + u.extraD + ' to scribe on site' : '');
          if (u.h && ph > boardOf(K)[0]) {   // longer than the board: two pieces, joined where the tall unit's boxes meet
            var jy = tallJoint || R(ph / 2);
            put('End Panel, tall, lower piece' + lbl, 'panel', '', x, 0, -DT, t, jy, pd, ['y', 'z'], 'floor to ' + R(jy) + ', joined at the box joint; ' + pnote);
            put('End Panel, tall, upper piece' + lbl, 'panel', '', x, jy, -DT, t, ph - jy, pd, ['y', 'z'], R(jy) + ' to ' + ph + '; ' + pnote);
          } else put((u.h ? 'End Panel, tall' : 'Side Panel between units') + lbl, 'panel', '', x, 0, -DT, t, ph, pd, ['y', 'z'], (u.h ? 'floor to ' + ph : 'floor to the carcass top') + '; ' + pnote);
          if (!base) boxes[boxes.length - 1].y = yBot;
          x += t; frontLen += t; return;
        }
        if (u.type === 'filler') {         // a strip in the line of the fronts (e.g. over a base side panel)
          put('Filler Strip' + lbl, 'panel', '', x, yBot, -DT, w, H, DT, ['y', 'x'], 'in line with the doors');
          x += w; frontLen += w; return;
        }
        if (u.type === 'gap') { x += w; return; }
        if (u.type === 'cornerL') { cornerL(u, un); x += w; frontLen += w - dC; return; }
        if (u.type === 'tall') { tall(u, un); x += w; frontLen += w; return; }

        // ---- straight carcass (base / sink / wall) ----
        var inW = w - 2 * t, zf = (u.type === 'slide' || (u.doorType === 'slide' && !u.drawers)) ? K.slideD : 0, dd = dC - zf;   // sliding: carcass set back for the tracks
        put('Side Panel' + lbl, 'carcass', '', x, yBot, zf, t, H, dd, ['y', 'z'], zf ? 'set back ' + zf + ' for the sliding tracks' : '');
        put('Side Panel' + lbl, 'carcass', '', x + w - t, yBot, zf, t, H, dd, ['y', 'z']);
        put('Bottom Panel' + lbl, 'carcass', '', x + t, yBot, zf, inW, t, dd, ['x', 'z'], 'between the sides');
        if (base && u.hob) {
          // under a hob (owner 2026-11-21): the front rail turns upright, the flat back rail is left out and the upright
          // back rail comes up to the top, so the hob body has the whole depth between them
          put('Top Rail, upright front (hob)' + lbl, 'frame', '', x + t, yTop - K.rail, 0, inW, K.rail, t, ['x', 'y'], 'stood on edge under the hob');
          put('Back Rail, upright top (hob)' + lbl, 'frame', '', x + t, yTop - K.rail, dC - t, inW, K.rail, t, ['x', 'y'], 'raised to the top; no flat back rail under the hob');
          put('Back Rail, upright bottom' + lbl, 'frame', '', x + t, yBot + t, dC - t, inW, K.rail, t, ['x', 'y']);
          tally('Cabinet legs ' + K.legH / 10 + ' cm', w > 800 ? 6 : 4);
        } else if (base) {
          var rw = u.type === 'sink' ? K.sinkRail : K.rail;     // narrower flat rails under a sink (owner: 60)
          put('Top Rail, flat front' + lbl, 'frame', '', x + t, yTop - t, zf, inW, t, rw, ['x', 'z']);
          put('Top Rail, flat back' + lbl, 'frame', '', x + t, yTop - t, dC - rw, inW, t, rw, ['x', 'z']);
          put('Back Rail, upright top' + lbl, 'frame', '', x + t, yTop - t - K.rail, dC - t, inW, K.rail, t, ['x', 'y'], 'squares the box; screw through it to the wall');
          put('Back Rail, upright bottom' + lbl, 'frame', '', x + t, yBot + t, dC - t, inW, K.rail, t, ['x', 'y']);
          tally('Cabinet legs ' + K.legH / 10 + ' cm', w > 800 ? 6 : 4);
        } else {
          put('Top Panel' + lbl, 'carcass', '', x + t, yTop - t, zf, inW, t, dd, ['x', 'z'], 'between the sides');
          put('Back Rail, upright top' + lbl, 'frame', '', x + t, yTop - t - K.rail, dC - t, inW, K.rail, t, ['x', 'y'], 'hang the unit through this');
          put('Back Rail, upright bottom' + lbl, 'frame', '', x + t, yBot + t, dC - t, inW, K.rail, t, ['x', 'y']);
        }
        if (u.type !== 'sink') put('Back Panel (screwed on, ' + bt + 'mm)' + lbl, 'carcass', 'back', x, yBot, dC, w, H, bt, ['x', 'y']);
        else warn.push(un + ': sink unit, no back panel (open for the pipes)');

        // shelves (adjustable, on pins)
        // the count is what gets cut; u.shelfAt (mm above the inside bottom) places them exactly for the 3D and drawings.
        // Over 800 inside, the shelves get a centre divider (owner 2026-11-23, rule C1).
        var nSh = u.shelves || 0, set = base ? K.baseShelfSet : K.wallShelfSet, halves = nSh && inW > 800 && u.type !== 'blind' ? 2 : 1, hw2 = (inW - (halves - 1) * t) / halves;
        var shelfLines = [];
        if (halves > 1) put('Divider, centre' + lbl, 'carcass', '', x + t + hw2, yBot + t, zf, t, H - 2 * t, dd - t, ['y', 'z'], 'fixed between bottom and top; carries the shelves');
        for (var i = 1; i <= nSh; i++) {       // u.fixed = how many of the lowest shelves are fixed (through the sides)
          var sat = u.shelfAt && u.shelfAt[i - 1] != null ? u.shelfAt[i - 1] : null;
          var sy = sat != null ? yBot + t + sat : yBot + t + i * (H - 2 * t) / (nSh + 1) - t / 2;
          shelfLines.push(sy + t / 2);
          for (var hv = 0; hv < halves; hv++) {
            var sx = x + t + hv * (hw2 + t);
            if (i <= (u.fixed || 0)) put('Shelf, fixed' + lbl, 'shelf', '', sx, sy, zf, hw2, t, dd, ['x', 'z'], 'fixed through the sides (confirmat or dowel)');
            else put('Shelf, adjustable' + lbl, 'shelf', '', sx + s.shelfClear, sy, zf + set, hw2 - 2 * s.shelfClear, t, R(dd - set), ['x', 'z'], s.shelfClear + ' mm clearance each side, set back ' + set + (sat != null ? '' : '; placed on site'));
          }
        }
        if (nSh && hw2 > 800 && u.type !== 'blind') warn.push(un + ': shelf spans ' + R(hw2) + ' mm, over 800 (check C1)');

        // fronts: full overlay, J-profile shortens every front
        var fW = w - 2 * ec, fY = yBot + s.botGap, fH = (u.frontTop ? u.frontTop - yBot : H) - s.botGap - s.topGap;   // laundry: doors stop under the lip
        if (u.type === 'blind') {
          // BLIND CORNER, the standard corner (owner 2026-11-23; base units 1000 or 1200, wall units the same rule): the
          // blind part sits behind the run that meets it = that run's depth + its back + its door + the 80 mm corner
          // filler. An 18 mm blind panel is fixed on the front over it; the door(s) cover the open part.
          // u.side = the blind end (where the corner is); u.otherD = the other run's depth (default: this run's).
          var blind = (u.otherD || dC) + bt + DT + K.cornerFill, left = (u.side || 'left') === 'left';
          var bpW = R(blind - ec - gap / 2), opW = R(w - blind - ec - gap / 2), opX = left ? x + blind + gap / 2 : x + ec, bH = R(fH - J);
          if (opW < 250) warn.push(un + ': only ' + opW + ' left for the door beside the ' + R(blind) + ' blind part; use the 1200 width.');
          put('Blind Panel' + lbl, 'panel', '', left ? x + ec : x + w - blind + gap / 2, base ? fY : fY + J, -DT, bpW, bH, DT, ['x', 'y'], 'fixed on the carcass front over the blind part (' + R(blind) + ' = the other run ' + R(blind - K.cornerFill - DT) + ' + its door ' + DT + ' + ' + K.cornerFill + ' filler)');
          doorSet(u.doorType || 'hinged', un, lbl, opX, opW, fY, fY + fH, shelfLines, { n: u.doors || (opW > 600 ? 2 : 1), edge: base ? 'top' : 'bottom' });
          if (base && u.fitting) tally((u.fitting === 'lemans' ? 'LeMans corner pull-out' : 'Magic corner pull-out') + ' (' + un + ')', 1);
        } else if (u.type === 'slide') {
          slidePair(lbl, x + ec, fW, fY, fH, zf);
        } else if (u.drawers) {
          var sum = u.drawers.reduce(function (a, b) { return a + b; }, 0), yy = yTop - s.topGap;
          var runner = RUNNERS.filter(function (L) { return L <= dC - t - 10; })[0] || R(dC - t - 10);
          u.drawers.forEach(function (dh, di) {      // listed top to bottom
            var slot = fH * dh / sum, sTop = yy, sBot = yy - slot;
            var frH = R(slot - gap - J), frY = sBot + gap / 2;
            put('Drawer Front' + lbl, 'drawer', 'front', x + ec, base ? frY : frY + J, -DT, floor(fW), frH, DT, ['x', 'y'], JP ? 'shortened by the ' + J + ' mm J-profile' : '');
            handle(1);
            var bw = R(inW - s.runGap), by = Math.max(sBot + 15, yBot + t + 5);
            var bx = x + t + (inW - bw) / 2, cap = (di === 0 && base) ? yTop - (u.hob ? K.rail : t) - 5 : sTop - 5;   // under a hob the top box clears the upright front rail
            drawerBoxParts(lbl, bx, by, 0, bw, drawerBox(frH, cap - by), runner);
            yy = sBot;
          });
        } else if (u.type !== 'sink' && u.doorType && u.doorType !== 'hinged') {
          doorSet(u.doorType, un, lbl, x + ec, fW, fY, fY + fH, shelfLines, { n: u.doors || (w > 600 ? 2 : 1), zf: zf });
        } else {
          var nd = u.doors || (w > 600 ? 2 : 1), dW = floor((fW - gap * (nd - 1)) / nd), dH = R(fH - J);
          for (var q = 0; q < nd; q++) {
            put('Door' + lbl, 'door', 'door', x + ec + q * (dW + gap), base ? fY : fY + J, -DT, dW, dH, DT, ['x', 'y'], JP ? 'shortened by the ' + J + ' mm J-profile (' + (base ? 'top' : 'bottom') + ')' : '');
            handle(1);
            tally('Hinges (pair, soft close)', dH > 900 ? 2 : 1);
          }
        }
        if (u.cover) {   // island: the back of a one-sided unit shows, so it gets a cover panel
          put('Island Back Cover' + lbl, 'panel', '', x, yBot, dC + bt, w, H, t, ['y', 'x'], 'covers the back of the unit on the other side of the island');
        }
        if (u.hob && base) {
          var railGap = dC - 2 * t;
          if (u.hob.d > railGap) warn.push(un + ': hob cut-out ' + u.hob.d + ' mm deep but only ' + railGap + ' mm between the upright rails.');
        }
        if (u.sinkCut && base) {
          var g2 = dC - 2 * K.sinkRail;
          warn.push(un + ': sink cut-out ' + u.sinkCut.w + ' x ' + u.sinkCut.d + ' between top rails ' + g2 + ' mm apart' + (u.sinkCut.d > g2 ? ': TOO DEEP, move the rails' : (g2 - u.sinkCut.d < 20 ? ': only ' + (g2 - u.sinkCut.d) + ' mm to spare' : '')));
        }
        if (u.note) warn.push(un + ': ' + u.note);
        x += w; frontLen += w;
      });

      // L corner: back leg (u.w along the run) and return (u.r along the side wall, u.returnDepth deep)
      function cornerL(u, un) {
        var lbl = ' (' + un + ')', Lb = u.w, Lr = u.r, dR = u.returnDepth || dC, side = u.side || 'left';
        var M = function (xx, ww) { return side === 'left' ? xx : x + Lb - (xx - x) - ww; };   // mirror inside the unit
        var x0 = x, zR0 = Dr - Lr;                               // return runs from z = Dr - Lr (into the room) to the wall
        var Hh = H, y0 = yBot, y1 = yTop;
        var putM = function (n, tg, k, xx, y, z, ww, hh, dd, cut, note, ex) { return put(n, tg, k, M(xx, ww), y, z, ww, hh, dd, cut, note, ex); };
        // ends
        putM('Side Panel, end' + lbl, 'carcass', '', x0 + Lb - t, y0, 0, t, Hh, dC, ['y', 'z']);
        putM('Side Panel, return end' + lbl, 'carcass', '', x0 + bt, y0, zR0 + bt, dR, Hh, t, ['y', 'x']);
        // L pieces: one blank each, routed; the return part is drawn but not cut separately
        var bs = R(Math.max(Lb, Lr) - t - bt), blank = [bs, bs];   // machine shops cut squares; the L is cut out in the workshop (owner)
        function Lpiece(nm, y, note) {
          var o = putM(nm + lbl, 'carcass', '', x0 + bt, y, 0, Lb - t - bt, t, dC, ['x', 'z'], note);
          o.cut = blank;
          putM(nm + ' (return part)' + lbl, 'carcass', 'Lpart', x0 + bt, y, zR0 + bt + t, dR, t, -zR0 - bt - t, null, '');
        }
        Lpiece('L Bottom, routed', y0, 'shop cuts a ' + bs + ' square; cut the L out of it in the workshop: legs ' + R(Lb - t - bt) + ' x ' + R(Lr - t - bt) + ', inner corner out (back leg ' + R(dC) + ' deep, return ' + R(dR) + ' deep); band the two inner front edges by hand');
        if (base) {
          putM('Top Rail, flat front' + lbl, 'frame', '', x0 + bt + dR, y1 - t, 0, Lb - t - bt - dR, t, K.rail, ['x', 'z']);
          putM('Top Rail, flat front (return)' + lbl, 'frame', '', x0 + bt + dR - K.rail, y1 - t, zR0 + bt + t, K.rail, t, -zR0 - bt - t, ['z', 'x']);
          putM('Top Rail, flat back' + lbl, 'frame', '', x0 + bt + K.rail, y1 - t, dC - K.rail, Lb - t - bt - K.rail, t, K.rail, ['x', 'z']);
          putM('Top Rail, flat back (return)' + lbl, 'frame', '', x0 + bt, y1 - t, zR0 + bt + t, K.rail, t, dC - zR0 - bt - t, ['z', 'x']);
          tally('Cabinet legs ' + K.legH / 10 + ' cm', 8);
          if (u.carousel) { hwBox('Corner carousel' + lbl, x0 + bt + 40, y0 + 60, 40, Math.min(520, dR - 60), H - 140, Math.min(520, dR - 60)); tally('Corner carousel (' + un + ')', 1); }
        } else {
          Lpiece('L Top, routed', y1 - t, 'same blank as the bottom');
        }
        for (var i = 1; i <= (u.shelves || 0); i++) Lpiece('L Shelf, routed', y0 + t + i * (Hh - 2 * t) / ((u.shelves || 0) + 1) - t / 2, 'routed L, fixed (one piece)');
        putM('Back Rail, upright top' + lbl, 'frame', '', x0 + bt, y1 - t - K.rail - (base ? t : 0), dC - t, Lb - t - bt, K.rail, t, ['x', 'y'], 'screw through to the wall');
        putM('Back Rail, upright bottom' + lbl, 'frame', '', x0 + bt, y0 + t, dC - t, Lb - t - bt, K.rail, t, ['x', 'y']);
        putM('Back Rail, upright top (return)' + lbl, 'frame', '', x0 + bt, y1 - t - K.rail - (base ? t : 0), zR0 + bt + t, t, K.rail, dC - t - zR0 - bt - t, ['z', 'y']);
        putM('Back Rail, upright bottom (return)' + lbl, 'frame', '', x0 + bt, y0 + t, zR0 + bt + t, t, K.rail, dC - t - zR0 - bt - t, ['z', 'y']);
        putM('Back Panel (screwed on, ' + bt + 'mm)' + lbl, 'carcass', 'back', x0, y0, dC, Lb, Hh, bt, ['x', 'y']);
        putM('Back Panel, return (screwed on, ' + bt + 'mm)' + lbl, 'carcass', 'back', x0, y0, zR0, bt, Hh, dC - zR0, ['z', 'y']);
        // bi-fold pair across the inside corner
        var fY = y0 + s.botGap + (base ? 0 : J), fH = R(Hh - s.botGap - s.topGap - J);
        var aW = R(-zR0 - bt - ec), bW = R(Lb - bt - dR - DT - gap - ec);
        putM('Bi-fold Door, return leaf' + lbl, 'door', 'door', x0 + bt + dR, fY, zR0 + bt + ec, DT, fH, aW, ['z', 'y'], 'bi-fold, hinged to the next leaf');
        putM('Bi-fold Door, front leaf' + lbl, 'door', 'door', x0 + bt + dR + DT + gap, fY, -DT, bW, fH, DT, ['x', 'y'], 'bi-fold; hinge side as agreed');
        handle(2); tally('Bi-fold hinges (set)', 1);
      }

      // TALL unit (owner 2026-11-23): zones bottom to top, in one box or two stacked boxes, on legs.
      // Doors are chosen per box (u.boxDoors[i], else u.doorType): 'hinged' (cup hinges, the usual), 'liftHinge'
      // (lift-up on hinges with a gas or mechanical spring stay), 'liftFree' (lift-up fitting without hinges), 'slide'
      // (Accra sliding: flat bottom track, bigger top track; that box's carcass is set back by the track depth, the
      // side panels stay full depth). u.fold = one folding pair over every door zone (a customer's special request).
      // The microwave flap is a lift-up (u.lift: 'liftHinge' or 'liftFree'). Shelves: the count is what matters for
      // cutting; z.at (mm above the bottom of the space) places them exactly for the 3D and drawings.
      function tall(u, un) {
        var w = u.w, lbl = ' (' + un + ')', x0 = x, inW = w - 2 * t, top = u.top || spec.tallTop || K.tallTop, HT = top - K.legH;
        var zs = (u.zones || [{ k: 'shelves', h: 0, n: 4 }]).map(function (z) { return merge(z, {}); });
        var groups = [[]];
        zs.forEach(function (z) { if (z.k === 'split') groups.push([]); else groups[groups.length - 1].push(z); });
        groups = groups.filter(function (g) { return g.length; });
        if (groups.length === 1 && HT > tallMax) {   // too tall for one box: split before the first open-ended zone
          var g0 = groups[0], lo0 = [], used = 2 * t;
          for (var i = 0; i < g0.length - 1; i++) { var need = (g0[i].h || 0) + (lo0.length ? t : 0); if (!g0[i].h || used + need > tallMax) break; lo0.push(g0[i]); used += need; }
          if (lo0.length && lo0.length < g0.length) groups = [lo0, g0.slice(lo0.length)];
        }
        var bh = groups.map(function (g, gi) {
          if (gi === groups.length - 1) return 0;
          return 2 * t + (g.length - 1) * t + g.reduce(function (a2, z) { return a2 + (z.h || 0); }, 0);
        });
        bh[bh.length - 1] = HT - bh.reduce(function (a2, b2) { return a2 + b2; }, 0);
        if (groups.length > 1) warn.push(un + ': ' + top + ' tall, made as ' + groups.length + ' stacked boxes (' + bh.map(R).join(' + ') + ') on ' + K.legH + ' legs');
        bh.forEach(function (h, gi) { if (h > tallMax) warn.push(un + ': box ' + (gi + 1) + ' is ' + R(h) + ' tall; a ' + K.board + ' board (' + BD[0] + ') only allows about ' + tallMax + ' on legs. Split it or use a longer board.'); });
        function isDoorZone(z) { return (z.k === 'cubby' || z.k === 'shelves') && !z.open; }
        var boxType = groups.map(function (g, gi) { return u.fold ? 'fold' : ((u.boxDoors || [])[gi] || u.doorType || 'hinged'); });

        var y = K.legH, fronts = [], doorZones = [];
        groups.forEach(function (g, gi) {
          var Hb = bh[gi], yb = y, ye = y + Hb, box = groups.length > 1 ? (gi === 0 ? ', lower box' : ', upper box') : '';
          var zf = boxType[gi] === 'slide' && g.some(isDoorZone) ? K.slideD : 0, dd = dC - zf;   // sliding: carcass set back
          var hasOven = g.some(function (z) { return z.k === 'oven'; });
          put('Side Panel' + box + lbl, 'carcass', '', x0, yb, zf, t, Hb, dd, ['y', 'z'], zf ? 'set back ' + zf + ' for the sliding tracks' : '');
          put('Side Panel' + box + lbl, 'carcass', '', x0 + w - t, yb, zf, t, Hb, dd, ['y', 'z']);
          put('Bottom Panel' + box + lbl, 'carcass', '', x0 + t, yb, zf, inW, t, dd, ['x', 'z'], 'between the sides');
          put('Top Panel' + box + lbl, 'carcass', '', x0 + t, ye - t, zf, inW, t, dd, ['x', 'z'], 'between the sides' + (gi < groups.length - 1 ? '; the upper box sits on it, screw the two boxes together' : ''));
          put('Back Rail, upright top' + box + lbl, 'frame', '', x0 + t, ye - t - K.rail, dC - t, inW, K.rail, t, ['x', 'y'], 'screw through it to the wall');
          put('Back Rail, upright bottom' + box + lbl, 'frame', '', x0 + t, yb + t, dC - t, inW, K.rail, t, ['x', 'y']);
          put('Back Panel (screwed on, ' + bt + 'mm)' + box + lbl, 'carcass', 'back', x0, yb, dC, w, Hb, bt, ['x', 'y'], hasOven ? 'cut a vent opening behind the oven' : '');
          var inner = Hb - 2 * t - (g.length - 1) * t, fixedSum = g.reduce(function (a2, z) { return a2 + (z.h || 0); }, 0);
          var rest = g.filter(function (z) { return !z.h; }), spare = inner - fixedSum;
          if (rest.length) rest.forEach(function (z) { z.h = spare / rest.length; });
          else if (Math.abs(spare) > 1) g[g.length - 1].h += spare;
          var yy = yb + t;
          g.forEach(function (z, zi) {
            var zb = yy, zt = yy + z.h;
            var lo = zi === 0 ? (gi === 0 ? yb + s.botGap : yb + gap / 2) : zb - t / 2 + gap / 2;
            var hi = zi === g.length - 1 ? (gi === groups.length - 1 ? ye - s.topGap : ye - gap / 2) : zt + t / 2 - gap / 2;
            if (z.k === 'drawer') {
              var n = z.n || 1, sw = (inW - (n - 1) * t) / n, runner = RUNNERS.filter(function (L) { return L <= dd - t - 10; })[0] || R(dd - t - 10);
              var frontH = hi - lo - J, boxH = drawerBox(frontH, z.h - 10);
              for (var q = 1; q < n; q++) put('Divider, drawer row' + lbl, 'carcass', '', x0 + t + q * sw + (q - 1) * t, zb, zf, t, z.h, dd - t, ['y', 'z'], 'fixed between the shelves; stops at the back rails');
              for (q = 0; q < n; q++) {
                var bw = R(sw - s.runGap), bx = x0 + t + q * (sw + t) + (sw - bw) / 2, by = zb + 5;
                drawerBoxParts(lbl, bx, by, zf, bw, boxH, runner);
              }
              fronts.push({ k: 'drawer', lo: lo, hi: hi, n: n });
            } else if (z.k === 'oven') {
              if (inW < K.ovenW) warn.push(un + ': oven niche only ' + R(inW) + ' wide inside; a 60 built-in oven needs ' + K.ovenW + '.');
              if (z.h < K.ovenH - 0.5) warn.push(un + ': oven niche only ' + R(z.h) + ' high; it needs ' + K.ovenH + '.');
              warn.push(un + ': vent the back behind the oven (cut the back panel); the unit is only ' + dC + ' deep.');
            } else if (z.k === 'micro') {
              fronts.push({ k: 'flap', lo: lo, hi: hi });
            } else if (z.k === 'cubby') {
              var rows = z.rows || 2, cols = z.cols || 3, cw = (inW - (cols - 1) * t) / cols;
              for (var c2 = 1; c2 < cols; c2++) put('Divider, cubbies' + lbl, 'carcass', '', x0 + t + c2 * cw + (c2 - 1) * t, zb, zf, t, z.h, dd - t, ['y', 'z'], 'fixed; stops at the back rails');
              for (c2 = 0; c2 < cols; c2++) for (var r2 = 1; r2 < rows; r2++)
                put('Shelf, cubby' + lbl, 'shelf', '', x0 + t + c2 * (cw + t), zb + r2 * (z.h - (rows - 1) * t) / rows + (r2 - 1) * t, zf, cw, t, dd - t, ['x', 'z'], 'fixed between the dividers');
              var cl = [];
              for (r2 = 1; r2 < rows; r2++) cl.push(zb + r2 * (z.h - (rows - 1) * t) / rows + (r2 - 1) * t + t / 2);
              if (!z.open) doorZones.push({ lo: lo, hi: hi, box: gi, lines: cl });
            } else {   // shelves, adjustable: the count is what gets cut; z.at places them (mm above the bottom of the space)
              var nS = z.n == null ? 2 : z.n, set = K.baseShelfSet, sl = [];
              for (var i2 = 1; i2 <= nS; i2++) {
                var at = z.at && z.at[i2 - 1] != null ? z.at[i2 - 1] : null, sy = at != null ? zb + at : zb + i2 * z.h / (nS + 1) - t / 2;
                sl.push(sy + t / 2);
                put('Shelf, adjustable' + lbl, 'shelf', '', x0 + t + s.shelfClear, sy, zf + set, inW - 2 * s.shelfClear, t, R(dd - set), ['x', 'z'], s.shelfClear + ' mm clearance each side, set back ' + set + (at != null ? '' : '; placed on site'));
              }
              if (!z.open) doorZones.push({ lo: lo, hi: hi, box: gi, lines: sl });
            }
            yy = zt;
            if (zi < g.length - 1) { put('Shelf, fixed' + lbl, 'shelf', '', x0 + t, yy, zf, inW, t, dd, ['x', 'z'], 'fixed through the sides (confirmat or dowel)'); yy += t; }
          });
          y = ye;
          if (gi === 0 && groups.length > 1) tallJoint = ye;
        });
        // door groups: neighbouring shelf/cubby zones in one box share doors; a fold runs over all of them
        var dg = [];
        doorZones.forEach(function (d) {
          var last = dg[dg.length - 1];
          if (last && (u.fold || last.box === d.box) && d.lo - last.hi < t + 2 * gap + 1) { last.lines = last.lines.concat([(last.hi + d.lo) / 2], d.lines || []); last.hi = d.hi; }
          else dg.push({ lo: d.lo, hi: d.hi, box: d.box, lines: (d.lines || []).slice() });
        });
        var fW = w - 2 * ec;
        // the J-profile goes on an edge within reach (owner: at hand height): the top edge while it is under K.reach,
        // else the bottom edge; u.pull forces one
        function edgeFor(lo, hi, prefer) {
          if (!JP) return 'top';
          var p = u.pull || prefer;
          if (p === 'bottom' && lo + J <= K.reach) return 'bottom';
          if (p === 'top' && hi <= K.reach) return 'top';
          if (hi <= K.reach) return 'top';
          if (lo + J <= K.reach) return 'bottom';
          warn.push(un + ': no edge of a ' + R(hi - lo) + ' front starting at ' + R(lo) + ' is within reach (' + K.reach + '); use a knob or handle there.');
          return 'bottom';
        }
        function front(nm, k, xx, ww, lo, hi, jEdge, note, z0) {
          var h = R(hi - lo - J), yF = JP && jEdge === 'bottom' ? lo + J : lo;
          put(nm + lbl, k === 'door' ? 'door' : 'drawer', k === 'door' ? 'door' : 'front', xx, yF, z0 == null ? -DT : z0, ww, h, DT, ['x', 'y'], (JP ? 'shortened by the ' + J + ' mm J-profile (' + jEdge + ')' : '') + (note ? (JP ? '; ' : '') + note : ''));
          handle(1);
          return h;
        }
        function lift(kind, h) {
          if (kind === 'liftFree') tally('Lift-up fitting, hingeless (set)', 1);
          else { tally('Hinges (pair, soft close)', 1); tally('Lift-up stay, gas or mechanical spring (pair)', 1); }
          if (h > 900) warn.push(un + ': lift-up door ' + R(h) + ' tall: check the fitting takes that size and weight.');
        }
        fronts.forEach(function (f) {
          if (f.k === 'drawer') { var fw2 = floor((fW - (f.n - 1) * gap) / f.n), e1 = edgeFor(f.lo, f.hi, 'top'); for (var q = 0; q < f.n; q++) front('Drawer Front', 'front', x0 + ec + q * (fw2 + gap), fw2, f.lo, f.hi, e1); }
          else lift(u.lift || 'liftHinge', front('Lift-up Flap', 'door', x0 + ec, fW, f.lo, f.hi, edgeFor(f.lo, f.hi, 'bottom'), 'opens upwards'));
        });
        dg.forEach(function (d) {
          var ty = u.fold ? 'fold' : boxType[d.box], e2 = edgeFor(d.lo, d.hi);
          if (ty === 'fold') {
            var lw = floor((fW - gap) / 2);
            front('Folding Door Leaf', 'door', x0 + ec, lw, d.lo, d.hi, e2, 'folds in two');
            front('Folding Door Leaf', 'door', x0 + ec + lw + gap, lw, d.lo, d.hi, e2, 'folds in two');
            tally('Folding door system (180 degree, 2 leaves)', 1);
            if (d.hi - d.lo > 2000) warn.push(un + ': folding leaves ' + R(d.hi - d.lo) + ' tall: check the fitting takes that height and weight.');
          } else if (ty === 'liftHinge' || ty === 'liftFree' || ty === 'liftFold') {
            doorSet(ty, un, lbl, x0 + ec, fW, d.lo, d.hi, d.lines);
          } else if (ty === 'slide') {
            slidePair(lbl, x0 + ec, fW, d.lo, d.hi - d.lo, K.slideD);
          } else {
            var nd = u.doors || (w > 600 ? 2 : 1), dw = floor((fW - gap * (nd - 1)) / nd);
            for (var q = 0; q < nd; q++) {
              var dh = front('Door', 'door', x0 + ec + q * (dw + gap), dw, d.lo, d.hi, e2);
              tally('Hinges (pair, soft close)', dh > 2000 ? 3 : dh > 900 ? 2 : 1);
            }
          }
        });
        tally('Cabinet legs ' + K.legH / 10 + ' cm', w > 800 ? 6 : 4);
        if (u.note) warn.push(un + ': ' + u.note);
      }

      if (base && !run.isl && frontLen > 0) tally('Toe kick 3 m (' + run.name + ')', Math.ceil(frontLen / K.toeLen));
      (run.items || []).forEach(function (it) { tally(it, 1); });
    });

    // island ends and the gloss band under the quartz (owner: 10 cm band; legs and a toe kick all round)
    islands.forEach(function (I) {
      var run = I.run, nm = ' (' + (run.name || 'Island') + ')', L = I.L, D = I.D, A0 = -I.outA, B1 = D + I.outB;
      function iput(name, tag, lx, y, lz, bw, bh, bd, cut, note) {   // island-local: lx along, lz across from side a's fronts
        var ext = { x: bw, y: bh, z: bd }, o = { name: name, tag: tag, kind: tag, y: y, h: bh, cut: [R(ext[cut[0]]), R(ext[cut[1]])], note: note || '', run: run.name };
        if ((run.axis || 'z') === 'x') { o.x = (run.x || 0) + lx; o.w = bw; o.z = (run.z || 0) + D - lz - bd; o.d = bd; }
        else { o.x = (run.x || 0) + lz; o.w = bd; o.z = (run.z || 0) + lx; o.d = bw; }
        boxes.push(o);
      }
      iput('Island End Panel' + nm, 'panel', -t, 0, A0, t, I.iTop, B1 - A0, ['y', 'z'], 'floor to the top panel');
      iput('Island End Panel' + nm, 'panel', L, 0, A0, t, I.iTop, B1 - A0, ['y', 'z'], 'floor to the top panel');
      // the quartz sits on one panel the size of the top less its doubled edge on every side (owner 2026-11-23)
      var e = run.edge == null ? K.edgeW : run.edge, ohS = run.ohStart || 0, ohE = run.ohEnd || 0, Wt = run.topW || (B1 - A0), Lt = L + ohS + ohE;
      iput('Island Top Panel' + nm, 'panel', -ohS + e, I.iTop, (D - Wt) / 2 + e, Lt - 2 * e, t, Wt - 2 * e, ['x', 'z'], 'the quartz top (' + Lt + ' x ' + Wt + ') less its ' + e + ' doubled edge all round; screw it down onto the carcasses');
      tally('Toe kick 3 m (' + (run.name || 'Island') + ', all round)', Math.ceil((2 * L + 2 * D) / K.toeLen));
    });

    // ceiling filler strips (scribed on site) over every wall run: parts only, not placed in 3D
    var extra = [];
    spec.runs.forEach(function (run) {
      if ((run.kind || 'base') === 'base' || !run.ceilingFiller) return;
      var L = run.units.reduce(function (a, u) { return a + (u.type === 'gap' ? 0 : u.w); }, 0), left = L;
      while (left > 0) { var piece = R(Math.min(2400, left)); extra.push({ name: 'Ceiling Filler Strip (' + run.name + ')', tag: 'panel', a: piece, b: run.ceilingFiller, qty: 1, note: 'scribe to the ceiling on site; joins over a unit side' }); left -= piece; }
    });
    // every cut part must fit the chosen board
    cutList(boxes).concat(extra).forEach(function (p) {
      var L = Math.max(p.a, p.b), Wd = Math.min(p.a, p.b);
      if (L > BD[0] || Wd > BD[1]) warn.push(p.name + ' is ' + L + ' x ' + Wd + ', bigger than a ' + K.board + ' board (' + BD[0] + ' x ' + BD[1] + ').');
    });
    return { boxes: boxes, warnings: warn, hardware: hw, extra: extra };
  }

  function build(spec) {
    if (spec && spec.type === 'kitchen') {
      var k = kitchen(spec);
      return { boxes: k.boxes, parts: cutList(k.boxes).concat(k.extra), clashes: clashes(k.boxes), warnings: k.warnings.filter(function (v, i, l) { return l.indexOf(v) === i; }), hardware: k.hardware };
    }
    var m = wardrobe(spec);   // wardrobes
    return { boxes: m.boxes, parts: cutList(m.boxes), clashes: clashes(m.boxes), warnings: m.warnings };
  }

  var api = { SHOP: SHOP, KSHOP: KSHOP, BOARDS: BOARDS, build: build, cutList: cutList, clashes: clashes, forViewer: forViewer, edges: edges };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartEngine = api;
})(typeof window !== 'undefined' ? window : this);
