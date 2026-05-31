/* cms-posts.js — fetches CMS posts for the current page slug, renders a
   "From the workshop" card grid, and opens a detail modal on card click.
   Each service page has: <section id="cms-posts" data-page="tv-units"></section> */

(function () {
  'use strict';

  var MEDIA_BASE = 'https://neewoodygh.com'; // ensure absolute image URLs
  var API        = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var container = document.getElementById('cms-posts');
  if (!container) return;
  var slug = container.getAttribute('data-page');
  if (!slug) return;

  // ── Styles ──────────────────────────────────────────────────────────────
  if (!document.getElementById('cms-posts-style')) {
    var style = document.createElement('style');
    style.id = 'cms-posts-style';
    style.textContent =
      /* grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}' +
      /* card */
      '.cms-card{position:relative;overflow:hidden;background:#0b1f0e;height:320px;cursor:pointer}' +
      '.cms-card img{width:100%;height:100%;object-fit:cover;filter:brightness(.85);transition:transform .8s ease,filter .4s;display:block;pointer-events:none}' +
      '.cms-card:hover img{transform:scale(1.06);filter:brightness(.6)}' +
      /* meta overlay */
      '.cms-meta{position:absolute;bottom:0;left:0;right:0;padding:1.2rem 1.4rem;background:linear-gradient(to top,rgba(11,31,14,.92),transparent);transform:translateY(5px);transition:transform .3s;pointer-events:none}' +
      '.cms-card:hover .cms-meta{transform:translateY(0)}' +
      '.cms-cat{font-family:"Jost",sans-serif;font-size:.58rem;font-weight:400;letter-spacing:.25em;text-transform:uppercase;color:#c8922a;margin-bottom:.2rem;display:block}' +
      '.cms-title{font-family:"Playfair Display",Georgia,serif;font-size:.92rem;font-weight:400;color:#f0e8d0;line-height:1.3;display:block}' +
      '.cms-loc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.75rem;color:rgba(240,232,208,.55);margin-top:.15rem;display:block}' +
      /* modal overlay */
      '.cms-modal-overlay{position:fixed;inset:0;z-index:900;background:rgba(11,31,14,.75);display:flex;align-items:center;justify-content:center;padding:1.5rem;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '.cms-modal-overlay.open{opacity:1;pointer-events:auto}' +
      /* modal box */
      '.cms-modal{background:#f0e8d0;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;position:relative;display:flex;flex-direction:column}' +
      /* image strip */
      '.cms-modal-imgs{display:flex;gap:2px;background:#0b1f0e;flex-shrink:0}' +
      '.cms-modal-imgs img{flex:1 1 0;min-width:0;height:260px;object-fit:cover;display:block;cursor:zoom-in;transition:filter .3s}' +
      '.cms-modal-imgs img:hover{filter:brightness(.75)}' +
      '.cms-modal-imgs.one img{height:320px}' +
      /* modal body */
      '.cms-modal-body{padding:1.8rem 2rem 2rem}' +
      '.cms-modal-eyebrow{font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;letter-spacing:.28em;text-transform:uppercase;color:#c8922a;margin-bottom:.5rem;display:block}' +
      '.cms-modal-title{font-family:"Playfair Display",Georgia,serif;font-size:1.5rem;font-weight:400;color:#1c1c1a;line-height:1.15;margin-bottom:.3rem}' +
      '.cms-modal-loc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.85rem;color:#6b6557;margin-bottom:1.2rem;display:block}' +
      '.cms-modal-writeup{font-family:"Lora",Georgia,serif;font-size:.9rem;line-height:1.85;color:#4A4540}' +
      /* close */
      '.cms-modal-close{position:absolute;top:.9rem;right:1rem;background:none;border:none;cursor:pointer;font-family:"Jost",sans-serif;font-size:.62rem;font-weight:400;letter-spacing:.18em;text-transform:uppercase;color:#6b6557;z-index:10}' +
      '.cms-modal-close:hover{color:#1c1c1a}' +
      /* responsive */
      '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:600px){' +
        '.cms-grid{grid-template-columns:1fr}' +
        '.cms-card{height:260px}' +
        '.cms-modal-imgs img,.cms-modal-imgs.one img{height:200px}' +
        '.cms-modal-body{padding:1.2rem 1.25rem 1.5rem}' +
      '}';
    document.head.appendChild(style);
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.className = 'cms-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="cms-modal" id="cms-modal-box">' +
      '<button class="cms-modal-close" id="cms-modal-close">✕ Close</button>' +
      '<div class="cms-modal-imgs" id="cms-modal-imgs"></div>' +
      '<div class="cms-modal-body" id="cms-modal-body"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var modalImgs = document.getElementById('cms-modal-imgs');
  var modalBody = document.getElementById('cms-modal-body');

  function openModal(post) {
    // Images
    modalImgs.innerHTML = '';
    var imgs = (post.images || []).filter(Boolean);
    modalImgs.className = 'cms-modal-imgs' + (imgs.length === 1 ? ' one' : '');
    imgs.forEach(function (src) {
      var img = document.createElement('img');
      img.src = absUrl(src);
      img.alt = post.title || '';
      img.loading = 'lazy';
      img.addEventListener('click', function () {
        // open in lightbox if main.js lightbox is available
        var ev = new MouseEvent('click', { bubbles: true });
        img.classList.add('lightbox-img');
        img.dataset.full = absUrl(src);
        img.dispatchEvent(ev);
        img.classList.remove('lightbox-img');
      });
      modalImgs.appendChild(img);
    });
    // Body
    modalBody.innerHTML =
      '<span class="cms-modal-eyebrow">' + esc(post.category) + '</span>' +
      '<h2 class="cms-modal-title">' + esc(post.title) + '</h2>' +
      (post.location ? '<span class="cms-modal-loc">' + esc(post.location) + '</span>' : '') +
      (post.writeup  ? '<p class="cms-modal-writeup">' + esc(post.writeup).replace(/\n/g, '<br>') + '</p>' : '');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.getElementById('cms-modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  // ── Fetch & render ───────────────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data.posts || []).filter(function (p) {
        return p.images && p.images.length > 0 && p.images[0];
      });
      if (!posts.length) return;

      // Heading
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2.5rem';
      head.innerHTML =
        '<h2 style="font-family:\'Playfair Display\',Georgia,serif;font-size:clamp(1.4rem,2.5vw,2.2rem);font-weight:400;color:#1c1c1a">From the workshop</h2>';

      // Grid
      var grid = document.createElement('div');
      grid.className = 'cms-grid';

      posts.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'cms-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', p.title || 'View project');

        var img = document.createElement('img');
        img.src = absUrl(p.images[0]);
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
    .catch(function () { /* fail silently */ });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function absUrl(src) {
    if (!src) return '';
    // If already absolute, return as-is
    if (/^https?:\/\//.test(src)) return src;
    // Root-relative — prepend domain
    return MEDIA_BASE + src;
  }

  function esc(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
