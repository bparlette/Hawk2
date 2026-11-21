// gpcar_loft.js — Generic Multi-Station Procedural Car Builder (Three.js, gpvehicles idiom)
// Canonical source: gamepress/kit/gpcar_loft.js
//
// Builds realistic, smooth-sculpted, zero-Blender procedural vehicles from a
// human- & AI-editable JSON parameter spec derived directly from reference photos.
//
// CONVENTION:
//   - Car faces +Z (front = +L/2, rear = -L/2)
//   - +Y is up, ground plane at Y = 0
//   - +X is driver's LEFT (right-handed: Y x Z = X)
//   - 1 unit = 1 metre
//
// USAGE:
//   import { buildLoftedCar, DEFAULT_CAR_SPEC } from './gpcar_loft.js';
//   const car = buildLoftedCar(spec);
//   scene.add(car.group);
//   car.setPopups(1); // 0 = flush down, 1 = raised & lit
//   car.updateWheels(speedMps, steerRad, dt);

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Documented default parameter schema (every field measurable from photos)
// ---------------------------------------------------------------------------
export const DEFAULT_CAR_SPEC = {
  meta: {
    name: 'Generic 80s Liftback Coupe',
    year: 1987,
    notes: 'All units in metres. +Z forward, +Y up, +X driver-left.',
  },
  dims: {
    length: 4.38,
    width: 1.70,
    height: 1.26,
    wheelbase: 2.52,
    wheelZFront: 1.28,
    wheelZRear: -1.24,
    wheelRadius: 0.305,
    wheelWidth: 0.215,
    trackHalfFront: 0.745,
    trackHalfRear: 0.740,
    archGap: 0.048,
  },
  paint: {
    color: 0x164a9a,
    roughness: 0.24,
    metalness: 0.28,
    clearcoat: 0.92,
    clearcoatRoughness: 0.14,
  },
  // Longitudinal body stations from REAR (-L/2) to FRONT (+L/2).
  // Each station defines the half-width & height of the sculpted cross-section:
  //   z: longitudinal position (m)
  //   yBot: bottom of rocker/bumper (m)
  //   yBelt: beltline / character crease height (m)
  //   yDeck: top of hood / fender / rear deck at centerline (m)
  //   wBot: half-width at rocker bottom (m)
  //   wBelt: half-width at widest beltline (m)
  //   wDeck: half-width at top edge of hood/fender shoulder (m)
  //   crown: subtle upward crown across centerline (m)
  bodyStations: [
    { z: -2.19, yBot: 0.33, yBelt: 0.72, yDeck: 0.88, wBot: 0.74, wBelt: 0.80, wDeck: 0.74, crown: 0.015 },
    { z: -2.02, yBot: 0.26, yBelt: 0.73, yDeck: 0.90, wBot: 0.78, wBelt: 0.84, wDeck: 0.78, crown: 0.018 },
    { z: -1.55, yBot: 0.22, yBelt: 0.74, yDeck: 0.89, wBot: 0.80, wBelt: 0.85, wDeck: 0.79, crown: 0.018 },
    { z: -0.90, yBot: 0.21, yBelt: 0.73, yDeck: 0.87, wBot: 0.80, wBelt: 0.85, wDeck: 0.79, crown: 0.015 },
    { z:  0.40, yBot: 0.21, yBelt: 0.72, yDeck: 0.85, wBot: 0.80, wBelt: 0.85, wDeck: 0.79, crown: 0.018 },
    { z:  1.10, yBot: 0.22, yBelt: 0.69, yDeck: 0.82, wBot: 0.79, wBelt: 0.85, wDeck: 0.78, crown: 0.025 },
    { z:  1.75, yBot: 0.24, yBelt: 0.63, yDeck: 0.75, wBot: 0.76, wBelt: 0.82, wDeck: 0.75, crown: 0.022 },
    { z:  2.10, yBot: 0.27, yBelt: 0.56, yDeck: 0.66, wBot: 0.70, wBelt: 0.77, wDeck: 0.69, crown: 0.016 },
    { z:  2.19, yBot: 0.30, yBelt: 0.53, yDeck: 0.62, wBot: 0.64, wBelt: 0.71, wDeck: 0.63, crown: 0.012 },
  ],
  // Greenhouse (cabin + continuous flush glass) from REAR hatch base to FRONT windshield base.
  greenhouse: {
    zRearBase: -1.88,
    yRearBase: 0.88,
    wRearBase: 0.72,
    zRearRoof: -0.62,
    yRearRoof: 1.25,
    wRearRoof: 0.57,
    zFrontRoof: 0.14,
    yFrontRoof: 1.26,
    wFrontRoof: 0.58,
    zFrontBase: 0.90,
    yFrontBase: 0.84,
    wFrontBase: 0.73,
    roofCrown: 0.028,
    bPillarZ: -0.26,
    windshieldColor: 0x1a2636,
    windshieldOpacity: 0.52,
    sideGlassColor: 0x16202c,
    sideGlassOpacity: 0.62,
    rearGlassColor: 0x0b1018,
    rearGlassOpacity: 0.88,
    rearWiper: true,
    mirrors: { z: 0.66, y: 0.88, w: 0.15, h: 0.09, d: 0.12 },
  },
  frontFascia: {
    bumperY: 0.42,
    bumperH: 0.14,
    bumperProtrusion: 0.055,
    rubStripY: 0.455,
    rubStripH: 0.036,
    grille: {
      y: 0.575,
      h: 0.105,
      w: 0.76,
      slats: 3,
      topBarText: true,
    },
    cornerLamps: {
      y: 0.575,
      h: 0.10,
      innerSmokedW: 0.22,
      outerAmberW: 0.14,
      wrapZ: 0.22,
    },
    lowerIntake: {
      y: 0.30,
      h: 0.068,
      w: 1.05,
      dividers: 4,
    },
    chinSpoiler: {
      enabled: true,
      y: 0.225,
      h: 0.075,
      protrusion: 0.02,
      zBack: 1.72,
    },
    popups: {
      enabled: true,
      w: 0.28,
      d: 0.22,
      xOffset: 0.50,
      zPivot: 1.88,
      ySurface: 0.71,
      upAngle: 0.58,
      lampColor: 0xe6f2ff,
      beamColor: 0x0066ff,
      beamIntensity: 0.85,
    },
    fixedLamps: {
      enabled: false,
    },
  },
  rearFascia: {
    bumperY: 0.43,
    bumperH: 0.15,
    bumperProtrusion: 0.05,
    rubStripY: 0.465,
    rubStripH: 0.038,
    tailPanel: {
      y: 0.66,
      h: 0.20,
      centerW: 0.56,
      lampW: 0.44,
      amberOuterW: 0.12,
      reverseW: 0.08,
      wrapZ: 0.18,
    },
    spoiler: {
      style: 'lip', // 'lip' | 'wing' | 'none'
      z: -2.06,
      y: 0.90,
      h: 0.055,
      d: 0.16,
      w: 1.50,
    },
    exhaust: {
      side: 'right', // 'right' (-X) | 'left' (+X) | 'dual'
      count: 2,
      xOffset: 0.42,
      y: 0.23,
      r: 0.030,
    },
    mudFlaps: true,
    fuelDoor: { z: -1.62, y: 0.74, side: 1 }, // +1 = driver left
  },
  trim: {
    sideRubStrip: { enabled: true, y: 0.46, h: 0.042 },
    rockerSkirt: { enabled: true, y: 0.225, h: 0.055 },
    doorHandle: { z: -0.22, y: 0.73 },
    frontSideMarker: { z: 1.86, y: 0.46, w: 0.11, h: 0.028, color: 0xe87e14 },
  },
  wheels: {
    spokeCount: 10,
    spokeStyle: 'blade', // 'blade' | 'twin' | 'mesh' | 'steelie'
    rimColor: 0xd0d6de,
    tireColor: 0x16171b,
    hubRadius: 0.068,
    rimRatio: 0.67,
  },
};

// ---------------------------------------------------------------------------
// Math & spline helpers
// ---------------------------------------------------------------------------
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// Evaluate station properties at any z along the car using smooth Catmull-Rom interpolation
function sampleStations(stations, z) {
  if (z <= stations[0].z) return { ...stations[0], z };
  const last = stations.length - 1;
  if (z >= stations[last].z) return { ...stations[last], z };

  let i = 0;
  while (i < last - 1 && stations[i + 1].z < z) i++;
  const s0 = stations[Math.max(0, i - 1)];
  const s1 = stations[i];
  const s2 = stations[i + 1];
  const s3 = stations[Math.min(last, i + 2)];
  const t = clamp((z - s1.z) / Math.max(1e-5, s2.z - s1.z), 0, 1);

  const keys = ['yBot', 'yBelt', 'yDeck', 'wBot', 'wBelt', 'wDeck', 'crown'];
  const out = { z };
  for (const k of keys) {
    // Blend 70% Catmull-Rom + 30% linear to avoid spline overshoot at sharp fascia transitions
    const cr = catmull(s0[k], s1[k], s2[k], s3[k], t);
    const ln = lerp(s1[k], s2[k], t);
    out[k] = lerp(ln, cr, 0.70);
  }
  return out;
}

// Compute wheel-well arch lift at longitudinal coordinate z
function wheelArchLift(z, dims) {
  const archR = dims.wheelRadius + (dims.archGap ?? 0.048);
  const cy = dims.wheelRadius;
  let liftY = 0;
  for (const wz of [dims.wheelZFront, dims.wheelZRear]) {
    const dz = Math.abs(z - wz);
    if (dz < archR) {
      const h = cy + Math.sqrt(Math.max(0, archR * archR - dz * dz));
      if (h > liftY) liftY = h;
    }
  }
  return liftY;
}

// Glow texture for lamp halos and road light pools
let _glowTex = null;
function getGlowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

