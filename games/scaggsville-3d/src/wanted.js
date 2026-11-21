// Scaggsville 3D — Howard County Police & 1-5 Star Wanted System (GTA 5 loop)
import * as THREE from 'three';
import { createCar, pursue, collide } from './drive.js';

// Cherie ruling (2026-11-21): NO COP CHASES in Scaggsville 3D. The wanted
// system stays in the tree (fully reversible) but pursuit is gated OFF:
// addHeat is a no-op, no cruisers ever spawn or pursue, stars stay at 0 and
// the HUD star row is hidden in index.html. Kosack's scripted fake-cop
// pull-over minigame (src/missions.js) is a separate system — canon, not a
// chase — and is NOT touched by this gate. Flip to true to restore chases.
const PURSUIT_ENABLED = false;

const STAR_THRESHOLDS = [0, 18, 42, 68, 86, 100];

function buildCopMesh() {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshPhysicalMaterial({ color: 0xf0f4f8, roughness: 0.24, metalness: 0.18, clearcoat: 0.9 });
  const navyMat = new THREE.MeshPhysicalMaterial({ color: 0x162442, roughness: 0.28, metalness: 0.25, clearcoat: 0.85 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16181e, roughness: 0.88 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x182232, roughness: 0.06, metalness: 0.4, clearcoat: 1.0, transparent: true, opacity: 0.72 });

  // Body (white hood/trunk + dark navy doors/roof cruiser two-tone)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.46, 4.65), whiteMat);
  hull.position.y = 0.54;
  hull.castShadow = true;
  g.add(hull);

  const doors = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.44, 1.95), navyMat);
  doors.position.set(0, 0.54, -0.05);
  g.add(doors);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.48, 2.05), glassMat);
  cabin.position.set(0, 1.00, -0.18);
  g.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.08, 1.65), whiteMat);
  roof.position.set(0, 1.28, -0.22);
  g.add(roof);

  const bumpF = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.16, 4.76), darkMat);
  bumpF.position.y = 0.34;
  g.add(bumpF);

  // 4 wheels
  const wheelGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 12).rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.82, 1.38], [0.82, 1.38], [-0.82, -1.35], [0.82, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.position.set(wx, 0.31, wz);
    g.add(w);
  }

  // Headlights + bright taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2626 });
  for (const sx of [-0.60, 0.60]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.06), headMat);
    hl.position.set(sx, 0.62, 2.34);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.06), tailMat);
    tl.position.set(sx, 0.64, -2.34);
    g.add(tl);
  }

  // Alternating Red/Blue Lightbar on roof!
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 0.24), darkMat);
  barBase.position.set(0, 1.35, -0.22);
  g.add(barBase);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 2.8 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x2266ff, emissive: 0x1155ff, emissiveIntensity: 2.8 });
  const redPod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.22), redMat);
  redPod.position.set(-0.30, 1.40, -0.22);
  g.add(redPod);
  const bluePod = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.22), blueMat);
  bluePod.position.set(0.30, 1.40, -0.22);
  g.add(bluePod);

  return { group: g, redMat, blueMat };
}

