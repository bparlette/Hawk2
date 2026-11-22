// APEX WAKE — Photorealistic Gerstner Ocean Shader, Shared CPU/GPU Wave Physics & Sky Atmosphere
import * as THREE from '../three.module.js';

// ================================================================
// 1. LIGHTING PRESETS (toggleable live)
// ================================================================
export const SKY_PRESETS = {
  tropical: {
    name: 'TROPICAL LATE PM',
    sunDir: new THREE.Vector3(0.42, 0.32, -0.85).normalize(),
    sunColor: new THREE.Color(0xfff1d2),
    sunIntensity: 3.1,
    skyZenith: new THREE.Color(0x0c4b8e),
    skyMid: new THREE.Color(0x3a94d6),
    skyHorizon: new THREE.Color(0xbce6f7),
    sunGlow: new THREE.Color(0xffdfa6),
    fogColor: new THREE.Color(0x9fd7ee),
    waterDeep: new THREE.Color(0x021d34),
    waterShallow: new THREE.Color(0x066f82),
    waterSSS: new THREE.Color(0x1ce8d5),
    hemiSky: 0x8cd2ff,
    hemiGround: 0x0a3848,
    hemiInt: 0.95,
    exposure: 1.12,
  },
  noon: {
    name: 'CARIBBEAN NOON',
    sunDir: new THREE.Vector3(0.26, 0.72, -0.64).normalize(),
    sunColor: new THREE.Color(0xffffff),
    sunIntensity: 3.3,
    skyZenith: new THREE.Color(0x094899),
    skyMid: new THREE.Color(0x2e8be0),
    skyHorizon: new THREE.Color(0xc2ecff),
    sunGlow: new THREE.Color(0xfff9e6),
    fogColor: new THREE.Color(0xb3e3f8),
    waterDeep: new THREE.Color(0x022745),
    waterShallow: new THREE.Color(0x008c99),
    waterSSS: new THREE.Color(0x28ffe8),
    hemiSky: 0xa6dcff,
    hemiGround: 0x0c4f5c,
    hemiInt: 1.05,
    exposure: 1.08,
  },
  sunset: {
    name: 'MIAMI GOLDEN',
    sunDir: new THREE.Vector3(0.28, 0.14, -0.95).normalize(),
    sunColor: new THREE.Color(0xffa95c),
    sunIntensity: 3.2,
    skyZenith: new THREE.Color(0x172b5e),
    skyMid: new THREE.Color(0x884c6e),
    skyHorizon: new THREE.Color(0xffad6b),
    sunGlow: new THREE.Color(0xff8438),
    fogColor: new THREE.Color(0xe59c72),
    waterDeep: new THREE.Color(0x05182d),
    waterShallow: new THREE.Color(0x0c4f66),
    waterSSS: new THREE.Color(0x25c4b8),
    hemiSky: 0xffb384,
    hemiGround: 0x16293d,
    hemiInt: 0.85,
    exposure: 1.15,
  },
};

// ================================================================
// 2. SHARED 6-COMPONENT GERSTNER WAVE SPECTRUM (CPU === GPU)
//    [dirX, dirZ, amplitude(m), wavelength(m), steepness, speedMul]
// ================================================================
export const WAVES = [
  [ 0.88,  0.47, 0.42, 46.0, 0.36, 1.00], // Primary ocean swell
  [-0.52,  0.85, 0.28, 29.0, 0.32, 1.08], // Cross-bay swell
  [ 0.24, -0.97, 0.18, 18.5, 0.28, 1.15], // Wind chop
  [-0.91, -0.41, 0.12, 12.2, 0.25, 1.22], // Secondary cross-chop
  [ 0.62, -0.78, 0.075, 7.6, 0.22, 1.30], // Short surface chop
  [-0.30,  0.95, 0.045, 4.8, 0.18, 1.40], // Fine wavelets
];

const TWO_PI = Math.PI * 2;
const GRAV = 9.81;

