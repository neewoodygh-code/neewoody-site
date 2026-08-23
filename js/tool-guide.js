/* ============================================================================
   tool-guide.js — reusable "How to use this tool" tutorial panel.

   Purpose: fill the dead space beside the (centered) member tools with a short,
   skimmable step-by-step guide. Two render modes, one shared look
   (navy/gold/cream Concierge palette, Playfair + Jost):

   • INLINE mode  (pass cfg.mount) — renders a sticky sidebar INTO a page-supplied
     column. Flows in the layout, so it never overlaps a full-width hero/footer.
     On phones it collapses to a tappable "How to use ▾" bar above the tool.
     Used by cutlist.html (a static 2-column shell).

   • FLOATING mode (no cfg.mount) — a viewport-fixed left rail on wide screens,
     collapsing to a "How to use" button + slide-in drawer on phones. Drops onto
     a page whose content is centered with no wide hero (e.g. the React
     carpenter-pricing.html SPA) without touching its layout.

   Self-contained: no dependencies, injects its own <style>.

   Usage:
     ToolGuide.init({
       mount:   '#cutGuide',        // omit for floating mode
       eyebrow: 'Wardrobe Cutlist',
       title:   'How to use this tool',
       steps:   [{ t:'Choose units', d:'…' }, …],   // auto-numbered
       tips:    ['…', '…'],                          // optional
       top:     88                                   // sticky/docked top offset px
     });
   ============================================================================ */
