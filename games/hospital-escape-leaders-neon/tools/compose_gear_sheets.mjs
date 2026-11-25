import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE = path.resolve(__dirname, '../../..');
const SHOTS_DIR = path.join(WORKSPACE, 'games/hospital-escape/tasking/responses/neon-gear-fix-shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SHEETS = [
  {
    out: 'before-after-dying.png',
    title: 'GEAR-FIX: Dying_Headshot_Knees Extremes (BEFORE -> AFTER)',
    cols: 4,
    items: [
      { file: 'before-n2-dying-headshot-3q.png', label: 'BEFORE N2 mid' },
      { file: 'after-n2-dying-headshot-3q.png', label: 'AFTER N2 mid' },
      { file: 'before-n2-dying-headshot-extreme-3q.png', label: 'BEFORE N2 extreme' },
      { file: 'after-n2-dying-headshot-extreme-3q.png', label: 'AFTER N2 extreme' },
      { file: 'before-gunman-dying-headshot-3q.png', label: 'BEFORE Gunman mid' },
      { file: 'after-gunman-dying-headshot-3q.png', label: 'AFTER Gunman mid' },
      { file: 'before-gunman-dying-headshot-extreme-3q.png', label: 'BEFORE Gunman extreme' },
      { file: 'after-gunman-dying-headshot-extreme-3q.png', label: 'AFTER Gunman extreme' },
    ],
  },
  {
    out: 'before-after-2x-holds.png',
    title: 'GEAR-FIX: 2x Weapon Hold & Trigger/Support Inspection (BEFORE -> AFTER)',
    cols: 4,
    items: [
      { file: 'before-gunman-cover-to-shoot-grip2x.png', label: 'BEFORE Gunman C2S R' },
      { file: 'after-gunman-cover-to-shoot-grip2x.png', label: 'AFTER Gunman C2S R' },
      { file: 'before-gunman-cover-to-shoot-grip2x-l.png', label: 'BEFORE Gunman C2S L' },
      { file: 'after-gunman-cover-to-shoot-grip2x-l.png', label: 'AFTER Gunman C2S L' },
      { file: 'before-gunman-idle-alert-grip2x.png', label: 'BEFORE Gunman Alert R' },
      { file: 'after-gunman-idle-alert-grip2x.png', label: 'AFTER Gunman Alert R' },
      { file: 'before-gunman-walk-fire-grip2x.png', label: 'BEFORE Gunman WalkFire' },
      { file: 'after-gunman-walk-fire-grip2x.png', label: 'AFTER Gunman WalkFire' },
      { file: 'before-n2-cover-to-shoot-grip2x.png', label: 'BEFORE N2 C2S R' },
      { file: 'after-n2-cover-to-shoot-grip2x.png', label: 'AFTER N2 C2S R' },
      { file: 'before-n2-cover-to-shoot-grip2x-l.png', label: 'BEFORE N2 C2S L' },
      { file: 'after-n2-cover-to-shoot-grip2x-l.png', label: 'AFTER N2 C2S L' },
      { file: 'before-n2-idle-alert-grip2x.png', label: 'BEFORE N2 Alert R' },
      { file: 'after-n2-idle-alert-grip2x.png', label: 'AFTER N2 Alert R' },
      { file: 'before-n2-walk-fire-grip2x.png', label: 'BEFORE N2 WalkFire' },
      { file: 'after-n2-walk-fire-grip2x.png', label: 'AFTER N2 WalkFire' },
    ],
  },
  {
    out: 'before-after-all-cast.png',
    title: 'GEAR-FIX: Full Cast Tracking (Gunman, N2, Maya, Cole)',
    cols: 4,
    items: [
      { file: 'before-gunman-cover-to-shoot-3q.png', label: 'BEFORE Gunman C2S' },
      { file: 'after-gunman-cover-to-shoot-3q.png', label: 'AFTER Gunman C2S' },
      { file: 'before-n2-cover-to-shoot-3q.png', label: 'BEFORE N2 C2S' },
      { file: 'after-n2-cover-to-shoot-3q.png', label: 'AFTER N2 C2S' },
      { file: 'before-maya-bed-push-3q.png', label: 'BEFORE Maya BedPush' },
      { file: 'after-maya-bed-push-3q.png', label: 'AFTER Maya BedPush' },
      { file: 'before-cole-disbelief-forward-3q.png', label: 'BEFORE Cole Disbelief' },
      { file: 'after-cole-disbelief-forward-3q.png', label: 'AFTER Cole Disbelief' },
    ],
  },
];

function startServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/compose.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><html><body style="margin:0;background:#0b1016"></body></html>`);
        return;
      }
      const full = path.join(SHOTS_DIR, path.basename(p));
      if (!fs.existsSync(full)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
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

async function main() {
  const { srv, port } = await startServer();
  const cdpPort = 9410 + Math.floor(Math.random() * 400);
  const userDir = `/tmp/neon_compose_${cdpPort}`;
  fs.rmSync(userDir, { recursive: true, force: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${userDir}`, 'about:blank'
  ], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
      page = (await r.json()).find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) break;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 120));
  }
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/compose.html` });
  await new Promise(r => setTimeout(r, 200));

  for (const sheet of SHEETS) {
    const evalRes = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const spec = ${JSON.stringify(sheet)};
        const cw = 320, ch = 560, pad = 12, hdr = 44, lbl = 28;
        const rows = Math.ceil(spec.items.length / spec.cols);
        const W = pad + spec.cols * (cw + pad);
        const H = hdr + rows * (ch + lbl + pad) + pad;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#0d141c';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e8f1f8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(spec.title, pad, 30);
        for (let idx = 0; idx < spec.items.length; idx++) {
          const it = spec.items[idx];
          const col = idx % spec.cols, row = Math.floor(idx / spec.cols);
          const x = pad + col * (cw + pad), y = hdr + row * (ch + lbl + pad);
          const img = new Image();
          img.src = '/' + it.file + '?cb=' + Date.now();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
          const s = Math.min(cw / img.width, ch / img.height);
          const dw = img.width * s, dh = img.height * s;
          ctx.fillStyle = '#15202b';
          ctx.fillRect(x, y, cw, ch);
          ctx.drawImage(img, x + (cw - dw) * 0.5, y + (ch - dh) * 0.5, dw, dh);
          ctx.fillStyle = it.label.startsWith('AFTER') ? '#38d399' : '#fbbf24';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(it.label, x + 6, y + ch + 20);
        }
        return cv.toDataURL('image/png').split(',')[1];
      })()`,
    });
    const outPath = path.join(SHOTS_DIR, sheet.out);
    fs.writeFileSync(outPath, Buffer.from(evalRes.result.value, 'base64'));
    console.log('Wrote sheet:', outPath);
  }
  cdp.close();
  proc.kill('SIGKILL');
  fs.rmSync(userDir, { recursive: true, force: true });
  srv.close();
}

main().catch(err => { console.error(err); process.exit(1); });
