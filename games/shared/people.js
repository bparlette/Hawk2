// Scaggsville 3D — crew figures, built with the house Figure Factory / rigkit
// Hawk2 SHARED COPY — canonical source: gamepress kit style (Figure Factory / rigkit method). Games import this file as ../shared/people.js.
// method (gamepress docs/FIGURE-FACTORY.md): primitive meshes on NAMED PIVOTS,
// characters as DATA ROWS, procedural pose programs — no rigs, no skinning.
// (gpchar.js is the fighter-specific implementation of the same method — gi,
// obi, hakama, bare feet. The crew needs street clothes, so the figures are
// built here from capsules/spheres with tees, jeans and shoes.)
//
//   import { buildPerson, poseIdle, poseWave, poseWalk, buildDriver } from './people.js';
//   const p = buildPerson({ skin:0xe0ac69, shirt:0xb03030, pants:0x2a3a5e,
//                           hair:0x1a1410, hairStyle:'short', shoes:0x222226 });
// Clothing is GEOMETRY, not just colour: a shirt with hem, collar and
// sleeves, trousers with real leg tubes, shoes, and a hat ('cap' | 'brim' |
// 'beanie') with a brim. Row extras: hat, hatColor, stripe (chest band).
// SHIRT RULE (Cherie, Nov 20): the shirt is a LOOSE SHELL worn over the
// body — garment volume offset outward from the torso, hanging from a
// shoulder yoke; sleeves are loose tubes connecting shoulder to arm with
// NO visible gap and no detached shoulder puffs; the body's and arm's
// shape must not show through the shirt.
// PANTS RULE (Cherie, Nov 20): legs are ONE-PIECE tapered pants, hip to
// ankle, swinging at the hip only — no thigh/shin split, no knee joint,
// no shorts, no bare legs. The visible two-body-parts connection at the
// knee is exactly what this rule kills.
// buildDriver(row) returns a SEATED driver as ONE merged mesh (1 draw call),
// same clothing rows — parent it to a vehicle's driverAnchor.
//   scene.add(p.group);            // faces +Z, ~1.75 m tall, origin at feet
//   // per frame: poseWave(p, t) / poseWalk(p, phase) / poseIdle(p, t)
//
// Pivots: hips, chest, head, shoulderL/R, elbowL/R, hipL/R, ankleL/R
// (the ankle carries only the shoe, below the pant cuff).
// (kneeL/R survive as EMPTY groups — pose-code compat only, no geometry.)
import * as THREE from 'three';

const matCache = new Map();
function M(hex, rough = 0.85) {
  if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0.02 }));
  return matCache.get(hex);
}
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
const capsule = (r, len, seg = 8) => new THREE.CapsuleGeometry(r, len, 3, seg);

