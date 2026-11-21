// Scaggsville 3D — house cutaways / interiors (Lane B).
//
// ONE mechanism for every house: the DOLLHOUSE CUTAWAY. The 2D Scaggsville
// interiors are side-section designs (data/interiors/*.json, ported verbatim
// into ./interiors-data.js); this module extrudes that section into 3D —
// rooms along the back wall, front wall + roof clipped away, both/all floors
// always in frame, camera pans x to follow the hero and never follows
// vertically (INTERIOR-SPEC.md §1, the dollhouse rule).
//
// The stage is built on entry at the house's own (hx, hz), sunk to
// STAGE_Y under the map, and disposed on exit — interiors exist only for
// the house you're at; exterior shells are untouched. Inside, the hero is
// on foot: stick/WASD walks along the section, stick-up/down (or W/S) at a
// stair link changes floors, the door is the way out.
//
// Host contract (see index.html INTEGRATION NOTES):
//   const interiors = createInteriors({ scene, camera, stops, heroRow, surfaceAt });
//   interiors.tick(dt, { started, x, z, speed, steer, up, down }) -> bool active
//   interiors.enter(stopId) / interiors.exit() / interiors.active
//   interiors.partyAnchors(stopId) / interiors.stageOrigin(stopId)
//
// Party seam (night-party lane): partyAnchors() returns world-space
// standing points — `yard` (surface, around the house incl. Kosack's pool
// cluster) and `inside` (the design's party floor span, mapped into the
// stage's world transform). Inside points are only visible while the
// cutaway stage is built (a player has entered); stageOrigin() gives the
// transform so the party lane can pre-place its own crowd in stage space.
import * as THREE from 'three';
import { buildPerson, poseIdle, poseWalk } from '../../shared/people.js'; // Lane A fix: was '../shared/' (404, killed the whole module graph)
import { CREW_PEOPLE } from './crew.js';
import { HOUSE_INTERIORS, STOP_INTERIOR, DOOR_BEATS } from './interiors-data.js';

export const STAGE_Y = -42;              // stage origin height (under the map)
const DEPTH = 6.2;                       // stage depth (back wall .. open front)
const BACK_Z = -DEPTH / 2;               // back wall plane (local)
const WALL_FACE = BACK_Z + 0.08;         // inner face of the back wall
const LANE_Z = 1.15;                     // hero walking lane (local z)
const ENTER_RANGE = 19;                  // m from house point: GO IN prompt
const BEAT_RANGE = 24, BEAT_REARM = 48;  // door-mom beat trigger / re-arm

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function xf(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_v, _q, _s);
}

// merged vertex-coloured geometry bucket (same pattern as buildWorld.js)
class Bucket {
  constructor() { this.parts = []; }
  add(geo, matrix, hex) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(matrix);
    const n = g.attributes.position.count, arr = new Float32Array(n * 3), c = new THREE.Color(hex);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g);
  }
  build(material) {
    let total = 0; for (const g of this.parts) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3),
          uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
    let o = 0;
    for (const g of this.parts) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      col.set(g.attributes.color.array, o * 3);
      o += n; g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, material);
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const CYL6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const SPH = new THREE.SphereGeometry(0.5, 10, 8);
const ICO = new THREE.IcosahedronGeometry(0.5, 1);
const CIRC = new THREE.CircleGeometry(0.5, 24);
const PLANE = new THREE.PlaneGeometry(1, 1);

