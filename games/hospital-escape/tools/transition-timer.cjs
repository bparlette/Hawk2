// node games/hospital-escape/tools/transition-timer.cjs [SECONDS] [QUERY] — TRANSITION-HITCH: the shipped page on its OWN requestAnimationFrame loop
// (START button click, ?auto=1 = the game's own autopilot driving real input values), every frame's wall time logged with the segment.
// Reports, for the first N segment changes: the worst frame within 1.5 s after the cut vs the run's median frame, plus what ran on that frame.
// NOTE: this container renders on the CPU (SwiftShader), so absolute ms are not phone ms — the hitch is judged as excess over the median frame.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const SECS=+(process.argv[2]||150), QX=process.argv[3]||'';
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=7&auto=1${QX}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST, !window.HECAST || HECAST.patientsReady]); if(r[0]!==undefined && r[1] && r[2]) break; await p.waitForTimeout(200); }
 await p.evaluate(()=>{ window.__tt=[]; window.__acc={ step:0, render:0, n:0 }; const g=__game.game, st0=g.step.bind(g), pr0=__post.render.bind(__post); g.step=function(dt){ const t=performance.now(); st0(dt); __acc.step+=performance.now()-t; __acc.n++; }; __post.render=function(t){ const q=performance.now(); pr0(t); __acc.render+=performance.now()-q; };
   let last=performance.now(); (function loop(now){ window.__tt.push([now, now-last, g.state().segment||'', g.state().beat||'', +__acc.step.toFixed(0), +__acc.render.toFixed(0), __acc.n]); __acc.step=0; __acc.render=0; __acc.n=0; last=now; requestAnimationFrame(loop); })(performance.now()); });
 await p.click('#startBtn'); const t0=Date.now(); while(Date.now()-t0 < SECS*1000){ await p.waitForTimeout(2000); const n=await p.evaluate(()=>{ const T=window.__tt; let c=0; for(let i=1;i<T.length;i++) if(T[i][2]!==T[i-1][2]) c++; return c; }); if(n>=4) break; }
 const r=await p.evaluate(()=>{ const T=window.__tt.slice(2), d=T.map(x=>x[1]).sort((a,b)=>a-b), med=d[d.length>>1], cuts=[];
   for(let i=1;i<T.length;i++) if(T[i][2]!==T[i-1][2]){ let worst=0, wt=null, wj=i; for(let j=i;j<T.length && T[j][0]-T[i][0]<1500;j++) if(T[j][1]>worst){ worst=T[j][1]; wt=+(T[j][0]-T[i][0]).toFixed(0); wj=j; } cuts.push({ from:T[i-1][2], to:T[i][2], worstFrame_ms:+worst.toFixed(0), atMsAfterCut:wt, hitch_ms:+(worst-med).toFixed(0), prevFrame:{ step_ms:T[wj-1][4], render_ms:T[wj-1][5], steps:T[wj-1][6] }, thisFrame:{ step_ms:T[wj][4], render_ms:T[wj][5], steps:T[wj][6] } }); }
   return { frames:T.length, medianFrame_ms:+med.toFixed(1), cuts:cuts.slice(0,5) }; });
 console.log(JSON.stringify(Object.assign(r,{errs}),null,1)); await b.close(); })();
