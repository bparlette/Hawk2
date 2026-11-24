/* Hospital Escape — CAST LINE-UP: the full cast built with the winning Ex1 technique.
   One shared CC0 skeleton + clip library (Quaternius "Casual" family, 62 bones, 8 gun clips);
   every character is a runtime reskin on that skeleton (material hex/PBR per Neon's cast spec,
   metalness 0 on cloth/skin/hair) + bone-attached code props. Presentation = Ex1's relight v2
   (albedo lift + per-figure warm point light + blob shadow); pale costumes use a gentler lift
   capped at Neon's 0.68-linear bloom limit. Pacing from foot-contact constants only:
   gunman family Walk 1.30 / Run 3.20 m/s; Maya's body Walk 1.09 / Run ~2.5 m/s (contact probe
   on woman-gun.glb, band-0.15 stance velocity, feet averaged). Cole's seated/bed poses and
   Hale's objecting pose are code-authored bone deltas on the same skeleton (no new clips).
   three.js pinned CDN 0.128.0; GLB data travels as gzip+base64 text chunks (house transport). */
(function(){
'use strict';
window.__CAST_ERRORS = [];
window.addEventListener('error', function(e){ window.__CAST_ERRORS.push(String((e && e.message) || e)); });

// ------------------------------------------------------------------ tuning constants
var PATH_SPEED = 1.2;                                  // m/s along the loop
var AUTH = { gunman: 1.30, woman: 1.09 };              // foot-contact authored Walk speeds (rig units = m at scale 1)
var ASSET_H = 1.81;                                    // both family bodies measure 1.81 (Head bone 1.587 + crown)
// Pose deltas are EULER-ADDS on bone.rotation (probed on the stage: this rig's bone-local
// frames make quaternion post-multiply swing limbs sideways; euler-adds track the world axes).
// Axis map (from Idle, stage-measured): thigh flexion = UpperLeg x -; knee flexion =
// LowerLeg y (L -, R +, mirrored); arm raise forward = UpperArm z (R +, L -); elbow flexion =
// LowerArm z (same sign as that side's raise); torso pitch forward = Abdomen/Torso/Chest x +.
// Hale objecting pose (applied over Idle_Neutral)
var HALE_POSE = {
  'UpperArm.R': [0, 0, 0.55], 'LowerArm.R': [0, 0, 1.05],   // right forearm up, holds clipboard
  'UpperArm.L': [0, 0, -1.30], 'LowerArm.L': [0, 0, -1.28], // left hand raised, palm out
  'Chest': [0.06, 0, 0], 'Head': [-0.05, 0, 0]
};
// Cole wheelchair pose: slouched forward-aim (Neon plate: crown <= 1.31 m)
var COLE_SEAT_Y = 0.46;                                // group-local height of the Hips bone when seated
var COLE_CHAIR_POSE = {                                // stage-tuned: crown 1.30, wrists forward in a two-hand aim
  'UpperLeg.L': [-1.50, 0, 0], 'UpperLeg.R': [-1.50, 0, 0],
  'LowerLeg.L': [0, -1.45, 0], 'LowerLeg.R': [0, 1.45, 0],
  'Abdomen': [0.42, 0, 0], 'Torso': [0.38, 0, 0], 'Chest': [0.35, 0, 0],
  'Neck': [-0.20, 0, 0], 'Head': [-0.16, 0, 0],
  'UpperArm.R': [0, 0, 2.45], 'LowerArm.R': [0, 0, 0.10],
  'UpperArm.L': [0, 0, -2.45], 'LowerArm.L': [0, 0, -0.10],
  'Shoulder.R': [0, 0, 0.15], 'Shoulder.L': [0, 0, -0.15]
};
// Cole bed pose: torso raised ~40 deg off the flat mattress (deltas over the pitched wrap)
var COLE_BED_POSE = {
  'Abdomen': [0.24, 0, 0], 'Torso': [0.24, 0, 0], 'Chest': [0.22, 0, 0],
  'Neck': [-0.10, 0, 0], 'Head': [-0.08, 0, 0],
  'UpperArm.R': [0, 0, 0.18], 'UpperArm.L': [0, 0, -0.18]
};
// Maya push override (applied every frame after the Walk mixer update)
var MAYA_PUSH = {
  'UpperArm.R': [0, 0, 0.52], 'LowerArm.R': [0, 0, 0.14],
  'UpperArm.L': [0, 0, -0.52], 'LowerArm.L': [0, 0, -0.14],
  'Chest': [0.17, 0, 0], 'Abdomen': [0.07, 0, 0], 'Head': [-0.13, 0, 0]
};

// ------------------------------------------------------------------ scene
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('view').appendChild(renderer.domElement);
window.__renderer = renderer;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f26);
scene.fog = new THREE.Fog(0x1b1f26, 26, 68);
var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 140);
camera.position.set(0, 10.5, 20.5);

scene.add(new THREE.HemisphereLight(0xcdd8e6, 0x3a332a, 0.75));
scene.add(new THREE.AmbientLight(0xfff1dd, 0.25));
var key = new THREE.DirectionalLight(0xffe6c4, 0.85); key.position.set(6, 10, 4); scene.add(key);
var rim = new THREE.DirectionalLight(0x9db8dd, 0.3); rim.position.set(-7, 6, -6); scene.add(rim);

