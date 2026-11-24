/* Hospital Escape — WALK-OFF: bake-off Ex1 vs Ex5 in one tiny plaza.
   Ex1 = Entry C's Quaternius "Casual" gunman (CC0), re-tuned relight v2, C clip library.
   Ex5 = Quaternius "Man" body (CC0) performing C's clips via rotation-only retarget
   (the hybrid path from sample D's cast3d-d.js) + code pistol + relight v2.
   Both walk the same rounded-rectangle loop at opposite phases, 1.2 m/s; the Walk clip
   is paced from the foot-contact constant (C clips authored 1.30 m/s), so
   timeScale = 1.2 / 1.30 for both — no foot slide. Asset data is the bake-off's own
   gzip+base64 text chunks (game/gunman-data-*.js, game/man-data-*.js); three.js is the
   pinned CDN 0.128.0, same as the other hospital samples. */
(function(){
'use strict';
window.__WALKOFF_ERRORS = [];
window.addEventListener('error', function(e){ window.__WALKOFF_ERRORS.push(String((e && e.message) || e)); });

var WALK_AUTHORED = 1.30;                    // C clip library, foot-contact measured
var PATH_SPEED = 1.2;                        // m/s along the loop
var TIME_SCALE = PATH_SPEED / WALK_AUTHORED;
var TARGET_H = 1.77;                         // world height both figures are scaled to (sample D)

// ------------------------------------------------------------------ scene
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('view').appendChild(renderer.domElement);
window.__renderer = renderer;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f26);
scene.fog = new THREE.Fog(0x1b1f26, 20, 46);
var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(10.5, 7.6, 10.5);

scene.add(new THREE.HemisphereLight(0xcdd8e6, 0x3a332a, 0.75));
scene.add(new THREE.AmbientLight(0xfff1dd, 0.25));
var key = new THREE.DirectionalLight(0xffe6c4, 0.85); key.position.set(6, 10, 4); scene.add(key);
var rim = new THREE.DirectionalLight(0x9db8dd, 0.3); rim.position.set(-7, 6, -6); scene.add(rim);

// ------------------------------------------------------------------ the tiny world
var HW = 4.6, HD = 3.2, CR = 1.6;             // loop half-extents + corner radius
function roundedRectShape(hw, hd, r){
  var s = new THREE.Shape();
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - r); s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hd); s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + r); s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
(function buildWorld(){
  var floor = new THREE.Mesh(new THREE.CircleGeometry(24, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // path strip: rounded-rect ring the figures walk on
  var ringShape = roundedRectShape(HW + 0.85, HD + 0.85, CR + 0.85);
  ringShape.holes.push(roundedRectShape(HW - 0.85, HD - 0.85, Math.max(0.3, CR - 0.85)));
  var ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 24),
    new THREE.MeshStandardMaterial({ color: 0x454c59, roughness: 0.95, metalness: 0 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);   // shape Y maps to -Z; symmetric loop, fine
  // centre island: planter + hedge
  var planter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x565d68, roughness: 0.9 }));
  planter.position.y = 0.25; scene.add(planter);
  var hedge = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1 }));
  hedge.position.y = 0.75; scene.add(hedge);
  // corner bollards for scale
  var bolM = new THREE.MeshStandardMaterial({ color: 0x707a88, roughness: 0.7, metalness: 0.2 });
  [[6.3, 4.6], [-6.3, 4.6], [6.3, -4.6], [-6.3, -4.6]].forEach(function(p){
    var b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 12), bolM);
    b.position.set(p[0], 0.425, p[1]); scene.add(b); });
})();

// ------------------------------------------------------------------ walk path (arc-length table)
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

// ------------------------------------------------------------------ labels
function makeLabel(text){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2);
  x.fillStyle = 'rgba(8,10,14,0.88)'; x.fill();
  x.lineWidth = 11; x.strokeStyle = 'rgba(255,255,255,0.96)'; x.stroke();
  x.fillStyle = '#ffffff'; x.font = '900 148px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 136);
  var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.62, 0.62, 1); sp.renderOrder = 999;
  return sp;
}

