// gpvehicles.js — procedural vehicles for gamepress. Zero external model files.
// Hawk2 SHARED COPY — canonical source: gamepress kit/gpvehicles.js (this copy differs only in the three import, resolved by each game's importmap).
// Built ONCE, used by every game: shaped cars from extruded side profiles
// (the Neon/Bunny Hop parked-car technique, generalized), driven by DATA ROWS.
//
//   import { buildVehicle, VEHICLE_ROWS } from './gpvehicles.js';
//   const car = buildVehicle(VEHICLE_ROWS.sedanGrey);   // { group, wheels, dims, updateWheels }
//   scene.add(car.group);
//   // per frame: car.updateWheels(speed, steerAngle, dt) — wheels roll + front wheels steer.
//
// Profiles are [z, y] side-silhouette points (z: -len/2 rear … +len/2 front,
// y: height in metres), traced from reference photos of the real cars.
// Body and glasshouse are separate beveled extrusions (paint + glass), so the
// silhouette has real curves — tapered hoods, sloped glass, formal rooflines —
// never boxes with wheels. Wheels are separate pivots so they ROLL.
//
// Materials are shared and PMREM-friendly: paint is a clearcoat physical
// material, so put a scene.environment on and the sky reflects in the panels.
// Every car carries a simple INTERIOR (floor, seats, dash, steering wheel)
// behind tinted glass, a driver anchor (see veh.driverAnchor — the host seats
// a figure there), readable spoked wheels, and dusk light signatures:
// emissive lamps + additive glow cards + a headlight pool on the road.
//
// CONVENTION: vehicles face +Z (gpkit convention), 1 unit = 1 m.

import * as THREE from 'three';
import { buildLoftedCar } from './gpcar_loft.js';

// ---------------------------------------------------------------- materials
export const VEHICLE_MATS = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0x3a4f6a, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.58, envMapIntensity: 1.4 }),
  tire:  new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.92 }),
  trim:  new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.75 }),
  dark:  new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.9 }),
  vinyl: new THREE.MeshStandardMaterial({ color: 0x2a2226, roughness: 0.85, metalness: 0.05 }),
  head:  new THREE.MeshStandardMaterial({ color: 0xffe9ba, emissive: 0xffd080, emissiveIntensity: 1.6 }),
  tail:  new THREE.MeshStandardMaterial({ color: 0xc92a2a, emissive: 0xff2b2b, emissiveIntensity: 1.4 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xd88f2a, emissive: 0xb35c00, emissiveIntensity: 0.9 }),
  seat:  new THREE.MeshStandardMaterial({ color: 0x42434c, roughness: 0.95 }),
  dash:  new THREE.MeshStandardMaterial({ color: 0x1e1f24, roughness: 0.92 }),
};
// Car paint: clearcoat over a low-roughness base — the clearcoat layer is
// what throws the sharp sky reflection that reads as "real car" at phone size.
function paintMat(hex, rough = 0.3, clearcoat = 0.75) {
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough, metalness: 0.25,
    clearcoat, clearcoatRoughness: 0.22, envMapIntensity: 1.15 });
}
// soft radial glow sprite (head/taillight halos, headlight road pool)
let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
const _glowPlane = new THREE.PlaneGeometry(1, 1);
const GLOW_MATS = {
  head: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  tail: new THREE.MeshBasicMaterial({ color: 0xff2b2b, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  pool: new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
};

// ---------------------------------------------------------------- geometry helpers
function mergeGeos(list) {
  let total = 0; for (const g of list) total += g.attributes.position.count;
  if (!total) return null;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += n; g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return m;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sv = new THREE.Vector3();
function xform(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _sv.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_v, _q, _sv);
}
function box(list, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(xform(x, y, z, rx, ry, rz));
  list.push(g.index ? g.toNonIndexed() : g);
}
function cyl(list, r, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.rotateZ(Math.PI / 2); // axis -> X (axle)
  g.applyMatrix4(xform(x, y, z));
  list.push(g.index ? g.toNonIndexed() : g);
}
// Extrude a [z,y] side profile across `width`. Shape space: x = car z, y = up;
// extrusion (width) becomes world X after rotateY(-90deg). Bevel = rounded edges.
function profileGeo(profile, width, bevel = 0.045) {
  const shape = new THREE.Shape();
  profile.forEach(([z, y], i) => { if (i === 0) shape.moveTo(z, y); else shape.lineTo(z, y); });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, width - bevel * 2), bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 2, steps: 1,
  });
  g.translate(0, 0, -width / 2 + bevel);
  g.rotateY(-Math.PI / 2); // shape +x (front) -> world +z; extrusion -> world x
  return g.index ? g.toNonIndexed() : g;
}

// ---------------------------------------------------------------- body styles
// glass: windshield/rear panels as [z1,y1,z2,y2] segments lying on the
// body/cabin profile slopes; band: {z0, z1, y, h} side glass band.
// sideBand: {z0, z1, y, h} glass band along the cabin sides.
export const VEHICLE_STYLES = {
  // '87 Camaro IROC-Z (3rd gen): long wedge nose, black headlight buckets,
  // hood louvers, steep windshield, fastback glass to a short deck.
  camaro3: {
    len: 4.88, wid: 1.85, wheelR: 0.33, wheelbase: 2.56,
    body: [[-2.44,0.34],[-2.44,0.80],[-2.34,0.90],[-1.60,0.96],[0.30,0.90],[1.50,0.80],[2.24,0.64],[2.44,0.52],[2.44,0.30]],
    cabin: [[-2.02,0.94],[-0.62,1.235],[-0.10,1.26],[0.58,0.90]],
    cabinW: 0.86,
    glass: { shield: [0.58,0.90,-0.10,1.26], rear: [-2.02,0.94,-0.62,1.235],
             band: { z0: -0.55, z1: 0.28, y: 1.10, h: 0.30 } },
    headY: 0.60, tailY: 0.78,
  },
  // '74 Celica coupe (1st gen): long flat hood, notchback roof, chrome bumpers,
  // louvered C-pillars, black tail panel. (reference photo: a first-gen car)
  celica1: {
    len: 4.31, wid: 1.63, wheelR: 0.31, wheelbase: 2.42,
    body: [[-2.15,0.32],[-2.15,0.86],[-2.05,0.93],[-1.10,0.94],[0.40,0.88],[1.70,0.84],[2.08,0.68],[2.15,0.52],[2.15,0.30]],
    cabin: [[-1.18,0.93],[-0.78,1.29],[-0.02,1.30],[0.52,0.88]],
    cabinW: 0.84,
    glass: { shield: [0.52,0.88,-0.02,1.30], rear: [-1.18,0.93,-0.78,1.29],
             band: { z0: -0.70, z1: 0.22, y: 1.10, h: 0.30 } },
    headY: 0.62, tailY: 0.72, chromeBumpers: true,
  },
  // '96 Cavalier sedan (3rd gen J-body): rounded nose, wide corner headlights,
  // bar grille, conventional 3-box sedan cabin.
  cavalier3: {
    len: 4.58, wid: 1.72, wheelR: 0.31, wheelbase: 2.49,
    body: [[-2.29,0.34],[-2.29,0.84],[-2.18,0.90],[-1.30,0.92],[0.30,0.88],[1.45,0.82],[2.12,0.66],[2.29,0.54],[2.29,0.32]],
    cabin: [[-1.58,0.91],[-0.92,1.38],[-0.05,1.40],[0.55,0.89]],
    cabinW: 0.88,
    glass: { shield: [0.55,0.89,-0.05,1.40], rear: [-1.58,0.91,-0.92,1.38],
             band: { z0: -0.85, z1: 0.28, y: 1.16, h: 0.34 } },
    headY: 0.62, tailY: 0.80,
  },
  // '89 Camry V20: crisp 3-box Japanese sedan, flat hood, upright pillars,
  // black side rub stripe.
  camryV20: {
    len: 4.63, wid: 1.69, wheelR: 0.30, wheelbase: 2.60,
    body: [[-2.31,0.34],[-2.31,0.86],[-2.24,0.91],[-1.30,0.92],[0.35,0.86],[1.55,0.82],[2.20,0.70],[2.31,0.60],[2.31,0.34]],
    cabin: [[-1.38,0.91],[-0.86,1.385],[-0.02,1.40],[0.60,0.87]],
    cabinW: 0.88,
    glass: { shield: [0.60,0.87,-0.02,1.40], rear: [-1.38,0.91,-0.86,1.385],
             band: { z0: -0.80, z1: 0.32, y: 1.16, h: 0.34 } },
    headY: 0.64, tailY: 0.80, rubStripe: true,
  },
  // '90-92 Cadillac Brougham: huge formal sedan, tall chrome grille, vinyl
  // roof, near-vertical C-pillar, silver lower cladding.
  brougham: {
    len: 5.61, wid: 1.95, wheelR: 0.35, wheelbase: 3.09,
    body: [[-2.80,0.36],[-2.80,0.94],[-2.70,1.00],[-1.40,1.01],[0.60,0.99],[1.90,0.94],[2.66,0.80],[2.80,0.68],[2.80,0.36]],
    cabin: [[-1.50,1.00],[-1.12,1.43],[-0.05,1.45],[0.72,0.99]],
    cabinW: 0.88,
    glass: { shield: [0.72,0.99,-0.05,1.45], rear: [-1.50,1.00,-1.12,1.43],
             band: { z0: -1.02, z1: 0.42, y: 1.21, h: 0.36 } },
    headY: 0.74, tailY: 0.86, chromeBumpers: true, vinylRoof: true,
  },
  // Astro van, gen 1 ('85-94): flat face, black grille panel.
  astro1: {
    len: 4.83, wid: 1.97, wheelR: 0.35, wheelbase: 2.82, van: true,
    body: [[-2.41,0.34],[-2.41,1.86],[-2.30,1.93],[0.90,1.93],[1.85,1.60],[2.30,1.06],[2.41,0.88],[2.41,0.34]],
    glass: { shield: [0.90,1.93,1.85,1.60], rear: [-2.41,1.20,-2.41,1.80], rearW: 0.8,
             band: { z0: -2.15, z1: 1.55, y: 1.48, h: 0.52 } },
    headY: 0.78, tailY: 0.92,
  },
  // Astro van, gen 2 ('95+): rounded sloped snout, body-color grille.
  astro2: {
    len: 4.83, wid: 1.97, wheelR: 0.35, wheelbase: 2.82, van: true,
    body: [[-2.41,0.34],[-2.41,1.86],[-2.30,1.93],[0.80,1.93],[1.45,1.60],[2.05,1.02],[2.41,0.80],[2.41,0.50],[2.38,0.34]],
    glass: { shield: [0.80,1.93,1.45,1.60], rear: [-2.41,1.20,-2.41,1.80], rearW: 0.8,
             band: { z0: -2.15, z1: 1.45, y: 1.48, h: 0.52 } },
    headY: 0.72, tailY: 0.92,
  },
  // '87 Celica GT (ST162 liftback): rounded wedge, pop-up headlights, long
  // liftback slope. Dims from the fleet data (4.37 x 1.69). Profile re-traced
  // Nov 20 from the T160 photo set (celica-rigg): blunter, taller nose face,
  // flat 0.90 beltline, integrated spoiler lip kicking up at the tail, longer
  // shallower glass hatch, big quarter glass on the hatch slope.
  celica87: {
    len: 4.37, wid: 1.69, wheelR: 0.31, wheelbase: 2.52, popups: true,
    body: [[-2.18,0.34],[-2.18,0.88],[-2.10,0.96],[-1.70,0.94],[-0.80,0.92],[0.35,0.90],[1.20,0.86],[1.95,0.80],[2.18,0.74],[2.18,0.30]],
    cabin: [[-2.02,0.94],[-0.78,1.28],[-0.05,1.295],[0.55,0.88]],
    cabinW: 0.86,
    glass: { shield: [0.55,0.88,-0.05,1.295], rear: [-2.02,0.94,-0.78,1.28], rearW: 0.80,
             band: { z0: -0.62, z1: 0.32, y: 1.10, h: 0.33 },
             quarter: [-1.90,0.973,-0.86,1.258] },
    headY: 0.85, tailY: 0.78, glowZ: 2.04, rubStripe: true, noBumperBand: true,
  },
  // Tracer sedan (Mazda 323 BG platform twin): compact 3-box sedan, black
  // rub stripe. Plan proportions from the fleet sprite (4.17 x 1.65).
  tracerSedan: {
    len: 4.17, wid: 1.65, wheelR: 0.29, wheelbase: 2.42,
    body: [[-2.08,0.33],[-2.08,0.82],[-1.98,0.88],[-1.15,0.89],[0.25,0.85],[1.25,0.79],[1.92,0.64],[2.08,0.53],[2.08,0.31]],
    cabin: [[-1.42,0.88],[-0.80,1.335],[-0.02,1.36],[0.50,0.86]],
    cabinW: 0.88,
    glass: { shield: [0.50,0.86,-0.02,1.36], rear: [-1.42,0.88,-0.80,1.335],
             band: { z0: -0.74, z1: 0.24, y: 1.12, h: 0.32 } },
    headY: 0.60, tailY: 0.78, rubStripe: true,
  },
  // Tracer / Mazda 323 BG 5-door hatch: rounded nose, hatch slope built into
  // the body line, black rub stripe. (reference photo: the Mazda-built twin)
  tracerHatch: {
    len: 4.26, wid: 1.69, wheelR: 0.30, wheelbase: 2.45,
    body: [[-2.13,0.34],[-2.13,0.94],[-1.95,1.02],[-0.60,1.345],[0.05,1.36],[0.50,0.90],[1.30,0.84],[2.00,0.68],[2.13,0.56],[2.13,0.32]],
    cabin: [[-0.62,1.345],[-0.60,1.345],[0.02,1.36],[0.48,0.90]],
    cabinW: 0.88, hatchBody: true,
    glass: { shield: [0.48,0.90,0.02,1.36], rear: [-1.95,1.02,-0.60,1.345], rearW: 0.78,
             band: { z0: -0.52, z1: 0.24, y: 1.14, h: 0.32 } },
    headY: 0.62, tailY: 0.82, rubStripe: true,
  },
  // '87-93 Mustang GT (Fox): long flat hood, upright lights, hatch slope,
  // ground effects + valance fog lamps.
  mustangFox: {
    len: 4.57, wid: 1.73, wheelR: 0.32, wheelbase: 2.59,
    body: [[-2.28,0.34],[-2.28,0.86],[-2.14,0.92],[-0.60,1.28],[0.02,1.30],[0.60,0.88],[1.55,0.82],[2.16,0.68],[2.28,0.56],[2.28,0.32]],
    cabin: [[-0.66,1.27],[-0.62,1.285],[0.00,1.30],[0.56,0.88]],
    cabinW: 0.86, hatchBody: true,
    glass: { shield: [0.56,0.88,0.00,1.30], rear: [-2.14,0.92,-0.60,1.28], rearW: 0.78,
             band: { z0: -0.55, z1: 0.28, y: 1.09, h: 0.30 } },
    headY: 0.64, tailY: 0.80,
  },
  // ---- generic styles for other games (traffic, parked dressing) ----
  sedan: {
    len: 4.55, wid: 1.74, wheelR: 0.31, wheelbase: 2.55,
    body: [[-2.27,0.34],[-2.27,0.85],[-2.15,0.91],[-1.25,0.92],[0.30,0.88],[1.45,0.82],[2.10,0.67],[2.27,0.55],[2.27,0.32]],
    cabin: [[-1.52,0.91],[-0.88,1.37],[-0.02,1.39],[0.55,0.89]],
    cabinW: 0.88,
    glass: { shield: [0.55,0.89,-0.02,1.39], rear: [-1.52,0.91,-0.88,1.37],
             band: { z0: -0.82, z1: 0.28, y: 1.15, h: 0.33 } },
    headY: 0.62, tailY: 0.80,
  },
  hatch: {
    len: 4.15, wid: 1.68, wheelR: 0.30, wheelbase: 2.40,
    body: [[-2.07,0.34],[-2.07,0.95],[-1.90,1.03],[-0.55,1.33],[0.02,1.35],[0.48,0.89],[1.25,0.83],[1.95,0.67],[2.07,0.55],[2.07,0.32]],
    cabin: [[-0.58,1.325],[-0.56,1.33],[0.00,1.35],[0.46,0.89]],
    cabinW: 0.88, hatchBody: true,
    glass: { shield: [0.46,0.89,0.00,1.35], rear: [-1.90,1.03,-0.55,1.33], rearW: 0.78,
             band: { z0: -0.50, z1: 0.22, y: 1.13, h: 0.31 } },
    headY: 0.61, tailY: 0.81,
  },
};

