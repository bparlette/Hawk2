// animals.js — animal racers for the One-Prompt Drifter.
// Two selectable racers that honour the game's vehicle contract
// (userData {root, wheels, flames, flameMatOuter, shield, skin}) via
// main.js adaptModel(): they are returned as { group, wheels, tick } in
// the gpvehicles format ({fl:{pivot,spin},...}) and adaptModel wraps
// them with flames/shield/camera-scale like any borrowed vehicle.
// `tick(dt, racer)` is called by main.js after syncModel() and drives
// the character animation (pedalling IK, cloth scarf, tail, blink...).
//
//  - pelican: the procedural pelican from the pelican-bike game
//    (animals/pelican.js, unmodified apart from import paths), seated
//    on a pedal-kart: its legs IK onto a turning crank, its wings grip
//    the steering wheel, and its red scarf is a small verlet cloth
//    simulated in pelican-root space.
//  - cat: an original orange tabby built in the same style language
//    (deformed spheres + vertex-colour markings), wearing aviator
//    goggles pushed up on its forehead and a collar bell.
//
// Frames: the game model frame is +Z forward. The pelican's own frame
// is +X forward, so the bird sits in a mount rotated -90° about Y;
// bird-local (x,y,z) appears in assembly space at (-z, y, x).
import * as THREE from 'three';
import { createPelican } from './animals/pelican.js';
import { textTexture } from './textures.js';
import { clamp, lerp, damp } from './util.js';

const ASSEMBLY_SCALE = 1.5;

// ---------------------------------------------------------------- kart
// A low pedal-kart in assembly space (+Z forward). Returns the group,
// the contract wheels, and (optionally) the pedal-crank pad meshes the
// pelican tick positions each frame.
function buildKart(paintColor, { pedals = false } = {}) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: paintColor, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: 0.85 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.24 });
  const seatM = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.9 });
  const tireM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.85, roughness: 0.3 });
  const headM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f4ff, emissiveIntensity: 3.2 });
  const add = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };

  // floor pan + nose + side pods
  add(new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.09, 1.7), paint), 0, 0.30, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.15, 0.36), paint), 0, 0.37, 0.76);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), dark), 0, 0.30, 0.95); // front bumper
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.95), paint), s * 0.53, 0.36, -0.08);
  // headlights
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), headM), s * 0.26, 0.44, 0.92);
  // seat: posts, cushion, backrest
  for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), dark), s * 0.2, 0.48, -0.34);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.54), seatM), 0, 0.63, -0.28);
  const back = add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.09), seatM), 0, 0.79, -0.58);
  back.rotation.x = -0.13;
  // rear deck + exhaust
  add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.3), paint), 0, 0.42, -0.72);
  const exh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 10), chrome), 0.24, 0.36, -0.9);
  exh.rotation.x = Math.PI / 2;
  // roll bar
  const barM = paint;
  for (const s of [-1, 1]) {
    const legBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.62, 10), barM);
    legBar.position.set(s * 0.44, 0.72, -0.66);
    legBar.rotation.x = 0.1;
    legBar.castShadow = true;
    g.add(legBar);
  }
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.92, 10), barM);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 1.02, -0.69);
  topBar.castShadow = true;
  g.add(topBar);
  // steering column + wheel (grips sit at assembly (∓0.14, 0.87, 0.33))
  const colA = new THREE.Vector3(0, 0.42, 0.44);
  const colB = new THREE.Vector3(0, 0.8, 0.31);
  const colLen = colA.distanceTo(colB);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, colLen, 10), chrome);
  column.position.copy(colA).lerp(colB, 0.5);
  column.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), colB.clone().sub(colA).normalize());
  column.castShadow = true;
  g.add(column);
  const wheelG = new THREE.Group();
  wheelG.position.set(0, 0.85, 0.29);
  wheelG.rotation.x = -0.62;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.02, 10, 28), dark);
  rim.castShadow = true;
  wheelG.add(rim);
  for (let k = 0; k < 3; k++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.145, 0.016), chrome);
    spoke.position.y = 0.072;
    const holder = new THREE.Group();
    holder.rotation.z = (k * Math.PI * 2) / 3;
    holder.add(spoke);
    wheelG.add(holder);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), paint);
  wheelG.add(hub);
  g.add(wheelG);

  // pedal crank (pelican only): axle + two pads positioned by the tick
  let crank = null;
  if (pedals) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 10), chrome);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.34, 0.20);
    g.add(axle);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), dark);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0.1, 0.34, 0.20);
    g.add(ring);
    const pads = [];
    for (const s of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.085), dark);
      pad.castShadow = true;
      g.add(pad);
      pads.push(pad);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), chrome);
      g.add(arm);
      pads.push(arm); // pads = [padR, armR, padL, armL]
    }
    crank = { pads, ring };
  }

  // wheels — contract pivots: steer group (rotation.y) > spin group (rotation.x)
  const wheels = {};
  const tireGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.17, 22);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.18, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.19, 0.05, 0.3);
  const mkWheel = (x, z, front) => {
    const steer = new THREE.Group();
    steer.position.set(x, 0.30, z);
    const spin = new THREE.Group();
    steer.add(spin);
    const t = new THREE.Mesh(tireGeo, tireM);
    t.castShadow = true;
    spin.add(t);
    spin.add(new THREE.Mesh(rimGeo, rimM));
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Mesh(spokeGeo, rimM);
      sp.rotation.x = (k * Math.PI) / 3;
      spin.add(sp);
    }
    g.add(steer);
    return { pivot: steer, spin, front };
  };
  wheels.fl = mkWheel(-0.56, 0.60, true);
  wheels.fr = mkWheel(0.56, 0.60, true);
  wheels.rl = mkWheel(-0.56, -0.60, false);
  wheels.rr = mkWheel(0.56, -0.60, false);
  return { group: g, wheels, crank, wheelG };
}

