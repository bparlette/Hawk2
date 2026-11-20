// Bunny Hop — World Module (Neon)
// Pure ESM, imports 'three' only. Procedural geometry + canvas/shader materials.
// Live seam: buildWorld(scene, config?) -> {
//   groundAt(x, z) -> height,
//   surfaces: { groundAt, bins },
//   colliders: [{ minX, maxX, minZ, maxZ, top, type }],
//   bins: [{ x, z, top }],
//   water: { y, level, contains(x, z), bounds: { minX, maxX, minZ, maxZ }, rect },
//   climbOutAt(x, z) -> { x, z, heading } | null,
//   climbOut: [{ x, z }],
//   spawn: { x, z, heading },
//   waterMat,
// }

import * as THREE from 'three';

export const WORLD_CONFIG = {
  propDensity: 1.0,       // global multiplier for optional dressing (0..1.5)
  litWindowRatio: 0.62,   // fraction of house windows glowing warm at dusk
  palmCount: 17,          // canal greenbelt palm trees (0..17)
  shadeTreeCount: 16,     // yard & background shade trees (0..16)
  hedgeCount: 4,          // trimmed front-yard hedges (0..4)
  parkedCarCount: 8,      // curbside parked cars (0..8)
  hopLineBins: 6,         // main street hop-line bins (1..8)
  hopLinePitch: 3.2,      // centre-to-centre bin spacing in m (<= 3.3 for bin-to-bin proof)
  singleBins: 5,          // scattered single bins (0..5)
  includeDumpster: true,  // east-of-bridge industrial dumpster
  utilityPoles: true,     // ~25 m poles + sagging overhead catenary wires (1 draw)
  skylineCard: true,      // hazed distant skyline silhouette on canal axis (1 draw)
};

// Reference lighting & renderer values (frame-1 sky, frame-2 sun, frame-5 blue ambient)
export const WORLD_LIGHTING = {
  fog: { color: 0x8d82a3, near: 42, far: 160 },
  sun: { color: 0xffb38a, intensity: 2.35, dir: [-0.84, 0.19, 0.50] },
  hemi: { sky: 0xa4cbf7, ground: 0x675e70, intensity: 1.75 },
  ambient: { color: 0x627aa8, intensity: 1.05 },
  renderer: { toneMapping: 'ACESFilmicToneMapping', exposure: 1.18 },
};

export const WATER_Y = 0.0;

const MAP_HALF_X = 110; // 220 m length along canal
const MAP_HALF_Z = 80;  // 160 m width across canal

const CANAL_WATER_HALF = 7.0; // ~14 m wide water surface
const CANAL_BED_HALF = 5.6;
const CANAL_BED_Y = -1.6;
const BANK_TOP_Z = 10.6;
const GROUND_Y = 1.6;
const WALK_Y = 1.72;

const DECK_Y = 4.0;           // rideable deck 4 m above water
const DECK_HALF_X = 4.6;      // 9.2 m total bridge width
const DECK_HALF_Z = 10.6;     // spans canal + bank crests
const RAMP_END_Z = 23.6;      // 13 m smooth approach ramp down to street (y = 1.6)
const RAIL_H = 0.62;          // low rail clearable by bunny hop

const STREET_Z = 28.1;        // center of main east-west streets on both banks
const STREET_HALF_W = 4.5;    // 9 m wide asphalt street (23.6 .. 32.6)
const INNER_WALK_Z = STREET_Z - STREET_HALF_W - 1.1;  // 22.5 (width 2.2 -> 21.4 .. 23.6)
const OUTER_WALK_Z = STREET_Z + STREET_HALF_W + 1.25; // 33.85 (width 2.5 -> 32.6 .. 35.1)