// ---------------------------------------------------------------- wheels
// ONE vertex-colored geometry per (kind, radius), cached across all cars:
// tire with rounded sidewall shoulders + a rim you can READ — 5-spoke alloy
// (the mag look), slotted steel, or wire. Spokes make rotation visible at
// phone size; a plain hub disc never did.
const _wheelCache = new Map();
function wheelGeometry(R, kind) {
  const key = kind + '|' + R.toFixed(3);
  if (_wheelCache.has(key)) return _wheelCache.get(key);
  const parts = []; // {geo, hex}
  const P = (geo, hex) => parts.push({ geo: geo.index ? geo.toNonIndexed() : geo, hex });
  const put = (list, geo, x, y, z, rx = 0, ry = 0, rz = 0) => { geo.applyMatrix4(xform(x, y, z, rx, ry, rz)); list.push(geo); };
  const tire = [], rimD = [], rimL = [];
  put(tire, new THREE.CylinderGeometry(R, R, 0.21, 20).rotateZ(Math.PI / 2), 0, 0, 0);
  for (const sx of [-1, 1]) { // sidewall shoulders
    const t = new THREE.TorusGeometry(R * 0.88, R * 0.115, 8, 20); t.rotateY(Math.PI / 2);
    put(tire, t, sx * 0.082, 0, 0);
  }
  P(tire[0], 0x17181c); for (let i = 1; i < tire.length; i++) P(tire[i], 0x1d1e22);
  // rim barrel (dark) set into the tire
  put(rimD, new THREE.CylinderGeometry(R * 0.60, R * 0.60, 0.20, 16).rotateZ(Math.PI / 2), 0, 0, 0);
  P(rimD[0], kind === 'steel' ? 0x33353a : 0x232529);
  const spokeN = kind === 'wire' ? 12 : kind === 'multi' ? 10 : 5;
  for (const sx of [-1, 1]) for (let i = 0; i < spokeN; i++) {
    const a = (i / spokeN) * Math.PI * 2, sp = [];
    const wdt = kind === 'wire' ? 0.016 : kind === 'multi' ? 0.034 : 0.055, len = R * (kind === 'wire' ? 0.60 : 0.56);
    put(sp, new THREE.BoxGeometry(0.035, len, wdt), sx * 0.098, Math.sin(a) * R * 0.30, Math.cos(a) * R * 0.30, Math.PI / 2 - a, 0, 0);
    P(sp[0], kind === 'steel' ? 0x33353a : 0xc7ccd4);
    rimL.push(sp[0]);
  }
  for (const sx of [-1, 1]) { // hub cap
    const h = [];
    put(h, new THREE.CylinderGeometry(R * 0.17, R * 0.17, 0.03, 10).rotateZ(Math.PI / 2), sx * 0.105, 0, 0);
    P(h[0], kind === 'steel' ? 0x8f959e : 0xd6dbe2); rimL.push(h[0]);
  }
  const all = parts.map(p => {
    const n = p.geo.attributes.position.count, arr = new Float32Array(n * 3), c = new THREE.Color(p.hex);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    p.geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return p.geo;
  });
  let total = 0; for (const g of all) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
  let o = 0;
  for (const g of all) {
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
  _wheelCache.set(key, geo);
  return geo;
}
const WHEEL_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55, envMapIntensity: 0.9 });

