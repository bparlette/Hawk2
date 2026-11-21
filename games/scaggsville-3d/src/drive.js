// Scaggsville 3D — arcade car physics, drift, suspension & pursuit steering.
// Pure functions, no three.js: the host renders with them and the node
// play-proof (tools/proof.mjs) steps the same code along the real route.
//
// State: { x, z, heading, speed, vLat, driftAngle, drifting, slip, pitch, roll, y, vy, airborne, airTime, justLanded, hitImpulse }
// heading: radians, forward = (sin h, cos h) in (x, z-south)
// Input: { throttle -1..1, steer -1..1, brake bool, boost bool, handbrake bool }

export const CAR = {
  accel: 14.5,          // m/s^2 at full throttle (snappy launch)
  brakeDecel: 24,
  reverseMax: 8,
  topSpeed: 42,         // m/s ~ 151 km/h arcade cap on straights
  topSpeedGrass: 16,
  dragK: 0.0105,        // quadratic drag -> terminal ~ topSpeed on road
  rollK: 2.0,           // rolling resistance
  steerMax: 0.64,       // rad at standstill, tapers with speed
  // TURBO (2D Scaggsville precedent: hold-to-boost, charge ring on the button)
  boostTopMul: 1.7,     // 42 -> ~71 m/s cap while boosting
  boostAccel: 1.28,     // extra accel as a multiple of CAR.accel
  boostDragMul: 0.30,   // drag cut so ~1.5x top speed is actually reachable
  boostDrain: 1 / 5,    // charge per second while boosting (5 s of boost)
  boostRegen: 1 / 7,    // charge per second while not boosting
};

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function createCar(x, z, heading) {
  return {
    x, z, heading,
    speed: 0,
    steerVis: 0,
    offroad: false,
    charge: 1,
    boosting: false,
    // Drift / slip & suspension dynamics (GTA 5 / OutRun arcade feel)
    vLat: 0,
    driftAngle: 0,
    drifting: false,
    slip: 0,
    pitch: 0,
    roll: 0,
    y: 0,
    vy: 0,
    airborne: false,
    airTime: 0,
    justLanded: 0,
    hitImpulse: 0,
  };
}

export function stepCar(car, input, dt, surface) {
  const onGrass = surface === 'grass';
  let top = onGrass ? CAR.topSpeedGrass : CAR.topSpeed;
  car.offroad = onGrass;

  // Guard fields if called with a legacy minimal car object
  if (car.charge === undefined) { car.charge = 1; car.boosting = false; }
  if (car.vLat === undefined) {
    car.vLat = 0; car.driftAngle = 0; car.drifting = false; car.slip = 0;
    car.pitch = 0; car.roll = 0; car.y = 0; car.vy = 0;
    car.airborne = false; car.airTime = 0; car.justLanded = 0; car.hitImpulse = 0;
  }

  // Turbo boost (followers/AI never pass input.boost)
  car.boosting = !!(input.boost && input.throttle > 0 && car.charge > 0.02);
  if (car.boosting) {
    car.charge = Math.max(0, car.charge - CAR.boostDrain * dt);
    top *= CAR.boostTopMul;
  } else {
    car.charge = Math.min(1, car.charge + CAR.boostRegen * dt);
  }

  const handbrake = !!input.handbrake;
  const spdAbs = Math.abs(car.speed);

  // Steering tapers smoothly with speed, extra bite on handbrake initiation
  const sf = 1 / (1 + spdAbs * 0.052);
  const steer = clamp(input.steer || 0, -1, 1) * CAR.steerMax * sf;
  car.steerVis += (steer - car.steerVis) * Math.min(1, dt * 11);

  // Longitudinal throttle / brake
  let a = 0;
  if (handbrake && spdAbs > 3) {
    a -= Math.sign(car.speed) * CAR.brakeDecel * 0.42;
  } else if (input.brake && car.speed > 0.5) {
    a -= CAR.brakeDecel;
  } else if (input.brake && car.speed <= 0.5) {
    a -= CAR.accel * 0.65; // reverse
  } else {
    a += (input.throttle || 0) * CAR.accel;
  }
  if (car.boosting) a += (input.throttle || 0) * CAR.accel * CAR.boostAccel;

  a -= car.speed * CAR.rollK * 0.12;
  const surfDrag = onGrass ? 2.5 : 1;
  a -= Math.sign(car.speed) * car.speed * car.speed * CAR.dragK * surfDrag * (car.boosting ? CAR.boostDragMul : 1);

  if (!car.airborne) {
    car.speed += a * dt;
    if (car.speed > top) car.speed = Math.max(top, car.speed - 26 * dt);
    if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
    if (Math.abs(car.speed) < 0.04 && (input.throttle || 0) === 0 && !input.brake && !handbrake) car.speed = 0;
  }

  // Heading & lateral drift velocity
  const wheelBase = 2.7;
  const isSliding = !car.airborne && spdAbs > 6 && (handbrake || (spdAbs > 14 && Math.abs(input.steer || 0) > 0.55));
  const yawMul = handbrake && spdAbs > 6 ? 1.24 : 1.0;
  if (!car.airborne) {
    car.heading -= (car.speed / wheelBase) * Math.tan(car.steerVis) * yawMul * dt;
  }

  // Kick rear outward cleanly during handbrake or high-speed cornering, grip back quickly on straightaways
  const targetLat = !car.airborne && spdAbs > 5
    ? (input.steer || 0) * Math.min(spdAbs, 26) * (handbrake ? 0.50 : (spdAbs > 14 && Math.abs(input.steer || 0) > 0.55 ? 0.24 : 0.05))
    : 0;
  const gripRate = car.airborne ? 0.4 : (handbrake ? 2.6 : (onGrass ? 3.2 : 6.2));
  car.vLat += (targetLat - car.vLat) * Math.min(1, gripRate * dt);
  if (Math.abs(car.vLat) < 0.02 && !isSliding) car.vLat = 0;

  // Move along heading + lateral slip vector
  const sh = Math.sin(car.heading), ch = Math.cos(car.heading);
  car.x += (sh * car.speed + ch * car.vLat) * dt;
  car.z += (ch * car.speed - sh * car.vLat) * dt;

  // Visual drift counter-angle & slip meter (drives skidmarks, tire smoke, screech audio & combo score)
  const targetDriftAngle = !car.airborne && car.speed > 4
    ? clamp(-Math.atan2(car.vLat, Math.max(5, spdAbs)) * 0.80, -0.46, 0.46)
    : 0;
  car.driftAngle += (targetDriftAngle - car.driftAngle) * Math.min(1, dt * 10);

  const brakeSlip = input.brake && car.speed > 10 ? 0.72 : 0;
  const launchSlip = (input.throttle || 0) > 0.8 && car.speed >= 0 && car.speed < 8 && (car.boosting || handbrake) ? 0.85 : 0;
  const latSlip = Math.min(1, Math.abs(car.vLat) / 7.2);
  car.slip = car.airborne ? 0 : Math.min(1, Math.max(latSlip, brakeSlip, launchSlip));
  car.drifting = !car.airborne && Math.abs(car.vLat) > 2.4 && car.speed > 8;

  // Suspension pitch (squat on boost/throttle, dive on brake) + body roll (lean in turns)
  const targetPitch = car.airborne
    ? clamp(-car.vy * 0.015, -0.14, 0.14)
    : clamp(-a * 0.0036, -0.075, 0.080);
  const targetRoll = car.airborne
    ? 0
    : clamp(car.steerVis * Math.min(1, spdAbs / 18) * 0.105 + car.vLat * 0.0075, -0.11, 0.11);
  car.pitch += (targetPitch - car.pitch) * Math.min(1, dt * 9);
  car.roll += (targetRoll - car.roll) * Math.min(1, dt * 9);

  // Vertical airtime / stunt jumps
  car.justLanded = 0;
  if (car.y > 0 || car.vy > 0) {
    car.vy -= 21 * dt;
    car.y += car.vy * dt;
    if (car.y <= 0) {
      car.justLanded = Math.min(1, Math.abs(car.vy) / 13);
      car.y = 0;
      car.vy = 0;
      car.airborne = false;
    } else {
      car.airborne = true;
      car.airTime += dt;
    }
  } else {
    car.airborne = false;
  }

  return car;
}

