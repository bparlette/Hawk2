import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDN3 = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css',
  '.json': 'application/json',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.glb':  'model/gltf-binary',
  '.txt':  'text/plain',
};

function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const cleanPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const full = path.join(WORKSPACE, cleanPath.replace(/^\/+/, ''));
      if (!full.startsWith(WORKSPACE) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(full).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

class CDP {
  constructor(wsUrl) {
    this.id = 0; this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((res, rej) => { this.ws.onopen = () => res(); this.ws.onerror = rej; });
    this.ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  close() { try { this.ws.close(); } catch (_) {} }
}

async function launchChrome(cdpPort) {
  const userDir = `/tmp/neon_guardrails_chrome_${cdpPort}`;
  fs.rmSync(userDir, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${userDir}`, 'about:blank'
  ], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = (await r.json()).find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return { proc, page, userDir };
    } catch (_) {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('Chrome CDP timeout');
}

async function waitForExpr(cdp, expr, timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const out = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (out.result && out.result.value) return out.result.value;
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error(`Timeout waiting for: ${expr}`);
}

const SOAK = [['bed_push', 0], ['transfer', 1], ['elevator', 0], ['gauntlet', 0], ['gauntlet', 1], ['gauntlet', 3], ['entrance', 0], ['steal', 1], ['chase', 0], ['train_finale', 0]];

async function runTests(cdp, port, pageErrors) {
  pageErrors.length = 0;
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/games/hospital-escape/engine/tests.html` });
  const R = await waitForExpr(cdp, 'window.__testResults || null', 120000);
  console.log(`\n=== ENGINE TESTS: ${R.passed} passed, ${R.failed} failed of ${R.list.length} (pageErrors=${pageErrors.length}) ===`);
  for (const r of R.list) {
    if (!r.pass) console.log(`  FAIL ${r.id}: ${r.name} -> ${r.detail}`);
  }
  if (R.failed || pageErrors.length) {
    throw new Error(`Engine tests failed: ${R.failed} failed, ${pageErrors.length} pageErrors (${pageErrors.join(' | ')})`);
  }
  return R;
}

async function runFairness(cdp, port, pageErrors) {
  const total = { runs: 0, damage: 0, violations: 0, visualOnly: 0, damagingShots: 0, minVisT: 9, minPx: 999, examples: [], pageErrors: 0 };
  for (const seed of [7, 3, 11]) {
    pageErrors.length = 0;
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/games/hospital-escape/index.html?seed=${seed}` });
    await waitForExpr(cdp, "Boolean(window.__game && window.__dbg && window.__painted !== undefined && (!window.HECAST || window.__castReady))", 120000);
    await cdp.send('Runtime.evaluate', { expression: '__game.pause(true)' });

    const auditFn = `(label, i0) => {
      const ev = __dbg.events().slice(i0 || 0), F = __game.game.data.tuning.fairness;
      const out = { label, damage: 0, violations: 0, visualOnly: 0, damagingShots: 0, minVisT: 9, minPx: 999, bad: [] };
      ev.forEach((e, i) => {
        if (e.type === 'enemyShot') { if (e.data.red) out.damagingShots++; else out.visualOnly++; }
        if (e.type !== 'heroHit' || !e.data.src || e.data.src === 'dbg') return;
        out.damage++;
        let shot = null;
        for (let j = i; j >= 0; j--) {
          const x = ev[j];
          if (x.type === 'enemyShot' && x.data.role === e.data.src && x.data.red && Math.abs(x.data.eta - e.t) < 0.05) { shot = x; break; }
        }
        const v = shot && shot.data.vis;
        const ok = !!(v && v.inZone && !v.occl && v.px >= F.minPx && v.visT >= F.telegraph);
        if (v) { out.minVisT = Math.min(out.minVisT, v.visT); out.minPx = Math.min(out.minPx, v.px); }
        if (!ok) { out.violations++; out.bad.push({ t: e.t, src: e.data.src, vis: v }); }
      });
      return out;
    }`;

    const fullRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => { const G = __game, g = G.game; G.start('visit'); const t0 = __dbg.events().length; let n = 0; while(!g.state().ended && !g.state().lost && n < 60 * 900){ HE.autopilot(g); g.step(1/60); n++; } return (${auditFn})('seed ${seed} full autopilot run (won ' + g.state().won + ')', t0); })()`,
      returnByValue: true
    });
    const full = fullRes.result.value;
    const seedLines = [full];

    for (const [beat, segI] of SOAK) {
      const rRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => { const G = __game, g = G.game; G.start('${beat}'); if(${segI}) __dbg.gotoSegment('${beat}', ${segI}); const t0 = __dbg.events().length; let n = 0; while(n < 60 * 45 && !g.state().lost){ g.input.fire = false; g.step(1/60); n++; } const o = (${auditFn})('seed ${seed} soak ${beat}#${segI}', t0); o.lostAt = g.state().lost ? +(n/60).toFixed(1) : null; return o; })()`,
        returnByValue: true
      });
      seedLines.push(rRes.result.value);
    }

    if (seed === 7) {
      const ctlRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => { const G = __game, g = G.game, T = g.data.tuning, keep = T.fairness, sf = T.screenFire; G.start('gauntlet'); __dbg.gotoSegment('gauntlet', 1); T.fairness = null; T.screenFire = null; const t0 = __dbg.events().length; let n = 0; while(n < 60 * 45 && !g.state().lost){ g.input.fire = false; g.step(1/60); n++; } T.fairness = keep; T.screenFire = sf; const o = (${auditFn})('CONTROL (contract OFF) soak gauntlet#1', t0); return o; })()`,
        returnByValue: true
      });
      const ctl = ctlRes.result.value;
      console.log(`${ctl.label.padEnd(42)} damage=${ctl.damage} violations=${ctl.violations}`);
    }

    seedLines.forEach(l => {
      total.runs++;
      total.damage += l.damage;
      total.violations += l.violations;
      total.visualOnly += l.visualOnly;
      total.damagingShots += l.damagingShots;
      total.minVisT = Math.min(total.minVisT, l.minVisT);
      total.minPx = Math.min(total.minPx, l.minPx);
      if (l.bad && l.bad.length) total.examples.push(...l.bad.slice(0, 2));
      console.log(`${l.label.padEnd(42)} dmg=${String(l.damage).padStart(3)} viol=${l.violations} red=${l.damagingShots} minT=${l.minVisT===9?'-':l.minVisT+'s'} minPx=${l.minPx===999?'-':l.minPx+'px'}`);
    });
    total.pageErrors += pageErrors.length;
  }
  console.log('=== FAIRNESS TOTAL:', JSON.stringify(total), '===');
  if (total.violations > 0 || total.pageErrors > 0) {
    throw new Error(`Fairness audit failed: violations=${total.violations} pageErrors=${total.pageErrors}`);
  }
  console.log('FAIRNESS AUDIT: PASS');
  return total;
}

