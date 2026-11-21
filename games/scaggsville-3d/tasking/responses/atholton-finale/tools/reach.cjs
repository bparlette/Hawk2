const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const root=process.argv[2]||'/home/user/hawk2';
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json'};
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:390,height:844}});
await ctx.route('**/*',async r=>{const u=new URL(r.request().url());
 if(u.hostname==='local.test'){ if(u.pathname.endsWith('s3d-dbg.html')) return r.fulfill({body:fs.readFileSync(path.join(__dirname,'s3d-dbg.html')),contentType:'text/html'});
 const f=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:types[path.extname(f)]||'application/octet-stream'});return r.fulfill({status:404,body:''})}
 if(/youtube/.test(u.hostname)) return r.fulfill({status:204,body:''});
 return r.continue();});
const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
await page.goto('http://local.test/games/scaggsville-3d/s3d-dbg.html');
await page.waitForFunction(()=>window.__S&&window.__S.world,null,{timeout:60000});
const res=await page.evaluate(async()=>{
  const W=window.__S.world, C=W.colliders, D=(await import('/games/scaggsville-3d/src/data.js')).WORLD_DATA; const R=1.05;
  const blocked=(x,z)=>{ for(const c of C){ const dx=x-c.cx, dz=z-c.cz; if(dx*dx+dz*dz>(c.hw+c.hd+R+2)**2) continue; const lx=dx*c.cos-dz*c.sin, lz=dx*c.sin+dz*c.cos; const qx=Math.max(-c.hw,Math.min(c.hw,lx)), qz=Math.max(-c.hd,Math.min(c.hd,lz)); if((lx-qx)**2+(lz-qz)**2<=R*R) return true; } return false; };
  const out=[];
  for(const s of D.stops){
    // flood fill free cells (0.5 m) within 80 m of the stop, seeded from free road cells >= 50 m away (the approach)
    const S=0.5, N=Math.round(160/S), g=new Uint8Array(N*N), x0=s.sx-80, z0=s.sz-80; const q=[];
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const x=x0+(i+.5)*S, z=z0+(j+.5)*S; if(blocked(x,z)) g[j*N+i]=2; else if(Math.hypot(x-s.sx,z-s.sz)>60 && W.surfaceAt(x,z)!=='grass'){ g[j*N+i]=1; q.push(j*N+i);} }
    let best=1e9, bx=0,bz=0;
    while(q.length){ const id=q.pop(), i=id%N, j=(id/N)|0, x=x0+(i+.5)*S, z=z0+(j+.5)*S; const d=Math.hypot(x-s.sx,z-s.sz); if(d<best){best=d;bx=x;bz=z;}
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const a=i+di,b=j+dj; if(a<0||b<0||a>=N||b>=N) continue; const k=b*N+a; if(!g[k]){ g[k]=1; q.push(k);} } }
    let inside=0; for(const c of C){ const dx=s.sx-c.cx, dz=s.sz-c.cz; const lx=dx*c.cos-dz*c.sin, lz=dx*c.sin+dz*c.cos; if(Math.abs(lx)<c.hw&&Math.abs(lz)<c.hd) inside=Math.max(inside, Math.min(c.hw-Math.abs(lx), c.hd-Math.abs(lz))); }
    out.push({id:s.id, sx:s.sx, sz:s.sz, insideDepth:+inside.toFixed(1), minDist:+best.toFixed(1), at:[+bx.toFixed(1),+bz.toFixed(1)], margin:+(17-best).toFixed(1)});
  }
  return {n:C.length, out};
});
console.log(JSON.stringify(res)); console.log('errors',errs.length, errs.slice(0,2)); await browser.close()})();
