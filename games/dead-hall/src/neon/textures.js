// Dead Hall — Neon Procedural Texture Variants
// 100% seeded <canvas> generation (zero external images), extending bodycam-corridor recipes.
// Cached per-key so repeated rooms/props share GPU textures and never blow draw-call / VRAM budgets.
import * as THREE from '../../three.module.js';

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cnv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function speckle(x, w, h, n, rng, cols, aMax) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[(rng() * cols.length) | 0];
    x.globalAlpha = rng() * aMax;
    x.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 2);
  }
  x.globalAlpha = 1;
}

function blotches(x, w, h, n, rng, col, aMax, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    const r = rMin + rng() * (rMax - rMin);
    const gx = rng() * w;
    const gy = rng() * h;
    const g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = aMax * (0.4 + rng() * 0.6);
    x.fillStyle = g;
    x.fillRect(gx - r, gy - r, r * 2, r * 2);
  }
  x.globalAlpha = 1;
}

function streaks(x, w, h, n, rng, col = 'rgba(18,16,12,0.22)') {
  for (let i = 0; i < n; i++) {
    const sx = rng() * w;
    const sw = 2 + rng() * 7;
    const sl = h * (0.22 + rng() * 0.72);
    const g = x.createLinearGradient(0, 0, 0, sl);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(sx, 0, sw, sl);
  }
}

function cracks(x, w, h, n, rng, col = 'rgba(10,10,10,0.45)') {
  x.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    x.lineWidth = 0.8 + rng() * 1.1;
    x.beginPath();
    let px = rng() * w;
    let py = rng() * h * 0.55;
    x.moveTo(px, py);
    const segs = 4 + ((rng() * 7) | 0);
    for (let s = 0; s < segs; s++) {
      px += (rng() - 0.5) * 38;
      py += rng() * 34;
      x.lineTo(px, py);
    }
    x.stroke();
  }
}