// Apply optional longitudinal two-tone split vertex colors (e.g., white front -> maroon rear)
function applySplitPaintVertexColors(geo, paintSpec) {
  if (!paintSpec || !paintSpec.split) return;
  const sp = paintSpec.split;
  const cFront = new THREE.Color(sp.frontColor);
  const cRear = new THREE.Color(sp.rearColor);
  const zC = sp.zCenter ?? 0.0;
  const halfB = Math.max(0.01, (sp.blendWidth ?? 0.45) * 0.5);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const t = clamp((z - (zC - halfB)) / (2 * halfB), 0, 1);
    const s = t * t * (3 - 2 * t); // smoothstep
    c.copy(cRear).lerp(cFront, s);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Build a smooth lofted mesh from an array of cross-section rings (each ring = array of [x,y,z])
function buildLoftGeo(rings, closeFront = true, closeRear = true) {
  const pos = [];
  const idx = [];
  const ringLen = rings[0].length;

  for (let r = 0; r < rings.length; r++) {
    for (let c = 0; c < ringLen; c++) {
      const p = rings[r][c];
      pos.push(p[0], p[1], p[2]);
    }
  }

  for (let r = 0; r < rings.length - 1; r++) {
    for (let c = 0; c < ringLen; c++) {
      const cn = (c + 1) % ringLen;
      const a = r * ringLen + c;
      const b = r * ringLen + cn;
      const d = (r + 1) * ringLen + c;
      const e = (r + 1) * ringLen + cn;
      idx.push(a, d, b, b, d, e);
    }
  }

  if (closeRear) {
    const r0 = rings[0];
    let cx = 0, cy = 0, cz = 0;
    for (const p of r0) { cx += p[0]; cy += p[1]; cz += p[2]; }
    const ci = pos.length / 3;
    pos.push(cx / ringLen, cy / ringLen, cz / ringLen);
    for (let c = 0; c < ringLen; c++) {
      const cn = (c + 1) % ringLen;
      idx.push(ci, c, cn);
    }
  }

  if (closeFront) {
    const rn = rings[rings.length - 1];
    const base = (rings.length - 1) * ringLen;
    let cx = 0, cy = 0, cz = 0;
    for (const p of rn) { cx += p[0]; cy += p[1]; cz += p[2]; }
    const ci = pos.length / 3;
    pos.push(cx / ringLen, cy / ringLen, cz / ringLen);
    for (let c = 0; c < ringLen; c++) {
      const cn = (c + 1) % ringLen;
      idx.push(ci, base + cn, base + c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Build a smooth quad strip between two 3D rails (used for flush glass & trim bands)
function buildStripGeo(railA, railB, flip = false) {
  const pos = [];
  const idx = [];
  const n = railA.length;
  for (let i = 0; i < n; i++) {
    pos.push(railA[i][0], railA[i][1], railA[i][2]);
    pos.push(railB[i][0], railB[i][1], railB[i][2]);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (flip) idx.push(a, c, b, b, c, d);
    else idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Sculpted Body Loft
// ---------------------------------------------------------------------------
function buildBodyMesh(spec, paintMat, darkMat) {
  const { bodyStations, dims } = spec;
  const zMin = bodyStations[0].z;
  const zMax = bodyStations[bodyStations.length - 1].z;

  // Build dense longitudinal z sample array, concentrating extra samples around wheel arches!
  const zSet = new Set();
  const baseSteps = 44;
  for (let i = 0; i <= baseSteps; i++) {
    zSet.add(Number(lerp(zMin, zMax, i / baseSteps).toFixed(4)));
  }
  for (const s of bodyStations) zSet.add(Number(s.z.toFixed(4)));
  const archR = dims.wheelRadius + (dims.archGap ?? 0.048);
  for (const wz of [dims.wheelZFront, dims.wheelZRear]) {
    for (let k = -10; k <= 10; k++) {
      const z = wz + (k / 10) * (archR + 0.03);
      if (z > zMin + 0.02 && z < zMax - 0.02) zSet.add(Number(z.toFixed(4)));
    }
  }
  const bed = spec.cargoBed && spec.cargoBed.enabled ? spec.cargoBed : null;
  if (bed) {
    for (const bz of [bed.zStart - 0.02, bed.zStart + 0.01, bed.zEnd - 0.01, bed.zEnd + 0.02]) {
      if (bz > zMin + 0.01 && bz < zMax - 0.01) zSet.add(Number(bz.toFixed(4)));
    }
  }
  const zList = Array.from(zSet).sort((a, b) => a - b);

  // Build cross-section ring (counter-clockwise looking from +Z toward -Z so normals face outward)
  const rings = zList.map((z) => {
    const st = sampleStations(bodyStations, z);
    const archY = wheelArchLift(z, dims);
    const ySideBot = Math.max(st.yBot, archY);
    const inArch = archY > st.yBot + 0.01;
    // Slight inward bevel at the wheel arch lip so the wheel well looks genuinely recessed
    const wArchBot = inArch ? st.wBot * 0.965 : st.wBot;
    const yMidFlank = lerp(ySideBot, st.yBelt, 0.55);
    const wMidFlank = lerp(wArchBot, st.wBelt, 0.72);
    const yShoulder = lerp(st.yBelt, st.yDeck, 0.72);
    const wShoulder = lerp(st.wBelt, st.wDeck, 0.52);

    // Optional recessed open pickup truck cargo bed!
    const inBed = bed && z >= bed.zStart && z <= bed.zEnd;
    const wallT = bed ? (bed.wallThick ?? 0.11) : 0.11;
    const innerW = Math.max(0.2, st.wDeck - wallT);
    const yTopInner = inBed ? (bed.floorY ?? (st.yDeck - 0.36)) : (st.yDeck + st.crown * 0.80);
    const yTopCenter = inBed ? (bed.floorY ?? (st.yDeck - 0.36)) : (st.yDeck + st.crown);
    const xTopInner = inBed ? innerW : st.wDeck * 0.45;

    // 16 points around the cross-section (bottom-center -> right side -> top-center -> left side)
    return [
      [0, st.yBot, z],
      [-wArchBot * 0.68, st.yBot, z],
      [-wArchBot, ySideBot, z],
      [-wMidFlank, yMidFlank, z],
      [-st.wBelt, st.yBelt, z],
      [-wShoulder, yShoulder, z],
      [-st.wDeck, st.yDeck, z],
      [-xTopInner, yTopInner, z],
      [0, yTopCenter, z],
      [xTopInner, yTopInner, z],
      [st.wDeck, st.yDeck, z],
      [wShoulder, yShoulder, z],
      [st.wBelt, st.yBelt, z],
      [wMidFlank, yMidFlank, z],
      [wArchBot, ySideBot, z],
      [wArchBot * 0.68, st.yBot, z],
    ];
  });

  const bodyGroup = new THREE.Group();
  const bodyGeo = buildLoftGeo(rings, true, true);
  applySplitPaintVertexColors(bodyGeo, spec.paint);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  // Dark textured bedliner floor inside open pickup truck bed
  if (bed) {
    const bedLen = Math.max(0.2, bed.zEnd - bed.zStart);
    const stMid = sampleStations(bodyStations, (bed.zStart + bed.zEnd) * 0.5);
    const linerW = Math.max(0.4, (stMid.wDeck - (bed.wallThick ?? 0.11)) * 1.96);
    const liner = new THREE.Mesh(new THREE.BoxGeometry(linerW, 0.018, bedLen - 0.04), darkMat);
    liner.position.set(0, (bed.floorY ?? (stMid.yDeck - 0.36)) + 0.012, (bed.zStart + bed.zEnd) * 0.5);
    bodyGroup.add(liner);
  }

  // Dark inner wheel-well housings behind the 4 wheels so you never see daylight through arches
  const wellR = dims.wheelRadius + (dims.archGap ?? 0.048) * 0.62;
  const wellGeo = new THREE.CylinderGeometry(wellR, wellR, 0.32, 18, 1, false, 0, Math.PI);
  wellGeo.rotateZ(Math.PI / 2);
  wellGeo.rotateX(Math.PI / 2);
  for (const [wz, th] of [
    [dims.wheelZFront, dims.trackHalfFront],
    [dims.wheelZRear, dims.trackHalfRear],
  ]) {
    for (const s of [-1, 1]) {
      const liner = new THREE.Mesh(wellGeo, darkMat);
      liner.position.set(s * (th - 0.14), dims.wheelRadius, wz);
      bodyGroup.add(liner);
    }
  }

  return bodyGroup;
}

// ---------------------------------------------------------------------------
// Continuous Wrap-Around Flush Greenhouse (Roof + Pillars + Flush Glass + Interior)
// ---------------------------------------------------------------------------
function buildGreenhouse(spec, mats) {
  const gh = spec.greenhouse;
  const group = new THREE.Group();

  // Helper to evaluate greenhouse outline at parameter t along each zone:
  // Rear hatch: zRearBase -> zRearRoof
  // Roof:       zRearRoof -> zFrontRoof
  // Windshield: zFrontRoof -> zFrontBase
  function roofPt(u, side, inset = 0) {
    // u: 0 = rear roof, 1 = front roof
    const z = lerp(gh.zRearRoof, gh.zFrontRoof, u);
    const y = lerp(gh.yRearRoof, gh.yFrontRoof, u);
    const w = lerp(gh.wRearRoof, gh.wFrontRoof, u) - inset;
    return [side * w, y, z];
  }

  // Unified greenhouse upper-profile evaluator (handles BOTH angular 80s roofs AND rounded 90s aero domes,
  // and guarantees bPillarZ / cPillarZ ALWAYS land 100% flush on the exact roof or sloped glass surface!)
  const isRounded = Boolean(gh.rounded);
  const archBoost = isRounded ? (gh.roofArch ?? 0.055) : 0;

  function evalUpper(z) {
    if (z <= gh.zRearRoof) {
      // Rear glass / fastback ramp from zRearBase -> zRearRoof
      const u = clamp((z - gh.zRearBase) / Math.max(1e-4, gh.zRearRoof - gh.zRearBase), 0, 1);
      // When rounded: convex Bezier-like arch that curves smoothly into the roof instead of a sharp kink!
      const uCurve = isRounded ? Math.pow(u, 0.72) : u;
      const dome = isRounded ? Math.sin(u * Math.PI) * archBoost * 0.68 : 0;
      return {
        y: lerp(gh.yRearBase, gh.yRearRoof, uCurve) + dome,
        w: lerp(gh.wRearBase, gh.wRearRoof, uCurve),
      };
    } else if (z <= gh.zFrontRoof) {
      // Roof span from zRearRoof -> zFrontRoof
      const u = clamp((z - gh.zRearRoof) / Math.max(1e-4, gh.zFrontRoof - gh.zRearRoof), 0, 1);
      const dome = isRounded ? Math.sin(u * Math.PI) * archBoost : 0;
      return {
        y: lerp(gh.yRearRoof, gh.yFrontRoof, u) + dome,
        w: lerp(gh.wRearRoof, gh.wFrontRoof, u),
      };
    } else {
      // Windshield ramp from zFrontRoof -> zFrontBase
      const u = clamp((z - gh.zFrontRoof) / Math.max(1e-4, gh.zFrontBase - gh.zFrontRoof), 0, 1);
      const dome = isRounded ? Math.sin(u * Math.PI) * archBoost * 0.45 : 0;
      return {
        y: lerp(gh.yFrontRoof, gh.yFrontBase, u) + dome,
        w: lerp(gh.wFrontRoof, gh.wFrontBase, u),
      };
    }
  }

  function evalBase(z) {
    const u = clamp((z - gh.zRearBase) / Math.max(1e-4, gh.zFrontBase - gh.zRearBase), 0, 1);
    return {
      y: lerp(gh.yRearBase, gh.yFrontBase, u),
      w: lerp(gh.wRearBase, gh.wFrontBase, u),
    };
  }

  // 1. Sculpted body-colored roof panel (smoothly crowned across width + optional rounded longitudinal dome)
  const roofSteps = isRounded ? 14 : 8;
  const roofRings = [];
  for (let i = 0; i <= roofSteps; i++) {
    const u = i / roofSteps;
    const z = lerp(gh.zRearRoof, gh.zFrontRoof, u);
    const up = evalUpper(z);
    const c = gh.roofCrown * Math.sin(lerp(0.15, Math.PI - 0.15, u));
    const thick = 0.022;
    roofRings.push([
      [-up.w, up.y - thick, z],
      [-up.w, up.y, z],
      [-up.w * 0.55, up.y + c * 0.78, z],
      [0, up.y + c, z],
      [up.w * 0.55, up.y + c * 0.78, z],
      [up.w, up.y, z],
      [up.w, up.y - thick, z],
    ]);
  }
  const roofGeo = buildLoftGeo(roofRings, true, true);
  applySplitPaintVertexColors(roofGeo, spec.paint);
  const roofMesh = new THREE.Mesh(roofGeo, gh.vinylRoof ? mats.vinyl : mats.paint);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  // Optional Roof Luggage Rack Rails (iconic Chevy Astro van / wagon / SUV detail!)
  if (gh.roofRack) {
    const rLen = (gh.zFrontRoof - gh.zRearRoof) * 0.80;
    const rZ = (gh.zFrontRoof + gh.zRearRoof) * 0.5 - 0.08;
    const rW = (gh.wFrontRoof + gh.wRearRoof) * 0.44;
    const rY = (gh.yFrontRoof + gh.yRearRoof) * 0.5 + gh.roofCrown + 0.032;
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.024, rLen), mats.trimBlack);
      rail.position.set(s * rW, rY, rZ);
      group.add(rail);
      for (const kz of [-0.42, 0.42]) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.038, 0.06), mats.trimBlack);
        foot.position.set(s * rW, rY - 0.018, rZ + kz * rLen);
        group.add(foot);
      }
    }
    for (const kz of [-0.26, 0.26]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(rW * 2.0, 0.018, 0.032), mats.trimBlack);
      bar.position.set(0, rY - 0.002, rZ + kz * rLen);
      group.add(bar);
    }
  }

  // Optional T-Top smoked glass roof panels (e.g. 3rd-gen Camaro T-tops!)
  if (gh.tTops) {
    const zMid = (gh.zRearRoof + gh.zFrontRoof) * 0.5;
    const len = (gh.zFrontRoof - gh.zRearRoof) * 0.82;
    const wAvg = (gh.wRearRoof + gh.wFrontRoof) * 0.5;
    const yTop = (gh.yRearRoof + gh.yFrontRoof) * 0.5 + gh.roofCrown * 0.85;
    for (const s of [-1, 1]) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(wAvg * 0.82, 0.016, len),
        mats.rearGlass
      );
      panel.position.set(s * (wAvg * 0.46), yTop, zMid);
      group.add(panel);
    }
    const tBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.020, len + 0.04), mats.trimBlack);
    tBar.position.set(0, yTop + 0.002, zMid);
    group.add(tBar);
  }

  // 2. Continuous Flush Windshield (curves smoothly in X + optional multi-row dome curve)
  const wsCols = 10;
  const wsRows = isRounded ? 4 : 1;
  for (let r = 0; r < wsRows; r++) {
    const v0 = r / wsRows, v1 = (r + 1) / wsRows;
    const z0 = lerp(gh.zFrontBase, gh.zFrontRoof, v0);
    const z1 = lerp(gh.zFrontBase, gh.zFrontRoof, v1);
    const u0 = evalUpper(z0), u1 = evalUpper(z1);
    const rowA = [], rowB = [];
    for (let i = 0; i <= wsCols; i++) {
      const sx = lerp(-1, 1, i / wsCols);
      const cz0 = (1 - sx * sx) * lerp(0.065, 0.032, v0);
      const cz1 = (1 - sx * sx) * lerp(0.065, 0.032, v1);
      const cy = (1 - sx * sx) * gh.roofCrown * 0.72;
      rowA.push([sx * (u0.w - 0.014), u0.y + cy * v0 - 0.01, z0 + cz0]);
      rowB.push([sx * (u1.w - 0.014), u1.y + cy * v1 - 0.01, z1 + cz1]);
    }
    group.add(new THREE.Mesh(buildStripGeo(rowA, rowB, false), mats.windshield));
  }

  // 3. Continuous Flush Rear Hatch / Back Glass (multi-row curved dome when rounded = true!)
  const rwCols = 10;
  const rwRows = isRounded ? 6 : 1;
  for (let r = 0; r < rwRows; r++) {
    const v0 = r / rwRows, v1 = (r + 1) / rwRows;
    const z0 = lerp(gh.zRearRoof, gh.zRearBase, v0);
    const z1 = lerp(gh.zRearRoof, gh.zRearBase, v1);
    const u0 = evalUpper(z0), u1 = evalUpper(z1);
    const rowA = [], rowB = [];
    for (let i = 0; i <= rwCols; i++) {
      const sx = lerp(-1, 1, i / rwCols);
      const cz0 = -(1 - sx * sx) * lerp(0.035, 0.075, v0);
      const cz1 = -(1 - sx * sx) * lerp(0.035, 0.075, v1);
      const cy = (1 - sx * sx) * gh.roofCrown * 0.70;
      rowA.push([sx * (u0.w - 0.014), u0.y + cy * (1 - v0 * 0.7) - 0.008, z0 + cz0]);
      rowB.push([sx * (u1.w - 0.014), u1.y + cy * (1 - v1 * 0.7) - 0.008, z1 + cz1]);
    }
    group.add(new THREE.Mesh(buildStripGeo(rowA, rowB, false), mats.rearGlass));
  }

  // 4. Flush Side Door Glass + Rear Quarter Glass (following exact curved upper arch & tumblehome!)
  for (const side of [-1, 1]) {
    const bZ = gh.bPillarZ;
    const upB = evalUpper(bZ);
    const baseB = evalBase(bZ);

    // Sample smooth multi-point upper & lower rails for door window (bPillarZ -> zFrontBase)
    const doorSteps = isRounded ? 8 : 3;
    const doorTop = [], doorBot = [];
    for (let i = 0; i <= doorSteps; i++) {
      const z = lerp(bZ, gh.zFrontBase, i / doorSteps);
      const up = evalUpper(z);
      const bs = evalBase(z);
      doorTop.push([side * (up.w - 0.012), up.y - 0.012, z]);
      doorBot.push([side * (bs.w - 0.012), bs.y - 0.01, z]);
    }
    group.add(new THREE.Mesh(buildStripGeo(doorTop, doorBot, side < 0), mats.sideGlass));

    // Rear quarter glass OR sculpted body-colored B-pillar sail (e.g., 3rd-gen Camaro!)
    if (gh.sailPillar && gh.sailPillar.enabled) {
      const sailRearZ = gh.sailPillar.zRear ?? lerp(bZ, gh.zRearBase, 0.42);
      const baseS = evalBase(sailRearZ);
      const sailTop = [
        [side * (gh.wRearRoof + 0.002), gh.yRearRoof - 0.008, gh.zRearRoof],
        [side * (upB.w + 0.002), upB.y - 0.008, bZ],
      ];
      const sailBot = [
        [side * (baseS.w + 0.002), baseS.y - 0.01, sailRearZ],
        [side * (baseB.w + 0.002), baseB.y - 0.01, bZ],
      ];
      const sailGeo = buildStripGeo(sailTop, sailBot, side < 0);
      applySplitPaintVertexColors(sailGeo, spec.paint);
      const sailMesh = new THREE.Mesh(sailGeo, mats.paint);
      sailMesh.castShadow = true;
      group.add(sailMesh);

      const hatchSideTop = [
        [side * (gh.wRearBase - 0.010), gh.yRearBase + 0.005, gh.zRearBase],
        [side * (gh.wRearRoof - 0.010), gh.yRearRoof - 0.014, gh.zRearRoof],
      ];
      const hatchSideBot = [
        [side * (gh.wRearBase - 0.010), gh.yRearBase - 0.01, gh.zRearBase],
        [side * (baseS.w - 0.010), baseS.y - 0.01, sailRearZ],
      ];
      group.add(new THREE.Mesh(buildStripGeo(hatchSideTop, hatchSideBot, side < 0), mats.rearGlass));
    } else {
      // Sample smooth multi-point upper & lower rails for quarter window (zRearBase -> bPillarZ)
      const qtrSteps = isRounded ? 8 : 3;
      const qtrTop = [], qtrBot = [];
      for (let i = 0; i <= qtrSteps; i++) {
        const z = lerp(gh.zRearBase, bZ, i / qtrSteps);
        const up = evalUpper(z);
        const bs = evalBase(z);
        qtrTop.push([side * (up.w - 0.012), up.y - 0.012, z]);
        qtrBot.push([side * (bs.w - 0.012), bs.y - 0.01, z]);
      }
      const qtrGeo = buildStripGeo(qtrTop, qtrBot, side < 0);
      if (gh.cargoSide) {
        applySplitPaintVertexColors(qtrGeo, spec.paint);
        const cargoMesh = new THREE.Mesh(qtrGeo, mats.paint);
        cargoMesh.castShadow = true;
        group.add(cargoMesh);
      } else {
        group.add(new THREE.Mesh(qtrGeo, mats.rearGlass));
      }
    }

    // Optional C-pillar — FIXED: uses evalUpper(cZ) so it ALWAYS stays 100% flush on the glass/roof surface!
    if (typeof gh.cPillarZ === 'number') {
      const cZ = clamp(gh.cPillarZ, gh.zRearBase + 0.04, gh.zFrontRoof - 0.04);
      const upC = evalUpper(cZ);
      const baseC = evalBase(cZ);
      const p1 = new THREE.Vector3(side * (baseC.w - 0.004), baseC.y, cZ);
      const p2 = new THREE.Vector3(side * (upC.w - 0.004), upC.y - 0.006, cZ);
      const dc = new THREE.Vector3().subVectors(p2, p1);
      const cm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, dc.length(), 8),
        gh.cPillarPaint ? mats.paintRear : mats.trimBlack
      );
      cm.position.copy(p1).addScaledVector(dc, 0.5);
      cm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dc.normalize());
      group.add(cm);
    }

    // Sculpted pillars hugging the exact greenhouse edges (no floating boxes!)
    function addPillar(p1, p2, r, mat) {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const d = new THREE.Vector3().subVectors(v2, v1);
      const g = new THREE.CylinderGeometry(r, r, d.length(), 8);
      const m = new THREE.Mesh(g, mat);
      m.position.copy(v1).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      m.castShadow = true;
      group.add(m);
    }

    // Body-colored A-pillar outer frame (segmented smoothly along evalUpper when rounded)
    if (isRounded) {
      const aSteps = 4;
      for (let i = 0; i < aSteps; i++) {
        const za = lerp(gh.zFrontBase, gh.zFrontRoof, i / aSteps);
        const zb = lerp(gh.zFrontBase, gh.zFrontRoof, (i + 1) / aSteps);
        const ua = evalUpper(za), ub = evalUpper(zb);
        addPillar([side * ua.w, ua.y - 0.004, za], [side * ub.w, ub.y - 0.004, zb], 0.022, mats.paintFront);
      }
      // Curved body-colored roof-to-hatch side arch (iconic 90s rounded Cavalier/Camry roofline!)
      const rSteps = 10;
      for (let i = 0; i < rSteps; i++) {
        const za = lerp(gh.zRearBase, gh.zFrontRoof, i / rSteps);
        const zb = lerp(gh.zRearBase, gh.zFrontRoof, (i + 1) / rSteps);
        const ua = evalUpper(za), ub = evalUpper(zb);
        addPillar([side * ua.w, ua.y - 0.005, za], [side * ub.w, ub.y - 0.005, zb], 0.020, mats.paintRear);
      }
    } else {
      addPillar([side * gh.wFrontBase, gh.yFrontBase, gh.zFrontBase], [side * gh.wFrontRoof, gh.yFrontRoof - 0.005, gh.zFrontRoof], 0.022, mats.paintFront);
      if (!gh.sailPillar || !gh.sailPillar.enabled) {
        addPillar([side * gh.wRearBase, gh.yRearBase, gh.zRearBase], [side * gh.wRearRoof, gh.yRearRoof - 0.008, gh.zRearRoof], 0.020, mats.trimBlack);
      }
      addPillar([side * gh.wRearRoof, gh.yRearRoof - 0.008, gh.zRearRoof], [side * gh.wFrontRoof, gh.yFrontRoof - 0.008, gh.zFrontRoof], 0.014, mats.trimBlack);
    }
    // Matte-black B-pillar seated cleanly on evalBase -> evalUpper
    addPillar([side * (baseB.w - 0.006), baseB.y, bZ], [side * (upB.w - 0.006), upB.y - 0.008, bZ], 0.024, mats.trimBlack);
    // Window sill black rubber trim along beltline
    addPillar([side * gh.wRearBase, gh.yRearBase - 0.002, gh.zRearBase], [side * gh.wFrontBase, gh.yFrontBase - 0.002, gh.zFrontBase], 0.014, mats.trimBlack);

    // Side Mirror mounted at front corner of door glass
    if (gh.mirrors) {
      const mr = gh.mirrors;
      const uM = clamp((mr.z - gh.zRearBase) / Math.max(1e-4, gh.zFrontBase - gh.zRearBase), 0, 1);
      const wM = lerp(gh.wRearBase, gh.wFrontBase, uM);
      const mGroup = new THREE.Group();
      mGroup.position.set(side * (wM + 0.04), mr.y, mr.z);
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.026, 0.055), mats.trimBlack);
      stalk.position.set(-side * 0.03, -0.01, 0);
      mGroup.add(stalk);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(mr.w, mr.h, mr.d), mats.trimBlack);
      housing.position.set(side * 0.04, 0.01, -0.01);
      housing.rotation.y = side * -0.18;
      mGroup.add(housing);
      group.add(mGroup);
    }
  }

  // 5. Rear Hatch Wiper (iconic T160 liftback detail!)
  if (gh.rearWiper) {
    const wiperPivot = new THREE.Group();
    wiperPivot.position.set(-0.22, gh.yRearBase + 0.045, gh.zRearBase + 0.14);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.016, 0.016), mats.trimBlack);
    arm.position.set(0.22, 0.01, 0.02);
    arm.rotation.z = 0.06;
    wiperPivot.add(arm);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.020), mats.trimBlack);
    blade.position.set(0.28, 0.018, 0.024);
    wiperPivot.add(blade);
    group.add(wiperPivot);
  }

  // 6. Simple Cabin Interior (dashboard, steering wheel, 2 bucket seats visible through glass)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(gh.wFrontBase * 1.72, 0.18, 0.34), mats.interior);
  dash.position.set(0, gh.yFrontBase - 0.04, gh.zFrontBase - 0.22);
  group.add(dash);

  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 18), mats.trimBlack);
  steer.position.set(0.34, gh.yFrontBase + 0.04, gh.zFrontBase - 0.42);
  steer.rotation.x = 0.32;
  group.add(steer);

  for (const sx of [-0.32, 0.32]) {
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.12), mats.seat);
    seatBack.position.set(sx, gh.yFrontBase + 0.05, gh.bPillarZ + 0.04);
    seatBack.rotation.x = -0.22;
    group.add(seatBack);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.09), mats.seat);
    headrest.position.set(sx, gh.yFrontBase + 0.33, gh.bPillarZ - 0.02);
    group.add(headrest);
  }

  return group;
}

