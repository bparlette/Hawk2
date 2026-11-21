// Hawk2 shared paint2d — top-down painters that make flat map data read as 3D, Palm City style.
// First built for Scaggsville / College Park (laurel-fulton/src/lf_ground.js). Pure canvas 2D, no deps.
//
//   paintRoof(g, f, i, { sunX, sunY, rng })   one building footprint f = [x0,y0,x1,y1,...] (world units),
//       i = a stable per-building integer (seeds colour/variation). Pitched gable/hip roof with sun-lit and
//       shaded facets, shingle courses, ridge caps, chimney, swept cast shadow down-sun. Footprints over
//       15000 units^2 get a flat membrane roof with rooftop units instead.
//   paintCanopy(g, gf, { ox, oy, size, sunX, sunY })   a woods polygon gf (same flat format) as dense tree
//       crowns clipped to it: floor shade, crown shadows, three tones, sunlit rim. Crowns are seeded per
//       world cell, so painting chunk by chunk (ox, oy = chunk origin, size = chunk size) has no seams.
//
// Units: tuned for ~5 world units per metre (houses ~50-70 units across). Scale `hgt` / crown sizes for other maps.

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function poly(g, f) { g.beginPath(); g.moveTo(f[0], f[1]); for (let k = 2; k < f.length; k += 2) g.lineTo(f[k], f[k + 1]); g.closePath(); }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c[0]},${c[1]},${c[2]})`; };
export const SHINGLE = ['#5f646c', '#72767d', '#7d7368', '#6b5f55', '#4c5158', '#86817a', '#5f6c78', '#7a5246', '#8a8f95', '#6e5a4c', '#94897a', '#556170'];

export function paintRoof(g, f, i, o = {}) {
  const SUNX = o.sunX ?? 0.8, SUNY = o.sunY ?? -0.3, LX = -SUNX, LY = -SUNY, r = o.rng || mulberry32(i * 977 + 3);
        const n = f.length / 2;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, mx = 0, my = 0, best = 0, ux = 1, uy = 0, area = 0;
  for (let k = 0; k < n; k++) { const ax = f[k * 2], ay = f[k * 2 + 1], bx = f[((k + 1) % n) * 2], by = f[((k + 1) % n) * 2 + 1];
    x0 = Math.min(x0, ax); x1 = Math.max(x1, ax); y0 = Math.min(y0, ay); y1 = Math.max(y1, ay); mx += ax; my += ay; area += ax * by - bx * ay;
    const L = Math.hypot(bx - ax, by - ay); if (L > best) { best = L; ux = (bx - ax) / L; uy = (by - ay) / L; } }
  mx /= n; my /= n; area = Math.abs(area) / 2;
  const vx = -uy, vy = ux;                         // across the ridge
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (let k = 0; k < n; k++) { const dx = f[k * 2] - mx, dy = f[k * 2 + 1] - my, uu = dx * ux + dy * uy, vv = dx * vx + dy * vy; u0 = Math.min(u0, uu); u1 = Math.max(u1, uu); v0 = Math.min(v0, vv); v1 = Math.max(v1, vv); }
  const flat = area > 15000, span = v1 - v0, len = u1 - u0;
  const hgt = flat ? 34 : 30 + (i % 3) * 4;         // world units (~5 per m): 2-storey eaves + roof
  // swept cast shadow: the footprint dragged down-sun (soft far end, dense contact)
  g.fillStyle = '#0c111c';
  for (let s2 = 4; s2 >= 1; s2--) { g.globalAlpha = 0.10 + (4 - s2) * 0.05; g.save(); g.translate(SUNX * hgt * s2 / 4, SUNY * hgt * s2 / 4); poly(g, f); g.fill(); g.restore(); }
  g.globalAlpha = 0.34; g.lineWidth = 3.0; g.strokeStyle = '#0c1018'; poly(g, f); g.stroke();
  const base = flat ? ['#5f646c', '#6a6e74', '#575c64', '#707378'][i % 4] : SHINGLE[(i * 7 + (o.salt || 0)) % SHINGLE.length];
  g.globalAlpha = 1; g.fillStyle = base; poly(g, f); g.fill();
  g.save(); poly(g, f); g.clip();
  if (flat) {                                        // membrane roof: seams, coping, rooftop units
    g.globalAlpha = 0.16; g.strokeStyle = '#1d222c'; g.lineWidth = 0.9; g.beginPath();
    for (let t = u0 + 9; t < u1; t += 11) { g.moveTo(mx + ux * t + vx * v0, my + uy * t + vy * v0); g.lineTo(mx + ux * t + vx * v1, my + uy * t + vy * v1); }
    g.stroke();
    const units = Math.min(5, Math.floor(area / 6000));
    for (let k = 0; k < units; k++) { const hx = mx + ux * (u0 + len * (0.2 + 0.6 * r())) + vx * (v0 + span * (0.25 + 0.5 * r())), hy = my + uy * (u0 + len * (0.2 + 0.6 * r())) + vy * (v0 + span * (0.25 + 0.5 * r()));
      g.globalAlpha = 0.5; g.fillStyle = '#1b2029'; g.fillRect(hx - 5 + SUNX * 4, hy - 4 + SUNY * 4, 12, 10);
      g.globalAlpha = 0.9; g.fillStyle = '#9aa2ac'; g.fillRect(hx - 6, hy - 5, 11, 9); g.fillStyle = '#c4cbd3'; g.fillRect(hx - 6, hy - 5, 11, 2.5); }
  } else {
    const hip = len < span * 1.3;                    // near-square: four-facet hip roof
    const facets = [];                               // [polygon pts, outward normal (plan)]
    const P = (uu, vv) => [mx + ux * uu + vx * vv, my + uy * uu + vy * vv];
    const vm = (v0 + v1) / 2, pad = 8;
    if (hip) {
      const r0 = u0 + span / 2, r1 = Math.max(r0 + 0.1, u1 - span / 2), mid0 = Math.min(r0, (u0 + u1) / 2), mid1 = Math.max(r1, (u0 + u1) / 2);
      facets.push([[P(u0 - pad, v0 - pad), P(u1 + pad, v0 - pad), P(mid1, vm), P(mid0, vm)], [-vx, -vy]]);
      facets.push([[P(u0 - pad, v1 + pad), P(u1 + pad, v1 + pad), P(mid1, vm), P(mid0, vm)], [vx, vy]]);
      facets.push([[P(u0 - pad, v0 - pad), P(u0 - pad, v1 + pad), P(mid0, vm)], [-ux, -uy]]);
      facets.push([[P(u1 + pad, v0 - pad), P(u1 + pad, v1 + pad), P(mid1, vm)], [ux, uy]]);
    } else {
      facets.push([[P(u0 - pad, v0 - pad), P(u1 + pad, v0 - pad), P(u1 + pad, vm), P(u0 - pad, vm)], [-vx, -vy]]);
      facets.push([[P(u0 - pad, vm), P(u1 + pad, vm), P(u1 + pad, v1 + pad), P(u0 - pad, v1 + pad)], [vx, vy]]);
    }
    for (const [pts, nrm] of facets) {
      const lit = nrm[0] * LX + nrm[1] * LY;          // -1 .. 1: facing the sun or away
      g.globalAlpha = 1; g.fillStyle = shade(base, 1 + 0.34 * lit);
      g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    }
    // shingle courses parallel to the eaves (both slopes), fading toward the ridge
    g.lineWidth = 0.8; g.strokeStyle = '#141820';
    for (let t = 3; t < span / 2; t += 3.4) { g.globalAlpha = 0.10 + 0.08 * (1 - t / (span / 2));
      for (const sd of [-1, 1]) { const vv = vm + sd * (span / 2 - t); const a0 = P(u0 - pad, vv), a1 = P(u1 + pad, vv); g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke(); } }
    // weathering streaks + moss on the shaded slope
    const wr = mulberry32(i * 2654435761);
    for (let k = 0; k < 6; k++) { const p = P(u0 + len * wr(), v0 + span * wr()); g.globalAlpha = 0.05 + wr() * 0.06; g.fillStyle = wr() < 0.5 ? '#2a3326' : '#0f1217'; g.beginPath(); g.ellipse(p[0], p[1], 4 + wr() * 8, 2 + wr() * 4, Math.atan2(uy, ux), 0, Math.PI * 2); g.fill(); }
    // ridge cap(s)
    g.globalAlpha = 0.55; g.strokeStyle = shade(base, 1.45); g.lineWidth = 1.6; g.beginPath();
    if (hip) { const r0 = u0 + span / 2, r1 = Math.max(r0 + 0.1, u1 - span / 2), mid0 = Math.min(r0, (u0 + u1) / 2), mid1 = Math.max(r1, (u0 + u1) / 2), A = P(mid0, vm), Bp = P(mid1, vm);
      g.moveTo(A[0], A[1]); g.lineTo(Bp[0], Bp[1]);
      for (const [c0, c1] of [[P(u0, v0), A], [P(u0, v1), A], [P(u1, v0), Bp], [P(u1, v1), Bp]]) { g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); } }
    else { const A = P(u0, vm), Bp = P(u1, vm); g.moveTo(A[0], A[1]); g.lineTo(Bp[0], Bp[1]); }
    g.stroke();
    // chimney on ~40%
    if ((i * 31) % 10 < 4) { const cpt = P(u0 + len * ((i % 2) ? 0.18 : 0.82), vm + span * 0.18);
      g.globalAlpha = 0.5; g.fillStyle = '#0d1118'; g.fillRect(cpt[0] - 2.5 + SUNX * 6, cpt[1] - 2.5 + SUNY * 6, 6, 6);
      g.globalAlpha = 1; g.fillStyle = '#7a4a3c'; g.fillRect(cpt[0] - 3, cpt[1] - 3, 6, 6); g.fillStyle = '#3a2620'; g.fillRect(cpt[0] - 1.5, cpt[1] - 1.5, 3, 3); }
  }
  g.restore();
  // eave line: dark under-edge + thin light fascia
  g.globalAlpha = 0.55; g.strokeStyle = '#151820'; g.lineWidth = 1.4; poly(g, f); g.stroke();
  g.globalAlpha = 0.35; g.strokeStyle = '#d6dbe2'; g.lineWidth = 0.7; poly(g, f); g.stroke();
}

export function paintCanopy(g, gf, o = {}) {
  const ox = o.ox ?? 0, oy = o.oy ?? 0, CHUNK = o.size ?? 256, SX = o.sunX ?? 0.8, SY = o.sunY ?? -0.3;
        g.save(); poly(g, gf); g.clip();
  g.globalAlpha = 0.55; g.fillStyle = '#1f3220'; g.fillRect(ox - 40, oy - 40, CHUNK + 80, CHUNK + 80);   // forest-floor shade
  const CELLW = 26, crowns = [];
  for (let ky = Math.floor((oy - 50) / CELLW); ky <= Math.floor((oy + CHUNK + 50) / CELLW); ky++)
    for (let kx = Math.floor((ox - 50) / CELLW); kx <= Math.floor((ox + CHUNK + 50) / CELLW); kx++) {
      const cr = mulberry32((kx * 73856093) ^ (ky * 19349663) ^ 0x7ee5);
      crowns.push([(kx + cr()) * CELLW, (ky + cr()) * CELLW, 17 + cr() * 14, cr(), cr()]);
    }
  g.fillStyle = '#0b130d';
  for (const [x, y, rr] of crowns) { g.globalAlpha = 0.30; g.beginPath(); g.arc(x + SX * rr * 0.7, y + SY * rr * 0.7, rr, 0, Math.PI * 2); g.fill(); }
  const TONES = ['#263f22', '#2f4b28', '#36552d', '#3d5f31', '#2a4426'];
  for (const [x, y, rr, t1] of crowns) { g.globalAlpha = 0.95; g.fillStyle = TONES[(t1 * TONES.length) | 0]; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
  for (const [x, y, rr, t1, t2] of crowns) {         // inner clumps + sunlit rim toward the light (-SUN)
    g.globalAlpha = 0.55; g.fillStyle = t2 < 0.5 ? '#4a6d3a' : '#557a40';
    g.beginPath(); g.arc(x - SX * rr * 0.32, y - SY * rr * 0.32, rr * 0.55, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.35; g.fillStyle = '#7f9a55';
    g.beginPath(); g.arc(x - SX * rr * 0.45, y - SY * rr * 0.45, rr * 0.28, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  g.globalAlpha = 0.35; g.strokeStyle = '#13200f'; g.lineWidth = 2.2; poly(g, gf); g.stroke();   // canopy edge shadow line
}
