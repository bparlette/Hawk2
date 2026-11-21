// Scaggsville 3D — PEDESTRIANS + CROWD SYSTEM (Lane A).
// Ambient walkers on the real road polylines + a spawnable milling crowd
// for set pieces (the party lane's Atholton finale, house gatherings).
//
// Rendering: figures are built in the people.js idiom (same proportions,
// clothing-as-geometry, vertex colours) but MERGED PER BODY PART and drawn
// as InstancedMeshes — 5 parts (body, legL, legR, armL, armR) x 4 clothing
// templates = 20 instanced meshes TOTAL for the whole system, independent
// of headcount. A crowd of 100 costs the same 20 draws as a crowd of 5;
// limbs swing from their pivots via per-instance matrices. Legs are
// single-piece (hip swing + bob, no knee joint) — at street distance that
// reads as walking. Since Nov 20 the crew hero figures in people.js wear
// the same one-piece pants (Cherie's call), so the two systems match.
// Crowd parts do not cast shadows except the body (keeps the shadow pass
// cheap); ambient draw count when idle (no people) is 0 (meshes hidden).
//
// ============================ PARTY-LANE SEAM ============================
//   const crowd = createCrowdSystem(scene, world);   // world = buildWorld()
//   crowd.spawnAmbient();                            // street walkers (once)
//   const h = crowd.spawnCrowd(x, z, count, opts);   // milling crowd
//        opts: { radius=9, stand=0.35 (fraction standing), speed=1.0 }
//   crowd.clearCrowd(h);        // remove that crowd
//   crowd.clearCrowd();         // remove ALL spawned crowds (ambient kept)
//   crowd.clearAmbient();       // remove the street walkers too
//   crowd.update(dt);           // per frame
//   crowd.stats() -> { people, ambient, spawned, draws }
// =========================================================================
import * as THREE from 'three';
import { WORLD_DATA } from './data.js';

// ---- deterministic rng ----
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rand = mulberry32(20261120);

// ---- 4 townsfolk templates (people.js clothing rows, varied silhouettes) ----
const TEMPLATES = [
  { skin: 0xe0ac69, shirt: 0x8a1f2d, pants: 0x2a3a5e, hair: 0x2a1a0e, hat: 'cap',    hatColor: 0x24304a },
  { skin: 0xf1c27d, shirt: 0xe8e6df, pants: 0x5a5148, hair: 0x2a1a0e, hat: 'brim',   hatColor: 0xa8895a },
  { skin: 0x8d5524, shirt: 0x5e1f24, pants: 0x23232a, hair: 0x0e0c0a, hat: 'beanie', hatColor: 0x2a2226, stripe: 0xc8a83a },
  { skin: 0xf1c27d, shirt: 0x2a7d8c, pants: 0x3a3f44, hair: 0x6a4a28, hat: 'long',   hatColor: 0x74452a },
];
const CAP_PER_TEMPLATE = 48; // 192 people max across the system

