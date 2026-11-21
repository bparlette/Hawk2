// Scaggsville 3D — Free-Roam Side Activities (Street Races, Drift Zones) & Cinematic Slow-Mo Stunt Jumps
import * as THREE from 'three';
import { createCar, pursue, collide } from './drive.js';

export function createActivities({ scene, world, D, buildVehicle, CREW_VEHICLES, showBanner, addScore, gameAudio }) {
  const route = D.route || [];
  const flares = []; // { id, kind:'race'|'drift', name, rivalId, routeIdx, x, z, heading, beam, ring }

  const defs = [
    { id: 'race1',  kind: 'race',  name: 'SCAGGSVILLE SPRINT',  rivalId: 'clayton', frac: 0.14, color: 0xb84dff },
    { id: 'drift1', kind: 'drift', name: 'RESERVOIR DRIFT ZONE', rivalId: null,     frac: 0.36, color: 0x38e0ff },
    { id: 'race2',  kind: 'race',  name: 'ROUTE 216 RUN',       rivalId: 'rigg',    frac: 0.58, color: 0xb84dff },
    { id: 'drift2', kind: 'drift', name: 'DERBY SLIDE ZONE',    rivalId: null,      frac: 0.78, color: 0x38e0ff },
  ];

  const beamGeo = new THREE.CylinderGeometry(1.1, 1.1, 22, 10, 1, true);
  const ringGeo = new THREE.RingGeometry(2.4, 3.3, 24);
  ringGeo.rotateX(-Math.PI / 2);

  for (const def of defs) {
    if (route.length < 40) break;
    const idx = Math.min(route.length - 30, Math.max(4, Math.floor(route.length * def.frac)));
    const a = route[idx], b = route[Math.min(route.length - 1, idx + 4)];
    const heading = Math.atan2(b[0] - a[0], b[1] - a[1]);

    const bMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
    const rMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const beam = new THREE.Mesh(beamGeo, bMat);
    beam.position.set(a[0], 11, a[1]);
    const ring = new THREE.Mesh(ringGeo, rMat);
    ring.position.set(a[0], 0.11, a[1]);
    scene.add(beam); scene.add(ring);

    flares.push({ ...def, routeIdx: idx, x: a[0], z: a[1], heading, beam, ring });
  }

  // Active checkpoint visual for street races (2 meshes reused)
  const cpBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 28, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false })
  );
  const cpRing = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 4.4, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  cpBeam.visible = cpRing.visible = false;
  scene.add(cpBeam); scene.add(cpRing);

  // ---------------- 1. Cinematic Slow-Mo Stunt Jump Camera ----------------
  const stunt = {
    active: false,
    timer: 0,
    startX: 0,
    startZ: 0,
    sideSign: 1,
    camX: 0,
    camZ: 0,
    timeScale: 1.0,
  };

  function triggerStunt(playerCar) {
    if (!playerCar || Math.abs(playerCar.speed) < 16) return;
    stunt.active = true;
    stunt.timer = 1.25;
    stunt.startX = playerCar.x;
    stunt.startZ = playerCar.z;
    stunt.sideSign = Math.random() < 0.5 ? -1 : 1;
    const h = playerCar.heading;
    // Place cinematic side camera slightly ahead and to the side of the launch arc
    stunt.camX = playerCar.x + Math.sin(h) * 14 - Math.cos(h) * 8.5 * stunt.sideSign;
    stunt.camZ = playerCar.z + Math.cos(h) * 14 + Math.sin(h) * 8.5 * stunt.sideSign;
    stunt.timeScale = 0.42;
  }

  function updateStuntCamera(dt, camera, player) {
    if (!stunt.active) return false;
    camera.position.lerp(new THREE.Vector3(stunt.camX, Math.max(2.0, (player.y || 0) * 0.45 + 2.1), stunt.camZ), Math.min(1, dt * 6));
    camera.up.set(0, 1, 0);
    camera.lookAt(player.x, (player.y || 0) + 1.0, player.z);
    return true;
  }

  // ---------------- 2. Street Races & Drift Zones ----------------
  let active = null; // { kind:'race'|'drift', flare, timer, pts, cps:[], cpIdx, rival:{state,veh}, cd }
  let nearbyFlare = null;

  function clearActive() {
    if (!active) return;
    if (active.rival && active.rival.veh) scene.remove(active.rival.veh.group);
    cpBeam.visible = cpRing.visible = false;
    active = null;
  }

  function startActivity(fl, player) {
    clearActive();
    if (fl.kind === 'race') {
      const cps = [];
      for (let k = 1; k <= 6; k++) {
        const ri = Math.min(route.length - 1, fl.routeIdx + k * 28);
        cps.push({ x: route[ri][0], z: route[ri][1] });
      }
      const rivalId = fl.rivalId || 'clayton';
      const rx = player.x - Math.cos(player.heading) * 3.2;
      const rz = player.z + Math.sin(player.heading) * 3.2;
      const rState = createCar(rx, rz, player.heading);
      const rVeh = buildVehicle(CREW_VEHICLES[rivalId] || CREW_VEHICLES.clayton);
      rVeh.group.position.set(rx, 0, rz);
      rVeh.group.rotation.y = player.heading;
      scene.add(rVeh.group);

      cpBeam.position.set(cps[0].x, 14, cps[0].z);
      cpRing.position.set(cps[0].x, 0.12, cps[0].z);
      cpBeam.visible = cpRing.visible = true;

      active = { kind: 'race', flare: fl, cps, cpIdx: 0, rival: { state: rState, veh: rVeh, cpIdx: 0 }, timer: 0, cd: 1.5 };
      if (gameAudio?.stunt) gameAudio.stunt();
      showBanner(`🏁 ${fl.name}`, `Beat ${CREW_VEHICLES[rivalId]?.name || 'Rival'} through 6 checkpoints for $1,200!`, 2400);
    } else {
      active = { kind: 'drift', flare: fl, timer: 22.0, pts: 0, goal: 220 };
      if (gameAudio?.stunt) gameAudio.stunt();
      showBanner(`💨 ${fl.name}`, 'Score 220 drift pts in 22s for $800!', 2400);
    }
    return true;
  }

  function startNearby(player) {
    if (active || !nearbyFlare || !player || player.onFoot) return false;
    return startActivity(nearbyFlare, player);
  }

  function update(dt, player, nightK = 0.2) {
    // Stunt cam decay & landing distance check
    if (stunt.active) {
      stunt.timer -= dt;
      if (stunt.timer <= 0 || (!player.airborne && stunt.timer < 0.95)) {
        const distM = Math.round(Math.hypot(player.x - stunt.startX, player.z - stunt.startZ));
        stunt.active = false;
        stunt.timeScale = 1.0;
        if (distM >= 14) {
          const bonus = Math.max(150, distM * 14);
          if (addScore) addScore(bonus, `STUNT ${distM}m!`);
          if (showBanner) showBanner(`INSANE STUNT · ${distM}m`, `+$${bonus} Stunt Bonus!`, 2000);
        }
      }
    } else {
      stunt.timeScale += (1.0 - stunt.timeScale) * Math.min(1, dt * 8);
    }

    // Pulse flare rings & detect nearby start flare
    const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.08;
    nearbyFlare = null;
    for (const fl of flares) {
      fl.beam.visible = !active;
      fl.ring.visible = !active;
      if (!active) {
        fl.ring.scale.set(pulse, 1, pulse);
        if (!player.onFoot && Math.hypot(player.x - fl.x, player.z - fl.z) < 16) nearbyFlare = fl;
      }
    }

    if (!active) return;

    if (active.kind === 'race') {
      active.timer += dt;
      const cp = active.cps[active.cpIdx];
      if (cp && Math.hypot(player.x - cp.x, player.z - cp.z) < 15) {
        active.cpIdx++;
        if (gameAudio?.uiTap) gameAudio.uiTap();
        if (active.cpIdx >= active.cps.length) {
          const won = active.rival.cpIdx < active.cps.length;
          const cash = won ? 1200 : 350;
          if (addScore) addScore(cash, won ? 'RACE WINNER!' : 'RACE FINISHED');
          if (gameAudio?.finale) gameAudio.finale();
          showBanner(won ? '🏆 STREET RACE WON!' : '🏁 RACE FINISHED', `+$${cash} · ${active.timer.toFixed(1)}s`, 3200);
          clearActive();
          return;
        }
        const nx = active.cps[active.cpIdx];
        cpBeam.position.set(nx.x, 14, nx.z);
        cpRing.position.set(nx.x, 0.12, nx.z);
      }

      // Rival racer AI
      const rv = active.rival;
      const rcp = active.cps[Math.min(rv.cpIdx, active.cps.length - 1)];
      if (rcp) {
        const d = pursue(rv.state, rcp.x, rcp.z, dt, world.surfaceAt(rv.state.x, rv.state.z), { boost: false, arriveDist: 8 });
        if (rv.state.speed > 34) rv.state.speed = 34;
        collide(rv.state, world.colliders);
        rv.veh.group.position.set(rv.state.x, 0, rv.state.z);
        rv.veh.group.rotation.y = rv.state.heading;
        rv.veh.updateWheels(rv.state.speed, rv.state.steerVis, dt);
        if (rv.veh.setLights) rv.veh.setLights({ brake: false, reverse: false, nightK });
        if (d < 14 && rv.cpIdx < active.cps.length) rv.cpIdx++;
      }
    } else if (active.kind === 'drift') {
      active.timer -= dt;
      if (player.drifting) active.pts += dt * Math.abs(player.speed) * 2.2;
      if (active.timer <= 0) {
        const won = active.pts >= active.goal;
        const cash = won ? 800 : Math.round(active.pts * 2);
        if (cash > 0 && addScore) addScore(cash, won ? 'DRIFT KING!' : 'DRIFT ZONE');
        if (won && gameAudio?.finale) gameAudio.finale();
        showBanner(won ? '💨 DRIFT ZONE CLEARED!' : 'DRIFT ZONE OVER', `${Math.round(active.pts)} pts · +$${cash}`, 2800);
        clearActive();
      }
    }
  }

  return {
    flares,
    get nearbyFlare() { return nearbyFlare; },
    get active() { return active; },
    get stuntActive() { return stunt.active; },
    get timeScale() { return stunt.timeScale; },
    triggerStunt,
    startNearby,
    startById(id, player) { const fl = flares.find(f => f.id === id); return fl ? startActivity(fl, player) : false; },
    cancel: clearActive,
    update,
    updateStuntCamera,
  };
}
