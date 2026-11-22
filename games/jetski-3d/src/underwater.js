// APEX WAKE — Living Underwater World: Caustic Reef Seabed, Coral Gardens, Swaying Kelp,
// Schooling Tropical Fish, Manta Rays, Sea Turtles, Volumetric Sunbeams, Bubbles & Reef Pearls.
import * as THREE from '../three.module.js';
import { ISLANDS } from './world.js';

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
// 1. SEABED HEIGHT FUNCTION (shared between terrain mesh & reef props/collision)
//    Shallow sandy coral shelves (-6m..-11m) near bay & islands, deeper (-16m) out wide
// ================================================================
export function sampleSeabedY(x, z) {
  let depth = -11.5
    + Math.sin(x * 0.032) * Math.cos(z * 0.029) * 2.4
    + Math.sin(x * 0.085 + z * 0.072) * 0.95
    + Math.cos(x * 0.19 - z * 0.16) * 0.35;

  // Shallow coral shoals near origin so diving right away hits a gorgeous reef!
  const centerShoal = Math.exp(-(x * x + (z + 24) * (z + 24)) / (65 * 65));
  depth += centerShoal * 3.6;

  // Rise smoothly up toward island beaches
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, z - isl.z) - isl.beachR;
    if (d < 48) {
      const u = THREE.MathUtils.clamp(1 - d / 48, 0, 1);
      depth = THREE.MathUtils.lerp(depth, -0.8, u * u);
    }
  }
  return Math.min(-1.2, depth);
}

// ================================================================
// 2. CAUSTIC-LIT SANDY SEABED SHADER (dancing refracted sunlight webs!)
// ================================================================
const SEABED_VERT = /* glsl */ `
attribute vec3 color;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vColor;

void main() {
  vColor = color;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SEABED_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uWaterTint;
uniform float uUnderwater;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vColor;

// Procedural Voronoi-like caustic web (fast dual-layer interfering wave caustics)
float causticPattern(vec2 uv, float t) {
  vec2 p1 = uv * 0.38 + vec2(t * 0.24, -t * 0.19);
  vec2 p2 = uv * 0.56 + vec2(-t * 0.21, t * 0.28);
  float w1 = sin(p1.x * 3.1 + sin(p1.y * 2.7 + t * 0.9));
  float w2 = cos(p2.y * 3.4 + cos(p2.x * 2.9 - t * 1.1));
  float w3 = sin((p1.x - p2.y) * 2.6 + t * 0.7);
  float c = 1.0 - abs(w1 + w2 * 0.75 + w3 * 0.45) * 0.52;
  return pow(clamp(c, 0.0, 1.0), 4.2);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDir);
  float ndl = max(dot(N, L), 0.15);

  // Rippled sand micro-shading
  float ripple = 0.94 + 0.06 * sin(vWorldPos.x * 3.2 + sin(vWorldPos.z * 0.8) * 2.0);
  vec3 base = vColor * ripple * (0.42 + 0.78 * ndl);

  // Animated bright turquoise-gold caustic light webs dancing on the seabed
  float depthAtten = exp(min(0.0, vWorldPos.y) * 0.085);
  float caust = causticPattern(vWorldPos.xz, uTime) * depthAtten * max(0.0, N.y);
  base += mix(vec3(0.28, 0.96, 1.0), uSunColor, 0.45) * caust * 0.95;

  // Underwater turquoise-blue depth scatter & visibility fog
  float dist = length(cameraPosition - vWorldPos);
  float fogRate = mix(0.012, 0.029, uUnderwater);
  float fogAmt = 1.0 - exp(-dist * fogRate);
  vec3 fogCol = mix(vec3(0.02, 0.28, 0.40), uWaterTint, 0.65);
  vec3 col = mix(base, fogCol, clamp(fogAmt, 0.0, 0.97));

  gl_FragColor = vec4(col, 1.0);
}
`;

// ================================================================
// 3. VOLUMETRIC UNDERWATER SUNBEAM SHADER (shimmering god-rays)
// ================================================================
const RAY_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const RAY_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  // Soft vertical shaft tapering toward seabed & soft side edges
  float side = sin(vUv.x * 3.14159265);
  float shimmer = 0.65 + 0.35 * sin(vUv.x * 14.0 + uTime * 1.4) * cos(vUv.y * 5.0 - uTime * 0.8);
  float vert = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.08, vUv.y);
  float a = pow(side, 2.2) * vert * shimmer * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;

