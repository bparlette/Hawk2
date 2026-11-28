#!/usr/bin/env node
// Captures matched 390x844 (DPR 2) phone stills of Range Hole across:
//   attempt1  (unmodified tasking/art-attempt1/index-art.html)
//   day       (tasking/neon-sample.html?clean=1&grade=day)
//   golden    (tasking/neon-sample.html?clean=1&grade=golden)
// Views per variant:
//   spawn     (locked spawn framing hx=0, hz=2 after balls are mid-arc in slow-mo)
//   midfield  (mid-field framing hx=-8, hz=-14 showing decks, signage, background depth, arcs)
//   higharc   (spawn/mid framing timed with multiple glowing high-arc balls & landing puffs)
// Uses headless Chrome CDP + Node built-in WebSocket + uv/Pillow.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'tasking', 'responses', 'neon-range-stills');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let rel = urlPath.replace(/^\/+/, '') || 'index.html';
      // Allow unmodified tasking/art-attempt1/index-art.html to resolve ./vendor/* -> games/range-hole/vendor/*
      if (rel.startsWith('tasking/art-attempt1/vendor/')) {
        rel = rel.replace('tasking/art-attempt1/', '');
      }
      const file = path.resolve(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('Not found: ' + rel);
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
      if (m) { clearTimeout(timer); resolve({ proc, browserWsUrl: m[1] }); }
    });
    proc.on('exit', code => { clearTimeout(timer); reject(new Error(`Chrome exited early (${code}): ${stderr}`)); });
  });
}

class CDPClient {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.nextId = 1; this.pending = new Map(); this.listeners = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej, { once: true }); });
    this.ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (p) { this.pending.delete(msg.id); if (msg.error) p.rej(new Error(msg.error.message || JSON.stringify(msg.error))); else p.res(msg.result); }
      } else if (msg.method) {
        const arr = this.listeners.get(msg.method);
        if (arr) for (const fn of arr) fn(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  on(method, fn) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(fn); }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('Page eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

const SEED_PRNG_SCRIPT = `(() => {
  let a = 42 >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ALL_VARIANTS = [
  { key: 'attempt1', label: 'ATTEMPT 1 (Baseline)', urlPath: '/tasking/art-attempt1/index-art.html?clean=1' },
  { key: 'day', label: 'NEON · HOA Bright Day', urlPath: '/tasking/neon-sample.html?clean=1&grade=day' },
  { key: 'golden', label: 'NEON · Golden Hour', urlPath: '/tasking/neon-sample.html?clean=1&grade=golden' }
];

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlySet = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const VARIANTS = onlySet ? ALL_VARIANTS.filter(v => onlySet.has(v.key)) : ALL_VARIANTS;

async function run() {
  const srv = await startServer();
  const port = srv.address().port;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-cdp-'));
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
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED_PRNG_SCRIPT });

    cdp.on('Runtime.exceptionThrown', params => {
      pageExceptions.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'exception');
    });
    cdp.on('Runtime.consoleAPICalled', params => {
      if (params.type === 'error') consoleErrors.push((params.args || []).map(a => a.value ?? a.description ?? '').join(' '));
    });

    for (const v of VARIANTS) {
      const targetUrl = `http://127.0.0.1:${port}${v.urlPath}`;
      await cdp.send('Page.navigate', { url: targetUrl });

      let ready = false;
      for (let i = 0; i < 80; i++) {
        ready = await cdp.eval('Boolean(window.__SAMPLE && window.__game)');
        if (ready) break;
        await sleep(150);
      }
      if (!ready) throw new Error(`Timed out waiting for ${v.key}`);

      // Let golfers fire high arcs and first wave exit slow-mo (~4.3s) + land (~5.5s) so peak arcs & landing puffs both show
      await sleep(5600);

      // View 1: Exact locked spawn framing (hx=0, hz=2)
      await cdp.eval('window.__SAMPLE.setHole(0, 2)');
      await cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))');
      await sleep(80);
      const stSpawn = await cdp.eval('({ state: window.__SAMPLE.state(), cam: window.__SAMPLE.cam(), roof: window.__SAMPLE.toScreen(0, 14.9, -39.5), backTop: window.__SAMPLE.toScreen(0, 22, -52) })');
      const spawnPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT_DIR, `rh-spawn-${v.key}.png`), Buffer.from(spawnPng.data, 'base64'));

      // View 2: Mid-field framing (hx=0, hz=-18 — shows decks, RANGE HOLE marquee, floodlights, trees/hills background depth, and high ball arcs)
      await cdp.eval('window.__SAMPLE.setHole(0, -18)');
      await cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))');
      await sleep(80);
      const stMid = await cdp.eval('({ state: window.__SAMPLE.state(), cam: window.__SAMPLE.cam(), roof: window.__SAMPLE.toScreen(0, 14.9, -39.5), backTop: window.__SAMPLE.toScreen(0, 22, -52) })');
      const midPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT_DIR, `rh-midfield-${v.key}.png`), Buffer.from(midPng.data, 'base64'));

      console.log(`Captured ${v.key}:`, JSON.stringify({ spawn: stSpawn, midfield: stMid }));
    }

    if (VARIANTS.length >= 2) {
      const pyScript = `
import os
from PIL import Image, ImageDraw, ImageFont

out_dir = ${JSON.stringify(OUT_DIR)}
variants = ${JSON.stringify(VARIANTS.map(v => [v.key, v.label]))}

def build_sheet(prefix, out_name):
    imgs = [Image.open(os.path.join(out_dir, f"{prefix}-{k}.png")) for k, _ in variants]
    pw, ph = 390, 844
    gap, pad, hdr = 14, 16, 46
    w = pad * 2 + len(imgs) * pw + (len(imgs) - 1) * gap
    h = pad * 2 + hdr + ph
    sheet = Image.new("RGB", (w, h), (18, 19, 26))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 19)
    except Exception:
        font = ImageFont.load_default()
    for i, ((k, label), im) in enumerate(zip(variants, imgs)):
        x = pad + i * (pw + gap)
        y = pad + hdr
        sheet.paste(im.resize((pw, ph), Image.Resampling.LANCZOS), (x, y))
        draw.rectangle([x, pad + 4, x + pw, pad + hdr - 6], fill=(34, 36, 50))
        draw.text((x + 12, pad + 13), label, fill=(255, 226, 145) if i > 0 else (200, 212, 232), font=font)
    out_path = os.path.join(out_dir, out_name)
    sheet.save(out_path)
    print("Wrote", out_path, sheet.size)

build_sheet("rh-spawn", "SBS-range-spawn.png")
build_sheet("rh-midfield", "SBS-range-midfield.png")
`;
      execFileSync('/opt/homebrew/bin/uv', ['run', '--with', 'pillow', 'python3', '-c', pyScript], { stdio: 'inherit' });
    }

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

run().catch(err => { console.error(err); process.exit(1); });
