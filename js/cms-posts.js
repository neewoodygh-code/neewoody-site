/* cms-posts.js — fetches CMS posts for this page, renders a card grid,
   opens a detail modal on click, and zooms individual images in-modal.
   Each service page has: <section id="cms-posts" data-page="slug"></section> */

(function () {
  'use strict';

  var MEDIA_BASE = 'https://neewoodygh.com';
  var API        = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var container = document.getElementById('cms-posts');
  if (!container) return;
  var slug = container.getAttribute('data-page');
  if (!slug) return;

  // ── Inject styles ─────────────────────────────────────────────────────
  if (!document.getElementById('cms-posts-style')) {
    var s = document.createElement('style');
    s.id = 'cms-posts-style';
    s.textContent =
      /* grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}' +
      /* card */
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
      '.cms-title{font-family:"Playfair Display",Georgia,serif;font-size:.92rem;' +
        'font-weight:400;color:#f0e8d0;line-height:1.3;display:block}' +
      '.cms-loc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.75rem;' +
        'color:rgba(240,232,208,.55);margin-top:.15rem;display:block}' +
      /* detail modal overlay */
      '.cms-overlay{position:fixed;inset:0;z-index:800;background:rgba(11,31,14,.7);' +
        'display:flex;align-items:center;justify-content:center;padding:1.5rem;' +
        'opacity:0;pointer-events:none;transition:opacity .25s}' +
      '.cms-overlay.open{opacity:1;pointer-events:auto}' +
      /* detail modal box */
      '.cms-modal{background:#f0e8d0;max-width:700px;width:100%;max-height:90vh;' +
        'overflow-y:auto;position:relative;display:flex;flex-direction:column}' +
      /* image strip */
      '.cms-imgs{display:flex;gap:2px;background:#0b1f0e;flex-shrink:0}' +
      '.cms-imgs img{flex:1 1 0;min-width:0;height:260px;object-fit:cover;' +
        'display:block;cursor:zoom-in;transition:filter .25s}' +
      '.cms-imgs img:hover{filter:brightness(.72)}' +
      '.cms-imgs.single img{height:340px}' +
      /* modal body */
      '.cms-mbody{padding:1.8rem 2rem 2rem;flex:1}' +
      '.cms-mcat{font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;' +
        'letter-spacing:.28em;text-transform:uppercase;color:#c8922a;margin-bottom:.5rem;display:block}' +
      '.cms-mtitle{font-family:"Playfair Display",Georgia,serif;font-size:1.5rem;' +
        'font-weight:400;color:#1c1c1a;line-height:1.15;margin-bottom:.3rem}' +
      '.cms-mloc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.85rem;' +
        'color:#6b6557;margin-bottom:1.2rem;display:block}' +
      '.cms-mtext{font-family:"Lora",Georgia,serif;font-size:.9rem;line-height:1.85;color:#4A4540}' +
      '.cms-mclose{position:absolute;top:.9rem;right:1rem;background:none;border:none;' +
        'cursor:pointer;font-family:"Jost",sans-serif;font-size:.62rem;font-weight:400;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#6b6557;z-index:10}' +
      '.cms-mclose:hover{color:#1c1c1a}' +
      /* zoom overlay (standalone — no dependency on main.js lightbox) */
      '.cms-zoom{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.92);' +
        'display:flex;align-items:center;justify-content:center;cursor:zoom-out;' +
        'opacity:0;pointer-events:none;transition:opacity .2s}' +
      '.cms-zoom.open{opacity:1;pointer-events:auto}' +
      '.cms-zoom img{max-width:95vw;max-height:90vh;object-fit:contain;display:block;' +
        'pointer-events:none}' +
      /* section heading */
      '.cms-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2.5rem}' +
      '.cms-head h2{font-family:"Playfair Display",Georgia,serif;' +
        'font-size:clamp(1.4rem,2.5vw,2.2rem);font-weight:400;color:#1c1c1a}' +
      /* responsive */
      '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:600px){' +
        '.cms-grid{grid-template-columns:1fr}.cms-card{height:260px}' +
        '.cms-imgs img,.cms-imgs.single img{height:220px}' +
        '.cms-mbody{padding:1.2rem 1.25rem 1.5rem}' +
      '}';
    document.head.appendChild(s);
  }

  // ── Zoom overlay (for individual images inside the detail modal) ───────
  var zoomEl = document.createElement('div');
  zoomEl.className = 'cms-zoom';
  zoomEl.setAttribute('role', 'dialog');
  zoomEl.setAttribute('aria-label', 'Image zoom');
  var zoomImg = document.createElement('img');
  zoomImg.alt = '';
  zoomEl.appendChild(zoomImg);
  document.body.appendChild(zoomEl);

  function openZoom(src, alt) {
    zoomImg.src = src;
    zoomImg.alt = alt || '';
    zoomEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    zoomEl.classList.remove('open');
    zoomImg.src = '';
    // restore scroll only if detail modal is also closed
    if (!overlay.classList.contains('open')) document.body.style.overflow = '';
  }
  zoomEl.addEventListener('click', closeZoom);

  // ── Detail modal ──────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.className = 'cms-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  var modal = document.createElement('div');
  modal.className = 'cms-modal';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'cms-mclose';
  closeBtn.textContent = '✕ Close';

  var imgStrip = document.createElement('div');
  imgStrip.className = 'cms-imgs';

  var bodyEl = document.createElement('div');
  bodyEl.className = 'cms-mbody';

  modal.appendChild(closeBtn);
  modal.appendChild(imgStrip);
  modal.appendChild(bodyEl);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function openModal(post) {
    var images = (post.images || []).filter(Boolean);
    imgStrip.innerHTML = '';
    imgStrip.className = 'cms-imgs' + (images.length === 1 ? ' single' : '');
    images.forEach(function (src) {
      var img = document.createElement('img');
      img.src = abs(src);
      img.alt = post.title || '';
      img.loading = 'lazy';
      img.title = 'Click to zoom';
      img.addEventListener('click', function (e) {
        e.stopPropagation();
        openZoom(abs(src), post.title);
      });
      imgStrip.appendChild(img);
    });

    bodyEl.innerHTML =
      '<span class="cms-mcat">' + esc(post.category) + '</span>' +
      '<h2 class="cms-mtitle">' + esc(post.title) + '</h2>' +
      (post.location ? '<span class="cms-mloc">' + esc(post.location) + '</span>' : '') +
      (post.writeup  ? '<p class="cms-mtext">'  + esc(post.writeup).replace(/\n/g,'<br>') + '</p>' : '');

    modal.scrollTop = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (zoomEl.classList.contains('open'))     { closeZoom();  return; }
    if (overlay.classList.contains('open'))    { closeModal(); return; }
  });

  // ── Fetch & render ────────────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data.posts || []).filter(function (p) {
        return p.images && p.images[0];
      });
      if (!posts.length) return;

      var head = document.createElement('div');
      head.className = 'cms-head';
      head.innerHTML = '<h2>From the workshop</h2>';

      var grid = document.createElement('div');
      grid.className = 'cms-grid';

      posts.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'cms-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', p.title || 'View project');

        var img = document.createElement('img');
        img.src = abs(p.images[0]);
        img.alt = '';
        img.loading = 'lazy';

        var meta = document.createElement('div');
        meta.className = 'cms-meta';
        meta.innerHTML =
          '<span class="cms-cat">' + esc(p.category) + '</span>' +
          '<span class="cms-title">' + esc(p.title) + '</span>' +
          (p.location ? '<span class="cms-loc">' + esc(p.location) + '</span>' : '');

        card.appendChild(img);
        card.appendChild(meta);
        card.addEventListener('click', function () { openModal(p); });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); }
        });
        grid.appendChild(card);
      });

      container.appendChild(head);
      container.appendChild(grid);
      container.style.display = 'block';
    })
    .catch(function () {});

  // ── Helpers ───────────────────────────────────────────────────────────
  function abs(src) {
    if (!src) return '';
    return /^https?:\/\//.test(src) ? src : MEDIA_BASE + src;
  }
  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