// ================================================================
// 4. LIVING UNDERWATER ECOSYSTEM BUILDER
// ================================================================
export function createUnderwaterWorld(scene, preset) {
  const root = new THREE.Group();
  root.name = 'underwater_reef_world';
  scene.add(root);

  const rng = mulberry32(2026);

  // --- A. Caustic-lit Sandy Coral Reef Seabed (380m x 380m) ---
  const bedGeo = new THREE.PlaneGeometry(380, 380, 96, 96);
  bedGeo.rotateX(-Math.PI / 2);
  const bPos = bedGeo.attributes.position;
  const bCol = new Float32Array(bPos.count * 3);
  const cSand = new THREE.Color(0xdccba0);
  const cReef = new THREE.Color(0x526b68);
  const cDeep = new THREE.Color(0x284e5e);
  const cTmp = new THREE.Color();

  for (let i = 0; i < bPos.count; i++) {
    const x = bPos.getX(i);
    const z = bPos.getZ(i);
    const y = sampleSeabedY(x, z);
    bPos.setY(i, y);
    const reefPatch = Math.sin(x * 0.09) * Math.cos(z * 0.085);
    cTmp.copy(cSand);
    if (reefPatch > 0.25) cTmp.lerp(cReef, (reefPatch - 0.25) * 0.7);
    if (y < -12) cTmp.lerp(cDeep, Math.min(1, (-12 - y) / 6));
    bCol[i * 3] = cTmp.r;
    bCol[i * 3 + 1] = cTmp.g;
    bCol[i * 3 + 2] = cTmp.b;
  }
  bedGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  bedGeo.computeVertexNormals();

  const bedMat = new THREE.ShaderMaterial({
    vertexShader: SEABED_VERT,
    fragmentShader: SEABED_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: preset.sunDir.clone() },
      uSunColor: { value: preset.sunColor.clone() },
      uWaterTint: { value: new THREE.Color(0x064f68) },
      uUnderwater: { value: 0 },
    },
  });
  const seabedMesh = new THREE.Mesh(bedGeo, bedMat);
  root.add(seabedMesh);

  // --- B. Reef Boulders + Vibrant Coral Gardens (InstancedMesh -> minimal draw calls!) ---
  const reefAnchors = [];
  // Scatter dense lush coral reef clusters right around spawn bay & across the lagoon!
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (rng() - 0.5) * 0.35;
    const rad = i < 24 ? (5 + rng() * 32) : (34 + rng() * 115);
    const cx = Math.cos(a) * rad;
    const cz = Math.sin(a) * rad - 22;
    const cy = sampleSeabedY(cx, cz);
    if (cy < -3.0 && cy > -15.5) {
      reefAnchors.push({ x: cx, y: cy, z: cz });
    }
  }

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();

  // 1. Reef Limestone Boulders (1 draw call)
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c6866, roughness: 0.92, flatShading: true });
  const rockCount = reefAnchors.length * 3;
  const rockIM = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  let ri = 0;
  for (const an of reefAnchors) {
    for (let k = 0; k < 3; k++) {
      const rx = an.x + (rng() - 0.5) * 5.2;
      const rz = an.z + (rng() - 0.5) * 5.2;
      const ry = sampleSeabedY(rx, rz);
      P.set(rx, ry + 0.25, rz);
      E.set(rng() * 1.2, rng() * 6.28, rng() * 1.2);
      Q.setFromEuler(E);
      S.set(1.1 + rng() * 1.8, 0.55 + rng() * 1.0, 1.1 + rng() * 1.8);
      M.compose(P, Q, S);
      rockIM.setMatrixAt(ri++, M);
    }
  }
  root.add(rockIM);

  // 2. Colorful Brain Coral Domes (1 draw call, per-instance color!)
  const brainGeo = new THREE.IcosahedronGeometry(0.68, 2);
  const brainMat = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.05 });
  const brainCount = reefAnchors.length * 4;
  const brainIM = new THREE.InstancedMesh(brainGeo, brainMat, brainCount);
  const coralPalette = [
    new THREE.Color(0xff6b52), // Sunset Coral
    new THREE.Color(0xf2a93b), // Golden Brain Coral
    new THREE.Color(0xe84d96), // Magenta Reef
    new THREE.Color(0x9b5de5), // Royal Violet Coral
    new THREE.Color(0x28d8c4), // Electric Teal Sponge
    new THREE.Color(0xff8e72), // Living Peach
  ];
  let bi = 0;
  for (const an of reefAnchors) {
    for (let k = 0; k < 4; k++) {
      const cx = an.x + (rng() - 0.5) * 6.2;
      const cz = an.z + (rng() - 0.5) * 6.2;
      const cy = sampleSeabedY(cx, cz);
      const sc = 0.55 + rng() * 1.15;
      P.set(cx, cy + sc * 0.35, cz);
      E.set(rng() * 0.3, rng() * 6.28, rng() * 0.3);
      Q.setFromEuler(E);
      S.set(sc * 1.15, sc * 0.78, sc);
      M.compose(P, Q, S);
      brainIM.setMatrixAt(bi, M);
      brainIM.setColorAt(bi, coralPalette[(rng() * coralPalette.length) | 0]);
      bi++;
    }
  }
  brainIM.instanceColor.needsUpdate = true;
  root.add(brainIM);

  // 3. Branching Staghorn Coral Fans & Tube Sponges (1 draw call, per-instance color!)
  const branchGeo = (() => {
    const pos = [], norm = [], idx = [];
    let vOff = 0;
    const limbs = [
      [0, 0.6, 0, 0, 0, 0, 0.12, 0.07, 1.2],
      [0.32, 1.05, 0.08, 0, 0, -0.58, 0.08, 0.04, 0.9],
      [-0.30, 1.00, -0.06, 0, 0, 0.54, 0.08, 0.04, 0.85],
      [0.06, 1.18, 0.28, 0.48, 0, -0.12, 0.07, 0.035, 0.78],
      [-0.08, 1.12, -0.26, -0.45, 0, 0.14, 0.07, 0.035, 0.74],
    ];
    for (const [lx, ly, lz, rx, ry, rz, rb, rt, h] of limbs) {
      const g = new THREE.CylinderGeometry(rt, rb, h, 7);
      g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz);
      g.translate(lx, ly, lz);
      const p = g.attributes.position, n = g.attributes.normal, ix = g.index;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        norm.push(n.getX(i), n.getY(i), n.getZ(i));
      }
      for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + vOff);
      vOff += p.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setIndex(idx);
    return geo;
  })();
  const branchMat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.04 });
  const branchCount = reefAnchors.length * 4;
  const branchIM = new THREE.InstancedMesh(branchGeo, branchMat, branchCount);
  let sti = 0;
  for (const an of reefAnchors) {
    for (let k = 0; k < 4; k++) {
      const cx = an.x + (rng() - 0.5) * 6.8;
      const cz = an.z + (rng() - 0.5) * 6.8;
      const cy = sampleSeabedY(cx, cz);
      const sc = 0.65 + rng() * 1.1;
      P.set(cx, cy + 0.05, cz);
      E.set((rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25);
      Q.setFromEuler(E);
      S.set(sc, sc, sc);
      M.compose(P, Q, S);
      branchIM.setMatrixAt(sti, M);
      branchIM.setColorAt(sti, coralPalette[(rng() * coralPalette.length) | 0]);
      sti++;
    }
  }
  branchIM.instanceColor.needsUpdate = true;
  root.add(branchIM);

  // 4. Swaying Underwater Kelp & Seagrass Forest (1 InstancedMesh, animated gently in current!)
  const kelpGeo = new THREE.PlaneGeometry(0.28, 3.6, 1, 6);
  kelpGeo.translate(0, 1.8, 0);
  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x267c52, roughness: 0.72, side: THREE.DoubleSide,
  });
  const kelpSpots = [];
  for (const an of reefAnchors) {
    for (let k = 0; k < 6; k++) {
      const kx = an.x + (rng() - 0.5) * 9.0;
      const kz = an.z + (rng() - 0.5) * 9.0;
      const ky = sampleSeabedY(kx, kz);
      kelpSpots.push({ x: kx, y: ky, z: kz, rot: rng() * 6.28, h: 0.55 + rng() * 1.15, phase: rng() * 6.28 });
    }
  }
  const kelpIM = new THREE.InstancedMesh(kelpGeo, kelpMat, kelpSpots.length);
  root.add(kelpIM);

  // --- C. Schooling Tropical Reef Fish (120 vibrant fish in 1 single InstancedMesh!) ---
  const fishGeo = (() => {
    // Sleek diamond/spindle tropical fish silhouette with swept tail fin!
    const s = new THREE.Shape();
    s.moveTo(0, 0.34);               // nose
    s.quadraticCurveTo(0.18, 0.08, 0.04, -0.22); // dorsal curve to tail stem
    s.lineTo(0.17, -0.38);           // upper tail fin
    s.lineTo(0.0, -0.30);            // tail notch
    s.lineTo(-0.17, -0.38);          // lower tail fin
    s.lineTo(-0.04, -0.22);          // lower stem
    s.quadraticCurveTo(-0.18, 0.08, 0, 0.34);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.055, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    geo.center();
    geo.rotateX(Math.PI / 2); // nose along +Z, fins vertical in Y!
    geo.rotateZ(Math.PI / 2);
    return geo;
  })();
  const fishMat = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.25 });
  const FISH_COUNT = 120;
  const fishIM = new THREE.InstancedMesh(fishGeo, fishMat, FISH_COUNT);
  const fishColors = [
    new THREE.Color(0xffe135), // Yellow Tang
    new THREE.Color(0x00d8ff), // Electric Blue Damselfish
    new THREE.Color(0xff6b24), // Clownfish Orange
    new THREE.Color(0x4ef2b8), // Reef Chromis
    new THREE.Color(0xff4da6), // Anthias Pink
  ];
  const fishData = [];
  for (let i = 0; i < FISH_COUNT; i++) {
    const school = reefAnchors[i % Math.min(12, reefAnchors.length)] || { x: 0, y: -7, z: -20 };
    const col = fishColors[i % fishColors.length];
    fishIM.setColorAt(i, col);
    fishData.push({
      cx: school.x + (rng() - 0.5) * 6,
      cz: school.z + (rng() - 0.5) * 6,
      baseY: Math.min(-2.2, school.y + 1.8 + rng() * 3.8),
      rad: 2.8 + rng() * 7.5,
      speed: (0.45 + rng() * 0.55) * (rng() < 0.5 ? 1 : -1),
      phase: rng() * 6.28,
      scale: 0.65 + rng() * 0.75,
    });
  }
  fishIM.instanceColor.needsUpdate = true;
  root.add(fishIM);

  // --- D. Graceful Gliding Manta Rays (3 rays with animated undulating wings!) ---
  const mantaMat = new THREE.MeshStandardMaterial({ color: 0x1e3446, roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide });
  const mantaBellyMat = new THREE.MeshStandardMaterial({ color: 0xd4e4ec, roughness: 0.45 });
  const mantas = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), mantaMat);
    body.scale.set(1.2, 0.25, 2.2);
    g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.40, 10, 8), mantaBellyMat);
    belly.scale.set(1.1, 0.18, 2.0);
    belly.position.y = -0.05;
    g.add(belly);
    // Long whip tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 2.2, 6), mantaMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -1.75;
    g.add(tail);
    // Articulated left & right triangular wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.75);
    wingShape.quadraticCurveTo(1.45, 0.25, 1.95, -0.35);
    wingShape.quadraticCurveTo(0.95, -0.55, 0, -0.85);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape, 8);
    wingGeo.rotateX(-Math.PI / 2);

    const wingR = new THREE.Mesh(wingGeo, mantaMat);
    wingR.position.x = 0.25;
    const wingL = new THREE.Mesh(wingGeo, mantaMat);
    wingL.scale.x = -1;
    wingL.position.x = -0.25;
    g.add(wingL, wingR);

    root.add(g);
    mantas.push({
      group: g, wingL, wingR,
      cx: (i - 1) * 32, cz: -28 - i * 18,
      y: -4.2 - i * 1.4,
      rad: 18 + i * 7,
      speed: 0.19 + i * 0.04,
      phase: i * 2.1,
    });
  }

  // --- E. Gentle Sea Turtles (3 turtles with paddling flippers!) ---
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x4b5c34, roughness: 0.55 });
  const turtleSkinMat = new THREE.MeshStandardMaterial({ color: 0x6c7d4e, roughness: 0.65 });
  const turtles = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), shellMat);
    shell.scale.set(0.88, 0.42, 1.15);
    g.add(shell);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), turtleSkinMat);
    head.scale.set(0.85, 0.75, 1.25);
    head.position.set(0, -0.02, 0.74);
    g.add(head);
    const flipGeo = new THREE.BoxGeometry(0.68, 0.06, 0.24);
    flipGeo.translate(0.32, 0, 0);
    const flR = new THREE.Mesh(flipGeo, turtleSkinMat);
    flR.position.set(0.36, -0.04, 0.28);
    const flL = new THREE.Mesh(flipGeo, turtleSkinMat);
    flL.scale.x = -1;
    flL.position.set(-0.36, -0.04, 0.28);
    g.add(flL, flR);
    root.add(g);
    turtles.push({
      group: g, flL, flR,
      cx: (i - 1) * 24 + 8, cz: -18 - i * 14,
      y: -3.5 - i * 1.1,
      rad: 12 + i * 5,
      speed: 0.14 + i * 0.03,
      phase: i * 1.9 + 0.5,
    });
  }

  // --- F. Collectible Glowing Reef Pearls in Giant Clams (rewarding diving exploration!) ---
  const pearlMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6ffff, emissive: 0x38f8ff, emissiveIntensity: 0.85, roughness: 0.08, clearcoat: 1.0,
  });
  const clamMat = new THREE.MeshStandardMaterial({ color: 0x6e5b68, roughness: 0.78 });
  const pearls = [];
  for (let i = 0; i < 8; i++) {
    const an = reefAnchors[i * 2 % reefAnchors.length] || { x: 8, y: -7, z: -20 };
    const px = an.x + 1.8, pz = an.z + 1.4, py = sampleSeabedY(px, pz);
    const g = new THREE.Group();
    g.position.set(px, py + 0.15, pz);
    const shellBot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), clamMat);
    shellBot.scale.set(1.2, 0.55, 1.0);
    g.add(shellBot);
    const shellTop = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), clamMat);
    shellTop.scale.set(1.2, 0.55, 1.0);
    shellTop.rotation.x = -0.85;
    shellTop.position.set(0, 0.1, -0.25);
    g.add(shellTop);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), pearlMat);
    orb.position.set(0, 0.34, 0.05);
    g.add(orb);
    root.add(g);
    pearls.push({ group: g, orb, x: px, y: py + 0.5, z: pz, collected: false });
  }

  // --- G. Volumetric Underwater Sunbeam Shafts (visible ONLY when submerged!) ---
  const rayGroup = new THREE.Group();
  root.add(rayGroup);
  const rayMat = new THREE.ShaderMaterial({
    vertexShader: RAY_VERT,
    fragmentShader: RAY_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x7af4ff) },
      uOpacity: { value: 0.0 },
    },
  });
  const rayGeo = new THREE.PlaneGeometry(5.5, 22);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rad = 5 + (i % 3) * 9.5;
    const m = new THREE.Mesh(rayGeo, rayMat);
    m.position.set(Math.cos(a) * rad, -8.5, Math.sin(a) * rad);
    m.rotation.y = a + Math.PI / 2;
    m.rotation.z = 0.22; // angled along sunlight refraction
    rayGroup.add(m);
  }

  // --- H. Underwater Bubbles & Marine Plankton Motes (1 draw call) ---
  const BUBBLE_N = 260;
  const bPositions = new Float32Array(BUBBLE_N * 3);
  const bSpeed = new Float32Array(BUBBLE_N);
  for (let i = 0; i < BUBBLE_N; i++) {
    bPositions[i * 3] = (rng() - 0.5) * 44;
    bPositions[i * 3 + 1] = -0.6 - rng() * 14;
    bPositions[i * 3 + 2] = (rng() - 0.5) * 44;
    bSpeed[i] = 0.45 + rng() * 1.4;
  }
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPositions, 3));
  const bDotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(12, 12, 1, 16, 16, 15);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(175,245,255,0.45)');
    g.addColorStop(1, 'rgba(175,245,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const bubblePts = new THREE.Points(bGeo, new THREE.PointsMaterial({
    size: 0.16, map: bDotTex, transparent: true, opacity: 0.72, depthWrite: false, color: 0xcff8ff,
  }));
  bubblePts.frustumCulled = false;
  root.add(bubblePts);

  let bubbleCursor = 0;

  return {
    root,
    pearls,
    sampleSeabedY,
    applyPreset(p) {
      bedMat.uniforms.uSunDir.value.copy(p.sunDir);
      bedMat.uniforms.uSunColor.value.copy(p.sunColor);
    },
    emitBreathBubbles(x, y, z, count = 4) {
      for (let n = 0; n < count; n++) {
        const i = bubbleCursor;
        bubbleCursor = (bubbleCursor + 1) % BUBBLE_N;
        bPositions[i * 3] = x + (Math.random() - 0.5) * 0.35;
        bPositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.2;
        bPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.35;
        bSpeed[i] = 1.6 + Math.random() * 1.4;
      }
      bGeo.attributes.position.needsUpdate = true;
    },
    checkPearlCollect(x, y, z) {
      for (const p of pearls) {
        if (!p.collected && Math.hypot(x - p.x, y - p.y, z - p.z) < 2.2) {
          p.collected = true;
          p.orb.visible = false;
          return true;
        }
      }
      return false;
    },
    update(t, dt, camPos, underwaterBlend) {
      bedMat.uniforms.uTime.value = t;
      bedMat.uniforms.uUnderwater.value = underwaterBlend;
      rayMat.uniforms.uTime.value = t;
      rayMat.uniforms.uOpacity.value = underwaterBlend * 0.19;
      rayGroup.visible = underwaterBlend > 0.02;
      rayGroup.position.set(camPos.x, 0, camPos.z);

      // Animate swaying kelp blades
      for (let i = 0; i < kelpSpots.length; i++) {
        const ks = kelpSpots[i];
        P.set(ks.x, ks.y, ks.z);
        E.set(Math.sin(t * 1.5 + ks.phase) * 0.16, ks.rot, Math.cos(t * 1.2 + ks.phase) * 0.18);
        Q.setFromEuler(E);
        S.set(1, ks.h, 1);
        M.compose(P, Q, S);
        kelpIM.setMatrixAt(i, M);
      }
      kelpIM.instanceMatrix.needsUpdate = true;

      // Animate schooling tropical reef fish
      for (let i = 0; i < FISH_COUNT; i++) {
        const f = fishData[i];
        const a = t * f.speed + f.phase;
        const fx = f.cx + Math.cos(a) * f.rad;
        const fz = f.cz + Math.sin(a) * f.rad;
        const fy = f.baseY + Math.sin(a * 2.2 + i) * 0.55;
        const heading = Math.atan2(-Math.sin(a) * f.speed, Math.cos(a) * f.speed);
        const wag = Math.sin(t * 11.0 + i * 1.7) * 0.16;
        P.set(fx, fy, fz);
        E.set(0, heading + wag, 0);
        Q.setFromEuler(E);
        S.set(f.scale, f.scale, f.scale);
        M.compose(P, Q, S);
        fishIM.setMatrixAt(i, M);
      }
      fishIM.instanceMatrix.needsUpdate = true;

      // Animate gliding manta rays
      for (const m of mantas) {
        const a = t * m.speed + m.phase;
        const mx = m.cx + Math.cos(a) * m.rad;
        const mz = m.cz + Math.sin(a) * m.rad;
        const my = m.y + Math.sin(a * 2.0) * 0.9;
        m.group.position.set(mx, my, mz);
        m.group.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        m.group.rotation.z = -0.18;
        const flap = Math.sin(t * 2.3 + m.phase) * 0.34;
        m.wingL.rotation.z = -flap;
        m.wingR.rotation.z = flap;
      }

      // Animate gentle sea turtles
      for (const tu of turtles) {
        const a = t * tu.speed + tu.phase;
        const tx = tu.cx + Math.cos(a) * tu.rad;
        const tz = tu.cz + Math.sin(a) * tu.rad;
        const ty = tu.y + Math.sin(a * 1.6) * 0.65;
        tu.group.position.set(tx, ty, tz);
        tu.group.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        const stroke = Math.sin(t * 2.8 + tu.phase);
        tu.flL.rotation.z = stroke * 0.38;
        tu.flR.rotation.z = -stroke * 0.38;
        tu.flL.rotation.y = stroke * 0.25;
        tu.flR.rotation.y = -stroke * 0.25;
      }

      // Bob glowing pearls softly
      for (const p of pearls) {
        if (!p.collected) {
          p.orb.position.y = 0.34 + Math.sin(t * 2.4 + p.x) * 0.08;
        }
      }

      // Rise underwater bubbles & keep plankton field around swimmer/camera
      bubblePts.visible = underwaterBlend > 0.01;
      if (bubblePts.visible) {
        for (let i = 0; i < BUBBLE_N; i++) {
          bPositions[i * 3 + 1] += bSpeed[i] * dt;
          bPositions[i * 3] += Math.sin(t * 2.2 + i) * 0.14 * dt;
          if (bPositions[i * 3 + 1] > -0.2 || Math.hypot(bPositions[i * 3] - camPos.x, bPositions[i * 3 + 2] - camPos.z) > 36) {
            bPositions[i * 3] = camPos.x + (Math.random() - 0.5) * 34;
            bPositions[i * 3 + 1] = Math.max(sampleSeabedY(bPositions[i * 3], camPos.z) + 0.3, camPos.y - 8 - Math.random() * 6);
            bPositions[i * 3 + 2] = camPos.z + (Math.random() - 0.5) * 34;
            bSpeed[i] = 0.45 + Math.random() * 1.3;
          }
        }
        bGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
