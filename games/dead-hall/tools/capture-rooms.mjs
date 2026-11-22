#!/usr/bin/env node
// Dead Hall — Headless 390x844 Per-Room Capture & Draw-Call Benchmark
// Drives games/dead-hall/index.html via window.__renderAt / __dbg (zero changes to combat/walk/camera).
// Usage: node games/dead-hall/tools/capture-rooms.mjs --tag before --out /tmp/dead-hall-rooms
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const argVal = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const TAG = argVal('--tag', 'run');
const OUT_DIR = path.resolve(argVal('--out', '/tmp/dead-hall-rooms'));
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function findChrome() {
  for (const p of [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean)) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome/Chromium binary found');
}

async function waitForPort(port, timeoutMs = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (r.ok) {
        const list = await r.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Timed out waiting for Chrome CDP');
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  }
  async shot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(data, 'base64'));
  }
}

// Target room capture predicates along the auto-play walk (matching all 12 rooms in order encountered)
const ROOM_TARGETS = [
  { room: 2,  id: '02-doorway-woman', pred: 'd.d >= 15.5', note: 'R1 doorway woman' },
  { room: 3,  id: '03-exit-charge',   pred: 'd.d >= 31.0', note: 'A-end EXIT silhouette' },
  { room: 4,  id: '04-nightvision',   pred: 'd.state === "nv"', note: 'R2 night-vision crawler' },
  { room: 1,  id: '01-twins',         pred: 'd.d >= 49.5', note: 'Corridor B twins' },
  { room: 5,  id: '05-corner',        pred: 'd.state === "corner"', note: 'R3 corner figure' },
  { room: 11, id: '11-mannequin',     pred: 'd.d >= 64.5 && d.state === "walk"', note: 'R5 spring-necked mannequin' },
  { room: 6,  id: '06-hatch',         pred: 'd.d >= 74.0', note: 'Corridor B floor hatch' },
  { room: 8,  id: '08-doorway-eyes',  pred: 'd.state === "doorlight"', note: 'Cellar doorway / decoy' },
  { room: 9,  id: '09-tall',          pred: 'd.state === "tall"', note: 'R4 ceiling-scraping tall figure' },
  { room: 12, id: '12-yellow',        pred: 'd.d >= 100.5', note: 'Corridor C empty yellow room' },
  { room: 7,  id: '07-mascot',        pred: 'd.d >= 111.0', note: 'Corridor D broken mascot' },
  { room: 10, id: '10-eye-chase',     pred: 'd.state === "chase"', note: 'Corridor D eye-wall chase' },
];

async function main() {
  const srv = await startServer();
  const port = srv.address().port;
  const cdpPort = 9322 + Math.floor(Math.random() * 400);
  const chrome = spawn(findChrome(), [
    '--headless=new', `--remote-debugging-port=${cdpPort}`, '--window-size=390,844',
    '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--enable-webgl', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await waitForPort(cdpPort);
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });

    for (let i = 0; i < 60; i++) {
      if (await cdp.eval('Boolean(window.__renderAt && window.__dbg)')) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 350));
    await cdp.shot(`${TAG}-00-load-screen.png`);
    await cdp.eval('window.__setAuto(true); window.__renderAt(0.1);');

    const captured = new Map();
    let t = 0.5;
    while (t <= 220 && captured.size < ROOM_TARGETS.length) {
      const d = await cdp.eval(`window.__renderAt(${t.toFixed(2)}); window.__dbg();`);
      for (const target of ROOM_TARGETS) {
        if (captured.has(target.id)) continue;
        const hit = await cdp.eval(`((d) => (${target.pred}))(${JSON.stringify(d)})`);
        if (hit) {
          // Advance 0.35s into dramatic states so the composition settles
          const settleT = ['nv', 'corner', 'doorlight', 'tall', 'chase'].includes(d.state) ? t + 0.6 : t;
          const d2 = settleT !== t
            ? await cdp.eval(`window.__renderAt(${settleT.toFixed(2)}); window.__dbg();`)
            : d;
          await cdp.shot(`${TAG}-${target.id}.png`);
          captured.set(target.id, {
            room: target.room,
            id: target.id,
            note: target.note,
            t: d2.t,
            d: d2.d,
            state: d2.state,
            calls: d2.calls,
            tris: d2.tris,
            pos: d2.pos,
          });
          t = settleT;
        }
      }
      if (d.state === 'win') break;
      t += 0.5;
    }

    const errors = cdp.events.filter((e) =>
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error')
    );

    const rows = [...captured.values()].sort((a, b) => a.room - b.room);
    const out = { tag: TAG, viewport: '390x844', errors: errors.length, captured: rows.length, rows };
    fs.writeFileSync(path.join(OUT_DIR, `report-${TAG}.json`), JSON.stringify(out, null, 2));

    console.log(`\n=== DEAD HALL ROOM BENCHMARK [${TAG.toUpperCase()}] (390x844) ===`);
    console.log(`Errors: ${errors.length} | Rooms captured: ${rows.length}/12`);
    console.log('| Room | ID | t(s) | d(m) | State | Draw Calls | Tris |');
    console.log('|---|---|---|---|---|---|---|');
    for (const r of rows) {
      console.log(`| R${r.room} | ${r.id} | ${r.t} | ${r.d} | ${r.state} | ${r.calls} | ${r.tris} |`);
    }
    ws.close();
    if (errors.length > 0) process.exitCode = 1;
  } finally {
    chrome.kill('SIGTERM');
    srv.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