// ------------------------------------------------------------------ world (walk-off plaza + line-up stage)
var HW = 4.6, HD = 3.2, CR = 1.6;
function roundedRectShape(hw, hd, r){
  var s = new THREE.Shape();
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - r); s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hd); s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + r); s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
var worldGroup = new THREE.Group(); scene.add(worldGroup);
(function buildWorld(){
  var floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; worldGroup.add(floor);
  var ringShape = roundedRectShape(HW + 0.85, HD + 0.85, CR + 0.85);
  ringShape.holes.push(roundedRectShape(HW - 0.85, HD - 0.85, Math.max(0.3, CR - 0.85)));
  var ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 24),
    new THREE.MeshStandardMaterial({ color: 0x454c59, roughness: 0.95, metalness: 0 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; worldGroup.add(ring);
  var planter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x565d68, roughness: 0.9 }));
  planter.position.y = 0.25; worldGroup.add(planter);
  var hedge = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1 }));
  hedge.position.y = 0.75; worldGroup.add(hedge);
  var bolM = new THREE.MeshStandardMaterial({ color: 0x707a88, roughness: 0.7, metalness: 0.2 });
  [[6.3, 4.6], [-6.3, 4.6], [6.3, -4.6], [-6.3, -4.6]].forEach(function(p){
    var b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 12), bolM);
    b.position.set(p[0], 0.425, p[1]); worldGroup.add(b); });
  // line-up stage platform (statics row)
  var stage = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.12, 2.7),
    new THREE.MeshStandardMaterial({ color: 0x39404b, roughness: 0.95, metalness: 0 }));
  stage.position.set(0.4, 0.06, 6.6); worldGroup.add(stage);
})();

// ------------------------------------------------------------------ walk path (arc-length table, from walk-off)
var PATH = (function(){
  var pts = [];
  function seg(x0, z0, x1, z1){ var d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / 0.05));
    for(var i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); }
  function arc(cx, cz, a0, a1){ var d = Math.abs(a1 - a0) * CR, n = Math.max(4, Math.ceil(d / 0.05));
    for(var i = 0; i < n; i++){ var a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * CR, cz + Math.sin(a) * CR]); } }
  var a = HW - CR, b = HD - CR;
  seg(-a, -HD, a, -HD); arc(a, -b, -Math.PI / 2, 0);
  seg(HW, -b, HW, b);   arc(a, b, 0, Math.PI / 2);
  seg(a, HD, -a, HD);   arc(-a, b, Math.PI / 2, Math.PI);
  seg(-HW, b, -HW, -b); arc(-a, -b, Math.PI, Math.PI * 1.5);
  var cum = [0];
  for(var i = 1; i <= pts.length; i++){ var p = pts[i % pts.length], q = pts[i - 1];
    cum.push(cum[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); }
  var L = cum[cum.length - 1];
  function at(s){
    s = ((s % L) + L) % L;
    var lo = 0, hi = cum.length - 1;
    while(lo < hi - 1){ var mid = (lo + hi) >> 1; if(cum[mid] <= s) lo = mid; else hi = mid; }
    var p = pts[lo % pts.length], q = pts[(lo + 1) % pts.length], span = cum[lo + 1] - cum[lo] || 1;
    var t = (s - cum[lo]) / span;
    var x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t;
    var dx = q[0] - p[0], dz = q[1] - p[1], dl = Math.hypot(dx, dz) || 1;
    return { x: x, z: z, dx: dx / dl, dz: dz / dl };
  }
  return { at: at, length: L };
})();

// ------------------------------------------------------------------ labels (name discs)
function makeLabel(text){
  var c = document.createElement('canvas'); c.width = 512; c.height = 144;
  var x = c.getContext('2d');
  var w = c.width, h = c.height, r = 66;
  x.beginPath();
  x.moveTo(r, 6); x.lineTo(w - r, 6); x.arc(w - r, h / 2, r - 6, -Math.PI / 2, Math.PI / 2); x.lineTo(r, h - 6);
  x.arc(r, h / 2, r - 6, Math.PI / 2, Math.PI * 1.5); x.closePath();
  x.fillStyle = 'rgba(8,10,14,0.88)'; x.fill();
  x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,0.96)'; x.stroke();
  x.fillStyle = '#ffffff'; x.font = '900 62px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 3);
  var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(1.30, 0.366, 1); sp.renderOrder = 999;
  return sp;
}

// ------------------------------------------------------------------ asset loading (walk-off pattern)
function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function chunkBytes(globalName){
  var parts = window[globalName]; if(!parts || !window.DecompressionStream) return Promise.resolve(null);
  var bytes = b64ToBytes(parts.join(''));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){ window.__CAST_ERRORS.push('script failed: ' + src); cb(); }; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}
function findBone(fig, name){
  var want = String(name).replace(/[.:]/g, ''); var found = null;
  fig.traverse(function(o){ if(!found && o.isBone && o.name.replace(/[.:]/g, '') === want) found = o; });
  return found;
}
function cloneFig(srcScene){
  var fig = THREE.SkeletonUtils.clone(srcScene);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
  return fig;
}

