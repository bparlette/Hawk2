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
   (fixedH / z0 per mode, target height 1.80 m). three.js is the pinned CDN 0.128.0.
   OPUS (Nov 24, Cherie: "Add all of his"): slots 6-10 = his shooter-entry best five
   (VALID designs, cross-folder from games/hospital-escape-3d-sample-opus/valid/),
   slot 11 = his N2+ (CMU 35_02 foot-locked retarget parsed at load — withLoaders also
   pulls BVHLoader.js from the same pinned CDN; flagged, not hidden), slot 12 = his
   Ex1+ spec reskin of gold 1.
   C RESTORATION (Nov 24, Cherie: "Also add the original C-technique five"): slots 13-16
   restore Opus's ORIGINAL bake-off entries C1-C4, recovered from opus-cast.js + ex-extra.js
   at commit 52cb2007 — the state before 93b1ca96 replaced them on his entry pages with the
   VALID five above (the two module files were never deleted; byte-identical on main).
   C1 = his Ex1 v6, C2 = his Ex2 v4 (CMU mocap on C), C3 = his Ex3 v2 (shape row),
   C4 = his Ex4 v2 (combat locomotion). His Ex5 (the combination figure) is NOT restored:
   Cherie's verdict — Ex5 stays out. Seventeen walk the loop now; the finalists, their
   pacing and the ORIG / IMPROVED toggle are unchanged. */
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
// Ground markers (Nov 24, Cherie): a flat disc at each figure's feet, replacing the old
// overhead billboard sprite. The sprite was the blow-up defect in her phone screenshots:
// a fixed 0.62 m world-size THREE.Sprite with depthTest:false + renderOrder 999, so when
// a walker passed close to the follow camera its disc (the "giant white ring") filled the
// screen and drew over everything. A ground disc lies flat — natural depth testing and
// perspective foreshortening — and tick() fades it out entirely when the camera closes in.
function makeLabel(text, gold){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2);
  if(gold){ x.fillStyle = 'rgba(217,169,44,0.94)'; x.fill(); }
  else { x.fillStyle = 'rgba(8,10,14,0.85)'; x.fill(); }
  x.lineWidth = 11; x.strokeStyle = 'rgba(255,255,255,0.96)'; x.stroke();
  x.fillStyle = gold ? '#191408' : '#ffffff';
  x.font = '900 ' + (text.length > 1 ? 112 : 148) + 'px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 136);
  var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.02),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
  m.rotation.set(-Math.PI / 2, 0, Math.PI);   // flat on the ground; text upright from behind the figure (the default follow view)
  m.renderOrder = 2; m.raycast = function(){};
  return m;
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
  if(!THREE.BVHLoader) need.push('loaders/BVHLoader.js');   // OPUS N2+ retargets the CMU BVH at load (same pinned three@0.128.0 CDN)
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
var movers = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];   // 0 = Ex1 (gold '1'), 1-5 = Neon N1-N5, 6-10 = OPUS Ex1-Ex5, 11 = OPUS N2+, 12 = OPUS Ex1+, 13-16 = OPUS C1-C4 (restored originals)
var MODE_INDEX = { '1': 0, 'n1': 1, 'n2': 2, 'n3': 3, 'n4': 4, 'n5': 5, 'o1': 6, 'o2': 7, 'o3': 8, 'o4': 9, 'o5': 10, 'n2p': 11, 'e1p': 12, 'c1': 13, 'c2': 14, 'c3': 15, 'c4': 16 };
function makeMover(fig, height, walkActionClip, authored, label, gold, slot){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, gold); tag.position.y = 0.03; group.add(tag);
  scene.add(group);
  var mixer = new THREE.AnimationMixer(fig);
  var act = mixer.clipAction(walkActionClip); act.timeScale = PATH_SPEED / authored; act.play();
  var m = { group: group, mixer: mixer, s: slot * PATH.length / movers.length, yaw: 0, label: label, tag: tag };
  movers[slot] = m; return m;
}
var pending = 1 + NEON_MODES.length + 5 + 2 + 4, failed = [];   // +5 OPUS VALID designs, +1 OPUS N2+ (oneDone inside OPUS_N2P), +1 OPUS Ex1+ (counted in the gunman parse callback), +4 OPUS C1-C4 (C1/C3/C4 in the gunman parse callback, C2 in its own async retarget)
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
  if(!clip){ window.__WALKOFF_ERRORS.push(mode.key + ': walk clip ' + mode.walkClip + ' missing'); failed.push(mode.key); oneDone(); if(mode.key === 'valid-mocap'){ failed.push('n2p'); oneDone(); } return; }
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
  if(mode.key === 'valid-mocap') OPUS_N2P(mode, gltf);   // OPUS N2+ reuses this loaded body; its own oneDone() accounts for slot 11
  oneDone();
}
var _gunmanResolve = null;
var gunmanPromise = new Promise(function(res){ _gunmanResolve = res; });   // C2's retarget needs the parsed gunman; resolved in the parse callback below
withLoaders(function(){
  if(!THREE.GLTFLoader || !THREE.SkeletonUtils){ window.__WALKOFF_ERRORS.push('GLTFLoader/SkeletonUtils unavailable'); return; }
  var loader = new THREE.GLTFLoader();
  chunkBytes('__GUNMAN_GZ_B64').then(function(buf){
    if(!buf){ window.__WALKOFF_ERRORS.push('gunman chunks failed to decode'); failed.push('ex1'); failed.push('e1p'); failed.push('c1'); failed.push('c3'); failed.push('c4'); oneDone(); oneDone(); oneDone(); oneDone(); oneDone(); _gunmanResolve(null); return; }
    loader.parse(buf, '', function(g){ _gunmanResolve(g); buildEx1(g); oneDone();
        try { buildEx1Plus(g, clipLookup(g.animations)); } catch(e){ window.__WALKOFF_ERRORS.push('opus e1p: ' + e); failed.push('e1p'); }
        oneDone();
        try { buildC1(g); } catch(e){ window.__WALKOFF_ERRORS.push('opus c1: ' + e); failed.push('c1'); }
        oneDone();
        try { buildC3(g); } catch(e){ window.__WALKOFF_ERRORS.push('opus c3: ' + e); failed.push('c3'); }
        oneDone();
        try { buildC4(g); } catch(e){ window.__WALKOFF_ERRORS.push('opus c4: ' + e); failed.push('c4'); }
        oneDone(); },
      function(e){ window.__WALKOFF_ERRORS.push('gunman parse: ' + e); failed.push('ex1'); failed.push('e1p'); failed.push('c1'); failed.push('c3'); failed.push('c4'); oneDone(); oneDone(); oneDone(); oneDone(); oneDone(); _gunmanResolve(null); });
  }).catch(function(e){ window.__WALKOFF_ERRORS.push('gunman load: ' + e); failed.push('ex1'); failed.push('e1p'); failed.push('c1'); failed.push('c3'); failed.push('c4'); oneDone(); oneDone(); oneDone(); oneDone(); oneDone(); _gunmanResolve(null); });
  NEON_MODES.forEach(function(mode, i){
    loader.load(NEON_BASE + mode.key + '.glb', function(g){ buildNeon(mode, i + 1, g); },
      undefined, function(err){ window.__WALKOFF_ERRORS.push(mode.key + ' load: ' + (err && err.message || err)); failed.push(mode.key); oneDone(); if(mode.key === 'valid-mocap'){ failed.push('n2p'); oneDone(); } });
  });
});


