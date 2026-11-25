import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const OUT_DIR = path.join(WORKSPACE, 'games/hospital-escape/tasking/responses/neon-t4-perf-shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

fs.mkdirSync(OUT_DIR, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const PHASE = args.phase === 'after' ? 'after' : 'before';
const MODE = args.mode || 'all'; // perf | stills | all
const QUERY_EXTRA = args.qx || '';

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
  const userDir = `/tmp/neon_t4_perf_chrome_${cdpPort}`;
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

const PERF_BEATS = [
  'visit@2',
  'bed_push@4',
  'transfer:1@3',
  'elevator:0@2',
  'gauntlet@3',
  'gauntlet:1@4',
  'gauntlet:3@3',
  'entrance@2',
  'chase@4',
  'train_finale@3',
];

// Matched viewpoints from t4-sbs.cjs + all interior/exterior game beats + damaged patient-eyes check
const STILLS_VIEWS = [
  { name: 'vp1',         beat: 'visit',       pos: [12.0, 1.55, -16.8],  look: [12.0, 1.38, -28.0],  fov: 60 },
  { name: 'vp2',         beat: 'visit',       pos: [12.0, 1.55, -21.5],  look: [11.65, 1.32, -28.5], fov: 60 },
  { name: 'vp3',         beat: 'visit',       pos: [12.0, 1.55, -42.0],  look: [12.0, 1.38, -28.0],  fov: 60 },
  { name: 'visit',       beat: 'visit',       ff: 2.0 },
  { name: 'bed_push',    beat: 'bed_push',    ff: 4.0 },
  { name: 'transfer',    beat: 'transfer:1',  ff: 3.0 },
  { name: 'elevator',    beat: 'elevator:0',  ff: 2.0 },
  { name: 'halls',       beat: 'gauntlet:0',  ff: 3.0 },
  { name: 'cafeteria',   beat: 'gauntlet:1',  ff: 4.0 },
  { name: 'ward',        beat: 'gauntlet:2',  ff: 2.0 },
  { name: 'waiting',     beat: 'gauntlet:3',  ff: 3.0 },
  { name: 'lobby',       beat: 'entrance:0',  ff: 2.0 },
  { name: 'chase',       beat: 'chase:0',     ff: 4.0 },
  { name: 'train',       beat: 'train_finale:0', ff: 3.0 },
  { name: 'damaged',     beat: 'gauntlet:0',  ff: 3.0, hurt: 0.75, drift: 0.50 },
];

async function measurePerf(cdp, port, qx, pageErrors, label) {
  const results = [];
  for (const spec of PERF_BEATS) {
    pageErrors.length = 0;
    const [beat, secsStr] = spec.split('@');
    const secs = +secsStr || 2;
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/games/hospital-escape/index.html?seed=7${qx}` });
    await waitForExpr(cdp, "Boolean(window.__game && window.__painted !== undefined && (!window.HECAST || (window.__castReady && HECAST.warmed)))", 120000);
    // Allow optional T4 props/textures to finish loading identically before timing
    await new Promise(r => setTimeout(r, 800));
    await cdp.send('Runtime.evaluate', {
      expression: `(() => { const [bt, sg] = ${JSON.stringify(beat)}.split(':'); __game.start(bt); if (sg) __game.game.gotoSegment(bt, +sg); __game.pause(true); __game.ff(${secs}, true); })()`
    });
    const res = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const R = __renderer, gl = R.getContext(), px = new Uint8Array(4), ts = [];
        R.info.autoReset = false;
        for (let i = 0; i < 45; i++) {
          __game.ff(1/60, true);
          R.info.reset();
          const t0 = performance.now();
          if (__post && __post.enabled) __post.render(i); else R.render(__game.game.scene, __game.game.camera);
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          const dt = performance.now() - t0;
          if (i >= 5) ts.push(dt);
        }
        ts.sort((a, b) => a - b);
        return {
          beat: ${JSON.stringify(spec)},
          seg: __game.game.state().segment,
          meanMs: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(1),
          p90Ms: +ts[Math.floor(ts.length * 0.9)].toFixed(1),
          calls: R.info.render.calls,
          tris: R.info.render.triangles,
          programs: R.info.programs.length
        };
      })()`,
      returnByValue: true
    });
    const row = Object.assign({ errs: pageErrors.length }, res.result.value);
    results.push(row);
    console.log(`[${label}] ${row.beat.padEnd(16)} (${String(row.seg).padEnd(23)}) | mean=${String(row.meanMs).padStart(6)} ms p90=${String(row.p90Ms).padStart(6)} ms | calls=${String(row.calls).padStart(3)} tris=${String(row.tris).padStart(6)} progs=${row.programs} errs=${row.errs}`);
  }
  return results;
}

