/* ───────────────────────────────────────────────────────────────────────
   Carpentry Concierge — shared frontend helper (no framework, no build)
   Used by /concierge/login.html, directory.html, admin.html
   ─────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  // Account subdomain matches the existing dispatch worker's host.
  // 'nwd-api-override' in localStorage lets a dev session point at a local
  // `wrangler dev` worker without editing this file.
  var API = 'https://concierge-api.neewoodygh.workers.dev/api';
  try { API = localStorage.getItem('nwd-api-override') || API; } catch (e) {}
  var TOKEN_KEY = 'nwd-concierge-token';

  // Trade vocabulary (2026-07-15 revision — owner-directed).
  // 'furniture' was split into cabinet_construction / interior_work /
  // solid_wood_furniture; glass_aluminium removed; outdoor_structures added.
  var SPECIALTY_LABELS = {
    cabinet_construction: 'Cabinet construction',
    interior_work: 'Interior work',
    solid_wood_furniture: 'Solid wood furniture',
    upholstery: 'Upholstery',
    finishing_spray: 'Finishing / Spray',
    outdoor_structures: 'Outdoor structures',
    site_construction: 'Site / Construction',
    cnc_machining: 'CNC / Machining',
    other: 'Other'
  };
  var SPECIALTY_ORDER = Object.keys(SPECIALTY_LABELS);

  // Retired keys — still render on profiles saved before the revision.
  var LEGACY_SPECIALTY_LABELS = {
    furniture: 'Furniture',
    glass_aluminium: 'Glass & Aluminium'
  };

  // Shown in the trade popovers on the directory and as picker hints.
  var SPECIALTY_EXAMPLES = {
    cabinet_construction: 'Kitchens, wardrobes, TV units, office & shop fittings',
    interior_work: 'Doors & frames, ceilings, wall panelling, partitions, skirting',
    solid_wood_furniture: 'Dining tables, chairs, beds, coffee tables, consoles',
    upholstery: 'Sofas, headboards, chair re-covering, cushions',
    finishing_spray: 'Spray finishing, lacquer, stains, French polish',
    outdoor_structures: 'Pergolas, gazebos, huts, sheds, decking',
    site_construction: 'Formwork, shuttering, roofing & trusses, structural carpentry',
    cnc_machining: 'Carved panels, routed doors, engraving, jigs & templates'
  };

  // Skill levels — self-set by members in edit-profile (admin can correct).
  var SKILL_LABELS = {
    apprentice: 'Apprentice',
    carpenter: 'Carpenter',
    master: 'Master Carpenter'
  };
  var SKILL_ORDER = Object.keys(SKILL_LABELS);
  function skillLabel(key) { return SKILL_LABELS[key] || ''; }

  // Area vocabulary: Greater Accra zones first, then every other region.
  var ZONE_GROUPS = [
    { label: 'Greater Accra', zones: [
      'Spintex', 'Tema', 'Ashaiman', 'East Legon', 'Madina', 'Adenta',
      'Ashaley Botwe / Lakeside', 'Achimota', 'Dome / Kwabenya', 'Lapaz / Abeka',
      'Dansoman', 'Kaneshie', 'Osu / Labadi', 'Teshie / Nungua',
      'Cantonments / Airport', 'Circle / Adabraka', 'Kasoa', 'Weija / Gbawe',
      'Amasaman / Pokuase', 'Dodowa / Oyibi', 'Ada / Prampram',
      'Greater Accra — other'
    ]},
    { label: 'Regions', zones: [
      'Ashanti Region', 'Central Region', 'Eastern Region', 'Western Region',
      'Western North Region', 'Volta Region', 'Oti Region', 'Bono Region',
      'Bono East Region', 'Ahafo Region', 'Northern Region', 'Savannah Region',
      'North East Region', 'Upper East Region', 'Upper West Region'
    ]}
  ];

  // Fill a <select> with the zone vocabulary. If currentValue is set but not
  // in the vocabulary (legacy free-text area), it is kept as an extra option
  // so an existing profile never silently loses its area.
  function fillZoneSelect(sel, currentValue, emptyLabel) {
    sel.innerHTML = '';
    var empty = document.createElement('option');
    empty.value = ''; empty.textContent = emptyLabel || '— select area —';
    sel.appendChild(empty);
    var known = false;
    ZONE_GROUPS.forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g.label;
      g.zones.forEach(function (z) {
        var o = document.createElement('option'); o.value = z; o.textContent = z;
        if (z === currentValue) known = true;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    if (currentValue && !known) {
      var o = document.createElement('option');
      o.value = currentValue; o.textContent = currentValue + ' (update to a zone)';
      sel.appendChild(o);
    }
    sel.value = currentValue || '';
  }

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  // Client-side token peek (NOT verification — the Worker verifies signatures).
  function tokenAlive() {
    var t = getToken();
    if (!t) return false;
    try {
      var payload = decodeURIComponent(escape(atob(t.split('.')[0])));
      var i = payload.lastIndexOf('.');
      var exp = Number(payload.slice(i + 1));
      return isFinite(exp) && exp > Date.now();
    } catch (e) { return false; }
  }

  // Core fetch. Returns parsed JSON on 2xx; throws {status, data} otherwise.
  async function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (opts.auth !== false) {
      var t = getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
    }
    var res;
    try {
      res = await fetch(API + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body != null ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) {
      throw { status: 0, data: { error: 'network' }, message: 'Network error — check your connection.' };
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      if (res.status === 401 && opts.auth !== false) clearToken();
      throw { status: res.status, data: data || {}, message: errorMessage(res.status, data) };
    }
    return data;
  }

  function errorMessage(status, data) {
    var code = data && data.error;
    var map = {
      invalid_credentials: 'That phone number or PIN is not correct.',
      too_many_attempts: 'Too many attempts. Please wait 15 minutes and try again.',
      unauthorized: 'Please log in again.',
      forbidden: 'You do not have access to this page.',
      member_exists: 'A member with that phone number already exists.',
      member_not_found: 'No member found with that phone number.',
      pin_must_be_5_digits: 'PIN must be exactly 5 digits.',
      invalid_phone: 'That phone number is not valid.',
      invalid_specialties: 'Please choose at least one valid specialty.',
      period_must_be_YYYY_MM: 'Period must look like 2026-07.',
      invalid_amount: 'Amount must be a whole number of Ghana cedis.',
      invalid_image: 'That file could not be read as a photo — try a different picture.',
      photo_too_large: 'That photo is too large even after compression — try a smaller picture.',
      invalid_skill_level: 'Choose a valid skill level.',
      invalid_years: 'Years of experience must be a whole number (0–70).',
      confirm_mismatch: 'The confirmation phone number did not match — nothing was deleted.',
      cannot_delete_self: 'You cannot delete your own admin account.'
    };
    if (code && map[code]) return map[code];
    if (status === 429) return 'Too many attempts. Please wait and try again.';
    if (status === 0) return 'Network error — check your connection.';
    return (data && data.error) ? String(data.error).replace(/_/g, ' ') : 'Something went wrong.';
  }

  // Redirect to login if there is no live token. Returns true if OK to proceed.
  function requireSession(loginPath) {
    if (!tokenAlive()) {
      clearToken();
      location.replace(loginPath || 'login.html');
      return false;
    }
    return true;
  }

  function normalizePhone(raw) {
    if (raw == null) return null;
    var d = String(raw).replace(/[^\d]/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('233') === 0 && d.length === 12) return d;
    if (d.indexOf('0') === 0 && d.length === 10) return '233' + d.slice(1);
    if (d.length === 9 && d[0] !== '0') return '233' + d;
    return null;
  }

  function waLink(phone) { return 'https://wa.me/' + String(phone).replace(/[^\d]/g, ''); }

  // Display Ghana number as 0XX XXX XXXX from 233XXXXXXXXX
  function displayPhone(phone) {
    var d = String(phone).replace(/[^\d]/g, '');
    if (d.indexOf('233') === 0 && d.length === 12) {
      var local = '0' + d.slice(3);
      return local.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function specialtyLabel(key) {
    return SPECIALTY_LABELS[key] || LEGACY_SPECIALTY_LABELS[key] || key;
  }

  // ── member photos ──────────────────────────────────────────────────────
  // Compress on the phone BEFORE upload: a 4MB camera photo becomes a
  // ~30–60KB 512px square JPEG, so members on mobile data upload almost
  // nothing and R2 storage stays negligible (50 members ≈ 3MB total).
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var SIZE = 512;
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          if (!side) return reject(new Error('invalid_image'));
          var sx = (img.naturalWidth - side) / 2;
          var sy = (img.naturalHeight - side) / 2;
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = Math.min(SIZE, side);
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('invalid_image'));
            if (blob.size <= 250 * 1024) return resolve(blob);
            // very rare (dense noise/pattern) — try harder compression
            canvas.toBlob(function (blob2) {
              if (blob2 && blob2.size <= 250 * 1024) resolve(blob2);
              else reject(new Error('photo_too_large'));
            }, 'image/jpeg', 0.55);
          }, 'image/jpeg', 0.82);
        } catch (e) { reject(new Error('invalid_image')); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('invalid_image')); };
      img.src = url;
    });
  }

  // POST a compressed JPEG blob to a photo endpoint ('/me/photo' or
  // '/admin/members/<phone>/photo'). Returns parsed JSON like api().
  async function uploadPhoto(path, blob) {
    var headers = { 'Content-Type': 'image/jpeg' };
    var t = getToken();
    if (t) headers['Authorization'] = 'Bearer ' + t;
    var res;
    try {
      res = await fetch(API + path, { method: 'POST', headers: headers, body: blob });
    } catch (e) {
      throw { status: 0, data: { error: 'network' }, message: 'Network error — check your connection.' };
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      if (res.status === 401) clearToken();
      throw { status: res.status, data: data || {}, message: errorMessage(res.status, data) };
    }
    return data;
  }

  global.Concierge = {
    API: API,
    getToken: getToken, setToken: setToken, clearToken: clearToken,
    tokenAlive: tokenAlive, requireSession: requireSession,
    api: api, errorMessage: errorMessage,
    normalizePhone: normalizePhone, waLink: waLink, displayPhone: displayPhone,
    escapeHtml: escapeHtml,
    SPECIALTY_LABELS: SPECIALTY_LABELS, SPECIALTY_ORDER: SPECIALTY_ORDER,
    LEGACY_SPECIALTY_LABELS: LEGACY_SPECIALTY_LABELS,
    SPECIALTY_EXAMPLES: SPECIALTY_EXAMPLES,
    SKILL_LABELS: SKILL_LABELS, SKILL_ORDER: SKILL_ORDER, skillLabel: skillLabel,
    ZONE_GROUPS: ZONE_GROUPS, fillZoneSelect: fillZoneSelect,
    specialtyLabel: specialtyLabel,
    compressImage: compressImage, uploadPhoto: uploadPhoto
  };
})(window);