// ================================================================== OPUS ADDITIONS (Nov 24, Cherie: "Add all of his")
// All seven of Opus's walking figures join the same loop, same cameras, same 1.2 m/s:
//   slots 6-10  OPUS Ex1..Ex5 — his shooter-entry pages 1..5 as they serve today: the VALID
//               "best five" designs (commit 93b1ca96 replaced the C-technique builds on those
//               pages) — photoreal VALID bodies (MIT) + CC0 UAL clips, garment recolour shader,
//               seated pistol, walk legs + aim upper layer, foot-contact pace measured per design
//               at load. Assets load cross-folder from games/hospital-escape-3d-sample-opus/valid/
//               (no binary duplicated). Build code adapted from his opus-valid.js, engine hooks removed.
//   slot 11     OPUS N2+ — his leaders improvement: Neon's N2 body/dressing, CMU 35_02 mocap
//               foot-locked onto the VALID rig at load (shippable) + UAL Pistol_Idle gun-ready
//               layer. Code verbatim from his leaders.js (games/hospital-escape-leaders-opus/),
//               BVH fetched from that folder. NOTE: this is why withLoaders now also loads
//               BVHLoader.js from the same pinned three@0.128.0 CDN — flagged, not hidden.
//   slot 12     OPUS Ex1+ — his leaders improvement of gold 1: spec reskin (rust bomber #733829,
//               knit beanie, stubble), one merged mesh, rim light, gun-carry upper body over C's
//               Walk legs at the adjudicated 1.30 m/s. Code verbatim from his leaders.js.
// The ORIG / IMPROVED toggle still applies to the finalists (slots 0, 1, 2) only.
var OPUS_VALID_DIR = '../hospital-escape-3d-sample-opus/valid/';
var OPUS_BVH_URL = '../hospital-escape-leaders-opus/cmu-35_02.bvh';
var V3 = THREE.Vector3, QT = THREE.Quaternion;
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }   // r128: no getComponent; glTF weights may be normalized ints
function mergeSkinned(root, rules){ var parts = []; root.traverse(function(o){ if(o.isSkinnedMesh) parts.push(o); }); if(parts.length < 2) return root;
  var sk = parts[0].skeleton, attrs = { position: [], normal: [], skinIndex: [], skinWeight: [], color: [] }, idx = [], off = 0;
  var bindW = parts[0].bindMatrix, boneW = {}; sk.bones.forEach(function(b, i){ boneW[b.name] = new V3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert()); });
  var sN = {}, key2 = function(x, y, z){ return Math.round(x * 2000) + ',' + Math.round(y * 2000) + ',' + Math.round(z * 2000); };   // averaged normal per shared position: pushing keeps seams closed
  if(rules) parts.forEach(function(p){ var g = p.geometry; for(var i = 0; i < g.attributes.position.count; i++){ var k = key2(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)), a = sN[k] || (sN[k] = new V3()); a.x += g.attributes.normal.getX(i); a.y += g.attributes.normal.getY(i); a.z += g.attributes.normal.getZ(i); } });
  Object.keys(sN).forEach(function(k){ sN[k].normalize(); }); var ibw = new THREE.Matrix4().copy(bindW).invert();
  var unit = rules ? 1.81 / Math.max(1e-6, (boneW.Head.y - Math.min(boneW.FootL.y, boneW.FootR.y)) * 1.12) : 1, vv = new V3(), nn = new V3(), nm = new THREE.Matrix3().getNormalMatrix(bindW);
  parts.forEach(function(p){ var g = p.geometry, n = g.attributes.position.count, col = (p.material.color || new THREE.Color(1, 1, 1)), vc = g.attributes.color;
    var map = p.skeleton.bones.map(function(b){ for(var i = 0; i < sk.bones.length; i++) if(sk.bones[i].name === b.name) return i; return 0; });
    for(var i = 0; i < n; i++){ var px = g.attributes.position.getX(i), py = g.attributes.position.getY(i), pz = g.attributes.position.getZ(i), qx = g.attributes.normal.getX(i), qy = g.attributes.normal.getY(i), qz = g.attributes.normal.getZ(i), rc = null;
      if(rules){ var bi = 0, bw = -1; for(var k0 = 0; k0 < 4; k0++){ var w0 = comp(g.attributes.skinWeight, i, k0); if(w0 > bw){ bw = w0; bi = comp(g.attributes.skinIndex, i, k0); } }
        vv.set(px, py, pz).applyMatrix4(bindW); nn.set(qx, qy, qz).applyMatrix3(nm).normalize();
        rc = rules({ part: p.name, mat: p.material.name, bone: p.skeleton.bones[bi] ? p.skeleton.bones[bi].name : '', p: vv, n: nn, bones: boneW, unit: unit });
        if(rc && rc.push){ var an = sN[key2(px, py, pz)] || nn; px += an.x * rc.push / unit; py += an.y * rc.push / unit; pz += an.z * rc.push / unit; }
        if(rc && rc.shift){ px += rc.shift.x / unit; py += rc.shift.y / unit; pz += rc.shift.z / unit; }
        if(rc && rc.pos){ var lp = rc.pos.clone().applyMatrix4(ibw); px = lp.x; py = lp.y; pz = lp.z; } }
      attrs.position.push(px, py, pz); attrs.normal.push(qx, qy, qz);
      for(var k = 0; k < 4; k++){ attrs.skinIndex.push(map[comp(g.attributes.skinIndex, i, k)] || 0); attrs.skinWeight.push(comp(g.attributes.skinWeight, i, k)); }
      var r = col.r, gg = col.g, b = col.b; if(vc){ r *= vc.getX(i); gg *= vc.getY(i); b *= vc.getZ(i); } if(rc && rc.c){ r = rc.c.r; gg = rc.c.g; b = rc.c.b; } attrs.color.push(r, gg, b); }
    if(g.index) for(var j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + off); else for(var j2 = 0; j2 < n; j2++) idx.push(j2 + off);
    off += n; });
  var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(attrs.position, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(attrs.normal, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(attrs.skinIndex, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(attrs.skinWeight, 4)); geo.setAttribute('color', new THREE.Float32BufferAttribute(attrs.color, 3)); geo.setIndex(idx);
  var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.0, skinning: true });
  var m = new THREE.SkinnedMesh(geo, mat); m.name = 'merged'; m.frustumCulled = false; parts[0].parent.add(m); m.bind(sk, parts[0].bindMatrix);
  parts.forEach(function(p){ p.parent.remove(p); }); return root; }
function linC(h){ return new THREE.Color(h).convertSRGBToLinear(); }
var GUNMAN = { jacket: linC('#733829'), rig: linC('#1F2522'), beanie: linC('#1C1C1C'), trousers: linC('#22252A'), boots: linC('#17181b'), beard: linC('#3a2c22'), skin: linC('#b98468'), hair: linC('#1e1712') };
var ARM = /^(Shoulder|UpperArm|LowerArm)/, LEG = /^(UpperLeg|LowerLeg|Hips)/, TORSO = /^(Abdomen|Torso|Chest|Body|Root)$/;
var rulesGunman = function(v){ var P = GUNMAN, B = v.bones;
  var hy = B.Head.y, brow = hy + 0.15 / v.unit;
  if(v.part === 'Casual2_Head_5') return v.p.y > brow ? { c: P.beanie, push: 0.004 } : { c: P.hair, push: -0.008 };
  if((v.part === 'Casual2_Head_1' || v.part === 'Casual2_Head_2') && v.p.y > brow) return { c: P.beanie, push: 0.016 };
  if(v.part === 'Casual2_Legs') return { c: P.trousers }; if(/Feet/.test(v.part)) return { c: P.boots };
  if(v.part === 'Casual2_Body_1' || (v.mat === 'Skin' && (ARM.test(v.bone) || TORSO.test(v.bone)) && v.part === 'Casual2_Body_2')){
    return { c: P.jacket, push: ARM.test(v.bone) ? 0.012 : 0.016 }; }
  if(v.part === 'Casual2_Body_2' && LEG.test(v.bone)) return { c: P.trousers };
  if(v.part === 'Casual2_Head_1'){ var low = v.p.y < hy + 0.035 / v.unit, front2 = v.n.z > 0.1; if(low && front2) return { c: P.skin.clone().lerp(P.beard, 0.55) }; return { c: P.skin }; }
  if(v.mat === 'Skin') return { c: P.skin };
  return null; };