// Length-wise paint fade: vertex colours from the car's longitudinal axis —
// `front` hex holds from the nose back to zWhite, blends to `rear` by zFull,
// `rear` holds to the tail. (Brad's Camaro: white ahead of the windshield,
// fading to maroon behind it — Cherie, Nov 20.)
function applyLengthFade(geo, fade) {
  const pos = geo.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3);
  const cF = new THREE.Color(fade.front), cR = new THREE.Color(fade.rear), tmp = new THREE.Color();
  const span = (fade.zWhite - fade.zFull) || 1;
  for (let i = 0; i < n; i++) {
    let t = (pos.getZ(i) - fade.zFull) / span;
    t = Math.min(1, Math.max(0, t)); t = t * t * (3 - 2 * t);
    tmp.copy(cR).lerp(cF, t);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// ---------------------------------------------------------------- celica87 loft
// '87 Celica GT (celica87) is built by Neon's loft builder (gpcar_loft.js)
// from her photo-fitted spec, NOT by the extrusion factory below. Cherie
// approved the swap (Nov 20) after the bake-off side-by-sides: the loft car's
// sculpted stations, flush greenhouse and working pop-ups replace the
// extruded celica87 profile (its VEHICLE_STYLES entry is kept for reference).
// Spec source: games/scaggsville-3d/bakeoff-celica/celica-spec.json — fitted
// from the T160 photo set with gamepress tools/car-fitter (fit_car.py);
// canon blue paint as fitted, blue beams 0x0066ff in the spec's popups.
// The adapter returns the exact fleet interface ({ group, wheels, dims,
// driverAnchor, driverScale, beamColor, updateWheels }).
const CELICA87_LOFT_SPEC = {
    "meta": {
      "name": "Rigg's '87 Toyota Celica GT (T160 Liftback)",
      "year": 1987,
      "notes": "Fitted from games/scaggsville-3d/reference/car-real/celica-rigg/ using wheel diameter (0.616m) as ruler. Canon blue paint + 0x0066ff blue beams."
    },
    "dims": {
      "length": 4.36,
      "width": 1.71,
      "height": 1.265,
      "wheelbase": 2.52,
      "wheelZFront": 1.25,
      "wheelZRear": -1.27,
      "wheelRadius": 0.308,
      "wheelWidth": 0.215,
      "trackHalfFront": 0.75,
      "trackHalfRear": 0.745,
      "archGap": 0.048
    },
    "paint": {
      "color": 1000086,
      "roughness": 0.2,
      "metalness": 0.34,
      "clearcoat": 0.96,
      "clearcoatRoughness": 0.11
    },
    "bodyStations": [
      {
        "z": -2.18,
        "yBot": 0.33,
        "yBelt": 0.74,
        "yDeck": 0.855,
        "wBot": 0.73,
        "wBelt": 0.8,
        "wDeck": 0.74,
        "crown": 0.014
      },
      {
        "z": -2.02,
        "yBot": 0.27,
        "yBelt": 0.75,
        "yDeck": 0.885,
        "wBot": 0.77,
        "wBelt": 0.84,
        "wDeck": 0.78,
        "crown": 0.016
      },
      {
        "z": -1.55,
        "yBot": 0.22,
        "yBelt": 0.76,
        "yDeck": 0.91,
        "wBot": 0.79,
        "wBelt": 0.855,
        "wDeck": 0.79,
        "crown": 0.016
      },
      {
        "z": -0.8,
        "yBot": 0.215,
        "yBelt": 0.75,
        "yDeck": 0.89,
        "wBot": 0.795,
        "wBelt": 0.855,
        "wDeck": 0.79,
        "crown": 0.015
      },
      {
        "z": 0.4,
        "yBot": 0.215,
        "yBelt": 0.74,
        "yDeck": 0.87,
        "wBot": 0.795,
        "wBelt": 0.855,
        "wDeck": 0.79,
        "crown": 0.018
      },
      {
        "z": 1.05,
        "yBot": 0.22,
        "yBelt": 0.72,
        "yDeck": 0.84,
        "wBot": 0.79,
        "wBelt": 0.85,
        "wDeck": 0.78,
        "crown": 0.022
      },
      {
        "z": 1.68,
        "yBot": 0.24,
        "yBelt": 0.67,
        "yDeck": 0.78,
        "wBot": 0.76,
        "wBelt": 0.825,
        "wDeck": 0.75,
        "crown": 0.02
      },
      {
        "z": 2.04,
        "yBot": 0.27,
        "yBelt": 0.61,
        "yDeck": 0.71,
        "wBot": 0.71,
        "wBelt": 0.78,
        "wDeck": 0.7,
        "crown": 0.016
      },
      {
        "z": 2.18,
        "yBot": 0.3,
        "yBelt": 0.57,
        "yDeck": 0.66,
        "wBot": 0.65,
        "wBelt": 0.73,
        "wDeck": 0.65,
        "crown": 0.012
      }
    ],
    "greenhouse": {
      "zRearBase": -1.78,
      "yRearBase": 0.91,
      "wRearBase": 0.73,
      "zRearRoof": -0.82,
      "yRearRoof": 1.255,
      "wRearRoof": 0.56,
      "zFrontRoof": 0.04,
      "yFrontRoof": 1.26,
      "wFrontRoof": 0.57,
      "zFrontBase": 0.76,
      "yFrontBase": 0.865,
      "wFrontBase": 0.74,
      "roofCrown": 0.026,
      "bPillarZ": -0.5,
      "windshieldColor": 1713718,
      "windshieldOpacity": 0.48,
      "sideGlassColor": 1450028,
      "sideGlassOpacity": 0.56,
      "rearGlassColor": 725016,
      "rearGlassOpacity": 0.88,
      "rearWiper": true,
      "mirrors": {
        "z": 0.52,
        "y": 0.9,
        "w": 0.14,
        "h": 0.085,
        "d": 0.11
      }
    },
    "frontFascia": {
      "bumperY": 0.455,
      "bumperH": 0.145,
      "bumperProtrusion": 0.06,
      "rubStripY": 0.485,
      "rubStripH": 0.038,
      "grille": {
        "y": 0.605,
        "h": 0.105,
        "w": 0.78,
        "slats": 3,
        "topBarText": true
      },
      "cornerLamps": {
        "y": 0.605,
        "h": 0.102,
        "innerSmokedW": 0.21,
        "outerAmberW": 0.13,
        "wrapZ": 0.22
      },
      "lowerIntake": {
        "y": 0.33,
        "h": 0.072,
        "w": 1.08,
        "dividers": 4
      },
      "chinSpoiler": {
        "enabled": true,
        "y": 0.24,
        "h": 0.082,
        "protrusion": 0.025,
        "zBack": 1.66
      },
      "popups": {
        "enabled": true,
        "w": 0.29,
        "d": 0.21,
        "xOffset": 0.5,
        "zPivot": 1.87,
        "ySurface": 0.74,
        "upAngle": 0.8,
        "lampColor": 15135487,
        "beamColor": 26367,
        "beamIntensity": 0.95
      }
    },
    "rearFascia": {
      "bumperY": 0.455,
      "bumperH": 0.145,
      "bumperProtrusion": 0.045,
      "rubStripY": 0.485,
      "rubStripH": 0.038,
      "tailPanel": {
        "y": 0.69,
        "h": 0.195,
        "centerW": 0.54,
        "lampW": 0.43,
        "amberOuterW": 0.115,
        "reverseW": 0.055,
        "wrapZ": 0.18
      },
      "spoiler": {
        "style": "lip",
        "z": -2.06,
        "y": 0.935,
        "h": 0.055,
        "d": 0.16,
        "w": 1.52
      },
      "exhaust": {
        "side": "right",
        "count": 2,
        "xOffset": 0.42,
        "y": 0.24,
        "r": 0.032
      },
      "mudFlaps": true,
      "fuelDoor": {
        "z": -1.66,
        "y": 0.77,
        "side": 1
      }
    },
    "trim": {
      "sideRubStrip": {
        "enabled": true,
        "y": 0.485,
        "h": 0.042
      },
      "rockerSkirt": {
        "enabled": true,
        "y": 0.23,
        "h": 0.055
      },
      "doorHandle": {
        "z": -0.45,
        "y": 0.78
      },
      "frontSideMarker": {
        "z": 1.84,
        "y": 0.485,
        "w": 0.11,
        "h": 0.028,
        "color": 15236628
      }
    },
    "wheels": {
      "spokeCount": 10,
      "spokeStyle": "blade",
      "rimColor": 13686494,
      "tireColor": 1447707,
      "hubRadius": 0.068,
      "rimRatio": 0.68
    }
  };


// ---------------------------------------------------------------- camaro3 loft
// Brad's '87 Camaro (camaro3) is ALSO built by Neon's loft builder, with
// her fitted 3rd-gen spec (bakeoff-brad/camaro-spec.json) used VERBATIM —
// Cherie (2026-11-20): "Don't change, I like Neon's new one as is." The
// spec carries the canon white-front / maroon-rear split paint, the fixed
// recessed lamps with her beam colour, T-tops, sail pillar, hood louvers
// and IROC wheels; the crew row's paint / paintFade / hoodLouvers / tTop /
// wheels fields are superseded for this style. Rides on the EXTENDED loft
// template (split paint, fixedLamps, sailPillar + tTops, camaroGrid tail,
// camaroWing, iroc5 wheels). Same fleet adapter as the Celica below.
const CAMARO87_LOFT_SPEC = {
  "meta": {
    "name": "Brad's '87 Chevy Camaro Z28 / IROC-Z (3rd Gen)",
    "year": 1987,
    "notes": "Fitted from games/scaggsville-3d/reference/car-real/camaro-clayton/ using wheel diameter (0.652m) as ruler. Canon white-front / maroon-rear split paint + yellow beams (0xffd94a) + T-tops."
  },
  "dims": {
    "length": 4.76,
    "width": 1.84,
    "height": 1.265,
    "wheelbase": 2.57,
    "wheelZFront": 1.3,
    "wheelZRear": -1.27,
    "wheelRadius": 0.326,
    "wheelWidth": 0.245,
    "trackHalfFront": 0.79,
    "trackHalfRear": 0.79,
    "archGap": 0.048
  },
  "paint": {
    "color": 16119285,
    "roughness": 0.2,
    "metalness": 0.28,
    "clearcoat": 0.96,
    "clearcoatRoughness": 0.11,
    "split": {
      "frontColor": 15790320,
      "rearColor": 7479336,
      "zCenter": 0.05,
      "blendWidth": 0.55
    }
  },
  "bodyStations": [
    {
      "z": -2.38,
      "yBot": 0.3,
      "yBelt": 0.74,
      "yDeck": 0.88,
      "wBot": 0.8,
      "wBelt": 0.87,
      "wDeck": 0.81,
      "crown": 0.015
    },
    {
      "z": -2.18,
      "yBot": 0.24,
      "yBelt": 0.76,
      "yDeck": 0.9,
      "wBot": 0.84,
      "wBelt": 0.91,
      "wDeck": 0.84,
      "crown": 0.016
    },
    {
      "z": -1.6,
      "yBot": 0.195,
      "yBelt": 0.76,
      "yDeck": 0.9,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.016
    },
    {
      "z": -0.8,
      "yBot": 0.185,
      "yBelt": 0.75,
      "yDeck": 0.89,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.016
    },
    {
      "z": 0.4,
      "yBot": 0.185,
      "yBelt": 0.74,
      "yDeck": 0.87,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.02
    },
    {
      "z": 1.25,
      "yBot": 0.19,
      "yBelt": 0.72,
      "yDeck": 0.85,
      "wBot": 0.85,
      "wBelt": 0.915,
      "wDeck": 0.84,
      "crown": 0.025
    },
    {
      "z": 1.92,
      "yBot": 0.2,
      "yBelt": 0.67,
      "yDeck": 0.8,
      "wBot": 0.82,
      "wBelt": 0.88,
      "wDeck": 0.8,
      "crown": 0.022
    },
    {
      "z": 2.26,
      "yBot": 0.21,
      "yBelt": 0.6,
      "yDeck": 0.72,
      "wBot": 0.78,
      "wBelt": 0.83,
      "wDeck": 0.75,
      "crown": 0.016
    },
    {
      "z": 2.38,
      "yBot": 0.22,
      "yBelt": 0.56,
      "yDeck": 0.67,
      "wBot": 0.74,
      "wBelt": 0.79,
      "wDeck": 0.71,
      "crown": 0.012
    }
  ],
  "greenhouse": {
    "zRearBase": -1.78,
    "yRearBase": 0.895,
    "wRearBase": 0.77,
    "zRearRoof": -0.74,
    "yRearRoof": 1.255,
    "wRearRoof": 0.6,
    "zFrontRoof": -0.02,
    "yFrontRoof": 1.26,
    "wFrontRoof": 0.61,
    "zFrontBase": 0.66,
    "yFrontBase": 0.865,
    "wFrontBase": 0.79,
    "roofCrown": 0.022,
    "bPillarZ": -0.68,
    "tTops": true,
    "sailPillar": {
      "enabled": true,
      "zRear": -1.16
    },
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.48,
    "sideGlassColor": 1317928,
    "sideGlassOpacity": 0.58,
    "rearGlassColor": 659480,
    "rearGlassOpacity": 0.9,
    "rearWiper": false,
    "mirrors": {
      "z": 0.44,
      "y": 0.9,
      "w": 0.15,
      "h": 0.085,
      "d": 0.12
    }
  },
  "frontFascia": {
    "bumperY": 0.495,
    "bumperH": 0.085,
    "bumperProtrusion": 0.055,
    "rubStripY": 0.305,
    "rubStripH": 0.024,
    "fixedLamps": {
      "enabled": true,
      "y": 0.615,
      "h": 0.135,
      "pocketW": 0.52,
      "xOffset": 0.51,
      "fogLamps": true,
      "lampColor": 16774614,
      "beamColor": 16767306,
      "emissiveIntensity": 2.1,
      "beamOpacity": 0.52
    },
    "lowerIntake": {
      "y": 0.39,
      "h": 0.11,
      "w": 0.84,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": true,
      "painted": true,
      "y": 0.24,
      "h": 0.1,
      "protrusion": 0.045,
      "zBack": 1.8
    },
    "popups": {
      "enabled": false
    }
  },
  "rearFascia": {
    "bumperY": 0.46,
    "bumperH": 0.14,
    "bumperProtrusion": 0.045,
    "rubStripY": 0.37,
    "rubStripH": 0.026,
    "paintedLowerValance": true,
    "tailPanel": {
      "style": "camaroGrid",
      "y": 0.68,
      "h": 0.21,
      "centerW": 0.42,
      "lampW": 0.62,
      "amberOuterW": 0.15,
      "reverseW": 0.12,
      "wrapZ": 0.1
    },
    "spoiler": {
      "style": "camaroWing",
      "z": -2.26,
      "y": 0.9,
      "h": 0.075,
      "d": 0.18,
      "w": 1.62
    },
    "exhaust": {
      "side": "left",
      "count": 2,
      "xOffset": 0.46,
      "y": 0.22,
      "r": 0.032
    },
    "mudFlaps": false,
    "fuelDoor": {
      "z": -1.72,
      "y": 0.76,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.365,
      "h": 0.032
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.21,
      "h": 0.05
    },
    "doorHandle": {
      "z": -0.58,
      "y": 0.77
    },
    "frontSideMarker": {
      "z": 1.92,
      "y": 0.5,
      "w": 0.11,
      "h": 0.026,
      "color": 15236628
    },
    "hoodLouvers": {
      "enabled": true,
      "z": 1.32,
      "w": 0.25,
      "len": 0.56,
      "xOffset": 0.26
    }
  },
  "wheels": {
    "spokeCount": 5,
    "spokeStyle": "iroc5",
    "rimColor": 13686494,
    "tireColor": 1447707,
    "hubRadius": 0.068,
    "rimRatio": 0.69
  }
};

// ---------------------------------------------------------------- cavalier96 loft
// Kosack's '96 Cavalier (cavalier3) is built by the loft builder from NEON's
// photo fit (games/scaggsville-3d/fit-cavalier-neon/cavalier-neon-spec.json,
// verbatim — rounded aero greenhouse, teardrop lamps, UNPAINTED gray bumpers,
// canon red 0x7d1015). The cop light bar is NOT in the spec: it stays a
// fleet-layer extra driven by the crew row's lightBar flag (see the adapter).
const CAVALIER96_LOFT_SPEC = {
  "meta": {
    "name": "Kosack's '96 Chevrolet Cavalier Coupe (Neon Fit)",
    "year": 1996,
    "notes": "Fresh fit from games/scaggsville-3d/reference/car-real/cavalier-kosack/ (factory dims 4.60m x 1.73m x 1.35m, wb 2.64m). Canon RED paint (0x7d1015). Cop light bar is a fleet-layer accessory (omitted from base geometry)."
  },
  "dims": {
    "length": 4.6,
    "width": 1.73,
    "height": 1.35,
    "wheelbase": 2.64,
    "wheelZFront": 1.34,
    "wheelZRear": -1.3,
    "wheelRadius": 0.314,
    "wheelWidth": 0.205,
    "trackHalfFront": 0.76,
    "trackHalfRear": 0.755,
    "archGap": 0.052
  },
  "paint": {
    "color": 8196117,
    "roughness": 0.22,
    "metalness": 0.24,
    "clearcoat": 0.94,
    "clearcoatRoughness": 0.12
  },
  "bodyStations": [
    {
      "z": -2.3,
      "yBot": 0.34,
      "yBelt": 0.72,
      "yDeck": 0.9,
      "wBot": 0.7,
      "wBelt": 0.78,
      "wDeck": 0.71,
      "crown": 0.032
    },
    {
      "z": -2.1,
      "yBot": 0.28,
      "yBelt": 0.78,
      "yDeck": 0.96,
      "wBot": 0.76,
      "wBelt": 0.84,
      "wDeck": 0.77,
      "crown": 0.036
    },
    {
      "z": -1.55,
      "yBot": 0.24,
      "yBelt": 0.8,
      "yDeck": 0.97,
      "wBot": 0.79,
      "wBelt": 0.865,
      "wDeck": 0.79,
      "crown": 0.03
    },
    {
      "z": -0.75,
      "yBot": 0.22,
      "yBelt": 0.78,
      "yDeck": 0.93,
      "wBot": 0.8,
      "wBelt": 0.865,
      "wDeck": 0.79,
      "crown": 0.025
    },
    {
      "z": 0.45,
      "yBot": 0.22,
      "yBelt": 0.76,
      "yDeck": 0.9,
      "wBot": 0.8,
      "wBelt": 0.865,
      "wDeck": 0.79,
      "crown": 0.028
    },
    {
      "z": 1.15,
      "yBot": 0.23,
      "yBelt": 0.73,
      "yDeck": 0.86,
      "wBot": 0.79,
      "wBelt": 0.855,
      "wDeck": 0.77,
      "crown": 0.036
    },
    {
      "z": 1.78,
      "yBot": 0.25,
      "yBelt": 0.66,
      "yDeck": 0.78,
      "wBot": 0.75,
      "wBelt": 0.82,
      "wDeck": 0.73,
      "crown": 0.036
    },
    {
      "z": 2.14,
      "yBot": 0.27,
      "yBelt": 0.58,
      "yDeck": 0.68,
      "wBot": 0.69,
      "wBelt": 0.76,
      "wDeck": 0.66,
      "crown": 0.03
    },
    {
      "z": 2.3,
      "yBot": 0.3,
      "yBelt": 0.53,
      "yDeck": 0.61,
      "wBot": 0.61,
      "wBelt": 0.69,
      "wDeck": 0.58,
      "crown": 0.022
    }
  ],
  "greenhouse": {
    "zRearBase": -1.78,
    "yRearBase": 0.96,
    "wRearBase": 0.72,
    "zRearRoof": -0.78,
    "yRearRoof": 1.32,
    "wRearRoof": 0.55,
    "zFrontRoof": 0.14,
    "yFrontRoof": 1.33,
    "wFrontRoof": 0.56,
    "zFrontBase": 0.92,
    "yFrontBase": 0.88,
    "wFrontBase": 0.75,
    "roofCrown": 0.042,
    "rounded": true,
    "roofArch": 0.055,
    "bPillarZ": -0.44,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.44,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.52,
    "rearGlassColor": 1054240,
    "rearGlassOpacity": 0.76,
    "rearWiper": false,
    "mirrors": {
      "z": 0.62,
      "y": 0.93,
      "w": 0.14,
      "h": 0.085,
      "d": 0.11
    }
  },
  "frontFascia": {
    "bumpers": "unpainted",
    "bumperY": 0.43,
    "bumperH": 0.27,
    "bumperProtrusion": 0.09,
    "bumperCornerR": 0.22,
    "rubStripY": 0.43,
    "rubStripH": 0,
    "lampStyle": "teardrop",
    "grille": {
      "inBumper": true,
      "y": 0.39,
      "h": 0.11,
      "w": 0.84,
      "slats": 4,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.6,
      "h": 0.115,
      "innerSmokedW": 0.34,
      "outerAmberW": 0.14,
      "wrapZ": 0.26
    },
    "lowerIntake": {
      "y": 0.39,
      "h": 0.095,
      "w": 0.78,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": true,
      "y": 0.24,
      "h": 0.065,
      "protrusion": 0.015,
      "zBack": 1.82
    },
    "popups": {
      "enabled": false
    }
  },
  "rearFascia": {
    "bumpers": "unpainted",
    "bumperY": 0.45,
    "bumperH": 0.26,
    "bumperProtrusion": 0.08,
    "bumperCornerR": 0.2,
    "rubStripY": 0.45,
    "rubStripH": 0,
    "paintedLowerValance": false,
    "tailPanel": {
      "style": "oval",
      "y": 0.74,
      "h": 0.15,
      "centerW": 0.52,
      "lampW": 0.44,
      "amberOuterW": 0.06,
      "reverseW": 0.11,
      "wrapZ": 0.18
    },
    "spoiler": {
      "style": "none"
    },
    "exhaust": {
      "side": "left",
      "count": 1,
      "xOffset": 0.44,
      "y": 0.24,
      "r": 0.028
    },
    "mudFlaps": true,
    "fuelDoor": {
      "z": -1.62,
      "y": 0.78,
      "side": -1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.54,
      "h": 0.052
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.23,
      "h": 0.04
    },
    "doorHandle": {
      "z": -0.44,
      "y": 0.8
    }
  },
  "wheels": {
    "spokeCount": 5,
    "spokeStyle": "blade",
    "rimColor": 12764872,
    "tireColor": 1447707,
    "hubRadius": 0.115,
    "rimRatio": 0.62
  }
};

// ---------------------------------------------------------------- mustangFox loft
// Lamar's '87 Mustang GT (mustangFox) from the photo fit
// (games/scaggsville-3d/fit-mustang-lamar/mustang-gt.json, verbatim).
const MUSTANG87_GT_LOFT_SPEC = {
  "meta": {
    "name": "Lamar's '87 Ford Mustang GT Hatchback (Fox)",
    "year": 1987,
    "notes": "Fitted from games/scaggsville-3d/reference/car-real/mustang-lamar/ (Hemmings set) using grid-side.png ratios (WB/L 0.566 measured vs 0.570 factory) anchored to factory dims (L 4.56 / WB 2.60). INTACT car, grey metallic. Photo wheels are 16in basket-weaves (dealer option) - mesh style. Blue side stripe NOT copied (audit: shape only). In-game this car is BURNT - see mustang-gt-burnt spec; smoke/ember treatment is game-layer."
  },
  "dims": {
    "length": 4.56,
    "width": 1.76,
    "height": 1.32,
    "wheelbase": 2.6,
    "wheelZFront": 1.3,
    "wheelZRear": -1.3,
    "wheelRadius": 0.316,
    "wheelWidth": 0.225,
    "trackHalfFront": 0.72,
    "trackHalfRear": 0.73,
    "archGap": 0.042
  },
  "paint": {
    "color": 6580334,
    "roughness": 0.34,
    "metalness": 0.55,
    "clearcoat": 0.8,
    "clearcoatRoughness": 0.2
  },
  "bodyStations": [
    {
      "z": -2.28,
      "yBot": 0.3,
      "yBelt": 0.84,
      "yDeck": 0.93,
      "wBot": 0.74,
      "wBelt": 0.82,
      "wDeck": 0.76,
      "crown": 0.012
    },
    {
      "z": -2.0,
      "yBot": 0.25,
      "yBelt": 0.85,
      "yDeck": 0.94,
      "wBot": 0.79,
      "wBelt": 0.86,
      "wDeck": 0.79,
      "crown": 0.013
    },
    {
      "z": -1.3,
      "yBot": 0.2,
      "yBelt": 0.85,
      "yDeck": 0.92,
      "wBot": 0.81,
      "wBelt": 0.865,
      "wDeck": 0.8,
      "crown": 0.013
    },
    {
      "z": -0.4,
      "yBot": 0.19,
      "yBelt": 0.84,
      "yDeck": 0.9,
      "wBot": 0.81,
      "wBelt": 0.86,
      "wDeck": 0.8,
      "crown": 0.013
    },
    {
      "z": 0.6,
      "yBot": 0.19,
      "yBelt": 0.83,
      "yDeck": 0.89,
      "wBot": 0.81,
      "wBelt": 0.855,
      "wDeck": 0.8,
      "crown": 0.015
    },
    {
      "z": 1.3,
      "yBot": 0.21,
      "yBelt": 0.79,
      "yDeck": 0.85,
      "wBot": 0.8,
      "wBelt": 0.85,
      "wDeck": 0.79,
      "crown": 0.018
    },
    {
      "z": 1.9,
      "yBot": 0.24,
      "yBelt": 0.72,
      "yDeck": 0.79,
      "wBot": 0.77,
      "wBelt": 0.83,
      "wDeck": 0.76,
      "crown": 0.016
    },
    {
      "z": 2.28,
      "yBot": 0.28,
      "yBelt": 0.66,
      "yDeck": 0.74,
      "wBot": 0.71,
      "wBelt": 0.79,
      "wDeck": 0.71,
      "crown": 0.012
    }
  ],
  "greenhouse": {
    "zRearBase": -2.02,
    "yRearBase": 0.945,
    "wRearBase": 0.7,
    "zRearRoof": -0.8,
    "yRearRoof": 1.31,
    "wRearRoof": 0.555,
    "zFrontRoof": 0.22,
    "yFrontRoof": 1.315,
    "wFrontRoof": 0.565,
    "zFrontBase": 0.82,
    "yFrontBase": 0.875,
    "wFrontBase": 0.72,
    "roofCrown": 0.024,
    "bPillarZ": -0.32,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.52,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.62,
    "rearGlassColor": 725016,
    "rearGlassOpacity": 0.88,
    "rearWiper": false,
    "mirrors": {
      "z": 0.6,
      "y": 0.9,
      "w": 0.14,
      "h": 0.085,
      "d": 0.11
    }
  },
  "frontFascia": {
    "bumperY": 0.465,
    "bumperH": 0.155,
    "bumperProtrusion": 0.05,
    "rubStripY": 0.49,
    "rubStripH": 0.045,
    "grille": {
      "y": 0.6,
      "h": 0.1,
      "w": 0.76,
      "slats": 3,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.6,
      "h": 0.1,
      "innerSmokedW": 0.22,
      "outerAmberW": 0.14,
      "wrapZ": 0.22
    },
    "lowerIntake": {
      "y": 0.33,
      "h": 0.06,
      "w": 0.92,
      "dividers": 1
    },
    "chinSpoiler": {
      "enabled": true,
      "y": 0.225,
      "h": 0.09,
      "protrusion": 0.03,
      "zBack": 1.45,
      "painted": true
    },
    "popups": {
      "enabled": false
    },
    "fixedLamps": {
      "enabled": true,
      "y": 0.685,
      "h": 0.14,
      "pocketW": 0.58,
      "xOffset": 0.47,
      "lampColor": 16054265,
      "beamColor": 16767400,
      "emissiveIntensity": 1.5,
      "beamOpacity": 0.4,
      "fogLamps": true
    }
  },
  "rearFascia": {
    "bumperY": 0.44,
    "bumperH": 0.17,
    "bumperProtrusion": 0.05,
    "rubStripY": 0.475,
    "rubStripH": 0.045,
    "paintedLowerValance": true,
    "tailPanel": {
      "style": "camaroGrid",
      "y": 0.815,
      "h": 0.205,
      "centerW": 0.3,
      "lampW": 0.6,
      "amberOuterW": 0.1,
      "reverseW": 0.07,
      "wrapZ": 0.1
    },
    "spoiler": {
      "style": "wing",
      "z": -2.13,
      "y": 0.97,
      "h": 0.125,
      "d": 0.3,
      "w": 1.44
    },
    "exhaust": {
      "side": "dual",
      "count": 1,
      "xOffset": 0.5,
      "y": 0.2,
      "r": 0.028
    },
    "mudFlaps": true,
    "fuelDoor": {
      "z": -1.6,
      "y": 0.8,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.545,
      "h": 0.052
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.225,
      "h": 0.055
    },
    "doorHandle": {
      "z": -0.3,
      "y": 0.795
    },
    "frontSideMarker": {
      "z": 1.95,
      "y": 0.6,
      "w": 0.13,
      "h": 0.03,
      "color": 15236628
    }
  },
  "wheels": {
    "spokeCount": 16,
    "spokeStyle": "mesh",
    "rimColor": 14212062,
    "tireColor": 1447707,
    "hubRadius": 0.06,
    "rimRatio": 0.64
  }
};

// The BURNT variant of the same fit (mustang-burnt.json, verbatim): charred
// paint + scorched glass. The adapter picks it when the crew row is burnt —
// Lamar's car sits at Atholton already burnt (the finale set piece); the
// fire, smoke and ember light stay game-layer effects in the host.
const MUSTANG87_BURNT_LOFT_SPEC = {
  "meta": {
    "name": "Lamar's '87 Ford Mustang GT Hatchback (Fox) \u2014 BURNT",
    "notes": "Burnt variant of the intact GT fit (mustang-gt.json): charred paint/glass/wheels only. In-game treatment per Scaggsville canon: dark smoke + gold-orange ember glow, NO flame tongues \u2014 smoke/glow are game-layer effects, not in this spec."
  },
  "dims": {
    "length": 4.56,
    "width": 1.76,
    "height": 1.32,
    "wheelbase": 2.6,
    "wheelZFront": 1.3,
    "wheelZRear": -1.3,
    "wheelRadius": 0.316,
    "wheelWidth": 0.225,
    "trackHalfFront": 0.72,
    "trackHalfRear": 0.73,
    "archGap": 0.042
  },
  "paint": {
    "color": 1512208,
    "roughness": 0.92,
    "metalness": 0.05,
    "clearcoat": 0.0,
    "clearcoatRoughness": 0.9
  },
  "bodyStations": [
    {
      "z": -2.28,
      "yBot": 0.3,
      "yBelt": 0.84,
      "yDeck": 0.93,
      "wBot": 0.74,
      "wBelt": 0.82,
      "wDeck": 0.76,
      "crown": 0.012
    },
    {
      "z": -2.0,
      "yBot": 0.25,
      "yBelt": 0.85,
      "yDeck": 0.94,
      "wBot": 0.79,
      "wBelt": 0.86,
      "wDeck": 0.79,
      "crown": 0.013
    },
    {
      "z": -1.3,
      "yBot": 0.2,
      "yBelt": 0.85,
      "yDeck": 0.92,
      "wBot": 0.81,
      "wBelt": 0.865,
      "wDeck": 0.8,
      "crown": 0.013
    },
    {
      "z": -0.4,
      "yBot": 0.19,
      "yBelt": 0.84,
      "yDeck": 0.9,
      "wBot": 0.81,
      "wBelt": 0.86,
      "wDeck": 0.8,
      "crown": 0.013
    },
    {
      "z": 0.6,
      "yBot": 0.19,
      "yBelt": 0.83,
      "yDeck": 0.89,
      "wBot": 0.81,
      "wBelt": 0.855,
      "wDeck": 0.8,
      "crown": 0.015
    },
    {
      "z": 1.3,
      "yBot": 0.21,
      "yBelt": 0.79,
      "yDeck": 0.85,
      "wBot": 0.8,
      "wBelt": 0.85,
      "wDeck": 0.79,
      "crown": 0.018
    },
    {
      "z": 1.9,
      "yBot": 0.24,
      "yBelt": 0.72,
      "yDeck": 0.79,
      "wBot": 0.77,
      "wBelt": 0.83,
      "wDeck": 0.76,
      "crown": 0.016
    },
    {
      "z": 2.28,
      "yBot": 0.28,
      "yBelt": 0.66,
      "yDeck": 0.74,
      "wBot": 0.71,
      "wBelt": 0.79,
      "wDeck": 0.71,
      "crown": 0.012
    }
  ],
  "greenhouse": {
    "zRearBase": -2.02,
    "yRearBase": 0.945,
    "wRearBase": 0.7,
    "zRearRoof": -0.8,
    "yRearRoof": 1.31,
    "wRearRoof": 0.555,
    "zFrontRoof": 0.22,
    "yFrontRoof": 1.315,
    "wFrontRoof": 0.565,
    "zFrontBase": 0.82,
    "yFrontBase": 0.875,
    "wFrontBase": 0.72,
    "roofCrown": 0.024,
    "bPillarZ": -0.32,
    "windshieldColor": 657932,
    "windshieldOpacity": 0.94,
    "sideGlassColor": 657932,
    "sideGlassOpacity": 0.95,
    "rearGlassColor": 657932,
    "rearGlassOpacity": 0.95,
    "rearWiper": false,
    "mirrors": {
      "z": 0.6,
      "y": 0.9,
      "w": 0.14,
      "h": 0.085,
      "d": 0.11
    }
  },
  "frontFascia": {
    "bumperY": 0.465,
    "bumperH": 0.155,
    "bumperProtrusion": 0.05,
    "rubStripY": 0.49,
    "rubStripH": 0.045,
    "grille": {
      "y": 0.6,
      "h": 0.1,
      "w": 0.76,
      "slats": 3,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.6,
      "h": 0.1,
      "innerSmokedW": 0.22,
      "outerAmberW": 0.14,
      "wrapZ": 0.22
    },
    "lowerIntake": {
      "y": 0.33,
      "h": 0.06,
      "w": 0.92,
      "dividers": 1
    },
    "chinSpoiler": {
      "enabled": true,
      "y": 0.225,
      "h": 0.09,
      "protrusion": 0.03,
      "zBack": 1.45,
      "painted": true
    },
    "popups": {
      "enabled": false
    },
    "fixedLamps": {
      "enabled": true,
      "y": 0.685,
      "h": 0.14,
      "pocketW": 0.58,
      "xOffset": 0.47,
      "lampColor": 16054265,
      "beamColor": 16767400,
      "emissiveIntensity": 1.5,
      "beamOpacity": 0.4,
      "fogLamps": true
    }
  },
  "rearFascia": {
    "bumperY": 0.44,
    "bumperH": 0.17,
    "bumperProtrusion": 0.05,
    "rubStripY": 0.475,
    "rubStripH": 0.045,
    "paintedLowerValance": true,
    "tailPanel": {
      "style": "camaroGrid",
      "y": 0.815,
      "h": 0.205,
      "centerW": 0.3,
      "lampW": 0.6,
      "amberOuterW": 0.1,
      "reverseW": 0.07,
      "wrapZ": 0.1
    },
    "spoiler": {
      "style": "wing",
      "z": -2.13,
      "y": 0.97,
      "h": 0.125,
      "d": 0.3,
      "w": 1.44
    },
    "exhaust": {
      "side": "dual",
      "count": 1,
      "xOffset": 0.5,
      "y": 0.2,
      "r": 0.028
    },
    "mudFlaps": true,
    "fuelDoor": {
      "z": -1.6,
      "y": 0.8,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.545,
      "h": 0.052
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.225,
      "h": 0.055
    },
    "doorHandle": {
      "z": -0.3,
      "y": 0.795
    },
    "frontSideMarker": {
      "z": 1.95,
      "y": 0.6,
      "w": 0.13,
      "h": 0.03,
      "color": 15236628
    }
  },
  "wheels": {
    "spokeCount": 16,
    "spokeStyle": "mesh",
    "rimColor": 3486254,
    "tireColor": 1447707,
    "hubRadius": 0.06,
    "rimRatio": 0.64
  }
};

// ---------------------------------------------------------------- camaroClayton loft
// Clayton's '89 IROC-Z (his own fit — games/scaggsville-3d/fit-camaro-clayton/
// camaro-clayton-spec.json, verbatim, canon green). NOTE: Clayton's crew row
// shares the camaro3 STYLE with Brad's car, so his loft routing keys on the
// row's loft field, not the style — Brad keeps CAMARO87_LOFT_SPEC above.
const CAMARO89_CLAYTON_LOFT_SPEC = {
  "meta": {
    "name": "Clayton's '89 Chevy Camaro IROC-Z (3rd Gen)",
    "year": 1989,
    "notes": "Same 3rd-gen shell as Brad's car; fitted from games/scaggsville-3d/reference/car-real/camaro-clayton/ (badges/wheels read 1988-90; provenance caveat in SOURCES.md). Canon GREEN paint + warm-white beams. Diffs vs Brad: solid green (no fade), black hood accent panels, later flat 5-spoke wheels."
  },
  "dims": {
    "length": 4.76,
    "width": 1.84,
    "height": 1.265,
    "wheelbase": 2.57,
    "wheelZFront": 1.3,
    "wheelZRear": -1.27,
    "wheelRadius": 0.326,
    "wheelWidth": 0.245,
    "trackHalfFront": 0.79,
    "trackHalfRear": 0.79,
    "archGap": 0.048
  },
  "paint": {
    "color": 1332013,
    "roughness": 0.22,
    "metalness": 0.28,
    "clearcoat": 0.94,
    "clearcoatRoughness": 0.12
  },
  "bodyStations": [
    {
      "z": -2.38,
      "yBot": 0.3,
      "yBelt": 0.74,
      "yDeck": 0.88,
      "wBot": 0.8,
      "wBelt": 0.87,
      "wDeck": 0.81,
      "crown": 0.015
    },
    {
      "z": -2.18,
      "yBot": 0.24,
      "yBelt": 0.76,
      "yDeck": 0.9,
      "wBot": 0.84,
      "wBelt": 0.91,
      "wDeck": 0.84,
      "crown": 0.016
    },
    {
      "z": -1.6,
      "yBot": 0.195,
      "yBelt": 0.76,
      "yDeck": 0.9,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.016
    },
    {
      "z": -0.8,
      "yBot": 0.185,
      "yBelt": 0.75,
      "yDeck": 0.89,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.016
    },
    {
      "z": 0.4,
      "yBot": 0.185,
      "yBelt": 0.74,
      "yDeck": 0.87,
      "wBot": 0.86,
      "wBelt": 0.92,
      "wDeck": 0.85,
      "crown": 0.02
    },
    {
      "z": 1.25,
      "yBot": 0.19,
      "yBelt": 0.72,
      "yDeck": 0.85,
      "wBot": 0.85,
      "wBelt": 0.915,
      "wDeck": 0.84,
      "crown": 0.025
    },
    {
      "z": 1.92,
      "yBot": 0.2,
      "yBelt": 0.67,
      "yDeck": 0.8,
      "wBot": 0.82,
      "wBelt": 0.88,
      "wDeck": 0.8,
      "crown": 0.022
    },
    {
      "z": 2.26,
      "yBot": 0.21,
      "yBelt": 0.6,
      "yDeck": 0.72,
      "wBot": 0.78,
      "wBelt": 0.83,
      "wDeck": 0.75,
      "crown": 0.016
    },
    {
      "z": 2.38,
      "yBot": 0.22,
      "yBelt": 0.56,
      "yDeck": 0.67,
      "wBot": 0.74,
      "wBelt": 0.79,
      "wDeck": 0.71,
      "crown": 0.012
    }
  ],
  "greenhouse": {
    "zRearBase": -1.78,
    "yRearBase": 0.895,
    "wRearBase": 0.77,
    "zRearRoof": -0.74,
    "yRearRoof": 1.255,
    "wRearRoof": 0.6,
    "zFrontRoof": -0.02,
    "yFrontRoof": 1.26,
    "wFrontRoof": 0.61,
    "zFrontBase": 0.66,
    "yFrontBase": 0.865,
    "wFrontBase": 0.79,
    "roofCrown": 0.022,
    "bPillarZ": -0.68,
    "tTops": true,
    "sailPillar": {
      "enabled": true,
      "zRear": -1.16
    },
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.48,
    "sideGlassColor": 1317928,
    "sideGlassOpacity": 0.58,
    "rearGlassColor": 659480,
    "rearGlassOpacity": 0.9,
    "rearWiper": false,
    "mirrors": {
      "z": 0.44,
      "y": 0.9,
      "w": 0.15,
      "h": 0.085,
      "d": 0.12
    }
  },
  "frontFascia": {
    "bumperY": 0.495,
    "bumperH": 0.085,
    "bumperProtrusion": 0.055,
    "rubStripY": 0.305,
    "rubStripH": 0.024,
    "fixedLamps": {
      "enabled": true,
      "y": 0.615,
      "h": 0.135,
      "pocketW": 0.52,
      "xOffset": 0.51,
      "fogLamps": true,
      "lampColor": 16774614,
      "beamColor": 16767400,
      "emissiveIntensity": 1.9,
      "beamOpacity": 0.45
    },
    "lowerIntake": {
      "y": 0.39,
      "h": 0.11,
      "w": 0.84,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": true,
      "painted": true,
      "y": 0.24,
      "h": 0.1,
      "protrusion": 0.045,
      "zBack": 1.8
    },
    "popups": {
      "enabled": false
    }
  },
  "rearFascia": {
    "bumperY": 0.46,
    "bumperH": 0.14,
    "bumperProtrusion": 0.045,
    "rubStripY": 0.37,
    "rubStripH": 0.026,
    "paintedLowerValance": true,
    "tailPanel": {
      "style": "camaroGrid",
      "y": 0.68,
      "h": 0.21,
      "centerW": 0.42,
      "lampW": 0.62,
      "amberOuterW": 0.15,
      "reverseW": 0.12,
      "wrapZ": 0.1
    },
    "spoiler": {
      "style": "camaroWing",
      "z": -2.26,
      "y": 0.9,
      "h": 0.075,
      "d": 0.18,
      "w": 1.62
    },
    "exhaust": {
      "side": "left",
      "count": 2,
      "xOffset": 0.46,
      "y": 0.22,
      "r": 0.032
    },
    "mudFlaps": false,
    "fuelDoor": {
      "z": -1.72,
      "y": 0.76,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.365,
      "h": 0.032
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.21,
      "h": 0.05
    },
    "doorHandle": {
      "z": -0.58,
      "y": 0.77
    },
    "frontSideMarker": {
      "z": 1.92,
      "y": 0.5,
      "w": 0.11,
      "h": 0.026,
      "color": 15236628
    },
    "hoodLouvers": {
      "enabled": true,
      "z": 1.42,
      "w": 0.27,
      "len": 0.95,
      "xOffset": 0.26
    }
  },
  "wheels": {
    "spokeCount": 5,
    "spokeStyle": "blade",
    "rimColor": 13686494,
    "tireColor": 1447707,
    "hubRadius": 0.075,
    "rimRatio": 0.66
  }
};

// ---------------------------------------------------------------- brougham loft
// Grant's '90 Brougham 'USS Mino' (games/scaggsville-3d/fit-brougham-grant/
// brougham-grant-spec.json, verbatim): factory 5.61 m, chrome bumpers,
// eggcrate grille, vertical tails, vinyl roof cap.
const BROUGHAM90_LOFT_SPEC = {
  "meta": {
    "name": "Grant's '90 Cadillac Brougham",
    "year": 1990,
    "notes": "Fitted from games/scaggsville-3d/reference/car-real/brougham-grant/ (Clair Classics 'Custom Gold Edition' car). Canon MAROON paint + vinyl roof; photo car's black/silver two-tone, gold trim and red pinstripe NOT carried. Factory dims: L 5.613 / W 1.913 / H 1.439 / WB 3.086; tyre 235/70R15 (r 0.355). Built on the a254581 archetype extensions: vinylRoof, chromeBumper F/R, eggcrate grille + chromeFrame, tailPanel 'vertical', cPillarZ."
  },
  "dims": {
    "length": 5.61,
    "width": 1.91,
    "height": 1.44,
    "wheelbase": 3.09,
    "wheelZFront": 1.55,
    "wheelZRear": -1.54,
    "wheelRadius": 0.355,
    "wheelWidth": 0.235,
    "trackHalfFront": 0.77,
    "trackHalfRear": 0.77,
    "archGap": 0.05
  },
  "paint": {
    "color": 6231586,
    "roughness": 0.3,
    "metalness": 0.25,
    "clearcoat": 0.8,
    "clearcoatRoughness": 0.18,
    "vinylColor": 2170144
  },
  "bodyStations": [
    {
      "z": -2.8,
      "yBot": 0.34,
      "yBelt": 0.98,
      "yDeck": 1.03,
      "wBot": 0.86,
      "wBelt": 0.93,
      "wDeck": 0.88,
      "crown": 0.01
    },
    {
      "z": -2.45,
      "yBot": 0.27,
      "yBelt": 1.0,
      "yDeck": 1.05,
      "wBot": 0.89,
      "wBelt": 0.945,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": -1.9,
      "yBot": 0.24,
      "yBelt": 1.0,
      "yDeck": 1.05,
      "wBot": 0.9,
      "wBelt": 0.95,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": -1.2,
      "yBot": 0.23,
      "yBelt": 1.0,
      "yDeck": 1.04,
      "wBot": 0.9,
      "wBelt": 0.95,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": -0.3,
      "yBot": 0.23,
      "yBelt": 1.0,
      "yDeck": 1.03,
      "wBot": 0.9,
      "wBelt": 0.95,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": 0.6,
      "yBot": 0.23,
      "yBelt": 1.0,
      "yDeck": 1.03,
      "wBot": 0.9,
      "wBelt": 0.95,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": 1.3,
      "yBot": 0.24,
      "yBelt": 0.99,
      "yDeck": 1.03,
      "wBot": 0.9,
      "wBelt": 0.95,
      "wDeck": 0.9,
      "crown": 0.01
    },
    {
      "z": 2.0,
      "yBot": 0.25,
      "yBelt": 0.98,
      "yDeck": 1.02,
      "wBot": 0.89,
      "wBelt": 0.945,
      "wDeck": 0.895,
      "crown": 0.01
    },
    {
      "z": 2.55,
      "yBot": 0.28,
      "yBelt": 0.96,
      "yDeck": 1.0,
      "wBot": 0.88,
      "wBelt": 0.935,
      "wDeck": 0.885,
      "crown": 0.01
    },
    {
      "z": 2.8,
      "yBot": 0.33,
      "yBelt": 0.94,
      "yDeck": 0.97,
      "wBot": 0.85,
      "wBelt": 0.92,
      "wDeck": 0.87,
      "crown": 0.008
    }
  ],
  "greenhouse": {
    "zRearBase": -1.34,
    "yRearBase": 1.03,
    "wRearBase": 0.78,
    "zRearRoof": -1.02,
    "yRearRoof": 1.435,
    "wRearRoof": 0.72,
    "zFrontRoof": 0.7,
    "yFrontRoof": 1.435,
    "wFrontRoof": 0.72,
    "zFrontBase": 1.02,
    "yFrontBase": 1.02,
    "wFrontBase": 0.8,
    "roofCrown": 0.012,
    "bPillarZ": 0.08,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.5,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.55,
    "rearGlassColor": 725016,
    "rearGlassOpacity": 0.8,
    "rearWiper": false,
    "mirrors": {
      "z": 0.92,
      "y": 1.06,
      "w": 0.14,
      "h": 0.09,
      "d": 0.1
    },
    "vinylRoof": true,
    "cPillarZ": -0.68,
    "cPillarPaint": false
  },
  "frontFascia": {
    "bumperY": 0.44,
    "bumperH": 0.21,
    "bumperProtrusion": 0.1,
    "rubStripY": 0.44,
    "rubStripH": 0.05,
    "grille": {
      "y": 0.8,
      "h": 0.34,
      "w": 0.6,
      "slats": 5,
      "style": "eggcrate",
      "vBars": 11,
      "chromeFrame": true,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.8,
      "h": 0.19,
      "innerSmokedW": 0.33,
      "outerAmberW": 0.1,
      "wrapZ": 0.18
    },
    "lowerIntake": {
      "y": 0.26,
      "h": 0.05,
      "w": 0.9,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": false
    },
    "popups": {
      "enabled": false
    },
    "chromeBumper": true
  },
  "rearFascia": {
    "bumperY": 0.44,
    "bumperH": 0.21,
    "bumperProtrusion": 0.1,
    "rubStripY": 0.44,
    "rubStripH": 0.05,
    "paintedLowerValance": false,
    "tailPanel": {
      "style": "vertical",
      "y": 0.82,
      "h": 0.44,
      "centerW": 1.49,
      "lampW": 0.16,
      "amberOuterW": 0.04,
      "reverseW": 0.05,
      "wrapZ": 0.1
    },
    "spoiler": {
      "style": "none"
    },
    "exhaust": {
      "side": "right",
      "count": 1,
      "xOffset": 0.55,
      "y": 0.24,
      "r": 0.034
    },
    "mudFlaps": false,
    "fuelDoor": null,
    "chromeBumper": true
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.62,
      "h": 0.03
    },
    "rockerSkirt": {
      "enabled": false
    },
    "doorHandle": {
      "z": 0.32,
      "y": 0.95
    },
    "frontSideMarker": {
      "z": 2.35,
      "y": 0.62,
      "w": 0.1,
      "h": 0.025,
      "color": 15236628
    }
  },
  "wheels": {
    "spokeCount": 16,
    "spokeStyle": "mesh",
    "rimColor": 13686494,
    "tireColor": 1447707,
    "hubRadius": 0.06,
    "rimRatio": 0.56
  }
};