// Exact CPU wave sampler matching the vertex shader
export function sampleWave(x, z, t) {
  let y = 0;
  let dx = 0;
  let dz = 0;
  let chop = 0;

  for (let i = 0; i < WAVES.length; i++) {
    const w = WAVES[i];
    const dirX = w[0], dirZ = w[1], amp = w[2], wl = w[3], Q = w[4], sm = w[5];
    const k = TWO_PI / wl;
    const c = Math.sqrt(GRAV / k) * sm;
    const phase = k * (dirX * x + dirZ * z) - c * k * t;
    const s = Math.sin(phase);
    const co = Math.cos(phase);
    y += amp * s;
    const wa = k * amp;
    dx += dirX * wa * co;
    dz += dirZ * wa * co;
    chop += Q * wa * s;
  }

  const nx = -dx;
  const ny = 1.0;
  const nz = -dz;
  const inv = 1.0 / Math.hypot(nx, ny, nz);
  return {
    y,
    nx: nx * inv,
    ny: ny * inv,
    nz: nz * inv,
    slopeX: dx,
    slopeZ: dz,
    chop,
  };
}

// ================================================================
// 3. PROCEDURAL ATMOSPHERIC SKY DOME + VOLUMETRIC-STYLE CLOUD DECK
// ================================================================
const SKY_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunGlow;
uniform float uTime;
varying vec3 vWorldDir;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.06;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float h = clamp(dir.y, 0.0, 1.0);

  // Smooth atmospheric Rayleigh gradient
  vec3 col = mix(uHorizon, uMid, pow(h, 0.42));
  col = mix(col, uZenith, pow(h, 1.15));

  // Mie scattering halo + crisp solar disc
  float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSunGlow * pow(sunCos, 6.0) * 0.42;
  col += uSunGlow * pow(sunCos, 42.0) * 0.85;
  float sunDisc = smoothstep(0.9985, 0.9995, sunCos);
  col += vec3(3.2, 2.9, 2.4) * sunDisc;

  // Soft sunlit tropical cumulus cloud deck
  if (dir.y > 0.015) {
    vec2 cuv = dir.xz / (dir.y + 0.14) * 1.15 + vec2(uTime * 0.008, uTime * 0.004);
    float n1 = fbm(cuv);
    float n2 = fbm(cuv * 2.2 - vec2(uTime * 0.012, 0.0));
    float cloud = smoothstep(0.46, 0.78, n1 * 0.72 + n2 * 0.28);
    cloud *= smoothstep(0.015, 0.18, dir.y) * (1.0 - smoothstep(0.65, 0.98, dir.y) * 0.45);
    // Silver lining near sun + shadowed cloud belly
    vec3 cloudShadow = mix(uMid * 0.72, uHorizon * 0.82, 0.5);
    vec3 cloudLit = mix(vec3(1.0, 0.98, 0.95), uSunGlow * 1.15, 0.42);
    float litAmt = clamp(0.45 + 0.55 * n2 + pow(sunCos, 4.0) * 0.65, 0.0, 1.0);
    vec3 cloudCol = mix(cloudShadow, cloudLit, litAmt);
    col = mix(col, cloudCol, cloud * 0.72);
  }

  // Horizon atmospheric haze band
  float horizFade = exp(-abs(dir.y) * 14.0);
  col = mix(col, mix(uHorizon, uSunGlow, pow(sunCos, 3.0) * 0.4), horizFade * 0.52);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSkySystem(scene, preset = SKY_PRESETS.tropical) {
  const geo = new THREE.SphereGeometry(920, 40, 24);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: preset.sunDir.clone() },
      uZenith: { value: preset.skyZenith.clone() },
      uMid: { value: preset.skyMid.clone() },
      uHorizon: { value: preset.skyHorizon.clone() },
      uSunGlow: { value: preset.sunGlow.clone() },
      uTime: { value: 0 },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Build PMREM cubemap from a dedicated tiny sky scene for glossy PBR reflections
  let envRT = null;

  function updateEnv(renderer, p) {
    mat.uniforms.uSunDir.value.copy(p.sunDir);
    mat.uniforms.uZenith.value.copy(p.skyZenith);
    mat.uniforms.uMid.value.copy(p.skyMid);
    mat.uniforms.uHorizon.value.copy(p.skyHorizon);
    mat.uniforms.uSunGlow.value.copy(p.sunGlow);

    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), mat);
    envScene.add(envSky);
    // Add ocean-colored lower hemisphere bounce for realistic under-hull reflections
    const bounce = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshBasicMaterial({ color: p.waterShallow, side: THREE.DoubleSide })
    );
    bounce.rotation.x = -Math.PI / 2;
    bounce.position.y = -4;
    envScene.add(bounce);

    const gen = new THREE.PMREMGenerator(renderer);
    gen.compileCubemapShader();
    if (envRT) envRT.dispose();
    envRT = gen.fromScene(envScene, 0.02);
    scene.environment = envRT.texture;
    gen.dispose();
  }

  return {
    mesh,
    mat,
    updateEnv,
    update(t, camPos) {
      mat.uniforms.uTime.value = t;
      mesh.position.set(camPos.x, 0, camPos.z);
    },
  };
}

