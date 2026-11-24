// node games/hospital-escape/tools/fairness-audit.cjs [OUTDIR] — OPUS-FIX-FAIRNESS-PACE §1.5 acceptance test.
// For seeds 7, 3, 11: (a) a full autopilot run and (b) a DAMAGE SOAK (never shoots) of every combat beat for 45 s.
// Every damage event is matched to the shot that caused it (same shooter, arrival time) and checked against the contract
// using the shooter's state logged AT FIRE TIME: inside the eyelid/tunnel visible zone (+margin), unoccluded, >= 40 px tall,
// visible >= 0.6 s. PASS = zero violations. With OUTDIR, it also captures the first damaging shot in three beats.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), os = require('os');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache = path.join(os.tmpdir(), 'three-0.128.0.min.js'), OUT = process.argv[2];
const SOAK = [['bed_push', 0], ['transfer', 1], ['elevator', 0], ['gauntlet', 0], ['gauntlet', 1], ['gauntlet', 3], ['entrance', 0], ['steal', 1], ['chase', 0], ['train_finale', 0]];
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] }); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const total = { runs: 0, damage: 0, violations: 0, visualOnly: 0, damagingShots: 0, minVisT: 9, minPx: 999, examples: [] }; const lines = [];
  for(const seed of (process.env.CAPTURE_ONLY ? [] : [7, 3, 11])){ const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e))); await p.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?seed=' + seed, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => window.__game && window.__dbg && window.__painted !== undefined && (!window.HECAST || window.__castReady)); await p.evaluate(() => __game.pause(true));
    const audit = `(label, i0) => { const ev = __dbg.events().slice(i0 || 0), F = __game.game.data.tuning.fairness, out = { label, damage: 0, violations: 0, visualOnly: 0, damagingShots: 0, minVisT: 9, minPx: 999, bad: [] };
      ev.forEach((e, i) => { if(e.type === 'enemyShot'){ if(e.data.red) out.damagingShots++; else out.visualOnly++; }
        if(e.type !== 'heroHit' || !e.data.src || e.data.src === 'dbg') return; out.damage++;
        let shot = null; for(let j = i; j >= 0; j--){ const x = ev[j]; if(x.type === 'enemyShot' && x.data.role === e.data.src && x.data.red && Math.abs(x.data.eta - e.t) < 0.05){ shot = x; break; } }
        const v = shot && shot.data.vis; const ok = !!(v && v.inZone && !v.occl && v.px >= F.minPx && v.visT >= F.telegraph);
        if(v){ out.minVisT = Math.min(out.minVisT, v.visT); out.minPx = Math.min(out.minPx, v.px); }
        if(!ok){ out.violations++; out.bad.push({ t: e.t, src: e.data.src, vis: v }); } }); return out; }`;
    // (a) full autopilot run
    const full = await p.evaluate(`(() => { const G = __game, g = G.game; G.start('visit'); const t0 = __dbg.events().length; let n = 0; while(!g.state().ended && !g.state().lost && n < 60 * 900){ HE.autopilot(g); g.step(1/60); n++; } return (${audit})('seed ${seed} full autopilot run (won ' + g.state().won + ')', t0); })()`);
    lines.push(full);
    // (b) damage soak: every combat beat, 45 s, never shooting
    for(const [beat, segI] of SOAK){ const r = await p.evaluate(`(() => { const G = __game, g = G.game; G.start('${beat}'); if(${segI}) __dbg.gotoSegment('${beat}', ${segI}); const t0 = __dbg.events().length;
        let n = 0; while(n < 60 * 45 && !g.state().lost){ g.input.fire = false; g.step(1/60); n++; } const o = (${audit})('seed ${seed} soak ${beat}#${segI}', t0); o.lostAt = g.state().lost ? +(n/60).toFixed(1) : null; return o; })()`);
      lines.push(r); }
    if(seed === 7){ const ctl = await p.evaluate(`(() => { const G = __game, g = G.game, T = g.data.tuning, keep = T.fairness, sf = T.screenFire; G.start('gauntlet'); __dbg.gotoSegment('gauntlet', 1); T.fairness = null; T.screenFire = null; const t0 = __dbg.events().length;
        let n = 0; while(n < 60 * 45 && !g.state().lost){ g.input.fire = false; g.step(1/60); n++; } T.fairness = keep; T.screenFire = sf; const o = (${audit})('CONTROL (contract OFF) soak gauntlet#1', t0); return o; })()`); ctl.control = true; lines.push(ctl); }
    lines.push({ label: 'seed ' + seed + ' page errors', pageErrors: errs.length }); await p.close(); }
  lines.forEach(l => { if(l.damage == null || l.control) return; total.runs++; total.damage += l.damage; total.violations += l.violations; total.visualOnly += l.visualOnly; total.damagingShots += l.damagingShots; total.minVisT = Math.min(total.minVisT, l.minVisT); total.minPx = Math.min(total.minPx, l.minPx); if(l.bad.length) total.examples.push(...l.bad.slice(0, 2).map(x => Object.assign({ run: l.label }, x))); });
  lines.forEach(l => console.log(l.damage == null ? JSON.stringify(l) : `${l.label.padEnd(42)} damage events ${String(l.damage).padStart(3)}  violations ${l.violations}  damaging shots ${l.damagingShots}  visual-only shots ${l.visualOnly}  min visible-for ${l.minVisT === 9 ? '-' : l.minVisT + ' s'}  min height ${l.minPx === 999 ? '-' : l.minPx + ' px'}${l.lostAt ? '  (lost at ' + l.lostAt + ' s)' : ''}`));
  console.log('TOTAL ' + JSON.stringify(total)); console.log(total.violations === 0 ? 'FAIRNESS AUDIT: PASS' : 'FAIRNESS AUDIT: FAIL');
  if(OUT){ fs.mkdirSync(OUT, { recursive: true }); const p = await ctx.newPage(); await p.route(CDN, r => r.fulfill({ body: fs.readFileSync(cache), contentType: 'text/javascript' }));
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?seed=7', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => window.__game && window.__painted !== undefined && (!window.HECAST || window.__castReady));
    for(const [beat, segI, name] of [['bed_push', 0, 'first-damage-bed-push'], ['gauntlet', 1, 'first-damage-cafeteria'], ['chase', 0, 'first-damage-chase']]){
      const info = await p.evaluate(`(() => { const G = __game, g = G.game; G.pause(false); G.start('${beat}'); if(${segI}) __dbg.gotoSegment('${beat}', ${segI}); const n0 = __dbg.events().length; let n = 0, shot = null;
        let atStep = null; while(n < 60 * 60){ g.input.fire = false; g.step(1/60); n++; const ev = __dbg.events(); for(let i = n0; i < ev.length; i++){ if(ev[i].type === 'enemyShot' && ev[i].data.red){ shot = ev[i]; break; } }
          if(shot){ const oo = g.actorObject(shot.data.role); atStep = oo ? g.losBlocked(g.camera.position, oo.position.clone().setY(oo.position.y + 1.26), shot.data.role) : null; G.tick(); break; } G.tick(); }
        G.pause(true); if(!shot) return null; const e = g.combat.byRole(shot.data.role) || g.chase.byRole(shot.data.role); const o = g.actorObject(shot.data.role); const pr = g.project(shot.data.role);
        const blocked = o ? g.losBlocked(g.camera.position, o.position.clone().setY(o.position.y + 1.26), shot.data.role) : null;
        let what = null; if(blocked){ const to = o.position.clone().setY(o.position.y + 1.26), d = to.clone().sub(g.camera.position), L = d.length(); const rc = new THREE.Raycaster(g.camera.position.clone(), d.normalize(), 0.05, L - 0.45); rc.camera = g.camera;
          const h = rc.intersectObjects(g.scene.children.filter(c => !c.isSprite), true).filter(x => !(x.object.material && x.object.material.transparent))[0]; if(h){ const ch = []; for(let q = h.object; q; q = q.parent) ch.push(q.name || q.type); what = h.distance.toFixed(2) + ' ' + ch.slice(0, 5).join('<'); } }
        return { t: shot.t, src: shot.data.role, visAtFire: shot.data.vis, nowOnScreen: pr && pr.onScreen, nowScreen: pr && [+pr.x.toFixed(3), +pr.y.toFixed(3)], blockedAtFireStep: atStep, nowBlocked: blocked, blockedBy: what, mayaToCam: +g.actorObject('friend').position.distanceTo(g.camera.position).toFixed(2) }; })()`);
      await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log(name, JSON.stringify(info)); } }
  await b.close(); process.exit(total.violations ? 1 : 0); })();
