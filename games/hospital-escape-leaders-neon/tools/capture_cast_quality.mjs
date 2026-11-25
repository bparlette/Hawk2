import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const PAGE_PATH = '/games/hospital-escape-leaders-neon/cast-quality.html';
const SHOTS_DIR = path.join(WORKSPACE, 'games/hospital-escape/tasking/responses/neon-cast-quality-shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

fs.mkdirSync(SHOTS_DIR, { recursive: true });

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
  const userDir = `/tmp/neon_cast_quality_chrome_${cdpPort}`;
  fs.rmSync(userDir, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-timer-throttling',
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

async function waitForReady(cdp) {
  for (let i = 0; i < 200; i++) {
    const out = await cdp.send('Runtime.evaluate', { expression: 'Boolean(window.__castQualityReady)', returnByValue: true });
    if (out.result && out.result.value === true) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Cast quality showcase failed to load within 20s');
}

const SHOTS = [
  { file: 'hale-opening-room-390x844.png',    mode: 'room412',        clip: 'Hale_Objecting',  cam: 'hero',         t: 0.70 },
  { file: 'patient-on-bed-390x844.png',       mode: 'ward_beds',      clip: 'Lay_Breathless',  cam: 'patient_side', t: 0.35 },
  { file: 'cole-bed-legs-closeup-390x844.png',mode: 'ward_beds',      clip: 'Lay_Breathless',  cam: 'cole_legs',    t: 0.35 },
  { file: 'cole-wheelchair-legs-390x844.png', mode: 'cole_chair',     clip: 'Sit_Idle_Breath', cam: 'legs',         t: 0.80 },
  { file: 'nurse-station-390x844.png',        mode: 'nurse_station',  clip: 'Staff_Typing',    cam: 'hero',         t: 1.10 },
  { file: 'staff-corridor-390x844.png',       mode: 'corridor',       clip: 'Hale_Walk',       cam: 'hero',         t: 0.40 },
  { file: 'cast-quality-lineup-390x844.png',  mode: 'lineup',         clip: '',                cam: 'hero',         t: 0.50 },
  { file: 'hale-closeup-390x844.png',         mode: 'hale_detail',    clip: 'Hale_Objecting',  cam: 'hero',         t: 0.75 },
  { file: 'hale-hands-up-390x844.png',        mode: 'hale_detail',    clip: 'Hale_Hands_Up',   cam: 'hero',         t: 0.65 },
  { file: 'nurse-f-closeup-390x844.png',      mode: 'nurse_f_detail', clip: 'Staff_Idle',      cam: 'hero',         t: 0.45 },
  { file: 'nurse-f-back-390x844.png',         mode: 'nurse_f_detail', clip: 'Staff_Idle',      cam: 'back',         t: 0.45 },
  { file: 'nurse-m-closeup-390x844.png',      mode: 'nurse_m_detail', clip: 'Staff_Idle',      cam: 'hero',         t: 0.45 },
];

async function main() {
  const { srv, port } = await startServer();
  const cdpPort = 19800 + Math.floor(Math.random() * 180);
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
        expression: `JSON.stringify(window.__castQualityRig.setState(${JSON.stringify(stObj)}))`,
        returnByValue: true
      });
      await cdp.send('Runtime.evaluate', { expression: 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))', awaitPromise: true });
      const st = JSON.parse(evalRes.result.value);
      stats.push(Object.assign({ file: sh.file }, st));
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(SHOTS_DIR, sh.file);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`[cast-quality] ${sh.file.padEnd(36)} | calls=${st.calls} tris=${st.triangles} errs=${st.consoleErrors.length}`);
    }
    fs.writeFileSync(path.join(SHOTS_DIR, 'cast-quality-stats.json'), JSON.stringify({ shots: stats, consoleErrors }, null, 2));
    console.log(`[cast-quality] DONE: ${stats.length} stills saved, consoleErrors=${consoleErrors.length}`);
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