export function makeCanvasTexture(canvas, rx = 1, ry = 1, clampEdge = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ================================================================
// 1. ARCHITECTURAL & ROOM SURFACE TEXTURE VARIANTS (for the 12 rooms)
// ================================================================

export const ROOM_TEXTURE_CATALOG = {
  peelingPlaster: {
    rooms: [1, 2],
    desc: 'Aged institutional plaster with wainscot rail, peeling paint flakes, damp baseboard',
  },
  charredConcrete: {
    rooms: [3],
    desc: 'Smoke-blackened corridor concrete with soot bloom near ceiling and deep hairline cracks',
  },
  nvClinicalTile: {
    rooms: [4],
    desc: 'Grimy institutional 6x6 ceramic tile grid with missing tiles and dark grout (reads crisp under NV green)',
  },
  moldDrywall: {
    rooms: [5],
    desc: 'Water-stained condemned drywall with dark corner mildew colonies and plaster seams',
  },
  rustHatchMetal: {
    rooms: [6],
    desc: 'Riveted iron cellar plate with heavy orange-brown oxide patches and oil sheen',
  },
  scuffedLinoleum: {
    rooms: [7],
    desc: 'Faded checkerboard institutional linoleum with black rubber scuff arcs and missing squares',
  },
  splinterTimber: {
    rooms: [8],
    desc: 'Dark water-warped doorway wood grain with pry marks and deep nail holes',
  },
  tallIndustrialWall: {
    rooms: [9],
    desc: 'High-bay poured concrete with vertical form-tie holes and damp mineral efflorescence',
  },
  watchingWallpaper: {
    rooms: [10],
    desc: 'Shredded charcoal corridor paper with faint organic shadow-rings embedded in damp stains',
  },
  crackedStoragePlaster: {
    rooms: [11],
    desc: 'Dusty storage-room concrete block with chalky plaster patches and spiderweb fractures',
  },
  yellowWallpaper: {
    rooms: [12],
    desc: 'Sickly ochre-yellow diamond-chevron wallpaper with damp bottom tide-line and water-ringed seams',
  },
  acousticCeiling: {
    rooms: [1, 7, 12],
    desc: 'Drop-ceiling acoustic tiles with dark grid rails, brown water rings, and sagging/missing panels',
  },
  dampCarpet: {
    rooms: [1, 12],
    desc: 'Soggy mustard/olive commercial loop carpet with dark traffic lanes and moisture blotches',
  },
};

export function genPeelingPlasterCanvas(seed = 101, base = '#6f6c62') {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  // Subtle vertical wallpaper/plaster bands
  for (let i = 0; i < 8; i++) {
    x.fillStyle = i % 2 ? 'rgba(255,250,235,0.03)' : 'rgba(0,0,0,0.04)';
    x.fillRect(i * 64, 0, 64, 512);
  }
  speckle(x, 512, 512, 8500, rng, ['#111', '#e8e2d2', '#47433a'], 0.08);
  blotches(x, 512, 512, 18, rng, 'rgba(32,26,18,1)', 0.18, 30, 120);
  // Jagged torn peeling-plaster patches revealing darker under-plaster
  for (let i = 0; i < 12; i++) {
    const px = rng() * 460 + 26;
    const py = rng() * 380 + 28;
    const rad = 14 + rng() * 28;
    const pts = 7 + ((rng() * 5) | 0);
    x.beginPath();
    for (let k = 0; k < pts; k++) {
      const ang = (k / pts) * Math.PI * 2;
      const r = rad * (0.45 + rng() * 0.75);
      const vx = px + Math.cos(ang) * r;
      const vy = py + Math.sin(ang) * r * (0.8 + rng() * 0.6);
      if (k === 0) x.moveTo(vx, vy);
      else x.lineTo(vx, vy);
    }
    x.closePath();
    x.fillStyle = 'rgba(38,34,29,0.52)';
    x.fill();
    x.strokeStyle = 'rgba(198,192,176,0.28)';
    x.lineWidth = 1.5;
    x.stroke();
  }
  // Chair rail + baseboard
  x.fillStyle = 'rgba(28,24,20,0.55)';
  x.fillRect(0, 316, 512, 12);
  x.fillStyle = 'rgba(14,12,10,0.72)';
  x.fillRect(0, 466, 512, 46);
  streaks(x, 512, 512, 22, rng);
  cracks(x, 512, 512, 6, rng);
  return c;
}

export function genCharredConcreteCanvas(seed = 303) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#363536';
  x.fillRect(0, 0, 512, 512);
  // Heavy smoke gradient at top
  const soot = x.createLinearGradient(0, 0, 0, 320);
  soot.addColorStop(0, 'rgba(4,4,5,0.82)');
  soot.addColorStop(0.55, 'rgba(12,11,12,0.35)');
  soot.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = soot;
  x.fillRect(0, 0, 512, 320);
  speckle(x, 512, 512, 11000, rng, ['#000', '#6a6660', '#1e1d1c'], 0.1);
  blotches(x, 512, 512, 24, rng, 'rgba(6,6,6,1)', 0.28, 35, 140);
  streaks(x, 512, 512, 32, rng, 'rgba(5,5,5,0.32)');
  cracks(x, 512, 512, 10, rng, 'rgba(0,0,0,0.6)');
  return c;
}

export function genNvClinicalTileCanvas(seed = 404) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#7c877c';
  x.fillRect(0, 0, 512, 512);
  const step = 64;
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const missing = rng() < 0.08;
      const shade = missing ? '#282c27' : (rng() < 0.5 ? '#879386' : '#738073');
      x.fillStyle = shade;
      x.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);
      if (!missing && rng() < 0.22) {
        x.strokeStyle = 'rgba(16,20,16,0.5)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(gx * step + 6, gy * step + 6);
        x.lineTo(gx * step + step - 10, gy * step + step - 8);
        x.stroke();
      }
    }
  }
  x.strokeStyle = 'rgba(14,18,14,0.85)';
  x.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    x.beginPath(); x.moveTo(i * step, 0); x.lineTo(i * step, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i * step); x.lineTo(512, i * step); x.stroke();
  }
  blotches(x, 512, 512, 16, rng, 'rgba(12,18,12,1)', 0.26, 28, 120);
  streaks(x, 512, 512, 18, rng, 'rgba(10,16,10,0.28)');
  return c;
}

