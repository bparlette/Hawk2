// node run.cjs SCRIPT.js [args json] — opens probe.html, runs the async script body with ARGS, prints the JSON result
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const CDN3='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files']}), p=await b.newPage();
 p.on('pageerror',e=>console.log('PAGEERR',''+e)); p.on('console',m=>console.log('C:',m.text().slice(0,400)));
 await p.route(CDN3,r=>r.fulfill({body:fs.readFileSync('/tmp/three-0.128.0.min.js'),contentType:'text/javascript'}));
 await p.goto('file://'+path.join(__dirname,'probe.html')); await p.waitForFunction(()=>window.ld && THREE.GLTFExporter && THREE.SkeletonUtils);
 const src=fs.readFileSync(process.argv[2],'utf8'), args=JSON.parse(process.argv[3]||'{}');
 const r=await p.evaluate(async([src,args])=>{ const f=new Function('args','return (async()=>{'+src+'})()'); return await f(args); },[src,args]);
 if(r && r.__files){ for(const [k,v] of Object.entries(r.__files)) fs.writeFileSync(k, Buffer.from(v,'base64')); delete r.__files; }
 console.log(JSON.stringify(r,null,1)); await b.close(); })();