// ------------------------------------------------------------------ materials: reskin + PBR fix + relight
function linMat(hex, rough, metal){
  var m = new THREE.MeshStandardMaterial({ roughness: rough == null ? 0.9 : rough, metalness: metal == null ? 0 : metal });
  m.color.setHex(hex).convertSRGBToLinear(); return m;
}
// fn(meshName, matName) -> {hex, rough, metal} | null. Applies in place on the cloned materials.
function reskin(fig, fn){
  fig.traverse(function(o){ if(!o.isMesh) return;
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    var out = ms.map(function(m){
      var r = fn(o.name, m.name);
      if(r){ m.color.setHex(r.hex).convertSRGBToLinear(); }
      m.metalness = (r && r.metal != null) ? r.metal : 0;                 // Neon global rule: metalness 0 off metal
      m.roughness = (r && r.rough != null) ? r.rough : 0.85;
      return m; });
    o.material = Array.isArray(o.material) ? out : out[0]; });
}
// Ex1 relight v2, parameterized: dark costumes lift 1.8 cap 0.9; pale costumes lift 1.15 cap 0.68 (Neon bloom cap).
function relight(fig, lift, cap, emis){
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.isMeshStandardMaterial && m.color){
      m.color.multiplyScalar(lift);
      m.color.r = Math.min(m.color.r, cap); m.color.g = Math.min(m.color.g, cap); m.color.b = Math.min(m.color.b, cap);
      if(m.emissive) m.emissive.setRGB(m.color.r * emis, m.color.g * emis, m.color.b * emis); } }); } });
}
function blobTex(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
  gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
var _blobTex = null;
function addBlob(parent, w, d, y){
  if(!_blobTex) _blobTex = blobTex();
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(w, d || w * 0.69),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = y == null ? 0.012 : y; sh.renderOrder = 1; sh.raycast = function(){};
  parent.add(sh); return sh;
}
// Figure-space prop attach (CX technique): place obj at a bone's world position + offset
// (figure faces +Z in figure space), then bone.attach() so it rides the bone.
function attachProp(fig, boneName, obj, dx, dy, dz){
  var bone = findBone(fig, boneName); if(!bone) return null;
  var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
  var bp = bone.getWorldPosition(new THREE.Vector3());
  obj.position.set(bp.x + dx, bp.y + dy, bp.z + dz);
  fig.add(obj); bone.attach(obj); tmp.remove(fig);
  return obj;
}
function box(w, h, d, mat){ var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; }

// ------------------------------------------------------------------ wheelchair prop (shared: Maya pushes one, Cole sits in one)
// Local space: chair faces +Z (footrests front +Z, push handles rear -Z). Seat top at y=0.48.
function buildWheelchair(){
  var g = new THREE.Group();
  var frame = linMat(0x6A7076, 0.36, 0.72), dark = linMat(0x23262B, 0.9, 0),
      tyre = linMat(0x14161a, 0.8, 0), hubM = linMat(0x3a3f45, 0.5, 0.6);
  var seat = box(0.46, 0.05, 0.42, dark); seat.position.set(0, 0.455, 0.02); g.add(seat);
  var back = box(0.46, 0.52, 0.05, dark); back.position.set(0, 0.76, -0.205); back.rotation.x = 0.06; g.add(back);
  [-1, 1].forEach(function(s){
    // big rear wheel: tyre torus + hub + cross spokes, plane = YZ
    var wheel = new THREE.Group();
    var tor = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.021, 10, 28), tyre); wheel.add(tor);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), hubM);
    hub.rotation.z = Math.PI / 2; wheel.add(hub);
    for(var i = 0; i < 3; i++){ var sp = box(0.012, 0.56, 0.012, hubM); sp.rotation.x = i * Math.PI / 3; wheel.add(sp); }
    wheel.rotation.y = Math.PI / 2; wheel.position.set(0.315 * s, 0.30, -0.04); g.add(wheel);
    // push handle
    var ph = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), dark);
    ph.rotation.z = Math.PI / 2; ph.position.set(0.19 * s, 1.0, -0.27); g.add(ph);
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.30, 8), frame);
    post.position.set(0.19 * s, 0.86, -0.245); post.rotation.x = 0.35; g.add(post);
    // armrest
    var arm = box(0.05, 0.03, 0.34, dark); arm.position.set(0.265 * s, 0.665, 0.0); g.add(arm);
    var armPost = box(0.03, 0.19, 0.03, frame); armPost.position.set(0.265 * s, 0.56, -0.14); g.add(armPost);
    // front caster
    var cast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 14), tyre);
    cast.rotation.z = Math.PI / 2; cast.position.set(0.20 * s, 0.055, 0.33); g.add(cast);
    var fork = box(0.025, 0.30, 0.025, frame); fork.position.set(0.20 * s, 0.22, 0.315); fork.rotation.x = 0.25; g.add(fork);
    // footrest
    var fr = box(0.13, 0.02, 0.17, frame); fr.position.set(0.115 * s, 0.075, 0.40); g.add(fr);
    // side frame tube
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), frame);
    tube.rotation.x = Math.PI / 2 - 0.18; tube.position.set(0.24 * s, 0.30, 0.10); g.add(tube);
  });
  return g;
}

