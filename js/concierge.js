/* ───────────────────────────────────────────────────────────────────────
   Carpentry Concierge — shared frontend helper (no framework, no build)
   Used by /concierge/login.html, directory.html, admin.html
   ─────────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  // Account subdomain matches the existing dispatch worker's host.
  var API = 'https://concierge-api.neewoodygh.workers.dev/api';
  var TOKEN_KEY = 'nwd-concierge-token';

  var SPECIALTY_LABELS = {
    furniture: 'Furniture',
    site_construction: 'Site / Construction',
    upholstery: 'Upholstery',
    glass_aluminium: 'Glass & Aluminium',
    finishing_spray: 'Finishing / Spray',
    cnc_machining: 'CNC / Machining',
    other: 'Other'
  };
  var SPECIALTY_ORDER = Object.keys(SPECIALTY_LABELS);

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
      invalid_amount: 'Amount must be a whole number of Ghana cedis.'
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

  function specialtyLabel(key) { return SPECIALTY_LABELS[key] || key; }

  global.Concierge = {
    API: API,
    getToken: getToken, setToken: setToken, clearToken: clearToken,
    tokenAlive: tokenAlive, requireSession: requireSession,
    api: api, errorMessage: errorMessage,
    normalizePhone: normalizePhone, waLink: waLink, displayPhone: displayPhone,
    escapeHtml: escapeHtml,
    SPECIALTY_LABELS: SPECIALTY_LABELS, SPECIALTY_ORDER: SPECIALTY_ORDER,
    specialtyLabel: specialtyLabel
  };
})(window);
