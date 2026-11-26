// grass.js — press-map meadows for Pelican Beach (gppressmap.js, the
// gamepress filing of Sandro Maglione's Tabletop Grand Prix technique).
// Patches of long dune grass sit on the infields; cars that cut through
// part the grass and it springs back behind them (damped spring k=70,
// c=5 — no timers). Cutting through costs speed: while a car is inside a
// patch it rides the game's existing surface-slow flag (vehicle slowTime,
// vmax x0.55), the same pairing as his design (the meadow is a shortcut
// that costs speed). Rendering is his architecture: one InstancedBuffer-
// Geometry draw call per patch, blades bent in the vertex shader by a
// press texture that is only re-uploaded while a wake exists.
import * as THREE from 'three';
import { createPressMap } from './gppressmap.js';

// Patches [cx, cz, w, d] on the aegean layout the beach map uses. The
// game's guardrail collision keeps cars on the road ribbon (|lat| <=
// halfW - 1.1), so — exactly like his meadow growing over the track —
// each patch straddles the INSIDE EDGE of a corner: grass spills onto
// the road's inside shoulder and out across the infield. A tight line
// puts the car in the grass; the guardrail line runs through it.
const PATCHES = [
  { cx: 228, cz: -84, w: 46, d: 40 },   // straddling the south-east corner apex
  { cx: 150, cz: 12, w: 44, d: 34 },    // straddling the north hairpin approach
];

const BLADE_VERT = /* glsl */ `
attribute vec3 aPos;      // world x, ground y, world z
attribute vec3 aPrm;      // yaw, height, phase
attribute float aTone;
uniform sampler2D uPress;
uniform vec4 uRect;       // x0, z0, w, d (world metres)
uniform float uTime;
varying float vTone;
varying float vH;
varying float vMag;
#include <fog_pars_vertex>
void main() {
  vTone = aTone;
  vH = position.y;
  float yaw = aPrm.x, hgt = aPrm.y, phase = aPrm.z;
  float cy = cos(yaw), sy = sin(yaw);
  vec3 local = vec3(position.x * cy, position.y * hgt, position.x * sy);
  vec2 uv = (aPos.xz - uRect.xy) / uRect.zw;
  vec3 press = texture2D(uPress, uv).rgb;
  vec2 bdir = press.rg * 2.0 - 1.0;
  float mag = press.b;
  vMag = mag;
  float bendW = position.y * position.y;              // bend grows to the tip
  // wind: two rolling waves (his WIND: rest lean + crests), suppressed where pressed
  float gust = 0.5 + 0.5 * sin(uTime * 1.2 - (aPos.x * 0.82 + aPos.z * 0.57) * 0.04
                               + 0.8 * sin((aPos.x * -0.57 + aPos.z * 0.82) * 0.021 + uTime * 0.13));
  float lean = (0.10 + 0.42 * gust * gust) * (1.0 - mag);
  vec2 off = bdir * (mag * 1.3) + vec2(0.82, 0.57) * lean * 0.35;
  local.xz += off * bendW * hgt;
  local.y *= 1.0 - 0.62 * mag * bendW;                // pressed blades lie down
  local.xz += vec2(sin(phase + uTime * 0.7)) * 0.012 * position.y;
  vec3 world = aPos + local;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const BLADE_FRAG = /* glsl */ `