// ------------------------------------------------------------------ pose helpers
// Apply pose deltas as euler-adds on bone.rotation (stage-probed semantics; see pose notes).
function applyDeltas(fig, spec){
  Object.keys(spec).forEach(function(bn){
    var b = findBone(fig, bn); if(!b) return; var v = spec[bn];
    b.rotation.x += v[0] || 0; b.rotation.y += v[1] || 0; b.rotation.z += v[2] || 0; });
}
// Per-frame overrides must NOT euler-add: the mixer's quaternion->euler decomposition flips
// representation mid-cycle, so the same add lands differently on different frames (Maya's arms
// snapped skyward on some strides). Capture the pose ONCE as local-space quaternion deltas
// (posed = sampled * delta, correct by construction) and multiply them in after each update.
function computeQuatDeltas(fig, spec){
  var out = [];
  Object.keys(spec).forEach(function(bn){
    var b = findBone(fig, bn); if(!b) return; var v = spec[bn];
    var idleQ = b.quaternion.clone();
    b.rotation.x += v[0] || 0; b.rotation.y += v[1] || 0; b.rotation.z += v[2] || 0;
    var posedQ = b.quaternion.clone();
    var delta = idleQ.clone().invert().multiply(posedQ);
    b.quaternion.copy(idleQ);
    out.push({ bone: b, delta: delta }); });
  return out;
}
function applyQuatDeltas(list){ for(var i = 0; i < list.length; i++) list[i].bone.quaternion.multiply(list[i].delta); }
// Empirically classify each delta bone: does this figure's mixer actually reset it every frame?
// (three r128 binding quirk, measured in-page + on the stage: a clip can HAVE a bone's track yet
// the action never drives it — the woman's Walk/Abdomen. Track-name checks cannot see this, so
// perturb the bone, sample the mixer, and see whether it snaps back.) Unbound bones get a FIXED
// posed quaternion restored every frame instead of a multiply (which would accumulate forever).
function classifyDeltas(mixer, deltas){
  mixer.update(0.001);
  var frame = [], fixed = [];
  deltas.forEach(function(d){
    var b = d.bone, q0 = b.quaternion.clone();
    b.rotation.x += 0.5; mixer.update(0.001);
    var bound = b.quaternion.angleTo(q0) < 0.1;
    b.quaternion.copy(q0);
    if(bound) frame.push(d);
    else fixed.push({ bone: b, posedQ: q0.clone().multiply(d.delta) });
  });
  return { frame: frame, fixed: fixed };
}
function applyFixedPoses(list){ for(var i = 0; i < list.length; i++) list[i].bone.quaternion.copy(list[i].posedQ); }
// This rig's Foot/PT bones hang off Root (IK-style), not off the shin — after bending the
// legs, re-place them from the posed LowerLeg using their bind offsets relative to it.
function captureLegRefs(fig){
  fig.updateMatrixWorld(true);
  var refs = {};
  ['L', 'R'].forEach(function(s){
    var lower = findBone(fig, 'LowerLeg.' + s), foot = findBone(fig, 'Foot.' + s), pt = findBone(fig, 'PT.' + s);
    if(!lower || !foot) return;
    var inv = new THREE.Matrix4().copy(lower.matrixWorld).invert();
    refs[s] = { lower: lower, foot: foot, pt: pt,
      footOff: new THREE.Matrix4().multiplyMatrices(inv, foot.matrixWorld),
      ptOff: pt ? new THREE.Matrix4().multiplyMatrices(inv, pt.matrixWorld) : null,
      footBindQ: foot.getWorldQuaternion(new THREE.Quaternion()),
      ptBindQ: pt ? pt.getWorldQuaternion(new THREE.Quaternion()) : null };
  });
  return refs;
}
function placeLegRefs(refs){
  Object.keys(refs).forEach(function(s){ var r = refs[s];
    r.lower.updateWorldMatrix(true, false);
    var m = new THREE.Matrix4().multiplyMatrices(r.lower.matrixWorld, r.footOff);
    setWorld(r.foot, m, r.footBindQ);
    if(r.pt && r.ptOff){ var m2 = new THREE.Matrix4().multiplyMatrices(r.lower.matrixWorld, r.ptOff);
      setWorld(r.pt, m2, r.ptBindQ); } });
}
function setWorld(obj, mat, worldQ){
  var p = new THREE.Vector3().setFromMatrixPosition(mat);
  obj.parent.updateWorldMatrix(true, false);
  obj.position.copy(obj.parent.worldToLocal(p.clone()));
  var pq = obj.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  obj.quaternion.copy(pq.multiply(worldQ));
}
function playClip(fig, clips, name, t){
  var mx = new THREE.AnimationMixer(fig);
  var a = mx.clipAction(clips[name]); a.play(); mx.update(t || 0);
  return mx;
}
function clipMap(gltf){ var o = {}; gltf.animations.forEach(function(c){ o[c.name] = c; }); return o; }
function hideMesh(fig, namePart){
  fig.traverse(function(o){ if(o.isMesh && o.name.indexOf(namePart) >= 0) o.visible = false; });
}
function hideMeshByMat(fig, matName){
  fig.traverse(function(o){ if(!o.isMesh) return;
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    if(ms.some(function(m){ return m.name === matName; })) o.visible = false; });
}

