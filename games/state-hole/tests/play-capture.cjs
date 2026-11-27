// Play evidence from REAL touch input: serves the game, boots index.html (no test hooks), and drives it only with CDP touch
// events (touchStart / touchMove / touchEnd) — a finger held and swept around the screen, as a player would. Saves a PNG
// every SHOT ms plus a log of the game's own HUD state (window.__game) per shot.
//   node games/state-hole/tests/play-capture.cjs OUTDIR [SECONDS=60] [SHOT=700]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), [OUT = 'play', SECS = '60', SHOT = '700'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
(async () => { const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(r => srv.listen(0, r));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('' + e)); await p.goto(`http://localhost:${srv.address().port}/index.html`); await p.waitForTimeout(3000);
  const cdp = await ctx.newCDPSession(p), touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await touch('touchStart', 195, 600); await touch('touchEnd'); await p.waitForTimeout(1500);   // tap to start
  const log = []; let n = 0, t0 = Date.now(); await touch('touchStart', 195, 330);
  while (Date.now() - t0 < +SECS * 1000) { const u = (Date.now() - t0) / 1000;
    // sweep the held finger: a slow figure-eight around the upper half of the screen (the hole chases the finger's ground point)
    const x = 195 + Math.sin(u * 0.35) * 150, y = 360 + Math.sin(u * 0.7) * 170; await touch('touchMove', x, y);
    await p.screenshot({ path: path.join(OUT, 'f' + String(n).padStart(4, '0') + '.png') }); log.push(Object.assign({ n, wall: +u.toFixed(1), finger: [Math.round(x), Math.round(y)] }, await p.evaluate(() => window.__game || {}))); n++;
    await p.waitForTimeout(+SHOT); }
  await touch('touchEnd'); fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log)); console.log(JSON.stringify({ shots: n, last: log[log.length - 1], errs }));
  await b.close(); srv.close(); })();
