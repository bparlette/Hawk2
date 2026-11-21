// Bunny Hop — rider pose + bail tests. Run: node --test games/bunny-hop/src/rider/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRiderPose, POSE_CONFIG as P, legFK } from './riderPose.js';
import { createBailSim, BAIL_CONFIG as B } from './bailSim.js';
import { createBike, CONFIG } from '../physics/bikePhysics.js';

const DT = 1 / 60;
const S0 = (o = {}) => ({ x: 0, y: 0, z: 0, heading: 0, speed: 0, vy: 0, pitch: 0, lean: 0, grounded: true, crouch01: 0, bailed: false, ...o });
const flat = { groundAt: () => ({ height: 0, type: 'ground' }), waterLevel: -10 };

const pedalPos = a => [P.crankCenter[0] + P.crankRadius * Math.cos(a), P.crankCenter[1] + P.crankRadius * Math.sin(a)];
function footError(p) {
  const hip = [P.hipJoint[0] + p.hipsY, P.hipJoint[1] + p.hipsZ];
  const fl = legFK(hip, p.hipL, p.kneeL, P.thigh, P.shin), fr = legFK(hip, p.hipR, p.kneeR, P.thigh, P.shin);
  const pl = pedalPos(-p.crankAngle), pr = pedalPos(-p.crankAngle + Math.PI);
  return Math.max(Math.hypot(fl[0] - pl[0], fl[1] - pl[1]), Math.hypot(fr[0] - pr[0], fr[1] - pr[1]));
}
function handError(p) {
  // shoulder after hinge + offsets, hand = shoulder + R(torsoDelta + shoulder) · handRest
  const th = p.torsoDelta, [py, pz] = P.torsoPivot;
  const ry = P.shoulder[0] - py, rz = P.shoulder[1] - pz;
  const sy = py + ry * Math.cos(th) - rz * Math.sin(th) + p.hipsY + p.bobY, sz = pz + ry * Math.sin(th) + rz * Math.cos(th) + p.hipsZ;
  const rot = (v, r) => [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)];
  const r1 = th + p.shoulderL, r2 = r1 + p.elbowL;
  const e = rot(P.elbowRest, r1), f = rot([P.handRest[0] - P.elbowRest[0], P.handRest[1] - P.elbowRest[1]], r2);
  return Math.hypot(sy + e[0] + f[0] - P.barGrip[0], sz + e[1] + f[1] - P.barGrip[1]);
}