function addRim(m, k){ m.onBeforeCompile = function(sh){ sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n float frO = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); reflectedLight.directDiffuse += vec3(0.42, 0.48, 0.56) * pow(frO, 3.0) * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = function(){ return 'opusRim' + k; }; m.needsUpdate = true; }
function splitClip(c, lowerRe, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? lowerRe.test(b) : !lowerRe.test(b); }); return x; }
// ---- OPUS Ex1+ : Ex1 improved — the spec gunman reskin, one merged mesh, rim, gun-carry upper body (his leaders.js, verbatim but for slot/label)
function buildEx1Plus(gunman, clips){
  var fig = THREE.SkeletonUtils.clone(gunman.scene);
  fig.traverse(function(o){ if(o.isMesh){ o.material = o.material.clone(); } });
  mergeSkinned(fig, rulesGunman);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false; if(o.material && o.material.isMeshStandardMaterial){ if(o.name === 'merged') o.material.roughness = 0.78; addRim(o.material, 0.55); } } });
  var LOW = /^(Root|Body|Hips|UpperLeg|LowerLeg|Foot|PT)/;
  var legs = splitClip(clips.Walk, LOW, true, 'LegsWalk'), up = splitClip(clips.Idle_Gun || clips.Idle_Gun_Pointing, LOW, false, 'UpCarry');
  var m = makeMover(fig, 1.81, legs, 1.30, 'E1+', true, 12); m.mixer.clipAction(up).play();
}
// ---- generic FK foot-locked mocap retarget (his leaders.js, verbatim)
var CMU2VALID = { Hips: 'Hips', LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot', RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot' };
function retargetFK(text, rigSrc, MAP){ var res = new THREE.BVHLoader().parse(text), sk = res.skeleton, root = sk.bones[0], holder = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()); holder.add(root); holder.bind(sk);
  var mx = new THREE.AnimationMixer(holder); mx.clipAction(res.clip).play(); var S = {}; sk.bones.forEach(function(b){ S[b.name] = b; });
  var fps = 1 / (res.clip.tracks[0].times[1] - res.clip.tracks[0].times[0]), N = Math.floor(res.clip.duration * fps);
  function sample(t){ mx.setTime(t); holder.updateMatrixWorld(true); var o = {}; Object.keys(MAP).forEach(function(n){ o[n] = S[n].getWorldQuaternion(new QT()); });
    o.hip = S.Hips.getWorldPosition(new V3()); o.lf = S.LeftFoot.getWorldPosition(new V3()); o.rf = S.RightFoot.getWorldPosition(new V3()); o.lh = S.LeftUpLeg.getWorldPosition(new V3()); o.rh = S.RightUpLeg.getWorldPosition(new V3()); return o; }
  var rest = sample(0), legSrc = S.LeftLeg.position.length() + S.LeftFoot.position.length();
  var rig = THREE.SkeletonUtils.clone(rigSrc), rb = {}, ord = []; rig.traverse(function(o){ if(o.isBone){ rb[o.name] = o; ord.push(o); } }); rig.updateMatrixWorld(true);
  var restP = {}, restQ = {}, tRestW = {}; ord.forEach(function(b){ restP[b.name] = b.position.clone(); restQ[b.name] = b.quaternion.clone(); tRestW[b.name] = b.getWorldQuaternion(new QT()); });
  var W = function(n){ return rb[n].getWorldPosition(new V3()); }, lenA = { L: W('LeftUpLeg').distanceTo(W('LeftLeg')), R: W('RightUpLeg').distanceTo(W('RightLeg')) }, lenB = { L: W('LeftLeg').distanceTo(W('LeftFoot')), R: W('RightLeg').distanceTo(W('RightFoot')) };
  var scale = (lenA.L + lenB.L) / legSrc, hipsRestW = W('Hips'), restFootY = W('LeftFoot').y;
  var frames = []; for(var i = Math.floor(0.3 * fps); i < N; i++) frames.push(sample(i / fps));
  var a0 = frames[0].hip, z0 = frames[frames.length - 1].hip, head = Math.atan2(z0.x - a0.x, z0.z - a0.z), unYaw = new QT().setFromAxisAngle(new V3(0, 1, 0), -head), fwd = new V3(Math.sin(head), 0, Math.cos(head));
  var raw = frames.map(function(f){ return f.lf.clone().sub(f.hip).dot(fwd); }), Wn = Math.round(fps * 0.05), lead = raw.map(function(_, k){ var s0 = 0, n0 = 0; for(var j = k - Wn; j <= k + Wn; j++) if(j >= 0 && j < raw.length){ s0 += raw[j]; n0++; } return s0 / n0; });
  var R = Math.round(fps * 0.35), peaks = []; for(var k = R; k < lead.length - R; k++){ var ok = true; for(var j = k - R; j <= k + R; j++) if(lead[j] > lead[k]){ ok = false; break; } if(ok && (!peaks.length || k - peaks[peaks.length - 1] > R)) peaks.push(k); }
  var best = null; for(var p = 0; p + 1 < peaks.length; p++){ var A0 = frames[peaks[p]], B0 = frames[peaks[p + 1]], err = 0; Object.keys(MAP).forEach(function(n){ err += 1 - Math.abs(A0[n].dot(B0[n])); }); if(!best || err < best.err) best = { s: peaks[p], e: peaks[p + 1], err: err }; }
  var cyc = frames.slice(best.s, best.e + 1), dur = (cyc.length - 1) / fps, dist = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).dot(fwd), hipMean = 0; cyc.forEach(function(f){ hipMean += f.hip.y; }); hipMean /= cyc.length;
  var latEnd = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw).x;
  function swing(b, c, d){ var q = new QT().setFromUnitVectors(c.clone().normalize(), d.clone().normalize()), w = b.getWorldQuaternion(new QT()).premultiply(q); b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new QT()).invert().multiply(w)); b.updateMatrixWorld(true); }
  var srcOf = {}; Object.keys(MAP).forEach(function(s0){ srcOf[MAP[s0]] = s0; });
  var ground = 0, footMin = Infinity, step = Math.max(1, Math.round(fps / 30)), out = null;
  for(var pass = 0; pass < 2; pass++){ var times = [], qT = {}, hp = []; Object.keys(srcOf).forEach(function(n){ qT[n] = []; });
    for(var c = 0; c < cyc.length; c += step){ var f = cyc[c]; times.push(c / fps); ord.forEach(function(b){ b.position.copy(restP[b.name]); b.quaternion.copy(restQ[b.name]); }); rig.updateMatrixWorld(true);
      var off = f.hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw), hw = hipsRestW.clone().add(new V3((off.x - latEnd * c / (cyc.length - 1)) * scale, (f.hip.y - hipMean) * scale - ground, 0));
      rb.Hips.parent.updateWorldMatrix(true, false); rb.Hips.position.copy(rb.Hips.parent.worldToLocal(hw)); rb.Hips.updateMatrixWorld(true);
      ord.forEach(function(b){ var s0 = srcOf[b.name]; if(!s0) return; var w = f[s0].clone().multiply(rest[s0].clone().invert()).premultiply(unYaw).multiply(tRestW[b.name]);
        b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new QT()).invert().multiply(w)); b.updateMatrixWorld(true); });
      [['L', 'Left', 'lf', 'lh'], ['R', 'Right', 'rf', 'rh']].forEach(function(sd){ var th = rb[sd[1] + 'UpLeg'], sh = rb[sd[1] + 'Leg'], ft = rb[sd[1] + 'Foot'];
        var H = th.getWorldPosition(new V3()), A = H.clone().add(f[sd[2]].clone().sub(f[sd[3]]).applyQuaternion(unYaw).multiplyScalar(scale)), K0 = sh.getWorldPosition(new V3()), a = lenA[sd[0]], bl = lenB[sd[0]];
        var dv = A.clone().sub(H), d = Math.min(dv.length(), (a + bl) * 0.999), u = dv.normalize(); A = H.clone().addScaledVector(u, d);
        var x = (a * a - bl * bl + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x)), pole = K0.clone().sub(H); pole.addScaledVector(u, -pole.dot(u)); if(pole.lengthSq() < 1e-10) pole.set(0, 0, 1); pole.normalize();
        var K = H.clone().addScaledVector(u, x).addScaledVector(pole, hh); swing(th, K0.clone().sub(H), K.clone().sub(H)); swing(sh, ft.getWorldPosition(new V3()).sub(K), A.clone().sub(K)); footMin = Math.min(footMin, ft.getWorldPosition(new V3()).y);
        var fw = f[sd[1] + 'Foot'].clone().multiply(rest[sd[1] + 'Foot'].clone().invert()).premultiply(unYaw).multiply(tRestW[sd[1] + 'Foot']); ft.parent.updateWorldMatrix(true, false); ft.quaternion.copy(ft.parent.getWorldQuaternion(new QT()).invert().multiply(fw)); ft.updateMatrixWorld(true); });
      Object.keys(qT).forEach(function(n){ var q = rb[n].quaternion; qT[n].push(q.x, q.y, q.z, q.w); }); var hpp = rb.Hips.position; hp.push(hpp.x, hpp.y, hpp.z); }
    if(pass === 0){ ground = footMin - restFootY; footMin = Infinity; continue; }
    var tracks = [new THREE.VectorKeyframeTrack('Hips.position', times, hp)]; Object.keys(qT).forEach(function(n){ tracks.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', times, qT[n])); });
    out = new THREE.AnimationClip('CMUWalk', times[times.length - 1], tracks); out.userData = { speedModelPerSec: dist * scale / dur, legModel: lenA.L + lenB.L, cycle: +dur.toFixed(3), loopErr: +best.err.toFixed(4), ground: ground }; }
  return out; }
