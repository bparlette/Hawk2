// Bunny Hop — World Module (Neon)
// Pure ESM, imports 'three' only. Procedural geometry + canvas/shader materials.
// Exports buildWorld(scene) -> { colliders, surfaces, water, climbOut, spawn }

import * as THREE from 'three';

const MAP_HALF_X = 110; // 220 m length along canal
const MAP_HALF_Z = 80;  // 160 m width across canal

const WATER_Y = 0.0;
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
  g.fillStyle = '#2c2f36';
  g.fillRect(0, 0, 256, 256);

  // Subtle tire-wear bands
  g.fillStyle = 'rgba(18, 20, 26, 0.25)';
  g.fillRect(0, 42, 256, 48);
  g.fillRect(0, 166, 256, 48);

  // Aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const v = 32 + Math.floor(rng() * 32);
    g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    g.fillRect(x, y, 2, 2);
  }

  // Hairline asphalt cracks
  g.strokeStyle = 'rgba(14,16,20,0.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    let x = rng() * 256;
    let y = rng() * 256;
    g.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rng() - 0.5) * 34;
      y += (rng() - 0.5) * 28;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  if (withLines) {
    // Worn yellow dashed center line
    g.fillStyle = 'rgba(218, 178, 72, 0.58)';
    g.fillRect(16, 124, 92, 6);
    g.fillRect(148, 124, 88, 6);
    // Scuff / wear patches over paint
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(44,47,54,${0.35 + rng() * 0.45})`;
      g.fillRect(rng() * 256, 122 + rng() * 10, 4 + rng() * 10, 2 + rng() * 4);
    }
    // Worn white shoulder lines
    g.fillStyle = 'rgba(220, 224, 232, 0.36)';
    g.fillRect(0, 14, 256, 4);
    g.fillRect(0, 238, 256, 4);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = 'rgba(44,47,54,0.6)';
      g.fillRect(rng() * 256, rng() < 0.5 ? 13 : 237, 6 + rng() * 14, 6);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeConcreteTexture(tint = '#8a8986', jointStep = 64) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(202);
  g.fillStyle = tint;
  g.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const a = rng() * 0.08;
    g.fillStyle = rng() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(20,24,30,${a})`;
    g.fillRect(rng() * 256, rng() * 256, 2 + rng() * 3, 2 + rng() * 3);
  }
  // Weathering blotches
  for (let i = 0; i < 22; i++) {
    const gr = g.createRadialGradient(
      rng() * 256, rng() * 256, 2,
      rng() * 256, rng() * 256, 18 + rng() * 26
    );
    gr.addColorStop(0, 'rgba(35,38,44,0.12)');
    gr.addColorStop(1, 'rgba(35,38,44,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  }
  if (jointStep > 0) {
    g.strokeStyle = 'rgba(38,40,46,0.32)';
    g.lineWidth = 2;
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

// Custom dusk sky dome with golden-hour-into-dusk gradient, low sun & wisps
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

        // Deep twilight blue at zenith -> violet-rose -> coral-orange -> warm golden horizon
        vec3 colHorizon = vec3(0.98, 0.58, 0.34);
        vec3 colLow     = vec3(0.86, 0.39, 0.38);
        vec3 colMid     = vec3(0.32, 0.25, 0.48);
        vec3 colHigh    = vec3(0.11, 0.17, 0.36);
        vec3 colZenith  = vec3(0.05, 0.09, 0.22);

        vec3 sky = mix(colHorizon, colLow, smoothstep(0.0, 0.14, h));
        sky = mix(sky, colMid, smoothstep(0.10, 0.34, h));
        sky = mix(sky, colHigh, smoothstep(0.28, 0.62, h));
        sky = mix(sky, colZenith, smoothstep(0.58, 0.96, h));

        // Warm atmospheric scattering toward the low sun
        float sunAmt = max(dot(d, uSunDir), 0.0);
        sky += vec3(1.0, 0.48, 0.22) * pow(sunAmt, 5.0) * 0.55;
        sky += vec3(1.0, 0.78, 0.48) * pow(sunAmt, 42.0) * 0.75;
        // Crisp warm sun disc
        float disc = smoothstep(0.9985, 0.9993, sunAmt);
        sky = mix(sky, vec3(1.0, 0.92, 0.74), disc);

        // Soft dusk cloud wisps lit coral-gold from below
        if (d.y > 0.02) {
          vec2 uv = d.xz / (d.y + 0.24) * 1.45;
          float n = noise(uv * 2.2) * 0.6 + noise(uv * 4.8 + 3.1) * 0.4;
          float band = smoothstep(0.48, 0.78, n) * smoothstep(0.02, 0.18, d.y) * (1.0 - smoothstep(0.35, 0.78, d.y));
          vec3 cloudCol = mix(vec3(0.42, 0.27, 0.44), vec3(1.0, 0.62, 0.38), pow(sunAmt, 2.0) * 0.85 + 0.15);
          sky = mix(sky, cloudCol, band * 0.48);
        }

        // Below horizon dark dusk water-mist blend
        if (d.y < 0.0) {
          sky = mix(colHorizon * 0.65, vec3(0.12, 0.14, 0.22), clamp(-d.y * 5.0, 0.0, 1.0));
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// Animated shimmering dusk canal water (1 draw call, zero per-frame allocations)
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

        // Multi-directional current ripples flowing along -X (down the canal)
        float w1 = sin(p.x * 1.15 + t * 1.35 + sin(p.y * 0.85) * 1.2);
        float w2 = cos(p.y * 2.1 - t * 0.95 + p.x * 0.45);
        float w3 = sin((p.x * 2.6 - p.y * 1.9) + t * 2.1);
        float w4 = cos((p.x * 4.3 + p.y * 3.1) + t * 2.8);

        vec3 N = normalize(vec3(
          (w1 * 0.045 + w3 * 0.035 + w4 * 0.018),
          1.0,
          (w2 * 0.055 - w3 * 0.03 + w4 * 0.018)
        ));

        vec3 V = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);

        // Deep blue-teal water body + dusk sky reflection
        vec3 deepCol = vec3(0.05, 0.14, 0.21);
        vec3 skyRefl = mix(vec3(0.22, 0.29, 0.48), vec3(0.95, 0.52, 0.32), pow(max(dot(reflect(-V, N), uSunDir), 0.0), 3.0));
        vec3 col = mix(deepCol, skyRefl, clamp(0.22 + fresnel * 0.72, 0.0, 0.92));

        // Shimmering sun reflection path down the canal
        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(dot(N, H), 0.0), 96.0);
        float broadSpec = pow(max(dot(N, H), 0.0), 18.0);
        col += vec3(1.0, 0.78, 0.46) * spec * 1.65;
        col += vec3(0.96, 0.48, 0.26) * broadSpec * 0.28;

        // Subtle current streak shimmer
        float streak = smoothstep(0.55, 0.95, sin(p.x * 0.7 + t * 1.1 + w2 * 1.6) * 0.5 + 0.5);
        col += vec3(0.18, 0.28, 0.36) * streak * 0.08;

        // Soft shadow darkening directly beneath the bridge deck
        float underBridge = (1.0 - smoothstep(3.8, 6.2, abs(p.x))) * (1.0 - smoothstep(8.0, 11.0, abs(p.y)));
        col *= mix(1.0, 0.45, underBridge);

        // Subtle bank-edge foam shimmer
        float edge = smoothstep(6.25, 7.05, abs(p.y));
        col = mix(col, vec3(0.62, 0.68, 0.72), edge * (0.22 + 0.12 * sin(p.x * 1.8 + t * 1.7)));

        // Distance fog matching scene.fog
        float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
        col = mix(col, uFogColor, fogFactor);

        gl_FragColor = vec4(col, 0.92);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y;
  mesh.renderOrder = 1;
  // Self-contained animation: no main-loop hooks or per-frame allocations
  const t0 = performance.now();
  mesh.onBeforeRender = () => {
    uniforms.uTime.value = (performance.now() - t0) * 0.001;
  };
  return mesh;
}

export function buildWorld(scene) {
  const rng = mulberry32(42069);

  // ---- Sky, Fog & Dusk Lighting ----
  const fogColor = 0x6b5064;
  const fogNear = 34;
  const fogFar = 138;
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  scene.background = new THREE.Color(fogColor);

  // Sun low in the west-northwest, shining right down the canal for the bridge money shot
  const sunDir = new THREE.Vector3(-0.92, 0.16, -0.35).normalize();
  scene.add(createDuskSky(sunDir));

  // Add dusk lights only if the host scene doesn't already provide a directional sun
  const hasDirLight = scene.children.some((c) => c.isDirectionalLight);
  if (!hasDirLight) {
    const hemi = new THREE.HemisphereLight(0x8aa4e8, 0x4c3d4a, 1.38);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xff9a52, 2.3);
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

    const amb = new THREE.AmbientLight(0x3a4a72, 0.72);
    scene.add(amb);
  }

  // ---- Data Contract Arrays ----
  const colliders = [];
  const surfaces = [];
  const climbOut = [];

  function addCollider(minX, minY, minZ, maxX, maxY, maxZ, type) {
    colliders.push({
      min: [+minX.toFixed(3), +minY.toFixed(3), +minZ.toFixed(3)],
      max: [+maxX.toFixed(3), +maxY.toFixed(3), +maxZ.toFixed(3)],
      type,
    });
  }

  function addSurface(minX, minY, minZ, maxX, maxY, maxZ, type) {
    surfaces.push({
      min: [+minX.toFixed(3), +minY.toFixed(3), +minZ.toFixed(3)],
      max: [+maxX.toFixed(3), +maxY.toFixed(3), +maxZ.toFixed(3)],
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
  const asphaltTex = makeAsphaltTexture(true);
  asphaltTex.repeat.set(22, 1);
  const asphaltPlainTex = makeAsphaltTexture(false);
  asphaltPlainTex.repeat.set(6, 4);
  const concreteTex = makeConcreteTexture('#8f8d88', 64);
  concreteTex.repeat.set(14, 1);
  const concreteBridgeTex = makeConcreteTexture('#7c7a77', 0);
  const grassTex = makeGrassTexture();

  regMat('grass', new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.98 }), false);
  regMat('canalBed', new THREE.MeshStandardMaterial({ color: 0x16262c, roughness: 1.0 }), false);
  regMat('bankSlope', new THREE.MeshStandardMaterial({ map: concreteBridgeTex, color: 0x77736a, roughness: 0.96 }), false);
  regMat('wetConcrete', new THREE.MeshStandardMaterial({ color: 0x3b4442, roughness: 0.88 }), false);
  regMat('asphaltEW', new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92 }), false);
  regMat('asphaltPlain', new THREE.MeshStandardMaterial({ map: asphaltPlainTex, roughness: 0.92 }), false);
  regMat('sidewalk', new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.92 }), false);
  regMat('bridgeConcrete', new THREE.MeshStandardMaterial({ map: concreteBridgeTex, color: 0x8d8982, roughness: 0.9 }), true);
  regMat('bridgeSteel', new THREE.MeshStandardMaterial({ color: 0x38424d, roughness: 0.65, metalness: 0.45 }), true);
  regMat('bridgeRail', new THREE.MeshStandardMaterial({ color: 0x4b565e, roughness: 0.55, metalness: 0.55 }), true);
  regMat('safetyYellow', new THREE.MeshStandardMaterial({ color: 0xe3b130, roughness: 0.5, metalness: 0.2 }), true);

  // Bins & dumpster
  regMat('binGreen', new THREE.MeshStandardMaterial({ color: 0x2f5e3d, roughness: 0.55, metalness: 0.15 }), true);
  regMat('binBlue', new THREE.MeshStandardMaterial({ color: 0x264c7d, roughness: 0.55, metalness: 0.15 }), true);
  regMat('binLid', new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.65, metalness: 0.1 }), true);
  regMat('dumpster', new THREE.MeshStandardMaterial({ color: 0x3d4d3a, roughness: 0.72, metalness: 0.35 }), true);

  // Streetlights
  regMat('poleMetal', new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.55, metalness: 0.6 }), true);
  regMat('lampEmissive', new THREE.MeshStandardMaterial({
    color: 0xffd28c, emissive: 0xffa43c, emissiveIntensity: 3.2, roughness: 0.3,
  }), false);

  // Cars
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

  // Houses, fences, foliage
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
  // Canal bed
  addBox('canalBed', MAP_HALF_X * 2, 0.4, CANAL_BED_HALF * 2 + 2, 0, CANAL_BED_Y - 0.2, 0);

  // Sloping banks on both sides (+Z south, -Z north) from canal bed up to GROUND_Y
  const slopeRun = BANK_TOP_Z - CANAL_BED_HALF; // 5.0 m
  const slopeRise = GROUND_Y - CANAL_BED_Y;     // 3.2 m
  const slopeLen = Math.hypot(slopeRun, slopeRise);
  const slopeAngle = Math.atan2(slopeRise, slopeRun);

  for (const s of [1, -1]) {
    // Bank slope mesh
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
    // Concrete seawall cap lip along top of bank
    addBox('bridgeConcrete', MAP_HALF_X * 2, 0.24, 0.65, 0, GROUND_Y - 0.08, s * (BANK_TOP_Z + 0.15));

    // Main bank ground plane (grass from BANK_TOP_Z to MAP_HALF_Z)
    const bankDepth = MAP_HALF_Z - BANK_TOP_Z;
    const plane = new THREE.PlaneGeometry(MAP_HALF_X * 2, bankDepth);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, GROUND_Y, s * (BANK_TOP_Z + bankDepth * 0.5));
    buckets.get('grass').push(plane);

    // Register main rideable bank ground in surfaces
    const minZ = s > 0 ? BANK_TOP_Z : -MAP_HALF_Z;
    const maxZ = s > 0 ? MAP_HALF_Z : -BANK_TOP_Z;
    addSurface(-MAP_HALF_X, GROUND_Y - 0.1, minZ, MAP_HALF_X, GROUND_Y, maxZ, 'ground');
  }

  // Animated water surface at y = 0
  scene.add(createCanalWater(sunDir, fogColor, fogNear, fogFar));

  // =========================================================================
  // 2. TWO CLIMB-OUT SPOTS (Steps + Yellow Steel Ladders into the Water)
  // =========================================================================
  function addClimbOut(cx, side) {
    // Steps cut into the sloping bank from below water (-0.35) up to GROUND_Y (1.6)
    const steps = 8;
    const width = 2.6;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const sy = -0.3 + t * (GROUND_Y - (-0.3));
      const sz = side * (6.75 + t * (BANK_TOP_Z - 6.75));
      addBox('bridgeConcrete', width, 0.28, 0.62, cx, sy - 0.1, sz);
      if (sy >= 0.0) {
        addSurface(cx - width * 0.5, sy - 0.12, sz - 0.31, cx + width * 0.5, sy + 0.04, sz + 0.31, 'ground');
      }
    }
    // Sloped concrete cheek curbs flanking the steps
    for (const dx of [-width * 0.5 - 0.14, width * 0.5 + 0.14]) {
      addBox('bridgeConcrete', 0.28, 0.55, 4.4, cx + dx, 0.72, side * 8.7, side * -slopeAngle);
      // Yellow painted steel grab-rail / ladder rail extending down into water
      addCyl('safetyYellow', 0.045, 0.045, 4.4, cx + dx, 1.32, side * 8.65, side * (Math.PI / 2 - slopeAngle));
      addCyl('safetyYellow', 0.045, 0.045, 1.05, cx + dx, GROUND_Y + 0.48, side * (BANK_TOP_Z + 0.1));
      addCyl('safetyYellow', 0.045, 0.045, 1.35, cx + dx, 0.45, side * 6.8);
    }
    // Ladder rungs at water edge
    for (let r = 0; r < 4; r++) {
      addCyl('safetyYellow', 0.025, 0.025, width, cx, -0.15 + r * 0.32, side * 6.8, 0, 0, Math.PI / 2);
    }
    climbOut.push({ x: cx, z: +(side * 7.25).toFixed(2) });
  }
  addClimbOut(16, 1);    // South bank, east of bridge
  addClimbOut(-16, -1);  // North bank, west of bridge

  // =========================================================================
  // 3. STREETS, SIDEWALKS & CURBS (Both Banks + Bridge Avenue)
  // =========================================================================
  for (const s of [1, -1]) {
    const zc = s * STREET_Z;
    // Main east-west asphalt road
    const roadPlane = new THREE.PlaneGeometry(MAP_HALF_X * 2, STREET_HALF_W * 2);
    roadPlane.rotateX(-Math.PI / 2);
    roadPlane.translate(0, GROUND_Y + 0.015, zc);
    buckets.get('asphaltEW').push(roadPlane);

    // Canal-side sidewalk (split at bridge approach x in [-4.6, 4.6])
    const innerZ = s * (STREET_Z - STREET_HALF_W - 1.1);
    const outerZ = s * (STREET_Z + STREET_HALF_W + 1.25);

    for (const [x0, x1] of [[-MAP_HALF_X, -DECK_HALF_X], [DECK_HALF_X, MAP_HALF_X]]) {
      const w = x1 - x0;
      const mx = (x0 + x1) * 0.5;
      // Inner sidewalk
      addBox('sidewalk', w, 0.12, 2.2, mx, GROUND_Y + 0.06, innerZ);
      addSurface(x0, GROUND_Y, innerZ - 1.1, x1, WALK_Y, innerZ + 1.1, 'ground');
      // Outer sidewalk
      addBox('sidewalk', w, 0.12, 2.5, mx, GROUND_Y + 0.06, outerZ);
      addSurface(x0, GROUND_Y, outerZ - 1.25, x1, WALK_Y, outerZ + 1.25, 'ground');
    }

    // North-south avenue continuing away from the bridge
    const aveLen = MAP_HALF_Z - (STREET_Z + STREET_HALF_W);
    const aveZ = s * (STREET_Z + STREET_HALF_W + aveLen * 0.5);
    const avePlane = new THREE.PlaneGeometry(DECK_HALF_X * 2 - 1.2, aveLen);
    avePlane.rotateX(-Math.PI / 2);
    avePlane.translate(0, GROUND_Y + 0.014, aveZ);
    buckets.get('asphaltPlain').push(avePlane);
  }

  // =========================================================================
  // 4. THE BRIDGE (The Money Shot — Deck, Underside Girders, Piers, Ramps, Rails)
  // =========================================================================
  {
    const deckLen = DECK_HALF_Z * 2; // 21.2 m flat span over canal
    const deckW = DECK_HALF_X * 2;   // 9.2 m wide

    // Main structural concrete slab
    addBox('bridgeConcrete', deckW, 0.42, deckLen, 0, DECK_Y - 0.21, 0);
    // Rideable asphalt surface on deck
    const deckAsphalt = new THREE.PlaneGeometry(deckW - 1.5, deckLen);
    deckAsphalt.rotateX(-Math.PI / 2);
    deckAsphalt.translate(0, DECK_Y + 0.012, 0);
    buckets.get('asphaltPlain').push(deckAsphalt);
    // Worn yellow center stripe on bridge deck
    for (let z = -9; z <= 9; z += 3.6) {
      addBox('safetyYellow', 0.16, 0.02, 2.0, 0, DECK_Y + 0.015, z);
    }

    // Raised narrow concrete pedestrian curbs on bridge edges
    for (const sx of [-1, 1]) {
      addBox('sidewalk', 0.85, 0.14, deckLen, sx * (DECK_HALF_X - 0.425), DECK_Y + 0.07, 0);
    }
    // Register flat bridge deck as landable surface
    addSurface(-DECK_HALF_X + 0.2, DECK_Y - 0.3, -DECK_HALF_Z, DECK_HALF_X - 0.2, DECK_Y, DECK_HALF_Z, 'deck');

    // ---- Underside structure: 4 deep longitudinal steel I-beams + cross-bracing ----
    for (const gx of [-3.3, -1.1, 1.1, 3.3]) {
      // I-beam web
      addBox('bridgeSteel', 0.18, 0.56, deckLen + 1.2, gx, DECK_Y - 0.68, 0);
      // Bottom flange
      addBox('bridgeSteel', 0.42, 0.08, deckLen + 1.2, gx, DECK_Y - 0.96, 0);
    }
    // Transverse cross-beams & diagonal braces underneath
    for (let z = -9.0; z <= 9.0; z += 3.0) {
      addBox('bridgeSteel', deckW - 1.4, 0.22, 0.22, 0, DECK_Y - 0.72, z);
    }

    // ---- Bridge piers / posts descending into the canal water ----
    for (const pz of [-6.0, 6.0]) {
      // Heavy transverse concrete pier cap beam supporting the girders
      addBox('bridgeConcrete', deckW - 0.8, 0.55, 1.05, 0, DECK_Y - 1.26, pz);
      for (const px of [-3.1, 0.0, 3.1]) {
        const pierH = (DECK_Y - 1.5) - (CANAL_BED_Y - 0.2); // from bed up to cap
        const pierY = CANAL_BED_Y - 0.2 + pierH * 0.5;
        addCyl('bridgeConcrete', 0.42, 0.48, pierH, px, pierY, pz, 0, 0, 0, 14);
        // Dark wet-concrete / algae waterline collar right at y = 0
        addCyl('wetConcrete', 0.49, 0.50, 0.75, px, WATER_Y + 0.12, pz, 0, 0, 0, 14);
        // Pier collider (for swimmers or low-flying bikes)
        addCollider(px - 0.48, CANAL_BED_Y, pz - 0.48, px + 0.48, DECK_Y - 1.0, pz + 0.48, 'wall');
      }
    }

    // ---- Approach Ramps + Concrete Abutments + Wing Walls ----
    const rampRun = RAMP_END_Z - DECK_HALF_Z; // 13.0 m
    const rampRise = DECK_Y - GROUND_Y;       // 2.4 m
    const rampLen = Math.hypot(rampRun, rampRise);
    const rampAngle = Math.atan2(rampRise, rampRun);

    for (const s of [1, -1]) {
      const midZ = s * (DECK_HALF_Z + rampRun * 0.5);
      const midY = (DECK_Y + GROUND_Y) * 0.5;

      // Solid ramp deck slab
      addBox('bridgeConcrete', deckW, 0.42, rampLen, 0, midY - 0.21, midZ, s * rampAngle);
      // Ramp asphalt top
      const rPlane = new THREE.PlaneGeometry(deckW - 1.5, rampLen);
      rPlane.rotateX(-Math.PI / 2 + s * rampAngle);
      rPlane.translate(0, midY + 0.015, midZ);
      buckets.get('asphaltPlain').push(rPlane);

      // Concrete retaining side walls under the ramps (solid feel, no floating slab)
      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;
        const tm = (t0 + t1) * 0.5;
        const z0 = s * (DECK_HALF_Z + t0 * rampRun);
        const z1 = s * (DECK_HALF_Z + t1 * rampRun);
        const zm = (z0 + z1) * 0.5;
        const topY = DECK_Y - tm * rampRise;
        const wallH = Math.max(0.25, topY - GROUND_Y);
        addBox('bridgeConcrete', deckW - 0.3, wallH, rampRun / segs + 0.08, 0, GROUND_Y + wallH * 0.5 - 0.1, zm);

        // Stepped rideable ramp surfaces in data contract
        addSurface(
          -DECK_HALF_X + 0.2,
          topY - 0.25,
          Math.min(z0, z1),
          DECK_HALF_X - 0.2,
          topY,
          Math.max(z0, z1),
          'deck'
        );
      }

      // Concrete abutment wall at canal crest
      addBox('bridgeConcrete', deckW + 0.6, DECK_Y - GROUND_Y + 1.2, 1.1, 0, GROUND_Y + 0.5, s * (DECK_HALF_Z + 0.4));
      addCollider(-DECK_HALF_X - 0.3, GROUND_Y, s * (DECK_HALF_Z + 0.4) - 0.55, DECK_HALF_X + 0.3, DECK_Y - 0.35, s * (DECK_HALF_Z + 0.4) + 0.55, 'wall');
    }

    // ---- Low Bridge Rails (clearable by bunny hop: 0.62 m above deck) ----
    for (const sx of [-1, 1]) {
      const rx = sx * (DECK_HALF_X - 0.18);
      // Low concrete parapet curb (0.20 m)
      addBox('bridgeConcrete', 0.28, 0.22, deckLen, rx, DECK_Y + 0.11, 0);
      // Twin horizontal steel rails (mid + top at +0.62 m)
      addBox('bridgeRail', 0.10, 0.08, deckLen, rx, DECK_Y + RAIL_H - 0.04, 0);
      addBox('bridgeRail', 0.07, 0.06, deckLen, rx, DECK_Y + 0.38, 0);
      // Vertical steel rail posts
      for (let z = -DECK_HALF_Z; z <= DECK_HALF_Z + 0.01; z += 2.65) {
        addBox('bridgeRail', 0.12, RAIL_H, 0.12, rx, DECK_Y + RAIL_H * 0.5, z);
      }
      // Flat-span rail collider (exact height: DECK_Y + RAIL_H)
      addCollider(rx - 0.14, DECK_Y, -DECK_HALF_Z, rx + 0.14, DECK_Y + RAIL_H, DECK_HALF_Z, 'rail');

      // Approach ramp rails (tapering down to street)
      for (const s of [1, -1]) {
        const midZ = s * (DECK_HALF_Z + rampRun * 0.5);
        const midY = (DECK_Y + GROUND_Y) * 0.5;
        addBox('bridgeRail', 0.10, 0.08, rampLen, rx, midY + RAIL_H - 0.04, midZ, s * rampAngle);
        addBox('bridgeRail', 0.07, 0.06, rampLen, rx, midY + 0.36, midZ, s * rampAngle);
        for (let i = 1; i <= 4; i++) {
          const t = i / 5;
          const pz = s * (DECK_HALF_Z + t * rampRun);
          const py = DECK_Y - t * rampRise;
          addBox('bridgeRail', 0.11, RAIL_H, 0.11, rx, py + RAIL_H * 0.5, pz);
        }
        // Ramp rail colliders (3 segments per side)
        for (let i = 0; i < 3; i++) {
          const t0 = i / 3;
          const t1 = (i + 1) / 3;
          const z0 = s * (DECK_HALF_Z + t0 * rampRun);
          const z1 = s * (DECK_HALF_Z + t1 * rampRun);
          const yAvg = DECK_Y - ((t0 + t1) * 0.5) * rampRise;
          addCollider(rx - 0.14, yAvg, Math.min(z0, z1), rx + 0.14, yAvg + RAIL_H, Math.max(z0, z1), 'rail');
        }
      }
    }
  }

  // =========================================================================
  // 5. TRASH BINS (6-Bin Hop Line + Singles + One Dumpster — ~1.1 m tall)
  // =========================================================================
  function addTrashBin(x, z, baseY, blue = false, yaw = 0) {
    const w = 0.92;
    const d = 0.88;
    const h = 1.1; // landable platform ~1.1 m tall
    const bodyMat = blue ? 'binBlue' : 'binGreen';

    // Tapered-feel wheeled bin: slightly narrower lower base + upper rim + hinged lid
    addBox(bodyMat, w * 0.88, h * 0.55, d * 0.88, x, baseY + h * 0.275, z, 0, yaw);
    addBox(bodyMat, w, h * 0.38, d, x, baseY + h * 0.72, z, 0, yaw);
    // Molded lid top (exact top at baseY + h)
    addBox('binLid', w * 1.05, 0.11, d * 1.05, x, baseY + h - 0.055, z, 0, yaw);
    // Handle bar + rear axle wheels
    const hx = x + Math.sin(yaw) * (d * 0.52);
    const hz = z + Math.cos(yaw) * (d * 0.52);
    addBox('binLid', 0.62, 0.05, 0.06, hx, baseY + h - 0.16, hz, 0, yaw);
    addCyl('carTire', 0.11, 0.11, 0.08, x - 0.38, baseY + 0.11, z - 0.36, 0, 0, Math.PI / 2);
    addCyl('carTire', 0.11, 0.11, 0.08, x + 0.38, baseY + 0.11, z - 0.36, 0, 0, Math.PI / 2);

    const hw = w * 0.52;
    const hd = d * 0.52;
    addCollider(x - hw, baseY, z - hd, x + hw, baseY + h, z + hd, 'bin');
    addSurface(x - hw, baseY + h - 0.05, z - hd, x + hw, baseY + h, z + hd, 'bin');
  }

  // The Hop Line: 6 bins lined up along the South Bank canal-side sidewalk
  for (let i = 0; i < 6; i++) {
    addTrashBin(-26.5 + i * 3.5, 22.4, WALK_Y, i % 2 === 1, 0);
  }

  // Scattered singles on both banks
  addTrashBin(11.5, 22.4, WALK_Y, false, 0);
  addTrashBin(18.5, 33.6, WALK_Y, true, Math.PI);
  addTrashBin(-14.0, -22.4, WALK_Y, true, Math.PI);
  addTrashBin(12.0, -22.4, WALK_Y, false, Math.PI);
  addTrashBin(-28.0, -33.6, WALK_Y, false, 0);

  // One industrial steel Dumpster (east of bridge on South Bank)
  {
    const dx = 25.0, dz = 22.3, baseY = WALK_Y;
    const w = 2.1, h = 1.14, d = 1.25;
    addBox('dumpster', w, h - 0.1, d, dx, baseY + (h - 0.1) * 0.5, dz);
    // Vertical reinforcement ribs
    for (const rx of [-0.7, 0, 0.7]) {
      addBox('dumpster', 0.1, h - 0.18, d + 0.08, dx + rx, baseY + (h - 0.1) * 0.5, dz);
    }
    // Side fork pockets
    for (const sx of [-1, 1]) {
      addBox('bridgeSteel', 0.14, 0.22, 0.55, dx + sx * (w * 0.5 + 0.06), baseY + 0.52, dz);
    }
    // Twin black plastic lids (flat landable top at baseY + h)
    addBox('binLid', w * 0.48, 0.1, d * 1.04, dx - w * 0.25, baseY + h - 0.05, dz);
    addBox('binLid', w * 0.48, 0.1, d * 1.04, dx + w * 0.25, baseY + h - 0.05, dz);

    addCollider(dx - w * 0.52, baseY, dz - d * 0.52, dx + w * 0.52, baseY + h, dz + d * 0.52, 'bin');
    addSurface(dx - w * 0.52, baseY + h - 0.05, dz - d * 0.52, dx + w * 0.52, baseY + h, dz + d * 0.52, 'bin');
  }

  // =========================================================================
  // 6. PARKED CARS (Shaped: sculpted body, tapered cabin, glass, lights, wheels)
  // =========================================================================
  // Build a stylized sedan profile once (facing +X)
  function createCarBodyGeo() {
    const shape = new THREE.Shape();
    shape.moveTo(-2.15, 0.34);
    shape.lineTo(-2.12, 0.76);  // rear bumper
    shape.lineTo(-1.82, 0.88);  // trunk edge
    shape.lineTo(-1.35, 0.90);  // rear deck
    shape.lineTo(1.22, 0.88);   // beltline
    shape.lineTo(2.05, 0.74);   // sloped hood nose
    shape.lineTo(2.18, 0.52);   // front bumper
    shape.lineTo(2.12, 0.34);   // front valence
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
    geo.translate(0, 0, -0.86);
    return geo;
  }

  function createCarCabinGeo() {
    const shape = new THREE.Shape();
    shape.moveTo(-1.26, 0.86);
    shape.lineTo(-0.82, 1.40);  // rear pillar
    shape.lineTo(0.46, 1.41);   // roofline
    shape.lineTo(1.06, 0.86);   // windshield rake
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

    // Tinted greenhouse glass band (slightly inset/proud on cabin)
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const localToWorld = (lx, ly, lz) => [
      x + lx * cos + lz * sin,
      y + ly,
      z - lx * sin + lz * cos,
    ];

    // Windshield & rear glass panels + side windows
    const [wx, wy, wz] = localToWorld(0.76, 1.14, 0);
    addBox('carGlass', 0.62, 0.44, 1.34, wx, wy, wz, 0, yaw, -0.72);
    const [rx, ry, rz] = localToWorld(-1.02, 1.14, 0);
    addBox('carGlass', 0.54, 0.42, 1.34, rx, ry, rz, 0, yaw, 0.85);
    const [sx, sy, sz] = localToWorld(-0.14, 1.14, 0);
    addBox('carGlass', 1.38, 0.36, 1.50, sx, sy, sz, 0, yaw);

    // Bumpers / trim
    const [fbx, fby, fbz] = localToWorld(2.14, 0.46, 0);
    addBox('carTrim', 0.14, 0.16, 1.76, fbx, fby, fbz, 0, yaw);
    const [rbx, rby, rbz] = localToWorld(-2.14, 0.46, 0);
    addBox('carTrim', 0.14, 0.16, 1.76, rbx, rby, rbz, 0, yaw);

    // Headlights & taillights (subtle dusk glow)
    for (const side of [-0.62, 0.62]) {
      const [hx, hy, hz] = localToWorld(2.15, 0.64, side);
      addBox('carHeadlight', 0.08, 0.13, 0.32, hx, hy, hz, 0, yaw);
      const [tx, ty, tz] = localToWorld(-2.14, 0.68, side);
      addBox('carTaillight', 0.08, 0.12, 0.34, tx, ty, tz, 0, yaw);
    }

    // 4 wheels (rubber tire + alloy hubcap)
    for (const wxL of [-1.32, 1.32]) {
      for (const wzL of [-0.84, 0.84]) {
        const [px, py, pz] = localToWorld(wxL, 0.34, wzL);
        addCyl('carTire', 0.34, 0.34, 0.24, px, py, pz, Math.PI / 2, yaw, 0, 12);
        const [hx, hy, hz] = localToWorld(wxL, 0.34, wzL + Math.sign(wzL) * 0.03);
        addCyl('carTrim', 0.19, 0.19, 0.22, hx, hy, hz, Math.PI / 2, yaw, 0, 10);
      }
    }

    // Exact AABB collider for parked car (axis-aligned for 0 or PI yaw)
    const halfX = Math.abs(cos) * 2.2 + Math.abs(sin) * 0.94;
    const halfZ = Math.abs(sin) * 2.2 + Math.abs(cos) * 0.94;
    addCollider(x - halfX, y, z - halfZ, x + halfX, y + 1.44, z + halfZ, 'car');
  }

  // Parked cars along both banks' curbs
  addParkedCar(-44, 30.8, 0, 'carTeal');
  addParkedCar(-18, 30.8, 0, 'carCoral');
  addParkedCar(15, 30.8, 0, 'carCream');
  addParkedCar(40, 25.4, Math.PI, 'carSlate');
  addParkedCar(-34, -25.4, 0, 'carBurgundy');
  addParkedCar(-11, -30.8, Math.PI, 'carCream');
  addParkedCar(22, -30.8, Math.PI, 'carTeal');
  addParkedCar(48, -25.4, 0, 'carCoral');

  // =========================================================================
  // 7. STREETLIGHTS (Bridge Corners + Both Bank Streets, Emissive + Halos)
  // =========================================================================
  const glowPositions = [];
  function addStreetlight(x, z, baseY, armDX, armDZ, addPoleCollider = true) {
    const poleH = 5.6;
    const armLen = Math.hypot(armDX, armDZ);
    const armYaw = Math.atan2(armDX, armDZ);
    addCyl('poleMetal', 0.07, 0.11, poleH, x, baseY + poleH * 0.5, z);
    // Single-sided cantilevered arm extending over the roadway
    addBox('poleMetal', 0.09, 0.09, armLen, x + armDX * 0.5, baseY + poleH - 0.08, z + armDZ * 0.5, 0, armYaw);
    // Lamp housing + warm sodium emissive bulb at arm tip
    const lx = x + armDX;
    const ly = baseY + poleH - 0.15;
    const lz = z + armDZ;
    addBox('poleMetal', 0.34, 0.12, 0.62, lx, ly + 0.06, lz, 0, armYaw);
    addBox('lampEmissive', 0.28, 0.07, 0.48, lx, ly - 0.02, lz, 0, armYaw);
    glowPositions.push([lx, ly - 0.08, lz]);

    if (addPoleCollider) {
      addCollider(x - 0.14, baseY, z - 0.14, x + 0.14, baseY + poleH, z + 0.14, 'wall');
    }
  }

  // Bridge corner lamps (cantilevered inward over the bridge deck)
  addStreetlight(-4.45, 10.2, DECK_Y, 1.35, 0, false);
  addStreetlight(4.45, 10.2, DECK_Y, -1.35, 0, false);
  addStreetlight(-4.45, -10.2, DECK_Y, 1.35, 0, false);
  addStreetlight(4.45, -10.2, DECK_Y, -1.35, 0, false);

  // Streetlamps along both banks
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

    // Main house volume
    addBox(stucco, w, h, d, x, GROUND_Y + h * 0.5, z);
    // Foundation plinth
    addBox('bridgeConcrete', w + 0.3, 0.45, d + 0.3, x, GROUND_Y + 0.22, z);

    // Pitched gable roof with overhanging eaves
    const roofH = twoStory ? 2.4 : 2.1;
    const roofGeo = createGableRoofGeo(w + 1.1, roofH, d + 1.0);
    roofGeo.translate(x, GROUND_Y + h, z);
    buckets.get(roof).push(roofGeo);
    // Chimney silhouette
    addBox(stucco, 0.85, 2.2, 0.85, x + w * 0.28, GROUND_Y + h + roofH * 0.65, z - d * 0.15);

    // Front porch (facing street: facingSign = -1 for south bank houses facing -Z, +1 for north bank facing +Z)
    const frontZ = z + facingSign * (d * 0.5);
    const porchD = 2.1;
    const porchW = w * 0.56;
    const porchZ = frontZ + facingSign * (porchD * 0.5);
    addBox('bridgeConcrete', porchW, 0.42, porchD, x, GROUND_Y + 0.21, porchZ);
    // Porch roof overhang
    addBox(roof, porchW + 0.5, 0.18, porchD + 0.4, x, GROUND_Y + 3.15, porchZ);
    // Slim porch posts
    for (const px of [-porchW * 0.44, -porchW * 0.15, porchW * 0.15, porchW * 0.44]) {
      addBox('houseTrim', 0.14, 2.7, 0.14, x + px, GROUND_Y + 1.75, frontZ + facingSign * (porchD - 0.18));
    }
    // Front door
    addBox('fenceWood', 1.05, 2.15, 0.12, x, GROUND_Y + 1.48, frontZ + facingSign * 0.04);

    // Windows (front facade — mix of warm dusk-lit and dark unlit)
    const floors = twoStory ? [2.1, 4.9] : [2.1];
    for (let f = 0; f < floors.length; f++) {
      const wy = GROUND_Y + floors[f];
      for (const wxOff of [-w * 0.34, w * 0.34, ...(f === 1 ? [0] : [])]) {
        const isLit = rng() < 0.62;
        addBox('houseTrim', 1.5, 1.35, 0.12, x + wxOff, wy, frontZ + facingSign * 0.05);
        addBox(isLit ? 'winLit' : 'winDark', 1.24, 1.1, 0.14, x + wxOff, wy, frontZ + facingSign * 0.07);
      }
    }

    // Side exterior AC condenser unit on a small concrete pad
    const acX = x + w * 0.5 + 0.55;
    addBox('bridgeConcrete', 0.95, 0.14, 0.95, acX, GROUND_Y + 0.07, z);
    addBox('acMetal', 0.78, 0.78, 0.78, acX, GROUND_Y + 0.52, z);
    addCyl('binLid', 0.28, 0.28, 0.06, acX, GROUND_Y + 0.92, z);

    // House collider
    addCollider(x - w * 0.5, GROUND_Y, z - d * 0.5, x + w * 0.5, GROUND_Y + h, z + d * 0.5, 'wall');
  }

  // Row of dressed houses on South Bank (+Z, facing north toward street/canal) & North Bank (-Z)
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
    addCollider(Math.min(x0, x1), GROUND_Y, z - 0.12, Math.max(x0, x1), GROUND_Y + h, z + 0.12, 'wall');
  }

  function addHedge(x, z, w, d, h = 1.05) {
    addBox('hedge', w, h, d, x, GROUND_Y + h * 0.5, z);
    addCollider(x - w * 0.5, GROUND_Y, z - d * 0.5, x + w * 0.5, GROUND_Y + h, z + d * 0.5, 'wall');
  }

  // Front yard fences & trimmed hedges along both banks
  for (const s of [1, -1]) {
    addFenceRun(-86, -45, s * 36.2, 1.1);
    addFenceRun(-27, -7, s * 36.2, 1.1);
    addFenceRun(7, 27, s * 36.2, 1.1);
    addFenceRun(47, 86, s * 36.2, 1.1);
    addHedge(-36, s * 36.5, 11.5, 0.95, 1.05);
    addHedge(37, s * 36.5, 11.5, 0.95, 1.05);
  }

  // =========================================================================
  // 10. PALMS & SHADE TREES (Strong Dusk Silhouettes along Canal & Yards)
  // =========================================================================
  // Custom arching palm frond blade geometry
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

    // Crown of 8 arching palm fronds
    const fronds = 8;
    for (let f = 0; f < fronds; f++) {
      const a = (f / fronds) * Math.PI * 2 + (x * 0.37);
      const pitch = (f % 2 === 0) ? -0.15 : 0.18;
      pushGeo('palmFrond', FROND_GEO, cx, cy, cz, pitch, a, 0, 0.95, 0.95, 0.95);
    }

    addCollider(x - 0.28, GROUND_Y, z - 0.28, x + 0.28, GROUND_Y + height, z + 0.28, 'tree');
  }

  function addShadeTree(x, z, scale = 1.0) {
    const trunkH = 2.6 * scale;
    addCyl('oakTrunk', 0.24 * scale, 0.34 * scale, trunkH, x, GROUND_Y + trunkH * 0.5, z, 0, 0, 0, 8);
    // Multi-lobe organic canopy
    const lobes = [
      [0, 3.6, 0, 2.2, 1.55, 2.1],
      [-1.3, 3.1, 0.7, 1.5, 1.2, 1.5],
      [1.2, 3.2, -0.6, 1.6, 1.25, 1.5],
      [0.3, 4.3, 0.5, 1.45, 1.15, 1.4],
    ];
    for (const [lx, ly, lz, sx, sy, sz] of lobes) {
      pushGeo('oakLeaf', OAK_BLOB_GEO, x + lx * scale, GROUND_Y + ly * scale, z + lz * scale, 0, x, 0, sx * scale, sy * scale, sz * scale);
    }
    addCollider(x - 0.32 * scale, GROUND_Y, z - 0.32 * scale, x + 0.32 * scale, GROUND_Y + trunkH + 2.0, z + 0.32 * scale, 'tree');
  }

  // Iconic palms lining the canal greenbelt (clear of bridge & climb-out steps)
  const palmSpots = [
    [-82, 13.5, 9.0, 0.4, 0.9], [-64, 14.0, 8.2, 1.8, 0.7], [-46, 13.2, 9.4, -0.6, 1.0],
    [-28, 13.8, 8.5, 0.9, 0.8], [-12, 14.5, 9.2, 2.3, 0.9], [11, 14.2, 8.8, -1.1, 0.8],
    [29, 13.5, 9.5, 0.3, 0.9], [48, 14.0, 8.3, 2.1, 0.7], [68, 13.2, 9.1, -0.4, 0.8],
    [-78, -13.8, 8.8, -0.8, 0.8], [-58, -13.4, 9.3, 1.2, 0.9], [-38, -14.0, 8.4, -2.0, 0.7],
    [-22, -13.6, 9.1, 0.5, 0.8], [12, -14.2, 8.9, -1.5, 0.9], [30, -13.5, 9.4, 0.8, 0.8],
    [52, -13.8, 8.6, 2.4, 0.7], [74, -13.4, 9.0, -0.5, 0.8],
  ];
  for (const [px, pz, h, yaw, lean] of palmSpots) {
    addPalmTree(px, pz, h, yaw, lean);
  }

  // Lush shade trees between houses & in background parks
  const oakSpots = [
    [-66, 39, 1.1], [-26, 39, 1.0], [27, 39, 1.15], [67, 39, 1.05],
    [-66, -39, 1.05], [-26, -39, 1.1], [27, -39, 1.0], [67, -39, 1.15],
    [-46, 60, 1.35], [10, 62, 1.4], [48, 60, 1.3],
    [-46, -60, 1.3], [-10, -62, 1.4], [48, -60, 1.35],
    [-94, 18, 1.25], [94, -18, 1.25],
  ];
  for (const [ox, oz, sc] of oakSpots) {
    addShadeTree(ox, oz, sc);
  }

  // =========================================================================
  // 11. FLUSH MERGED STATIC MESHES + STREETLIGHT GLOW HALOS
  // =========================================================================
  const worldGroup = new THREE.Group();
  worldGroup.name = 'BunnyHopWorld';
  scene.add(worldGroup);

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

  // Dispose temporary prototype geometries
  UNIT_BOX.dispose();
  UNIT_CYL.dispose();
  UNIT_CYL_HI.dispose();
  CAR_BODY_GEO.dispose();
  CAR_CABIN_GEO.dispose();
  FROND_GEO.dispose();
  OAK_BLOB_GEO.dispose();

  // Streetlight additive glow halos as camera-facing point billboards (1 draw call, zero edge-on artifacts)
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

  return {
    colliders,
    surfaces,
    water: {
      level: WATER_Y,
      rect: [-MAP_HALF_X, -CANAL_WATER_HALF, MAP_HALF_X, CANAL_WATER_HALF],
    },
    climbOut,
    spawn: { x: -32, z: 26.8, heading: Math.PI / 2 },
  };
}

export default buildWorld;
