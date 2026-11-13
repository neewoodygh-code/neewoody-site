// @ts-check
// Step 1 of the Astro migration (2026-11-13): Astro wraps the existing static
// site with zero visual change. scripts/stage-site.mjs copies the published
// files into .stage/, Astro copies them verbatim into dist/, and Cloudflare
// Pages publishes dist/. New Astro pages go in src/pages/ and replace the old
// file of the same name only once that file is removed from the site.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://neewoodygh.com',
  publicDir: '.stage',
  outDir: 'dist',
  build: { format: 'file' },
});
