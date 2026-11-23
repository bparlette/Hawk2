// node games/hospital-escape/tools/run-tests.cjs [--shots OUTDIR]
// Runs engine/tests.html headlessly in Chromium (Playwright) from file:// and prints window.__testResults.
// three.js r128 is served from the pinned CDN URL (fetched once by node and cached in the OS temp dir, so the page
// still requests exactly https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js');
const get = u => new Promise((res, rej) => https.get(u, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b))); }).on('error', rej));
(async () => {
  if(!fs.existsSync(cache)) fs.writeFileSync(cache, await get(CDN));
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  await page.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
  page.on('pageerror', e => errs.push(String(e)));
  const t0 = Date.now(); await page.goto('file://' + path.resolve(__dirname, '../engine/tests.html'), { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.waitForFunction(() => window.__testResults, null, { timeout: 600000 });
  const R = await page.evaluate(() => window.__testResults);
  console.log('| ID | Test | Result | Detail |\n|---|---|---|---|');
  for(const r of R.list) console.log(`| ${r.id} | ${r.name} | ${r.pass ? 'PASS' : '**FAIL**'} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)} |`);
  console.log(`\n**${R.passed} passed, ${R.failed} failed of ${R.list.length}** (${((Date.now() - t0) / 1000).toFixed(1)} s, page errors: ${errs.length}${errs.length ? ' — ' + errs.join(' | ') : ''})`);
  await browser.close(); process.exit(R.failed || errs.length ? 1 : 0);
})();
