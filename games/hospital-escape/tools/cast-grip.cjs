// node grip.cjs BEAT[:SEG] SECS OUT — live game at deviceScaleFactor 2; crops a 195x422 CSS-px window around the nearest 3D gunman's pistol = 2x zoom at full res
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [BEAT,SECS,OUT]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${require('path').resolve(__dirname, '../index.html')}?seed=7`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate((beat)=>{ const [bt,sg]=beat.split(':'); __game.start(bt); if(sg) __game.game.gotoSegment(bt,+sg); __game.pause(true); }, BEAT);
 let best=null; for(let k=0;k<40 && !best;k++){ await p.evaluate(()=>__game.ff(0.25,false)); best=await p.evaluate(()=>{ const g=__game.game, cam=g.camera; let b=null; g.combat.live().forEach(e=>{ const a=g.greybox.actors[e.role]; if(!a||!a.userData.c3||!e.exposed) return; const m=HECAST.muzzle(a,new THREE.Vector3()), d=m.distanceTo(cam.position), v=m.clone().project(cam); if(v.z<1 && Math.abs(v.x)<0.6 && Math.abs(v.y)<0.6 && d<9 && (!b||d<b.d)) b={d:+d.toFixed(2), x:(v.x+1)/2*390, y:(1-v.y)/2*844, style:a.userData.c3.style, gait:a.userData.c3.gait||'aim'}; }); return b; }); }
 await p.waitForTimeout(150); await p.screenshot({path:OUT+'-full.png'});
 if(best){ const x=Math.max(0,Math.min(390-195,best.x-97)), y=Math.max(0,Math.min(844-422,best.y-150)); await p.screenshot({path:OUT+'-2x.png', clip:{x,y,width:195,height:422}}); }
 console.log(JSON.stringify(best)); await b.close(); })();