// ------------------------------------------------------------------ character builders
var TEAL = 0x316E82;
function buildGunman(gunman){ // 1) PLAIN-CLOTHES GUNMAN — Ex1 carried in, PBR-fixed, Neon's beanie + rig
  var fig = cloneFig(gunman.scene);
  reskin(fig, function(mesh, mat){
    if(mat === 'Gunmetal') return { metal: 0.80, rough: 0.28 };
    if(mat === 'Skin' || mat === 'Skin_Darker') return { rough: 0.48 };
    if(mat === 'Hair') return { rough: 0.92 };
    if(mat === 'LightBrown') return { rough: 0.80 };       // Ex1 charcoal bomber values kept
    if(mat === 'LightBlue') return { rough: 0.90 };
    return { rough: 0.56 };
  });
  relight(fig, 1.8, 0.9, 0.16);
  var clips = clipMap(gunman);
  playClip(fig, clips, 'Idle_Neutral', 0.3);
  // beanie dome over the hair (Neon: MESH)
  var dome = new THREE.Mesh(new THREE.SphereGeometry(0.117, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), linMat(0x1C1C1C, 0.94, 0));
  attachProp(fig, 'Head', dome, 0, 0.062, -0.008);
  // chest rig plate + mag block (Neon dims)
  var rigM = linMat(0x1F2522, 0.78, 0);
  var rig = box(0.25, 0.17, 0.045, rigM); attachProp(fig, 'Chest', rig, 0, 0.045, 0.115);
  var mag = box(0.16, 0.08, 0.03, rigM); mag.position.set(0, -0.115, 0.012); rig.add(mag);
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.80 };
}
function buildScrubs(gunman){ // 2) TEAL SCRUBS GUNMAN — CX reskin redone at Ex1 standard + Neon spec values
  var fig = cloneFig(gunman.scene);
  reskin(fig, function(mesh, mat){
    if(mat === 'Gunmetal') return { metal: 0.80, rough: 0.28 };
    if(mat === 'LightBrown') return { hex: TEAL, rough: 0.90 };        // scrubs top
    if(mat === 'LightBlue') return { hex: TEAL, rough: 0.90 };         // scrubs pants (spec: top AND pants)
    if(mat === 'Skin' || mat === 'Skin_Darker') return { hex: 0xC89476, rough: 0.48 };
    if(mat === 'White' || mat === 'Red_Dark') return { hex: 0x1A1C1F, rough: 0.78 }; // tactical sneakers
    if(mat === 'Hair') return { hex: TEAL, rough: 0.90 };              // under the cap dome
    return null;
  });
  relight(fig, 1.8, 0.9, 0.16);
  var clips = clipMap(gunman);
  playClip(fig, clips, 'Idle_Neutral', 0.3);
  // scrub cap dome (Neon: MESH, replaces hair read)
  var cap = new THREE.Mesh(new THREE.SphereGeometry(0.119, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.60), linMat(TEAL, 0.90, 0));
  attachProp(fig, 'Head', cap, 0, 0.060, -0.006);
  // pale surgical mask (Neon hex; CX figure-space offsets)
  var mask = box(0.138, 0.078, 0.042, linMat(0xCFDCE2, 0.94, 0));
  attachProp(fig, 'Head', mask, 0, 0.022, 0.098);
  // matte-black chest rig (CX pattern, Neon colour)
  var rig = box(0.27, 0.19, 0.075, linMat(0x181A1D, 0.80, 0));
  attachProp(fig, 'Chest', rig, 0, 0.045, 0.104);
  var pouch = box(0.18, 0.09, 0.04, rig.material); pouch.position.set(0, -0.125, 0.012); rig.add(pouch);
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.78 };
}
function buildMaya(woman){ // 3) MAYA VANCE — in-family female body, her own clips, jacket/jeans reskin
  var fig = cloneFig(woman.scene);
  reskin(fig, function(mesh, mat){
    if(mat === 'Skin') return { hex: 0x9B6B4C, rough: 0.48 };
    if(mat === 'Brown') return { hex: 0x15100D, rough: 0.72 };                       // hair
    if(mat === 'Gold') return { hex: 0x16181B, rough: 0.56 };                        // belt/strap trim
    if(mat === 'Red') return { hex: 0x3B2A20, rough: 0.58 };                         // boots (feet) / dark trim
    if(mat === 'Top' && mesh.indexOf('Legs') >= 0) return { hex: 0x1F2A44, rough: 0.90 }; // jeans (legs' cloth prim)
    if(mat === 'Top') return { hex: 0x3F4649, rough: 0.84 };                         // utility jacket (dress body)
    return null;
  });
  // her bare legs read as skin — paint the legs' Skin prim to denim too (skinny-jeans read at range)
  fig.traverse(function(o){ if(o.isMesh && o.name.indexOf('Legs') >= 0){
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m.name === 'Skin'){ m.color.setHex(0x1F2A44).convertSRGBToLinear(); m.roughness = 0.90; m.metalness = 0; } }); } });
  relight(fig, 1.8, 0.9, 0.16);
  var clips = clipMap(woman);
  playClip(fig, clips, 'Idle_Neutral', 0.3);
  // ponytail (Neon: MESH) — anchor sphere + two tapered segments hanging down her back
  var hairM = linMat(0x15100D, 0.72, 0);
  var tail = new THREE.Group();
  var tie = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), hairM); tail.add(tie);
  var seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.021, 0.17, 10), hairM);
  seg1.position.set(0, -0.095, -0.028); seg1.rotation.x = 0.30; tail.add(seg1);
  var seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.008, 0.15, 10), hairM);
  seg2.position.set(0, -0.225, -0.062); seg2.rotation.x = 0.38; tail.add(seg2);
  attachProp(fig, 'Head', tail, 0, 0.085, -0.095);
  // diagonal crossbody strap (Neon: MESH) — ribbon across the chest + hip pouch
  var strap = box(0.048, 0.60, 0.014, linMat(0x16181B, 0.56, 0));
  strap.rotation.z = 0.62; attachProp(fig, 'Chest', strap, 0.01, 0.02, 0.125);
  var pouch2 = box(0.18, 0.14, 0.05, linMat(0x16181B, 0.56, 0));
  attachProp(fig, 'Hips', pouch2, -0.185, -0.03, 0.045);
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.68, authored: AUTH.woman };
}
function buildHale(gunman){ // 4) DR. HALE — pale coat reskin + coat skirt + clipboard, objecting pose
  var fig = cloneFig(gunman.scene);
  reskin(fig, function(mesh, mat){
    if(mat === 'LightBrown') return { hex: 0xCFCBBF, rough: 0.88 };   // knee-length coat colour (skirt prop below)
    if(mat === 'LightBlue') return { hex: 0x30343C, rough: 0.88 };    // pressed slacks
    if(mat === 'Skin') return { hex: 0xD9A98C, rough: 0.50 };
    if(mat === 'Skin_Darker') return { hex: 0xC79A7C, rough: 0.50 };
    if(mat === 'Hair') return { hex: 0x9A9A98, rough: 0.78 };         // silver-grey
    if(mat === 'Eyebrows') return { hex: 0x6E6E6A, rough: 0.8 };
    if(mat === 'White' || mat === 'Red_Dark') return { hex: 0x232120, rough: 0.6 }; // dark shoes
    return null;
  });
  relight(fig, 1.15, 0.68, 0.08);
  hideMeshByMat(fig, 'Gunmetal');                                     // unarmed — pistol mesh off (Neon: zero weapons)
  var clips = clipMap(gunman);
  var mx = playClip(fig, clips, 'Idle_Neutral', 0.3);
  applyDeltas(fig, HALE_POSE);
  fig.updateMatrixWorld(true);
  // coat skirt (Neon: MESH) — open tapered shell, waist to below knee, hung off the Hips bone
  var skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.255, 0.52, 14, 1, true),
    new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, side: THREE.DoubleSide }));
  skirt.material.color.setHex(0xCFCBBF).convertSRGBToLinear().multiplyScalar(1.15);
  skirt.castShadow = true;
  attachProp(fig, 'Hips', skirt, 0, -0.155, 0.005);
  // clipboard (Neon dims) in the right hand: board + paper + clip, placed in figure space at the posed wrist
  var board = new THREE.Group();
  var bd = box(0.23, 0.32, 0.008, linMat(0xA6AEB4, 0.36, 0.72)); board.add(bd);
  var paper = box(0.205, 0.285, 0.003, linMat(0xD2CFC7, 0.92, 0)); paper.position.z = 0.006; board.add(paper);
  var clip = box(0.10, 0.03, 0.016, linMat(0x8b939a, 0.36, 0.72)); clip.position.set(0, 0.145, 0.004); board.add(clip);
  var wrist = findBone(fig, 'Wrist.R');
  var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
  var wp = wrist.getWorldPosition(new THREE.Vector3());
  board.position.set(wp.x, wp.y - 0.10, wp.z + 0.055); board.rotation.x = -0.35;
  fig.add(board); wrist.attach(board); tmp.remove(fig);
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.78, mixer: mx };
}
function coleReskin(fig){
  reskin(fig, function(mesh, mat){
    if(mat === 'LightBrown') return { hex: 0x90A8B4, rough: 0.90 };   // hospital gown
    if(mat === 'LightBlue') return { hex: 0x90A8B4, rough: 0.90 };    // gown over legs (blanket covers the lap)
    if(mat === 'Skin') return { hex: 0xB98668, rough: 0.50 };
    if(mat === 'Skin_Darker') return { hex: 0xA87A5E, rough: 0.50 };
    if(mat === 'Hair') return { hex: 0x2B1D14, rough: 0.88 };
    if(mat === 'Eyebrows') return { hex: 0x2B1D14, rough: 0.88 };
    return null;
  });
  relight(fig, 1.15, 0.68, 0.08);
}
function addColeFeet(fig){ // bare feet: hide the sneaker mesh, hang simple skin foot boxes on the Foot bones
  hideMesh(fig, 'Feet');
  var fm = linMat(0xB98668, 0.50, 0);
  ['Foot.L', 'Foot.R'].forEach(function(bn){
    var f = box(0.082, 0.042, 0.225, fm); f.castShadow = false;
    attachProp(fig, bn, f, 0, -0.008, 0.052); });
}
function addGauze(fig){
  var pad = box(0.095, 0.07, 0.018, linMat(0xCFCBC4, 0.95, 0));
  attachProp(fig, 'Head', pad, 0.048, 0.078, 0.082);
  var stain = box(0.034, 0.03, 0.006, linMat(0xB02824, 0.95, 0));
  stain.position.set(-0.014, -0.008, 0.011); pad.add(stain);
}
function buildColeChair(gunman){ // 5) COLE — wheelchair seated, slouched forward-aim
  var fig = cloneFig(gunman.scene);
  coleReskin(fig);
  var clips = clipMap(gunman);
  playClip(fig, clips, 'Idle_Neutral', 0.3);
  var refs = captureLegRefs(fig);
  applyDeltas(fig, COLE_CHAIR_POSE);
  fig.updateMatrixWorld(true);
  placeLegRefs(refs);
  addColeFeet(fig); addGauze(fig);
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.80, seated: true };
}
function buildColeBed(gunman){ // 6) COLE — bed recline, torso ~40 deg, blanket from waist to footboard
  var fig = cloneFig(gunman.scene);
  coleReskin(fig);
  var clips = clipMap(gunman);
  playClip(fig, clips, 'Idle_Neutral', 0.3);
  applyDeltas(fig, COLE_BED_POSE);
  addColeFeet(fig); addGauze(fig);
  hideMeshByMat(fig, 'Gunmetal');   // bed Cole is unarmed in the plate (hands at rest)
  return { fig: fig, clips: clips, height: ASSET_H, target: 1.80, bed: true };
}

