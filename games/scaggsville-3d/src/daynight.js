// Scaggsville 3D — DAY/NIGHT CYCLE (Lane A).
// One phase value in [0,1] walks the full cycle:
//   day (0.00) -> golden hour (0.30) -> dusk / blue hour (0.62) -> night (0.86+)
// Golden and dusk are the shipped LIGHTING_PRESETS in world/buildWorld.js;
// day and night are defined here. Every channel lerps smoothly between the
// keyframes: sun colour/dir/intensity, hemisphere, ambient, fog, exposure,
// sky-dome uniforms, the lit-window tint, the streetlamp-glow opacity, the
// headlight-beam intensity and the PMREM environment intensity.
//
// Rally mapping (host feeds progress in): the rally STARTS at golden hour
// (Cherie's chosen look, phase 0.30) and progress 0..1 (stops collected /
// elapsed time, host's max of the two) walks phase 0.30 -> 0.92, so the
// Atholton finale lands in full night. After the finish the phase holds.
//
// Debug override: ?time=day|golden|dusk|night or ?time=0..1 locks the phase
// (no progression) for screenshots; window.__proof.setTime(v) does the same
// at runtime. Unlock with setTime(null).
//
// Per-frame cost: a fixed set of lerps into preallocated objects — no
// allocations in update(). The PMREM environment is NOT re-baked (too
// expensive); scene.environmentIntensity is lerped down at night instead.
import * as THREE from 'three';
import { LIGHTING_PRESETS } from './world/buildWorld.js';

export const DAY_PRESET = { // mid-morning: bright, high sun, lamps off
  renderer: { toneMapping: 'ACESFilmic', exposure: 1.10, outputColorSpace: 'SRGB' },
  sun: { color: 0xfff1d8, intensity: 3.1, dir: [-0.45, 0.78, 0.35] },
  hemi: { sky: 0xbfdcff, ground: 0x8a7f6a, intensity: 1.15 },
  ambient: { color: 0xdceaff, intensity: 0.55 },
  fog: { color: 0xcfe0ee, near: 150, far: 820 },
  sky: { zen: [0.25, 0.50, 0.95], mid: [0.55, 0.75, 0.98], hor: [0.85, 0.92, 1.00] },
  dressing: { windowGlow: 0.0, lampGlow: 0.0 },
  beamIntensity: 30,
  envIntensity: 1.0,
};
export const NIGHT_PRESET = { // full night: moonlight remnant, streetlamps +
  // lit windows + headlight pools carry the scene.
  // Ambient floor LIFTED 2026-11-20 (Cherie, after the first night captures:
  // unlit road stretches vanished to black) — hemi/ambient colours and
  // intensities raised ~1.5x and fog/env lifted a touch, so unlit roads and
  // ground read as dark blue-grey shapes. Sun, exposure, window/lamp glow
  // and the beam are untouched: lamp pools, lit windows and the headlight
  // pool remain clearly the brightest things in the scene.
  renderer: { toneMapping: 'ACESFilmic', exposure: 1.15, outputColorSpace: 'SRGB' },
  sun: { color: 0x93a7d4, intensity: 0.38, dir: [-0.58, 0.30, 0.42] }, // moon near where the sun set
  hemi: { sky: 0x3a4f78, ground: 0x232833, intensity: 0.80 },
  ambient: { color: 0x41537a, intensity: 0.72 },
  fog: { color: 0x1e2a44, near: 70, far: 460 },
  sky: { zen: [0.012, 0.025, 0.070], mid: [0.050, 0.090, 0.200], hor: [0.160, 0.130, 0.160] },
  dressing: { windowGlow: 1.0, lampGlow: 0.85 },
  beamIntensity: 260,
  envIntensity: 0.48,
};
// golden / dusk get an envIntensity (they predate the field)
const GOLDEN = Object.assign({ envIntensity: 0.95 }, LIGHTING_PRESETS.golden);
const DUSK = Object.assign({ envIntensity: 0.80 }, LIGHTING_PRESETS.dusk);

