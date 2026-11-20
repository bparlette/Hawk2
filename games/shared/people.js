// Scaggsville 3D — crew figures, built with the house Figure Factory / rigkit
// Hawk2 SHARED COPY — canonical source: gamepress kit style (Figure Factory / rigkit method). Games import this file as ../shared/people.js.
// method (gamepress docs/FIGURE-FACTORY.md): primitive meshes on NAMED PIVOTS,
// characters as DATA ROWS, procedural pose programs — no rigs, no skinning.
// (gpchar.js is the fighter-specific implementation of the same method — gi,
// obi, hakama, bare feet. The crew needs street clothes, so the figures are
// built here from capsules/spheres with tees, jeans and shoes.)
//
//   import { buildPerson, poseIdle, poseWave, poseWalk } from './people.js';
//   const p = buildPerson({ skin:0xe0ac69, shirt:0xb03030, pants:0x2a3a5e,
//                           hair:0x1a1410, hairStyle:'short', shoes:0x222226 });
//   scene.add(p.group);            // faces +Z, ~1.75 m tall, origin at feet
//   // per frame: poseWave(p, t) / poseWalk(p, phase) / poseIdle(p, t)
//
// Pivots: hips, chest, head, shoulderL/R, elbowL/R, hipL/R, kneeL/R.
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

export function buildPerson(row = {}) {
  const skin = row.skin ?? 0xe0ac69, shirt = row.shirt ?? 0x707880, pants = row.pants ?? 0x2a3a5e;
  const hairC = row.hair ?? 0x241a12, shoes = row.shoes ?? 0x232327;
  const g = new THREE.Group();
  const J = {};

  // legs first (hips at 0.92)
  const hips = J.hips = pivot(g, 0, 0.92, 0);
  hips.add(mesh(new THREE.BoxGeometry(0.30, 0.17, 0.19), M(pants), 0, 0.02, 0)); // pelvis
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const hip = J['hip' + nm] = pivot(hips, s * 0.095, -0.03, 0);
    hip.add(mesh(capsule(0.062, 0.30), M(pants), 0, -0.21, 0));                    // thigh
    const knee = J['knee' + nm] = pivot(hip, 0, -0.44, 0);
    knee.add(mesh(capsule(0.048, 0.30), M(pants), 0, -0.20, 0));                   // shin
    knee.add(mesh(new THREE.BoxGeometry(0.095, 0.07, 0.24), M(shoes), 0, -0.415, 0.045)); // shoe
  }
  // torso
  const chest = J.chest = pivot(hips, 0, 0.10, 0);
  const torso = mesh(new THREE.CylinderGeometry(0.145, 0.115, 0.52, 12), M(shirt), 0, 0.28, 0);
  torso.scale.z = 0.74; chest.add(torso);
  chest.add(mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 8), M(skin), 0, 0.57, 0)); // neck
  // head
  const head = J.head = pivot(chest, 0, 0.62, 0);
  head.add(mesh(new THREE.SphereGeometry(0.108, 14, 12), M(skin, 0.6), 0, 0.075, 0));
  const hairStyle = row.hairStyle || 'short';
  if (hairStyle === 'cap') {
    const cap = mesh(new THREE.SphereGeometry(0.113, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), M(row.capColor ?? 0x24304a, 0.7), 0, 0.082, 0);
    head.add(cap);
    head.add(mesh(new THREE.BoxGeometry(0.16, 0.02, 0.11), M(row.capColor ?? 0x24304a, 0.7), 0, 0.115, 0.13)); // brim
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
    sh.add(mesh(capsule(0.048, 0.20), M(shirt), 0, -0.14, 0));                     // upper arm (tee sleeve + arm)
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
  const J = p.joints, s = Math.sin(phase), c = Math.cos(phase);
  J.hipL.rotation.x = s * 0.52; J.hipR.rotation.x = -s * 0.52;
  J.kneeL.rotation.x = Math.max(0, -c) * 0.75 + 0.05;
  J.kneeR.rotation.x = Math.max(0, c) * 0.75 + 0.05;
  J.shoulderL.rotation.x = -s * 0.42; J.shoulderR.rotation.x = s * 0.42;
  J.elbowL.rotation.x = -0.25; J.elbowR.rotation.x = -0.25;
  J.chest.rotation.x = 0.06;
  p.group.position.y = Math.abs(Math.sin(phase)) * 0.035;
}
export default buildPerson;