(function () {
  'use strict';
  if (window.ToolGuide) return;

  var STYLE = ''
    + '#tgRoot,#tgFab,#tgBackdrop,.tg-inline{--tg-navy:#1f2f58;--tg-gold:#c8922a;--tg-cream:#f0e8d0;'
    +   '--tg-cream2:#e8dfc4;--tg-border:#d4c9b0;--tg-ink:#1c1c1a;--tg-muted:#6b6557;'
    +   '--tg-top:88px;box-sizing:border-box;'
    +   "font-family:'Jost',system-ui,-apple-system,sans-serif}"
    + '#tgRoot *,#tgFab *,.tg-inline *{box-sizing:border-box}'
    /* ── Shared header ── */
    + '.tg-head{background:var(--tg-navy);color:var(--tg-cream);padding:15px 16px;flex:0 0 auto;position:relative}'
    + '.tg-eyebrow{font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--tg-gold)}'
    + ".tg-title{font-family:'Playfair Display',Georgia,serif;font-size:1.1rem;line-height:1.2;margin:.3rem 0 0;color:#fff}"
    + '.tg-chev{position:absolute;top:50%;right:14px;transform:translateY(-50%);color:var(--tg-gold);font-size:.8rem;transition:transform .2s}'
    + '.tg-close{position:absolute;top:12px;right:12px;width:30px;height:30px;border:none;border-radius:6px;'
    +   'background:rgba(240,232,208,.14);color:var(--tg-cream);font-size:1.1rem;line-height:1;cursor:pointer}'
    + '.tg-close:hover{background:rgba(240,232,208,.26)}'
    /* ── Shared body ── */
    + '.tg-body{padding:15px 16px 20px;overflow-y:auto;flex:1 1 auto;background:var(--tg-cream)}'
    + '.tg-steps{list-style:none;margin:0;padding:0;counter-reset:tg}'
    + '.tg-steps li{counter-increment:tg;position:relative;padding:0 0 15px 38px;margin:0}'
    + '.tg-steps li:not(:last-child)::after{content:"";position:absolute;left:13px;top:29px;bottom:2px;width:2px;background:var(--tg-cream2)}'
    + '.tg-steps li::before{content:counter(tg);position:absolute;left:0;top:0;width:27px;height:27px;border-radius:50%;'
    +   "background:var(--tg-gold);color:#241500;font-weight:700;font-size:.82rem;display:flex;align-items:center;justify-content:center;font-family:'Jost',sans-serif}"
    + '.tg-st{font-weight:600;font-size:.88rem;color:var(--tg-navy);line-height:1.3;padding-top:3px}'
    + '.tg-sd{font-size:.81rem;color:var(--tg-muted);line-height:1.5;margin-top:3px}'
    + '.tg-sd strong{color:var(--tg-ink)}'
    + '.tg-tips{margin-top:4px;background:rgba(200,146,42,.12);border:1px solid rgba(200,146,42,.35);border-radius:8px;padding:11px 13px}'
    + '.tg-tips h4{margin:0 0 7px;font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tg-gold)}'
    + '.tg-tips ul{margin:0;padding:0;list-style:none}'
    + '.tg-tips li{font-size:.79rem;color:var(--tg-ink);line-height:1.5;padding-left:15px;position:relative;margin-bottom:6px}'
    + '.tg-tips li:last-child{margin-bottom:0}'
    + '.tg-tips li::before{content:"›";position:absolute;left:0;top:-1px;color:var(--tg-gold);font-weight:700}'
    /* ── INLINE mode (sticky sidebar / mobile collapsible) ── */
    + '.tg-inline{display:flex;flex-direction:column;border:1px solid var(--tg-border);border-radius:12px;overflow:hidden;'
    +   'box-shadow:0 8px 24px rgba(15,23,42,.08);margin-bottom:1.25rem}'
    + '.tg-inline .tg-head{cursor:pointer;user-select:none}'
    + '.tg-inline .tg-body{display:none}'
    + '.tg-inline.tg-expanded .tg-body{display:block}'
    + '.tg-inline.tg-expanded .tg-chev{transform:translateY(-50%) rotate(180deg)}'
    + '@media (min-width:1000px){'
    +   '.tg-inline{position:sticky;top:var(--tg-top);max-height:calc(100vh - var(--tg-top) - 16px)}'
    +   '.tg-inline .tg-head{cursor:default}'
    +   '.tg-inline .tg-body{display:block!important}'
    +   '.tg-inline .tg-chev{display:none}'
    + '}'
    /* ── FLOATING mode (drawer base + wide-screen dock) ── */
    + '#tgRoot{position:fixed;top:0;left:0;z-index:1200;width:min(340px,88vw);height:100%;background:var(--tg-cream);'
    +   'border-right:1px solid var(--tg-border);box-shadow:0 20px 60px rgba(15,23,42,.32);display:flex;flex-direction:column;'
    +   'transform:translateX(-102%);transition:transform .28s cubic-bezier(.4,0,.2,1)}'
    + '#tgRoot.tg-open{transform:translateX(0)}'
    + '#tgBackdrop{position:fixed;inset:0;z-index:1190;background:rgba(15,23,42,.5);opacity:0;visibility:hidden;transition:opacity .28s}'
    + '#tgBackdrop.tg-open{opacity:1;visibility:visible}'
    + '#tgFab{position:fixed;left:16px;bottom:18px;z-index:850;display:inline-flex;align-items:center;gap:8px;'
    +   'background:var(--tg-navy);color:var(--tg-cream);border:1px solid var(--tg-gold);border-radius:30px;'
    +   'padding:11px 16px;font-size:.82rem;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(15,23,42,.28)}'
    + '#tgFab:hover{background:#26386a}'
    + '#tgFab svg{width:17px;height:17px;flex:0 0 auto}'
    + '#tgFab .tg-fab-x{display:none}'
    + '#tgRoot.tg-open ~ #tgFab .tg-fab-t,#tgRoot.tg-open ~ #tgFab svg{display:none}'
    + '#tgRoot.tg-open ~ #tgFab .tg-fab-x{display:inline}'
    + '@media (min-width:1300px){'
    +   '#tgRoot{top:var(--tg-top);left:16px;height:auto;max-height:calc(100vh - var(--tg-top) - 20px);width:236px;'
    +     'transform:none;border:1px solid var(--tg-border);border-radius:12px;z-index:40;box-shadow:0 10px 30px rgba(15,23,42,.10);overflow:hidden}'
    +   '#tgRoot .tg-title{font-size:1.05rem}'
    +   '#tgRoot .tg-close{display:none}'
    +   '#tgFab,#tgBackdrop{display:none!important}'
    + '}'
    + '@media print{#tgRoot,#tgFab,#tgBackdrop,.tg-inline{display:none!important}}';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Allow **bold** and literal <strong> emphasis in step/tip text; everything
  // else stays escaped (content is author-supplied via init, so this is safe).
  function fmt(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
  }

  function buildHead(cfg, withChevron, withClose) {
    var head = el('div', 'tg-head');
    if (cfg.eyebrow) head.appendChild(el('div', 'tg-eyebrow', esc(cfg.eyebrow)));
    head.appendChild(el('div', 'tg-title', esc(cfg.title || 'How to use this tool')));
    if (withChevron) head.appendChild(el('span', 'tg-chev', '▾'));
    if (withClose) {
      var c = el('button', 'tg-close', '&times;');
      c.setAttribute('aria-label', 'Close guide');
      head.appendChild(c);
    }
    return head;
  }
  function buildBody(cfg) {
    var body = el('div', 'tg-body');
    var ol = el('ol', 'tg-steps');
    (cfg.steps || []).forEach(function (s) {
      var li = el('li');
      li.appendChild(el('div', 'tg-st', esc(s.t || '')));
      if (s.d) li.appendChild(el('div', 'tg-sd', fmt(s.d)));
      ol.appendChild(li);
    });
    body.appendChild(ol);
    if (cfg.tips && cfg.tips.length) {
      var tips = el('div', 'tg-tips');
      tips.appendChild(el('h4', null, esc(cfg.tipsTitle || 'Tips')));
      var ul = el('ul');
      cfg.tips.forEach(function (t) { ul.appendChild(el('li', null, fmt(t))); });
      tips.appendChild(ul);
      body.appendChild(tips);
    }
    return body;
  }
  function ensureStyle() {
    if (!document.getElementById('tg-style')) {
      var st = el('style'); st.id = 'tg-style'; st.textContent = STYLE;
      document.head.appendChild(st);
    }
  }

  function initInline(cfg, mountEl) {
    ensureStyle();
    var old = mountEl.querySelector('.tg-inline'); if (old) old.remove();
    var panel = el('aside', 'tg-inline');
    panel.setAttribute('aria-label', 'How to use this tool');
    if (cfg.top) panel.style.setProperty('--tg-top', cfg.top + 'px');
    var head = buildHead(cfg, true, false);
    panel.appendChild(head);
    panel.appendChild(buildBody(cfg));
    mountEl.appendChild(panel);
    // Collapsible only where the chevron is shown (narrow screens).
    head.addEventListener('click', function () { panel.classList.toggle('tg-expanded'); });
    return { el: panel };
  }

  function initFloating(cfg) {
    ensureStyle();
    ['tgRoot', 'tgFab', 'tgBackdrop'].forEach(function (id) {
      var o = document.getElementById(id); if (o) o.remove();
    });
    var backdrop = el('div'); backdrop.id = 'tgBackdrop';
    var root = el('div'); root.id = 'tgRoot';
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-label', 'How to use this tool');
    if (cfg.top) root.style.setProperty('--tg-top', cfg.top + 'px');
    var head = buildHead(cfg, false, true);
    root.appendChild(head);
    root.appendChild(buildBody(cfg));

    var fab = el('button'); fab.id = 'tgFab'; fab.type = 'button';
    fab.setAttribute('aria-label', 'How to use this tool');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M12 17h.01"/><path d="M12 13.5a2 2 0 1 0-2.5-2.9"/><circle cx="12" cy="12" r="10"/></svg>'
      + '<span class="tg-fab-t">How to use</span><span class="tg-fab-x">Close guide</span>';

    document.body.appendChild(backdrop);
    document.body.appendChild(root);
    document.body.appendChild(fab);

    var closeBtn = head.querySelector('.tg-close');
    function open() { root.classList.add('tg-open'); backdrop.classList.add('tg-open'); fab.setAttribute('aria-expanded', 'true'); }
    function close() { root.classList.remove('tg-open'); backdrop.classList.remove('tg-open'); fab.setAttribute('aria-expanded', 'false'); }
    fab.addEventListener('click', function () { root.classList.contains('tg-open') ? close() : open(); });
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    return { open: open, close: close };
  }

  function init(cfg) {
    cfg = cfg || {};
    var mount = cfg.mount
      ? (typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount)
      : null;
    return mount ? initInline(cfg, mount) : initFloating(cfg);
  }

  window.ToolGuide = { init: init };
})();