// ---------- canvas textures (labels, screens, pictures) ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function pillTexture(text) {
  const fs = 46, pad = 34;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = `700 ${fs}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  const tw = Math.ceil(meas.measureText(text).width);
  return canvasTex(tw + pad * 2, 76, (g, w, h) => {
    g.fillStyle = 'rgba(27,20,48,0.82)';
    g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 34); g.fill();
    g.font = `700 ${fs}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe4b0'; g.fillText(text, w / 2, h / 2 + 3);
  });
}
function screenTexture(title, sub, hue, bright) {
  return canvasTex(256, 176, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `hsl(${hue},60%,${bright ? 42 : 26}%)`); grad.addColorStop(1, `hsl(${hue + 40},60%,${bright ? 22 : 12}%)`);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.textAlign = 'center';
    g.fillStyle = '#ffe9a8'; g.font = '900 30px -apple-system, sans-serif';
    const words = title.split(' ');
    if (title.length > 12 && words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      g.fillText(words.slice(0, mid).join(' '), w / 2, h / 2 - 14);
      g.fillText(words.slice(mid).join(' '), w / 2, h / 2 + 24);
    } else g.fillText(title, w / 2, h / 2 + 4);
    if (sub) { g.fillStyle = '#9fd8ff'; g.font = '700 17px -apple-system, sans-serif'; g.fillText(sub, w / 2, h - 24); }
  });
}
function computerTexture(text) {
  return canvasTex(256, 200, (g, w, h) => {
    g.fillStyle = '#0d2b45'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#123a5c'; g.fillRect(0, 0, w, 26);
    g.fillStyle = '#ffd23f'; g.font = '900 44px -apple-system, sans-serif'; g.textAlign = 'center';
    g.fillText(text, w / 2, h / 2 + 6);
    g.fillStyle = '#7fb2d9'; g.font = '600 16px monospace'; g.textAlign = 'left';
    g.fillText('downloading...  62%', 18, h - 42);
    g.fillText('peers: 14   seeds: 3', 18, h - 18);
  });
}
function pictureTexture(kind) {
  if (kind === 'cheeseburger') {
    // Jason's basement set dressing (canon): a framed picture of a teacher
    // who looks like a cheeseburger.
    return canvasTex(220, 170, (g, w, h) => {
      g.fillStyle = '#d8cfb8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8a6a42'; g.fillRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#e8dcc0'; g.fillRect(22, 22, w - 44, h - 44);
      const cx = w / 2, cy = h / 2 + 6;
      g.fillStyle = '#e0a458'; g.beginPath(); g.ellipse(cx, cy - 26, 52, 24, 0, Math.PI, 0); g.fill();       // top bun
      g.fillStyle = '#7ec850'; g.fillRect(cx - 54, cy - 24, 108, 9);                                          // lettuce
      g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(cx - 52, cy - 14); g.lineTo(cx + 52, cy - 14); g.lineTo(cx, cy + 2); g.fill(); // cheese
      g.fillStyle = '#6e4a2f'; g.fillRect(cx - 52, cy - 2, 104, 13);                                          // patty
      g.fillStyle = '#e0a458'; g.beginPath(); g.ellipse(cx, cy + 22, 52, 15, 0, 0, Math.PI); g.fill();        // bottom bun
      g.fillStyle = '#26221e';                                                                                 // the teacher's eyes
      g.beginPath(); g.arc(cx - 17, cy - 30, 4.5, 0, 7); g.arc(cx + 17, cy - 30, 4.5, 0, 7); g.fill();
      g.strokeStyle = '#26221e'; g.lineWidth = 5;                                                              // glasses
      g.beginPath(); g.arc(cx - 17, cy - 30, 10, 0, 7); g.arc(cx + 17, cy - 30, 10, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(cx - 7, cy - 30); g.lineTo(cx + 7, cy - 30); g.stroke();
    });
  }
  return canvasTex(220, 170, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#a8c4de'); grad.addColorStop(0.62, '#e8d9a8'); grad.addColorStop(0.63, '#5d7a48'); grad.addColorStop(1, '#47603a');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4ead0'; g.beginPath(); g.arc(w * 0.78, h * 0.24, 15, 0, 7); g.fill();
  });
}
function marqueeTexture(text, bg) {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffe9a8'; g.font = '900 30px -apple-system, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// ---------- the stage builder ----------
const ARCADE_SKINS = ['#3a6ad0', '#c03a4a', '#3aa85e'];
const ARCADE_HUES = [222, 350, 145];

function buildStage(stop, data) {
  const group = new THREE.Group();
  group.position.set(stop.hx, STAGE_Y, stop.hz);
  group.name = 'interior-' + data.id;
  const W = data.width, ceil = data.ceiling;
  const lx = dx => dx - W / 2;
  const floors = {}; for (const f of data.floors) floors[f.id] = f;
  let topY = -Infinity, botY = Infinity;
  for (const f of data.floors) { topY = Math.max(topY, f.z + ceil); botY = Math.min(botY, f.z); }
  for (const r of data.rooms) if (r.h) topY = Math.max(topY, floors[r.floor].z + r.h);

  const std = new Bucket(), basic = new Bucket(), shad = new Bucket();
  const dyn = { screens: [], fires: [], mats: [], texs: [], lights: [] };
  const put = (geo, x, y, z, hex, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => std.add(geo, xf(x, y, z, rx, ry, rz, sx, sy, sz), hex);
  const putB = (geo, x, y, z, hex, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => basic.add(geo, xf(x, y, z, rx, ry, rz, sx, sy, sz), hex);
  const shadow = (x, y, z, r) => shad.add(CIRC, xf(x, y + 0.012, z, -Math.PI / 2, 0, 0, r * 2, r * 2, 1), 0x000000);
  const texMesh = (tex, w, h, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.set(rx, ry, 0);
    dyn.mats.push(m.material); dyn.texs.push(tex); group.add(m); return m;
  };

  // backdrop + earth block: seals the dollhouse so no sky/world leaks in
  {
    const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ color: 0x17141f, fog: false }));
    m.scale.set(W + 34, topY - botY + 26, 1); m.position.set(0, (topY + botY) / 2, BACK_Z - 5.5);
    dyn.mats.push(m.material); group.add(m);
    put(BOX, 0, botY - 1.65, 0, 0x2a2118, 0, 0, 0, W + 1.2, 3.3, DEPTH + 0.6);            // earth band under the lowest floor
    put(BOX, 0, topY + 0.35, 0, 0x241f2e, 0, 0, 0, W + 1.2, 0.7, DEPTH + 0.6);             // cut cap (roof clipped)
    put(BOX, -W / 2 - 0.3, (topY + botY) / 2, 0, 0x241f2e, 0, 0, 0, 0.6, topY - botY + 0.7, DEPTH + 0.6);
    put(BOX, W / 2 + 0.3, (topY + botY) / 2, 0, 0x241f2e, 0, 0, 0, 0.6, topY - botY + 0.7, DEPTH + 0.6);
  }

  // floors + room shells
  for (const f of data.floors) {
    put(BOX, lx((f.x0 + f.x1) / 2), f.z - 0.26, 0, 0x3a3230, 0, 0, 0, f.x1 - f.x0 + 0.3, 0.52, DEPTH); // slab (cut face)
    for (const r of data.rooms) {
      if (r.floor !== f.id) continue;
      const cx = lx((r.x0 + r.x1) / 2), wdt = r.x1 - r.x0, rh = r.h || ceil;
      put(BOX, cx, f.z - 0.015, 0, r.floorc, 0, 0, 0, wdt, 0.05, DEPTH);                        // floor surface in the room's floorc
      put(BOX, cx, f.z + rh / 2, BACK_Z + 0.04, r.wall, 0, 0, 0, wdt, rh, 0.16);                 // back wall in the room's wall colour
      put(BOX, cx, f.z + 0.09, WALL_FACE + 0.02, 0x2e2620, 0, 0, 0, wdt, 0.18, 0.05);            // baseboard
    }
    // room dividers (back portion only — the front stays open for the camera)
    const rs = data.rooms.filter(r => r.floor === f.id).sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < rs.length; i++) {
      const bx = lx(rs[i].x0), rh = rs[i].h || ceil;
      const c = new THREE.Color(rs[i].wall).multiplyScalar(0.82).getHex();
      put(BOX, bx, f.z + rh / 2, BACK_Z + 1.35, c, 0, 0, 0, 0.14, rh, 2.7);
    }
    // two warm lights per floor (quarter points) — one centre light left
    // the back-wall props at both ends crushed to black in the basement
    for (const fx of [0.28, 0.72]) {
      const pl = new THREE.PointLight(0xffc98a, 36, 14, 1.7);
      pl.position.set(lx(f.x0 + (f.x1 - f.x0) * fx), f.z + ceil - 0.35, 0.4);
      group.add(pl); dyn.lights.push(pl);
    }
  }

  // stairs at links (drawn from the lower floor, ascending toward the upper
  // floor's endpoint x) + a diagonal stringer
  for (const l of data.links) {
    const fa = floors[l.a], fb = floors[l.b];
    const lo = fa.z < fb.z ? { f: fa, x: l.ax } : { f: fb, x: l.bx };
    const hi = fa.z < fb.z ? { f: fb, x: l.bx } : { f: fa, x: l.ax };
    const dir = Math.sign(hi.x - lo.x) || 1, rise = hi.f.z - lo.f.z, n = 6;
    for (let i = 0; i < n; i++) {
      const sx = lo.x + dir * (0.25 + i * 0.34), sy = lo.f.z + (rise * (i + 1)) / n;
      put(BOX, lx(sx), sy - 0.05, -2.55, 0x8a6f4d, 0, 0, 0, 0.36, 0.1, 1.1);
    }
    const mx = (lo.x + hi.x) / 2;
    put(BOX, lx(mx), (lo.f.z + hi.f.z) / 2 + 0.55, -2.55, 0x6a5136, 0, 0, Math.atan2(rise, Math.abs(hi.x - lo.x) || 1) * dir, 0.07, 0.07, 1.1);
  }

  // front door (on the back wall) + exit ring on the floor
  {
    const df = floors[data.door.floor], dx = lx(data.door.x);
    put(BOX, dx, df.z + 1.06, WALL_FACE + 0.03, 0x7a4a30, 0, 0, 0, 1.0, 2.12, 0.07);
    put(BOX, dx, df.z + 2.2, WALL_FACE + 0.03, 0x5a3826, 0, 0, 0, 1.14, 0.12, 0.09);
    putB(CIRC, dx, df.z + 0.03, LANE_Z, 0xffd23f, -Math.PI / 2, 0, 0, 1.5, 1.5, 1);
  }

  // ---------------- props ----------------
  const couchCol = fl => fl === 'lower' ? 0x6e4a34 : 0x5d6a7a;
  function propZ(depth) { return WALL_FACE + depth / 2 + 0.02; }
  function buildProp(p) {
    const f = floors[p.floor], y0 = f.z, x = lx(p.x);
    switch (p.kind) {
      case 'couch': {
        const z = propZ(0.85), c = couchCol(p.floor);
        put(BOX, x, y0 + 0.26, z, c, 0, 0, 0, 1.9, 0.4, 0.85);
        put(BOX, x - 0.42, y0 + 0.52, z + 0.03, c, 0, 0, 0, 0.86, 0.14, 0.76);
        put(BOX, x + 0.42, y0 + 0.52, z + 0.03, c, 0, 0, 0, 0.86, 0.14, 0.76);
        put(BOX, x, y0 + 0.72, z - 0.32, c, 0, 0, 0, 1.9, 0.6, 0.22);
        put(BOX, x - 1.02, y0 + 0.5, z, c, 0, 0, 0, 0.22, 0.62, 0.85);
        put(BOX, x + 1.02, y0 + 0.5, z, c, 0, 0, 0, 0.22, 0.62, 0.85);
        shadow(x, y0, z + 0.4, 1.25); break;
      }
      case 'recliner': {
        const z = propZ(0.9), c = 0x7a5238;
        put(BOX, x, y0 + 0.24, z, c, 0, 0, 0, 0.98, 0.42, 0.9);
        put(BOX, x, y0 + 0.78, z - 0.34, c, -0.16, 0, 0, 0.98, 0.72, 0.24);
        put(BOX, x - 0.58, y0 + 0.48, z, c, 0, 0, 0, 0.2, 0.6, 0.9);
        put(BOX, x + 0.58, y0 + 0.48, z, c, 0, 0, 0, 0.2, 0.6, 0.9);
        put(BOX, x, y0 + 0.13, z + 0.55, c, 0.1, 0, 0, 0.9, 0.16, 0.42);
        shadow(x, y0, z + 0.4, 0.85); break;
      }
      case 'tv': {
        const z = propZ(0.42);
        put(BOX, x, y0 + 0.23, z, 0x2c2c32, 0, 0, 0, 1.24, 0.46, 0.42);
        put(BOX, x, y0 + 0.92, z, 0x1a1a20, -0.07, 0, 0, 1.3, 0.8, 0.08);
        const tex = screenTexture(p.label || 'CHANNEL 3', p.label ? 'GENESIS' : '', p.label ? 350 : 210);
        const sm = texMesh(tex, 1.16, 0.66, x, y0 + 0.92, z + 0.055, -0.07);
        dyn.screens.push({ mat: sm.material, seed: Math.random() * 9 });
        shadow(x, y0, z + 0.35, 0.85); break;
      }
      case 'speaker': {
        const z = propZ(0.36);
        put(BOX, x, y0 + 0.58, z, 0x1c1c22, 0, 0, 0, 0.37, 1.16, 0.36);
        put(CYL, x, y0 + 0.82, z + 0.19, 0x3d3d46, Math.PI / 2, 0, 0, 0.44, 0.05, 0.44);
        put(CYL, x, y0 + 0.34, z + 0.19, 0x3d3d46, Math.PI / 2, 0, 0, 0.24, 0.05, 0.24);
        shadow(x, y0, z + 0.3, 0.4); break;
      }
      case 'lamp': {
        const z = propZ(0.3);
        put(CYL, x, y0 + 0.02, z, 0x3a3a40, 0, 0, 0, 0.3, 0.04, 0.3);
        put(CYL, x, y0 + 0.78, z, 0x3a3a40, 0, 0, 0, 0.06, 1.5, 0.06);
        putB(CYL, x, y0 + 1.62, z, 0xffd9a0, 0, 0, 0, 0.42, 0.3, 0.42);
        break;
      }
      case 'cooler': {
        const z = propZ(0.46);
        put(BOX, x, y0 + 0.25, z, 0xd8402e, 0, 0, 0, 0.72, 0.5, 0.46);
        put(BOX, x, y0 + 0.55, z, 0xf2f0ea, 0, 0, 0, 0.76, 0.1, 0.5);
        shadow(x, y0, z + 0.3, 0.55); break;
      }
      case 'fridge': {
        const z = propZ(0.7);
        put(BOX, x, y0 + 0.9, z, 0xcfd4d8, 0, 0, 0, 0.82, 1.8, 0.7);
        put(BOX, x, y0 + 1.28, z + 0.36, 0x9aa0a4, 0, 0, 0, 0.82, 0.04, 0.02);
        put(BOX, x + 0.3, y0 + 1.0, z + 0.37, 0x7a8086, 0, 0, 0, 0.05, 0.5, 0.03);
        shadow(x, y0, z + 0.35, 0.6); break;
      }
      case 'table': {
        const z = propZ(0.8);
        put(BOX, x, y0 + 0.74, z, 0x7c5a34, 0, 0, 0, 1.4, 0.06, 0.8);
        put(BOX, x - 0.6, y0 + 0.37, z, 0x6a4a2a, 0, 0, 0, 0.09, 0.74, 0.7);
        put(BOX, x + 0.6, y0 + 0.37, z, 0x6a4a2a, 0, 0, 0, 0.09, 0.74, 0.7);
        shadow(x, y0, z + 0.3, 0.9); break;
      }
      case 'picture': {
        put(BOX, x, y0 + 1.62, WALL_FACE + 0.05, 0x6a4a2a, 0, 0, 0, 0.98, 0.76, 0.05);
        texMesh(pictureTexture(p.art), 0.86, 0.64, x, y0 + 1.62, WALL_FACE + 0.085);
        break;
      }
      case 'plant': {
        const z = propZ(0.34);
        put(CYL, x, y0 + 0.17, z, 0xa0522d, 0, 0, 0, 0.34, 0.34, 0.34);
        put(ICO, x, y0 + 0.72, z, 0x4a6b2f, 0, 0, 0, 0.62, 0.7, 0.62);
        put(ICO, x + 0.16, y0 + 0.55, z + 0.08, 0x557a35, 0, 0, 0, 0.4, 0.44, 0.4);
        shadow(x, y0, z + 0.25, 0.35); break;
      }
      case 'bed': {
        const z = WALL_FACE + 1.05;
        put(BOX, x, y0 + 0.55, WALL_FACE + 0.06, 0x6a5136, 0, 0, 0, 1.5, 1.1, 0.08);
        put(BOX, x, y0 + 0.16, z, 0x5a4632, 0, 0, 0, 1.5, 0.32, 2.05);
        put(BOX, x, y0 + 0.4, z, 0xd8d4c8, 0, 0, 0, 1.44, 0.18, 1.98);
        put(BOX, x, y0 + 0.47, z + 0.38, 0x44557a, 0, 0, 0, 1.46, 0.09, 1.15);
        put(BOX, x - 0.3, y0 + 0.53, z - 0.72, 0xf0ece2, 0, 0, 0, 0.62, 0.13, 0.4);
        shadow(x, y0, z + 0.6, 1.1); break;
      }
      case 'weights': {
        const z = propZ(0.5);
        put(BOX, x, y0 + 0.44, z, 0x3a3f46, 0, 0, 0, 1.15, 0.1, 0.32);
        put(BOX, x - 0.45, y0 + 0.22, z, 0x2c3036, 0, 0, 0, 0.08, 0.44, 0.3);
        put(BOX, x + 0.45, y0 + 0.22, z, 0x2c3036, 0, 0, 0, 0.08, 0.44, 0.3);
        put(BOX, x - 0.8, y0 + 0.92, z - 0.35, 0x2c3036, 0, 0, 0, 0.08, 0.92, 0.08);
        put(BOX, x + 0.8, y0 + 0.92, z - 0.35, 0x2c3036, 0, 0, 0, 0.08, 0.92, 0.08);
        put(CYL, x, y0 + 0.92, z - 0.35, 0x8a8f96, 0, 0, Math.PI / 2, 0.05, 1.9, 0.05);
        for (const s of [-1, 1]) {
          put(CYL, x + s * 0.86, y0 + 0.92, z - 0.35, 0x26262c, 0, 0, Math.PI / 2, 0.56, 0.07, 0.56);
          put(CYL, x + s * 0.97, y0 + 0.92, z - 0.35, 0x26262c, 0, 0, Math.PI / 2, 0.42, 0.06, 0.42);
        }
        shadow(x, y0, z + 0.3, 1.0); break;
      }
      case 'fireplace': {
        const z = propZ(0.42);
        put(BOX, x, y0 + 0.62, z, 0x8a4a3a, 0, 0, 0, 1.6, 1.25, 0.42);
        put(BOX, x, y0 + 0.42, z + 0.22, 0x14100c, 0, 0, 0, 0.95, 0.68, 0.04);
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xff7a26 });
        const ember = new THREE.Mesh(BOX, emberMat);
        ember.applyMatrix4(xf(x, y0 + 0.16, z + 0.16, 0, 0, 0, 0.78, 0.15, 0.2));
        group.add(ember); dyn.mats.push(emberMat);
        put(BOX, x, y0 + 1.3, z + 0.02, 0x6a4a2a, 0, 0, 0, 1.78, 0.07, 0.52);
        const cans = p.mantle || 0;
        for (let i = 0; i < cans; i++)
          put(CYL, x - 0.66 + i * 0.17, y0 + 1.4, z + 0.02, 0xc8ccd0, 0, 0, 0, 0.066, 0.12, 0.066);
        const fl = new THREE.PointLight(0xff8a3a, 22, 8, 1.8);
        fl.position.set(x, y0 + 0.75, z + 1.15); group.add(fl);
        dyn.fires.push({ light: fl, mat: emberMat, base: 22, seed: Math.random() * 9 });
        shadow(x, y0, z + 0.45, 1.05); break;
      }
      case 'computer': {
        const z = propZ(0.62);
        put(BOX, x, y0 + 0.74, z, 0x8a6a44, 0, 0, 0, 1.5, 0.05, 0.62);
        put(BOX, x - 0.68, y0 + 0.37, z, 0x6a4a2a, 0, 0, 0, 0.07, 0.74, 0.55);
        put(BOX, x + 0.68, y0 + 0.37, z, 0x6a4a2a, 0, 0, 0, 0.07, 0.74, 0.55);
        put(BOX, x + 0.42, y0 + 0.31, z, 0xcfc7b0, 0, 0, 0, 0.3, 0.62, 0.5);
        put(BOX, x - 0.18, y0 + 0.99, z - 0.04, 0xcfc7b0, 0, 0, 0, 0.54, 0.44, 0.46);
        const sm = texMesh(computerTexture(p.screen || 'eDonkey'), 0.44, 0.34, x - 0.18, y0 + 1.0, z + 0.2);
        dyn.screens.push({ mat: sm.material, seed: Math.random() * 9, calm: true });
        put(BOX, x - 0.18, y0 + 0.78, z + 0.22, 0xb8b0a0, 0, 0, 0, 0.46, 0.03, 0.17);
        shadow(x, y0, z + 0.35, 0.95); break;
      }
      case 'cdwriter': {
        const z = propZ(0.55);
        put(BOX, x, y0 + 0.36, z, 0x8a8578, 0, 0, 0, 0.95, 0.05, 0.55);
        put(BOX, x - 0.3, y0 + 0.3, z, 0xcfc7b0, 0, 0, 0, 0.34, 0.6, 0.5);
        put(BOX, x + 0.28, y0 + 0.62, z, 0x2c2c32, 0, 0, 0, 0.44, 0.13, 0.42);
        put(BOX, x + 0.28, y0 + 0.6, z + 0.22, 0x111114, 0, 0, 0, 0.34, 0.025, 0.02);
        texMesh(marqueeTexture('CD-RW', '#24303c'), 0.4, 0.1, x + 0.28, y0 + 0.72, z + 0.215);
        shadow(x, y0, z + 0.3, 0.6); break;
      }
      case 'arcade': {
        (p.cabinets || []).forEach((name, i) => {
          const cx = x + i * 0.8, z = propZ(0.82), skin = ARCADE_SKINS[i % 3];
          put(BOX, cx, y0 + 0.89, z, skin, 0, 0, 0, 0.68, 1.78, 0.82);
          put(BOX, cx, y0 + 0.8, z + 0.44, 0x22222a, 0.5, 0, 0, 0.68, 0.06, 0.34);
          const sm = texMesh(screenTexture(name, '', ARCADE_HUES[i % 3], true), 0.54, 0.48, cx, y0 + 1.22, z + 0.36, -0.32);
          dyn.screens.push({ mat: sm.material, seed: i * 2.7 });
          texMesh(marqueeTexture(name, skin), 0.62, 0.16, cx, y0 + 1.7, z + 0.42);
          shadow(cx, y0, z + 0.45, 0.5);
        });
        break;
      }
      case 'bar': {
        const z = propZ(0.62);
        put(BOX, x, y0 + 0.54, z, 0x7a5230, 0, 0, 0, 2.7, 1.08, 0.62);
        put(BOX, x, y0 + 1.11, z + 0.04, 0x9a6a3a, 0, 0, 0, 2.86, 0.06, 0.78);
        put(BOX, x, y0 + 1.72, WALL_FACE + 0.18, 0x5a3d24, 0, 0, 0, 2.7, 0.05, 0.3);
        const bottleCols = [0x3f7a3a, 0x8a2a2a, 0xc8a83a, 0x3a5a8a, 0x6a3a6e, 0x9a5a28];
        for (let i = 0; i < 6; i++)
          put(CYL, x - 1.05 + i * 0.42, y0 + 1.9, WALL_FACE + 0.18, bottleCols[i], 0, 0, 0, 0.09, 0.32, 0.09);
        const beers = p.beers || 0;
        for (let i = 0; i < beers; i++)
          put(CYL, x - 0.95 + (i % 4) * 0.24, y0 + 1.2, z + 0.1 + Math.floor(i / 4) * 0.22, 0xc8ccd0, 0, 0, 0, 0.066, 0.12, 0.066);
        for (let i = 0; i < 3; i++) {
          const sx = x - 0.8 + i * 0.8;
          put(CYL, sx, y0 + 0.74, z + 0.85, 0x7a2a20, 0, 0, 0, 0.38, 0.07, 0.38);
          put(CYL, sx, y0 + 0.37, z + 0.85, 0x3a3a40, 0, 0, 0, 0.07, 0.74, 0.07);
        }
        shadow(x, y0, z + 0.5, 1.6); break;
      }
      case 'hole': {
        // the GIANT HOLE in the wall (Kosack's basement, between the arcade
        // and the bar): a jagged black breach in the back wall + rubble.
        const cy = y0 + 1.32, R = 0.78;
        const hg = new THREE.CircleGeometry(R, 22);
        const posA = hg.attributes.position;
        for (let i = 1; i < posA.count; i++) {
          const px = posA.getX(i), py = posA.getY(i), L = Math.hypot(px, py) || 1;
          const j = 0.78 + ((i * 37) % 10) / 10 * 0.4;
          posA.setXY(i, px / L * R * j, py / L * R * j);
        }
        hg.computeVertexNormals();
        const hm = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: 0x07050c }));
        hm.position.set(x, cy, WALL_FACE + 0.045); group.add(hm); dyn.mats.push(hm.material);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3;
          put(BOX, x + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95, WALL_FACE + 0.06, 0x9a5c3c, 0, 0, a, 0.22, 0.12, 0.07);
        }
        put(BOX, x - 0.3, y0 + 0.05, WALL_FACE + 0.5, 0x5a4632, 0.3, 0.7, 0.2, 0.3, 0.1, 0.24);
        put(BOX, x + 0.25, y0 + 0.04, WALL_FACE + 0.62, 0x4a3a2a, 0, 1.9, 0.5, 0.22, 0.08, 0.18);
        put(BOX, x + 0.02, y0 + 0.03, WALL_FACE + 0.85, 0x6a5136, 0.7, 0.2, 0, 0.16, 0.06, 0.14);
        break;
      }
      case 'chandelier': {
        const room = data.rooms.find(r => r.floor === p.floor && p.x >= r.x0 && p.x <= r.x1);
        const top = y0 + (room && room.h ? room.h : ceil);
        put(CYL, x, top - 0.3, 0.2, 0x8a7433, 0, 0, 0, 0.04, 0.6, 0.04);
        putB(SPH, x, top - 0.68, 0.2, 0xffd9a0, 0, 0, 0, 0.2, 0.2, 0.2);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          putB(SPH, x + Math.cos(a) * 0.34, top - 0.6, 0.2 + Math.sin(a) * 0.34, 0xffd9a0, 0, 0, 0, 0.11, 0.11, 0.11);
        }
        break;
      }
      case 'door': {
        put(BOX, x, y0 + 1.06, WALL_FACE + 0.04, 0x74553a, 0, 0, 0, 0.98, 2.12, 0.06);
        if (p.label) texMesh(marqueeTexture(p.label, '#3a3230'), 0.6, 0.15, x, y0 + 1.86, WALL_FACE + 0.09);
        break;
      }
      case 'cellardoor': {
        put(BOX, x, y0 + 0.22, propZ(0.9), 0x5a4632, 0.5, 0, 0, 1.1, 0.07, 0.95);
        break;
      }
      case 'rug': {
        put(BOX, x, y0 + 0.045, LANE_Z - 0.35, 0x8a3a34, 0, 0, 0, p.w || 2.3, 0.025, 1.5);
        put(BOX, x, y0 + 0.055, LANE_Z - 0.35, 0xc8b088, 0, 0, 0, (p.w || 2.3) - 0.44, 0.025, 1.06);
        break;
      }
      case 'puddle': {
        putB(CIRC, x, y0 + 0.045, LANE_Z - 0.3, 0x232830, -Math.PI / 2, 0, 0, (p.w || 2.1), 1.5, 1);
        break;
      }
    }
  }
  for (const p of data.props) buildProp(p);

  // room name pills (INTERIOR-SPEC §3: labels last, on pills, nothing covers
  // them — depthTest off, renderOrder high)
  for (const r of data.rooms) {
    const tex = pillTexture(r.name);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    const tw = tex.image.width;
    sp.scale.set(tw * 0.0062, 76 * 0.0062, 1);
    sp.position.set(lx((r.x0 + r.x1) / 2), floors[r.floor].z + (r.h || ceil) - 0.42, 2.45);
    sp.renderOrder = 999;
    group.add(sp); dyn.mats.push(sp.material); dyn.texs.push(tex);
  }

  // warm wash over the whole stage
  const amb = new THREE.AmbientLight(0xffe2c0, 1.1);
  group.add(amb); dyn.lights.push(amb);

  const stdMesh = std.build(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }));
  dyn.mats.push(stdMesh.material); group.add(stdMesh);
  const basicMesh = basic.build(new THREE.MeshBasicMaterial({ vertexColors: true }));
  dyn.mats.push(basicMesh.material); group.add(basicMesh);
  const shadMesh = shad.build(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false }));
  dyn.mats.push(shadMesh.material); group.add(shadMesh);

  return { group, dyn, floors, topY, botY };
}

