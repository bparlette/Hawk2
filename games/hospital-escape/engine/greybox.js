/* Hospital Escape engine — greybox: engine-created world + actors so everything is provable with zero art.
   Corridors are swept along the data's rail paths; rooms/boxes come from data.greybox. Actors are capsules, a bed,
   a chair, a boxy ambulance, pursuer cars with tire/windshield/hood hit zones, and a train.
   HE.bindActor(roleId, object3D) swaps any role's greybox mesh for real art without engine changes. */
(function(){
'use strict';
var HE = window.HE;
HE.Greybox = function(game){
  var scene = game.scene, g = { actors: {}, bound: {}, world: new THREE.Group(), dyn: new THREE.Group(), train: null };
  scene.add(g.world); scene.add(g.dyn);
  var M = function(c, o){ return new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {})); };
  var mats = { floor: M(0x9a9a96), wall: M(0xc8c8c2), ceil: M(0xe0e0da), road: M(0x505257), line: M(0xd8d0a0), grass: M(0x5f6f55), rail: M(0x6a5a4a), steel: M(0x8a8e94),
    hero: M(0x4a78c8), friend: M(0xd08a3a), gunman: M(0x7a2e2e), staff: M(0x6fa7a0), dead: M(0x3a3a3a), crate: M(0x8a7350),
    bed: M(0xe8e8f0), chair: M(0x2a2a2e), amb: M(0xf4f4f0), ambStripe: M(0xc03030), train: M(0x2f4f7f), smoke: M(0x444444, { transparent: true, opacity: 0.6 }) };
  var CAR = { patrol: [0xf0f0f0, 0x1a1a1a], charger: [0xe8e8e8, 0x2a3a7a], suv: [0x111214, 0x111214] };
  function box(w, h, d, mat, x, y, z, parent){ var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || g.world).add(m); return m; }
  // ---- world ----
  g.build = function(data){ var gb = data.greybox || {};
    (gb.rooms || []).forEach(function(r){ var w = r.max[0] - r.min[0], h = r.max[1] - r.min[1], d = r.max[2] - r.min[2], cx = (r.max[0] + r.min[0]) / 2, cy = r.min[1], cz = (r.max[2] + r.min[2]) / 2;
      box(w, 0.1, d, mats.floor, cx, cy - 0.05, cz); if(r.walls !== false){ var t = 0.15, wm = mats.wall;
        box(w, h, t, wm, cx, cy + h / 2, r.min[2]); box(w, h, t, wm, cx, cy + h / 2, r.max[2]); box(t, h, d, wm, r.min[0], cy + h / 2, cz); box(t, h, d, wm, r.max[0], cy + h / 2, cz); } });
    (gb.boxes || []).forEach(function(b){ box(b.size[0], b.size[1], b.size[2], mats[b.mat || 'crate'] || mats.crate, b.at[0], b.at[1] + b.size[1] / 2, b.at[2]); });
    (gb.corridors || []).forEach(function(c){ var path = game.path(c.path); if(path) sweep(path, c.width || 3.6, c.wallH == null ? 3 : c.wallH, c.road); }); };
  function sweep(path, width, wallH, road){ var step = 1.0, n = Math.ceil(path.length / step), hw = width / 2;
    for(var i = 0; i < n; i++){ var s = i * step, a = path.pointAtS(s), b = path.pointAtS(Math.min(path.length, s + step)), dir = b.clone().sub(a); var L = dir.length(); if(L < 1e-3) continue;
      if(Math.abs(dir.y) > 0.5 * L) continue;                         // vertical runs (the elevator) get a shaft box from data instead
      var mid = a.clone().add(b).multiplyScalar(0.5), yaw = Math.atan2(dir.x, dir.z), seg = new THREE.Group(); seg.position.copy(mid); seg.rotation.y = yaw; g.world.add(seg);
      box(width, 0.08, L + 0.02, road ? mats.road : mats.floor, 0, -0.04, 0, seg);
      if(road){ box(0.15, 0.09, L * 0.5, mats.line, 0, -0.03, 0, seg); box(width * 3, 0.05, L + 0.02, mats.grass, 0, -0.07, 0, seg); }
      else if(wallH > 0){ box(0.12, wallH, L + 0.02, mats.wall, hw, wallH / 2, 0, seg); box(0.12, wallH, L + 0.02, mats.wall, -hw, wallH / 2, 0, seg); } }
    var d = path.def; if(d.crossingAt != null){ var cp = path.pointAt(d.crossingAt), t = path.tangentAtS(path.sOf(d.crossingAt)); t.y = 0; t.normalize();
      var rails = new THREE.Group(); rails.position.copy(cp); rails.rotation.y = Math.atan2(t.x, t.z) + Math.PI / 2; g.world.add(rails);
      box(0.12, 0.15, 260, mats.steel, 0, 0.07, -0.72, rails); box(0.12, 0.15, 260, mats.steel, 0, 0.07, 0.72, rails); for(var k = -128; k <= 128; k += 1.2) box(2.4, 0.08, 0.25, mats.rail, 0, 0.02, k, rails).rotation.y = Math.PI / 2;
      g.crossing = { pos: cp, along: new THREE.Vector3(-t.z, 0, t.x) }; } }
  g.addCover = function(p){ return box(1.4, 1.0, 0.6, mats.crate, p.x, p.y + 0.5, p.z, g.dyn); };
  g.removeObject = function(o){ if(o && o.parent) o.parent.remove(o); };
  g.moveCover = function(o, p){ if(o) o.position.set(p.x, o.position.y, p.z); };
  // ---- actors ----
  function capsule(mat){ var grp = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2, 10), mat); body.position.y = 0.95; grp.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat); head.position.y = 1.75; grp.add(head);
    var legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.4, 8), mat); legs.position.y = 0.2; grp.add(legs); return grp; }
  g.addActor = function(role, kind){ var m = capsule(mats[kind] || mats.gunman); m.name = role; g.dyn.add(m); g.actors[role] = m; return m; };
  g.killActor = function(role){ var m = g.actors[role]; if(!m) return; m.rotation.x = -Math.PI / 2; m.position.y += 0.25; m.traverse(function(o){ if(o.material) o.material = mats.dead; }); };
  g.removeActor = function(role){ var m = g.actors[role]; if(m && m.parent) m.parent.remove(m); delete g.actors[role]; };
  g.object = function(role){ return g.bound[role] || g.actors[role] || null; };
  g.bind = function(role, obj){ var old = g.actors[role]; g.bound[role] = obj; if(old){ if(old.userData.hit) obj.userData.hit = old.userData.hit; obj.position.copy(old.position); old.visible = false; } if(!obj.parent) g.dyn.add(obj); return true; };
  g.addCar = function(role, kind){ var c = CAR[kind] || CAR.patrol, grp = new THREE.Group(); grp.name = role;
    box(2.0, 0.7, 4.4, M(c[0]), 0, 0.9, 0, grp);                                              // body (front = +z, toward the ambulance)
    var cab = box(1.8, 0.55, 1.9, M(c[1]), 0, 1.53, -0.5, grp);
    var ws = box(1.6, 0.5, 0.08, M(0x8fb4d0), 0, 1.53, 0.48, grp); ws.userData.zone = 'driver';  // windshield = driver
    var hood = box(1.8, 0.12, 1.5, M(c[1] === c[0] ? 0x2a2a2a : c[0]), 0, 1.3, 1.4, grp); hood.userData.zone = 'engine';
    if(kind !== 'suv'){ box(1.2, 0.12, 0.3, M(0x3050ff), 0, 1.86, -0.5, grp); }                // light bar: marked cars only
    if(kind === 'charger') box(1.7, 0.4, 0.15, M(0x222222), 0, 0.75, 2.3, grp);                // push bar
    [[-1.0, 1.7], [1.0, 1.7], [-1.0, -1.4], [1.0, -1.4]].forEach(function(w, i){ var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.32, 12), M(0x161616)); wh.rotation.z = Math.PI / 2; wh.position.set(w[0], 0.4, w[1]); grp.add(wh); if(i < 2) wh.userData.zone = 'tire'; });
    g.dyn.add(grp); g.actors[role] = grp; return grp; };
  g.zoneObject = function(role, zone){ var m = g.object(role), out = null; if(!m) return null; m.traverse(function(o){ if(!out && o.userData.zone === zone) out = o; }); return out; };
  // ---- vehicles for the rider ----
  g.vehicles = {}; (function(){ var bed = new THREE.Group(); box(1.0, 0.18, 2.1, mats.bed, 0, 0.62, 0, bed); box(1.0, 0.25, 0.06, mats.steel, 0, 0.62, -1.05, bed); g.vehicles.bed = bed;
    var ch = new THREE.Group(); box(0.6, 0.08, 0.55, mats.chair, 0, 0.5, 0, ch); box(0.6, 0.3, 0.06, mats.chair, 0, 0.62, 0.27, ch);   // backrest kept below the 1.0 m seated rig's eye line [-0.33, 0.33].forEach(function(x){ var w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 16), mats.steel); w.position.set(x, 0.3, 0.1); w.rotation.y = Math.PI / 2; ch.add(w); }); g.vehicles.chair = ch;
    var amb = new THREE.Group(); box(2.3, 0.15, 5.6, mats.amb, 0, 0.85, 0, amb); box(2.3, 2.0, 0.1, mats.amb, 0, 1.9, 2.8, amb); box(0.1, 2.0, 5.6, mats.amb, -1.15, 1.9, 0, amb); box(0.1, 2.0, 5.6, mats.amb, 1.15, 1.9, 0, amb); box(2.3, 0.1, 5.6, mats.amb, 0, 2.9, 0, amb);
      box(0.12, 0.35, 5.6, mats.ambStripe, -1.2, 1.6, 0, amb); box(0.12, 0.35, 5.6, mats.ambStripe, 1.2, 1.6, 0, amb); g.vehicles.ambulance = amb;
    Object.keys(g.vehicles).forEach(function(k){ g.vehicles[k].visible = false; g.dyn.add(g.vehicles[k]); }); })();
  g.showVehicle = function(v, pos, dir){ Object.keys(g.vehicles).forEach(function(k){ g.vehicles[k].visible = k === v; }); var o = g.vehicles[v]; if(!o) return;
    o.position.copy(pos); o.lookAt(pos.x - dir.x, pos.y, pos.z - dir.z); };
  // ---- train ----
  g.addTrain = function(cs){ if(!g.crossing) return; var tr = new THREE.Group(); for(var i = 0; i < 8; i++) box(3.0, 3.6, 16, mats.train, 0, 2.2, -i * 16.6, tr); g.dyn.add(tr); g.train = tr; g.placeTrain(0); };
  g.placeTrain = function(t){ if(!g.train) return; var c = g.crossing, ap = game.data.tuning.trainApproach, sp = 30, x = Math.min((t - ap) * sp, 60);   // front reaches the road at t = trainApproach, then the train stands across the crossing
    g.train.position.copy(c.pos).addScaledVector(c.along, x); g.train.lookAt(g.train.position.clone().add(c.along)); };
  g.removeTrain = function(){ g.removeObject(g.train); g.train = null; };
  return g;
};
HE.bindActor = function(roleId, object3D){ return HE.current ? HE.current.greybox.bind(roleId, object3D) : false; };
})();