// ---- OPUS N2+ : N2 improved — Neon's body + dressing kept; legs = CMU mocap foot-locked onto his rig; upper body = UAL Pistol_Idle
//      (his leaders.js, verbatim but for the BVH path and slot/label)
function OPUS_N2P(mode, gltf){ fetch(OPUS_BVH_URL).then(function(r){ return r.text(); }).then(function(text){
    var rigSrc = THREE.SkeletonUtils.clone(gltf.scene), walk = retargetFK(text, rigSrc, CMU2VALID), clips = clipLookup(gltf.animations);
    var LOWV = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
    var up = splitClip(clips.Pistol_Idle_Loop, LOWV, false, 'UpReady');
    var hT = walk.tracks.filter(function(t){ return t.name === 'Hips.quaternion'; })[0], iT = clips.Pistol_Idle_Loop.tracks.filter(function(t){ return /(^|\.)Hips\.quaternion$|^Hips\.quaternion/.test(t.name); })[0], sT = up.tracks.filter(function(t){ return /^Spine\.quaternion$/.test(t.name); })[0];
    if(hT && iT && sT){ var mean = new THREE.Vector4(), q0 = new QT(hT.values[0], hT.values[1], hT.values[2], hT.values[3]); for(var i = 0; i < hT.values.length; i += 4){ var q = new QT(hT.values[i], hT.values[i + 1], hT.values[i + 2], hT.values[i + 3]); if(q.dot(q0) < 0){ q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } mean.x += q.x; mean.y += q.y; mean.z += q.z; mean.w += q.w; }
      var mq = new QT(mean.x, mean.y, mean.z, mean.w).normalize(), iq = new QT(iT.values[0], iT.values[1], iT.values[2], iT.values[3]), corr = mq.clone().invert().multiply(iq); sT.values = sT.values.slice();
      for(var j = 0; j < sT.values.length; j += 4){ var sq = corr.clone().multiply(new QT(sT.values[j], sT.values[j + 1], sT.values[j + 2], sT.values[j + 3])); sT.values[j] = sq.x; sT.values[j + 1] = sq.y; sT.values[j + 2] = sq.z; sT.values[j + 3] = sq.w; }
      window.__N2P_corrDeg = +(2 * Math.acos(Math.min(1, Math.abs(corr.w))) * 57.3).toFixed(1); }
    var fig = THREE.SkeletonUtils.clone(gltf.scene); fig.traverse(function(o){ if(o.isMesh){ o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
    prepNeonMaterials(fig); fig.traverse(function(o){ if(o.isMesh){ [].concat(o.material).forEach(function(m){ if(m && m.isMeshStandardMaterial) addRim(m, 0.45); }); } });
    var sc = 1.80 / mode.fixedH, norm = new THREE.Group(); fig.scale.setScalar(sc); fig.position.y = -mode.z0 * sc; norm.add(fig);
    var m = makeMover(norm, 1.80, walk, 1, 'N2+', false, 11); m.group.updateMatrixWorld(true);
    var Bw = function(n){ var o = null; fig.traverse(function(x){ if(!o && x.isBone && x.name === n) o = x; }); return o.getWorldPosition(new V3()); };
    var legWorld = Bw('LeftUpLeg').distanceTo(Bw('LeftLeg')) + Bw('LeftLeg').distanceTo(Bw('LeftFoot')), authored = walk.userData.speedModelPerSec * legWorld / walk.userData.legModel;
    m.mixer._actions.forEach(function(ac){ if(ac.getClip() === walk) ac.timeScale = PATH_SPEED / authored; }); m.mixer.clipAction(up).play(); window.__N2P = { authored_mps: +authored.toFixed(3), meta: walk.userData };
    oneDone(); }).catch(function(e){ window.__WALKOFF_ERRORS.push('opus n2p: ' + e); failed.push('n2p'); oneDone(); }); }

// ---- OPUS Ex1..Ex5 : his shooter-entry "best five" VALID designs (adapted from his opus-valid.js;
//      per-design factory instead of his one-design-per-page globals; engine/greybox hooks dropped —
//      the figures walk this plaza's loop and aim at the follow camera, as in his showcase)
var OPUS_VALID_DESIGNS = [
  { name: 'Beanie bomber', body: 'g-Black_M_3_Casual.glb', h: 1.82, jacket: '#733829', pants: '#22252A', shoes: '#141517', hat: '#1C1C1C', rig: '#1F2522', bulk: 0.018 },
  { name: 'Hooded runner', body: 'g-White_M_2_Casual.glb', h: 1.80, jacket: '#2B2F36', pants: '#3A3F33', shoes: '#18191b', hood: true, bulk: 0.016 },
  { name: 'Field-jacket veteran', body: 'g-MENA_M_3_Casual.glb', h: 1.81, jacket: '#3D4434', pants: '#1E2024', shoes: '#2a2119', rig: '#1F2522', bulk: 0.02 },
  { name: 'Leather-jacket enforcer', body: 'g-Black_M_2_Casual.glb', h: 1.84, jacket: '#1B1A1C', pants: '#283041', shoes: '#121212', bulk: 0.014, gloss: true },
  { name: 'Windbreaker lookout', body: 'g-Hispanic_M_2_Casual.glb', h: 1.78, jacket: '#1F2B44', pants: '#2E3033', shoes: '#151618', hat: '#202226', bulk: 0.012 } ];
function ovBoneOf(root, n){ var b = null; root.traverse(function(o){ if(!b && o.isBone && o.name === n) b = o; }); return b; }
function ovCloneSkinned(src){ var c = src.clone(true), by = {}; c.traverse(function(o){ if(o.isBone) by[o.name] = o; });
  c.traverse(function(o){ if(o.isSkinnedMesh){ var sk = o.skeleton; o.bind(new THREE.Skeleton(sk.bones.map(function(b){ return by[b.name]; }), sk.boneInverses.map(function(m){ return m.clone(); })), o.bindMatrix.clone()); o.material = o.material.clone(); } });
  return c; }
var OV_REG = { jacket: 0, pants: 1, shoes: 2, hat: 3 };
function ovPrepBase(baseScene, D){ var s = baseScene; s.updateMatrixWorld(true); var body = null; s.traverse(function(o){ if(o.isSkinnedMesh && /HighRes/.test(o.name)) body = o; });
  var g = body.geometry, sk = body.skeleton, n = g.attributes.position.count, reg = new Float32Array(n * 4), v = new V3();
  var bp = {}; sk.bones.forEach(function(b){ bp[b.name] = b.getWorldPosition(new V3()); });
  var foot = Math.min(bp.LeftToeBase ? bp.LeftToeBase.y : bp.LeftFoot.y, bp.LeftFoot.y), crown = bp.HeadEnd ? bp.HeadEnd.y : bp.Head.y + 0.1 * (bp.Head.y - foot);
  var rest = { bp: bp, height: crown - foot, foot: foot };
  var neckY = bp.Neck.y, hipY = bp.Hips.y, headY = bp.Head.y;
  for(var i = 0; i < n; i++){ var bi = 0, bw = -1; for(var k = 0; k < 4; k++){ var w = comp(g.attributes.skinWeight, i, k); if(w > bw){ bw = w; bi = comp(g.attributes.skinIndex, i, k); } }
    var nm = sk.bones[bi] ? sk.bones[bi].name : ''; body.boneTransform(i, v).applyMatrix4(body.matrixWorld); var r = -1;
    if(/Spine|Shoulder|Arm$|ForeArm/.test(nm)) r = OV_REG.jacket;
    else if(nm === 'Hips') r = v.y > hipY + 0.06 * rest.height ? OV_REG.jacket : OV_REG.pants;
    else if(/UpLeg|Leg$/.test(nm)) r = OV_REG.pants; else if(/Foot|Toe/.test(nm)) r = OV_REG.shoes;
    else if(nm === 'Neck' && D.hood) r = OV_REG.jacket;
    else if(/Head/.test(nm) && (D.hat || D.hood) && v.y > headY + 0.075 * rest.height * (D.hood ? 0.8 : 1)) r = OV_REG.hat;
    if(r >= 0) reg[i * 4 + r] = 1; }
  var regionAttr = new THREE.BufferAttribute(reg, 4), lumRef = [0.3, 0.3, 0.3, 0.3];
  var map = body.material.map, img = map && map.image; if(img){ var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 256, 256); var px = cx.getImageData(0, 0, 256, 256).data, sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0], uv = g.attributes.uv;
    for(var j = 0; j < n; j += 3){ for(var r2 = 0; r2 < 4; r2++){ if(!reg[j * 4 + r2]) continue; var x = Math.min(255, Math.max(0, Math.floor(comp(uv, j, 0) * 256))), y = Math.min(255, Math.max(0, Math.floor((map.flipY ? 1 - comp(uv, j, 1) : comp(uv, j, 1)) * 256))), o = (y * 256 + x) * 4;
      var l = Math.pow((0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255, 2.2); sum[r2] += l; cnt[r2]++; } }
    for(var r3 = 0; r3 < 4; r3++) if(cnt[r3]) lumRef[r3] = Math.max(0.02, sum[r3] / cnt[r3]); }
  return { body: body, regionAttr: regionAttr, lumRef: lumRef, rest: rest }; }
function ovPrepClips(animations, hipsRest){ var clips = {};
  animations.forEach(function(c){ var hp = null; c.tracks = c.tracks.filter(function(t){ if(t.name === 'Hips.position'){ hp = t; return true; } return /\.quaternion$/.test(t.name); });
    if(hp){ var v = hp.values, n = v.length / 3, my = 0, lo = Infinity, hi = -Infinity; for(var i = 0; i < n; i++){ my += v[i * 3 + 1]; lo = Math.min(lo, v[i * 3 + 1]); hi = Math.max(hi, v[i * 3 + 1]); } my /= n;
      var k = Math.abs(hipsRest.y) > 5 && (hi - lo) < 0.5 ? 100 : 1, x0 = v[0], z0 = v[2];
      for(var j = 0; j < n; j++){ v[j * 3] = hipsRest.x + (v[j * 3] - x0) * k; v[j * 3 + 1] = hipsRest.y + (v[j * 3 + 1] - my) * k; v[j * 3 + 2] = hipsRest.z + (v[j * 3 + 2] - z0) * k * (/Death|Hit/.test(c.name) ? 1 : 0); } }
    clips[c.name] = c; });
  return clips; }
function ovFigMat(mat, D, lumRef, gn){ var tgt = [D.jacket, D.pants, D.shoes, D.hat || D.jacket].map(function(h){ return h ? linC(h) : null; });
  var U = { gJ: { value: tgt[0] || new THREE.Color(1, 1, 1) }, gP: { value: tgt[1] || new THREE.Color(1, 1, 1) }, gS: { value: tgt[2] || new THREE.Color(1, 1, 1) }, gH: { value: tgt[3] || new THREE.Color(1, 1, 1) },
    gOn: { value: new THREE.Vector4(tgt[0] ? 1 : 0, tgt[1] ? 1 : 0, tgt[2] ? 1 : 0, (D.hat || D.hood) ? 1 : 0) }, lumRef: { value: new THREE.Vector4(lumRef[0], lumRef[1], lumRef[2], lumRef[3]) }, bulk: { value: D.bulk || 0 },
    lampDir: { value: new V3(0, 1, 0) }, lampKey: { value: 0 }, lampAmb: { value: 0 }, lampBack: { value: 0 } };
  mat.onBeforeCompile = function(sh){ Object.keys(U).forEach(function(k){ sh.uniforms[k] = U[k]; });
    sh.vertexShader = 'attribute vec4 region; varying vec4 vRegion; uniform float bulk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRegion = region; transformed += objectNormal * bulk * (region.x + region.w * 0.6) * 100.0;');
    sh.fragmentShader = 'varying vec4 vRegion; uniform vec3 gJ, gP, gS, gH; uniform vec4 gOn, lumRef; uniform vec3 lampDir; uniform float lampKey, lampAmb, lampBack;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n { float lu = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); vec4 w = vRegion * gOn;' +
        ' diffuseColor.rgb = mix(diffuseColor.rgb, gJ * clamp(pow(lu / lumRef.x, 0.55), 0.55, 1.35), w.x); diffuseColor.rgb = mix(diffuseColor.rgb, gP * clamp(pow(lu / lumRef.y, 0.55), 0.55, 1.35), w.y);' +
        ' diffuseColor.rgb = mix(diffuseColor.rgb, gS * clamp(pow(lu / lumRef.z, 0.55), 0.55, 1.35), w.z); diffuseColor.rgb = mix(diffuseColor.rgb, gH * clamp(lu / max(lumRef.w, 0.05), 0.5, 1.4), w.w); }')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n float lk = max(dot(normal, lampDir), 0.0); reflectedLight.directDiffuse += diffuseColor.rgb * lampKey * lk; reflectedLight.indirectDiffuse += diffuseColor.rgb * lampAmb;\n' +
        ' float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); reflectedLight.directDiffuse += vec3(0.30, 0.34, 0.38) * pow(fr, 3.0) * (0.25 + lampBack) * (0.4 + lampKey);'); };
  mat.customProgramCacheKey = function(){ return 'opusValidW' + gn; }; if(D.gloss){ mat.roughness = 0.55; } mat.userData.U = U; return mat; }