async function runCameraAudit(cdp, port, pageErrors, seed = 7) {
  const PAGE_FN_STR = `((opts) => { const g=__game.game, cam=g.camera, rc=new THREE.Raycaster(), V=THREE.Vector3; const world=[]; g.scene.children.forEach(c=>{ if(c.type==='Group' && c.children.length>8) world.push(c); });
    world.forEach(w=>w.traverse(o=>{ if(o.isMesh&&o.material&&!Array.isArray(o.material)) o.material.side=THREE.DoubleSide; }));
    const amb = window.__heProps && __heProps.amb; if(amb) amb.traverse(o=>{ if(o.isMesh&&o.material) o.material.side=THREE.DoubleSide; });
    const solid = h => h.object.visible!==false && !(h.object.material && (h.object.material.transparent || h.object.material.opacity<0.9));
    const OUTDOOR = /steal|chase|finale|train|exit_push/; const res={ samples:0, A:[], B:[], C:[], D:[], F:[], run:{ B:0, C:0, D:0, F:0 } };
    const ndc=new THREE.Vector2(), grid=[]; for(let i=0;i<7;i++) for(let j=0;j<13;j++) grid.push([(i+0.5)/7*2-1, (j+0.5)/13*2-1]);
    function sample(t, tag){ const st=g.state(), m=st.mode, seg=st.segment||''; if(!m) { res.run.B=res.run.C=res.run.D=0; return; } res.samples++; const cut = m==='CUTSCENE';
      let pv=null; if(cut){ } else if(m==='FREE_FOOT'&&g.foot){ pv=g.foot.pos.clone(); pv.y+=g.foot.path.height; } else if(g.rail.path && m!=='AMBULANCE'){ pv=g.rail.path.pointAtS(g.rail.s); pv.y+=g.rail.path.height; }
      if(pv){ const d=cam.position.clone().sub(pv), L=d.length(); if(L>0.06){ rc.set(pv,d.normalize()); rc.near=0; rc.far=L; const h=rc.intersectObjects(world,true).filter(solid)[0]; if(h && h.distance < L-0.02 && res.A.length<40) res.A.push({ t:+t.toFixed(1), tag, seg, depth:+(L-h.distance).toFixed(2) }); } }
      let near=0, voids=0, ambN=0; cam.updateMatrixWorld(true);
      for(const p of grid){ ndc.set(p[0],p[1]); rc.setFromCamera(ndc,cam); rc.near=0.05; rc.far=120; const h=rc.intersectObjects(world,true).filter(solid)[0]; if(!h) voids++; else if(h.distance<0.8) near++;
        if(m==='AMBULANCE' && amb){ rc.far=2.5; const ha=rc.intersectObject(amb,true).filter(solid)[0]; if(ha) ambN++; } }
      const n=grid.length, dt=0.1;
      res.run.B = near/n>0.5 ? res.run.B+dt : 0; if(res.run.B>0.6 && res.B.length<40 && (!res.B.length || res.B[res.B.length-1].t < t-1)) res.B.push({ t:+t.toFixed(1), tag, seg, frac:+(near/n).toFixed(2) });
      const indoor=!OUTDOOR.test(seg); res.run.C = indoor && voids/n>0.02 ? res.run.C+dt : 0; if(res.run.C>0.3 && res.C.length<40 && (!res.C.length || res.C[res.C.length-1].t < t-1)) res.C.push({ t:+t.toFixed(1), tag, seg, frac:+(voids/n).toFixed(2) });
      res.run.D = m==='AMBULANCE' && ambN/n>0.6 ? res.run.D+dt : 0; if(res.run.D>0.6 && res.D.length<40 && (!res.D.length || res.D[res.D.length-1].t < t-1)) res.D.push({ t:+t.toFixed(1), tag, seg, frac:+(ambN/n).toFixed(2) });
      const live=g.combat.live(); if(live.length){ const on=live.some(e=>{ const v=e.pos.clone(); v.y+=1.2; v.project(cam); return v.z<1 && Math.abs(v.x)<1 && Math.abs(v.y)<1; }); res.run.F = on ? 0 : res.run.F+dt; if(res.run.F>4 && res.F.length<20 && (!res.F.length || res.F[res.F.length-1].t < t-4)) res.F.push({ t:+t.toFixed(1), tag, seg }); } else res.run.F=0; }
    return { sample, res };
  })`;

  const openGame = async (q = '') => {
    pageErrors.length = 0;
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/games/hospital-escape/index.html?seed=${seed}${q}` });
    await waitForExpr(cdp, "Boolean(window.__game && window.__painted !== undefined && (!window.HECAST || (window.__castReady && HECAST.warmed)))", 120000);
    await cdp.send('Runtime.evaluate', { expression: `window.__AUD = (${PAGE_FN_STR})({})` });
  };

  // 1) Full autopilot playthrough (A, B, C, D, F + ended)
  await openGame('');
  await cdp.send('Runtime.evaluate', { expression: "__game.start('visit'); __game.pause(true);" });
  for (let t = 0; t < 420; t += 1) {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(() => { for(let k=0;k<10;k++){ __game.ff(0.1,true); __AUD.sample(${t}+k*0.1,'autopilot'); } const g=__game.game; return g.ended || g.lost; })()`,
      returnByValue: true
    });
    if (r.result && r.result.value) break;
  }
  const autoRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => { const g=__game.game; return Object.assign({ ended: !!g.ended, lost: !!g.lost, time: +g.time.toFixed(1), stats: window.HECAST ? HECAST.stats : null, rooms: window.HECAST ? HECAST.roomStats : null }, __AUD.res); })()`,
    returnByValue: true
  });
  const auto = autoRes.result.value;
  const errAuto = pageErrors.length;

  // E) Boundary audit re-run on repaired world
  await openGame('');
  await cdp.send('Runtime.evaluate', { expression: "__game.start('visit'); __game.pause(true); __game.ff(3,false);" });
  const enclRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => { __game.game.scene.updateMatrixWorld(true); const zones=HE.DATA.env.zones, root=__game.game.scene.children.filter(c=>c.type==='Group'&&c.children.length>8), rc=new THREE.Raycaster(), V=THREE.Vector3; const left=[];
      root.forEach(w=>w.traverse(o=>{ if(o.isMesh&&o.material&&!Array.isArray(o.material)) o.material.side=THREE.DoubleSide; }));
      const pathIds=(HE.DATA.paths||[]).map(p=>p.id);
      zones.forEach((z,zi)=>{ if(/street|outdoor/.test(z.kind)) return; let R=null; if(z.min&&z.max) R={x0:z.min[0],x1:z.max[0],z0:z.min[2],z1:z.max[2],y:z.y!=null?z.y:z.min[1]}; else if(z.a&&z.b&&z.w){ const ax=Math.abs(z.a[0]-z.b[0])<1e-3; R= ax ? {x0:z.a[0]-z.w/2,x1:z.a[0]+z.w/2,z0:Math.min(z.a[1],z.b[1]),z1:Math.max(z.a[1],z.b[1]),y:z.y||0} : {x0:Math.min(z.a[0],z.b[0]),x1:Math.max(z.a[0],z.b[0]),z0:z.a[1]-z.w/2,z1:z.a[1]+z.w/2,y:z.y||0}; } if(!R) return;
        [['x0',-1,0],['x1',1,0],['z0',0,-1],['z1',0,1]].forEach(sd=>{ const alongX=sd[2]!==0, a0=alongX?R.x0:R.z0, a1=alongX?R.x1:R.z1, fixed=R[sd[0]], dir=new V(sd[1],0,sd[2]);
          for(let s=a0+0.25;s<=a1-0.25+1e-6;s+=0.5){ let hole=true; [0.9,1.7].forEach(hy=>{ const p=alongX?new V(s,R.y+hy,fixed-sd[2]*0.15):new V(fixed-sd[1]*0.15,R.y+hy,s); rc.set(p,dir); rc.far=120; const h=rc.intersectObjects(root,true).filter(x=>x.object.visible!==false&&x.distance>0.02); if(h.length) hole=false; });
            const px=alongX?s:fixed, pz=alongX?fixed:s; if(hole && HEWORLD.pathDist(HE.DATA,pathIds,px,pz)>=1.0) left.push({ zone:(z.name||z.kind)+'#'+zi, at:[+px.toFixed(1),+pz.toFixed(1)] }); } }); });
      return left; })()`,
    returnByValue: true
  });
  const encl = enclRes.result.value;
  const errEncl = pageErrors.length;

  // 2) Scripted on-foot pass in ward
  await openGame('');
  await cdp.send('Runtime.evaluate', { expression: "__game.start('gauntlet'); __game.game.gotoSegment('gauntlet',2); __game.pause(true);" });
  const footRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => { const g=__game.game, I=g.input; for(let t=0;t<30;t+=0.1){ const ph=Math.floor(t/1.5)%4; I.move.x = ph===1 ? -1 : ph===3 ? 1 : 0; I.move.y = ph===0 || ph===2 ? 1 : -0.5; I.aim.x = ph===2 ? 0.04 : ph===3 ? 0.96 : 0.5; I.aim.y=0.45;
      __game.ff(0.1,false); if(g.state().mode!=='FREE_FOOT') break; __AUD.sample(t,'on-foot'); } return __AUD.res; })()`,
    returnByValue: true
  });
  const foot = footRes.result.value;
  const errFoot = pageErrors.length;

  const R = { A: [...auto.A, ...foot.A], B: [...auto.B, ...foot.B], C: [...auto.C, ...foot.C], D: [...auto.D, ...foot.D], F: [...auto.F, ...foot.F] };
  const totalErrs = errAuto + errEncl + errFoot;
  const fails = {
    'A lens in geometry': R.A.length,
    'B wall fill > 0.6 s': R.B.length,
    'C void visible indoors > 0.3 s': R.C.length,
    'D ambulance body fills frame > 0.6 s': R.D.length,
    'E enclosure holes left': encl.length,
    'page errors': totalErrs
  };
  const summary = {
    seed,
    playthrough: { ended: auto.ended, lost: auto.lost, time: auto.time, samples: auto.samples },
    onFootSamples: foot.samples,
    fails,
    warn: { 'F cast off screen > 4 s': R.F.length },
    examples: { A: R.A.slice(0, 6), B: R.B.slice(0, 6), C: R.C.slice(0, 6), D: R.D.slice(0, 6), E: encl.slice(0, 6), F: R.F.slice(0, 6) },
    castRooms: auto.rooms
  };
  console.log('\n=== CAMERA AUDIT & FULLRUN ===');
  console.log(JSON.stringify(summary, null, 2));
  const bad = Object.values(fails).some(v => v > 0) || !auto.ended;
  console.log(bad ? 'CAMERA AUDIT: FAIL' : 'CAMERA AUDIT: PASS');
  if (bad) throw new Error(`Camera audit / fullrun failed: ${JSON.stringify(fails)} ended=${auto.ended}`);
  return summary;
}

async function main() {
  const onlyCam = process.argv.includes('--camera-only');
  const skipFair = process.argv.includes('--no-fairness');
  const { srv, port } = await startServer();
  const cdpPort = 19850 + Math.floor(Math.random() * 140);
  const { proc, page, userDir } = await launchChrome(cdpPort);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.ready;

  const pageErrors = [];
  cdp.ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push(JSON.stringify(m.params.exceptionDetails));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') pageErrors.push('console: ' + m.params.args.map(a => a.value || a.description).join(' '));
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  try {
    if (!onlyCam) {
      await runTests(cdp, port, pageErrors);
      if (!skipFair) await runFairness(cdp, port, pageErrors);
    }
    await runCameraAudit(cdp, port, pageErrors, 7);
  } finally {
    cdp.close();
    try { proc.kill('SIGKILL'); } catch (_) {}
    try { srv.close(); } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch(err => { console.error(err); process.exit(1); });