function nameTag(name) {
  const tex = textTexture(name, { w: 512, h: 96, fg: '#ffffff', font: 'bold 56px "PingFang SC","Microsoft YaHei",sans-serif', stroke: 'rgba(0,0,0,0.75)' });
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  tag.scale.set(4.2, 0.8, 1);
  tag.position.set(0, 2.6, 0);
  return tag;
}

// ------------------------------------------------------- scarf (verlet)
// A small cloth strip simulated in pelican-root space: pinned along the
// scarf knot at the neck, streaming backwards (-X in bird space) with
// wind from the racer's speed plus a gentle flutter.
function buildScarf(bird) {
  const N = 9; // segments along length
  const W = 3; // points across
  const SEG = 0.055;
  const WID = 0.048;
  const count = (N + 1) * W;
  const pos = new Float32Array(count * 3);
  const prev = new Float32Array(count * 3);
  const idx = (i, j) => i * W + j;
  const geo = new THREE.BufferGeometry();
  const indices = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < W - 1; j++) {
    const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
    indices.push(a, b, c, b, d, c);
  }
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xd7263d, roughness: 0.85, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  bird.root.add(mesh);
  let seeded = false;
  const knotP = new THREE.Vector3();
  function seed() {
    knotP.copy(bird.knot.position);
    for (let i = 0; i <= N; i++) for (let j = 0; j < W; j++) {
      const k = idx(i, j) * 3;
      pos[k] = knotP.x - 0.05 - i * SEG;
      pos[k + 1] = knotP.y + 0.01 - i * 0.008;
      pos[k + 2] = knotP.z + (j - (W - 1) / 2) * WID;
      prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2];
    }
    seeded = true;
  }
  const satisfy = (a, b, rest) => {
    const ka = a * 3, kb = b * 3;
    let dx = pos[kb] - pos[ka], dy = pos[kb + 1] - pos[ka + 1], dz = pos[kb + 2] - pos[ka + 2];
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const diff = ((d - rest) / d) * 0.5;
    dx *= diff; dy *= diff; dz *= diff;
    pos[ka] += dx; pos[ka + 1] += dy; pos[ka + 2] += dz;
    pos[kb] -= dx; pos[kb + 1] -= dy; pos[kb + 2] -= dz;
  };
  function update(dt, speed, t) {
    if (!seeded || bird.knot.position.lengthSq() === 0) { seed(); if (!seeded) return; }
    const step = Math.min(dt, 1 / 30);
    if (step <= 0) return;
    knotP.copy(bird.knot.position);
    const windX = -(1.2 + Math.abs(speed) * 0.5);
    for (let i = 0; i <= N; i++) for (let j = 0; j < W; j++) {
      const k = idx(i, j) * 3;
      if (i === 0) continue;
      const vx = (pos[k] - prev[k]) * 0.96;
      const vy = (pos[k + 1] - prev[k + 1]) * 0.96;
      const vz = (pos[k + 2] - prev[k + 2]) * 0.96;
      prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2];
      const flut = Math.sin(t * 9 + i * 0.9 + j * 1.7) * 0.35 * (i / N);
      pos[k] += vx + windX * (i / N) * step * step * 22;
      pos[k + 1] += vy + (-2.2 + flut * 2.2) * step * step * 22;
      pos[k + 2] += vz + Math.cos(t * 7 + i * 1.3) * 0.3 * (i / N) * step * step * 22;
    }
    // pin the root row on the knot
    for (let j = 0; j < W; j++) {
      const k = idx(0, j) * 3;
      pos[k] = knotP.x - 0.05;
      pos[k + 1] = knotP.y + 0.01;
      pos[k + 2] = knotP.z + (j - (W - 1) / 2) * WID;
      prev[k] = pos[k]; prev[k + 1] = pos[k + 1]; prev[k + 2] = pos[k + 2];
    }
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < N; i++) for (let j = 0; j < W; j++) satisfy(idx(i, j), idx(i + 1, j), SEG);
      for (let i = 0; i <= N; i++) for (let j = 0; j < W - 1; j++) satisfy(idx(i, j), idx(i, j + 1), WID);
      for (let j = 0; j < W; j++) {
        const k = idx(0, j) * 3;
        pos[k] = knotP.x - 0.05; pos[k + 1] = knotP.y + 0.01; pos[k + 2] = knotP.z + (j - (W - 1) / 2) * WID;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return { mesh, update };
}

