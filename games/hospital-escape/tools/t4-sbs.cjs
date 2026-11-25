// node games/hospital-escape/tools/t4-sbs.cjs OUTDIR [views.json] — T4-FULL-PORT acceptance: T4 standalone vs the game at MATCHED viewpoints, 390x844.
// T4 = games/hospital-escape-hallway-neon/?take=4&vp=..&clean=1&t=0 (its own fixed rig). Game = the shipped page; the camera is put at the same
// position / look target / 60 deg FOV, eyelids zeroed (healthy), and the game's real pipeline (scene -> HDR -> T4 composite) renders the frame.
// Extra views (no T4 counterpart) take { name, pos, look, beat } and render the game only.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const OUT=process.argv[2]; fs.mkdirSync(OUT,{recursive:true});
const VIEWS = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3],'utf8')) : [
  { name: 'vp1', t4: 'vp1', pos: [12.0, 1.55, -16.8], look: [12.0, 1.38, -28.0] }, { name: 'vp2', t4: 'vp2', pos: [12.0, 1.55, -21.5], look: [11.65, 1.32, -28.5] }, { name: 'vp3', t4: 'vp3', pos: [12.0, 1.55, -42.0], look: [12.0, 1.38, -28.0] }];
const QX = process.env.QX || '';
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}); const res=[];
 const page=async()=>{ const p=await b.newPage({viewport:{width:390,height:844}}); await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'})); return p; };
 for(const v of VIEWS.filter(v=>v.t4)){ const p=await page(); await p.goto(`file://${path.resolve(__dirname,'../../hospital-escape-hallway-neon/index.html')}?take=4&vp=${v.t4}&clean=1&t=0`);
   await p.waitForFunction(()=>window.__hallwayRig && window.__hallwayRig.ready, null, {timeout:120000}); await p.waitForTimeout(4000); await p.screenshot({path:path.join(OUT,v.name+'-t4.png')}); await p.close(); }
 const p=await page(); const errs=[]; p.on('pageerror',e=>errs.push(''+e)); p.on('console',m=>{ if(m.type()==='error'||/WebGL|shader|THREE/i.test(m.text())) errs.push('console: '+m.text().slice(0,400)); });
 await p.goto(`file://${path.resolve(__dirname,'../index.html')}?seed=7${QX}`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 for(const v of VIEWS){ await p.evaluate((beat)=>{ __game.start(beat||'visit'); __game.pause(true); }, v.beat); await p.waitForTimeout(2500);
   const r=await p.evaluate((v)=>{ const g=__game.game, cam=g.camera, R=__renderer; const keep={pos:cam.position.clone(), q:cam.quaternion.clone(), fov:cam.fov};
     cam.position.set(v.pos[0],v.pos[1],v.pos[2]); cam.fov=60; cam.updateProjectionMatrix(); cam.lookAt(v.look[0],v.look[1],v.look[2]); cam.updateMatrixWorld(true);
     if(window.HET4 && HET4.on) HET4.step(cam, true, ''); const u=__post && __post.u; if(u){ u.lidTop.value=0; u.lidBot.value=0; u.hurt.value=0; u.dying.value=0; u.drift.value=0; u.tunnel.value=0; }
     R.info.autoReset=false; R.info.reset(); if(__post) __post.render(1); else R.render(g.scene,cam); const calls=R.info.render.calls, tris=R.info.render.triangles; const img=R.domElement.toDataURL('image/png');
     cam.position.copy(keep.pos); cam.quaternion.copy(keep.q); cam.fov=keep.fov; cam.updateProjectionMatrix(); return { img, calls, tris }; }, v);
   fs.writeFileSync(path.join(OUT,v.name+'-game.png'), Buffer.from(r.img.split(',')[1],'base64')); res.push({ view:v.name, calls:r.calls, tris:r.tris }); }
 console.log(JSON.stringify({res,errs})); await b.close(); })();
