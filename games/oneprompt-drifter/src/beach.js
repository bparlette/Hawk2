// beach.js — the Pelican Bike ("duck game") environment, ported into the
// One-Prompt Drifter: its sky shader (sun disc + sun glow + FBM clouds), its
// Gerstner-wave ocean with crest + shore foam, and its golden-hour palette
// (sky.js KEYS keyframe at sun elevation 10°: sun #ffc27e, horizon #ffc896).
// Source: riba2534/claude-opus-5-5-demo, pelican-bike/src/sky.js + ocean.js.
// Adaptations vs the original: the day-night cycle is fixed at golden hour
// (uNight = 0), the shoreline is a uniform (uShore, world z) instead of a
// compile-time constant so it can sit on this game's coast, and the ocean
// grid is built in world coordinates around the track instead of scrolling
// with a rider. Wave phase maths (double-precision JS phases) is unchanged.
import * as THREE from 'three';

// ---------------- sky (pelican sky.js, day-only subset) ----------------
const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return s;
}
`;

const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform float uSunGlow;
uniform float uTime;

vec3 skyBase(vec3 dir) {
  float y = dir.y;
  float h = pow(1.0 - clamp(y, 0.0, 1.0), 3.5);
  vec3 col = mix(uZenith, uHorizon, h);
  if (y < 0.0) col = mix(uHorizon, uGround, smoothstep(0.0, -0.3, y));
  float sd = max(dot(dir, uSunDir), 0.0);
  float glow = pow(sd, 6.0) * 0.28 + pow(sd, 48.0) * 0.55 + pow(sd, 400.0) * 1.2;
  col += uSunColor * glow * uSunGlow * (0.45 + 0.55 * h);
  return col;
}
`;

