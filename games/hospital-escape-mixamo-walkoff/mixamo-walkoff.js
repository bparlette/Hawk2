/* Hospital Escape — MIXAMO WALK-OFF (Nov 24, Cherie's order 13:58 ET).
   WHY: the earlier walk-offs were judged on non-Mixamo motion (UAL clips, CMU mocap,
   the C rig's own library). The game will run Mixamo's Pistol Walk, so all 15 original
   bake-off looks are re-judged here on the SAME motion: Mixamo Pistol Walk (full body)
   + the "Firing A Gun" recoil as an additive upper-body layer, firing periodically,
   every figure paced to the law — Walk 1.30 m/s by stance-phase foot-contact
   measurement on its own body. Identical clip, identical treatment; the only variable
   is the body. A figure is in this line ONLY if the Mixamo clip genuinely drives it.
   Motion sources: Opus's offline Mixamo retarget onto the VALID rig (mx-gunman.glb,
   games/hospital-escape-3d-sample-opus/mixamo/) for the seven VALID bodies; the same
   retarget generalized offline (world-rotation delta + foot-lock IK, bone-name mapped)
   onto the Quaternius CharacterArmature (gold 1, N4, C1-C4) and the Rigify DEF- rig
   (N3, N5) — baked clip GLBs ship in game/ as gzip+base64 text chunks.
   Bodies/dress: the walk-off 17-world constructions, unchanged (gold 1 + Ex1 improve,
   N1/N2 + Neon improve/vest, Ex1-Ex5 Opus VALID designs, C1-C4 Opus C-technique builds).
   three.js pinned CDN 0.128.0, never inlined; GLTFLoader approved (Cherie, Nov 24). */
