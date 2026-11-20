// Bunny Hop — chase camera (Opus seat). Pure ESM: no DOM, no three.js, plain numbers only.
// Implements visual-push-plan.md pushes #2 (camera model) and #9 (landing-impulse shake).
//
//   import { createChaseCam, CAM_CONFIG } from './src/camera/chaseCam.js';
//   const cam = createChaseCam();                 // partial overrides merge over CAM_CONFIG
//   cam.reset(target);                            // snap, no lag (spawn / teleport / remount)
//   const s = cam.step(dt, target);               // -> cam.state (same object every call)
//   // host: camera.position.set(s.x, s.y, s.z); camera.up.set(0,1,0);
//   //       camera.lookAt(s.lookX, s.lookY, s.lookZ); camera.fov = s.fov; camera.updateProjectionMatrix();
//   //       sun.target.position.set(s.shadow.x, 0, s.shadow.z); sun.shadow.camera.{left,bottom} = -s.shadow.halfSize, {right,top} = +halfSize
//
//   target = { mode: 'ride' | 'swim' | 'bail', x, y, z, heading, speed, grounded, waterLevel }
//            ride/bail: bike.state fields (y = wheel-contact height). swim: swimmer x/z/heading, y ignored.
//
// Conventions match bikePhysics.js: forward = (sin heading, cos heading) in x/z.
// fov is three.js PerspectiveCamera.fov: VERTICAL degrees (at 390×844 portrait, 60° vertical ≈ 30° horizontal).
// Roll is not an output: the camera never rolls (frame-5, plan push #2: "roll inheritance 0.0, not a tunable").

export const CAMERA_ROLL = 0; // fixed by the plan; deliberately not in CAM_CONFIG

export const CAM_CONFIG = {
  // --- rig (frame-1: low chase, rider dead centre, horizon in the top third) ---
  backDist: 3.8,          // m behind the REAR WHEEL (frame-1 "~3–4 m"); plan said 3.6 — 3.8 keeps rider share 31.7–34.3% across the fov breathe (3.6: 35.8% at rest, over the 35% mark)
  rearWheelOffset: 0.5,   // m, bike origin → rear contact (wheelbase/2), so 4.3 m to the bike origin
  height: 1.65,           // m above the wheel-contact height: shoulder height (summit Round 2)
  aimHeight: 0.65,        // m above contact: ~13° down-tilt → horizon 30–31% from top at 390×844 (plan's "+0.5 over hip" = 1.4 m gives a near-level cam, horizon 44%: fails the plan's own top-third mark)
  // --- follow (frame-4: lazy yaw, tight height) ---
  yawStiffness: 3.2,      // rad/s, critically-damped yaw follow: ~0.9 s to 80% of a heading change, no overshoot
  heightRate: 12,         // 1/s, exponential height follow: 90% in ~0.19 s (curbs/ramps never bounce the frame)
  airFollow: 0.35,        // fraction of hop height the camera rises with: the hop reads as the rider leaving the frame line
  // --- lens (frame-1/2 read ~60°; portrait-safe ceiling agreed with Neon) ---
  fovBase: 60,            // deg vertical, at rest
  fovKick: 4,             // deg added at topSpeed (speed breathe)
  fovMax: 64,             // deg hard cap, any speed
  fovTopSpeed: 12,        // m/s where the kick is full (= bikePhysics CONFIG.topSpeed)
  fovRate: 2.5,           // 1/s, fov easing: breathes, never snaps
  // --- landing impulse (push #9: impact-scaled, < 150 ms, never in air or swim) ---
  shakeMinImpact: 2.0,    // m/s vertical impact below which nothing happens (curb drops)
  shakePerImpact: 0.03,   // m of camera dip per m/s of impact above the minimum
  shakeMax: 0.12,         // m, dip cap (a full drop off the bridge deck)
  shakeTau: 0.025,        // s, dip shape t/τ·e^(1−t/τ): peak at 25 ms, < 5% left at 150 ms
  // --- swim (frame-7: at the surface, looking slightly up) ---
  swimHeight: 0.6,        // m above waterLevel
  swimBackDist: 3.0,      // m behind the swimmer (frame-7 swimmer fills the lower frame)
  swimPitchUp: 6,         // deg, camera tilted up
  // --- shadow frustum (plan push #2: ~30 m around the rider) ---
  shadowHalfSize: 15,     // m, orthographic half-extent → 30 m square
  shadowLead: 5,          // m, centre shifted ahead of the rider along the view (that's where shadows are seen)
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const RAD = Math.PI / 180;
const wrapPi = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));

