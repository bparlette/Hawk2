// Bunny Hop — bail integrator (Opus seat). Pure ESM: no DOM, no three.js, plain numbers only.
// iteration-2.md Round 2b, plan push #8, frame-3: on a bail the rider SEPARATES from the bike — the body flies
// flat on a ballistic arc with a tumble, the bike goes its own way and falls on its side.
//
//   import { createBailSim, BAIL_CONFIG } from './src/rider/bailSim.js';
//   const bail = createBailSim();
//   // on the physics { type: 'bail' } event:
//   bail.start(riderPose.pose.last, env);       // pre-bail motion (physics already zeroed speed)
//   // each frame while the host is in its bail state:
//   const b = bail.step(dt, env);                // { rider: {...}, bike: {...}, phase, events }
//
// env = the same { groundAt(x,z) -> { height, type }, waterLevel } the physics uses.
// The host still owns the bail/remount/swim state machine. This module only reports
// b.events: [{ type: 'riderLanded', speed }] | [{ type: 'riderWater', speed }] (each at most once per bail).

export const BAIL_CONFIG = {
  gravity: 13.0,            // = bikePhysics CONFIG.gravity (same world)
  launchHeight: 1.15,       // m, rider centre of mass above contact at separation (hips/chest)
  carry: 0.95,              // fraction of bike speed the body keeps (the body is thrown, the bike is stopped)
  upKick: 2.6,              // m/s, upward pop as the rider goes over the bars (frame-3 arc)
  minLaunchSpeed: 1.2,      // m/s, slow bails still visibly separate
  tumbleRate: 1.1,          // rad/s of forward pitch per m/s of launch speed
  tumbleMax: 7.0,           // rad/s cap
  flatPitch: -Math.PI / 2,  // body pitch for "flat, face down, arms forward" (frame-3)
  flatPull: 3.0,            // 1/s, in flight the pitch is pulled toward flat (reads as a dive, not a cartwheel)
  slideFriction: 7.0,       // m/s², body sliding on ground
  restSpeed: 0.15,          // m/s, below this the body is at rest
  bodyHalfThick: 0.15,      // m, prone body centre above the ground when lying
  wallStep: 0.15,           // m, = bikePhysics stepUp: anything taller stops a skidding bike / sliding body
  // bike
  bikeFriction: 9.0,        // m/s², bike skidding on its side
  bikeFallRate: 4.0,        // 1/s, bike roll → bikeLieRoll
  bikeLieRoll: 1.35,        // rad, lying on its side (matches the host's current bail pose)
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createBailSim(config = BAIL_CONFIG) {
  const C = { ...BAIL_CONFIG, ...config };
  const rider = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0, pitchRate: 0, limbs01: 0 };
  const bike = { x: 0, y: 0, z: 0, yaw: 0, roll: 0, speed: 0 };
  const out = { rider, bike, phase: 'idle', t: 0, events: [] };
  let landed = false, wet = false;

  function start(last, env) {
    const fx = Math.sin(last.heading || 0), fz = Math.cos(last.heading || 0);
    const sp = Math.max(Math.abs(last.speed || 0) * C.carry, C.minLaunchSpeed) * Math.sign(last.speed || 1);
    rider.x = last.x; rider.z = last.z; rider.y = (last.y || 0) + C.launchHeight;
    rider.vx = fx * sp; rider.vz = fz * sp; rider.vy = Math.max(0, last.vy || 0) + C.upKick;
    rider.yaw = last.heading || 0; rider.pitch = 0; rider.roll = 0; rider.limbs01 = 0;
    rider.pitchRate = -clamp(Math.abs(sp) * C.tumbleRate, 0, C.tumbleMax);
    bike.x = last.x; bike.z = last.z; bike.y = last.y || 0; bike.yaw = last.heading || 0; bike.roll = 0;
    bike.speed = Math.abs(last.speed || 0) * 0.5;  // the bike stops hard (it hit something / landed badly)
    out.phase = 'flight'; out.t = 0; out.events = []; landed = false; wet = false;
    if (env) { const g = env.groundAt(bike.x, bike.z); bike.y = g && typeof g === 'object' ? g.height : +g || 0; }
    return out;
  }

  const ground = (env, x, z) => { const r = env.groundAt(x, z); return r && typeof r === 'object' ? r : { height: +r || 0, type: 'ground' }; };

  function step(dt, env) {
    out.events = [];
    if (out.phase === 'idle' || !(dt > 0)) return out;
    out.t += dt;

    // ---- bike: skid to a stop, fall onto its side ----
    const bfx = Math.sin(bike.yaw), bfz = Math.cos(bike.yaw);
    bike.speed = Math.max(0, bike.speed - C.bikeFriction * dt);
    if (bike.speed > 0) {
      const nx = bike.x + bfx * bike.speed * dt, nz = bike.z + bfz * bike.speed * dt;
      if (env && ground(env, nx, nz).height > bike.y + C.wallStep) bike.speed = 0; // stays against the wall it hit
      else { bike.x = nx; bike.z = nz; }
    }
    bike.roll += (C.bikeLieRoll - bike.roll) * (1 - Math.exp(-C.bikeFallRate * dt));
    if (env) bike.y = ground(env, bike.x, bike.z).height;

    // ---- rider ----
    if (out.phase === 'flight') {
      const vy0 = rider.vy;
      rider.vy -= C.gravity * dt;
      const fxn = rider.x + rider.vx * dt, fzn = rider.z + rider.vz * dt;
      // a body flying into a wall (bin side, building) loses its horizontal motion and drops
      if (env && ground(env, fxn, fzn).height > rider.y - C.bodyHalfThick + C.wallStep) { rider.vx = 0; rider.vz = 0; }
      else { rider.x = fxn; rider.z = fzn; }
      const prevY = rider.y;
      rider.y += vy0 * dt - 0.5 * C.gravity * dt * dt;
      // tumble that settles into a flat dive: pitch rate decays toward the pull to flat
      rider.pitchRate += (C.flatPull * (C.flatPitch - rider.pitch) - rider.pitchRate) * (1 - Math.exp(-C.flatPull * dt));
      rider.pitch += rider.pitchRate * dt;
      rider.limbs01 = Math.min(1, rider.limbs01 + dt * 4); // limbs trail out
      const g = env ? ground(env, rider.x, rider.z) : { height: -Infinity, type: 'ground' };
      if (env && g.type === 'water' && rider.vy < 0 && rider.y <= env.waterLevel && prevY > env.waterLevel) {
        rider.y = env.waterLevel;
        if (!wet) { wet = true; out.events.push({ type: 'riderWater', speed: Math.hypot(rider.vx, rider.vy, rider.vz) }); }
        out.phase = 'water';
      } else if (rider.y - C.bodyHalfThick <= g.height && rider.vy <= 0) {
        rider.y = g.height + C.bodyHalfThick;
        if (!landed) { landed = true; out.events.push({ type: 'riderLanded', speed: Math.hypot(rider.vx, rider.vy, rider.vz) }); }
        rider.vy = 0; out.phase = 'slide';
      }
    } else if (out.phase === 'slide') {
      const sp = Math.hypot(rider.vx, rider.vz);
      const ns = Math.max(0, sp - C.slideFriction * dt);
      if (sp > 0) { rider.vx *= ns / sp; rider.vz *= ns / sp; }
      const sxn = rider.x + rider.vx * dt, szn = rider.z + rider.vz * dt;
      const here = env ? ground(env, rider.x, rider.z).height : 0;
      if (env && ground(env, sxn, szn).height > here + C.wallStep) { rider.vx = 0; rider.vz = 0; }
      else { rider.x = sxn; rider.z = szn; }
      if (env) {
        const g = ground(env, rider.x, rider.z).height;
        if (g < here - C.wallStep) { out.phase = 'flight'; rider.vy = 0; } // slid off a ledge (deck, bin, curb): falls again
        else rider.y = g + C.bodyHalfThick;
      }
      rider.pitch += (C.flatPitch - rider.pitch) * (1 - Math.exp(-8 * dt));
      rider.pitchRate = 0;
      rider.limbs01 = Math.max(0, rider.limbs01 - dt * 1.5);
      if (ns < C.restSpeed) { rider.vx = rider.vz = 0; out.phase = 'rest'; }
    } else if (out.phase === 'rest') {
      rider.pitch += (C.flatPitch - rider.pitch) * (1 - Math.exp(-8 * dt));
      rider.limbs01 = Math.max(0, rider.limbs01 - dt * 1.5);
    }
    // 'water': host takes over (swim); position stays at the entry point
    return out;
  }

  function stop() { out.phase = 'idle'; out.events = []; }

  return { start, step, stop, state: out, config: C };
}

export default createBailSim;
