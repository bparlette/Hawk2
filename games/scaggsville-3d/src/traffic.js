// Scaggsville 3D — Live AI Traffic (18 active cars cruising real OSM roads, ~6 InstancedMesh draws total)
import * as THREE from 'three';

const POOL_SIZE = 18;
const PAINT_PALETTE = [
  0xc83e37, 0x2c5c94, 0xd8dce4, 0x3b7252, 0xc89b32,
  0x5a6270, 0x7c4632, 0x262932, 0x9aa2b0, 0x455f7a,
];

function makeMergedBoxGeo(parts) {
  const geos = [];
  for (const [w, h, d, x, y, z] of parts) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    geos.push(g.toNonIndexed());
    g.dispose();
  }
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export function createTraffic(scene, world, D) {
  // Index drivable road segments >= 18 m long on multi-lane / named roads
  const spawnEdges = [];
  for (const r of D.roads) {
    if (!r.pts || r.pts.length < 2 || r.w < 5.5) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len >= 18) {
        spawnEdges.push({ road: r, segIdx: i, mx: (ax + bx) * 0.5, mz: (az + bz) * 0.5, len });
      }
    }
  }

  // Batched InstancedMesh layers for all 18 traffic cars (6 draw calls TOTAL!)
  const bodyGeo = makeMergedBoxGeo([
    [1.72, 0.44, 4.30, 0, 0.52, 0],     // lower sculpted wedge body
    [1.56, 0.16, 2.15, 0, 1.24, -0.15], // roof cap
  ]);
  const glassGeo = makeMergedBoxGeo([
    [1.52, 0.46, 2.02, 0, 0.96, -0.16], // flush wrap greenhouse
  ]);
  const darkGeo = makeMergedBoxGeo([
    [1.76, 0.14, 4.38, 0, 0.34, 0],     // bumpers & skirt
    [0.24, 0.60, 0.60, -0.78, 0.30, 1.32],  // FL wheel
    [0.24, 0.60, 0.60,  0.78, 0.30, 1.32],  // FR wheel
    [0.24, 0.60, 0.60, -0.78, 0.30, -1.28], // RL wheel
    [0.24, 0.60, 0.60,  0.78, 0.30, -1.28], // RR wheel
  ]);
  const headGeo = makeMergedBoxGeo([
    [0.34, 0.12, 0.06, -0.56, 0.62, 2.16],
    [0.34, 0.12, 0.06,  0.56, 0.62, 2.16],
  ]);
  const tailGeo = makeMergedBoxGeo([
    [0.40, 0.13, 0.06, -0.54, 0.65, -2.16],
    [0.40, 0.13, 0.06,  0.54, 0.65, -2.16],
  ]);

  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.28, clearcoat: 0.9, envMapIntensity: 1.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x162230, roughness: 0.06, metalness: 0.4, clearcoat: 1.0, transparent: true, opacity: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.88 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2626 });

  const bodyIM = new THREE.InstancedMesh(bodyGeo, bodyMat, POOL_SIZE);
  const glassIM = new THREE.InstancedMesh(glassGeo, glassMat, POOL_SIZE);
  const darkIM = new THREE.InstancedMesh(darkGeo, darkMat, POOL_SIZE);
  const headIM = new THREE.InstancedMesh(headGeo, headMat, POOL_SIZE);
  const tailIM = new THREE.InstancedMesh(tailGeo, tailMat, POOL_SIZE);

  bodyIM.castShadow = true;
  for (const im of [bodyIM, glassIM, darkIM, headIM, tailIM]) {
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
  }

  const cars = [];
  const _c = new THREE.Color();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();

  for (let i = 0; i < POOL_SIZE; i++) {
    const color = PAINT_PALETTE[i % PAINT_PALETTE.length];
    _c.setHex(color);
    bodyIM.setColorAt(i, _c);
    cars.push({
      id: i,
      active: false,
      hijacked: false,
      color,
      style: i % 3 === 0 ? 'hatch' : (i % 3 === 1 ? 'sedan' : 'astro2'),
      name: i % 3 === 0 ? 'Hatchback' : (i % 3 === 1 ? 'Commuter Sedan' : 'Work Van'),
      x: 0, z: 0, heading: 0, speed: 12, targetSpeed: 13,
      road: null, segIdx: 0, dir: 1, t: 0,
      vx: 0, vz: 0, spin: 0, stun: 0, nearMissCd: 0,
      scaleY: i % 3 === 2 ? 1.18 : 1.0,
      scaleZ: i % 3 === 0 ? 0.92 : 1.0,
    });
  }
  if (bodyIM.instanceColor) bodyIM.instanceColor.needsUpdate = true;

  function placeCarOnEdge(c, edge, px, pz) {
    const pts = edge.road.pts;
    c.road = edge.road;
    c.segIdx = edge.segIdx;
    c.dir = Math.random() < 0.5 ? 1 : -1;
    c.t = 0.2 + Math.random() * 0.6;
    const [ax, az] = pts[c.segIdx], [bx, bz] = pts[c.segIdx + 1];
    const h = c.dir > 0 ? Math.atan2(bx - ax, bz - az) : Math.atan2(ax - bx, az - bz);
    const laneOff = Math.min(2.2, Math.max(1.2, (edge.road.w || 6.5) * 0.24));
    c.x = ax + (bx - ax) * c.t + Math.cos(h) * laneOff;
    c.z = az + (bz - az) * c.t - Math.sin(h) * laneOff;
    if (Math.hypot(c.x - px, c.z - pz) < 38) return false;
    c.heading = h;
    c.targetSpeed = 10 + Math.random() * 7;
    c.speed = c.targetSpeed;
    c.vx = 0; c.vz = 0; c.spin = 0; c.stun = 0; c.nearMissCd = 0;
    c.active = true;
    c.hijacked = false;
    return true;
  }

  function spawnAround(c, px, pz) {
    for (let tries = 0; tries < 24; tries++) {
      const e = spawnEdges[Math.floor(Math.random() * spawnEdges.length)];
      const d = Math.hypot(e.mx - px, e.mz - pz);
      if (d >= 52 && d <= 260) {
        if (placeCarOnEdge(c, e, px, pz)) return true;
      }
    }
    return false;
  }

  function syncInstance(c, idx) {
    if (!c.active || c.hijacked) {
      _s.set(0, 0, 0);
      _m.makeScale(0, 0, 0);
    } else {
      _p.set(c.x, 0, c.z);
      _e.set(0, c.heading, 0);
      _q.setFromEuler(_e);
      _s.set(1, c.scaleY, c.scaleZ);
      _m.compose(_p, _q, _s);
    }
    bodyIM.setMatrixAt(idx, _m);
    glassIM.setMatrixAt(idx, _m);
    darkIM.setMatrixAt(idx, _m);
    headIM.setMatrixAt(idx, _m);
    tailIM.setMatrixAt(idx, _m);
  }

  function update(dt, playerCar, fx, audio, callbacks = {}) {
    const px = playerCar.x, pz = playerCar.z;
    const pSpd = Math.abs(playerCar.speed);

    for (let i = 0; i < POOL_SIZE; i++) {
      const c = cars[i];
      if (!c.active || c.hijacked) {
        if (!c.hijacked && Math.random() < 0.25) spawnAround(c, px, pz);
        syncInstance(c, i);
        continue;
      }

      const dPlayer = Math.hypot(c.x - px, c.z - pz);
      if (dPlayer > 310) {
        c.active = false;
        spawnAround(c, px, pz);
        syncInstance(c, i);
        continue;
      }

      if (c.nearMissCd > 0) c.nearMissCd -= dt;

      if (c.stun > 0) {
        c.stun -= dt;
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        c.vx *= Math.exp(-3.0 * dt);
        c.vz *= Math.exp(-3.0 * dt);
        c.heading += c.spin * dt;
        c.spin *= Math.exp(-4.0 * dt);
      } else if (c.road) {
        const pts = c.road.pts;
        const aIdx = c.dir > 0 ? c.segIdx : c.segIdx + 1;
        const bIdx = c.dir > 0 ? c.segIdx + 1 : c.segIdx;
        const a = pts[aIdx], b = pts[bIdx];
        if (!a || !b) {
          c.dir *= -1;
        } else {
          const laneOff = Math.min(2.2, Math.max(1.2, (c.road.w || 6.5) * 0.24));
          const segH = Math.atan2(b[0] - a[0], b[1] - a[1]);
          const tx = b[0] + Math.cos(segH) * laneOff;
          const tz = b[1] - Math.sin(segH) * laneOff;
          const dx = tx - c.x, dz = tz - c.z;
          const dEnd = Math.hypot(dx, dz);
          if (dEnd < 3.5) {
            if (c.dir > 0 && c.segIdx + 1 < pts.length - 1) c.segIdx++;
            else if (c.dir < 0 && c.segIdx > 0) c.segIdx--;
            else c.dir *= -1;
          } else {
            const wantH = Math.atan2(dx, dz);
            let dh = wantH - c.heading;
            while (dh > Math.PI) dh -= Math.PI * 2;
            while (dh < -Math.PI) dh += Math.PI * 2;
            c.heading += dh * Math.min(1, dt * 6);
            c.speed += (c.targetSpeed - c.speed) * Math.min(1, dt * 2.5);
            c.x += Math.sin(c.heading) * c.speed * dt;
            c.z += Math.cos(c.heading) * c.speed * dt;
          }
        }
      }

      // Collision & Near-Miss vs playerCar
      if (!playerCar.onFoot && !playerCar.airborne && dPlayer < 4.2) {
        const dx = c.x - px, dz = c.z - pz;
        const minR = 1.98;
        if (dPlayer < minR && dPlayer > 1e-4) {
          const nx = dx / dPlayer, nz = dz / dPlayer;
          const push = (minR - dPlayer) * 0.65;
          c.x += nx * push;
          c.z += nz * push;
          playerCar.x -= nx * push * 0.5;
          playerCar.z -= nz * push * 0.5;

          const imp = Math.abs(playerCar.speed) + c.speed * 0.4;
          c.vx = nx * Math.max(5, imp * 0.48);
          c.vz = nz * Math.max(5, imp * 0.48);
          c.spin = (Math.random() - 0.5) * 6;
          c.stun = 2.6;
          playerCar.speed *= 0.62;
          playerCar.hitImpulse = Math.max(playerCar.hitImpulse || 0, Math.min(1, imp / 25));

          if (fx) fx.burst('spark', (c.x + px) * 0.5, 0.75, (c.z + pz) * 0.5, 10, 6.5, 0.24, 0.45);
          if (audio && audio.crash) audio.crash(Math.min(1, imp / 28));
          if (callbacks.onTrafficHit) callbacks.onTrafficHit(imp, c);
          c.nearMissCd = 2.0;
        } else if (dPlayer >= minR && dPlayer <= 3.6 && pSpd >= 16 && c.nearMissCd <= 0 && c.stun <= 0) {
          c.nearMissCd = 2.2;
          if (audio && audio.horn && Math.random() < 0.65) audio.horn();
          if (callbacks.onNearMiss) callbacks.onNearMiss(c);
        }
      }

      syncInstance(c, i);
    }

    for (const im of [bodyIM, glassIM, darkIM, headIM, tailIM]) im.instanceMatrix.needsUpdate = true;
  }

  return { cars, update };
}
