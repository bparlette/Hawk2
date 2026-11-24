/* Hospital Escape — N2 IN THE HALLWAYS (Nov 24, Cherie's ruling: "N2 is my winner,
   integrate it"). N2 = Neon's valid-mocap figure exactly as he stands in the narrowed
   walk-off (games/hospital-escape-walkoff-narrowed/): MIT VALID avatar, her fixedH/z0
   normalization (1.80 m), IMPROVED dressing on (GearMat charcoal + fabric bump, _Body
   lift, bone-attached vest), walk-off target height 1.77 m.
   MOTION: Opus's Mixamo pistol set (games/hospital-escape-3d-sample-opus/mixamo/
   mx-gunman.glb), retargeted by Opus onto the VALID rig. N2 IS the same VALID rig —
   identical bone names, matching rest pose — so the clips are driven exactly as in
   opus-mixamo.js: quaternion tracks shared, the Hips.position track re-based onto
   N2's rest hips scaled by leg-length ratio, walk/run layering + additive fire
   recoil, and the walk pace MEASURED on this body by stance-phase foot contact
   (the pacing law: Walk plays at 1.30 m/s via timeScale = 1.30 / measured pace).
   GUN: N2's own pistol is part of his skinned mesh (PistolMat, 144 verts weighted
   100% to RightHand) — it rides inside the Mixamo-curled grip. No lamp shader hack:
   he keeps his shipped materials and is lit by each hallway's own lights.
   Config: window.__N2_CONFIG = { glbN2, glbMx, x, zA, zB, parent(scene) }.
   API: window.__N2 = { ready, errors, fig, update(dt), poseAt(o), gunCentroid(),
   stats() } — update(dt) runs the patrol loop (walk-aim-fire, turn at each end). */
