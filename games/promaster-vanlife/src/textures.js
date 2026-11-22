// PROMASTER 50 — Seeded Procedural PBR Texture Bank (Zero External Network Images)
import * as THREE from '../three.module.js';

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

function makeTex(canvas, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

function addNoise(x, w, h, n, rng, cols, aMax) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[(rng() * cols.length) | 0];
    x.globalAlpha = rng() * aMax;
    x.fillRect(rng() * w, rng() * h, 1 + rng() * 2.2, 1 + rng() * 2.2);
  }
  x.globalAlpha = 1;
}

// ================================================================
// VAN & BUILDOUT CANVAS TEXTURES
// ================================================================
function cargoSteelCanvas() {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(101);
  x.fillStyle = '#c8cfd6';
  x.fillRect(0, 0, 512, 512);
  for (let px = 0; px < 512; px += 32) {
    const g = x.createLinearGradient(px, 0, px + 32, 0);
    g.addColorStop(0, '#9fa8b2');
    g.addColorStop(0.25, '#dfe5eb');
    g.addColorStop(0.5, '#d5dce3');
    g.addColorStop(0.75, '#8e98a3');
    g.addColorStop(1, '#c5ccd4');
    x.fillStyle = g;
    x.fillRect(px, 0, 32, 512);
  }
  addNoise(x, 512, 512, 4200, rng, ['#ffffff', '#4a525d', '#7c8590'], 0.08);
  return c;
}

function kilmatCanvas() {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(102);
  x.fillStyle = '#c7ced6';
  x.fillRect(0, 0, 256, 256);
  const step = 16;
  for (let y = -step; y < 256 + step; y += step) {
    for (let px = -step; px < 256 + step; px += step) {
      x.strokeStyle = 'rgba(70,78,90,0.52)';
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(px + step * 0.5, y);
      x.lineTo(px + step, y + step * 0.5);
      x.lineTo(px + step * 0.5, y + step);
      x.lineTo(px, y + step * 0.5);
      x.closePath();
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.22)';
      x.beginPath();
      x.arc(px + step * 0.5, y + step * 0.5, 2.2, 0, Math.PI * 2);
      x.fill();
    }
  }
  x.strokeStyle = 'rgba(25,28,34,0.65)';
  x.font = 'bold 14px ui-monospace, monospace';
  x.fillStyle = 'rgba(30,36,44,0.42)';
  x.fillText('KILMAT 80 MIL', 14, 40);
  x.fillText('KILMAT 80 MIL', 124, 168);
  addNoise(x, 256, 256, 1200, rng, ['#fff', '#666'], 0.06);
  return c;
}

function xpsFoamCanvas() {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(103);
  x.fillStyle = '#d48ca8';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(130,60,92,0.36)';
  x.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
  }
  addNoise(x, 256, 256, 2200, rng, ['#ffffff', '#a05674'], 0.08);
  return c;
}

function thinsulateCanvas() {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(104);
  x.fillStyle = '#eceee8';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    x.strokeStyle = i % 3 ? 'rgba(210,214,205,0.55)' : 'rgba(255,255,255,0.75)';
    x.lineWidth = 1.2 + rng() * 1.8;
    const ax = rng() * 256, ay = rng() * 256;
    x.beginPath();
    x.moveTo(ax, ay);
    x.bezierCurveTo(ax + (rng() - 0.5) * 34, ay + (rng() - 0.5) * 34, ax + (rng() - 0.5) * 34, ay + (rng() - 0.5) * 34, ax + (rng() - 0.5) * 44, ay + (rng() - 0.5) * 44);
    x.stroke();
  }
  x.fillStyle = '#2d353c';
  x.fillRect(0, 0, 256, 16);
  return c;
}

function woodPlanksCanvas(seed, baseCols, plankH, grainCol, grooveCol) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(seed);
  const rows = Math.round(512 / plankH);
  for (let r = 0; r < rows; r++) {
    const y0 = r * plankH;
    const joint = ((r * 197 + 64) % 340) + 80;
    for (const [segX, segW] of [[0, joint], [joint, 512 - joint]]) {
      x.fillStyle = baseCols[(rng() * baseCols.length) | 0];
      x.fillRect(segX, y0, segW, plankH);
      // Organic grain waves
      for (let g = 0; g < 18; g++) {
        x.strokeStyle = grainCol;
        x.globalAlpha = 0.08 + rng() * 0.16;
        x.lineWidth = 0.8 + rng() * 1.6;
        const gy = y0 + 2 + rng() * (plankH - 4);
        x.beginPath();
        x.moveTo(segX, gy);
        x.bezierCurveTo(segX + segW * 0.35, gy + (rng() - 0.5) * 5, segX + segW * 0.7, gy + (rng() - 0.5) * 5, segX + segW, gy);
        x.stroke();
      }
      x.globalAlpha = 1;
    }
    x.fillStyle = grooveCol;
    x.fillRect(0, y0, 512, 2);
    x.fillRect(joint, y0, 2, plankH);
  }
  addNoise(x, 512, 512, 1800, rng, ['#000', '#fff'], 0.03);
  return c;
}