// ------------------------------------------------------------------ assembly
var movers = [], figures = {};
function makeFigure(build, label, opts){
  opts = opts || {};
  var wrap = new THREE.Group();
  var s = build.target / build.height;
  wrap.scale.setScalar(s); wrap.add(build.fig);
  var group = new THREE.Group(); group.add(wrap);
  if(!opts.noBlob) addBlob(group, opts.blobW || 1.05, opts.blobD, 0.012);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); group.add(pl);
  var tag = makeLabel(label); tag.position.y = (opts.tagY || build.target + 0.52); group.add(tag);
  scene.add(group);
  var F = { build: build, group: group, wrap: wrap, scale: s, label: label };
  figures[label] = F;
  return F;
}
function makeWalker(F, phase, authored){
  var mx = new THREE.AnimationMixer(F.build.fig);
  var act = mx.clipAction(F.build.clips['Walk']);
  act.timeScale = PATH_SPEED / (authored * F.scale);       // world foot speed == path speed (no slide)
  act.play();
  var m = { F: F, mixer: mx, s: phase, yaw: 0, override: null };
  F.mover = m; movers.push(m); return m;
}
function buildCast(gunman, woman){
  // walkers on the loop
  var g = makeFigure(buildGunman(gunman), 'GUNMAN');
  makeWalker(g, 0, AUTH.gunman);
  var sc = makeFigure(buildScrubs(gunman), 'SCRUBS');
  makeWalker(sc, PATH.length / 2, AUTH.gunman);
  var my = makeFigure(buildMaya(woman), 'MAYA');
  var myMover = makeWalker(my, PATH.length / 4, AUTH.woman);
  // Maya's wheelchair: align its push handles to her posed wrists (group-local), once, at a mid-stride frame.
  // Push deltas are captured NOW, while her bones still hold buildMaya's Idle sample — euler-adds
  // compose benignly from Idle (stage-proven); captured mid-Walk they can encode a flipped axis.
  var allDeltas = computeQuatDeltas(my.build.fig, MAYA_PUSH);
  // Split by MEASURED mixer behaviour (see classifyDeltas): clip-driven bones take the per-frame
  // multiply; bones the action never drives take a fixed posed quaternion, restored each frame.
  var cls = classifyDeltas(myMover.mixer, allDeltas);
  myMover.quatDeltas = cls.frame; myMover.fixedPoses = cls.fixed;
  var chair = buildWheelchair();
  my.group.add(chair);
  myMover.mixer.update(0.8);
  applyFixedPoses(myMover.fixedPoses); applyQuatDeltas(myMover.quatDeltas); my.group.updateMatrixWorld(true);
  var wl = findBone(my.build.fig, 'Wrist.L').getWorldPosition(new THREE.Vector3());
  var wr = findBone(my.build.fig, 'Wrist.R').getWorldPosition(new THREE.Vector3());
  var mid = wl.clone().add(wr).multiplyScalar(0.5);
  var local = my.group.worldToLocal(mid.clone());
  chair.position.set(local.x, 0, local.z + 0.27);
  window.__MAYA_WRIST = { y: +local.y.toFixed(3), z: +local.z.toFixed(3), chairZ: +chair.position.z.toFixed(3) };
  // statics on the line-up stage (facing +Z, toward the ALL camera)
  var hale = makeFigure(buildHale(gunman), 'DR. HALE', { tagY: 2.30 });
  hale.group.position.set(-3.9, 0.12, 6.6);
  var coleC = makeFigure(buildColeChair(gunman), 'COLE', { tagY: 1.78, blobW: 1.3 });
  coleC.group.position.set(-1.5, 0.12, 6.6);
  coleC.wrap.position.y = COLE_SEAT_Y - 0.894 * coleC.scale;
  var chair2 = buildWheelchair(); coleC.group.add(chair2);
  // Cole in bed: bed group along X (head at -X), figure pitched flat in a tilt group, torso bent up ~40 deg
  var coleB = makeFigure(buildColeBed(gunman), 'COLE · BED', { tagY: 1.62, noBlob: true });
  coleB.group.position.set(1.9, 0.12, 6.6);
  var bed = new THREE.Group(); bed.rotation.y = Math.PI / 2; coleB.group.add(bed);
  var frameM = linMat(0x4a5058, 0.5, 0.6), mattM = linMat(0xb9bec4, 0.95, 0), blankM = linMat(0xDEDFD8, 0.95, 0);
  var matt = box(0.95, 0.18, 2.2, mattM); matt.position.set(0, 0.53, 0); bed.add(matt);
  var base = box(0.85, 0.42, 2.0, frameM); base.position.set(0, 0.21, 0); bed.add(base);
  var pillow = box(0.62, 0.11, 0.4, blankM); pillow.position.set(0, 0.665, -0.78); bed.add(pillow);
  var footb = box(0.95, 0.5, 0.05, frameM); footb.position.set(0, 0.35, 1.12); bed.add(footb);
  var headb = box(0.95, 0.62, 0.05, frameM); headb.position.set(0, 0.42, -1.12); bed.add(headb);
  var blanket = box(0.99, 0.075, 1.02, blankM); blanket.position.set(0, 0.665, 0.60); bed.add(blanket);
  var stripe = box(0.99, 0.02, 0.09, linMat(0x7FA2B4, 0.95, 0)); stripe.position.set(0, 0.705, 0.30); bed.add(stripe);
  addBlob(coleB.group, 2.6, 1.5, 0.012);
  // tilt group: hips on the mattress (bed-local z +0.28), figure pitched onto its back
  var tilt = new THREE.Group(); tilt.position.set(0, 0.635, 0.28); tilt.rotation.x = -Math.PI / 2;
  bed.add(tilt);
  // measure the Hips bone in fig-local space (fig briefly parked in a neutral holder)
  var holder = new THREE.Object3D(); holder.add(coleB.build.fig); holder.updateMatrixWorld(true);
  var hipsLocal = findBone(coleB.build.fig, 'Hips').getWorldPosition(new THREE.Vector3());
  holder.remove(coleB.build.fig); coleB.wrap.add(coleB.build.fig);
  // reparent: take the wrap out of the line-up group and into the tilt group
  coleB.group.remove(coleB.wrap);
  coleB.wrap.position.copy(hipsLocal).multiplyScalar(-coleB.scale);
  tilt.add(coleB.wrap);
  window.__CAST_READY = true;
  var ld = document.getElementById('load'); if(ld) ld.style.display = 'none';
}
withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils){ window.__CAST_ERRORS.push('GLTFLoader/SkeletonUtils unavailable'); return; }
  Promise.all([chunkBytes('__GUNMAN_GZ_B64'), chunkBytes('__WOMAN_GZ_B64')]).then(function(bufs){
    if(!bufs[0] || !bufs[1]){ window.__CAST_ERRORS.push('asset chunks failed to decode'); return; }
    var loader = new THREE.GLTFLoader(), got = {};
    loader.parse(bufs[0], '', function(g){ got.gunman = g; if(got.woman) buildCast(got.gunman, got.woman); }, function(e){ window.__CAST_ERRORS.push('gunman parse: ' + e); });
    loader.parse(bufs[1], '', function(g){ got.woman = g; if(got.gunman) buildCast(got.gunman, got.woman); }, function(e){ window.__CAST_ERRORS.push('woman parse: ' + e); });
  }).catch(function(e){ window.__CAST_ERRORS.push('load: ' + e); });
});

