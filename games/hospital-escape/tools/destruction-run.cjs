// node games/hospital-escape/tools/destruction-run.cjs [SEEDS=7,3,11] [START=steal] — DESTRUCTION gate: plays the chase + finale on autopilot per seed and
// counts every destruction outcome (veer, chain, rollover with roll counts, fire, blowout), window gunmen spawned / shots / kills, page errors.
// FAILS (exit 1) unless, per seed, all five behaviours occur: veer, chain, rollover (2-3 rolls), fire, blowout, and a window gunman fires.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js');
const SEEDS=(process.argv[2]||'7,3,11').split(','), START=process.argv[3]||'steal'; let fail=false;
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']});
 if(!fs.existsSync(cache)){ const r=await fetch(CDN3); fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer())); }
 for(const SEED of SEEDS){ const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
  await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=${SEED}`);
  for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
  await p.evaluate(s=>{ __game.start(s); __game.pause(true); }, START); let t=0;
  while(t<200){ const done=await p.evaluate(()=>{ __game.ff(5,true); const g=__game.game; return g.ended || g.lost || g.won; }); t+=5; if(done) break; }
  const r=await p.evaluate(()=>{ const g=__game.game, L=g._log; const ev=L.filter(e=>e.type==='destruction').map(e=>e.data);
   const rolls=ev.filter(d=>d.kind==='rollover').map(d=>d.rolls); const gm=L.filter(e=>e.type==='enemyFire'&&e.data.via==='gunman');
   return { won: !!g.won, lost: !!g.lost, stats: g.destruction && g.destruction.stats, rolls, outcomes: ev.filter(d=>d.kind!=='slam'&&d.kind!=='gunmanSpawn').map(d=>d.kind+(d.victim?'(victim)':'')),
     gunmanShots: gm.length, gunmanHits: gm.filter(e=>e.data.hit).length, gunmanShotsWithVis: L.filter(e=>e.type==='enemyShot'&&/^gunman:/.test(e.data.role)&&e.data.vis).length }; });
  const s=r.stats||{}, ok = s.veer>0 && s.chain>0 && s.rollover>0 && s.fire>0 && s.blowout>0 && r.gunmanShots>0 && r.rolls.every(n=>n>=2&&n<=3) && !errs.length;
  if(!ok) fail=true; console.log(JSON.stringify(Object.assign({seed:SEED, pass: ok}, r, {errs})));
  await p.close(); }
 console.log(fail ? 'DESTRUCTION RUN: FAIL' : 'DESTRUCTION RUN: PASS'); await b.close(); process.exit(fail?1:0); })();
