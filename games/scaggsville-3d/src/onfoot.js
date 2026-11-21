// Scaggsville 3D — GTA-style Step Out On Foot, Walk/Sprint & Enter/Carjack Any Vehicle
import * as THREE from 'three';
import { collide } from './drive.js';

export function createOnFoot(ctx) {
  const {
    scene,
    world,
    CREW_PEOPLE,
    CREW_VEHICLES,
    VEHICLE_ROWS,
    buildPerson,
    buildVehicle,
    seatDriver,
  } = ctx;

  const state = {
    active: false,
    x: 0,
    y: 0,
    vy: 0,
    z: 0,
    heading: 0,
    speed: 0,
    phase: 0,
    onRoof: false,
    rollTimer: 0,
    avatar: null,
    avatarId: null,
    // Record of all parked vehicles placed in the world when player swaps rides
    leftCars: [], // { veh, x, z, heading, carId }
    nearestTarget: null,
  };

  function ensureAvatar(carId) {
    const key = CREW_PEOPLE[carId] ? carId : 'brad';
    if (state.avatar && state.avatarId === key) return state.avatar;
    if (state.avatar) scene.remove(state.avatar.group);
    state.avatar = buildPerson(CREW_PEOPLE[key]);
    state.avatarId = key;
    state.avatar.group.visible = false;
    scene.add(state.avatar.group);
    return state.avatar;
  }

  // Called by host when exiting active car (`playerVeh`, `player`, `playerCarId`)
  function exitCar(player, playerVeh, playerCarId, initialAvatarId) {
    if (state.active) return false;
    if (Math.abs(player.speed) > 4.8 || player.airborne) return false;

    player.speed = 0;
    player.vLat = 0;
    player.driftAngle = 0;
    player.drifting = false;
    player.slip = 0;

    // Leave active car parked at its exact spot
    if (playerVeh) {
      playerVeh.group.position.set(player.x, 0, player.z);
      playerVeh.group.rotation.set(0, player.heading, 0);
      if (playerVeh._driver) playerVeh._driver.group.visible = false;
      playerVeh.setLights && playerVeh.setLights({ brake: false, reverse: false, nightK: 0.2 });
      state.leftCars.push({
        veh: playerVeh,
        x: player.x,
        z: player.z,
        heading: player.heading,
        carId: playerCarId,
      });
    }

    // Spawn player's dressed avatar beside driver's door (+X left side)
    const av = ensureAvatar(initialAvatarId || playerCarId);
    const ch = Math.cos(player.heading), sh = Math.sin(player.heading);
    state.x = player.x + ch * 1.55;
    state.y = 0;
    state.vy = 0;
    state.z = player.z - sh * 1.55;
    state.heading = player.heading;
    state.speed = 0;
    state.phase = 0;
    state.onRoof = false;
    state.rollTimer = 0;
    state.active = true;
    av.group.position.set(state.x, 0, state.z);
    av.group.rotation.set(0, state.heading, 0);
    av.group.visible = true;

    player.onFoot = true;
    player.x = state.x;
    player.z = state.z;
    return true;
  }

  function findNearestVehicle({ parkedVehs, followers, traffic, wanted, playerCarId }) {
    let best = null;
    let bestD = 5.4;

    // 1. Any cars the player previously exited
    for (let i = 0; i < state.leftCars.length; i++) {
      const lc = state.leftCars[i];
      const d = Math.hypot(lc.x - state.x, lc.z - state.z);
      if (d < bestD) {
        bestD = d;
        const label = (CREW_VEHICLES[lc.carId]?.name) || lc.veh?.row?.name || 'Your Car';
        best = { kind: 'left', idx: i, veh: lc.veh, x: lc.x, z: lc.z, heading: lc.heading, carId: lc.carId, name: label, dist: d };
      }
    }

    // 2. Crew cars still parked at crew houses
    if (parkedVehs) {
      for (const [carId, veh] of Object.entries(parkedVehs)) {
        const p = veh.group.position;
        const d = Math.hypot(p.x - state.x, p.z - state.z);
        if (d < bestD) {
          bestD = d;
          const label = CREW_VEHICLES[carId]?.name || carId;
          best = { kind: 'parked', veh, x: p.x, z: p.z, heading: veh.group.rotation.y, carId, name: label, dist: d };
        }
      }
    }

    // 3. Active Howard County Police Cruisers (GTA cop-car hijack!)
    if (wanted && wanted.cops) {
      for (let i = 0; i < wanted.cops.length; i++) {
        const cop = wanted.cops[i];
        if (!cop.active) continue;
        const d = Math.hypot(cop.state.x - state.x, cop.state.z - state.z);
        if (d < bestD + 0.8) {
          bestD = d;
          best = { kind: 'cop', cop, x: cop.state.x, z: cop.state.z, heading: cop.state.heading, name: 'Howard County PD Cruiser', dist: d };
        }
      }
    }

    // 4. Live AI traffic cars (nearby or slowed/stopped — GTA carjack!)
    if (traffic && traffic.cars) {
      for (const tc of traffic.cars) {
        if (!tc.active || tc.hijacked) continue;
        const d = Math.hypot(tc.x - state.x, tc.z - state.z);
        if (d < bestD + 0.8) {
          bestD = d;
          best = { kind: 'traffic', trafficCar: tc, x: tc.x, z: tc.z, heading: tc.heading, name: tc.name, dist: d };
        }
      }
    }

    state.nearestTarget = best;
    return best;
  }

  function enterVehicle(target, { parkedVehs, player, driverAvatarId, wanted, onHijack }) {
    if (!state.active || !target) return null;

    let chosenVeh = null;
    let chosenCarId = driverAvatarId;

    if (target.kind === 'left') {
      chosenVeh = target.veh;
      chosenCarId = target.carId;
      state.leftCars.splice(target.idx, 1);
      if (chosenVeh._driver) chosenVeh._driver.group.visible = true;
    } else if (target.kind === 'parked') {
      chosenVeh = target.veh;
      chosenCarId = target.carId;
      // Leave it parked? No, player is taking it — seat player's avatar or car owner
      delete parkedVehs[target.carId];
    } else if (target.kind === 'cop') {
      const cop = target.cop;
      cop.active = false;
      cop.meshObj.group.visible = false;
      chosenVeh = buildVehicle({
        ...VEHICLE_ROWS.sedanGrey,
        paint: 0xf0f4f8,
        paint2: 0x162442,
        twoTone: 'band',
        lightBar: true,
        name: 'Howard County PD Cruiser',
      });
      chosenVeh.isCopCar = true;
      chosenVeh.group.position.set(cop.state.x, 0, cop.state.z);
      chosenVeh.group.rotation.y = cop.state.heading;
      scene.add(chosenVeh.group);
      chosenCarId = 'hcpd_cruiser';
      if (wanted) wanted.addHeat(30, 'COP CAR STOLEN!');
      if (onHijack) onHijack({ name: 'Howard County PD Cruiser', isCopCar: true });
    } else if (target.kind === 'traffic') {
      const tc = target.trafficCar;
      tc.hijacked = true;
      const rowTemplate = tc.style === 'hatch'
        ? { ...VEHICLE_ROWS.hatchRed, paint: tc.color, name: tc.name }
        : (tc.style === 'astro2'
          ? { ...VEHICLE_ROWS.vanWhite, paint: tc.color, name: tc.name }
          : { ...VEHICLE_ROWS.sedanGrey, paint: tc.color, name: tc.name });
      chosenVeh = buildVehicle(rowTemplate);
      chosenVeh.group.position.set(tc.x, 0, tc.z);
      chosenVeh.group.rotation.y = tc.heading;
      scene.add(chosenVeh.group);
      chosenCarId = 'traffic_' + tc.id;
      if (wanted) wanted.addHeat(22, 'CARJACKED!');
      if (onHijack) onHijack(tc);
    }

    if (!chosenVeh) return null;

    if (!chosenVeh._driver) {
      seatDriver(chosenVeh, driverAvatarId);
    } else {
      chosenVeh._driver.group.visible = true;
    }

    if (state.avatar) state.avatar.group.visible = false;
    state.active = false;
    state.nearestTarget = null;

    player.onFoot = false;
    player.x = target.x;
    player.z = target.z;
    player.heading = target.heading;
    player.speed = 0;
    player.vLat = 0;

    return { veh: chosenVeh, carId: chosenCarId };
  }

  function collectVehicleBoxes(deps) {
    const boxes = [];
    for (const lc of state.leftCars) boxes.push({ x: lc.x, z: lc.z, h: lc.heading, hw: 1.02, hl: 2.35, roofH: 1.24 });
    if (deps?.parkedVehs) {
      for (const veh of Object.values(deps.parkedVehs)) {
        const p = veh.group.position;
        boxes.push({ x: p.x, z: p.z, h: veh.group.rotation.y, hw: 1.02, hl: 2.35, roofH: 1.24 });
      }
    }
    if (deps?.traffic?.cars) {
      for (const tc of deps.traffic.cars) {
        if (tc.active && !tc.hijacked && Math.hypot(tc.x - state.x, tc.z - state.z) < 12) {
          boxes.push({ x: tc.x, z: tc.z, h: tc.heading, hw: 0.98, hl: 2.25, roofH: 1.22 });
        }
      }
    }
    if (deps?.wanted?.cops) {
      for (const cop of deps.wanted.cops) {
        if (cop.active && Math.hypot(cop.state.x - state.x, cop.state.z - state.z) < 12) {
          boxes.push({ x: cop.state.x, z: cop.state.z, h: cop.state.heading, hw: 1.02, hl: 2.35, roofH: 1.28 });
        }
      }
    }
    return boxes;
  }

  let vaultLatch = false;
  function triggerVaultOrRoll(deps) {
    if (!state.active || state.rollTimer > 0) return false;
    const boxes = collectVehicleBoxes(deps);
    for (const b of boxes) {
      if (Math.hypot(b.x - state.x, b.z - state.z) < 2.85 && !state.onRoof) {
        state.x += (b.x - state.x) * 0.42;
        state.z += (b.z - state.z) * 0.42;
        state.y = b.roofH;
        state.vy = 2.6;
        state.onRoof = true;
        return 'vault';
      }
    }
    state.rollTimer = 0.36;
    return 'roll';
  }

  function update(dt, input, camYaw, player, poseIdle, poseWalk, deps) {
    if (!state.active || !state.avatar) return;

    if (input.handbrake) {
      if (!vaultLatch) { vaultLatch = true; triggerVaultOrRoll(deps); }
    } else {
      vaultLatch = false;
    }

    // Camera-relative GTA movement
    const moveFwd = (input.throttle || 0) - (input.brake ? 1 : 0);
    const moveRight = input.steer || 0;
    const mag = Math.hypot(moveFwd, moveRight);

    if (state.rollTimer > 0) {
      state.rollTimer = Math.max(0, state.rollTimer - dt);
      const rollSpd = 8.8;
      state.x += Math.sin(state.heading) * rollSpd * dt;
      state.z += Math.cos(state.heading) * rollSpd * dt;
      state.speed = rollSpd;
    } else if (mag > 0.12) {
      const nFwd = moveFwd / mag, nRight = moveRight / mag;
      const sx = Math.sin(camYaw), cz = Math.cos(camYaw);
      const wx = sx * nFwd - cz * nRight;
      const wz = cz * nFwd + sx * nRight;
      const moveH = Math.atan2(wx, wz);

      const walkSpd = input.boost ? 7.8 : 4.6;
      state.speed = walkSpd * Math.min(1, mag);
      state.x += wx * state.speed * dt;
      state.z += wz * state.speed * dt;
      state.heading = moveH;

      state.phase += dt * (input.boost ? 12.5 : 8.5);
      poseWalk(state.avatar, state.phase);
    } else {
      state.speed = 0;
      poseIdle(state.avatar, performance.now() / 1000);
    }

    // Keep pedestrian out of building walls
    const pTmp = { x: state.x, z: state.z, speed: state.speed, vLat: 0 };
    collide(pTmp, world.colliders, 0.45);
    state.x = pTmp.x;
    state.z = pTmp.z;

    // Solid vehicle body collision + roof-standing physics!
    const boxes = collectVehicleBoxes(deps);
    let supportY = 0;
    for (const b of boxes) {
      const dx = state.x - b.x, dz = state.z - b.z;
      const ch = Math.cos(b.h), sh = Math.sin(b.h);
      const lx = dx * ch - dz * sh;
      const lz = dx * sh + dz * ch;
      const rx = b.hw + 0.28, rz = b.hl + 0.28;
      if (Math.abs(lx) < rx && Math.abs(lz) < rz) {
        if (state.y >= b.roofH - 0.35) {
          supportY = Math.max(supportY, b.roofH);
        } else {
          // Push smoothly outside the nearest side of the car
          const penX = rx - Math.abs(lx), penZ = rz - Math.abs(lz);
          let nlx = lx, nlz = lz;
          if (penX < penZ) nlx = Math.sign(lx || 1) * rx;
          else nlz = Math.sign(lz || 1) * rz;
          state.x = b.x + nlx * ch + nlz * sh;
          state.z = b.z - nlx * sh + nlz * ch;
        }
      }
    }

    // Vertical gravity & roof drop
    if (state.y > supportY || state.vy > 0) {
      state.vy -= 18 * dt;
      state.y += state.vy * dt;
      if (state.y <= supportY) {
        state.y = supportY;
        state.vy = 0;
      }
    } else {
      state.y = supportY;
      state.vy = 0;
    }
    state.onRoof = state.y > 0.5;

    const baseWalkBob = state.avatar.group.position.y || 0;
    state.avatar.group.position.set(state.x, state.y + baseWalkBob, state.z);
    state.avatar.group.rotation.set(
      state.rollTimer > 0 ? ((0.36 - state.rollTimer) / 0.36) * Math.PI * 2 : 0,
      state.heading,
      0
    );

    player.x = state.x;
    player.y = state.y;
    player.z = state.z;
    player.heading = state.heading;
    player.speed = state.speed;

    findNearestVehicle(deps);
  }

  return { state, exitCar, enterVehicle, triggerVaultOrRoll, update };
}