// ------------------------------------------------------------------ camera modes + UI
var camMode = 'all';
var camPos = camera.position.clone(), camLook = new THREE.Vector3(-0.2, 0.4, 2.8);
var buttons = document.querySelectorAll('#bar button');
function setMode(m){ camMode = m;
  buttons.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-mode') === m); }); }
buttons.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); }); });
function staticCam(x, y, z, lx, ly, lz){ return { p: new THREE.Vector3(x, y, z), l: new THREE.Vector3(lx, ly, lz) }; }
var STATIC_CAMS = {
  hale: staticCam(-3.9, 1.75, 10.1, -3.9, 1.05, 6.6),
  cole: staticCam(5.2, 2.3, 11.8, 0.2, 0.6, 6.6)
};
window.__cast = { setMode: setMode, figures: figures, movers: movers,
  mode: function(){ return camMode; },
  crown: function(label){ var F = figures[label]; if(!F) return null;
    F.group.updateMatrixWorld(true); var mx = 0;
    F.build.fig.traverse(function(o){ if(o.isBone){ var y = o.getWorldPosition(new THREE.Vector3()).y; if(y > mx) mx = y; } });
    return +(mx + 0.223 * F.scale).toFixed(3); },
  wristY: function(){ return window.__MAYA_WRIST || null; },
  camPos: function(){ return camera.position.toArray(); },
  deltas: function(){ var m = figures['MAYA'] && figures['MAYA'].mover; if(!m || !m.quatDeltas) return null;
    function row(mode){ return function(d){ return { bone: d.bone.name, mode: mode,
      angle: +((2 * Math.acos(Math.min(1, Math.abs(d.delta.w)))) * 57.2958).toFixed(1) }; }; }
    return m.quatDeltas.map(row('frame')).concat((m.fixedPoses || []).map(function(f){ return { bone: f.bone.name, mode: 'fixed' }; })); },
  topBones: function(label, n){
    var F = figures[label]; if(!F) return null;
    F.group.updateMatrixWorld(true); var arr = [];
    F.build.fig.traverse(function(o){ if(o.isBone){ var y = o.getWorldPosition(new THREE.Vector3()).y;
      arr.push([o.name, +y.toFixed(3)]); } });
    arr.sort(function(a, b){ return b[1] - a[1]; }); return arr.slice(0, n || 4); },
  measure: function(){
    var out = {}; renderer.info.autoReset = false;
    function snap(){ renderer.info.reset(); renderer.render(scene, camera);
      return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
    Object.keys(figures).forEach(function(k){ figures[k].group.visible = false; });
    out.world = snap();
    Object.keys(figures).forEach(function(k){
      Object.keys(figures).forEach(function(j){ figures[j].group.visible = j === k; });
      worldGroup.visible = false; out[k] = snap(); worldGroup.visible = true; });
    Object.keys(figures).forEach(function(k){ figures[k].group.visible = true; });
    out.all = snap();
    renderer.info.autoReset = true;
    // scene-graph counts (exact, culling-independent): visible meshes + sprites per figure group
    out.graph = {};
    Object.keys(figures).forEach(function(k){ var F = figures[k], meshes = 0, tris = 0, sprites = 0;
      F.group.traverse(function(o){
        if(o.isSprite){ sprites++; return; }
        if(o.isMesh){ var vis = true, n = o; while(n && n !== F.group){ if(!n.visible){ vis = false; break; } n = n.parent; }
          if(!vis) return; meshes++;
          var g = o.geometry; if(g) tris += Math.round((g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3); } });
      out.graph[k] = { meshes: meshes, sprites: sprites, tris: tris }; });
    return out; }
};

// ------------------------------------------------------------------ gesture blocks (house standard)
document.addEventListener('gesturestart', function(e){ e.preventDefault(); });
document.addEventListener('dblclick', function(e){ e.preventDefault(); });
document.addEventListener('touchmove', function(e){ e.preventDefault(); }, { passive: false });
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); });

