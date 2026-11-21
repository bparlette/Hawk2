// Scaggsville 3D — Breakable Street Props (mailboxes, trash cans, signs, cones, hydrants) + Stunt Ramps
import * as THREE from 'three';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mergeSimple(geos) {
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

export function createProps(scene, world, D) {
  const rand = mulberry32(9912345);
  const items = []; // { kind, idx, x, y, z, ry, vx, vy, vz, rx, rz, vrx, vrz, broken, waterTimer }
  const counts = { mailbox: 0, trashcan: 0, cone: 0, sign: 0, hydrant: 0 };

  const route = D.route || [];
  // Seed props deterministically along the rally route & crew streets, just off road edge
  let acc = 0;
  for (let i = 0; i < route.length - 1; i += 2) {
    const [ax, az] = route[i], [bx, bz] = route[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 4) continue;
    acc += L;
    if (acc < 38) continue;
    acc = 0;

    const nx = -(bz - az) / L, nz = (bx - ax) / L;
    const side = rand() < 0.5 ? -1 : 1;
    const off = 4.6 + rand() * 1.6;
    const px = ax + (bx - ax) * 0.5 + nx * side * off;
    const pz = az + (bz - az) * 0.5 + nz * side * off;
    if (world.surfaceAt(px, pz) !== 'grass') continue;

    const roll = rand();
    let kind = 'cone';
    if (roll < 0.28) kind = 'mailbox';
    else if (roll < 0.52) kind = 'trashcan';
    else if (roll < 0.72) kind = 'cone';
    else if (roll < 0.88) kind = 'sign';
    else kind = 'hydrant';

    if (items.length < 320) {
      const idx = counts[kind]++;
      items.push({
        kind, idx, x: px, y: 0, z: pz,
        ry: Math.atan2(nx * -side, nz * -side),
        rx: 0, rz: 0, vx: 0, vy: 0, vz: 0, vrx: 0, vrz: 0,
        broken: false, resting: false, waterTimer: 0, waterAcc: 0,
      });
    }
  }

  // Build 1 crisp procedural mesh geometry per prop kind (5 InstancedMesh draw calls total!)
  const makePart = (w, h, d, y, x = 0, z = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    const ni = g.toNonIndexed();
    g.dispose();
    return ni;
  };
  const makeCyl = (rt, rb, h, y, seg = 8) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.translate(0, y, 0);
    const ni = g.toNonIndexed();
    g.dispose();
    return ni;
  };

  const geos = {
    mailbox: mergeSimple([makePart(0.10, 1.05, 0.10, 0.52), makePart(0.24, 0.22, 0.44, 1.12)]),
    trashcan: mergeSimple([makeCyl(0.26, 0.22, 0.84, 0.42, 10), makeCyl(0.28, 0.28, 0.08, 0.86, 10)]),
    cone: mergeSimple([makePart(0.38, 0.05, 0.38, 0.025), makeCyl(0.05, 0.17, 0.58, 0.32, 8)]),
    sign: mergeSimple([makeCyl(0.04, 0.04, 2.1, 1.05, 6), makePart(0.56, 0.56, 0.05, 2.05)]),
    hydrant: mergeSimple([makeCyl(0.13, 0.16, 0.68, 0.34, 8), makePart(0.38, 0.12, 0.12, 0.50), makeCyl(0.15, 0.15, 0.12, 0.72, 8)]),
  };

  const mats = {
    mailbox:  new THREE.MeshStandardMaterial({ color: 0x3b4858, roughness: 0.55, metalness: 0.35 }),
    trashcan: new THREE.MeshStandardMaterial({ color: 0x2f5a42, roughness: 0.75 }),
    cone:     new THREE.MeshStandardMaterial({ color: 0xff6b1a, emissive: 0x661a00, emissiveIntensity: 0.25, roughness: 0.55 }),
    sign:     new THREE.MeshStandardMaterial({ color: 0xe6b822, roughness: 0.45, metalness: 0.25 }),
    hydrant:  new THREE.MeshStandardMaterial({ color: 0xd62424, roughness: 0.38, metalness: 0.3 }),
  };

  const ims = {};
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

  for (const kind of Object.keys(counts)) {
    if (counts[kind] === 0) continue;
    const im = new THREE.InstancedMesh(geos[kind], mats[kind], counts[kind]);
    im.castShadow = true;
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    ims[kind] = im;
    scene.add(im);
  }

  for (const it of items) {
    _p.set(it.x, it.y, it.z);
    _e.set(0, it.ry, 0);
    _q.setFromEuler(_e);
    _m.compose(_p, _q, _s);
    if (ims[it.kind]) ims[it.kind].setMatrixAt(it.idx, _m);
  }
  for (const im of Object.values(ims)) im.instanceMatrix.needsUpdate = true;

  // ---------------- Stunt Ramps placed cleanly on road straights along route ----------------
  const ramps = [];
  const sampleFracs = [0.008, 0.12, 0.25, 0.40, 0.55, 0.70, 0.85, 0.97];
  const rampGeos = [];
  const chevGeos = [];

  for (const frac of sampleFracs) {
    if (route.length < 10) break;
    const i = Math.min(route.length - 6, Math.max(1, Math.floor(route.length * frac)));
    const a = route[i], b = route[i + 4];
    const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
    ramps.push({ x: a[0], z: a[1], heading: h, hw: 1.9, hl: 3.4, cd: 0 });

    // Wedge ramp geometry (base width 3.6m, length 6.4m, height 1.05m)
    const wedge = new THREE.BufferGeometry();
    const hw = 1.85, hl = 3.2, hh = 1.05;
    const v = [
      // sloped top deck
      -hw, 0.06, -hl,   hw, 0.06, -hl,   hw, hh, hl,
      -hw, 0.06, -hl,   hw, hh, hl,    -hw, hh, hl,
      // front vertical face
      -hw, 0.06, hl,   hw, 0.06, hl,    hw, hh, hl,
      -hw, 0.06, hl,   hw, hh, hl,    -hw, hh, hl,
      // left side
      -hw, 0.06, -hl,  -hw, hh, hl,   -hw, 0.06, hl,
      // right side
       hw, 0.06, -hl,   hw, 0.06, hl,  hw, hh, hl,
    ];
    wedge.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    wedge.computeVertexNormals();
    const mw = new THREE.Matrix4().compose(
      new THREE.Vector3(a[0], 0, a[1]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, h, 0)),
      new THREE.Vector3(1, 1, 1)
    );
    wedge.applyMatrix4(mw);
    rampGeos.push(wedge);

    // Bright emissive side chevrons so ramps read clearly day & night
    const chev = new THREE.BoxGeometry(3.5, 0.09, 0.65).toNonIndexed();
    chev.rotateX(-0.16);
    chev.translate(0, hh * 0.72, hl * 0.35);
    chev.applyMatrix4(mw);
    chevGeos.push(chev);
  }

  if (rampGeos.length) {
    const rMesh = new THREE.Mesh(
      mergeSimple(rampGeos),
      new THREE.MeshStandardMaterial({ color: 0xe69f18, roughness: 0.42, metalness: 0.25 })
    );
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    scene.add(rMesh);

    const cMesh = new THREE.Mesh(
      mergeSimple(chevGeos),
      new THREE.MeshBasicMaterial({ color: 0xffe45e })
    );
    scene.add(cMesh);
  }

  let brokenCount = 0;

  function update(dt, playerCar, fx, audio, callbacks = {}) {
    const dirtyKinds = new Set();

    // Check vehicle vs intact prop smash
    const px = playerCar.x, pz = playerCar.z;
    const pSpd = Math.hypot(playerCar.speed, playerCar.vLat || 0);
    for (const it of items) {
      if (!it.broken) {
        if (!playerCar.onFoot && !playerCar.airborne && pSpd > 3) {
          const dx = it.x - px, dz = it.z - pz;
          if (dx * dx + dz * dz < 2.6) {
            it.broken = true;
            brokenCount++;
            const fSpeed = Math.max(8, pSpd * 0.85);
            const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.5;
            it.vx = Math.sin(a) * fSpeed;
            it.vz = Math.cos(a) * fSpeed;
            it.vy = 5.5 + Math.min(8, pSpd * 0.26);
            it.vrx = (Math.random() - 0.5) * 14;
            it.vrz = (Math.random() - 0.5) * 14;
            if (it.kind === 'hydrant') it.waterTimer = 6.5;

            if (fx) {
              fx.burst(it.kind === 'hydrant' ? 'water' : 'spark', it.x, 0.55, it.z, 10, 7, 0.30, 0.55);
            }
            if (audio && audio.crash) audio.crash(0.35);
            if (callbacks.onPropSmash) callbacks.onPropSmash(it);
          }
        }
      } else {
        // Hydrant water geyser plume!
        if (it.waterTimer > 0) {
          it.waterTimer -= dt;
          it.waterAcc += dt;
          while (it.waterAcc >= 0.05) {
            it.waterAcc -= 0.05;
            if (fx) {
              fx.emit('water', it.x, 0.35, it.z, (Math.random() - 0.5) * 1.4, 10.5 + Math.random() * 3.5, (Math.random() - 0.5) * 1.4, 0.65, 0.85);
            }
          }
        }
        // Flying/tumbling prop physics until settled on ground
        if (!it.resting) {
          it.vy -= 20 * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.z += it.vz * dt;
          it.rx += it.vrx * dt;
          it.rz += it.vrz * dt;
          if (it.y <= 0.14 && it.vy < 0) {
            it.y = 0.14;
            it.vy = -it.vy * 0.35;
            it.vx *= 0.65;
            it.vz *= 0.65;
            if (Math.abs(it.vy) < 1.2) {
              it.vy = 0; it.vx = 0; it.vz = 0;
              it.rx = Math.PI * 0.48;
              it.resting = true;
            }
          }
          _p.set(it.x, it.y, it.z);
          _e.set(it.rx, it.ry, it.rz);
          _q.setFromEuler(_e);
          _m.compose(_p, _q, _s);
          if (ims[it.kind]) ims[it.kind].setMatrixAt(it.idx, _m);
          dirtyKinds.add(it.kind);
        }
      }
    }

    for (const k of dirtyKinds) ims[k].instanceMatrix.needsUpdate = true;

    // Check Stunt Ramp Launch!
    for (const rm of ramps) {
      if (rm.cd > 0) rm.cd -= dt;
      if (playerCar.onFoot || playerCar.airborne || rm.cd > 0) continue;
      if (playerCar.speed > 13) {
        const dx = px - rm.x, dz = pz - rm.z;
        const fwd = dx * Math.sin(rm.heading) + dz * Math.cos(rm.heading);
        const lat = dx * Math.cos(rm.heading) - dz * Math.sin(rm.heading);
        if (Math.abs(lat) < rm.hw && fwd > 0.2 && fwd < rm.hl) {
          rm.cd = 1.8;
          playerCar.vy = Math.min(14.5, Math.max(7.2, playerCar.speed * 0.34));
          playerCar.y = Math.max(playerCar.y, 0.65);
          playerCar.airborne = true;
          if (fx) fx.burst('dust', px, 0.4, pz, 12, 6, 0.55, 0.65);
          if (audio && audio.stunt) audio.stunt();
          if (callbacks.onRampLaunch) callbacks.onRampLaunch(rm);
        }
      }
    }
  }

  return {
    ramps,
    update,
    stats() { return { total: items.length, broken: brokenCount, ramps: ramps.length }; },
  };
}
