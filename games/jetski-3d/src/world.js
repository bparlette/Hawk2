// APEX WAKE — Tropical Archipelago World: Islands, Swaying Palms, Anchored Yachts, Floating Ramps & Slalom Gates
import * as THREE from '../three.module.js';
import { sampleWave } from './ocean.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ================================================================
// 1. ISLAND DEFINITIONS (shared with ocean shader for shallow turquoise & surf foam!)
// ================================================================
export const ISLANDS = [
  { x: -135, z: -115, beachR: 52, peakH: 34, seed: 101, lighthouse: true },
  { x:  155, z: -165, beachR: 62, peakH: 44, seed: 202 },
  { x:  180, z:   85, beachR: 48, peakH: 26, seed: 303 },
  { x: -165, z:  120, beachR: 56, peakH: 38, seed: 404 },
  { x:    8, z: -310, beachR: 78, peakH: 58, seed: 505 },
  { x:  -20, z:  285, beachR: 66, peakH: 42, seed: 606 },
];

// ================================================================
// 2. PROCEDURAL VERTEX-COLORED COASTAL ISLANDS (Sand -> Wet Beach -> Grass -> Limestone)
// ================================================================
function buildIslandMesh(isl) {
  const rng = mulberry32(isl.seed);
  const segR = 48, segA = 48;
  const maxR = isl.beachR * 1.48;
  const geo = new THREE.PlaneGeometry(maxR * 2, maxR * 2, segR, segA);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const p1 = rng() * 6.28, p2 = rng() * 6.28, p3 = rng() * 6.28;
  const cWetSand = new THREE.Color(0xae9064);
  const cSand = new THREE.Color(0xecdab0);
  const cGrass = new THREE.Color(0x285e2c);
  const cJungle = new THREE.Color(0x1b4522);
  const cCliff = new THREE.Color(0x69645c);
  const cTmp = new THREE.Color();

  const palmSpots = [];

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const r = Math.hypot(lx, lz);
    const ang = Math.atan2(lz, lx);

    // Organic coastline coves & rocky headlands
    const coastWarp = 1.0 + 0.16 * Math.sin(ang * 3 + p1) + 0.10 * Math.cos(ang * 5 + p2) + 0.05 * Math.sin(ang * 8 + p3);
    const u = r / (isl.beachR * coastWarp);

    let y;
    if (u >= 1.28) {
      y = -7.5;
    } else {
      const dome = Math.pow(Math.max(0, 1.0 - u * 0.88), 1.45);
      // Multi-octave rocky volcanic ridgelines
      const ridge1 = (Math.sin(lx * 0.075 + p1) * Math.cos(lz * 0.068 + p2) * 0.5 + 0.5) * 0.42;
      const ridge2 = Math.abs(Math.sin(lx * 0.14 - lz * 0.11 + p3)) * 0.22;
      const micro = Math.sin(lx * 0.28 + p2) * Math.cos(lz * 0.26 - p1) * 0.08;
      y = -3.4 + (isl.peakH + 3.4) * dome * (0.62 + ridge1 + ridge2 + micro);
      if (y > -1.0 && y < 3.2) {
        y = THREE.MathUtils.lerp(y, Math.max(-0.5, (y + 1.0) * 0.58), 0.5);
      }
    }
    pos.setY(i, y);

    if (y < 0.7) {
      cTmp.copy(cWetSand);
    } else if (y < 2.6) {
      cTmp.copy(cWetSand).lerp(cSand, (y - 0.7) / 1.9);
    } else if (y < 7.0) {
      cTmp.copy(cSand).lerp(cGrass, (y - 2.6) / 4.4);
      if (y > 2.2 && y < 13 && rng() < 0.12 && palmSpots.length < 34) {
        palmSpots.push({ x: isl.x + lx, y: y - 0.2, z: isl.z + lz, rot: rng() * 6.28, scale: 0.85 + rng() * 0.65 });
      }
    } else if (y < 19.0) {
      cTmp.copy(cGrass).lerp(cJungle, Math.min(1, (y - 7.0) / 8.0)).lerp(cCliff, Math.max(0, (y - 12.0) / 9.0));
    } else {
      cTmp.copy(cCliff);
    }
    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.90,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(isl.x, 0, isl.z);
  return { mesh, palmSpots };
}