// ---------------------------------------------------------------- astroJimmy loft
// Jimmy's 2000 Astro LS gen-2 — NEON's fit (games/scaggsville-3d/
// fit-astro-jimmy-neon/astro-jimmy-spec.json, verbatim). Fleet rule
// (Cherie, Nov 20 22:50): Neon's cars where Neon has one — a merged
// merge-fit exists in fit-astro-jimmy/ but is NOT used. Blue underglow
// stays a fleet-layer extra from the crew row (adapter), not the spec.
const ASTRO_JIMMY_LOFT_SPEC = {
  "meta": {
    "name": "Jimmy's '00 Chevrolet Astro LS (Gen 2)",
    "year": 2000,
    "notes": "Fitted from games/scaggsville-3d/reference/car-real/astro-jimmy/ (4.82m x 1.97m x 1.90m, wb 2.82m). Canon silver paint (0xb8c0ca). Gen-2 longer aero nose, chrome grille bar, wide composite headlamps, 3-bay dark-tinted passenger glass, roof rack, rear Dutch doors + wiper."
  },
  "dims": {
    "length": 4.82,
    "width": 1.97,
    "height": 1.9,
    "wheelbase": 2.82,
    "wheelZFront": 1.48,
    "wheelZRear": -1.34,
    "wheelRadius": 0.345,
    "wheelWidth": 0.235,
    "trackHalfFront": 0.855,
    "trackHalfRear": 0.855,
    "archGap": 0.055
  },
  "paint": {
    "color": 12107978,
    "roughness": 0.22,
    "metalness": 0.42,
    "clearcoat": 0.94,
    "clearcoatRoughness": 0.12
  },
  "bodyStations": [
    {
      "z": -2.41,
      "yBot": 0.35,
      "yBelt": 0.94,
      "yDeck": 1.24,
      "wBot": 0.9,
      "wBelt": 0.97,
      "wDeck": 0.93,
      "crown": 0.018
    },
    {
      "z": -2.2,
      "yBot": 0.32,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.985,
      "wDeck": 0.95,
      "crown": 0.02
    },
    {
      "z": -1.35,
      "yBot": 0.3,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.985,
      "wDeck": 0.95,
      "crown": 0.02
    },
    {
      "z": 0.25,
      "yBot": 0.3,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.985,
      "wDeck": 0.95,
      "crown": 0.02
    },
    {
      "z": 1.45,
      "yBot": 0.31,
      "yBelt": 0.95,
      "yDeck": 1.23,
      "wBot": 0.91,
      "wBelt": 0.975,
      "wDeck": 0.93,
      "crown": 0.026
    },
    {
      "z": 2.08,
      "yBot": 0.33,
      "yBelt": 0.86,
      "yDeck": 1.07,
      "wBot": 0.87,
      "wBelt": 0.93,
      "wDeck": 0.88,
      "crown": 0.028
    },
    {
      "z": 2.41,
      "yBot": 0.36,
      "yBelt": 0.78,
      "yDeck": 0.93,
      "wBot": 0.79,
      "wBelt": 0.87,
      "wDeck": 0.8,
      "crown": 0.022
    }
  ],
  "greenhouse": {
    "zRearBase": -2.34,
    "yRearBase": 1.24,
    "wRearBase": 0.91,
    "zRearRoof": -2.2,
    "yRearRoof": 1.88,
    "wRearRoof": 0.82,
    "zFrontRoof": 0.84,
    "yFrontRoof": 1.89,
    "wFrontRoof": 0.82,
    "zFrontBase": 1.52,
    "yFrontBase": 1.22,
    "wFrontBase": 0.91,
    "roofCrown": 0.036,
    "roofRack": true,
    "bPillarZ": 0.24,
    "cPillarZ": -1.04,
    "cPillarPaint": false,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.44,
    "sideGlassColor": 988446,
    "sideGlassOpacity": 0.68,
    "rearGlassColor": 725016,
    "rearGlassOpacity": 0.84,
    "rearWiper": true,
    "mirrors": {
      "z": 1.12,
      "y": 1.32,
      "w": 0.18,
      "h": 0.13,
      "d": 0.1
    }
  },
  "frontFascia": {
    "bumperY": 0.49,
    "bumperH": 0.24,
    "bumperProtrusion": 0.085,
    "bumperCornerR": 0.2,
    "rubStripY": 0.49,
    "rubStripH": 0,
    "grille": {
      "style": "eggcrate",
      "chromeFrame": true,
      "vBars": 1,
      "y": 0.77,
      "h": 0.25,
      "w": 1.0,
      "slats": 6,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.77,
      "h": 0.24,
      "innerSmokedW": 0.26,
      "outerAmberW": 0.08,
      "wrapZ": 0.16
    },
    "lowerIntake": {
      "y": 0.36,
      "h": 0.06,
      "w": 0.88,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": false
    },
    "popups": {
      "enabled": false
    }
  },
  "rearFascia": {
    "bumperY": 0.48,
    "bumperH": 0.2,
    "bumperProtrusion": 0.085,
    "bumperCornerR": 0.18,
    "rubStripY": 0.56,
    "rubStripH": 0.042,
    "paintedLowerValance": true,
    "barnDoors": true,
    "tailPanel": {
      "style": "vertical",
      "y": 0.89,
      "h": 0.36,
      "centerW": 0.54,
      "lampW": 0.14,
      "amberOuterW": 0.04,
      "reverseW": 0.05,
      "wrapZ": 0.08
    },
    "spoiler": {
      "style": "none"
    },
    "exhaust": {
      "side": "right",
      "count": 1,
      "xOffset": 0.58,
      "y": 0.3,
      "r": 0.032
    },
    "mudFlaps": false,
    "fuelDoor": {
      "z": -0.58,
      "y": 0.74,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": false,
      "y": 0.52,
      "h": 0.04
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.3,
      "h": 0.05
    },
    "doorHandle": {
      "z": 0.34,
      "y": 1.05
    },
    "frontSideMarker": {
      "z": 2.08,
      "y": 0.5,
      "w": 0.12,
      "h": 0.032,
      "color": 15236628
    }
  },
  "wheels": {
    "spokeCount": 5,
    "spokeStyle": "blade",
    "rimColor": 14146526,
    "tireColor": 1447707,
    "hubRadius": 0.085,
    "rimRatio": 0.62
  }
};



