// Scaggsville 3D — pooled Particle FX & Tire Skidmarks (2 draw calls total, zero runtime allocations)
import * as THREE from 'three';

function makePuffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const KINDS = {
  smoke:     { color: 0xd4dae2, grow: 1.9, gravity: -1.4, drag: 1.8 }, // expanding white tire smoke
  dust:      { color: 0xa89268, grow: 1.6, gravity: 1.5,  drag: 2.2 }, // off-road dirt & jump landing dust
  spark:     { color: 0xffd24a, grow: -0.6, gravity: 14.0, drag: 0.6 }, // crash / scrape sparks
  flame:     { color: 0xff6a1a, grow: 0.4, gravity: -4.5, drag: 1.2 }, // turbo flame & Mustang blaze
  turbo:     { color: 0x6ac8ff, grow: 0.3, gravity: -1.0, drag: 2.5 }, // blue-orange nitro flash
  water:     { color: 0xbbeaff, grow: 1.3, gravity: 9.8,  drag: 0.9 }, // smashed hydrant water plume
  darksmoke: { color: 0x26282e, grow: 2.5, gravity: -2.4, drag: 1.1 }, // dark oil/fire column over Mustang
};

export function createFX(scene) {
  // ---------------- 1. Pre-allocated Tire Skidmark Ribbon Pool (1 draw call) ----------------
  const MAX_SKIDS = 700;
  const skidPos = new Float32Array(MAX_SKIDS * 4 * 3);
  const skidCol = new Float32Array(MAX_SKIDS * 4 * 3);
  const skidIdx = new Uint16Array(MAX_SKIDS * 6);
  for (let i = 0; i < MAX_SKIDS; i++) {
    const v = i * 4, o = i * 6;
    skidIdx[o] = v; skidIdx[o + 1] = v + 1; skidIdx[o + 2] = v + 2;
    skidIdx[o + 3] = v + 1; skidIdx[o + 4] = v + 3; skidIdx[o + 5] = v + 2;
  }
  const skidGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(skidPos, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const colAttr = new THREE.BufferAttribute(skidCol, 3);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  skidGeo.setAttribute('position', posAttr);
  skidGeo.setAttribute('color', colAttr);
  skidGeo.setIndex(new THREE.BufferAttribute(skidIdx, 1));
  const skidMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.DoubleSide,
  });
  const skidMesh = new THREE.Mesh(skidGeo, skidMat);
  skidMesh.frustumCulled = false;
  skidMesh.renderOrder = 1;
  scene.add(skidMesh);
  let skidCursor = 0;
  let skidCount = 0;

  function addSkid(x0, z0, x1, z1, intensity = 0.8) {
    const dx = x1 - x0, dz = z1 - z0;
    const L = Math.hypot(dx, dz);
    if (L < 0.08 || L > 4.5) return;
    const nx = (-dz / L) * 0.14, nz = (dx / L) * 0.14;
    const y = 0.086;
    const base = skidCursor * 12;
    skidPos[base + 0] = x0 - nx; skidPos[base + 1] = y; skidPos[base + 2] = z0 - nz;
    skidPos[base + 3] = x0 + nx; skidPos[base + 4] = y; skidPos[base + 5] = z0 + nz;
    skidPos[base + 6] = x1 - nx; skidPos[base + 7] = y; skidPos[base + 8] = z1 - nz;
    skidPos[base + 9] = x1 + nx; skidPos[base + 10] = y; skidPos[base + 11] = z1 + nz;

    const c = Math.max(0.06, 0.20 - intensity * 0.14);
    for (let k = 0; k < 12; k += 3) {
      skidCol[base + k] = c;
      skidCol[base + k + 1] = c * 0.98;
      skidCol[base + k + 2] = c * 1.02;
    }
    skidCursor = (skidCursor + 1) % MAX_SKIDS;
    if (skidCount < MAX_SKIDS) skidCount++;
    skidGeo.setDrawRange(0, skidCount * 6);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  // ---------------- 2. Pooled Billboard Particles (1 InstancedMesh draw call) ----------------
  const MAX_PARTICLES = 260;
  const pGeo = new THREE.PlaneGeometry(1, 1);
  const pMat = new THREE.MeshBasicMaterial({
    map: makePuffTexture(),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    fog: false,
  });
  const pMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
  pMesh.frustumCulled = false;
  pMesh.renderOrder = 4;
  pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  const _c = new THREE.Color(1, 1, 1);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pMesh.setMatrixAt(i, zeroM);
    pMesh.setColorAt(i, _c);
  }
  pMesh.instanceMatrix.needsUpdate = true;
  if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
  scene.add(pMesh);

  const pool = new Array(MAX_PARTICLES);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool[i] = { alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 0.5, grow: 1, gravity: 0, drag: 1, r: 1, g: 1, b: 1 };
  }
  let pCursor = 0;
  const _pos = new THREE.Vector3(), _scl = new THREE.Vector3(), _mat = new THREE.Matrix4();

  function emit(kind, x, y, z, vx, vy, vz, size = 0.55, life = 0.8) {
    const spec = KINDS[kind] || KINDS.smoke;
    const p = pool[pCursor];
    pCursor = (pCursor + 1) % MAX_PARTICLES;
    p.alive = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.age = 0; p.life = life;
    p.size = size;
    p.grow = spec.grow;
    p.gravity = spec.gravity;
    p.drag = spec.drag;
    _c.setHex(spec.color);
    p.r = _c.r; p.g = _c.g; p.b = _c.b;
    pMesh.setColorAt(pCursor === 0 ? MAX_PARTICLES - 1 : pCursor - 1, _c);
    if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
  }

  function burst(kind, x, y, z, count = 8, speed = 5, size = 0.32, life = 0.55) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const sp = speed * (0.45 + Math.random() * 0.75);
      emit(
        kind,
        x + (Math.random() - 0.5) * 0.35,
        y + Math.random() * 0.25,
        z + (Math.random() - 0.5) * 0.35,
        Math.cos(a) * sp,
        sp * (0.4 + Math.random() * 0.9),
        Math.sin(a) * sp,
        size * (0.7 + Math.random() * 0.6),
        life * (0.75 + Math.random() * 0.5)
      );
    }
  }

  let fireAcc = 0;
  function updateMustangFire(dt, mx, mz, camX, camZ) {
    if (Math.hypot(mx - camX, mz - camZ) > 260) return;
    fireAcc += dt;
    while (fireAcc >= 0.065) {
      fireAcc -= 0.065;
      // Canon (locked): dark smoke + gold-orange ember sparks ONLY — no flame
      // puffs on Lamar's Mustang. The 'flame' kind remains for turbo exhaust.
      emit('darksmoke', mx + (Math.random() - 0.5) * 0.6, 1.45, mz + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.1, 3.2 + Math.random() * 1.6, (Math.random() - 0.5) * 1.1, 1.15, 2.2);
      if (Math.random() < 0.45) {
        emit('spark', mx + (Math.random() - 0.5) * 0.7, 1.0, mz + (Math.random() - 0.5) * 0.7,
          (Math.random() - 0.5) * 3.5, 4.5 + Math.random() * 3.0, (Math.random() - 0.5) * 3.5, 0.22, 0.7);
      }
    }
  }

  function update(dt, camera) {
    let any = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool[i];
      if (!p.alive) continue;
      any = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        pMesh.setMatrixAt(i, zeroM);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy = (p.vy - p.gravity * dt) * (p.gravity > 0 ? 1 : damp);
      p.x += p.vx * dt;
      p.y = Math.max(0.06, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const t = p.age / p.life;
      const s = Math.max(0.02, p.size * (1 + p.grow * t) * (1 - t * t * 0.55));
      _pos.set(p.x, p.y, p.z);
      _scl.set(s, s, s);
      _mat.compose(_pos, camera.quaternion, _scl);
      pMesh.setMatrixAt(i, _mat);
    }
    if (any) pMesh.instanceMatrix.needsUpdate = true;
  }

  return { addSkid, emit, burst, updateMustangFire, update };
}