// ================================================================
// 3. INSTANCED SWAYING TROPICAL PALM TREES (2 draw calls total for ALL islands!)
// ================================================================
function buildInstancedPalms(spots, parent) {
  if (!spots.length) return;
  // Curved palm trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.35, 2.8, 0.1),
    new THREE.Vector3(0.95, 5.8, 0.2),
    new THREE.Vector3(1.25, 8.4, 0.15),
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 8, 0.22, 7, false);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f5842, roughness: 0.94 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);

  // Lush 10-frond arched tropical palm canopy
  const frondShape = new THREE.Shape();
  frondShape.moveTo(0, 0);
  frondShape.quadraticCurveTo(0.85, 2.2, 0, 4.6);
  frondShape.quadraticCurveTo(-0.85, 2.2, 0, 0);
  const singleFrond = new THREE.ShapeGeometry(frondShape, 6);
  const fPos = [], fNorm = [], fIdx = [];
  let vOff = 0;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + (k % 2) * 0.18;
    const g = singleFrond.clone();
    g.rotateX(0.95 + (k % 3) * 0.24);
    g.rotateY(a);
    g.translate(1.25, 8.35, 0.15);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      fPos.push(p.getX(i), p.getY(i), p.getZ(i));
      fNorm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    const idx = g.index;
    for (let i = 0; i < idx.count; i++) fIdx.push(idx.getX(i) + vOff);
    vOff += p.count;
  }
  const crownGeo = new THREE.BufferGeometry();
  crownGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  crownGeo.setAttribute('normal', new THREE.Float32BufferAttribute(fNorm, 3));
  crownGeo.setIndex(fIdx);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x266b2d, roughness: 0.72, side: THREE.DoubleSide });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, spots.length);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  spots.forEach((sp, i) => {
    P.set(sp.x, sp.y, sp.z);
    E.set(0, sp.rot, 0);
    Q.setFromEuler(E);
    S.set(sp.scale, sp.scale, sp.scale);
    M.compose(P, Q, S);
    trunks.setMatrixAt(i, M);
    crowns.setMatrixAt(i, M);
  });
  parent.add(trunks, crowns);
}

// ================================================================
// 4. ANCHORED LUXURY MOTOR YACHTS (bobbing realistically on waves!)
// ================================================================
function buildLuxuryYacht(x, z, yaw) {
  const g = new THREE.Group();
  const whiteGloss = new THREE.MeshPhysicalMaterial({ color: 0xf4f7fa, roughness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.06 });
  const darkGlass = new THREE.MeshPhysicalMaterial({ color: 0x071726, roughness: 0.06, metalness: 0.72, clearcoat: 1.0 });
  const teakMat = new THREE.MeshStandardMaterial({ color: 0x9c7248, roughness: 0.76 });
  const navyMat = new THREE.MeshPhysicalMaterial({ color: 0x0d233d, roughness: 0.20, clearcoat: 0.90 });

  // Sculpted extruded teardrop motor-yacht planform hull (smooth curved bow!)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-2.7, -9.5);
  hullShape.lineTo(2.7, -9.5);
  hullShape.quadraticCurveTo(3.1, 2.5, 0, 12.8);
  hullShape.quadraticCurveTo(-3.1, 2.5, -2.7, -9.5);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 2.35, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.18, bevelSegments: 3 });
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, whiteGloss);
  hull.position.set(0, 1.95, 0);
  g.add(hull);

  // Navy boot-stripe hull waterline
  const stripeGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.55, bevelEnabled: false });
  stripeGeo.rotateX(Math.PI / 2);
  const stripe = new THREE.Mesh(stripeGeo, navyMat);
  stripe.scale.set(1.02, 1.0, 1.01);
  stripe.position.set(0, 0.35, 0);
  g.add(stripe);

  // Teak aft swim deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.12, 5.4), teakMat);
  deck.position.set(0, 2.08, -6.5);
  g.add(deck);
  // Swept saloon cabin + panoramic wraparound tinted glass
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.85, 9.6), whiteGloss);
  cabin.position.set(0, 2.95, 0.4);
  g.add(cabin);
  const win = new THREE.Mesh(new THREE.BoxGeometry(4.44, 0.88, 7.8), darkGlass);
  win.position.set(0, 3.05, 0.9);
  g.add(win);
  // Sloped windshield fairing
  const wind = new THREE.Mesh(new THREE.BoxGeometry(4.1, 1.45, 2.4), darkGlass);
  wind.rotation.x = 0.55;
  wind.position.set(0, 2.9, 5.4);
  g.add(wind);
  // Flybridge upper deck + swept radar arch
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 4.8), whiteGloss);
  bridge.position.set(0, 4.25, -0.4);
  g.add(bridge);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.14, 8, 18, Math.PI), whiteGloss);
  arch.position.set(0, 4.72, -1.6);
  arch.rotation.x = -0.35;
  g.add(arch);

  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  return { group: g, x, z, yaw };
}