// Helper: build a smooth wrap-around rounded bumper / rub-strip / chin-dam beam in XZ
function buildWrapBeamGeo(halfW, h, depth, wrapZ, cornerR = 0.12, segs = 6) {
  // 2D plan-view U-shape (in X, Z) extruded vertically in Y
  const shape = new THREE.Shape();
  const w = Math.max(0.1, halfW);
  const r = Math.min(cornerR, w * 0.4, depth * 0.8);
  // Outer curve from right rear (-w, -wrapZ) -> front-right -> front-left -> left rear (+w, -wrapZ)
  shape.moveTo(-w, -wrapZ);
  shape.lineTo(-w, depth - r);
  shape.quadraticCurveTo(-w, depth, -w + r, depth);
  shape.lineTo(w - r, depth);
  shape.quadraticCurveTo(w, depth, w, depth - r);
  shape.lineTo(w, -wrapZ);
  // Inner return
  const thick = Math.min(0.11, depth * 0.75);
  shape.lineTo(w - thick, -wrapZ);
  shape.lineTo(w - thick, depth - thick);
  shape.lineTo(-w + thick, depth - thick);
  shape.lineTo(-w + thick, -wrapZ);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: Math.min(0.014, h * 0.22),
    bevelSize: Math.min(0.012, h * 0.18),
    bevelSegments: 2,
    curveSegments: segs,
  });
  // Shape (X, Y=Z) extruded along +Z (which becomes Y height)
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -h / 2, 0);
  // Flip Z so +depth is forward (+Z)
  geo.scale(1, 1, -1);
  // Recompute normals after negative scale
  const idx = geo.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const tmp = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, tmp);
    }
  } else {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      const x1 = pos.getX(i + 1), y1 = pos.getY(i + 1), z1 = pos.getZ(i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, x1, y1, z1);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Helper: beveled rounded-oval lens (for 90s oval taillights & bumper turn signals)
function buildOvalLensGeo(w, h, depth = 0.04) {
  const shape = new THREE.Shape();
  const rx = w * 0.5, ry = h * 0.5;
  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: Math.min(0.012, depth * 0.4),
    bevelSize: Math.min(0.010, ry * 0.2),
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

// Helper: tapered teardrop/almond lens (for 90s aero headlights like '96 Cavalier!)
// Tapered toward +X (outer edge) when side = +1, mirrored when side = -1.
function buildTeardropLensGeo(w, h, depth = 0.045, side = 1) {
  const shape = new THREE.Shape();
  const hw = w * 0.5, hh = h * 0.5;
  if (side > 0) {
    shape.moveTo(-hw, -hh * 0.65);
    shape.quadraticCurveTo(-hw * 0.9, hh * 0.95, 0, hh);
    shape.quadraticCurveTo(hw * 0.72, hh * 0.85, hw, -hh * 0.15);
    shape.quadraticCurveTo(hw * 0.65, -hh * 0.85, -hw, -hh * 0.65);
  } else {
    shape.moveTo(hw, -hh * 0.65);
    shape.quadraticCurveTo(hw * 0.9, hh * 0.95, 0, hh);
    shape.quadraticCurveTo(-hw * 0.72, hh * 0.85, -hw, -hh * 0.15);
    shape.quadraticCurveTo(-hw * 0.65, -hh * 0.85, hw, -hh * 0.65);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.translate(0, 0, -depth * 0.5);
  return geo;
}

// ---------------------------------------------------------------------------
// Stacked Front Fascia (Bumper, Rub Strip, Slatted Grille, Corner Lamps, Chin Dam, Pop-ups)
// ---------------------------------------------------------------------------
function buildFrontFascia(spec, mats) {
  const ff = spec.frontFascia;
  const stFront = spec.bodyStations[spec.bodyStations.length - 1];
  const stPrev = spec.bodyStations[spec.bodyStations.length - 2] || stFront;
  const zFront = stFront.z;
  const wFront = stFront.wBelt;
  const group = new THREE.Group();

  // 1. Smooth Wrap-Around Front Bumper Bar (painted | chrome | unpainted gray plastic)
  const bumpW = Math.min(stPrev.wBelt + 0.025, wFront + 0.095);
  const frontBumperMat = ff.bumpers === 'unpainted'
    ? mats.unpaintedBumper
    : (ff.chromeBumper || ff.bumpers === 'chrome' ? mats.chrome : mats.paintFront);
  const frontCornerR = ff.bumperCornerR ?? 0.14;
  const frontWrapZ = ff.bumpers === 'unpainted' ? 0.42 : 0.28;
  const bumper = new THREE.Mesh(
    buildWrapBeamGeo(bumpW, ff.bumperH, ff.bumperProtrusion + 0.06, frontWrapZ, frontCornerR),
    frontBumperMat
  );
  bumper.position.set(0, ff.bumperY, zFront - 0.04);
  bumper.castShadow = true;
  group.add(bumper);

  // Continuous matte-black wrap-around bumper rub strip (optional)
  if (ff.rubStripH > 0) {
    const rubFront = new THREE.Mesh(
      buildWrapBeamGeo(bumpW + 0.008, ff.rubStripH, ff.bumperProtrusion + 0.068, 0.29, frontCornerR),
      mats.trimBlack
    );
    rubFront.position.set(0, ff.rubStripY, zFront - 0.04);
    group.add(rubFront);
  }

  // 2A. FIXED RECESSED HEADLIGHT POCKETS (e.g., 3rd-gen Camaro quad lamps + fogs + yellow beams)
  if (ff.fixedLamps && ff.fixedLamps.enabled) {
    const fl = ff.fixedLamps;
    const pocketY = fl.y ?? 0.61;
    const pocketH = fl.h ?? 0.135;
    const pocketW = fl.pocketW ?? 0.48;
    const xOff = fl.xOffset ?? 0.49;

    const headMat = new THREE.MeshStandardMaterial({
      color: fl.lampColor ?? 0xfff5d6,
      emissive: fl.beamColor ?? 0xffd94a,
      emissiveIntensity: fl.emissiveIntensity ?? 1.9,
      roughness: 0.14,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: fl.beamColor ?? 0xffd94a,
      map: getGlowTex(),
      transparent: true,
      opacity: fl.beamOpacity ?? 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Painted center nose bridge between the two deep recessed pockets
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.24, (xOff - pocketW * 0.5) * 2.08), pocketH + 0.02, 0.12),
      mats.paintFront
    );
    bridge.position.set(0, pocketY, zFront + 0.01);
    group.add(bridge);

    for (const s of [-1, 1]) {
      // Deep matte-black recessed headlight pocket (visible black surround framing quad lamps!)
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(pocketW, pocketH, 0.10),
        mats.dark
      );
      pocket.position.set(s * xOff, pocketY, zFront - 0.005);
      group.add(pocket);

      // Quad rectangular lamps (2 per side seated inside the upper pocket)
      const lampW = pocketW * 0.40;
      for (const k of [-0.23, 0.23]) {
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(lampW, pocketH * 0.56, 0.022),
          headMat
        );
        lamp.position.set(s * xOff + k * pocketW, pocketY + pocketH * 0.14, zFront + 0.036);
        group.add(lamp);
      }

      // Lower recessed fog lamps + outboard turn signal lenses (proud of front valance!)
      if (fl.fogLamps) {
        const fog = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.062, 0.03), headMat);
        fog.position.set(s * 0.27, ff.lowerIntake.y, zFront + 0.056);
        group.add(fog);
        const turn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.062, 0.03), mats.smokedLens);
        turn.position.set(s * 0.61, ff.lowerIntake.y, zFront + 0.052);
        group.add(turn);
      }

      // Volumetric road light pool ahead of the car (e.g., Brad's yellow beams!)
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 4.6), beamMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(s * xOff * 1.05, 0.018, zFront + 2.45);
      group.add(pool);
    }
  } else if (ff.lampStyle === 'teardrop') {
    // 2C. 90s AERO TEARDROP WRAPAROUND HEADLIGHTS + IN-BUMPER OVAL SLATTED GRILLE (e.g., '96 Cavalier!)
    const cl = ff.cornerLamps;
    const gr = ff.grille;
    const clearW = cl.innerSmokedW ?? 0.34;
    const ambW = cl.outerAmberW ?? 0.14;
    const lampH = cl.h ?? 0.115;

    for (const s of [-1, 1]) {
      // Swept clear teardrop main headlight resting cleanly atop the curved aero bumper
      const mainX = s * (wFront * 0.56);
      const mainGeo = buildTeardropLensGeo(clearW, lampH, 0.055, s);
      const mainLens = new THREE.Mesh(mainGeo, mats.clearHeadLens);
      mainLens.position.set(mainX, cl.y, zFront + 0.022);
      mainLens.rotation.y = s * -0.26;
      mainLens.rotation.x = -0.24;
      group.add(mainLens);

      // Swept amber outer corner tip wrapping around the front fender corner
      const tipGeo = buildTeardropLensGeo(ambW, lampH * 0.72, 0.048, s);
      const tipLens = new THREE.Mesh(tipGeo, mats.amberLens);
      tipLens.position.set(s * (wFront * 0.94), cl.y - 0.008, zFront - 0.065);
      tipLens.rotation.y = s * -0.68;
      tipLens.rotation.x = -0.14;
      group.add(tipLens);

      // Oval amber bumper turn signal tucked cleanly on the front face of the gray bumper
      if (gr.inBumper) {
        const sigGeo = buildOvalLensGeo(0.14, 0.058, 0.032);
        const sig = new THREE.Mesh(sigGeo, mats.amberLens);
        sig.position.set(s * (bumpW * 0.72), ff.bumperY - 0.015, zFront + ff.bumperProtrusion + 0.016);
        sig.rotation.y = s * -0.32;
        group.add(sig);
      }
    }

    // Oval slatted grille opening recessed cleanly INSIDE the front bumper!
    if (gr.inBumper) {
      const zB = zFront + ff.bumperProtrusion + 0.015;
      const ovalBack = new THREE.Mesh(buildOvalLensGeo(gr.w, gr.h, 0.028), mats.dark);
      ovalBack.position.set(0, gr.y, zB);
      group.add(ovalBack);
      for (let i = 0; i < (gr.slats || 4); i++) {
        const u = (i + 0.5) / (gr.slats || 4) - 0.5;
        const slatW = gr.w * Math.sqrt(Math.max(0.15, 1 - (u * 2) * (u * 2)));
        const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW * 0.92, 0.010, 0.026), frontBumperMat);
        slat.position.set(0, gr.y + u * gr.h * 0.85, zB + 0.014);
        group.add(slat);
      }
    }
  } else {
    // 2B. Recessed Black Slatted Center Grille Panel + Flanking Smoked/Amber Corner Lamps
    const gr = ff.grille;
    const grilleBack = new THREE.Mesh(
      new THREE.BoxGeometry(gr.w, gr.h, 0.04),
      mats.dark
    );
    grilleBack.position.set(0, gr.y, zFront + 0.002);
    group.add(grilleBack);

    for (let i = 0; i < (gr.slats || 3); i++) {
      const sy = gr.y - gr.h * 0.34 + (i / Math.max(1, (gr.slats || 3) - 1)) * (gr.h * 0.62);
      const slat = new THREE.Mesh(new THREE.BoxGeometry(gr.w - 0.02, 0.012, 0.025), gr.chromeFrame ? mats.chrome : mats.trimGrey);
      slat.position.set(0, sy, zFront + 0.014);
      group.add(slat);
    }
    if (gr.style === 'eggcrate') {
      // Vertical bars for classic Cadillac Brougham / Astro van / pickup truck grilles
      const vCols = gr.vBars || 9;
      for (let i = 0; i < vCols; i++) {
        const sx = lerp(-gr.w * 0.44, gr.w * 0.44, i / Math.max(1, vCols - 1));
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.012, gr.h - 0.016, 0.026), gr.chromeFrame ? mats.chrome : mats.trimGrey);
        vBar.position.set(sx, gr.y, zFront + 0.015);
        group.add(vBar);
      }
    }
    if (gr.chromeFrame) {
      const topF = new THREE.Mesh(new THREE.BoxGeometry(gr.w + 0.024, 0.018, 0.032), mats.chrome);
      topF.position.set(0, gr.y + gr.h * 0.5, zFront + 0.012);
      group.add(topF);
      const botF = new THREE.Mesh(new THREE.BoxGeometry(gr.w + 0.024, 0.018, 0.032), mats.chrome);
      botF.position.set(0, gr.y - gr.h * 0.5, zFront + 0.012);
      group.add(botF);
      for (const s of [-1, 1]) {
        const sideF = new THREE.Mesh(new THREE.BoxGeometry(0.018, gr.h + 0.016, 0.032), mats.chrome);
        sideF.position.set(s * (gr.w * 0.5 + 0.006), gr.y, zFront + 0.012);
        group.add(sideF);
      }
    }
    if (gr.topBarText) {
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(gr.w, 0.026, 0.024), mats.smokedLens);
      topBar.position.set(0, gr.y + gr.h * 0.35, zFront + 0.014);
      group.add(topBar);
    }

    const cl = ff.cornerLamps;
    for (const s of [-1, 1]) {
      const xInner = s * (gr.w / 2 + cl.innerSmokedW / 2 + 0.006);
      const innerLens = new THREE.Mesh(
        new THREE.BoxGeometry(cl.innerSmokedW, cl.h, 0.036),
        mats.smokedLens
      );
      innerLens.position.set(xInner, cl.y, zFront + 0.006);
      group.add(innerLens);

      const xOuter = s * (gr.w / 2 + cl.innerSmokedW + cl.outerAmberW / 2 + 0.004);
      const amberFront = new THREE.Mesh(
        new THREE.BoxGeometry(cl.outerAmberW, cl.h, 0.042),
        mats.amberLens
      );
      amberFront.position.set(xOuter, cl.y, zFront - 0.006);
      amberFront.rotation.y = s * -0.26;
      group.add(amberFront);

      const amberSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, cl.h * 0.94, cl.wrapZ),
        mats.amberLens
      );
      amberSide.position.set(s * (wFront + 0.015), cl.y, zFront - cl.wrapZ * 0.54);
      amberSide.rotation.y = s * -0.16;
      group.add(amberSide);
    }
  }

  // 4. Lower Recessed Intake Slot with vertical dividers (skipped if grille.inBumper already drew it!)
  const li = ff.lowerIntake;
  if (!(ff.grille && ff.grille.inBumper)) {
    const intakeZ = ff.fixedLamps && ff.fixedLamps.enabled ? zFront + 0.036 : zFront + 0.004;
    const intakeBack = new THREE.Mesh(new THREE.BoxGeometry(li.w, li.h, 0.05), mats.dark);
    intakeBack.position.set(0, li.y, intakeZ);
    group.add(intakeBack);
    for (let i = 1; i <= (li.dividers || 3); i++) {
      const x = lerp(-li.w * 0.45, li.w * 0.45, i / ((li.dividers || 3) + 1));
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.022, li.h, 0.055), mats.paintFront);
      div.position.set(x, li.y, intakeZ + 0.004);
      group.add(div);
    }
  }

  // 5. Smooth Wrap-Around Lower Chin Air Dam / Lip Spoiler
  // AUTO-ANCHORED to body underside so it can NEVER detach or float with an air gap in side view!
  if (ff.chinSpoiler && ff.chinSpoiler.enabled) {
    const cs = ff.chinSpoiler;
    const chinMat = cs.painted ? mats.paintFront : mats.trimBlack;
    const stUnder = sampleStations(spec.bodyStations, zFront - 0.14);
    const chinBot = cs.y - cs.h * 0.5;
    // Always extend chin top at least 0.025m into the lower body valance so there is ZERO side-view gap!
    const chinTop = Math.max(cs.y + cs.h * 0.5, stUnder.yBot + 0.025);
    const anchoredH = Math.max(cs.h, chinTop - chinBot);
    const anchoredY = (chinTop + chinBot) * 0.5;
    // Extend wrap back cleanly toward front wheel arch so it meets the fender skirt seamlessly
    const minWrapBack = Math.max(0.24, zFront - Math.min(cs.zBack ?? (zFront - 0.45), spec.dims.wheelZFront + spec.dims.wheelRadius + 0.05));
    const chin = new THREE.Mesh(
      buildWrapBeamGeo(bumpW - 0.01, anchoredH, cs.protrusion + 0.05, minWrapBack, 0.14),
      chinMat
    );
    chin.position.set(0, anchoredY, zFront - 0.04);
    chin.castShadow = true;
    group.add(chin);
  }

  // 6. Pop-Up Headlights (100% flush with hood slope when DOWN; raised glowing buckets + beams when UP!)
  const popupControl = { state: 0, pivots: [], lamps: [], beams: [] };
  if (ff.popups && ff.popups.enabled) {
    const pp = ff.popups;
    const lampMat = new THREE.MeshStandardMaterial({
      color: pp.lampColor ?? 0xe6f2ff,
      emissive: pp.beamColor ?? 0x0066ff,
      emissiveIntensity: 0.0,
      roughness: 0.15,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: pp.beamColor ?? 0x0066ff,
      map: getGlowTex(),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: pp.beamColor ?? 0x0066ff,
      map: getGlowTex(),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Compute exact hood surface slope across the lid length so DOWN state is 100% flush!
    const stRearLid = sampleStations(spec.bodyStations, pp.zPivot);
    const stFrontLid = sampleStations(spec.bodyStations, Math.min(zFront, pp.zPivot + pp.d));
    const yRearLid = stRearLid.yDeck + stRearLid.crown * 0.42;
    const yFrontLid = stFrontLid.yDeck + stFrontLid.crown * 0.42;
    const hoodSlopeAngle = Math.atan2(yRearLid - yFrontLid, Math.max(0.05, pp.d));

    for (const s of [-1, 1]) {
      const piv = new THREE.Group();
      piv.position.set(s * pp.xOffset, yRearLid + 0.004, pp.zPivot);
      group.add(piv);

      // Flush hood-colored lid aligned to exact hoodSlopeAngle
      const lid = new THREE.Mesh(new THREE.BoxGeometry(pp.w, 0.016, pp.d), mats.paint);
      lid.position.set(0, -Math.sin(hoodSlopeAngle) * pp.d * 0.5, Math.cos(hoodSlopeAngle) * pp.d * 0.5);
      lid.rotation.x = hoodSlopeAngle;
      lid.castShadow = true;
      piv.add(lid);

      // Crisp thin dark panel seam around the lid
      const seam = new THREE.Mesh(new THREE.BoxGeometry(pp.w + 0.009, 0.008, pp.d + 0.009), mats.dark);
      seam.position.set(0, -Math.sin(hoodSlopeAngle) * pp.d * 0.5 - 0.003, Math.cos(hoodSlopeAngle) * pp.d * 0.5);
      seam.rotation.x = hoodSlopeAngle;
      piv.add(seam);

      // Bucket housing tucked beneath the lid (rotates UP to expose the bright rectangular lamp!)
      const bucketH = 0.145;
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(pp.w - 0.012, bucketH, pp.d * 0.86), mats.trimBlack);
      bucket.position.set(0, -bucketH * 0.54 - Math.sin(hoodSlopeAngle) * pp.d * 0.45, pp.d * 0.46);
      piv.add(bucket);

      // Bright rectangular glass headlamp lens
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(pp.w - 0.036, bucketH - 0.026, 0.02), lampMat);
      lamp.position.set(0, -bucketH * 0.54 - Math.sin(hoodSlopeAngle) * pp.d * 0.45, pp.d * 0.90);
      piv.add(lamp);

      // Additive glow halo on the lamp face
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), haloMat);
      halo.position.set(0, -bucketH * 0.54 - Math.sin(hoodSlopeAngle) * pp.d * 0.45, pp.d * 0.94);
      piv.add(halo);

      // Volumetric road light pool ahead of the car (canon blue beams!)
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.4), beamMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(s * pp.xOffset * 1.12, 0.018, zFront + 2.35);
      group.add(pool);

      popupControl.pivots.push(piv);
      popupControl.lamps.push(lampMat);
      popupControl.beams.push(beamMat, haloMat);
    }

    popupControl.set = (val) => {
      const t = clamp(val, 0, 1);
      popupControl.state = t;
      for (const piv of popupControl.pivots) {
        piv.rotation.x = -t * (pp.upAngle ?? 0.78);
        piv.position.y = (yRearLid + 0.004) + t * 0.042;
      }
      lampMat.emissiveIntensity = t * 2.8;
      beamMat.opacity = t * (pp.beamIntensity ?? 0.9) * 0.62;
      haloMat.opacity = t * 0.80;
    };
    popupControl.set(0);
  }

  return { group, popupControl };
}