// ================================================================
// 4. PHOTOREALISTIC GERSTNER OCEAN MESH + LIVE V-WAKE FOAM SHADER
// ================================================================
const WAKE_MAX = 44;
const ISLAND_MAX = 6;

const OCEAN_VERT = /* glsl */ `
uniform float uTime;
uniform vec2 uCenter;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveH;
varying float vChop;

const float TWO_PI = 6.28318530718;
const float GRAV = 9.81;

void addGerstner(
  vec2 dir, float amp, float wl, float Q, float speedMul,
  vec2 xz, float distFade,
  inout vec3 disp, inout vec3 tangentX, inout vec3 tangentZ, inout float chopAcc
) {
  float k = TWO_PI / wl;
  float c = sqrt(GRAV / k) * speedMul;
  float a = amp * distFade;
  float phase = k * dot(dir, xz) - c * k * uTime;
  float s = sin(phase);
  float co = cos(phase);

  float qa = Q * a;
  disp.x += dir.x * qa * co;
  disp.y += a * s;
  disp.z += dir.y * qa * co;

  float wa = k * a;
  tangentX += vec3(-dir.x * dir.x * Q * wa * s, dir.x * wa * co, -dir.x * dir.y * Q * wa * s);
  tangentZ += vec3(-dir.x * dir.y * Q * wa * s, dir.y * wa * co, -dir.y * dir.y * Q * wa * s);
  chopAcc += Q * wa * s;
}

void main() {
  // Radial-stretched local grid anchored smoothly to snapped camera center
  vec3 worldPos = vec3(position.x + uCenter.x, 0.0, position.z + uCenter.y);
  float dist = length(position.xz);
  float distFade = 1.0 - smoothstep(260.0, 760.0, dist);

  vec3 disp = vec3(0.0);
  vec3 tX = vec3(1.0, 0.0, 0.0);
  vec3 tZ = vec3(0.0, 0.0, 1.0);
  float chopAcc = 0.0;

  vec2 xz = worldPos.xz;
  addGerstner(vec2( 0.88,  0.47), 0.42, 46.0, 0.36, 1.00, xz, distFade, disp, tX, tZ, chopAcc);
  addGerstner(vec2(-0.52,  0.85), 0.28, 29.0, 0.32, 1.08, xz, distFade, disp, tX, tZ, chopAcc);
  addGerstner(vec2( 0.24, -0.97), 0.18, 18.5, 0.28, 1.15, xz, distFade, disp, tX, tZ, chopAcc);
  addGerstner(vec2(-0.91, -0.41), 0.12, 12.2, 0.25, 1.22, xz, distFade, disp, tX, tZ, chopAcc);
  addGerstner(vec2( 0.62, -0.78), 0.075, 7.6, 0.22, 1.30, xz, distFade, disp, tX, tZ, chopAcc);
  addGerstner(vec2(-0.30,  0.95), 0.045, 4.8, 0.18, 1.40, xz, distFade, disp, tX, tZ, chopAcc);

  worldPos += disp;
  vec3 n = normalize(cross(tZ, tX));

  vWorldPos = worldPos;
  vNormal = n;
  vWaveH = disp.y;
  vChop = chopAcc;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
`;

const OCEAN_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;
uniform vec3 uFogColor;
uniform vec3 uWaterDeep;
uniform vec3 uWaterShallow;
uniform vec3 uWaterSSS;
uniform vec4 uWake[${WAKE_MAX}];        // xy = world xz, z = age (0..1), w = width/strength
uniform vec4 uIslands[${ISLAND_MAX}];   // xy = world xz, z = beach radius, w = active

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveH;
varying float vChop;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = m * p * 2.12;
    a *= 0.5;
  }
  return v;
}

