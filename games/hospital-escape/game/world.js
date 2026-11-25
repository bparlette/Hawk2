/* Hospital Escape — world builder: every zone in DATA.env, built from code (no image files). Static geometry is merged
   per material per zone (few draws); doors stay separate so they can swing open when an enemy comes through them. */
(function(){
'use strict';
var A = window.HEART, W = window.HEWORLD = {};
var V = THREE.Vector3;
function M(c, o){ return A.mat(c, o); }
function texMat(t, rx, ry, o){ var tt = t.clone(); tt.needsUpdate = true; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(rx, ry); return new THREE.MeshStandardMaterial(Object.assign({ map: tt, roughness: 0.8 }, o || {})); }
function plane(w, h, mat, parent, pos, rot){ var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); if(rot) m.rotation.set(rot[0], rot[1], rot[2]); parent.add(m); return m; }
// ---- merge every mesh in a group by material into one mesh per material (keeps userData.keep subtrees) ----
W.merge = function(group){ group.updateMatrixWorld(true); var byMat = {}, keep = [];
  group.traverse(function(o){ if(o.userData.keep){ keep.push(o); return; } });
  var inKeep = function(o){ for(var p = o; p; p = p.parent) if(p.userData && p.userData.keep) return true; return false; };
  group.traverse(function(o){ if(!o.isMesh || Array.isArray(o.material) || inKeep(o) || o.material.transparent) return; var k = o.material.uuid; (byMat[k] = byMat[k] || { mat: o.material, list: [] }).list.push(o); });
  var out = new THREE.Group(); out.name = group.name;
  Object.keys(byMat).forEach(function(k){ var e = byMat[k], pos = [], nor = [], uv = [];
    e.list.forEach(function(o){ var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      var p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv ? g.attributes.uv.array : null;
      for(var i = 0; i < p.length; i++){ pos.push(p[i]); nor.push(n[i]); } for(var j = 0; j < p.length / 3; j++){ uv.push(u ? u[j * 2] : 0, u ? u[j * 2 + 1] : 0); } });
    var bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bg.computeBoundingSphere(); bg.computeBoundingBox();   /* box lets a ray reject far zones in one test (fairness LOS) */
    out.add(new THREE.Mesh(bg, e.mat)); });
  // transparent + multi-material meshes are kept as they are
  group.traverse(function(o){ if(o.isMesh && !inKeep(o) && (Array.isArray(o.material) || o.material.transparent)){ var c = o.clone(); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); out.add(c); } });
  keep.forEach(function(k){ if(k.parent && !inKeep(k.parent)){ var wp = new V(), wq = new THREE.Quaternion(), ws = new V(); k.matrixWorld.decompose(wp, wq, ws); k.parent.remove(k); k.position.copy(wp); k.quaternion.copy(wq); k.scale.copy(ws); out.add(k); } });
  return out; };
