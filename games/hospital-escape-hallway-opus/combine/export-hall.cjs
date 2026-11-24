// exports take4's dressed WEST WING B (+ the two adjoining halls) as GLB + lamps JSON, for the Cycles bake
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', cache=path.join(os.tmpdir(),'three-0.128.0.min.js'); const OUT=process.argv[2];
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage({viewport:{width:390,height:844}});
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync(cache),contentType:'text/javascript'}));
 await p.goto('file:///home/user/hawk2/games/hospital-escape-hallway-opus/take4/index.html?seed=7'); for(let i=0;i<900;i++){ if(await p.evaluate(()=>window.__hallReady)) break; await p.waitForTimeout(200); }
 await p.addScriptTag({url:'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js'}); await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>new Promise((res,rej)=>{ const H=__hall, root=H.root; const lamps=[]; H.parts.panel.forEach(pm=>{ const pa=pm.geometry.attributes.position; for(let i=0;i+6<=pa.count;i+=6){ const c=new THREE.Vector3(); for(let k=0;k<6;k++) c.add(new THREE.Vector3().fromBufferAttribute(pa,i+k)); lamps.push(c.multiplyScalar(1/6).toArray()); } });
   const kill=[]; root.traverse(o=>{ if(o.isLight) kill.push(o); if(o.isMesh && (o.visible===false || H.parts.pool.includes(o))) kill.push(o); }); kill.forEach(o=>o.parent.remove(o));
   root.updateMatrixWorld(true); let rescaled=0;
   root.traverse(o=>{ if(!o.isMesh) return; const m=o.material; if(Array.isArray(m)) return; const mp=m.map||m.normalMap||m.roughnessMap; if(mp && (mp.repeat.x!==1||mp.repeat.y!==1) && o.geometry.attributes.uv){ const g=o.geometry=o.geometry.clone(), uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*mp.repeat.x, uv.getY(i)*mp.repeat.y); uv.needsUpdate=true; ['map','normalMap','roughnessMap'].forEach(k=>{ if(m[k]){ m[k]=m[k].clone(); m[k].repeat.set(1,1); m[k].needsUpdate=true; } }); rescaled++; }
     o.name = o.name || (H.parts.panel.includes(o)?'panel':Object.keys(H.parts).find(k=>H.parts[k].includes(o))||'mesh'); if(H.parts.panel.includes(o)) o.name='LAMPPANEL'; });
   new THREE.GLTFExporter().parse(root, gl=>{ const u=new Uint8Array(gl); let s=''; for(let i=0;i<u.length;i+=32768) s+=String.fromCharCode.apply(null,u.subarray(i,i+32768)); res({glb:btoa(s), lamps, rescaled, zone:H.zone}); }, {binary:true, onlyVisible:true, maxTextureSize:1024}); }));
 fs.writeFileSync(OUT+'/hall-src.glb', Buffer.from(r.glb,'base64')); fs.writeFileSync(OUT+'/lamps.json', JSON.stringify({lamps:r.lamps, zone:r.zone}));
 console.log('lamps', r.lamps.length, 'rescaled', r.rescaled, 'bytes', Buffer.from(r.glb,'base64').length); await b.close(); })();