export const CYCLE_KEYS = [
  { t: 0.00, name: 'day',    p: DAY_PRESET },
  { t: 0.30, name: 'golden', p: GOLDEN },
  { t: 0.62, name: 'dusk',   p: DUSK },
  { t: 0.86, name: 'night',  p: NIGHT_PRESET },
  { t: 1.00, name: 'night',  p: NIGHT_PRESET },
];
export const PHASE_BY_NAME = { day: 0.0, golden: 0.30, dusk: 0.62, night: 0.92 };
export const RALLY_START_PHASE = 0.30;   // golden hour
export const RALLY_END_PHASE = 0.92;     // full night at the finale

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpColor(out, a, b, f) { return out.copy(_c1.setHex(a)).lerp(_c2.setHex(b), f); }
function lerpSky(out, a, b, f) { for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * f; }

// createDayNight(): the cycle state + applier.
//   dn.update(dt, rallyProgress)  — advance/unlock logic + recompute `current`
//   dn.applyTo(rig)               — push `current` into lights/sky/fog/dressing
//   rig = { renderer, scene, sun, hemi, ambient, dome, windows, lampGlow }
//         (any field may be null; dome = the sky dome mesh)
//   dn.current — the live lerped preset-shaped object (host reads
//         current.beamIntensity for the player headlight SpotLight)
//   dn.sunDir — persistent normalized Vector3 (host aims the shadow sun)
//   dn.phase / dn.phaseName / dn.locked / dn.setPhase(v|null)
export function createDayNight() {
  // the live, lerped lighting state — same shape as a preset
  const current = {
    renderer: { exposure: GOLDEN.renderer.exposure },
    sun: { color: new THREE.Color(GOLDEN.sun.color), intensity: GOLDEN.sun.intensity },
    hemi: { sky: new THREE.Color(GOLDEN.hemi.sky), ground: new THREE.Color(GOLDEN.hemi.ground), intensity: GOLDEN.hemi.intensity },
    ambient: { color: new THREE.Color(GOLDEN.ambient.color), intensity: GOLDEN.ambient.intensity },
    fog: { color: new THREE.Color(GOLDEN.fog.color), near: GOLDEN.fog.near, far: GOLDEN.fog.far },
    sky: { zen: [...GOLDEN.sky.zen], mid: [...GOLDEN.sky.mid], hor: [...GOLDEN.sky.hor] },
    dressing: { windowGlow: GOLDEN.dressing.windowGlow, lampGlow: GOLDEN.dressing.lampGlow },
    beamIntensity: GOLDEN.beamIntensity,
    envIntensity: GOLDEN.envIntensity,
  };
  const sunDir = new THREE.Vector3(...GOLDEN.sun.dir).normalize();
  const _dirA = new THREE.Vector3(), _dirB = new THREE.Vector3();

  let phase = RALLY_START_PHASE;
  let locked = false;
  // ?time= debug override (name or 0..1 float)
  try {
    const q = new URLSearchParams(location.search).get('time');
    if (q !== null) {
      const v = PHASE_BY_NAME[q] !== undefined ? PHASE_BY_NAME[q] : parseFloat(q);
      if (Number.isFinite(v)) { phase = Math.min(1, Math.max(0, v)); locked = true; }
    }
  } catch (_) { /* no location (node proof) */ }

  function sample(ph) {
    let a = CYCLE_KEYS[0], b = CYCLE_KEYS[CYCLE_KEYS.length - 1];
    for (let i = 0; i < CYCLE_KEYS.length - 1; i++) {
      if (ph >= CYCLE_KEYS[i].t && ph <= CYCLE_KEYS[i + 1].t) { a = CYCLE_KEYS[i]; b = CYCLE_KEYS[i + 1]; break; }
    }
    const span = Math.max(1e-5, b.t - a.t);
    const f = Math.min(1, Math.max(0, (ph - a.t) / span));
    const A = a.p, B = b.p, C = current;
    C.renderer.exposure = A.renderer.exposure + (B.renderer.exposure - A.renderer.exposure) * f;
    lerpColor(C.sun.color, A.sun.color, B.sun.color, f);
    C.sun.intensity = A.sun.intensity + (B.sun.intensity - A.sun.intensity) * f;
    _dirA.set(...A.sun.dir); _dirB.set(...B.sun.dir);
    sunDir.copy(_dirA).lerp(_dirB, f).normalize();
    lerpColor(C.hemi.sky, A.hemi.sky, B.hemi.sky, f);
    lerpColor(C.hemi.ground, A.hemi.ground, B.hemi.ground, f);
    C.hemi.intensity = A.hemi.intensity + (B.hemi.intensity - A.hemi.intensity) * f;
    lerpColor(C.ambient.color, A.ambient.color, B.ambient.color, f);
    C.ambient.intensity = A.ambient.intensity + (B.ambient.intensity - A.ambient.intensity) * f;
    lerpColor(C.fog.color, A.fog.color, B.fog.color, f);
    C.fog.near = A.fog.near + (B.fog.near - A.fog.near) * f;
    C.fog.far = A.fog.far + (B.fog.far - A.fog.far) * f;
    lerpSky(C.sky.zen, A.sky.zen, B.sky.zen, f);
    lerpSky(C.sky.mid, A.sky.mid, B.sky.mid, f);
    lerpSky(C.sky.hor, A.sky.hor, B.sky.hor, f);
    C.dressing.windowGlow = A.dressing.windowGlow + (B.dressing.windowGlow - A.dressing.windowGlow) * f;
    C.dressing.lampGlow = A.dressing.lampGlow + (B.dressing.lampGlow - A.dressing.lampGlow) * f;
    C.beamIntensity = A.beamIntensity + (B.beamIntensity - A.beamIntensity) * f;
    C.envIntensity = A.envIntensity + (B.envIntensity - A.envIntensity) * f;
    return (f < 0.5 ? a : b).name;
  }
  let phaseName = sample(phase);

  return {
    current, sunDir,
    get phase() { return phase; },
    get phaseName() { return phaseName; },
    get locked() { return locked; },
    // v: phase 0..1 or a name ('day'|'golden'|'dusk'|'night'); null unlocks
    // (progression resumes from the current phase on the next update).
    setPhase(v) {
      if (v === null || v === undefined) { locked = false; return; }
      const n = typeof v === 'string' ? PHASE_BY_NAME[v] : v;
      if (Number.isFinite(n)) { phase = Math.min(1, Math.max(0, n)); locked = true; phaseName = sample(phase); }
    },
    update(dt, rallyProgress) {
      if (!locked) {
        const p = Math.min(1, Math.max(0, rallyProgress || 0));
        phase = RALLY_START_PHASE + (RALLY_END_PHASE - RALLY_START_PHASE) * p;
      }
      phaseName = sample(phase);
    },
    applyTo(rig) {
      const C = current;
      if (rig.renderer) rig.renderer.toneMappingExposure = C.renderer.exposure;
      if (rig.sun) { rig.sun.color.copy(C.sun.color); rig.sun.intensity = C.sun.intensity; }
      if (rig.hemi) { rig.hemi.color.copy(C.hemi.sky); rig.hemi.groundColor.copy(C.hemi.ground); rig.hemi.intensity = C.hemi.intensity; }
      if (rig.ambient) { rig.ambient.color.copy(C.ambient.color); rig.ambient.intensity = C.ambient.intensity; }
      if (rig.scene) {
        if (rig.scene.fog) { rig.scene.fog.color.copy(C.fog.color); rig.scene.fog.near = C.fog.near; rig.scene.fog.far = C.fog.far; }
        rig.scene.environmentIntensity = C.envIntensity;
      }
      if (rig.dome) {
        const u = rig.dome.material.uniforms;
        if (u.uZen) { u.uZen.value.set(...C.sky.zen); u.uMid.value.set(...C.sky.mid); u.uHor.value.set(...C.sky.hor); }
        if (u.uSunDir) u.uSunDir.value.copy(sunDir);
      }
      // dressing: lit-window tint (0.16 = unlit glass read, 1 = fully lit)
      if (rig.windows) rig.windows.material.color.setScalar(0.16 + 0.84 * Math.min(1, C.dressing.windowGlow));
      if (rig.lampGlow) {
        rig.lampGlow.material.opacity = C.dressing.lampGlow;
        rig.lampGlow.visible = C.dressing.lampGlow > 0.01;
      }
    },
  };
}
export default createDayNight;