W.build = function(scene, data){ A.makeTextures(); var env = data.env, root = new THREE.Group(); scene.add(root); W.doors = []; W.anims = []; W.indicators = []; W.crossings = []; W.coverZones = [];
  var mats = { floor: texMat(A.tex.vinyl, 1, 1, { roughness: 0.55 }), wall: texMat(A.tex.wall, 1, 1), ceil: texMat(A.tex.ceiling, 1, 1, { roughness: 0.95 }),
    panel: new THREE.MeshBasicMaterial({ map: A.tex.lightPanel, toneMapped: false, color: 0xf6fbff }), pool: new THREE.MeshBasicMaterial({ color: 0xfff1d8, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
    door: new THREE.MeshStandardMaterial({ map: A.tex.door, roughness: 0.6 }), frame: M(0xb8bfc4, { metalness: 0.3, roughness: 0.4 }), glass: new THREE.MeshStandardMaterial({ color: 0xa8c8d8, transparent: true, opacity: 0.22, metalness: 0.6, roughness: 0.05, depthWrite: false }) };
  W._halls = env.zones.filter(function(z){ return z.kind === 'hall'; }); W.data = data;
  env.zones.forEach(function(z){ var g = new THREE.Group(); g.name = z.kind; var f = BUILD[z.kind], isOut = z.kind === 'outdoor' || z.kind === 'street'; if(f) f(z, g, mats, data);
    // zones that build in chunks (the street) merge per chunk: small bounding boxes keep line-of-sight rays cheap
    var chunks = g.children.filter(function(c){ return c.userData.chunk; }); if(chunks.length){ chunks.forEach(function(c){ g.remove(c); var mc = W.merge(c); if(isOut) mc.userData.outdoorChunk = true; root.add(mc); }); }
    var mg = W.merge(g); if(isOut) mg.userData.outdoorChunk = true; root.add(mg); });
  return root; };
// tiled surface helper: a w x d floor/ceiling with the texture repeated every `tile` m
function slab(w, d, mat, tile, parent, pos, up){ var m = mat.clone(); if(m.map){ m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(w / tile, d / tile); } return plane(w, d, m, parent, pos, [up ? -Math.PI / 2 : Math.PI / 2, 0, 0]); }
function wallStrip(len, h, mat, parent, pos, rotY){ var m = mat.clone(); if(m.map){ m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(len / 3, 1); } return plane(len, h, m, parent, pos, [0, rotY, 0]); }
function lights(parent, mats, a, b, y, h, step){ var d = b.clone().sub(a), L = d.length(); d.normalize(); for(var s = step / 2; s < L; s += step){ var p = a.clone().addScaledVector(d, s);
    var pn = plane(0.6, 1.2, mats.panel, parent, new V(p.x, y + h - 0.01, p.z), [Math.PI / 2, 0, Math.abs(d.x) > 0.5 ? Math.PI / 2 : 0]);
    var pool = plane(2.4, 2.4, mats.pool, parent, new V(p.x, y + 0.012, p.z), [-Math.PI / 2, 0, 0]); } }
// a door on a wall: frame + panel on a hinge (keep: animated), number sign, push plate
function door(parent, mats, pos, inward, along, label){ var grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = Math.atan2(inward.x, inward.z); parent.add(grp);
  A.box(1.15, 0.08, 0.14, mats.frame, 0, 2.18, 0, grp); A.box(0.07, 2.2, 0.14, mats.frame, -0.56, 1.1, 0, grp); A.box(0.07, 2.2, 0.14, mats.frame, 0.56, 1.1, 0, grp);
  A.box(1.04, 2.14, 0.02, M(0x1a1f24), 0, 1.07, -0.06, grp);                                         // dark doorway behind the panel
  var hinge = new THREE.Group(); hinge.position.set(-0.52, 0, 0.0); hinge.userData.keep = true; grp.add(hinge);
  A.box(1.02, 2.1, 0.05, mats.door, 0.51, 1.06, 0, hinge);
  if(label){ var s = A.sign(label, { w: 256, h: 96, mw: 0.42, bg: '#21384a', size: 44 }); s.position.set(0.9, 1.75, 0.08); grp.add(s); }
  var d = { group: grp, hinge: hinge, pos: pos.clone(), open: 0, target: 0 }; W.doors.push(d); return d; }
W.openDoorNear = function(p, r){ var best = null, bd = r || 2.6; W.doors.forEach(function(d){ var dd = Math.hypot(d.pos.x - p.x, d.pos.z - p.z) + Math.abs(d.pos.y - p.y) * 3; if(dd < bd){ bd = dd; best = d; } }); if(best){ best.target = 1; best.t = 0; } return best; };
W.update = function(dt, t){ W.doors.forEach(function(d){ if(d.target && !d.elevator){ d.t = (d.t || 0) + dt; if(d.t > 3.5) d.target = 0; } d.open += ((d.target ? 1 : 0) - d.open) * Math.min(1, dt * (d.elevator ? 2.5 : 6));
    if(d.slide){ d.slide[0].position.x = -0.35 - d.open * 0.68; d.slide[1].position.x = 0.35 + d.open * 0.68; } else d.hinge.rotation.y = -d.open * 1.5; });
  W.anims.forEach(function(f){ f(dt, t); }); };
function hallRect(o){ var hw = o.w / 2; return { x0: Math.min(o.a[0], o.b[0]) - (Math.abs(o.b[0] - o.a[0]) < 0.01 ? hw : 0), x1: Math.max(o.a[0], o.b[0]) + (Math.abs(o.b[0] - o.a[0]) < 0.01 ? hw : 0),
  z0: Math.min(o.a[1], o.b[1]) - (Math.abs(o.b[1] - o.a[1]) < 0.01 ? hw : 0), z1: Math.max(o.a[1], o.b[1]) + (Math.abs(o.b[1] - o.a[1]) < 0.01 ? hw : 0) }; }
// clearance: distance (xz) from a point to a data path's control polyline (keeps furniture / buildings off the route)
W.pathDist = function(data, ids, x, z){ var best = 1e9; ids.forEach(function(id){ var P = data.paths.filter(function(p){ return p.id === id; })[0]; if(!P) return; var pts = P.points;
  for(var i = 0; i < pts.length - 1; i++){ var ax = pts[i][0], az = pts[i][2], bx = pts[i + 1][0], bz = pts[i + 1][2], vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)); best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t)); } }); return best; };
