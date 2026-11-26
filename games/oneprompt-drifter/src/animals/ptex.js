// ptex.js — feather bump texture for the pelican, ported from the
// pelican-bike game's textures.js (makeCanvas/toTexture inlined).
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

export function makeFeatherTexture() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  const rows = 16;
  const cols = 12;
  const rw = S / cols;
  const rh = S / rows;
  for (let r = rows + 1; r >= -1; r--) {
    for (let k = -1; k <= cols; k++) {
      const x = k * rw + (r % 2 ? rw / 2 : 0);
      const y = r * rh;
      const g = ctx.createRadialGradient(x, y - rh * 0.4, rh * 0.1, x, y - rh * 0.4, rw * 0.75);
      g.addColorStop(0, '#d8d8d8');
      g.addColorStop(0.75, '#9a9a9a');
      g.addColorStop(1, '#505050');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y - rh * 0.2, rw * 0.62, rh * 1.05, 0, 0, Math.PI);
      ctx.fill();
      // feather shaft
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - rh * 0.2);
      ctx.lineTo(x, y + rh * 0.75);
      ctx.stroke();
    }
  }
  return toTexture(c, { srgb: false });
}