(function(){
'use strict';
var CFG = window.__N2_CONFIG || {};
var V3 = THREE.Vector3, Qt = THREE.Quaternion;
var api = { ready: false, errors: [] };
window.__N2 = api;
window.addEventListener('error', function(e){ api.errors.push(String((e && e.message) || e)); });

function boneOf(root, n){ var b = null; root.traverse(function(o){ if(!b && o.isBone && o.name === n) b = o; }); return b; }
function nodeOf(sc, n){ return boneOf(sc, n) || sc.getObjectByName(n); }
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }

// ------------------------------------------------ ports from walkoff-neon.js (N2's own build, verbatim behaviour)
function prepNeonMaterials(fig){
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m){ if(m.map) m.map.encoding = THREE.sRGBEncoding;
      if(m.name !== 'PistolMat' && !/Gun/i.test(m.name || '')) m.metalness = 0.0; } }); } });
}
function fabricTexture(rx, ry){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
  var img = x.getImageData(0, 0, 256, 256), d = img.data;
  var seed = 1234567;
  function rnd(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  for(var i = 0; i < 256 * 256; i++){
    var px = i % 256, py = (i / 256) | 0;
    var n = 128 + (rnd() - 0.5) * 52 + (px % 2 ? 7 : -7) + (py % 2 ? 4 : -4);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.max(0, Math.min(255, n)); d[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
function findBone(fig, name){ var b = null; fig.traverse(function(o){ if(o.isBone && o.name === name) b = o; }); return b; }
function buildVest(fig, norm, bodyMesh, gearMesh){
  var spine2 = findBone(fig, 'Spine2'), spineB = findBone(fig, 'Spine'), neck = findBone(fig, 'Neck');
  var hips = findBone(fig, 'Hips'), spine1 = findBone(fig, 'Spine1');
  if(!spine2 || !spineB || !bodyMesh) return [];
  norm.updateMatrixWorld(true);
  function bw(b){ return b.getWorldPosition(new THREE.Vector3()); }
  var pSpine2 = bw(spine2), pSpine = bw(spineB), pNeck = bw(neck);
  var foot = findBone(fig, 'LeftFoot'), toe = findBone(fig, 'LeftToeBase');
  var fwd = bw(toe).sub(bw(foot)); fwd.y = 0;
  if(fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); fwd.normalize();
  var up = new THREE.Vector3(0, 1, 0);
  var right = new THREE.Vector3().crossVectors(up, fwd).normalize();
  function boneSet(mesh, names){
    var set = null;
    if(mesh.skeleton){ set = {}; mesh.skeleton.bones.forEach(function(b, i){ if(names.indexOf(b.name) >= 0) set[i] = 1; }); }
    return set;
  }
  function torsoW(mesh, set, i){
    if(!set) return 1;
    var si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, w = 0;
    if(set[si.getX(i)]) w += sw.getX(i); if(set[si.getY(i)]) w += sw.getY(i);
    if(set[si.getZ(i)]) w += sw.getZ(i); if(set[si.getW(i)]) w += sw.getW(i);
    return w;
  }
  function extents(mesh, yLo, yHi, origin, set){
    var pos = mesh.geometry.attributes.position, v = new THREE.Vector3(), rel = new THREE.Vector3();
    var dF = -1e9, dB = -1e9, half = 0;
    for(var i = 0; i < pos.count; i++){ v.fromBufferAttribute(pos, i); mesh.localToWorld(v);
      if(v.y < yLo || v.y > yHi) continue;
      if(torsoW(mesh, set, i) < 0.5) continue;
      rel.copy(v).sub(origin || pSpine2);
      var df = rel.dot(fwd);
      if(df > dF) dF = df; if(-df > dB) dB = -df;
      var rr = Math.abs(rel.dot(right)); if(rr > half) half = rr; }
    return { dF: dF, dB: dB, half: half };
  }
  function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }
  var chestSet = boneSet(bodyMesh, ['Spine', 'Spine1', 'Spine2', 'Neck']);
  var band = extents(bodyMesh, pSpine.y - 0.04, pNeck.y + 0.03, pSpine2, chestSet);
  band.dF = clamp(band.dF, 0.06, 0.30); band.dB = clamp(band.dB, 0.06, 0.30); band.half = clamp(band.half, 0.13, 0.26);
  var dBack = band.dB;
  if(gearMesh){ var ge = extents(gearMesh, pSpine.y - 0.04, pNeck.y + 0.03, pSpine2, boneSet(gearMesh, ['Spine', 'Spine1', 'Spine2', 'Neck', 'Hips']));
    if(ge.dB > dBack) dBack = clamp(ge.dB, 0.06, 0.32); }
  var waist = band;
  if(hips && spine1){ waist = extents(bodyMesh, bw(hips).y - 0.02, bw(spine1).y + 0.02, pSpine, boneSet(bodyMesh, ['Hips', 'Spine', 'Spine1']));
    waist.dF = clamp(waist.dF, 0.06, 0.30); waist.dB = clamp(waist.dB, 0.06, 0.30); waist.half = clamp(waist.half, 0.12, 0.24); }
  var strapX = band.half * 0.60, apexY = pNeck.y + 0.05;
  (function(){
    var set = boneSet(bodyMesh, ['Spine2', 'Neck', 'LeftShoulder', 'RightShoulder']);
    var pos = bodyMesh.geometry.attributes.position, v = new THREE.Vector3(), rel = new THREE.Vector3();
    for(var i = 0; i < pos.count; i++){ v.fromBufferAttribute(pos, i); bodyMesh.localToWorld(v);
      if(v.y < pSpine2.y + 0.06 || v.y > apexY) continue;
      if(torsoW(bodyMesh, set, i) < 0.5) continue;
      rel.copy(v).sub(pSpine2);
      if(Math.abs(Math.abs(rel.dot(right)) - strapX) < 0.04 && v.y > apexY - 0.06) apexY = Math.max(apexY - 0.06, Math.min(v.y + 0.004, pNeck.y + 0.055));
    }
  })();
  var fab = fabricTexture(6, 6);
  var vestMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.078, 0.082, 0.072), roughness: 0.94, metalness: 0, bumpMap: fab, bumpScale: 0.12 });
  var trimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.040, 0.042, 0.038), roughness: 0.92, metalness: 0 });
  var basis = new THREE.Matrix4().makeBasis(right, up, fwd);
  var quat = new THREE.Quaternion().setFromRotationMatrix(basis);
  function panel(w, h, th, cx, cy, cz, mat, tilt){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, th), mat);
    m.position.set(cx, cy, cz); if(tilt) m.rotation.x = tilt; m.castShadow = true; return m; }
  var gC = new THREE.Group(); gC.position.copy(pSpine2); gC.quaternion.copy(quat);
  var cy = 0.04, ph = 0.34, pw = Math.min(band.half * 2 * 0.88, 0.32);
  gC.add(panel(pw + 0.02, ph + 0.02, 0.005, 0, cy, band.dF + 0.0025, trimMat, -0.05));
  gC.add(panel(pw, ph, 0.012, 0, cy, band.dF + 0.011, vestMat, -0.05));
  gC.add(panel(pw + 0.02, ph + 0.02, 0.005, 0, cy, -(dBack + 0.0025), trimMat, 0.05));
  gC.add(panel(pw, ph, 0.012, 0, cy, -(dBack + 0.011), vestMat, 0.05));
  var strapLen = band.dF + dBack + 0.034, strapZ = (band.dF - dBack) / 2;
  [-1, 1].forEach(function(s){
    gC.add(panel(0.058, 0.014, strapLen, s * strapX, apexY - pSpine2.y + 0.007, strapZ, trimMat)); });
  norm.add(gC); norm.updateMatrixWorld(true); spine2.attach(gC);
  var gW = new THREE.Group(); gW.position.copy(pSpine); gW.quaternion.copy(quat);
  var wLen = waist.dF + waist.dB - 0.01, wZ = (waist.dF - waist.dB) / 2;
  [-1, 1].forEach(function(s){
    gW.add(panel(0.012, 0.055, wLen, s * (waist.half + 0.004), 0.01, wZ, trimMat)); });
  norm.add(gW); norm.updateMatrixWorld(true); spineB.attach(gW);
  return [gC, gW];
}
function neonImprove(fig, norm){
  var matRecs = [], seen = {}, bodyMesh = null, gearMesh = null;
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    if(ms[0] && ms[0].name === '_Body') bodyMesh = o;
    if(ms[0] && ms[0].name === 'GearMat') gearMesh = o;
    ms.forEach(function(m){ if(m && !seen[m.uuid]){ seen[m.uuid] = 1;
      matRecs.push({ m: m, name: m.name, color: m.color ? m.color.clone() : null, roughness: m.roughness, metalness: m.metalness }); } }); } });
  var vestParts = buildVest(fig, norm, bodyMesh, gearMesh);
  var fabGear = fabricTexture(4, 4);
  return function(on){
    matRecs.forEach(function(r){ var m = r.m;
      if(r.color) m.color.copy(r.color);
      m.roughness = r.roughness; m.metalness = r.metalness; m.bumpMap = null;
      if(on && r.name === '_Body'){ m.roughness = 0.90; if(r.color) m.color.copy(r.color).multiplyScalar(1.12); }
      if(on && r.name === 'GearMat'){ m.color.setRGB(0.034, 0.036, 0.034); m.roughness = 0.94; m.bumpMap = fabGear; m.bumpScale = 0.15; }
      m.needsUpdate = true; });
    vestParts.forEach(function(g){ g.visible = on; });
  };
}