export function createWanted(scene, world, D) {
  const spawnPts = [];
  for (const r of D.roads) {
    if (r.pts && r.pts.length >= 2 && r.w >= 6) {
      const a = r.pts[0], b = r.pts[1];
      spawnPts.push({ x: a[0], z: a[1], h: Math.atan2(b[0] - a[0], b[1] - a[1]) });
    }
  }

  const cops = []; // { state, meshObj, active, hitCd }
  for (let i = 0; i < 4; i++) {
    const meshObj = buildCopMesh();
    meshObj.group.visible = false;
    scene.add(meshObj.group);
    cops.push({ state: createCar(0, 0, 0), meshObj, active: false, hitCd: 0 });
  }

  const state = {
    stars: 0,
    heat: 0,
    evadeTimer: 0,
    spotted: false,
    bustedTimer: 0,
    flashPhase: 0,
  };

  function starsFromHeat(h) {
    for (let s = 5; s >= 1; s--) {
      if (h >= STAR_THRESHOLDS[s]) return s;
    }
    return 0;
  }

  function pickCopSpawn(px, pz) {
    let best = null, bestScore = Infinity;
    for (let t = 0; t < 36; t++) {
      const p = spawnPts[Math.floor(Math.random() * spawnPts.length)];
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d >= 70 && d <= 165) {
        const sc = Math.abs(d - 105);
        if (sc < bestScore) { bestScore = sc; best = p; }
      }
    }
    return best || { x: px + 85, z: pz + 45, h: 0 };
  }

  function addHeat(amount, reason = '') {
    if (!PURSUIT_ENABLED) return { promoted: false, stars: 0, reason };
    const prevStars = state.stars;
    state.heat = Math.min(100, state.heat + amount);
    state.stars = starsFromHeat(state.heat);
    state.evadeTimer = 14.0;
    state.spotted = true;
    return { promoted: state.stars > prevStars, stars: state.stars, reason };
  }

  function clearAllCops() {
    for (const c of cops) {
      c.active = false;
      c.meshObj.group.visible = false;
    }
  }

  function forceClear(escapedBonus = false) {
    clearAllCops();
    state.stars = 0;
    state.heat = 0;
    state.evadeTimer = 0;
    state.spotted = false;
    state.bustedTimer = 0;
  }

  function update(dt, playerCar, fx, audio, callbacks = {}) {
    if (!PURSUIT_ENABLED) {
      // gated off: keep any pre-gate state cleared, sirens silent, no spawns
      if (state.stars !== 0 || state.heat !== 0) forceClear();
      else clearAllCops();
      if (audio && audio.siren) audio.siren(false);
      return;
    }
    state.flashPhase += dt * 11;
    const blinkA = Math.sin(state.flashPhase) > 0;

    if (state.stars === 0) {
      if (audio && audio.siren) audio.siren(false);
      return;
    }

    const px = playerCar.x, pz = playerCar.z;
    const wantCount = Math.min(4, Math.max(1, state.stars));
    let minCopDist = Infinity;

    for (let i = 0; i < cops.length; i++) {
      const cop = cops[i];
      if (i < wantCount) {
        if (!cop.active || Math.hypot(cop.state.x - px, cop.state.z - pz) > 290) {
          const sp = pickCopSpawn(px, pz);
          cop.state.x = sp.x;
          cop.state.z = sp.z;
          cop.state.heading = Math.atan2(px - sp.x, pz - sp.z);
          cop.state.speed = 18;
          cop.state.vLat = 0;
          cop.active = true;
          cop.hitCd = 0;
          cop.meshObj.group.visible = true;
        }
        if (cop.hitCd > 0) cop.hitCd -= dt;

        // Intercept slightly ahead of the player for thrilling chases
        const leadDist = Math.min(16, Math.abs(playerCar.speed) * 0.45);
        const tx = px + Math.sin(playerCar.heading) * leadDist;
        const tz = pz + Math.cos(playerCar.heading) * leadDist;
        pursue(cop.state, tx, tz, dt, world.surfaceAt(cop.state.x, cop.state.z), {
          boost: state.stars >= 3,
          arriveDist: 6,
        });
        const maxCopSpd = 26 + state.stars * 3.8;
        if (cop.state.speed > maxCopSpd) cop.state.speed = maxCopSpd;
        collide(cop.state, world.colliders);

        cop.meshObj.group.position.set(cop.state.x, 0, cop.state.z);
        cop.meshObj.group.rotation.y = cop.state.heading;
        cop.meshObj.redMat.emissiveIntensity = blinkA ? 4.2 : 0.2;
        cop.meshObj.blueMat.emissiveIntensity = blinkA ? 0.2 : 4.2;

        const d = Math.hypot(cop.state.x - px, cop.state.z - pz);
        if (d < minCopDist) minCopDist = d;

        // Player-vs-Cop ramming
        if (!playerCar.onFoot && !playerCar.airborne && d < 2.15 && cop.hitCd <= 0) {
          cop.hitCd = 0.7;
          const nx = (px - cop.state.x) / Math.max(0.1, d);
          const nz = (pz - cop.state.z) / Math.max(0.1, d);
          playerCar.x += nx * 0.65;
          playerCar.z += nz * 0.65;
          playerCar.speed *= 0.68;
          cop.state.speed *= 0.5;
          playerCar.hitImpulse = Math.max(playerCar.hitImpulse || 0, 0.8);
          if (fx) fx.burst('spark', (px + cop.state.x) * 0.5, 0.75, (pz + cop.state.z) * 0.5, 12, 7.5, 0.28, 0.5);
          if (audio && audio.crash) audio.crash(0.85);
          addHeat(8, 'COP RAMMED');
        }
      } else if (cop.active) {
        cop.active = false;
        cop.meshObj.group.visible = false;
      }
    }

    if (audio && audio.siren) audio.siren(minCopDist < 150);

    // Spotted / Cooldown / Busted loop
    if (minCopDist < 115) {
      state.spotted = true;
      state.evadeTimer = 14.0;
    } else {
      state.spotted = false;
      state.evadeTimer -= dt;
      if (state.evadeTimer <= 0) {
        const escapedStars = state.stars;
        forceClear(true);
        if (audio && audio.siren) audio.siren(false);
        if (callbacks.onEscape) callbacks.onEscape(escapedStars);
        return;
      }
    }

    // BUSTED check: pinned & stopped near a cop for 3.0 seconds
    if (minCopDist < 6.0 && Math.abs(playerCar.speed) < 2.2) {
      state.bustedTimer += dt;
      if (state.bustedTimer >= 3.0) {
        const lostStars = state.stars;
        forceClear(false);
        if (audio && audio.siren) audio.siren(false);
        if (callbacks.onBusted) callbacks.onBusted(lostStars);
      }
    } else {
      state.bustedTimer = Math.max(0, state.bustedTimer - dt * 1.5);
    }
  }

  return {
    state,
    cops,
    addHeat,
    clear: forceClear,
    update,
  };
}
