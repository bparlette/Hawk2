// Bunny Hop — chase camera tests. Run: node --test games/bunny-hop/src/camera/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChaseCam, CAM_CONFIG, CAMERA_ROLL, projectFraming } from './chaseCam.js';
import { createBike, CONFIG } from '../physics/bikePhysics.js';

const DT = 1 / 60, DEG = Math.PI / 180;
const ride = (o = {}) => ({ mode: 'ride', x: 0, y: 0, z: 0, heading: 0, speed: 0, grounded: true, waterLevel: -1, ...o });
const RIDER_TOP = 1.75; // m above contact: rider head on the bike (host rig)

function steps(cam, seconds, tf, dt = DT) {
  const out = [];
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) out.push({ ...cam.step(dt, typeof tf === 'function' ? tf(i * dt) : tf) });
  return out;
}

test('rig at rest: 3.8 m behind the rear wheel, 1.65 m up, never rolls', () => {
  const cam = createChaseCam();
  const s = cam.reset(ride({ x: 5, y: 1.72, z: 2, heading: Math.PI / 2 }));
  assert.ok(Math.abs(s.x - (5 - 4.3)) < 1e-9 && Math.abs(s.z - 2) < 1e-9, `pos ${s.x},${s.z}`);
  assert.ok(Math.abs(s.y - (1.72 + 1.65)) < 1e-9);
  assert.equal(s.roll, 0);
  assert.equal(CAMERA_ROLL, 0);
  assert.ok(!('roll' in CAM_CONFIG) && !('rollInherit' in CAM_CONFIG), 'roll is not a tunable');
});

test('acceptance framing at 390×844: rider share 30–35% of frame height, horizon in the top third', () => {
  for (const speed of [0, 7, 12]) {
    const cam = createChaseCam();
    cam.reset(ride({ speed }));
    steps(cam, 3, ride({ speed }));
    const fr = projectFraming(cam.state, 0, 0, 0, RIDER_TOP);
    assert.ok(fr.share >= 0.30 && fr.share <= 0.35, `speed ${speed}: rider share ${(fr.share * 100).toFixed(1)}%`);
    assert.ok(fr.horizon > 0.2 && fr.horizon < 1 / 3, `speed ${speed}: horizon at ${(fr.horizon * 100).toFixed(1)}% from top`);
    assert.ok(fr.top > 0.05 && fr.bottom < 0.95, 'rider fully in frame');
  }
});

test('lazy yaw: critically damped, ~0.9 s to 80%, no overshoot, settles', () => {
  const cam = createChaseCam();
  cam.reset(ride({ heading: 0, speed: 7 }));
  const yaws = steps(cam, 3, ride({ heading: Math.PI / 2, speed: 7 })).map(s => s.yaw);
  const t80 = yaws.findIndex(y => y >= 0.8 * Math.PI / 2) * DT;
  assert.ok(t80 > 0.6 && t80 < 1.2, `t80 ${t80.toFixed(2)} s`);
  for (let i = 1; i < yaws.length; i++) assert.ok(yaws[i] >= yaws[i - 1] - 1e-12 && yaws[i] <= Math.PI / 2 + 1e-9, 'no overshoot');
  assert.ok(Math.PI / 2 - yaws.at(-1) < 0.5 * DEG, 'settled within 0.5°');
});

test('yaw follow takes the short way round ±π', () => {
  const cam = createChaseCam();
  cam.reset(ride({ heading: Math.PI - 0.1 }));
  steps(cam, 2, ride({ heading: -Math.PI + 0.1 }));
  const d = Math.abs(Math.atan2(Math.sin(cam.state.yaw - (-Math.PI + 0.1)), Math.cos(cam.state.yaw - (-Math.PI + 0.1))));
  assert.ok(d < 1 * DEG, `wrapped error ${(d / DEG).toFixed(2)}°`);
});

test('tight height: a 0.5 m step is 90% followed within 0.25 s, no overshoot', () => {
  const cam = createChaseCam();
  cam.reset(ride({ y: 0 }));
  const ys = steps(cam, 1, ride({ y: 0.5 })).map(s => s.y);
  const t90 = ys.findIndex(y => y >= 1.65 + 0.45) * DT;
  assert.ok(t90 > 0 && t90 <= 0.25, `t90 ${t90.toFixed(3)} s`);
  assert.ok(Math.max(...ys) <= 1.65 + 0.5 + 1e-9);
});

test('camera ignores crouch and lean entirely', () => {
  const a = createChaseCam(), b = createChaseCam();
  a.reset(ride({ speed: 7 })); b.reset(ride({ speed: 7 }));
  steps(a, 1, ride({ speed: 7 }));
  steps(b, 1, t => ride({ speed: 7, crouch01: Math.min(1, t * 3), lean: 0.42 * Math.sin(t * 9), pitch: 0.3 }));
  for (const k of ['x', 'y', 'z', 'lookX', 'lookY', 'lookZ', 'fov', 'roll']) assert.equal(a.state[k], b.state[k], k);
});

test('fov: 60° at rest, breathes to 64° at top speed, hard cap 64° at any speed, eases (no snap)', () => {
  const cam = createChaseCam();
  cam.reset(ride());
  assert.equal(cam.state.fov, 60);
  const f1 = cam.step(DT, ride({ speed: 12 })).fov;
  assert.ok(f1 - 60 < 0.2, 'no snap');
  steps(cam, 4, ride({ speed: 12 }));
  assert.ok(cam.state.fov > 63.9 && cam.state.fov <= 64);
  steps(cam, 4, ride({ speed: 30 }));
  assert.ok(cam.state.fov <= 64);
});