// ---------------------------------------------------------------- astroBilly loft
// Billy's 1990 Astro gen-1 — NEON's fit (games/scaggsville-3d/
// fit-astro-billy-neon/astro-billy-spec.json, verbatim; barn doors + roof
// rack in the spec). Same fleet rule as Jimmy's: Neon's own spec, not the
// merged merge-fit in fit-astro-billy/.
const ASTRO_BILLY_LOFT_SPEC = {
  "meta": {
    "name": "Billy's '90 Chevrolet Astro Van (Gen 1)",
    "year": 1990,
    "notes": "Fitted from games/scaggsville-3d/reference/car-real/astro-billy/ (4.49m x 1.96m x 1.90m, wb 2.82m). Canon teal-blue paint (0x1b6d7c). Gen-1 stubby nose, black slat grille, vertical corner markers, 3-bay passenger glass, roof rack, rear barn doors."
  },
  "dims": {
    "length": 4.49,
    "width": 1.96,
    "height": 1.9,
    "wheelbase": 2.82,
    "wheelZFront": 1.38,
    "wheelZRear": -1.44,
    "wheelRadius": 0.345,
    "wheelWidth": 0.235,
    "trackHalfFront": 0.85,
    "trackHalfRear": 0.85,
    "archGap": 0.055
  },
  "paint": {
    "color": 1797500,
    "roughness": 0.26,
    "metalness": 0.24,
    "clearcoat": 0.88,
    "clearcoatRoughness": 0.16
  },
  "bodyStations": [
    {
      "z": -2.245,
      "yBot": 0.36,
      "yBelt": 0.94,
      "yDeck": 1.24,
      "wBot": 0.9,
      "wBelt": 0.96,
      "wDeck": 0.93,
      "crown": 0.015
    },
    {
      "z": -2.05,
      "yBot": 0.33,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.98,
      "wDeck": 0.95,
      "crown": 0.018
    },
    {
      "z": -1.4,
      "yBot": 0.31,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.98,
      "wDeck": 0.95,
      "crown": 0.018
    },
    {
      "z": 0.2,
      "yBot": 0.31,
      "yBelt": 0.96,
      "yDeck": 1.25,
      "wBot": 0.92,
      "wBelt": 0.98,
      "wDeck": 0.95,
      "crown": 0.018
    },
    {
      "z": 1.35,
      "yBot": 0.32,
      "yBelt": 0.95,
      "yDeck": 1.23,
      "wBot": 0.91,
      "wBelt": 0.97,
      "wDeck": 0.93,
      "crown": 0.022
    },
    {
      "z": 1.92,
      "yBot": 0.34,
      "yBelt": 0.88,
      "yDeck": 1.11,
      "wBot": 0.88,
      "wBelt": 0.94,
      "wDeck": 0.89,
      "crown": 0.022
    },
    {
      "z": 2.245,
      "yBot": 0.37,
      "yBelt": 0.82,
      "yDeck": 0.99,
      "wBot": 0.82,
      "wBelt": 0.89,
      "wDeck": 0.83,
      "crown": 0.016
    }
  ],
  "greenhouse": {
    "zRearBase": -2.18,
    "yRearBase": 1.24,
    "wRearBase": 0.91,
    "zRearRoof": -2.06,
    "yRearRoof": 1.88,
    "wRearRoof": 0.82,
    "zFrontRoof": 0.82,
    "yFrontRoof": 1.89,
    "wFrontRoof": 0.82,
    "zFrontBase": 1.44,
    "yFrontBase": 1.23,
    "wFrontBase": 0.91,
    "roofCrown": 0.032,
    "roofRack": true,
    "bPillarZ": 0.26,
    "cPillarZ": -0.96,
    "cPillarPaint": false,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.44,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.56,
    "rearGlassColor": 856862,
    "rearGlassOpacity": 0.78,
    "rearWiper": false,
    "mirrors": {
      "z": 1.06,
      "y": 1.32,
      "w": 0.19,
      "h": 0.14,
      "d": 0.09
    }
  },
  "frontFascia": {
    "chromeBumper": true,
    "bumperY": 0.5,
    "bumperH": 0.19,
    "bumperProtrusion": 0.075,
    "rubStripY": 0.57,
    "rubStripH": 0.048,
    "grille": {
      "y": 0.8,
      "h": 0.25,
      "w": 1.04,
      "slats": 6,
      "topBarText": false
    },
    "cornerLamps": {
      "y": 0.8,
      "h": 0.22,
      "innerSmokedW": 0.22,
      "outerAmberW": 0.11,
      "wrapZ": 0.14
    },
    "lowerIntake": {
      "y": 0.38,
      "h": 0.06,
      "w": 0.92,
      "dividers": 0
    },
    "chinSpoiler": {
      "enabled": false
    },
    "popups": {
      "enabled": false
    }
  },
  "rearFascia": {
    "bumpers": "unpainted",
    "bumperY": 0.5,
    "bumperH": 0.18,
    "bumperProtrusion": 0.085,
    "rubStripY": 0.56,
    "rubStripH": 0.04,
    "barnDoors": true,
    "tailPanel": {
      "style": "vertical",
      "y": 0.9,
      "h": 0.36,
      "centerW": 0.54,
      "lampW": 0.14,
      "amberOuterW": 0.04,
      "reverseW": 0.05,
      "wrapZ": 0.08
    },
    "spoiler": {
      "style": "none"
    },
    "exhaust": {
      "side": "right",
      "count": 1,
      "xOffset": 0.58,
      "y": 0.32,
      "r": 0.032
    },
    "mudFlaps": false,
    "fuelDoor": {
      "z": -0.58,
      "y": 0.72,
      "side": 1
    }
  },
  "trim": {
    "sideRubStrip": {
      "enabled": true,
      "y": 0.54,
      "h": 0.052
    },
    "rockerSkirt": {
      "enabled": false,
      "y": 0.32,
      "h": 0.05
    },
    "doorHandle": {
      "z": 0.36,
      "y": 1.06
    }
  },
  "wheels": {
    "spokeCount": 8,
    "spokeStyle": "blade",
    "rimColor": 13423572,
    "tireColor": 1447707,
    "hubRadius": 0.095,
    "rimRatio": 0.6
  }
};



