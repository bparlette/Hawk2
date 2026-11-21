// Bunny Hop — rider pose driver (Opus seat). Pure ESM: no DOM, no three.js, plain numbers only.
// iteration-2.md Round 2b, plan push #5: a real body on the bike, fed by bike.state.
//
//   import { createRiderPose, POSE_CONFIG } from './src/rider/riderPose.js';
//   const pose = createRiderPose();
//   pose.reset();
//   const p = pose.step(dt, S, { pedal });       // S = bike.state, pedal = the input you fed the physics
//   // p is the same object every call: see NOTES.md for the exact host mapping onto the rig.
//
// Space: all lengths/angles are in pitchGroup space (the bike frame), the frame the host rig is built in:
//   y up from the wheel contact plane, z forward. rotation.x convention = three.js (positive tips +y toward +z... i.e.
//   a limb hanging along −y swings BACK (−z) for positive rotation.x).
// Angles in radians. Nothing here reads input other than `pedal`; the pose never feeds back into physics.

export const POSE_CONFIG = {
  // --- rig geometry (measured from index.html's rig) ---
  hipJoint: [0.95, -0.08],     // [y, z] leg-group origin at rest
  thigh: 0.44,                 // m, hip → knee
  shin: 0.43,                  // m, knee → sole (shin box 0.42 + shoe)
  crankCenter: [0.38, 0.16],   // [y, z]
  crankRadius: 0.15,           // m (crank arm box 0.30 long, centred)
  barGrip: [1.06, 0.46],       // [y, z] handlebar
  torsoPivot: [0.98, -0.14],   // [y, z] hip pivot the host upper-body group rotates about
  shoulder: [1.44, 0.02],      // [y, z] arm-group origin at rest (inside the upper body)
  elbowRest: [-0.24, 0.16],    // [dy, dz] elbow offset from shoulder in the rest arm (upper-arm tube end)
  handRest: [-0.42, 0.42],     // [dy, dz] hand offset from shoulder in the rest arm (forearm tube end)
  rearContactZ: -0.52,         // m, rear wheel contact (pivot for the hop pitch)
  wheelRadius: 0.34,

  // --- cadence (frame-1/2: legs actually drive the cranks) ---
  gearRatio: 2.75,             // wheel turns per crank turn (BMX 44/16) → 72 rpm at 7 m/s
  pedalMinSpeed: 0.2,          // m/s, below this pedalling doesn't turn the cranks
  levelRate: 6,                // 1/s, cranks ease to level (pedals horizontal) when coasting / airborne

  // --- poses: [hipsY, hipsZ, torsoDelta] targets; torsoDelta adds to the rig's baked 0.36 rad torso hinge ---
  pedalPose: [0.0, 0.02, 0.04],    // seated drive, frame-1/2 posture (+0.04 hinge keeps the bars at 94% arm reach)
  coastPose: [0.01, 0.10, -0.13],  // sits up, hips slide forward, relaxed (frame-6); 94% arm reach
  crouchPose: [-0.2, -0.14, 0.38], // hips back and down, torso flattens toward the bars — NOT a whole-rig sink
  airPose: [0.05, -0.11, 0.28],    // standing, body back over the rear wheel, arms pulling the bars through the pop; 93% reach
  bracePose: [-0.18, -0.06, 0.26], // landing brace (scaled by impact)
  armReachMax: 0.97,               // fraction of arm length the IK may use: elbows never lock (frame-1 'arms soft-bent')
  poseStiffness: 14,               // rad/s, critically-damped blend between poses (~0.25 s, no overshoot)

  // --- pedalling life ---
  hipRock: 0.05,               // rad, hip roll amplitude at cadence (frame-1 hips shift)
  torsoBob: 0.012,             // m, bob at 2× cadence
  // --- landing ---
  braceMinImpact: 2.0,         // m/s; curbs don't brace
  bracePerImpact: 0.22,        // brace01 per m/s of impact above the minimum
  braceDecay: 5,               // 1/s
  forkMax: 0.07,               // m, max frame squash at a full brace
  forkStiffness: 22,           // rad/s, critically-damped squash recovery (~0.2 s)
  // --- hop pivot ---
  airPivotRate: 18,            // 1/s, pitch pivot blends centre → rear contact when airborne
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

/** Two-bone sagittal IK. hip, target = [y, z]. Returns { hipRot, kneeRot, reach } in three.js rotation.x terms. */
export function legIK(hip, target, l1, l2) {
  const dy = target[0] - hip[0], dz = target[1] - hip[1];
  let L = Math.hypot(dy, dz);
  const reach = L;
  L = clamp(L, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const alpha = Math.atan2(-dz, -dy);                         // direction hip→target as a hang angle
  const beta = Math.acos(clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1));
  const hipRot = alpha - beta;                                 // knee bends forward (+z)
  const ky = hip[0] - l1 * Math.cos(hipRot), kz = hip[1] - l1 * Math.sin(hipRot);
  const sy = hip[0] + dy * (L / reach || 1) - ky, sz = hip[1] + dz * (L / reach || 1) - kz;
  const shinAbs = Math.atan2(-sz, -sy);
  return { hipRot, kneeRot: shinAbs - hipRot, reach };
}

/** Forward kinematics of the leg, for tests and for the host to check: returns sole [y, z]. */
export function legFK(hip, hipRot, kneeRot, l1, l2) {
  const ky = hip[0] - l1 * Math.cos(hipRot), kz = hip[1] - l1 * Math.sin(hipRot);
  const a = hipRot + kneeRot;
  return [ky - l2 * Math.cos(a), kz - l2 * Math.sin(a)];
}

export function createRiderPose(config = POSE_CONFIG) {
  const C = { ...POSE_CONFIG, ...config };

  const pose = {
    // rig channels (host maps these 1:1, see NOTES.md)
    hipsY: 0, hipsZ: 0,            // riderRig.position.y / .z
    hipRoll: 0,                    // riderRig.rotation.z (hip rock)
    torsoDelta: 0,                 // upperBody.rotation.x, about torsoPivot (added to the baked 0.36)
    bobY: 0,                       // upperBody.position.y offset
    headPitch: 0,                  // head counter-rotation so the gaze stays forward
    shoulderL: 0, shoulderR: 0,    // arm-group rotation.x (upper arm)
    elbowL: 0, elbowR: 0,          // forearm-group rotation.x about the elbow — hands stay on the bars
    crankAngle: 0,                 // crank.rotation.x = -crankAngle (arm box along +y at 0)
    hipL: 0, kneeL: 0, hipR: 0, kneeR: 0, // leg groups / shin groups rotation.x
    // bike channels
    pitchOffsetY: 0, pitchOffsetZ: 0, // pitchGroup.position (rear-contact pivot for the hop pitch)
    squash: 0,                     // m: pitchGroup.position.y -= squash, wheel groups y = 0.34 + squash
    brace01: 0,
    // bookkeeping the bail integrator needs (pre-bail motion — physics zeroes speed when it bails)
    last: { x: 0, y: 0, z: 0, heading: 0, speed: 0, vy: 0 },
  };

  // spring state per blended channel [value, velocity]
  const ch = { hipsY: [0, 0], hipsZ: [0, 0], torsoDelta: [0, 0] };
  let squashVel = 0, pivotW = 0, wasGrounded = true, prevY = null, airVy = 0, cadenceT = 0;

  function spring(c, target, w, dt) {
    const x0 = c[0] - target, v0 = c[1], e = Math.exp(-w * dt), k = v0 + w * x0;
    c[0] = target + (x0 + k * dt) * e; c[1] = (v0 - w * k * dt) * e;
  }

  function reset() {
    for (const k in ch) { ch[k][0] = 0; ch[k][1] = 0; }
    pose.crankAngle = 0; pose.squash = 0; pose.brace01 = 0; squashVel = 0; pivotW = 0;
    wasGrounded = true; prevY = null; airVy = 0; cadenceT = 0;
    return pose;
  }

  function step(dt, S, input = {}) {
    if (!(dt > 0)) return pose;
    const grounded = S.grounded !== false;
    const pedal = +input.pedal || 0;
    const speed = S.speed || 0;
    const crouch = clamp(S.crouch01 || 0, 0, 1);

    // ---- touchdown detection (impact from measured descent) ----
    if (prevY !== null && !grounded) airVy = (S.y - prevY) / dt;
    if (!wasGrounded && grounded) {
      const impact = -airVy;
      if (impact > C.braceMinImpact) {
        const b = clamp((impact - C.braceMinImpact) * C.bracePerImpact, 0, 1);
        pose.brace01 = Math.max(pose.brace01, b);
        squashVel -= b * C.forkMax * C.forkStiffness * Math.E; // impulse: peak squash ≈ b·forkMax
      }
    }
    wasGrounded = grounded; prevY = S.y;
    pose.brace01 *= Math.exp(-C.braceDecay * dt);

    // ---- which pose ----
    const pedalling = grounded && pedal > 0 && speed > C.pedalMinSpeed && crouch < 0.25;
    let base = !grounded ? C.airPose : pedalling ? C.pedalPose : C.coastPose;
    const t = [0, 1, 2].map(i => base[i] + (C.crouchPose[i] - base[i]) * (grounded ? crouch : 0) + C.bracePose[i] * pose.brace01);
    spring(ch.hipsY, t[0], C.poseStiffness, dt);
    spring(ch.hipsZ, t[1], C.poseStiffness, dt);
    spring(ch.torsoDelta, t[2], C.poseStiffness, dt);
    pose.hipsY = ch.hipsY[0]; pose.hipsZ = ch.hipsZ[0]; pose.torsoDelta = ch.torsoDelta[0];

    // ---- cranks: driven when pedalling, freewheel to level otherwise ----
    if (pedalling) {
      pose.crankAngle += (speed / C.wheelRadius / C.gearRatio) * dt;
      cadenceT = pose.crankAngle;
    } else {
      // level = pedals horizontal: crankAngle ≡ π/2 (mod π)
      const lvl = Math.round((pose.crankAngle - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
      pose.crankAngle += (lvl - pose.crankAngle) * (1 - Math.exp(-C.levelRate * dt));
    }
    pose.crankAngle = ((pose.crankAngle % TAU) + TAU) % TAU;

    // ---- pedalling life: hip rock + bob (fade out off the pedals) ----
    const life = pedalling ? 1 : 0;
    pose.hipRoll += (life * C.hipRock * Math.sin(cadenceT) - pose.hipRoll) * (1 - Math.exp(-12 * dt));
    pose.bobY += (life * C.torsoBob * Math.sin(2 * cadenceT) - pose.bobY) * (1 - Math.exp(-12 * dt));

    // ---- legs: IK to the pedals (feet never leave them — crouch included) ----
    const hip = [C.hipJoint[0] + pose.hipsY, C.hipJoint[1] + pose.hipsZ];
    const pedalAt = a => [C.crankCenter[0] + C.crankRadius * Math.cos(a), C.crankCenter[1] + C.crankRadius * Math.sin(a)];
    const L = legIK(hip, pedalAt(-pose.crankAngle), C.thigh, C.shin);
    const R = legIK(hip, pedalAt(-pose.crankAngle + Math.PI), C.thigh, C.shin);
    pose.hipL = L.hipRot; pose.kneeL = L.kneeRot; pose.hipR = R.hipRot; pose.kneeR = R.kneeRot;

    // ---- arms: aim the (rigid) arm at the bars after the torso hinge ----
    const th = pose.torsoDelta, piv = C.torsoPivot;
    const rot = ([y, z]) => { const ry = y - piv[0], rz = z - piv[1]; return [piv[0] + ry * Math.cos(th) - rz * Math.sin(th), piv[1] + ry * Math.sin(th) + rz * Math.cos(th)]; };
    const sh = rot(C.shoulder); sh[0] += pose.hipsY + pose.bobY; sh[1] += pose.hipsZ;
    // two-bone arm IK: a rotation.x of r adds r to a vector's angle atan2(z, y); the arm group sits inside the
    // hinged upper body (th), the forearm group sits at the elbow. Elbow solution nearest the rest bend (soft, down/back).
    const ang = (y, z) => Math.atan2(z, y);
    const er = C.elbowRest, fr = [C.handRest[0] - er[0], C.handRest[1] - er[1]];
    const l1 = Math.hypot(er[0], er[1]), l2 = Math.hypot(fr[0], fr[1]);
    const u0 = ang(er[0], er[1]), f0 = ang(fr[0], fr[1]);
    const hy = C.barGrip[0] - sh[0], hz = C.barGrip[1] - sh[1];
    const D = clamp(Math.hypot(hy, hz), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * C.armReachMax), a = ang(hy, hz);
    const b = Math.acos(clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
    let best = null;
    for (const sgn of [1, -1]) {
      const u = a + sgn * b;
      const ey = l1 * Math.cos(u), ez = l1 * Math.sin(u);
      const f = ang(D * Math.cos(a) - ey, D * Math.sin(a) - ez);
      const bendErr = Math.abs(Math.atan2(Math.sin((f - u) - (f0 - u0)), Math.cos((f - u) - (f0 - u0))));
      if (!best || bendErr < best.err) best = { u, f, err: bendErr };
    }
    pose.shoulderL = pose.shoulderR = best.u - u0 - th;
    pose.elbowL = pose.elbowR = Math.atan2(Math.sin((best.f - best.u) - (f0 - u0)), Math.cos((best.f - best.u) - (f0 - u0)));
    pose.headPitch = -0.7 * th;

    // ---- squash (fork / frame compression) ----
    {
      const w = C.forkStiffness, x0 = pose.squash, v0 = -squashVel; // squash positive = compressed
      const e = Math.exp(-w * dt), k = v0 + w * x0;
      pose.squash = Math.max(0, (x0 + k * dt) * e);
      squashVel = -((v0 - w * k * dt) * e);
    }

    // ---- hop pitch pivot: centre on the ground (slopes), rear contact in the air (front-first pop) ----
    pivotW += ((grounded ? 0 : 1) - pivotW) * (1 - Math.exp(-C.airPivotRate * dt));
    const pz = C.rearContactZ * pivotW, th2 = -(S.pitch || 0); // pitchGroup.rotation.x
    // offset = pivot − R(pivot), pivot = (y 0, z pz); rotation.x θ maps (y,z) → (y·cosθ − z·sinθ, y·sinθ + z·cosθ)
    pose.pitchOffsetY = pz * Math.sin(th2);
    pose.pitchOffsetZ = pz - pz * Math.cos(th2);

    // ---- pre-bail motion snapshot (for the bail integrator) ----
    if (!S.bailed) {
      const l = pose.last;
      l.x = S.x; l.y = S.y; l.z = S.z; l.heading = S.heading; l.speed = speed; l.vy = grounded ? 0 : (S.vy ?? airVy);
    }
    return pose;
  }

  return { pose, step, reset, config: C };
}

export default createRiderPose;
