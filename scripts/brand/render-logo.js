// Needs puppeteer-core installed outside the repo (npm i puppeteer-core in a scratch folder) and Chrome.
// node render_logo.js <repoDir> : renders the Concierge logo files from scripts/brand/lockup-render.html into images/concierge/
const puppeteer = require('puppeteer-core'), http = require('http'), fs = require('fs'), path = require('path');
const repo = process.argv[2];
const types = { html: 'text/html', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(repo, decodeURIComponent(req.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[f.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
(async () => {
  await new Promise((r) => server.listen(8794, r));
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage(); await p.setViewport({ width: 1200, height: 1400, deviceScaleFactor: 2 });
  await p.goto('http://localhost:8794/scripts/brand/lockup-render.html', { waitUntil: 'networkidle0' }); await p.evaluate(() => document.fonts.ready);
  const out = path.join(repo, 'images/concierge');
  for (const [id, name, scale] of [['lockup-light', 'cc-lockup-on-navy.png'], ['lockup-dark', 'cc-lockup-on-bone.png']]) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(out, name) }); console.log(name, fs.statSync(path.join(out, name)).size);
  }
  await p.setViewport({ width: 1200, height: 1400, deviceScaleFactor: 1 });
  const m = await p.$('#mark512'); await m.screenshot({ path: path.join(out, 'cc-mark-512.png'), omitBackground: true }); console.log('cc-mark-512.png', fs.statSync(path.join(out, 'cc-mark-512.png')).size);
  await b.close(); server.close();
})();