// ---------------------------------------------------------------- camry loft
// Jason's '89 Camry LE V20 (games/scaggsville-3d/fit-camry/camry-spec.json,
// verbatim, canon white 0xf4f5f6, painted C-pillar band).
const CAMRY89_LOFT_SPEC = {
  "bodyStations": [
    {
      "crown": 0.01,
      "wBelt": 0.815,
      "wBot": 0.76,
      "wDeck": 0.79,
      "yBelt": 0.86,
      "yBot": 0.34,
      "yDeck": 0.94,
      "z": -2.26
    },
    {
      "crown": 0.012,
      "wBelt": 0.83,
      "wBot": 0.78,
      "wDeck": 0.8,
      "yBelt": 0.87,
      "yBot": 0.3,
      "yDeck": 0.955,
      "z": -2.05
    },
    {
      "crown": 0.012,
      "wBelt": 0.84,
      "wBot": 0.795,
      "wDeck": 0.805,
      "yBelt": 0.875,
      "yBot": 0.26,
      "yDeck": 0.95,
      "z": -1.7
    },
    {
      "crown": 0.013,
      "wBelt": 0.845,
      "wBot": 0.8,
      "wDeck": 0.81,
      "yBelt": 0.88,
      "yBot": 0.24,
      "yDeck": 0.945,
      "z": -1.36
    },
    {
      "crown": 0.013,
      "wBelt": 0.845,
      "wBot": 0.805,
      "wDeck": 0.81,
      "yBelt": 0.885,
      "yBot": 0.225,
      "yDeck": 0.94,
      "z": -0.6
    },
    {
      "crown": 0.013,
      "wBelt": 0.845,
      "wBot": 0.805,
      "wDeck": 0.81,
      "yBelt": 0.885,
      "yBot": 0.225,
      "yDeck": 0.945,
      "z": 0.3
    },
    {
      "crown": 0.014,
      "wBelt": 0.84,
      "wBot": 0.8,
      "wDeck": 0.805,
      "yBelt": 0.875,
      "yBot": 0.235,
      "yDeck": 0.945,
      "z": 0.9
    },
    {
      "crown": 0.014,
      "wBelt": 0.835,
      "wBot": 0.795,
      "wDeck": 0.8,
      "yBelt": 0.86,
      "yBot": 0.245,
      "yDeck": 0.925,
      "z": 1.24
    },
    {
      "crown": 0.013,
      "wBelt": 0.82,
      "wBot": 0.78,
      "wDeck": 0.78,
      "yBelt": 0.83,
      "yBot": 0.255,
      "yDeck": 0.875,
      "z": 1.75
    },
    {
      "crown": 0.012,
      "wBelt": 0.795,
      "wBot": 0.755,
      "wDeck": 0.75,
      "yBelt": 0.795,
      "yBot": 0.265,
      "yDeck": 0.815,
      "z": 2.1
    },
    {
      "crown": 0.01,
      "wBelt": 0.76,
      "wBot": 0.72,
      "wDeck": 0.715,
      "yBelt": 0.76,
      "yBot": 0.28,
      "yDeck": 0.775,
      "z": 2.26
    }
  ],
  "dims": {
    "archGap": 0.045,
    "height": 1.37,
    "length": 4.52,
    "trackHalfFront": 0.72,
    "trackHalfRear": 0.71,
    "wheelRadius": 0.308,
    "wheelWidth": 0.195,
    "wheelZFront": 1.24,
    "wheelZRear": -1.36,
    "wheelbase": 2.6,
    "width": 1.69
  },
  "frontFascia": {
    "bumperH": 0.2,
    "bumperProtrusion": 0.06,
    "bumperY": 0.5,
    "chinSpoiler": {
      "enabled": true,
      "h": 0.09,
      "protrusion": 0.01,
      "y": 0.24,
      "zBack": 1.55
    },
    "cornerLamps": {
      "h": 0.115,
      "innerSmokedW": 0.36,
      "outerAmberW": 0.085,
      "wrapZ": 0.16,
      "y": 0.685
    },
    "fixedLamps": {
      "enabled": false
    },
    "grille": {
      "h": 0.095,
      "slats": 2,
      "topBarText": true,
      "w": 0.36,
      "y": 0.685
    },
    "lowerIntake": {
      "dividers": 2,
      "h": 0.06,
      "w": 0.85,
      "y": 0.315
    },
    "popups": {
      "enabled": false
    },
    "rubStripH": 0.034,
    "rubStripY": 0.52
  },
  "greenhouse": {
    "bPillarZ": -0.34,
    "cPillarPaint": true,
    "cPillarZ": -0.92,
    "mirrors": {
      "d": 0.1,
      "h": 0.085,
      "w": 0.13,
      "y": 0.98,
      "z": 0.62
    },
    "rearGlassColor": 725016,
    "rearGlassOpacity": 0.85,
    "rearWiper": false,
    "roofCrown": 0.02,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.64,
    "wFrontBase": 0.71,
    "wFrontRoof": 0.585,
    "wRearBase": 0.72,
    "wRearRoof": 0.575,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.58,
    "yFrontBase": 0.945,
    "yFrontRoof": 1.355,
    "yRearBase": 0.955,
    "yRearRoof": 1.35,
    "zFrontBase": 0.78,
    "zFrontRoof": 0.14,
    "zRearBase": -1.58,
    "zRearRoof": -0.94
  },
  "meta": {
    "name": "Jason's '89 Toyota Camry LE V6 (V20)",
    "notes": "Fit from camry-jason photo set (1989 Camry LE V6, Bring a Trailer via Autoblog; shape-only set). Dims factory-anchored (V20: L 4.52, WB 2.60, W 1.69, H 1.37; tyre 195/60R15, OD 0.615 m) and cross-checked against grid-side.png fractions (WB/L 0.568 photo vs 0.575 factory). Photo set has NO straight front/rear \u2014 fascia stacks traced from front34/rear34. CANON PAINT: white (photo car is Light Blue Metallic \u2014 shape only). Beams: default warm white 0xffd9a8 fleet treatment. Turbine wheel covers approximated with 16 thin blade spokes, rimRatio 0.78. C-pillar: greenhouse.cPillarZ -0.92, cPillarPaint true (a254581 archetype extension). Round 2: paint decimal corrected to 0xF4F5F6 (round 1 rendered pink \u2014 the written decimal 16013750 is 0xF459B6, a conversion slip, not a builder bug); rim colour neutralised to 0xE3E6E8; greenhouse lengthened (windshield base +0.10 fwd, rear glass +0.06 back) toward the photo car's longer cabin.",
    "year": 1989
  },
  "paint": {
    "clearcoat": 0.85,
    "clearcoatRoughness": 0.15,
    "color": 16053750,
    "metalness": 0.25,
    "roughness": 0.28
  },
  "rearFascia": {
    "bumperH": 0.2,
    "bumperProtrusion": 0.06,
    "bumperY": 0.5,
    "exhaust": {
      "count": 1,
      "r": 0.028,
      "side": "right",
      "xOffset": 0.46,
      "y": 0.21
    },
    "fuelDoor": {
      "side": 1,
      "y": 0.78,
      "z": -1.85
    },
    "mudFlaps": true,
    "rubStripH": 0.034,
    "rubStripY": 0.53,
    "spoiler": {
      "style": "none"
    },
    "tailPanel": {
      "amberOuterW": 0.05,
      "centerW": 0.44,
      "h": 0.17,
      "lampW": 0.5,
      "reverseW": 0.1,
      "wrapZ": 0.14,
      "y": 0.79
    }
  },
  "trim": {
    "doorHandle": {
      "y": 0.845,
      "z": -0.3
    },
    "frontSideMarker": {
      "color": 15236628,
      "h": 0.026,
      "w": 0.09,
      "y": 0.6,
      "z": 1.98
    },
    "rockerSkirt": {
      "enabled": true,
      "h": 0.05,
      "y": 0.235
    },
    "sideRubStrip": {
      "enabled": true,
      "h": 0.05,
      "y": 0.68
    }
  },
  "wheels": {
    "hubRadius": 0.075,
    "rimColor": 14935784,
    "rimRatio": 0.78,
    "spokeCount": 16,
    "spokeStyle": "blade",
    "tireColor": 1449259
  }
};

// ---------------------------------------------------------------- tracer loft
// Zack's Tracer (games/scaggsville-3d/fit-tracer/tracer-spec.json, verbatim,
// canon green 0x1e6b45) — REFIT under the fixed tool (Hawk2 7d61aa8b):
// rounded aero greenhouse + roofArch, plump molded bumpers, painted lower
// rear valance. The fit follows the '97-99 third-generation photo set; the
// fleet entry's generation label is Cherie's open call — the roster name is
// deliberately NOT relabelled here.
const TRACER_LOFT_SPEC = {
  "bodyStations": [
    {
      "crown": 0.014,
      "wBelt": 0.8,
      "wBot": 0.74,
      "wDeck": 0.76,
      "yBelt": 0.82,
      "yBot": 0.36,
      "yDeck": 0.9,
      "z": -2.195
    },
    {
      "crown": 0.015,
      "wBelt": 0.825,
      "wBot": 0.77,
      "wDeck": 0.785,
      "yBelt": 0.845,
      "yBot": 0.315,
      "yDeck": 0.915,
      "z": -1.95
    },
    {
      "crown": 0.016,
      "wBelt": 0.84,
      "wBot": 0.79,
      "wDeck": 0.8,
      "yBelt": 0.86,
      "yBot": 0.27,
      "yDeck": 0.915,
      "z": -1.55
    },
    {
      "crown": 0.016,
      "wBelt": 0.845,
      "wBot": 0.8,
      "wDeck": 0.805,
      "yBelt": 0.865,
      "yBot": 0.245,
      "yDeck": 0.905,
      "z": -1.22
    },
    {
      "crown": 0.017,
      "wBelt": 0.85,
      "wBot": 0.805,
      "wDeck": 0.81,
      "yBelt": 0.87,
      "yBot": 0.225,
      "yDeck": 0.9,
      "z": -0.5
    },
    {
      "crown": 0.017,
      "wBelt": 0.85,
      "wBot": 0.805,
      "wDeck": 0.81,
      "yBelt": 0.865,
      "yBot": 0.225,
      "yDeck": 0.9,
      "z": 0.4
    },
    {
      "crown": 0.017,
      "wBelt": 0.845,
      "wBot": 0.8,
      "wDeck": 0.805,
      "yBelt": 0.85,
      "yBot": 0.235,
      "yDeck": 0.895,
      "z": 0.95
    },
    {
      "crown": 0.016,
      "wBelt": 0.84,
      "wBot": 0.795,
      "wDeck": 0.8,
      "yBelt": 0.83,
      "yBot": 0.24,
      "yDeck": 0.875,
      "z": 1.28
    },
    {
      "crown": 0.015,
      "wBelt": 0.825,
      "wBot": 0.78,
      "wDeck": 0.775,
      "yBelt": 0.795,
      "yBot": 0.245,
      "yDeck": 0.83,
      "z": 1.7
    },
    {
      "crown": 0.014,
      "wBelt": 0.8,
      "wBot": 0.755,
      "wDeck": 0.735,
      "yBelt": 0.75,
      "yBot": 0.25,
      "yDeck": 0.775,
      "z": 2.0
    },
    {
      "crown": 0.012,
      "wBelt": 0.765,
      "wBot": 0.715,
      "wDeck": 0.685,
      "yBelt": 0.705,
      "yBot": 0.26,
      "yDeck": 0.715,
      "z": 2.195
    }
  ],
  "dims": {
    "archGap": 0.045,
    "height": 1.34,
    "length": 4.39,
    "trackHalfFront": 0.715,
    "trackHalfRear": 0.71,
    "wheelRadius": 0.298,
    "wheelWidth": 0.185,
    "wheelZFront": 1.28,
    "wheelZRear": -1.22,
    "wheelbase": 2.5,
    "width": 1.7
  },
  "frontFascia": {
    "bumperCornerR": 0.17,
    "bumperH": 0.23,
    "bumperProtrusion": 0.1,
    "bumperY": 0.465,
    "chinSpoiler": {
      "enabled": true,
      "h": 0.042,
      "protrusion": 0.01,
      "y": 0.235,
      "zBack": 1.45
    },
    "cornerLamps": {
      "h": 0.125,
      "innerSmokedW": 0.34,
      "outerAmberW": 0.12,
      "wrapZ": 0.22,
      "y": 0.625
    },
    "fixedLamps": {
      "enabled": false
    },
    "grille": {
      "h": 0.05,
      "slats": 2,
      "topBarText": false,
      "w": 0.3,
      "y": 0.605
    },
    "lowerIntake": {
      "dividers": 1,
      "h": 0.065,
      "w": 1.02,
      "y": 0.265
    },
    "popups": {
      "enabled": false
    },
    "rubStripH": 0.02,
    "rubStripY": 0.47
  },
  "greenhouse": {
    "bPillarZ": -0.3,
    "cPillarPaint": false,
    "mirrors": {
      "d": 0.1,
      "h": 0.08,
      "w": 0.125,
      "y": 0.95,
      "z": 0.78
    },
    "rearGlassColor": 725016,
    "rearGlassOpacity": 0.84,
    "rearWiper": false,
    "roofArch": 0.048,
    "roofCrown": 0.034,
    "rounded": true,
    "sideGlassColor": 1450028,
    "sideGlassOpacity": 0.6,
    "wFrontBase": 0.73,
    "wFrontRoof": 0.6,
    "wRearBase": 0.72,
    "wRearRoof": 0.585,
    "windshieldColor": 1713718,
    "windshieldOpacity": 0.55,
    "yFrontBase": 0.9,
    "yFrontRoof": 1.298,
    "yRearBase": 0.915,
    "yRearRoof": 1.29,
    "zFrontBase": 0.88,
    "zFrontRoof": -0.08,
    "zRearBase": -1.42,
    "zRearRoof": -0.64
  },
  "meta": {
    "name": "Zack's '97 Mercury Tracer GS Sedan (photo-gen fit)",
    "notes": "GENERATION FLAG: photo set is the 1997-99 THIRD-generation Tracer (rounded Escort-based sedan, Cincinnati dealer set, 800x600 max res); the fleet entry describes the 1991-96 car. This fit follows THE PHOTOS (gen-3) per instructions, pending Cherie's call on which generation the fleet car should be. Dims factory-anchored for the '97 sedan (L 4.39, WB 2.50, W 1.70, H 1.34; tyre 185/65R14, OD 0.596 m); side.jpg is slightly yawed so overhangs were NOT photo-traced. Wheels in photos are aftermarket \u2014 proportions only; fitted a generic twin-spoke. CANON PAINT: green (photo car is Silver Frost \u2014 shape only). C-pillar: greenhouse.cPillarZ -1.02, cPillarPaint false (a254581 archetype extension). Round 2: cPillar cylinder removed (rendered as a rod above the roofline; the loft rear-glass slope carries the C-pillar read), chin spoiler tucked (h 0.07->0.05, y 0.22->0.235) toward the photo car's subtle lower lip; paint decimal corrected to 0x1E6B45. REFIT (fixed tool, gamepress 1c763be): greenhouse.rounded=true + roofArch 0.05, roof span shortened (zFrontRoof 0.18->0.02, zRearRoof -0.70->-0.50) so both glass ramps lengthen and the dome curve carries the profile; roof peaks lowered (yFrontRoof 1.298, yRearRoof 1.29), roofCrown 0.034, roof widths narrowed (0.60/0.585). Bumpers: cornerR 0.21/0.20, protrusion 0.07->0.05 for the integrated body-color read. cPillarZ stays REMOVED: in the fixed builder it is still a 0.026r cylinder (a rod, not the car's wide sail); the rounded mode's curved body-color roof-to-hatch arch rail is the C-pillar treatment. Round 2: dome apex shifted rearward (zFrontRoof -0.08, zRearRoof -0.64) \u2014 round 1's apex sat over the front door and the rear glass ran fastback-long; photo car peaks at the B-pillar with a shorter, steeper backlight. Bumpers: protrusion RAISED (0.09/0.085) because buildWrapBeamGeo caps corner radius at depth*0.8 \u2014 the deeper beam is what actually unlocks cornerR (effective ~0.12 front / ~0.11 rear vs ~0.09 capped before), reading as a plump molded cover instead of a flat slab. Round 3: rear bumper band slimmed (H 0.24->0.215, Y 0.485), protrusion 0.095 (corner cap ~0.124), paintedLowerValance=true (photo car's lower rear wraps under in body color; the black valance band was half the stacked-slab read). Front protrusion 0.10 (corner cap ~0.128), chin spoiler h 0.042 toward the photo car's subtle lower lip.",
    "year": 1997
  },
  "paint": {
    "clearcoat": 0.9,
    "clearcoatRoughness": 0.13,
    "color": 1993541,
    "metalness": 0.3,
    "roughness": 0.26
  },
  "rearFascia": {
    "bumperCornerR": 0.16,
    "bumperH": 0.215,
    "bumperProtrusion": 0.095,
    "bumperY": 0.485,
    "exhaust": {
      "count": 1,
      "r": 0.026,
      "side": "right",
      "xOffset": 0.48,
      "y": 0.2
    },
    "fuelDoor": {
      "side": -1,
      "y": 0.76,
      "z": -1.8
    },
    "mudFlaps": false,
    "paintedLowerValance": true,
    "rubStripH": 0.02,
    "rubStripY": 0.5,
    "spoiler": {
      "style": "none"
    },
    "tailPanel": {
      "amberOuterW": 0.04,
      "centerW": 0.8,
      "h": 0.155,
      "lampW": 0.33,
      "reverseW": 0.09,
      "wrapZ": 0.2,
      "y": 0.795
    }
  },
  "trim": {
    "doorHandle": {
      "y": 0.9,
      "z": -0.18
    },
    "frontSideMarker": {
      "color": 15236628,
      "h": 0.026,
      "w": 0.09,
      "y": 0.58,
      "z": 1.9
    },
    "rockerSkirt": {
      "enabled": true,
      "h": 0.045,
      "y": 0.225
    },
    "sideRubStrip": {
      "enabled": true,
      "h": 0.034,
      "y": 0.7
    }
  },
  "wheels": {
    "hubRadius": 0.06,
    "rimColor": 13684944,
    "rimRatio": 0.62,
    "spokeCount": 7,
    "spokeStyle": "twin",
    "tireColor": 1449259
  }
};


// Driver anchor for a loft spec, following the two hand-tuned cars exactly:
// the loft interior puts its steering wheel at x +0.34, z = zFrontBase-0.42,
// and the seated figure's hips sit 0.48 behind the wheel and ~0.26 below the
// windshield base. (Celica: formula gives [0.34, 0.605, -0.14] vs the tuned
// [0.34, 0.59, -0.14]; Camaro: [0.34, 0.605, -0.24] vs [0.34, 0.62, -0.24] —
// z exact, y within 1.5 cm; the tuned two keep their literals above.)
function loftAnchorFor(spec) {
  const gh = spec.greenhouse;
  return [0.34, +(gh.yFrontBase - 0.26).toFixed(3), +(gh.zFrontBase - 0.90).toFixed(3)];
}