// One-piece tapered tube along a point path — the PANTS LEG builder.
// Rings are interpolated between control points (pts/radii pairs); ring
// frames come from the path tangent with a fixed reference axis (both leg
// paths used here run in the YZ plane, so X is always a valid ring axis).
// Smooth-shaded, single geometry: there is no segment boundary anywhere
// along the leg for a seam to show at.
function tubeGeo(pts, radii, seg = 10, subdiv = 2) {
  const rings = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let j = (i === 0 ? 0 : 1); j <= subdiv; j++) {
      const t = j / subdiv;
      rings.push({
        c: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        r: radii[i] + (radii[i + 1] - radii[i]) * t,
      });
    }
  }
  const pos = [];
  const T = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Vector3();
  const ringIdx = rings.map((ring, ri) => {
    const prev = rings[Math.max(0, ri - 1)].c, next = rings[Math.min(rings.length - 1, ri + 1)].c;
    T.set(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize();
    const ref = Math.abs(T.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    V.crossVectors(T, ref).normalize(); U.crossVectors(V, T).normalize();
    C.set(ring.c[0], ring.c[1], ring.c[2]);
    const out = [];
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, ca = Math.cos(a) * ring.r, sa = Math.sin(a) * ring.r;
      out.push(pos.length / 3);
      pos.push(C.x + U.x * ca + V.x * sa, C.y + U.y * ca + V.y * sa, C.z + U.z * ca + V.z * sa);
    }
    return out;
  });
  const idx = [];
  for (let ri = 0; ri < ringIdx.length - 1; ri++) {
    for (let k = 0; k < seg; k++) {
      const a = ringIdx[ri][k], b = ringIdx[ri][(k + 1) % seg], c = ringIdx[ri + 1][k], d = ringIdx[ri + 1][(k + 1) % seg];
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
// Standing pants leg in hip-pivot space: ONE tapered piece, hip -> ankle.
// The top extends ABOVE the pivot (inside the pelvis block) so no gap can
// open at any swing angle; the ankle tip tucks into the shoe.
const PANTS_LEG_PTS = [[0, 0.10, 0], [0, 0.03, 0], [0, -0.10, 0], [0, -0.26, 0], [0, -0.44, 0], [0, -0.62, 0], [0, -0.78, 0], [0, -0.86, 0]];
const PANTS_LEG_RAD = [0.028, 0.078, 0.076, 0.068, 0.061, 0.055, 0.050, 0.026];

export function buildPerson(row = {}) {
  const skin = row.skin ?? 0xe0ac69, shirt = row.shirt ?? 0x707880, pants = row.pants ?? 0x2a3a5e;
  const hairC = row.hair ?? 0x241a12, shoes = row.shoes ?? 0x232327;
  const g = new THREE.Group();
  const J = {};

  // legs first (hips at 0.92) — ONE-PIECE PANTS (PANTS RULE above): a
  // single tapered leg per side from hip to ankle, swinging at the hip
  // only. The old row.shorts branch is REMOVED — everyone wears full
  // pants, so there is no hem, no bare leg, and no knee joint to read.
  const hips = J.hips = pivot(g, 0, 0.92, 0);
  hips.add(mesh(new THREE.BoxGeometry(0.33, 0.17, 0.20), M(pants), 0, 0.02, 0)); // pelvis (loose trouser seat)
  const pantsLegGeo = tubeGeo(PANTS_LEG_PTS, PANTS_LEG_RAD);
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const hip = J['hip' + nm] = pivot(hips, s * 0.095, -0.03, 0);
    hip.add(mesh(pantsLegGeo, M(pants), 0, 0, 0));                               // the whole pant leg, one piece
    // the SHOE rides an ankle pivot (below the pant cuff — not a leg
    // segment) so a seated pose can plant the foot flat while the pant
    // leg angles whole from the hip; walking leaves it at 0, rigid.
    const ank = J['ankle' + nm] = pivot(hip, 0, -0.855, 0.045);
    ank.add(mesh(new THREE.BoxGeometry(0.095, 0.07, 0.24), M(shoes), 0, 0, 0));  // shoe
    // RETIRED knee pivot: an EMPTY group, kept only so pose code that
    // still writes knee rotations (interiors.js poseSit) harmlessly
    // no-ops instead of throwing. It carries NO geometry — never add any.
    J['knee' + nm] = pivot(hip, 0, -0.44, 0);
  }
  // torso
  const chest = J.chest = pivot(hips, 0, 0.10, 0);
  // LOOSE shirt shell: garment volume offset OUTWARD from the torso (wider,
  // straighter hang), suspended from a shoulder yoke that bridges torso ->
  // sleeves continuously. The body shape never shows through.
  const torso = mesh(new THREE.CylinderGeometry(0.168, 0.148, 0.52, 12), M(shirt), 0, 0.28, 0);
  torso.scale.z = 0.76; chest.add(torso);
  const yoke = mesh(new THREE.CapsuleGeometry(0.08, 0.26, 3, 10), M(shirt), 0, 0.49, 0);
  yoke.rotation.z = Math.PI / 2; yoke.scale.set(1, 1, 0.78); chest.add(yoke);    // shoulder bar across both shoulder pivots
  const hem = mesh(new THREE.CylinderGeometry(0.155, 0.162, 0.07, 12), M(shirt), 0, 0.045, 0);
  hem.scale.z = 0.76; chest.add(hem);                                            // loose hem over the waistband
  const collar = mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.045, 10), M(shirt), 0, 0.535, 0);
  collar.scale.z = 0.8; chest.add(collar);                                       // crew-neck collar ring
  if (row.stripe) {
    const stb = mesh(new THREE.CylinderGeometry(0.163, 0.16, 0.075, 12), M(row.stripe, 0.8), 0, 0.36, 0);
    stb.scale.z = 0.76; chest.add(stb);                                          // chest stripe (on the shell)
  }
  chest.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 8), M(skin), 0, 0.57, 0)); // neck
  // head
  const head = J.head = pivot(chest, 0, 0.62, 0);
  head.add(mesh(new THREE.SphereGeometry(0.108, 14, 12), M(skin, 0.6), 0, 0.075, 0));
  const hairStyle = row.hairStyle || 'short';
  const hat = row.hat || (hairStyle === 'cap' ? 'cap' : null);
  const hatC = row.hatColor ?? row.capColor ?? 0x24304a;
  if (hat === 'cap') {
    head.add(mesh(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(hatC, 0.7), 0, 0.082, 0));
    const brim = mesh(new THREE.BoxGeometry(0.17, 0.018, 0.12), M(hatC, 0.7), 0, 0.118, 0.135);
    brim.rotation.x = 0.10; head.add(brim);                                       // cap brim, tipped down
    head.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), M(hatC, 0.7), 0, 0.193, 0)); // top button
  } else if (hat === 'brim') {                                                   // wide-brim / bucket hat
    head.add(mesh(new THREE.CylinderGeometry(0.185, 0.198, 0.018, 16), M(hatC, 0.8), 0, 0.128, 0));
    head.add(mesh(new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), M(hatC, 0.8), 0, 0.088, 0));
  } else if (hat === 'beanie') {
    head.add(mesh(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), M(hatC, 0.95), 0, 0.078, 0));
    head.add(mesh(new THREE.CylinderGeometry(0.115, 0.118, 0.05, 14), M(hatC, 0.95), 0, 0.098, 0)); // folded band
  } else if (hairStyle === 'long') {
    head.add(mesh(new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), M(hairC, 0.95), 0, 0.08, -0.006));
    head.add(mesh(new THREE.BoxGeometry(0.17, 0.30, 0.06), M(hairC, 0.95), 0, -0.05, -0.095)); // hair down the back
  } else if (hairStyle !== 'bald') {
    head.add(mesh(new THREE.SphereGeometry(0.111, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), M(hairC, 0.95), 0, 0.078, -0.004));
  }
  // arms
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const sh = J['shoulder' + nm] = pivot(chest, s * 0.205, 0.47, 0);
    sh.add(mesh(capsule(0.07, 0.20), M(shirt), 0, -0.145, 0));                     // LOOSE sleeve tube — the arm hangs inside it, yoke covers the joint
    sh.add(mesh(new THREE.CylinderGeometry(0.072, 0.074, 0.05, 10), M(shirt), 0, -0.285, 0)); // sleeve opening the forearm emerges from
    const el = J['elbow' + nm] = pivot(sh, 0, -0.29, 0);
    el.add(mesh(capsule(0.038, 0.18), M(skin, 0.65), 0, -0.12, 0));                // forearm
    el.add(mesh(new THREE.SphereGeometry(0.042, 8, 8), M(skin, 0.65), 0, -0.27, 0)); // hand
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, joints: J, row, phase: Math.random() * 10 };
}

