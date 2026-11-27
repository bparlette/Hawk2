// Hex Rush USA — a pop-up book of the real United States.
// Grid, data and hex math: Andrej Karpathy's usaciv (MIT, see LICENSE-usaciv.txt),
// built from US public data (Census ACS, BEA GDP, FEMA, NOAA). hex.js is his file,
// verbatim. gamedata.js is generated from his published data files by build_data.py.
import { makeGrid, hash01 } from "./hex.js";
import { DATA } from "./gamedata.js";

const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let VW = 0, VH = 0;

const grid = makeGrid({ radius: DATA.radius, cols: DATA.cols, rows: DATA.rows });
const N = DATA.cols * DATA.rows;
const { water, cover, relief, owner, gdpM, pop } = DATA;

// His published terrain colours (world.json tables) — the paper palette source.
const COVER = ["#e8e0c8","#4f7a35","#2f5a3a","#43703f","#c9b07a","#a9b35a","#8fb04e","#c2b84e","#4f8a6e","#8a8378","#bfae95","#e8eef2"];
const WATER = { 1: "#1b4266", 2: "#2d6d97", 3: "#3a80b0" };
const CREAM = [246, 238, 218];
const INK = "#e4572e";           // player stamp-ink vermilion
const LAND = [];
for (let i = 0; i < N; i++) if (owner[i] >= 0) LAND.push(i);
const LANDSET = new Set(LAND);

// metros by centre cell
const metroByCell = new Map();
for (const m of DATA.metros) metroByCell.set(m.c, m);
const TOP_METROS = DATA.metros.slice(0, 48);

// ---------- colour helpers ----------
function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function css(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
const coverRgb = COVER.map(hexRgb);
const paperFill = i => css(mix(coverRgb[cover[i]], CREAM, 0.40 + hash01(i, 7) * 0.10)); // printed-paper land
const inkFill = i => css(mix(mix(coverRgb[cover[i]], hexRgb(INK), 0.55), CREAM, 0.10)); // claimed: ink-stamped

// ---------- camera ----------
const bbox = (() => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of LAND) {
    const x = grid.cx(i), y = grid.cy(i);
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  const m = DATA.radius * 1.4;
  return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
})();
const cam = { s: 1, ox: 0, oy: 0 };   // screen = (world - bbox.min) * s + o
let fitS = 1;
function fitCamera() {
  fitS = Math.min(VW / bbox.w, VH / bbox.h);
  cam.s = fitS;
  cam.ox = (VW - bbox.w * cam.s) / 2;
  cam.oy = (VH - bbox.h * cam.s) / 2;
}
const w2sX = wx => (wx - bbox.x0) * cam.s + cam.ox;
const w2sY = wy => (wy - bbox.y0) * cam.s + cam.oy;
const s2wX = sx => (sx - cam.ox) / cam.s + bbox.x0;
const s2wY = sy => (sy - cam.oy) / cam.s + bbox.y0;