// ------------------------------------------------ ports from opus-mixamo.js (drive + pace)
var LOWER = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
function sub(c, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? LOWER.test(b) : !LOWER.test(b); }); return x; }
function lay(f, slot, name, fade){ var cur = f.layers[slot]; if(cur === name) return; var a = f.actions[name]; if(!a) return; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if(cur && f.actions[cur]) a.crossFadeFrom(f.actions[cur], fade, false); f.layers[slot] = name; }
function drive(f, dt, st){
  var moving = st.speed > 0.25;
  if(moving){ lay(f, 'low', 'Walk', 0.25); f.actions.Walk.timeScale = st.speed / f.paceWalk; if(f.layers.up){ var u = f.actions[f.layers.up]; if(u) u.fadeOut(0.2); f.layers.up = null; } }
  else { lay(f, 'low', 'LegsIdle', 0.25); lay(f, 'up', st.aim !== false ? 'UpAim' : 'UpCarry', 0.25); }
  if(st.fire && !f.firing){ var fa = f.actions.Fire; if(fa){ fa.reset(); fa.setEffectiveWeight(1); fa.play(); } } f.firing = !!st.fire;
  f.mixer.update(dt);
}
function footPoints(body, root){
  var out = {}, g = body.geometry, sk = body.skeleton, v = new V3();
  var top = root; while(top.parent) top = top.parent; top.updateMatrixWorld(true); sk.update();
  ['Left', 'Right'].forEach(function(sd){ var ids = sk.bones.map(function(x, i){ return /Foot|Toe/.test(x.name) && x.name.indexOf(sd) === 0 ? i : -1; }).filter(function(i){ return i >= 0; }), pts = [];
    for(var i = 0; i < g.attributes.position.count; i++){ var w = 0; for(var k = 0; k < 4; k++) if(ids.indexOf(comp(g.attributes.skinIndex, i, k)) >= 0) w += comp(g.attributes.skinWeight, i, k); if(w > 0.5){ pts.push(body.boneTransform(i, v.set(0, 0, 0)).applyMatrix4(body.matrixWorld).clone()); } }
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); }); var sole = pts.filter(function(p){ return p.y < ymin + 0.054; });   // sole band 3% of height, points are world metres here
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; }), fb = boneOf(root, sd + 'Foot');
    out[sd] = { heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()) }; });
  return out;
}
function contactPace(clip, figScene, bodyMesh, normT){
  var m = THREE.SkeletonUtils.clone(figScene);
  var norm = new THREE.Group(); var sc = 1.80 / 178.68;
  m.scale.setScalar(sc); m.position.y = 99.1 * sc; norm.add(m);
  var wrap = new THREE.Group(); wrap.scale.setScalar(1.77 / 1.80); wrap.add(norm);
  var hold = new THREE.Group(); hold.add(wrap); hold.updateMatrixWorld(true);
  var mx = new THREE.AnimationMixer(m), fp = footPoints(bodyMesh, figScene), N = 240, H = [];
  mx.clipAction(clip).play();
  ['Left', 'Right'].forEach(function(sd){ var b = boneOf(m, sd + 'Foot'); ['heel', 'toe'].forEach(function(k){ H.push({ b: b, off: fp[sd][k], P: [] }); }); });
  for(var i = 0; i <= N; i++){ mx.setTime(clip.duration * i / N); hold.updateMatrixWorld(true); H.forEach(function(h){ h.P.push(h.b.localToWorld(h.off.clone())); }); }
  var dirv = new V3(0, 0, 1), v = [];
  H.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); }); for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01) v.push(-h.P[i].clone().sub(h.P[i - 1]).dot(dirv) / (clip.duration / N)); });
  v.sort(function(a, b){ return a - b; }); return v.length ? v[v.length >> 1] : 1.1;
}

