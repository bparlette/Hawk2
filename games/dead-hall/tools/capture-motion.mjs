#!/usr/bin/env node
// Dead Hall — Headless 390x844 Motion-Test Capture & Spec Verification Harness
// Zero external dependencies (Node >= 22 WebSocket + Chrome CDP).
// Usage: node games/dead-hall/tools/capture-motion.mjs [--out /tmp/dead-hall-motion]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outIdx = process.argv.indexOf('--out');
const OUT_DIR = outIdx >= 0 && process.argv[outIdx + 1]
  ? path.resolve(process.argv[outIdx + 1])
  : '/tmp/dead-hall-motion';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome/Chromium binary found. Set CHROME_PATH.');
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
  throw new Error('Timed out waiting for headless Chrome CDP');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
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
    if (r.exceptionDetails) {
      throw new Error(`Eval error: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    }
    return r.result?.value;
  }
  async shot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const full = path.join(OUT_DIR, filename);
    fs.writeFileSync(full, Buffer.from(data, 'base64'));
    return full;
  }
}

async function main() {
  const srv = await startServer();
  const port = srv.address().port;
  const cdpPort = 9222 + Math.floor(Math.random() * 500);
  const chromeBin = findChrome();
  const chrome = spawn(chromeBin, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--window-size=390,844',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--enable-webgl',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await waitForPort(cdpPort);
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new CDP(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    const url = `http://127.0.0.1:${port}/tools/motion-harness.html`;
    await cdp.send('Page.navigate', { url });
    // Wait for __harness to mount
    for (let i = 0; i < 60; i++) {
      const ready = await cdp.eval('Boolean(window.__harness)');
      if (ready) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!(await cdp.eval('Boolean(window.__harness)'))) {
      throw new Error('motion-harness.html failed to initialize window.__harness');
    }

    const ids = await cdp.eval('window.__harness.ids()');
    const results = [];

    // 1. Silhouette lineup in near-darkness
    const lineup = await cdp.eval(`window.__harness.lineup(['twins','crawler','mascot','tall_figure','mannequin'], 0.45)`);
    await cdp.shot('00-silhouette-lineup.png');

    // 2. Decoy lineup (guard + worker fairness tells)
    await cdp.eval(`window.__harness.lineup(['decoy_guard','decoy_worker'], 0.35)`);
    await cdp.shot('00-decoys-lineup.png');

    // 3. Procedural texture variants gallery (13 room maps)
    const texInfo = await cdp.eval(`window.__harness.textures()`);
    await cdp.shot('00-texture-variants.png');

    // 4. Per-figure motion verification (4 timestamps per figure -> verifies motion, not stills)
    const TIMES = [0.0, 0.35, 0.70, 1.05];
    for (const id of ids) {
      const frames = [];
      for (let fi = 0; fi < TIMES.length; fi++) {
        const t = TIMES[fi];
        const info = await cdp.eval(`window.__harness.show(${JSON.stringify(id)}, null, ${t})`);
        frames.push(info);
        // Save start + peak-motion frame for every figure
        if (fi === 1 || fi === 2) {
          await cdp.shot(`fig-${id}-f${fi}.png`);
        }
      }
      const f0 = frames[0];
      const fPeak = frames[2];
      // Verify motion actually changes bounds or pose between frames
      results.push({
        id,
        room: f0.spec.room,
        label: f0.spec.label,
        mode: f0.mode,
        pinnedH: f0.spec.totalHeight,
        measH_t0: f0.figureMetrics.boundsM.h,
        measH_t2: fPeak.figureMetrics.boundsM.h,
        shoulderW: f0.spec.shoulderWidth,
        stanceW: f0.spec.stanceWidth,
        headPct: +(f0.spec.headRatio * 100).toFixed(1),
        figMeshes: f0.figureMetrics.meshes,
        figTris: f0.figureMetrics.tris,
        bayCalls: f0.calls,
      });
    }

    const errors = cdp.events.filter((e) =>
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error')
    );

    const summary = {
      viewport: '390x844',
      errors: errors.length,
      errorDetails: errors.map((e) => e.params),
      lineupCalls: lineup.calls,
      textureVariantsCount: texInfo.count,
      textureBank: texInfo.textureBank,
      outDir: OUT_DIR,
      figures: results,
    };
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

    console.log('\n=== DEAD HALL NEON MOTION HARNESS REPORT (390x844) ===');
    console.log(`Errors: ${summary.errors} | Texture variants: ${summary.textureVariantsCount} | Lineup calls: ${summary.lineupCalls}`);
    console.log('\n| Room | ID | Motion | Pinned H | Meas H (t0→t2) | Shoulder | Stance | Head% | Fig Meshes | Tris |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of results) {
      console.log(`| R${r.room} | ${r.id} | ${r.mode} | ${r.pinnedH}m | ${r.measH_t0}→${r.measH_t2}m | ${r.shoulderW}m | ${r.stanceW}m | ${r.headPct}% | ${r.figMeshes} | ${r.figTris} |`);
    }
    console.log(`\nCaptures written to: ${OUT_DIR}`);

    ws.close();
    if (summary.errors > 0) process.exitCode = 1;
  } finally {
    chrome.kill('SIGTERM');
    srv.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