// ---------- base map (static paper world, rendered once at supersampled fit scale) ----------
const base = document.createElement("canvas");
const bctx = base.getContext("2d");
let BASE_S = 1; // px per km in base canvas
function hexPath(c, cx, cy, r) {
  c.beginPath();
  for (let k = 0; k < 6; k++) {
    const [dx, dy] = grid.corners[k];
    const x = cx + dx * (r / DATA.radius), y = cy + dy * (r / DATA.radius);
    k ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}
function blob(c, x, y, r, seed) {
  c.beginPath();
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = r * (0.72 + hash01(seed, k * 13 + 1) * 0.5);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    k ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function renderBase() {
  BASE_S = fitS * DPR * 1.75; // headroom for pinch zoom before it softens
  base.width = Math.round(bbox.w * BASE_S); base.height = Math.round(bbox.h * BASE_S);
  const S = BASE_S;
  const bx = wx => (wx - bbox.x0) * S, by = wy => (wy - bbox.y0) * S;
  const R = DATA.radius * S;
  bctx.fillStyle = "#eadfc2";
  bctx.fillRect(0, 0, base.width, base.height);
  // paper grain
  for (let g = 0; g < 2600; g++) {
    bctx.fillStyle = `rgba(120,95,40,${0.025 + hash01(g, 3) * 0.03})`;
    bctx.fillRect(hash01(g, 1) * base.width, hash01(g, 2) * base.height, 1.6, 1.6);
  }
  // water: paint blotches (ocean deep, coast, lakes) with torn, painterly edges
  for (let i = 0; i < N; i++) {
    const w = water[i];
    if (!w) continue;
    const x = bx(grid.cx(i)), y = by(grid.cy(i));
    if (x < -R * 2 || y < -R * 2 || x > base.width + R * 2 || y > base.height + R * 2) continue;
    const col = hexRgb(WATER[w]);
    for (let b = 0; b < 3; b++) {
      const jx = (hash01(i, b * 31 + 5) - 0.5) * R * 0.9, jy = (hash01(i, b * 17 + 9) - 0.5) * R * 0.9;
      blob(bctx, x + jx, y + jy, R * (0.62 + hash01(i, b + 2) * 0.3), i * 3 + b);
      bctx.fillStyle = css(mix(col, CREAM, 0.10 + hash01(i, b + 4) * 0.12), 0.85);
      bctx.fill();
    }
  }
  // foreign land (Canada/Mexico): flat pale paper, faint edge
  for (let i = 0; i < N; i++) {
    if (water[i] || owner[i] >= 0) continue;
    const x = bx(grid.cx(i)), y = by(grid.cy(i));
    if (x < -R || y < -R || x > base.width + R || y > base.height + R) continue;
    hexPath(bctx, x, y, DATA.radius * S * 1.02);
    bctx.fillStyle = "#e7dcc0";
    bctx.fill();
  }
  // US land: paper tiles with a soft printed shadow lip
  for (const i of LAND) {
    const x = bx(grid.cx(i)), y = by(grid.cy(i));
    hexPath(bctx, x + R * 0.05, y + R * 0.09, DATA.radius * S * 1.01);
    bctx.fillStyle = "rgba(110,84,32,.20)";
    bctx.fill();
    hexPath(bctx, x, y, DATA.radius * S * 1.01);
    bctx.fillStyle = paperFill(i);
    bctx.fill();
  }
  // rivers: paint strokes
  bctx.lineCap = "round"; bctx.lineJoin = "round";
  for (const r of DATA.rivers) {
    if (r.r > 7) continue;
    bctx.beginPath();
    for (let p = 0; p < r.pts.length; p += 2) {
      const x = bx(r.pts[p]), y = by(r.pts[p + 1]);
      p ? bctx.lineTo(x, y) : bctx.moveTo(x, y);
    }
    bctx.strokeStyle = "rgba(45,109,151,.5)";
    bctx.lineWidth = Math.max(1, (8 - r.r) * 0.55 * S * 2.2);
    bctx.stroke();
  }
  // pop-up paper mountains & hills
  for (const i of LAND) {
    const rf = relief[i];
    if (!rf) continue;
    const x = bx(grid.cx(i)), y = by(grid.cy(i)), Rr = DATA.radius * S;
    if (rf >= 2) {
      const w = Rr * (rf === 3 ? 0.95 : 0.78), h = Rr * (rf === 3 ? 0.95 : 0.72);
      bctx.beginPath(); bctx.moveTo(x - w / 2, y + h / 2); bctx.lineTo(x, y - h / 2); bctx.lineTo(x + w / 2, y + h / 2); bctx.closePath();
      bctx.fillStyle = "#ded0ab"; bctx.fill();
      bctx.beginPath(); bctx.moveTo(x, y - h / 2); bctx.lineTo(x + w / 2, y + h / 2); bctx.lineTo(x + w * 0.08, y + h / 2); bctx.closePath();
      bctx.fillStyle = "#c9b586"; bctx.fill();
      if (rf === 3) { // snow cap
        bctx.beginPath(); bctx.moveTo(x - w * 0.16, y - h * 0.22); bctx.lineTo(x, y - h / 2); bctx.lineTo(x + w * 0.16, y - h * 0.22);
        bctx.lineTo(x + w * 0.05, y - h * 0.08); bctx.lineTo(x, y - h * 0.2); bctx.lineTo(x - w * 0.05, y - h * 0.08); bctx.closePath();
        bctx.fillStyle = "#fffdf4"; bctx.fill();
      }
    } else {
      bctx.beginPath(); bctx.arc(x, y + Rr * 0.18, Rr * 0.34, Math.PI * 1.08, Math.PI * 1.92);
      bctx.strokeStyle = "rgba(122,100,52,.4)"; bctx.lineWidth = Math.max(1, S * 1.6); bctx.stroke();
    }
  }
  // gold stars on the biggest metros
  for (const m of TOP_METROS) star(bctx, bx(grid.cx(m.c)), by(grid.cy(m.c)), DATA.radius * S * 0.42, "#d9a521", "#8a6410");
}
function star(c, x, y, r, fill, edge) {
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    k ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
  c.fillStyle = fill; c.fill();
  c.strokeStyle = edge; c.lineWidth = Math.max(0.6, r * 0.09); c.stroke();
}

// ---------- audio (tiny WebAudio synth, no assets) ----------
let AC = null, muted = false;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
  if (AC && AC.state === "suspended") AC.resume();
  return AC;
}
function blip(freq, dur, type = "sine", vol = 0.12, when = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur);
}
function noiseBurst(dur, freq, vol = 0.2) {
  if (!AC || muted) return;
  const t = AC.currentTime, len = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(AC.destination); src.start(t);
}
let lastTick = 0;
function claimTick(combo) {
  const now = performance.now();
  if (now - lastTick < 34) return;
  lastTick = now;
  blip(340 + Math.min(combo, 60) * 9, 0.055, "triangle", 0.10);
}
const sndMetro = () => { blip(660, .12, "sine", .14); blip(880, .14, "sine", .14, .07); blip(1320, .2, "sine", .12, .14); };
const sndWarn = () => { blip(196, .3, "sawtooth", .10); blip(196, .3, "sawtooth", .10, .35); };
const sndHit = () => { noiseBurst(.7, 300, .30); blip(90, .5, "sine", .2); };

