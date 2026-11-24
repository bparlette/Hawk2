/* Hospital Escape — WALK-OFF 2: our Ex1 vs Neon's five, one tiny plaza.
   Gold "1" = our bake-off winner: Entry C's Quaternius "Casual" gunman (CC0),
   re-tuned relight v2, C clip library, from the gzip+base64 text chunks in game/.
   N1..N5 = Neon's shooter-asset bake-off entry (commit 391e565), loaded as the
   real binary GLBs she shipped in games/hospital-escape-3d-sample-neon/assets/gunmen/
   (cross-folder, same Pages origin — no binary is duplicated or re-pushed):
     N1 valid-ual    MIT VALID avatar x CC0 UAL clips      Walk authored 1.094 m/s
     N2 valid-mocap  MIT VALID avatar x mocap (test only)  Walk authored 1.688 m/s
     N3 ai3d-remesh  Hunyuan3D remesh x UAL clips          Walk authored 1.093 m/s
     N4 sculpt-c     Quaternius Casual2 Blender overhaul   Walk authored 1.344 m/s
     N5 ual-dressed  CC0 UAL native rig, dressed           Walk authored 1.059 m/s
   All six walk the same rounded-rectangle loop at 1.2 m/s; each Walk clip is paced
   from its own foot-contact constant (timeScale = 1.2 / authored), so no foot slide.
   Neon figure normalization (scale + ground offset) reuses her cast3d-neon.js values
   (fixedH / z0 per mode, target height 1.80 m). three.js is the pinned CDN 0.128.0. */
(function(){
'use strict';
window.__WALKOFF_ERRORS = [];
window.addEventListener('error', function(e){ window.__WALKOFF_ERRORS.push(String((e && e.message) || e)); });

var PATH_SPEED = 1.2;                        // m/s along the loop, same for all six
var TARGET_H = 1.77;                         // world height figures are scaled to (walk-off 1)
var NEON_BASE = '../hospital-escape-3d-sample-neon/assets/gunmen/';
var NEON_MODES = [
  { key: 'valid-ual',   label: 'N1', walkClip: 'Walk_Loop', authored: 1.094, fixedH: 179.34, z0: -100.8 },
  { key: 'valid-mocap', label: 'N2', walkClip: 'Walk_Loop', authored: 1.688, fixedH: 178.68, z0: -99.1 },
  { key: 'ai3d-remesh', label: 'N3', walkClip: 'Walk_Loop', authored: 1.093, fixedH: 1.7605, z0: -0.005 },
  { key: 'sculpt-c',    label: 'N4', walkClip: 'Walk',      authored: 1.344, fixedH: 1.782,  z0: -0.048 },
  { key: 'ual-dressed', label: 'N5', walkClip: 'Walk_Loop', authored: 1.059, fixedH: 1.8168, z0: -0.014 }
];

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

// ------------------------------------------------------------------ the tiny world (same plaza as walk-off 1)
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
function makeLabel(text, gold){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2);
  if(gold){ x.fillStyle = '#d9a92c'; x.fill(); }
  else { x.fillStyle = 'rgba(8,10,14,0.88)'; x.fill(); }
  x.lineWidth = 11; x.strokeStyle = 'rgba(255,255,255,0.96)'; x.stroke();
  x.fillStyle = gold ? '#191408' : '#ffffff';
  x.font = '900 ' + (text.length > 1 ? 112 : 148) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 136);
  var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.62, 0.62, 1); sp.renderOrder = 999;
  return sp;
}

// ------------------------------------------------------------------ asset loading helpers
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
// Relight v2 (sample D): albedo lift x1.8 capped 0.9 + gentle emissive. Applied to our
// Ex1 only — Neon's textured figures keep their shipped materials (sRGB maps, metalness 0).
function relight(fig){
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.isMeshStandardMaterial && m.color){
      m.color.multiplyScalar(1.8);
      m.color.r = Math.min(m.color.r, 0.9); m.color.g = Math.min(m.color.g, 0.9); m.color.b = Math.min(m.color.b, 0.9);
      if(m.emissive) m.emissive.setRGB(m.color.r * 0.16, m.color.g * 0.16, m.color.b * 0.16); } }); } });
}
function prepNeonMaterials(fig){
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m){ if(m.map) m.map.encoding = THREE.sRGBEncoding;
      if(m.name !== 'PistolMat' && !/Gun/i.test(m.name || '')) m.metalness = 0.0; } }); } });
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

