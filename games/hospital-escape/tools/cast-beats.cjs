// node games/hospital-escape/tools/cast-beats.cjs OUTPREFIX BEAT[:SEG] "QUERY" "secs,secs" — INTEGRATION: live game, waits for the 3D cast, ff with autopilot, a 390x844 still + renderer.info per step
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js');
const [OUT,BEAT,QX,STEPS]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,300)); });
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${require('path').resolve(__dirname, '../index.html')}?seed=7${QX||''}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && (r[1] || /cast=painted/.test(QX||""))) break; await p.waitForTimeout(200); }
 await p.evaluate((beat)=>{ const [bt,sg]=beat.split(":"); __game.start(bt); if(sg) __game.game.gotoSegment(bt,+sg); __game.pause(true); }, BEAT); for(let i=0;i<100;i++){ if(await p.evaluate(()=>!window.HECAST||!HECAST.ready||HECAST.roomsBuilt)) break; await p.waitForTimeout(200); }
 const out=[]; let k=0;
 for(const s of (STEPS||'2,4,6').split(',')){ const secs=+s; await p.evaluate((t)=>__game.ff(t,true), secs); await p.waitForTimeout(100);
   const info=await p.evaluate(()=>{ const R=__renderer; R.info.autoReset=false; R.info.reset(); __post.render(1); const i=R.info.render; const g=__game.game, st=g.state();
     return { seg: st.segment, mode: st.mode, hp: st.health, live: g.combat.live().length, c3: g.combat.enemies.filter(e=>{ const a=g.greybox.actors[e.role]; return a && a.userData.c3; }).length, calls: i.calls, tris: i.triangles, stats: window.HECAST && JSON.parse(JSON.stringify(HECAST.stats)), rooms: window.HECAST && HECAST.roomStats }; });
   await p.screenshot({path:`${OUT}-${k}.png`}); info.shot=`${OUT}-${k}.png`; out.push(info); k++; }
 console.log(JSON.stringify({ ready: await p.evaluate(()=>window.__castReady), paces: await p.evaluate(()=>window.HECAST && HECAST.paces), out, errs },null,0)); await b.close(); })();
