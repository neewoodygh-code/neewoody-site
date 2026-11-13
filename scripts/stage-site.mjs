// Copies the files the website publishes into .stage/ (Astro's public folder),
// leaving out everything internal. Run by `npm run build` / `npm run dev`.
//
// Source of truth = files tracked by git (so local junk like _inbox/, _studio/,
// untracked drafts and node_modules never ships). Falls back to a folder walk
// if git is unavailable.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const STAGE = '.stage';

// Never published. Folders end with '/'.
const EXCLUDE = [
  '.stage/', 'dist/', 'node_modules/', '.astro/', '.git/', '.github/', '.claude/', '.wrangler/',
  'src/', 'docs/', 'scripts/', 'concierge-api/', 'functions/', '_inbox/', '_studio/',
  'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json', '.node-version',
  '.gitignore', 'worker.js', 'Optimise Images.ps1', 'Optimise Images - Drop Here.bat',
];
const skip = (p) =>
  EXCLUDE.some((x) => (x.endsWith('/') ? p.startsWith(x) : p === x)) ||
  (/\.md$/i.test(p) && !p.includes('/')); // root notes: CLAUDE.md, HISTORY.md, …

function trackedFiles() {
  try {
    return execSync('git ls-files -z', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\0').filter(Boolean);
  } catch {
    const out = [];
    const walk = (d) => {
      for (const n of readdirSync(d || '.')) {
        const p = d ? `${d}/${n}` : n;
        if (skip(p + '/') || skip(p)) continue;
        statSync(p).isDirectory() ? walk(p) : out.push(p);
      }
    };
    walk('');
    return out;
  }
}

// Files an Astro page now produces (src/pages/kitchens.astro -> kitchens.html).
// The old hand-written file of that name must not ship as well.
const owned = new Set();
const walkPages = (d) => {
  if (!existsSync(d)) return;
  for (const n of readdirSync(d)) {
    const p = `${d}/${n}`;
    if (statSync(p).isDirectory()) { walkPages(p); continue; }
    const m = p.match(/^src\/pages\/(.+)\.(astro|md|mdx|html)$/);
    if (!m) continue;
    const route = m[1].replace(/(^|\/)index$/, '$1').replace(/\/$/, '');
    owned.add(route === '' ? 'index.html' : `${route}.html`);
  }
};
walkPages('src/pages');

rmSync(STAGE, { recursive: true, force: true });
let n = 0;
for (const f of trackedFiles()) {
  if (skip(f) || !existsSync(f) || owned.has(f)) continue; // existsSync: tracked but deleted locally
  mkdirSync(join(STAGE, dirname(f)), { recursive: true });
  cpSync(f, join(STAGE, f));
  n++;
}
console.log(`stage-site: copied ${n} published files into ${STAGE}/; built by Astro instead: ${[...owned].join(', ') || 'none'}`);
