// Driven rally proof: autopilot presses real keys (KeyW/A/D/S) along a Dijkstra path over D.roads; collisions live.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const root=process.argv[2]||'/home/user/hawk2', OUT=process.argv[3]||__dirname, FULL=process.argv.includes('--full');
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:240,height:420}});
await ctx.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.hostname==='local.test'){ if(u.pathname.endsWith('s3d-dbg.html')) return r.fulfill({body:fs.readFileSync(path.join(__dirname,'s3d-dbg.html')),contentType:'text/html'});
 const f=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:types[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''})}
 if(/youtube/.test(u.hostname)) return r.fulfill({status:204,body:''});
 return r.continue();});
const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto('http://local.test/games/scaggsville-3d/s3d-dbg.html');
await page.waitForFunction(()=>window.__S&&window.__S.world,null,{timeout:60000});
await page.evaluate(async()=>{
  const D=(await import('/games/scaggsville-3d/src/data.js')).WORLD_DATA; const key=(p)=>Math.round(p[0]*2)+','+Math.round(p[1]*2);
  const N=new Map(); const node=(p)=>{ const k=key(p); if(!N.has(k)) N.set(k,{p,e:[]}); return N.get(k); };
  for(const r of D.roads){ if(/^(motorway|trunk)$/.test(r.hw)) continue; for(let i=0;i<r.pts.length-1;i++){ const a=node(r.pts[i]), b=node(r.pts[i+1]), L=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]); a.e.push([b,L]); b.e.push([a,L]); } }
  const near=(x,z)=>{ let best=null,bd=1e18; for(const n of N.values()){ const d=(n.p[0]-x)**2+(n.p[1]-z)**2; if(d<bd){bd=d;best=n;} } return best; };
  window.__path=(x0,z0,x1,z1)=>{ const s=near(x0,z0), t=near(x1,z1); const dist=new Map([[s,0]]), prev=new Map(), done=new Set(); const Q=[[0,s]];
    while(Q.length){ Q.sort((a,b)=>a[0]-b[0]); const [d,n]=Q.shift(); if(done.has(n)) continue; done.add(n); if(n===t) break;
      for(const [m,L] of n.e){ const nd=d+L; if(nd<(dist.get(m)??1e18)){ dist.set(m,nd); prev.set(m,n); Q.push([nd,m]); } } }
    const out=[]; for(let n=t;n;n=prev.get(n)) out.push(n.p); out.reverse(); out.push([x1,z1]); return { pts:out, len:dist.get(t) }; };
  const press=(c,on)=>window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:c}));
  window.__drive=(P)=>new Promise(res=>{ let i=0, t0=performance.now(), last=null, stuck=0, lastProg=performance.now(), bestD=1e9;
    const tick=()=>{ const S=window.__P(), pl=S.player; if(!pl){ requestAnimationFrame(tick); return; }
      const ms=window.__missions && window.__missions.debug.state();
      if(ms && ['approach','park','walkup','panel','walkback'].includes(ms.cop)){   // Kosack's fake traffic stop: pull over, play the panel
        ['KeyA','KeyD','KeyW'].forEach(c=>press(c,false)); press('KeyS', true); lastProg=performance.now(); window.__copSeen=(window.__copSeen||0)+1;
        for(const id of ['pb-letgo','pb-window']){ const b=document.getElementById(id); if(b){ b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); break; } }
        requestAnimationFrame(tick); return; }
      press('KeyS', false);
      while(i<P.length-1 && Math.hypot(P[i][0]-pl.x,P[i][1]-pl.z)<9){ i++; lastProg=performance.now(); }
      { let bk=i, bd=1e9; for(let k=i;k<Math.min(P.length,i+25);k++){ const d=Math.hypot(P[k][0]-pl.x,P[k][1]-pl.z); if(d<bd){bd=d;bk=k;} } if(bk>i){ i=Math.min(P.length-1,bk+1); lastProg=performance.now(); } }
      const goal=P[P.length-1], dg=Math.hypot(goal[0]-pl.x, goal[1]-pl.z); if(dg<bestD-1){ bestD=dg; lastProg=performance.now(); }
      const tgt=P[i]; let err=Math.atan2(tgt[0]-pl.x, tgt[1]-pl.z)-pl.heading; err=Math.atan2(Math.sin(err),Math.cos(err));
      press('KeyA', err>0.05); press('KeyD', err<-0.05);
      const sp=Math.abs(pl.speed||0), lim=Math.abs(err)>0.5? 5 : dg<40? 8 : 14;
      press('KeyW', sp<lim); press('KeyS', sp>lim+4);
      const doneLeg = S.finished || (window.__legDone && window.__legDone(S));
      if(doneLeg || performance.now()-lastProg>40000){ ['KeyA','KeyD','KeyW','KeyS'].forEach(c=>press(c,false)); res({copStop:window.__copSeen||0, ok:!!doneLeg, minDist:+bestD.toFixed(1), ms:Math.round(performance.now()-t0), finished:S.finished, collected:S.collected}); return; }
      requestAnimationFrame(tick); };
    tick(); });
});
await page.evaluate(()=>window.__proof.start('brad')); await page.waitForTimeout(3000);
const log=[];
const legs=await page.evaluate(()=>window.__P().targets.concat(['atholton']));
for(const id of legs){
  const st=await page.evaluate((id)=>window.__proof.stopPt(id),id);
  let from;
  from=await page.evaluate(({st,FULL,id})=>{ const pl=window.__P().player; if(FULL) return {x:pl.x,z:pl.z};
    const p=window.__path(pl.x,pl.z,st.x,st.z).pts; let acc=0; for(let k=p.length-1;k>0;k--){ acc+=Math.hypot(p[k][0]-p[k-1][0],p[k][1]-p[k-1][1]); if(acc>(id==='atholton'?1500:250)){ const h=Math.atan2(p[k][0]-p[k-1][0],p[k][1]-p[k-1][1]); window.__proof.teleport(p[k-1][0],p[k-1][1],h); return {x:p[k-1][0],z:p[k-1][1]}; } } return {x:pl.x,z:pl.z}; },{st,FULL,id});
  await page.waitForTimeout(300);
  const r=await page.evaluate(({from,st,id})=>{ const P=window.__path(from.x,from.z,st.x,st.z); window.__legDone=(S)=> id==='atholton'? S.finished : S.collected.includes(id);
    return window.__drive(P.pts).then(x=>({...x, pathM:Math.round(P.len)})); },{from,st,id});
  log.push({leg:id, from:[Math.round(from.x),Math.round(from.z)], ...r}); console.log(JSON.stringify(log[log.length-1]));
  if(!r.ok) break;
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(2500);
const party=await page.evaluate(()=>window.__missions.debug.state());
await page.screenshot({path:path.join(OUT,'finale.png')});
console.log(JSON.stringify({party, errors:errs}));
fs.writeFileSync(path.join(OUT,'drive-log.json'), JSON.stringify({log,party,errors:errs},null,1));
await browser.close()})();