export function genMoldDrywallCanvas(seed = 505) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#626358';
  x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 9500, rng, ['#12140f', '#9b9a8b', '#2d3324'], 0.09);
  // Heavy black-green mold colonies concentrated toward bottom/edges
  blotches(x, 512, 512, 22, rng, 'rgba(16,22,13,1)', 0.36, 22, 110);
  blotches(x, 512, 512, 14, rng, 'rgba(54,48,30,1)', 0.22, 30, 95);
  streaks(x, 512, 512, 28, rng, 'rgba(16,20,12,0.26)');
  cracks(x, 512, 512, 7, rng);
  return c;
}

export function genRustHatchCanvas(seed = 606) {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(seed);
  x.fillStyle = '#3b322b';
  x.fillRect(0, 0, 256, 256);
  blotches(x, 256, 256, 36, rng, 'rgba(138,68,24,1)', 0.52, 10, 58);
  blotches(x, 256, 256, 22, rng, 'rgba(26,18,14,1)', 0.55, 8, 42);
  speckle(x, 256, 256, 4500, rng, ['#1b120a', '#b66b2f', '#52341b'], 0.18);
  // Steel frame & rivets
  x.strokeStyle = 'rgba(15,12,10,0.85)';
  x.lineWidth = 8;
  x.strokeRect(4, 4, 248, 248);
  x.fillStyle = '#201914';
  for (let i = 20; i <= 236; i += 36) {
    for (const [rx, ry] of [[i, 16], [i, 240], [16, i], [240, i]]) {
      x.beginPath(); x.arc(rx, ry, 4.5, 0, Math.PI * 2); x.fill();
    }
  }
  return c;
}

export function genScuffedLinoleumCanvas(seed = 707) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  const step = 64;
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const dark = (gx + gy) % 2 === 0;
      const missing = rng() < 0.06;
      x.fillStyle = missing ? '#252422' : (dark ? '#383a36' : '#736d5d');
      x.fillRect(gx * step, gy * step, step, step);
    }
  }
  speckle(x, 512, 512, 9000, rng, ['#000', '#ddd6c2', '#443e33'], 0.08);
  blotches(x, 512, 512, 18, rng, 'rgba(16,14,12,1)', 0.25, 25, 110);
  // Black scuff arcs from sprinting feet
  x.strokeStyle = 'rgba(10,10,12,0.34)';
  for (let i = 0; i < 34; i++) {
    x.lineWidth = 1.5 + rng() * 3;
    x.beginPath();
    const sx = rng() * 512;
    const sy = rng() * 512;
    x.arc(sx, sy, 18 + rng() * 48, rng() * 4, rng() * 4 + 0.9);
    x.stroke();
  }
  return c;
}

export function genSplinterTimberCanvas(seed = 808) {
  const [c, x] = cnv(256, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#3c2e22';
  x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 65; i++) {
    x.strokeStyle = i % 3 ? 'rgba(20,13,8,0.35)' : 'rgba(96,76,56,0.22)';
    x.lineWidth = 1 + rng() * 2.4;
    const gx = rng() * 256;
    x.beginPath();
    x.moveTo(gx, 0);
    x.bezierCurveTo(gx + (rng() - 0.5) * 14, 170, gx + (rng() - 0.5) * 14, 340, gx + (rng() - 0.5) * 8, 512);
    x.stroke();
  }
  blotches(x, 256, 512, 16, rng, 'rgba(10,7,5,1)', 0.34, 16, 70);
  return c;
}