function birchPlyCanvas() {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(107);
  x.fillStyle = '#e2cfa8';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 65; i++) {
    x.strokeStyle = i % 2 ? 'rgba(176,142,92,0.18)' : 'rgba(252,240,215,0.22)';
    x.lineWidth = 1.2 + rng() * 2.5;
    const gy = rng() * 512;
    x.beginPath();
    x.moveTo(0, gy);
    x.bezierCurveTo(170, gy + (rng() - 0.5) * 18, 340, gy + (rng() - 0.5) * 18, 512, gy);
    x.stroke();
  }
  addNoise(x, 512, 512, 1600, rng, ['#b38f5b', '#f8ebd1'], 0.05);
  return c;
}

function butcherBlockCanvas() {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(109);
  const staveH = 32;
  const cols = ['#b8834b', '#a8723c', '#c6935a', '#986332', '#be8b51'];
  for (let y = 0; y < 512; y += staveH) {
    let px = 0;
    while (px < 512) {
      const w = 90 + rng() * 140;
      x.fillStyle = cols[(rng() * cols.length) | 0];
      x.fillRect(px, y, w, staveH);
      x.strokeStyle = 'rgba(72,42,16,0.28)';
      x.lineWidth = 1.5;
      x.strokeRect(px, y, w, staveH);
      for (let g = 0; g < 6; g++) {
        x.strokeStyle = 'rgba(74,40,14,0.16)';
        x.beginPath();
        x.moveTo(px, y + rng() * staveH);
        x.lineTo(px + w, y + rng() * staveH);
        x.stroke();
      }
      px += w;
    }
  }
  return c;
}

function plaidBlanketCanvas() {
  const [c, x] = cnv(256, 256);
  const rng = mulberry32(110);
  x.fillStyle = '#3b4a42';
  x.fillRect(0, 0, 256, 256);
  // Warm rust & cream woven plaid checks
  x.fillStyle = 'rgba(176, 86, 48, 0.55)';
  for (let i = 0; i < 256; i += 64) {
    x.fillRect(i, 0, 22, 256);
    x.fillRect(0, i, 256, 22);
  }
  x.fillStyle = 'rgba(242, 226, 198, 0.35)';
  for (let i = 32; i < 256; i += 64) {
    x.fillRect(i, 0, 6, 256);
    x.fillRect(0, i, 256, 6);
  }
  addNoise(x, 256, 256, 4000, rng, ['#1d2420', '#fff5e4'], 0.08);
  return c;
}

function solarCellCanvas() {
  const [c, x] = cnv(512, 512);
  x.fillStyle = '#0c1b36';
  x.fillRect(0, 0, 512, 512);
  // Aluminum border frame
  x.strokeStyle = '#c4cbd4';
  x.lineWidth = 16;
  x.strokeRect(8, 8, 496, 496);
  // Monocrystalline silicon cells (6x6 grid with chamfered corners + silver busbars)
  const cols = 6, rows = 6;
  const pad = 22;
  const cw = (512 - pad * 2) / cols;
  const ch = (512 - pad * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x0 = pad + col * cw + 3;
      const y0 = pad + r * ch + 3;
      const g = x.createLinearGradient(x0, y0, x0 + cw, y0 + ch);
      g.addColorStop(0, '#0f2752');
      g.addColorStop(0.5, '#133166');
      g.addColorStop(1, '#0b1e42');
      x.fillStyle = g;
      x.fillRect(x0, y0, cw - 6, ch - 6);
      // Thin silver collector busbars
      x.fillStyle = 'rgba(205,222,240,0.45)';
      x.fillRect(x0 + (cw - 6) * 0.28, y0, 1.5, ch - 6);
      x.fillRect(x0 + (cw - 6) * 0.72, y0, 1.5, ch - 6);
    }
  }
  return c;
}

function ko2TreadCanvas() {
  const [c, x] = cnv(256, 256);
  x.fillStyle = '#1b1d20';
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#2d3138';
  for (let y = 0; y < 256; y += 32) {
    x.fillRect(14, y + 4, 52, 20);
    x.fillRect(190, y + 12, 52, 20);
    x.fillRect(82, y + 6, 40, 18);
    x.fillRect(134, y + 18, 40, 18);
  }
  return c;
}

