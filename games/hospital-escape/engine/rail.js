/* Hospital Escape engine — rail: compiled Catmull-Rom paths (arc-length parameterised) and the rail-camera rig.
   A path is compiled once: centripetal Catmull-Rom through the data points with a short straight LEAD-IN before
   point 0 (so the camera `back` and the pusher 0.55 m behind the rider still sit ON the spline at at=0), sampled
   densely into a polyline (≤ 1 mm from the true curve). `at` 0..1 maps to arc length over the data points only. */
(function(){
'use strict';
var HE = window.HE, V3 = function(a){ return new THREE.Vector3(a[0], a[1], a[2]); };
var LEAD = 3.0, SAMPLES_PER_M = 40;

HE.compilePath = function(def){
  var pts = def.points.map(V3), d0 = pts[1].clone().sub(pts[0]).normalize();
  var ctrl = [pts[0].clone().addScaledVector(d0, -LEAD)].concat(pts);
  var curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.5);
  var approx = 0; for(var i = 1; i < ctrl.length; i++) approx += ctrl[i].distanceTo(ctrl[i - 1]);
  var N = Math.max(400, Math.ceil(approx * SAMPLES_PER_M)), P = [], S = [0];
  for(var k = 0; k <= N; k++){ P.push(curve.getPoint(k / N)); if(k) S.push(S[k - 1] + P[k].distanceTo(P[k - 1])); }
  // arc length at data point 0 (= end of the lead-in): sample index at curve parameter 1/(ctrl.length-1)
  var lead = S[Math.round(N / (ctrl.length - 1))], L = S[N];
  var path = { def: def, id: def.id, vehicle: def.vehicle, height: def.height, back: def.back || 0, points: def.points,
    lead: lead, length: L, span: L - lead, P: P, S: S };
  function idxAt(s){ var lo = 0, hi = N; while(hi - lo > 1){ var m = (lo + hi) >> 1; if(S[m] <= s) lo = m; else hi = m; } return lo; }
  path.pointAtS = function(s, out){ s = HE.clamp(s, 0, L); var i = Math.min(idxAt(s), N - 1), f = (s - S[i]) / ((S[i + 1] - S[i]) || 1);
    return (out || new THREE.Vector3()).copy(P[i]).lerp(P[i + 1], f); };
  path.tangentAtS = function(s, out){ s = HE.clamp(s, 0, L); var i = Math.min(idxAt(s), N - 1); var a = P[Math.max(0, i - 2)], b = P[Math.min(N, i + 3)];
    return (out || new THREE.Vector3()).subVectors(b, a).normalize(); };
  path.sOf = function(at){ return lead + HE.clamp(at, 0, 1) * (L - lead); };
  path.atOfS = function(s){ return HE.clamp((s - lead) / (L - lead), 0, 1); };
  path.pointAt = function(at, out){ return path.pointAtS(path.sOf(at), out); };
  path.floorYAt = function(at){ return path.pointAt(at).y; };
  path.nearestS = function(p){ var best = 1e18, bs = 0; for(var i = 0; i < N; i++){ var a = P[i], b = P[i + 1], ab = b.clone().sub(a), l2 = ab.lengthSq() || 1e-12;
      var t = HE.clamp(p.clone().sub(a).dot(ab) / l2, 0, 1), q = a.clone().addScaledVector(ab, t), d = q.distanceToSquared(p); if(d < best){ best = d; bs = S[i] + t * Math.sqrt(l2); } } return { s: bs, d: Math.sqrt(best) }; };
  path.distanceToSpline = function(p){ return path.nearestS(p).d; };
  path.atOfPoint = function(p){ return path.atOfS(path.nearestS(p).s); };
  return path;
};

// ---- the rig: rider ON the path, pusher 0.55 m behind on the same path, camera `height` above the floor line and
// `back` metres behind the rider ALONG the spline; look-at blends tangent <-> look keys. Speed from data only.
// ext (gated by game.cameraOffset, set only by a game layer): a head/neck offset { yaw, pitch, roll (rad), pos: Vector3 }
// applied INSIDE camera placement, so the reticle raycast uses exactly the camera the player sees
HE.applyCameraOffset = function(game, cam){ var o = game.cameraOffset; if(!o) return; if(o.pos) cam.position.add(o.pos); if(o.yaw) cam.rotateY(o.yaw); if(o.pitch) cam.rotateX(o.pitch); if(o.roll) cam.rotateZ(o.roll); };
HE.Rail = function(game){
  var r = { path: null, s: 0, released: 0, holdKey: -1, endReached: false, firedEvents: {}, lookDir: new THREE.Vector3(0, 0, -1), _speed: 0 };
  r.setPath = function(path, mode){ r.path = path; r.mode = mode; r.s = path.lead; r.released = 0; r.consumed = {}; r.endReached = false; r.firedEvents = {}; r.holdT = 0;
    r.lookDir.copy(r.forward()); r.place(0, true); };
  r.pathT = function(){ return r.path ? r.path.atOfS(r.s) : 0; };
  r.setPathT = function(at){ r.s = r.path.sOf(at); r.place(0, true); };          // test/debug placement (no events)
  r.forward = function(){ var t = r.path.tangentAtS(r.s); if(r.mode === 'AMBULANCE') t.negate(); t.y = 0; if(t.lengthSq() < 1e-6) t.set(0, 0, -1); return t.normalize(); };
  // speed: constant `speed`, or piecewise speedKeys (a key's speed applies from its `at` on). speed 0 = a HOLD that
  // only a wave's onCleared:resume releases; a release made before the hold is reached is banked (never soft-locks).
  r.speedKeyAt = function(at){ var ks = r.path.def.speedKeys, k = -1; if(!ks) return -1; for(var i = 0; i < ks.length; i++) if(ks[i].at <= at + 1e-9) k = i; return k; };
  r.speed = function(){ return r._speed; };
  r.computeSpeed = function(){ var d = r.path.def, at = r.pathT(); if(r.endReached || at >= 1) return 0;
    if(!d.speedKeys) return d.speed || 0;
    var ks = d.speedKeys, k = r.speedKeyAt(at); if(k < 0) return ks[0].speed;
    if(ks[k].speed > 0) return ks[k].speed;
    if(!r.consumed[k]){ if(r.released > 0){ r.released--; r.consumed[k] = true; game.log('release', { key: k, at: ks[k].at }); } else { if(r.holdKey !== k){ r.holdKey = k; game.log('hold', { at: ks[k].at }); } return 0; } }
    for(var j = k + 1; j < ks.length; j++) if(ks[j].speed > 0) return ks[j].speed;     // released hold: next moving key's speed
    return 0; };
  r.release = function(){ r.released++; };
  r.step = function(dt){ if(!r.path) return; r._speed = r.computeSpeed(); r.s = Math.min(r.path.length, r.s + r._speed * dt);
    var a1 = r.path.atOfS(r.s);
    if(dt > 0) (r.path.def.events || []).forEach(function(e, i){ if(!r.firedEvents[i] && e.at <= a1 + 1e-9){ r.firedEvents[i] = true; game.pathEvent(e); } });
    r.place(dt, false); };
  r.riderPos = function(out){ return r.path.pointAtS(r.s, out); };
  r.pusherPos = function(out){ return r.path.pointAtS(r.s - HE.PUSHER_GAP, out); };
  var _tgt = new THREE.Vector3(), _des = new THREE.Vector3();
  r.cameraPos = function(out){ out = out || new THREE.Vector3();
    if(r.mode === 'AMBULANCE'){ var p = r.path.pointAtS(r.s), t = r.path.tangentAtS(r.s); t.y = 0; t.normalize(); var bo = r.path.def.bayOffset == null ? 1.9 : r.path.def.bayOffset; return out.copy(p).addScaledVector(t, -bo).setY(p.y + r.path.height); }   // ext: bayOffset (m behind the vehicle centre) places the rig inside the art's bay
    out = r.path.pointAtS(r.s - r.path.back, out); out.y += r.path.height;
    var sd = r.path.def.side; if(sd){ var tt = r.path.tangentAtS(r.s - r.path.back); tt.y = 0; tt.normalize(); out.x += -tt.z * sd; out.z += tt.x * sd; }   // ext: lateral offset to the rider's right
    return out; };
  // ext (data-gated): default look = a point on the path lookAhead m ahead at lookHeight (over-the-shoulder spec); else the tangent
  var _base = new THREE.Vector3();
  r.baseDir = function(pos){ var d = r.path.def; if(d.lookAhead && r.mode !== 'AMBULANCE'){ var p = r.path.pointAtS(r.s + d.lookAhead); p.y += (d.lookHeight == null ? 1.0 : d.lookHeight); return _base.subVectors(p, pos).normalize(); } return _base.copy(r.forward()); };
  // look keys: point targets or 'group:<waveId>' (live centroid); falls back to the tangent; never more than 110°
  // off the travel direction (targets never stay behind the camera). Exponential blend, tau 0.35 s: no snaps.
  r.lookTarget = function(){ var ks = r.path.def.look, at = r.pathT(), k = null; r.lookIsLiveGroup = false; if(!ks) return null;
    for(var i = 0; i < ks.length; i++) if(ks[i].at <= at + 1e-9) k = ks[i]; if(!k) return null;
    r.lookIsLiveGroup = false;
    if(typeof k.target === 'string'){ var c = game.groupCentroid(k.target.replace(/^group:/, '')); r.lookIsLiveGroup = !!c; return c; }
    return _tgt.set(k.target[0], k.target[1], k.target[2]); };
  r.place = function(dt, snap){ var cam = game.camera, pos = r.cameraPos(cam.position), fwd = r.forward(), tg = r.lookTarget(), stopped = r._speed === 0 && r.mode !== 'AMBULANCE';
    // stopped (hold / path end) with live enemies and no live look target: turn to the nearest threat (no behind-clamp
    // while stopped) so a wave can never pin the rider from outside the view
    if(stopped && !r.lookIsLiveGroup){ var ne = game.nearestEnemy && game.nearestEnemy(pos); if(ne) tg = _tgt.copy(ne).setY(ne.y + 1.2); }
    var base = r.baseDir(pos), clampDeg = stopped && r.path.def.holdClamp != null ? r.path.def.holdClamp : r.path.def.lookClamp;   // ext: holdClamp — during a hold the view may turn further, to the live threat
    if(tg) _des.subVectors(tg, pos).normalize(); else _des.copy(base);
    if(!stopped && _des.dot(fwd) < Math.cos(110 * Math.PI / 180)) _des.copy(base);
    if(clampDeg){ var a = Math.acos(HE.clamp(_des.dot(base), -1, 1)), c = clampDeg * Math.PI / 180; if(a > c) _des.copy(base).lerp(_des, c / a).normalize(); }   // ext: keeps the heroes in frame
    if(snap) r.lookDir.copy(_des); else if(dt > 0){ var kb = 1 - Math.exp(-dt / 0.35);
      if(r.lookDir.dot(_des) > -0.2) r.lookDir.lerp(_des, kb).normalize();
      else { var y0 = Math.atan2(r.lookDir.x, r.lookDir.z), y1 = Math.atan2(_des.x, _des.z), dy = y1 - y0; while(dy > Math.PI) dy -= 2 * Math.PI; while(dy < -Math.PI) dy += 2 * Math.PI;   // ext (ELEVATOR-BLOCK): a turn of ~100 deg+ swings
        var p0 = Math.asin(HE.clamp(r.lookDir.y, -1, 1)), p1 = Math.asin(HE.clamp(_des.y, -1, 1)), yy = y0 + dy * kb, pp = p0 + (p1 - p0) * kb;                                     // round in yaw (shortest arc) — a straight lerp passes
        r.lookDir.set(Math.sin(yy) * Math.cos(pp), Math.sin(pp), Math.cos(yy) * Math.cos(pp)); } }                                                                                   // through ~zero and points the lens at the floor
    cam.lookAt(_tgt.copy(pos).add(r.lookDir)); HE.applyCameraOffset(game, cam);
    if(game.cameraCollide && r.mode !== 'AMBULANCE' && game.mode !== 'CUTSCENE'){   /* cutscene framings are authored */ var pv = r.path.pointAtS(r.s); pv.y += r.path.height; game.cameraCollide(cam, pv); }   // ext (game-layer hook, CAMERA-FIX): pull the camera in toward the rider if geometry is between them
    cam.updateMatrixWorld(); };
  return r;
};
})();
