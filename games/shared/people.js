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
// ONE-PIECE SHIRT (Cherie, Nov 21): the shirt is ONE continuous profile
// tube, hem to neck opening — no stacked torso/yoke/hem/collar pieces
// and no seam steps between them; the chest stripe is a band on the
// shell, and the shoulder flare hides the sleeve tops.
// LONG SLEEVES (Cherie, Nov 21): sleeves run shoulder to wrist — the
// elbow bend stays inside overlapping sleeve pieces (long upper sleeve
// + elbow ball + tapered forearm sleeve), so no gap and no skin band
// can open at the elbow; only the hand is skin. The short sleeve
// exposed the elbow exactly the way shorts exposed the knee.
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
let _personShadowMat = null;
function getPersonShadowMat() {
  if (_personShadowMat) return _personShadowMat;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(6,8,14,0.68)');
  gr.addColorStop(0.58, 'rgba(6,8,14,0.34)');
  gr.addColorStop(1, 'rgba(6,8,14,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  _personShadowMat = new THREE.MeshBasicMaterial({
    map: t, transparent: true, opacity: 0.85, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
  return _personShadowMat;
}
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
// ONE-PIECE SHIRT profile in chest-pivot space (path straight up the
// centre line): hem flare at the waist -> slight waist -> chest ->
// shoulder flare (covers the shoulder pivots + sleeve tops) -> neck
// slope -> neck opening. Radii keep the SHIRT RULE's loose hang.
const SHIRT_PTS = [[0, 0.00, 0], [0, 0.05, 0], [0, 0.12, 0], [0, 0.22, 0], [0, 0.32, 0], [0, 0.40, 0], [0, 0.44, 0], [0, 0.465, 0], [0, 0.49, 0], [0, 0.51, 0], [0, 0.53, 0], [0, 0.55, 0], [0, 0.565, 0]];
const SHIRT_RAD = [0.156, 0.166, 0.159, 0.153, 0.156, 0.168, 0.188, 0.208, 0.216, 0.196, 0.148, 0.104, 0.090];
// Chest stripe: the same profile sliced at y 0.32-0.40, radii +0.005 so
// the band hugs the shell.
const STRIPE_PTS = [[0, 0.320, 0], [0, 0.36, 0], [0, 0.400, 0]];
const STRIPE_RAD = [0.161, 0.167, 0.173];
// LONG-SLEEVE forearm profile in elbow-pivot space: the top tucks ABOVE
// the pivot (inside the upper sleeve), tapering to the wrist; the cuff
// end overlaps the hand sphere so no wrist gap can open.
const FORE_SLEEVE_PTS = [[0, 0.03, 0], [0, -0.03, 0], [0, -0.10, 0], [0, -0.17, 0], [0, -0.235, 0]];
const FORE_SLEEVE_RAD = [0.054, 0.053, 0.050, 0.046, 0.0415];

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
  // ONE-PIECE SHIRT (Cherie, Nov 21): ONE continuous profile tube from
  // the hem at the waist to the neck opening — the same treatment as
  // the pants. It replaces the old stack of torso cylinder + shoulder-
  // yoke capsule + hem cylinder + collar ring, whose joins read as
  // seams. The profile rolls over the shoulder line (peak r 0.216 at
  // y 0.49, wider than the shoulder pivots at +/-0.205) so the sleeve
  // tops tuck UNDER the garment; the loose hang (SHIRT RULE) lives in
  // the profile radii, and the garment stays on the chest pivot so
  // breathing/wave/walk poses work exactly as before.
  const shirt1 = mesh(tubeGeo(SHIRT_PTS, SHIRT_RAD, 16, 3), M(shirt), 0, 0, 0);
  shirt1.scale.z = 0.76; chest.add(shirt1);
  if (row.stripe) {
    const stb = mesh(tubeGeo(STRIPE_PTS, STRIPE_RAD, 16, 1), M(row.stripe, 0.8), 0, 0, 0);
    stb.scale.z = 0.76; chest.add(stb);   // chest band ON the shell — follows the profile, not a structural piece
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
  // arms — LONG SLEEVES (Cherie, Nov 21): the sleeve runs shoulder to
  // wrist so the elbow bend stays covered the way the pants cover the
  // knee. Three overlapping shirt pieces and no skin between shoulder
  // and wrist: (1) the upper sleeve's cylinder reaches the elbow pivot
  // and its dome wraps past it; (2) an elbow ball centred ON the pivot
  // — rotation-invariant, it fills the bend wedge at any angle; (3) a
  // tapered forearm sleeve on the elbow pivot whose top tucks up inside
  // the upper sleeve and whose cuff overlaps the hand sphere. The old
  // short-sleeve opening + bare forearm are GONE; only the hand is skin.
  const foreSleeveGeo = tubeGeo(FORE_SLEEVE_PTS, FORE_SLEEVE_RAD);
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const sh = J['shoulder' + nm] = pivot(chest, s * 0.205, 0.47, 0);
    sh.add(mesh(capsule(0.07, 0.26), M(shirt), 0, -0.16, 0));                      // upper sleeve — full radius reaches the elbow pivot, dome wraps past it
    const el = J['elbow' + nm] = pivot(sh, 0, -0.29, 0);
    el.add(mesh(new THREE.SphereGeometry(0.062, 10, 8), M(shirt), 0, 0, 0));       // elbow ball — fills the bend wedge at any angle
    el.add(mesh(foreSleeveGeo, M(shirt), 0, 0, 0));                                // forearm sleeve, elbow -> wrist cuff
    el.add(mesh(new THREE.SphereGeometry(0.042, 8, 8), M(skin, 0.65), 0, -0.27, 0)); // hand (the only skin on the arm)
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const sm = getPersonShadowMat();
  if (sm) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), sm);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.082;
    sh.renderOrder = 1;
    sh.castShadow = false;
    g.add(sh);
  }
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
  // pelvis + reclined ONE-PIECE SHIRT (Cherie, Nov 21): the same single
  // profile tube as the standing figure, recentred on the old torso
  // cylinder's origin and reclined as ONE piece — replaces the stacked
  // torso cylinder + yoke capsule + hem cylinder.
  P(new THREE.BoxGeometry(0.33, 0.17, 0.20), pants, 0, -0.03, -0.01);
  const dShirt = tubeGeo(SHIRT_PTS, SHIRT_RAD, 16, 3); dShirt.translate(0, -0.28, 0);
  P(dShirt, shirt, 0, 0.26, -0.045, -0.20, 0, 0, 1, 1, 0.76);
  if (row.stripe) { const dStripe = tubeGeo(STRIPE_PTS, STRIPE_RAD, 16, 1); dStripe.translate(0, -0.36, 0); P(dStripe, row.stripe, 0, 0.335, -0.062, -0.20, 0, 0, 1, 1, 0.76); }
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
  // arms: LONG SLEEVES (Cherie, Nov 21) — the grip bend is baked into
  // this mesh, so the elbow gets the same overlapping coverage as the
  // standing figure: upper sleeve, an elbow ball ON the joint, and a
  // tapered shirt forearm tube along the old forearm line to the
  // wrist. Only the hand is skin; the bare forearm is GONE (the dark
  // gap at its elbow is exactly what Cherie flagged).
  for (const s of [-1, 1]) {
    P(cap(0.068, 0.15), shirt, s * 0.215, 0.315, 0.04, 2.46, 0, 0);
    P(new THREE.SphereGeometry(0.060, 10, 8), shirt, s * 0.205, 0.208, 0.152);
    const forePts = [[s * 0.212, 0.190, 0.105], [s * 0.208, 0.200, 0.135], [s * 0.200, 0.222, 0.215], [s * 0.192, 0.258, 0.315], [s * 0.180, 0.292, 0.405], [s * 0.168, 0.312, 0.462]];
    const foreRad = [0.052, 0.056, 0.053, 0.049, 0.045, 0.040];
    P(tubeGeo(forePts, foreRad), shirt, 0, 0, 0);
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