// ---- merged vertex-coloured part geometry (people.js buildDriver pattern) ----
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function xf(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_v, _q, _s);
}
function mergeColored(parts) {
  for (const p of parts) if (p.geo.index) p.geo = p.geo.toNonIndexed(); // counts grow — convert BEFORE counting
  let total = 0; for (const p of parts) total += p.geo.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const p of parts) {
    const g = p.geo, n = g.attributes.position.count, c = new THREE.Color(p.hex);
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < n; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += n; g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8);
// One-piece tapered tube along a point path (same builder as people.js —
// this file keeps its own copy by design). Smooth-shaded single geometry:
// no segment boundary anywhere along the leg for a seam to show at.
function tubeGeo(pts, radii, seg = 10, subdiv = 2) {
  const rings = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    for (let j = (i === 0 ? 0 : 1); j <= subdiv; j++) {
      const t = j / subdiv;
      rings.push({
        c: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        r: radii[i] + (radii[i + 1] - radii[i]) * t,
      });
    }
  }
  const pos = [];
  const T = new THREE.Vector3(), U = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Vector3();
  const ringIdx = rings.map((ring, ri) => {
    const prev = rings[Math.max(0, ri - 1)].c, next = rings[Math.min(rings.length - 1, ri + 1)].c;
    T.set(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize();
    const ref = Math.abs(T.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    V.crossVectors(T, ref).normalize(); U.crossVectors(V, T).normalize();
    C.set(ring.c[0], ring.c[1], ring.c[2]);
    const out = [];
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, ca = Math.cos(a) * ring.r, sa = Math.sin(a) * ring.r;
      out.push(pos.length / 3);
      pos.push(C.x + U.x * ca + V.x * sa, C.y + U.y * ca + V.y * sa, C.z + U.z * ca + V.z * sa);
    }
    return out;
  });
  const idx = [];
  for (let ri = 0; ri < ringIdx.length - 1; ri++) {
    for (let k = 0; k < seg; k++) {
      const a = ringIdx[ri][k], b = ringIdx[ri][(k + 1) % seg], c = ringIdx[ri + 1][k], d = ringIdx[ri + 1][(k + 1) % seg];
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
const PANTS_LEG_PTS = [[0, 0.10, 0], [0, 0.03, 0], [0, -0.10, 0], [0, -0.26, 0], [0, -0.44, 0], [0, -0.62, 0], [0, -0.78, 0], [0, -0.86, 0]];
const PANTS_LEG_RAD = [0.028, 0.078, 0.076, 0.068, 0.061, 0.055, 0.050, 0.026];

// body: pelvis + loose shirt shell + head/hair/hat, origin at the FEET,
// facing +Z (people.js proportions: hips .92, head centre ~1.72, ~1.83 top)
function bodyGeo(row) {
  const P = [];
  const add = (geo, hex, m) => { geo.applyMatrix4(m); P.push({ geo, hex }); };
  add(new THREE.BoxGeometry(0.33, 0.17, 0.20), row.pants, xf(0, 0.94, 0));
  add(new THREE.CylinderGeometry(0.168, 0.148, 0.52, 12), row.shirt, xf(0, 1.30, 0, 0, 0, 0, 1, 1, 0.76));
  add(cap(0.08, 0.26), row.shirt, xf(0, 1.51, 0, 0, 0, Math.PI / 2, 1, 1, 0.78));
  add(new THREE.CylinderGeometry(0.155, 0.162, 0.07, 12), row.shirt, xf(0, 1.065, 0, 0, 0, 0, 1, 1, 0.76));
  if (row.stripe) add(new THREE.CylinderGeometry(0.163, 0.16, 0.075, 12), row.stripe, xf(0, 1.38, 0, 0, 0, 0, 1, 1, 0.76));
  add(new THREE.CylinderGeometry(0.085, 0.09, 0.045, 10), row.shirt, xf(0, 1.555, 0, 0, 0, 0, 1, 1, 0.8));
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 8), row.skin, xf(0, 1.59, 0));
  add(new THREE.SphereGeometry(0.108, 14, 12), row.skin, xf(0, 1.715, 0));
  if (row.hat === 'cap') {
    add(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), row.hatColor, xf(0, 1.722, 0));
    add(new THREE.BoxGeometry(0.17, 0.018, 0.12), row.hatColor, xf(0, 1.758, 0.135, 0.10));
    add(new THREE.SphereGeometry(0.02, 8, 6), row.hatColor, xf(0, 1.833, 0));
  } else if (row.hat === 'brim') {
    add(new THREE.CylinderGeometry(0.185, 0.198, 0.018, 16), row.hatColor, xf(0, 1.768, 0));
    add(new THREE.SphereGeometry(0.112, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), row.hatColor, xf(0, 1.728, 0));
  } else if (row.hat === 'beanie') {
    add(new THREE.SphereGeometry(0.114, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), row.hatColor, xf(0, 1.718, 0));
    add(new THREE.CylinderGeometry(0.115, 0.118, 0.05, 14), row.hatColor, xf(0, 1.738, 0));
  } else if (row.hat === 'long') {
    add(new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), row.hair, xf(0, 1.72, -0.006));
    add(new THREE.BoxGeometry(0.17, 0.30, 0.06), row.hair, xf(0, 1.59, -0.095));
  } else {
    add(new THREE.SphereGeometry(0.111, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), row.hair, xf(0, 1.718, -0.004));
  }
  return mergeColored(P);
}
// leg: origin AT the hip pivot (side*0.095, 0.89, 0 in body space).
// ONE-PIECE PANTS (Cherie, Nov 20): a single tapered tube hip -> ankle.
// The old build butted two capsules at knee height (r 0.072 into r 0.057)
// and the radius step read as a leg joint even though the crowd never
// bends a knee — now the taper is continuous, exactly like people.js.
function legGeo(row) {
  const P = [];
  const add = (geo, hex, m) => { geo.applyMatrix4(m); P.push({ geo, hex }); };
  add(tubeGeo(PANTS_LEG_PTS, PANTS_LEG_RAD), row.pants, xf(0, 0, 0));
  add(new THREE.BoxGeometry(0.095, 0.07, 0.24), 0x232327, xf(0, -0.855, 0.045));
  return mergeColored(P);
}
// arm: origin AT the shoulder pivot (side*0.205, 1.49, 0 in body space)
function armGeo(row) {
  const P = [];
  const add = (geo, hex, m) => { geo.applyMatrix4(m); P.push({ geo, hex }); };
  add(cap(0.07, 0.20), row.shirt, xf(0, -0.145, 0));
  add(new THREE.CylinderGeometry(0.072, 0.074, 0.05, 10), row.shirt, xf(0, -0.285, 0));
  add(cap(0.038, 0.18), row.skin, xf(0, -0.41, 0));
  add(new THREE.SphereGeometry(0.042, 8, 8), row.skin, xf(0, -0.56, 0));
  return mergeColored(P);
}
const PARTS = [
  { name: 'body', geo: bodyGeo, pivot: null, shadow: true },
  { name: 'legL', geo: legGeo, pivot: [-0.095, 0.89, 0] },
  { name: 'legR', geo: legGeo, pivot: [0.095, 0.89, 0] },
  { name: 'armL', geo: armGeo, pivot: [-0.205, 1.49, 0] },
  { name: 'armR', geo: armGeo, pivot: [0.205, 1.49, 0] },
];
const CROWD_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });

// ---- road paths for the ambient walkers ----
function buildRoadPaths() {
  const paths = [];
  for (const r of WORLD_DATA.roads) {
    if (r.pts.length < 2) continue;
    const cum = [0];
    for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    if (cum[cum.length - 1] < 24) continue; // too short to stroll
    paths.push({ pts: r.pts, cum, total: cum[cum.length - 1], w: r.w || 5, name: r.name || null });
  }
  return paths;
}
function nearestPath(paths, x, z) {
  let best = null, bestD = Infinity;
  for (const p of paths) {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      let t = L2 > 0 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = Math.min(1, Math.max(0, t));
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < bestD) { bestD = d; best = { path: p, s: p.cum[i] + Math.sqrt(L2) * t }; }
    }
  }
  return best;
}
function pathPoint(p, s) {
  s = Math.min(p.total, Math.max(0, s));
  let i = 0; while (i < p.cum.length - 2 && p.cum[i + 1] < s) i++;
  const segL = Math.max(1e-5, p.cum[i + 1] - p.cum[i]), t = (s - p.cum[i]) / segL;
  const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
  return { x: ax + dx * t, z: az + dz * t, dx: dx / L, dz: dz / L };
}

// ---- the system ----
export function createCrowdSystem(scene, world) {
  const meshes = []; // [template][part] -> InstancedMesh
  for (let t = 0; t < TEMPLATES.length; t++) {
    const row = [];
    for (const part of PARTS) {
      const im = new THREE.InstancedMesh(part.geo(TEMPLATES[t]), CROWD_MAT, CAP_PER_TEMPLATE);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0; im.visible = false; im.frustumCulled = false;
      im.castShadow = !!part.shadow; im.receiveShadow = false;
      im.name = `crowd-${t}-${part.name}`;
      scene.add(im); row.push(im);
    }
    meshes.push(row);
  }
  const people = []; // {tpl, mode, x,z,heading, phase, amp, speed, crowdId, ...}
  let nextCrowdId = 1;
  const paths = buildRoadPaths();
  const colliders = (world && world.colliders) || [];

  function insideCollider(x, z, pad = 0.6) {
    for (const c of colliders) {
      const dx = x - c.cx, dz = z - c.cz;
      if (dx * dx + dz * dz > (c.hw + c.hd + pad + 2) * (c.hw + c.hd + pad + 2)) continue;
      const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
      if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad) return true;
    }
    return false;
  }
  function addPerson(rec) {
    rec.tpl = people.length % TEMPLATES.length;
    rec.phase = rand() * 6.28; rec.amp = 0;
    people.push(rec); return rec;
  }

  // ambient street walkers: a few per crew stop on its nearest real road,
  // pairs along the rally route, a handful outside Atholton.
  function spawnAmbient() {
    const stops = WORLD_DATA.stops;
    for (const s of stops) {
      const near = nearestPath(paths, s.sx, s.sz);
      if (!near) continue;
      const n = s.id === 'atholton' ? 4 : 3;
      for (let i = 0; i < n; i++) {
        addPerson({ mode: 'path', crowdId: 0, path: near.path,
          s: Math.min(near.path.total - 2, Math.max(2, near.s + (rand() - 0.5) * 160)),
          dir: rand() < 0.5 ? 1 : -1, side: rand() < 0.5 ? 1 : -1,
          speed: 1.15 + rand() * 0.55, x: 0, z: 0, heading: 0 });
      }
    }
    const route = WORLD_DATA.route;
    for (const f of [0.14, 0.32, 0.5, 0.68, 0.86]) {
      const pt = route[Math.floor(route.length * f)];
      const near = nearestPath(paths, pt[0], pt[1]);
      if (!near) continue;
      for (let i = 0; i < 2; i++) {
        addPerson({ mode: 'path', crowdId: 0, path: near.path,
          s: Math.min(near.path.total - 2, Math.max(2, near.s + (rand() - 0.5) * 80)),
          dir: rand() < 0.5 ? 1 : -1, side: rand() < 0.5 ? 1 : -1,
          speed: 1.15 + rand() * 0.55, x: 0, z: 0, heading: 0 });
      }
    }
  }

  // milling crowd for set pieces (party lane): walkers wander a disc,
  // a fraction stand and sway. Returns a handle for clearCrowd(handle).
  function spawnCrowd(x, z, count, opts = {}) {
    const id = nextCrowdId++;
    const radius = opts.radius ?? 9, standF = opts.stand ?? 0.35, spd = opts.speed ?? 1.0;
    let placed = 0;
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (insideCollider(px, pz)) continue;
      const standing = rand() < standF;
      addPerson({ mode: standing ? 'stand' : 'mill', crowdId: id,
        cx: x, cz: z, radius, tx: px, tz: pz, wait: rand() * 2,
        speed: (0.85 + rand() * 0.5) * spd,
        x: px, z: pz, heading: rand() * Math.PI * 2 });
      placed++;
    }
    return { id, placed };
  }
  function clearCrowd(handle) {
    for (let i = people.length - 1; i >= 0; i--) {
      if (handle ? people[i].crowdId === handle.id : people[i].crowdId !== 0) people.splice(i, 1);
    }
  }
  function clearAmbient() {
    for (let i = people.length - 1; i >= 0; i--) if (people[i].crowdId === 0) people.splice(i, 1);
  }

  // ---- per-frame update + instance writes ----
  const dummy = new THREE.Object3D();
  const _base = new THREE.Matrix4(), _t1 = new THREE.Matrix4(), _t2 = new THREE.Matrix4();
  const _piv = PARTS.map(p => p.pivot ? new THREE.Matrix4().makeTranslation(p.pivot[0], p.pivot[1], p.pivot[2]) : null);
  const _pivInv = PARTS.map(p => p.pivot ? new THREE.Matrix4().makeTranslation(-p.pivot[0], -p.pivot[1], -p.pivot[2]) : null);
  function update(dt, tNow = 0) {
    // movement
    for (const p of people) {
      let moving = 0;
      if (p.mode === 'path') {
        p.s += p.dir * p.speed * dt;
        if (p.s > p.path.total - 1.5) { p.s = p.path.total - 1.5; p.dir = -1; }
        if (p.s < 1.5) { p.s = 1.5; p.dir = 1; }
        const pt = pathPoint(p.path, p.s);
        const off = p.path.w / 2 + 1.25;
        p.x = pt.x - pt.dz * off * p.side; p.z = pt.z + pt.dx * off * p.side;
        p.heading = Math.atan2(pt.dx * p.dir, pt.dz * p.dir);
        moving = 1;
      } else if (p.mode === 'mill') {
        if (p.wait > 0) { p.wait -= dt; }
        else {
          const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.5) {
            p.wait = 0.8 + rand() * 3.2;
            for (let k = 0; k < 6; k++) {
              const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * p.radius;
              const nx = p.cx + Math.cos(a) * r, nz = p.cz + Math.sin(a) * r;
              if (!insideCollider(nx, nz)) { p.tx = nx; p.tz = nz; break; }
            }
          } else {
            const step = Math.min(d, p.speed * dt);
            p.x += dx / d * step; p.z += dz / d * step;
            p.heading = Math.atan2(dx, dz);
            moving = 1;
          }
        }
      } else { // stand: gentle heading drift, no travel
        p.heading += Math.sin(tNow * 0.23 + p.phase) * 0.02 * dt;
      }
      p.amp += ((moving ? 1 : 0) - p.amp) * Math.min(1, dt * 6);
      if (moving) p.phase += dt * p.speed * 4.7;
    }
    // instance writes, grouped by template
    const counts = new Array(TEMPLATES.length).fill(0);
    for (const p of people) {
      const idx = counts[p.tpl]++;
      if (idx >= CAP_PER_TEMPLATE) continue;
      const swing = Math.sin(p.phase) * 0.5 * p.amp;
      const bob = Math.abs(Math.sin(p.phase)) * 0.035 * p.amp + (p.mode === 'stand' ? Math.sin(tNow * 1.7 + p.phase) * 0.006 : 0);
      dummy.position.set(p.x, bob, p.z);
      dummy.rotation.set(0, p.heading, 0);
      dummy.updateMatrix();
      _base.copy(dummy.matrix);
      const row = meshes[p.tpl];
      row[0].setMatrixAt(idx, _base);
      for (let part = 1; part < PARTS.length; part++) {
        const isLeg = part <= 2;
        const sgn = (part === 1 || part === 3) ? 1 : -1; // L/R in anti-phase
        const ang = isLeg ? swing * sgn : -swing * sgn * 0.75;
        _t1.multiplyMatrices(_base, _piv[part]);
        _t2.makeRotationX(ang);
        _t1.multiply(_t2); _t1.multiply(_pivInv[part]);
        row[part].setMatrixAt(idx, _t1);
      }
    }
    for (let t = 0; t < TEMPLATES.length; t++) {
      const n = Math.min(counts[t], CAP_PER_TEMPLATE);
      for (const im of meshes[t]) {
        im.count = n; im.visible = n > 0;
        if (n > 0) im.instanceMatrix.needsUpdate = true;
      }
    }
  }
  function stats() {
    let amb = 0, sp = 0;
    for (const p of people) (p.crowdId === 0 ? amb++ : sp++);
    let draws = 0; for (const row of meshes) for (const im of row) if (im.visible) draws++;
    return { people: people.length, ambient: amb, spawned: sp, draws };
  }
  return { spawnAmbient, spawnCrowd, clearCrowd, clearAmbient, update, stats };
}
export default createCrowdSystem;
