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
const res=await page.evaluate(()=>{ const W=window.__S.world, C=W.colliders; let bad=0, worst=[], tot=0;
  for(const c of C){ let n=0; for(let x=-c.hw;x<=c.hw;x+=2) for(let z=-c.hd;z<=c.hd;z+=2){ const wx=c.cx+x*c.cos+z*c.sin, wz=c.cz-x*c.sin+z*c.cos; if(W.surfaceAt(wx,wz)==='road') n++; }
    const m2=n*4; tot+=m2; if(m2>=40){ bad++; worst.push([Math.round(m2), Math.round(c.hw*2), Math.round(c.hd*2), Math.round(c.cx), Math.round(c.cz)]); } }
  worst.sort((a,b)=>b[0]-a[0]); return { colliders:C.length, coveringRoad40m2:bad, roadM2UnderColliders:tot, worst:worst.slice(0,6) }; });
console.log(JSON.stringify(res)); console.log('errors',errs.length, errs.slice(0,2)); await browser.close()})();