// ------------------------------------------------------------------ main loop
function angDelta(a, b){ var d = (b - a) % (Math.PI * 2); if(d > Math.PI) d -= Math.PI * 2; if(d < -Math.PI) d += Math.PI * 2; return d; }
var last = performance.now();
function tick(now){
  requestAnimationFrame(tick);
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  for(var i = 0; i < movers.length; i++){ var m = movers[i];
    m.s = (m.s + PATH_SPEED * dt) % PATH.length;
    var p = PATH.at(m.s);
    m.F.group.position.set(p.x, 0, p.z);
    var targetYaw = Math.atan2(p.dx, p.dz);
    m.yaw += angDelta(m.yaw, targetYaw) * Math.min(1, dt * 7);
    m.F.group.rotation.y = m.yaw;
    m.mixer.update(dt);
    if(m.fixedPoses) applyFixedPoses(m.fixedPoses);
    if(m.quatDeltas) applyQuatDeltas(m.quatDeltas);
  }
  var dp, dl, sc;
  if(camMode === 'gunman' || camMode === 'scrubs' || camMode === 'maya'){
    var F = figures[camMode.toUpperCase() === 'MAYA' ? 'MAYA' : camMode.toUpperCase()];
    var fx = Math.sin(F.mover.yaw), fz = Math.cos(F.mover.yaw);
    dp = new THREE.Vector3(F.group.position.x - fx * 5.4, 3.1, F.group.position.z - fz * 5.4);
    dl = new THREE.Vector3(F.group.position.x + fx * 1.5, 1.3, F.group.position.z + fz * 1.5);
  } else if(camMode === 'hale' || camMode === 'cole'){ sc = STATIC_CAMS[camMode]; dp = sc.p; dl = sc.l; }
  else { dp = new THREE.Vector3(0, 10.5, 20.5); dl = new THREE.Vector3(-0.2, 0.4, 2.8); }
  var kp = Math.min(1, dt * 3.2), kl = Math.min(1, dt * 4.5);
  camPos.lerp(dp, kp); camLook.lerp(dl, kl);
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
})();
