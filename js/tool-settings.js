/* Shared tool settings panel (2026-11-17).
   One gear in the header of every member tool page opens the same panel, without
   leaving the page, so a member can change their rates or letterhead in the middle
   of a quote, invoice or cut sheet. Two tabs:
     Pricing  : how you set your price (multiplier, markup on cost or profit margin),
                the four tiers, add-ons, day rates. Saved to /api/pricing/config, the
                same record Job Pricing has always used (tiers are stored as
                multipliers; markup and margin are only how they are shown and typed).
     Business : the letterhead every tool prints. Saved to /api/settings.
   A page can add a link to its own settings with ToolSettings.local(label, fn).
   Tools listen for the 'nw-settings' window event ({detail:{pricing, business}}) to
   apply a save at once. Tips can open the panel at a field: ToolSettings.open('pricing', 'ts-tier-standard').
   Opening the page with #settings (or #settings-business) opens the panel.
   No owner figures here: the defaults are the same generic examples Job Pricing uses. */
(function () {
  'use strict';
  // Scroll wheel over a number box you are typing in used to change the number (owner 2026-11-24:
  // scrolling the page quietly lowered sizes on the cut sheet). Leave the box instead: the page
  // scrolls and the number stays. This file loads on every member tool page, so it fixes them all.
  document.addEventListener('wheel', function (e) {
    var el = e.target;
    if (el && el.tagName === 'INPUT' && el.type === 'number' && el === document.activeElement) el.blur();
  }, { passive: true });
  var API ='https://concierge-api.neewoodygh.workers.dev/api';
  try { API = localStorage.getItem('nwd-api-override') || API; } catch (e) {}
  function token() { try { return localStorage.getItem('nwd-concierge-token') || ''; } catch (e) { return ''; } }
  function alive() {
    var t = token(); if (!t) return false;
    // payload is phone.expiry[.stamp], expiry in ms (same check as concierge.js tokenAlive)
    try { var exp = Number(atob(t.split('.')[0]).split('.')[1]); return isFinite(exp) && exp > Date.now(); } catch (e) { return false; }
  }

  var DEFAULT_PRICING = {
    billableDays: 20, ownerRate: 200, priceMethod: 'multiplier',
    labourRates: { supervisor: 200, lead: 150, hand: 100, trainee: 50 },
    tierMults: { basic: 1.35, standard: 1.55, premium: 1.80, luxury: 2.00 },
    addOnPcts: { rush: 20, customDesign: 12, cnc: 18, remoteInstall: 8 },
    running: [
      { id: 'r01', name: 'Workshop rent / space', amount: 500, hint: 'Monthly rent or equivalent if owned' },
      { id: 'r02', name: 'Electricity', amount: 200, hint: 'Workshop power — lights, machines, charging' },
      { id: 'r03', name: 'Transport / fuel', amount: 300, hint: 'Material runs, site visits' },
      { id: 'r04', name: 'Phone & internet', amount: 100, hint: 'Business calls, WhatsApp, data' },
      { id: 'r05', name: 'Miscellaneous', amount: 150, hint: 'Small consumables, unexpected costs' }
    ],
    capital: [
      { id: 'c01', name: 'Table saw', cost: 12000, lifeYears: 7 }, { id: 'c02', name: 'Router(s)', cost: 3000, lifeYears: 3 },
      { id: 'c03', name: 'Drills & drivers', cost: 5000, lifeYears: 4 }, { id: 'c04', name: 'Circular saw', cost: 2000, lifeYears: 4 },
      { id: 'c05', name: 'Sander(s)', cost: 1500, lifeYears: 3 }, { id: 'c06', name: 'Other tools', cost: 5000, lifeYears: 3 }
    ]
  };
  var TIERS = [['basic', 'Basic build'], ['standard', 'Standard build'], ['premium', 'Premium'], ['luxury', 'Luxury']];
  var ADDONS = [['rush', 'Rush job'], ['customDesign', 'Custom design'], ['cnc', 'CNC / carved'], ['remoteInstall', 'Remote install']];
  var RATES = [['ownerRate', 'Your own day rate'], ['supervisor', 'Supervisor'], ['lead', 'Lead apprentice'], ['hand', 'Work hand'], ['trainee', 'Trainee']];
  var METHODS = [
    ['multiplier', 'Multiplier', 'Cost × your number. ×1.65 means a GH₵1,000 cost sells for GH₵1,650.'],
    ['markup', 'Markup on cost', 'A percentage added on top of cost. 65% on a GH₵1,000 cost sells for GH₵1,650.'],
    ['margin', 'Profit margin', 'The share of the final price that is profit. 40% means GH₵1,000 of cost sells for GH₵1,667.']
  ];
  var BIZ = [
    ['bizName', 'Business name'], ['tagline', 'Tagline', 'e.g. Bespoke furniture and fittings'],
    ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['instagram', 'Instagram'],
    ['addr1', 'Address, line 1'], ['addr2', 'Address, line 2'],
    ['payTitle1', 'Payment option 1, title'], ['payBody1', 'Payment option 1, details', '', 1],
    ['payTitle2', 'Payment option 2, title'], ['payBody2', 'Payment option 2, details', '', 1],
    ['payTitle3', 'Payment option 3, title'], ['payBody3', 'Payment option 3, details', '', 1],
    ['terms', 'Terms and conditions', '', 1]
  ];

  // ── conversions: tiers are stored as multipliers ──
  function r(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }
  function shown(m, meth) { return meth === 'markup' ? r((m - 1) * 100, 1) : meth === 'margin' ? r((1 - 1 / m) * 100, 1) : r(m, 2); }
  function toMult(v, meth) {
    v = +v; if (!isFinite(v)) return null;
    if (meth === 'markup') return v > -100 ? r(1 + v / 100, 4) : null;
    if (meth === 'margin') return (v >= 0 && v < 95) ? r(1 / (1 - v / 100), 4) : null;
    return v > 0 ? r(v, 4) : null;
  }
  function equiv(m) {
    if (!(m > 0)) return '';
    return '= ×' + r(m, 2) + ' · ' + r((m - 1) * 100, 0) + '% markup · ' + r((1 - 1 / m) * 100, 0) + '% margin';
  }
  window.PriceMethod = { shown: shown, toMult: toMult, equiv: equiv, METHODS: METHODS,
    label: function (m, meth) { return meth === 'markup' ? shown(m, meth) + '% markup' : meth === 'margin' ? shown(m, meth) + '% margin' : '×' + shown(m, meth); } };

  async function call(path, method, body) {
    var res = await fetch(API + path, { method: method || 'GET',
      headers: Object.assign({ Authorization: 'Bearer ' + token() }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined });
    var data = {}; try { data = await res.json(); } catch (e) {}
    if (!res.ok) { var err = new Error(data.error || ('http_' + res.status)); err.status = res.status; throw err; }
    return data;
  }

  var state = { pricing: null, business: null, businessFailed: false, loaded: false, localLabel: '', localFn: null };
  var businessPromise = null;
  function loadBusiness(fresh) {
    if (!alive()) return Promise.resolve(null);
    if (!businessPromise || fresh) businessPromise = call('/settings').then(function (d) {
      state.businessFailed = false; state.business = (d.settings && d.settings.business) || null; return state.business;
    }).catch(function () { state.businessFailed = true; return null; });
    return businessPromise;
  }
  // A tool changed part of its letterhead (e.g. Job Pricing branding): fold it into the
  // shared business details. Debounced; skipped if the current details could not be read,
  // so a network error can never wipe them.
  var mergeTimer = null, pendingMerge = {};
  function mergeBusiness(partial) {
    if (!alive() || !partial) return;
    Object.assign(pendingMerge, partial);
    clearTimeout(mergeTimer);
    mergeTimer = setTimeout(async function () {
      var p = pendingMerge; pendingMerge = {};
      var cur = await loadBusiness(true);
      if (state.businessFailed) return;
      var next = Object.assign({}, cur || {}, p);
      try {
        var res = await call('/settings', 'PUT', { settings: { business: next } });
        state.business = res.settings.business; businessPromise = Promise.resolve(state.business);
      } catch (e) {}
    }, 1200);
  }
  async function loadAll() {
    var res = await Promise.all([call('/pricing/config'), loadBusiness(true), call('/me').catch(function () { return {}; })]);
    if (state.businessFailed) throw new Error('load_failed');
    state.pricing = res[0].config || null;
    var me = (res[2] && res[2].member) || {};
    var b = state.business || {};
    // first time: start the letterhead from what the account already knows
    if (!state.business) {
      var pb = (state.pricing && state.pricing.brand) || {};
      b = { bizName: pb.name || me.business_name || me.name || '', tagline: pb.tagline || '',
            phone: pb.phone || me.business_phone || '', addr2: pb.location || me.area || '' };
      if (window.ToolSettings && typeof window.ToolSettings.seedBusiness === 'function') b = Object.assign(b, window.ToolSettings.seedBusiness() || {});
    }
    state.draftBusiness = Object.assign({}, b);
    state.loaded = true;
  }

  // ── UI ──
  var dlg, tabBtns = {}, panes = {}, statusEl, saveBtn, localBtn, draft;
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    dlg = el('dialog', { class: 'ts', 'aria-labelledby': 'ts-title' });
    dlg.innerHTML =
      '<div class="ts-head"><h2 id="ts-title">Settings</h2><button type="button" class="ts-x" aria-label="Close settings">×</button></div>' +
      '<div class="ts-tabs" role="tablist"><button type="button" role="tab" data-tab="pricing">Pricing</button><button type="button" role="tab" data-tab="business">Business details</button></div>' +
      '<div class="ts-body"><div class="ts-pane" data-pane="pricing"></div><div class="ts-pane" data-pane="business"></div></div>' +
      '<div class="ts-foot"><button type="button" class="ts-local" hidden></button><span class="ts-status" role="status"></span><button type="button" class="ts-save">Save</button></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.ts-x').onclick = function () { dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    [].forEach.call(dlg.querySelectorAll('[data-tab]'), function (b) { tabBtns[b.dataset.tab] = b; b.onclick = function () { show(b.dataset.tab); }; });
    [].forEach.call(dlg.querySelectorAll('[data-pane]'), function (p) { panes[p.dataset.pane] = p; });
    statusEl = dlg.querySelector('.ts-status'); saveBtn = dlg.querySelector('.ts-save'); localBtn = dlg.querySelector('.ts-local');
    saveBtn.onclick = save;
    // run after the close has returned focus to the gear, so the page's own jump wins
    localBtn.onclick = function () { dlg.close(); if (state.localFn) setTimeout(state.localFn, 60); };
  }
  function show(tab) {
    for (var k in panes) { panes[k].hidden = k !== tab; tabBtns[k].setAttribute('aria-selected', k === tab ? 'true' : 'false'); }
  }

  function renderPricing() {
    var p = draft, meth = p.priceMethod || 'multiplier';
    var unit = meth === 'multiplier' ? '×' : '%';
    var h = '<fieldset class="ts-group"><legend>How you set your price</legend><div class="ts-seg">' +
      METHODS.map(function (m) { return '<button type="button" data-meth="' + m[0] + '" aria-pressed="' + (m[0] === meth) + '">' + m[1] + '</button>'; }).join('') +
      '</div><p class="ts-hint">' + METHODS.filter(function (m) { return m[0] === meth; })[0][2] + '</p></fieldset>';
    h += '<fieldset class="ts-group"><legend>Price tiers</legend>' + TIERS.map(function (t) {
      var m = +(p.tierMults && p.tierMults[t[0]]) || DEFAULT_PRICING.tierMults[t[0]];
      return '<div class="ts-row"><label for="ts-tier-' + t[0] + '">' + t[1] + '</label><span class="ts-num">' +
        (meth === 'multiplier' ? '<i>×</i>' : '') + '<input id="ts-tier-' + t[0] + '" data-tier="' + t[0] + '" type="number" inputmode="decimal" step="' + (meth === 'multiplier' ? '0.01' : '0.5') + '" value="' + shown(m, meth) + '" data-orig="' + shown(m, meth) + '">' +
        (meth !== 'multiplier' ? '<i>%</i>' : '') + '</span><small class="ts-eq" id="ts-eq-' + t[0] + '">' + equiv(m) + '</small></div>';
    }).join('') + '</fieldset>';
    h += '<fieldset class="ts-group"><legend>Add-ons (added on top)</legend>' + ADDONS.map(function (a) {
      var v = (p.addOnPcts && p.addOnPcts[a[0]] != null) ? p.addOnPcts[a[0]] : DEFAULT_PRICING.addOnPcts[a[0]];
      return '<div class="ts-row"><label for="ts-add-' + a[0] + '">' + a[1] + '</label><span class="ts-num"><input id="ts-add-' + a[0] + '" data-addon="' + a[0] + '" type="number" inputmode="decimal" step="1" value="' + v + '"><i>%</i></span></div>';
    }).join('') + '</fieldset>';
    h += '<fieldset class="ts-group"><legend>Day rates (GH₵ a day)</legend>' + RATES.map(function (x) {
      var v = x[0] === 'ownerRate' ? p.ownerRate : (p.labourRates || {})[x[0]];
      if (v == null) v = x[0] === 'ownerRate' ? DEFAULT_PRICING.ownerRate : DEFAULT_PRICING.labourRates[x[0]];
      return '<div class="ts-row"><label for="ts-rate-' + x[0] + '">' + x[1] + '</label><span class="ts-num"><input id="ts-rate-' + x[0] + '" data-rate="' + x[0] + '" type="number" inputmode="decimal" step="10" value="' + v + '"></span></div>';
    }).join('') +
      '<div class="ts-row"><label for="ts-days">Working days a month</label><span class="ts-num"><input id="ts-days" data-days type="number" inputmode="numeric" step="1" value="' + (p.billableDays || 20) + '"></span></div>' +
      '<p class="ts-hint">Your monthly running costs and tools (rent, power, machines) are set in <a href="/carpenter-pricing.html#settings-overhead">Job Pricing, overhead settings</a>.</p></fieldset>';
    if (!state.pricing) h = '<p class="ts-note">These are example numbers. Save to make them yours.</p>' + h;
    panes.pricing.innerHTML = h;
    [].forEach.call(panes.pricing.querySelectorAll('[data-meth]'), function (b) {
      b.onclick = function () { readPricing(); draft.priceMethod = b.dataset.meth; renderPricing(); };
    });
    [].forEach.call(panes.pricing.querySelectorAll('[data-tier]'), function (i) {
      i.oninput = function () {
        var m = toMult(i.value, draft.priceMethod || 'multiplier');
        document.getElementById('ts-eq-' + i.dataset.tier).textContent = m ? equiv(m) : (draft.priceMethod === 'margin' ? 'Use a margin from 0 to 94%' : 'Enter a number');
      };
    });
  }
  function readPricing() {
    var meth = draft.priceMethod || 'multiplier', bad = '';
    draft.tierMults = Object.assign({}, draft.tierMults || DEFAULT_PRICING.tierMults);
    draft.addOnPcts = Object.assign({}, draft.addOnPcts || DEFAULT_PRICING.addOnPcts);
    draft.labourRates = Object.assign({}, draft.labourRates || DEFAULT_PRICING.labourRates);
    [].forEach.call(panes.pricing.querySelectorAll('[data-tier]'), function (i) {
      if (i.value === i.dataset.orig) return;   // untouched: keep the stored multiplier exactly (no rounding drift)
      var m = toMult(i.value, meth); if (m) draft.tierMults[i.dataset.tier] = m; else bad = bad || i.id;
    });
    [].forEach.call(panes.pricing.querySelectorAll('[data-addon]'), function (i) { draft.addOnPcts[i.dataset.addon] = +i.value || 0; });
    [].forEach.call(panes.pricing.querySelectorAll('[data-rate]'), function (i) {
      if (i.dataset.rate === 'ownerRate') draft.ownerRate = +i.value || 0; else draft.labourRates[i.dataset.rate] = +i.value || 0;
    });
    var d = panes.pricing.querySelector('[data-days]'); if (d) draft.billableDays = Math.max(1, +d.value || 20);
    return bad;
  }
  function renderBusiness() {
    var b = state.draftBusiness || {};
    panes.business.innerHTML = '<p class="ts-hint">Printed on your quotes, invoices and cut sheets. Your logo comes from your profile in the members area.</p>' +
      BIZ.map(function (f) {
        var id = 'ts-biz-' + f[0], v = esc(b[f[0]] || '');
        return '<div class="ts-field"><label for="' + id + '">' + f[1] + '</label>' +
          (f[3] ? '<textarea id="' + id + '" data-biz="' + f[0] + '" rows="' + (f[0] === 'terms' ? 6 : 3) + '">' + v + '</textarea>'
                : '<input id="' + id + '" data-biz="' + f[0] + '" value="' + v + '"' + (f[2] ? ' placeholder="' + esc(f[2]) + '"' : '') + '>') + '</div>';
      }).join('');
  }
  function readBusiness() {
    var b = {}; [].forEach.call(panes.business.querySelectorAll('[data-biz]'), function (i) { b[i.dataset.biz] = i.value.trim(); });
    state.draftBusiness = b; return b;
  }

  async function save() {
    var bad = readPricing(); var biz = readBusiness();
    if (bad) { show('pricing'); var e = document.getElementById(bad); if (e) e.focus(); statusEl.textContent = 'Check the highlighted tier.'; return; }
    saveBtn.disabled = true; statusEl.textContent = 'Saving…';
    try {
      var pricing = Object.assign({}, state.pricing || DEFAULT_PRICING, {
        priceMethod: draft.priceMethod || 'multiplier', tierMults: draft.tierMults, addOnPcts: draft.addOnPcts,
        labourRates: draft.labourRates, ownerRate: draft.ownerRate, billableDays: draft.billableDays });
      // Job Pricing prints its own letterhead from pricing.brand: keep it in step
      pricing.brand = Object.assign({}, pricing.brand || {}, { name: biz.bizName || '', tagline: biz.tagline || '',
        phone: biz.phone || '', location: biz.addr2 || biz.addr1 || '' });
      var res = await Promise.all([call('/pricing/config', 'PUT', { config: pricing }), call('/settings', 'PUT', { settings: { business: biz } })]);
      state.pricing = pricing; state.business = res[1].settings.business; businessPromise = Promise.resolve(state.business);
      statusEl.textContent = 'Saved.';
      window.dispatchEvent(new CustomEvent('nw-settings', { detail: { pricing: pricing, business: state.business } }));
      setTimeout(function () { if (dlg.open) dlg.close(); }, 600);
    } catch (err) {
      statusEl.textContent = err.message === 'payment_required' ? 'Renew your membership to save settings.' :
        err.status === 401 ? 'Please log in again to save.' : 'Could not save. Check your connection and try again.';
    } finally { saveBtn.disabled = false; }
  }

  async function open(tab, focusId) {
    if (!alive()) { location.href = '/concierge/login.html?next=' + encodeURIComponent(location.pathname); return; }
    if (!dlg) build();
    localBtn.hidden = !state.localFn; localBtn.textContent = state.localLabel;
    statusEl.textContent = 'Loading your settings…';
    panes.pricing.innerHTML = ''; panes.business.innerHTML = '';
    show(tab || 'pricing');
    if (!dlg.open) dlg.showModal();
    // always fresh: a tool may have changed the rates since the panel last opened
    try { await loadAll(); statusEl.textContent = ''; }
    catch (e) { statusEl.textContent = 'Could not load your settings. Check your connection.'; return; }
    draft = JSON.parse(JSON.stringify(state.pricing || DEFAULT_PRICING));
    renderPricing(); renderBusiness();
    var f = focusId && document.getElementById(focusId);
    if (f) { f.focus(); f.select && f.select(); }
  }

  function addGear() {
    var head = document.querySelector('.app-head'); if (!head || head.querySelector('.ts-gear')) return;
    var b = el('button', { type: 'button', class: 'ts-gear', 'aria-label': 'Settings: rates and business details' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.5 7.5 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.5 7.5 0 0 0 1.7 1L11 21h4l.4-2.9a7.5 7.5 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg><span>Settings</span>');
    b.onclick = function () { open('pricing'); };
    head.appendChild(b);   // last in the header, so it sits in the same place on every tool
  }

  window.ToolSettings = {
    open: open, loadBusiness: loadBusiness, mergeBusiness: mergeBusiness,
    local: function (label, fn) {
      state.localLabel = label; state.localFn = fn;
      if (localBtn) { localBtn.hidden = false; localBtn.textContent = label; }   // page registered after the panel opened
    },
    seedBusiness: null   // a page may set a function returning its own letterhead, used only before the first save
  };

  function init() {
    if (!alive()) return;
    addGear();
    var m = /^#settings(?:-(pricing|business))?$/.exec(location.hash);
    if (m) open(m[1] || 'pricing');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