function buildLoftVehicle(row, spec, anchorPos, beamFallback, usePopups) {
  const loft = buildLoftedCar(spec);
  if (usePopups) {
    // fleet light convention: a popups row rides pods-up and lit; popupsDown
    // sits flush with no light signature. Default for this style is up.
    loft.setPopups(row.popupsDown ? 0 : 1);
  }
  const d = spec.dims;
  // Driver anchor at the loft interior's own steering wheel: the loft is
  // modelled driver-left (+X, see the gpcar_loft.js header) with its wheel
  // at x +0.34, so the seated figure's hands land on the rim exactly as on
  // the fleet cars. Hips sit just ahead of the loft seat backs; scale
  // follows the fleet formula against the loft roof height.
  const driverAnchor = new THREE.Object3D();
  driverAnchor.position.set(anchorPos[0], anchorPos[1], anchorPos[2]);
  driverAnchor.name = 'driverAnchor';
  loft.group.add(driverAnchor);
  const gh = spec.greenhouse;
  const roofTop = Math.max(gh.yRearRoof, gh.yFrontRoof) + (gh.roofCrown || 0);
  const driverScale = THREE.MathUtils.clamp((roofTop - 0.10 - driverAnchor.position.y) / 0.72, 0.8, 1);
  // loft wheels arrive as an array [fr, fl, rr, rl] of {steerPivot, spinPivot}
  const lw = loft.wheels;
  const wheels = {
    fl: { pivot: lw[1].steerPivot, spin: lw[1].spinPivot },
    fr: { pivot: lw[0].steerPivot, spin: lw[0].spinPivot },
    rl: { pivot: lw[3].steerPivot, spin: lw[3].spinPivot },
    rr: { pivot: lw[2].steerPivot, spin: lw[2].spinPivot },
  };
  const veh = {
    group: loft.group, wheels, row, driverAnchor, driverScale,
    beamColor: row.beamColor !== undefined ? row.beamColor : beamFallback,
    dims: { len: d.length, wid: d.width, wheelR: d.wheelRadius },
    _spin: 0,
    setLights(opts) {
      if (loft.setLights) loft.setLights(opts);
    },
    setRoadLift(y) {
      if (loft.setRoadLift) loft.setRoadLift(y);
    },
    setBrake(on) {
      if (loft.setBrake) loft.setBrake(on);
    },
    updateWheels(speed, steer, dt) {
      this._spin += (speed * dt) / d.wheelRadius;
      // the loft applies steer directly as pivot yaw; the fleet convention
      // negates it (driver +steer = right turn = negative three.js yaw)
      loft.updateWheels(speed, -(steer || 0), dt);
    },
  };
  // Fleet-layer extras the fitted specs deliberately do NOT carry (game
  // state, not the car's shape) — mirrored from the extruded factory:
  // Kosack's cop light bar (row.lightBar) seated on the loft roof, exposed
  // as veh.lightBar so the fake-cop mission can flash/toggle it; Jimmy's
  // blue underglow (row.underglow) as the same ground-glow plane.
  if (row.lightBar) {
    const bar = new THREE.Group();
    const barZ = (gh.zFrontRoof + gh.zRearRoof) / 2;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.05, 0.26), VEHICLE_MATS.dark);
    base.position.set(0, roofTop + 0.025, barZ);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22), VEHICLE_MATS.tail);
    red.position.set(-0.27, roofTop + 0.075, barZ);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2a5bff, emissive: 0x2a5bff, emissiveIntensity: 1.6 }));
    blue.position.set(0.27, roofTop + 0.075, barZ);
    bar.add(base, red, blue);
    bar.traverse(m => { if (m.isMesh) m.castShadow = true; });
    loft.group.add(bar);
    veh.lightBar = bar;
  }
  if (row.underglow) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(d.width * 1.12, d.length * 0.98),
      new THREE.MeshBasicMaterial({ color: row.underglow, transparent: true, opacity: 0.17, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.085; // above road ribbons (y .06) or it hides under them
    loft.group.add(glow);
  }
  return veh;
}