(function(){
'use strict';
window.__WALKOFF_ERRORS = [];
window.addEventListener('error', function(e){ window.__WALKOFF_ERRORS.push(String((e && e.message) || e)); });

var PATH_SPEED = 1.30;                       // the pacing law: Walk 1.30 m/s for every figure
var TARGET_H = 1.77;                         // world height figures are scaled to (walk-off standard)
var NEON_BASE = '../hospital-escape-3d-sample-neon/assets/gunmen/';
var OPUS_VALID_DIR = '../hospital-escape-3d-sample-opus/valid/';
var MX_GUNMAN_URL = '../hospital-escape-3d-sample-opus/mixamo/mx-gunman.glb';
var NEON_MODES = [
  { key: 'valid-ual',   label: 'N1', fixedH: 179.34, z0: -100.8, fam: 'valid' },
  { key: 'valid-mocap', label: 'N2', fixedH: 178.68, z0: -99.1,  fam: 'valid' },
  { key: 'ai3d-remesh', label: 'N3', fixedH: 1.7605, z0: -0.005, fam: 'rig' },
  { key: 'sculpt-c',    label: 'N4', fixedH: 1.782,  z0: -0.048, fam: 'quat' },
  { key: 'ual-dressed', label: 'N5', fixedH: 1.8168, z0: -0.014, fam: 'rig' }
];
var SLOTS = 15;
var LABELS = ['1', 'N1', 'N2', 'N3', 'N4', 'N5', 'Ex1', 'Ex2', 'Ex3', 'Ex4', 'Ex5', 'C1', 'C2', 'C3', 'C4'];

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

function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function chunkBytes(globalName){
  var parts = window[globalName]; if(!parts || !window.DecompressionStream) return Promise.resolve(null);
  var bytes = b64ToBytes(parts.join(''));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
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

// ================================================================== MIXAMO ASSEMBLY (new)
// Every figure below is driven by the SAME two Mixamo clips — Pistol Walk (full body)
// and Firing A Gun (additive upper-body recoil) — retargeted onto its own skeleton.
var movers = []; for(var _mi = 0; _mi < SLOTS; _mi++) movers.push(null);
var MODE_INDEX = { '1': 0, 'n1': 1, 'n2': 2, 'n3': 3, 'n4': 4, 'n5': 5, 'o1': 6, 'o2': 7, 'o3': 8, 'o4': 9, 'o5': 10, 'c1': 11, 'c2': 12, 'c3': 13, 'c4': 14 };
var pending = SLOTS, failed = [];
function oneDone(){
  if(--pending > 0) return;
  var el = document.getElementById('load'); if(el) el.style.display = 'none';
  var st = document.getElementById('stat');
  if(st) st.textContent = movers.filter(Boolean).length + ' of 15 looks on Mixamo Pistol Walk · 1.30 m/s pacing law' + (failed.length ? ' · could not retarget: ' + failed.join(', ') : '');
  window.__WALKOFF_READY = true;
  window.__WALKOFF_FAILED = failed;
}
function fail(slot, label, e){ window.__WALKOFF_ERRORS.push(label + ': ' + (e && e.message || e)); if(failed.indexOf(label) < 0) failed.push(label); oneDone(); }
function nodeByName(root, n){ var b = null; root.traverse(function(o){ if(!b && o.name === n) b = o; }); return b; }
function legLen(sc){ sc.updateMatrixWorld(true); var a = nodeByName(sc, 'LeftUpLeg'), b = nodeByName(sc, 'LeftLeg'), c = nodeByName(sc, 'LeftFoot');
  var bp = b.getWorldPosition(new V3()); return a.getWorldPosition(new V3()).distanceTo(bp) + bp.distanceTo(c.getWorldPosition(new V3())); }
// Re-base a clip's position tracks from the reference skeleton they were baked on onto
// THIS figure's skeleton: v' = thisRest + (v - refRest) * k (Opus's runtime method for
// the VALID rig, k = leg-length ratio; k = 1 inside one skeleton family).
function rebasePosTracks(clip, refScene, figScene, k){
  clip.tracks.forEach(function(t){ if(!/\.position$/.test(t.name)) return;
    var bn = t.name.split('.')[0], rb = nodeByName(refScene, bn), fb = nodeByName(figScene, bn); if(!rb || !fb) return;
    var rp = rb.position, fp = fb.position, v = t.values;
    for(var j = 0; j < v.length; j += 3){ v[j] = fp.x + (v[j] - rp.x) * k; v[j + 1] = fp.y + (v[j + 1] - rp.y) * k; v[j + 2] = fp.z + (v[j + 2] - rp.z) * k; } });
}
function prepareClips(anims, refScene, figScene, fam){
  var out = {}, k = fam === 'valid' ? legLen(figScene) / legLen(refScene) : 1;
  (anims || []).forEach(function(c){ if(c.name !== 'pistol-walk' && c.name !== 'shooting') return;
    var cl = c.clone();
    if(fam === 'valid') cl.tracks = cl.tracks.filter(function(t){ return t.name === 'Hips.position' || /\.quaternion$/.test(t.name); });
    rebasePosTracks(cl, refScene, figScene, k);
    out[c.name] = cl; });
  return out;
}
var LOWER_RE = { valid: /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/,
  quat: /^(Root|Body|Hips|UpperLeg|LowerLeg|Foot|PT)/,
  rig: /^(root|DEF-hips|DEF-thigh|DEF-shin|DEF-foot|DEF-toe)/ };
function makeFire(shooting, fam){
  if(!shooting) return null;
  var sub = THREE.AnimationUtils.subclip(shooting, 'firing', 6, 33, 30);
  var keep = sub.tracks.filter(function(t){ return !LOWER_RE[fam].test(t.name.split('.')[0]); });
  return THREE.AnimationUtils.makeClipAdditive(new THREE.AnimationClip('firing', sub.duration, keep));
}
// Sole points (heel/toe in foot-bone local space) from sole vertices weighted > 0.5 to
// the foot/toe bones — the stance-phase contact measurement rig, per skeleton family.
function solePoints(root, bodies, cfg){
  root.updateMatrixWorld(true);
  var out = {};
  [['L', cfg.fl, cfg.tl], ['R', cfg.fr, cfg.tr]].forEach(function(cfgS){
    var fb = findBone(root, cfgS[1]); if(!fb){ out[cfgS[0]] = null; return; }
    var pts = [];
    bodies.forEach(function(body){ var sk = body.skeleton; if(!sk) return; sk.update();
      var ids = {}; sk.bones.forEach(function(b, i){ if(b.name === cfgS[1] || b.name === cfgS[2]) ids[i] = 1; });
      var g = body.geometry, v = new V3();
      for(var i = 0; i < g.attributes.position.count; i++){ var w = 0; for(var k = 0; k < 4; k++) if(ids[comp(g.attributes.skinIndex, i, k)]) w += comp(g.attributes.skinWeight, i, k);
        if(w > 0.5) pts.push(body.boneTransform(i, v.set(0, 0, 0)).applyMatrix4(body.matrixWorld).clone()); } });
    if(!pts.length){ out[cfgS[0]] = null; return; }
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); });
    var sole = pts.filter(function(p){ return p.y < ymin + 0.03 * cfg.hRef; });
    if(!sole.length){ out[cfgS[0]] = null; return; }
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; });
    out[cfgS[0]] = { boneName: cfgS[1], heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()) };
  });
  return out;
}
function makeMarkers(skelRoot, sp){
  var H = [];
  ['L', 'R'].forEach(function(sd){ var s = sp[sd]; if(!s) return; var b = findBone(skelRoot, s.boneName); if(!b) return;
    ['heel', 'toe'].forEach(function(k){ var o = new THREE.Object3D(); o.position.copy(s[k]); b.add(o); H.push({ o: o, P: [] }); }); });
  return H;
}
// Stance-phase foot-contact pace: sample the walk clip, take heel/toe points that stay
// within 1 cm of their cycle minimum across consecutive samples; their forward speed's
// median is the pace the clip walks at ON THIS BODY. Slide = mean horizontal deviation
// of those contact points from perfectly planted (0, 0, -pace).
function measure(m, markers){
  var group = m.group; group.position.set(0, 0, 0); group.rotation.y = 0;
  var dur = m.walk.getClip().duration, N = 240;
  markers.forEach(function(h){ h.P = []; });
  for(var i = 0; i <= N; i++){ m.mixer.setTime(dur * i / N); group.updateMatrixWorld(true);
    markers.forEach(function(h){ h.P.push(h.o.getWorldPosition(new V3())); }); }
  var v = [];
  markers.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); });
    for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01) v.push((h.P[i].z - h.P[i - 1].z) / (dur / N)); });
  v.sort(function(a, b){ return a - b; });
  var med = v.length ? v[v.length >> 1] : 0, slideSum = 0, slideN = 0;
  markers.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); });
    for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01){
      slideSum += Math.hypot((h.P[i].x - h.P[i - 1].x) / (dur / N), (h.P[i].z - h.P[i - 1].z) / (dur / N) - med); slideN++; } });
  return { pace: Math.abs(med), slide: slideN ? slideSum / slideN : 0, samples: v.length };
}
function finishMover(content, skelRoot, height, label, gold, slot, clips, fam, sp, extra){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(content);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, gold); tag.position.y = 0.03; tag.rotation.set(-Math.PI / 2, 0, 0); group.add(tag);   // text upright from the FRONT — this page is judged head-on
  scene.add(group);
  var mats = [], mseen = {};
  wrap.traverse(function(o){ if(o.isMesh){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(mt){ if(mt && !mseen[mt.uuid]){ mseen[mt.uuid] = 1; mt.transparent = true; mats.push(mt); } }); } });
  var mixer = new THREE.AnimationMixer(skelRoot);
  var walk = mixer.clipAction(clips['pistol-walk']); walk.play();
  var fireC = makeFire(clips['shooting'], fam), fire = null;
  if(fireC){ fire = mixer.clipAction(fireC); fire.blendMode = THREE.AdditiveAnimationBlendMode; fire.setLoop(THREE.LoopOnce, 1); fire.weight = 0; fire.play(); }
  var col = slot % 5, row = Math.floor(slot / 5);
  var m = { group: group, mixer: mixer, s: row * (17 / 3) + col * 0.8, laneX: (col - 2) * 1.7, mats: mats, _op: 1, yaw: 0, label: label, tag: tag, walk: walk, fire: fire,
    fireT: 1.0 + slot * 0.55, firePh: -1, extra: extra, fam: fam, pace: 0, ts: 1, slide: 0, samples: 0 };
  movers[slot] = m;
  var meas = measure(m, makeMarkers(skelRoot, sp));
  m.pace = meas.pace; m.slide = meas.slide; m.samples = meas.samples;
  if(meas.pace > 0.2) m.ts = PATH_SPEED / meas.pace;
  walk.timeScale = m.ts;
  oneDone();
  return m;
}
function seatPistolGeneric(root, fam){
  var names = fam === 'valid' ? ['RightHand', 'RightHandMiddle1', 'RightHandIndex1', 'RightHandPinky1']
    : fam === 'rig' ? ['DEF-handR', 'DEF-f_middle01R', 'DEF-f_index01R', 'DEF-f_pinky01R']
    : ['WristR', 'Middle1R', 'Index1R', 'Pinky1R'];
  var h = findBone(root, names[0]), mid = findBone(root, names[1]), ix = findBone(root, names[2]), pk = findBone(root, names[3]);
  if(!h || !mid) return;
  root.updateMatrixWorld(true);
  var H = h.getWorldPosition(new V3()), M = mid.getWorldPosition(new V3());
  var I = ix ? ix.getWorldPosition(new V3()) : H, P = pk ? pk.getWorldPosition(new V3()) : H;
  var fwd = M.clone().sub(H).normalize(), across = I.clone().sub(P).normalize(), palm = new V3().crossVectors(fwd, across).normalize();
  var gp = ovPistol(), basis = new THREE.Matrix4().makeBasis(new V3().crossVectors(palm.clone().negate(), fwd).normalize(), palm.clone().negate(), fwd);
  gp.quaternion.setFromRotationMatrix(basis); gp.position.copy(H.clone().lerp(M, 0.55).addScaledVector(palm, 0.035)); gp.updateMatrixWorld(true); h.attach(gp);
}
// ------------------------------------------------------------------ the 15 builds
function buildGold(g, qg){
  var fig = THREE.SkeletonUtils.clone(g.scene);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
  relight(fig);
  ex1Improve(fig)(true);
  var clips = prepareClips(qg.animations, qg.scene, fig, 'quat');
  var bodies = []; fig.traverse(function(o){ if(o.isSkinnedMesh && /Feet/.test(o.name || '')) bodies.push(o); });
  if(!bodies.length) fig.traverse(function(o){ if(o.isSkinnedMesh) bodies.push(o); });
  var sp = solePoints(fig, bodies, { fl: 'FootL', tl: 'PTL', fr: 'FootR', tr: 'PTR', hRef: 1.81 });
  finishMover(fig, fig, 1.81, '1', true, 0, clips, 'quat', sp, null);
}
function buildC(g, qg, label, slot, opt){
  var fig = cBuild(g, opt);
  var clips = prepareClips(qg.animations, qg.scene, fig.model, 'quat');
  var bodies = []; fig.model.traverse(function(o){ if(o.isSkinnedMesh) bodies.push(o); });
  var sp = solePoints(fig.model, bodies, { fl: 'FootL', tl: 'PTL', fr: 'FootR', tr: 'PTR', hRef: 1.81 });
  finishMover(fig.root, fig.model, opt.height || 1.77, label, false, slot, clips, 'quat', sp, function(dt){ cLampTerms(fig); });
}
function propTest(o){ return o.isMesh && /pistol/i.test((o.name || '') + ' ' + (o.material && o.material.name || '')); }
function stripProps(root){ var kill = []; root.traverse(function(o){ if(propTest(o)) kill.push(o); }); kill.forEach(function(o){ if(o.parent) o.parent.remove(o); }); return kill.length; }
function hasProp(root){ var f = false; root.traverse(function(o){ if(propTest(o)) f = true; }); return f; }
function buildNeon(mode, slot, g, famG){
  var fig = g.scene;
  prepNeonMaterials(fig);
  var sc = 1.80 / mode.fixedH;
  var norm = new THREE.Group();
  fig.scale.setScalar(sc); fig.position.y = -mode.z0 * sc;
  norm.add(fig);
  if(mode.key === 'valid-ual' || mode.key === 'valid-mocap') neonImprove(fig, norm)(true);
  var clips = prepareClips(famG.animations, famG.scene, fig, mode.fam);
  // GUN AUDIT (Cherie, Nov 24 14:19): N2's built-in prop floats off the palm — not
  // acceptable. VALID figures get Opus's seated pistol (grip computed from the hand
  // bones, parented to RightHand — the treatment proven in his Mixamo retargets);
  // Rigify figures get the same seat, parameterized; N4 keeps its rig-native in-grip
  // prop if it ships one, else it is seated too.
  if(mode.fam === 'valid'){ stripProps(fig); ovSeatPistol({ model: fig }); }
  else if(mode.fam === 'rig'){ stripProps(fig); seatPistolGeneric(fig, 'rig'); }
  else if(!hasProp(fig)) seatPistolGeneric(fig, 'quat');
  var bodies = []; fig.traverse(function(o){ if(o.isSkinnedMesh) bodies.push(o); });   // ALL skinned meshes: on the dressed bodies the foot-weighted verts live in a separate shoe mesh
  var cfg = mode.fam === 'valid' ? { fl: 'LeftFoot', tl: 'LeftToeBase', fr: 'RightFoot', tr: 'RightToeBase', hRef: 1.80 }
    : mode.fam === 'quat' ? { fl: 'FootL', tl: 'PTL', fr: 'FootR', tr: 'PTR', hRef: 1.80 }
    : { fl: 'DEF-footL', tl: 'DEF-toeL', fr: 'DEF-footR', tr: 'DEF-toeR', hRef: 1.80 };
  var sp = solePoints(fig, bodies, cfg);
  finishMover(norm, fig, 1.80, mode.label, false, slot, clips, mode.fam, sp, null);
}
function buildEx(D, gn, slot, g, mxG){
  var ctx = ovPrepBase(g.scene, D);
  var model = ovCloneSkinned(g.scene), root = new THREE.Group(); root.name = 'opusFig'; root.add(model);
  root.scale.setScalar(D.h / ctx.rest.height); model.position.y = -ctx.rest.foot;
  var U = null;
  model.traverse(function(o){ if(o.isSkinnedMesh){ o.frustumCulled = false;
    if(/HighRes/.test(o.name)){ o.geometry = o.geometry.clone(); o.geometry.setAttribute('region', ctx.regionAttr); o.material = ovFigMat(o.material, D, ctx.lumRef, gn); U = o.material.userData.U; } } });
  var fig = { root: root, model: model, U: U };
  ovSeatPistol(fig);
  var clips = prepareClips(mxG.animations, mxG.scene, model, 'valid');
  var sp = solePoints(g.scene, [ctx.body], { fl: 'LeftFoot', tl: 'LeftToeBase', fr: 'RightFoot', tr: 'RightToeBase', hRef: ctx.rest.height });
  finishMover(root, model, D.h, 'Ex' + gn, false, slot, clips, 'valid', sp, function(dt){ ovLampTerms(fig); });
}
// The plaza's planter + hedge boxes sit in the middle of the advance lanes — remove
// them so every figure walks an unobstructed lane at the camera.
(function(){ var kill = []; scene.traverse(function(o){ if(o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry') kill.push(o); });
  kill.forEach(function(o){ if(o.parent) o.parent.remove(o); }); })();
// ------------------------------------------------------------------ boot
var loader = new THREE.GLTFLoader();
function loadGLB(url){ return new Promise(function(res, rej){ loader.load(url, res, undefined, rej); }); }
function parseGLB(buf){ return new Promise(function(res, rej){ loader.parse(buf, '', res, rej); }); }
function decodeB64(b64){ var bytes = b64ToBytes(b64); var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')); return new Response(stream).arrayBuffer(); }
Promise.all([chunkBytes('__GUNMAN_GZ_B64'), decodeB64(window.MXCLIP_QUATERNIUS), decodeB64(window.MXCLIP_RIGIFY), loadGLB(MX_GUNMAN_URL)])
.then(function(r){
  return Promise.all([parseGLB(r[0]), parseGLB(r[1]), parseGLB(r[2])]).then(function(p){ return { g: p[0], q: p[1], r: p[2], mx: r[3] }; });
}).then(function(A){
  try { buildGold(A.g, A.q); } catch(e){ fail(0, '1', e); }
  try { buildC(A.g, A.q, 'C1', 11, { merge: true, lamp: true, rules: rulesGunman }); } catch(e){ fail(11, 'C1', e); }
  try { buildC(A.g, A.q, 'C2', 12, { merge: true, lamp: true, rules: rulesGunman }); } catch(e){ fail(12, 'C2', e); }
  try { buildC(A.g, A.q, 'C3', 13, { merge: true, lamp: true, height: 1.82, rules: cRulesShape({ girth: 0.032, belly: 0.025, shoulders: 0.03, shoulderWidth: 0.022, neck: 0.018, forearm: 0.008, thigh: 0.012 }) }); } catch(e){ fail(13, 'C3', e); }
  try { buildC(A.g, A.q, 'C4', 14, { merge: true, lamp: true, rules: rulesGunman }); } catch(e){ fail(14, 'C4', e); }
  NEON_MODES.forEach(function(mode, i){ var slot = i + 1;
    loadGLB(NEON_BASE + mode.key + '.glb').then(function(g){
      try { buildNeon(mode, slot, g, mode.fam === 'valid' ? A.mx : mode.fam === 'quat' ? A.q : A.r); } catch(e){ fail(slot, mode.label, e); } },
      function(e){ fail(slot, mode.label, e); }); });
  OPUS_VALID_DESIGNS.forEach(function(D, i){ var slot = 6 + i, gn = i + 1;
    loadGLB(OPUS_VALID_DIR + D.body).then(function(g){
      try { buildEx(D, gn, slot, g, A.mx); } catch(e){ fail(slot, 'Ex' + gn, e); } },
      function(e){ fail(slot, 'Ex' + gn, e); }); });
}).catch(function(e){ window.__WALKOFF_ERRORS.push('boot: ' + (e && e.message || e)); });

// ------------------------------------------------------------------ camera + UI
scene.fog = new THREE.Fog(0x1b1f26, 13, 34);   // the back of the advance fades into haze
camera.position.set(0, 2.1, 7.5);
var camMode = 'both';
var camDir = null;
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
  if(m === 'both') camDir = null;
  else if(camDir === null) camDir = 'front';          // this page judges head-on: figure taps default to FRONT
  paintButtons(); }
function setDir(d){
  if(camMode === 'both') camMode = '1';
  camDir = d; paintButtons(); }
buttons.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); }); });
dirButtons.forEach(function(b){ b.addEventListener('click', function(){ setDir(b.getAttribute('data-dir')); }); });
paintButtons();
window.__walkoff = { setMode: setMode, setDir: setDir, movers: movers, pathLength: PATH.length, camera: camera, scene: scene, holdCam: null,
  mode: function(){ return camMode; }, dir: function(){ return camDir; },
  report: function(){ return movers.map(function(m){ return m ? { label: m.label, fam: m.fam, pace: +m.pace.toFixed(3), timeScale: +m.ts.toFixed(3), slide_cm_s: +(m.slide * 100).toFixed(1), samples: m.samples } : null; }); } };

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
    // WALK AT THE SCREEN (Cherie, Nov 24 14:15): every figure advances head-on toward
    // the camera in its own lane, fades out as it reaches the camera, resets to the
    // back and fades in again — judged the way an enemy appears in the game.
    m.s = (m.s + PATH_SPEED * dt) % 17;
    var z = -13.5 + m.s;
    m.group.position.set(m.laneX, 0, z);
    m.yaw += angDelta(m.yaw, 0) * Math.min(1, dt * 7);
    m.group.rotation.y = m.yaw;
    var op = 1; if(z > 1.5) op = Math.max(0, 1 - (z - 1.5) / 2); else if(z < -11.5) op = Math.min(1, (z + 13.5) / 2);
    if(Math.abs(op - m._op) > 0.01){ m._op = op; m.mats.forEach(function(mt){ mt.opacity = op; }); }
    m.group.visible = op > 0.01;
    if(m.fire){
      if(m.firePh < 0){ m.fireT -= dt;
        if(m.fireT <= 0){ m.firePh = 0; m.fire.reset(); m.fire.play(); } }
      else { m.firePh += dt; var fd = m.fire.getClip().duration;
        m.fire.weight = Math.max(0, Math.sin(Math.PI * Math.min(1, m.firePh / fd)));
        if(m.firePh >= fd){ m.firePh = -1; m.fire.weight = 0; m.fireT = 2.4 + (i * 0.37) % 1.3; } } }
    if(m.extra) m.extra(dt);
    m.mixer.update(dt);
  }
  for(var j = 0; j < movers.length; j++){ var mm = movers[j];
    if(!mm || !mm.tag) continue;
    var hdx = mm.group.position.x - camera.position.x, hdz = mm.group.position.z - camera.position.z;
    var hd = Math.hypot(hdx, hdz);
    var op = hd <= 1.1 ? 0 : (hd >= 2.1 ? 1 : (hd - 1.1) / 1.0);
    mm.tag.material.opacity = op; mm.tag.visible = op > 0.02;
  }
  var dp, dl, fi = MODE_INDEX[camMode];
  if(camMode === 'both' || fi == null || !movers[fi]){ dp = new THREE.Vector3(0, 2.1, 7.5); dl = new THREE.Vector3(0, 1.0, -3); }
  else { var f = movers[fi];
    var fx = Math.sin(f.yaw), fz = Math.cos(f.yaw);
    camAng += angDelta(camAng, DIR_ANG[camDir || 'back']) * Math.min(1, dt * 3.2);
    var ca = Math.cos(camAng), sa = Math.sin(camAng);
    var ox = fx * ca + fz * sa, oz = fz * ca - fx * sa;
    dp = new THREE.Vector3(f.group.position.x + ox * 5.0, 2.3, f.group.position.z + oz * 5.0);
    dl = new THREE.Vector3(f.group.position.x - ox * 1.5, 1.25, f.group.position.z - oz * 1.5); }
  var hold = window.__walkoff && window.__walkoff.holdCam;
  if(hold){ camera.position.copy(hold.pos); camera.lookAt(hold.look); }
  else { var kp = Math.min(1, dt * 3.2), kl = Math.min(1, dt * 4.5);
    camPos.lerp(dp, kp); camLook.lerp(dl, kl);
    camera.position.copy(camPos); camera.lookAt(camLook); }
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
})();
