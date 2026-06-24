/* cms-posts.js — fetches CMS posts for this page and renders cream cards
   (image-top, text body below). Clicking a card opens a project modal that
   matches the site-wide pm-* modal: two-column (media + write-up), a main
   image with a thumbnail strip, and click-to-zoom. Uses .cms-* classes /
   its own overlay so it never clashes with the inline pm-* component on
   pages that have both. */

(function () {
  'use strict';

  var MEDIA_BASE = 'https://neewoodygh.com';
  var API        = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var PAGE_LABELS = {
    'index':         'Recent Work',
    'wardrobes':     'Wardrobes',     'kitchens':      'Kitchens',
    'beds':          'Beds',          'tv-units':      'TV Units',
    'dining-living': 'Dining & Living','shelving':     'Shelving',
    'solid-wood':    'Solid Wood',    'portfolio':     'Portfolio',
  };

  var container = document.getElementById('cms-posts');
  if (!container) return;
  var slug = container.getAttribute('data-page');
  if (!slug) return;

  // ── Styles ──────────────────────────────────────────────────────────────
  if (!document.getElementById('cms-posts-style')) {
    var style = document.createElement('style');
    style.id = 'cms-posts-style';
    style.textContent =
      /* eyebrow label */
      '.cms-label{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:400;' +
        'letter-spacing:0.32em;text-transform:uppercase;color:var(--muted,#6b6557);' +
        'display:block;margin-bottom:2rem}' +
      /* grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}' +
      /* card */
      '.cms-card{background:var(--cream-dark,#e8dfc4);overflow:hidden;cursor:pointer}' +
      '.cms-card-img{position:relative;aspect-ratio:4/3;overflow:hidden}' +
      '.cms-card-img img{width:100%;height:100%;object-fit:cover;display:block;' +
        'transition:transform 0.5s ease}' +
      '.cms-card-img:hover img{transform:scale(1.04)}' +
      '.cms-badge{position:absolute;top:0.75rem;left:0.75rem;' +
        'font-family:"Jost",sans-serif;font-size:0.58rem;font-weight:500;' +
        'letter-spacing:0.14em;text-transform:uppercase;' +
        'background:var(--green,#0b1f0e);color:var(--gold,#c8922a);' +
        'padding:0.2rem 0.55rem;pointer-events:none}' +
      '.cms-card-body{padding:1.1rem 1.2rem 1.4rem}' +
      '.cms-card-title{font-family:"Playfair Display",Georgia,serif;font-size:0.88rem;' +
        'font-weight:400;color:var(--ink,#1c1c1a);margin-bottom:0.3rem;' +
        'display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem}' +
      '.cms-card-title span{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:300;' +
        'letter-spacing:0.12em;color:var(--muted,#6b6557);flex-shrink:0}' +
      '.cms-card-caption{font-family:"Lora",Georgia,serif;font-size:0.8rem;' +
        'line-height:1.6;color:var(--muted,#6b6557)}' +

      /* ── modal (pm-style) ── */
      '.cms-overlay{position:fixed;inset:0;z-index:1000;background:rgba(11,31,14,0.78);' +
        '-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:none;' +
        'align-items:center;justify-content:center;padding:2.5rem}' +
      '.cms-overlay.open{display:flex}' +
      '.cms-dialog{position:relative;background:var(--cream,#f0e8d0);max-width:1080px;' +
        'width:100%;max-height:88vh;overflow:hidden;display:grid;' +
        'grid-template-columns:1.25fr 1fr;box-shadow:0 24px 80px rgba(0,0,0,0.55)}' +
      '.cms-close{position:absolute;top:0.8rem;right:0.9rem;z-index:5;' +
        'background:rgba(11,31,14,0.55);color:#fff;border:none;width:34px;height:34px;' +
        'font-size:1.4rem;line-height:1;cursor:pointer;transition:background 0.2s}' +
      '.cms-close:hover{background:var(--green,#0b1f0e)}' +
      '.cms-media{background:#000;display:flex;flex-direction:column;min-height:0}' +
      '.cms-main{position:relative;flex:1;min-height:0;overflow:hidden;cursor:zoom-in;background:#000}' +
      '.cms-main img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.cms-main::after{content:"\\2922";position:absolute;bottom:0.6rem;right:0.7rem;' +
        'color:#fff;font-size:1rem;background:rgba(0,0,0,0.45);width:26px;height:26px;' +
        'display:flex;align-items:center;justify-content:center;pointer-events:none}' +
      '.cms-thumbs{display:flex;gap:2px;padding:2px;background:#000;overflow-x:auto;flex-shrink:0}' +
      '.cms-thumb{flex:0 0 auto;width:76px;height:58px;border:none;padding:0;cursor:pointer;' +
        'opacity:0.5;transition:opacity 0.2s;background:#222}' +
      '.cms-thumb img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.cms-thumb.is-active,.cms-thumb:hover{opacity:1}' +
      '.cms-text{padding:2.6rem 2.4rem;overflow-y:auto}' +
      '.cms-eyebrow{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:400;' +
        'letter-spacing:0.28em;text-transform:uppercase;color:var(--gold,#c8922a);' +
        'margin-bottom:0.7rem;display:block}' +
      '.cms-text h2{font-family:"Playfair Display",Georgia,serif;' +
        'font-size:clamp(1.4rem,2.4vw,2rem);font-weight:400;line-height:1.15;' +
        'color:var(--ink,#1c1c1a);margin-bottom:0.6rem}' +
      '.cms-meta{font-family:"Jost",sans-serif;font-size:0.62rem;font-weight:300;' +
        'letter-spacing:0.1em;text-transform:uppercase;color:var(--muted,#6b6557);margin-bottom:1.4rem}' +
      '.cms-text p.cms-para{font-family:"Lora",Georgia,serif;font-size:0.88rem;' +
        'line-height:1.8;color:var(--muted,#6b6557);margin-bottom:1rem}' +
      '.cms-text p.cms-para:last-child{margin-bottom:0}' +

      /* ── zoom ── */
      '.cms-zoom{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.93);display:none;' +
        'align-items:center;justify-content:center;cursor:zoom-out;padding:2rem}' +
      '.cms-zoom.open{display:flex}' +
      '.cms-zoom img{max-width:95vw;max-height:92vh;object-fit:contain}' +

      /* ── responsive ── */
      '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:820px){' +
        '.cms-overlay{padding:0}' +
        '.cms-dialog{grid-template-columns:1fr;max-height:100vh;height:100dvh}' +
        '.cms-media{height:44vh}' +
        '.cms-text{padding:1.8rem 1.5rem}' +
      '}' +
      '@media(max-width:600px){.cms-grid{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  // ── Modal (pm-style: media column + text column) ──────────────────────
  var overlay = mkEl('div','cms-overlay');
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
  var dialog   = mkEl('div','cms-dialog');
  var closeBtn = mkEl('button','cms-close'); closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label','Close');
  var media    = mkEl('div','cms-media');
  var mainWrap = mkEl('div','cms-main');
  var mainImg  = mkEl('img');
  mainWrap.appendChild(mainImg);
  var thumbs   = mkEl('div','cms-thumbs');
  media.appendChild(mainWrap); media.appendChild(thumbs);
  var textCol  = mkEl('div','cms-text');
  dialog.appendChild(closeBtn); dialog.appendChild(media); dialog.appendChild(textCol);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // ── Zoom layer ────────────────────────────────────────────────────────
  var zoomEl  = mkEl('div','cms-zoom'); zoomEl.setAttribute('role','dialog');
  var zoomImg = mkEl('img');
  zoomEl.appendChild(zoomImg);
  document.body.appendChild(zoomEl);

  var imgs = [];
  function setMain(i) {
    if (!imgs[i]) return;
    mainImg.src = abs(imgs[i]);
    var ch = thumbs.children;
    for (var t = 0; t < ch.length; t++) ch[t].classList.toggle('is-active', t === i);
  }

  function openModal(post) {
    imgs = (post.images || []).filter(Boolean);

    var html = '';
    if (post.category) html += '<span class="cms-eyebrow">' + esc(post.category) + '</span>';
    html += '<h2>' + esc(post.title || '') + '</h2>';
    var metaBits = [];
    if (post.location) metaBits.push(esc(post.location));
    if (post.date)     metaBits.push(post.date.slice(0, 4));
    if (metaBits.length) html += '<p class="cms-meta">' + metaBits.join(' &middot; ') + '</p>';
    if (post.writeup) {
      post.writeup.split(/\n+/).forEach(function (par) {
        if (par.trim()) html += '<p class="cms-para">' + esc(par.trim()) + '</p>';
      });
    }
    textCol.innerHTML = html; textCol.scrollTop = 0;

    thumbs.innerHTML = '';
    imgs.forEach(function (src, i) {
      var b  = mkEl('button','cms-thumb'); b.type = 'button';
      var im = mkEl('img'); im.src = abs(src); im.alt = ''; im.loading = 'lazy';
      b.appendChild(im);
      b.addEventListener('click', (function (idx) { return function () { setMain(idx); }; })(i));
      thumbs.appendChild(b);
    });
    thumbs.style.display = imgs.length > 1 ? 'flex' : 'none';

    setMain(0);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  mainWrap.addEventListener('click', function () {
    if (!mainImg.src) return;
    zoomImg.src = mainImg.src;
    zoomEl.classList.add('open');
  });
  zoomEl.addEventListener('click', function () { zoomEl.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (zoomEl.classList.contains('open')) zoomEl.classList.remove('open');
    else if (overlay.classList.contains('open')) closeModal();
  });

  // ── Fetch & render cards ──────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data.posts || []).filter(function (p) { return p.images && p.images[0]; });
      if (!posts.length) return;

      var label = mkEl('span','cms-label');
      label.textContent = PAGE_LABELS[slug] || 'Recent work';

      var grid = mkEl('div','cms-grid');

      posts.forEach(function (p) {
        var year    = p.date ? p.date.slice(0, 4) : '';
        var caption = p.writeup
          ? (p.writeup.length > 110 ? p.writeup.slice(0, 108).trim() + '…' : p.writeup)
          : (p.location || '');

        var card = mkEl('article','cms-card');
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.setAttribute('aria-label', p.title || 'View project');

        var imgWrap = mkEl('div','cms-card-img');
        var img     = mkEl('img');
        img.src = abs(p.images[0]); img.alt = ''; img.loading = 'lazy';
        var badge   = mkEl('span','cms-badge');
        badge.textContent = p.category || '';
        imgWrap.appendChild(img);
        imgWrap.appendChild(badge);

        var body     = mkEl('div','cms-card-body');
        var titleRow = mkEl('div','cms-card-title');
        titleRow.appendChild(document.createTextNode(p.title || ''));
        if (year) {
          var yearEl = mkEl('span');
          yearEl.textContent = year;
          titleRow.appendChild(yearEl);
        }
        body.appendChild(titleRow);
        if (caption) {
          var cap = mkEl('p','cms-card-caption');
          cap.textContent = caption;
          body.appendChild(cap);
        }

        card.appendChild(imgWrap);
        card.appendChild(body);
        card.addEventListener('click', function () { openModal(p); });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); }
        });
        grid.appendChild(card);
      });

      container.appendChild(label);
      container.appendChild(grid);
      container.style.display = 'block';
    })
    .catch(function () {});

  // ── Helpers ───────────────────────────────────────────────────────────
  function mkEl(tag, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }
  function abs(src) {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : MEDIA_BASE + src;
  }
  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
