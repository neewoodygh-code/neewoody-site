/* cms-posts.js — fetches CMS posts for this page slug, renders a card grid.
   Modal shows all images in a scrollable strip with prev/next arrows.
   Clicking any strip image opens a full-screen zoom with arrow navigation. */

(function () {
  'use strict';

  var MEDIA_BASE = 'https://neewoodygh.com';
  var API        = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var PAGE_LABELS = {
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
      /* card grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}' +
      '.cms-card{position:relative;overflow:hidden;background:#0b1f0e;height:320px;cursor:pointer}' +
      /* card thumbnail: object-position top-center shows subject, not mid-crop */
      '.cms-card img{width:100%;height:100%;object-fit:cover;object-position:center 15%;' +
        'filter:brightness(.85);transition:transform .8s ease,filter .4s;' +
        'display:block;pointer-events:none}' +
      '.cms-card:hover img{transform:scale(1.05);filter:brightness(.6)}' +
      '.cms-meta{position:absolute;bottom:0;left:0;right:0;padding:1.2rem 1.4rem;' +
        'background:linear-gradient(to top,rgba(11,31,14,.92),transparent);' +
        'transform:translateY(5px);transition:transform .3s;pointer-events:none}' +
      '.cms-card:hover .cms-meta{transform:translateY(0)}' +
      '.cms-cat{font-family:"Jost",sans-serif;font-size:.58rem;font-weight:400;' +
        'letter-spacing:.25em;text-transform:uppercase;color:#c8922a;' +
        'margin-bottom:.2rem;display:block}' +
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
      '.cms-modal{background:#f0e8d0;max-width:720px;width:100%;max-height:90vh;' +
        'overflow-y:auto;position:relative;display:flex;flex-direction:column}' +
      /* image strip — all images visible, scrollable horizontally */
      '.cms-strip-wrap{position:relative;background:#0b1f0e;flex-shrink:0}' +
      '.cms-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;' +
        'scrollbar-width:none;-ms-overflow-style:none}' +
      '.cms-strip::-webkit-scrollbar{display:none}' +
      /* each image in strip: fixed height, width proportional */
      '.cms-strip img{flex:0 0 auto;height:300px;width:auto;max-width:90%;' +
        'object-fit:cover;scroll-snap-align:start;cursor:zoom-in;' +
        'transition:filter .25s;display:block}' +
      '.cms-strip img:hover{filter:brightness(.75)}' +
      /* strip nav arrows */
      '.cms-snav{position:absolute;top:0;bottom:0;display:flex;align-items:center;' +
        'padding:0 .5rem;background:transparent;border:none;cursor:pointer;' +
        'color:rgba(240,232,208,.9);font-size:1.6rem;z-index:2;' +
        'transition:background .2s;line-height:1}' +
      '.cms-snav:hover{background:rgba(11,31,14,.4)}' +
      '.cms-snav.prev{left:0}.cms-snav.next{right:0}' +
      '.cms-snav:disabled{opacity:.2;cursor:default}' +
      '.cms-snav:disabled:hover{background:transparent}' +
      /* modal body */
      '.cms-mbody{padding:1.6rem 2rem 2rem}' +
      '.cms-mcat{font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;' +
        'letter-spacing:.28em;text-transform:uppercase;color:#c8922a;' +
        'margin-bottom:.5rem;display:block}' +
      '.cms-mtitle{font-family:"Playfair Display",Georgia,serif;font-size:1.45rem;' +
        'font-weight:400;color:#1c1c1a;line-height:1.15;margin-bottom:.3rem}' +
      '.cms-mloc{font-family:"Lora",Georgia,serif;font-style:italic;' +
        'font-size:.85rem;color:#6b6557;margin-bottom:1rem;display:block}' +
      '.cms-mtext{font-family:"Lora",Georgia,serif;font-size:.9rem;' +
        'line-height:1.85;color:#4A4540}' +
      '.cms-mclose{position:absolute;top:.8rem;right:1rem;background:none;border:none;' +
        'cursor:pointer;font-family:"Jost",sans-serif;font-size:.6rem;font-weight:400;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#6b6557;z-index:10}' +
      '.cms-mclose:hover{color:#1c1c1a}' +
      /* zoom overlay — standalone, no main.js dependency */
      '.cms-zoom{position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.92);' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0;pointer-events:none;transition:opacity .2s}' +
      '.cms-zoom.open{opacity:1;pointer-events:auto}' +
      '.cms-zoom-img{max-width:95vw;max-height:90vh;object-fit:contain;display:block}' +
      '.cms-znav{position:absolute;top:50%;transform:translateY(-50%);' +
        'background:rgba(255,255,255,.1);border:none;cursor:pointer;' +
        'color:#fff;font-size:1.8rem;line-height:1;padding:.6rem .9rem;' +
        'transition:background .2s}' +
      '.cms-znav:hover{background:rgba(255,255,255,.22)}' +
      '.cms-znav.prev{left:.75rem}.cms-znav.next{right:.75rem}' +
      '.cms-znav:disabled{opacity:.18;cursor:default}' +
      '.cms-znav:disabled:hover{background:rgba(255,255,255,.1)}' +
      '.cms-zclose{position:absolute;top:1rem;right:1rem;background:none;border:none;' +
        'cursor:pointer;color:rgba(255,255,255,.65);font-family:"Jost",sans-serif;' +
        'font-size:.65rem;letter-spacing:.2em;text-transform:uppercase}' +
      '.cms-zclose:hover{color:#fff}' +
      '.cms-zcount{position:absolute;bottom:1.2rem;left:50%;transform:translateX(-50%);' +
        'font-family:"Jost",sans-serif;font-size:.62rem;letter-spacing:.12em;' +
        'color:rgba(255,255,255,.5);pointer-events:none}' +
      /* responsive */
      '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
      '@media(max-width:600px){' +
        '.cms-grid{grid-template-columns:1fr}.cms-card{height:260px}' +
        '.cms-strip img{height:220px}' +
        '.cms-mbody{padding:1.2rem 1.25rem 1.5rem}' +
      '}';
    document.head.appendChild(style);
  }

  // ── Shared state ──────────────────────────────────────────────────────
  var currentImages = [];
  var currentZoomIdx = 0;

  // ── Zoom overlay ──────────────────────────────────────────────────────
  var zoomEl    = mkEl('div','cms-zoom'); zoomEl.setAttribute('role','dialog');
  var zoomImg   = mkEl('img','cms-zoom-img');
  var zClose    = mkEl('button','cms-zclose'); zClose.textContent = '✕ Close';
  var zPrev     = mkEl('button','cms-znav prev'); zPrev.innerHTML  = '&#8249;';
  var zNext     = mkEl('button','cms-znav next'); zNext.innerHTML  = '&#8250;';
  var zCount    = mkEl('span','cms-zcount');
  [zoomImg,zClose,zPrev,zNext,zCount].forEach(function(el){zoomEl.appendChild(el);});
  document.body.appendChild(zoomEl);

  function openZoom(idx) {
    currentZoomIdx = idx;
    refreshZoom();
    zoomEl.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeZoom() {
    zoomEl.classList.remove('open');
    if (!overlay.classList.contains('open')) document.body.style.overflow = '';
  }
  function refreshZoom() {
    var n = currentImages.length;
    zoomImg.src = abs(currentImages[currentZoomIdx]);
    zPrev.disabled = currentZoomIdx === 0;
    zNext.disabled = currentZoomIdx === n - 1;
    var show = n > 1;
    zPrev.style.display = zNext.style.display = show ? 'block' : 'none';
    zCount.style.display = show ? 'block' : 'none';
    if (show) zCount.textContent = (currentZoomIdx + 1) + ' / ' + n;
  }
  zClose.addEventListener('click', closeZoom);
  zoomEl.addEventListener('click', function(e){ if(e.target===zoomEl) closeZoom(); });
  zPrev.addEventListener('click', function(e){
    e.stopPropagation();
    if(currentZoomIdx > 0){ currentZoomIdx--; refreshZoom(); }
  });
  zNext.addEventListener('click', function(e){
    e.stopPropagation();
    if(currentZoomIdx < currentImages.length-1){ currentZoomIdx++; refreshZoom(); }
  });

  // ── Detail modal ──────────────────────────────────────────────────────
  var overlay  = mkEl('div','cms-overlay');
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
  var modalBox = mkEl('div','cms-modal');
  var mClose   = mkEl('button','cms-mclose'); mClose.textContent = '✕ Close';

  // Strip wrap with nav arrows
  var stripWrap = mkEl('div','cms-strip-wrap');
  var strip     = mkEl('div','cms-strip');
  var sPrev     = mkEl('button','cms-snav prev'); sPrev.innerHTML = '&#8249;';
  var sNext     = mkEl('button','cms-snav next'); sNext.innerHTML = '&#8250;';
  stripWrap.appendChild(strip);
  stripWrap.appendChild(sPrev);
  stripWrap.appendChild(sNext);

  var mBody = mkEl('div','cms-mbody');
  [mClose, stripWrap, mBody].forEach(function(el){modalBox.appendChild(el);});
  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);

  // Scroll strip by one image width on arrow click
  function scrollStrip(dir) {
    var imgs = strip.querySelectorAll('img');
    if (!imgs.length) return;
    var w = imgs[0].offsetWidth || 300;
    strip.scrollBy({ left: dir * w, behavior: 'smooth' });
  }
  sPrev.addEventListener('click', function(){ scrollStrip(-1); });
  sNext.addEventListener('click', function(){ scrollStrip( 1); });

  // Update arrow disabled state as strip scrolls
  function updateStripNav() {
    var atStart = strip.scrollLeft <= 2;
    var atEnd   = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
    sPrev.disabled = atStart;
    sNext.disabled = atEnd;
  }
  strip.addEventListener('scroll', updateStripNav, { passive: true });

  function openModal(post) {
    currentImages = (post.images || []).filter(Boolean);
    strip.innerHTML = '';

    currentImages.forEach(function(src, idx) {
      var img = mkEl('img');
      img.src     = abs(src);
      img.alt     = post.title || '';
      img.loading = 'lazy';
      img.title   = 'Click to zoom';
      img.addEventListener('click', function(){ openZoom(idx); });
      strip.appendChild(img);
    });

    // Show/hide strip arrows based on image count
    var multi = currentImages.length > 1;
    sPrev.style.display = sNext.style.display = multi ? 'flex' : 'none';
    strip.scrollLeft = 0;
    setTimeout(updateStripNav, 50); // after images render

    mBody.innerHTML =
      '<span class="cms-mcat">'   + esc(post.category) + '</span>' +
      '<h2 class="cms-mtitle">'   + esc(post.title)    + '</h2>'   +
      (post.location ? '<span class="cms-mloc">' + esc(post.location) + '</span>' : '') +
      (post.writeup  ? '<p class="cms-mtext">'   + esc(post.writeup).replace(/\n/g,'<br>') + '</p>' : '');

    modalBox.scrollTop = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  mClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeModal(); });

  document.addEventListener('keydown', function(e) {
    if (zoomEl.classList.contains('open')) {
      if (e.key==='ArrowLeft'  && currentZoomIdx > 0)                          { currentZoomIdx--; refreshZoom(); }
      if (e.key==='ArrowRight' && currentZoomIdx < currentImages.length-1)     { currentZoomIdx++; refreshZoom(); }
      if (e.key==='Escape') closeZoom();
      return;
    }
    if (overlay.classList.contains('open') && e.key==='Escape') closeModal();
  });

  // ── Fetch & render ────────────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var posts = (data.posts || []).filter(function(p){
        return p.images && p.images[0];
      });
      if (!posts.length) return;

      var label = mkEl('span','cms-label');
      label.textContent = PAGE_LABELS[slug] || 'Recent work';

      var grid = mkEl('div','cms-grid');

      posts.forEach(function(p) {
        var card = mkEl('div','cms-card');
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.setAttribute('aria-label', p.title || 'View project');

        var img = mkEl('img');
        img.src     = abs(p.images[0]);
        img.alt     = '';
        img.loading = 'lazy';

        var meta = mkEl('div','cms-meta');
        meta.innerHTML =
          '<span class="cms-cat">'  + esc(p.category) + '</span>' +
          '<span class="cms-name">' + esc(p.title)    + '</span>' +
          (p.location ? '<span class="cms-loc">' + esc(p.location) + '</span>' : '');

        card.appendChild(img);
        card.appendChild(meta);
        card.addEventListener('click', function(){ openModal(p); });
        card.addEventListener('keydown', function(e){
          if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openModal(p); }
        });
        grid.appendChild(card);
      });

      container.appendChild(label);
      container.appendChild(grid);
      container.style.display = 'block';
    })
    .catch(function(){});

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
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