// ------------------------------------------------------------- pelican
const CRANK_C = { x: 0.20, y: 0.34 }; // bird-space crank centre
const CRANK_R = 0.11;
const GRIP_L = new THREE.Vector3(0.33, 0.87, -0.135);
const GRIP_R = new THREE.Vector3(0.33, 0.87, 0.135);

function buildPelicanRacer({ name = null } = {}) {
  const kart = buildKart(0x138a8a, { pedals: true });
  const assembly = new THREE.Group();
  assembly.scale.setScalar(ASSEMBLY_SCALE);
  assembly.add(kart.group);
  const bird = createPelican();
  const mount = new THREE.Group();
  mount.rotation.y = -Math.PI / 2; // bird +X forward -> assembly +Z forward
  mount.add(bird.root);
  assembly.add(mount);
  const scarf = buildScarf(bird);
  if (name) assembly.add(nameTag(name));

  const pedalL = new THREE.Vector3();
  const pedalR = new THREE.Vector3();
  const look = new THREE.Vector3(8, 1.1, 0);
  let t = Math.random() * 10;
  let crankAngle = 0;
  let prevS = 0;
  let wasBoost = false;
  function tick(dt, r) {
    if (dt <= 0) return;
    t += dt;
    const s = r.s || 0;
    crankAngle += (s * dt) / 0.55;
    const aR = -crankAngle;
    const aL = -crankAngle + Math.PI;
    pedalR.set(CRANK_C.x + Math.cos(aR) * CRANK_R, CRANK_C.y + Math.sin(aR) * CRANK_R, 0.10);
    pedalL.set(CRANK_C.x + Math.cos(aL) * CRANK_R, CRANK_C.y + Math.sin(aL) * CRANK_R, -0.10);
    // decorative crank pads/arms follow the same angles (assembly space:
    // bird (x,y,z) -> (-z, y, x)); pads[] = [padR, armR, padL, armL]
    if (kart.crank) {
      const pads = kart.crank.pads;
      const place = (pad, arm, pv) => {
        pad.position.set(-pv.z, pv.y, pv.x);
        arm.position.set(-pv.z * 0.55, (pv.y + CRANK_C.y) / 2, (pv.x + CRANK_C.x) / 2);
      };
      place(pads[0], pads[1], pedalR);
      place(pads[2], pads[3], pedalL);
      kart.crank.ring.rotation.x = -crankAngle;
    }
    const accel = clamp((s - prevS) / Math.max(dt, 1e-4), -6, 6);
    prevS = s;
    const steer = r.steer !== undefined ? r.steer : clamp((r.yawOff || 0) * 1.6, -1, 1);
    look.set(8, 1.05, -steer * 3.5);
    const boost = !!r.boosting || (r.nitroTime || 0) > 0;
    if (boost && !wasBoost) bird.honk();
    wasBoost = boost;
    bird.update(dt, {
      t,
      crankAngle,
      pedal: clamp(Math.abs(s) / 9, 0.12, 1),
      airborne: r.airborne ? 1 : 0,
      trick: r.drifting ? 0.7 : 0,
      accel,
      look,
      grips: { L: GRIP_L, R: GRIP_R },
      pedals: { L: pedalL, R: pedalR },
      helmet: true,
      glasses: true,
      mouthOpen: 0,
    });
    scarf.update(dt, s, t);
  }
  return { group: assembly, wheels: kart.wheels, tick };
}