// ------------------------------------------------------------------ improvement pass (Nov 24)
// One polish pass per finalist, behind an ORIG / IMPROVED toggle (default IMPROVED).
// Gold 1: subtle torso/shoulder broadening in bind space (legs/feet untouched, so the
// 1.30 m/s foot-contact pacing is unchanged) + cloth definition (fabric bump, cloth
// roughness split) — his relight v2 stays exactly as shipped.
// N1 / N2: dressing cleanup — GearMat leaves the crushed near-black for a readable
// fabric charcoal, _Body gets the relight standard (roughness 0.90 + gentle lift), and
// a bone-attached vest (front/back panels with trim, shoulder straps, waist straps)
// integrates her boxy chest rig and the floating back plate into one garment.
// N2's locomotion is NOT touched — no geometry or clip changes on either Neon figure.
var IMPROVED = true;
var impAppliers = {};   // slot -> function(on)
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
function ex1Improve(fig){
  var geoRecs = [], matRecs = [], seen = {};
  fig.traverse(function(o){
    if(o.isSkinnedMesh && !/Head/.test(o.name || '')){
      var pos = o.geometry.attributes.position;
      var orig = pos.array.slice(), wide = orig.slice();
      for(var i = 0; i < pos.count; i++){
        var y = orig[i * 3 + 1];
        var t = (y - 0.95) / 0.5; t = Math.max(0, Math.min(1, t)); t = t * t * (3 - 2 * t);
        if(t > 0){ wide[i * 3] = orig[i * 3] * (1 + 0.05 * t); wide[i * 3 + 2] = orig[i * 3 + 2] * (1 + 0.035 * t); }
      }
      geoRecs.push({ attr: pos, orig: orig, wide: wide });
    }
    if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(function(m){ if(m && !seen[m.uuid]){ seen[m.uuid] = 1;
        matRecs.push({ m: m, name: m.name, roughness: m.roughness }); } }); }
  });
  var fabShirt = fabricTexture(5, 5), fabJeans = fabricTexture(7, 7);
  return function(on){
    geoRecs.forEach(function(r){ r.attr.array.set(on ? r.wide : r.orig); r.attr.needsUpdate = true; });
    matRecs.forEach(function(r){ var m = r.m;
      m.roughness = r.roughness; m.bumpMap = null;
      if(on && r.name === 'LightBrown'){ m.roughness = 0.92; m.bumpMap = fabShirt; m.bumpScale = 0.25; }
      if(on && r.name === 'LightBlue'){ m.roughness = 0.86; m.bumpMap = fabJeans; m.bumpScale = 0.25; }
      m.needsUpdate = true; });
  };
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
  // Extents over TORSO-weighted verts only — the bind pose has arms out, and unfiltered
  // verts would size the vest to the arm span instead of the chest.
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
  (function(){ // refine shoulder apex from torso verts near the strap line
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
  // chest group (rides Spine2) — plate-carrier sized panels centred on the sternum,
  // sitting just off the body so her rig boxes stay proud of the front panel
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
  // waist group (rides Spine)
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

// ------------------------------------------------------------------ figures
var movers = [null, null, null, null, null, null];
var MODE_INDEX = { '1': 0, 'n1': 1, 'n2': 2, 'n3': 3, 'n4': 4, 'n5': 5 };
function makeMover(fig, height, walkActionClip, authored, label, gold, slot){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, gold); tag.position.y = TARGET_H + 0.52; group.add(tag);
  scene.add(group);
  var mixer = new THREE.AnimationMixer(fig);
  var act = mixer.clipAction(walkActionClip); act.timeScale = PATH_SPEED / authored; act.play();
  var m = { group: group, mixer: mixer, s: slot * PATH.length / 6, yaw: 0, label: label };
  movers[slot] = m; return m;
}
var pending = 1 + NEON_MODES.length, failed = [];
function oneDone(){
  if(--pending > 0) return;
  document.getElementById('load').style.display = 'none';
  window.__WALKOFF_READY = true;
  window.__WALKOFF_FAILED = failed;
}
function buildEx1(gunman){
  var clips = clipLookup(gunman.animations);
  var fig = THREE.SkeletonUtils.clone(gunman.scene);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
  relight(fig);
  impAppliers[0] = ex1Improve(fig); impAppliers[0](IMPROVED);
  makeMover(fig, 1.81, clips['Walk'], 1.30, '1', true, 0);   // C clips foot-contact authored 1.30 m/s
}
function buildNeon(mode, slot, gltf){
  var clips = clipLookup(gltf.animations);
  var clip = clips[mode.walkClip];
  if(!clip){ window.__WALKOFF_ERRORS.push(mode.key + ': walk clip ' + mode.walkClip + ' missing'); failed.push(mode.key); oneDone(); return; }
  var fig = gltf.scene;
  prepNeonMaterials(fig);
  // Her normalization: scale the raw GLB so it stands 1.80 m with its ground offset at y=0.
  var sc = 1.80 / mode.fixedH;
  var norm = new THREE.Group();
  fig.scale.setScalar(sc); fig.position.y = -mode.z0 * sc;
  norm.add(fig);
  if(mode.key === 'valid-ual' || mode.key === 'valid-mocap'){
    impAppliers[slot] = neonImprove(fig, norm); impAppliers[slot](IMPROVED); }
  makeMover(norm, 1.80, clip, mode.authored, mode.label, false, slot);
  oneDone();
}
withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils){ window.__WALKOFF_ERRORS.push('GLTFLoader/SkeletonUtils unavailable'); return; }
  var loader = new THREE.GLTFLoader();
  chunkBytes('__GUNMAN_GZ_B64').then(function(buf){
    if(!buf){ window.__WALKOFF_ERRORS.push('gunman chunks failed to decode'); failed.push('ex1'); oneDone(); return; }
    loader.parse(buf, '', function(g){ buildEx1(g); oneDone(); },
      function(e){ window.__WALKOFF_ERRORS.push('gunman parse: ' + e); failed.push('ex1'); oneDone(); });
  }).catch(function(e){ window.__WALKOFF_ERRORS.push('gunman load: ' + e); failed.push('ex1'); oneDone(); });
  NEON_MODES.forEach(function(mode, i){
    loader.load(NEON_BASE + mode.key + '.glb', function(g){ buildNeon(mode, i + 1, g); },
      undefined, function(err){ window.__WALKOFF_ERRORS.push(mode.key + ' load: ' + (err && err.message || err)); failed.push(mode.key); oneDone(); });
  });
});