// ---- pose programs (t in seconds; phase in radians for walk) ----
function reset(p) {
  const J = p.joints;
  J.hips.rotation.set(0, 0, 0); J.chest.rotation.set(0, 0, 0); J.head.rotation.set(0, 0, 0);
  J.shoulderL.rotation.set(0, 0, 0.07); J.shoulderR.rotation.set(0, 0, -0.07);
  J.elbowL.rotation.set(0, 0, 0); J.elbowR.rotation.set(0, 0, 0);
  J.hipL.rotation.set(0, 0, 0); J.hipR.rotation.set(0, 0, 0);
  J.kneeL.rotation.set(0, 0, 0); J.kneeR.rotation.set(0, 0, 0);
  J.ankleL.rotation.set(0, 0, 0); J.ankleR.rotation.set(0, 0, 0);
  p.group.position.y = 0;
}
export function poseIdle(p, t) {
  reset(p);
  const J = p.joints, b = Math.sin(t * 1.7 + p.phase);
  J.chest.rotation.x = 0.02 + b * 0.012;                       // breathing
  J.shoulderL.rotation.x = b * 0.045; J.shoulderR.rotation.x = -b * 0.045;
  J.elbowL.rotation.x = -0.12 - b * 0.03; J.elbowR.rotation.x = -0.12 + b * 0.03;
  J.head.rotation.y = Math.sin(t * 0.43 + p.phase) * 0.16;     // looking around
}
export function poseWave(p, t) {
  reset(p);
  const J = p.joints;
  J.shoulderR.rotation.z = 2.25;                               // right arm up-and-out beside the head
  J.elbowR.rotation.z = Math.sin(t * 9 + p.phase) * 0.42;      // waving wiggle
  J.elbowR.rotation.x = -0.15;
  J.shoulderL.rotation.x = Math.sin(t * 1.7 + p.phase) * 0.04;
  J.head.rotation.z = 0.06;
  J.chest.rotation.y = -0.12;
}
export function poseWalk(p, phase) {
  reset(p);
  const J = p.joints, s = Math.sin(phase);
  J.hipL.rotation.x = s * 0.52; J.hipR.rotation.x = -s * 0.52;
  // no knee bend — the pant leg is one piece and swings whole from the hip
  J.shoulderL.rotation.x = -s * 0.42; J.shoulderR.rotation.x = s * 0.42;
  J.elbowL.rotation.x = -0.25; J.elbowR.rotation.x = -0.25;
  J.chest.rotation.x = 0.06;
  p.group.position.y = Math.abs(Math.sin(phase)) * 0.035;
}
// ---- seated driver: ONE merged vertex-colored mesh (1 draw call), posed
// behind the wheel. Origin at the driver's hip point, facing +Z; the host
// parents it to a vehicle's driverAnchor and scales it by veh.driverScale.
// Same clothing rows as the standing figures: shirt + sleeves, trousers,
// hat. Hands land on the wheel rim (wheel centre ≈ dy +0.32,
// dz +0.50 from the hips — the gpvehicles interior standard).
const _dm4 = new THREE.Matrix4(), _dq = new THREE.Quaternion(), _de = new THREE.Euler(), _dv = new THREE.Vector3(), _ds = new THREE.Vector3();
function _dxf(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _de.set(rx, ry, rz); _dq.setFromEuler(_de); _dv.set(x, y, z); _ds.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_dv, _dq, _ds);
}
function _mergeColored(parts) {
  let total = 0; for (const p of parts) total += p.geo.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const p of parts) {
    const g = p.geo, n = g.attributes.position.count, c = new THREE.Color(p.hex);
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += n; g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const DRIVER_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
export function buildDriver(row = {}) {
  const skin = row.skin ?? 0xe0ac69, shirt = row.shirt ?? 0x707880, pants = row.pants ?? 0x2a3a5e;
  const hairC = row.hair ?? 0x241a12, shoes = row.shoes ?? 0x232327;
  const hat = row.hat || (row.hairStyle === 'cap' ? 'cap' : null);
  const hatC = row.hatColor ?? row.capColor ?? 0x24304a;
  const parts = [];
  const P = (geo, hex, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    geo.applyMatrix4(_dxf(x, y, z, rx, ry, rz, sx, sy, sz));
    parts.push({ geo: geo.index ? geo.toNonIndexed() : geo, hex });
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
  // pelvis + reclined LOOSE shirt shell (offset outward, shoulder yoke,
  // hem + stripe on the shell — same cut as the standing figure)
  P(new THREE.BoxGeometry(0.33, 0.17, 0.20), pants, 0, -0.03, -0.01);
  P(new THREE.CylinderGeometry(0.168, 0.148, 0.52, 12), shirt, 0, 0.26, -0.045, -0.20, 0, 0, 1, 1, 0.76);
  P(cap(0.08, 0.26), shirt, 0, 0.466, -0.087, -0.20, 0, Math.PI / 2, 1, 1, 0.78);
  P(new THREE.CylinderGeometry(0.155, 0.162, 0.07, 12), shirt, 0, 0.035, 0.005, -0.05, 0, 0, 1, 1, 0.76);
  if (row.stripe) P(new THREE.CylinderGeometry(0.163, 0.16, 0.075, 12), row.stripe, 0, 0.335, -0.062, -0.20, 0, 0, 1, 1, 0.76);
  P(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 8), skin, 0, 0.53, -0.088);
  // head + hair/hat
  const hx = 0, hy = 0.635, hz = -0.098;
  P(new THREE.SphereGeometry(0.108, 14, 12), skin, hx, hy, hz);
  if (hat === 'cap') {
    P(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hatC, hx, hy + 0.008, hz - 0.004);
    P(new THREE.BoxGeometry(0.17, 0.018, 0.12), hatC, hx, hy + 0.045, hz + 0.135, 0.10, 0, 0);
  } else if (hat === 'brim') {
    P(new THREE.CylinderGeometry(0.185, 0.198, 0.018, 16), hatC, hx, hy + 0.052, hz);
    P(new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hatC, hx, hy + 0.012, hz);
  } else if (hat === 'beanie') {
    P(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), hatC, hx, hy + 0.004, hz);
    P(new THREE.CylinderGeometry(0.115, 0.118, 0.05, 14), hatC, hx, hy + 0.024, hz);
  } else if (row.hairStyle === 'long') {
    P(new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hairC, hx, hy + 0.006, hz - 0.006);
    P(new THREE.BoxGeometry(0.17, 0.28, 0.06), hairC, hx, hy - 0.12, hz - 0.095);
  } else if (row.hairStyle !== 'bald') {
    P(new THREE.SphereGeometry(0.111, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairC, hx, hy + 0.004, hz - 0.004);
  }
  // arms: LOOSE sleeve tube down-forward (yoke covers the shoulder joint),
  // bare forearm up to the wheel, hands on the rim
  for (const s of [-1, 1]) {
    P(cap(0.068, 0.15), shirt, s * 0.215, 0.315, 0.04, 2.46, 0, 0);
    P(cap(0.037, 0.20), skin, s * 0.195, 0.26, 0.305, 1.24, 0, 0);
    P(new THREE.SphereGeometry(0.042, 8, 8), skin, s * 0.165, 0.315, 0.478);
  }
  // legs: ONE-PIECE PANTS per side (PANTS RULE above) — a single tapered
  // tube bent ONCE along the seated path hip -> knee -> ankle, built as
  // one geometry (not thigh + shin capsules). Same outer envelope as the
  // old two-capsule leg, so feet stay on the pedal line and nothing new
  // clips the seat or dash. The row.shorts branch is gone here too.
  for (const s of [-1, 1]) {
    const legPts = [[s * 0.095, 0.005, -0.035], [s * 0.095, -0.028, 0.03], [s * 0.095, -0.045, 0.16], [s * 0.095, -0.045, 0.30], [s * 0.095, -0.17, 0.345], [s * 0.095, -0.30, 0.365], [s * 0.095, -0.325, 0.375]];
    const legRad = [0.026, 0.080, 0.071, 0.062, 0.055, 0.047, 0.018];
    P(tubeGeo(legPts, legRad), pants, 0, 0, 0);
    P(new THREE.BoxGeometry(0.095, 0.07, 0.24), shoes, s * 0.095, -0.335, 0.40);
  }
  const m = new THREE.Mesh(_mergeColored(parts), DRIVER_MAT);
  m.castShadow = true;
  const group = new THREE.Group();
  group.add(m);
  return { group, row };
}
export default buildPerson;