// Deterministic PRNG so neighbourhood layout & textures are reproducible
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Merge an array of BufferGeometries (position + normal + uv) into one static geometry
function mergeGeometries(geos) {
  if (!geos.length) return null;
  let totalVerts = 0;
  const nonIndexed = [];
  for (let i = 0; i < geos.length; i++) {
    const g = geos[i].index ? geos[i].toNonIndexed() : geos[i];
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    totalVerts += g.attributes.position.count;
    nonIndexed.push(g);
  }
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const uv = new Float32Array(totalVerts * 2);
  let offset = 0;
  for (let i = 0; i < nonIndexed.length; i++) {
    const g = nonIndexed[i];
    const count = g.attributes.position.count;
    pos.set(g.attributes.position.array, offset * 3);
    norm.set(g.attributes.normal.array, offset * 3);
    uv.set(g.attributes.uv.array, offset * 2);
    offset += count;
    if (g !== geos[i]) g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return merged;
}

// Procedural Canvas Textures
function makeAsphaltTexture(withLines = true) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(101);
  // Mid grey-blue asphalt targeting road luma 70-100 (frame-2, frame-4)
  g.fillStyle = '#626f82';
  g.fillRect(0, 0, 256, 256);

  // Patchy wear & resurfacing strips (frame-2)
  for (let i = 0; i < 14; i++) {
    const px = rng() * 256;
    const py = rng() * 256;
    const pw = 24 + rng() * 68;
    const ph = 18 + rng() * 52;
    g.fillStyle = rng() < 0.5 ? 'rgba(132, 146, 166, 0.22)' : 'rgba(66, 76, 92, 0.24)';
    g.fillRect(px, py, pw, ph);
  }

  // Subtle tire-track polishing bands
  g.fillStyle = 'rgba(54, 62, 76, 0.22)';
  g.fillRect(0, 44, 256, 42);
  g.fillRect(0, 170, 256, 42);

  // Aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const v = 78 + Math.floor(rng() * 44);
    g.fillStyle = `rgb(${v},${v + 8},${v + 18})`;
    g.fillRect(x, y, 2, 2);
  }

  // Hairline tar repair seams
  g.strokeStyle = 'rgba(42, 48, 60, 0.45)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let x = rng() * 256;
    let y = rng() * 256;
    g.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rng() - 0.5) * 38;
      y += (rng() - 0.5) * 28;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  if (withLines) {
    // Crisp high-contrast white 3 m / 9 m lane dashes (1/3 tile duty cycle, road luma +100 — frame-2)
    g.fillStyle = 'rgba(244, 246, 252, 0.90)';
    g.fillRect(16, 123, 86, 8);
    // Light scuff wear over paint so it reads lived-in without losing contrast
    for (let i = 0; i < 24; i++) {
      g.fillStyle = 'rgba(98, 111, 130, 0.35)';
      g.fillRect(16 + rng() * 86, 123 + rng() * 8, 3 + rng() * 5, 2);
    }
    // Crisp white shoulder lines
    g.fillStyle = 'rgba(236, 240, 248, 0.78)';
    g.fillRect(0, 12, 256, 6);
    g.fillRect(0, 238, 256, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeConcreteTexture(tint = '#c2bfb6', jointStep = 64) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(202);
  g.fillStyle = tint;
  g.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const a = rng() * 0.08;
    g.fillStyle = rng() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(38,44,54,${a})`;
    g.fillRect(rng() * 256, rng() * 256, 2 + rng() * 3, 2 + rng() * 3);
  }
  for (let i = 0; i < 20; i++) {
    const gr = g.createRadialGradient(
      rng() * 256, rng() * 256, 2,
      rng() * 256, rng() * 256, 18 + rng() * 26
    );
    gr.addColorStop(0, 'rgba(54,60,72,0.10)');
    gr.addColorStop(1, 'rgba(54,60,72,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  }
  if (jointStep > 0) {
    g.strokeStyle = 'rgba(64,70,82,0.42)';
    g.lineWidth = 3;
    for (let p = 0; p < 256; p += jointStep) {
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, 256);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(303);
  g.fillStyle = '#364d36';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3800; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 42 + Math.floor(rng() * 28);
    const gr = 64 + Math.floor(rng() * 34);
    const b = 38 + Math.floor(rng() * 20);
    g.fillStyle = `rgb(${r},${gr},${b})`;
    g.fillRect(x, y, 2, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 16);
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0.0, 'rgba(255, 212, 140, 0.95)');
  gr.addColorStop(0.35, 'rgba(255, 162, 78, 0.48)');
  gr.addColorStop(0.7, 'rgba(255, 120, 50, 0.12)');
  gr.addColorStop(1.0, 'rgba(255, 110, 40, 0.0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Custom bright-dusk sky dome: cyan overhead -> lavender -> pale pink horizon (frame-1)
function createDuskSky(sunDir) {
  const geo = new THREE.SphereGeometry(260, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y, 0.0, 1.0);

        // frame-1 palette: bright cyan-blue overhead melting to pale pink horizon band
        vec3 colHorizon = vec3(0.95, 0.67, 0.70);
        vec3 colLow     = vec3(0.84, 0.56, 0.72);
        vec3 colMid     = vec3(0.42, 0.58, 0.86);
        vec3 colHigh    = vec3(0.18, 0.44, 0.80);
        vec3 colZenith  = vec3(0.11, 0.28, 0.62);

        vec3 sky = mix(colHorizon, colLow, smoothstep(0.0, 0.13, h));
        sky = mix(sky, colMid, smoothstep(0.10, 0.34, h));
        sky = mix(sky, colHigh, smoothstep(0.28, 0.64, h));
        sky = mix(sky, colZenith, smoothstep(0.58, 0.96, h));

        float sunAmt = max(dot(d, uSunDir), 0.0);
        sky += vec3(1.0, 0.66, 0.50) * pow(sunAmt, 4.5) * 0.48;
        sky += vec3(1.0, 0.86, 0.70) * pow(sunAmt, 36.0) * 0.68;
        float disc = smoothstep(0.9985, 0.9993, sunAmt);
        sky = mix(sky, vec3(1.0, 0.96, 0.86), disc);

        if (d.y > 0.02) {
          vec2 uv = d.xz / (d.y + 0.24) * 1.45;
          float n = noise(uv * 2.2) * 0.6 + noise(uv * 4.8 + 3.1) * 0.4;
          float band = smoothstep(0.50, 0.80, n) * smoothstep(0.02, 0.18, d.y) * (1.0 - smoothstep(0.35, 0.78, d.y));
          vec3 cloudCol = mix(vec3(0.68, 0.60, 0.78), vec3(1.0, 0.78, 0.72), pow(sunAmt, 2.0) * 0.75 + 0.25);
          sky = mix(sky, cloudCol, band * 0.40);
        }

        if (d.y < 0.0) {
          sky = mix(colHorizon * 0.82, vec3(0.34, 0.42, 0.56), clamp(-d.y * 5.0, 0.0, 1.0));
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// One-time procedural sky PMREM env map (0 extra draw calls; lifts asphalt sheen, cars & bike chrome)
export function applyWorldEnvMap(renderer, scene) {
  const t0 = performance.now();
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const sunDir = new THREE.Vector3(...WORLD_LIGHTING.sun.dir).normalize();
  envScene.add(createDuskSky(sunDir));
  const rt = pmrem.fromScene(envScene, 0.04);
  scene.environment = rt.texture;
  pmrem.dispose();
  const initMs = +(performance.now() - t0).toFixed(2);
  return { envMap: rt.texture, renderTarget: rt, initMs };
}

// Animated shimmering dusk canal water (1 draw call, self-contained, zero per-frame allocations)
function createCanalWater(sunDir, fogColor, fogNear, fogFar) {
  const geo = new THREE.PlaneGeometry(MAP_HALF_X * 2, CANAL_WATER_HALF * 2 + 0.8, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone().normalize() },
    uFogColor: { value: new THREE.Color(fogColor) },
    uFogNear: { value: fogNear },
    uFogFar: { value: fogFar },
  };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying float vFogDepth;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 mv = viewMatrix * wp;
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec3 vWorldPos;
      varying float vFogDepth;

      void main() {
        vec2 p = vWorldPos.xz;
        float t = uTime;

        float w1 = sin(p.x * 1.15 + t * 1.35 + sin(p.y * 0.85) * 1.2);
        float w2 = cos(p.y * 2.1 - t * 0.95 + p.x * 0.45);
        float w3 = sin((p.x * 2.6 - p.y * 1.9) + t * 2.1);
        float w4 = cos((p.x * 4.3 + p.y * 3.1) + t * 2.8);

        vec3 N = normalize(vec3(
          (w1 * 0.052 + w3 * 0.040 + w4 * 0.022),
          1.0,
          (w2 * 0.060 - w3 * 0.036 + w4 * 0.022)
        ));

        vec3 V = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.8);

        // frame-3 / frame-7 bright dusk blue-teal water reflecting cyan-pink sky
        vec3 deepCol = vec3(0.09, 0.26, 0.44);
        vec3 skyRefl = mix(vec3(0.36, 0.56, 0.82), vec3(0.96, 0.70, 0.66), pow(max(dot(reflect(-V, N), uSunDir), 0.0), 2.4));
        vec3 col = mix(deepCol, skyRefl, clamp(0.28 + fresnel * 0.68, 0.0, 0.92));

        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(dot(N, H), 0.0), 72.0);
        float broadSpec = pow(max(dot(N, H), 0.0), 14.0);
        col += vec3(1.0, 0.88, 0.72) * spec * 1.55;
        col += vec3(0.98, 0.68, 0.58) * broadSpec * 0.30;

        float streak = smoothstep(0.52, 0.95, sin(p.x * 0.7 + t * 1.1 + w2 * 1.6) * 0.5 + 0.5);
        col += vec3(0.28, 0.44, 0.60) * streak * 0.12;

        float underBridge = (1.0 - smoothstep(3.8, 6.2, abs(p.x))) * (1.0 - smoothstep(8.0, 11.0, abs(p.y)));
        col *= mix(1.0, 0.58, underBridge);

        float edge = smoothstep(6.25, 7.05, abs(p.y));
        col = mix(col, vec3(0.76, 0.82, 0.88), edge * (0.25 + 0.12 * sin(p.x * 1.8 + t * 1.7)));

        float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
        col = mix(col, uFogColor, fogFactor);

        gl_FragColor = vec4(col, 0.94);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.renderOrder = 1;
  const t0 = performance.now();
  mesh.onBeforeRender = () => {
    uniforms.uTime.value = (performance.now() - t0) * 0.001;
  };
  return { mesh, mat };
}

export function buildWorld(scene, configOverrides = null) {
  const cfg = configOverrides ? { ...WORLD_CONFIG, ...configOverrides } : WORLD_CONFIG;
  const density = Math.max(0, cfg.propDensity);
  const rng = mulberry32(42069);

  // ---- Sky, Fog & Dusk Lighting ----
  const { fog, sun: sunCfg, hemi: hemiCfg, ambient: ambCfg } = WORLD_LIGHTING;
  scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  scene.background = new THREE.Color(fog.color);

  const sunDir = new THREE.Vector3(...sunCfg.dir).normalize();
  scene.add(createDuskSky(sunDir));

  // Add dusk lights when the host scene doesn't already provide a directional sun
  const hasDirLight = scene.children.some((c) => c.isDirectionalLight);
  if (!hasDirLight) {
    const hemi = new THREE.HemisphereLight(hemiCfg.sky, hemiCfg.ground, hemiCfg.intensity);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(sunCfg.color, sunCfg.intensity);
    sun.position.copy(sunDir).multiplyScalar(95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -52;
    sun.shadow.camera.right = 52;
    sun.shadow.camera.top = 52;
    sun.shadow.camera.bottom = -52;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 210;
    sun.shadow.bias = -0.0007;
    scene.add(sun);

    const amb = new THREE.AmbientLight(ambCfg.color, ambCfg.intensity);
    scene.add(amb);
  }

  // ---- Live Seam Data Structures ----
  const colliders = []; // [{ minX, maxX, minZ, maxZ, top, type }]
  const bins = [];      // [{ x, z, top }] (landable bin footprints)
  const binBoxes = [];  // exact AABBs for groundAt(x, z) including dumpster
  const climbOut = [];  // [{ x, z, side }]

  function addCollider(minX, maxX, minZ, maxZ, top, type = 'wall') {
    colliders.push({
      minX: +minX.toFixed(3),
      maxX: +maxX.toFixed(3),
      minZ: +minZ.toFixed(3),
      maxZ: +maxZ.toFixed(3),
      top: +top.toFixed(3),
      type,
    });
  }

  // ---- Static Geometry Batcher (keeps draw calls << 150) ----
  const buckets = new Map();
  const materials = {};
  const shadowCasterBuckets = new Set();

  function regMat(name, material, castsShadow = true) {
    materials[name] = material;
    buckets.set(name, []);
    if (castsShadow) shadowCasterBuckets.add(name);
    return material;
  }

  function pushGeo(bucketName, geo, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.clone();
    if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
    if (rx !== 0) g.rotateX(rx);
    if (ry !== 0) g.rotateY(ry);
    if (rz !== 0) g.rotateZ(rz);
    if (px !== 0 || py !== 0 || pz !== 0) g.translate(px, py, pz);
    buckets.get(bucketName).push(g);
  }

  const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
  const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  const UNIT_CYL_HI = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);

  function addBox(bucketName, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    pushGeo(bucketName, UNIT_BOX, x, y, z, rx, ry, rz, w, h, d);
  }

  function addCyl(bucketName, rTop, rBot, h, x, y, z, rx = 0, ry = 0, rz = 0, segs = 10) {
    if (rTop === rBot && segs === 10) {
      pushGeo(bucketName, UNIT_CYL, x, y, z, rx, ry, rz, rTop * 2, h, rTop * 2);
    } else if (rTop === rBot && segs === 14) {
      pushGeo(bucketName, UNIT_CYL_HI, x, y, z, rx, ry, rz, rTop * 2, h, rTop * 2);
    } else {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
      if (rx) g.rotateX(rx);
      if (ry) g.rotateY(ry);
      if (rz) g.rotateZ(rz);
      g.translate(x, y, z);
      buckets.get(bucketName).push(g);
    }
  }

  // ---- Materials ----
  // 220 m road / 9 m dash pitch => repeat.x ≈ 24.5 (3 m white dashes every 9 m, frame-2)
  const asphaltTex = makeAsphaltTexture(true);
  asphaltTex.repeat.set(24.5, 1);
  const asphaltPlainTex = makeAsphaltTexture(false);
  asphaltPlainTex.repeat.set(6, 4);
  // ~1.5 m sidewalk expansion joints (4 joints per tile -> 1 tile = 6 m -> 220/6 ≈ 36.7)
  const concreteTex = makeConcreteTexture('#c6c3bb', 64);
  concreteTex.repeat.set(36, 1);
  const concreteBridgeTex = makeConcreteTexture('#bab7ae', 0);
  const grassTex = makeGrassTexture();

  regMat('grass', new THREE.MeshStandardMaterial({ map: grassTex, color: 0xb8c8b6, roughness: 0.96 }), false);
  regMat('canalBed', new THREE.MeshStandardMaterial({ color: 0x1c3642, roughness: 1.0 }), false);
  regMat('bankSlope', new THREE.MeshStandardMaterial({ map: concreteBridgeTex, color: 0xb2afa6, roughness: 0.92 }), false);
  regMat('wetConcrete', new THREE.MeshStandardMaterial({ color: 0x5c686b, roughness: 0.82 }), false);
  regMat('asphaltEW', new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.68, metalness: 0.06 }), false);
  regMat('asphaltPlain', new THREE.MeshStandardMaterial({ map: asphaltPlainTex, roughness: 0.72, metalness: 0.05 }), false);
  regMat('sidewalk', new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.88 }), false);
  regMat('curbStrip', new THREE.MeshStandardMaterial({ color: 0xdad9d4, roughness: 0.84 }), false);
  regMat('bridgeConcrete', new THREE.MeshStandardMaterial({ map: concreteBridgeTex, color: 0xc8c5bd, roughness: 0.86 }), true);
  regMat('bridgeSteel', new THREE.MeshStandardMaterial({ color: 0x556475, roughness: 0.58, metalness: 0.42 }), true);
  regMat('bridgeRail', new THREE.MeshStandardMaterial({ color: 0x778694, roughness: 0.48, metalness: 0.45 }), true);
  regMat('bridgeRailCap', new THREE.MeshStandardMaterial({ color: 0xdce1e8, roughness: 0.42, metalness: 0.25 }), true);
  regMat('safetyYellow', new THREE.MeshStandardMaterial({ color: 0xeec03e, roughness: 0.48, metalness: 0.2 }), true);

  regMat('binGreen', new THREE.MeshStandardMaterial({ color: 0x3b764e, roughness: 0.52, metalness: 0.14 }), true);
  regMat('binBlue', new THREE.MeshStandardMaterial({ color: 0x34649c, roughness: 0.52, metalness: 0.14 }), true);
  // High-contrast pale bin lid (+60 luma over body & road for instant hop-target readability — frame-6)
  regMat('binLid', new THREE.MeshStandardMaterial({ color: 0xd4dae2, roughness: 0.50, metalness: 0.12 }), true);
  regMat('dumpster', new THREE.MeshStandardMaterial({ color: 0x4b6149, roughness: 0.68, metalness: 0.30 }), true);

  regMat('poleMetal', new THREE.MeshStandardMaterial({ color: 0x4c5664, roughness: 0.52, metalness: 0.55 }), true);
  regMat('wireMat', new THREE.MeshStandardMaterial({ color: 0x262c36, roughness: 0.85, metalness: 0.2 }), false);
  regMat('lampEmissive', new THREE.MeshStandardMaterial({
    color: 0xffdc9c, emissive: 0xffb252, emissiveIntensity: 3.0, roughness: 0.3,
  }), false);

  const carPalette = [
    ['carTeal', 0x2b6b73],
    ['carCoral', 0xb84a3e],
    ['carCream', 0xc9bfa8],
    ['carSlate', 0x3c4d69],
    ['carBurgundy', 0x6e2834],
  ];
  for (const [k, hex] of carPalette) {
    regMat(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.34, metalness: 0.42 }), true);
  }
  regMat('carGlass', new THREE.MeshStandardMaterial({ color: 0x161f2e, roughness: 0.15, metalness: 0.75 }), false);
  regMat('carTire', new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.92 }), true);
  regMat('carTrim', new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.35, metalness: 0.75 }), false);
  regMat('carHeadlight', new THREE.MeshStandardMaterial({ color: 0xffe9ba, emissive: 0xffd080, emissiveIntensity: 1.6 }), false);
  regMat('carTaillight', new THREE.MeshStandardMaterial({ color: 0xc92a2a, emissive: 0xff2b2b, emissiveIntensity: 1.4 }), false);

  const stuccoPalette = [
    ['stuccoPeach', 0xc89a7e],
    ['stuccoCream', 0xc7bea9],
    ['stuccoSage', 0x8ea395],
    ['stuccoBlue', 0x8092a6],
  ];
  for (const [k, hex] of stuccoPalette) {
    regMat(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92 }), true);
  }
  regMat('roofDark', new THREE.MeshStandardMaterial({ color: 0x35373e, roughness: 0.92 }), true);
  regMat('roofClay', new THREE.MeshStandardMaterial({ color: 0x7c4637, roughness: 0.88 }), true);
  regMat('houseTrim', new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.85 }), true);
  regMat('winLit', new THREE.MeshStandardMaterial({
    color: 0xffe2a8, emissive: 0xffb84d, emissiveIntensity: 2.0, roughness: 0.25,
  }), false);
  regMat('winDark', new THREE.MeshStandardMaterial({ color: 0x1b2336, roughness: 0.3, metalness: 0.4 }), false);
  regMat('acMetal', new THREE.MeshStandardMaterial({ color: 0x6b7075, roughness: 0.65, metalness: 0.4 }), true);
  regMat('fenceWood', new THREE.MeshStandardMaterial({ color: 0x7d6552, roughness: 0.92 }), true);
  regMat('hedge', new THREE.MeshStandardMaterial({ color: 0x264429, roughness: 0.95 }), true);
  regMat('palmTrunk', new THREE.MeshStandardMaterial({ color: 0x6b5644, roughness: 0.95 }), true);
  regMat('palmFrond', new THREE.MeshStandardMaterial({ color: 0x2c4e2e, roughness: 0.85, side: THREE.DoubleSide }), true);
  regMat('oakTrunk', new THREE.MeshStandardMaterial({ color: 0x4a3829, roughness: 0.96 }), true);
  regMat('oakLeaf', new THREE.MeshStandardMaterial({ color: 0x27452a, roughness: 0.92 }), true);

  // =========================================================================
  // 1. TERRAIN, CANAL BED & SLOPING BANKS
  // =========================================================================
  addBox('canalBed', MAP_HALF_X * 2, 0.4, CANAL_BED_HALF * 2 + 2, 0, CANAL_BED_Y - 0.2, 0);

  const slopeRun = BANK_TOP_Z - CANAL_BED_HALF; // 5.0 m
  const slopeRise = GROUND_Y - CANAL_BED_Y;     // 3.2 m
  const slopeLen = Math.hypot(slopeRun, slopeRise);
  const slopeAngle = Math.atan2(slopeRise, slopeRun);

  for (const s of [1, -1]) {
    addBox(
      'bankSlope',
      MAP_HALF_X * 2,
      0.35,
      slopeLen,
      0,
      (GROUND_Y + CANAL_BED_Y) * 0.5 - 0.14,
      s * (CANAL_BED_HALF + slopeRun * 0.5),
      s * -slopeAngle
    );
    addBox('bridgeConcrete', MAP_HALF_X * 2, 0.24, 0.65, 0, GROUND_Y - 0.08, s * (BANK_TOP_Z + 0.15));

    const bankDepth = MAP_HALF_Z - BANK_TOP_Z;
    const plane = new THREE.PlaneGeometry(MAP_HALF_X * 2, bankDepth);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, GROUND_Y, s * (BANK_TOP_Z + bankDepth * 0.5));
    buckets.get('grass').push(plane);
  }

  const { mesh: waterMesh, mat: waterMat } = createCanalWater(sunDir, fog.color, fog.near, fog.far);
  scene.add(waterMesh);

  // =========================================================================
  // 2. TWO CLIMB-OUT SPOTS (Steps + Yellow Steel Ladders into the Water)
  // =========================================================================
  function addClimbOut(cx, side) {
    const steps = 8;
    const width = 2.6;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const sy = -0.3 + t * (GROUND_Y - (-0.3));
      const sz = side * (6.75 + t * (BANK_TOP_Z - 6.75));
      addBox('bridgeConcrete', width, 0.28, 0.62, cx, sy - 0.1, sz);
    }
    for (const dx of [-width * 0.5 - 0.14, width * 0.5 + 0.14]) {
      addBox('bridgeConcrete', 0.28, 0.55, 4.4, cx + dx, 0.72, side * 8.7, side * -slopeAngle);
      addCyl('safetyYellow', 0.045, 0.045, 4.4, cx + dx, 1.32, side * 8.65, side * (Math.PI / 2 - slopeAngle));
      addCyl('safetyYellow', 0.045, 0.045, 1.05, cx + dx, GROUND_Y + 0.48, side * (BANK_TOP_Z + 0.1));
      addCyl('safetyYellow', 0.045, 0.045, 1.35, cx + dx, 0.45, side * 6.8);
    }
    for (let r = 0; r < 4; r++) {
      addCyl('safetyYellow', 0.025, 0.025, width, cx, -0.15 + r * 0.32, side * 6.8, 0, 0, Math.PI / 2);
    }
    climbOut.push({ x: cx, z: +(side * 7.25).toFixed(2), side });
  }
  addClimbOut(16, 1);
  addClimbOut(-16, -1);

  // =========================================================================
  // 3. STREETS, SIDEWALKS & CURBS (Both Banks + Bridge Avenue)
  // =========================================================================
  for (const s of [1, -1]) {
    const zc = s * STREET_Z;
    const roadPlane = new THREE.PlaneGeometry(MAP_HALF_X * 2, STREET_HALF_W * 2);
    roadPlane.rotateX(-Math.PI / 2);
    roadPlane.translate(0, GROUND_Y + 0.015, zc);
    buckets.get('asphaltEW').push(roadPlane);

    const innerZ = s * INNER_WALK_Z;
    const outerZ = s * OUTER_WALK_Z;

    for (const [x0, x1] of [[-MAP_HALF_X, -DECK_HALF_X], [DECK_HALF_X, MAP_HALF_X]]) {
      const w = x1 - x0;
      const mx = (x0 + x1) * 0.5;
      addBox('sidewalk', w, 0.12, 2.2, mx, GROUND_Y + 0.06, innerZ);
      addBox('sidewalk', w, 0.12, 2.5, mx, GROUND_Y + 0.06, outerZ);
      // Pale curb edge strips along street frontage (near-field speed cue — frame-5)
      addBox('curbStrip', w, 0.13, 0.18, mx, GROUND_Y + 0.065, s * (STREET_Z - STREET_HALF_W - 0.09));
      addBox('curbStrip', w, 0.13, 0.18, mx, GROUND_Y + 0.065, s * (STREET_Z + STREET_HALF_W + 0.09));
    }

    const aveLen = MAP_HALF_Z - (STREET_Z + STREET_HALF_W);
    const aveZ = s * (STREET_Z + STREET_HALF_W + aveLen * 0.5);
    const avePlane = new THREE.PlaneGeometry(DECK_HALF_X * 2 - 1.2, aveLen);
    avePlane.rotateX(-Math.PI / 2);
    avePlane.translate(0, GROUND_Y + 0.014, aveZ);
    buckets.get('asphaltPlain').push(avePlane);
  }

  // =========================================================================
  // 4. THE BRIDGE (Deck, Underside Girders, Piers, Ramps, Low Rails)
  // =========================================================================
  {
    const deckLen = DECK_HALF_Z * 2;
    const deckW = DECK_HALF_X * 2;

    addBox('bridgeConcrete', deckW, 0.42, deckLen, 0, DECK_Y - 0.21, 0);
    const deckAsphalt = new THREE.PlaneGeometry(deckW - 1.5, deckLen);
    deckAsphalt.rotateX(-Math.PI / 2);
    deckAsphalt.translate(0, DECK_Y + 0.012, 0);
    buckets.get('asphaltPlain').push(deckAsphalt);
    for (let z = -9; z <= 9; z += 4.5) {
      addBox('bridgeRailCap', 0.16, 0.02, 2.4, 0, DECK_Y + 0.015, z);
    }
    for (const sx of [-1, 1]) {
      addBox('sidewalk', 0.85, 0.14, deckLen, sx * (DECK_HALF_X - 0.425), DECK_Y + 0.07, 0);
    }

    // Underside longitudinal steel I-beams & transverse cross-braces
    for (const gx of [-3.3, -1.1, 1.1, 3.3]) {
      addBox('bridgeSteel', 0.18, 0.56, deckLen + 1.2, gx, DECK_Y - 0.68, 0);
      addBox('bridgeSteel', 0.42, 0.08, deckLen + 1.2, gx, DECK_Y - 0.96, 0);
    }
    for (let z = -9.0; z <= 9.0; z += 3.0) {
      addBox('bridgeSteel', deckW - 1.4, 0.22, 0.22, 0, DECK_Y - 0.72, z);
    }

    // Bridge piers descending into the canal water
    for (const pz of [-6.0, 6.0]) {
      addBox('bridgeConcrete', deckW - 0.8, 0.55, 1.05, 0, DECK_Y - 1.26, pz);
      for (const px of [-3.1, 0.0, 3.1]) {
        const pierH = (DECK_Y - 1.5) - (CANAL_BED_Y - 0.2);
        const pierY = CANAL_BED_Y - 0.2 + pierH * 0.5;
        addCyl('bridgeConcrete', 0.42, 0.48, pierH, px, pierY, pz, 0, 0, 0, 14);
        addCyl('wetConcrete', 0.49, 0.50, 0.75, px, WATER_Y + 0.12, pz, 0, 0, 0, 14);
      }
    }

    // Approach ramps & retaining walls
    const rampRun = RAMP_END_Z - DECK_HALF_Z;
    const rampRise = DECK_Y - GROUND_Y;
    const rampLen = Math.hypot(rampRun, rampRise);
    const rampAngle = Math.atan2(rampRise, rampRun);

    for (const s of [1, -1]) {
      const midZ = s * (DECK_HALF_Z + rampRun * 0.5);
      const midY = (DECK_Y + GROUND_Y) * 0.5;

      addBox('bridgeConcrete', deckW, 0.42, rampLen, 0, midY - 0.21, midZ, s * rampAngle);
      const rPlane = new THREE.PlaneGeometry(deckW - 1.5, rampLen);
      rPlane.rotateX(-Math.PI / 2 + s * rampAngle);
      rPlane.translate(0, midY + 0.015, midZ);
      buckets.get('asphaltPlain').push(rPlane);

      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const tm = (i + 0.5) / segs;
        const zm = s * (DECK_HALF_Z + tm * rampRun);
        const topY = DECK_Y - tm * rampRise;
        const wallH = Math.max(0.25, topY - GROUND_Y);
        addBox('bridgeConcrete', deckW - 0.3, wallH, rampRun / segs + 0.08, 0, GROUND_Y + wallH * 0.5 - 0.1, zm);
      }
      addBox('bridgeConcrete', deckW + 0.6, DECK_Y - GROUND_Y + 1.2, 1.1, 0, GROUND_Y + 0.5, s * (DECK_HALF_Z + 0.4));
    }

    // Low bridge rails (0.62 m above deck, 2 m post rhythm + pale top cap — frame-1)
    for (const sx of [-1, 1]) {
      const rx = sx * (DECK_HALF_X - 0.18);
      addBox('bridgeConcrete', 0.30, 0.24, deckLen, rx, DECK_Y + 0.12, 0);
      addBox('bridgeRailCap', 0.12, 0.08, deckLen, rx, DECK_Y + RAIL_H - 0.04, 0);
      addBox('bridgeRail', 0.07, 0.06, deckLen, rx, DECK_Y + 0.38, 0);
      for (let z = -DECK_HALF_Z; z <= DECK_HALF_Z + 0.01; z += 2.0) {
        addBox('bridgeRail', 0.12, RAIL_H, 0.12, rx, DECK_Y + RAIL_H * 0.5, z);
      }
      for (const s of [1, -1]) {
        const midZ = s * (DECK_HALF_Z + rampRun * 0.5);
        const midY = (DECK_Y + GROUND_Y) * 0.5;
        addBox('bridgeRailCap', 0.12, 0.08, rampLen, rx, midY + RAIL_H - 0.04, midZ, s * rampAngle);
        addBox('bridgeRail', 0.07, 0.06, rampLen, rx, midY + 0.36, midZ, s * rampAngle);
        for (let i = 1; i <= 6; i++) {
          const t = i / 7;
          const pz = s * (DECK_HALF_Z + t * rampRun);
          const py = DECK_Y - t * rampRise;
          addBox('bridgeRail', 0.11, RAIL_H, 0.11, rx, py + RAIL_H * 0.5, pz);
        }
      }
    }
  }

  // =========================================================================
  // 5. TRASH BINS (Hop Line + Singles + Dumpster — ~1.1 m tall)
  // =========================================================================
  function addTrashBin(x, z, baseY, blue = false, yaw = 0) {
    const w = 0.92;
    const d = 0.88;
    const h = 1.1;
    const top = +(baseY + h).toFixed(3);
    const bodyMat = blue ? 'binBlue' : 'binGreen';

    addBox(bodyMat, w * 0.88, h * 0.55, d * 0.88, x, baseY + h * 0.275, z, 0, yaw);
    addBox(bodyMat, w, h * 0.38, d, x, baseY + h * 0.72, z, 0, yaw);
    addBox('binLid', w * 1.05, 0.11, d * 1.05, x, baseY + h - 0.055, z, 0, yaw);
    const hx = x + Math.sin(yaw) * (d * 0.52);
    const hz = z + Math.cos(yaw) * (d * 0.52);
    addBox('binLid', 0.62, 0.05, 0.06, hx, baseY + h - 0.16, hz, 0, yaw);
    addCyl('carTire', 0.11, 0.11, 0.08, x - 0.38, baseY + 0.11, z - 0.36, 0, 0, Math.PI / 2);
    addCyl('carTire', 0.11, 0.11, 0.08, x + 0.38, baseY + 0.11, z - 0.36, 0, 0, Math.PI / 2);

    bins.push({ x, z, top });
    binBoxes.push({ minX: x - 0.52, maxX: x + 0.52, minZ: z - 0.52, maxZ: z + 0.52, top });
  }

  const hopCount = Math.max(1, Math.min(8, Math.round(cfg.hopLineBins)));
  const hopPitch = cfg.hopLinePitch ?? 3.2;
  for (let i = 0; i < hopCount; i++) {
    addTrashBin(-26.5 + i * hopPitch, 22.4, WALK_Y, i % 2 === 1, 0);
  }

  const singleBinSpots = [
    [11.5, 22.4, false, 0],
    [18.5, 33.6, true, Math.PI],
    [-14.0, -22.4, true, Math.PI],
    [12.0, -22.4, false, Math.PI],
    [-28.0, -33.6, false, 0],
  ];
  const singleCount = Math.min(singleBinSpots.length, Math.round(cfg.singleBins * density));
  for (let i = 0; i < singleCount; i++) {
    const [bx, bz, blue, yaw] = singleBinSpots[i];
    addTrashBin(bx, bz, WALK_Y, blue, yaw);
  }

  if (cfg.includeDumpster) {
    const dx = 25.0, dz = 22.3, baseY = WALK_Y;
    const w = 2.1, h = 1.14, d = 1.25;
    const top = +(baseY + h).toFixed(3);
    addBox('dumpster', w, h - 0.1, d, dx, baseY + (h - 0.1) * 0.5, dz);
    for (const rx of [-0.7, 0, 0.7]) {
      addBox('dumpster', 0.1, h - 0.18, d + 0.08, dx + rx, baseY + (h - 0.1) * 0.5, dz);
    }
    for (const sx of [-1, 1]) {
      addBox('bridgeSteel', 0.14, 0.22, 0.55, dx + sx * (w * 0.5 + 0.06), baseY + 0.52, dz);
    }
    addBox('binLid', w * 0.48, 0.1, d * 1.04, dx - w * 0.25, baseY + h - 0.05, dz);
    addBox('binLid', w * 0.48, 0.1, d * 1.04, dx + w * 0.25, baseY + h - 0.05, dz);

    // Register two adjacent footprints so index.html's ±0.52 m bin check covers the full dumpster width
    bins.push({ x: dx - 0.52, z: dz, top }, { x: dx + 0.52, z: dz, top });
    binBoxes.push({ minX: dx - w * 0.52, maxX: dx + w * 0.52, minZ: dz - d * 0.52, maxZ: dz + d * 0.52, top });
  }

  // =========================================================================
  // 6. PARKED CARS (Sculpted body, tapered cabin, glass, lights, wheels)
  // =========================================================================
  function createCarBodyGeo() {
    const shape = new THREE.Shape();
    shape.moveTo(-2.15, 0.34);
    shape.lineTo(-2.12, 0.76);
    shape.lineTo(-1.82, 0.88);
    shape.lineTo(-1.35, 0.90);
    shape.lineTo(1.22, 0.88);
    shape.lineTo(2.05, 0.74);
    shape.lineTo(2.18, 0.52);
    shape.lineTo(2.12, 0.34);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
    geo.translate(0, 0, -0.86);
    return geo;
  }

  function createCarCabinGeo() {
    const shape = new THREE.Shape();
    shape.moveTo(-1.26, 0.86);
    shape.lineTo(-0.82, 1.40);
    shape.lineTo(0.46, 1.41);
    shape.lineTo(1.06, 0.86);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.44, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 });
    geo.translate(0, 0, -0.72);
    return geo;
  }

  const CAR_BODY_GEO = createCarBodyGeo();
  const CAR_CABIN_GEO = createCarCabinGeo();

  function addParkedCar(x, z, yaw, colorBucket) {
    const y = GROUND_Y;
    pushGeo(colorBucket, CAR_BODY_GEO, x, y, z, 0, yaw);
    pushGeo(colorBucket, CAR_CABIN_GEO, x, y, z, 0, yaw);

    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const localToWorld = (lx, ly, lz) => [
      x + lx * cos + lz * sin,
      y + ly,
      z - lx * sin + lz * cos,
    ];

    const [wx, wy, wz] = localToWorld(0.76, 1.14, 0);
    addBox('carGlass', 0.62, 0.44, 1.34, wx, wy, wz, 0, yaw, -0.72);
    const [rx, ry, rz] = localToWorld(-1.02, 1.14, 0);
    addBox('carGlass', 0.54, 0.42, 1.34, rx, ry, rz, 0, yaw, 0.85);
    const [sx, sy, sz] = localToWorld(-0.14, 1.14, 0);
    addBox('carGlass', 1.38, 0.36, 1.50, sx, sy, sz, 0, yaw);

    const [fbx, fby, fbz] = localToWorld(2.14, 0.46, 0);
    addBox('carTrim', 0.14, 0.16, 1.76, fbx, fby, fbz, 0, yaw);
    const [rbx, rby, rbz] = localToWorld(-2.14, 0.46, 0);
    addBox('carTrim', 0.14, 0.16, 1.76, rbx, rby, rbz, 0, yaw);

    for (const side of [-0.62, 0.62]) {
      const [hx, hy, hz] = localToWorld(2.15, 0.64, side);
      addBox('carHeadlight', 0.08, 0.13, 0.32, hx, hy, hz, 0, yaw);
      const [tx, ty, tz] = localToWorld(-2.14, 0.68, side);
      addBox('carTaillight', 0.08, 0.12, 0.34, tx, ty, tz, 0, yaw);
    }

    for (const wxL of [-1.32, 1.32]) {
      for (const wzL of [-0.84, 0.84]) {
        const [px, py, pz] = localToWorld(wxL, 0.34, wzL);
        addCyl('carTire', 0.34, 0.34, 0.24, px, py, pz, Math.PI / 2, yaw, 0, 12);
        const [hx, hy, hz] = localToWorld(wxL, 0.34, wzL + Math.sign(wzL) * 0.03);
        addCyl('carTrim', 0.19, 0.19, 0.22, hx, hy, hz, Math.PI / 2, yaw, 0, 10);
      }
    }

    const halfX = Math.abs(cos) * 2.2 + Math.abs(sin) * 0.94;
    const halfZ = Math.abs(sin) * 2.2 + Math.abs(cos) * 0.94;
    addCollider(x - halfX, x + halfX, z - halfZ, z + halfZ, y + 1.44, 'car');
  }

  const carSpots = [
    [-44, 30.8, 0, 'carTeal'],
    [-18, 30.8, 0, 'carCoral'],
    [15, 30.8, 0, 'carCream'],
    [40, 25.4, Math.PI, 'carSlate'],
    [-34, -25.4, 0, 'carBurgundy'],
    [-11, -30.8, Math.PI, 'carCream'],
    [22, -30.8, Math.PI, 'carTeal'],
    [48, -25.4, 0, 'carCoral'],
  ];
  const carLimit = Math.min(carSpots.length, Math.round(cfg.parkedCarCount * density));
  for (let i = 0; i < carLimit; i++) {
    const [cx, cz, cyaw, col] = carSpots[i];
    addParkedCar(cx, cz, cyaw, col);
  }

  // =========================================================================
  // 7. STREETLIGHTS (Bridge Corners + Both Bank Streets, Emissive + Halos)
  // =========================================================================
  const glowPositions = [];
  function addStreetlight(x, z, baseY, armDX, armDZ, addPoleCollider = true) {
    const poleH = 5.6;
    const armLen = Math.hypot(armDX, armDZ);
    const armYaw = Math.atan2(armDX, armDZ);
    addCyl('poleMetal', 0.07, 0.11, poleH, x, baseY + poleH * 0.5, z);
    addBox('poleMetal', 0.09, 0.09, armLen, x + armDX * 0.5, baseY + poleH - 0.08, z + armDZ * 0.5, 0, armYaw);
    const lx = x + armDX;
    const ly = baseY + poleH - 0.15;
    const lz = z + armDZ;
    addBox('poleMetal', 0.34, 0.12, 0.62, lx, ly + 0.06, lz, 0, armYaw);
    addBox('lampEmissive', 0.28, 0.07, 0.48, lx, ly - 0.02, lz, 0, armYaw);
    glowPositions.push([lx, ly - 0.08, lz]);

    if (addPoleCollider) {
      addCollider(x - 0.14, x + 0.14, z - 0.14, z + 0.14, baseY + poleH, 'wall');
    }
  }

  addStreetlight(-4.45, 10.2, DECK_Y, 1.35, 0, false);
  addStreetlight(4.45, 10.2, DECK_Y, -1.35, 0, false);
  addStreetlight(-4.45, -10.2, DECK_Y, 1.35, 0, false);
  addStreetlight(4.45, -10.2, DECK_Y, -1.35, 0, false);

  for (let x = -84; x <= 84; x += 28) {
    if (Math.abs(x) < 9) continue;
    addStreetlight(x, 22.9, WALK_Y, 0, 1.65);
    addStreetlight(x + 14, 33.4, WALK_Y, 0, -1.65);
    addStreetlight(x, -22.9, WALK_Y, 0, -1.65);
    addStreetlight(x + 14, -33.4, WALK_Y, 0, 1.65);
  }

  // =========================================================================
  // 8. DRESSED HOUSES (Pitched Roofs, Porches, AC Units, Warm Lit Windows)
  // =========================================================================
  function createGableRoofGeo(w, h, d) {
    const shape = new THREE.Shape();
    shape.moveTo(-w * 0.5, 0);
    shape.lineTo(0, h);
    shape.lineTo(w * 0.5, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d * 0.5);
    return geo;
  }

  function addHouse(x, z, facingSign, styleIdx) {
    const twoStory = styleIdx % 3 === 1;
    const w = 10.5 + (styleIdx % 3) * 1.8;
    const d = 8.4 + (styleIdx % 2) * 1.4;
    const h = twoStory ? 6.6 : 3.9;
    const stucco = stuccoPalette[styleIdx % stuccoPalette.length][0];
    const roof = styleIdx % 2 === 0 ? 'roofDark' : 'roofClay';

    addBox(stucco, w, h, d, x, GROUND_Y + h * 0.5, z);
    addBox('bridgeConcrete', w + 0.3, 0.45, d + 0.3, x, GROUND_Y + 0.22, z);

    const roofH = twoStory ? 2.4 : 2.1;
    const roofGeo = createGableRoofGeo(w + 1.1, roofH, d + 1.0);
    roofGeo.translate(x, GROUND_Y + h, z);
    buckets.get(roof).push(roofGeo);
    addBox(stucco, 0.85, 2.2, 0.85, x + w * 0.28, GROUND_Y + h + roofH * 0.65, z - d * 0.15);

    const frontZ = z + facingSign * (d * 0.5);
    const porchD = 2.1;
    const porchW = w * 0.56;
    const porchZ = frontZ + facingSign * (porchD * 0.5);
    addBox('bridgeConcrete', porchW, 0.42, porchD, x, GROUND_Y + 0.21, porchZ);
    addBox(roof, porchW + 0.5, 0.18, porchD + 0.4, x, GROUND_Y + 3.15, porchZ);
    for (const px of [-porchW * 0.44, -porchW * 0.15, porchW * 0.15, porchW * 0.44]) {
      addBox('houseTrim', 0.14, 2.7, 0.14, x + px, GROUND_Y + 1.75, frontZ + facingSign * (porchD - 0.18));
    }
    addBox('fenceWood', 1.05, 2.15, 0.12, x, GROUND_Y + 1.48, frontZ + facingSign * 0.04);

    const floors = twoStory ? [2.1, 4.9] : [2.1];
    for (let f = 0; f < floors.length; f++) {
      const wy = GROUND_Y + floors[f];
      for (const wxOff of [-w * 0.34, w * 0.34, ...(f === 1 ? [0] : [])]) {
        const isLit = rng() < cfg.litWindowRatio;
        addBox('houseTrim', 1.5, 1.35, 0.12, x + wxOff, wy, frontZ + facingSign * 0.05);
        addBox(isLit ? 'winLit' : 'winDark', 1.24, 1.1, 0.14, x + wxOff, wy, frontZ + facingSign * 0.07);
      }
    }

    const acX = x + w * 0.5 + 0.55;
    addBox('bridgeConcrete', 0.95, 0.14, 0.95, acX, GROUND_Y + 0.07, z);
    addBox('acMetal', 0.78, 0.78, 0.78, acX, GROUND_Y + 0.52, z);
    addCyl('binLid', 0.28, 0.28, 0.06, acX, GROUND_Y + 0.92, z);

    addCollider(x - w * 0.5, x + w * 0.5, z - d * 0.5, z + d * 0.5, GROUND_Y + h, 'wall');
  }

  const houseXs = [-76, -56, -36, -17, 17, 37, 57, 77];
  for (let i = 0; i < houseXs.length; i++) {
    addHouse(houseXs[i], 45.5, -1, i);
    addHouse(houseXs[i] + 3, -45.5, 1, i + 3);
  }

  // =========================================================================
  // 9. FENCES & HEDGES
  // =========================================================================
  function addFenceRun(x0, x1, z, h = 1.15) {
    const len = Math.abs(x1 - x0);
    const mx = (x0 + x1) * 0.5;
    addBox('fenceWood', len, h, 0.12, mx, GROUND_Y + h * 0.5, z);
    for (let px = Math.min(x0, x1); px <= Math.max(x0, x1) + 0.01; px += 2.4) {
      addBox('fenceWood', 0.14, h + 0.1, 0.16, px, GROUND_Y + (h + 0.1) * 0.5, z);
    }
    addCollider(Math.min(x0, x1), Math.max(x0, x1), z - 0.12, z + 0.12, GROUND_Y + h, 'wall');
  }

  function addHedge(x, z, w, d, h = 1.05) {
    addBox('hedge', w, h, d, x, GROUND_Y + h * 0.5, z);
    addCollider(x - w * 0.5, x + w * 0.5, z - d * 0.5, z + d * 0.5, GROUND_Y + h, 'wall');
  }

  for (const s of [1, -1]) {
    addFenceRun(-86, -45, s * 36.2, 1.1);
    addFenceRun(-27, -7, s * 36.2, 1.1);
    addFenceRun(7, 27, s * 36.2, 1.1);
    addFenceRun(47, 86, s * 36.2, 1.1);
  }
  const hedgeSpots = [
    [-36, 36.5, 11.5, 0.95],
    [37, 36.5, 11.5, 0.95],
    [-36, -36.5, 11.5, 0.95],
    [37, -36.5, 11.5, 0.95],
  ];
  const hedgeLimit = Math.min(hedgeSpots.length, Math.round(cfg.hedgeCount * density));
  for (let i = 0; i < hedgeLimit; i++) {
    const [hx, hz, hw, hd] = hedgeSpots[i];
    addHedge(hx, hz, hw, hd, 1.05);
  }

  // =========================================================================
  // 10. PALMS & SHADE TREES (Strong Dusk Silhouettes along Canal & Yards)
  // =========================================================================
  function createFrondGeo() {
    const segs = 5;
    const len = 3.1;
    const pos = [];
    const idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const z = t * len;
      const y = Math.sin(t * Math.PI * 0.78) * 0.55 - t * t * 0.85;
      const halfW = Math.sin(t * Math.PI) * 0.42 + (1 - t) * 0.05;
      pos.push(-halfW, y - halfW * 0.25, z);
      pos.push(0, y + 0.06, z);
      pos.push(halfW, y - halfW * 0.25, z);
      if (i < segs) {
        const b = i * 3;
        idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4);
        idx.push(b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  const FROND_GEO = createFrondGeo();
  const OAK_BLOB_GEO = new THREE.IcosahedronGeometry(1.0, 1);

  function addPalmTree(x, z, height = 8.2, leanYaw = 0, leanAmt = 0.7) {
    const segs = 6;
    const segH = height / segs;
    let cx = x, cy = GROUND_Y, cz = z;
    const dx = Math.cos(leanYaw) * leanAmt;
    const dz = Math.sin(leanYaw) * leanAmt;

    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const x0 = x + dx * t0 * t0, y0 = GROUND_Y + t0 * height, z0 = z + dz * t0 * t0;
      const x1 = x + dx * t1 * t1, y1 = GROUND_Y + t1 * height, z1 = z + dz * t1 * t1;
      const rBot = 0.28 - t0 * 0.11;
      const rTop = 0.28 - t1 * 0.11;
      const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5, mz = (z0 + z1) * 0.5;
      const tiltZ = -(x1 - x0) / segH;
      const tiltX = (z1 - z0) / segH;
      addCyl('palmTrunk', rTop, rBot, segH * 1.06, mx, my, mz, tiltX, 0, tiltZ, 7);
      cx = x1; cy = y1; cz = z1;
    }

    const fronds = 8;
    for (let f = 0; f < fronds; f++) {
      const a = (f / fronds) * Math.PI * 2 + (x * 0.37);
      const pitch = (f % 2 === 0) ? -0.15 : 0.18;
      pushGeo('palmFrond', FROND_GEO, cx, cy, cz, pitch, a, 0, 0.95, 0.95, 0.95);
    }

    addCollider(x - 0.28, x + 0.28, z - 0.28, z + 0.28, GROUND_Y + height, 'tree');
  }

  function addShadeTree(x, z, scale = 1.0) {
    const trunkH = 2.6 * scale;
    addCyl('oakTrunk', 0.24 * scale, 0.34 * scale, trunkH, x, GROUND_Y + trunkH * 0.5, z, 0, 0, 0, 8);
    const lobes = [
      [0, 3.6, 0, 2.2, 1.55, 2.1],
      [-1.3, 3.1, 0.7, 1.5, 1.2, 1.5],
      [1.2, 3.2, -0.6, 1.6, 1.25, 1.5],
      [0.3, 4.3, 0.5, 1.45, 1.15, 1.4],
    ];
    for (const [lx, ly, lz, sx, sy, sz] of lobes) {
      pushGeo('oakLeaf', OAK_BLOB_GEO, x + lx * scale, GROUND_Y + ly * scale, z + lz * scale, 0, x, 0, sx * scale, sy * scale, sz * scale);
    }
    addCollider(x - 0.32 * scale, x + 0.32 * scale, z - 0.32 * scale, z + 0.32 * scale, GROUND_Y + trunkH + 2.0, 'tree');
  }

  const palmSpots = [
    [-82, 13.5, 9.0, 0.4, 0.9], [-64, 14.0, 8.2, 1.8, 0.7], [-46, 13.2, 9.4, -0.6, 1.0],
    [-28, 13.8, 8.5, 0.9, 0.8], [-12, 14.5, 9.2, 2.3, 0.9], [11, 14.2, 8.8, -1.1, 0.8],
    [29, 13.5, 9.5, 0.3, 0.9], [48, 14.0, 8.3, 2.1, 0.7], [68, 13.2, 9.1, -0.4, 0.8],
    [-78, -13.8, 8.8, -0.8, 0.8], [-58, -13.4, 9.3, 1.2, 0.9], [-38, -14.0, 8.4, -2.0, 0.7],
    [-22, -13.6, 9.1, 0.5, 0.8], [12, -14.2, 8.9, -1.5, 0.9], [30, -13.5, 9.4, 0.8, 0.8],
    [52, -13.8, 8.6, 2.4, 0.7], [74, -13.4, 9.0, -0.5, 0.8],
  ];
  const palmLimit = Math.min(palmSpots.length, Math.round(cfg.palmCount * density));
  for (let i = 0; i < palmLimit; i++) {
    const [px, pz, h, yaw, lean] = palmSpots[i];
    addPalmTree(px, pz, h, yaw, lean);
  }

  const oakSpots = [
    [-66, 39, 1.1], [-26, 39, 1.0], [27, 39, 1.15], [67, 39, 1.05],
    [-66, -39, 1.05], [-26, -39, 1.1], [27, -39, 1.0], [67, -39, 1.15],
    [-46, 60, 1.35], [10, 62, 1.4], [48, 60, 1.3],
    [-46, -60, 1.3], [-10, -62, 1.4], [48, -60, 1.35],
    [-94, 18, 1.25], [94, -18, 1.25],
  ];
  const oakLimit = Math.min(oakSpots.length, Math.round(cfg.shadeTreeCount * density));
  for (let i = 0; i < oakLimit; i++) {
    const [ox, oz, sc] = oakSpots[i];
    addShadeTree(ox, oz, sc);
  }

  // =========================================================================
  // 10B. MID-LAYER UTILITY POLES + SAGGING WIRES & FAR SKYLINE CARD (frame-1, frame-3, frame-6)
  // =========================================================================
  if (cfg.utilityPoles) {
    const poleXs = [-88, -63, -38, -13, 13, 38, 63, 88];
    const poleH = 8.4;
    const wireSegs = 6;
    const wireSag = 0.72;

    for (const s of [1, -1]) {
      const pz = s * 35.15;
      for (let i = 0; i < poleXs.length; i++) {
        const px = poleXs[i];
        // Wooden utility pole + horizontal crossarm
        addCyl('oakTrunk', 0.11, 0.16, poleH, px, GROUND_Y + poleH * 0.5, pz, 0, 0, 0, 7);
        addBox('oakTrunk', 0.14, 0.14, 2.2, px, GROUND_Y + poleH - 0.55, pz);
        addBox('oakTrunk', 0.12, 0.12, 1.6, px, GROUND_Y + poleH - 1.35, pz);
        addCollider(px - 0.18, px + 0.18, pz - 0.18, pz + 0.18, GROUND_Y + poleH, 'wall');

        // Sagging catenary wires between consecutive poles (merged into wireMat — 1 draw total)
        if (i < poleXs.length - 1) {
          const x0 = px;
          const x1 = poleXs[i + 1];
          const wireAnchors = [
            [GROUND_Y + poleH - 0.5, pz - 0.85],
            [GROUND_Y + poleH - 0.5, pz + 0.85],
            [GROUND_Y + poleH - 1.3, pz],
          ];
          for (const [wy, wz] of wireAnchors) {
            for (let k = 0; k < wireSegs; k++) {
              const t0 = k / wireSegs;
              const t1 = (k + 1) / wireSegs;
              const ax = x0 + (x1 - x0) * t0;
              const bx = x0 + (x1 - x0) * t1;
              const ay = wy - 4 * wireSag * t0 * (1 - t0);
              const by = wy - 4 * wireSag * t1 * (1 - t1);
              const dx = bx - ax;
              const dy = by - ay;
              const segLen = Math.hypot(dx, dy);
              const ang = Math.atan2(dy, dx);
              addBox('wireMat', segLen + 0.04, 0.045, 0.045, (ax + bx) * 0.5, (ay + by) * 0.5, wz, 0, 0, ang);
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // 11. FLUSH MERGED STATIC MESHES + STREETLIGHT GLOW HALOS + SKYLINE CARD
  // =========================================================================
  const worldGroup = new THREE.Group();
  worldGroup.name = 'BunnyHopWorld';
  scene.add(worldGroup);

  if (cfg.skylineCard) {
    // Hazed distant city skyline silhouette along canal & bridge horizons (1 draw — frame-3)
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d');
    const srng = mulberry32(909);
    g.clearRect(0, 0, 512, 128);
    // Soft low coastal horizon band
    g.fillStyle = 'rgba(72, 86, 124, 0.85)';
    g.fillRect(0, 108, 512, 20);
    // Varied distant towers, low-rises & port cranes
    for (let x = 8; x < 504; ) {
      const w = 8 + Math.floor(srng() * 20);
      const cluster = Math.sin((x / 512) * Math.PI) * 0.85 + 0.15;
      const h = Math.floor((14 + srng() * 72) * cluster);
      const shade = 68 + Math.floor(srng() * 28);
      g.fillStyle = `rgba(${shade}, ${shade + 14}, ${shade + 46}, 0.88)`;
      g.fillRect(x, 128 - h, w - 1, h);
      // Tiny spire on tallest towers
      if (h > 58 && srng() < 0.45) {
        g.fillRect(x + Math.floor(w * 0.45), 128 - h - 10, 2, 10);
      }
      x += w + Math.floor(srng() * 5);
    }
    const skyTex = new THREE.CanvasTexture(c);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyCardMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    const cardGeos = [];
    // West & East canal horizons + North & South far-bank horizons
    const placements = [
      [140, 26, -108, 12, 0, Math.PI / 2],
      [140, 26, 108, 12, 0, -Math.PI / 2],
      [190, 24, 0, 11, -78, 0],
      [190, 24, 0, 11, 78, Math.PI],
    ];
    for (const [cw, ch, cx, cy, cz, ry] of placements) {
      const p = new THREE.PlaneGeometry(cw, ch);
      p.rotateY(ry);
      p.translate(cx, cy, cz);
      cardGeos.push(p);
    }
    const mergedCards = mergeGeometries(cardGeos);
    for (const g0 of cardGeos) g0.dispose();
    if (mergedCards) {
      const skylineMesh = new THREE.Mesh(mergedCards, skyCardMat);
      skylineMesh.name = 'world_skyline';
      worldGroup.add(skylineMesh);
    }
  }

  for (const [name, geos] of buckets.entries()) {
    if (!geos.length) continue;
    const merged = mergeGeometries(geos);
    for (let i = 0; i < geos.length; i++) geos[i].dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, materials[name]);
    mesh.name = `world_${name}`;
    mesh.castShadow = shadowCasterBuckets.has(name);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  UNIT_BOX.dispose();
  UNIT_CYL.dispose();
  UNIT_CYL_HI.dispose();
  CAR_BODY_GEO.dispose();
  CAR_CABIN_GEO.dispose();
  FROND_GEO.dispose();
  OAK_BLOB_GEO.dispose();

  {
    const glowTex = makeGlowTexture();
    const pts = new Float32Array(glowPositions.length * 3);
    for (let i = 0; i < glowPositions.length; i++) {
      pts[i * 3] = glowPositions[i][0];
      pts[i * 3 + 1] = glowPositions[i][1];
      pts[i * 3 + 2] = glowPositions[i][2];
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const haloMat = new THREE.PointsMaterial({
      map: glowTex,
      size: 4.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haloPoints = new THREE.Points(haloGeo, haloMat);
    haloPoints.name = 'world_lampHalos';
    worldGroup.add(haloPoints);
  }

  // =========================================================================
  // 12. LIVE SEAM QUERY SURFACE (groundAt, water, climbOutAt)
  // =========================================================================
  const railX = DECK_HALF_X - 0.18;

  function groundAt(x, z) {
    const ax = Math.abs(x);
    const az = Math.abs(z);
    let h = GROUND_Y;

    // Canal bed & sloping banks
    if (az < CANAL_BED_HALF) {
      h = CANAL_BED_Y;
    } else if (az < BANK_TOP_Z) {
      const t = (az - CANAL_BED_HALF) / (BANK_TOP_Z - CANAL_BED_HALF);
      h = CANAL_BED_Y + t * (GROUND_Y - CANAL_BED_Y);
    }

    // Sidewalks along both banks (split at bridge avenue)
    if (ax >= DECK_HALF_X && ax <= MAP_HALF_X) {
      if ((az >= INNER_WALK_Z - 1.1 && az <= INNER_WALK_Z + 1.1) ||
          (az >= OUTER_WALK_Z - 1.25 && az <= OUTER_WALK_Z + 1.25)) {
        h = Math.max(h, WALK_Y);
      }
    }

    // Bridge deck, approach ramps & low bunny-hop rails
    if (ax <= DECK_HALF_X) {
      let deckH = -Infinity;
      if (az <= DECK_HALF_Z) {
        deckH = DECK_Y;
      } else if (az < RAMP_END_Z) {
        const t = (RAMP_END_Z - az) / (RAMP_END_Z - DECK_HALF_Z);
        deckH = GROUND_Y + t * (DECK_Y - GROUND_Y);
      }
      if (deckH > -Infinity) {
        h = Math.max(h, deckH);
        if (Math.abs(ax - railX) < 0.18) {
          h = Math.max(h, deckH + RAIL_H);
        }
      }
    }

    // Landable bin & dumpster lids
    for (let i = 0; i < binBoxes.length; i++) {
      const b = binBoxes[i];
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        h = Math.max(h, b.top);
      }
    }

    return h;
  }

  const water = {
    y: WATER_Y,
    level: WATER_Y,
    bounds: {
      minX: -MAP_HALF_X + 2,
      maxX: MAP_HALF_X - 2,
      minZ: -CANAL_WATER_HALF + 0.3,
      maxZ: CANAL_WATER_HALF - 0.3,
    },
    rect: [-MAP_HALF_X, -CANAL_WATER_HALF, MAP_HALF_X, CANAL_WATER_HALF],
    contains(x, z) {
      const onBridge = Math.abs(x) <= DECK_HALF_X && Math.abs(z) <= DECK_HALF_Z;
      return Math.abs(z) < CANAL_WATER_HALF && !onBridge;
    },
  };

  function climbOutAt(x, z) {
    // Primary climb-out ladders/steps (generous trigger radius from water)
    for (let i = 0; i < climbOut.length; i++) {
      const c = climbOut[i];
      if (Math.abs(x - c.x) < 4.5 && Math.sign(z || c.side) === c.side && Math.abs(z) > 4.6) {
        return { x: c.x, z: c.side * 12.2, heading: c.side > 0 ? 0 : Math.PI };
      }
    }
    // Fallback embankment scramble anywhere along the sloped bank edge (clear of bridge piers)
    if (Math.abs(z) > 6.1 && Math.abs(z) < BANK_TOP_Z && Math.abs(x) > DECK_HALF_X + 0.6) {
      const side = z >= 0 ? 1 : -1;
      return { x, z: side * 12.0, heading: side > 0 ? 0 : Math.PI };
    }
    return null;
  }

  return {
    groundAt,
    surfaces: { groundAt, bins },
    colliders,
    bins,
    water,
    climbOutAt,
    climbOut: climbOut.map(({ x, z }) => ({ x, z })),
    spawn: { x: -32, z: STREET_Z, heading: Math.PI / 2 },
    waterMat,
    config: cfg,
    lighting: WORLD_LIGHTING,
  };
}

export default buildWorld;
