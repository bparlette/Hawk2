// node recoil.cjs G RECOIL — standing aim, firing every 1.6 s: gun-muzzle displacement per shot (no screenshots)
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [G,RC]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file:///home/user/hawk2/games/hospital-escape-3d-sample-opus-mixamo/index.html?seed=7&g=${G}&recoil=${RC}`);
 for(let i=0;i<600;i++){ const r=await p.evaluate(()=>[window.__painted, window.__opusReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 const r=await p.evaluate(()=>{ __opus.showcase({d0:7,l0:0.5,d1:6.95,l1:0.5,fireFrom:0,fireEvery:1.6}); const log=[]; for(let i=0;i<360;i++) log.push(__opus.walkStep(1/60));
   return log.map(x=>[x.fire?1:0].concat(x.gun)); const shots=[]; for(let i=1;i<log.length;i++) if(log[i].fire && !log[i-1].fire && i>60){ const g0=log[i-1].gun; let mx=0, up=0; for(let j=i;j<Math.min(log.length,i+60);j++){ const g=log[j].gun, d=Math.hypot(g[0]-g0[0],g[1]-g0[1],g[2]-g0[2]); mx=Math.max(mx,d); up=Math.max(up,g[1]-g0[1]); } shots.push({ at_s:+(i/60).toFixed(2), peak_cm:+(100*mx).toFixed(1), rise_cm:+(100*up).toFixed(1) }); }
   return shots; });
 fs.writeFileSync(`rc-${G}-${RC}.json`, JSON.stringify(r)); console.log('ok', errs.length); await b.close(); })();