// ---------------------------------------------------------------------------
// Stacked Rear Fascia (Tail Lamps, Center Panel, Ducktail Spoiler, Bumper, Exhaust)
// ---------------------------------------------------------------------------
function buildRearFascia(spec, mats) {
  const rf = spec.rearFascia;
  const stRear = spec.bodyStations[0];
  const stNext = spec.bodyStations[1] || stRear;
  const zRear = stRear.z;
  const wRear = stRear.wBelt;
  const group = new THREE.Group();

  // 1. Smooth Wrap-Around Rear Bumper (painted | chrome | unpainted gray plastic)
  const bumpW = Math.min(stNext.wBelt + 0.022, wRear + 0.085);
  const rearBumperMat = rf.bumpers === 'unpainted'
    ? mats.unpaintedBumper
    : (rf.chromeBumper || rf.bumpers === 'chrome' ? mats.chrome : mats.paintRear);
  const rearCornerR = rf.bumperCornerR ?? 0.13;
  const rearWrapZ = rf.bumpers === 'unpainted' ? 0.40 : 0.28;
  const bumper = new THREE.Mesh(
    buildWrapBeamGeo(bumpW, rf.bumperH, rf.bumperProtrusion + 0.055, rearWrapZ, rearCornerR),
    rearBumperMat
  );
  bumper.rotation.y = Math.PI;
  bumper.position.set(0, rf.bumperY, zRear + 0.04);
  bumper.castShadow = true;
  group.add(bumper);

  if (rf.rubStripH > 0) {
    const rubRear = new THREE.Mesh(
      buildWrapBeamGeo(bumpW + 0.008, rf.rubStripH, rf.bumperProtrusion + 0.062, 0.29, rearCornerR),
      mats.trimBlack
    );
    rubRear.rotation.y = Math.PI;
    rubRear.position.set(0, rf.rubStripY, zRear + 0.04);
    group.add(rubRear);
  }

  if (rf.bumpers !== 'unpainted') {
    const lowerVal = new THREE.Mesh(
      buildWrapBeamGeo(bumpW - 0.025, 0.082, 0.05, 0.24, 0.12),
      rf.paintedLowerValance ? mats.paintRear : mats.trimBlack
    );
    lowerVal.rotation.y = Math.PI;
    lowerVal.position.set(0, rf.bumperY - rf.bumperH * 0.68, zRear + 0.05);
    group.add(lowerVal);
  }

  // Optional vertical center barn-door seam (for Chevy Astro vans / cargo vans!)
  if (rf.barnDoors) {
    const doorH = Math.max(0.4, (spec.greenhouse?.yRearRoof ?? 1.65) - (rf.bumperY + rf.bumperH * 0.5));
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.014, doorH, 0.025), mats.dark);
    seam.position.set(0, rf.bumperY + rf.bumperH * 0.5 + doorH * 0.5, zRear - 0.014);
    group.add(seam);
  }

  // 2. Recessed Black Center License Panel + Wrap-Around Multi-Section Tail Lamps
  const tp = rf.tailPanel;
  const noCenterBox = tp.style === 'vertical' || tp.style === 'oval';
  if (!noCenterBox) {
    const centerPanel = new THREE.Mesh(new THREE.BoxGeometry(tp.centerW, tp.h, 0.036), mats.dark);
    centerPanel.position.set(0, tp.y, zRear - 0.008);
    group.add(centerPanel);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.012), mats.trimGrey);
    plate.position.set(0, tp.y - 0.005, zRear - 0.024);
    group.add(plate);
  } else {
    // On trucks/vans (vertical) and 90s aero coupes (oval), plate sits cleanly in the rear bumper!
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.016), mats.trimGrey);
    plate.position.set(0, rf.bumperY + 0.005, zRear - rf.bumperProtrusion - 0.022);
    group.add(plate);
  }

  for (const s of [-1, 1]) {
    const xLamp = s * (tp.centerW / 2 + tp.lampW / 2 + 0.02);
    if (!noCenterBox) {
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW + 0.025, tp.h + 0.022, 0.035), mats.trimBlack);
      bezel.position.set(xLamp, tp.y, zRear - 0.004);
      group.add(bezel);
    }

    if (tp.style === 'oval') {
      // 90s rounded oval ruby-red taillight with white inner reverse strip (e.g., '96 Cavalier!)
      const ovX = s * (wRear * 0.64);
      const ovRed = new THREE.Mesh(buildOvalLensGeo(tp.lampW, tp.h, 0.048), mats.tailLens);
      ovRed.position.set(ovX, tp.y, zRear - 0.006);
      ovRed.rotation.y = s * 0.24;
      group.add(ovRed);
      const ovRev = new THREE.Mesh(
        buildOvalLensGeo(tp.reverseW ?? 0.13, tp.h * 0.34, 0.052),
        mats.reverseLens
      );
      ovRev.position.set(s * (wRear * 0.64 - tp.lampW * 0.20), tp.y - tp.h * 0.14, zRear - 0.014);
      ovRev.rotation.y = s * 0.22;
      group.add(ovRev);
    } else if (tp.style === 'vertical') {
      // Classic vertical corner tail lamps (Chevy Astro van, Cadillac Brougham, pickup trucks!)
      const vx = s * (wRear - tp.lampW * 0.52);
      const vBezel = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW + 0.02, tp.h + 0.02, 0.042), mats.trimBlack);
      vBezel.position.set(vx, tp.y, zRear - 0.004);
      group.add(vBezel);
      const vRed = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW, tp.h * 0.62, 0.046), mats.tailLens);
      vRed.position.set(vx, tp.y + tp.h * 0.17, zRear - 0.008);
      group.add(vRed);
      const vAmb = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW, tp.h * 0.20, 0.046), mats.amberLens);
      vAmb.position.set(vx, tp.y - tp.h * 0.24, zRear - 0.008);
      group.add(vAmb);
      const vRev = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW, tp.h * 0.16, 0.046), mats.reverseLens);
      vRev.position.set(vx, tp.y - tp.h * 0.41, zRear - 0.008);
      group.add(vRev);
    } else if (tp.style === 'camaroGrid') {
      // Iconic 3rd-gen Camaro grid tail lamps: white inner -> amber middle -> red outer + dark grid bars
      const wWhite = tp.lampW * 0.22;
      const wAmb = tp.lampW * 0.24;
      const wRed = tp.lampW - wWhite - wAmb;
      const x0 = tp.centerW / 2 + 0.02;
      const mWhite = new THREE.Mesh(new THREE.BoxGeometry(wWhite - 0.008, tp.h - 0.014, 0.038), mats.reverseLens);
      mWhite.position.set(s * (x0 + wWhite * 0.5), tp.y, zRear - 0.008);
      group.add(mWhite);
      const mAmb = new THREE.Mesh(new THREE.BoxGeometry(wAmb - 0.008, tp.h - 0.014, 0.038), mats.amberLens);
      mAmb.position.set(s * (x0 + wWhite + wAmb * 0.5), tp.y, zRear - 0.008);
      group.add(mAmb);
      const mRed = new THREE.Mesh(new THREE.BoxGeometry(wRed - 0.008, tp.h - 0.014, 0.038), mats.tailLens);
      mRed.position.set(s * (x0 + wWhite + wAmb + wRed * 0.5), tp.y, zRear - 0.008);
      group.add(mRed);
      // Signature black horizontal grid louvers across the tail lamp
      for (const dy of [-0.26, 0, 0.26]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(tp.lampW, 0.009, 0.044), mats.trimBlack);
        bar.position.set(xLamp, tp.y + dy * tp.h, zRear - 0.009);
        group.add(bar);
      }
    } else {
      // Ruby red main tail/brake section
      const redW = tp.lampW - tp.amberOuterW;
      const redLens = new THREE.Mesh(new THREE.BoxGeometry(redW, tp.h - 0.012, 0.038), mats.tailLens);
      redLens.position.set(s * (tp.centerW / 2 + redW / 2 + 0.02), tp.y, zRear - 0.008);
      group.add(redLens);

      // White reverse light inset square
      const revLens = new THREE.Mesh(new THREE.BoxGeometry(tp.reverseW, tp.h * 0.34, 0.042), mats.reverseLens);
      revLens.position.set(s * (tp.centerW / 2 + redW * 0.45 + 0.02), tp.y - tp.h * 0.16, zRear - 0.010);
      group.add(revLens);

      // Outer wrap-around amber turn section
      const ambLens = new THREE.Mesh(new THREE.BoxGeometry(tp.amberOuterW, tp.h - 0.012, 0.040), mats.amberLens);
      ambLens.position.set(s * (tp.centerW / 2 + redW + tp.amberOuterW / 2 + 0.02), tp.y, zRear - 0.004);
      ambLens.rotation.y = s * 0.16;
      group.add(ambLens);

      const ambWrap = new THREE.Mesh(new THREE.BoxGeometry(0.036, tp.h - 0.016, tp.wrapZ), mats.amberLens);
      ambWrap.position.set(s * (wRear + 0.004), tp.y, zRear + tp.wrapZ * 0.45);
      ambWrap.rotation.y = s * 0.10;
      group.add(ambWrap);
    }
  }

  // 3. Integrated Ducktail Lip Spoiler / 3-Piece Wrap-Around Camaro Wing / Pedestal Wing
  // AUTO-SEATED onto rear deck surface so a rear spoiler can never float in mid-air!
  if (rf.spoiler && rf.spoiler.style === 'lip') {
    const sp = rf.spoiler;
    const stSp = sampleStations(spec.bodyStations, sp.z);
    const deckY = stSp.yDeck + stSp.crown * 0.5;
    const seatedY = Math.min(sp.y, deckY + sp.h * 0.45);
    const lipGeo = new THREE.BoxGeometry(sp.w, sp.h, sp.d);
    const lip = new THREE.Mesh(lipGeo, mats.paintRear);
    lip.position.set(0, seatedY, sp.z);
    lip.rotation.x = 0.24;
    lip.castShadow = true;
    group.add(lip);
  } else if (rf.spoiler && rf.spoiler.style === 'camaroWing') {
    const sp = rf.spoiler;
    const stSp = sampleStations(spec.bodyStations, sp.z);
    const deckY = stSp.yDeck + stSp.crown * 0.5;
    const baseY = Math.min(sp.y, deckY + 0.015);
    // Center raised blade + wrap-around quarter-panel endcaps (classic 3-piece Z28/IROC-Z spoiler!)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(sp.w, sp.h, sp.d), mats.paintRear);
    blade.position.set(0, baseY + sp.h * 0.5, sp.z);
    blade.rotation.x = 0.18;
    blade.castShadow = true;
    group.add(blade);
    for (const s of [-1, 1]) {
      const endCap = new THREE.Mesh(new THREE.BoxGeometry(0.11, sp.h * 1.15, sp.d * 2.1), mats.paintRear);
      endCap.position.set(s * (sp.w * 0.5 - 0.04), baseY + sp.h * 0.32, sp.z + sp.d * 0.65);
      endCap.rotation.x = 0.12;
      group.add(endCap);
    }
  } else if (rf.spoiler && rf.spoiler.style === 'wing') {
    const sp = rf.spoiler;
    const stSp = sampleStations(spec.bodyStations, sp.z);
    const deckY = stSp.yDeck + stSp.crown * 0.5;
    const baseY = Math.min(sp.y, deckY + 0.01);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(sp.w, 0.035, sp.d), mats.paintRear);
    wing.position.set(0, baseY + sp.h, sp.z);
    wing.castShadow = true;
    group.add(wing);
    for (const s of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.045, sp.h + 0.02, sp.d * 0.7), mats.paintRear);
      strut.position.set(s * sp.w * 0.38, baseY + sp.h * 0.5, sp.z);
      group.add(strut);
    }
  }

  // 4. Twin / Single Chrome-Tipped Exhaust
  if (rf.exhaust) {
    const ex = rf.exhaust;
    const sides = ex.side === 'dual' ? [-1, 1] : [ex.side === 'right' ? -1 : 1];
    const pipeGeo = new THREE.CylinderGeometry(ex.r, ex.r, 0.22, 12);
    pipeGeo.rotateX(Math.PI / 2);
    for (const s of sides) {
      for (let k = 0; k < (ex.count || 1); k++) {
        const offset = (k - ((ex.count || 1) - 1) / 2) * (ex.r * 2.35);
        const pipe = new THREE.Mesh(pipeGeo, mats.chrome);
        pipe.position.set(s * ex.xOffset + offset, ex.y, zRear + 0.04);
        group.add(pipe);
      }
    }
  }

  // 5. Rear Mud Flaps
  if (rf.mudFlaps) {
    const flapGeo = new THREE.BoxGeometry(0.20, 0.16, 0.022);
    for (const [wz, th] of [
      [spec.dims.wheelZFront - spec.dims.wheelRadius - 0.04, spec.dims.trackHalfFront],
      [spec.dims.wheelZRear - spec.dims.wheelRadius - 0.04, spec.dims.trackHalfRear],
    ]) {
      for (const s of [-1, 1]) {
        const flap = new THREE.Mesh(flapGeo, mats.trimBlack);
        flap.position.set(s * (th + 0.02), 0.17, wz);
        group.add(flap);
      }
    }
  }

  // 6. Fuel Filler Door Seam (body-colored panel with thin dark perimeter groove)
  if (rf.fuelDoor) {
    const fd = rf.fuelDoor;
    const st = sampleStations(spec.bodyStations, fd.z);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.132, 0.142), mats.dark);
    frame.position.set(fd.side * (st.wBelt + 0.001), fd.y, fd.z);
    group.add(frame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.120, 0.130), mats.paintRear);
    door.position.set(fd.side * (st.wBelt + 0.002), fd.y, fd.z);
    group.add(door);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Side Trim (Full-Length Rub Strip, Rocker Skirt, Door Handles, Side Markers)
