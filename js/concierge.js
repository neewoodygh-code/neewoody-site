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
    interior_design: 'Interior design',
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
    cnc_machining: 'Carved panels, routed doors, engraving, jigs & templates',
    interior_design: 'Space planning, concept & mood boards, finishes & materials selection'
  };

  // Skill levels — self-set by members in edit-profile (admin can correct).
  var SKILL_LABELS = {
    apprentice: 'Apprentice',
    carpenter: 'Carpenter',
    master: 'Master Carpenter'
  };
  var SKILL_ORDER = Object.keys(SKILL_LABELS);
  function skillLabel(key) { return SKILL_LABELS[key] || ''; }

  // Availability badge — seeker/giver signal on cards + jobs candidate pool.
  var AVAILABILITY_LABELS = {
    open_to_work: 'Open to work',
    hiring: 'Hiring',
    seeking_apprenticeship: 'Seeking apprenticeship',
    taking_apprentices: 'Taking apprentices'
  };
  var AVAILABILITY_ORDER = Object.keys(AVAILABILITY_LABELS);
  function availabilityLabel(key) { return AVAILABILITY_LABELS[key] || ''; }

  // Member identity type — two choices at intake: carpenter (artisan) or vendor.
  // Carpenters carry a skill level + trade specialties; vendors list what they
  // sell in their Storefront. "Interior design" is a specialty (see below) with
  // its own badge, available to either type.
  var MEMBER_TYPE_LABELS = { carpenter: 'Carpenter', vendor: 'Vendor / Service Provider' };
  var MEMBER_TYPE_ORDER = Object.keys(MEMBER_TYPE_LABELS);
  function memberTypeLabel(key) { return MEMBER_TYPE_LABELS[key] || MEMBER_TYPE_LABELS.carpenter; }
  // Small filled glyphs (Material set) — fill=currentColor.
  var ICON_CARPENTER = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>';
  var ICON_VENDOR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>';
  var ICON_INTERIOR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 10c-.55 0-1 .45-1 1v3H4v-3c0-.55-.45-1-1-1s-1 .45-1 1v5c0 .55.45 1 1 1h18c.55 0 1-.45 1-1v-5c0-.55-.45-1-1-1zm-2-3H5c-1.1 0-2 .9-2 2v1.15c1.16.41 2 1.51 2 2.82V16h14v-2.03c0-1.3.84-2.4 2-2.82V9c0-1.1-.9-2-2-2z"/></svg>';
  var MEMBER_TYPE_ICONS = { carpenter: ICON_CARPENTER, vendor: ICON_VENDOR };
  function memberTypeIcon(key) { return MEMBER_TYPE_ICONS[key] || ICON_CARPENTER; }
  var MEMBER_TYPE_COLORS = {
    carpenter: { bg: '#0b1f0e', fg: '#f0e8d0' },
    vendor:    { bg: '#8a5a2a', fg: '#f0e8d0' }
  };
  function memberTypeColor(key) { return MEMBER_TYPE_COLORS[key] || MEMBER_TYPE_COLORS.carpenter; }

  // The at-a-glance card badge. The interior_design specialty wins (its own gold
  // armchair badge — a clearer identity than a generic type); otherwise the
  // member type. Returns { key, label, icon, bg, fg }.
  function identityBadge(m) {
    var specs = (m && m.specialties) || [];
    if (specs.indexOf('interior_design') >= 0) {
      return { key: 'interior_design', label: 'Interior Designer', icon: ICON_INTERIOR, bg: '#c8922a', fg: '#241500' };
    }
    var t = (m && m.member_type) || 'carpenter';
    var c = memberTypeColor(t);
    return { key: t, label: memberTypeLabel(t), icon: memberTypeIcon(t), bg: c.bg, fg: c.fg };
  }

  // Vendors headline with their company name; everyone else with their own name.
  function companyName(m) { return (m && (m.business_name || m.name)) || 'Member'; }
  // Keyless map: an OpenStreetMap embed iframe URL + a Google Maps directions link.
  function mapEmbedUrl(lat, lng) {
    var d = 0.008, bbox = [lng - d, lat - d, lng + d, lat + d].join(',');
    return 'https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + lat + ',' + lng;
  }
  function mapsDirLink(lat, lng) { return 'https://www.google.com/maps?q=' + lat + ',' + lng; }

  // Vendor shop-size scale — the vendor parallel to a carpenter's skill level.
  var VENDOR_SCALE_LABELS = { stall: 'Stall', shop: 'Shop', showroom: 'Showroom', warehouse: 'Warehouse' };
  var VENDOR_SCALE_ORDER = Object.keys(VENDOR_SCALE_LABELS);
  function vendorScaleLabel(k) { return VENDOR_SCALE_LABELS[k] || ''; }

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
      cannot_delete_self: 'You cannot delete your own admin account.',
      invalid_availability: 'Choose a valid availability option.',
      zone_required: 'Choose the zone where the job is.',
      invalid_trade: 'Choose a valid trade for the job.',
      invalid_workers: 'Workers needed must be between 1 and 50.',
      description_too_long: 'Keep the job details under 1000 characters.',
      too_many_open_jobs: 'You have too many open jobs — mark some as filled or delete them first.',
      name_required: 'Please enter your name.',
      too_many_pending: 'You already have a few requests waiting for review — we\'ll get to them shortly.',
      too_many_recent: 'You\'ve posted a few requests just now — please try again in a little while.',
      pending_review: 'Your membership is still being reviewed. You\'ll be able to log in once it\'s approved — we\'ll be in touch on WhatsApp.',
      account_suspended: 'This account is suspended. Please contact Neewoody on WhatsApp.'
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

  // ── job alerts (Web Push) ────────────────────────────────────────────
  // Concierge's own VAPID public key (separate keypair from dispatch).
  var VAPID_PUBLIC = 'BEK48elSj71usxsM8HonURgA8qwwirE0m7MUTnm9ltOlNkS8zfJcSAsCcHJBuombdNrDENaOPhnnWxJMBy_mHv4';

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function vapidKeyBytes() {
    var b64 = VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/');
    var pad = b64 + '='.repeat((4 - b64.length % 4) % 4);
    var bin = atob(pad);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  // Returns the active PushSubscription for this device, or null.
  async function getPushSub(swPath) {
    if (!pushSupported()) return null;
    var reg = await navigator.serviceWorker.register(swPath || 'sw.js');
    return reg.pushManager.getSubscription();
  }
  // Subscribe this device + save on the server. Throws on denial/failure.
  async function enablePush(swPath) {
    if (!pushSupported()) throw new Error('push_unsupported');
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('permission_denied');
    var reg = await navigator.serviceWorker.register(swPath || 'sw.js');
    var ready = await navigator.serviceWorker.ready;
    var sub = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes()
    });
    await api('/me/push', { method: 'POST', body: { subscription: sub.toJSON() } });
    return sub;
  }
  async function disablePush(swPath) {
    var sub = await getPushSub(swPath);
    if (!sub) return;
    var endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch (e) {}
    try { await api('/me/push', { method: 'DELETE', body: { endpoint: endpoint } }); } catch (e) {}
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
    AVAILABILITY_LABELS: AVAILABILITY_LABELS, AVAILABILITY_ORDER: AVAILABILITY_ORDER, availabilityLabel: availabilityLabel,
    MEMBER_TYPE_LABELS: MEMBER_TYPE_LABELS, MEMBER_TYPE_ORDER: MEMBER_TYPE_ORDER, memberTypeLabel: memberTypeLabel,
    MEMBER_TYPE_ICONS: MEMBER_TYPE_ICONS, memberTypeIcon: memberTypeIcon,
    MEMBER_TYPE_COLORS: MEMBER_TYPE_COLORS, memberTypeColor: memberTypeColor,
    identityBadge: identityBadge, companyName: companyName,
    mapEmbedUrl: mapEmbedUrl, mapsDirLink: mapsDirLink,
    VENDOR_SCALE_LABELS: VENDOR_SCALE_LABELS, VENDOR_SCALE_ORDER: VENDOR_SCALE_ORDER, vendorScaleLabel: vendorScaleLabel,
    ZONE_GROUPS: ZONE_GROUPS, fillZoneSelect: fillZoneSelect,
    specialtyLabel: specialtyLabel,
    compressImage: compressImage, uploadPhoto: uploadPhoto,
    pushSupported: pushSupported, getPushSub: getPushSub,
    enablePush: enablePush, disablePush: disablePush
  };
})(window);