async function captureStills(cdp, port, phase, qx, pageErrors) {
  pageErrors.length = 0;
  // Deterministic PRNG for still comparisons so art.js speckles & spark/smoke bursts match 1:1 between BEFORE and AFTER
  const rngScript = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: '(() => { let s = 1337; window.__resetPerfRng = v => { s = v | 0; }; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();'
  });
  try {
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/games/hospital-escape/index.html?seed=7${qx}` });
    await waitForExpr(cdp, "Boolean(window.__game && window.__painted !== undefined && (!window.HECAST || (window.__castReady && HECAST.warmed)))", 120000);
    // Ensure async background patients/rooms + kitbash props finish loading before deterministic still captures
    await waitForExpr(cdp, "Boolean((!window.HECAST || window.HECAST.roomsBuilt) && (!window.HET4 || !window.HET4.on || window.HET4.kitbash))", 20000).catch(() => {});
    await new Promise(r => setTimeout(r, 400));
    await cdp.send('Runtime.evaluate', {
      expression: "(() => { const g = __game.game, c = g.camera, keep = c.position.clone(); g.cameraCollide(c, keep); c.position.copy(keep); })()"
    });

    const out = [];
    for (let vi = 0; vi < STILLS_VIEWS.length; vi++) {
      const v = STILLS_VIEWS[vi];
      const infoRes = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__resetPerfRng) window.__resetPerfRng(${5000 + vi});
          const v = ${JSON.stringify(v)};
          const [bt, sg] = v.beat.split(':');
          __game.start(bt);
          if (sg) __game.game.gotoSegment(bt, +sg);
          __game.pause(true);
          if (v.ff) __game.ff(v.ff, true);
          const g = __game.game, cam = g.camera, R = __renderer;
          const keep = { pos: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov };
          if (v.pos) {
            cam.position.set(v.pos[0], v.pos[1], v.pos[2]);
            cam.fov = v.fov || 60;
            cam.updateProjectionMatrix();
            cam.lookAt(v.look[0], v.look[1], v.look[2]);
            cam.updateMatrixWorld(true);
          }
          if (window.HET4 && HET4.on) HET4.step(cam, !(g.state().beat === 'chase' || g.state().beat === 'train_finale' || (g.state().beat === 'steal' && g.state().segment !== 'steal_cut')), g.state().segment || '');
          const u = __post && __post.u;
          if (u) {
            u.lidTop.value = 0; u.lidBot.value = 0; u.dying.value = 0; u.tunnel.value = 0;
            u.hurt.value = v.hurt || 0; u.drift.value = v.drift || 0;
          }
          R.info.autoReset = false; R.info.reset();
          if (__post && __post.enabled) __post.render(1); else R.render(g.scene, cam);
          const calls = R.info.render.calls, tris = R.info.render.triangles;
          const png = R.domElement.toDataURL('image/png');
          if (v.pos) { cam.position.copy(keep.pos); cam.quaternion.copy(keep.q); cam.fov = keep.fov; cam.updateProjectionMatrix(); }
          return { calls, tris, png };
        })()`,
        returnByValue: true
      });
      const d = infoRes.result.value;
      const outPath = path.join(OUT_DIR, `${phase}-${v.name}.png`);
      fs.writeFileSync(outPath, Buffer.from(d.png.split(',')[1], 'base64'));
      out.push({ name: v.name, calls: d.calls, tris: d.tris, errs: pageErrors.length });
      console.log(`[still:${phase}] ${v.name.padEnd(14)} | calls=${String(d.calls).padStart(3)} tris=${String(d.tris).padStart(6)} errs=${pageErrors.length}`);
    }
    return out;
  } finally {
    if (rngScript && rngScript.identifier) {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: rngScript.identifier }).catch(() => {});
    }
  }
}

async function main() {
  const { srv, port } = await startServer();
  const cdpPort = 19900 + Math.floor(Math.random() * 90);
  const { proc, page, userDir } = await launchChrome(cdpPort);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.ready;

  const pageErrors = [];
  cdp.ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push(JSON.stringify(m.params.exceptionDetails));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') pageErrors.push(m.params.args.map(a => a.value || a.description).join(' '));
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  try {
    if (MODE === 'perf' || MODE === 'all') {
      const perf = await measurePerf(cdp, port, QUERY_EXTRA, pageErrors, `perf:${PHASE}`);
      fs.writeFileSync(path.join(OUT_DIR, `${PHASE}-perf.json`), JSON.stringify({ phase: PHASE, qx: QUERY_EXTRA, beats: perf }, null, 2));
      if (args.prev === '1') {
        const prev = await measurePerf(cdp, port, '&t4=0', pageErrors, 'perf:prev');
        fs.writeFileSync(path.join(OUT_DIR, `prev-perf.json`), JSON.stringify({ phase: 'prev', qx: '&t4=0', beats: prev }, null, 2));
      }
    }
    if (MODE === 'stills' || MODE === 'all') {
      const st = await captureStills(cdp, port, PHASE, QUERY_EXTRA, pageErrors);
      fs.writeFileSync(path.join(OUT_DIR, `${PHASE}-stills.json`), JSON.stringify(st, null, 2));
    }
  } finally {
    cdp.close();
    try { proc.kill('SIGKILL'); } catch (_) {}
    try { srv.close(); } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch(err => { console.error(err); process.exit(1); });