// ---------------------------------------------------------------------------
function buildSideTrim(spec, mats) {
  const { trim, dims, bodyStations } = spec;
  const group = new THREE.Group();
  const zMin = bodyStations[0].z + 0.12;
  const zMax = bodyStations[bodyStations.length - 1].z - 0.12;
  const archR = dims.wheelRadius + (dims.archGap ?? 0.048) + 0.015;

  // Segments along the flank that skip the front & rear wheel arches cleanly
  const segments = [
    [zMin, dims.wheelZRear - archR],
    [dims.wheelZRear + archR, dims.wheelZFront - archR],
    [dims.wheelZFront + archR, zMax],
  ];

  for (const s of [-1, 1]) {
    if (trim.sideRubStrip && trim.sideRubStrip.enabled) {
      for (const [za, zb] of segments) {
        if (zb - za < 0.06) continue;
        const zm = (za + zb) * 0.5;
        const st = sampleStations(bodyStations, zm);
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.026, trim.sideRubStrip.h, zb - za),
          mats.trimBlack
        );
        strip.position.set(s * (st.wBelt - 0.004), trim.sideRubStrip.y, zm);
        group.add(strip);
      }
    }

    // Black lower rocker skirt between the wheels
    if (trim.rockerSkirt && trim.rockerSkirt.enabled) {
      const [za, zb] = segments[1];
      const zm = (za + zb) * 0.5;
      const st = sampleStations(bodyStations, zm);
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, trim.rockerSkirt.h, zb - za),
        mats.trimBlack
      );
      skirt.position.set(s * (st.wBot + 0.002), trim.rockerSkirt.y, zm);
      group.add(skirt);
    }

    // Flush black door handle
    if (trim.doorHandle) {
      const dh = trim.doorHandle;
      const st = sampleStations(bodyStations, dh.z);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.042, 0.14), mats.trimBlack);
      handle.position.set(s * (st.wBelt + 0.004), dh.y, dh.z);
      group.add(handle);
    }

    // Front amber side marker lens
    if (trim.frontSideMarker) {
      const sm = trim.frontSideMarker;
      const st = sampleStations(bodyStations, sm.z);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.020, sm.h, sm.w), mats.amberLens);
      marker.position.set(s * (st.wBelt + 0.008), sm.y, sm.z);
      group.add(marker);
    }

    // Optional twin hood louvers (e.g., IROC-Z / Z28 hood vents seated flush on hood surface!)
    if (trim.hoodLouvers && trim.hoodLouvers.enabled) {
      const hl = trim.hoodLouvers;
      const z0 = hl.z ?? 1.25;
      const len = hl.len ?? 0.52;
      const stA = sampleStations(bodyStations, z0 - len * 0.5);
      const stB = sampleStations(bodyStations, z0 + len * 0.5);
      const yA = stA.yDeck + stA.crown * 0.72;
      const yB = stB.yDeck + stB.crown * 0.72;
      const slope = Math.atan2(yA - yB, len);
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(hl.w ?? 0.24, 0.014, len),
        mats.trimBlack
      );
      louver.position.set(s * (hl.xOffset ?? 0.25), (yA + yB) * 0.5 + 0.005, z0);
      louver.rotation.x = slope;
      group.add(louver);
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Sculpted Multi-Spoke Alloy Wheels (Rolling + Front Steering Pivots)
// ---------------------------------------------------------------------------
function buildWheel(spec, mats, side) {
  const { dims, wheels } = spec;
  const R = dims.wheelRadius;
  const W = dims.wheelWidth;
  const rimR = R * (wheels.rimRatio ?? 0.67);

  const steerPivot = new THREE.Group();
  const spinPivot = new THREE.Group();
  steerPivot.add(spinPivot);

  // Rounded tire tread + plump sidewalls
  const tread = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W * 0.82, 24), mats.tire);
  tread.rotation.z = Math.PI / 2;
  tread.castShadow = true;
  spinPivot.add(tread);

  const sidewallGeo = new THREE.TorusGeometry(R - W * 0.18, W * 0.18, 10, 24);
  sidewallGeo.rotateY(Math.PI / 2);
  for (const dx of [-W * 0.34, W * 0.34]) {
    const sw = new THREE.Mesh(sidewallGeo, mats.tire);
    sw.position.x = dx;
    spinPivot.add(sw);
  }

  // Deep-dish silver alloy rim lip + dark recessed brake backing drum
  const rimLip = new THREE.Mesh(
    new THREE.TorusGeometry(rimR, 0.018, 10, 24).rotateY(Math.PI / 2),
    mats.rim
  );
  rimLip.position.x = side * (W * 0.44);
  spinPivot.add(rimLip);

  const innerDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(rimR * 0.92, rimR * 0.92, W * 0.55, 18).rotateZ(Math.PI / 2),
    mats.dark
  );
  innerDrum.position.x = side * (W * 0.04);
  spinPivot.add(innerDrum);

  // Multi-spoke alloy face (10-spoke blade for Celica GT-S, twin-slot 5-spoke for IROC-Z!)
  const spokeCount = wheels.spokeCount ?? 10;
  const spokeLen = rimR - (wheels.hubRadius ?? 0.068) * 0.5;
  if (wheels.spokeStyle === 'iroc5') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      for (const offset of [-0.017, 0.017]) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.024, spokeLen, 0.018), mats.rim);
        const rMid = spokeLen * 0.5 + 0.02;
        spoke.position.set(
          side * (W * 0.42),
          Math.cos(a) * rMid - Math.sin(a) * offset,
          Math.sin(a) * rMid + Math.cos(a) * offset
        );
        spoke.rotation.x = a;
        spinPivot.add(spoke);
      }
    }
  } else {
    const spokeW = wheels.spokeStyle === 'blade' ? 0.032 : 0.024;
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.022, spokeLen, spokeW), mats.rim);
      spoke.position.set(
        side * (W * 0.42),
        Math.cos(a) * (spokeLen * 0.5 + 0.02),
        Math.sin(a) * (spokeLen * 0.5 + 0.02)
      );
      spoke.rotation.x = a;
      spinPivot.add(spoke);
    }
  }

  // Center hub cap
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(wheels.hubRadius ?? 0.068, wheels.hubRadius ?? 0.068, 0.028, 14).rotateZ(Math.PI / 2),
    mats.rim
  );
  hub.position.x = side * (W * 0.43);
  spinPivot.add(hub);

  return { steerPivot, spinPivot };
}

