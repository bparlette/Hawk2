// node games/hospital-escape/tools/shoot-demo.cjs OUTDIR — greybox demo screenshots at 390x844 (fast-forwarded engine, then rendered)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), OUT = process.argv[2] || '.';
const get = u => new Promise((res, rej) => https.get(u, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b))); }).on('error', rej));
const SHOTS = [
  ['rail-corridor', 'gauntlet', 'g => g.rail.pathT() > 0.27 || g.time > 30', true],
  ['holdout', 'entrance', 'g => g.mode === "HOLDOUT" && g.segT > 3.2', false],
  ['ambulance-chase', 'chase', 'g => g.segT > 4.5 && g.chase.list.some(p => p.state === "pursuing" && g.rail.s - p.s < 14)', false],
  ['train-crossing', 'train_finale', 'g => g.chase.trainOccupying() && g.chase.train.t > 2.2', true]];
(async () => {
  if(!fs.existsSync(cache)) fs.writeFileSync(cache, await get(CDN));
  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); fs.mkdirSync(OUT, { recursive: true });
  for(const [name, beat, cond, ap] of SHOTS){
    const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
    await page.goto('file://' + path.resolve(__dirname, '../engine/demo.html') + '?beat=' + beat + '&seed=3', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__demo);
    const info = await page.evaluate(([c, ap]) => { const g = window.__demo.game, f = eval(c); let n = 0; while(!f(g) && n < 60 * 120){ if(ap) HE.autopilot(g); g.step(1 / 60); n++; } if(!ap){ const t = g.liveEnemies()[0] || g.chase.list.find(p => p.state === 'pursuing'); if(t){ const pr = g.project(t.role, t.role.startsWith('pursuer') ? 'driver' : undefined); if(pr) g.dbg.aim(pr.x, pr.y); } } const s = g.state();
      return { simS: +(n / 60).toFixed(1), segment: s.segment, mode: s.mode, pathT: +s.pathT.toFixed(3), enemies: s.enemiesAlive, pursuers: s.pursuers.map(p => p.kind + ':' + p.state), won: s.won, health: s.health }; }, [cond, ap]);
    await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name.padEnd(16), JSON.stringify(info), 'page errors', errs.length, errs.join(' | ')); await page.close(); }
  await browser.close(); })();
