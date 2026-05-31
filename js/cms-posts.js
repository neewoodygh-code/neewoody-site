/* cms-posts.js — fetches CMS posts for the current page and renders them.
   Each service page has: <section id="cms-posts" data-page="tv-units"></section>
   This script populates it if posts exist, otherwise the section stays hidden. */

(function () {
  'use strict';

  var API = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';

  var container = document.getElementById('cms-posts');
  if (!container) return;

  var slug = container.getAttribute('data-page');
  if (!slug) return;

  fetch(API + '/posts?page=' + encodeURIComponent(slug))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var posts = (data.posts || []).filter(function (p) {
        return p.images && p.images.length > 0;
      });
      if (!posts.length) return; // nothing to show — section stays hidden

      // Inject shared card styles once
      if (!document.getElementById('cms-posts-style')) {
        var style = document.createElement('style');
        style.id = 'cms-posts-style';
        style.textContent =
          '.cms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}' +
          '.cms-card{position:relative;overflow:hidden;background:#0b1f0e;height:320px;cursor:default}' +
          '.cms-card img{width:100%;height:100%;object-fit:cover;filter:brightness(.85);transition:transform .8s ease,filter .4s;display:block}' +
          '.cms-card:hover img{transform:scale(1.06);filter:brightness(.65)}' +
          '.cms-meta{position:absolute;bottom:0;left:0;right:0;padding:1.2rem 1.4rem;background:linear-gradient(to top,rgba(11,31,14,.92),transparent);transform:translateY(5px);transition:transform .3s}' +
          '.cms-card:hover .cms-meta{transform:translateY(0)}' +
          '.cms-cat{font-family:"Jost",sans-serif;font-size:.58rem;font-weight:400;letter-spacing:.25em;text-transform:uppercase;color:#c8922a;margin-bottom:.2rem;display:block}' +
          '.cms-title{font-family:"Playfair Display",Georgia,serif;font-size:.92rem;font-weight:400;color:#f0e8d0;line-height:1.3;display:block}' +
          '.cms-loc{font-family:"Lora",Georgia,serif;font-style:italic;font-size:.75rem;color:rgba(240,232,208,.55);margin-top:.15rem;display:block}' +
          '@media(max-width:900px){.cms-grid{grid-template-columns:repeat(2,1fr)}}' +
          '@media(max-width:600px){.cms-grid{grid-template-columns:1fr}.cms-card{height:260px}}';
        document.head.appendChild(style);
      }

      // Section heading
      var head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2.5rem';
      head.innerHTML =
        '<h2 style="font-family:\'Playfair Display\',Georgia,serif;font-size:clamp(1.4rem,2.5vw,2.2rem);font-weight:400;color:#1c1c1a">From the workshop</h2>';

      // Card grid
      var grid = document.createElement('div');
      grid.className = 'cms-grid';

      posts.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'cms-card';

        var img = document.createElement('img');
        img.src = p.images[0];
        img.alt = p.title || '';
        img.loading = 'lazy';

        var meta = document.createElement('div');
        meta.className = 'cms-meta';
        meta.innerHTML =
          '<span class="cms-cat">' + esc(p.category) + '</span>' +
          '<span class="cms-title">' + esc(p.title) + '</span>' +
          (p.location ? '<span class="cms-loc">' + esc(p.location) + '</span>' : '');

        card.appendChild(img);
        card.appendChild(meta);
        grid.appendChild(card);
      });

      container.appendChild(head);
      container.appendChild(grid);
      container.style.display = 'block'; // reveal
    })
    .catch(function () { /* fail silently — static content unaffected */ });

  function esc(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