var _ovLd = new V3(), _ovTc = new V3();
function ovLampTerms(fig){ var U = fig.U; if(!U) return; var Ls = (window.HEPAINT && window.HEPAINT.lights) || [], p = fig.root.getWorldPosition(_ovTc.set(0, 0, 0)), indoor = !(window.HEPAINT && window.HEPAINT.indoor === false), sum = 0, dx = 0, dy = 0, dz = 0;
  if(indoor) for(var i = 0; i < Ls.length; i++){ var l = Ls[i], ex = l.x - p.x, ez = l.z - p.z, ey = l.y - p.y; if(ey < 0 || ey > 4.5) continue; var d2 = ex * ex + ez * ez; if(d2 > 81) continue; var k = 1 / (1 + d2 / 4); sum += k; dx += ex * k; dy += ey * k; dz += ez * k; }
  if(!indoor){ sum = 0.6; dx = -0.4; dy = 1; dz = 0.3; } _ovLd.set(dx, dy, dz); if(_ovLd.lengthSq() < 1e-6) _ovLd.set(0, 1, 0); _ovLd.normalize();
  var back = Math.max(0, -_ovLd.dot(_ovTc.copy(camera.position).sub(p).setY(0).normalize())); _ovLd.transformDirection(camera.matrixWorldInverse);
  U.lampDir.value.copy(_ovLd); U.lampKey.value = 0.5 * Math.min(1.4, sum); U.lampAmb.value = 0.16 + 0.1 * Math.min(1.4, sum); U.lampBack.value = back; }
function ovPistol(){ var g = new THREE.Group(), m1 = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.45, metalness: 0.6 }), m2 = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 });
  var box = function(w, h, d, m, x, y, z, rx){ var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if(rx) b.rotation.x = rx; g.add(b); return b; };
  box(0.03, 0.032, 0.19, m1, 0, 0.026, 0.05); box(0.028, 0.11, 0.045, m2, 0, -0.03, -0.01, -0.28); box(0.026, 0.02, 0.07, m2, 0, 0.0, 0.04);
  var geos = []; g.children.forEach(function(c){ c.updateMatrix(); var gg = c.geometry.clone().applyMatrix4(c.matrix).toNonIndexed(), col = c.material === m1 ? [0.009, 0.0095, 0.011] : [0.004, 0.004, 0.0045], cs = []; for(var i = 0; i < gg.attributes.position.count; i++) cs.push(col[0], col[1], col[2]); gg.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3)); geos.push(gg); });
  var pos = [], nor = [], cl = []; geos.forEach(function(gg){ pos.push.apply(pos, gg.attributes.position.array); nor.push.apply(nor, gg.attributes.normal.array); cl.push.apply(cl, gg.attributes.color.array); });
  var mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
  var one = new THREE.Group(); one.add(new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 }))); return one; }
function ovSeatPistol(fig){ var m = fig.model, h = ovBoneOf(m, 'RightHand'), mid = ovBoneOf(m, 'RightHandMiddle1'), ix = ovBoneOf(m, 'RightHandIndex1'), pk = ovBoneOf(m, 'RightHandPinky1'); if(!h || !mid) return;
  m.updateMatrixWorld(true); var H = h.getWorldPosition(new V3()), M = mid.getWorldPosition(new V3()), I = ix.getWorldPosition(new V3()), P = pk.getWorldPosition(new V3());
  var fwd = M.clone().sub(H).normalize(), across = I.clone().sub(P).normalize(), palm = new V3().crossVectors(fwd, across).normalize();
  var gp = ovPistol(), basis = new THREE.Matrix4().makeBasis(new V3().crossVectors(palm.clone().negate(), fwd).normalize(), palm.clone().negate(), fwd);
  gp.quaternion.setFromRotationMatrix(basis); gp.position.copy(H.clone().lerp(M, 0.55).addScaledVector(palm, 0.035)); gp.updateMatrixWorld(true); h.attach(gp); fig.gun = gp; }
var OV_LOWER = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
function ovSub(c, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? OV_LOWER.test(b) : !OV_LOWER.test(b); }); return x; }
function ovFootPoints(baseScene, ctx){ var out = {}, b = ctx.body, g = b.geometry, sk = b.skeleton, v = new V3(); baseScene.updateMatrixWorld(true); sk.update();
  ['Left', 'Right'].forEach(function(sd){ var ids = sk.bones.map(function(x, i){ return /Foot|Toe/.test(x.name) && x.name.indexOf(sd) === 0 ? i : -1; }).filter(function(i){ return i >= 0; }), pts = [];
    for(var i = 0; i < g.attributes.position.count; i++){ var w = 0; for(var k = 0; k < 4; k++) if(ids.indexOf(comp(g.attributes.skinIndex, i, k)) >= 0) w += comp(g.attributes.skinWeight, i, k); if(w > 0.5){ pts.push(b.boneTransform(i, v.set(0, 0, 0)).applyMatrix4(b.matrixWorld).clone()); } }
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); }); var sole = pts.filter(function(p){ return p.y < ymin + 0.03 * ctx.rest.height; });
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; }), fb = ovBoneOf(baseScene, sd + 'Foot');
    out[sd] = { heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()) }; });
  return out; }
function ovContactPace(baseScene, ctx, clips, D){ var m = ovCloneSkinned(baseScene), mx = new THREE.AnimationMixer(m), fp = ovFootPoints(baseScene, ctx), N = 240, H = [], clip = clips.Walk_Loop; mx.clipAction(clip).play();
  ['Left', 'Right'].forEach(function(sd){ var b = ovBoneOf(m, sd + 'Foot'); ['heel', 'toe'].forEach(function(k){ H.push({ b: b, off: fp[sd][k], P: [] }); }); });
  var k = D.h / ctx.rest.height; for(var i = 0; i <= N; i++){ mx.setTime(clip.duration * i / N); m.updateMatrixWorld(true); H.forEach(function(h){ h.P.push(h.b.localToWorld(h.off.clone()).multiplyScalar(k)); }); }
  var vv = []; H.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); }); for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01) vv.push(-(h.P[i].z - h.P[i - 1].z) / (clip.duration / N)); });
  vv.sort(function(a, b){ return a - b; }); return vv.length ? vv[vv.length >> 1] : 1.1; }
function ovMakeFigure(baseScene, ctx, clips, D, gn){ var model = ovCloneSkinned(baseScene), root = new THREE.Group(); root.name = 'opusFig'; root.add(model); root.scale.setScalar(D.h / ctx.rest.height); model.position.y = -ctx.rest.foot;
  var fig = { root: root, model: model, mixer: new THREE.AnimationMixer(model), actions: {}, layers: { low: null, up: null }, twist: 0, pace: 0 };
  model.traverse(function(o){ if(o.isSkinnedMesh){ o.frustumCulled = false; if(/HighRes/.test(o.name)){ o.geometry = o.geometry.clone(); o.geometry.setAttribute('region', ctx.regionAttr); o.material = ovFigMat(o.material, D, ctx.lumRef, gn); fig.U = o.material.userData.U; } } });
  var C = { LegsWalk: ovSub(clips.Walk_Loop, true, 'LegsWalk'), LegsIdle: ovSub(clips.Pistol_Idle_Loop, true, 'LegsIdle'), UpAim: ovSub(clips.Pistol_Aim_Neutral, false, 'UpAim'), UpFire: ovSub(clips.Pistol_Shoot, false, 'UpFire'),
    UpCarry: ovSub(clips.Pistol_Idle_Loop, false, 'UpCarry'), Death: clips.Death01, Hit: clips.Hit_Chest };
  Object.keys(C).forEach(function(n){ if(!C[n]) return; var a = fig.mixer.clipAction(C[n]); a.setLoop(/UpFire|Death|Hit/.test(n) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = /UpFire|Death|Hit/.test(n); fig.actions[n] = a; });
  fig.spine = ['Spine', 'Spine1', 'Spine2'].map(function(n){ return ovBoneOf(model, n); }); fig.armR = [ovBoneOf(model, 'RightArm'), ovBoneOf(model, 'RightHand')];
  ovSeatPistol(fig); return fig; }
// True world-space yaw for a bone. three@0.128's rotateOnWorldAxis() only premultiplies
// the LOCAL quaternion by the axis-angle — it never converts the axis into the bone's
// parent frame — so on a posed spine bone the "yaw" came out as pitch and folded the
// torso forward as the aim twist grew (the SIDE-view "falling over"). Conjugating by the
// parent's world quaternion (parent^-1 * yaw * parent) makes it a pure world-Y turn.
var _twQ = new QT(), _twP = new QT(), _twD = new QT(), _twUp = new V3(0, 1, 0);
function ovTwistBone(b, a){
  b.parent.getWorldQuaternion(_twP);
  _twQ.setFromAxisAngle(_twUp, a);
  _twD.copy(_twP).invert().multiply(_twQ).multiply(_twP);
  b.quaternion.premultiply(_twD);
}
function ovLay(f, slot, name, fade){ var cur = f.layers[slot]; if(cur === name) return; var a = f.actions[name]; if(!a) return; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if(cur && f.actions[cur]) a.crossFadeFrom(f.actions[cur], fade, false); f.layers[slot] = name; }
function ovDrive(f, dt){   // his drive(), plaza edition: always moving at PATH_SPEED, aiming at the camera, never firing
  ovLay(f, 'low', 'LegsWalk', 0.2); if(f.actions.LegsWalk) f.actions.LegsWalk.timeScale = PATH_SPEED / f.pace;
  if(!(f.layers.up === 'UpFire' && f.actions.UpFire && f.actions.UpFire.isRunning())) ovLay(f, 'up', 'UpAim', 0.25);
  f.mixer.update(dt);
  f.model.updateMatrixWorld(true); var sh = f.armR[0].getWorldPosition(new V3()), ad = f.armR[1].getWorldPosition(new V3()).sub(sh); ad.y = 0;
  if(ad.lengthSq() > 1e-8){ ad.normalize(); var to = camera.position.clone().sub(sh); to.y = 0;
    if(to.lengthSq() > 1e-8){ to.normalize(); var want = Math.max(-1.4, Math.min(1.4, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); f.twist += (want - f.twist) * Math.min(1, dt * 8); } }
  if(Math.abs(f.twist) > 1e-3) f.spine.forEach(function(b){ if(b) ovTwistBone(b, f.twist / 3); });
  ovLampTerms(f); }
function makeOpusMover(fig, D, label, slot){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / D.h); wrap.add(fig.root);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, false); tag.position.y = 0.03; group.add(tag);
  scene.add(group);
  var m = { group: group, mixer: { update: function(dt){ ovDrive(fig, dt); } }, s: slot * PATH.length / movers.length, yaw: 0, label: label, tag: tag };
  movers[slot] = m; return m; }