export function genTallIndustrialWallCanvas(seed = 909) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#535658';
  x.fillRect(0, 0, 512, 512);
  // Poured concrete lift seams + form-tie holes
  x.fillStyle = 'rgba(0,0,0,0.26)';
  x.fillRect(0, 170, 512, 3);
  x.fillRect(0, 340, 512, 3);
  for (const ty of [85, 255, 425]) {
    for (const tx of [64, 192, 320, 448]) {
      x.fillStyle = 'rgba(14,16,18,0.75)';
      x.beginPath(); x.arc(tx, ty, 5, 0, Math.PI * 2); x.fill();
    }
  }
  speckle(x, 512, 512, 10000, rng, ['#000', '#cfd6d8', '#393d40'], 0.08);
  blotches(x, 512, 512, 16, rng, 'rgba(205,212,208,1)', 0.09, 25, 95); // mineral efflorescence
  streaks(x, 512, 512, 24, rng);
  return c;
}

export function genWatchingWallpaperCanvas(seed = 1010) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#2a292e';
  x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 8000, rng, ['#050507', '#4b4952', '#17161a'], 0.12);
  blotches(x, 512, 512, 22, rng, 'rgba(5,5,7,1)', 0.42, 28, 120);
  // Subtle dark oval shadow-eye rings baked into wall dampness
  for (let i = 0; i < 10; i++) {
    const ex = 40 + rng() * 432;
    const ey = 60 + rng() * 340;
    const ew = 16 + rng() * 14;
    x.fillStyle = 'rgba(6,6,8,0.65)';
    x.beginPath(); x.ellipse(ex, ey, ew, ew * 0.46, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(130,136,148,0.16)';
    x.lineWidth = 1.5;
    x.stroke();
  }
  streaks(x, 512, 512, 30, rng, 'rgba(4,4,6,0.36)');
  return c;
}

export function genYellowWallpaperCanvas(seed = 1212) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#b9a359';
  x.fillRect(0, 0, 512, 512);
  // Institutional mono-yellow diamond/chevron motif
  x.strokeStyle = 'rgba(132,110,44,0.42)';
  x.lineWidth = 2.5;
  for (let y = 0; y < 512; y += 64) {
    for (let px = 0; px < 512; px += 64) {
      x.beginPath();
      x.moveTo(px + 32, y + 6);
      x.lineTo(px + 58, y + 32);
      x.lineTo(px + 32, y + 58);
      x.lineTo(px + 6, y + 32);
      x.closePath();
      x.stroke();
      x.fillStyle = 'rgba(146,124,52,0.22)';
      x.fillRect(px + 29, y + 29, 6, 6);
    }
  }
  // Vertical seam lines
  x.fillStyle = 'rgba(82,68,26,0.28)';
  x.fillRect(255, 0, 2, 512);
  x.fillRect(0, 0, 2, 512);
  speckle(x, 512, 512, 6500, rng, ['#6a5822', '#dfd08f', '#3d3312'], 0.08);
  blotches(x, 512, 512, 14, rng, 'rgba(92,76,28,1)', 0.2, 26, 110);
  // Damp rising tide-line along bottom
  const damp = x.createLinearGradient(0, 355, 0, 512);
  damp.addColorStop(0, 'rgba(58,48,18,0)');
  damp.addColorStop(0.6, 'rgba(58,48,18,0.34)');
  damp.addColorStop(1, 'rgba(34,28,10,0.68)');
  x.fillStyle = damp;
  x.fillRect(0, 355, 512, 157);
  return c;
}

export function genAcousticCeilingCanvas(seed = 1213) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = '#928c74';
  x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 14000, rng, ['#2d2a20', '#c8c2a6', '#5c5848'], 0.14);
  x.strokeStyle = 'rgba(42,38,30,0.85)';
  x.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke();
  }
  // Brown ceiling leak rings
  for (let i = 0; i < 6; i++) {
    const gx = rng() * 512;
    const gy = rng() * 512;
    x.strokeStyle = 'rgba(112,78,34,0.38)';
    x.lineWidth = 2.5;
    for (let r = 8; r < 42; r += 9) {
      x.beginPath(); x.arc(gx, gy, r, 0, Math.PI * 2); x.stroke();
    }
  }
  return c;
}

export function genDampCarpetCanvas(seed = 1214, base = '#6f623d') {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 18000, rng, ['#3b321b', '#9c8b59', '#231d0e'], 0.18);
  blotches(x, 512, 512, 22, rng, 'rgba(30,24,11,1)', 0.34, 34, 140);
  return c;
}