// ================================================================
// 5. FLOATING JUMP RAMPS & SLALOM RACE COURSE BUOYS
// ================================================================
export function createWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // Build islands + collect palm placements
  const allPalms = [];
  for (const isl of ISLANDS) {
    const { mesh, palmSpots } = buildIslandMesh(isl);
    root.add(mesh);
    allPalms.push(...palmSpots);

    // Classic coastal lighthouse on primary headland
    if (isl.lighthouse) {
      const lh = new THREE.Group();
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.7 });
      const redMat = new THREE.MeshStandardMaterial({ color: 0xc92822, roughness: 0.6 });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.3, 18, 14), whiteMat);
      tower.position.y = 9;
      lh.add(tower);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.0, 4.5, 14), redMat);
      band.position.y = 10.5;
      lh.add(band);
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 2.4, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff0b8 })
      );
      lantern.position.y = 19.2;
      lh.add(lantern);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.65, 2.2, 12), redMat);
      roof.position.y = 21.4;
      lh.add(roof);
      lh.position.set(isl.x + 12, isl.peakH * 0.68, isl.z + 18);
      root.add(lh);
    }
  }
  buildInstancedPalms(allPalms, root);

  // Anchored yachts around the bay
  const yachts = [
    buildLuxuryYacht(-62, -78, 0.55),
    buildLuxuryYacht(76, -92, -0.82),
    buildLuxuryYacht(84, 58, 2.15),
    buildLuxuryYacht(-78, 66, -2.4),
  ];
  yachts.forEach((y) => root.add(y.group));

  // Slalom Race Loop (10 buoy gates forming an exciting high-speed ocean circuit!)
  const gateCenters = [
    { x:   0, z:  -46, yaw: 0.00 },
    { x:  18, z: -102, yaw: -0.32 },
    { x:  52, z: -152, yaw: -0.58 },
    { x:  92, z: -120, yaw: -1.65 },
    { x: 102, z:  -45, yaw: -2.85 },
    { x:  72, z:   32, yaw: 2.68 },
    { x:  16, z:   74, yaw: 1.85 },
    { x: -48, z:   62, yaw: 1.15 },
    { x: -74, z:    2, yaw: 0.35 },
    { x: -42, z:  -44, yaw: -0.55 },
  ];

  const redBuoyMat = new THREE.MeshPhysicalMaterial({ color: 0xff2b20, roughness: 0.32, clearcoat: 0.65, emissive: 0x440804, emissiveIntensity: 0.35 });
  const yelBuoyMat = new THREE.MeshPhysicalMaterial({ color: 0xffc800, roughness: 0.32, clearcoat: 0.65, emissive: 0x3b2c00, emissiveIntensity: 0.35 });
  const whiteRingMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.5 });
  const buoyBaseGeo = new THREE.CylinderGeometry(0.45, 0.58, 0.72, 12);
  const buoyConeGeo = new THREE.ConeGeometry(0.42, 1.35, 12);

  function mkBuoy(mat) {
    const b = new THREE.Group();
    const base = new THREE.Mesh(buoyBaseGeo, mat);
    base.position.y = 0.15;
    b.add(base);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.22, 12), whiteRingMat);
    ring.position.y = 0.58;
    b.add(ring);
    const cone = new THREE.Mesh(buoyConeGeo, mat);
    cone.position.y = 1.25;
    b.add(cone);
    return b;
  }

  const gates = [];
  const buoys = [];
  const GATE_HALF_W = 10.5;

  // Next-gate glowing holographic water chevron marker (guides the player cleanly!)
  const nextMarker = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.6, 4),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.85 })
  );
  nextMarker.rotation.x = Math.PI;
  root.add(nextMarker);

  gateCenters.forEach((gc, idx) => {
    const rx = Math.cos(gc.yaw);
    const rz = -Math.sin(gc.yaw);
    const bL = mkBuoy(yelBuoyMat);
    const bR = mkBuoy(redBuoyMat);
    const lx = gc.x - rx * GATE_HALF_W, lz = gc.z - rz * GATE_HALF_W;
    const rxx = gc.x + rx * GATE_HALF_W, rzz = gc.z + rz * GATE_HALF_W;
    bL.position.set(lx, 0, lz);
    bR.position.set(rxx, 0, rzz);
    root.add(bL, bR);
    buoys.push({ group: bL, x: lx, z: lz }, { group: bR, x: rxx, z: rzz });
    gates.push({ idx, x: gc.x, z: gc.z, yaw: gc.yaw, halfW: GATE_HALF_W });
  });

  // Floating Jump Ramps positioned at thrilling open-water stretches!
  const rampMat = new THREE.MeshStandardMaterial({ color: 0xd98a2b, roughness: 0.65, metalness: 0.12 });
  const pontoonMat = new THREE.MeshStandardMaterial({ color: 0x222933, roughness: 0.55, metalness: 0.35 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffe44d });
  const rampSpecs = [
    { x:  -2, z:  -72, yaw: -0.15 },
    { x:  88, z:  -82, yaw: -2.45 },
    { x:  44, z:   58, yaw:  2.20 },
    { x: -64, z:   30, yaw:  0.65 },
  ];
  const ramps = [];
  for (const rs of rampSpecs) {
    const g = new THREE.Group();
    // Sloped deck: 4.8m wide, 7.6m long, rising to 2.15m at launch lip
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.24, 7.8), rampMat);
    deck.rotation.x = -0.27;
    deck.position.set(0, 0.92, 0);
    g.add(deck);
    // Yellow chevron launch stripe at top edge
    const lip = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.55), stripeMat);
    lip.rotation.x = -0.27;
    lip.position.set(0, 1.92, -3.45);
    g.add(lip);
    // Dual pontoon floats
    for (const sx of [-2.2, 2.2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 8.2, 10), pontoonMat);
      p.rotation.x = Math.PI / 2;
      p.position.set(sx, 0.1, 0);
      g.add(p);
    }
    g.position.set(rs.x, 0, rs.z);
    g.rotation.y = rs.yaw;
    root.add(g);
    ramps.push({ group: g, x: rs.x, z: rs.z, yaw: rs.yaw, length: 7.8, width: 4.8, maxH: 2.15 });
  }

  // Circling coastal seagulls (lightweight animated V-wing birds)
  const birds = [];
  const birdMat = new THREE.MeshBasicMaterial({ color: 0xf6f9fc, side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Group();
    const wL = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.22), birdMat);
    wL.position.x = -0.35; wL.rotation.x = -Math.PI / 2;
    const wR = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.22), birdMat);
    wR.position.x = 0.35; wR.rotation.x = -Math.PI / 2;
    b.add(wL, wR);
    root.add(b);
    birds.push({ group: b, wL, wR, cx: (i % 2 ? -1 : 1) * 55, cz: -40 + (i - 5) * 32, rad: 28 + i * 5, y: 18 + (i % 4) * 5, speed: 0.28 + (i % 3) * 0.09, phase: i * 1.1 });
  }

  return {
    root,
    gates,
    ramps,
    islands: ISLANDS,
    // Query if a world (x,z) is riding up any floating jump ramp
    sampleRampHeight(x, z) {
      for (const r of ramps) {
        const dx = x - r.x;
        const dz = z - r.z;
        const c = Math.cos(-r.yaw), s = Math.sin(-r.yaw);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        if (Math.abs(lx) <= r.width * 0.56 && Math.abs(lz) <= r.length * 0.52) {
          // lz goes from +length/2 (entry) to -length/2 (high launch lip)
          const u = THREE.MathUtils.clamp((r.length * 0.5 - lz) / r.length, 0, 1);
          return { onRamp: true, heightOffset: u * r.maxH, launchSlope: 0.27 };
        }
      }
      return { onRamp: false, heightOffset: 0, launchSlope: 0 };
    },
    update(t, nextGateIdx) {
      // Bob & tilt buoys on exact Gerstner waves
      for (const b of buoys) {
        const w = sampleWave(b.x, b.z, t);
        b.group.position.y = w.y - 0.08;
        b.group.rotation.z = -w.slopeX * 0.85;
        b.group.rotation.x = w.slopeZ * 0.85;
      }
      // Rock anchored yachts gently
      for (const y of yachts) {
        const w = sampleWave(y.x, y.z, t);
        y.group.position.y = w.y * 0.65 - 0.15;
        y.group.rotation.z = -w.slopeX * 0.28;
        y.group.rotation.x = w.slopeZ * 0.22;
      }
      // Bob floating jump ramps
      for (const r of ramps) {
        const w = sampleWave(r.x, r.z, t);
        r.group.position.y = w.y * 0.72 - 0.06;
        r.group.rotation.z = -w.slopeX * 0.32;
      }
      // Animate floating beacon above next slalom gate
      const ng = gates[nextGateIdx % gates.length];
      if (ng) {
        nextMarker.position.set(ng.x, 5.4 + Math.sin(t * 3.8) * 0.55, ng.z);
        nextMarker.rotation.y = t * 2.2;
      }
      // Wheel coastal seagulls
      for (const b of birds) {
        const a = t * b.speed + b.phase;
        b.group.position.set(b.cx + Math.cos(a) * b.rad, b.y + Math.sin(a * 2) * 1.4, b.cz + Math.sin(a) * b.rad);
        b.group.rotation.y = -a;
        const flap = Math.sin(t * 7.5 + b.phase) * 0.38;
        b.wL.rotation.z = flap;
        b.wR.rotation.z = -flap;
      }
    },
  };
}