test('pedalling: feet stay on the pedals through the whole crank cycle; cadence = speed / r / gear', () => {
  const r = createRiderPose(); r.reset();
  let maxErr = 0, a0 = null;
  for (let i = 0; i < 180; i++) {
    const p = r.step(DT, S0({ speed: 7 }), { pedal: 1 });
    if (i === 59) a0 = p.crankAngle;
    if (i === 119) {
      const turned = ((p.crankAngle - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const expect = (7 / P.wheelRadius / P.gearRatio) % (2 * Math.PI);
      assert.ok(Math.abs(turned - expect) < 1e-6, `crank turned ${turned} vs ${expect} in 1 s`);
    }
    maxErr = Math.max(maxErr, footError(p));
  }
  assert.ok(maxErr < 0.005, `foot-pedal error ${maxErr}`);
});

test('pedalling life: hips rock and torso bobs at cadence; both vanish when coasting', () => {
  const r = createRiderPose(); r.reset();
  let rollMax = 0, bobMax = 0;
  for (let i = 0; i < 180; i++) { const p = r.step(DT, S0({ speed: 6 }), { pedal: 1 }); if (i > 60) { rollMax = Math.max(rollMax, Math.abs(p.hipRoll)); bobMax = Math.max(bobMax, Math.abs(p.bobY)); } }
  assert.ok(rollMax > 0.03 && rollMax <= P.hipRock + 1e-9, `hip rock ${rollMax}`);
  assert.ok(bobMax > 0.006 && bobMax <= P.torsoBob + 1e-9, `bob ${bobMax}`);
  for (let i = 0; i < 90; i++) r.step(DT, S0({ speed: 6 }), { pedal: 0 });
  assert.ok(Math.abs(r.pose.hipRoll) < 0.002 && Math.abs(r.pose.bobY) < 0.001);
});

test('coast: cranks freewheel to level, rider sits taller than when pedalling', () => {
  const r = createRiderPose(); r.reset();
  for (let i = 0; i < 37; i++) r.step(DT, S0({ speed: 6 }), { pedal: 1 });
  const pedalTorso = r.pose.torsoDelta;
  for (let i = 0; i < 60; i++) r.step(DT, S0({ speed: 6 }), { pedal: 0 });
  const p = r.pose;
  const offLevel = Math.abs(Math.sin(p.crankAngle)) ; // level: crankAngle ≡ π/2 mod π → |sin| = 1
  assert.ok(1 - offLevel < 0.02, `cranks level (|sin| ${offLevel.toFixed(3)})`);
  assert.ok(p.torsoDelta < pedalTorso - 0.12 && p.hipsY >= 0 && p.hipsZ > 0.06, 'sits up: torso upright, hips forward');
  assert.ok(footError(p) < 0.005);
});

test('crouch: hips back and down, torso flattens, feet still on the pedals (not a whole-rig sink)', () => {
  const r = createRiderPose(); r.reset();
  for (let i = 0; i < 60; i++) r.step(DT, S0({ speed: 5, crouch01: Math.min(1, i / 27) }), { pedal: 0 });
  const p = r.pose;
  assert.ok(p.hipsY < -0.17 && p.hipsZ < -0.11, `hips ${p.hipsY.toFixed(2)}, ${p.hipsZ.toFixed(2)}`);
  assert.ok(p.torsoDelta > 0.3, 'torso toward the bars');
  assert.ok(footError(p) < 0.005, 'feet planted');
  assert.ok(handError(p) < 0.01, `hands on the bars (${handError(p).toFixed(3)} m)`);
});

test('hands track the bars in every pose', () => {
  const r = createRiderPose(); r.reset();
  const seq = [[60, S0({ speed: 7 }), 1], [60, S0({ speed: 7 }), 0], [60, S0({ speed: 4, crouch01: 1 }), 0], [60, S0({ speed: 4, grounded: false, y: 1 }), 0]];
  for (const [n, s, pedal] of seq) for (let i = 0; i < n; i++) { const p = r.step(DT, s, { pedal }); assert.ok(handError(p) < 0.02, `hand ${handError(p).toFixed(3)} (arm at full reach may fall ≤ 2 cm short)`); }
});

test('air: cranks level, legs still, body back over the rear wheel', () => {
  const r = createRiderPose(); r.reset();
  for (let i = 0; i < 40; i++) r.step(DT, S0({ speed: 7 }), { pedal: 1 });
  let prevHip = null, maxLegRate = 0;
  for (let i = 0; i < 30; i++) {
    const p = r.step(DT, S0({ speed: 7, grounded: false, y: 0.5 }), { pedal: 1 }); // pedal held: legs still stop in the air
    if (i > 18 && prevHip !== null) maxLegRate = Math.max(maxLegRate, Math.abs(p.hipL - prevHip) / DT);
    prevHip = p.hipL;
  }
  const p = r.pose;
  assert.ok(1 - Math.abs(Math.sin(p.crankAngle)) < 0.05, 'cranks level');
  assert.ok(maxLegRate < 0.6, `legs nearly still (${maxLegRate.toFixed(2)} rad/s)`);
  assert.ok(p.hipsZ < -0.09 && p.hipsY > 0.03, 'standing, hips back');
});

test('hop pitch pivots on the rear contact point in the air, on the centre on the ground', () => {
  const r = createRiderPose(); r.reset();
  for (let i = 0; i < 40; i++) r.step(DT, S0({ grounded: false, y: 0.6, pitch: 0.3 }), {});
  const p = r.pose, th = -0.3;
  // rear contact (y 0, z −0.52) after rotation + offset must stay at (0, −0.52)
  const z0 = P.rearContactZ, y1 = 0 * Math.cos(th) - z0 * Math.sin(th) + p.pitchOffsetY, z1 = 0 * Math.sin(th) + z0 * Math.cos(th) + p.pitchOffsetZ;
  assert.ok(Math.abs(y1) < 1e-3 && Math.abs(z1 - z0) < 1e-3, `rear contact moved to ${y1.toFixed(4)}, ${z1.toFixed(4)}`);
  for (let i = 0; i < 40; i++) r.step(DT, S0({ pitch: 0.15 }), {});
  assert.ok(Math.abs(r.pose.pitchOffsetY) < 1e-3 && Math.abs(r.pose.pitchOffsetZ) < 1e-3, 'grounded: centre pivot (slopes)');
});

/** Drop the pose from height h onto flat ground; return peak squash and brace. */
function landFrom(h) {
  const r = createRiderPose(); r.reset();
  let y = h, vy = 0, peak = 0, brace = 0, t = 0, settledAt = null;
  r.step(DT, S0({ grounded: false, y }), {});
  while (y > 0) { vy -= 13 * DT; y = Math.max(0, y + vy * DT); r.step(DT, S0({ grounded: y > 0 ? false : true, y }), {}); }
  for (let i = 0; i < 90; i++, t += DT) { const p = r.step(DT, S0({ y: 0 }), {}); peak = Math.max(peak, p.squash); brace = Math.max(brace, p.brace01); if (settledAt === null && i > 3 && p.squash < 0.002) settledAt = t; }
  return { peak, brace, settledAt };
}

test('landing: brace + squash scale with impact, capped, nothing on a curb, recovers in < 0.4 s', () => {
  const curb = landFrom(0.12), hop = landFrom(0.8), big = landFrom(2.0);
  assert.equal(curb.peak, 0); assert.equal(curb.brace, 0);
  assert.ok(hop.peak > 0.01 && big.peak > hop.peak, `squash ${hop.peak.toFixed(3)} < ${big.peak.toFixed(3)}`);
  assert.ok(big.peak <= P.forkMax * 1.05, `cap ${big.peak}`);
  assert.ok(big.brace > hop.brace && big.brace <= 1);
  assert.ok(big.settledAt !== null && big.settledAt < 0.4, `squash recovered at ${big.settledAt}`);
});

test('no pops: every channel moves smoothly through pedal → crouch → hop → land → coast', () => {
  const bike = createBike(CONFIG);
  bike.reset({ x: 0, z: 0, heading: 0 }, flat);
  bike.state.speed = 6;
  const r = createRiderPose(); r.reset();
  const keys = ['hipsY', 'hipsZ', 'torsoDelta', 'hipRoll', 'bobY', 'squash', 'pitchOffsetY', 'pitchOffsetZ', 'shoulderL', 'elbowL'];
  let prev = null;
  for (let i = 0; i < 240; i++) {
    const held = i >= 40 && i < 70, rel = i === 70, pedal = i < 40 || i > 150 ? 0.5 : 0;
    bike.step(DT, { pedal, steer: 0, hopHeld: held, hopReleased: rel, airPitch: 0 }, flat);
    const p = { ...r.step(DT, bike.state, { pedal }) };
    const lim = { hipsY: 0.03, hipsZ: 0.03, bobY: 0.03, squash: 0.05 /* the impact itself: peaks in ~45 ms */, pitchOffsetY: 0.03, pitchOffsetZ: 0.03, torsoDelta: 0.1, hipRoll: 0.1, shoulderL: 0.1, elbowL: 0.1 }; // m or rad per 1/60 s
    if (prev) for (const k of keys) assert.ok(Math.abs(p[k] - prev[k]) < lim[k], `frame ${i} ${k} jumped ${(p[k] - prev[k]).toFixed(3)}`);
    prev = p;
  }
});

test('frame-rate independence: 30 vs 144 fps pose blend agrees', () => {
  const at = fps => { const r = createRiderPose(); r.reset(); for (let t = 0; t < 1 - 1e-9; t += 1 / fps) r.step(1 / fps, S0({ speed: 5, crouch01: 1 }), {}); return r.pose; };
  const a = at(30), b = at(144);
  for (const k of ['hipsY', 'hipsZ', 'torsoDelta']) assert.ok(Math.abs(a[k] - b[k]) < 1e-6, k);
});

test('pre-bail snapshot keeps the motion that physics zeroes on bail', () => {
  const r = createRiderPose(); r.reset();
  r.step(DT, S0({ x: 3, z: 4, heading: 1, speed: 9 }), { pedal: 1 });
  r.step(DT, S0({ x: 3, z: 4, heading: 1, speed: 0, bailed: true }), {});
  assert.equal(r.pose.last.speed, 9);
  assert.equal(r.pose.last.heading, 1);
});

// ---------------- bail integrator (frame-3) ----------------

test('bail: rider separates and flies flat on a ballistic arc while the bike skids and falls over', () => {
  const sim = createBailSim();
  sim.start({ x: 0, y: 0, z: 0, heading: 0, speed: 9, vy: 0 }, flat);
  let apex = 0, sep = 0, midPitch = null, landedEv = 0;
  for (let i = 0; i < 300; i++) {
    const b = sim.step(DT, flat);
    apex = Math.max(apex, b.rider.y);
    sep = Math.max(sep, Math.hypot(b.rider.x - b.bike.x, b.rider.z - b.bike.z));
    if (i === 20) midPitch = b.rider.pitch;
    landedEv += b.events.filter(e => e.type === 'riderLanded').length;
  }
  const b = sim.state;
  const expectApex = B.launchHeight + B.upKick ** 2 / (2 * B.gravity);
  assert.ok(Math.abs(apex - expectApex) < 0.02, `apex ${apex.toFixed(3)} vs ${expectApex.toFixed(3)}`);
  assert.ok(sep > 2, `rider ${sep.toFixed(2)} m from the bike`);
  assert.ok(midPitch < -0.6 && midPitch > -2.2, `mid-flight body pitch ${midPitch.toFixed(2)} (toward flat)`);
  assert.equal(landedEv, 1);
  assert.equal(b.phase, 'rest');
  assert.ok(Math.abs(b.rider.pitch - B.flatPitch) < 0.05, 'lying flat');
  assert.ok(Math.abs(b.bike.roll - B.bikeLieRoll) < 0.02 && b.bike.speed === 0, 'bike on its side, stopped');
  assert.ok(b.rider.y > 0 && b.rider.y < 0.3, 'rider on the ground');
  for (const v of [b.rider.x, b.rider.y, b.rider.z, b.rider.pitch, b.bike.x, b.bike.roll]) assert.ok(Number.isFinite(v));
});

test('bail over water (bridge rail): one riderWater event with entry speed, then the host takes over', () => {
  const env = { groundAt: (x, z) => (z < 1 ? { height: 4.0, type: 'deck' } : { height: -1.6, type: 'water' }), waterLevel: 0 };
  const sim = createBailSim();
  sim.start({ x: 0, y: 4.0, z: 0.5, heading: 0, speed: 6, vy: 0 }, env);
  const evs = [];
  for (let i = 0; i < 200; i++) evs.push(...sim.step(DT, env).events);
  const wet = evs.filter(e => e.type === 'riderWater');
  assert.equal(wet.length, 1);
  assert.equal(evs.filter(e => e.type === 'riderLanded').length, 0);
  assert.equal(sim.state.phase, 'water');
  const fall = 4.0 + B.launchHeight;
  const expect = Math.hypot(6 * B.carry, Math.sqrt(B.upKick ** 2 + 2 * B.gravity * fall));
  assert.ok(Math.abs(wet[0].speed - expect) < 0.4, `entry ${wet[0].speed.toFixed(2)} vs ${expect.toFixed(2)}`);
});

test('slow bail still separates visibly; idle sim does nothing', () => {
  const sim = createBailSim();
  assert.deepEqual(sim.step(DT, flat).events, []);
  sim.start({ x: 0, y: 0, z: 0, heading: 0, speed: 0.3, vy: 0 }, flat);
  for (let i = 0; i < 120; i++) sim.step(DT, flat);
  assert.ok(Math.hypot(sim.state.rider.x, sim.state.rider.z) > 0.6);
});

test('bail into a bin: the bike stays against the bin (never climbs the lid); the body never passes through it', () => {
  const env = { waterLevel: -10, groundAt: (x, z) => (Math.abs(x - 2) < 0.52 && Math.abs(z) < 0.52 ? { height: 1.1, type: 'bin' } : { height: 0, type: 'ground' }) };
  const sim = createBailSim();
  sim.start({ x: 1.4, y: 0, z: 0, heading: Math.PI / 2, speed: 9, vy: 0 }, env); // facing +x, bin face at x 1.48
  for (let i = 0; i < 240; i++) {
    const b = sim.step(DT, env);
    assert.ok(b.bike.x < 1.48 && b.bike.y === 0, `bike at x ${b.bike.x.toFixed(2)} y ${b.bike.y}`);
    const inBin = Math.abs(b.rider.x - 2) < 0.52 && Math.abs(b.rider.z) < 0.52;
    if (inBin) assert.ok(b.rider.y >= 1.1, `body inside the bin at y ${b.rider.y.toFixed(2)}`);
  }
  assert.equal(sim.state.phase, 'rest');
});

test('body sliding off a ledge falls again instead of floating', () => {
  const env = { waterLevel: -10, groundAt: (x, z) => ({ height: z < 3 ? 1.5 : 0, type: 'deck' }) };
  const sim = createBailSim();
  sim.start({ x: 0, y: 1.5, z: 0, heading: 0, speed: 4, vy: 0 }, env);
  for (let i = 0; i < 300; i++) sim.step(DT, env);
  const r = sim.state.rider;
  assert.ok(r.z >= 3, `body slid past the ledge (z ${r.z.toFixed(2)})`);
  assert.ok(r.y < 0.3, `rider beyond the ledge at y ${r.y.toFixed(2)}`);
  assert.equal(sim.state.phase, 'rest');
});