function buildOpusValid(D, gn, slot){
  var loader = new THREE.GLTFLoader();
  function load(f){ return new Promise(function(res, rej){ loader.load(OPUS_VALID_DIR + f, res, undefined, rej); }); }
  Promise.all([load(D.body), load('ual-clips.glb')]).then(function(r){
    var ctx = ovPrepBase(r[0].scene, D);
    var clips = ovPrepClips(r[1].animations, ovBoneOf(r[0].scene, 'Hips').position.clone());
    var fig = ovMakeFigure(r[0].scene, ctx, clips, D, gn);
    fig.pace = ovContactPace(r[0].scene, ctx, clips, D);
    window.__OPUS_VALID_PACE = window.__OPUS_VALID_PACE || {}; window.__OPUS_VALID_PACE['ex' + gn] = +fig.pace.toFixed(3);
    makeOpusMover(fig, D, 'O' + gn, slot);
    oneDone();
  }).catch(function(e){ window.__WALKOFF_ERRORS.push('opus ex' + gn + ': ' + e); failed.push('opus-ex' + gn); oneDone(); }); }
withLoaders(function(){ OPUS_VALID_DESIGNS.forEach(function(D, i){ buildOpusValid(D, i + 1, 6 + i); }); });   // deferred: the loader scripts may still be in flight when this block is parsed


// ================================================================== OPUS C RESTORATION (Nov 24)
// Opus's ORIGINAL bake-off entries, recovered from games/hospital-escape-3d-sample-opus/
// opus-cast.js + ex-extra.js at commit 52cb2007 — the last state before 93b1ca96 replaced
// them on his entry pages with the VALID five (slots 6-10 above). The two files were never
// deleted (byte-identical on main today); only his pages stopped loading them. The ports
// follow the VALID port's pattern above: engine/greybox hooks dropped, the figures walk
// this plaza's loop at PATH_SPEED, C4 aims at the follow camera. Final versions, per his
// make-pages.py version table (Ex1 v6, Ex2 v4, Ex3 v2, Ex4 v2):
//   slot 13  C1 = Ex1 v6 — BUILD.c { merge, lamp, rulesGunman }, full-body C Walk @ 1.30
//   slot 14  C2 = Ex2 v4 — CMU 35_02 mocap rest-delta retarget onto C (foot-locked IK,
//            sway 1), pace = retarget root speed x (1.77/1.81): his prep's own v4 choice
//   slot 15  C3 = Ex3 v2 — BUILD.c + his shape row (stocky, 1.82 m), C Walk @ 1.30
//   slot 16  C4 = Ex4 v2 — combat locomotion: C Walk legs + Idle_Gun_Pointing aim layer,
//            spine twist via ovTwistBone (the fixed world-yaw of 03897b05; the original's
//            rotateOnWorldAxis is the bug that fix removed — not reintroduced here)
//   NOT restored: Ex5, the combination figure — Cherie's verdict: Ex5 stays out.
//   Also omitted, deliberately: his addProxies() hit capsules — invisible raycast proxies
//   for the game's combat; nothing visible. Everything you can see is restored.
var OPUS_MOCAP_URL = '../hospital-escape-3d-sample-opus/mocap/35_02.bvh';
var C_LOWER = /^(Root|Body|Hips|UpperLeg|LowerLeg|Foot|PT)/;
function cCloneSkinned(src){ var c = src.clone(true), byName = {}; c.traverse(function(o){ if(o.isBone) byName[o.name] = o; });
  c.traverse(function(o){ if(o.isSkinnedMesh){ var sk = o.skeleton, bones = sk.bones.map(function(b){ return byName[b.name]; });
    o.bind(new THREE.Skeleton(bones, sk.boneInverses.map(function(m){ return m.clone(); })), o.bindMatrix.clone()); o.material = o.material.clone(); } });
  return c; }
// his O.rulesShape, verbatim but for the V3 alias: parametric re-proportioning layered over the colour rules
function cRulesShape(P, colour){ colour = colour || rulesGunman; return function(v){ var rc = colour(v) || {}, B = v.bones, push = rc.push || 0, sh = null, x = v.p.x;
  var torso = /^(Abdomen|Torso|Chest|Body|Hips)$/.test(v.bone), arm = /^(Shoulder|UpperArm)/.test(v.bone), skinPart = /Body|Legs/.test(v.part);
  if(skinPart && torso && v.p.y > B.Hips.y){ push += P.girth || 0; if(P.belly && v.n.z > 0.3 && v.p.y < B.Chest.y) push += P.belly * v.n.z; }
  if(skinPart && (arm || (v.bone === 'Chest' && Math.abs(x) > 0.12))){ push += P.shoulders || 0; var side = x > 0 ? 1 : -1; sh = new V3(side * (P.shoulderWidth || 0), 0, 0); }
  if(skinPart && v.bone === 'Neck') push += P.neck || 0;
  if(skinPart && /^LowerArm/.test(v.bone)) push += P.forearm || 0;
  if(skinPart && /^UpperLeg/.test(v.bone)) push += P.thigh || 0;
  rc.push = push; if(sh) rc.shift = sh; return rc; }; }
// his lampMat / lampTerms, verbatim but for names + this page's camera (no HEPAINT here:
// the lamp sum stays 0 and only the ambient term lands — same fallback the VALID figures get)
function cLampMat(mat){ var U = { lampDir: { value: new V3(0, 1, 0) }, lampKey: { value: 0 }, lampAmb: { value: 0 }, lampBack: { value: 0 }, rimCol: { value: new THREE.Color(0.32, 0.36, 0.4) } };
  mat.onBeforeCompile = function(sh){ Object.keys(U).forEach(function(k){ sh.uniforms[k] = U[k]; });
    sh.fragmentShader = 'uniform vec3 lampDir; uniform float lampKey, lampAmb, lampBack; uniform vec3 rimCol;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\n float lk = max(dot(normal, lampDir), 0.0); reflectedLight.directDiffuse += diffuseColor.rgb * lampKey * lk;\n' +
      ' reflectedLight.indirectDiffuse += diffuseColor.rgb * lampAmb;\n float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\n' +
      ' reflectedLight.directDiffuse += rimCol * pow(fr, 3.0) * (0.25 + lampBack) * (0.4 + lampKey);'); };
  mat.customProgramCacheKey = function(){ return 'opusLampC'; }; mat.userData.lamp = U; return mat; }
var _cLd = new V3(), _cTc = new V3();
function cLampTerms(fig){ var U = fig.lampU; if(!U) return; var L = (window.HEPAINT && window.HEPAINT.lights) || [], p = fig.root.getWorldPosition(_cTc.set(0, 0, 0)), indoor = !(window.HEPAINT && window.HEPAINT.indoor === false);
  var sum = 0, dx = 0, dy = 0, dz = 0; if(indoor) for(var i = 0; i < L.length; i++){ var l = L[i], ex = l.x - p.x, ez = l.z - p.z, ey = l.y - p.y; if(ey < 0 || ey > 4.5) continue; var d2 = ex * ex + ez * ez; if(d2 > 81) continue;
    var k = 1 / (1 + d2 / 4.0); sum += k; dx += ex * k; dy += ey * k; dz += ez * k; }
  if(!indoor){ sum = 0.6; dx = -0.4; dy = 1; dz = 0.3; }
  _cLd.set(dx, dy, dz); if(_cLd.lengthSq() < 1e-6) _cLd.set(0, 1, 0); _cLd.normalize(); var back = Math.max(0, -_cLd.dot(_cTc.copy(camera.position).sub(p).setY(0).normalize()));
  _cLd.transformDirection(camera.matrixWorldInverse); U.lampDir.value.copy(_cLd); U.lampKey.value = 0.55 * Math.min(1.4, sum); U.lampAmb.value = 0.18 + 0.12 * Math.min(1.4, sum); U.lampBack.value = back; }
