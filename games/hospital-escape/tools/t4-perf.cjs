// node games/hospital-escape/tools/t4-perf.cjs "beat[:seg]@secs,..." "QUERY" — frame cost at 390x844: per beat, after the warm-up, 40 frames of the
// game's real render (scene + shadow passes + post) each forced to completion (1-px readPixels), mean / p90 ms + renderer.info. SwiftShader (CPU) here:
// the numbers are RELATIVE (T4 vs ?t4=0 on the same machine), not phone milliseconds.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const BEATS=(process.argv[2]||'gauntlet@3').split(','), QX=process.argv[3]||'';
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}); const out=[];
 for(const spec of BEATS){ const [beat,secs]=spec.split('@'); const p=await b.newPage({viewport:{width:390,height:844}}); await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
   await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=7${QX}`);
   for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
   await p.evaluate((beat)=>{ const [bt,sg]=beat.split(':'); __game.start(bt); if(sg) __game.game.gotoSegment(bt,+sg); __game.pause(true); }, beat); await p.evaluate((t)=>__game.ff(t,true), +secs||2);
   const r=await p.evaluate(()=>{ const R=__renderer, gl=R.getContext(), px=new Uint8Array(4), ts=[]; R.info.autoReset=false;
     for(let i=0;i<45;i++){ __game.ff(1/60,true); R.info.reset(); const t0=performance.now(); if(__post) __post.render(i); else R.render(__game.game.scene,__game.game.camera); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); const dt=performance.now()-t0; if(i>=5) ts.push(dt); }
     ts.sort((a,b)=>a-b); return { seg: __game.game.state().segment, meanMs: +(ts.reduce((a,b)=>a+b,0)/ts.length).toFixed(1), p90Ms: +ts[Math.floor(ts.length*0.9)].toFixed(1), calls: R.info.render.calls, tris: R.info.render.triangles, programs: R.info.programs.length }; });
   out.push(Object.assign({ beat: spec }, r)); await p.close(); }
 console.log(JSON.stringify(out)); await b.close(); })();
