// Scaggsville 3D — Working Traffic Lights for Major MD-216 & Scaggsville Road Intersections
// Hardware: 6 InstancedMesh draws total across all signalized junctions (poles, housings, R/Y/G HDR lamps, stop bars).
// Cycle (18 s brisk protected): 6.5 s Green -> 1.7 s Yellow -> 0.8 s All-Red Clearance -> 9.0 s Red (cross street offset 9.0 s).

import * as THREE from 'three';

const CYCLE_S = 18.0;
const HALF_S = 9.0;
const GREEN_S = 6.5;
const YELLOW_S = 1.7; // 6.5..8.2 yellow, 8.2..9.0 all-red clearance

function mergeGeos(geos) {
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

function findMajorJunctions(D) {
  const roads = D.roads || [];
  const route = D.route || [];
  const nearRoute = (x, z) => {
    let m = 1e9;
    for (let i = 0; i < route.length; i += 4) {
      const d = Math.hypot(route[i][0] - x, route[i][1] - z);
      if (d < m) m = d;
    }
    return m;
  };

  const key = (x, z) => Math.round(x / 2) + ',' + Math.round(z / 2);
  const byPt = new Map();
  for (const r of roads) {
    if (!r.pts) continue;
    for (let i = 0; i < r.pts.length; i++) {
      const [x, z] = r.pts[i];
      const k = key(x, z);
      if (!byPt.has(k)) byPt.set(k, []);
      byPt.get(k).push({ r, i, x, z });
    }
  }

  const cands = [];
  for (const list of byPt.values()) {
    const main = list.find(e => /scaggsville|216/i.test(e.r.name || '') && (e.r.w || 0) >= 7.5);
    if (!main) continue;
    const cross = list.find(e => e.r.name && e.r.name !== main.r.name && e.r.hw !== 'service');
    if (!cross) continue;
    const cx = main.x, cz = main.z;
    const isMajorCross = /^(primary|secondary|tertiary)/.test(cross.r.hw || '');
    const rd = nearRoute(cx, cz);
    if (!isMajorCross && rd > 20) continue;

    const pts = main.r.pts;
    const a = pts[Math.max(0, main.i - 1)], b = pts[Math.min(pts.length - 1, main.i + 1)];
    const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const score = (isMajorCross ? 0 : 100) + rd;
    cands.push({
      x: cx, z: cz, heading: h,
      mainName: main.r.name, crossName: cross.r.name,
      mainW: main.r.w || 9, crossW: cross.r.w || 7.5,
      score,
    });
  }

  cands.sort((a, b) => a.score - b.score);
  const picked = [];
  for (const c of cands) {
    if (picked.some(p => Math.hypot(p.x - c.x, p.z - c.z) < 80)) continue;
    picked.push({
      id: picked.length,
      x: c.x, z: c.z,
      heading: c.heading,
      fx: Math.sin(c.heading), fz: Math.cos(c.heading), // Axis A unit vector (MD-216 / Scaggsville Rd)
      mainName: c.mainName, crossName: c.crossName,
      mainW: c.mainW, crossW: c.crossW,
      offset: (picked.length * 4.3) % CYCLE_S,
      overrideT: null,
      stateA: 'green',
      stateB: 'red',
    });
    if (picked.length >= 7) break;
  }
  return picked;
}

function axisState(tInCycle, isAxisB) {
  const t = ((isAxisB ? tInCycle - HALF_S : tInCycle) % CYCLE_S + CYCLE_S) % CYCLE_S;
  if (t < GREEN_S) return 'green';
  if (t < GREEN_S + YELLOW_S) return 'yellow';
  return 'red';
}

export function createSignals(scene, D) {
  const junctions = findMajorJunctions(D);
  if (!junctions.length) {
    return {
      junctions: [],
      drawCalls: 0,
      update() {},
      queryApproach() { return null; },
      setPhase() {},
    };
  }

  // Each junction gets 4 cantilevered mast poles (2 for Axis A approaches, 2 for Axis B approaches)
  const approaches = []; // { junc, axis:'A'|'B', px, pz, faceYaw, stopX, stopZ }
  for (const j of junctions) {
    const hwA = Math.max(5.4, j.mainW * 0.56);
    const hwB = Math.max(5.0, j.crossW * 0.56);
    const armDist = 9.2;
    const dirs = [
      { axis: 'A', h: j.heading,              offSide: hwA + 1.1, stopBack: armDist },
      { axis: 'A', h: j.heading + Math.PI,    offSide: hwA + 1.1, stopBack: armDist },
      { axis: 'B', h: j.heading + Math.PI / 2, offSide: hwB + 1.1, stopBack: armDist },
      { axis: 'B', h: j.heading - Math.PI / 2, offSide: hwB + 1.1, stopBack: armDist },
    ];
    for (const d of dirs) {
      const fx = Math.sin(d.h), fz = Math.cos(d.h);
      const rx = -fz, rz = fx; // right side of travel direction
      // Pole stands on the FAR-RIGHT corner of the intersection facing oncoming drivers (US style!)
      const px = j.x + fx * (armDist * 0.72) + rx * d.offSide;
      const pz = j.z + fz * (armDist * 0.72) + rz * d.offSide;
      // Stop bar painted on the NEAR-RIGHT lane approaching the junction
      const stopX = j.x - fx * d.stopBack + rx * (d.offSide * 0.34);
      const stopZ = j.z - fz * d.stopBack + rz * (d.offSide * 0.34);
      // Signal head faces -fwd (back toward approaching cars)
      const faceYaw = Math.atan2(-fx, -fz);
      approaches.push({ junc: j, axis: d.axis, px, pz, faceYaw, stopX, stopZ, approachH: d.h });
    }
  }

  const N = approaches.length;

  // 1. Pole + horizontal mast arm geometry (local +Z faces approaching drivers, -X reaches OUT over the driving lane!)
  const mast = new THREE.CylinderGeometry(0.11, 0.14, 6.2, 8).toNonIndexed();
  mast.translate(0, 3.1, 0);
  const arm = new THREE.CylinderGeometry(0.075, 0.095, 5.4, 8).toNonIndexed();
  arm.rotateZ(Math.PI / 2);
  arm.translate(-2.7, 5.75, 0);
  const poleGeo = mergeGeos([mast, arm]);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x626a74, roughness: 0.42, metalness: 0.65 });
  const poleIM = new THREE.InstancedMesh(poleGeo, poleMat, N);

  // 2. Signal head housing box + backplate mounted overhead over the lane
  const box = new THREE.BoxGeometry(0.60, 1.56, 0.34).toNonIndexed();
  box.translate(-3.4, 5.20, 0.04);
  const plate = new THREE.BoxGeometry(0.82, 1.76, 0.06).toNonIndexed();
  plate.translate(-3.4, 5.20, -0.10);
  const housingGeo = mergeGeos([box, plate]);
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.78, metalness: 0.15 });
  const housingIM = new THREE.InstancedMesh(housingGeo, housingMat, N);

  // 3. Red / Yellow / Green HDR lenses (toneMapped: false so lit HDR colors > 1.12 bloom cleanly at night!)
  const makeLensGeo = (yOff) => {
    const g = new THREE.CircleGeometry(0.21, 14).toNonIndexed();
    g.translate(-3.4, 5.20 + yOff, 0.225);
    return g;
  };
  const lampMatR = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  const lampMatY = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  const lampMatG = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  const redIM    = new THREE.InstancedMesh(makeLensGeo(0.42),  lampMatR, N);
  const yellowIM = new THREE.InstancedMesh(makeLensGeo(0.0),   lampMatY, N);
  const greenIM  = new THREE.InstancedMesh(makeLensGeo(-0.42), lampMatG, N);

  // 4. Crisp white stop bar on each approach lane
  const stopGeo = new THREE.PlaneGeometry(3.2, 0.55);
  stopGeo.rotateX(-Math.PI / 2);
  const stopMat = new THREE.MeshBasicMaterial({
    color: 0xe8edf4, transparent: true, opacity: 0.82, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
  const stopIM = new THREE.InstancedMesh(stopGeo, stopMat, N);

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < N; i++) {
    const a = approaches[i];
    _p.set(a.px, 0, a.pz);
    _e.set(0, a.faceYaw, 0);
    _q.setFromEuler(_e);
    _m.compose(_p, _q, _s);
    poleIM.setMatrixAt(i, _m);
    housingIM.setMatrixAt(i, _m);
    redIM.setMatrixAt(i, _m);
    yellowIM.setMatrixAt(i, _m);
    greenIM.setMatrixAt(i, _m);

    _p.set(a.stopX, 0.082, a.stopZ);
    _e.set(0, a.approachH, 0);
    _q.setFromEuler(_e);
    _m.compose(_p, _q, _s);
    stopIM.setMatrixAt(i, _m);
  }

  for (const im of [poleIM, housingIM, redIM, yellowIM, greenIM, stopIM]) {
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    scene.add(im);
  }

  // HDR emissive colors (cross selective bloom threshold 1.12 when lit; dim when unlit)
  const C_DIM = new THREE.Color(0.06, 0.06, 0.07);
  const C_RED = new THREE.Color(2.9, 0.14, 0.10);
  const C_YEL = new THREE.Color(2.7, 1.85, 0.08);
  const C_GRN = new THREE.Color(0.12, 2.7, 0.48);

  let simT = 0;
  let lastVisStamp = -1;

  function syncColors() {
    for (let i = 0; i < N; i++) {
      const a = approaches[i];
      const st = a.axis === 'A' ? a.junc.stateA : a.junc.stateB;
      redIM.setColorAt(i,    st === 'red'    ? C_RED : C_DIM);
      yellowIM.setColorAt(i, st === 'yellow' ? C_YEL : C_DIM);
      greenIM.setColorAt(i,  st === 'green'  ? C_GRN : C_DIM);
    }
    if (redIM.instanceColor) redIM.instanceColor.needsUpdate = true;
    if (yellowIM.instanceColor) yellowIM.instanceColor.needsUpdate = true;
    if (greenIM.instanceColor) greenIM.instanceColor.needsUpdate = true;
  }

  function update(dt) {
    simT += dt;
    let changed = false;
    for (const j of junctions) {
      const t = j.overrideT !== null ? j.overrideT : (simT + j.offset) % CYCLE_S;
      const nA = axisState(t, false);
      const nB = axisState(t, true);
      if (nA !== j.stateA || nB !== j.stateB) {
        j.stateA = nA;
        j.stateB = nB;
        changed = true;
      }
    }
    if (changed || lastVisStamp < 0) {
      lastVisStamp = simT;
      syncColors();
    }
  }

  // Query whether a vehicle at (x, z) moving along `heading` is approaching a signalized stop line.
  // Returns null if not approaching or already past the stop line (never stops cars inside a crossing!).
  function queryApproach(x, z, heading) {
    const chx = Math.sin(heading), chz = Math.cos(heading);
    for (const j of junctions) {
      const dx = j.x - x, dz = j.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 38 * 38 || d2 < 7.5 * 7.5) continue;
      const d = Math.sqrt(d2);
      const dotToJ = (dx * chx + dz * chz) / d;
      if (dotToJ < 0.65) continue; // moving away or perpendicular
      const stopDist = d - 9.5;
      if (stopDist < 0.2) continue; // already crossed stop line — clear the junction!
      const axisDot = Math.abs(chx * j.fx + chz * j.fz);
      const state = axisDot >= 0.707 ? j.stateA : j.stateB;
      return { state, stopDist, junc: j };
    }
    return null;
  }

  function setPhase(juncIdx, tSec) {
    const list = juncIdx === 'all' ? junctions : [junctions[juncIdx | 0]].filter(Boolean);
    for (const j of list) j.overrideT = tSec === null ? null : ((tSec % CYCLE_S) + CYCLE_S) % CYCLE_S;
    update(0);
  }

  update(0);

  return {
    junctions,
    drawCalls: 6,
    update,
    queryApproach,
    setPhase,
  };
}
