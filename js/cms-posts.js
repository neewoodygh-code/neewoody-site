/* cms-posts.js — fetches CMS posts for this page slug, renders a card grid,
   opens a single-image detail modal with prev/next navigation on click. */

(function () {
  'use strict';

  var MEDIA_BASE = 'https://neewoodygh.com';
  var API        = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var PAGE_LABELS = {
    'wardrobes':     'Wardrobes',
    'kitchens':      'Kitchens',
    'beds':          'Beds',
    'tv-units':      'TV Units',
    'dining-living': 'Dining & Living',
    'shelving':      'Shelving',
    'solid-wood':    'Solid Wood',
    'portfolio':     'Portfolio',
  };

  var container = document.getElementById('cms-posts');
  if (!container) return;
  var slug = container.getAttribute('data-page');
  if (!slug) return;

  // ── Styles ─────────────────────────────────────────────────────────────
  if (!document.getElementById('cms-posts-style')) {
    var style = document.createElement('style');
    style.id = 'cms-posts-style';
    style.textContent =
      /* section label */
      '.cms-label{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:400;' +
        'letter-spacing:0.32em;text-transform:uppercase;color:var(--muted,#6b6557);' +
        'display:block;margin-bottom:2rem}' +
      /* card grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}' +
      '.cms-card{position:relative;overflow:hidden;background:#0b1f0e;height:320px;cursor:pointer}' +
      '.cms-card img{width:100%;height:100%;object-fit:cover;filter:brightness(.85);' +
        'transition:transform .8s ease,filter .4s;display:block;pointer-events:none}' +
      '.cms-card:hover img{transform:scale(1.06);filter:brightness(.6)}' +
      '.cms-meta{position:absolute;bottom:0;left:0;right:0;padding:1.2rem 1.4rem;' +
        'background:linear-gradient(to top,rgba(11,31,14,.92),transparent);' +
        'transform:translateY(5px);transition:transform .3s;pointer-events:none}' +
      '.cms-card:hover .cms-meta{transform:translateY(0)}' +
      '.cms-cat{font-family:"Jost",sans-serif;font-size:.58rem;font-weight:400;' +
        'letter-spacing:.25em;text-transform:uppercase;color:#c8922a;margin-bottom:.2rem;display:block}' +
      '.cms-name{font-family:"Playfair Display",Georgia,serif;font-size:.92rem;' +
        'font-weight:400;color:#f0e8d0;line-height:1.3;display:block}' +
      '.cms-loc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.75rem;' +
        'color:rgba(240,232,208,.55);margin-top:.15rem;display:block}' +
      /* modal overlay */
      '.cms-overlay{position:fixed;inset:0;z-index:800;background:rgba(11,31,14,.72);' +
        'display:flex;align-items:center;justify-content:center;padding:1.5rem;' +
        'opacity:0;pointer-events:none;transition:opacity .25s}' +
      '.cms-overlay.open{opacity:1;pointer-events:auto}' +
      /* modal box */
      '.cms-modal{background:#f0e8d0;max-width:680px;width:100%;max-height:90vh;' +
        'overflow-y:auto;position:relative;display:flex;flex-direction:column}' +
      /* single image viewer inside modal */
      '.cms-viewer{position:relative;background:#0b1f0e;flex-shrink:0;height:320px;overflow:hidden}' +
      '.cms-viewer img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in}' +
      '.cms-viewer-nav{position:absolute;top:0;bottom:0;display:flex;align-items:center;' +
        'padding:0 .6rem;background:transparent;border:none;cursor:pointer;' +
        'color:rgba(240,232,208,.85);font-size:1.4rem;line-height:1;z-index:2;' +
        'transition:background .2s}' +
      '.cms-viewer-nav:hover{background:rgba(11,31,14,.35)}' +
      '.cms-viewer-nav.prev{left:0}.cms-viewer-nav.next{right:0}' +
      '.cms-viewer-nav:disabled{opacity:.2;cursor:default}' +
      '.cms-viewer-nav:disabled:hover{background:transparent}' +
      /* image counter */
      '.cms-counter{position:absolute;bottom:.6rem;left:50%;transform:translateX(-50%);' +
        'font-family:"Jost",sans-serif;font-size:.58rem;letter-spacing:.15em;' +
        'color:rgba(240,232,208,.6);background:rgba(11,31,14,.5);' +
        'padding:.2rem .6rem;pointer-events:none}' +
      /* modal body text */
      '.cms-mbody{padding:1.6rem 2rem 2rem}' +
      '.cms-mcat{font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;' +
        'letter-spacing:.28em;text-transform:uppercase;color:#c8922a;margin-bottom:.5rem;display:block}' +
      '.cms-mtitle{font-family:"Playfair Display",Georgia,serif;font-size:1.45rem;' +
        'font-weight:400;color:#1c1c1a;line-height:1.15;margin-bottom:.3rem}' +
      '.cms-mloc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.85rem;' +
        'color:#6b6557;margin-bottom:1rem;display:block}' +
      '.cms-mtext{font-family:"Lora",Georgia,serif;font-size:.9rem;line-height:1.85;color:#4A4540}' +
      '.cms-mclose{position:absolute;top:.8rem;right:1rem;background:none;border:none;' +
        'cursor:pointer;font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#6b6557;z-index:10}' +
      '.cms-mclose:hover{color:#1c1c1a}' +
      /* zoom overlay */
      '.cms-zoom{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.92);' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0;pointer-events:none;transition:opacity .2s}' +
      '.cms-zoom.open{opacity:1;pointer-events:auto}' +
      '.cms-zoom-img{max-width:95vw;max-height:88vh;object-fit:contain;display:block}' +
      '.cms-zoom-nav{position:absolute;top:50%;transform:translateY(-50%);' +
        'background:rgba(255,255,255,.1);border:none;cursor:pointer;' +
        'color:#fff;font-size:1.8rem;line-height:1;padding:.6rem .9rem;' +
        'transition:background .2s}' +
      '.cms-zoom-nav:hover{background:rgba(255,255,255,.2)}' +
      '.cms-zoom-nav.prev{left:.75rem}.cms-zoom-nav.next{right:.75rem}' +
      '.cms-zoom-nav:disabled{opacity:.2;cursor:default}' +
      '.cms-zoom-close{position:absolute;top:1rem;right:1rem;background:none;border:none;' +
        'cursor:pointer;color:rgba(255,255,255,.65);font-family:"Jost",sans-serif;' +
        'font-size:.65rem;letter-spacing:.2em;text-transform:uppercase}' +
      '.cms-zoom-close:hover{color:#fff}' +
      '.cms-zoom-count{position:absolute;bottom:1.2rem;left:50%;transform:translateX(-50%);' +
        'font-family:"Jost",sans-serif;font-size:.62rem;letter-spacing:.15em;' +
        'color:rgba(255,255,255,.5)}' +
      /* responsive */
      '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:600px){' +
        '.cms-grid{grid-template-columns:1fr}.cms-card{height:260px}' +
        '.cms-viewer{height:240px}' +
        '.cms-mbody{padding:1.2rem 1.25rem 1.5rem}' +
      '}';
    document.head.appendChild(style);
  }

  // ── Shared image state (used by both modal viewer and zoom) ──────────
  var currentImages = [];
  var currentIndex  = 0;

  // ── Zoom overlay ───────────────────────────────────────────────────────
  var zoomEl = mkEl('div', 'cms-zoom');
  zoomEl.setAttribute('role', 'dialog');

  var zoomImgEl    = mkEl('img', 'cms-zoom-img');
  var zoomClose    = mkEl('button', 'cms-zoom-close'); zoomClose.textContent = '✕ Close';
  var zoomPrev     = mkEl('button', 'cms-zoom-nav prev'); zoomPrev.innerHTML = '&#8249;';
  var zoomNext     = mkEl('button', 'cms-zoom-nav next'); zoomNext.innerHTML = '&#8250;';
  var zoomCountEl  = mkEl('span',   'cms-zoom-count');

  zoomEl.appendChild(zoomImgEl);
  zoomEl.appendChild(zoomClose);
  zoomEl.appendChild(zoomPrev);
  zoomEl.appendChild(zoomNext);
  zoomEl.appendChild(zoomCountEl);
  document.body.appendChild(zoomEl);

  function openZoom(index) {
    currentIndex = index;
    refreshZoom();
    zoomEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    zoomEl.classList.remove('open');
    if (!overlay.classList.contains('open')) document.body.style.overflow = '';
  }
  function refreshZoom() {
    zoomImgEl.src = abs(currentImages[currentIndex]);
    var total = currentImages.length;
    zoomPrev.disabled = currentIndex === 0;
    zoomNext.disabled = currentIndex === total - 1;
    zoomCountEl.textContent = total > 1 ? (currentIndex + 1) + ' / ' + total : '';
    zoomCountEl.style.display = total > 1 ? 'block' : 'none';
    zoomPrev.style.display = total > 1 ? 'block' : 'none';
    zoomNext.style.display = total > 1 ? 'block' : 'none';
  }
  zoomClose.addEventListener('click', closeZoom);
  zoomEl.addEventListener('click', function (e) { if (e.target === zoomEl) closeZoom(); });
  zoomPrev.addEventListener('click', function (e) {
    e.stopPropagation();
    if (currentIndex > 0) { currentIndex--; refreshZoom(); }
  });
  zoomNext.addEventListener('click', function (e) {
    e.stopPropagation();
    if (currentIndex < currentImages.length - 1) { currentIndex++; refreshZoom(); }
  });

  // ── Detail modal ───────────────────────────────────────────────────────
  var overlay  = mkEl('div', 'cms-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var modalBox = mkEl('div', 'cms-modal');
  var mClose   = mkEl('button', 'cms-mclose'); mClose.textContent = '✕ Close';

  // Single-image viewer with prev/next inside modal
  var viewer   = mkEl('div', 'cms-viewer');
  var viewImg  = mkEl('img');
  var vPrev    = mkEl('button', 'cms-viewer-nav prev'); vPrev.innerHTML = '&#8249;';
  var vNext    = mkEl('button', 'cms-viewer-nav next'); vNext.innerHTML = '&#8250;';
  var vCount   = mkEl('span', 'cms-counter');
  viewer.appendChild(viewImg);
  viewer.appendChild(vPrev);
  viewer.appendChild(vNext);
  viewer.appendChild(vCount);

  var mBody = mkEl('div', 'cms-mbody');

  modalBox.appendChild(mClose);
  modalBox.appendChild(viewer);
  modalBox.appendChild(mBody);
  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);

  function refreshViewer() {
    var total = currentImages.length;
    viewImg.src = abs(currentImages[currentIndex]);
    vPrev.disabled = currentIndex === 0;
    vNext.disabled = currentIndex === total - 1;
    vPrev.style.display = total > 1 ? 'flex' : 'none';
    vNext.style.display = total > 1 ? 'flex' : 'none';
    vCount.textContent  = total > 1 ? (currentIndex + 1) + ' / ' + total : '';
    vCount.style.display = total > 1 ? 'block' : 'none';
  }

  vPrev.addEventListener('click', function () {
    if (currentIndex > 0) { currentIndex--; refreshViewer(); }
  });
  vNext.addEventListener('click', function () {
    if (currentIndex < currentImages.length - 1) { currentIndex++; refreshViewer(); }
  });
  viewImg.addEventListener('click', function () { openZoom(currentIndex); });

  function openModal(post) {
    currentImages = (post.images || []).filter(Boolean);
    currentIndex  = 0;
    viewImg.alt   = post.title || '';

    mBody.innerHTML =
      '<span class="cms-mcat">'   + esc(post.category) + '</span>' +
      '<h2 class="cms-mtitle">'   + esc(post.title)    + '</h2>'   +
      (post.location ? '<span class="cms-mloc">' + esc(post.location) + '</span>' : '') +
      (post.writeup  ? '<p class="cms-mtext">'   + esc(post.writeup).replace(/\n/g,'<br>') + '</p>' : '');

    refreshViewer();
    modalBox.scrollTop = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  mClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  document.addEventListener('keydown', function (e) {
    if (zoomEl.classList.contains('open')) {
      if (e.key === 'ArrowLeft'  && currentIndex > 0)                         { currentIndex--; refreshZoom(); }
      if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1)  { currentIndex++; refreshZoom(); }
      if (e.key === 'Escape') closeZoom();
      return;
    }
    if (overlay.classList.contains('open')) {
      if (e.key === 'ArrowLeft'  && currentIndex > 0)                         { currentIndex--; refreshViewer(); }
      if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1)  { currentIndex++; refreshViewer(); }
      if (e.key === 'Escape') closeModal();
    }
  });

  // ── Fetch & render ─────────────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data.posts || []).filter(function (p) {
        return p.images && p.images[0];
      });
      if (!posts.length) return;

      // Small eyebrow label — matches site section label pattern
      var label = mkEl('span', 'cms-label');
      label.textContent = PAGE_LABELS[slug] || 'Recent work';

      var grid = mkEl('div', 'cms-grid');

      posts.forEach(function (p) {
        var card = mkEl('div', 'cms-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', p.title || 'View project');

        var img = mkEl('img');
        img.src     = abs(p.images[0]);
        img.alt     = '';
        img.loading = 'lazy';

        var meta = mkEl('div', 'cms-meta');
        meta.innerHTML =
          '<span class="cms-cat">'  + esc(p.category) + '</span>' +
          '<span class="cms-name">' + esc(p.title)    + '</span>' +
          (p.location ? '<span class="cms-loc">' + esc(p.location) + '</span>' : '');

        card.appendChild(img);
        card.appendChild(meta);
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

  // ── Helpers ────────────────────────────────────────────────────────────
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