// ----------------------------------------------------------------- cat
// Original orange tabby in the pelican's style language: deformed
// spheres with painted vertex colours, simple posed limbs, and small
// accessories with strong silhouettes (goggles, bell, striped tail).
function catBodyGeometry() {
  const g = new THREE.SphereGeometry(0.30, 36, 24);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const orange = new THREE.Color('#e8862e');
  const dark = new THREE.Color('#b85c12');
  const cream = new THREE.Color('#f7e3c2');
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const n = v.clone().normalize();
    // plump pear: wider low, slight forward chest
    const sx = 0.95 + 0.18 * clamp(-n.y, 0, 1);
    p.setXYZ(i, v.x * sx, v.y * 1.08, v.z * 0.98 + (n.z > 0 ? 0.02 : 0));
    c.copy(orange);
    // tabby stripes across the back/top
    const band = Math.sin(n.y * 9 + n.x * 3.5);
    if (n.y > -0.15 && band > 0.45) c.lerp(dark, 0.55 * clamp((band - 0.45) * 2.4, 0, 1));
    // cream belly (front-low)
    const belly = clamp((n.z - 0.25) * 2.2, 0, 1) * clamp((-n.y + 0.55) * 1.8, 0, 1);
    c.lerp(cream, belly * 0.9);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function catHeadGeometry() {
  const g = new THREE.SphereGeometry(0.185, 36, 24);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const orange = new THREE.Color('#e8862e');
  const dark = new THREE.Color('#b85c12');
  const cream = new THREE.Color('#f7e3c2');
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const n = v.clone().normalize();
    p.setXYZ(i, v.x * 1.06, v.y * 0.92, v.z * 0.96);
    c.copy(orange);
    // forehead 'M' stripes: three dark bands on the top-front
    if (n.y > 0.35 && n.z > 0.1) {
      const band = Math.sin(n.x * 16);
      if (band > 0.25) c.lerp(dark, 0.5);
    }
    // cream muzzle zone
    const muz = clamp((n.z - 0.45) * 2.4, 0, 1) * clamp((-n.y + 0.45) * 2.0, 0, 1);
    c.lerp(cream, muz * 0.95);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function tubeBetween(a, b, r, mat, radial = 10) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radial), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  return m;
}

