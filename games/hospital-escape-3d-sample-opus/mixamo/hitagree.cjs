// node hitagree.cjs G — hit agreement of the Mixamo-driven gunman: rendered silhouette vs per-pixel raycast against the hit proxies
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const G=process.argv[2]||1;
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file:///home/user/hawk2/games/hospital-escape-3d-sample-opus-mixamo/index.html?seed=7&g=${G}`);
 for(let i=0;i<600;i++){ const r=await p.evaluate(()=>[window.__painted, window.__opusReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate(()=>__opus.showcase({d0:9.5,l0:0.5,d1:7.0,l1:0.45,fireFrom:99}));
 const res=[];
 for(const [label,steps] of [['walking',40],['stopped-aiming',120]]){
  await p.evaluate((n)=>{ for(let i=0;i<n;i++){ __opus.walkStep(1/60); __opus.walkStep(1/60); } __game.tick(); }, steps);
  res.push(await p.evaluate((label)=>{ const R=__renderer, G=__game.game, cam=G.camera, sc=G.scene, f=__opus.show, W=390, H=844;
   const keep=new Set(); f.root.traverse(o=>keep.add(o)); const vis=[]; sc.traverse(o=>{ if(o.isMesh||o.isSprite||o.isPoints||o.isLine){ if(!keep.has(o)||o.name==='proxy'||o===f.shadow||(f.gun&&f.gun.getObjectById(o.id))){ vis.push([o,o.visible]); o.visible=false; } } });
   const bg=sc.background, fog=sc.fog; sc.background=new THREE.Color(0); sc.fog=null; sc.overrideMaterial=new THREE.MeshBasicMaterial({color:0xffffff, skinning:true})   /* r128: an override material must opt into skinning or the mask is the bind pose */;
   const rt=new THREE.WebGLRenderTarget(W,H); R.setRenderTarget(rt); R.clear(); R.render(sc,cam); const px=new Uint8Array(W*H*4); R.readRenderTargetPixels(rt,0,0,W,H,px); R.setRenderTarget(null);
   sc.overrideMaterial=null; sc.background=bg; sc.fog=fog; vis.forEach(([o,v])=>o.visible=v);
   const rc=new THREE.Raycaster(), nd=new THREE.Vector2(); const img=[]; let S=0,P=0,SP=0,x0=W,x1=0,y0=H,y1=0;
   for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(px[(y*W+x)*4]>128){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
   const pad=12; for(let y=Math.max(0,y0-pad);y<=Math.min(H-1,y1+pad);y+=2) for(let x=Math.max(0,x0-pad);x<=Math.min(W-1,x1+pad);x+=2){ const s=px[(y*W+x)*4]>128; nd.set((x+0.5)/W*2-1,(y+0.5)/H*2-1); rc.setFromCamera(nd,cam); const h=rc.intersectObjects(f.proxies,false).length>0; if(s)S++; if(h)P++; if(s&&h)SP++; if(s||h) img.push([x,y,s?1:0,h?1:0]); }
   const dist=cam.position.distanceTo(f.root.position);
   return {label, dist_m:+dist.toFixed(2), silhouette_px:S*4, proxy_px:P*4, bodyHit_pct:+(100*SP/S).toFixed(1), agreement_pct:+(100*SP/(S+P-SP)).toFixed(1), bbox:[x0,y0,x1,y1], img}; }, label)); }
 fs.writeFileSync('ha-'+G+'.json', JSON.stringify(res)); res.forEach(r=>delete r.img); console.log(JSON.stringify({g:+G,res,errs})); await b.close(); })();