// ------------------------------------------------ gun: Opus's seatPistol, ported verbatim from opus-mixamo.js.
// WHY: N2's built-in PistolMat prop is weighted 100% to RightHand in BIND orientation —
// it is not seated in the grip under his own aim clip or under Mixamo's (both probed:
// hands open/offset, gun floating off the palm — Cherie's catch). Opus's fix computes
// the grip from the hand's own anatomy in rest pose and attaches the gun there.
function pistol(){ var g = new THREE.Group(), m1 = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.45, metalness: 0.6 }), m2 = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 });
  var box = function(w, h, d, m, x, y, z, rx){ var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if(rx) b.rotation.x = rx; g.add(b); return b; };
  box(0.03, 0.032, 0.19, m1, 0, 0.026, 0.05); box(0.028, 0.11, 0.045, m2, 0, -0.03, -0.01, -0.28); box(0.026, 0.02, 0.07, m2, 0, 0.0, 0.04);
  var geos = []; g.children.forEach(function(c){ c.updateMatrix(); var gg = c.geometry.clone().applyMatrix4(c.matrix).toNonIndexed(), col = c.material === m1 ? [0.009, 0.0095, 0.011] : [0.004, 0.004, 0.0045], cs = []; for(var i = 0; i < gg.attributes.position.count; i++) cs.push(col[0], col[1], col[2]); gg.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); geos.push(gg); });
  var pos = [], nor = [], cl = []; geos.forEach(function(gg){ pos.push.apply(pos, gg.attributes.position.array); nor.push.apply(nor, gg.attributes.normal.array); cl.push.apply(cl, gg.attributes.color.array); });
  var mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  var one = new THREE.Group(); one.add(new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 }))); return one; }
function seatPistol(fig){ var m = fig.model, h = boneOf(m, 'RightHand'), mid = boneOf(m, 'RightHandMiddle1'), ix = boneOf(m, 'RightHandIndex1'), pk = boneOf(m, 'RightHandPinky1'); if(!h || !mid) return;
  var top = m; while(top.parent) top = top.parent; top.updateMatrixWorld(true);
  var H = h.getWorldPosition(new V3()), M = mid.getWorldPosition(new V3()), I = ix.getWorldPosition(new V3()), P = pk.getWorldPosition(new V3());
  var fwd = M.clone().sub(H).normalize(), across = I.clone().sub(P).normalize(), palm = new V3().crossVectors(fwd, across).normalize();
  var gp = pistol(), basis = new THREE.Matrix4().makeBasis(new V3().crossVectors(palm.clone().negate(), fwd).normalize(), palm.clone().negate(), fwd);
  gp.quaternion.setFromRotationMatrix(basis); gp.position.copy(H.clone().lerp(M, 0.55).addScaledVector(palm, 0.035)); gp.updateMatrixWorld(true); h.attach(gp); fig.gun = gp; }

