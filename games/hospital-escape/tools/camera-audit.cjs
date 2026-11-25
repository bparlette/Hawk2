// node games/hospital-escape/tools/camera-audit.cjs [GAME_DIR] [--seed N] — CAMERA / FRAMING GUARDRAIL (CAMERA-FIX, Nov 25 2026).
// Catches, on its own, the four defect families the owner found on her phone — run it with every change (exit code 1 = FAIL):
//   A) LENS IN GEOMETRY   the segment pivot -> camera (pivot = the rider / Maya at eye height: open space by construction) is blocked:
//                         the camera is inside or behind a wall / door / prop.                                    FAIL on any sample.
//   B) WALL FILL          > 50% of a 7x13 grid of screen rays hit world geometry within 0.8 m of the lens, for > 0.6 s.   FAIL.
//   C) VOID               indoors, > 2% of screen rays hit NOTHING within 120 m (a missing / one-sided wall shows the outside void),
//                         for > 0.3 s.                                                                              FAIL.
//   D) AMBULANCE FRAMING  in the ambulance, > 60% of screen rays hit the vehicle's own body within 2.5 m, for > 0.6 s.  FAIL.
//                         (calibrated: the owner's shot-1 framing measures 0.74; the in-bay view through the rear doors 0.33-0.48)
//   E) ENCLOSURE          the boundary audit (game/enclose.js) re-run AFTER the repair (doors settled, 120 m rays): any hole left.  FAIL.
//   F) CAST OFF SCREEN    live enemies in a combat segment but none projected on screen for > 4 s.                    WARN (report).
// Coverage: one full autopilot playthrough (every beat, sampled every 0.1 s of game time) + a scripted ON-FOOT pass (Maya walks backward
// into walls, strafes, turns hard with the edge-turn — the moves the autopilot never makes) in the ward.
// Every surface is made double-sided in THIS page only, so a wall seen from behind still counts as a wall.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js');
const args=process.argv.slice(2), DIR=args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname,'..'), SEED=(args.indexOf('--seed')>=0 ? args[args.indexOf('--seed')+1] : 7);
const PAGE_FN = (opts) => { const g=__game.game, cam=g.camera, rc=new THREE.Raycaster(), V=THREE.Vector3; const world=[]; g.scene.children.forEach(c=>{ if(c.type==='Group' && c.children.length>8) world.push(c); });
  world.forEach(w=>w.traverse(o=>{ if(o.isMesh&&o.material&&!Array.isArray(o.material)) o.material.side=THREE.DoubleSide; }));
  const amb = window.__heProps && __heProps.amb; if(amb) amb.traverse(o=>{ if(o.isMesh&&o.material) o.material.side=THREE.DoubleSide; });
  const solid = h => h.object.visible!==false && !(h.object.material && (h.object.material.transparent || h.object.material.opacity<0.9));
  const OUTDOOR = /steal|chase|finale|train|exit_push/;   /* entrance_exit_push walks OUT through the main doors to the street: the outside is meant to show */ const res={ samples:0, A:[], B:[], C:[], D:[], F:[], run:{ B:0, C:0, D:0, F:0 } };
  const ndc=new THREE.Vector2(), grid=[]; for(let i=0;i<7;i++) for(let j=0;j<13;j++) grid.push([(i+0.5)/7*2-1, (j+0.5)/13*2-1]);
  function sample(t, tag){ const st=g.state(), m=st.mode, seg=st.segment||''; if(!m || m==='CUTSCENE') { res.run.B=res.run.C=res.run.D=0; return; } res.samples++;
    // A: pivot -> lens
    let pv=null; if(m==='FREE_FOOT'&&g.foot){ pv=g.foot.pos.clone(); pv.y+=g.foot.path.height; } else if(g.rail.path && m!=='AMBULANCE'){ pv=g.rail.path.pointAtS(g.rail.s); pv.y+=g.rail.path.height; }
    if(pv){ const d=cam.position.clone().sub(pv), L=d.length(); if(L>0.06){ rc.set(pv,d.normalize()); rc.near=0; rc.far=L; const h=rc.intersectObjects(world,true).filter(solid)[0]; if(h && h.distance < L-0.02 && res.A.length<40) res.A.push({ t:+t.toFixed(1), tag, seg, depth:+(L-h.distance).toFixed(2) }); } }
    // B / C / D: the screen grid
    let near=0, voids=0, ambN=0; cam.updateMatrixWorld(true);
    for(const p of grid){ ndc.set(p[0],p[1]); rc.setFromCamera(ndc,cam); rc.near=0.05; rc.far=120; const h=rc.intersectObjects(world,true).filter(solid)[0]; if(!h) voids++; else if(h.distance<0.8) near++;
      if(m==='AMBULANCE' && amb){ rc.far=2.5; const ha=rc.intersectObject(amb,true).filter(solid)[0]; if(ha) ambN++; } }
    const n=grid.length, dt=0.1;
    res.run.B = near/n>0.5 ? res.run.B+dt : 0; if(res.run.B>0.6 && res.B.length<40 && (!res.B.length || res.B[res.B.length-1].t < t-1)) res.B.push({ t:+t.toFixed(1), tag, seg, frac:+(near/n).toFixed(2) });
    const indoor=!OUTDOOR.test(seg); res.run.C = indoor && voids/n>0.02 ? res.run.C+dt : 0; if(res.run.C>0.3 && res.C.length<40 && (!res.C.length || res.C[res.C.length-1].t < t-1)) res.C.push({ t:+t.toFixed(1), tag, seg, frac:+(voids/n).toFixed(2) });
    res.run.D = m==='AMBULANCE' && ambN/n>0.6 ? res.run.D+dt : 0; if(res.run.D>0.6 && res.D.length<40 && (!res.D.length || res.D[res.D.length-1].t < t-1)) res.D.push({ t:+t.toFixed(1), tag, seg, frac:+(ambN/n).toFixed(2) });
    // F: live enemies but none on screen
    const live=g.combat.live(); if(live.length){ const on=live.some(e=>{ const v=e.pos.clone(); v.y+=1.2; v.project(cam); return v.z<1 && Math.abs(v.x)<1 && Math.abs(v.y)<1; }); res.run.F = on ? 0 : res.run.F+dt; if(res.run.F>4 && res.F.length<20 && (!res.F.length || res.F[res.F.length-1].t < t-4)) res.F.push({ t:+t.toFixed(1), tag, seg }); } else res.run.F=0; }
  return { sample, res };
};
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}); const errs=[];
 const open=async(q)=>{ const p=await b.newPage({viewport:{width:390,height:844}}); p.on('pageerror',e=>errs.push(''+e)); await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
   await p.goto(`file://${path.resolve(DIR,'index.html')}?seed=${SEED}${q||''}`); for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady || !window.HECAST]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
   await p.evaluate('window.__AUD = (' + PAGE_FN.toString() + ')({})'); return p; };
 // 1) the full autopilot playthrough, every beat
 let p=await open(''); await p.evaluate(()=>{ __game.start('visit'); __game.pause(true); }); let tEnd=0;
 for(let t=0;t<420;t+=1){ const done=await p.evaluate((t0)=>{ for(let k=0;k<10;k++){ __game.ff(0.1,true); __AUD.sample(t0+k*0.1,'autopilot'); } const g=__game.game; return g.ended || g.lost; }, t); tEnd=t; if(done) break; }
 const auto=await p.evaluate(()=>{ const g=__game.game; return Object.assign({ ended: !!g.ended, lost: !!g.lost }, __AUD.res, { enclosure: window.HEENCLOSE ? HEENCLOSE.report.map(r=>({ zone:r.zone, holes:r.holes, strips:r.strips, doorwaysKept:r.refused.length })) : null }); }); await p.close();
 // E) the boundary audit re-run on the REPAIRED world (a fresh page: enclose.js runs at load; this audit re-casts every boundary sample)
 p=await open(''); await p.evaluate(()=>{ __game.start('visit'); __game.pause(true); __game.ff(3,false); });   // doors settle (the car's far ends close) before the boundary is cast
 const encl=await p.evaluate(()=>{ __game.game.scene.updateMatrixWorld(true); const zones=HE.DATA.env.zones, root=__game.game.scene.children.filter(c=>c.type==='Group'&&c.children.length>8), rc=new THREE.Raycaster(), V=THREE.Vector3; const left=[];
   root.forEach(w=>w.traverse(o=>{ if(o.isMesh&&o.material&&!Array.isArray(o.material)) o.material.side=THREE.DoubleSide; }));
   const pathIds=(HE.DATA.paths||[]).map(p=>p.id);
   zones.forEach((z,zi)=>{ if(/street|outdoor/.test(z.kind)) return; let R=null; if(z.min&&z.max) R={x0:z.min[0],x1:z.max[0],z0:z.min[2],z1:z.max[2],y:z.y!=null?z.y:z.min[1]}; else if(z.a&&z.b&&z.w){ const ax=Math.abs(z.a[0]-z.b[0])<1e-3; R= ax ? {x0:z.a[0]-z.w/2,x1:z.a[0]+z.w/2,z0:Math.min(z.a[1],z.b[1]),z1:Math.max(z.a[1],z.b[1]),y:z.y||0} : {x0:Math.min(z.a[0],z.b[0]),x1:Math.max(z.a[0],z.b[0]),z0:z.a[1]-z.w/2,z1:z.a[1]+z.w/2,y:z.y||0}; } if(!R) return;
     [['x0',-1,0],['x1',1,0],['z0',0,-1],['z1',0,1]].forEach(sd=>{ const alongX=sd[2]!==0, a0=alongX?R.x0:R.z0, a1=alongX?R.x1:R.z1, fixed=R[sd[0]], dir=new V(sd[1],0,sd[2]);
       for(let s=a0+0.25;s<=a1-0.25+1e-6;s+=0.5){ let hole=true; [0.9,1.7].forEach(hy=>{ const p=alongX?new V(s,R.y+hy,fixed-sd[2]*0.15):new V(fixed-sd[1]*0.15,R.y+hy,s); rc.set(p,dir); rc.far=120; const h=rc.intersectObjects(root,true).filter(x=>x.object.visible!==false&&x.distance>0.02); if(h.length) hole=false; });
         const px=alongX?s:fixed, pz=alongX?fixed:s; if(hole && HEWORLD.pathDist(HE.DATA,pathIds,px,pz)>=1.0) left.push({ zone:(z.name||z.kind)+'#'+zi, at:[+px.toFixed(1),+pz.toFixed(1)] }); } }); });
   return left; }); await p.close();
 // 2) the scripted ON-FOOT pass (ward): backward into walls, strafes, hard edge-turns — real input values, no autopilot
 p=await open(''); await p.evaluate(()=>{ __game.start('gauntlet'); __game.game.gotoSegment('gauntlet',2); __game.pause(true); });
 const foot=await p.evaluate(()=>{ const g=__game.game, I=g.input; for(let t=0;t<30;t+=0.1){ const ph=Math.floor(t/1.5)%4; I.move.x = ph===1 ? -1 : ph===3 ? 1 : 0; I.move.y = ph===0 || ph===2 ? 1 : -0.5; I.aim.x = ph===2 ? 0.04 : ph===3 ? 0.96 : 0.5; I.aim.y=0.45;
     __game.ff(0.1,false); if(g.state().mode!=='FREE_FOOT') break; __AUD.sample(t,'on-foot'); } return __AUD.res; }); await p.close();
 const R={ A:[...auto.A,...foot.A], B:[...auto.B,...foot.B], C:[...auto.C,...foot.C], D:[...auto.D,...foot.D], F:[...auto.F,...foot.F] };
 const fails={ 'A lens in geometry':R.A.length, 'B wall fill > 0.6 s':R.B.length, 'C void visible indoors > 0.3 s':R.C.length, 'D ambulance body fills frame > 0.6 s':R.D.length, 'E enclosure holes left':encl.length, 'page errors':errs.length };
 const out={ seed:+SEED, playthrough:{ ended:auto.ended, lost:auto.lost, samples:auto.samples }, onFootSamples:foot.samples, fails, warn:{ 'F cast off screen > 4 s': R.F.length }, examples:{ A:R.A.slice(0,6), B:R.B.slice(0,6), C:R.C.slice(0,6), D:R.D.slice(0,6), E:encl.slice(0,6), F:R.F.slice(0,6) }, enclosure:auto.enclosure, errs:errs.slice(0,5) };
 console.log(JSON.stringify(out,null,1)); const bad=Object.values(fails).some(v=>v>0); console.log(bad ? 'CAMERA AUDIT: FAIL' : 'CAMERA AUDIT: PASS'); await b.close(); process.exit(bad?1:0); })();