// ---------- game state ----------
const ROUND_MS = 60000;
let mode = "menu";               // menu | play | over
let startT = 0, elapsed = 0;
const claimed = new Map();       // cell -> claim timestamp (ms)
const scorch = new Map();        // cell -> hit timestamp
const bursts = [];               // metro starbursts {x,y,t}
const floaters = [];             // rising labels {x,y,t,text,big}
let banked = 0, popHeld = 0, combo = 0, bestMetro = null, stormsSurvived = 0;
const claimBatches = [];         // [time, count] — combo = claims in the last second
let events = [];                 // scheduled disasters {at, type, done, warned}
let activeFx = null;             // {type, cell, x, y, t0} impact visual
const claimedMetros = new Set();

function fmt$(dollars) {
  if (dollars >= 1e12) return "$" + (dollars / 1e12).toFixed(2) + "T";
  if (dollars >= 1e9) return "$" + (dollars / 1e9).toFixed(1) + "B";
  if (dollars >= 1e6) return "$" + (dollars / 1e6).toFixed(0) + "M";
  return "$" + Math.round(dollars).toLocaleString();
}
function fmtPop(p) {
  if (p >= 1e6) return (p / 1e6).toFixed(1) + "M";
  if (p >= 1e3) return (p / 1e3).toFixed(0) + "K";
  return "" + Math.round(p);
}

