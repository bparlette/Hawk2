// node opus-walk.cjs EX VER OUTDIR [frames] [showcaseJSON]  — fixed-step showcase walk, 30 fps frames, metrics JSON
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js');
const [EX,VER,OUT,NF,SC]=process.argv.slice(2); fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(''+e)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text().slice(0,200)); });
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file:///home/user/hawk2/games/hospital-escape-3d-sample-opus-mixamo/index.html?seed=7&g=${EX}${process.env.QX||""}`); 
 for(let i=0;i<600;i++){ const r=await p.evaluate(()=>[window.__painted, window.__opusReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 const ready=await p.evaluate(()=>window.__opusReady); if(ready!==true){ console.log('NOT READY', ready, errs); await b.close(); return; }
 const sc=await p.evaluate((o)=>__opus.showcase(o), SC?JSON.parse(SC):{});
 const log=[]; const N=+NF||200;
 for(let n=0;n<N;n++){ const st=await p.evaluate(()=>{ let r; for(let k=0;k<2;k++){ r=__opus.walkStep(1/60); } __game.tick(); return r; });
   await p.waitForTimeout(30); await p.screenshot({path:path.join(OUT,'f'+String(n).padStart(4,'0')+'.png')}); log.push(st); }
 const m=await p.evaluate(()=>{ const R=__renderer; R.info.autoReset=false; R.info.reset(); __post.render(1); const i=R.info.render; const fig=__opus.show; const box=new THREE.Box3().setFromObject(fig.model); const sz=box.getSize(new THREE.Vector3());
   return { slide:__opus.slideReport(), cost:__opus.cost(), frame:{calls:i.calls, tris:i.triangles}, figureHeight_m:__opus.height(), mocap:__opus.mocap||null, paces:__opus.paceRaw, paceSamples:__opus.paceSamples, kLeg:__opus.kLeg }; });
 const out={ex:+EX, ver:+VER, showcase:sc, frames:log.length, clipsSeen:[...new Set(log.map(x=>x&&x.clip))], ...m, errs}; fs.writeFileSync(path.join(OUT,'metrics.json'), JSON.stringify(out,null,1)); console.log(JSON.stringify(out));
 await b.close(); })();