function victronPanelCanvas() {
  const [c, x] = cnv(256, 256);
  x.fillStyle = '#0c5da5';
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#093f73';
  x.fillRect(16, 16, 224, 54);
  x.fillStyle = '#ffffff';
  x.font = 'bold 20px system-ui, sans-serif';
  x.fillText('VICTRON', 26, 48);
  x.font = 'bold 12px ui-monospace, monospace';
  x.fillStyle = '#a6d8ff';
  x.fillText('MULTIPLUS 12/3000', 26, 98);
  // Green & amber status LEDs
  x.fillStyle = '#3eff8b';
  x.beginPath(); x.arc(40, 146, 6, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#ffd152';
  x.beginPath(); x.arc(70, 146, 6, 0, Math.PI * 2); x.fill();
  // Vent louvers
  x.fillStyle = '#06284a';
  for (let y = 176; y < 236; y += 12) x.fillRect(26, y, 204, 6);
  return c;
}

function garageConcreteCanvas() {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(202);
  x.fillStyle = '#5a5f66';
  x.fillRect(0, 0, 512, 512);
  addNoise(x, 512, 512, 9500, rng, ['#3d4147', '#7b8088', '#2a2d32', '#959ba3'], 0.12);
  x.strokeStyle = 'rgba(32,35,40,0.45)';
  x.lineWidth = 3;
  x.strokeRect(0, 0, 512, 512);
  x.beginPath(); x.moveTo(256, 0); x.lineTo(256, 512); x.stroke();
  x.beginPath(); x.moveTo(0, 256); x.lineTo(512, 256); x.stroke();
  return c;
}

function pegboardCanvas() {
  const [c, x] = cnv(256, 256);
  x.fillStyle = '#8b6844';
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#241a10';
  for (let y = 16; y < 256; y += 24) {
    for (let px = 16; px < 256; px += 24) {
      x.beginPath(); x.arc(px, y, 3.2, 0, Math.PI * 2); x.fill();
    }
  }
  return c;
}

function terrainCanvas(biome) {
  const [c, x] = cnv(512, 512);
  const rng = mulberry32(biome.length * 137 + 9);
  const palettes = {
    alpine_bear:      { base: '#3d4a2d', specks: ['#252e1b', '#5d6b44', '#7a6345', '#1d2216'] },
    red_rock:         { base: '#9d4c31', specks: ['#75341f', '#bd6846', '#592717', '#d18460'] },
    coastal_cliff:    { base: '#4c5f3b', specks: ['#313d25', '#768068', '#998e75', '#2a3320'] },
    forest_lake:      { base: '#44522f', specks: ['#29331c', '#637244', '#70583c', '#1e2415'] },
    prairie_badlands: { base: '#87784c', specks: ['#665937', '#a89763', '#524629', '#c2b07d'] },
    tropical_palms:   { base: '#d9c496', specks: ['#bfa778', '#ede0be', '#99855c', '#f5ecd2'] },
    tundra_aurora:    { base: '#8fa0a8', specks: ['#55646c', '#dfe8ec', '#404a4f', '#ffffff'] },
  };
  const pal = palettes[biome] || palettes.alpine_bear;
  x.fillStyle = pal.base;
  x.fillRect(0, 0, 512, 512);
  addNoise(x, 512, 512, 12000, rng, pal.specks, 0.16);
  return c;
}

// ================================================================
// CACHED TEXTURE & MATERIAL BANK EXPORT
// ================================================================
export function createVanTextureBank() {
  const cache = new Map();
  function tex(key, fn, rx = 1, ry = 1) {
    const k = `${key}:${rx}x${ry}`;
    if (!cache.has(k)) cache.set(k, makeTex(fn(), rx, ry, true));
    return cache.get(k);
  }

  return {
    cargoSteel: (rx = 2, ry = 2) => tex('cargoSteel', cargoSteelCanvas, rx, ry),
    kilmat: (rx = 2, ry = 2) => tex('kilmat', kilmatCanvas, rx, ry),
    xpsFoam: (rx = 2, ry = 2) => tex('xpsFoam', xpsFoamCanvas, rx, ry),
    thinsulate: (rx = 2, ry = 2) => tex('thinsulate', thinsulateCanvas, rx, ry),
    lvpOak: (rx = 2, ry = 3) => tex('lvpOak', () => woodPlanksCanvas(105, ['#b99364', '#ad8656', '#c59f70', '#9f794b'], 42, '#5a3d1c', 'rgba(40,26,12,0.55)'), rx, ry),
    birchPly: (rx = 1, ry = 1) => tex('birchPly', birchPlyCanvas, rx, ry),
    shiplap: (rx = 3, ry = 2) => tex('shiplap', () => woodPlanksCanvas(106, ['#f3f1ec', '#eceae4', '#f7f5f0'], 64, '#c7c2b6', 'rgba(85,82,76,0.45)'), rx, ry),
    cedarCeiling: (rx = 2, ry = 3) => tex('cedarCeiling', () => woodPlanksCanvas(108, ['#a85f36', '#944f2a', '#b86d42', '#7d4120'], 42, '#3d1b0a', 'rgba(42,18,6,0.65)'), rx, ry),
    butcherBlock: (rx = 1, ry = 2) => tex('butcherBlock', butcherBlockCanvas, rx, ry),
    bedPlaid: (rx = 2, ry = 2) => tex('bedPlaid', plaidBlanketCanvas, rx, ry),
    solarCell: () => tex('solarCell', solarCellCanvas, 1, 1),
    ko2Tread: () => tex('ko2Tread', ko2TreadCanvas, 4, 1),
    victronBlue: () => tex('victronBlue', victronPanelCanvas, 1, 1),
    garageConcrete: (rx = 6, ry = 6) => tex('garageConcrete', garageConcreteCanvas, rx, ry),
    pegboard: (rx = 2, ry = 1) => tex('pegboard', pegboardCanvas, rx, ry),
    terrainTex: (biome, rx = 18, ry = 18) => tex(`terrain_${biome}`, () => terrainCanvas(biome), rx, ry),
  };
}
