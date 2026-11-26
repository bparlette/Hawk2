import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { normalizeForMerge, paint } from './util.js';

let cachedPumpkin = null;
let cachedPie = null;

// Ribbed pumpkin: sphere with grooves carved by angle, flattened, plus a stem.
// Vertex colours carry the orange gradient so one material serves all pumpkins.
export function pumpkinGeometry() {
  if (cachedPumpkin) return cachedPumpkin;
  const R = 0.16;
  const body = new THREE.SphereGeometry(R, 36, 24);
  const p = body.attributes.position;
  const col = new Float32Array(p.count * 3);
  const deep = new THREE.Color('#c05e14');
  const mid = new THREE.Color('#e07b24');
  const lite = new THREE.Color('#f0952f');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const th = Math.atan2(z, x);
    const rib = Math.pow(Math.abs(Math.cos(th * 5)), 0.55); // 10 ribs
    const pinch = 1 - 0.085 * (1 - rib);
    const ny = y * 0.8;
    p.setXYZ(i, x * pinch, ny, z * pinch);
    c.copy(deep).lerp(mid, rib).lerp(lite, Math.max(0, ny / R) * 0.35 * rib);
    col.set([c.r, c.g, c.b], i * 3);
  }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3));
  body.computeVertexNormals();
  const stem = new THREE.CylinderGeometry(0.016, 0.028, 0.075, 8);
  stem.translate(0, 0.045, 0);
  stem.rotateZ(0.25);
  stem.translate(0.008, R * 0.8, 0);
  cachedPumpkin = mergeGeometries([
    normalizeForMerge(body),
    paint(normalizeForMerge(stem), '#6b4a1f'),
  ]);
  cachedPumpkin.computeBoundingSphere();
  return cachedPumpkin;
}

// Whole pumpkin pie in a tin: silver tin, golden crust rim and lattice strips.
export function pieGeometry() {
  if (cachedPie) return cachedPie;
  const parts = [];
  const tin = new THREE.CylinderGeometry(0.175, 0.14, 0.04, 28);
  tin.translate(0, -0.012, 0);
  parts.push(paint(normalizeForMerge(tin), '#c9ced6'));
  const filling = new THREE.CylinderGeometry(0.158, 0.158, 0.022, 28);
  filling.translate(0, 0.012, 0);
  parts.push(paint(normalizeForMerge(filling), '#c96a1e'));
  const rim = new THREE.TorusGeometry(0.163, 0.02, 10, 32);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 0.02, 0);
  parts.push(paint(normalizeForMerge(rim), '#d9a45b'));
  for (let i = -1; i <= 1; i++) {
    const strip = new THREE.BoxGeometry(0.3, 0.008, 0.045);
    strip.translate(0, 0.026, i * 0.085);
    parts.push(paint(normalizeForMerge(strip), '#e0af60'));
    const strip2 = new THREE.BoxGeometry(0.045, 0.008, 0.3);
    strip2.translate(i * 0.085, 0.03, 0);
    parts.push(paint(normalizeForMerge(strip2), '#e0af60'));
  }
  const dollop = new THREE.SphereGeometry(0.045, 12, 10);
  dollop.scale(1, 0.7, 1);
  dollop.translate(0, 0.045, 0);
  parts.push(paint(normalizeForMerge(dollop), '#fff6e8'));
  cachedPie = mergeGeometries(parts);
  cachedPie.computeBoundingSphere();
  return cachedPie;
}
