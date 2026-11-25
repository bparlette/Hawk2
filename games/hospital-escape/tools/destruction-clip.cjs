// node games/hospital-escape/tools/destruction-clip.cjs SEED SECONDS OUTDIR [START=chase] [FPS=15] — autopilot capture of the chase at 390x844, one PNG per
// game frame step, plus OUTDIR/events.json (frame index of every destruction / gunman event) so clips can be cut around the rollover / chain crash.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js');
const [SEED='7', SECS='40', OUT='dclip', START='chase', FPS='15']=process.argv.slice(2); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}});
 const errs=[]; p.on('pageerror',e=>errs.push(''+e)); await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=${SEED}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate(s=>{ __game.start(s); __game.pause(true); }, START); const ev=[]; let n0=0;
 for(let f=0; f<(+SECS)*(+FPS); f++){ const r=await p.evaluate(dt=>{ __game.ff(dt,true); const g=__game.game; return { L: g._log.length, won: g.won || g.ended }; }, 1/(+FPS));
   const news=await p.evaluate(n=>__game.game._log.slice(n).filter(e=>e.type==='destruction'||(e.type==='enemyFire'&&e.data.via==='gunman')||e.type==='kill').map(e=>({type:e.type,d:e.data})), n0); n0=r.L;
   news.forEach(e=>ev.push(Object.assign({frame:f},e))); await p.waitForTimeout(30); await p.screenshot({path:path.join(OUT,'f'+String(f).padStart(4,'0')+'.png')}); if(r.won) break; }
 fs.writeFileSync(path.join(OUT,'events.json'), JSON.stringify(ev,null,1)); console.log(JSON.stringify({frames: fs.readdirSync(OUT).length-1, events: ev.length, errs})); await b.close(); })();