// ================================================================
// 2. FIGURE SURFACE & FACE TEXTURE VARIANTS
// ================================================================

export function genSkinCanvas(seed = 41, tone = '#b9afa2') {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(seed);
  x.fillStyle = tone;
  x.fillRect(0, 0, 256, 256);
  blotches(x, 256, 256, 18, rng, 'rgba(66,56,48,1)', 0.18, 12, 52);
  blotches(x, 256, 256, 10, rng, 'rgba(98,84,96,1)', 0.14, 10, 40);
  speckle(x, 256, 256, 2400, rng, ['#2d2723', '#e0d9ce', '#685b52'], 0.08);
  return c;
}

export function genDressFabricCanvas(seed = 42, base = '#6b7780', pleats = true) {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  if (pleats) {
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.06)';
      x.fillRect(i * 16, 0, 8, 256);
    }
  }
  speckle(x, 256, 256, 2800, rng, ['#121212', '#e5e0d5'], 0.08);
  blotches(x, 256, 256, 14, rng, 'rgba(28,22,16,1)', 0.24, 14, 58);
  // Hem grime
  const g = x.createLinearGradient(0, 180, 0, 256);
  g.addColorStop(0, 'rgba(18,14,10,0)');
  g.addColorStop(1, 'rgba(18,14,10,0.58)');
  x.fillStyle = g;
  x.fillRect(0, 180, 256, 76);
  return c;
}

export function genMascotPlushCanvas(seed = 77) {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(seed);
  x.fillStyle = '#7e6344';
  x.fillRect(0, 0, 256, 256);
  // Matted fur strokes
  for (let i = 0; i < 2400; i++) {
    const fx = rng() * 256;
    const fy = rng() * 256;
    x.strokeStyle = rng() < 0.5 ? 'rgba(42,28,16,0.45)' : 'rgba(168,136,92,0.34)';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(fx, fy);
    x.lineTo(fx + (rng() - 0.5) * 6, fy + 4 + rng() * 6);
    x.stroke();
  }
  // Exposed dark tears & oil stains
  blotches(x, 256, 256, 18, rng, 'rgba(22,15,10,1)', 0.44, 12, 46);
  // Stitched seam line
  x.strokeStyle = 'rgba(24,16,10,0.85)';
  x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.stroke();
  for (let sy = 8; sy < 256; sy += 14) {
    x.beginPath(); x.moveTo(121, sy); x.lineTo(135, sy); x.stroke();
  }
  return c;
}

export function genPorcelainCrackCanvas(seed = 111) {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(seed);
  x.fillStyle = '#c4c2b8';
  x.fillRect(0, 0, 256, 256);
  blotches(x, 256, 256, 12, rng, 'rgba(92,88,78,1)', 0.16, 16, 60);
  speckle(x, 256, 256, 1800, rng, ['#44423b', '#f2f0e6'], 0.06);
  cracks(x, 256, 256, 11, rng, 'rgba(30,28,24,0.65)');
  return c;
}