test('hop: camera rises with only ~35% of the hop so the pop reads; horizon tilt is constant', () => {
  const bike = createBike(CONFIG);
  const flat = { groundAt: () => ({ height: 0, type: 'ground' }), waterLevel: -10 };
  bike.reset({ x: 0, z: 0, heading: 0 }, flat);
  bike.state.speed = 7;
  const cam = createChaseCam();
  const tgt = () => ({ mode: 'ride', ...bike.state, waterLevel: -10 });
  cam.reset(tgt());
  const pedal = 7 / 12;
  for (let i = 0; i < 30; i++) { bike.step(DT, { pedal, steer: 0, hopHeld: true, hopReleased: false, airPitch: 0 }, flat); cam.step(DT, tgt()); }
  let apexBike = 0, apexCam = 0, tilts = [];
  for (let i = 0; i < 90; i++) {
    bike.step(DT, { pedal, steer: 0, hopHeld: false, hopReleased: i === 0, airPitch: 0 }, flat);
    const s = cam.step(DT, tgt());
    apexBike = Math.max(apexBike, bike.state.y); apexCam = Math.max(apexCam, s.y - 1.65);
    tilts.push(Math.atan2(s.y - s.lookY, Math.hypot(s.lookX - s.x, s.lookZ - s.z)));
  }
  assert.ok(apexBike > 1.25);
  assert.ok(apexCam > 0.2 * apexBike && apexCam < 0.45 * apexBike, `cam rose ${apexCam.toFixed(2)} of ${apexBike.toFixed(2)}`);
  assert.ok(Math.max(...tilts) - Math.min(...tilts) < 1e-9, 'down-tilt constant: horizon never bobs');
});

test('landing impulse: impact-scaled dip, < 5% left at 150 ms, zero in air, zero for tiny drops', () => {
  const run = dropHeight => {
    const cam = createChaseCam();
    cam.reset(ride());
    let y = dropHeight, vy = 0, t = 0;
    const trace = [];
    // fall with gravity 13 from dropHeight
    while (y > 0) { vy -= 13 * DT; y = Math.max(0, y + vy * DT); const s = cam.step(DT, ride({ y, grounded: y > 0 ? false : true })); if (y > 0) assert.equal(s.shakeY, 0, 'no shake in air'); }
    for (let i = 0; i < 30; i++, t += DT) { const s = cam.step(DT, ride({ y: 0 })); trace.push({ t, d: s.shakeY }); }
    return trace;
  };
  const curb = run(0.12);
  assert.ok(curb.every(p => p.d === 0), 'curb drop: no shake');
  const small = run(0.6), big = run(2.0);
  const peak = tr => Math.min(...tr.map(p => p.d));
  assert.ok(peak(big) < peak(small) && peak(small) < 0, 'scales with impact');
  assert.ok(peak(big) >= -CAM_CONFIG.shakeMax - 1e-9);
  const at150 = big.find(p => p.t >= 0.15 - 1e-9);
  assert.ok(Math.abs(at150.d) < 0.05 * Math.abs(peak(big)), `left at 150 ms: ${(at150.d / peak(big) * 100).toFixed(1)}%`);
});

test('swim cam: at waterLevel + 0.6 m, tilted ~6° up, no fov kick, no shake', () => {
  const cam = createChaseCam();
  cam.reset(ride({ y: 0, speed: 5 }));
  steps(cam, 0.5, ride({ y: 0, speed: 5 }));
  steps(cam, 3, { mode: 'swim', x: 3, z: 4, heading: 1, speed: 2.5, grounded: true, waterLevel: -0.55 });
  const s = cam.state;
  assert.ok(Math.abs(s.y - (-0.55 + 0.6)) < 0.01, `y ${s.y}`);
  const up = Math.atan2(s.lookY - s.y, Math.hypot(s.lookX - s.x, s.lookZ - s.z)) / DEG;
  assert.ok(Math.abs(up - 6) < 0.01, `tilt ${up}`);
  assert.ok(Math.abs(s.fov - 60) < 0.1);
  assert.equal(s.shakeY, 0);
});

test('shadow frustum: 30 m square, leading the rider, rider always inside', () => {
  const cam = createChaseCam();
  cam.reset(ride({ x: 10, z: -4, heading: 0.7 }));
  const s = cam.step(DT, ride({ x: 10, z: -4, heading: 0.7 }));
  assert.equal(s.shadow.halfSize, 15);
  assert.ok(Math.abs(s.shadow.x - 10) < 15 && Math.abs(s.shadow.z + 4) < 15);
  assert.ok(Math.hypot(s.shadow.x - 10, s.shadow.z + 4) > 4, 'leads ahead');
});

test('frame-rate independence: 30 fps and 144 fps yaw + height trajectories agree', () => {
  const at = fps => {
    const cam = createChaseCam(); cam.reset(ride());
    steps(cam, 1, ride({ heading: 1.2, y: 0.4, speed: 9 }), 1 / fps);
    return cam.state;
  };
  const a = at(30), b = at(144);
  assert.ok(Math.abs(a.yaw - b.yaw) < 1e-6, `yaw ${a.yaw} vs ${b.yaw}`);
  assert.ok(Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.fov - b.fov) < 1e-6);
});

test('bail: yaw holds (watch the tumble), no shake, no NaN', () => {
  const cam = createChaseCam();
  cam.reset(ride({ heading: 0.5, speed: 8 }));
  const s = steps(cam, 1, ride({ mode: 'bail', heading: 2.5, y: 0, grounded: true })).at(-1);
  assert.ok(Math.abs(s.yaw - 0.5) < 1e-9);
  for (const k of ['x', 'y', 'z', 'lookX', 'lookY', 'lookZ', 'fov']) assert.ok(Number.isFinite(s[k]), k);
});
