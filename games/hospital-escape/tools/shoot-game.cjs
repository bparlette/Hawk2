// node games/hospital-escape/tools/shoot-game.cjs OUTDIR [--full] — shipped-build captures at 390x844 + autopilot full run + lose path
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), OUT = process.argv[2] || '.';
const get = u => new Promise((res, rej) => https.get(u, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b))); }).on('error', rej));
const SHOTS = (process.env.SHOTS || 'bed-push,wheelchair-corridor,cafeteria,ambulance-chase,train-finale,room-412,holdout,on-foot').split(',');
const SPEC = {
  'room-412': ['visit', 'g => g.segT > 1.2', false],
  'bed-push': ['bed_push', 'g => g.rail.pathT() > 0.2 && g.combat.live().some(e => e.exposed && e.t > 1.2)', false],
  'wheelchair-corridor': ['transfer', 'g => g.segment === "transfer_chair_corridor" && g.rail.pathT() > 0.3 && g.combat.live().length >= 2 && g.segT > 6', true],
  'cafeteria': ['gauntlet', 'g => g.segment === "gauntlet_cafeteria" && g.combat.live().length >= 2 && g.segT > 3.5', true],
  'on-foot': ['gauntlet', 'g => g.segment === "gauntlet_ward_on_foot" && g.segT > 2.5', true],
  'holdout': ['entrance', 'g => g.mode === "HOLDOUT" && g.combat.live().length >= 2 && g.segT > 3.2', false],
  'ambulance-chase': ['chase', 'g => g.segT > 5 && g.chase.list.some(p => p.state === "pursuing" && g.rail.s - p.s < 16)', false],
  'train-finale': ['train_finale', 'g => g.chase.train && g.chase.train.t > 1.12', true] };
(async () => {
  if(!fs.existsSync(cache)) fs.writeFileSync(cache, await get(CDN)); fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const open = async (q) => { const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if(m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
    await page.goto('file://' + path.resolve(__dirname, '../index.html') + q, { waitUntil: 'load' }); await page.waitForFunction(() => window.__game && window.__dbg); return { page, errs }; };
  for(const name of SHOTS){ if(!SPEC[name]) continue; const [beat, cond, ap] = SPEC[name]; const { page, errs } = await open('?seed=3');
    const info = await page.evaluate(([beat, c, ap]) => { const G = window.__game, g = G.game; G.start(beat); const f = eval(c); let n = 0; while(!f(g) && n < 60 * 120){ if(ap) HE.autopilot(g); g.step(1 / 60); n++; }
      // aim the reticle at a live threat so the frame shows aim + incoming fire as a player would
      const t = g.liveEnemies().find(e => e.exposed) || g.chase.list.find(p => p.state === 'pursuing'); if(t){ const pr = g.project(t.role, t.role.startsWith('pursuer') ? 'driver' : undefined); if(pr && pr.onScreen) __dbg.aim(pr.x, pr.y); }
      G.ff(0.25, false); const s = __dbg.state(); return { simS: +(n / 60).toFixed(1), segment: s.segment, mode: s.mode, pathT: +s.pathT.toFixed(3), enemies: s.enemiesAlive, pursuers: s.pursuers.map(p => p.kind + ':' + p.state), won: s.won, health: s.health }; }, [beat, cond, ap]);
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, name + '.png') });
    console.log(name.padEnd(20), JSON.stringify(info), 'page errors', errs.length, errs.slice(0, 2).join(' | ')); await page.close(); }
  if(process.argv.includes('--full')){
    const { page, errs } = await open('?seed=7'); const r = await page.evaluate(() => { const G = window.__game, g = G.game; G.start('visit'); __dbg.autopilot(true); let n = 0; const t0 = performance.now();
      while(!g.state().ended && !g.state().lost && n < 60 * 900){ HE.autopilot(g); g.step(1 / 60); n++; } const s = __dbg.state(), ev = __dbg.events();
      return { ended: s.ended, won: s.won, lost: s.lost, health: s.health, score: s.score, accuracy: s.accuracy, bystanders: s.bystanders, simSeconds: Math.round(n / 60), wallMs: Math.round(performance.now() - t0),
        beats: ev.filter(e => e.type === 'beat').map(e => e.data.beat).join(','), modes: [...new Set(ev.filter(e => e.type === 'mode').map(e => e.data.mode))].join(','),
        redShots: ev.filter(e => e.type === 'enemyShot' && e.data.red).length, shotsAtHeroes: ev.filter(e => e.type === 'enemyShot').length, heroHits: ev.filter(e => e.type === 'heroHit').length, partnerShots: ev.filter(e => e.type === 'partnerShot').length,
        damageWithoutRedShot: ev.filter(e => e.type === 'heroHit' && e.data.src !== 'dbg').filter(h => !ev.some(x => x.type === 'shotLand' && x.data.hit && Math.abs(x.t - h.t) < 1e-6)).length }; });
    await page.waitForTimeout(1200); const card = await page.evaluate(() => document.getElementById('cardTitle').textContent); await page.screenshot({ path: path.join(OUT, 'end-card.png') });
    console.log('FULL RUN', JSON.stringify(r), 'end card:', card, 'page errors', errs.length, errs.slice(0, 3).join(' | '));
    const L = await page.evaluate(() => { __dbg.autopilot(false); __dbg.gotoBeat('gauntlet'); window.__game.ff(2); for(let i = 0; i < 12; i++){ __dbg.damage(10); window.__game.ff(0.05); } window.__game.ff(0.5); return { lost: __dbg.state().lost, health: __dbg.state().health, loseEvents: __dbg.events().filter(e => e.type === 'lose').length }; });
    await page.waitForTimeout(900); await page.screenshot({ path: path.join(OUT, 'lose-card.png') }); const lc = await page.evaluate(() => document.getElementById('cardTitle').textContent);
    console.log('LOSE PATH', JSON.stringify(L), 'card:', lc, 'page errors', errs.length); await page.close(); }
  await browser.close(); })();