// Analytical multi-octave capillary & micro-ripple normal perturbation
vec3 detailNormal(vec2 p, float dist) {
  float fade = 1.0 - smoothstep(35.0, 260.0, dist);
  if (fade < 0.01) return vec3(0.0, 1.0, 0.0);

  vec2 p1 = p * 0.42 + vec2(uTime * 0.72, uTime * 0.46);
  vec2 p2 = p * 0.86 + vec2(-uTime * 0.95, uTime * 0.68);
  vec2 p3 = p * 2.15 + vec2(uTime * 1.45, -uTime * 1.18);
  vec2 p4 = p * 4.80 + vec2(-uTime * 2.10, -uTime * 1.65);

  float e = 0.14;
  float h0 = vnoise(p1) * 0.44 + vnoise(p2) * 0.28 + vnoise(p3) * 0.18 + vnoise(p4) * 0.10;
  float hx = vnoise(p1 + vec2(e, 0.0)) * 0.44 + vnoise(p2 + vec2(e, 0.0)) * 0.28
           + vnoise(p3 + vec2(e * 1.4, 0.0)) * 0.18 + vnoise(p4 + vec2(e * 1.8, 0.0)) * 0.10;
  float hz = vnoise(p1 + vec2(0.0, e)) * 0.44 + vnoise(p2 + vec2(0.0, e)) * 0.28
           + vnoise(p3 + vec2(0.0, e * 1.4)) * 0.18 + vnoise(p4 + vec2(0.0, e * 1.8)) * 0.10;

  float strength = 0.22 * fade;
  return normalize(vec3((h0 - hx) * strength / e, 1.0, (h0 - hz) * strength / e));
}

vec3 sampleSky(vec3 dir, vec3 sunDir) {
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyMid, pow(h, 0.45));
  col = mix(col, uSkyZenith, pow(h, 1.2));
  float sunCos = max(dot(dir, sunDir), 0.0);
  col += uSunGlow * pow(sunCos, 8.0) * 0.45;
  col += uSunColor * pow(sunCos, 96.0) * 1.3;
  return col;
}