// Circle (car) vs OBB colliders. Collider frame: local = R(-ry) applied as
// lx = dx*cos - dz*sin ; lz = dx*sin + dz*cos  (cos/sin of the box rotation).
export function collide(car, colliders, radius = 1.05) {
  let hit = false;
  for (const c of colliders) {
    const dx = car.x - c.cx, dz = car.z - c.cz;
    if (dx * dx + dz * dz > (c.hw + c.hd + radius + 2) * (c.hw + c.hd + radius + 2)) continue;
    const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
    let px = lx - qx, pz = lz - qz;
    const d2 = px * px + pz * pz;
    if (d2 > radius * radius) continue;
    hit = true;
    const imp = Math.min(1, Math.abs(car.speed) / 26);
    if (imp > (car.hitImpulse || 0)) car.hitImpulse = imp;
    if (d2 < 1e-8) {
      const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz);
      if (ex < ez) { px = Math.sign(lx || 1) * (ex + radius); pz = 0; }
      else { px = 0; pz = Math.sign(lz || 1) * (ez + radius); }
      const nlx = lx + (ex < ez ? px : 0), nlz = lz + (ex < ez ? 0 : pz);
      car.x = c.cx + nlx * c.cos + nlz * c.sin;
      car.z = c.cz - nlx * c.sin + nlz * c.cos;
    } else {
      const d = Math.sqrt(d2), push = (radius - d);
      const nx = px / d, nz = pz / d;
      const nlx = lx + nx * push, nlz = lz + nz * push;
      car.x = c.cx + nlx * c.cos + nlz * c.sin;
      car.z = c.cz - nlx * c.sin + nlz * c.cos;
    }
    car.speed *= 0.55;
    if (car.vLat) car.vLat *= 0.4;
  }
  return hit;
}

// Pursuit: steer toward a target point (used by convoy followers, cops & autopilot proof).
export function pursue(car, tx, tz, dt, surface, opts = {}) {
  const dx = tx - car.x, dz = tz - car.z;
  const dist = Math.hypot(dx, dz);
  const targetHeading = Math.atan2(dx, dz);
  let dh = targetHeading - car.heading;
  while (dh > Math.PI) dh -= 2 * Math.PI;
  while (dh < -Math.PI) dh += 2 * Math.PI;
  const steer = -Math.max(-1, Math.min(1, dh * 1.9));
  const slow = opts.arriveDist ? Math.max(0.25, Math.min(1, dist / opts.arriveDist)) : 1;
  const boost = !!opts.boost;
  const throttle = (Math.abs(dh) > 2.4 ? -0.4 : 1) * slow;
  stepCar(car, { throttle, steer, brake: dist < 1.2 && !!opts.stop, boost }, dt, surface);
  return dist;
}
