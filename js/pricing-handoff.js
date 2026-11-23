/* © 2015–2026 Neewoody Custom Woodwork, Accra. All rights reserved. Not licensed for copying, rebranding or resale;
 * see https://neewoodygh.com/terms */
/* "Price this job": hands a generator's materials to Job Pricing (carpenter-pricing.html) as a new quote.
 * Members only (owner 2026-11-21). Used by the Cut Sheet, the Smart Generator and the cutlist.
 *
 * PricingHandoff.send({from, item, note, lines}) with lines = [{group, name, qty, price}]
 *   group = the Job Pricing material line it goes under: 'Boards' | 'Back panels' | 'Edge band' |
 *           'Edge banding application' | 'Fixtures'
 *   name  = a stable name (no counts in it), so Job Pricing can reuse the price the member typed last time
 *   price = the owner's price; Job Pricing only uses it for the owner's own account
 * Only quantities are sent: labour, days, tier and logistics stay with the carpenter.
 * PricingHandoff.fromMaterials(m) turns WardrobePrice.materials() output into lines. */
(function () {
  'use strict';
  var KEY = 'nwd-pricing-handoff';
  function member() { return !!(window.Concierge && Concierge.tokenAlive && Concierge.tokenAlive()); }
  function fromMaterials(m) {
    return (m && m.lines || []).filter(function (l) { return l.group && l.qty > 0; })
      .map(function (l) { return { group: l.group, name: l.name, qty: l.qty, price: l.unit || 0 }; });
  }
  function send(h) {
    if (!member()) {
      if (confirm('Sending a job to Job Pricing is for Carpentry Concierge members.\n\nLog in or join now?'))
        location.href = '/concierge/login.html?next=' + encodeURIComponent(location.pathname + location.hash);
      return false;
    }
    if (!h.lines || !h.lines.length) { alert('Nothing to price yet: add some parts first.'); return false; }
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, at: Date.now(), from: h.from, item: h.item || '', note: h.note || '', lines: h.lines })); }
    catch (e) { alert('Could not pass the job on: this browser is blocking storage.'); return false; }
    location.href = '/carpenter-pricing.html#from-tools';
    return true;
  }
  window.PricingHandoff = { KEY: KEY, member: member, send: send, fromMaterials: fromMaterials };
})();
