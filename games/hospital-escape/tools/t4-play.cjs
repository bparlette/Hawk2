// node games/hospital-escape/tools/t4-play.cjs BEAT FRAMES OUTDIR  (BEAT may carry '&seg=N'; env KEYS=1 adds WASD on foot) — REAL INPUT play capture (no autopilot, no debug stepping): the page's own start
// button, mouse aim sweeps through the DOM pointer handlers, Space held in bursts to fire; the game runs on its own requestAnimationFrame loop and
// every frame is a 390x844 screenshot. Software rendering: the clip plays slower than wall-clock (the engine's 0.1 s step cap).
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [BEAT,NF,OUT]=process.argv.slice(2);
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=7&beat=${BEAT}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.click('#startBtn'); await p.mouse.move(195, 380);
 for(let n=0;n<+NF;n++){ const t=n/30, x=195+120*Math.sin(t*0.9), y=380+60*Math.sin(t*1.7); await p.mouse.move(x,y);
   if(n%24===0) await p.keyboard.down('Space'); if(n%24===10) await p.keyboard.up('Space');
   if(process.env.KEYS){ const K=['KeyS','KeyA','KeyS','KeyD','KeyW']; if(n%30===0) await p.keyboard.down(K[(n/30)%K.length]); if(n%30===25) await p.keyboard.up(K[(n/30|0)%K.length]); }   // on foot: back into walls, strafe, walk (real key events)
   await p.screenshot({path:path.join(OUT,'f'+String(n).padStart(4,'0')+'.png')}); }
 const st=await p.evaluate(()=>{ const s=__game.game.state(); return { seg: s.segment, hp: s.health, score: s.score, shots: __game.game.combat.shotsFired }; });
 console.log(JSON.stringify({st,errs})); await b.close(); })();
