/* cms-posts.js — fetches CMS posts for this page, renders cards matching
   the wardrobes.html wd-card pattern: cream bg, image top (4:3 ratio),
   text body always visible below. Modal on click with scrollable image strip. */

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
      /* eyebrow label — matches .pf-featured-label / existing section labels */
      '.cms-label{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:400;' +
        'letter-spacing:0.32em;text-transform:uppercase;color:var(--muted,#6b6557);' +
        'display:block;margin-bottom:2rem}' +
      /* grid — matches wd-cards-grid */
      '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}' +
      /* card — cream bg, same as wd-card */
      '.cms-card{background:var(--cream-dark,#e8dfc4);overflow:hidden;cursor:pointer}' +
      /* image wrapper — 4:3 aspect ratio, same as wd-card-img */
      '.cms-card-img{position:relative;aspect-ratio:4/3;overflow:hidden}' +
      '.cms-card-img img{width:100%;height:100%;object-fit:cover;display:block;' +
        'transition:transform 0.5s ease}' +
      '.cms-card-img:hover img{transform:scale(1.04)}' +
      /* category badge — top-left of image, green bg + gold text, same as wd-card-badge */
      '.cms-badge{position:absolute;top:0.75rem;left:0.75rem;' +
        'font-family:"Jost",sans-serif;font-size:0.58rem;font-weight:500;' +
        'letter-spacing:0.14em;text-transform:uppercase;' +
        'background:var(--green,#0b1f0e);color:var(--gold,#c8922a);' +
        'padding:0.2rem 0.55rem;pointer-events:none}' +
      /* card body — always visible, same as wd-card-body */
      '.cms-card-body{padding:1.1rem 1.2rem 1.4rem}' +
      /* title row — Playfair, with year right-aligned, same as wd-card-location */
      '.cms-card-title{font-family:"Playfair Display",Georgia,serif;font-size:0.88rem;' +
        'font-weight:400;color:var(--ink,#1c1c1a);margin-bottom:0.3rem;' +
        'display:flex;align-items:baseline;justify-content:space-between;gap:0.5rem}' +
      '.cms-card-title span{font-family:"Jost",sans-serif;font-size:0.6rem;font-weight:300;' +
        'letter-spacing:0.12em;color:var(--muted,#6b6557);flex-shrink:0}' +
      /* caption — Lora, muted, always visible, same as wd-card-caption */
      '.cms-card-caption{font-family:"Lora",Georgia,serif;font-size:0.8rem;' +
        'line-height:1.6;color:var(--muted,#6b6557)}' +
      /* modal overlay */
      '.cms-overlay{position:fixed;inset:0;z-index:800;background:rgba(11,31,14,.72);' +
        'display:flex;align-items:center;justify-content:center;padding:1.5rem;' +
        'opacity:0;pointer-events:none;transition:opacity .25s}' +
      '.cms-overlay.open{opacity:1;pointer-events:auto}' +
      /* modal box */
      '.cms-modal{background:#f0e8d0;max-width:720px;width:100%;max-height:90vh;' +
        'overflow-y:auto;position:relative;display:flex;flex-direction:column}' +
      /* image strip — scrollable, all images visible */
      '.cms-strip-wrap{position:relative;background:#0b1f0e;flex-shrink:0}' +
      '.cms-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;' +
        'scrollbar-width:none;-ms-overflow-style:none}' +
      '.cms-strip::-webkit-scrollbar{display:none}' +
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
      '.cms-snav:disabled{opacity:.2;cursor:default;pointer-events:none}' +
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
        'cursor:pointer;font-family:"Jost",sans-serif;font-size:.6rem;' +
        'letter-spacing:.18em;text-transform:uppercase;color:#6b6557;z-index:10}' +
      '.cms-mclose:hover{color:#1c1c1a}' +
      /* zoom overlay */
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
      '.cms-znav:disabled{opacity:.18;cursor:default;pointer-events:none}' +
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
        '.cms-grid{grid-template-columns:1fr}' +
        '.cms-strip img{height:220px}' +
        '.cms-mbody{padding:1.2rem 1.25rem 1.5rem}' +
      '}';
    document.head.appendChild(style);
  }

  // ── Shared image state ────────────────────────────────────────────────
  var currentImages  = [];
  var currentZoomIdx = 0;

  // ── Zoom overlay ──────────────────────────────────────────────────────
  var zoomEl  = mkEl('div','cms-zoom'); zoomEl.setAttribute('role','dialog');
  var zoomImg = mkEl('img','cms-zoom-img');
  var zClose  = mkEl('button','cms-zclose'); zClose.textContent = '✕ Close';
  var zPrev   = mkEl('button','cms-znav prev'); zPrev.innerHTML  = '&#8249;';
  var zNext   = mkEl('button','cms-znav next'); zNext.innerHTML  = '&#8250;';
  var zCount  = mkEl('span','cms-zcount');
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
    if (show) zCount.textContent = (currentZoomIdx+1) + ' / ' + n;
  }
  zClose.addEventListener('click', closeZoom);
  zoomEl.addEventListener('click', function(e){ if(e.target===zoomEl) closeZoom(); });
  zPrev.addEventListener('click', function(e){ e.stopPropagation(); if(currentZoomIdx>0){currentZoomIdx--;refreshZoom();} });
  zNext.addEventListener('click', function(e){ e.stopPropagation(); if(currentZoomIdx<currentImages.length-1){currentZoomIdx++;refreshZoom();} });

  // ── Detail modal ──────────────────────────────────────────────────────
  var overlay  = mkEl('div','cms-overlay');
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true');
  var modalBox = mkEl('div','cms-modal');
  var mClose   = mkEl('button','cms-mclose'); mClose.textContent = '✕ Close';

  var stripWrap = mkEl('div','cms-strip-wrap');
  var strip     = mkEl('div','cms-strip');
  var sPrev     = mkEl('button','cms-snav prev'); sPrev.innerHTML = '&#8249;';
  var sNext     = mkEl('button','cms-snav next'); sNext.innerHTML = '&#8250;';
  stripWrap.appendChild(strip);
  stripWrap.appendChild(sPrev);
  stripWrap.appendChild(sNext);

  var mBody = mkEl('div','cms-mbody');
  [mClose,stripWrap,mBody].forEach(function(el){modalBox.appendChild(el);});
  overlay.appendChild(modalBox);
  document.body.appendChild(overlay);

  function scrollStrip(dir) {
    var imgs = strip.querySelectorAll('img');
    if (!imgs.length) return;
    strip.scrollBy({ left: dir*(imgs[0].offsetWidth||300), behavior:'smooth' });
  }
  function updateStripNav() {
    sPrev.disabled = strip.scrollLeft <= 2;
    sNext.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
  }
  sPrev.addEventListener('click', function(){ scrollStrip(-1); });
  sNext.addEventListener('click', function(){ scrollStrip( 1); });
  strip.addEventListener('scroll', updateStripNav, { passive:true });

  function openModal(post) {
    currentImages = (post.images||[]).filter(Boolean);
    strip.innerHTML = '';
    currentImages.forEach(function(src, idx) {
      var img = mkEl('img');
      img.src = abs(src); img.alt = post.title||''; img.loading='lazy'; img.title='Click to zoom';
      img.addEventListener('click', function(){ openZoom(idx); });
      strip.appendChild(img);
    });
    var multi = currentImages.length > 1;
    sPrev.style.display = sNext.style.display = multi ? 'flex' : 'none';
    strip.scrollLeft = 0;
    setTimeout(updateStripNav, 50);

    mBody.innerHTML =
      '<span class="cms-mcat">'  + esc(post.category) + '</span>' +
      '<h2 class="cms-mtitle">'  + esc(post.title)    + '</h2>'   +
      (post.location ? '<span class="cms-mloc">'+esc(post.location)+'</span>' : '') +
      (post.writeup  ? '<p class="cms-mtext">'+esc(post.writeup).replace(/\n/g,'<br>')+'</p>' : '');

    modalBox.scrollTop = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

  mClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeModal(); });

  document.addEventListener('keydown', function(e) {
    if (zoomEl.classList.contains('open')) {
      if (e.key==='ArrowLeft'  && currentZoomIdx>0)                        { currentZoomIdx--;refreshZoom(); }
      if (e.key==='ArrowRight' && currentZoomIdx<currentImages.length-1)   { currentZoomIdx++;refreshZoom(); }
      if (e.key==='Escape') closeZoom();
      return;
    }
    if (overlay.classList.contains('open') && e.key==='Escape') closeModal();
  });

  // ── Fetch & render ────────────────────────────────────────────────────
  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var posts = (data.posts||[]).filter(function(p){ return p.images && p.images[0]; });
      if (!posts.length) return;

      var label = mkEl('span','cms-label');
      label.textContent = PAGE_LABELS[slug] || 'Recent work';

      var grid = mkEl('div','cms-grid');

      posts.forEach(function(p) {
        var year     = p.date ? p.date.slice(0,4) : '';
        var caption  = p.writeup
          ? (p.writeup.length > 110 ? p.writeup.slice(0,108).trim() + '…' : p.writeup)
          : (p.location || '');

        var card = mkEl('article','cms-card');
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.setAttribute('aria-label', p.title || 'View project');

        // Image wrapper + badge
        var imgWrap = mkEl('div','cms-card-img');
        var img     = mkEl('img');
        img.src = abs(p.images[0]); img.alt = ''; img.loading = 'lazy';
        var badge   = mkEl('span','cms-badge');
        badge.textContent = p.category || '';
        imgWrap.appendChild(img);
        imgWrap.appendChild(badge);

        // Text body — always visible
        var body    = mkEl('div','cms-card-body');
        var titleRow= mkEl('div','cms-card-title');
        var titleTxt= document.createTextNode(p.title || '');
        titleRow.appendChild(titleTxt);
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
