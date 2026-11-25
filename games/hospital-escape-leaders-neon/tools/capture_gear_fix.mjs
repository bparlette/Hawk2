import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const PAGE_PATH = '/games/hospital-escape-leaders-neon/cast-pass.html';
const SHOTS_DIR = path.join(WORKSPACE, 'games/hospital-escape/tasking/responses/neon-gear-fix-shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

fs.mkdirSync(SHOTS_DIR, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const phase = args.phase === 'before' ? 'before' : 'after';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css',
  '.json': 'application/json',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.glb':  'model/gltf-binary',
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
  const userDir = `/tmp/neon_gear_fix_chrome_${cdpPort}`;
  fs.rmSync(userDir, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling',
    '--ignore-gpu-blocklist', '--enable-webgl', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${userDir}`, 'about:blank'
  ], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = (await r.json()).find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return { proc, page, userDir };
    } catch (_) {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error('Chrome CDP timeout');
}

async function waitForReady(cdp) {
  for (let i = 0; i < 150; i++) {
    const out = await cdp.send('Runtime.evaluate', { expression: 'Boolean(window.__castPassReady)', returnByValue: true });
    if (out.result && out.result.value === true) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Cast pass failed to load within 15s');
}

const SHOTS = [
  // Dying headshot proving extremes (full body + head/vest tracking)
  { slug: 'gunman-dying-headshot-3q',         mode: 'gunman',   clip: 'Dying_Headshot_Knees', cam: '3q',       t: 1.35 },
  { slug: 'gunman-dying-headshot-extreme-3q', mode: 'gunman',   clip: 'Dying_Headshot_Knees', cam: '3q',       t: 2.15 },
  { slug: 'n2-dying-headshot-3q',             mode: 'n2',       clip: 'Dying_Headshot_Knees', cam: '3q',       t: 1.35 },
  { slug: 'n2-dying-headshot-extreme-3q',     mode: 'n2',       clip: 'Dying_Headshot_Knees', cam: '3q',       t: 2.15 },
  // Full-body combat, walk, and other cast members
  { slug: 'gunman-idle-alert-3q',             mode: 'gunman',   clip: 'Pistol_Idle_Alert',    cam: '3q',       t: 0.50 },
  { slug: 'gunman-cover-to-shoot-3q',         mode: 'gunman',   clip: 'Cover_To_Shooting',    cam: '3q',       t: 1.38 },
  { slug: 'gunman-walk-side',                 mode: 'gunman',   clip: 'Pistol_Walk',          cam: 'side',     t: 0.35 },
  { slug: 'n2-idle-alert-3q',                 mode: 'n2',       clip: 'Pistol_Idle_Alert',    cam: '3q',       t: 0.50 },
  { slug: 'n2-cover-to-shoot-3q',             mode: 'n2',       clip: 'Cover_To_Shooting',    cam: '3q',       t: 1.38 },
  { slug: 'n2-walk-side',                     mode: 'n2',       clip: 'Pistol_Walk',          cam: 'side',     t: 0.35 },
  { slug: 'maya-bed-push-3q',                 mode: 'maya_bed', clip: 'Bed_Push_Loop',        cam: '3q',       t: 0.90 },
  { slug: 'maya-walk-side',                   mode: 'maya_bed', clip: 'Walk_Fem',             cam: 'side',     t: 0.35 },
  { slug: 'cole-disbelief-forward-3q',        mode: 'cole',     clip: 'Sit_Disbelief_Forward',cam: '3q',       t: 2.20 },
  { slug: 'cole-sit-aim-3q',                  mode: 'cole',     clip: 'Sit_Aim_Fire',         cam: '3q',       t: 0.30 },
  // 2x two-hold grip proof stills
  { slug: 'gunman-idle-alert-grip2x',         mode: 'gunman',   clip: 'Pistol_Idle_Alert',    cam: 'grip2x',   t: 0.50 },
  { slug: 'gunman-idle-alert-grip2x-l',       mode: 'gunman',   clip: 'Pistol_Idle_Alert',    cam: 'grip2x_l', t: 0.50 },
  { slug: 'gunman-cover-to-shoot-grip2x',     mode: 'gunman',   clip: 'Cover_To_Shooting',    cam: 'grip2x',   t: 1.38 },
  { slug: 'gunman-cover-to-shoot-grip2x-l',   mode: 'gunman',   clip: 'Cover_To_Shooting',    cam: 'grip2x_l', t: 1.38 },
  { slug: 'gunman-walk-fire-grip2x',          mode: 'gunman',   clip: 'Pistol_Walk_Fire',     cam: 'grip2x',   t: 0.35 },
  { slug: 'n2-idle-alert-grip2x',             mode: 'n2',       clip: 'Pistol_Idle_Alert',    cam: 'grip2x',   t: 0.50 },
  { slug: 'n2-idle-alert-grip2x-l',           mode: 'n2',       clip: 'Pistol_Idle_Alert',    cam: 'grip2x_l', t: 0.50 },
  { slug: 'n2-cover-to-shoot-grip2x',         mode: 'n2',       clip: 'Cover_To_Shooting',    cam: 'grip2x',   t: 1.38 },
  { slug: 'n2-cover-to-shoot-grip2x-l',       mode: 'n2',       clip: 'Cover_To_Shooting',    cam: 'grip2x_l', t: 1.38 },
  { slug: 'n2-walk-fire-grip2x',              mode: 'n2',       clip: 'Pistol_Walk_Fire',     cam: 'grip2x',   t: 0.35 },
];

async function main() {
  const { srv, port } = await startServer();
  const cdpPort = 19700 + Math.floor(Math.random() * 250);
  const { proc, page, userDir } = await launchChrome(cdpPort);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.ready;

  const consoleErrors = [];
  cdp.ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(m.params.exceptionDetails));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map(a => a.value || a.description).join(' '));
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  try {
    const url = `http://127.0.0.1:${port}${PAGE_PATH}?clean=1&t=0`;
    await cdp.send('Page.navigate', { url });
    await waitForReady(cdp);

    const stats = [];
    for (const sh of SHOTS) {
      const stObj = { mode: sh.mode, clip: sh.clip, cam: sh.cam, t: sh.t };
      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__castPassRig.setState(${JSON.stringify(stObj)}))`,
        returnByValue: true
      });
      await cdp.send('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => r()))', awaitPromise: true });
      const st = JSON.parse(evalRes.result.value);
      stats.push(Object.assign({ slug: sh.slug, phase }, st));
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(SHOTS_DIR, `${phase}-${sh.slug}.png`);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`[${phase}] ${sh.slug.padEnd(34)} | calls=${st.calls} tris=${st.triangles} errs=${st.consoleErrors.length}`);
    }
    fs.writeFileSync(path.join(SHOTS_DIR, `${phase}-stats.json`), JSON.stringify({ phase, shots: stats, consoleErrors }, null, 2));
    console.log(`[${phase}] DONE: ${stats.length} stills saved, consoleErrors=${consoleErrors.length}`);
    if (consoleErrors.length) throw new Error(`Console errors detected: ${consoleErrors.join('; ')}`);
  } finally {
    cdp.close();
    try { proc.kill('SIGKILL'); } catch (_) {}
    try { srv.close(); } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (_) {}
  }
}

main().catch(err => { console.error(err); process.exit(1); });
