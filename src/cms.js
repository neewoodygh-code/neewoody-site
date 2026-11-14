// Admin-posted projects (posted from admin.html), built into the pages.
// At build time we READ the public posts list from the dispatch Worker (a plain
// GET; nothing is ever written there) and turn each post into a normal gallery
// card with web-sized photos. If the list or a photo cannot be fetched, the post
// is simply left out of the build and js/cms-posts.js shows it in the browser as
// before, so a build never fails because of this.
// A post made after the last build also appears through js/cms-posts.js until
// the next build picks it up.
import { getImage, inferRemoteSize } from 'astro:assets';

const API = 'https://neewoody-dispatch-api.neewoodygh.workers.dev/api';
const MEDIA = 'https://neewoodygh.com';
const abs = (src) => (/^https?:\/\//.test(src) ? src : MEDIA + src);
const cache = new Map();

export async function getPosts(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const job = (async () => {
    let posts = [];
    try {
      const r = await fetch(`${API}/posts?page=${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(15000) });
      posts = ((await r.json()).posts || []).filter((p) => p.images && p.images[0]);
    } catch (e) {
      console.warn(`cms: could not read posts for "${slug}" (${e.message}); they will load in the browser instead`);
      return [];
    }
    const items = [];
    for (const p of posts) {
      try { items.push(await toItem(p)); }
      catch (e) { console.warn(`cms: skipped "${p.title}" at build (${e.message}); it will load in the browser instead`); }
    }
    return items;
  })();
  cache.set(slug, job);
  return job;
}

async function toItem(p) {
  const urls = p.images.filter(Boolean).map(abs);
  const title = (p.title || '').trim();
  const alt = title + (p.location ? ', ' + p.location : '');
  // a stray closing quote mark at the end of a write-up is a typing slip
  let writeup = (p.writeup || '').trim();
  if (writeup.endsWith('"') && (writeup.match(/"/g) || []).length % 2 === 1) writeup = writeup.slice(0, -1).trim();
  const paras = writeup.split(/\n+/).map((t) => t.trim()).filter(Boolean);
  // read each photo's real size once, then ask for an exact width AND height
  // (letting Astro infer the size while also giving a width kept the original height)
  const sizes = new Map();
  const opt = async (url, target) => {
    if (!sizes.has(url)) sizes.set(url, await inferRemoteSize(url));
    const { width: w, height: h } = sizes.get(url);
    const width = Math.min(target, w);
    return getImage({ src: url, width, height: Math.round(h * width / w), format: 'webp', quality: 68 });
  };
  const set = await Promise.all(urls.map(async (u, i) => ({
    src: (await opt(u, 1600)).src,
    alt: alt + (urls.length > 1 ? `, photo ${i + 1} of ${urls.length}` : ''),
    cap: alt,
  })));
  const card = await opt(urls[0], 800);
  const small = await opt(urls[0], 500);
  return {
    id: p.id, badge: p.category || '', place: title, year: p.date ? p.date.slice(0, 4) : '',
    caption: writeup.length > 140 ? writeup.slice(0, 138).trim() + '…' : writeup,
    alt, set, more: paras,
    img: { src: card.src, srcset: `${small.src} 500w, ${card.src} 800w`, width: card.attributes.width, height: card.attributes.height },
  };
}