// ------------------------------------------------ build
var fig = null, patrol = null;
function legLen(sc){ sc.updateMatrixWorld(true); var a = nodeOf(sc, 'LeftUpLeg').getWorldPosition(new V3()), b = nodeOf(sc, 'LeftLeg').getWorldPosition(new V3()), c = nodeOf(sc, 'LeftFoot').getWorldPosition(new V3()); return a.distanceTo(b) + b.distanceTo(c); }

function build(gN2, gMx, parent){
  // clips: filter + re-base the hips track onto N2 (opus-mixamo.js method)
  var hipsRest = boneOf(gN2.scene, 'Hips').position.clone();
  var refHips = nodeOf(gMx.scene, 'Hips').position.clone();
  var kLeg = legLen(gN2.scene) / legLen(gMx.scene);
  var clips = {};
  gMx.animations.forEach(function(c){ var cc = c.clone(); cc.tracks = cc.tracks.filter(function(t){ return t.name === 'Hips.position' || /\.quaternion$/.test(t.name); });
    cc.tracks.forEach(function(t){ if(t.name !== 'Hips.position') return; var v = t.values; for(var j = 0; j < v.length; j += 3){ v[j] = hipsRest.x + (v[j] - refHips.x) * kLeg; v[j + 1] = hipsRest.y + (v[j + 1] - refHips.y) * kLeg; v[j + 2] = hipsRest.z + (v[j + 2] - refHips.z) * kLeg; } });
    clips[cc.name] = cc; });

  var model = gN2.scene;
  prepNeonMaterials(model);
  var sc = 1.80 / 178.68;
  var norm = new THREE.Group();
  model.scale.setScalar(sc); model.position.y = 99.1 * sc;
  norm.add(model);
  var imp = neonImprove(model, norm); imp(true);   // IMPROVED, the walk-off default
  var wrap = new THREE.Group(); wrap.scale.setScalar(1.77 / 1.80); wrap.add(norm);
  var group = new THREE.Group(); group.add(wrap);
  group.position.set(CFG.x || 0, 0, CFG.zA || 0);
  parent.add(group);

  var bodyMesh = null, pistolMesh = null;
  model.traverse(function(o){ if(o.isSkinnedMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    if(ms[0] && ms[0].name === '_Body') bodyMesh = o;
    if(ms[0] && ms[0].name === 'PistolMat') pistolMesh = o; } });
  var paceWalk = contactPace(clips['pistol-walk'], gN2.scene, bodyMesh);

  var f = { group: group, model: model, mixer: new THREE.AnimationMixer(model), actions: {}, layers: { low: null, up: null }, firing: false, paceWalk: paceWalk, kLeg: kLeg };
  var AU = THREE.AnimationUtils, fps = 30;
  var C = { Walk: clips['pistol-walk'], LegsIdle: sub(clips['pistol-idle'], true, 'LegsIdle'),
    UpAim: sub(AU.subclip(clips['pistol-aim'], 'aimHold', 0, 16, fps), false, 'UpAim'), UpCarry: sub(clips['pistol-idle'], false, 'UpCarry'),
    Fire: AU.makeClipAdditive(sub(AU.subclip(clips['shooting'], 'fire', 6, 33, fps), false, 'Fire')) };
  Object.keys(C).forEach(function(n){ if(!C[n]){ api.errors.push('clip missing: ' + n); return; } var a = f.mixer.clipAction(C[n]);
    if(n === 'Fire'){ a.blendMode = THREE.AdditiveAnimationBlendMode; a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; }
    else a.setLoop(THREE.LoopRepeat, Infinity);
    f.actions[n] = a; });
  if(pistolMesh) pistolMesh.visible = false;   // his bind-glued prop is NOT a seated grip (probed) — replaced below
  seatPistol(f);
  fig = f; api.fig = f;

  // patrol: walk A->B at the 1.30 law, turn, stand aim + 2 bursts, turn done by walk back
  var zA = CFG.zA || 0, zB = CFG.zB || -10;
  patrol = { mode: 'walk', z: zA, dir: Math.sign(zB - zA) || 1, yaw: 0, t: 0, fireClock: 0, fromYaw: 0, toYaw: 0 };
  patrol.yaw = yawFor(patrol.dir); group.rotation.y = patrol.yaw;
  function yawFor(d){ return Math.atan2(0, d); }   // facing along (0,0,d)
  api.update = function(dt){
    if(!patrol || !fig) return;
    var P = patrol, speed = 1.30;
    if(P.mode === 'walk'){
      P.z += P.dir * speed * dt;
      P.fireClock += dt;
      var fire = (P.fireClock % 1.7) < 0.34;
      var done = P.dir > 0 ? P.z >= zB : P.z <= zB;
      if(done){ P.z = zB; P.mode = 'turn'; P.t = 0; P.fromYaw = P.yaw; P.toYaw = yawFor(-P.dir); }
      group.position.z = P.z;
      drive(fig, dt, { speed: speed, aim: true, fire: fire });
    } else if(P.mode === 'turn'){
      P.t += dt; var u = Math.min(1, P.t / 0.7);
      P.yaw = P.fromYaw + angDelta(P.fromYaw, P.toYaw) * u;
      group.rotation.y = P.yaw;
      if(u >= 1){ P.mode = 'stand'; P.t = 0; }
      drive(fig, dt, { speed: 0, aim: true, fire: false });
    } else { // stand: aim + two bursts toward the way back
      P.t += dt;
      var fire2 = (P.t > 0.4 && P.t < 0.74) || (P.t > 1.6 && P.t < 1.94);
      if(P.t >= 2.8){ P.dir = -P.dir; P.mode = 'walk'; P.fireClock = 0; }
      drive(fig, dt, { speed: 0, aim: true, fire: fire2 });
    }
  };
  api.poseAt = function(o){
    patrol = null; api.update = function(){};
    group.position.set(CFG.x || 0, 0, o.z != null ? o.z : group.position.z);
    group.rotation.y = (o.yawDeg || 0) * Math.PI / 180;
    var f2 = fig; f2.mixer.stopAllAction(); f2.layers = { low: null, up: null };
    function on(name, t){ var a = f2.actions[name]; if(!a) return; a.enabled = true; a.setEffectiveWeight(1); a.time = t || 0; a.play(); }
    if(o.mode === 'walk'){ on('Walk', o.t || 0); f2.actions.Walk.timeScale = 1.30 / f2.paceWalk; }
    else { on('LegsIdle', o.t || 0); on('UpAim', 0.25); if(o.mode === 'fire') on('Fire', 0.10); }
    f2.mixer.update(0.0001); group.updateMatrixWorld(true);
  };
  api.gunCentroid = function(){
    var hand = boneOf(model, 'RightHand');
    if(!hand) return null;
    var top = model; while(top.parent) top = top.parent; top.updateMatrixWorld(true);
    var hp = hand.getWorldPosition(new V3());
    if(!fig || !fig.gun) return { hand: [+hp.x.toFixed(3), +hp.y.toFixed(3), +hp.z.toFixed(3)], gun: null };
    var bb = new THREE.Box3().setFromObject(fig.gun), c = bb.getCenter(new V3());
    return { hand: [+hp.x.toFixed(3), +hp.y.toFixed(3), +hp.z.toFixed(3)], gun: [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)], dist: +hp.distanceTo(c).toFixed(3) };
  };
  api.stats = function(){ return { paceWalk: +paceWalk.toFixed(3), walkTimeScale: +(1.30 / paceWalk).toFixed(3), kLeg: +kLeg.toFixed(4), clips: Object.keys(clips).length }; };
  api.ready = true;
}
function angDelta(a, b){ var d = (b - a) % (Math.PI * 2); if(d > Math.PI) d -= Math.PI * 2; if(d < -Math.PI) d -= Math.PI * 2; return d; }

// ------------------------------------------------ load + attach
function load(url){ return new Promise(function(res, rej){ new THREE.GLTFLoader().load(url, res, undefined, rej); }); }
var tries = 0;
(function attach(){
  var parent = CFG.parent && CFG.parent();
  if(!parent){ if(++tries < 200) return setTimeout(attach, 100); api.errors.push('stage never became ready'); return; }
  Promise.all([load(CFG.glbN2), load(CFG.glbMx)]).then(function(r){
    try { build(r[0], r[1], parent); } catch(e){ api.errors.push('build: ' + (e && e.message || e)); }
  }).catch(function(e){ api.errors.push('load: ' + (e && e.message || e)); });
})();
})();
