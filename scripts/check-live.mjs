// Live check for neewoodygh.com and concierge-api.
// Catches silent failures: a push that never deployed, an internal file
// left readable, a broken redirect, Concierge down, backups not running.
//
// Run: node scripts/check-live.mjs        (exit 1 if anything fails)
// Needs Node 18+, and wrangler logged in for the backup check.

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://neewoodygh.com';
const API = 'https://concierge-api.neewoodygh.workers.dev';
const REPO = 'neewoodygh-code/neewoody-site';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
const ok = (name, detail = '') => results.push({ pass: true, name, detail });
const bad = (name, detail = '') => results.push({ pass: false, name, detail });

async function head(url) {
  return fetch(url, { redirect: 'manual', headers: { 'user-agent': 'neewoody-live-check' } });
}

async function check(name, fn) {
  try { await fn(); } catch (e) { bad(name, e.message); }
}

// 1. Did the latest push to main deploy?
await check('Latest main commit deployed', async () => {
  const gh = { headers: { accept: 'application/vnd.github+json', 'user-agent': 'neewoody-live-check' } };
  const commit = await (await fetch(`https://api.github.com/repos/${REPO}/commits/main`, gh)).json();
  const sha = commit.sha;
  const age = (Date.now() - Date.parse(commit.commit.committer.date)) / 60000;
  const runs = await (await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`, gh)).json();
  const cf = (runs.check_runs || []).find((r) => /cloudflare/i.test(r.name));
  const short = sha.slice(0, 7);
  if (!cf) return age < 15 ? ok('Latest main commit deployed', `${short}: pushed ${Math.round(age)} min ago, no check yet`)
    : bad('Latest main commit deployed', `${short}: no Cloudflare Pages check run (Cloudflare never saw the push)`);
  if (cf.status !== 'completed') return ok('Latest main commit deployed', `${short}: build ${cf.status}`);
  if (cf.conclusion === 'success') return ok('Latest main commit deployed', `${short}: ${cf.name} success`);
  bad('Latest main commit deployed', `${short}: ${cf.name} ${cf.conclusion}`);
});

// 2. Key pages answer 200.
const pages = ['/', '/wardrobes', '/kitchens', '/beds', '/dining-living', '/tv-units', '/shelving', '/solid-wood',
  '/portfolio', '/contact', '/hire', '/projects/sage-centre', '/concierge/', '/concierge/login', '/tools',
  '/cutlist', '/cut-sheet', '/catalogue', '/sitemap.xml', '/robots.txt'];
await Promise.all(pages.map((p) => check(`Page ${p}`, async () => {
  const r = await head(SITE + p);
  r.status === 200 ? ok(`Page ${p}`, '200') : bad(`Page ${p}`, `status ${r.status}`);
})));

// 3. Unknown URLs give a real 404.
await check('Unknown URL is 404', async () => {
  const r = await head(SITE + '/no-such-page-' + Date.now());
  r.status === 404 ? ok('Unknown URL is 404') : bad('Unknown URL is 404', `status ${r.status}`);
});

// 4. Internal files are hidden.
const internal = ['/CLAUDE.md', '/HISTORY.md', '/CONCIERGE_SPEC.md', '/worker.js', '/docs/design-review-plan.md',
  '/concierge-api/src/index.js', '/scripts/check-live.mjs', '/functions/api/lead.js', '/src/data.js', '/package.json'];
await Promise.all(internal.map((p) => check(`Hidden ${p}`, async () => {
  const r = await head(SITE + p);
  const hidden = r.status === 404 || (r.status >= 300 && r.status < 400 && /\/404/.test(r.headers.get('location') || ''));
  hidden ? ok(`Hidden ${p}`, String(r.status))
    : bad(`Hidden ${p}`, `status ${r.status} (readable?)`);
})));

// 5. www goes to the apex with a 301, path kept.
await check('www redirect', async () => {
  const r = await head('https://www.neewoodygh.com/kitchens?x=1');
  const loc = r.headers.get('location') || '';
  r.status === 301 && loc.startsWith(SITE + '/kitchens') ? ok('www redirect', `301 -> ${loc}`) : bad('www redirect', `${r.status} -> ${loc}`);
});

// 6. Photos are cached.
await check('Image cache header', async () => {
  const r = await head(SITE + '/images/favicon.ico');
  const cc = r.headers.get('cache-control') || '';
  /max-age=\d{5,}/.test(cc) ? ok('Image cache header', cc) : bad('Image cache header', cc || 'none');
});

// 7. Concierge API.
await check('Concierge health', async () => {
  const r = await fetch(API + '/api/health');
  r.status === 200 ? ok('Concierge health', '200') : bad('Concierge health', `status ${r.status}`);
});
await check('Concierge /api/me needs login', async () => {
  const r = await fetch(API + '/api/me');
  r.status === 401 ? ok('Concierge /api/me needs login', '401') : bad('Concierge /api/me needs login', `status ${r.status}`);
});

// 8. Last Concierge backup is less than 8 days old.
await check('Concierge backup < 8 days', async () => {
  // One command string (Windows needs a shell for npx, and a shell splits unquoted SQL).
  const out = execSync(`npx wrangler d1 execute concierge --remote --json --command "SELECT MAX(created_at) AS last FROM audit_log WHERE action='backup'"`,
    { cwd: join(ROOT, 'concierge-api'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const last = JSON.parse(out.slice(out.indexOf('[')))[0].results[0].last;
  if (!last) return bad('Concierge backup < 8 days', 'no backup ever logged');
  const days = (Date.now() - Date.parse(last.replace(' ', 'T') + 'Z')) / 864e5;
  days < 8 ? ok('Concierge backup < 8 days', `last ${last} UTC (${days.toFixed(1)} days)`)
    : bad('Concierge backup < 8 days', `last ${last} UTC (${days.toFixed(1)} days ago)`);
});

// Report.
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  ' + r.detail : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ''}`);
process.exit(failed.length ? 1 : 0);