// ------------------------------------------------------------------ camera modes + UI
var camMode = 'both';
var camDir = null;   // follow-camera direction: 'front' | 'back' | 'side'; null until chosen, ALL clears it
// Camera offset angle vs the figure's heading: 0 = ahead of him (he walks TOWARD camera),
// PI/2 = his left (tracking profile), PI = behind him (he walks AWAY). camAng is smoothed
// toward the target on the shortest arc every frame, so direction switches swing the
// camera around him instead of cutting or spinning.
var DIR_ANG = { front: 0, side: Math.PI / 2, back: Math.PI };
var camAng = Math.PI;
var camPos = camera.position.clone(), camLook = new THREE.Vector3(0, 0.9, 0);
var buttons = document.querySelectorAll('#bar button');
var dirButtons = document.querySelectorAll('#dirbar button');
function paintButtons(){
  buttons.forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-mode') === camMode); });
  dirButtons.forEach(function(b){ b.classList.toggle('on', camDir !== null && b.getAttribute('data-dir') === camDir); });
}
function setMode(m){ camMode = m;
  if(m === 'both') camDir = null;                    // ALL = wide shot; direction cleared
  else if(camDir === null) camDir = 'back';          // plain figure tap defaults to the classic behind-follow
  paintButtons(); }
function setDir(d){
  if(camMode === 'both') camMode = '1';              // a direction tapped on ALL follows gold 1 from that angle
  camDir = d; paintButtons(); }
buttons.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); }); });
dirButtons.forEach(function(b){ b.addEventListener('click', function(){ setDir(b.getAttribute('data-dir')); }); });
// ORIG / IMPROVED toggle — applies to the three finalists only (slots 0, 1, 2)
var impButtons = document.querySelectorAll('#modebar button');
function paintImp(){
  impButtons.forEach(function(b){ b.classList.toggle('on', (b.getAttribute('data-imp') === '1') === IMPROVED); });
}
function setImproved(on){
  IMPROVED = !!on;
  Object.keys(impAppliers).forEach(function(k){ impAppliers[k](IMPROVED); });
  paintImp();
}
impButtons.forEach(function(b){ b.addEventListener('click', function(){ setImproved(b.getAttribute('data-imp') === '1'); }); });
paintImp();
window.__walkoff = { setMode: setMode, setDir: setDir, movers: movers, pathLength: PATH.length, camera: camera,
  setImproved: setImproved, improved: function(){ return IMPROVED; },
  mode: function(){ return camMode; }, dir: function(){ return camDir; } };

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
    if(!m) continue;
    m.s = (m.s + PATH_SPEED * dt) % PATH.length;
    var p = PATH.at(m.s);
    m.group.position.set(p.x, 0, p.z);
    var targetYaw = Math.atan2(p.dx, p.dz);
    m.yaw += angDelta(m.yaw, targetYaw) * Math.min(1, dt * 7);
    m.group.rotation.y = m.yaw;
    m.mixer.update(dt);
  }
  var dp, dl, fi = MODE_INDEX[camMode];
  if(camMode === 'both' || fi == null || !movers[fi]){ dp = new THREE.Vector3(10.5, 7.6, 10.5); dl = new THREE.Vector3(0, 0.9, 0); }
  else { var f = movers[fi];
    var fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
    camAng += angDelta(camAng, DIR_ANG[camDir || 'back']) * Math.min(1, dt * 3.2);
    var ca = Math.cos(camAng), sa = Math.sin(camAng);
    var ox = fx * ca + fz * sa, oz = fz * ca - fx * sa;   // offset dir = F*cos(camAng) + L*sin(camAng), L = his left = (fz, -fx)
    dp = new THREE.Vector3(f.group.position.x + ox * 5.0, 2.3, f.group.position.z + oz * 5.0);
    dl = new THREE.Vector3(f.group.position.x - ox * 1.5, 1.25, f.group.position.z - oz * 1.5); }
  var kp = Math.min(1, dt * 3.2), kl = Math.min(1, dt * 4.5);
  camPos.lerp(dp, kp); camLook.lerp(dl, kl);
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
})();
