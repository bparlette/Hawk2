// node mayacam.cjs BEAT WARM FRAMES OUTDIR — observer camera beside Maya (evidence only: not the player's view), raw render (no post)
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const [BEAT,WARM,NF,OUT]=process.argv.slice(2);
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}});
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto(`file://${require('path').resolve(__dirname, '../index.html')}?seed=7`);
 for(let i=0;i<300;i++){ const r=await p.evaluate(()=>[window.__painted, window.__castReady]); if(r[0]!==undefined && r[1]) break; await p.waitForTimeout(200); }
 await p.evaluate((beat)=>{ __game.start(beat); __game.pause(true); }, BEAT); await p.evaluate((t)=>__game.ff(t,true), +WARM);
 const reacts=[];
 for(let n=0;n<+NF;n++){ const r=await p.evaluate(()=>{ __game.ff(1/30,true); const M=__heProps.maya, R=__renderer, g=__game.game; const c=window.__obsCam||(window.__obsCam=new THREE.PerspectiveCamera(40,390/844,0.05,80));
     const fw=g.rail.lookDir.clone().setY(0).normalize(), rt=new THREE.Vector3(-fw.z,0,fw.x); c.position.copy(M.position).addScaledVector(fw,2.6).addScaledVector(rt,-1.3); c.position.y=M.position.y+1.5; c.lookAt(M.position.x,M.position.y+1.0,M.position.z);
     R.setRenderTarget(null); R.render(g.scene,c); return { img: R.domElement.toDataURL('image/png'), react: JSON.stringify(HECAST.stats.mayaReact||{}) }; });
   fs.writeFileSync(path.join(OUT,'f'+String(n).padStart(4,'0')+'.png'), Buffer.from(r.img.split(',')[1],'base64')); reacts.push(r.react); }
 console.log(JSON.stringify({ first: reacts[0], last: reacts[reacts.length-1] })); await b.close(); })();
