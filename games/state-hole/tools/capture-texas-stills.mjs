#!/usr/bin/env node
// Captures matched 390x844 (DPR 2) phone stills of Texas across:
//   before (../index.html?clean=1)
//   lookA  (../tasking/texas-sample.html?clean=1&look=A)
//   lookB  (../tasking/texas-sample.html?clean=1&look=B)
//   lookC  (../tasking/texas-sample.html?clean=1&look=C)
// Uses headless Chrome CDP + Node built-in WebSocket (no playwright/puppeteer dep).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tasking', 'responses', 'neon-texas-stills');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath.replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function launchChrome(userDir) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      `--user-data-dir=${userDir}`,
      '--remote-debugging-port=0',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=390,844',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      'about:blank'
    ];
    const proc = spawn(CHROME_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome launch timeout: ' + stderr)), 15000);
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve({ proc, browserWsUrl: m[1] });
      }
    });
    proc.on('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (${code}): ${stderr}`));
    });
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.error) p.rej(new Error(msg.error.message || JSON.stringify(msg.error)));
          else p.res(msg.result);
        }
      } else if (msg.method) {
        const arr = this.listeners.get(msg.method);
        if (arr) for (const fn of arr) fn(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error('Page eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result?.value;
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

const SEED_PRNG_SCRIPT = `(() => {
  let a = 7 >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const VARIANTS = [
  { key: 'before', label: 'BEFORE (Baseline)', urlPath: '/index.html?clean=1', isSample: false },
  { key: 'lookA', label: 'A · Palm Gouache', urlPath: '/tasking/texas-sample.html?clean=1&look=A', isSample: true },
  { key: 'lookB', label: 'B · Watercolor Atlas', urlPath: '/tasking/texas-sample.html?clean=1&look=B', isSample: true },
  { key: 'lookC', label: 'C · Impasto Sunset', urlPath: '/tasking/texas-sample.html?clean=1&look=C', isSample: true }
];

async function run() {
  const srv = await startServer();
  const port = srv.address().port;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-cdp-'));
  let chrome, cdp;
  const consoleErrors = [];
  const pageExceptions = [];

  try {
    chrome = await launchChrome(userDir);
    const listRes = await fetch(`http://127.0.0.1:${new URL(chrome.browserWsUrl).port}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED_PRNG_SCRIPT });

    cdp.on('Runtime.exceptionThrown', params => {
      pageExceptions.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'exception');
    });
    cdp.on('Runtime.consoleAPICalled', params => {
      if (params.type === 'error') {
        const text = (params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
        consoleErrors.push(text);
      }
    });

    const summary = [];

    for (const v of VARIANTS) {
      const targetUrl = `http://127.0.0.1:${port}${v.urlPath}`;
      const navTime = Date.now();
      await cdp.send('Page.navigate', { url: targetUrl });

      let ready = false;
      for (let i = 0; i < 80; i++) {
        ready = await cdp.eval(v.isSample
          ? 'Boolean(window.__SAMPLE && window.__SAMPLE_READY && window.__game)'
          : 'Boolean(window.__SAMPLE && window.__game)');
        if (ready) break;
        await sleep(150);
      }
      if (!ready) throw new Error(`Timed out waiting for ${v.key} at ${targetUrl}`);

      // Park hole offshore while st.cine (3.5s) finishes so BEFORE/A/B/C never pre-eat Georgia vs Texas
      await cdp.eval('window.__SAMPLE.setHole(-90, 60)');

      // Wait until gp3d st.cine (3.5s) finishes and geometry settles
      const elapsed = Date.now() - navTime;
      if (elapsed < 4200) await sleep(4200 - elapsed);

      const txInfo = await cdp.eval(`(() => {
        const tc = window.__SAMPLE.tallCol('TX');
        const pos = window.__SAMPLE.pos('TX');
        const ok = window.__SAMPLE.pos('OK');
        const la = window.__SAMPLE.pos('LA');
        const counts = window.__SAMPLE.counts();
        return { tc, pos, ok, la, counts };
      })()`);

      // View 1: Play zoom near Texas's tallest tower (offset slightly SE so the tower stands beside the hole)
      await cdp.eval(`(() => {
        const tc = window.__SAMPLE.tallCol('TX');
        window.__SAMPLE.setSize(2.2);
        window.__SAMPLE.setHole(tc.wx + 3.6, tc.wz + 4.2);
      })()`);
      await cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      await cdp.eval('window.__SAMPLE.setSize(2.2)');
      await cdp.eval('new Promise(r => requestAnimationFrame(r))');
      await sleep(80);

      const playPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const playFile = path.join(OUT_DIR, `tx-play-${v.key}.png`);
      fs.writeFileSync(playFile, Buffer.from(playPng.data, 'base64'));

      // View 2: Coastal + neighbor showcase (wider size framing TX + LA/OK/AR borders + Gulf ocean + warmer horizon)
      await cdp.eval(`(() => {
        window.__SAMPLE.setSize(5.4);
        window.__SAMPLE.setHole(2.0, 26.0);
      })()`);
      await cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))');
      await sleep(120);

      const coastPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const coastFile = path.join(OUT_DIR, `tx-coast-${v.key}.png`);
      fs.writeFileSync(coastFile, Buffer.from(coastPng.data, 'base64'));

      summary.push({ variant: v.key, label: v.label, txTall: txInfo.tc, counts: txInfo.counts, playFile, coastFile });
      console.log(`Captured ${v.key}:`, JSON.stringify(txInfo.tc), 'totalPersons=', txInfo.counts.persons);
    }

    // Build 4-up side-by-side contact sheets via Pillow
    const pyScript = `
import os
from PIL import Image, ImageDraw, ImageFont

out_dir = ${JSON.stringify(OUT_DIR)}
variants = [
    ("before", "BEFORE (Flat Reference)"),
    ("lookA", "LOOK A · Palm Gouache"),
    ("lookB", "LOOK B · Watercolor Atlas"),
    ("lookC", "LOOK C · Impasto Sunset"),
]

def build_sheet(prefix, out_name):
    imgs = [Image.open(os.path.join(out_dir, f"{prefix}-{k}.png")) for k, _ in variants]
    # Scale each panel to 390x844 crisp phone width so 4-up fits comfortably at 1620x910
    pw, ph = 390, 844
    gap, pad, hdr = 14, 16, 46
    w = pad * 2 + len(imgs) * pw + (len(imgs) - 1) * gap
    h = pad * 2 + hdr + ph
    sheet = Image.new("RGB", (w, h), (18, 17, 26))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 19)
    except Exception:
        font = ImageFont.load_default()
    for i, ((k, label), im) in enumerate(zip(variants, imgs)):
        x = pad + i * (pw + gap)
        y = pad + hdr
        resized = im.resize((pw, ph), Image.Resampling.LANCZOS)
        sheet.paste(resized, (x, y))
        draw.rectangle([x, pad + 4, x + pw, pad + hdr - 6], fill=(34, 31, 48))
        draw.text((x + 12, pad + 13), label, fill=(255, 226, 145) if i > 0 else (200, 210, 230), font=font)
    out_path = os.path.join(out_dir, out_name)
    sheet.save(out_path)
    print("Wrote", out_path, sheet.size)

build_sheet("tx-play", "SBS-texas-play.png")
build_sheet("tx-coast", "SBS-texas-coast.png")
`;
    execFileSync('/opt/homebrew/bin/uv', ['run', '--with', 'pillow', 'python3', '-c', pyScript], { stdio: 'inherit' });

    console.log(`Errors check: consoleErrors=${consoleErrors.length}, pageExceptions=${pageExceptions.length}`);
    if (consoleErrors.length) console.error('Console errors:', consoleErrors);
    if (pageExceptions.length) console.error('Page exceptions:', pageExceptions);
    if (consoleErrors.length || pageExceptions.length) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    if (chrome?.proc) {
      chrome.proc.kill('SIGTERM');
      await Promise.race([
        new Promise(r => chrome.proc.once('exit', r)),
        sleep(1200).then(() => { try { chrome.proc.kill('SIGKILL'); } catch {} })
      ]);
    }
    srv.close();
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