// his BUILD.c, verbatim but for the gunman source (the parsed chunks in game/, same asset his pages loaded)
function cBuild(g, opt){ var model = cCloneSkinned(g.scene), wrap = new THREE.Group(); wrap.name = 'opusFig'; model.scale.setScalar((opt.height || 1.77) / 1.81); wrap.add(model);
  var fig = { root: wrap, model: model, mixer: new THREE.AnimationMixer(model), actions: {}, lampU: null };
  var clipMap = opt.clips || clipLookup(g.animations);
  Object.keys(clipMap).forEach(function(n){ if(clipMap[n]) fig.actions[n] = fig.mixer.clipAction(clipMap[n]); });
  if(opt.merge) mergeSkinned(model, opt.rules || null);
  if(opt.lamp){ model.traverse(function(o){ if(o.isSkinnedMesh){ o.material = cLampMat(o.material.clone ? o.material.clone() : o.material); if(!fig.lampU) fig.lampU = o.material.userData.lamp; } }); }
  model.traverse(function(o){ if(o.isMesh) o.frustumCulled = false; });
  return fig; }
function makeCMover(fig, height, label, slot, updateFn){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig.root);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, false); tag.position.y = 0.03; group.add(tag);
  scene.add(group);
  var m = { group: group, mixer: { update: updateFn }, s: slot * PATH.length / movers.length, yaw: 0, label: label, tag: tag };
  movers[slot] = m; return m; }
function cPlayWalk(fig, pace){ var a = fig.actions.Walk; if(a){ a.timeScale = PATH_SPEED / pace; a.play(); } }
function buildC1(g){ var fig = cBuild(g, { merge: true, lamp: true, rules: rulesGunman }); cPlayWalk(fig, 1.30);
  makeCMover(fig, 1.77, 'C1', 13, function(dt){ fig.mixer.update(dt); cLampTerms(fig); }); }
function buildC3(g){ var fig = cBuild(g, { merge: true, lamp: true, height: 1.82, rules: cRulesShape({ girth: 0.032, belly: 0.025, shoulders: 0.03, shoulderWidth: 0.022, neck: 0.018, forearm: 0.008, thigh: 0.012 }) }); cPlayWalk(fig, 1.30);
  makeCMover(fig, 1.82, 'C3', 15, function(dt){ fig.mixer.update(dt); cLampTerms(fig); }); }