// ---------- disasters (regions from real FEMA county history) ----------
const DISASTERS = {
  hurricane: { name: "HURRICANE", where: c => `the ${DATA.states[owner[c]].n} coast` },
  fire:      { name: "WILDFIRE",  where: c => DATA.states[owner[c]].n },
  storm:     { name: "TORNADO",   where: c => DATA.states[owner[c]].n },
};
function scheduleEvents() {
  const types = Object.keys(DISASTERS);
  events = [15000, 32000, 47000].map((at, k) => ({
    at: at + (Math.random() * 4000 - 2000),
    type: types[(Math.random() * types.length) | 0], done: false, warned: false,
  }));
}
function pickAnchor(type) {
  const list = DATA.anchors[type];
  let best = -1, bestScore = -1;
  for (let k = 0; k < 14; k++) {
    const c = list[(Math.random() * list.length) | 0];
    const cx = grid.cx(c), cy = grid.cy(c);
    let score = 0;
    for (const cc of claimed.keys()) {
      const dx = grid.cx(cc) - cx, dy = grid.cy(cc) - cy;
      if (dx * dx + dy * dy < 330 * 330) score++;
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}
function fireEvent(ev) {
  const anchor = ev.anchor !== undefined && ev.anchor >= 0 ? ev.anchor : pickAnchor(ev.type);
  if (anchor < 0) { ev.done = true; return; }
  const ax = grid.cx(anchor), ay = grid.cy(anchor), R = 330; // km
  let lost = 0;
  for (const cc of [...claimed.keys()]) {
    const dx = grid.cx(cc) - ax, dy = grid.cy(cc) - ay;
    if (dx * dx + dy * dy < R * R && hash01(cc, 99) > 0.18) {
      banked -= gdpM[cc] * 1e6; popHeld -= pop[cc];
      claimed.delete(cc); scorch.set(cc, performance.now()); lost++;
    }
  }
  if (lost) stormsSurvived++;
  activeFx = { type: ev.type, x: ax, y: ay, t0: performance.now() };
  sndHit();
  ev.done = true;
}
function showBanner(html) {
  const b = document.getElementById("banner");
  b.innerHTML = html;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

// ---------- claiming brush ----------
const pointers = new Map();      // pointerId -> {x,y}
let brush = null;                // {x,y} screen pos of the stamp head
let brushTarget = null;
const HEAD_SPEED = 760;          // screen px / s — route choice matters
const BRUSH_R = 25;              // screen px claim radius
let pinch = null;                // {d0, s0, cx, cy, wx, wy}

function claimAt(wx, wy, now) {
  const Rkm = BRUSH_R / cam.s;
  const range = grid.range(wx - Rkm, wy - Rkm, wx + Rkm, wy + Rkm);
  let n = 0;
  for (let r = range.r0; r <= range.r1; r++) for (let c = range.c0; c <= range.c1; c++) {
    const i = r * DATA.cols + c;
    if (!LANDSET.has(i) || claimed.has(i)) continue;
    const dx = grid.cx(i) - wx, dy = grid.cy(i) - wy;
    if (dx * dx + dy * dy > Rkm * Rkm) continue;
    claimed.set(i, now);
    banked += gdpM[i] * 1e6; popHeld += pop[i];
    scorch.delete(i);
    n++;
    const m = metroByCell.get(i);
    if (m && !claimedMetros.has(m.c)) {
      claimedMetros.add(m.c);
      if (!bestMetro || m.g > bestMetro.g) bestMetro = m;
      bursts.push({ x: grid.cx(i), y: grid.cy(i), t: now });
      if (m.g >= 200) { // only the giant metros get a label — the rest still burst
        floaters.push({ x: grid.cx(i), y: grid.cy(i), t: now, text: `${m.n} +${fmt$(m.g * 1e9)}`, big: true });
        if (floaters.length > 3) floaters.splice(0, floaters.length - 3);
      }
      sndMetro();
    }
  }
  if (n) {
    claimBatches.push([now, n]);
    claimTick(combo);
    if (claimed.size > 4) document.getElementById("hint").classList.add("gone");
  }
  return n;
}
function stepBrush(dt, now) {
  if (!brush || !brushTarget) return;
  let dx = brushTarget.x - brush.x, dy = brushTarget.y - brush.y;
  const dist = Math.hypot(dx, dy), step = HEAD_SPEED * dt;
  const steps = Math.max(1, Math.ceil(dist / 9));
  for (let s = 0; s < steps; s++) {
    const f = Math.min(1, (step * (s + 1)) / steps / Math.max(dist, 0.001));
    const px = brush.x + dx * f, py = brush.y + dy * f;
    if (mode === "play") claimAt(s2wX(px), s2wY(py), now);
    if (s === steps - 1) { brush.x = px; brush.y = py; }
  }
}

cv.addEventListener("pointerdown", e => {
  audio();
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    brush = { x: e.clientX, y: e.clientY };
    brushTarget = { x: e.clientX, y: e.clientY };
    if (mode === "play") claimAt(s2wX(e.clientX), s2wY(e.clientY), performance.now());
  } else if (pointers.size === 2) {
    const [p1, p2] = [...pointers.values()];
    pinch = { d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), s0: cam.s, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2, wx: s2wX((p1.x + p2.x) / 2), wy: s2wY((p1.y + p2.y) / 2) };
    brush = null; brushTarget = null;
  }
});
cv.addEventListener("pointermove", e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const [p1, p2] = [...pointers.values()];
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    cam.s = Math.max(fitS * 0.95, Math.min(fitS * 7, pinch.s0 * (d / Math.max(pinch.d0, 1))));
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    cam.ox = mx - (pinch.wx - bbox.x0) * cam.s;
    cam.oy = my - (pinch.wy - bbox.y0) * cam.s;
  } else if (brushTarget) {
    brushTarget.x = e.clientX; brushTarget.y = e.clientY;
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) { brush = null; brushTarget = null; }
  else if (pointers.size === 1) { const p = [...pointers.values()][0]; brush = { x: p.x, y: p.y }; brushTarget = { x: p.x, y: p.y }; }
}
cv.addEventListener("pointerup", endPointer);
cv.addEventListener("pointercancel", endPointer);
cv.addEventListener("wheel", e => { // desktop zoom for testing
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.12 : 0.89;
  const wx = s2wX(e.clientX), wy = s2wY(e.clientY);
  cam.s = Math.max(fitS * 0.95, Math.min(fitS * 7, cam.s * f));
  cam.ox = e.clientX - (wx - bbox.x0) * cam.s;
  cam.oy = e.clientY - (wy - bbox.y0) * cam.s;
}, { passive: false });