// ---------------------------------------------------------------- factory
// Row: { style, paint, paint2, twoTone: 'band'|'cladding', glassTint,
//        lightBar, hoodLouvers, underglow, fogLamps, spoiler, burnt,
//        wheels: 'alloy'|'steel'|'wire'|'multi' (multi = 10 thin spokes),
//        popups: raised pop-up pods (on styles with popups: true),
//        popupsDown: lids shut — flush hood panels, no headlight signature,
//        beamColor: hex — this car's headlight beam colour (lens, halo and
//          road pool all follow it; veh.beamColor exposes it, resolved
//          against the warm default, so hosts can tint their spotlight),
//        loft: key of a photo-fitted loft spec (cavalier96, mustangFox,
//          camaroClayton, brougham, astroJimmy, astroBilly, camry, tracer) —
//          the car is built by gpcar_loft.js from the embedded fitted spec
//          instead of the extrusion factory; style/paint/wheels fields are
//          superseded, lightBar/underglow/burnt still apply as fleet extras,
//        paintFade: { front, rear, zWhite, zFull } — paint colour varies
//          along the car's length: `front` from the nose back to zWhite,
//          fading to `rear` by zFull, `rear` from there to the tail
//          (vertex colours on the paint; overrides the flat paint colour) }
// Returns { group, wheels: {fl, fr, rl, rr}, dims: {len, wid, wheelR},
//           beamColor, updateWheels(speed, steer, dt), spin (wheel angle) }
export function buildVehicle(row) {
  // The rest of the fitted fleet routes on the crew row's `loft` key (two
  // rows share the camaro3 style and two share cavalier3, so style alone
  // cannot carry this). Beam fallback is the canon warm 0xffd9a8 wherever
  // the fitted spec does not name its own lamp beam colour.
  if (row.loft === 'cavalier96') return buildLoftVehicle(row, CAVALIER96_LOFT_SPEC, loftAnchorFor(CAVALIER96_LOFT_SPEC), 0xffd9a8, false);
  if (row.loft === 'mustangFox') { const ms = row.burnt ? MUSTANG87_BURNT_LOFT_SPEC : MUSTANG87_GT_LOFT_SPEC; return buildLoftVehicle(row, ms, loftAnchorFor(ms), ms.frontFascia.fixedLamps.beamColor, false); }
  if (row.loft === 'camaroClayton') return buildLoftVehicle(row, CAMARO89_CLAYTON_LOFT_SPEC, loftAnchorFor(CAMARO89_CLAYTON_LOFT_SPEC), CAMARO89_CLAYTON_LOFT_SPEC.frontFascia.fixedLamps.beamColor, false);
  if (row.loft === 'brougham') return buildLoftVehicle(row, BROUGHAM90_LOFT_SPEC, loftAnchorFor(BROUGHAM90_LOFT_SPEC), 0xffd9a8, false);
  if (row.loft === 'astroJimmy') return buildLoftVehicle(row, ASTRO_JIMMY_LOFT_SPEC, loftAnchorFor(ASTRO_JIMMY_LOFT_SPEC), 0xffd9a8, false);
  if (row.loft === 'astroBilly') return buildLoftVehicle(row, ASTRO_BILLY_LOFT_SPEC, loftAnchorFor(ASTRO_BILLY_LOFT_SPEC), 0xffd9a8, false);
  if (row.loft === 'camry') return buildLoftVehicle(row, CAMRY89_LOFT_SPEC, loftAnchorFor(CAMRY89_LOFT_SPEC), 0xffd9a8, false);
  if (row.loft === 'tracer') return buildLoftVehicle(row, TRACER_LOFT_SPEC, loftAnchorFor(TRACER_LOFT_SPEC), 0xffd9a8, false);
  if (row.style === 'celica87') return buildLoftVehicle(row, CELICA87_LOFT_SPEC, [0.34, 0.59, -0.14], CELICA87_LOFT_SPEC.frontFascia.popups.beamColor, true); // loft-built (see above)
  if (row.style === 'camaro3') return buildLoftVehicle(row, CAMARO87_LOFT_SPEC, [0.34, 0.62, -0.24], CAMARO87_LOFT_SPEC.frontFascia.fixedLamps.beamColor, false); // loft-built, spec verbatim
  const st = VEHICLE_STYLES[row.style] || VEHICLE_STYLES.sedan;
  const L = st.len, W = st.wid, R = st.wheelR;
  const group = new THREE.Group();
  const fade = row.paintFade || null;
  const paint = paintMat(row.paint, row.burnt ? 0.85 : 0.3, row.burnt ? 0 : 0.75);
  const paint2 = row.paint2 !== undefined ? paintMat(row.paint2, 0.4) : null;
  if (fade) { // length-wise fade rides in vertex colours (applyLengthFade)
    paint.color.set(0xffffff); paint.vertexColors = true;
    if (paint2) { paint2.color.set(0xffffff); paint2.vertexColors = true; }
  }

  // body (paint extrusion)
  const bodyGeo = profileGeo(st.body, W);
  if (fade) applyLengthFade(bodyGeo, fade);
  const body = new THREE.Mesh(bodyGeo, paint);
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  // two-tone lower band / cladding: a second, wider extrusion of the body's
  // lower slice (classic two-tone paint split at the beltline's lower third)
  if (paint2 && row.twoTone) {
    const yTop = row.twoTone === 'cladding' ? 0.62 : 0.60;
    const band = st.body.filter(([, y]) => y <= yTop + 0.2).map(([z, y]) => [z, Math.min(y, yTop)]);
    // build a closed lower profile from the body points clipped at yTop
    const prof = [];
    prof.push([st.body[0][0], st.body[0][1]]);
    for (const [z, y] of st.body) prof.push([z, Math.min(y, yTop)]);
    const bandGeo = profileGeo(prof, W + 0.025, 0.03);
    if (fade) applyLengthFade(bandGeo, fade);
    const bandMesh = new THREE.Mesh(bandGeo, paint2);
    bandMesh.castShadow = true;
    group.add(bandMesh);
  }

  // glasshouse
  const glassGeos = [], trimGeos = [], darkGeos = [], lightGeos = [], headGeos = [], tailGeos = [], amberGeos = [], paintGeos = [], seatGeos = [], dashGeos = [];
  if (st.cabin && !st.van) {
    const cabW = W * (st.cabinW || 0.87);
    const cabinGeo = profileGeo(st.cabin, cabW);
    if (fade) applyLengthFade(cabinGeo, fade);
    const cabin = new THREE.Mesh(cabinGeo, paint);
    cabin.castShadow = true;
    group.add(cabin);
    if (st.vinylRoof) {
      // vinyl roof cap: thin slab over the cabin top in matte vinyl
      const top = st.cabin.reduce((a, p) => Math.max(a, p[1]), 0);
      const zR = st.cabin.filter(p => p[1] > top - 0.03);
      const z0 = Math.min(...zR.map(p => p[0])), z1 = Math.max(...zR.map(p => p[0]));
      box(trimGeos, 0, 0, 0); trimGeos.pop();
      const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.02, 0.035, z1 - z0), VEHICLE_MATS.vinyl);
      roofSlab.position.set(0, top + 0.005, (z0 + z1) / 2);
      group.add(roofSlab);
    }
    if (row.tTop) {
      const top = st.cabin.reduce((a, p) => Math.max(a, p[1]), 0);
      const zR = st.cabin.filter(p => p[1] > top - 0.03);
      const z0 = Math.min(...zR.map(p => p[0])), z1 = Math.max(...zR.map(p => p[0]));
      box(glassGeos, cabW - 0.1, 0.03, (z1 - z0) * 0.92, 0, top + 0.01, (z0 + z1) / 2);
    }
  }
  // glass panels laid ON the profile slopes: each segment's endpoints come
  // from the body/cabin profile itself, so a panel can never float off the
  // surface or poke through the roofline.
  const g = st.glass || {};
  const cabW2 = st.van ? W : W * (st.cabinW || 0.87);
  const panel = (seg, w) => {
    if (!seg) return;
    const dz = seg[2] - seg[0], dy = seg[3] - seg[1];
    const H = Math.hypot(dz, dy), tilt = Math.atan2(dz, dy);
    const cz = (seg[0] + seg[2]) / 2, cy = (seg[1] + seg[3]) / 2;
    let nz = -dy / H, ny = dz / H;
    if (nz * cz + ny * (cy - 0.85) < 0) { nz = -nz; ny = -ny; } // outward normal
    box(glassGeos, w, H * 0.97, 0.03, 0, cy + ny * 0.015, cz + nz * 0.015, tilt, 0, 0);
  };
  panel(g.shield, cabW2 - 0.06);
  panel(g.rear, g.rearW ? W * g.rearW : cabW2 - 0.06);
  if (g.band) {
    const bw = st.van ? W + 0.015 : cabW2 + 0.015;
    box(glassGeos, bw, g.band.h, g.band.z1 - g.band.z0, 0, g.band.y, (g.band.z0 + g.band.z1) / 2);
  }
  if (g.quarter) { // sloped quarter glass lying on the hatch slope (liftbacks):
    // a thin sheet per side, tilted with the rear-glass segment it parallels
    const q = g.quarter, qdz = q[2] - q[0], qdy = q[3] - q[1];
    const qH = Math.hypot(qdz, qdy), qTilt = Math.atan2(qdz, qdy);
    for (const sx of [-1, 1])
      box(glassGeos, 0.03, qH * 0.96, 0.04, sx * (cabW2 / 2 + 0.006), (q[1] + q[3]) / 2, (q[0] + q[2]) / 2, qTilt, 0, 0);
  }

  // ---- interior tub: floor, dash, seats, steering wheel — seen through the
  // tinted glass, so the cabin reads as a real cabin instead of a hollow shell.
  const band = g.band || { z0: -0.8, z1: 0.3, y: 1.1, h: 0.3 };
  const shSeg = g.shield || [0.5, 0.9, 0.0, 1.3];
  const lowEnd = shSeg[1] <= shSeg[3] ? [shSeg[0], shSeg[1]] : [shSeg[2], shSeg[3]]; // windshield base (z, y)
  const floorY = st.van ? 0.55 : 0.42;
  const dashZ = st.van ? 1.55 : lowEnd[0] - 0.04;
  const dashY = st.van ? band.y - 0.35 : lowEnd[1] + 0.03;
  const wheelZ = dashZ - 0.26, wheelY = dashY + 0.02;
  const seatZ = st.van ? wheelZ - 0.50 : Math.max(band.z0 + 0.12, wheelZ - 0.50);
  const driverX = -(cabW2 / 2 - 0.37);
  box(dashGeos, cabW2 - 0.06, 0.05, dashZ - (band.z0 - 0.62), 0, floorY, (dashZ + band.z0 - 0.62) / 2); // floor pan
  box(dashGeos, cabW2 - 0.10, 0.15, 0.30, 0, dashY - 0.06, dashZ);                                       // dash
  box(dashGeos, cabW2 - 0.10, 0.035, 0.34, 0, dashY + 0.03, dashZ);                                      // dash top pad
  box(dashGeos, 0.05, 0.05, 0.28, driverX, wheelY - 0.08, dashZ - 0.13, 0.5, 0, 0);                      // column
  const _wt = new THREE.TorusGeometry(0.185, 0.021, 8, 20);
  _wt.applyMatrix4(xform(driverX, wheelY, wheelZ, 1.12, 0, 0));
  dashGeos.push(_wt.index ? _wt.toNonIndexed() : _wt);
  const seat = (x, z) => {
    box(seatGeos, 0.52, 0.13, 0.50, x, floorY + 0.13, z);
    box(seatGeos, 0.52, 0.52, 0.12, x, floorY + 0.38, z - 0.27, -0.15, 0, 0);
  };
  seat(driverX, seatZ); seat(-driverX, seatZ);
  if (!st.hatchBody) { // rear bench
    box(seatGeos, cabW2 - 0.14, 0.13, 0.44, 0, floorY + 0.13, band.z0 - 0.30);
    box(seatGeos, cabW2 - 0.14, 0.50, 0.12, 0, floorY + 0.36, band.z0 - 0.55, -0.12, 0, 0);
  }
  // driver anchor: the host seats a figure here (origin at the driver's hips,
  // facing +Z). driverScale shrinks the figure to fit low cabins (coupes).
  const driverAnchor = new THREE.Object3D();
  driverAnchor.position.set(driverX, floorY + 0.21, seatZ + 0.02);
  driverAnchor.name = 'driverAnchor';
  group.add(driverAnchor);
  const _prof = st.cabin || st.body;
  let cabinTop = 0;
  for (const [pz, py] of _prof) { if (!st.cabin && (pz < band.z0 - 0.5 || pz > band.z1 + 0.3)) continue; cabinTop = Math.max(cabinTop, py); }
  if (st.van) cabinTop = 1.90;
  const driverScale = THREE.MathUtils.clamp((cabinTop - 0.10 - driverAnchor.position.y) / 0.72, 0.8, 1);

  // lights: headlights + amber corners front, full-width-ish tails rear
  const hw = W / 2 - 0.34;
  if (!st.popups) { // pop-up cars carry their lamps in the pods, not on the face
    box(headGeos, 0.36, 0.11, 0.04, -hw, st.headY, L / 2 + 0.005);
    box(headGeos, 0.36, 0.11, 0.04, hw, st.headY, L / 2 + 0.005);
  }
  box(tailGeos, 0.42, 0.10, 0.04, -hw, st.tailY, -L / 2 - 0.005);
  box(tailGeos, 0.42, 0.10, 0.04, hw, st.tailY, -L / 2 - 0.005);
  if (row.fogLamps) {
    box(headGeos, 0.13, 0.13, 0.04, -W / 2 + 0.42, 0.34, L / 2 + 0.01);
    box(headGeos, 0.13, 0.13, 0.04, W / 2 - 0.42, 0.34, L / 2 + 0.01);
  }
  if (row.popups && st.popups) { // pop-ups UP, modelled from the up-and-lit
    // photo: black bucket at the hood's front corner, tilted body-colour lid
    // on top, one big rectangular lamp face on the pod's front
    for (const sx of [-1, 1]) {
      box(darkGeos, 0.38, 0.20, 0.30, sx * 0.56, 0.84, L / 2 - 0.36, -0.22, 0, 0);
      box(paintGeos, 0.37, 0.05, 0.32, sx * 0.56, 0.955, L / 2 - 0.385, -0.22, 0, 0);
      box(headGeos, 0.31, 0.15, 0.03, sx * 0.56, 0.855, L / 2 - 0.19, -0.22, 0, 0);
    }
  } else if (row.popupsDown && st.popups) { // pop-ups DOWN: flush lid panels
    // on the hood (dark seam under a paint lid) — hood line stays unbroken
    for (const sx of [-1, 1]) {
      box(darkGeos, 0.385, 0.012, 0.335, sx * 0.56, 0.822, L / 2 - 0.36, -0.075, 0, 0);
      box(paintGeos, 0.36, 0.014, 0.315, sx * 0.56, 0.830, L / 2 - 0.36, -0.075, 0, 0);
    }
  } else if (row.popups) { // generic raised pop-up pods (legacy rows)
    box(paintGeos, 0.36, 0.07, 0.34, -W / 2 + 0.36, st.headY + 0.13, L / 2 - 0.38);
    box(paintGeos, 0.36, 0.07, 0.34, W / 2 - 0.36, st.headY + 0.13, L / 2 - 0.38);
    box(headGeos, 0.30, 0.06, 0.03, -W / 2 + 0.36, st.headY + 0.10, L / 2 - 0.20);
    box(headGeos, 0.30, 0.06, 0.03, W / 2 - 0.36, st.headY + 0.10, L / 2 - 0.20);
  }
  // grille + bumpers + trim
  if (st.chromeBumpers) {
    box(trimGeos, W * 0.96, 0.16, 0.10, 0, 0.38, L / 2 + 0.05);
    box(trimGeos, W * 0.96, 0.16, 0.10, 0, 0.38, -L / 2 - 0.05);
  } else if (!st.noBumperBand) { // styles with their own face/valance work opt out
    box(darkGeos, W * 0.9, 0.13, 0.06, 0, 0.40, L / 2 + 0.01);
    box(darkGeos, W * 0.9, 0.13, 0.06, 0, 0.42, -L / 2 - 0.01);
  }
  if (row.style === 'brougham') box(trimGeos, W * 0.52, 0.34, 0.06, 0, 0.68, L / 2 + 0.01); // tall chrome grille
  if (row.style === 'astro1') box(darkGeos, W * 0.8, 0.30, 0.05, 0, 0.72, L / 2 + 0.01);     // black grille panel
  if (row.style === 'astro2') { box(darkGeos, W * 0.78, 0.09, 0.05, 0, 0.80, L / 2 + 0.01); box(darkGeos, W * 0.78, 0.09, 0.05, 0, 0.60, L / 2 + 0.01); }
  if (row.style === 'camaro3') { // black headlight buckets — the IROC signature
    box(darkGeos, W * 0.86, 0.17, 0.05, 0, st.headY + 0.01, L / 2 + 0.002);
  }
  if (st.rubStripe || row.rubStripe) {
    box(darkGeos, 0.03, 0.07, L * 0.86, -W / 2 - 0.004, 0.62, 0);
    box(darkGeos, 0.03, 0.07, L * 0.86, W / 2 + 0.004, 0.62, 0);
  }
  if (row.hoodLouvers) { // twin dark louver panels on the hood
    box(darkGeos, 0.34, 0.025, 0.85, -0.28, 0.845, L / 2 - 1.05, -0.10, 0, 0);
    box(darkGeos, 0.34, 0.025, 0.85, 0.28, 0.845, L / 2 - 1.05, -0.10, 0, 0);
  }
  if (row.spoiler) box(darkGeos, W * 0.8, 0.045, 0.30, 0, 0.99, -L / 2 + 0.22);
  if (row.style === 'celica1') { // black tail panel + C-pillar louvers
    box(darkGeos, W * 0.8, 0.20, 0.04, 0, 0.70, -L / 2 - 0.01);
    box(darkGeos, 0.03, 0.26, 0.20, -W * 0.435, 1.08, -0.98, 0, 0, 0);
    box(darkGeos, 0.03, 0.26, 0.20, W * 0.435, 1.08, -0.98, 0, 0, 0);
  }
  if (row.style === 'celica87') { // T160 details, from the photo set
    // black grille panel on the face, between the pop-up lids (plain black —
    // bright slat lines just pick up the sunset and read as rust)
    box(darkGeos, W * 0.52, 0.17, 0.05, 0, 0.68, L / 2 + 0.002);
    // amber turn signals wrapping the front corners
    box(amberGeos, 0.17, 0.10, 0.05, -W / 2 + 0.10, 0.60, L / 2 + 0.002);
    box(amberGeos, 0.17, 0.10, 0.05, W / 2 - 0.10, 0.60, L / 2 + 0.002);
    box(amberGeos, 0.05, 0.10, 0.24, -W / 2 - 0.002, 0.60, L / 2 - 0.14);
    box(amberGeos, 0.05, 0.10, 0.24, W / 2 + 0.002, 0.60, L / 2 - 0.14);
    // deep black air dam under the front bumper + the centre intake slot in
    // the body-colour bumper above it (this style skips the generic band)
    box(darkGeos, W * 0.94, 0.17, 0.08, 0, 0.235, L / 2 - 0.01);
    box(darkGeos, W * 0.50, 0.08, 0.04, 0, 0.36, L / 2 + 0.01);
    box(darkGeos, W * 0.94, 0.09, 0.04, 0, 0.36, -L / 2 - 0.005);
    // the black rub strip continues across both bumpers (sides: rubStripe)
    box(darkGeos, W * 0.98, 0.07, 0.04, 0, 0.52, L / 2 + 0.005);
    box(darkGeos, W * 0.98, 0.07, 0.04, 0, 0.55, -L / 2 - 0.005);
    // black rocker bands between the wheels
    box(darkGeos, 0.035, 0.13, st.wheelbase * 0.94, -W / 2 - 0.002, 0.335, 0);
    box(darkGeos, 0.035, 0.13, st.wheelbase * 0.94, W / 2 + 0.002, 0.335, 0);
    // rear: black plate panel between the tails, amber outer tail sections
    box(darkGeos, W * 0.30, 0.21, 0.04, 0, st.tailY, -L / 2 - 0.002);
    box(amberGeos, 0.15, 0.10, 0.04, -(hw + 0.285), st.tailY, -L / 2 - 0.005);
    box(amberGeos, 0.15, 0.10, 0.04, hw + 0.285, st.tailY, -L / 2 - 0.005);
    // rear wiper parked at the base of the hatch glass
    box(darkGeos, 0.44, 0.018, 0.045, 0.10, 1.005, -1.86, 1.303, 0, 0);
    // square fuel door on the driver's rear quarter
    box(darkGeos, 0.02, 0.16, 0.16, -W / 2 - 0.003, 0.78, -1.52);
    // twin exhaust tips under the rear bumper
    for (const ex of [0.52, 0.64]) {
      const tip = new THREE.CylinderGeometry(0.027, 0.027, 0.12, 10);
      tip.rotateX(Math.PI / 2); tip.applyMatrix4(xform(ex, 0.20, -L / 2 - 0.01));
      trimGeos.push(tip.index ? tip.toNonIndexed() : tip);
    }
  }
  if (row.lightBar) {
    box(darkGeos, 1.06, 0.05, 0.26, 0, (st.cabin ? 1.44 : 1.2), -0.45);
    box(lightGeos, 0.48, 0.08, 0.22, -0.27, (st.cabin ? 1.44 : 1.2) + 0.05, -0.45);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x2a5bff, emissive: 0x2a5bff, emissiveIntensity: 1.6 }));
    blue.position.set(0.27, (st.cabin ? 1.44 : 1.2) + 0.05, -0.45);
    group.add(blue);
    const redM = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.22), VEHICLE_MATS.tail);
    redM.position.set(-0.27, (st.cabin ? 1.44 : 1.2) + 0.05, -0.45);
    group.add(redM);
  }
  if (row.burnt) { // ember coals glowing along the hood edges + scorched glass
    const coal = new THREE.MeshStandardMaterial({ color: 0x1a0d06, emissive: 0xff5a00, emissiveIntensity: 2.2 });
    const cm = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.03, 0.5), coal);
    cm.position.set(0, 0.86, L / 2 - 1.15); group.add(cm);
  }

  const addBucket = (list, mat) => {
    const geo = mergeGeos(list); if (!geo) return null;
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; group.add(m); return m;
  };
  const paintMesh = addBucket(paintGeos, paint);
  if (fade && paintMesh) applyLengthFade(paintMesh.geometry, fade);
  addBucket(glassGeos, VEHICLE_MATS.glass);
  addBucket(trimGeos, VEHICLE_MATS.trim);
  addBucket(darkGeos, VEHICLE_MATS.dark);
  addBucket(lightGeos, VEHICLE_MATS.head);
  // headlight lenses: the shared warm material by default; a row with a
  // beamColor gets its own tinted lens (Brad yellow, Brian/Rigg blue).
  // FRONT boost (Cherie, Nov 20): from the front the beam colours read ~2x
  // stronger — lens emissive doubled (1.7 -> 3.4) and the lens face kept
  // near-full saturation (white lerp 0.45 -> 0.2). Rear is untouched.
  const headMat = row.beamColor !== undefined
    ? new THREE.MeshStandardMaterial({ color: new THREE.Color(row.beamColor).lerp(new THREE.Color(0xffffff), 0.2),
        emissive: row.beamColor, emissiveIntensity: 3.4 })
    : VEHICLE_MATS.head;
  addBucket(headGeos, headMat);
  addBucket(tailGeos, VEHICLE_MATS.tail);
  addBucket(amberGeos, VEHICLE_MATS.amber);
  addBucket(seatGeos, VEHICLE_MATS.seat);
  addBucket(dashGeos, VEHICLE_MATS.dash);

  // mirrors
  const mir = [];
  box(mir, 0.16, 0.09, 0.05, -W / 2 - 0.06, (st.glass?.band?.y || 1.1) + 0.05, (st.glass?.band?.z1 || 0.3) + 0.12);
  box(mir, 0.16, 0.09, 0.05, W / 2 + 0.06, (st.glass?.band?.y || 1.1) + 0.05, (st.glass?.band?.z1 || 0.3) + 0.12);
  const mirMesh = addBucket(mir, paint);
  if (fade && mirMesh) applyLengthFade(mirMesh.geometry, fade);

  // wheels — separate pivots so they roll (and the fronts steer); geometry
  // is the shared cached spoked wheel (see wheelGeometry above).
  const wheelGeo = wheelGeometry(R, row.wheels || 'alloy');
  const wheels = {};
  const track = W - 0.28, wb = st.wheelbase;
  const mkWheel = (sx, sz) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * track / 2, R, sz * wb / 2);
    const spin = new THREE.Group();
    const tm = new THREE.Mesh(wheelGeo, WHEEL_MAT); tm.castShadow = true;
    spin.add(tm);
    pivot.add(spin); group.add(pivot);
    return { pivot, spin };
  };
  wheels.fl = mkWheel(-1, 1); wheels.fr = mkWheel(1, 1);
  wheels.rl = mkWheel(-1, -1); wheels.rr = mkWheel(1, -1);

  if (row.underglow) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.12, L * 0.98),
      new THREE.MeshBasicMaterial({ color: row.underglow, transparent: true, opacity: 0.17, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.085; // above road ribbons (y .06) or it hides under them
    group.add(glow);
  }

  // ---- dusk light signatures: halo cards at the lamps + a warm pool the
  // headlights throw on the road ahead. Additive, depth-write off, cheap.
  if (row.lights !== false) {
    const gt = glowTexture();
    // halo cards + the road pool follow the row's beam colour when it has one.
    // FRONT boost (Cherie, Nov 20): front halo ~2x stronger and near-full
    // saturation (opacity 0.55 -> 0.95, white lerp 0.3 -> 0.1). The road
    // pool below is shared front/back and stays exactly as it was.
    let headGlowMat = GLOW_MATS.head, poolMat = GLOW_MATS.pool;
    if (row.beamColor !== undefined) {
      const bc = new THREE.Color(row.beamColor);
      headGlowMat = new THREE.MeshBasicMaterial({ color: bc.clone().lerp(new THREE.Color(0xffffff), 0.1), map: gt,
        transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false });
      // FrontSide only: at 0.95 the boosted halo would otherwise peek past
      // the body from behind — the rear view stays exactly as approved.
      poolMat = new THREE.MeshBasicMaterial({ color: bc, map: gt,
        transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    }
    const mkGlow = (mat, w, h, x, y, z, ry) => {
      if (!mat.map) { mat.map = gt; mat.needsUpdate = true; }
      const m = new THREE.Mesh(_glowPlane, mat);
      m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(w, h, 1); m.renderOrder = 3;
      group.add(m);
    };
    // head halos sit at the lamp faces: the nose tip by default, or the
    // style's glowZ when the lamps live elsewhere (pop-up pods). Lids-down
    // pop-ups burn no headlight signature at all (no halos, no road pool).
    const glowZ = st.glowZ || L / 2 + 0.10;
    if (!row.popupsDown) {
      mkGlow(headGlowMat, 0.6, 0.36, -hw, st.headY, glowZ, 0);
      mkGlow(headGlowMat, 0.6, 0.36, hw, st.headY, glowZ, 0);
    }
    mkGlow(GLOW_MATS.tail, 0.62, 0.3, -hw, st.tailY, -L / 2 - 0.10, Math.PI);
    mkGlow(GLOW_MATS.tail, 0.62, 0.3, hw, st.tailY, -L / 2 - 0.10, Math.PI);
    if (!row.popupsDown) {
      const pool = new THREE.Mesh(_glowPlane, poolMat);
      if (!poolMat.map) { poolMat.map = gt; poolMat.needsUpdate = true; }
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.09, L / 2 + 2.7);
      pool.scale.set(W * 1.6, 6.0, 1); pool.renderOrder = 2;
      group.add(pool);
    }
  }

  const veh = {
    group, wheels, row, driverAnchor, driverScale,
    beamColor: row.beamColor !== undefined ? row.beamColor : 0xffd9a8,
    dims: { len: L, wid: W, wheelR: R },
    _spin: 0,
    setLights() {},
    setRoadLift() {},
    setBrake() {},
    updateWheels(speed, steer, dt) {
      this._spin += (speed * dt) / R;
      for (const k of ['fl', 'fr', 'rl', 'rr']) wheels[k].spin.rotation.x = this._spin;
      // steer arrives driver-convention (+ = right turn); a right turn is
      // NEGATIVE three.js yaw, so negate or the front wheels point the
      // opposite way to the turn.
      wheels.fl.pivot.rotation.y = -(steer || 0);
      wheels.fr.pivot.rotation.y = -(steer || 0);
    },
  };
  return veh;
}

// Generic rows other games can use for traffic / parked dressing.
export const VEHICLE_ROWS = {
  sedanGrey:  { style: 'sedan', paint: 0x8a8f96, wheels: 'steel' },
  sedanBlue:  { style: 'sedan', paint: 0x3f5a7a, wheels: 'alloy' },
  hatchRed:   { style: 'hatch', paint: 0xa33327, wheels: 'steel' },
  hatchTeal:  { style: 'hatch', paint: 0x2b6b73, wheels: 'alloy' },
  vanWhite:   { style: 'astro2', paint: 0xe8e6df, wheels: 'steel' },
  muscleGold: { style: 'mustangFox', paint: 0xb08a3e, wheels: 'alloy', spoiler: true },
};

export default buildVehicle;