export function createChaseCam(config = CAM_CONFIG) {
  const C = { ...CAM_CONFIG, ...config };

  const state = {
    x: 0, y: 0, z: 0, lookX: 0, lookY: 0, lookZ: 1,
    fov: C.fovBase, roll: CAMERA_ROLL,
    yaw: 0, baseY: 0, shakeY: 0,
    shadow: { x: 0, z: 0, halfSize: C.shadowHalfSize },
  };
  let yawVel = 0;
  let wasGrounded = true, takeoffY = 0, lastVy = 0, prevY = null;
  let shakeAmp = 0, shakeT = Infinity;

  function rigBaseY(t) {
    if (t.mode === 'swim') return (t.waterLevel ?? 0) + C.swimHeight;
    const groundRef = t.grounded === false ? takeoffY + C.airFollow * (t.y - takeoffY) : t.y;
    return groundRef + C.height;
  }

  function place(t) {
    const fx = Math.sin(state.yaw), fz = Math.cos(state.yaw);
    if (t.mode === 'swim') {
      state.x = t.x - fx * C.swimBackDist; state.z = t.z - fz * C.swimBackDist;
      state.y = state.baseY;
      const L = 10;
      state.lookX = state.x + fx * L; state.lookZ = state.z + fz * L;
      state.lookY = state.y + Math.tan(C.swimPitchUp * RAD) * L;
    } else {
      const back = C.backDist + C.rearWheelOffset;
      state.x = t.x - fx * back; state.z = t.z - fz * back;
      state.y = state.baseY + state.shakeY;
      // aim at the hip, expressed as a fixed down-tilt so the horizon doesn't bob with the hop
      const tilt = Math.atan2(C.height - C.aimHeight, back);
      const L = 10;
      state.lookX = state.x + fx * L; state.lookZ = state.z + fz * L;
      state.lookY = state.y - Math.tan(tilt) * L;
    }
    const lead = C.shadowLead;
    state.shadow.x = t.x + fx * lead; state.shadow.z = t.z + fz * lead;
    state.shadow.halfSize = C.shadowHalfSize;
  }

  function reset(t) {
    state.yaw = t.heading || 0; yawVel = 0;
    takeoffY = t.y || 0; wasGrounded = t.grounded !== false; lastVy = 0; prevY = t.y ?? null;
    state.baseY = rigBaseY(t);
    state.shakeY = 0; shakeAmp = 0; shakeT = Infinity;
    state.fov = C.fovBase;
    place(t);
    return state;
  }

  function step(dt, t) {
    if (!(dt > 0)) return state;
    const grounded = t.grounded !== false;
    const swimming = t.mode === 'swim';

    // --- airborne bookkeeping + impact detection (no event plumbing needed) ---
    if (prevY !== null && !swimming) lastVy = grounded ? lastVy : (t.y - prevY) / dt;
    if (wasGrounded && !grounded) takeoffY = prevY ?? t.y;
    if (!wasGrounded && grounded && !swimming && t.mode !== 'bail') {
      const impact = -lastVy;
      if (impact > C.shakeMinImpact) {
        shakeAmp = Math.min(C.shakeMax, (impact - C.shakeMinImpact) * C.shakePerImpact);
        shakeT = 0;
      }
    }
    wasGrounded = grounded; prevY = t.y;

    // --- yaw: critically-damped spring toward heading (exact, frame-rate independent) ---
    if (t.mode !== 'bail') {
      const w = C.yawStiffness;
      const x0 = wrapPi(state.yaw - (t.heading || 0)), v0 = yawVel;
      const e = Math.exp(-w * dt), k = v0 + w * x0;
      state.yaw = (t.heading || 0) + (x0 + k * dt) * e;
      yawVel = (v0 - w * k * dt) * e;
    } else yawVel = 0; // bail: hold the framing, watch the tumble

    // --- height: tight exponential follow ---
    const targetY = rigBaseY(t);
    state.baseY += (targetY - state.baseY) * (1 - Math.exp(-C.heightRate * dt));

    // --- landing dip ---
    if (shakeT < Infinity && !swimming && grounded) {
      shakeT += dt;
      const u = shakeT / C.shakeTau;
      state.shakeY = -shakeAmp * u * Math.exp(1 - u);
      if (u > 12) { shakeT = Infinity; state.shakeY = 0; }
    } else { shakeT = Infinity; state.shakeY = 0; }

    // --- fov breathe ---
    const kick = swimming ? 0 : C.fovKick * clamp(Math.abs(t.speed || 0) / C.fovTopSpeed, 0, 1);
    const fovTarget = Math.min(C.fovMax, C.fovBase + kick);
    state.fov = Math.min(C.fovMax, state.fov + (fovTarget - state.fov) * (1 - Math.exp(-C.fovRate * dt)));

    place(t);
    return state;
  }

  return { state, reset, step, config: C };
}

/**
 * Framing check (used by tests and by Moth's acceptance math): project a vertical segment at the
 * bike origin into normalised screen y (0 = top, 1 = bottom) for a portrait viewport.
 */
export function projectFraming(s, bikeX, bikeZ, yBottom, yTop) {
  const dx = s.lookX - s.x, dy = s.lookY - s.y, dz = s.lookZ - s.z;
  const len = Math.hypot(dx, dy, dz), f = [dx / len, dy / len, dz / len];
  // camera basis with world up (roll 0)
  let r = [f[2], 0, -f[0]]; const rl = Math.hypot(r[0], r[2]); r = [r[0] / rl, 0, r[2] / rl];
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]; // f × r = camera up
  const t = Math.tan((s.fov * RAD) / 2);
  const toScreenY = (px, py, pz) => {
    const v = [px - s.x, py - s.y, pz - s.z];
    const depth = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
    const up = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
    return 0.5 - (up / depth) / t / 2;
  };
  const top = toScreenY(bikeX, yTop, bikeZ), bottom = toScreenY(bikeX, yBottom, bikeZ);
  // horizon: direction (f.x, 0, f.z) at infinity
  const hz = (() => { const v = [f[0] * 1e6, 0, f[2] * 1e6]; const depth = v[0] * f[0] + v[2] * f[2]; const up = v[0] * u[0] + v[1] * u[1] + v[2] * u[2]; return 0.5 - (up / depth) / t / 2; })();
  return { top, bottom, share: bottom - top, horizon: hz };
}

export default createChaseCam;