// ---------- residents & figures ----------
const TETER_ROW = { skin: 0xf1c27d, shirt: 0x9a5a7a, pants: 0x4a4238, hair: 0x8a8078, hairStyle: 'long' };
const DAD_ROW = { skin: 0xe0ac69, shirt: 0x5a5148, pants: 0x2a2a30, hair: 0x2a1a0e, hairStyle: 'short' };
const FLOYD_DAD_ROW = { skin: 0xf1c27d, shirt: 0x4a5d48, pants: 0x2a2a30, hair: 0x3a2a1a, hairStyle: 'short' };
const GUEST_ROW = { skin: 0xe0ac69, shirt: 0x707a68, pants: 0x3a3f4a, hair: 0x4a3220, hairStyle: 'short' };   // the designs' anonymous cpuIdle guest

function makeFigure(row) {
  const p = buildPerson(row);
  p.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return p;
}
function poseSit(p, recline = 0.16) {
  poseIdle(p, 0);
  const J = p.joints;
  // ONE-PIECE PANTS (Cherie, Nov 20): people.js has no knee joint any
  // more — the whole pant leg angles from the hip. Hip -0.92 lands the
  // feet on the floor from the seatResident hip height (~0.53) where the
  // old bent pose (hip -1.28 + knee 1.22) put them, reading as legs
  // stretched out in the recliner; the ankle counter-rotation keeps the
  // shoe planted at the old pose's net tilt (-0.06).
  J.hipL.rotation.x = -0.92; J.hipR.rotation.x = -0.92;
  if (J.ankleL) { J.ankleL.rotation.x = 0.86; J.ankleR.rotation.x = 0.86; }
  J.chest.rotation.x = -recline;
  J.shoulderL.rotation.x = -0.32; J.shoulderR.rotation.x = -0.32;
  J.elbowL.rotation.x = -0.45; J.elbowR.rotation.x = -0.45;
}
// a resident seated in the recliner at (floor, x): returns a rocking pivot
function seatResident(S, row, floorId, x, rockAmp) {
  const f = S.floors[floorId], lx = dx => dx - S.data.width / 2;
  const pivot = new THREE.Group();
  pivot.position.set(lx(x), f.z + 0.06, -2.5);
  const p = makeFigure(row);
  p.group.position.y = -0.42;
  pivot.add(p.group);
  S.group.add(pivot);
  poseSit(p);
  S.rockers.push({ pivot, p, amp: rockAmp, seed: Math.random() * 9 });
  return p;
}
function standFigure(S, row, floorId, x, z = LANE_Z - 0.35, faceY = 0) {
  const f = S.floors[floorId], lx = dx => dx - S.data.width / 2;
  const p = makeFigure(row);
  p.group.position.set(lx(x), f.z, z);
  p.group.rotation.y = faceY;
  p.group.userData.floorZ = f.z;   // pose programs reset group.y to 0 — restored per frame
  S.group.add(p.group);
  S.idlers.push(p);
  return p;
}