void main() {
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 0.001);
  vec3 L = normalize(uSunDir);

  // Combine Gerstner macro-normal with high-frequency micro-ripples
  vec3 dn = detailNormal(vWorldPos.xz, dist);
  vec3 N = normalize(vec3(vNormal.x + dn.x, vNormal.y, vNormal.z + dn.z));

  // ---------- UNDERWATER VIEW LOOKING UP: AUTHENTIC SNELL'S WINDOW ----------
  if (!gl_FrontFacing) {
    vec3 Nu = -N;
    float cosTheta = max(dot(Nu, V), 0.0);
    // Snell's critical angle for water->air (~48.6 deg -> cos ~ 0.66)
    float snellWin = smoothstep(0.56, 0.78, cosTheta);
    vec3 refrDir = normalize(vec3(-V.x * 1.33, max(0.08, -V.y), -V.z * 1.33) + dn * 0.45);
    vec3 skyUp = sampleSky(refrDir, L) * 1.15;
    float sunGlint = pow(max(dot(refrDir, L), 0.0), 48.0) * 2.2;
    vec3 tirCol = mix(vec3(0.02, 0.24, 0.36), vec3(0.08, 0.56, 0.68), pow(1.0 - cosTheta, 1.8));
    vec3 underCol = mix(tirCol, skyUp + uSunColor * sunGlint, snellWin);
    float fogAmt = 1.0 - exp(-dist * 0.026);
    underCol = mix(underCol, vec3(0.02, 0.28, 0.42), clamp(fogAmt, 0.0, 0.96));
    gl_FragColor = vec4(underCol, 1.0);
    return;
  }

  // Evaluate live jet-ski V-wake turbulence & aerated trail
  float wakeFoam = 0.0;
  float wakeAerate = 0.0;
  if (dist < 170.0) {
    float foamNoise = fbm3(vWorldPos.xz * 0.65 + vec2(uTime * 0.45, -uTime * 0.35));
    for (int i = 0; i < ${WAKE_MAX}; i++) {
      vec4 wk = uWake[i];
      if (wk.w <= 0.001) continue;
      float age = wk.z; // 0 = fresh, 1 = faded
      float rad = mix(1.05, 5.8, age) * wk.w;
      float d = length(vWorldPos.xz - wk.xy);
      if (d < rad * 1.45) {
        float life = (1.0 - age) * (1.0 - age);
        // Hollow double V-edge ribbon + frothy aerated core
        float edgeDist = abs(d - rad * 0.68) / max(rad * 0.42, 0.25);
        float ribbon = exp(-edgeDist * edgeDist * 1.7) * life;
        float core = smoothstep(rad * 0.95, 0.0, d) * life;
        wakeFoam = max(wakeFoam, (ribbon * 0.92 + core * 0.72) * smoothstep(0.24, 0.76, foamNoise + core * 0.32));
        wakeAerate = max(wakeAerate, core * 0.85);
      }
    }
  }

  // Evaluate island shallow turquoise water & shoreline surf foam
  float shallowFactor = 0.0;
  float shoreFoam = 0.0;
  for (int i = 0; i < ${ISLAND_MAX}; i++) {
    vec4 isl = uIslands[i];
    if (isl.w < 0.5) continue;
    float d = length(vWorldPos.xz - isl.xy) - isl.z;
    shallowFactor = max(shallowFactor, 1.0 - smoothstep(0.0, 38.0, d));
    if (d < 8.5 && d > -4.0) {
      float surfWave = sin(d * 1.45 - uTime * 2.6 + fbm3(vWorldPos.xz * 0.16) * 4.0);
      float band = smoothstep(7.5, 0.2, d) * smoothstep(0.2, 0.85, surfWave * 0.5 + 0.5);
      shoreFoam = max(shoreFoam, band * 0.95);
    }
  }

  // Physically based Fresnel reflection (Schlick, water F0 = 0.02)
  float NoV = max(dot(N, V), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - NoV, 4.6);

  // Sky reflection
  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.015);
  vec3 skyRefl = sampleSky(R, L);

  // Base ocean absorption + tropical shallow turquoise + aerated wake glow
  vec3 waterBody = mix(uWaterDeep, uWaterShallow, clamp(shallowFactor * 0.92 + wakeAerate * 0.68 + 0.18 * (1.0 - NoV), 0.0, 1.0));

  // Subsurface scattering (translucent emerald-cyan glow through sunlit wave crests)
  float backLight = pow(max(dot(V, -L + N * 0.42), 0.0), 3.0);
  float crestThin = smoothstep(-0.08, 0.65, vWaveH + vChop * 0.35);
  float sssAmt = clamp((backLight * 0.85 + 0.30 * max(dot(N, L), 0.0)) * crestThin, 0.0, 1.0);
  waterBody += uWaterSSS * sssAmt * 0.72;

  // Combine refracted ocean body + reflected sky
  vec3 col = mix(waterBody, skyRefl, clamp(fresnel * 0.92, 0.0, 0.94));

  // Dual-lobe solar specular shimmer (razor sun glints + broad golden sheen)
  vec3 H = normalize(L + V);
  float NoH = max(dot(N, H), 0.0);
  float specTight = pow(NoH, 420.0) * 4.2;
  float specMid = pow(NoH, 68.0) * 0.65;
  col += uSunColor * (specTight + specMid) * (1.0 - wakeFoam * 0.65);

  // Ocean crest whitecaps + live wake foam + shoreline surf
  float cell = fbm3(vWorldPos.xz * 0.38 + vec2(uTime * 0.25, uTime * 0.18));
  float whitecap = smoothstep(0.56, 1.05, vChop * 1.15 + vWaveH * 0.55 + cell * 0.42) * 0.52;
  float totalFoam = clamp(max(max(whitecap, wakeFoam), shoreFoam), 0.0, 1.0);
  vec3 foamColor = mix(uSkyHorizon * 0.78, vec3(1.0, 0.99, 0.97), 0.55 + 0.45 * max(dot(N, L), 0.0));
  col = mix(col, foamColor, totalFoam * 0.92);

  // Distance atmospheric horizon blend (eliminates any far ocean edge)
  float fogAmt = 1.0 - exp(-pow(dist * 0.0021, 1.75));
  col = mix(col, uFogColor, clamp(fogAmt, 0.0, 1.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

// Non-linear radial ocean geometry: ultra-dense near player, smooth to 860 m horizon
function buildRadialOceanGeometry(rings = 110, segs = 128, maxR = 860) {
  const verts = [];
  const indices = [];

  // Center vertex
  verts.push(0, 0, 0);

  for (let r = 1; r <= rings; r++) {
    const u = r / rings;
    // Cubic-blended radius: ~0.4m spacing near center, expands cleanly to horizon
    const rad = maxR * (0.045 * u + 0.22 * u * u + 0.735 * u * u * u * u);
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * TWO_PI;
      verts.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    }
  }

  // Inner fan
  for (let s = 0; s < segs; s++) {
    const next = (s + 1) % segs;
    indices.push(0, 1 + next, 1 + s);
  }
  // Concentric rings
  for (let r = 1; r < rings; r++) {
    const row0 = 1 + (r - 1) * segs;
    const row1 = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const next = (s + 1) % segs;
      indices.push(row0 + s, row0 + next, row1 + s);
      indices.push(row0 + next, row1 + next, row1 + s);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  return geo;
}

export function createOcean(scene, preset = SKY_PRESETS.tropical, islands = []) {
  const wakeData = Array.from({ length: WAKE_MAX }, () => new THREE.Vector4(0, 0, 1, 0));
  const islandData = Array.from({ length: ISLAND_MAX }, (_, i) => {
    const isl = islands[i];
    return isl ? new THREE.Vector4(isl.x, isl.z, isl.beachR, 1) : new THREE.Vector4(0, 0, 1, 0);
  });

  const geo = buildRadialOceanGeometry(110, 128, 860);
  const mat = new THREE.ShaderMaterial({
    vertexShader: OCEAN_VERT,
    fragmentShader: OCEAN_FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uSunDir: { value: preset.sunDir.clone() },
      uSunColor: { value: preset.sunColor.clone() },
      uSkyZenith: { value: preset.skyZenith.clone() },
      uSkyMid: { value: preset.skyMid.clone() },
      uSkyHorizon: { value: preset.skyHorizon.clone() },
      uSunGlow: { value: preset.sunGlow.clone() },
      uFogColor: { value: preset.fogColor.clone() },
      uWaterDeep: { value: preset.waterDeep.clone() },
      uWaterShallow: { value: preset.waterShallow.clone() },
      uWaterSSS: { value: preset.waterSSS.clone() },
      uWake: { value: wakeData },
      uIslands: { value: islandData },
    },
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  let wakeCursor = 0;
  let wakeTimer = 0;

  return {
    mesh,
    mat,
    applyPreset(p) {
      mat.uniforms.uSunDir.value.copy(p.sunDir);
      mat.uniforms.uSunColor.value.copy(p.sunColor);
      mat.uniforms.uSkyZenith.value.copy(p.skyZenith);
      mat.uniforms.uSkyMid.value.copy(p.skyMid);
      mat.uniforms.uSkyHorizon.value.copy(p.skyHorizon);
      mat.uniforms.uSunGlow.value.copy(p.sunGlow);
      mat.uniforms.uFogColor.value.copy(p.fogColor);
      mat.uniforms.uWaterDeep.value.copy(p.waterDeep);
      mat.uniforms.uWaterShallow.value.copy(p.waterShallow);
      mat.uniforms.uWaterSSS.value.copy(p.waterSSS);
    },
    addWakePoint(x, z, strength = 1.0) {
      wakeData[wakeCursor].set(x, z, 0.0, strength);
      wakeCursor = (wakeCursor + 1) % WAKE_MAX;
    },
    update(t, dt, followX, followZ, emitPos, emitStrength) {
      mat.uniforms.uTime.value = t;
      // Snap ocean mesh center to 2m grid so radial density tracks player without vertex crawl
      const cx = Math.round(followX / 2) * 2;
      const cz = Math.round(followZ / 2) * 2;
      mat.uniforms.uCenter.value.set(cx, cz);

      // Age existing wake trail points
      for (let i = 0; i < WAKE_MAX; i++) {
        if (wakeData[i].w > 0.001) {
          wakeData[i].z += dt * 0.16;
          if (wakeData[i].z >= 1.0) {
            wakeData[i].z = 1.0;
            wakeData[i].w = 0.0;
          }
        }
      }
      if (emitPos && emitStrength > 0.08) {
        wakeTimer += dt;
        if (wakeTimer >= 0.075) {
          wakeTimer = 0;
          this.addWakePoint(emitPos.x, emitPos.z, emitStrength);
        }
      }
    },
  };
}
