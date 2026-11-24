/* Hospital Escape — Neon Leaders Improvement Pass (N2 valid-mocap + Ex1 C rig)
   Mirrors the walk-off 2 plaza, lighting, 1.2 m/s rounded loop, and FRONT/SIDE/BACK
   follow-camera geometry so before/after stills are strictly apples-to-apples. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var CLEAN = Q.get('clean') === '1';
if(CLEAN) document.body.classList.add('clean');
var BEFORE_ONLY = Q.get('before') === '1';

window.__LEADERS_ERRORS = [];
window.addEventListener('error', function(e){ window.__LEADERS_ERRORS.push(String((e && e.message) || e)); });

var PATH_SPEED = 1.2;
var TARGET_H = 1.77;
var N2_PRE_URL = '../hospital-escape-3d-sample-neon/assets/gunmen/valid-mocap.glb';
var N2_POST_URL = 'assets/n2-valid-mocap-v2.glb';
var EX1_POST_URL = 'assets/ex1-casual-neon-v2.glb';

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

// Walk-off 2 plaza geometry (identical dimensions)
var HW = 4.6, HD = 3.2, CR = 1.6;
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
  var ringShape = roundedRectShape(HW + 0.85, HD + 0.85, CR + 0.85);
  ringShape.holes.push(roundedRectShape(HW - 0.85, HD - 0.85, Math.max(0.3, CR - 0.85)));
  var ring = new THREE.Mesh(new THREE.ShapeGeometry(ringShape, 24),
    new THREE.MeshStandardMaterial({ color: 0x454c59, roughness: 0.95, metalness: 0 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  var planter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x565d68, roughness: 0.9 }));
  planter.position.y = 0.25; scene.add(planter);
  var hedge = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.55, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x39543a, roughness: 1 }));
  hedge.position.y = 0.75; scene.add(hedge);
  var bolM = new THREE.MeshStandardMaterial({ color: 0x707a88, roughness: 0.7, metalness: 0.2 });
  [[6.3, 4.6], [-6.3, 4.6], [6.3, -4.6], [-6.3, -4.6]].forEach(function(p){
    var b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.85, 12), bolM);
    b.position.set(p[0], 0.425, p[1]); scene.add(b); });
})();

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

function makeLabel(text, gold){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2);
  x.fillStyle = gold ? '#d9a92c' : 'rgba(8,10,14,0.88)'; x.fill();
  x.lineWidth = 11; x.strokeStyle = 'rgba(255,255,255,0.96)'; x.stroke();
  x.fillStyle = gold ? '#191408' : '#ffffff';
  x.font = '900 ' + (text.length > 3 ? 62 : 96) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 134);
  var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.62, 0.62, 1); sp.renderOrder = 999;
  sp.visible = !CLEAN;
  return sp;
}

function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function chunkBytes(globalName){
  var parts = window[globalName]; if(!parts || !window.DecompressionStream) return Promise.resolve(null);
  var bytes = b64ToBytes(parts.join(''));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){ window.__LEADERS_ERRORS.push('script failed: ' + src); cb(); }; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}
var _blobTex = null;
function addBlob(wrap){
  if(!_blobTex){
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
      gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); _blobTex = new THREE.CanvasTexture(c);
  }
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05 * 0.69),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; wrap.add(sh);
}
function relightEx1(fig){
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.isMeshStandardMaterial && m.color){
      m.color.multiplyScalar(1.8);
      m.color.r = Math.min(m.color.r, 0.9); m.color.g = Math.min(m.color.g, 0.9); m.color.b = Math.min(m.color.b, 0.9);
      if(m.emissive) m.emissive.setRGB(m.color.r * 0.16, m.color.g * 0.16, m.color.b * 0.16); } }); } });
}
function prepMaterials(fig){
  var tris = 0, mats = 0;
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    if(o.geometry && o.geometry.index) tris += Math.round(o.geometry.index.count / 3);
    else if(o.geometry && o.geometry.attributes && o.geometry.attributes.position) tris += Math.round(o.geometry.attributes.position.count / 3);
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    mats += ms.length;
    ms.forEach(function(m){ if(m){ if(m.map) m.map.encoding = THREE.sRGBEncoding;
      if(m.name !== 'PistolMat' && !/Gun|Metal|StrapMetal|Buckle/i.test(m.name || '')) m.metalness = 0.0; } }); } });
  return { tris: tris, mats: mats };
}
function clipLookup(clips){
  var out = {};
  (clips || []).forEach(function(c){
    var clean = c.name.replace(/\.\d+$/, '');
    if(!out[clean]) out[clean] = c;
    out[c.name] = c;
  });
  return out;
}

var SLOT_KEYS = ['n2-before', 'n2-after', 'ex1-before', 'ex1-after'];
var movers = {};
function makeMover(key, fig, height, walkClip, authored, label, gold, slotIdx, meshInfo){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, gold); tag.position.y = TARGET_H + 0.52; group.add(tag);
  scene.add(group);
  var mixer = new THREE.AnimationMixer(fig);
  var act = mixer.clipAction(walkClip); act.timeScale = PATH_SPEED / authored; act.play();
  var m = { key: key, group: group, wrap: wrap, mixer: mixer, act: act, s: slotIdx * PATH.length / 4, yaw: 0, meshInfo: meshInfo };
  movers[key] = m;
  var p = PATH.at(m.s); m.group.position.set(p.x, 0, p.z); m.yaw = Math.atan2(p.dx, p.dz); m.group.rotation.y = m.yaw;
  return m;
}

var pending = BEFORE_ONLY ? 2 : 4;
function oneDone(){
  if(--pending > 0) return;
  document.getElementById('load').style.display = 'none';
  window.__LEADERS_READY = true;
}

function loadNormalizedGLB(loader, url, key, walkName, authored, fixedH, z0, label, gold, slotIdx){
  loader.load(url, function(gltf){
    var clips = clipLookup(gltf.animations);
    var clip = clips[walkName] || gltf.animations[0];
    var fig = gltf.scene;
    var info = prepMaterials(fig);
    var sc = 1.80 / fixedH;
    var norm = new THREE.Group();
    fig.scale.setScalar(sc); fig.position.y = -z0 * sc;
    norm.add(fig);
    makeMover(key, norm, 1.80, clip, authored, label, gold, slotIdx, info);
    oneDone();
  }, undefined, function(err){ window.__LEADERS_ERRORS.push(key + ': ' + (err && err.message || err)); oneDone(); });
}

withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils){ window.__LEADERS_ERRORS.push('Loaders missing'); return; }
  var loader = new THREE.GLTFLoader();

  // Ex1 Before (Moth Gold 1 baseline from gzip chunk)
  chunkBytes('__GUNMAN_GZ_B64').then(function(buf){
    loader.parse(buf, '', function(g){
      var clips = clipLookup(g.animations);
      var fig = THREE.SkeletonUtils.clone(g.scene);
      fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
        o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
      relightEx1(fig);
      var info = prepMaterials(fig);
      makeMover('ex1-before', fig, 1.81, clips['Walk'], 1.30, 'Ex1 Pre', false, 2, info);
      oneDone();
    });
  });

  // N2 Before (Neon Bakeoff valid-mocap baseline)
  loadNormalizedGLB(loader, N2_PRE_URL, 'n2-before', 'Walk_Loop', 1.688, 178.68, -99.1, 'N2 Pre', false, 0);

  if(!BEFORE_ONLY){
    var n2H = +(Q.get('n2h') || 178.68), n2Z = +(Q.get('n2z') || -99.1), n2W = +(Q.get('n2w') || 1.688);
    var e1H = +(Q.get('e1h') || 1.782), e1Z = +(Q.get('e1z') || -0.048), e1W = +(Q.get('e1w') || 1.30);
    loadNormalizedGLB(loader, N2_POST_URL, 'n2-after', 'Walk_Loop', n2W, n2H, n2Z, 'N2 Post', true, 1);
    loadNormalizedGLB(loader, EX1_POST_URL, 'ex1-after', 'Walk', e1W, e1H, e1Z, 'Ex1 Post', true, 3);
  }
});

var camMode = Q.get('fig') || 'both';
var camDir = Q.get('dir') || null;
var frozen = false;
var DIR_ANG = { front: 0, side: Math.PI / 2, back: Math.PI };
var camAng = DIR_ANG[camDir] != null ? DIR_ANG[camDir] : Math.PI;
var camPos = camera.position.clone(), camLook = new THREE.Vector3(0, 0.9, 0);

var buttons = document.querySelectorAll('#bar button'), dirButtons = document.querySelectorAll('#dirbar button');
function paintButtons(){
  buttons.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-mode') === camMode); });
  dirButtons.forEach(function(b){ b.classList.toggle('on', camDir !== null && b.getAttribute('data-dir') === camDir); });
}
function setMode(m){ camMode = m; if(m === 'both') camDir = null; else if(camDir === null) camDir = 'back'; paintButtons(); }
function setDir(d){ if(camMode === 'both') camMode = 'n2-after'; camDir = d; paintButtons(); }
buttons.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); }); });
dirButtons.forEach(function(b){ b.addEventListener('click', function(){ setDir(b.getAttribute('data-dir')); }); });
paintButtons();

function orbitPose(f, dir, dist){
  var fx = Math.sin(f.yaw), fz = Math.cos(f.yaw), ang = DIR_ANG[dir || 'back'];
  var ca = Math.cos(ang), sa = Math.sin(ang);
  var ox = fx * ca + fz * sa, oz = fz * ca - fx * sa;
  var d = dist || 5.0;
  return {
    pos: new THREE.Vector3(f.group.position.x + ox * d, dir ? 2.15 : 2.3, f.group.position.z + oz * d),
    look: new THREE.Vector3(f.group.position.x - ox * 1.5, 1.15, f.group.position.z - oz * 1.5)
  };
}

window.__leaders = {
  movers: movers,
  snap: function(figKey, dir, sNorm, animT, dist){
    frozen = true;
    camMode = figKey; camDir = dir; paintButtons();
    var m = movers[figKey]; if(!m) return null;
    // Hide the other 3 walkers during single-figure 3-angle capture so nobody photo-bombs background
    Object.keys(movers).forEach(function(k){ if(movers[k]) movers[k].group.visible = (k === figKey); });
    m.s = (sNorm != null ? sNorm : 0.12) * PATH.length;
    var p = PATH.at(m.s);
    m.group.position.set(p.x, 0, p.z);
    m.yaw = Math.atan2(p.dx, p.dz);
    m.group.rotation.y = m.yaw;
    m.mixer.setTime(animT != null ? animT : 0.25);
    m.group.updateMatrixWorld(true);
    var ob = orbitPose(m, dir, dist || 3.6);
    camera.position.copy(ob.pos);
    camera.lookAt(ob.look);
    renderer.info.autoReset = false; renderer.info.reset();
    renderer.render(scene, camera);
    var stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    renderer.info.autoReset = true;
    return { meshInfo: m.meshInfo, stats: stats };
  },
  showAll: function(){
    frozen = false;
    Object.keys(movers).forEach(function(k){ if(movers[k]) movers[k].group.visible = true; });
  }
};

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); });

function angDelta(a, b){ var d = (b - a) % (Math.PI * 2); if(d > Math.PI) d -= Math.PI * 2; if(d < -Math.PI) d += Math.PI * 2; return d; }
var last = performance.now();
function tick(now){
  requestAnimationFrame(tick);
  if(frozen) return;
  var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  Object.keys(movers).forEach(function(k){
    var m = movers[k]; if(!m) return;
    m.group.visible = true;
    m.s = (m.s + PATH_SPEED * dt) % PATH.length;
    var p = PATH.at(m.s);
    m.group.position.set(p.x, 0, p.z);
    m.yaw += angDelta(m.yaw, Math.atan2(p.dx, p.dz)) * Math.min(1, dt * 7);
    m.group.rotation.y = m.yaw;
    m.mixer.update(dt);
  });
  var dp, dl;
  if(camMode === 'both' || !movers[camMode]){ dp = new THREE.Vector3(10.5, 7.6, 10.5); dl = new THREE.Vector3(0, 0.9, 0); }
  else {
    var f = movers[camMode], fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
    camAng += angDelta(camAng, DIR_ANG[camDir || 'back']) * Math.min(1, dt * 3.2);
    var ca = Math.cos(camAng), sa = Math.sin(camAng);
    var ox = fx * ca + fz * sa, oz = fz * ca - fx * sa;
    dp = new THREE.Vector3(f.group.position.x + ox * 5.0, 2.3, f.group.position.z + oz * 5.0);
    dl = new THREE.Vector3(f.group.position.x - ox * 1.5, 1.25, f.group.position.z - oz * 1.5);
  }
  camPos.lerp(dp, Math.min(1, dt * 3.2)); camLook.lerp(dl, Math.min(1, dt * 4.5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
})();