export function buildBeachSky(cfg) {
  const sunDir = new THREE.Vector3(...cfg.sun).normalize();
  const uniforms = {
    uSunDir: { value: sunDir },
    uZenith: { value: new THREE.Color(cfg.top) },
    uHorizon: { value: new THREE.Color(cfg.horizon) },
    uGround: { value: new THREE.Color(cfg.bottom) },
    uSunColor: { value: new THREE.Color(cfg.sunColor) },
    uSunGlow: { value: 1 },
    uTime: { value: 0 },
    uCloudOffset: { value: new THREE.Vector2() },
    uCloudCover: { value: 0.45 },
    uCloudTint: { value: new THREE.Color('#fff0dc') },
    uCloudShade: { value: new THREE.Color('#9aa2b8') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      ${SKY_GLSL}
      ${NOISE_GLSL}
      uniform vec2 uCloudOffset;
      uniform float uCloudCover;
      uniform vec3 uCloudTint;
      uniform vec3 uCloudShade;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        vec3 col = skyBase(dir);
        // pelican's sun disc
        float sd = dot(dir, uSunDir);
        col += uSunColor * smoothstep(0.99955, 0.99975, sd) * 18.0;
        // pelican's procedural clouds, lit from the sun side
        if (dir.y > 0.0) {
          vec2 uv = dir.xz / (dir.y + 0.1) * 0.55 + uCloudOffset;
          float n = fbm(uv * 0.9);
          float n2 = fbm(uv * 2.3 + 4.0);
          float d = n * 0.75 + n2 * 0.35;
          float cover = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.32, d);
          float lightN = fbm(uv * 0.9 - uSunDir.xz * 0.12);
          float lit = clamp(0.55 + (n - lightN) * 3.0, 0.0, 1.0);
          float sunSide = pow(max(dot(dir, uSunDir), 0.0), 3.0);
          vec3 cc = mix(uCloudShade, uCloudTint, lit) + uSunColor * sunSide * 0.5;
          float horizonFade = smoothstep(0.0, 0.14, dir.y);
          col = mix(col, cc, cover * horizonFade * 0.92);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  return { sky, sunDir, uniforms };
}

// ---------------- ocean (pelican ocean.js) ----------------
export const WAVES = [
  [0.18, 1.0, 0.2, 21.0, 1.0],
  [-0.45, 1.0, 0.17, 12.5, 1.0],
  [0.75, 0.62, 0.13, 7.0, 1.0],
  [-0.9, 0.45, 0.1, 4.2, 1.0],
  [0.3, 1.0, 0.07, 2.6, 1.0],
];

export function buildBeachOcean({ centerX = 0, shoreZ = -222, seaY = -1.0, sunDir, cfg }) {
  const uniforms = {
    uSunDir: { value: sunDir.clone() },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uZenith: { value: new THREE.Color(cfg.top) },
    uHorizon: { value: new THREE.Color(cfg.horizon) },
    uGround: { value: new THREE.Color(cfg.bottom) },
    uSunColor: { value: new THREE.Color(cfg.sunColor) },
    uSunGlow: { value: 1 },
    uNight: { value: 0 },
    uTime: { value: 0 },
    uShore: { value: shoreZ },
    uOffset: { value: 0 },
    uAmp: { value: 1 },
    uPhase: { value: new Float32Array(WAVES.length) },
    uDeep: { value: new THREE.Color('#0b3a5a') },
    uShallow: { value: new THREE.Color('#1fa3a8') },
    uFogDensity: { value: 0.0042 },
    uDayLight: { value: 1 },
    uLampColor: { value: new THREE.Color('#ffb46a') },
  };
  const vert = /* glsl */ `
uniform float uTime;
uniform float uOffset;
uniform float uAmp;
uniform float uShore;
uniform float uPhase[${WAVES.length}];
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vWP;

vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, float phase, float amp, inout vec3 tangent, inout vec3 binormal) {
  float k = 6.28318 / wl;
  vec2 d = normalize(dir);
  float f = k * dot(d, p) + phase;
  float st = steep * amp;
  float a = st / k;
  float sf = sin(f);
  float cf = cos(f);
  tangent += vec3(-d.x * d.x * st * sf, d.x * st * cf, -d.x * d.y * st * sf);
  binormal += vec3(-d.x * d.y * st * sf, d.y * st * cf, -d.y * d.y * st * sf);
  return vec3(d.x * a * cf, a * sf, d.y * a * cf);
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 p = vec2(wp.x, wp.z);
  float off = smoothstep(uShore + 1.0, uShore - 30.0, wp.z);
  float amp = uAmp * mix(0.35, 1.0, off);
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  vec3 disp = vec3(0.0);
  ${WAVES.map((w, i) => `disp += gerstner(p, vec2(${w[0].toFixed(3)}, ${w[1].toFixed(3)}), ${w[2].toFixed(3)}, ${w[3].toFixed(3)}, uPhase[${i}], amp, tangent, binormal);`).join('\n  ')}
  wp.xyz += disp;
  vNormal = normalize(cross(binormal, tangent));
  vWorld = wp.xyz;
  vHeight = disp.y / max(uAmp, 0.05);
  vWP = vec2(wp.x + uOffset, wp.z);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
  const frag = /* glsl */ `
${SKY_GLSL}
${NOISE_GLSL}
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform float uFogDensity;
uniform float uDayLight;
uniform float uOffset;
uniform float uShore;
uniform float uNight;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
varying vec2 vWP;

void main() {
  vec3 N = normalize(vNormal);
  float dist = length(vWorld - cameraPosition);
  vec2 q = vWP * 0.55;
  float e = 0.35;
  vec2 f1 = vec2(0.35, 0.6) * uTime;
  vec2 f2 = vec2(-0.5, 0.25) * uTime;
  float h0 = vnoise(q + f1) + 0.5 * vnoise(q * 2.7 + f2);
  float hx = vnoise(q + vec2(e, 0.0) + f1) + 0.5 * vnoise((q + vec2(e, 0.0)) * 2.7 + f2);
  float hz = vnoise(q + vec2(0.0, e) + f1) + 0.5 * vnoise((q + vec2(0.0, e)) * 2.7 + f2);
  float detail = 0.55 * (1.0 - smoothstep(20.0, 160.0, dist));
  N = normalize(N + vec3(h0 - hx, 0.0, h0 - hz) * detail);

  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = max(dot(N, V), 0.0);
  float fres = 0.02 + 0.98 * pow(clamp(1.0 - ndv, 0.0, 1.0), 5.0);
  vec3 R = reflect(-V, N);
  R.y = abs(R.y) + 0.02;
  R = normalize(R);
  vec3 refl = skyBase(R);

  float depthF = smoothstep(uShore - 2.0, uShore - 45.0, vWorld.z);
  vec3 water = mix(uShallow, uDeep, depthF) * (0.12 + 0.88 * uDayLight);
  float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * clamp(vHeight + 0.3, 0.0, 1.5);
  water += uShallow * uSunColor * sss * 0.35;

  vec3 col = mix(water, refl, fres);
  float rs = max(dot(R, uSunDir), 0.0);
  col += uSunColor * (pow(rs, 420.0) * 30.0 + pow(rs, 60.0) * 0.7) * step(-0.05, uSunDir.y);

  float fn = vnoise(vWP * 1.3 + uTime * 0.4) * 0.6 + vnoise(vWP * 4.0 - uTime * 0.3) * 0.4;
  float crest = smoothstep(0.62, 1.05, vHeight + fn * 0.35) * smoothstep(uShore - 8.0, uShore - 40.0, vWorld.z);
  float shoreLine = uShore + 0.9 * sin(vWP.x * 0.045) + 0.5 * sin(vWP.x * 0.13 + 1.7);
  float surge = sin(uTime * 0.7 + vWP.x * 0.021) * 1.3;
  float sd = vWorld.z - (shoreLine + surge * 0.5);
  float shoreFoam = smoothstep(-5.5, 0.5, sd) * (0.55 + 0.45 * fn);
  shoreFoam *= smoothstep(0.35, 0.55, fn + smoothstep(-2.5, 0.8, sd) * 0.5);
  float foam = clamp(max(crest * 0.75, shoreFoam), 0.0, 1.0);
  vec3 foamCol = mix(vec3(0.06, 0.08, 0.12), vec3(0.95, 0.97, 1.0), uDayLight) * (0.6 + 0.4 * uSunGlow);
  col = mix(col, foamCol, foam * 0.85);

  float fogF = 1.0 - exp(-pow(dist * uFogDensity, 1.35));
  vec3 fd = vWorld - cameraPosition;
  vec3 fogCol = skyBase(normalize(vec3(fd.x, max(fd.y * 0.02, 0.0) + 0.004, fd.z)));
  col = mix(col, fogCol, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag });
  // grid: dense near the shoreline and the track centre, sparse far out
  const xs = [];
  for (let x = -1500; x <= 1500; x += Math.abs(x) < 260 ? 3 : Math.abs(x) < 700 ? 9 : 24) xs.push(centerX + x);
  const zs = [];
  for (let z = 14; z >= -1500; z -= z > -60 ? 2.5 : z > -220 ? 7 : 22) zs.push(shoreZ + z);
  const pos = [];
  const idx = [];
  for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) pos.push(xs[i], 0, zs[j]);
  const nx = xs.length;
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + nx;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = seaY;
  mesh.frustumCulled = false;
  mesh.name = 'beachOcean';
  const phases = new Float32Array(WAVES.length);
  const updater = (dt, t) => {
    uniforms.uTime.value = t;
    WAVES.forEach((w, i) => {
      const k = (2 * Math.PI) / w[3];
      const c = Math.sqrt(9.8 / k) * w[4];
      phases[i] = (-k * c * t) % (2 * Math.PI);
    });
    uniforms.uPhase.value = phases;
  };
  return { mesh, uniforms, updater };
}
