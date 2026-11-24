// node clip3.cjs BEAT[:SEG] WARM FRAMES OUTDIR — live game: warm-up with autopilot, then FRAMES x 1/30 s (autopilot on) screenshots
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [BEAT,WARM,NF,OUT]=process.argv.slice(2);
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${require('path').resolve(__dirname, '../index.html')}?seed=7`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate((beat)=>{ const [bt,sg]=beat.split(':'); __game.start(bt); if(sg) __game.game.gotoSegment(bt,+sg); __game.pause(true); }, BEAT);
 await p.evaluate((t)=>__game.ff(t,true), +WARM); const log=[];
 for(let n=0;n<+NF;n++){ const s=await p.evaluate(()=>{ __game.ff(1/30,true); const g=__game.game; return g.combat.enemies.map(e=>{ const a=g.greybox.actors[e.role], f=a&&a.userData.c3; return f ? [f.style, f.gait||'', e.exposed?1:0, a.userData.dead?1:0] : null; }).filter(Boolean); }); log.push(s); await p.screenshot({path:path.join(OUT,'f'+String(n).padStart(4,'0')+'.png')}); }
 const st=await p.evaluate(()=>HECAST.stats); fs.writeFileSync(path.join(OUT,'log.json'), JSON.stringify({log,stats:st,errs})); console.log(JSON.stringify({stats:st,errs:errs.length})); await b.close(); })();
