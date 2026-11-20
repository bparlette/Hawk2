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
// Materials are shared and PMREM-friendly (paint roughness .34 / metalness .5):
// put a scene.environment on and the paint picks up the sky for free.
// Emissive head/taillights follow the Bunny Hop world standard.
//
// CONVENTION: vehicles face +Z (gpkit convention), 1 unit = 1 m.

import * as THREE from 'three';

// ---------------------------------------------------------------- materials
export const VEHICLE_MATS = {
  glass: new THREE.MeshStandardMaterial({ color: 0x161f2e, roughness: 0.15, metalness: 0.75 }),
  tire:  new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.92 }),
  trim:  new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.75 }),
  dark:  new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.9 }),
  vinyl: new THREE.MeshStandardMaterial({ color: 0x2a2226, roughness: 0.85, metalness: 0.05 }),
  head:  new THREE.MeshStandardMaterial({ color: 0xffe9ba, emissive: 0xffd080, emissiveIntensity: 1.6 }),
  tail:  new THREE.MeshStandardMaterial({ color: 0xc92a2a, emissive: 0xff2b2b, emissiveIntensity: 1.4 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xd88f2a, emissive: 0xb35c00, emissiveIntensity: 0.9 }),
};
function paintMat(hex, rough = 0.34) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.5 });
}

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
  // liftback slope. Dims from the fleet data (4.37 x 1.69).
  celica87: {
    len: 4.37, wid: 1.69, wheelR: 0.31, wheelbase: 2.52,
    body: [[-2.18,0.34],[-2.18,0.82],[-2.08,0.88],[-1.15,0.90],[0.35,0.84],[1.45,0.76],[2.05,0.62],[2.18,0.52],[2.18,0.32]],
    cabin: [[-1.95,0.88],[-0.55,1.27],[-0.02,1.30],[0.52,0.86]],
    cabinW: 0.86,
    glass: { shield: [0.52,0.86,-0.02,1.30], rear: [-1.95,0.88,-0.55,1.27],
             band: { z0: -0.50, z1: 0.26, y: 1.08, h: 0.30 } },
    headY: 0.58, tailY: 0.76,
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

// ---------------------------------------------------------------- factory
// Row: { style, paint, paint2, twoTone: 'band'|'cladding', glassTint,
//        lightBar, hoodLouvers, underglow, fogLamps, spoiler, burnt,
//        wheels: 'alloy'|'steel'|'wire' }
// Returns { group, wheels: {fl, fr, rl, rr}, dims: {len, wid, wheelR},
//           updateWheels(speed, steer, dt), spin (current wheel angle) }
export function buildVehicle(row) {
  const st = VEHICLE_STYLES[row.style] || VEHICLE_STYLES.sedan;
  const L = st.len, W = st.wid, R = st.wheelR;
  const group = new THREE.Group();
  const paint = paintMat(row.paint, row.burnt ? 0.85 : 0.34);
  const paint2 = row.paint2 !== undefined ? paintMat(row.paint2, 0.4) : null;

  // body (paint extrusion)
  const body = new THREE.Mesh(profileGeo(st.body, W), paint);
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
    const bandMesh = new THREE.Mesh(profileGeo(prof, W + 0.025, 0.03), paint2);
    bandMesh.castShadow = true;
    group.add(bandMesh);
  }

  // glasshouse
  const glassGeos = [], trimGeos = [], darkGeos = [], lightGeos = [], tailGeos = [], paintGeos = [];
  if (st.cabin && !st.van) {
    const cabW = W * (st.cabinW || 0.87);
    const cabin = new THREE.Mesh(profileGeo(st.cabin, cabW), paint);
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

  // lights: headlights + amber corners front, full-width-ish tails rear
  const hw = W / 2 - 0.34;
  box(lightGeos, 0.36, 0.11, 0.04, -hw, st.headY, L / 2 + 0.005);
  box(lightGeos, 0.36, 0.11, 0.04, hw, st.headY, L / 2 + 0.005);
  box(tailGeos, 0.42, 0.10, 0.04, -hw, st.tailY, -L / 2 - 0.005);
  box(tailGeos, 0.42, 0.10, 0.04, hw, st.tailY, -L / 2 - 0.005);
  if (row.fogLamps) {
    box(lightGeos, 0.13, 0.13, 0.04, -W / 2 + 0.42, 0.34, L / 2 + 0.01);
    box(lightGeos, 0.13, 0.13, 0.04, W / 2 - 0.42, 0.34, L / 2 + 0.01);
  }
  if (row.popups) { // raised pop-up headlight pods on the nose
    box(paintGeos, 0.36, 0.07, 0.34, -W / 2 + 0.36, st.headY + 0.13, L / 2 - 0.38);
    box(paintGeos, 0.36, 0.07, 0.34, W / 2 - 0.36, st.headY + 0.13, L / 2 - 0.38);
    box(lightGeos, 0.30, 0.06, 0.03, -W / 2 + 0.36, st.headY + 0.10, L / 2 - 0.20);
    box(lightGeos, 0.30, 0.06, 0.03, W / 2 - 0.36, st.headY + 0.10, L / 2 - 0.20);
  }
  // grille + bumpers + trim
  if (st.chromeBumpers) {
    box(trimGeos, W * 0.96, 0.16, 0.10, 0, 0.38, L / 2 + 0.05);
    box(trimGeos, W * 0.96, 0.16, 0.10, 0, 0.38, -L / 2 - 0.05);
  } else {
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
  addBucket(paintGeos, paint);
  addBucket(glassGeos, VEHICLE_MATS.glass);
  addBucket(trimGeos, VEHICLE_MATS.trim);
  addBucket(darkGeos, VEHICLE_MATS.dark);
  addBucket(lightGeos, VEHICLE_MATS.head);
  addBucket(tailGeos, VEHICLE_MATS.tail);

  // mirrors
  const mir = [];
  box(mir, 0.16, 0.09, 0.05, -W / 2 - 0.06, (st.glass?.band?.y || 1.1) + 0.05, (st.glass?.band?.z1 || 0.3) + 0.12);
  box(mir, 0.16, 0.09, 0.05, W / 2 + 0.06, (st.glass?.band?.y || 1.1) + 0.05, (st.glass?.band?.z1 || 0.3) + 0.12);
  addBucket(mir, paint);

  // wheels — separate pivots so they roll (and the fronts steer).
  // Tire + hubcap merged into ONE vertex-colored geometry per wheel.
  const wheelGeos = [];
  {
    const tire = [], hub = [];
    cyl(tire, R, 0.22, 0, 0, 0, 14);
    if (row.wheels === 'wire') cyl(hub, R * 0.62, 0.235, 0, 0, 0, 12);
    else if (row.wheels === 'steel') cyl(hub, R * 0.45, 0.235, 0, 0, 0, 10);
    else cyl(hub, R * 0.58, 0.235, 0, 0, 0, 10);
    const paintGeo = (list, hex) => {
      const c = new THREE.Color(hex);
      for (const gg of list) {
        const n = gg.attributes.position.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
        gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
    };
    paintGeo(tire, 0x17181c);
    paintGeo(hub, row.wheels === 'steel' ? 0x2c2c30 : 0xb9c0c9);
    // mergeGeos drops color; do a local merge that keeps it
    const all = [...tire, ...hub];
    let total = 0; for (const gg of all) total += gg.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), col = new Float32Array(total * 3);
    let o = 0;
    for (const gg of all) {
      const n = gg.attributes.position.count;
      pos.set(gg.attributes.position.array, o * 3); nor.set(gg.attributes.normal.array, o * 3);
      if (gg.attributes.uv) uv.set(gg.attributes.uv.array, o * 2);
      col.set(gg.attributes.color.array, o * 3);
      o += n; gg.dispose();
    }
    var wheelGeo = new THREE.BufferGeometry();
    wheelGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    wheelGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    wheelGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    wheelGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const wheelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35 });
  const wheels = {};
  const track = W - 0.28, wb = st.wheelbase;
  const mkWheel = (sx, sz) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * track / 2, R, sz * wb / 2);
    const spin = new THREE.Group();
    const tm = new THREE.Mesh(wheelGeo, wheelMat); tm.castShadow = true;
    spin.add(tm);
    pivot.add(spin); group.add(pivot);
    return { pivot, spin };
  };
  wheels.fl = mkWheel(-1, 1); wheels.fr = mkWheel(1, 1);
  wheels.rl = mkWheel(-1, -1); wheels.rr = mkWheel(1, -1);

  if (row.underglow) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.12, L * 0.98),
      new THREE.MeshBasicMaterial({ color: row.underglow, transparent: true, opacity: 0.17, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03;
    group.add(glow);
  }

  const veh = {
    group, wheels, row,
    dims: { len: L, wid: W, wheelR: R },
    _spin: 0,
    updateWheels(speed, steer, dt) {
      this._spin += (speed * dt) / R;
      for (const k of ['fl', 'fr', 'rl', 'rr']) wheels[k].spin.rotation.x = this._spin;
      wheels.fl.pivot.rotation.y = steer || 0;
      wheels.fr.pivot.rotation.y = steer || 0;
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