export function genFaceCanvas(kind) {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(kind.length * 131 + 19);
  x.clearRect(0, 0, 256, 256);

  const hollowEye = (cx, cy, rx, ry, iris = null) => {
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, rx * 1.45);
    g.addColorStop(0, 'rgba(4,4,6,0.98)');
    g.addColorStop(0.65, 'rgba(12,10,12,0.82)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(cx, cy, rx * 1.45, ry * 1.45, 0, 0, Math.PI * 2); x.fill();
    if (iris) {
      x.fillStyle = iris;
      x.beginPath(); x.arc(cx, cy, Math.max(3, rx * 0.22), 0, Math.PI * 2); x.fill();
    }
  };

  if (kind === 'twins') {
    hollowEye(92, 108, 17, 15, '#c8d2d8');
    hollowEye(164, 108, 17, 15, '#c8d2d8');
    x.strokeStyle = 'rgba(20,16,18,0.82)';
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(106, 166); x.lineTo(150, 166); x.stroke();
  } else if (kind === 'woman' || kind === 'hatch') {
    hollowEye(90, 106, 20, 18, '#b8c4cc');
    hollowEye(166, 106, 20, 18, '#b8c4cc');
    x.fillStyle = 'rgba(8,6,8,0.92)';
    x.beginPath(); x.ellipse(128, 176, 18, 28, 0, 0, Math.PI * 2); x.fill();
  } else if (kind === 'exit_charger') {
    hollowEye(92, 102, 22, 16, '#dbe5ec');
    hollowEye(164, 102, 22, 16, '#dbe5ec');
    x.fillStyle = 'rgba(8,6,6,0.95)';
    x.beginPath(); x.ellipse(128, 172, 34, 20, 0, 0, Math.PI * 2); x.fill();
  } else if (kind === 'crawler') {
    // Reflective pale-green tapetum eyes for night-vision room
    hollowEye(86, 102, 22, 18, '#c8ffba');
    hollowEye(170, 102, 22, 18, '#c8ffba');
    x.fillStyle = 'rgba(6,8,6,0.96)';
    x.beginPath(); x.ellipse(128, 168, 42, 26, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#c8c4b4';
    for (let i = 0; i < 7; i++) {
      x.fillRect(94 + i * 10, 154, 5, 11);
    }
  } else if (kind === 'mascot') {
    // Huge dead button/socket eyes + chipped grin
    hollowEye(82, 92, 28, 30, '#e8e0b8');
    hollowEye(174, 96, 26, 28, '#e8e0b8');
    x.fillStyle = '#120c08';
    x.beginPath(); x.ellipse(128, 174, 54, 30, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#d4c9a8';
    for (let i = 0; i < 6; i++) {
      x.fillRect(82 + i * 16, 152, 11, 16);
    }
  } else if (kind === 'doorway_eyes') {
    // Pure black void face + two piercing pale eyes
    x.fillStyle = '#030304';
    x.fillRect(0, 0, 256, 256);
    for (const ex of [92, 164]) {
      const g = x.createRadialGradient(ex, 112, 2, ex, 112, 22);
      g.addColorStop(0, 'rgba(242,250,255,1)');
      g.addColorStop(0.35, 'rgba(188,216,232,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(ex, 112, 22, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff';
      x.beginPath(); x.arc(ex, 112, 6, 0, Math.PI * 2); x.fill();
    }
  } else if (kind === 'tall') {
    hollowEye(96, 88, 18, 28, '#9aa6b0');
    hollowEye(160, 88, 18, 28, '#9aa6b0');
    // Gaunt sunken gaping mouth slit (unsettling, not cartoon smile)
    x.fillStyle = 'rgba(6,5,7,0.96)';
    x.beginPath();
    x.ellipse(128, 174, 24, 42, 0, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = 'rgba(20,18,22,0.75)';
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(86, 152); x.lineTo(106, 170); x.moveTo(170, 152); x.lineTo(150, 170); x.stroke();
  } else if (kind === 'eye_shadow') {
    // Single central luminous cyclops eye
    x.fillStyle = '#030304';
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#eef4ff';
    x.beginPath(); x.ellipse(128, 128, 74, 42, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#07080c';
    x.beginPath(); x.arc(128, 128, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff';
    x.beginPath(); x.arc(118, 118, 6, 0, Math.PI * 2); x.fill();
  } else if (kind === 'decoy') {
    // Frightened human face (clear eyebrows, normal whites, open shouting mouth)
    for (const ex of [94, 162]) {
      x.fillStyle = '#e8e4dc';
      x.beginPath(); x.ellipse(ex, 108, 14, 10, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1b1d22';
      x.beginPath(); x.arc(ex, 108, 5.5, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = '#241e18';
    x.lineWidth = 5;
    x.beginPath(); x.moveTo(76, 88); x.lineTo(110, 82); x.stroke();
    x.beginPath(); x.moveTo(180, 88); x.lineTo(146, 82); x.stroke();
    x.fillStyle = '#3a1b1b';
    x.beginPath(); x.ellipse(128, 168, 20, 14, 0, 0, Math.PI * 2); x.fill();
  }
  speckle(x, 256, 256, 300, rng, ['#000'], 0.05);
  return c;
}

// ================================================================
// 3. CACHED TEXTURE + MATERIAL BANK (zero duplicate allocations)
// ================================================================

export function createNeonTextureBank() {
  const texCache = new Map();
  const matCache = new Map();

  function getTex(key, factory, rx = 1, ry = 1, clampEdge = false) {
    const fullKey = `${key}:${rx}x${ry}:${clampEdge ? 1 : 0}`;
    if (!texCache.has(fullKey)) {
      texCache.set(fullKey, makeCanvasTexture(factory(), rx, ry, clampEdge));
    }
    return texCache.get(fullKey);
  }

  function getMat(key, factory) {
    if (!matCache.has(key)) matCache.set(key, factory());
    return matCache.get(key);
  }

  return {
    getTex,
    getMat,
    // Architectural room variants (ready for Moth's 12 rooms)
    roomWall(variant, rx = 3, ry = 1) {
      return getMat(`wall:${variant}:${rx}x${ry}`, () => {
        const map = {
          peelingPlaster: () => genPeelingPlasterCanvas(101),
          charredConcrete: () => genCharredConcreteCanvas(303),
          nvClinicalTile: () => genNvClinicalTileCanvas(404),
          moldDrywall: () => genMoldDrywallCanvas(505),
          rustHatchMetal: () => genRustHatchCanvas(606),
          scuffedLinoleum: () => genScuffedLinoleumCanvas(707),
          splinterTimber: () => genSplinterTimberCanvas(808),
          tallIndustrialWall: () => genTallIndustrialWallCanvas(909),
          watchingWallpaper: () => genWatchingWallpaperCanvas(1010),
          crackedStoragePlaster: () => genPeelingPlasterCanvas(1111, '#686962'),
          yellowWallpaper: () => genYellowWallpaperCanvas(1212),
          acousticCeiling: () => genAcousticCeilingCanvas(1213),
          dampCarpet: () => genDampCarpetCanvas(1214),
        }[variant] || (() => genPeelingPlasterCanvas(101));
        return new THREE.MeshStandardMaterial({
          map: getTex(`arch:${variant}`, map, rx, ry),
          roughness: variant === 'rustHatchMetal' ? 0.62 : (variant === 'nvClinicalTile' ? 0.72 : 0.95),
          metalness: variant === 'rustHatchMetal' ? 0.52 : 0.04,
        });
      });
    },
    // Figure materials
    skin: (id = 'pale', tone = '#b9afa2', seed = 41) =>
      getMat(`skin:${id}`, () => new THREE.MeshStandardMaterial({
        map: getTex(`skin:${id}`, () => genSkinCanvas(seed, tone)),
        roughness: 0.86,
      })),
    dress: (id, base, seed, pleats = true) =>
      getMat(`dress:${id}`, () => new THREE.MeshStandardMaterial({
        map: getTex(`dress:${id}`, () => genDressFabricCanvas(seed, base, pleats)),
        roughness: 0.95,
      })),
    mascotPlush: () =>
      getMat('mascotPlush', () => new THREE.MeshStandardMaterial({
        map: getTex('mascotPlush', () => genMascotPlushCanvas(77)),
        roughness: 0.92,
      })),
    porcelain: () =>
      getMat('porcelain', () => new THREE.MeshStandardMaterial({
        map: getTex('porcelain', () => genPorcelainCrackCanvas(111)),
        roughness: 0.42,
        metalness: 0.08,
      })),
    face: (kind, emissive = false) =>
      getMat(`face:${kind}:${emissive ? 1 : 0}`, () => {
        const map = getTex(`face:${kind}`, () => genFaceCanvas(kind), 1, 1, true);
        if (emissive) {
          return new THREE.MeshBasicMaterial({ map, transparent: true });
        }
        return new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.88 });
      }),
    stats() {
      return { textures: texCache.size, materials: matCache.size };
    },
  };
}