varying float vTone;
varying float vH;
varying float vMag;
#include <fog_pars_fragment>
void main() {
  vec3 root = vec3(0.16, 0.26, 0.07);
  vec3 tip  = mix(vec3(0.40, 0.56, 0.18), vec3(0.60, 0.58, 0.28), vTone); // green -> dry gold
  vec3 col = mix(root, tip, vH);
  col *= 1.0 - 0.45 * vMag;                           // the wake reads darker, like his build
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function buildPatch(def, groundAt, rnd) {
  const pm = createPressMap({ x: def.cx - def.w / 2, z: def.cz - def.d / 2, w: def.w, d: def.d });
  const texData = new Uint8Array(pm.cols * pm.rows * 4);
  pm.writeRGBA(texData);
  const tex = new THREE.DataTexture(texData, pm.cols, pm.rows, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  // blade geometry: a tapered 5-vertex strip (3 triangles), height 0..1
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.085, 0, 0, 0.085, 0, 0, -0.055, 0.55, 0, 0.055, 0.55, 0, 0, 1, 0,
  ], 3));
  base.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);

  const count = Math.floor(def.w * def.d * 2.6);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  const pos = new Float32Array(count * 3);
  const prm = new Float32Array(count * 3);
  const tone = new Float32Array(count);
  const x0 = def.cx - def.w / 2, z0 = def.cz - def.d / 2;
  for (let n = 0; n < count; n++) {
    const x = def.cx + (rnd() - 0.5) * (def.w - 1);
    const z = def.cz + (rnd() - 0.5) * (def.d - 1);
    // fade blade height toward the patch edges so the meadow does not
    // read as a rectangle laid on the ground
    const edge = Math.min(x - x0, x0 + def.w - x, z - z0, z0 + def.d - z);
    const hScale = Math.max(0.2, Math.min(1, edge / 3.5));
    pos[n * 3] = x; pos[n * 3 + 1] = groundAt(x, z) - 0.05; pos[n * 3 + 2] = z;
    prm[n * 3] = rnd() * Math.PI * 2;
    prm[n * 3 + 1] = (0.7 + rnd() * 0.55) * hScale;   // blade height, metres
    prm[n * 3 + 2] = rnd() * Math.PI * 2;
    tone[n] = rnd();
  }
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aPrm', new THREE.InstancedBufferAttribute(prm, 3));
  geo.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
  geo.instanceCount = count;

  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uPress: { value: tex },
        uRect: { value: new THREE.Vector4(pm.x, pm.z, pm.w, pm.d) },
        uTime: { value: 0 },
      },
    ]),
    vertexShader: BLADE_VERT,
    fragmentShader: BLADE_FRAG,
    side: THREE.DoubleSide,
    fog: true,
  });
  // merge() clones uniform values; rebind the live texture after creation
  mat.uniforms.uPress.value = tex;
  mat.uniforms.uRect.value = new THREE.Vector4(pm.x, pm.z, pm.w, pm.d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.name = 'pressMeadow';
  return { def, pm, tex, texData, mat, mesh };
}

export function buildMeadows(groundAt, rnd) {
  const group = new THREE.Group();
  const patches = PATCHES.map((def) => {
    const p = buildPatch(def, groundAt, rnd);
    group.add(p.mesh);
    return p;
  });

  // Re-encode only the dirty rect of a patch into its texture bytes.
  function uploadDirty(p) {
    const r = p.pm.dirtyRect;
    if (!r) return;
    const { bend, cols } = p.pm;
    for (let j = r.j0; j <= r.j1; j++) for (let i = r.i0; i <= r.i1; i++) {
      const id = j * cols + i, k = id * 2, o = id * 4;
      const bx = bend[k], bz = bend[k + 1];
      p.texData[o] = Math.round((bx * 0.5 + 0.5) * 255);
      p.texData[o + 1] = Math.round((bz * 0.5 + 0.5) * 255);
      p.texData[o + 2] = Math.round(Math.min(1, Math.hypot(bx, bz)) * 255);
      p.texData[o + 3] = 255;
    }
    p.tex.needsUpdate = true;
    p.pm.clearDirty();
  }

  let time = 0;
  function update(dt, racers) {
    time += dt;
    for (const p of patches) {
      p.mat.uniforms.uTime.value = time;
      for (const r of racers) {
        if (!p.pm.contains(r.x, r.z)) {
          // still stamp when just outside, so the nose parts grass at the edge
          const dx = Math.max(p.pm.x - r.x, 0, r.x - (p.pm.x + p.pm.w));
          const dz = Math.max(p.pm.z - r.z, 0, r.z - (p.pm.z + p.pm.d));
          if (dx * dx + dz * dz > 9) continue;
        } else if (Math.abs(r.s) > 0.5) {
          r.slowTime = Math.max(r.slowTime, 0.09);    // meadow drag (surface pairing)
        }
        if (Math.abs(r.s) > 0.5) p.pm.stamp(r.x, r.z, Math.sin(r.h), Math.cos(r.h), { halfW: 0.85, halfL: 2.0 });
      }
      p.pm.step(dt);
      if (p.pm.dirty) uploadDirty(p);
    }
  }

  return { group, update, patches };
}