var BUILD = {
  patientRoom: function(z, g, mats){ var y = z.min[1], w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, mats.floor, 1.2, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.2, g, new V(cx, y + h, cz), false);
    wallStrip(w, h, mats.wall, g, new V(cx, y + h / 2, z.max[2]), Math.PI); wallStrip(d, h, mats.wall, g, new V(z.min[0], y + h / 2, cz), Math.PI / 2); wallStrip(d, h, mats.wall, g, new V(z.max[0], y + h / 2, cz), -Math.PI / 2);
    // front wall with the door opening (bed width) at x = door[0]
    var dx = z.door[0]; wallStrip((dx - 0.75) - z.min[0], h, mats.wall, g, new V((z.min[0] + dx - 0.75) / 2, y + h / 2, z.door[1]), 0); wallStrip(z.max[0] - (dx + 0.75), h, mats.wall, g, new V((z.max[0] + dx + 0.75) / 2, y + h / 2, z.door[1]), 0);
    A.box(1.5, h - 2.3, 0.12, mats.wall, dx, y + 2.3 + (h - 2.3) / 2, z.door[1], g);
    // window with night skyline on the side wall
    var win = A.sign('', { w: 256, h: 192, mw: 1.6, bg: '#0d1626' }); win.position.set(z.min[0] + 0.02, y + 1.6, cz + 0.4); win.rotation.y = Math.PI / 2; g.add(win); A.box(0.06, 1.3, 1.7, mats.frame, z.min[0] + 0.03, y + 1.6, cz + 0.4, g).scale.set(1, 1, 1);
    for(var i = 0; i < 6; i++) A.box(0.02, 0.2 + (i % 3) * 0.18, 0.18, M(0xffd27a, { emissive: 0xffc860, emissiveIntensity: 1 }), z.min[0] + 0.04, y + 1.2 + (i % 3) * 0.12, cz - 0.2 + i * 0.22, g);
    lights(g, mats, new V(cx, 0, z.max[2]), new V(cx, 0, z.min[2]), y, h, 2.6);
    var mon = A.monitorStand(); mon.position.set(-1.1, y, -1.9); g.add(mon); var iv = A.ivPole(); iv.position.set(1.15, y, -2.2); g.add(iv);
    var chair = A.chairRow(1); chair.position.set(2.6, y, -3.4); chair.rotation.y = -1.2; g.add(chair);
    A.box(0.02, 0.05, 3.6, mats.frame, 1.3, y + 2.75, -3.2, g); var cur = A.box(0.03, 2.0, 1.4, M(0x7fa7a3, { roughness: 0.95 }), 1.3, y + 1.7, -1.0, g);   // privacy curtain
    var tv = A.box(0.9, 0.55, 0.06, M(0x111111), 0, y + 2.2, -0.04, g); var wb = A.sign('ROOM ' + z.label + '\nNURSE: J. OKAFOR', { w: 512, h: 256, mw: 1.1, bg: '#f4f4f0', fg: '#1f3f5f', size: 44 }); wb.position.set(z.max[0] - 0.02, y + 1.6, -2.4); wb.rotation.y = -Math.PI / 2; g.add(wb);
    var ds = A.sign(z.label, { w: 256, h: 128, mw: 0.5, bg: '#21384a' }); ds.position.set(dx + 1.05, y + 1.8, z.door[1] - 0.08); ds.rotation.y = Math.PI; g.add(ds); },
  hall: function(z, g, mats){ var y = z.y, a = new V(z.a[0], y, z.a[1]), b = new V(z.b[0], y, z.b[1]), d = b.clone().sub(a), L = d.length(), alongX = Math.abs(d.x) > Math.abs(d.z); d.normalize();
    var mid = a.clone().add(b).multiplyScalar(0.5), hw = z.w / 2, nrm = new V(-d.z, 0, d.x);   // nrm = right side
    var zi = (W._halls || []).indexOf(z) * 0.0015; var fl = slab(alongX ? L : z.w, alongX ? z.w : L, mats.floor, 1.2, g, new V(mid.x, y + zi, mid.z), true); var ce = slab(alongX ? L : z.w, alongX ? z.w : L, mats.ceil, 1.2, g, new V(mid.x, y + z.h - zi, mid.z), false);
    // walls, cut wherever another hall on this floor crosses them (junctions / corners open up automatically)
    var others = (W._halls || []).filter(function(o){ return o !== z && o.y === z.y; });
    [-1, 1].forEach(function(sd){ var cuts = [];
      others.forEach(function(o){ var r = hallRect(o), e = 0.02; for(var k = 0; k <= 400; k++){ var sp = L * k / 400, q = a.clone().addScaledVector(d, sp).addScaledVector(nrm, sd * hw);
          var inside = q.x > r.x0 + e && q.x < r.x1 - e && q.z > r.z0 + e && q.z < r.z1 - e; if(inside) cuts.push(sp); } });
      cuts.sort(function(p1, p2){ return p1 - p2; }); var runs = [], s0 = 0, i = 0, step = L / 400;
      while(i < cuts.length){ var c0 = cuts[i], c1 = c0; while(i + 1 < cuts.length && cuts[i + 1] - c1 <= step * 1.5){ i++; c1 = cuts[i]; } if(c0 - step > s0) runs.push([s0, c0 - step]); s0 = c1 + step; i++; }
      if(s0 < L) runs.push([s0, L]);
      runs.forEach(function(rn){ var ln = rn[1] - rn[0]; if(ln < 0.05) return; var p = a.clone().addScaledVector(d, (rn[0] + rn[1]) / 2).addScaledVector(nrm, sd * hw); p.y = y + z.h / 2; wallStrip(ln, z.h, mats.wall, g, p, Math.atan2(-sd * nrm.x, -sd * nrm.z)); }); });
    (z.caps || []).forEach(function(cp){ var at = cp === 'a' ? a : b, inward = cp === 'a' ? d.clone() : d.clone().negate(); var p = at.clone(); p.y = y + z.h / 2; wallStrip(z.w, z.h, mats.wall, g, p, Math.atan2(inward.x, inward.z)); });
    lights(g, mats, a, b, y, z.h, 3.2);
    var place = function(s, side){ return a.clone().addScaledVector(d, s).addScaledVector(nrm, side * (hw - 0.02)); };
    var sOf = function(c){ return alongX ? (c - a.x) * Math.sign(d.x) : (c - a.z) * Math.sign(d.z); };
    (z.doorsL || []).forEach(function(c, i){ var p = place(sOf(c), -1); door(g, mats, p, nrm.clone(), d, (z.name.indexOf('WEST') >= 0 ? '41' : z.name.indexOf('EAST') >= 0 ? '42' : 'G') + (i * 2 + 3)); });
    (z.doorsR || []).forEach(function(c, i){ var p = place(sOf(c), 1); door(g, mats, p, nrm.clone().negate(), d, (z.name.indexOf('WEST') >= 0 ? '41' : z.name.indexOf('EAST') >= 0 ? '42' : 'G') + (i * 2 + 4)); });
    if(z.station){ var sp = place(sOf(z.station.z), z.station.side).addScaledVector(nrm, -z.station.side * 0.45); var st = new THREE.Group(); st.position.copy(sp); st.rotation.y = Math.atan2(nrm.x, nrm.z) + (z.station.side > 0 ? Math.PI : 0); g.add(st);
      A.box(2.6, 1.05, 0.55, M(0x6a8f9a), 0, 0.52, 0, st); A.box(2.7, 0.06, 0.7, new THREE.MeshStandardMaterial({ map: A.tex.wood }), 0, 1.08, 0, st); A.box(0.4, 0.3, 0.05, M(0x111111), -0.6, 1.3, -0.1, st); A.box(0.4, 0.3, 0.05, M(0x111111), 0.5, 1.3, -0.1, st);
      var ns = A.sign('NURSES\' STATION', { w: 512, h: 96, mw: 1.6, bg: '#2f6f78' }); ns.position.set(0, 2.45, 0); st.add(ns); }
    (z.props || []).forEach(function(pr){ var o = (pr[0] === 'wheelchairParked' ? A.wheelchair() : A[pr[0]]()); o.position.set(pr[1], y, pr[2]); o.rotation.y = pr[3] || 0; g.add(o); });
    (z.signs || []).forEach(function(sg){ var s = A.sign(sg[0], { w: 1024, h: 128, mw: 2.6, size: 64 }); var pp = new V(sg[1], y + z.h - 0.35, sg[2]); s.position.copy(pp); s.rotation.y = Math.atan2(-d.x, -d.z); g.add(s); var s2 = s.clone(); s2.rotation.y += Math.PI; s2.position.addScaledVector(d, 0.01); g.add(s2); });
    W.coverZones.push({ kind: 'hall', a: a, b: b, y: y }); },
  elevatorLobby: function(z, g, mats){ var y = z.y, w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, mats.floor, 1.2, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.2, g, new V(cx, y + h, cz), false);
    wallStrip(d, h, mats.wall, g, new V(z.min[0], y + h / 2, cz), Math.PI / 2); wallStrip(d, h, mats.wall, g, new V(z.max[0], y + h / 2, cz), -Math.PI / 2);
    var carWall = z.openSide === 'front' ? z.min[2] : z.max[2], dir = z.openSide === 'front' ? 1 : -1;
    // the wall holding the elevator doors, with the car opening at x = 0 (1.4 m) and a second, closed car at x = 2.4
    wallStrip(w / 2 - 0.8, h, mats.wall, g, new V(z.min[0] + (w / 2 - 0.8) / 2, y + h / 2, carWall), dir > 0 ? 0 : Math.PI); wallStrip(w / 2 - 0.8, h, mats.wall, g, new V(z.max[0] - (w / 2 - 0.8) / 2, y + h / 2, carWall), dir > 0 ? 0 : Math.PI);
    A.box(1.6, h - 2.3, 0.1, mats.wall, 0, y + 2.3 + (h - 2.3) / 2, carWall, g); A.box(1.7, 2.4, 0.08, M(0xa8b0b6, { metalness: 0.8, roughness: 0.25 }), 2.4, y + 1.2, carWall + dir * 0.05, g);
    var ind = A.sign(z.floorLabel, { w: 128, h: 96, mw: 0.36, bg: '#111', fg: '#ff9a3a', size: 70 }); ind.position.set(0, y + 2.55, carWall + dir * 0.07); ind.rotation.y = dir > 0 ? 0 : Math.PI; ind.userData.keep = true; g.add(ind); W.indicators.push(ind);
    var sg = A.sign(z.floorLabel === 'G' ? 'GROUND FLOOR  ·  MAIN ENTRANCE →' : 'ELEVATORS  ·  4B', { w: 1024, h: 128, mw: 2.6, size: 60 }); sg.position.set(-2.5, y + 2.3, carWall + dir * 0.06); sg.rotation.y = dir > 0 ? 0 : Math.PI; g.add(sg);
    lights(g, mats, new V(cx, 0, z.max[2]), new V(cx, 0, z.min[2]), y, h, 2.8); var pl = A.plant(); pl.position.set(z.max[0] - 0.6, y, cz); g.add(pl);
    if(!z.noCar){ // the car interior (shared by both floors: the same car is rebuilt at the ground floor)
      [0, -12].forEach(function(cy){ var c0 = z.carZ[0], c1 = z.carZ[1], cl = c0 - c1, steel = M(0xb9c1c7, { metalness: 0.85, roughness: 0.25 });
        slab(1.8, cl, M(0x5a5f63), 1, g, new V(0, cy + 0.01, (c0 + c1) / 2), true); slab(1.8, cl, mats.ceil, 1, g, new V(0, cy + 2.5, (c0 + c1) / 2), false);
        wallStrip(cl, 2.5, steel, g, new V(-0.9, cy + 1.25, (c0 + c1) / 2), Math.PI / 2); wallStrip(cl, 2.5, steel, g, new V(0.9, cy + 1.25, (c0 + c1) / 2), -Math.PI / 2);
        A.box(1.6, 0.05, 0.05, steel, 0, cy + 0.95, (c0 + c1) / 2, g); plane(0.9, 1.8, mats.panel, g, new V(0, cy + 2.49, (c0 + c1) / 2), [Math.PI / 2, 0, 0]);
        // sliding doors on both ends (the through-car opens front on 4, back on G)
        [c0, c1].forEach(function(cz2){ [-0.8, 0.8].forEach(function(jx){ A.box(0.2, 2.5, 0.06, steel, jx, cy + 1.25, cz2, g); }); A.box(1.8, 0.32, 0.06, steel, 0, cy + 2.36, cz2, g); });   // CAMERA-FIX: door jambs + header — the 0.2 m beside the sliding doors and the 0.3 m above them showed the void
        [c0, c1].forEach(function(cz2, k){ var dd = new THREE.Group(); dd.userData.keep = true; dd.position.set(0, cy, cz2); g.add(dd);
          var l = A.box(0.7, 2.2, 0.04, steel, -0.35, 1.1, 0, dd), r = A.box(0.7, 2.2, 0.04, steel, 0.35, 1.1, 0, dd); W.doors.push({ group: dd, hinge: { rotation: {} }, pos: new V(0, cy, cz2), open: 1, target: 1, slide: [l, r], elevator: true, floor: cy === 0 ? 'upper' : 'ground', end: k }); }); }); } },
  cafeteria: function(z, g, mats){ var y = z.y, w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, texMat(A.tex.vinyl, 1, 1, { color: 0xe8dcc6, roughness: 0.5 }), 1.0, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.2, g, new V(cx, y + h, cz), false);
    wallStrip(w, h, mats.wall, g, new V(cx, y + h / 2, z.max[2]), Math.PI); wallStrip(w, h, mats.wall, g, new V(cx, y + h / 2, z.min[2]), 0);
    var dz0 = z.doorZ; wallStrip((dz0 - 1.3) - z.min[2], h, mats.wall, g, new V(z.max[0], y + h / 2, (z.min[2] + dz0 - 1.3) / 2), -Math.PI / 2); wallStrip(z.max[2] - (dz0 + 1.3), h, mats.wall, g, new V(z.max[0], y + h / 2, (z.max[2] + dz0 + 1.3) / 2), -Math.PI / 2);   // east wall, doorway to the ward
    A.box(0.12, h - 2.4, 2.6, mats.wall, z.max[0], y + 2.4 + (h - 2.4) / 2, dz0, g);
    // floor-to-ceiling glass partition at x = glassX with a door gap on the rail line
    for(var zz = z.min[2] + 1; zz < z.max[2]; zz += 2){ if(Math.abs(zz - z.doorZ) < 1.4) continue; var gp = A.box(0.04, h - 0.1, 1.95, mats.glass, z.glassX, y + h / 2, zz, g); gp.userData.glass = true; A.box(0.08, h, 0.08, mats.frame, z.glassX, y + h / 2, zz + 1, g); }
    for(var x = z.glassX + 3; x < z.counterX - 2; x += 3.4) for(var zt = z.min[2] + 2.5; zt < z.max[2] - 1.5; zt += 3.2){ if(W.pathDist(W.data, ['g_caf'], x, zt) < 2.1) continue; var t = A.table(); t.position.set(x, y, zt); g.add(t);
      [-0.75, 0.75].forEach(function(o){ var c = A.box(0.42, 0.05, 0.42, M(0xd06a2a), x + o, y + 0.46, zt, g); A.box(0.42, 0.42, 0.05, M(0xd06a2a), x + o + (o > 0 ? 0.2 : -0.2), y + 0.7, zt, g).rotation.y = Math.PI / 2; }); }
    var cnt = new THREE.Group(); cnt.position.set(z.counterX, y, cz - 5.2); g.add(cnt); A.box(1.0, 1.0, d * 0.4, M(0x8a5a3a), 0, 0.5, 0, cnt); A.box(1.2, 0.06, d * 0.4, M(0xc8ccd0, { metalness: 0.7, roughness: 0.3 }), 0, 1.03, 0, cnt);
    A.box(0.04, 0.45, d * 0.38, mats.glass, -0.4, 1.3, 0, cnt); for(var q = -4; q <= 4; q += 1.5) A.box(0.5, 0.04, 0.35, M(0x2f6f8f), -0.65, 1.08, q, cnt);
    var mb = A.sign('CAFETERIA\nHOT FOOD  ·  SALADS  ·  COFFEE', { w: 1024, h: 256, mw: 5, bg: '#2b2b2b', fg: '#ffd27a', size: 64 }); mb.position.set(z.max[0] - 0.05, y + h - 0.9, cz); mb.rotation.y = -Math.PI / 2; g.add(mb);
    for(var px = z.glassX + 3; px < z.max[0] - 1; px += 4) for(var pz = z.min[2] + 3; pz < z.max[2] - 2; pz += 5){ A.cyl(0.005, 0.005, 1.2, M(0x333333), px, y + h - 0.6, pz, g); A.cyl(0.08, 0.32, 0.25, M(0xf0e4c8, { emissive: 0xffe6b0, emissiveIntensity: 0.6 }), px, y + h - 1.3, pz, g); }
    var cs = A.sign('CAFETERIA', { w: 512, h: 128, mw: 1.8 }); cs.position.set(z.glassX - 0.05, y + h - 0.45, z.doorZ); cs.rotation.y = -Math.PI / 2; g.add(cs); },
  ward: function(z, g, mats){ var y = z.y, w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, mats.floor, 1.2, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.2, g, new V(cx, y + h, cz), false);
    wallStrip(w, h, mats.wall, g, new V(cx, y + h / 2, z.max[2]), Math.PI); wallStrip(d, h, mats.wall, g, new V(z.max[0], y + h / 2, cz), -Math.PI / 2);
    lights(g, mats, new V(cx - 3, 0, z.max[2]), new V(cx - 3, 0, z.min[2]), y, h, 3.5); lights(g, mats, new V(cx + 3, 0, z.max[2]), new V(cx + 3, 0, z.min[2]), y, h, 3.5);
    [[50, -112.5], [50, -120], [61, -112.5], [61, -126], [49, -127], [53.5, -128]].forEach(function(p, i){ var dk = new THREE.Group(); dk.position.set(p[0], y, p[1]); dk.rotation.y = i * 0.7; g.add(dk);
      A.box(1.6, 0.05, 0.8, M(0xd8d2c4), 0, 0.75, 0, dk); A.box(1.5, 0.72, 0.05, M(0x8a8f94), 0, 0.37, -0.35, dk); A.box(0.5, 0.35, 0.04, M(0x111111), -0.3, 1.0, -0.2, dk); A.box(0.48, 0.3, 0.01, M(0x2a5a80, { emissive: 0x3070a0, emissiveIntensity: 0.6 }), -0.3, 1.0, -0.17, dk); });
    [[59, -115], [48.5, -122]].forEach(function(p){ var c = A.box(0.03, 2.0, 3.0, M(0x8db3a8, { roughness: 0.95 }), p[0], y + 1.2, p[1], g); });
    var cart = A.crashCart(); cart.position.set(55, y, -124); g.add(cart); var ws = A.sign('WARD 2  ·  RECOVERY', { w: 1024, h: 128, mw: 2.6, size: 60 }); ws.position.set(z.max[0] - 0.05, y + 2.3, -121); ws.rotation.y = -Math.PI / 2; g.add(ws); },
  waiting: function(z, g, mats){ var y = z.y, w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, mats.floor, 1.2, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.2, g, new V(cx, y + h, cz), false);
    wallStrip(d, h, mats.wall, g, new V(z.min[0], y + h / 2, cz), Math.PI / 2); wallStrip(d, h, mats.wall, g, new V(z.max[0], y + h / 2, cz), -Math.PI / 2);
    lights(g, mats, new V(cx, 0, z.max[2]), new V(cx, 0, z.min[2]), y, h, 3.0);
    for(var r = 0; r < 4; r++){ [-1, 1].forEach(function(sd){ var row = A.chairRow(4), rx = sd < 0 ? z.min[0] + 0.8 : 61.4, rz = -135.5 - r * 3.4; if(W.pathDist(W.data, ['g_wait'], rx + 0.9, rz) < 1.6) return; row.position.set(rx, y, rz); row.rotation.y = 0; g.add(row); }); }
    var rd = new THREE.Group(); rd.position.set(z.max[0] - 1.4, y, -146); g.add(rd); A.box(1.0, 1.1, 3.2, M(0x6a8f9a), 0, 0.55, 0, rd); A.box(1.2, 0.06, 3.4, new THREE.MeshStandardMaterial({ map: A.tex.wood }), 0, 1.12, 0, rd);
    var adm = A.sign('ADMISSIONS', { w: 512, h: 128, mw: 1.8 }); adm.position.set(z.max[0] - 0.05, y + 2.4, -146); adm.rotation.y = -Math.PI / 2; g.add(adm);
    var vm = A.vending(); vm.position.set(z.min[0] + 0.5, y, -146); vm.rotation.y = Math.PI / 2; g.add(vm); var pl = A.plant(); pl.position.set(z.max[0] - 0.6, y, -134); g.add(pl);
    var tv = A.box(1.4, 0.8, 0.06, M(0x0f1a24, { emissive: 0x2a4a66, emissiveIntensity: 0.6 }), z.min[0] + 0.05, y + 2.0, -139, g); tv.rotation.y = Math.PI / 2;
    var ws = A.sign('WAITING AREA', { w: 512, h: 128, mw: 1.8 }); ws.position.set(57, y + h - 0.35, -133.4); ws.rotation.y = Math.PI; g.add(ws); },
  lobby: function(z, g, mats){ var y = z.y, w = z.max[0] - z.min[0], d = z.max[2] - z.min[2], cx = (z.min[0] + z.max[0]) / 2, cz = (z.min[2] + z.max[2]) / 2, h = z.max[1] - y;
    slab(w, d, texMat(A.tex.vinyl, 1, 1, { color: 0xdcd6c8, roughness: 0.35, metalness: 0.1 }), 2.0, g, new V(cx, y, cz), true); slab(w, d, mats.ceil, 1.5, g, new V(cx, y + h, cz), false);
    wallStrip(d, h, mats.wall, g, new V(z.min[0], y + h / 2, cz), Math.PI / 2); wallStrip(d, h, mats.wall, g, new V(z.max[0], y + h / 2, cz), -Math.PI / 2);
    // the main entrance: full-height glass wall with sliding doors on the rail line, steel mullions
    for(var x = z.min[0] + 1; x < z.max[0]; x += 2){ if(Math.abs(x - z.doorX) < 2.1) continue; A.box(1.95, h, 0.04, mats.glass, x, y + h / 2, z.min[2], g); A.box(0.1, h, 0.1, mats.frame, x + 1, y + h / 2, z.min[2], g); }
    A.box(4.2, h - 2.6, 0.1, mats.frame, z.doorX, y + 2.6 + (h - 2.6) / 2, z.min[2], g);
    var ent = A.sign(z.name + '\nMAIN ENTRANCE', { w: 1024, h: 256, mw: 4.2, size: 70 }); ent.position.set(z.doorX, y + 3.6, z.min[2] + 0.08); g.add(ent);
    [[52.5, -156], [63.5, -156], [52.5, -163], [63.5, -163]].forEach(function(p){ A.cyl(0.35, 0.35, h, M(0xd8d4cc), p[0], y + h / 2, p[1], g, 16); });
    [[54.2, -164.4], [61.8, -164.4]].forEach(function(p){ A.box(1.6, 0.8, 0.8, M(0x7b6a58), p[0], y + 0.4, p[1], g); var pl = A.plant(); pl.position.set(p[0], y + 0.6, p[1]); g.add(pl); });
    var info = new THREE.Group(); info.position.set(52, y, -152.5); g.add(info); A.box(3, 1.05, 1, M(0x7f9aa8), 0, 0.52, 0, info); var is = A.sign('INFORMATION', { w: 512, h: 128, mw: 1.6 }); is.position.set(0, 2.3, 0); info.add(is);
    lights(g, mats, new V(cx - 4, 0, z.max[2]), new V(cx - 4, 0, z.min[2]), y, h, 3.5); lights(g, mats, new V(cx + 4, 0, z.max[2]), new V(cx + 4, 0, z.min[2]), y, h, 3.5); },
  outdoor: function(z, g, mats){ var y = z.y;
    var lot = slab(140, 70, texMat(A.tex.asphalt, 1, 1, { roughness: 0.9 }), 6, g, new V(60, y - 0.02, -200), true); var grass = slab(2000, 600, texMat(A.tex.grass, 1, 1, { roughness: 1 }), 12, g, new V(700, y - 0.06, -230), true);
    // hospital exterior: facade planes facing OUT (invisible from inside), canopy, bay sign, bollards, a parked ambulance
    var fac = new THREE.MeshStandardMaterial({ map: A.tex.facade(7, '#c9c2b4', '#ffe6b0'), roughness: 0.85 }); fac.map.wrapS = fac.map.wrapT = THREE.RepeatWrapping; fac.map.repeat.set(8, 2);
    plane(60, 22, fac, g, new V(58, y + 11, -168.05), [0, Math.PI, 0]).material = fac; var hs = A.sign('ST. MERCER MEMORIAL', { w: 1024, h: 160, mw: 14, bg: '#123a5a', size: 96 }); hs.position.set(58, y + 9.5, -168.2); hs.rotation.y = Math.PI; g.add(hs);
    var es = A.sign('EMERGENCY', { w: 512, h: 128, mw: 4, bg: '#b0242a' }); es.position.set(66, y + 4.9, -176.2); es.rotation.y = Math.PI; g.add(es);
    A.box(16, 0.4, 9, M(0xe9e7e1), 58, y + 4.4, -172.5, g); [[51, -176.6], [65, -176.6]].forEach(function(p){ A.cyl(0.25, 0.25, 4.4, M(0xd8d4cc), p[0], y + 2.2, p[1], g); });
    for(var bx = 49; bx <= 67; bx += 2) if(Math.abs(bx - 58) > 3) A.cyl(0.13, 0.13, 0.9, M(0xf2c12e), bx, y + 0.45, -177.5, g);
    var bs = A.sign('AMBULANCE ONLY', { w: 512, h: 128, mw: 2, bg: '#b0242a' }); bs.position.set(62, y + 2.2, -183); bs.rotation.y = Math.PI; g.add(bs); A.cyl(0.05, 0.05, 2.2, M(0x888888), 62, y + 1.1, -183, g);
    var amb2 = A.ambulance(); amb2.position.set(66, y, -188); amb2.rotation.y = 0.1; g.add(amb2); [[44, -190, 0.3], [46, -200, 0.2], [72, -197, -0.2]].forEach(function(c){ var car = A.car('patrol'); car.traverse(function(o){ if(o.material && o.material.map === A.tex.patrolSide){ o.material = A.mat(0x6a7a8a, { metalness: 0.4, roughness: 0.4 }); } }); if(car.userData.lightbar) car.remove(car.userData.lightbar); car.position.set(c[0], y, c[1]); car.rotation.y = c[2]; g.add(car); });
    for(var tx = 30; tx < 100; tx += 9){ var t = A.tree(1 + (tx % 3) * 0.15); t.position.set(tx, y, -215 - (tx % 2) * 3); g.add(t); } },
  street: function(z, g, mats, data){ var y = z.y, asphalt = texMat(A.tex.asphalt, 1, 1, { roughness: 0.92 }), side = texMat(A.tex.sidewalk, 1, 1), line = M(0xe8e0b8, { roughness: 0.6 }), white = M(0xf2f2f2);
    var facades = [A.tex.facade(3, '#7c6f63', '#ffd99a'), A.tex.facade(11, '#5e6a74', '#cfe6ff'), A.tex.facade(19, '#8a7d6b', '#ffe2a8'), A.tex.facade(23, '#4f5560', '#ffcc88')].map(function(t){ t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); });
    var seed = 5, rnd = function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }, chunkG = {};
    z.paths.forEach(function(pid){ var def = data.paths.filter(function(p){ return p.id === pid; })[0]; var path = HE.compilePath(def), step = 6, n = Math.ceil(path.span / step);
      for(var i = 0; i < n; i++){ var s = path.lead + i * step, p = path.pointAtS(s + step / 2), t = path.tangentAtS(s + step / 2); t.y = 0; t.normalize(); var yaw = Math.atan2(t.x, t.z), right = new V(-t.z, 0, t.x);
        var ck = 'c' + pid + Math.floor(i / 20); if(!chunkG[ck]){ chunkG[ck] = new THREE.Group(); chunkG[ck].userData.chunk = true; g.add(chunkG[ck]); }
        var seg = new THREE.Group(); seg.position.set(p.x, y, p.z); seg.rotation.y = yaw; chunkG[ck].add(seg);
        A.box(13, 0.04, step + 0.08, asphalt, 0, -0.02, 0, seg); if(i % 2 === 0) A.box(0.16, 0.05, step * 0.5, line, 0, 0.005, 0, seg); [-1, 1].forEach(function(sd){ A.box(0.12, 0.05, step + 0.08, white, sd * 6.1, 0.005, 0, seg); A.box(3.2, 0.16, step + 0.08, side, sd * 8.1, 0.06, 0, seg); A.box(0.2, 0.18, step + 0.08, M(0x9a978f), sd * 6.55, 0.07, 0, seg); });
        if(pid === 'bay_route') continue;
        if(i % 4 === 0){ [-1, 1].forEach(function(sd){ var lq = p.clone().addScaledVector(right, sd * 7.2); if(W.pathDist(data, z.paths, lq.x, lq.z) < 6.6) return; var sl = A.streetLight(); sl.position.set(sd * 7.2, 0, 0); sl.rotation.y = sd > 0 ? Math.PI : 0; seg.add(sl); }); }
        if(i % 3 === 1){ [-1, 1].forEach(function(sd){ var tq = p.clone().addScaledVector(right, sd * 9.2); if(W.pathDist(data, z.paths, tq.x, tq.z) < 8.4) return; var tr = A.tree(0.8 + rnd() * 0.5); tr.position.set(sd * 9.2, 0, rnd() * 3); seg.add(tr); }); }
        if(i % 5 === 0){ [-1, 1].forEach(function(sd){ var bw = 14 + rnd() * 10, bh = 9 + rnd() * 20, bc = p.clone().addScaledVector(right, sd * (14 + bw / 2)); if(W.pathDist(data, z.paths, bc.x, bc.z) < Math.hypot(bw, 26) / 2 + 7) return; var fm = facades[Math.floor(rnd() * 4)], bg = new THREE.BoxGeometry(bw, bh, 26), buv = bg.attributes.uv, rx = bw / 14, ry = bh / 16; for(var ui = 0; ui < buv.count; ui++) buv.setXY(ui, buv.getX(ui) * rx, buv.getY(ui) * ry);
          var b = new THREE.Mesh(bg, fm); b.position.set(sd * (14 + bw / 2), bh / 2, 0); seg.add(b); }); } }
      var d = def; if(z.overpassAt && pid === 'chase_road'){ var op = path.pointAt(z.overpassAt), ot = path.tangentAtS(path.sOf(z.overpassAt)); ot.y = 0; ot.normalize(); var ob = new THREE.Group(); ob.position.set(op.x, y, op.z); ob.rotation.y = Math.atan2(ot.x, ot.z); g.add(ob);
        A.box(60, 1.4, 12, M(0x8a8a86), 0, 7.2, 0, ob); A.box(60, 1.0, 0.4, M(0x9a9a96), 0, 8.4, 5.8, ob); A.box(60, 1.0, 0.4, M(0x9a9a96), 0, 8.4, -5.8, ob); [-1, 1].forEach(function(sd){ A.box(1.6, 6.6, 10, M(0x7d7d79), sd * 9.5, 3.3, 0, ob); });
        var hw = A.sign('ROUTE 14  ·  NORTH', { w: 1024, h: 160, mw: 7, bg: '#1f6b3a', size: 80 }); hw.position.set(0, 8.9, 6.1); ob.add(hw); var hw2 = hw.clone(); hw2.position.z = -6.1; hw2.rotation.y = Math.PI; ob.add(hw2); }
      if(d.crossingAt != null && pid === z.crossingPath){ var cp = path.pointAt(d.crossingAt), ct = path.tangentAtS(path.sOf(d.crossingAt)); ct.y = 0; ct.normalize(); var cr = new THREE.Group(); cr.position.set(cp.x, y, cp.z); cr.rotation.y = Math.atan2(ct.x, ct.z); g.add(cr);
        // rails run across the road (local x axis); ties, ballast, crossbucks + gates on both sides, signal lights
        A.box(400, 0.25, 4.2, M(0x6f675d, { roughness: 1 }), 0, 0.02, 0, cr); for(var k = -200; k <= 200; k += 0.75) A.box(0.22, 0.12, 2.8, M(0x4a3626), k, 0.16, 0, cr);
        [-0.72, 0.72].forEach(function(rz){ A.box(400, 0.16, 0.09, M(0x8a8e94, { metalness: 0.8, roughness: 0.3 }), 0, 0.28, rz, cr); });
        [[-1, -1], [1, 1]].forEach(function(c){ var x = A.crossing(); x.position.set(c[0] * 7.4, 0, c[1] * 3.4); x.rotation.y = c[0] > 0 ? Math.PI : 0; x.userData.keep = true; cr.add(x); W.crossings.push(x); });
        var xs = A.sign('LINE 9  ·  HARBOR SPUR', { w: 1024, h: 128, mw: 3, bg: '#222', fg: '#f2c12e', size: 64 }); xs.position.set(9, 4.6, -3.4); cr.add(xs);
        W.crossingInfo = { pos: cp.clone().setY(y), along: new V(-ct.z, 0, ct.x) }; } }); }
};
})();