// ------------------------------------------------------------------ asset loading (from cast3d-d.js)
function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function chunkBytes(globalName){
  var parts = window[globalName]; if(!parts || !window.DecompressionStream) return Promise.resolve(null);
  var bytes = b64ToBytes(parts.join(''));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){ window.__WALKOFF_ERRORS.push('script failed: ' + src); cb(); }; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}
function findBone(fig, names){
  var want = names.map(function(n){ return n.replace(/[.:]/g, ''); });
  var found = null;
  fig.traverse(function(o){ if(!found && o.isBone && want.indexOf(o.name.replace(/[.:]/g, '')) >= 0) found = o; });
  return found;
}
// Rotation-only retarget (sample D, hybrid): keep only quaternion tracks for bones the
// target rig has — C's per-bone position tracks would drag the Man rig's hips to the floor.
function retargetClips(clips, targetScene){
  var bones = {}; targetScene.traverse(function(o){ if(o.isBone) bones[o.name] = 1; });
  var out = {};
  Object.keys(clips).forEach(function(n){ var c = clips[n];
    var tracks = c.tracks.filter(function(t){ return /\.quaternion$/.test(t.name) && bones[t.name.replace(/\.quaternion$/, '')]; });
    out[n] = new THREE.AnimationClip(c.name, c.duration, tracks); });
  return out;
}
function blobTex(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
  gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
var _blobTex = null;
function addBlob(wrap){
  if(!_blobTex) _blobTex = blobTex();
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05 * 0.69),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; sh.raycast = function(){}; wrap.add(sh);
}
// Relight v2 (sample D): albedo lift x1.8 capped 0.9 + gentle emissive so the dark
// gunman clothes read at range, plus a warm point light riding each figure (added by caller).
function relight(fig){
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.isMeshStandardMaterial && m.color){
      m.color.multiplyScalar(1.8);
      m.color.r = Math.min(m.color.r, 0.9); m.color.g = Math.min(m.color.g, 0.9); m.color.b = Math.min(m.color.b, 0.9);
      if(m.emissive) m.emissive.setRGB(m.color.r * 0.16, m.color.g * 0.16, m.color.b * 0.16); } }); } });
}
function cloneFig(scene){
  var fig = THREE.SkeletonUtils.clone(scene);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
  return fig;
}
// Code-built pistol on the hand bone (sample D hybrid technique): pose the figure in the
// aim clip, measure the posed hand, hang the pistol there with attach().
function addPistol(fig, clips, height){
  var clip = clips['Idle_Gun_Pointing']; if(!clip) return;
  var mx = new THREE.AnimationMixer(fig); var a = mx.clipAction(clip); a.play(); mx.update(0.55);
  var wrist = findBone(fig, ['Wrist.R', 'Palm.R']); if(!wrist) return;
  var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
  var PS = height / 1.81;
  var wp = wrist.getWorldPosition(new THREE.Vector3());
  var gm = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.55, metalness: 0.35 });
  var pistol = new THREE.Group();
  var slide = new THREE.Mesh(new THREE.BoxGeometry(0.032 * PS, 0.045 * PS, 0.21 * PS), gm); slide.position.set(0, 0.028 * PS, 0.055 * PS); pistol.add(slide);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.03 * PS, 0.11 * PS, 0.045 * PS), gm); grip.position.set(0, -0.035 * PS, -0.028 * PS); grip.rotation.x = 0.28; pistol.add(grip);
  pistol.position.set(wp.x, wp.y - 0.015 * PS, wp.z + 0.045 * PS);
  fig.add(pistol); wrist.attach(pistol); tmp.remove(fig); mx.stopAllAction();
}
function boneHeight(scene, crown){
  var mx = 0; scene.updateMatrixWorld(true);
  scene.traverse(function(o){ if(o.isBone){ var y = o.getWorldPosition(new THREE.Vector3()).y; if(y > mx) mx = y; } });
  return Math.max(0.5, mx + crown);
}

