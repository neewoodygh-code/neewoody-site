/* Cutlist 3D view (built 2026-11-18).
 * Every part is placed from the cut list itself: sizes come from calculate().parts, this file only
 * decides WHERE each part sits. buildModel() also checks that every part on the list appears in the
 * model exactly qty times (Cutlist3D.check), so the picture cannot quietly drift from the cut list.
 * Model axes (mm): x = left to right, y = floor up, z = carcass front (0) to back (+depth).
 * three.js r160 is self-hosted in js/vendor/three/ as plain scripts (window.THREE), loaded only when the
 * 3D view or a result is opened. Plain scripts (not modules) so the same code also runs inside the offline
 * client viewer file (Cutlist3D.offlineHTML) and from file://.
 * Exports (2026-11-19): offlineHTML() = one self-contained .html a client can open with no internet;
 * toDAE() = COLLADA for SketchUp (File > Import), millimetres, Z up, one named component per part. */
(function () {
  var THREE = null, Orbit = null, loading = null;
  var SELF = (document.currentScript && document.currentScript.src) || '';
  var BASE = SELF.replace(/[^\/]*$/, '') + 'vendor/three/';
  function addScript(src) {
    return new Promise(function (res, rej) {
      var el = document.createElement('script'); el.src = src; el.onload = res;
      el.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(el);
    });
  }
  function load() {
    if (!loading) loading = (window.THREE && window.THREE_OrbitControls ? Promise.resolve()
      : addScript(BASE + 'three.min.js?v=r160').then(function () { return addScript(BASE + 'OrbitControls.js?v=r160'); })
    ).then(function () { THREE = window.THREE; Orbit = window.THREE_OrbitControls; });
    return loading;
  }

  // ───────────────────────── model ─────────────────────────
  function buildModel(S, r) {
    var g = r.geo, t = S.thick, h = S.h, d = S.d, out = [], warn = [];
    var q = {};
    r.parts.forEach(function (p) { (q[p.name] = q[p.name] || []).push(p); });
    function take(n) { var a = q[n]; return a && a.length ? a.shift() : null; }
    function add(p, x, y, z, sx, sy, sz, kind) {
      out.push({ p: p, name: p ? p.name : '', tag: p ? p.tag : 'hw', kind: kind || (p ? p.tag : 'hw'),
        x: x, y: y, z: z, w: Math.max(sx, 1), h: Math.max(sy, 1), d: Math.max(sz, 1) });
    }
    var U = S.modUnits || 1, tkH = S.tkH, tk = S.tkThick, dT = S.doorThick;

    // carcass + subframe, per unit
    var side = take('Side Panel'), top = take('Top Panel'), bot = take('Bottom Panel'),
        div = take('Internal Divider'), back = null;
    r.parts.forEach(function (p) { if (!back && p.name.indexOf('Back Panel') === 0) back = take(p.name); });
    var fr = take('Subframe Front Rail'), br = take('Subframe Back Rail'), mr = take('Subframe Mid-Rail'),
        fp = take('Subframe Face Panel (Toe Kick)');
    var setb = S.tkStyle === 'setback' ? S.tkSetback : 0;
    for (var u = 0; u < U; u++) {
      var x0 = u * g.unitW;
      var sy = h - side.w;  // 0 when the sides run to the floor, frame height when they stand on a separate plinth
      add(side, x0, sy, 0, t, side.w, side.d);
      add(side, x0 + g.unitW - t, sy, 0, t, side.w, side.d);
      add(top, x0 + t, h - t, 0, top.w, t, top.d);
      add(bot, x0 + t, tkH, 0, bot.w, t, bot.d);
      for (var k = 1; k <= g.divsPerUnit; k++) add(div, x0 + t + k * g.unitOpenW + (k - 1) * t, tkH + t, 0, t, div.w, div.d);
      if (back) {
        if (S.backType === 'inset') add(back, x0 + t - g.grooveIn, tkH + t - g.grooveIn, g.panelD, back.w, back.d, S.backThick);
        else add(back, x0, tkH, d, back.w, back.d, S.backThick);
      }
      // subframe: positions follow the cut list's sizes; see the construction notes for how it is fixed
      var rx = fr ? x0 + (g.unitW - fr.w) / 2 : x0;  // rails sit between the sides (built in) or span the unit (separate plinth)
      // face panel at the set back, front rail behind it, mid-rails sandwiched between the front and back rails
      if (fr) add(fr, rx, 0, setb + tk, fr.w, fr.d, tk);
      if (br) add(br, rx, 0, d - tk, br.w, br.d, tk);
      if (mr && fr) for (var i = 0; i < g.mrCount; i++) {
        var mx = g.mrCount > 1 ? rx + i * (fr.w - tk) / (g.mrCount - 1) : rx + fr.w / 2;
        add(mr, mx, 0, setb + 2 * tk, tk, mr.d, mr.w);
      }
      if (fp) add(fp, x0 + (g.unitW - fp.w) / 2, 0, setb, fp.w, fp.d, tk);
    }

    // sections
    var spu = g.secsPerUnit;
    S.secs.forEach(function (sec, si) {
      var sn = 'Sec ' + (si + 1);
      var u = Math.floor(si / spu), j = si % spu;
      var sx = u * g.unitW + t + j * (g.unitOpenW + t), ow = g.unitOpenW;
      var lov = g.spans[si][0];
      // zones stack from the top, scaled to the inner height (same as the flat front view)
      var sumZ = sec.zones.reduce(function (s, z) { return s + (z.h || 0); }, 0) || 1;
      var sc = g.innerH / sumZ, yTop = h - t;
      sec.zones.forEach(function (z) {
        var zh = z.h * sc, yb = yTop - zh;
        if (z.type === 'shelves' && z.shelves > 0) {
          var sp = take('Shelf (' + sn + ')');
          for (var i = 1; i <= z.shelves; i++) add(sp, sx + S.clear, yb + i * zh / (z.shelves + 1) - t / 2, 50, sp.w, t, sp.d);
        } else if (z.type === 'hanging') {
          add(null, sx + 15, yTop - 70, d / 2 - 12, ow - 30, 25, 25, 'hw');
        } else if (z.type === 'drawers' && z.drawers > 0) {
          var n = z.drawers, bs, bf, bb;
          if (sec.door.on) {
            var cn = 'Drawer Chest (' + sn + ')';
            var cs = take(cn + ' Side'), ct = take(cn + ' Top/Bottom'), cfl = take(cn + ' Filler Strip'), cfs = take(cn + ' Face Strip');
            var cf = take('Drawer Front (' + sn + ', inside)');
            bs = take('Drawer Box Side (' + sn + ')'); bf = take('Drawer Box Front/Back (' + sn + ')'); bb = take('Drawer Base (' + sn + ')');
            var chH = cs.w, chW = ct.w + 2 * t, cx = sx + (ow - chW) / 2, cz = S.chSet;
            add(cs, cx, yb, cz, t, chH, cs.d); add(cs, cx + chW - t, yb, cz, t, chH, cs.d);
            add(ct, cx + t, yb, cz, ct.w, t, ct.d); add(ct, cx + t, yb + chH - t, cz, ct.w, t, ct.d);
            add(cfl, sx, yb, cz, cfl.d, cfl.w, t); add(cfl, sx + ow - cfl.d, yb, cz, cfl.d, cfl.w, t);
            add(cfs, sx, yb, cz - t, cfs.d, cfs.w, t); add(cfs, sx + ow - cfs.d, yb, cz - t, cfs.d, cfs.w, t);
            for (var i2 = 0; i2 < n; i2++) add(cf, sx + cfs.d + S.chFGap, yb + i2 * chH / n + S.dgap / 2, cz - t, cf.w, cf.d, t, 'front');
            var slot = (chH - 2 * t) / n, bw = bb.w;
            for (var i3 = 0; i3 < n; i3++) box(cx + (chW - bw) / 2, yb + t + i3 * slot + 6, cz, bs, bf, bb);
          } else {
            var df = take('Drawer False Front (' + sn + ')');
            bs = take('Drawer Box Side (' + sn + ')'); bf = take('Drawer Box Front/Back (' + sn + ')'); bb = take('Drawer Base (' + sn + ')');
            var slot2 = z.h / n, yb2 = yb + Math.max(0, zh - z.h);
            for (var i4 = 0; i4 < n; i4++) {
              add(df, sx - lov, yb2 + i4 * slot2 + S.dgap / 2, -dT, df.w, df.d, dT, 'front');
              box(sx + (ow - bb.w) / 2, yb2 + i4 * slot2 + 6, 0, bs, bf, bb);
            }
          }
        }
        yTop = yb;
      });
      // doors
      if (sec.door.on) {
        if (sec.door.type === 'hinged') {
          var dp = take('Door (' + sn + ')'), nd = dp ? dp.qty : 0;
          var dy = sec.door.bottom === 'panel' ? tkH + S.botgap : S.botgap;
          for (var di = 0; di < nd; di++) add(dp, sx - lov + di * (dp.w + S.dgap), dy, -dT, dp.w, dp.d, dT, 'door');
        } else {
          var lp = take('Sliding Door Leaf (' + sn + ')');
          var ly = sec.door.bottom === 'panel' ? tkH + 10 : 10;
          for (var li = 0; li < lp.qty; li++) add(lp, li % 2 ? sx + ow - lp.w : sx, ly, -dT * (1 + (li % 2)), lp.w, lp.d, dT, 'door');
        }
      }
    });
    function box(bx, by, bz, bs, bf, bb) {
      // drawer box (owner's way): base underneath, front and back full width, sides between them
      var bw = bb.w, bl = bb.d, bh = bs.d, ft = (bl - bs.w) / 2;
      add(bb, bx, by, bz, bw, t, bl);
      add(bf, bx, by + t, bz, bf.w, bh, ft); add(bf, bx, by + t, bz + bl - ft, bf.w, bh, ft);
      add(bs, bx, by + t, bz + ft, t, bh, bs.w); add(bs, bx + bw - t, by + t, bz + ft, t, bh, bs.w);
    }
    // applied end panels and pelmet
    var lp2 = take('Left Applied End Panel'), rp = take('Right Applied End Panel'), pel = take('Top Pelmet');
    if (lp2) add(lp2, -S.spThick, 0, d - lp2.d, S.spThick, lp2.w, lp2.d);
    if (rp) add(rp, S.w, 0, d - rp.d, S.spThick, rp.w, rp.d);
    if (pel) add(pel, 0, h, -dT, pel.w, pel.d, t);

    // check: every part used exactly qty times
    var used = {};
    out.forEach(function (b) { if (b.p) used[b.p.name + '|' + b.p.w + 'x' + b.p.d] = (used[b.p.name + '|' + b.p.w + 'x' + b.p.d] || 0) + 1; });
    var need = {};
    r.parts.forEach(function (p) { var key = p.name + '|' + p.w + 'x' + p.d; need[key] = (need[key] || 0) + p.qty; });
    Object.keys(need).forEach(function (key) { if ((used[key] || 0) !== need[key]) warn.push(key.split('|')[0] + ': cut list ' + need[key] + ', model ' + (used[key] || 0)); });
    return { boxes: out, warnings: warn };
  }

  // Parts that run into each other (more than 0.5 mm on every axis). The inset back sits in its groove,
  // so it is left out; everything else, the subframe included, is checked.
  function clashes(boxes) {
    var list = [], B = boxes.filter(function (b) { return b.tag !== 'hw' && b.name.indexOf('Back Panel') !== 0; });
    for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++) {
      var a = B[i], b = B[j];
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y), oz = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
      if (ox > 0.5 && oy > 0.5 && oz > 0.5) list.push(a.name + ' / ' + b.name + ' (' + Math.round(Math.min(ox, oy, oz)) + 'mm)');
    }
    return list.filter(function (v, i, s) { return s.indexOf(v) === i; });
  }

  // ───────────────────────── render ─────────────────────────
  var COL = { carcass: 0xe9dfcf, frame: 0x8a7a66, shelf: 0xd8ccb8, drawer: 0xcbb89c, front: 0x6b4a33, door: 0x6b4a33, panel: 0xddd2bf, hw: 0x9a9a9a };
  function scene(boxes, opt) {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0xefe9df);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xb9ab94, 1.1));
    var dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(-1, 2, 1.5); sc.add(dl);
    var group = new THREE.Group(); sc.add(group);
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    boxes.forEach(function (b) {
      var col = COL[b.kind] || COL[b.tag] || 0xdddddd;
      var mat = new THREE.MeshStandardMaterial({ color: col, roughness: .85, metalness: b.tag === 'hw' ? .6 : 0, transparent: true });
      var m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
      // model z grows toward the back; three.js looks down -z, so flip it
      m.position.set(b.x + b.w / 2, b.y + b.h / 2, -(b.z + b.d / 2));
      m.userData.box = b; m.userData.home = m.position.clone();
      var e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x3a3026, transparent: true, opacity: .55 }));
      m.add(e);
      group.add(m);
      lo = [Math.min(lo[0], b.x), Math.min(lo[1], b.y), Math.min(lo[2], -(b.z + b.d))];
      hi = [Math.max(hi[0], b.x + b.w), Math.max(hi[1], b.y + b.h), Math.max(hi[2], -b.z)];
    });
    var c = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
    var size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    var radius = Math.sqrt(Math.pow(hi[0] - lo[0], 2) + Math.pow(hi[1] - lo[1], 2) + Math.pow(hi[2] - lo[2], 2)) / 2;
    return { scene: sc, group: group, centre: c, size: size, radius: radius };
  }
  function place(cam, s, aspect) {
    cam.aspect = aspect; cam.near = s.size / 100; cam.far = s.size * 20; cam.updateProjectionMatrix();
    // fit the whole model on any screen shape: use the narrower of the two viewing angles
    var v = cam.fov * Math.PI / 180, hz = 2 * Math.atan(Math.tan(v / 2) * aspect);
    var dist = s.radius / Math.sin(Math.min(v, hz) / 2) * 1.02;
    var n = Math.sqrt(.5 * .5 + .32 * .32 + .88 * .88);
    cam.position.set(s.centre.x - dist * .5 / n, s.centre.y + dist * .32 / n, s.centre.z + dist * .88 / n);
    cam.lookAt(s.centre);
  }
  function setExplode(s, k) {
    s.group.children.forEach(function (m) {
      var b = m.userData.box, home = m.userData.home;
      var v = home.clone().sub(s.centre).multiplyScalar(k * .45);
      if (b.kind === 'door' || b.kind === 'front') v.z += k * s.size * .35;
      if (b.tag === 'drawer' && b.kind !== 'front') v.z += k * s.size * .15;
      m.position.copy(home).add(v);
    });
  }
  function setDoors(s, mode) {
    s.group.children.forEach(function (m) {
      if (m.userData.box.kind !== 'door') return;
      m.visible = mode !== 'hide';
      m.material.opacity = mode === 'ghost' ? .08 : 1;
      m.children[0].material.opacity = mode === 'ghost' ? .35 : .55;
    });
  }

  // Live viewer inside the diagram card
  var V = null;
  function show(host, S, r, opt) {
    var m = buildModel(S, r);
    if (m.warnings.length && window.console) console.warn('Cutlist 3D: cut list and model differ', m.warnings);
    return mount(host, m.boxes, opt);
  }
  function mount(host, boxes, opt) {
    opt = opt || {};
    if (!V) {
      host.innerHTML = '<div class="c3d-stage" style="position:relative;height:' + (opt.height || 'clamp(300px,58vw,440px)') + '"><div class="c3d-msg" style="position:absolute;inset:0;display:grid;place-items:center;font-size:.85rem;color:#554d43">Loading the 3D view…</div></div>' +
        '<div class="c3d-ui" style="display:flex;flex-wrap:wrap;gap:.6rem 1.2rem;align-items:center;padding:.6rem .8rem;border-top:1px solid rgba(0,0,0,.08);font-size:.8rem">' +
        '<label style="display:flex;gap:.5rem;align-items:center">Pull apart <input type="range" class="c3d-x" min="0" max="1" step="0.01" value="0" style="width:120px"></label>' +
        '<label style="display:flex;gap:.5rem;align-items:center">Doors <select class="c3d-d"><option value="ghost">See-through</option><option value="show">Show</option><option value="hide">Hide</option></select></label>' +
        '<span style="display:flex;gap:.35rem"><button type="button" class="c3d-zi" aria-label="Zoom in" style=\"font:inherit;font-size:.8rem;min-width:2.2rem;padding:.3rem .6rem;border:1px solid rgba(0,0,0,.25);border-radius:6px;background:#fff;cursor:pointer\">+</button><button type="button" class="c3d-zo" aria-label="Zoom out" style=\"font:inherit;font-size:.8rem;min-width:2.2rem;padding:.3rem .6rem;border:1px solid rgba(0,0,0,.25);border-radius:6px;background:#fff;cursor:pointer\">&minus;</button><button type="button" class="c3d-rs" style=\"font:inherit;font-size:.8rem;min-width:2.2rem;padding:.3rem .6rem;border:1px solid rgba(0,0,0,.25);border-radius:6px;background:#fff;cursor:pointer\">Reset view</button></span>' +
        '<span class="c3d-info" style="flex:1 1 100%;color:#554d43">Drag (one finger) to turn. Pinch, Ctrl + scroll or the + and &minus; buttons to zoom. Tap a part to see its size.</span></div>';
      V = { host: host };
    }
    V.boxes = boxes;
    return load().then(function () {
      var stage = host.querySelector('.c3d-stage');
      if (!V.renderer) {
        V.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        V.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        stage.innerHTML = ''; stage.appendChild(V.renderer.domElement);
        V.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
        V.cam = new THREE.PerspectiveCamera(35, 1, 1, 1e6);
        V.ctl = new Orbit(V.cam, V.renderer.domElement); V.ctl.enableDamping = true;
        host.querySelector('.c3d-x').oninput = function () { if (V.s) setExplode(V.s, +this.value); };
        host.querySelector('.c3d-d').onchange = function () { if (V.s) setDoors(V.s, this.value); };
        // A plain scroll (mouse wheel, or a two-finger swipe on a laptop touchpad) scrolls the page instead of
        // zooming the model; zoom = pinch, Ctrl + scroll (touchpad pinch sends this) or the buttons.
        stage.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.stopPropagation(); }, true);
        function zoom(f) { if (!V.s) return; var t = V.ctl.target; V.cam.position.sub(t).multiplyScalar(f).add(t); V.ctl.update(); }
        host.querySelector('.c3d-zi').onclick = function () { zoom(0.8); };
        host.querySelector('.c3d-zo').onclick = function () { zoom(1.25); };
        host.querySelector('.c3d-rs').onclick = function () { if (V.s) { place(V.cam, V.s, aspect()); V.ctl.target.copy(V.s.centre); V.ctl.update(); } };
        var ray = new THREE.Raycaster(), down = null;
        V.renderer.domElement.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
        V.renderer.domElement.addEventListener('pointerup', function (e) {
          if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 6 || !V.s) return;
          var rc = V.renderer.domElement.getBoundingClientRect();
          ray.setFromCamera(new THREE.Vector2((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1), V.cam);
          var hits = ray.intersectObjects(V.s.group.children.filter(function (m) { return m.visible && m.material.opacity > .5; }), false);
          V.s.group.children.forEach(function (m) { m.material.emissive && m.material.emissive.setHex(0); });
          var info = host.querySelector('.c3d-info');
          if (!hits.length) { info.textContent = 'Tap a part to see its size.'; return; }
          var m = hits[0].object, b = m.userData.box; m.material.emissive.setHex(0x553311);
          info.textContent = b.p ? b.p.name + ': ' + b.p.w + ' × ' + b.p.d + ' mm' + (opt.client ? '' : ' (' + b.p.qty + ' on the cut list)') : 'Hanging rail' + (opt.client ? '' : ' (hardware, not on the cut list)');
        });
        new ResizeObserver(function () { size(); }).observe(stage);
        (function loop() { requestAnimationFrame(loop); if (V.s) { V.ctl.update(); V.renderer.render(V.s.scene, V.cam); } })();
      }
      var first = !V.s;
      if (V.s) V.s.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      V.s = scene(V.boxes);
      setExplode(V.s, +host.querySelector('.c3d-x').value);
      setDoors(V.s, host.querySelector('.c3d-d').value);
      size(first);
      if (first) { place(V.cam, V.s, aspect()); V.ctl.target.copy(V.s.centre); }
    }).catch(function (e) {
      host.querySelector('.c3d-stage').innerHTML = '<div style="padding:2rem;text-align:center;font-size:.85rem;color:#554d43">The 3D view could not load here' + (location.protocol === 'file:' ? ' (open the page through a web server, not as a file)' : '') + '. The front and side views still work.</div>';
      if (window.console) console.warn(e);
    });
    function aspect() { var st = host.querySelector('.c3d-stage'); return st.clientWidth / Math.max(st.clientHeight, 1); }
    function size(skip) {
      var st = host.querySelector('.c3d-stage'); if (!V.renderer || !st.clientWidth) return;
      V.renderer.setSize(st.clientWidth, st.clientHeight, false);
      V.cam.aspect = aspect(); V.cam.updateProjectionMatrix();
    }
  }

  // Still picture for the results page and the printout
  function snapshot(S, r, w, h) {
    return load().then(function () {
      var rd = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      rd.setSize(w || 1400, h || 1000, false);
      var s = scene(buildModel(S, r).boxes); setDoors(s, 'ghost');
      var cam = new THREE.PerspectiveCamera(35, 1, 1, 1e6); place(cam, s, (w || 1400) / (h || 1000));
      rd.render(s.scene, cam);
      var url = rd.domElement.toDataURL('image/png');
      s.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      rd.dispose();
      return url;
    });
  }

  // ───────────────────────── exports ─────────────────────────
  function esc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function slim(boxes) {  // what the offline file needs: placement + the part's name and size, no notes
    return boxes.map(function (b) {
      return { x: b.x, y: b.y, z: b.z, w: b.w, h: b.h, d: b.d, tag: b.tag, kind: b.kind, name: b.name,
        p: b.p ? { name: b.p.name, w: b.p.w, d: b.p.d, qty: b.p.qty } : null };
    });
  }
  var GROUPS = { carcass: 'Carcass', frame: 'Subframe', shelf: 'Shelves', drawer: 'Drawers', door: 'Doors', panel: 'End panels', hw: 'Hardware' };

  // COLLADA 1.4 for SketchUp: mm, Z up (SketchUp's blue axis), x right, y to the back.
  // Each different part becomes one component; parts sit in groups by type, so doors hide in one click.
  function toDAE(boxes, title) {
    var geos = {}, defs = {}, mats = {}, groups = {}, gi = 0, di = 0;
    boxes.forEach(function (b) {
      var W = +b.w.toFixed(2), D = +b.d.toFixed(2), H = +b.h.toFixed(2);  // SketchUp X, Y, Z
      var gk = W + 'x' + D + 'x' + H; if (!geos[gk]) geos[gk] = { id: 'g' + (gi++), W: W, D: D, H: H };
      var kind = b.kind === 'front' ? 'drawer' : b.kind;
      mats[kind] = true;
      var nm = b.p ? b.p.name : 'Hanging rail';
      var dk = nm + '|' + gk + '|' + kind; if (!defs[dk]) defs[dk] = { id: 'n' + (di++), name: nm, geo: geos[gk].id, mat: kind };
      (groups[b.tag] = groups[b.tag] || []).push({ def: defs[dk], x: b.x, y: b.z, z: b.y });
    });
    var out = ['<?xml version="1.0" encoding="utf-8"?>',
      '<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">',
      '<asset><contributor><authoring_tool>Carpentry Concierge wardrobe cutlist</authoring_tool></contributor><created>' + new Date().toISOString() + '</created><modified>' + new Date().toISOString() + '</modified><title>' + esc(title || 'Wardrobe') + '</title><unit name="millimeter" meter="0.001"/><up_axis>Z_UP</up_axis></asset>'];
    out.push('<library_effects>');
    Object.keys(mats).forEach(function (k) {
      var c = COL[k] || 0xdddddd, r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, bl = (c & 255) / 255;
      out.push('<effect id="e-' + k + '"><profile_COMMON><technique sid="common"><lambert><diffuse><color>' + r.toFixed(3) + ' ' + g.toFixed(3) + ' ' + bl.toFixed(3) + ' 1</color></diffuse></lambert></technique></profile_COMMON></effect>');
    });
    out.push('</library_effects><library_materials>');
    Object.keys(mats).forEach(function (k) { out.push('<material id="m-' + k + '" name="' + k + '"><instance_effect url="#e-' + k + '"/></material>'); });
    out.push('</library_materials><library_geometries>');
    var F = [ // faces: normal, 4 corners (0/1 per axis)
      [[-1, 0, 0], [[0,0,0],[0,0,1],[0,1,1],[0,1,0]]], [[1, 0, 0], [[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],
      [[0, -1, 0], [[0,0,0],[1,0,0],[1,0,1],[0,0,1]]], [[0, 1, 0], [[0,1,0],[0,1,1],[1,1,1],[1,1,0]]],
      [[0, 0, -1], [[0,0,0],[0,1,0],[1,1,0],[1,0,0]]], [[0, 0, 1], [[0,0,1],[1,0,1],[1,1,1],[0,1,1]]]];
    Object.keys(geos).forEach(function (k) {
      var G = geos[k], pos = [], nor = [], p = [];
      F.forEach(function (f, fi) {
        nor.push(f[0].join(' '));
        f[1].forEach(function (c) { pos.push((c[0] * G.W) + ' ' + (c[1] * G.D) + ' ' + (c[2] * G.H)); });
        var o = fi * 4; [o, o + 1, o + 2, o, o + 2, o + 3].forEach(function (v) { p.push(v + ' ' + fi); });
      });
      out.push('<geometry id="' + G.id + '"><mesh>' +
        '<source id="' + G.id + '-p"><float_array id="' + G.id + '-pa" count="72">' + pos.join(' ') + '</float_array><technique_common><accessor source="#' + G.id + '-pa" count="24" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>' +
        '<source id="' + G.id + '-n"><float_array id="' + G.id + '-na" count="18">' + nor.join(' ') + '</float_array><technique_common><accessor source="#' + G.id + '-na" count="6" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>' +
        '<vertices id="' + G.id + '-v"><input semantic="POSITION" source="#' + G.id + '-p"/></vertices>' +
        '<triangles material="mat" count="12"><input semantic="VERTEX" source="#' + G.id + '-v" offset="0"/><input semantic="NORMAL" source="#' + G.id + '-n" offset="1"/><p>' + p.join(' ') + '</p></triangles>' +
        '</mesh></geometry>');
    });
    out.push('</library_geometries><library_nodes>');
    Object.keys(defs).forEach(function (k) {
      var D = defs[k];
      out.push('<node id="' + D.id + '" name="' + esc(D.name) + '"><instance_geometry url="#' + D.geo + '"><bind_material><technique_common><instance_material symbol="mat" target="#m-' + D.mat + '"/></technique_common></bind_material></instance_geometry></node>');
    });
    out.push('</library_nodes><library_visual_scenes><visual_scene id="scene" name="' + esc(title || 'Wardrobe') + '">');
    Object.keys(groups).forEach(function (tag) {
      out.push('<node id="grp-' + tag + '" name="' + esc(GROUPS[tag] || tag) + '">');
      groups[tag].forEach(function (it, i) {
        out.push('<node id="i-' + tag + '-' + i + '" name="' + esc(it.def.name) + '"><translate>' + it.x.toFixed(2) + ' ' + it.y.toFixed(2) + ' ' + it.z.toFixed(2) + '</translate><instance_node url="#' + it.def.id + '"/></node>');
      });
      out.push('</node>');
    });
    out.push('</visual_scene></library_visual_scenes><scene><instance_visual_scene url="#scene"/></scene></COLLADA>');
    return out.join('\n');
  }

  // One self-contained page: three.js, the viewer and the model inside, so it opens with no internet.
  function offlineHTML(boxes, info) {
    info = info || {};
    function get(u) { return fetch(u, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); }); }
    function inl(js) { return js.replace(/<\/(script)/gi, '<\\/$1'); }
    return Promise.all([get(BASE + 'three.min.js?v=r160'), get(BASE + 'OrbitControls.js?v=r160'), get(SELF)]).then(function (src) {
      var who = info.business ? '<div class="who"><b>' + esc(info.business) + '</b>' + (info.phone ? ' · ' + esc(info.phone) : '') + '</div>' : '';
      return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + esc(info.title || 'Wardrobe design') + '</title><style>' +
        'html,body{margin:0;height:100%;background:#efe9df;color:#17130f;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
        'header{padding:14px 16px 8px}h1{font-size:20px;margin:0 0 2px;font-weight:600}.sub{color:#554d43;font-size:13px}.who{margin-top:6px;font-size:13px}' +
        '#v{background:#fff}footer{padding:10px 16px;font-size:12px;color:#554d43}footer a{color:#6b4a33}' +
        '</style></head><body><header><h1>' + esc(info.title || 'Wardrobe design') + '</h1><div class="sub">' + esc(info.size || '') + (info.date ? ' · ' + esc(info.date) : '') + '</div>' + who + '</header>' +
        '<div id="v"></div><footer>A 3D model of the design, drawn to size. Made with <a href="https://neewoodygh.com/concierge/">Carpentry Concierge</a>.</footer>' +
        '<script>' + inl(src[0]) + '<\/script><script>' + inl(src[1]) + '<\/script><script>' + inl(src[2]) + '<\/script>' +
        '<script>Cutlist3D.mount(document.getElementById("v"),' + inl(JSON.stringify(slim(boxes))) + ',{client:true,height:"calc(100vh - 150px)"});<\/script>' +
        '</body></html>';
    });
  }
  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  window.Cutlist3D = {
    show: show, mount: mount, snapshot: snapshot, load: load,
    model: function (S, r) { return buildModel(S, r).boxes; },
    toDAE: toDAE, offlineHTML: offlineHTML, download: download,
    check: function (S, r) { var m = buildModel(S, r); return { warnings: m.warnings, clashes: clashes(m.boxes), boxes: m.boxes.length }; }
  };
})();