function buildCatRacer({ name = null } = {}) {
  const kart = buildKart(0xd8542e, { pedals: false });
  const assembly = new THREE.Group();
  assembly.scale.setScalar(ASSEMBLY_SCALE);
  assembly.add(kart.group);

  const furM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const creamM = new THREE.MeshStandardMaterial({ color: 0xf7e3c2, roughness: 0.9 });
  const pinkM = new THREE.MeshStandardMaterial({ color: 0xe56b7a, roughness: 0.55 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.5 });
  const eyeM = new THREE.MeshPhysicalMaterial({ color: 0x27351a, roughness: 0.15, clearcoat: 1 });
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0x14202c, metalness: 0.9, roughness: 0.12, clearcoat: 1 });
  const brassM = new THREE.MeshStandardMaterial({ color: 0xc99635, metalness: 0.9, roughness: 0.3 });
  const leatherM = new THREE.MeshStandardMaterial({ color: 0x6e3f22, roughness: 0.7 });
  const tealM = new THREE.MeshStandardMaterial({ color: 0x1a8a80, roughness: 0.6 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xf2b234, metalness: 0.9, roughness: 0.25 });
  const whiskerM = new THREE.MeshBasicMaterial({ color: 0xf5f2ea });

  const bodyG = new THREE.Group();
  bodyG.position.set(0, 0.60, -0.16);
  assembly.add(bodyG);
  const addB = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; bodyG.add(mesh); return mesh; };

  const body = addB(new THREE.Mesh(catBodyGeometry(), furM), 0, 0.18, 0);
  // haunches + hind paws resting forward
  for (const s of [-1, 1]) {
    const h = addB(new THREE.Mesh(new THREE.SphereGeometry(0.165, 20, 14), furM), s * 0.20, 0.02, -0.03);
    h.scale.set(0.8, 1.0, 1.2);
    const paw = addB(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), creamM), s * 0.21, -0.13, 0.17);
    paw.scale.set(0.9, 0.55, 1.35);
  }
  // front legs up to the steering wheel grips (assembly (∓0.14, 0.87, 0.33)
  // -> bodyG space (∓0.14, 0.27, 0.49))
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Vector3(s * 0.13, 0.22, 0.16);
    const elbow = new THREE.Vector3(s * 0.21, 0.06, 0.33);
    const pawP = new THREE.Vector3(s * 0.14, 0.27, 0.49);
    bodyG.add(tubeBetween(shoulder, elbow, 0.052, furM));
    bodyG.add(tubeBetween(elbow, pawP, 0.044, furM));
    const paw = addB(new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), creamM), pawP.x, pawP.y, pawP.z);
    paw.scale.set(0.9, 0.7, 1.2);
  }
  // striped tail, curling up behind (animated in tick)
  const tailG = new THREE.Group();
  tailG.position.set(0.15, 0.02, -0.28);
  bodyG.add(tailG);
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.03, -0.04, -0.16),
      new THREE.Vector3(0.05, 0.10, -0.27),
      new THREE.Vector3(0.02, 0.28, -0.28),
      new THREE.Vector3(-0.03, 0.40, -0.18),
    ]);
    const tg = new THREE.TubeGeometry(curve, 32, 0.042, 10);
    const uv = tg.attributes.uv;
    const p = tg.attributes.position;
    const col = new Float32Array(p.count * 3);
    const orange = new THREE.Color('#e8862e');
    const dark = new THREE.Color('#b85c12');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const band = Math.floor(uv.getX(i) * 8) % 2;
      c.copy(band ? dark : orange);
      if (uv.getX(i) > 0.92) c.set('#f7e3c2'); // cream tip
      col.set([c.r, c.g, c.b], i * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tail = new THREE.Mesh(tg, furM);
    tail.castShadow = true;
    tailG.add(tail);
  }
  // head
  const headG = new THREE.Group();
  headG.position.set(0, 0.56, 0.05);
  bodyG.add(headG);
  const addH = (mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; headG.add(mesh); return mesh; };
  addH(new THREE.Mesh(catHeadGeometry(), furM));
  const ears = [];
  for (const s of [-1, 1]) {
    const earG = new THREE.Group();
    earG.position.set(s * 0.115, 0.145, -0.01);
    earG.rotation.z = -s * 0.18;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.17, 12), furM);
    ear.position.y = 0.07;
    ear.castShadow = true;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.1, 10), pinkM);
    inner.position.set(0, 0.055, 0.028);
    earG.add(ear, inner);
    headG.add(earG);
    ears.push(earG);
  }
  // muzzle + nose
  const muzzle = addH(new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 12), creamM), 0, -0.05, 0.145);
  muzzle.scale.set(1.15, 0.7, 0.8);
  const nose = addH(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), pinkM), 0, -0.012, 0.212);
  nose.scale.set(1.3, 0.75, 0.7);
  // eyes (blink via scale in tick)
  const eyes = [];
  for (const s of [-1, 1]) {
    const eyeG = new THREE.Group();
    eyeG.position.set(s * 0.072, 0.03, 0.152);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 14, 10), eyeM);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(0.008, 0.01, 0.02);
    eyeG.add(eye, hl);
    headG.add(eyeG);
    eyes.push(eyeG);
  }
  // whiskers
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const a = new THREE.Vector3(s * 0.055, -0.035 - k * 0.012, 0.185);
    const b = new THREE.Vector3(s * 0.21, -0.02 + (k - 1) * 0.03, 0.24 - k * 0.012);
    headG.add(tubeBetween(a, b, 0.0016, whiskerM, 4));
  }
  // aviator goggles pushed up on the forehead
  const gogG = new THREE.Group();
  gogG.position.set(0, 0.125, 0.095);
  gogG.rotation.x = -0.38;
  headG.add(gogG);
  for (const s of [-1, 1]) {
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 8, 20), brassM);
    rimT.position.set(s * 0.066, 0, 0.01);
    rimT.castShadow = true;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), lensM);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(s * 0.066, 0, 0.008);
    gogG.add(rimT, lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.014, 0.014), brassM);
  bridge.position.set(0, 0.005, 0.012);
  gogG.add(bridge);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.015, 8, 28), leatherM);
  strap.scale.set(1.04, 0.82, 0.96);
  strap.rotation.x = Math.PI / 2 - 0.38;
  strap.position.set(0, 0.115, -0.012);
  headG.add(strap);
  // collar + bell
  const collar = addH(new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.02, 8, 24), tealM), 0, -0.148, 0.015);
  collar.rotation.x = Math.PI / 2 - 0.25;
  addH(new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), goldM), 0, -0.185, 0.105);
  if (name) assembly.add(nameTag(name));

  let t = Math.random() * 10;
  let blinkT = 1.5 + Math.random() * 2;
  let twitchT = 3 + Math.random() * 3;
  let twitchEar = null;
  let twitchK = 0;
  function tick(dt, r) {
    if (dt <= 0) return;
    t += dt;
    const s = Math.abs(r.s || 0);
    const sf = clamp(s / 30, 0, 1);
    const steer = r.steer !== undefined ? r.steer : clamp((r.yawOff || 0) * 1.6, -1, 1);
    // tail: lazy sway at rest, streams up when fast / drifting
    tailG.rotation.y = Math.sin(t * 1.9) * 0.16 + steer * 0.15;
    tailG.rotation.x = damp(tailG.rotation.x, (r.drifting ? -0.35 : -0.12 * sf) + Math.sin(t * 3.1) * 0.04, 6, dt);
    // head looks into the turn; body bobs with speed
    headG.rotation.y = damp(headG.rotation.y, steer * 0.3, 8, dt);
    headG.rotation.z = damp(headG.rotation.z, -steer * 0.1, 8, dt);
    bodyG.position.y = 0.60 + Math.sin(t * 9) * 0.006 * sf + (r.airborne ? 0.03 : 0);
    bodyG.rotation.z = damp(bodyG.rotation.z, -steer * 0.05 * sf, 6, dt);
    // blink
    blinkT -= dt;
    let blink = 0;
    if (blinkT < 0.14 && blinkT > 0) blink = Math.sin((0.14 - blinkT) / 0.14 * Math.PI);
    if (blinkT <= 0) blinkT = 2.2 + Math.random() * 2.6;
    for (const e of eyes) e.scale.y = 1 - blink * 0.88;
    // ear twitch
    twitchT -= dt;
    if (twitchT <= 0) { twitchEar = ears[Math.random() < 0.5 ? 0 : 1]; twitchK = 0.22; twitchT = 2.5 + Math.random() * 3.5; }
    if (twitchK > 0) {
      twitchK -= dt;
      const k = Math.max(0, twitchK / 0.22);
      if (twitchEar) twitchEar.rotation.x = -Math.sin(k * Math.PI) * 0.3;
    }
  }
  return { group: assembly, wheels: kart.wheels, tick };
}

// ------------------------------------------------------------- exports
export const ANIMAL_AI_NAMES = { pelican: 'Pelican Pete', cat: 'Captain Whiskers' };

export function buildAnimalRacer(kind, { name = null } = {}) {
  if (kind === 'pelican') return buildPelicanRacer({ name });
  if (kind === 'cat') return buildCatRacer({ name });
  throw new Error(`unknown animal racer: ${kind}`);
}
