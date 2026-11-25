// node games/hospital-escape/tools/cam-scan.cjs BEAT[:SEG] SECONDS [GAME_DIR]  (env FOOT=1 scripted on-foot input; STOPT=s SHOT=png: stop there + screenshot) — CAMERA-FIX audit: steps a beat with the autopilot in 1/60 s steps and, every
// 0.1 s, tests the segment from the camera's pivot (the rider / Maya at eye height — open space by construction) to the camera against the built
// world (every surface double-sided for the test). Reports how often and how deep the camera sits inside / behind geometry. Works on any build.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [BEAT,SECS,DIR]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${path.resolve(DIR||path.join(__dirname,'..'),'index.html')}?seed=7${process.env.FOOT?'&foot=1':''}${process.env.STOPT?'&stopt='+process.env.STOPT:''}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate((beat)=>{ const [bt,sg]=beat.split(':'); __game.start(bt); if(sg) __game.game.gotoSegment(bt,+sg); __game.pause(true); }, BEAT);
 const r=await p.evaluate((secs)=>{ const g=__game.game, cam=g.camera, rc=new THREE.Raycaster(); const world=[]; g.scene.children.forEach(c=>{ if(c.type==='Group' && c.children.length>8) world.push(c); });
   world.forEach(w=>w.traverse(o=>{ if(o.isMesh&&o.material&&!Array.isArray(o.material)) o.material.side=THREE.DoubleSide; }));
   const out={ samples:0, inside:0, worst:0, worstT:null, worstSeg:null, events:[] };
   const scripted = /foot/.test(location.search);
   const STOPT = +(new URLSearchParams(location.search).get('stopt') || 1e9);
   for(let t=0;t<secs && t<STOPT-1e-6;t+=0.1){ if(scripted){ const ph=Math.floor(t/1.5)%4, I=g.input; I.move.x = ph===1 ? -1 : ph===3 ? 1 : 0; I.move.y = ph===0 ? 1 : ph===2 ? 1 : -0.5; I.aim.x = ph===2 ? 0.04 : ph===3 ? 0.96 : 0.5; I.aim.y=0.45; __game.ff(0.1,false); } else __game.ff(0.1,true);
     const st=g.state(), m=st.mode; let pv=null;
     if(m==='FREE_FOOT'&&g.foot){ pv=g.foot.pos.clone(); pv.y+=g.foot.path.height; } else if(g.rail.path && m!=='AMBULANCE' && m!=='CUTSCENE'){ pv=g.rail.path.pointAtS(g.rail.s); pv.y+=g.rail.path.height; }
     if(!pv) continue; const d=cam.position.clone().sub(pv), L=d.length(); if(L<1e-3) continue; rc.set(pv,d.normalize()); rc.far=L+0.2; out.samples++;
     const h=rc.intersectObjects(world,true).filter(x=>x.object.visible&&!(x.object.material&&x.object.material.transparent))[0];
     if(h){ const pen=+(L+0.2-h.distance).toFixed(2); out.inside++; if(pen>out.worst){ out.worst=pen; out.worstT=+t.toFixed(1); out.worstSeg=st.segment; } if(out.events.length<12) out.events.push([+t.toFixed(1), st.segment, pen]); } }
   return out; }, +SECS);
 if(process.env.SHOT){ await p.waitForTimeout(600); await p.screenshot({ path: process.env.SHOT }); }   // with STOPT: the frame at that moment, 390x844
 console.log(JSON.stringify(Object.assign({ beat: BEAT, dir: DIR||'current' }, r, { errs: errs.length }))); await b.close(); })();