// ---------- round flow ----------
const $ = id => document.getElementById(id);
function startRound() {
  claimed.clear(); scorch.clear(); bursts.length = 0; floaters.length = 0; claimBatches.length = 0;
  claimedMetros.clear();
  banked = 0; popHeld = 0; combo = 0; bestMetro = null; stormsSurvived = 0; activeFx = null;
  scheduleEvents();
  fitCamera();
  mode = "play"; startT = performance.now(); elapsed = 0;
  $("startOverlay").hidden = true; $("scoreOverlay").hidden = true;
  $("hint").classList.remove("gone");
  audio();
}
function endRound() {
  mode = "over";
  brush = null; brushTarget = null; // keep the stamp head out of the snapshot
  draw(performance.now());
  // snapshot cropped to the map itself — a shareable card, not a screenshot of empty page
  const sx = Math.max(0, (cam.ox - 8) * DPR), sy = Math.max(0, (cam.oy - 8) * DPR);
  const sw = Math.min(cv.width - sx, (bbox.w * cam.s + 16) * DPR), sh = Math.min(cv.height - sy, (bbox.h * cam.s + 16) * DPR);
  const snapC = document.createElement("canvas");
  snapC.width = Math.round(sw); snapC.height = Math.round(sh);
  snapC.getContext("2d").drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
  $("snap").src = snapC.toDataURL("image/png");
  const pct = banked / DATA.totalGDP * 100;
  $("headline").textContent = `You held ${fmt$(banked)} of America`;
  $("stPct").textContent = pct.toFixed(2) + "%";
  $("stPop").textContent = fmtPop(popHeld);
  $("stHex").textContent = claimed.size.toLocaleString();
  $("stStorm").textContent = stormsSurvived;
  $("bestMetro").innerHTML = bestMetro
    ? `⭐ Biggest catch: <b>${bestMetro.n}, ${bestMetro.s}</b> — a real ${fmt$(bestMetro.g * 1e9)} metro economy`
    : `No metro centres grabbed — aim for the gold stars!`;
  $("scoreOverlay").hidden = false;
}
$("startBtn").addEventListener("click", startRound);
$("againBtn").addEventListener("click", startRound);
$("restartBtn").addEventListener("click", () => { if (mode !== "menu") startRound(); });
$("soundBtn").addEventListener("click", e => { muted = !muted; e.target.textContent = muted ? "✕" : "♪"; if (!muted) audio(); });

