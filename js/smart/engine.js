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

  function build(spec) {
    var m = wardrobe(spec);   // wardrobe units first; kitchen units follow once their rules are settled
    return { boxes: m.boxes, parts: cutList(m.boxes), clashes: clashes(m.boxes), warnings: m.warnings };
  }

  var api = { SHOP: SHOP, build: build, cutList: cutList, clashes: clashes, forViewer: forViewer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartEngine = api;
})(typeof window !== 'undefined' ? window : this);
