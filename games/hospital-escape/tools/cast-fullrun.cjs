// node games/hospital-escape/tools/cast-fullrun.cjs [SEED] — INTEGRATION: a full autopilot run of the shipped game; prints the 3D cast's behaviour counts
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const SEED=process.argv[2]||7;
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=${SEED}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate(()=>{ __game.start('visit'); __game.pause(true); }); let t=0;
 while(t<420){ const done=await p.evaluate(()=>{ __game.ff(10,true); const g=__game.game; return g.ended || g.lost; }); t+=10; if(done) break; }
 const r=await p.evaluate(()=>({ ended: __game.game.ended, lost: __game.game.lost, time: +__game.game.time.toFixed(1), stats: HECAST.stats, rooms: HECAST.roomStats, paces: HECAST.paces }));
 console.log(JSON.stringify(Object.assign(r,{errs}))); await b.close(); })();