// ------------------------------------------------------------------ figures
var movers = [];
function makeMover(fig, height, clips, label){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label); tag.position.y = TARGET_H + 0.52; group.add(tag);
  scene.add(group);
  var mixer = new THREE.AnimationMixer(fig);
  var act = mixer.clipAction(clips['Walk']); act.timeScale = TIME_SCALE; act.play();
  var m = { group: group, mixer: mixer, s: 0, yaw: 0 };
  movers.push(m); return m;
}
function buildFigures(gunman, man){
  var gClips = {}; gunman.animations.forEach(function(c){ gClips[c.name] = c; });
  // Ex1 — C rig as-is (pistol is bone-parented inside the GLB), fixed height 1.81 (sample D).
  var fig1 = cloneFig(gunman.scene); relight(fig1);
  makeMover(fig1, 1.81, gClips, '1').s = 0;
  // Ex5 — Man body, C's clips retargeted rotation-only, code pistol, bone-measured height.
  var manH = boneHeight(man.scene, 0.54);
  var fig5 = cloneFig(man.scene);
  var rClips = retargetClips(gClips, fig5);
  addPistol(fig5, rClips, manH); relight(fig5);
  makeMover(fig5, manH, rClips, '5').s = PATH.length / 2;
}
withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils){ window.__WALKOFF_ERRORS.push('GLTFLoader/SkeletonUtils unavailable'); return; }
  Promise.all([chunkBytes('__GUNMAN_GZ_B64'), chunkBytes('__MAN_GZ_B64')]).then(function(bufs){
    if(!bufs[0] || !bufs[1]){ window.__WALKOFF_ERRORS.push('asset chunks failed to decode'); return; }
    var loader = new THREE.GLTFLoader(), got = {};
    loader.parse(bufs[0], '', function(g){ got.gunman = g; if(got.man) done(); }, function(e){ window.__WALKOFF_ERRORS.push('gunman parse: ' + e); });
    loader.parse(bufs[1], '', function(g){ got.man = g; if(got.gunman) done(); }, function(e){ window.__WALKOFF_ERRORS.push('man parse: ' + e); });
    function done(){
      buildFigures(got.gunman, got.man);
      document.getElementById('load').style.display = 'none';
      window.__WALKOFF_READY = true;
    }
  }).catch(function(e){ window.__WALKOFF_ERRORS.push('load: ' + e); });
});

// ------------------------------------------------------------------ camera modes + UI
var camMode = 'both';
var camPos = camera.position.clone(), camLook = new THREE.Vector3(0, 0.9, 0);
var buttons = document.querySelectorAll('#bar button');
function setMode(m){ camMode = m;
  buttons.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-mode') === m); }); }
buttons.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); }); });
window.__walkoff = { setMode: setMode, movers: movers, pathLength: PATH.length,
  mode: function(){ return camMode; } };

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
    m.group.position.set(p.x, 0, p.z);
    var targetYaw = Math.atan2(p.dx, p.dz);
    m.yaw += angDelta(m.yaw, targetYaw) * Math.min(1, dt * 7);
    m.group.rotation.y = m.yaw;
    m.mixer.update(dt);
  }
  var dp, dl;
  if(camMode === 'both' || movers.length < 2){ dp = new THREE.Vector3(10.5, 7.6, 10.5); dl = new THREE.Vector3(0, 0.9, 0); }
  else { var f = movers[camMode === '1' ? 0 : 1];
    var fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
    dp = new THREE.Vector3(f.group.position.x - fx * 5.0, 2.3, f.group.position.z - fz * 5.0);
    dl = new THREE.Vector3(f.group.position.x + fx * 1.5, 1.25, f.group.position.z + fz * 1.5); }
  var kp = Math.min(1, dt * 3.2), kl = Math.min(1, dt * 4.5);
  camPos.lerp(dp, kp); camLook.lerp(dl, kl);
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
})();