// ---------- HUD ----------
let lastHud = "";
function updateHud() {
  const left = Math.max(0, ROUND_MS - elapsed);
  const secs = Math.ceil(left / 1000);
  const key = `${secs}|${banked | 0}|${popHeld | 0}|${combo}`;
  if (key === lastHud) return;
  lastHud = key;
  $("timer").textContent = mode === "play" ? secs : 60;
  $("timer").classList.toggle("low", mode === "play" && secs <= 10);
  $("timebar").style.width = (mode === "play" ? (left / ROUND_MS * 100) : 100) + "%";
  $("banked").textContent = fmt$(banked);
  $("substats").textContent = `${(banked / DATA.totalGDP * 100).toFixed(2)}% of US GDP · ${fmtPop(popHeld)} people · ${claimed.size} hexes`;
  const cb = $("combo");
  if (combo >= 8 && mode === "play") {
    cb.textContent = `COMBO ×${combo}`; cb.style.opacity = 1;
  } else cb.style.opacity = 0;
}

// ---------- frame render ----------
function draw(now) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#e9dfc6";
  ctx.fillRect(0, 0, VW, VH);
  ctx.drawImage(base, cam.ox, cam.oy, bbox.w * cam.s, bbox.h * cam.s);
  const R = DATA.radius * cam.s;

  // scorch ink blotches (fade ~9 s)
  for (const [i, t] of scorch) {
    const a = 1 - (now - t) / 9000;
    if (a <= 0) { scorch.delete(i); continue; }
    const x = w2sX(grid.cx(i)), y = w2sY(grid.cy(i));
    blob(ctx, x, y, R * 0.95, i * 7 + 1);
    ctx.fillStyle = `rgba(46,38,30,${0.5 * a})`; ctx.fill();
    blob(ctx, x, y, R * 0.55, i * 11 + 3);
    ctx.fillStyle = `rgba(120,50,20,${0.35 * a})`; ctx.fill();
  }

  // claimed hexes: popped up, ink-stamped, soft paper shadow
  for (const [i, t] of claimed) {
    const cx = grid.cx(i), cy = grid.cy(i);
    const x = w2sX(cx), y = w2sY(cy);
    if (x < -R * 2 || y < -R * 2 || x > VW + R * 2 || y > VH + R * 2) continue;
    const popT = Math.min(1, (now - t) / 210);
    const overshoot = popT < 1 ? Math.sin(popT * Math.PI) * 0.38 : 0;
    const lift = R * 0.16 + (popT < 1 ? Math.sin(popT * Math.PI) * R * 0.22 : 0);
    hexPath(ctx, x + lift * 0.7, y + lift * 1.5, DATA.radius * cam.s * 1.03);
    ctx.fillStyle = "rgba(96,70,26,.35)"; ctx.fill();
    hexPath(ctx, x, y - lift, DATA.radius * cam.s * (1.03 + overshoot));
    ctx.fillStyle = inkFill(i); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,235,.55)"; ctx.lineWidth = Math.max(0.5, R * 0.06); ctx.stroke();
    const m = metroByCell.get(i);
    if (m && DATA.metros.indexOf(m) < 48) star(ctx, x, y - lift, R * 0.44, "#ffd94d", "#8a6410");
  }

  // metro starbursts
  for (let k = bursts.length - 1; k >= 0; k--) {
    const b = bursts[k], t = (now - b.t) / 550;
    if (t >= 1) { bursts.splice(k, 1); continue; }
    const x = w2sX(b.x), y = w2sY(b.y);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = "#e8a812"; ctx.lineWidth = 2.5;
    for (let rI = 0; rI < 10; rI++) {
      const a = rI * Math.PI / 5 + 0.3, r0 = R * (0.5 + t * 1.6), r1 = R * (0.9 + t * 2.2);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, R * (0.4 + t * 1.9), 0, Math.PI * 2);
    ctx.strokeStyle = "#e4572e"; ctx.stroke();
    ctx.restore();
  }

  // disaster impact visual (~2.4 s)
  if (activeFx) {
    const t = (now - activeFx.t0) / 2400;
    if (t >= 1) activeFx = null;
    else {
      const x = w2sX(activeFx.x), y = w2sY(activeFx.y), RR = 330 * cam.s;
      ctx.save();
      if (activeFx.type === "hurricane") {
        for (let k = 0; k < 26; k++) {
          const a = k * 2.4 + now * 0.004, rr = (k / 26) * RR * (0.4 + t * 0.8);
          blob(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82, R * (0.8 + hash01(k, 5)), k * 3);
          ctx.fillStyle = `rgba(38,74,110,${0.5 * (1 - t)})`; ctx.fill();
        }
      } else if (activeFx.type === "fire") {
        for (let k = 0; k < 22; k++) {
          const a = hash01(k, 8) * Math.PI * 2, rr = hash01(k, 9) * RR * 0.8;
          const fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr - t * 26 * hash01(k, 2);
          blob(ctx, fx, fy, R * (0.7 + hash01(k, 4) * 0.7), k * 5);
          ctx.fillStyle = hash01(k, 6) > 0.45 ? `rgba(224,92,32,${0.55 * (1 - t)})` : `rgba(90,84,80,${0.4 * (1 - t)})`;
          ctx.fill();
        }
      } else { // tornado funnel
        for (let k = 0; k < 12; k++) {
          const fy = y - k * R * 0.55, fw = R * (2.6 - k * 0.17) * (0.8 + 0.2 * Math.sin(now * 0.02 + k));
          blob(ctx, x + Math.sin(now * 0.006 + k * 0.7) * R * 0.3, fy, fw * 0.5, k * 13);
          ctx.fillStyle = `rgba(88,88,96,${0.4 * (1 - t)})`; ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // floaters
  ctx.textAlign = "center";
  for (let k = floaters.length - 1; k >= 0; k--) {
    const f = floaters[k], t = (now - f.t) / 1500;
    if (t >= 1) { floaters.splice(k, 1); continue; }
    const x0 = w2sX(f.x), y = w2sY(f.y) - 14 - t * 44 - k * 27;
    ctx.font = "900 15px 'Trebuchet MS',sans-serif";
    const wTxt = ctx.measureText(f.text).width + 18;
    const x = Math.max(wTxt / 2 + 4, Math.min(VW - wTxt / 2 - 4, x0));
    ctx.fillStyle = `rgba(253,246,224,${0.95 * (1 - t * t)})`;
    ctx.strokeStyle = "rgba(51,48,42,.8)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(x - wTxt / 2, y - 15, wTxt, 24, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(160,61,20,${1 - t * t})`;
    ctx.fillText(f.text, x, y + 3);
  }

  // brush stamp head
  if (brush && mode === "play") {
    ctx.beginPath(); ctx.arc(brush.x, brush.y, BRUSH_R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(228,87,46,.13)"; ctx.fill();
    ctx.strokeStyle = "rgba(228,87,46,.5)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(brush.x, brush.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#fdf6e0"; ctx.fill();
    ctx.strokeStyle = "#33302a"; ctx.lineWidth = 2; ctx.stroke();
    star(ctx, brush.x, brush.y, 6.5, "#e4572e", "#9c3517");
  }
}

// ---------- main loop ----------
let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (mode === "play") {
    elapsed = now - startT;
    stepBrush(dt, now);
    while (claimBatches.length && now - claimBatches[0][0] > 1000) claimBatches.shift();
    combo = claimBatches.reduce((a, b) => a + b[1], 0);
    for (const ev of events) {
      if (!ev.warned && elapsed > ev.at - 1100) {
        ev.warned = true;
        const anchor = pickAnchor(ev.type);
        ev.anchor = anchor;
        if (anchor >= 0) showBanner(`${DISASTERS[ev.type].name} INCOMING<small>heading for ${DISASTERS[ev.type].where(anchor)} — re-claim what it takes!</small>`);
        sndWarn();
      }
      if (!ev.done && elapsed > ev.at) fireEvent(ev);
    }
    if (elapsed >= ROUND_MS) { endRound(); }
  }
  draw(now);
  updateHud();
  requestAnimationFrame(frame);
}

// ---------- sizing / init ----------
function resize() {
  VW = window.innerWidth; VH = window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  fitCamera();
  renderBase();
}
window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
