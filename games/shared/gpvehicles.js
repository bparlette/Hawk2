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

// ---------------------------------------------------------------- factory
// Row: { style, paint, paint2, twoTone: 'band'|'cladding', glassTint,
//        lightBar, hoodLouvers, underglow, fogLamps, spoiler, burnt,
//        wheels: 'alloy'|'steel'|'wire'|'multi' (multi = 10 thin spokes),
//        popups: raised pop-up pods (on styles with popups: true),
//        popupsDown: lids shut — flush hood panels, no headlight signature,
//        beamColor: hex — this car's headlight beam colour (lens, halo and
//          road pool all follow it; veh.beamColor exposes it, resolved
//          against the warm default, so hosts can tint their spotlight),
//        paintFade: { front, rear, zWhite, zFull } — paint colour varies
//          along the car's length: `front` from the nose back to zWhite,
//          fading to `rear` by zFull, `rear` from there to the tail
//          (vertex colours on the paint; overrides the flat paint colour) }
// Returns { group, wheels: {fl, fr, rl, rr}, dims: {len, wid, wheelR},
//           beamColor, updateWheels(speed, steer, dt), spin (wheel angle) }
export function buildVehicle(row) {
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
