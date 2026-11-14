// Checks a page's content file before it is built, so a typo stops the build
// with a plain message instead of silently dropping a section.
// Used by src/layouts/ProductPage.astro. (A missing photo is caught by photos.js.)
const need = {
  intro: ['title', 'paras'],
  feature: ['img', 'alt', 'title'],
  types: ['items'],
  details: ['title', 'items'],
  gallery: ['title', 'items'],
  projects: ['title', 'photos'],
  statement: ['text'],
  review: ['quote', 'who'],
  faq: ['title', 'items'],
  videos: ['items'],
  related: ['title', 'links'],
};
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function checkContent(c) {
  const where = `content for "${c?.path || c?.slug || 'unknown page'}"`;
  const fail = (msg) => { throw new Error(`${where}: ${msg}`); };
  for (const k of ['slug', 'path', 'seo', 'hero', 'sections']) if (empty(c[k])) fail(`"${k}" is missing`);
  for (const k of ['title', 'description']) if (empty(c.seo[k])) fail(`seo.${k} is missing`);
  for (const k of ['lines', 'text', 'img', 'alt']) if (empty(c.hero[k])) fail(`hero.${k} is missing`);
  c.sections.forEach((s, i) => {
    const at = `section ${i + 1} (${s.kind || 'no kind'})`;
    if (!need[s.kind]) fail(`${at}: unknown kind. Use one of: ${Object.keys(need).join(', ')}`);
    for (const k of need[s.kind]) if (empty(s[k])) fail(`${at}: "${k}" is missing or empty`);
    if (s.kind === 'feature' && empty(s.text) && empty(s.paras)) fail(`${at}: needs "text" or "paras"`);
    if (s.kind === 'gallery') s.items.forEach((it, j) => { for (const k of ['place', 'img', 'alt']) if (empty(it[k])) fail(`${at}, card ${j + 1}: "${k}" is missing`); });
    if (s.kind === 'projects') s.photos.forEach((p, j) => { for (const k of ['img', 'alt']) if (empty(p[k])) fail(`${at}, photo ${j + 1}: "${k}" is missing`); });
    if (s.kind === 'videos') s.items.forEach((v, j) => { for (const k of ['embed', 'title']) if (empty(v[k])) fail(`${at}, video ${j + 1}: "${k}" is missing`); });
  });
  return c;
}
