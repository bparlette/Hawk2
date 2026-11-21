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
    z: 0,
    heading: 0,
    speed: 0,
    phase: 0,
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
    state.x = player.x + ch * 1.45;
    state.z = player.z - sh * 1.45;
    state.heading = player.heading;
    state.speed = 0;
    state.phase = 0;
    state.active = true;
    av.group.position.set(state.x, 0, state.z);
    av.group.rotation.y = state.heading;
    av.group.visible = true;

    player.onFoot = true;
    player.x = state.x;
    player.z = state.z;
    return true;
  }

  function findNearestVehicle({ parkedVehs, followers, traffic, playerCarId }) {
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

    // 3. Live AI traffic cars (nearby or slowed/stopped — GTA carjack!)
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

  function update(dt, input, camYaw, player, poseIdle, poseWalk, deps) {
    if (!state.active || !state.avatar) return;

    // Camera-relative GTA movement
    const moveFwd = (input.throttle || 0) - (input.brake ? 1 : 0);
    const moveRight = input.steer || 0;
    const mag = Math.hypot(moveFwd, moveRight);

    if (mag > 0.12) {
      const nFwd = moveFwd / mag, nRight = moveRight / mag;
      // Camera looks along (sin(camYaw), cos(camYaw)); screen-right is (cos(camYaw), -sin(camYaw))
      // Wait: world +heading moves along (sin h, cos h). Turning right subtracts from heading.
      const sx = Math.sin(camYaw), cz = Math.cos(camYaw);
      const rx = -cz, rz = sx; // wait check right vector of forward(sx, cz): cross((sx,0,cz), (0,1,0)) = (-cz, 0, sx)? Let's verify: forward=(0,0,1) -> +Z south, up=(0,1,0). In THREE right-handed: +X is left or right? If cam is behind car looking +Z, screen right is -X = (-cz, sx)!
      const wx = sx * nFwd - cz * nRight;
      const wz = cz * nFwd + sx * nRight;
      const moveH = Math.atan2(wx, wz);

      const walkSpd = input.boost ? 7.8 : 4.6;
      state.speed = walkSpd * Math.min(1, mag);
      state.x += wx * state.speed * dt;
      state.z += wz * state.speed * dt;
      state.heading = moveH;

      // Keep pedestrian out of building walls
      const pTmp = { x: state.x, z: state.z, speed: state.speed, vLat: 0 };
      collide(pTmp, world.colliders, 0.45);
      state.x = pTmp.x;
      state.z = pTmp.z;

      state.phase += dt * (input.boost ? 12.5 : 8.5);
      poseWalk(state.avatar, state.phase);
    } else {
      state.speed = 0;
      poseIdle(state.avatar, performance.now() / 1000);
    }

    state.avatar.group.position.set(state.x, 0, state.z);
    state.avatar.group.rotation.y = state.heading;

    player.x = state.x;
    player.z = state.z;
    player.heading = state.heading;
    player.speed = state.speed;

    findNearestVehicle(deps);
  }

  return { state, exitCar, enterVehicle, update };
}
