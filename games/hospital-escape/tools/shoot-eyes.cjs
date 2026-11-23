// node games/hospital-escape/tools/shoot-eyes.cjs OUTDIR — patient-eyes evidence captures at 390x844 @2x from the shipped build
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os'), https = require('https');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), OUT = process.argv[2] || '.';
const get = u => new Promise((res, rej) => https.get(u, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res(Buffer.concat(b))); }).on('error', rej));
(async () => { if(!fs.existsSync(cache)) fs.writeFileSync(cache, await get(CDN)); fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] }), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const open = async () => { const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); await page.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
    await page.goto('file://' + path.resolve(__dirname, '../index.html') + '?seed=3', { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForFunction(() => window.__game && window.__dbg && window.__painted !== undefined); return { page, errs }; };
  const shot = async (page, name, js) => { await page.evaluate(() => __game.pause(false)); const info = await page.evaluate(js); await page.evaluate(() => __game.pause(true)); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, name + '.png') }); console.log(name.padEnd(26), JSON.stringify(info)); };
  const st = 'const s = __dbg.state(); return { seg: s.segment, pathT: +s.pathT.toFixed(3), health: s.health, lost: s.lost, lid: +window.__pe().lid.toFixed(3), red: +window.__pe().red.toFixed(2) };';
  let { page, errs } = await open();
  // 1. a route turn inside the hospital: the bed swinging out of the cross hall into the long ward
  await shot(page, 'route-turn-1', '(()=>{ const G = __game, g = G.game; G.start("bed_push"); let n = 0; while(g.rail.pathT() < 0.47 && n < 4000){ HE.autopilot(g); g.step(1/60); G.ff(0); n++; } G.ff(0.2); ' + st + ' })()');
  await shot(page, 'route-turn-2', '(()=>{ const G = __game, g = G.game; let n = 0; while(g.rail.pathT() < 0.56 && n < 4000){ HE.autopilot(g); g.step(1/60); n++; } G.ff(0.3, true); ' + st + ' })()');
  // 2. healthy vs hurt eyelids (same corridor beat): health 100, then 35 (lids by health + slower neck)
  await shot(page, 'lids-healthy', '(()=>{ const G = __game; G.start("transfer"); __dbg.gotoSegment("transfer", 1); G.ff(3); ' + st + ' })()');
  await shot(page, 'lids-hurt-35hp', '(()=>{ const G = __game; for(let i = 0; i < 13; i++){ __dbg.damage(5); G.ff(0.9); } G.ff(9); ' + st + ' })()');   // hurt, then calm: health-only lids
  // 3. red blink under sustained fire: three hits in quick succession -> red lids + forced hard blink
  await shot(page, 'red-blink-under-fire', '(()=>{ const G = __game; G.start("transfer"); __dbg.gotoSegment("transfer", 1); G.ff(2); __dbg.damage(9); G.ff(0.35); __dbg.damage(9); G.ff(0.35); __dbg.damage(9); G.ff(0.07); ' + st + ' })()');
  // 5. ambulance sway through one bend (beat 8): 4 frames 0.45 s apart, entering and leaving the S-bend at ~(215,-262)
  await page.evaluate('(()=>{ const G = __game; G.start("chase"); G.ff(6.2); })()');
  for(let k = 0; k < 4; k++) await shot(page, 'ambulance-sway-' + (k + 1), '(()=>{ __game.ff(0.45); const o = __game.game.cameraOffset; const s = __dbg.state(); return { pathT: +s.pathT.toFixed(3), roll_deg: +(o.roll * 57.3).toFixed(2), yaw_deg: +(o.yaw * 57.3).toFixed(2) }; })()');
  // 6. the finale train crossing (locomotive)
  await shot(page, 'train-locomotive', '(()=>{ const G = __game, g = G.game; G.start("train_finale"); let n = 0; while(!(g.chase.train && g.chase.train.t > 1.25) && n < 60 * 90){ HE.autopilot(g); g.step(1/60); n++; } G.ff(0); ' + st + ' })()');
  // 4. lose: the lids shut first, then COLE IS DOWN
  await shot(page, 'lose-lids-closing', '(()=>{ const G = __game; G.start("gauntlet"); G.ff(2); __dbg.damage(200); G.ff(0.45); ' + st + ' })()');
  await shot(page, 'lose-card', '(()=>{ __game.ff(0.8); ' + st + ' })()');
  console.log('page errors', errs.length, errs.slice(0, 3).join(' | ')); await browser.close(); })();