// ---------------------------------------------------------------------------
// Public Builder API (gpvehicles idiom)
// ---------------------------------------------------------------------------
export function buildLoftedCar(userSpec = {}) {
  // Deep-merge user spec onto defaults so partial specs work seamlessly
  const spec = {
    meta: { ...DEFAULT_CAR_SPEC.meta, ...(userSpec.meta || {}) },
    dims: { ...DEFAULT_CAR_SPEC.dims, ...(userSpec.dims || {}) },
    paint: { ...DEFAULT_CAR_SPEC.paint, ...(userSpec.paint || {}) },
    cargoBed: userSpec.cargoBed || null,
    bodyStations: userSpec.bodyStations || DEFAULT_CAR_SPEC.bodyStations,
    greenhouse: { ...DEFAULT_CAR_SPEC.greenhouse, ...(userSpec.greenhouse || {}) },
    frontFascia: {
      ...DEFAULT_CAR_SPEC.frontFascia,
      ...(userSpec.frontFascia || {}),
      grille: { ...DEFAULT_CAR_SPEC.frontFascia.grille, ...(userSpec.frontFascia?.grille || {}) },
      cornerLamps: { ...DEFAULT_CAR_SPEC.frontFascia.cornerLamps, ...(userSpec.frontFascia?.cornerLamps || {}) },
      lowerIntake: { ...DEFAULT_CAR_SPEC.frontFascia.lowerIntake, ...(userSpec.frontFascia?.lowerIntake || {}) },
      chinSpoiler: { ...DEFAULT_CAR_SPEC.frontFascia.chinSpoiler, ...(userSpec.frontFascia?.chinSpoiler || {}) },
      popups: { ...DEFAULT_CAR_SPEC.frontFascia.popups, ...(userSpec.frontFascia?.popups || {}) },
    },
    rearFascia: {
      ...DEFAULT_CAR_SPEC.rearFascia,
      ...(userSpec.rearFascia || {}),
      tailPanel: { ...DEFAULT_CAR_SPEC.rearFascia.tailPanel, ...(userSpec.rearFascia?.tailPanel || {}) },
      spoiler: { ...DEFAULT_CAR_SPEC.rearFascia.spoiler, ...(userSpec.rearFascia?.spoiler || {}) },
      exhaust: { ...DEFAULT_CAR_SPEC.rearFascia.exhaust, ...(userSpec.rearFascia?.exhaust || {}) },
    },
    trim: {
      ...DEFAULT_CAR_SPEC.trim,
      ...(userSpec.trim || {}),
      sideRubStrip: { ...DEFAULT_CAR_SPEC.trim.sideRubStrip, ...(userSpec.trim?.sideRubStrip || {}) },
      rockerSkirt: { ...DEFAULT_CAR_SPEC.trim.rockerSkirt, ...(userSpec.trim?.rockerSkirt || {}) },
    },
    wheels: { ...DEFAULT_CAR_SPEC.wheels, ...(userSpec.wheels || {}) },
  };

  const p = spec.paint;
  const gh = spec.greenhouse;
  const hasSplit = Boolean(p.split);
  const paintBase = new THREE.MeshPhysicalMaterial({
    color: hasSplit ? 0xffffff : p.color,
    vertexColors: hasSplit,
    roughness: p.roughness ?? 0.24,
    metalness: p.metalness ?? 0.28,
    clearcoat: p.clearcoat ?? 0.92,
    clearcoatRoughness: p.clearcoatRoughness ?? 0.14,
    envMapIntensity: 1.25,
  });
  const paintFront = hasSplit
    ? new THREE.MeshPhysicalMaterial({
        color: p.split.frontColor,
        roughness: p.roughness ?? 0.24,
        metalness: p.metalness ?? 0.28,
        clearcoat: p.clearcoat ?? 0.92,
        clearcoatRoughness: p.clearcoatRoughness ?? 0.14,
        envMapIntensity: 1.25,
      })
    : paintBase;
  const paintRear = hasSplit
    ? new THREE.MeshPhysicalMaterial({
        color: p.split.rearColor,
        roughness: p.roughness ?? 0.24,
        metalness: p.metalness ?? 0.28,
        clearcoat: p.clearcoat ?? 0.92,
        clearcoatRoughness: p.clearcoatRoughness ?? 0.14,
        envMapIntensity: 1.25,
      })
    : paintBase;

  const mats = {
    paint: paintBase,
    paintFront,
    paintRear,
    windshield: new THREE.MeshPhysicalMaterial({
      color: gh.windshieldColor ?? 0x1a2636,
      roughness: 0.05,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: gh.windshieldOpacity ?? 0.52,
      side: THREE.DoubleSide,
      envMapIntensity: 1.5,
    }),
    sideGlass: new THREE.MeshPhysicalMaterial({
      color: gh.sideGlassColor ?? 0x16202c,
      roughness: 0.05,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: gh.sideGlassOpacity ?? 0.62,
      side: THREE.DoubleSide,
      envMapIntensity: 1.5,
    }),
    rearGlass: new THREE.MeshPhysicalMaterial({
      color: gh.rearGlassColor ?? 0x0b1018,
      roughness: 0.05,
      metalness: 0.20,
      clearcoat: 1.0,
      transparent: true,
      opacity: gh.rearGlassOpacity ?? 0.88,
      side: THREE.DoubleSide,
      envMapIntensity: 1.5,
    }),
    trimBlack: new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.82, metalness: 0.08 }),
    unpaintedBumper: new THREE.MeshStandardMaterial({ color: 0x3e4248, roughness: 0.78, metalness: 0.04 }),
    clearHeadLens: new THREE.MeshPhysicalMaterial({
      color: 0xe6ecf4,
      emissive: 0x445060,
      emissiveIntensity: 0.22,
      roughness: 0.12,
      metalness: 0.12,
      clearcoat: 1.0,
    }),
    trimGrey: new THREE.MeshStandardMaterial({ color: 0x454a52, roughness: 0.55, metalness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.95 }),
    smokedLens: new THREE.MeshPhysicalMaterial({ color: 0x262930, roughness: 0.18, clearcoat: 0.85 }),
    amberLens: new THREE.MeshPhysicalMaterial({
      color: 0xe68414,
      emissive: 0x6b3200,
      emissiveIntensity: 0.35,
      roughness: 0.16,
      clearcoat: 0.9,
    }),
    tailLens: new THREE.MeshPhysicalMaterial({
      color: 0xa8161a,
      emissive: 0x5c0608,
      emissiveIntensity: 0.45,
      roughness: 0.16,
      clearcoat: 0.9,
    }),
    reverseLens: new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.25 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd0d6de, roughness: 0.20, metalness: 0.88 }),
    tire: new THREE.MeshStandardMaterial({ color: spec.wheels.tireColor ?? 0x16171b, roughness: 0.90 }),
    rim: new THREE.MeshStandardMaterial({ color: spec.wheels.rimColor ?? 0xd0d6de, roughness: 0.26, metalness: 0.78 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.92 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x252830, roughness: 0.85 }),
    vinyl: new THREE.MeshStandardMaterial({ color: p.vinylColor ?? 0x242022, roughness: 0.88, metalness: 0.04 }),
  };

  const group = new THREE.Group();
  group.add(buildBodyMesh(spec, mats.paint, mats.dark));
  group.add(buildGreenhouse(spec, mats));

  const front = buildFrontFascia(spec, mats);
  group.add(front.group);
  group.add(buildRearFascia(spec, mats));
  group.add(buildSideTrim(spec, mats));

  // Build 4 wheels (front wheels steer + spin, rear wheels spin)
  const wheelObjs = [];
  const wheelDefs = [
    { x:  spec.dims.trackHalfFront, z: spec.dims.wheelZFront, front: true,  side:  1 },
    { x: -spec.dims.trackHalfFront, z: spec.dims.wheelZFront, front: true,  side: -1 },
    { x:  spec.dims.trackHalfRear,  z: spec.dims.wheelZRear,  front: false, side:  1 },
    { x: -spec.dims.trackHalfRear,  z: spec.dims.wheelZRear,  front: false, side: -1 },
  ];
  for (const wd of wheelDefs) {
    const w = buildWheel(spec, mats, wd.side);
    w.steerPivot.position.set(wd.x, spec.dims.wheelRadius, wd.z);
    group.add(w.steerPivot);
    wheelObjs.push({ ...w, front: wd.front });
  }

  return {
    group,
    spec,
    dims: spec.dims,
    wheels: wheelObjs,
    popups: front.popupControl,
    setPopups(val) {
      if (front.popupControl.set) front.popupControl.set(val);
    },
    updateWheels(speedMps, steerRad = 0, dt = 0.016) {
      const dRot = (speedMps * dt) / Math.max(0.05, spec.dims.wheelRadius);
      for (const w of wheelObjs) {
        w.spinPivot.rotation.x += dRot;
        if (w.front) w.steerPivot.rotation.y = steerRad;
      }
    },
  };
}
