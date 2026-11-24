/* © 2015–2026 Neewoody Custom Woodwork, Accra. All rights reserved. Not licensed for copying, rebranding or resale;
 * see https://neewoodygh.com/terms */
/* The tool bar (2026-11-24, owner: "tool traversal and file management need work… access should be quick and seamless.
 * Every tool should have user friendly file management").
 * One slim bar under the header of every tool: Home · Tools ▾ (jump straight to any other tool) · Files.
 * Files opens one side panel, the same in every tool, over the work: Save, search, newest first or A to Z, and per item
 * Open, Rename, Duplicate, Move to a folder, Download, Delete (with Undo). Each tool keeps its own storage and
 * registers an adapter:
 *   ToolBar.files({ title, noun, member: true, list(), open(item), save(), upload(), rename(item, name),
 *                   duplicate(item), move(item), download(item), remove(item) -> Promise<undo fn | null>, current() })
 * list() resolves [{ id, name, where, updated }]. Leave out what a tool can't do; the menu only shows what it can.
 * A tool that keeps its own file screen for now registers { screen: fn } and Files opens that.
 * Page: <body data-tool="cutlist|cutsheet|smart|pricing|invoices">. Needs nothing else (works before concierge.js). */
(function () {
  'use strict';
  var TOOLS = [
    ['cutlist', 'Cutlist', '/cutlist.html', 'Wardrobe cut list from sizes'],
    ['cutsheet', 'Cut Sheet', '/cut-sheet.html', 'Any parts to a machine-shop sheet'],
    ['smart', 'Smart Generator', '/smart-generator.html', 'Kitchens and wardrobes in 3D'],
    ['pricing', 'Job Pricing', '/carpenter-pricing.html', 'Price a job (members)'],
    ['invoices', 'Invoices', '/invoice-generator.html', 'Invoices, quotes, receipts (members)']
  ];
  function token() { try { return localStorage.getItem('nwd-concierge-token') || ''; } catch (e) { return ''; } }
  function member() {
    var t = token(); if (!t) return false;
    try { var exp = Number(atob(t.split('.')[0]).split('.')[1]); return isFinite(exp) && exp > Date.now(); } catch (e) { return false; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function h(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }

  var css =
    '.tb{display:flex;align-items:center;gap:.25rem;padding:.35rem clamp(.6rem,4vw,2.5rem);background:#f7f3ec;border-bottom:1px solid #ddd3c4;font:500 .9rem/1.3 Manrope,system-ui,sans-serif;color:#17130f;position:relative;z-index:30}' +
    '.tb a,.tb button{font:inherit;color:inherit;background:none;border:0;border-radius:5px;padding:.5rem .7rem;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:.4rem;min-height:40px}' +
    '.tb a:hover,.tb button:hover,.tb [aria-expanded=true]{background:#e9e1d4}.tb a:focus-visible,.tb button:focus-visible{outline:2px solid #1f2f58;outline-offset:1px}' +
    '.tb svg{width:18px;height:18px;flex:none}.tb .tb-files{margin-left:auto;background:#1f2f58;color:#fff;font-weight:600}.tb .tb-files:hover{background:#2c3f70}' +
    '.tb-menu{position:absolute;top:calc(100% + 4px);left:clamp(.6rem,4vw,2.5rem);background:#fff;border:1px solid #ddd3c4;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:.35rem;min-width:270px;z-index:40}' +
    '.tb-menu a{display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:.55rem .7rem;width:100%;box-sizing:border-box}.tb-menu a small{color:#554d43;font-weight:400;font-size:.78rem}' +
    '.tb-menu a[aria-current]{background:#efe9df}.tb-menu hr{border:0;border-top:1px solid #e6ddd0;margin:.3rem 0}' +
    // the Files panel
    '.fp{position:fixed;inset:0 0 0 auto;width:min(440px,100%);max-width:100%;height:100%;max-height:100%;margin:0;border:0;padding:0;background:#f7f3ec;color:#17130f;box-shadow:-10px 0 40px rgba(0,0,0,.25);font:400 .95rem/1.45 Manrope,system-ui,sans-serif}' +
    '.fp::backdrop{background:rgba(23,19,15,.35)}.fp-in{display:flex;flex-direction:column;height:100%}' +
    '.fp-head{display:flex;align-items:center;gap:.5rem;padding:.9rem 1rem .6rem;border-bottom:1px solid #e1d9cc}.fp-head h2{font-size:1.05rem;font-weight:700;margin:0;flex:1}' +
    '.fp button{font:inherit;cursor:pointer}.fp-x{background:none;border:0;font-size:1.6rem;line-height:1;padding:.2rem .5rem;border-radius:5px}.fp-x:hover{background:#e9e1d4}' +
    '.fp-acts{display:flex;flex-wrap:wrap;gap:.45rem;padding:.7rem 1rem 0}.fp-acts button{border:1.5px solid #1f2f58;background:transparent;color:#1f2f58;border-radius:5px;padding:.5rem .85rem;font-weight:600;font-size:.88rem}' +
    '.fp-acts button.go{background:#1f2f58;color:#fff}.fp-cur{padding:.45rem 1rem 0;font-size:.82rem;color:#554d43;min-height:1.2em}' +
    '.fp-tools{display:flex;gap:.45rem;padding:.6rem 1rem;border-bottom:1px solid #e1d9cc}.fp-tools input,.fp-tools select{font:inherit;font-size:.92rem;padding:.5rem .6rem;border:1px solid #c9c0b3;border-radius:5px;background:#fff;min-width:0}.fp-tools input{flex:1}' +
    '.fp-list{flex:1;overflow:auto;padding:.2rem 0 1rem;margin:0;list-style:none}.fp-grp{font-size:.75rem;font-weight:700;letter-spacing:.02em;color:#554d43;padding:.8rem 1rem .25rem}' +
    '.fp-row{display:flex;align-items:center;border-bottom:1px solid #e6ddd0}.fp-open{flex:1;min-width:0;text-align:left;background:none;border:0;padding:.65rem .5rem .65rem 1rem;color:inherit}' +
    '.fp-open:hover,.fp-open:focus-visible{background:#efe9df}.fp-open b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp-open small{display:block;color:#554d43;font-size:.78rem}' +
    '.fp-more{background:none;border:0;padding:.55rem .8rem;margin-right:.4rem;border-radius:5px;font-size:1.2rem;line-height:1;color:#554d43}.fp-more:hover,.fp-more[aria-expanded=true]{background:#e9e1d4}' +
    '.fp-pop{position:fixed;background:#fff;border:1px solid #ddd3c4;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:.3rem;z-index:5;min-width:190px}.fp-pop button{display:block;width:100%;text-align:left;background:none;border:0;padding:.55rem .75rem;border-radius:5px}' +
    '.fp-pop button:hover,.fp-pop button:focus-visible{background:#efe9df}.fp-pop .del{color:#8a2a1a}' +
    '.fp-msg{padding:1rem;color:#554d43}.fp-toast{position:absolute;left:1rem;right:1rem;bottom:1rem;background:#17130f;color:#fff;border-radius:6px;padding:.7rem .9rem;display:flex;gap:.8rem;align-items:center;font-size:.9rem}' +
    '.fp-toast button{margin-left:auto;background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:5px;padding:.35rem .7rem;font-weight:600}' +
    '@media (max-width:520px){.tb .tb-lbl{display:none}.tb .tb-files .tb-lbl{display:inline}}' +
    '@media print{.tb,.fp{display:none!important}}';
  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    files: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>'
  };

  var me = document.body.getAttribute('data-tool') || '', adapter = null, bar, menuBtn, menu;
  var TB = window.ToolBar = {
    member: member,
    files: function (a) { adapter = a; },
    openFiles: function () { openFiles(); },
    toast: function (text, undo) { showToast(text, undo); }
  };

  function build() {
    if (document.getElementById('nw-toolbar')) return;
    var st = h('style', { id: 'tb-css' }); st.textContent = css; document.head.appendChild(st);
    var m = member();
    bar = h('nav', { class: 'tb', id: 'nw-toolbar', 'aria-label': 'Tools' });
    bar.innerHTML =
      '<a href="' + (m ? '/concierge/profile.html' : '/concierge/') + '" aria-label="' + (m ? 'Home' : 'Carpentry Concierge') + '">' + IC.home + '<span class="tb-lbl">' + (m ? 'Home' : 'Carpentry Concierge') + '</span></a>' +
      '<button type="button" class="tb-tools" aria-label="Tools: jump to another tool" aria-haspopup="true" aria-expanded="false" aria-controls="tb-menu">' + IC.tools + '<span class="tb-lbl">Tools</span> ▾</button>' +
      '<button type="button" class="tb-files">' + IC.files + '<span class="tb-lbl">Files</span></button>';
    menu = h('div', { class: 'tb-menu', id: 'tb-menu', hidden: '' });
    menu.innerHTML = TOOLS.map(function (t) {
      return '<a href="' + t[2] + '"' + (t[0] === me ? ' aria-current="page"' : '') + '>' + esc(t[1]) + '<small>' + esc(t[3]) + '</small></a>';
    }).join('') + '<hr><a href="' + (m ? '/concierge/directory.html#tools' : '/tools') + '">All tools<small>' + (m ? 'Your member tools' : 'Free tools and what membership adds') + '</small></a>' +
      (m ? '<a href="/concierge/profile.html#files">My files<small>Everything you have saved, by client</small></a>' : '');
    bar.appendChild(menu);
    var head = document.querySelector('.app-head');
    if (head && head.parentNode) head.parentNode.insertBefore(bar, head.nextSibling); else document.body.insertBefore(bar, document.body.firstChild);
    menuBtn = bar.querySelector('.tb-tools');
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    document.addEventListener('click', function (e) { if (!menu.hidden && !bar.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    bar.querySelector('.tb-files').addEventListener('click', openFiles);
  }
  function setMenu(on) { menu.hidden = !on; menuBtn.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) menu.querySelector('a').focus(); }

  // ---------------- the Files panel ----------------
  var dlg, listEl, curEl, qEl, sortEl, items = [], toastT;
  function openFiles() {
    if (!adapter) { location.href = member() ? '/concierge/profile.html#files' : '/concierge/login.html'; return; }
    if (adapter.screen) { adapter.screen(); return; }
    if (!dlg) makePanel();
    dlg.showModal();
    refresh();
  }
  function makePanel() {
    dlg = h('dialog', { class: 'fp', 'aria-labelledby': 'fp-title' });
    dlg.innerHTML = '<div class="fp-in"><div class="fp-head"><h2 id="fp-title"></h2><button type="button" class="fp-x" aria-label="Close">×</button></div>' +
      '<div class="fp-acts"></div><div class="fp-cur" role="status"></div>' +
      '<div class="fp-tools"><input type="search" placeholder="Search" aria-label="Search"><select aria-label="Sort"><option value="new">Newest first</option><option value="az">A to Z</option></select></div>' +
      '<ul class="fp-list" aria-live="polite"></ul></div>';
    document.body.appendChild(dlg);
    listEl = dlg.querySelector('.fp-list'); curEl = dlg.querySelector('.fp-cur'); qEl = dlg.querySelector('input'); sortEl = dlg.querySelector('select');
    dlg.querySelector('.fp-x').onclick = function () { dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    qEl.addEventListener('input', draw); sortEl.addEventListener('change', draw);
  }
  function acts() {
    var a = dlg.querySelector('.fp-acts'); a.innerHTML = '';
    function add(label, fn, go) { var b = h('button', { type: 'button', class: go ? 'go' : '' }, esc(label)); b.onclick = fn; a.appendChild(b); }
    if (adapter.save) add('Save', function () { dlg.close(); Promise.resolve(adapter.save()).then(function () { }); }, true);
    if (adapter.upload) add('Upload a file', function () { dlg.close(); adapter.upload(); });
    dlg.querySelector('#fp-title').textContent = adapter.title || 'Files';
    var c = adapter.current && adapter.current();
    curEl.textContent = c ? 'Open now: ' + c : '';
  }
  function refresh() {
    acts();
    if (adapter.member && !member()) {
      dlg.querySelector('.fp-acts').innerHTML = ''; curEl.textContent = '';
      dlg.querySelector('.fp-tools').hidden = true;
      listEl.innerHTML = '<li class="fp-msg">Saving and opening your ' + esc(adapter.noun || 'file') + 's is for Carpentry Concierge members. <a href="/concierge/login.html?next=' + encodeURIComponent(location.pathname) + '">Log in or join</a>.</li>';
      return;
    }
    dlg.querySelector('.fp-tools').hidden = false;
    listEl.innerHTML = '<li class="fp-msg">Loading…</li>';
    Promise.resolve(adapter.list()).then(function (l) { items = l || []; draw(); })
      .catch(function (e) { listEl.innerHTML = '<li class="fp-msg">' + esc((e && e.message) || 'Could not load your files.') + '</li>'; });
  }
  function draw() {
    var q = qEl.value.trim().toLowerCase(), az = sortEl.value === 'az';
    var l = items.filter(function (f) { return !q || (f.name + ' ' + (f.where || '')).toLowerCase().indexOf(q) !== -1; });
    l.sort(function (a, b) { return az ? String(a.name).localeCompare(String(b.name)) : String(b.updated || '').localeCompare(String(a.updated || '')); });
    if (!l.length) { listEl.innerHTML = '<li class="fp-msg">' + (q ? 'Nothing matches "' + esc(q) + '".' : 'Nothing saved yet. Use Save to keep this ' + esc(adapter.noun || 'file') + '.') + '</li>'; return; }
    var html = '', last = null;
    l.forEach(function (f, i) {
      var g = az ? (f.where || '') : (i < 5 && !q ? 'Recent' : (q ? 'Found' : 'Older'));
      if (g !== last) { html += '<li class="fp-grp">' + esc(g || 'No folder') + '</li>'; last = g; }
      html += '<li class="fp-row"><button type="button" class="fp-open" data-i="' + items.indexOf(f) + '"><b>' + esc(f.name) + '</b><small>' +
        esc([f.where, f.updated ? 'saved ' + String(f.updated).slice(0, 16).replace('T', ' ') : ''].filter(Boolean).join(' · ')) + '</small></button>' +
        '<button type="button" class="fp-more" data-i="' + items.indexOf(f) + '" aria-label="More for ' + esc(f.name) + '" aria-haspopup="true" aria-expanded="false">⋯</button></li>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('.fp-open').forEach(function (b) { b.onclick = function () { var f = items[+b.dataset.i]; dlg.close(); adapter.open(f); }; });
    listEl.querySelectorAll('.fp-more').forEach(function (b) { b.onclick = function () { pop(b, items[+b.dataset.i]); }; });
  }
  function pop(btn, f) {
    var old = dlg.querySelector('.fp-pop'); if (old) { old.remove(); if (old._for === btn) return; }
    var p = h('div', { class: 'fp-pop', role: 'menu' }); p._for = btn;
    var opts = [["Open", function () { dlg.close(); adapter.open(f); }]];
    if (adapter.rename) opts.push(['Rename', function () {
      var n = prompt('New name', f.name); if (n == null || !(n = n.trim()) || n === f.name) return;
      run(adapter.rename(f, n), 'Renamed');
    }]);
    if (adapter.duplicate) opts.push(['Duplicate', function () { run(adapter.duplicate(f), 'Copied'); }]);
    if (adapter.move) opts.push(['Move to a folder', function () { run(adapter.move(f), ''); }]);
    if (adapter.download) opts.push(['Download', function () { run(adapter.download(f), '', true); }]);
    if (adapter.remove) opts.push(['Delete', function () {
      Promise.resolve(adapter.remove(f)).then(function (undo) {
        refresh(); showToast('Deleted "' + f.name + '".', undo ? function () { return Promise.resolve(undo()).then(refresh); } : null);
      }).catch(fail);
    }, 'del']);
    opts.forEach(function (a) { var b = h('button', { type: 'button', role: 'menuitem', class: a[2] || '' }, esc(a[0])); b.onclick = function () { p.remove(); btn.setAttribute('aria-expanded', 'false'); a[1](); }; p.appendChild(b); });
    dlg.appendChild(p);
    var r = btn.getBoundingClientRect(), pr = p.getBoundingClientRect();
    p.style.top = Math.min(r.bottom + 4, innerHeight - pr.height - 8) + 'px';
    p.style.left = Math.max(8, r.right - pr.width) + 'px';
    btn.setAttribute('aria-expanded', 'true'); p.querySelector('button').focus();
    p.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); p.remove(); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  }
  function run(pr, done, quiet) {
    Promise.resolve(pr).then(function (v) { if (v === false) return; if (!quiet) refresh(); if (done) showToast(done + '.'); }).catch(fail);
  }
  function fail(e) { alert((window.MyFiles && e && e.data ? MyFiles.err(e) : (e && e.message)) || 'Something went wrong. Check your connection and try again.'); }
  function showToast(text, undo) {
    var host = dlg && dlg.open ? dlg : document.body, t = h('div', { class: 'fp-toast', role: 'status' }, '<span>' + esc(text) + '</span>');
    if (host === document.body) t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:1rem;right:auto;z-index:100;max-width:calc(100% - 2rem)';
    if (undo) { var b = h('button', { type: 'button' }, 'Undo'); b.onclick = function () { t.remove(); undo().catch(fail); }; t.appendChild(b); }
    var o = document.querySelector('.fp-toast'); if (o) o.remove();
    host.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, undo ? 8000 : 3000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
