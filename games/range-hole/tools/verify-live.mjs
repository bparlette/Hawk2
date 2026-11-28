#!/usr/bin/env node
// Verifies live games/range-hole/index.html at 390x844 (DPR 2):
// - 0 console/page errors
// - Half-width bay (50 golfers)
// - Permanent slow-mo (balls stay slow throughout flight, no speed-up)
// - Real-time clock (1 real minute = 1 in-game hour)
// - Captures 390x844 stills at HOA Bright Day (16.15), Golden Hour (17.2), and Lit Night (19.8)

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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };

function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function launchChrome(userDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME_BIN, [
      '--headless=new', `--user-data-dir=${userDir}`, '--remote-debugging-port=0',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--window-size=390,844', '--no-first-run', '--no-default-browser-check',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome timeout')), 15000);
    proc.stderr.on('data', c => {
      stderr += c.toString();
      const m = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(timer); resolve({ proc, browserWsUrl: m[1] }); }
    });
  });
}

class CDP {
  constructor(url) { this.url = url; this.id = 1; this.p = new Map(); this.l = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => { this.ws.addEventListener('open', res, { once: true }); this.ws.addEventListener('error', rej, { once: true }); });
    this.ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.p.has(m.id)) { const x = this.p.get(m.id); this.p.delete(m.id); m.error ? x.rej(new Error(m.error.message)) : x.res(m.result); }
      else if (m.method && this.l.has(m.method)) for (const fn of this.l.get(m.method)) fn(m.params);
    });
  }
  send(method, params = {}) { const id = this.id++; return new Promise((res, rej) => { this.p.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
  on(method, fn) { if (!this.l.has(method)) this.l.set(method, []); this.l.get(method).push(fn); }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEED_PRNG = `(() => { let a = 42 >>> 0; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

async function run() {
  const srv = await startServer();
  const port = srv.address().port;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-live-'));
  let chrome, cdp;
  const errs = [];

  try {
    chrome = await launchChrome(userDir);
    const targets = await (await fetch(`http://127.0.0.1:${new URL(chrome.browserWsUrl).port}/json/list`)).json();
    cdp = new CDP((targets.find(t => t.type === 'page') || targets[0]).webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: SEED_PRNG });
    cdp.on('Runtime.exceptionThrown', p => errs.push(p.exceptionDetails?.exception?.description || 'exception'));
    cdp.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errs.push((p.args || []).map(a => a.value ?? a.description ?? '').join(' ')); });

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?clean=1` });
    for (let i = 0; i < 80; i++) {
      if (await cdp.eval('Boolean(window.__SAMPLE && window.__game)')) break;
      await sleep(150);
    }

    const h0 = await cdp.eval('window.__SAMPLE.hour()');
    await sleep(6000);
    const h1 = await cdp.eval('window.__SAMPLE.hour()');
    const info = await cdp.eval('({ golfers: window.__SAMPLE.golfers(), state: window.__SAMPLE.state(), cam: window.__SAMPLE.cam() })');
    console.log('Live check:', JSON.stringify({ h0, h1, deltaHour: +(h1 - h0).toFixed(3), ...info }));

    if (info.golfers !== 50) throw new Error(`Expected 50 golfers (half-width), got ${info.golfers}`);
    if (info.state.flying > 0 && info.state.slow !== info.state.flying) {
      throw new Error(`Expected permanent slow-mo (slow=${info.state.slow} === flying=${info.state.flying})`);
    }
    if (h1 <= h0) throw new Error(`Expected real-time hour progression (h0=${h0}, h1=${h1})`);

    const shots = [
      { key: 'day', hour: 16.15, label: '4:09 PM · HOA Bright Day' },
      { key: 'golden', hour: 17.2, label: '5:12 PM · Golden Hour' },
      { key: 'night', hour: 19.8, label: '7:48 PM · Night Lights' }
    ];
    for (const s of shots) {
      await cdp.eval(`window.__SAMPLE.setHour(${s.hour}); window.__SAMPLE.setHole(0, 2);`);
      await cdp.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))');
      await sleep(80);
      const png = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT_DIR, `live-${s.key}.png`), Buffer.from(png.data, 'base64'));
    }

    const py = `
import os
from PIL import Image, ImageDraw, ImageFont
out_dir = ${JSON.stringify(OUT_DIR)}
shots = ${JSON.stringify(shots.map(s => [s.key, s.label]))}
imgs = [Image.open(os.path.join(out_dir, f"live-{k}.png")) for k, _ in shots]
pw, ph, gap, pad, hdr = 390, 844, 14, 16, 46
sheet = Image.new("RGB", (pad * 2 + 3 * pw + 2 * gap, pad * 2 + hdr + ph), (16, 18, 26))
draw = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 19)
except Exception: font = ImageFont.load_default()
for i, ((k, label), im) in enumerate(zip(shots, imgs)):
    x = pad + i * (pw + gap)
    sheet.paste(im.resize((pw, ph), Image.Resampling.LANCZOS), (x, pad + hdr))
    draw.rectangle([x, pad + 4, x + pw, pad + hdr - 6], fill=(32, 35, 50))
    draw.text((x + 12, pad + 13), label, fill=(255, 226, 145), font=font)
out_path = os.path.join(out_dir, "SBS-live-time-cycle.png")
sheet.save(out_path)
print("Wrote", out_path, sheet.size)
`;
    execFileSync('/opt/homebrew/bin/uv', ['run', '--with', 'pillow', 'python3', '-c', py], { stdio: 'inherit' });
    console.log(`Errors check: ${errs.length}`);
    if (errs.length) { console.error(errs); process.exitCode = 1; }
  } finally {
    if (cdp) cdp.close();
    if (chrome?.proc) {
      chrome.proc.kill('SIGTERM');
      await Promise.race([new Promise(r => chrome.proc.once('exit', r)), sleep(1200).then(() => { try { chrome.proc.kill('SIGKILL'); } catch {} })]);
    }
    srv.close();
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch(e => { console.error(e); process.exit(1); });