// ---------- the factory ----------
export function createInteriors(opts) {
  const { scene, camera, stops } = opts;
  const heroRow = opts.heroRow || (() => CREW_PEOPLE.brad);
  const surfaceAt = opts.surfaceAt || null;

  // ----- module-owned DOM -----
  const style = document.createElement('style');
  style.textContent = `
    #intFade{position:fixed;inset:0;background:#0b0916;opacity:0;pointer-events:none;transition:opacity .3s ease;z-index:1400;}
    .intBtn{position:fixed;z-index:1250;border:3px solid rgba(255,255,255,.55);color:#fff;font-weight:900;letter-spacing:.06em;
      background:rgba(46,120,200,.88);border-radius:999px;padding:13px 22px;font-size:15px;cursor:pointer;touch-action:none;
      box-shadow:0 4px 14px rgba(0,0,0,.45);text-shadow:0 1px 3px rgba(0,0,0,.5);font-family:inherit;}
    .intBtn:active{filter:brightness(1.4);}
    #intEnter{left:50%;transform:translateX(-50%);bottom:calc(188px + env(safe-area-inset-bottom));display:none;}
    #intExit{top:calc(86px + env(safe-area-inset-top));right:14px;background:rgba(120,40,40,.85);padding:9px 16px;font-size:13px;display:none;}
    #intCaption{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(248px + env(safe-area-inset-bottom));
      width:min(92vw,560px);text-align:center;color:#ffe4b0;background:rgba(27,20,48,.78);border-radius:12px;
      padding:9px 14px;font-size:15px;font-weight:700;line-height:1.35;z-index:1250;pointer-events:none;display:none;}
    #intCaption b{color:#fff;}
    #intHint{position:fixed;left:50%;transform:translateX(-50%);top:calc(112px + env(safe-area-inset-top));
      color:#cfd6ea;background:rgba(10,14,26,.55);border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;
      z-index:1250;pointer-events:none;display:none;white-space:nowrap;}`;
  document.head.appendChild(style);
  const fadeEl = document.createElement('div'); fadeEl.id = 'intFade'; document.body.appendChild(fadeEl);
  const enterBtn = document.createElement('button'); enterBtn.className = 'intBtn'; enterBtn.id = 'intEnter'; document.body.appendChild(enterBtn);
  const exitBtn = document.createElement('button'); exitBtn.className = 'intBtn'; exitBtn.id = 'intExit'; exitBtn.textContent = '✕ LEAVE'; document.body.appendChild(exitBtn);
  const captionEl = document.createElement('div'); captionEl.id = 'intCaption'; document.body.appendChild(captionEl);
  const hintEl = document.createElement('div'); hintEl.id = 'intHint';
  hintEl.textContent = '◀ ▶ walk · push ▲ ▼ at the stairs · door = way out'; document.body.appendChild(hintEl);

  // ----- captions -----
  let tSec = 0;
  const cap = { until: 0, queue: [] };
  function setCaption(html, dur) {
    captionEl.innerHTML = html; captionEl.style.display = 'block';
    cap.until = tSec + dur;
  }
  function showCaption(html, dur = 2.8) {
    if (tSec < cap.until) { if (cap.queue.length < 3) cap.queue.push({ html, dur }); return; }
    setCaption(html, dur);
  }
  function captionTick() {
    if (cap.until && tSec >= cap.until) {
      cap.until = 0;
      const nx = cap.queue.shift();
      if (nx) setCaption(nx.html, nx.dur); else captionEl.style.display = 'none';
    }
  }

  // ----- state -----
  let S = null;              // active stage state
  let fading = false;
  let promptStop = null;
  const beats = {};          // door-beat runtime state per stop id
  for (const id of Object.keys(DOOR_BEATS)) beats[id] = { mom: null, boots: null, armed: true, playing: false, seqT: 0, fired: new Set() };

  enterBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (promptStop) enter(promptStop); });
  exitBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); exit(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE') { if (S) exit(); else if (promptStop) enter(promptStop); }
    if (e.code === 'Escape' && S) exit();
  });

  function enter(stopId) {
    if (S || fading) return;
    const dataId = STOP_INTERIOR[stopId];
    if (!dataId || !stops[stopId]) return;
    fading = true;
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      buildActive(stopId, HOUSE_INTERIORS[dataId]);
      fadeEl.style.opacity = '0';
      fading = false;
    }, 330);
  }
  function exit() {
    if (!S || fading) return;
    fading = true;
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      disposeActive();
      fadeEl.style.opacity = '0';
      fading = false;
    }, 330);
  }

  function buildActive(stopId, data) {
    const stop = stops[stopId];
    const built = buildStage(stop, data);
    scene.add(built.group);
    const floors = built.floors;
    const lx = dx => dx - data.width / 2;
    S = {
      stopId, data, stop, group: built.group, dyn: built.dyn, floors,
      topY: built.topY, botY: built.botY, t: 0, camX: 0, camSnap: true,
      rockers: [], idlers: [], events: [], hero: null, son: null,
      teterNextAt: 2.5, teterIdx: 0, yellDone: false, spotAt: 0, doorHintDone: false,
    };
    // hero on foot, at the front door
    const hero = makeFigure(heroRow());
    const df = floors[data.door.floor];
    hero.group.position.set(lx(data.door.x + 0.55), df.z, LANE_Z);
    S.group.add(hero.group);
    S.hero = { p: hero, floor: data.door.floor, x: data.door.x + 0.55, face: 1, phase: 0, transit: null, moving: false };
    // residents
    if (data.teter) seatResident(S, TETER_ROW, data.teter.floor, data.teter.x, 0.035);
    if (data.dad) seatResident(S, DAD_ROW, data.dad.floor, data.dad.x, 0.008);
    if (data.son && data.id === 'rigg') {
      const p = standFigure(S, CREW_PEOPLE.rigg, data.son.floor, data.son.x, LANE_Z - 0.3);
      S.son = { p, floor: data.son.floor, x: data.son.x, mode: 'wait', phase: 0, transit: null };
      S.idlers.pop(); // the son is driven by his own state machine, not the idle list
    } else if (data.son) { // Floyds: Dad downstairs, facing the TV, gaming
      const tv = data.props.filter(pr => pr.kind === 'tv' && pr.floor === data.son.floor)
        .sort((a, b) => Math.abs(a.x - data.son.x) - Math.abs(b.x - data.son.x))[0];
      const face = tv ? (tv.x < data.son.x ? -Math.PI / 2 : Math.PI / 2) : 0;
      standFigure(S, FLOYD_DAD_ROW, data.son.floor, data.son.x, LANE_Z - 0.2, face);
    }
    // ambient life the design parks in the house: the anonymous cpuIdle
    // guest spot (one figure), plus any named guests (brad.json's Jason)
    if (data.cpuIdle) standFigure(S, GUEST_ROW, data.cpuIdle.floor, data.cpuIdle.x, LANE_Z - 0.3);
    for (const c of (data.guests || []))
      if (CREW_PEOPLE[c.who]) standFigure(S, CREW_PEOPLE[c.who], c.floor, c.x, LANE_Z - 0.3);
    // bark speakers get figures where the design names a crew member
    const seen = new Set();
    for (const b of (data.barks || [])) {
      const key = b.who + '@' + b.floor;
      if (CREW_PEOPLE[b.who] && !seen.has(key)) {
        seen.add(key);
        standFigure(S, CREW_PEOPLE[b.who], b.floor, b.x, LANE_Z - 0.3);
      }
      S.events.push({ ...b, nextAt: b.at, repeats: 0 });
    }
    exitBtn.style.display = 'block';
    enterBtn.style.display = 'none';
    hintEl.style.display = 'block';
    setTimeout(() => { hintEl.style.display = 'none'; }, 6000);
    camera.fov = 58; camera.updateProjectionMatrix();
  }

  function disposeActive() {
    if (!S) return;
    scene.remove(S.group);
    const shared = new Set([BOX, CYL, CYL6, SPH, ICO, CIRC, PLANE]);
    S.group.traverse(o => {
      if (o.isMesh && o.geometry && !shared.has(o.geometry)) o.geometry.dispose();
    });
    for (const m of S.dyn.mats) m.dispose();
    for (const t of S.dyn.texs) t.dispose();
    S = null;
    exitBtn.style.display = 'none';
    hintEl.style.display = 'none';
    cap.queue.length = 0; cap.until = 0; captionEl.style.display = 'none';
    camera.fov = 60; camera.updateProjectionMatrix();
  }

  // ----- inside update -----
  function tryLink(H, dirSign) {
    const data = S.data;
    for (const l of data.links) {
      let fromFloor, fromX, toFloor, toX;
      if (l.a === H.floor) { fromFloor = l.a; fromX = l.ax; toFloor = l.b; toX = l.bx; }
      else if (l.b === H.floor) { fromFloor = l.b; fromX = l.bx; toFloor = l.a; toX = l.ax; }
      else continue;
      const dz = S.floors[toFloor].z - S.floors[fromFloor].z;
      if (Math.sign(dz) !== dirSign) continue;
      if (Math.abs(H.x - fromX) > 0.85) continue;
      H.transit = { fromFloor, toFloor, fromX: H.x, toX, fromZ: S.floors[fromFloor].z, toZ: S.floors[toFloor].z, t: 0, dur: 0.7 };
      return true;
    }
    return false;
  }
  function walkFigure(fig, tx, speed, dt) {
    // fig: {p, x, floor, phase}; moves along x on its floor; returns true on arrival
    const dx = tx - fig.x;
    if (Math.abs(dx) < 0.06) { poseIdle(fig.p, S.t + fig.p.phase); return true; }
    const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    fig.x += step;
    fig.phase += dt * 7.2;
    poseWalk(fig.p, fig.phase);
    const f = S.floors[fig.floor], lx = v => v - S.data.width / 2;
    fig.p.group.position.set(lx(fig.x), f.z, fig.p.group.position.z);
    fig.p.group.rotation.y = step > 0 ? Math.PI / 2 : -Math.PI / 2;
    return false;
  }
  function updateInterior(dt, frame) {
    S.t += dt;
    const data = S.data, H = S.hero, lx = v => v - data.width / 2;
    // hero
    if (H.transit) {
      const tr = H.transit;
      tr.t += dt / tr.dur;
      const k = Math.min(1, tr.t), e = k * k * (3 - 2 * k);
      H.x = tr.fromX + (tr.toX - tr.fromX) * e;
      const y = tr.fromZ + (tr.toZ - tr.fromZ) * e + Math.sin(k * Math.PI * 3) * 0.045;
      H.phase += dt * 9;
      poseWalk(H.p, H.phase);
      H.p.group.position.set(lx(H.x), y, LANE_Z);
      H.p.group.rotation.y = (tr.toX >= tr.fromX) ? Math.PI / 2 : -Math.PI / 2;
      if (k >= 1) { H.floor = tr.toFloor; H.transit = null; }
    } else {
      const f = S.floors[H.floor];
      const steer = frame.steer || 0;
      if (Math.abs(steer) > 0.12) {
        H.x += steer * 2.3 * dt;
        H.x = Math.max(f.x0 + 0.35, Math.min(f.x1 - 0.35, H.x));
        H.face = steer > 0 ? 1 : -1;
        H.phase += dt * 7.2;
        poseWalk(H.p, H.phase);
        H.moving = true;
      } else { poseIdle(H.p, S.t + H.p.phase); H.moving = false; }
      if (frame.up) tryLink(H, 1);
      else if (frame.down) tryLink(H, -1);
      H.p.group.position.set(lx(H.x), f.z, LANE_Z);
      const targetRot = H.moving ? (H.face > 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
      let dr = targetRot - H.p.group.rotation.y;
      while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      H.p.group.rotation.y += dr * Math.min(1, dt * 10);
      // interaction spots: a quiet caption names the spot's act
      if (S.t > S.spotAt + 5) {
        for (const sp of (data.spots || [])) {
          if (sp.floor === H.floor && Math.abs(H.x - sp.x) < 0.55 && sp.act !== 'EXIT') {
            showCaption(`<b>${sp.act}</b>`, 1.5); S.spotAt = S.t; break;
          }
        }
      }
      if (!S.doorHintDone && data.door.floor === H.floor && Math.abs(H.x - data.door.x) < 0.9) {
        S.doorHintDone = true;
        showCaption('The front door — <b>LEAVE</b> heads back out', 2.6);
      }
    }
    // residents: rocking chairs, idlers, the son's entrance (Rigg)
    for (const r of S.rockers) {
      r.pivot.rotation.x = Math.sin(S.t * Math.PI * 2 * 0.9 + r.seed) * r.amp;   // Teter rocks: ±0.035 rad, ~0.9 Hz (spec §5)
      poseSit(r.p);
      r.p.group.position.y = -0.42;   // pose programs reset group.y — restore the seat drop
      r.p.joints.head.rotation.y = Math.sin(S.t * 0.4 + r.seed) * 0.14;
    }
    for (const p of S.idlers) { poseIdle(p, S.t + p.phase); p.group.position.y = p.group.userData.floorZ; }
    if (S.son) {
      const son = S.son, link = data.links.find(l => l.id === 'up');
      if (son.mode === 'wait' && S.t > 2.4) son.mode = 'toStairs';
      else if (son.mode === 'toStairs' && walkFigure(son, link.bx, 1.7, dt)) son.mode = 'stairs';
      else if (son.mode === 'stairs') {
        if (!son.transit) son.transit = { t: 0, fromX: son.x, toX: link.ax, fromZ: S.floors[son.floor].z, toZ: S.floors[link.a].z };
        const tr = son.transit;
        tr.t += dt / 0.8;
        const k = Math.min(1, tr.t), e = k * k * (3 - 2 * k);
        son.x = tr.fromX + (tr.toX - tr.fromX) * e;
        const y = tr.fromZ + (tr.toZ - tr.fromZ) * e + Math.sin(k * Math.PI * 3) * 0.045;
        son.phase += dt * 9; poseWalk(son.p, son.phase);
        son.p.group.position.set(lx(son.x), y, son.p.group.position.z);
        son.p.group.rotation.y = -Math.PI / 2;
        if (k >= 1) { son.floor = link.a; son.mode = 'toDad'; son.transit = null; }
      }
      else if (son.mode === 'toDad') {
        if (walkFigure(son, 3.6, 1.7, dt)) { son.mode = 'done'; son.p.group.rotation.y = Math.PI / 2; }
      }
      else if (son.mode === 'done' || son.mode === 'wait') {
        poseIdle(son.p, S.t + son.p.phase);
        son.p.group.position.y = S.floors[son.floor].z;
      }
    }
    // house beats: Rigg's dad yells, then Brian comes down (handled above)
    if (data.dad && !S.yellDone && S.t > 1.4) {
      S.yellDone = true;
      showCaption(`<b>${data.dad.name}:</b> ${data.dad.yell}`, 3.2);
    }
    // barks (timed, from the design)
    for (const ev of S.events) {
      if (S.t >= ev.nextAt) {
        if (ev.repeats === 0 || H.floor === ev.floor)
          showCaption(`<b>${ev.name}:</b> ${ev.text}`, 2.8);
        if (ev.every && ev.repeats < 5) { ev.repeats++; ev.nextAt = S.t + ev.every; }
        else ev.nextAt = Infinity;
      }
    }
    // Teter / Mom lines when the hero comes close
    if (data.teter && H.floor === data.teter.floor && Math.abs(H.x - data.teter.x) < 3.4 && S.t > S.teterNextAt) {
      showCaption(`<b>${data.teter.name}:</b> ${data.teter.lines[S.teterIdx % data.teter.lines.length]}`, 3.6);
      S.teterIdx++; S.teterNextAt = S.t + 9;
    }
    // life: screens flicker, fireplaces breathe (ember glow — never flames)
    for (const sc of S.dyn.screens) {
      const f = sc.calm ? 0.92 + 0.08 * Math.sin(S.t * 2.1 + sc.seed) : 0.82 + 0.18 * Math.sin(S.t * 11 + sc.seed) * Math.sin(S.t * 5.3 + sc.seed * 2);
      sc.mat.color.setScalar(f);
    }
    for (const fr of S.dyn.fires) {
      const f = 0.82 + 0.13 * Math.sin(S.t * 11 + fr.seed) + 0.05 * Math.sin(S.t * 23 + fr.seed);
      fr.light.intensity = fr.base * f;
      fr.mat.color.setHex(0xff7a26).multiplyScalar(0.8 + 0.3 * f);
    }
    // camera: fit the whole section height, pan x to the hero, never pan y.
    // Distance is HEIGHT-driven (the dollhouse rule: every floor in frame,
    // section at ~76% of frame height) — portrait aspect then gives a
    // ~5 m pan window, which the follow-cam scrolls.
    const span = S.topY - S.botY, midY = (S.topY + S.botY) / 2;
    const fovR = camera.fov * Math.PI / 180;
    let dist = (span * 1.32 / 2) / Math.tan(fovR / 2);
    dist = THREE.MathUtils.clamp(dist, 7.5, 20);
    const halfW = Math.tan(fovR / 2) * camera.aspect * dist;
    const maxPan = Math.max(0, data.width / 2 - halfW + 0.7);
    const targetX = THREE.MathUtils.clamp(lx(H.x), -maxPan, maxPan);
    if (S.camSnap) { S.camX = targetX; S.camSnap = false; }
    S.camX += (targetX - S.camX) * Math.min(1, dt * 4);
    // LEVEL camera (the dollhouse rule, INTERIOR-SPEC §1): any downward
    // tilt makes each floor's deep slab occlude the back wall of the
    // floor below — a tilted test shot hid the whole basement wall
    // (arcade, bar, hole) behind the main slab. Dead-level keeps every
    // floor's back wall in frame.
    camera.position.set(S.stop.hx + S.camX, STAGE_Y + midY, S.stop.hz + dist);
    camera.lookAt(S.stop.hx + S.camX, STAGE_Y + midY, S.stop.hz);
  }

  // ----- door-mom beats (outside; Lazaris + Grant) -----
  function beatTick(dt, frame) {
    for (const [stopId, beat] of Object.entries(DOOR_BEATS)) {
      const st = beats[stopId], stop = stops[stopId];
      if (!stop) continue;
      const d = Math.hypot(frame.x - stop.hx, frame.z - stop.hz);
      if (!st.mom && d < 130) {
        const mx = stop.hx + (stop.sx - stop.hx) * 0.16, mz = stop.hz + (stop.sz - stop.hz) * 0.16;
        st.mom = makeFigure(beat.momRow);
        st.mom.group.position.set(mx, 0, mz);
        st.mom.group.rotation.y = Math.atan2(stop.sx - mx, stop.sz - mz);
        scene.add(st.mom.group);
        if (beat.boots) {
          const bg = new THREE.Group();
          const bm = new THREE.MeshStandardMaterial({ color: 0x6e5136, roughness: 0.9 });
          for (const [ox, oz, ry] of [[0, 0, 0.4], [0.5, 0.35, 2.2]]) {
            const boot = new THREE.Mesh(BOX, bm);
            boot.scale.set(0.13, 0.24, 0.3); boot.position.set(ox, 0.12, oz); boot.rotation.y = ry;
            bg.add(boot);
          }
          bg.position.set(stop.hx + (stop.sx - stop.hx) * 0.34 + 1.2, 0, stop.hz + (stop.sz - stop.hz) * 0.34 + 0.6);
          scene.add(bg); st.boots = bg;
        }
      }
      if (st.mom && d > 175) {
        scene.remove(st.mom.group);
        st.mom.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        st.mom = null;
        if (st.boots) { scene.remove(st.boots); st.boots = null; }
      }
      if (!st.mom) continue;
      poseIdle(st.mom, tSec + st.mom.phase);
      if (st.armed && d < BEAT_RANGE) { st.armed = false; st.playing = true; st.seqT = 0; st.fired.clear(); }
      if (!st.armed && d > BEAT_REARM) st.armed = true;
      if (st.playing) {
        st.seqT += dt;
        beat.sequence.forEach((line, i) => {
          if (st.seqT >= line.at && !st.fired.has(i)) {
            st.fired.add(i);
            showCaption(`<b>${line.who}:</b> ${line.text}`, 2.4);
          }
        });
        const last = beat.sequence[beat.sequence.length - 1];
        if (st.seqT > last.at + 2.6) st.playing = false;
      }
    }
  }

  // ----- proximity prompt -----
  function promptTick(frame) {
    promptStop = null;
    if (frame.started && frame.speed !== undefined && Math.abs(frame.speed) < 3) {
      let best = ENTER_RANGE;
      for (const stopId of Object.keys(STOP_INTERIOR)) {
        const stop = stops[stopId];
        if (!stop) continue;
        // houses sit back from their street stop point (Kosack's is ~38 m);
        // measure to whichever end of the driveway is closer
        const d = Math.min(Math.hypot(frame.x - stop.hx, frame.z - stop.hz),
                           Math.hypot(frame.x - stop.sx, frame.z - stop.sz) + 4);
        if (d < best) { best = d; promptStop = stopId; }
      }
    }
    if (promptStop && !fading) {
      const data = HOUSE_INTERIORS[STOP_INTERIOR[promptStop]];
      enterBtn.textContent = `▼ GO IN — ${data.display}`;
      enterBtn.style.display = 'block';
    } else enterBtn.style.display = 'none';
  }

  // ----- public API -----
  function tick(dt, frame) {
    tSec += dt;
    captionTick();
    if (S) { updateInterior(dt, frame); return true; }
    if (!fading && frame && frame.started) { promptTick(frame); beatTick(dt, frame); }
    else if (!fading) enterBtn.style.display = 'none';
    return false;
  }
  function partyAnchors(stopId) {
    const stop = stops[stopId];
    if (!stop) return null;
    const ux = (stop.sx - stop.hx), uz = (stop.sz - stop.hz), uL = Math.hypot(ux, uz) || 1;
    const sux = ux / uL, suz = uz / uL;   // unit vector house -> street
    const yard = [];
    for (const r of [7.5, 10.5, 13.5, 16.5]) {
      const n = Math.max(8, Math.floor(2 * Math.PI * r / 1.4));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = stop.hx + Math.cos(a) * r, pz = stop.hz + Math.sin(a) * r;
        const dot = Math.cos(a) * sux + Math.sin(a) * suz;
        if (dot > 0.55 && r < 12) continue;                    // keep the street frontage clear
        if (surfaceAt && surfaceAt(px, pz) === 'road') continue;
        yard.push({ x: px, y: 0, z: pz });
      }
    }
    if (stopId === 'kosack') {                                    // the pool cluster (back yard)
      const cx = stop.hx - sux * 13, cz = stop.hz - suz * 13;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++)
        yard.push({ x: cx + (i - 2) * 2.3, y: 0, z: cz + (j - 1) * 2.3 });
    }
    let inside = [], insideFloor = null, partySpan = null;
    const data = HOUSE_INTERIORS[STOP_INTERIOR[stopId]];
    if (data && data.party) {
      const f = data.floors.find(fl => fl.id === data.party.floor);
      insideFloor = f.id; partySpan = { ...data.party };
      for (const laneZ of [-1.35, 1.05])
        for (let x = data.party.x0; x <= data.party.x1 + 0.001; x += 0.62)
          inside.push({ x: stop.hx + (x - data.width / 2), y: STAGE_Y + f.z, z: stop.hz + laneZ });
    }
    return { yard, inside, insideFloor, partySpan, stageY: STAGE_Y };
  }
  function stageOrigin(stopId) {
    const stop = stops[stopId];
    return stop ? { x: stop.hx, y: STAGE_Y, z: stop.hz } : null;
  }
  function stats() {
    if (!S) return { active: false };
    let meshes = 0; S.group.traverse(o => { if (o.isMesh || o.isSprite) meshes++; });
    return { active: true, house: S.stopId, floor: S.hero.floor, heroX: +S.hero.x.toFixed(2), stageMeshes: meshes };
  }
  // proof/debug seam (host __proof.houseHero): place the hero directly —
  // headless SwiftShader renders this world at <1 fps, so scripted walks
  // take minutes of wall time; real play walks at full speed.
  function debugSetHero(x, floorId) {
    if (!S) return false;
    const H = S.hero;
    if (floorId && S.floors[floorId]) H.floor = floorId;
    const f = S.floors[H.floor];
    H.x = Math.max(f.x0 + 0.35, Math.min(f.x1 - 0.35, x));
    H.transit = null;
    H.p.group.position.set(H.x - S.data.width / 2, f.z, LANE_Z);
    S.camSnap = true;
    return true;
  }
  return {
    tick, enter, exit, partyAnchors, stageOrigin, stats, debugSetHero,
    get active() { return !!S; },
  };
}
export default createInteriors;