// ---- C4: his BUILD.combat with C legs (Ex4 v2), plaza drive: always walking, always aiming at the camera
function cLay(fig, slot, name, fade){ var cur = fig.layers[slot]; if(cur === name) return; var a = fig.actions[name]; if(!a) return; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if(cur && fig.actions[cur]) a.crossFadeFrom(fig.actions[cur], fade, false); fig.layers[slot] = name; }
function cDriveCombat(fig, dt){
  cLay(fig, 'low', 'LegsWalk', 0.2); if(fig.actions.LegsWalk) fig.actions.LegsWalk.timeScale = PATH_SPEED / 1.30;
  cLay(fig, 'up', 'UpAim', 0.25);
  fig.mixer.update(dt);
  fig.model.updateMatrixWorld(true);
  var sh = fig.armR[0] ? fig.armR[0].getWorldPosition(new V3()) : null, wr = fig.armR[1] ? fig.armR[1].getWorldPosition(new V3()) : null;
  if(sh && wr){ var ad = wr.sub(sh); ad.y = 0;
    if(ad.lengthSq() > 1e-8){ ad.normalize(); var to = camera.position.clone().sub(sh); to.y = 0;
      if(to.lengthSq() > 1e-8){ to.normalize(); var want = Math.max(-1.4, Math.min(1.4, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); fig.twist += (want - fig.twist) * Math.min(1, dt * 8); } } }
  if(Math.abs(fig.twist) > 1e-3) fig.spine.forEach(function(b){ if(b) ovTwistBone(b, fig.twist / 3); });
  cLampTerms(fig); }
function buildC4(g){ var C = clipLookup(g.animations);
  var clips = { LegsWalk: splitClip(C.Walk, C_LOWER, true, 'LegsWalk'), LegsIdle: splitClip(C.Idle_Gun || C.Idle_Gun_Pointing, C_LOWER, true, 'LegsIdle'), UpAim: splitClip(C.Idle_Gun_Pointing, C_LOWER, false, 'UpAim'), UpFire: splitClip(C.Gun_Shoot, C_LOWER, false, 'UpFire'),
    UpCarry: splitClip(C.Walk, C_LOWER, false, 'UpCarry') };
  if(C.Death) clips.Death = C.Death; if(C.HitRecieve) clips.HitRecieve = C.HitRecieve;
  var fig = cBuild(g, { merge: true, lamp: true, rules: rulesGunman, clips: clips });
  fig.spine = ['Abdomen', 'Torso', 'Chest'].map(function(n){ return findBone(fig.model, n); });
  fig.armR = [findBone(fig.model, 'UpperArmR'), findBone(fig.model, 'WristR')];
  fig.twist = 0; fig.layers = { low: null, up: null };
  ['LegsWalk', 'LegsIdle', 'UpAim', 'UpFire', 'UpCarry'].forEach(function(n){ var a = fig.actions[n]; if(a){ a.setLoop(n === 'UpFire' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = n === 'UpFire'; } });
  makeCMover(fig, 1.77, 'C4', 16, function(dt){ cDriveCombat(fig, dt); }); }
// ---- C2: his Ex2 v4 — the CMU retarget below is his O.retarget from ex-extra.js, extracted
// verbatim (only the name and its two rig references changed); pace rule is his prep's v4 line
function cRetarget(bvhText, rigScene, opt){ opt = opt || {}; var res = new THREE.BVHLoader().parse(bvhText), sk = res.skeleton, clip = res.clip, root = sk.bones[0];
  var holder = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()); holder.add(root); holder.bind(sk);   // BVH tracks bind as .bones[Name]: they need a skinned mesh
  var mixer = new THREE.AnimationMixer(holder); mixer.clipAction(clip).play(); var src = {}; sk.bones.forEach(function(b){ src[b.name] = b; });
  var fps = 1 / (clip.tracks[0].times[1] - clip.tracks[0].times[0]), N = Math.floor(clip.duration * fps);
  function sample(t){ mixer.setTime(t); holder.updateMatrixWorld(true); var o = {}; Object.keys(MAP).forEach(function(n){ var b = src[n]; if(b) o[n] = b.getWorldQuaternion(new Qt()); });
    o.hip = src.Hips.getWorldPosition(new V()); o.lf = src.LeftFoot.getWorldPosition(new V()); o.rf = src.RightFoot.getWorldPosition(new V()); o.lh = src.LeftUpLeg.getWorldPosition(new V()); o.rh = src.RightUpLeg.getWorldPosition(new V()); return o; }
  var rest = sample(0), legSrc = src.LeftLeg.position.length() + src.LeftFoot.position.length();
  // target rest (model space): world quats of every bone at its rest local rotation
  var T = rigScene, tb = {}, order = []; T.traverse(function(o){ if(o.isBone){ tb[o.name] = o; order.push(o); } }); T.updateMatrixWorld(true);
  // rest rotations in MODEL space, including the armature node above the first bone (glTF exports often carry a rotation/scale there)
  var tRestW = {}, tRestL = {}, armQ = new Qt(), armS = new V(); order.forEach(function(b){ tRestL[b.name] = b.quaternion.clone(); tRestW[b.name] = b.getWorldQuaternion(new Qt()); });
  tb.Hips.parent.getWorldQuaternion(armQ); tb.Hips.parent.getWorldScale(armS);
  var wp = function(n){ return tb[n].getWorldPosition(new V()); }, legTgt = wp('UpperLegL').distanceTo(wp('LowerLegL')) + wp('LowerLegL').distanceTo(wp('FootL')), scale = legTgt / legSrc;   // model metres per BVH unit
  // frames of the whole take (skip the first 0.3 s: frame 0 is the calibration T-pose)
  var frames = []; for(var i = Math.floor(0.3 * fps); i < N; i++) frames.push(sample(i / fps));
  // heading = mean root travel direction; yaw-correct everything to face +Z
  var a = frames[0].hip, z = frames[frames.length - 1].hip, head = Math.atan2(z.x - a.x, z.z - a.z), unYaw = new Qt().setFromAxisAngle(new V(0, 1, 0), -head);
  // one gait cycle: consecutive peaks of (left foot - hips) along the heading (= left heel strike), the pair whose poses match best for a clean loop
  var fwd = new V(Math.sin(head), 0, Math.cos(head)), raw = frames.map(function(f){ return f.lf.clone().sub(f.hip).dot(fwd); }), peaks = [], W = Math.round(fps * 0.05);
  var lead = raw.map(function(_, k){ var s0 = 0, n0 = 0; for(var j = k - W; j <= k + W; j++) if(j >= 0 && j < raw.length){ s0 += raw[j]; n0++; } return s0 / n0; });   // smoothed (mocap jitter made false peaks)
  var R = Math.round(fps * 0.35);   // a left heel strike is the max of the left foot's lead within +/-0.35 s (a walking cycle is ~0.9-1.3 s)
  for(var k = R; k < lead.length - R; k++){ var mx0 = true; for(var j = k - R; j <= k + R; j++) if(lead[j] > lead[k]){ mx0 = false; break; } if(mx0 && (!peaks.length || k - peaks[peaks.length - 1] > R)) peaks.push(k); }
  var best = null; for(var p = 0; p + 1 < peaks.length; p++){ var A0 = frames[peaks[p]], B0 = frames[peaks[p + 1]], err = 0; Object.keys(MAP).forEach(function(n){ err += 1 - Math.abs(A0[n].dot(B0[n])); });
    if(!best || err < best.err) best = { s: peaks[p], e: peaks[p + 1], err: err }; }
  if(!best) throw new Error('no gait cycle found');
  var cyc = frames.slice(best.s, best.e + 1), dur = (cyc.length - 1) / fps, rootDist = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).dot(fwd);
  var hipMean = 0; cyc.forEach(function(f){ hipMean += f.hip.y; }); hipMean /= cyc.length;
  // bake target tracks at 30 fps by POSING a working clone (C's rig is IK-baked: legs hang off Body, FEET ARE CHILDREN OF Root with keyed
  // positions — so each foot is solved from the retargeted shin end and written in Root space; the pelvis motion goes on Body)
  var rig = cCloneSkinned(T), rb = {}, rord = []; rig.traverse(function(o){ if(o.isBone){ rb[o.name] = o; rord.push(o); } }); rig.updateMatrixWorld(true);
  var restP = {}, restQ = {}; rord.forEach(function(b){ restP[b.name] = b.position.clone(); restQ[b.name] = b.quaternion.clone(); });
  var shinToFoot = {}; ['L', 'R'].forEach(function(sd){ shinToFoot[sd] = rb['LowerLeg' + sd].worldToLocal(rb['Foot' + sd].getWorldPosition(new V())); });
  var bodyRestW = rb.Body.getWorldPosition(new V()), lenA = {}, lenB = {};
  ['L', 'R'].forEach(function(sd){ var h = rb['UpperLeg' + sd].getWorldPosition(new V()), k = rb['LowerLeg' + sd].getWorldPosition(new V()), a0 = rb['Foot' + sd].getWorldPosition(new V()); lenA[sd] = h.distanceTo(k); lenB[sd] = k.distanceTo(a0); });
  // rotate bone b (world) by the shortest arc taking direction c -> d, written back as a local rotation
  function swing(b, c, d){ var q = new Qt().setFromUnitVectors(c.clone().normalize(), d.clone().normalize()), w = b.getWorldQuaternion(new Qt()).premultiply(q); b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new Qt()).invert().multiply(w)); b.updateMatrixWorld(true); }
  var tgtFromSrc = {}; Object.keys(MAP).forEach(function(s0){ tgtFromSrc[MAP[s0]] = s0; }); tgtFromSrc.Body = 'Hips'; delete tgtFromSrc.Hips;   // pelvis -> Body
  var restFootY = rb.FootL.getWorldPosition(new V()).y, ground = 0, footMin = Infinity;
  for(var pass = 0; pass < 2; pass++){   // pass 0 measures the lowest stance ankle; pass 1 lowers the pelvis so the planted ankle sits at its rest height (no float)
  var step = Math.max(1, Math.round(fps / 30)), times = [], qT = {}, pT = { Body: [], FootL: [], FootR: [] }; rord.forEach(function(b){ qT[b.name] = []; });
  var keep = /^(Index|Middle|Pinky|Ring|Thumb|PT)/;
  for(var c = 0; c < cyc.length; c += step){ var f = cyc[c], t = c / fps; times.push(t);
    rord.forEach(function(b){ b.position.copy(restP[b.name]); b.quaternion.copy(restQ[b.name]); }); rig.updateMatrixWorld(true);
    // pelvis bob + detrended lateral sway on Body (world offset -> Root space)
    var off = f.hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw), latTr = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw).x * (c / (cyc.length - 1));
    var bw = bodyRestW.clone().add(new V((off.x - latTr) * scale * (opt.sway == null ? 1 : opt.sway), (f.hip.y - hipMean) * scale - ground, 0)); rb.Body.position.copy(rb.Body.parent.worldToLocal(bw));
    rord.forEach(function(b){ if(/^Foot[LR]$/.test(b.name)) return; var s0 = tgtFromSrc[b.name]; if(!s0 || !f[s0] || (opt.skip && opt.skip.test(b.name))){ b.updateMatrixWorld(true); return; }
      var delta = f[s0].clone().multiply(rest[s0].clone().invert()).premultiply(unYaw), w = delta.multiply(tRestW[b.name]);
      b.parent.updateWorldMatrix(true, false); var pw = b.parent.getWorldQuaternion(new Qt()); b.quaternion.copy(pw.invert().multiply(w)); b.updateMatrixWorld(true); });
    ['L', 'R'].forEach(function(sd){ var fb = rb['Foot' + sd], s0 = sd === 'L' ? 'LeftFoot' : 'RightFoot', shin = rb['LowerLeg' + sd], thigh = rb['UpperLeg' + sd]; shin.updateMatrixWorld(true);
      if(opt.footLock){   // FOOT LOCK: the ankle goes exactly where the mocap ankle was (relative to the pelvis, scaled); two-bone IK, knee toward the FK knee
        var H = thigh.getWorldPosition(new V()), srcA = (sd === 'L' ? f.lf : f.rf).clone().sub(sd === 'L' ? f.lh : f.rh).applyQuaternion(unYaw).multiplyScalar(scale), A = H.clone().add(srcA);   /* hip JOINT -> ankle, leg-ratio scaled: always reachable */
        var K0 = shin.getWorldPosition(new V()), a = lenA[sd], bL = lenB[sd], dv = A.clone().sub(H), d = Math.min(dv.length(), a + bL - 0.002), u = dv.normalize();
        A = H.clone().addScaledVector(u, d); var x = (a * a - bL * bL + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x)), pole = K0.clone().sub(H); pole.addScaledVector(u, -pole.dot(u));
        if(pole.lengthSq() < 1e-8) pole.set(0, 0, 1); pole.normalize(); var K = H.clone().addScaledVector(u, x).addScaledVector(pole, hh);
        swing(thigh, K0.clone().sub(H), K.clone().sub(H)); shin.updateMatrixWorld(true); var end = shin.localToWorld(shinToFoot[sd].clone()); swing(shin, end.clone().sub(K), A.clone().sub(K)); }
      var wpos = shin.localToWorld(shinToFoot[sd].clone()); footMin = Math.min(footMin, wpos.y); fb.parent.updateWorldMatrix(true, false); fb.position.copy(fb.parent.worldToLocal(wpos));
      var w = f[s0].clone().multiply(rest[s0].clone().invert()).premultiply(unYaw).multiply(tRestW[fb.name]), pw = fb.parent.getWorldQuaternion(new Qt()); fb.quaternion.copy(pw.invert().multiply(w)); });
    rord.forEach(function(b){ var q = b.quaternion; qT[b.name].push(q.x, q.y, q.z, q.w); }); ['Body', 'FootL', 'FootR'].forEach(function(n){ var p0 = rb[n].position; pT[n].push(p0.x, p0.y, p0.z); }); }
  if(pass === 0){ ground = footMin - restFootY; footMin = Infinity; } }
  var tracks = []; ['Body', 'FootL', 'FootR'].forEach(function(n){ tracks.push(new THREE.VectorKeyframeTrack(n + '.position', times, pT[n])); });
  rord.forEach(function(b){ if(keep.test(b.name)) return; tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qT[b.name])); });
  var out = new THREE.AnimationClip('MocapWalk', times[times.length - 1], tracks);
  out.userData = { fps: fps, cycleFrames: cyc.length, cycleSeconds: +dur.toFixed(3), rootSpeedSrc_mps: +(rootDist * scale / dur).toFixed(3), scale: scale, loopErr: +best.err.toFixed(4), groundDrop_m: +ground.toFixed(3) };
  return out; };

function buildC2(){
  Promise.all([gunmanPromise, fetch(OPUS_MOCAP_URL).then(function(r){ if(!r.ok) throw new Error('mocap ' + r.status); return r.text(); })]).then(function(r){
    var g = r[0]; if(!g) throw new Error('gunman unavailable');
    var clip = cRetarget(r[1], g.scene, { sway: 1, footLock: true });
    var pace = clip.userData.rootSpeedSrc_mps * (1.77 / 1.81);
    window.__OPUS_C2 = { pace_mps: +pace.toFixed(3), meta: clip.userData };
    var clips = clipLookup(g.animations); clips.Walk = clip;
    var fig = cBuild(g, { merge: true, lamp: true, rules: rulesGunman, clips: clips });
    cPlayWalk(fig, pace);
    makeCMover(fig, 1.77, 'C2', 14, function(dt){ fig.mixer.update(dt); cLampTerms(fig); });
    oneDone();
  }).catch(function(e){ window.__WALKOFF_ERRORS.push('opus c2: ' + e); failed.push('c2'); oneDone(); }); }
withLoaders(function(){ buildC2(); });   // deferred: BVHLoader comes from the same pinned CDN via withLoaders

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
  // Ground-marker safety: fade a figure's foot disc out as the camera closes in, so a
  // marker can never loom large in frame when the camera runs low/close past a walker.
  for(var j = 0; j < movers.length; j++){ var mm = movers[j];
    if(!mm || !mm.tag) continue;
    var hdx = mm.group.position.x - camera.position.x, hdz = mm.group.position.z - camera.position.z;
    var hd = Math.hypot(hdx, hdz);
    var op = hd <= 1.1 ? 0 : (hd >= 2.1 ? 1 : (hd - 1.1) / 1.0);
    mm.tag.material.opacity = op; mm.tag.visible = op > 0.02;
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
