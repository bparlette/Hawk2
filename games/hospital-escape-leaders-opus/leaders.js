/* Hospital Escape — LEADERS, BEFORE / AFTER (Opus, STATUS-SHOOTER-BAKEOFF Q2). Built on Moth's walk-off 2 page (same plaza, loop, speed, cameras).
   Slots: 1 = Ex1 exactly as judged · 1+ = Ex1 improved · N2 = N2 exactly as judged · N2+ = N2 improved. Improvements are documented in
   tasking/responses/opus-leaders.md and marked OPUS below.
   --- original header ---
   WALK-OFF 2: our Ex1 vs Neon's five, one tiny plaza.
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
  { key: 'valid-mocap', label: 'N2', walkClip: 'Walk_Loop', authored: 1.688, fixedH: 178.68, z0: -99.1 }
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
  if(!THREE.BVHLoader) need.push('loaders/BVHLoader.js');
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

// ------------------------------------------------------------------ figures
var movers = [null, null, null, null];
var MODE_INDEX = { '1': 0, '1p': 1, 'n2': 2, 'n2p': 3 };
function makeMover(fig, height, walkActionClip, authored, label, gold, slot){
  var wrap = new THREE.Group(); wrap.scale.setScalar(TARGET_H / height); wrap.add(fig);
  addBlob(wrap);
  var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl);
  var group = new THREE.Group(); group.add(wrap);
  var tag = makeLabel(label, gold); tag.position.y = TARGET_H + 0.52; group.add(tag);
  scene.add(group);
  var mixer = new THREE.AnimationMixer(fig);
  var act = mixer.clipAction(walkActionClip); act.timeScale = PATH_SPEED / authored; act.play();
  var m = { group: group, mixer: mixer, s: slot * PATH.length / 4, yaw: 0, label: label };
  movers[slot] = m; return m;
}
var pending = 4, failed = [];
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
  makeMover(fig, 1.81, clips['Walk'], 1.30, '1', true, 0);   // C clips foot-contact authored 1.30 m/s
  try { buildEx1Plus(gunman, clips); } catch(e){ window.__WALKOFF_ERRORS.push('1+: ' + e); failed.push('1p'); } oneDone();
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
  makeMover(norm, 1.80, clip, mode.authored, mode.label, false, 2);
  oneDone();
  OPUS_N2P(mode, gltf);
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
    loader.load(NEON_BASE + mode.key + '.glb', function(g){ buildNeon(mode, 2, g); },
      undefined, function(err){ window.__WALKOFF_ERRORS.push(mode.key + ' load: ' + (err && err.message || err)); failed.push(mode.key); oneDone(); });
  });
});

// =================================================================== OPUS IMPROVEMENTS
var V = THREE.Vector3, Qt = THREE.Quaternion;
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }   // r128: no getComponent; glTF weights may be normalized ints
function mergeSkinned(root, rules){ var parts = []; root.traverse(function(o){ if(o.isSkinnedMesh) parts.push(o); }); if(parts.length < 2) return root;
  var sk = parts[0].skeleton, attrs = { position: [], normal: [], skinIndex: [], skinWeight: [], color: [] }, idx = [], off = 0;
  var bindW = parts[0].bindMatrix, boneW = {}; sk.bones.forEach(function(b, i){ boneW[b.name] = new V().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert()); });
  var sN = {}, key = function(x, y, z){ return Math.round(x * 2000) + ',' + Math.round(y * 2000) + ',' + Math.round(z * 2000); };   // averaged normal per shared position: pushing keeps seams closed
  if(rules) parts.forEach(function(p){ var g = p.geometry; for(var i = 0; i < g.attributes.position.count; i++){ var k = key(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)), a = sN[k] || (sN[k] = new V()); a.x += g.attributes.normal.getX(i); a.y += g.attributes.normal.getY(i); a.z += g.attributes.normal.getZ(i); } });
  Object.keys(sN).forEach(function(k){ sN[k].normalize(); }); var ibw = new THREE.Matrix4().copy(bindW).invert();
  var unit = rules ? 1.81 / Math.max(1e-6, (boneW.Head.y - Math.min(boneW.FootL.y, boneW.FootR.y)) * 1.12) : 1, vv = new V(), nn = new V(), nm = new THREE.Matrix3().getNormalMatrix(bindW);
  parts.forEach(function(p){ var g = p.geometry, n = g.attributes.position.count, col = (p.material.color || new THREE.Color(1, 1, 1)), vc = g.attributes.color;
    // remap this part's skin indices from its skeleton to the shared one (by bone name)
    var map = p.skeleton.bones.map(function(b){ for(var i = 0; i < sk.bones.length; i++) if(sk.bones[i].name === b.name) return i; return 0; });
    for(var i = 0; i < n; i++){ var px = g.attributes.position.getX(i), py = g.attributes.position.getY(i), pz = g.attributes.position.getZ(i), qx = g.attributes.normal.getX(i), qy = g.attributes.normal.getY(i), qz = g.attributes.normal.getZ(i), rc = null;
      if(rules){ var bi = 0, bw = -1; for(var k0 = 0; k0 < 4; k0++){ var w0 = comp(g.attributes.skinWeight, i, k0); if(w0 > bw){ bw = w0; bi = comp(g.attributes.skinIndex, i, k0); } }
        vv.set(px, py, pz).applyMatrix4(bindW); nn.set(qx, qy, qz).applyMatrix3(nm).normalize();
        rc = rules({ part: p.name, mat: p.material.name, bone: p.skeleton.bones[bi] ? p.skeleton.bones[bi].name : '', p: vv, n: nn, bones: boneW, unit: unit });
        if(rc && rc.push){ var an = sN[key(px, py, pz)] || nn; px += an.x * rc.push / unit; py += an.y * rc.push / unit; pz += an.z * rc.push / unit; }
        if(rc && rc.shift){ px += rc.shift.x / unit; py += rc.shift.y / unit; pz += rc.shift.z / unit; }   /* bind-space displacement (re-proportioning) */
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

function lin(h){ return new THREE.Color(h).convertSRGBToLinear(); }
var GUNMAN = { jacket: lin('#733829'), rig: lin('#1F2522'), beanie: lin('#1C1C1C'), trousers: lin('#22252A'), boots: lin('#17181b'), beard: lin('#3a2c22'), skin: lin('#b98468'), hair: lin('#1e1712') };
var ARM = /^(Shoulder|UpperArm|LowerArm)/, LEG = /^(UpperLeg|LowerLeg|Hips)/, TORSO = /^(Abdomen|Torso|Chest|Body|Root)$/;
var rulesGunman = function(v){ var P = GUNMAN, B = v.bones;
  var hy = B.Head.y, brow = hy + 0.15 / v.unit;                                                                 // the beanie's rim: 2.5 cm above the brows (measured: Head bone 1.587, brows 1.71, crown 1.857)
  if(v.part === 'Casual2_Head_5') return v.p.y > brow ? { c: P.beanie, push: 0.004 } : { c: P.hair, push: -0.008 };   // hair mass -> knit above the rim; short dark hair below it
  if((v.part === 'Casual2_Head_1' || v.part === 'Casual2_Head_2') && v.p.y > brow) return { c: P.beanie, push: 0.016 };   // scalp under the hair -> knit dome
  if(v.part === 'Casual2_Legs') return { c: P.trousers }; if(/Feet/.test(v.part)) return { c: P.boots };
  if(v.part === 'Casual2_Body_1' || (v.mat === 'Skin' && (ARM.test(v.bone) || TORSO.test(v.bone)) && v.part === 'Casual2_Body_2')){                     // shirt + bare arms -> long-sleeve bomber
    return { c: P.jacket, push: ARM.test(v.bone) ? 0.012 : 0.016 }; }
  if(v.part === 'Casual2_Body_2' && LEG.test(v.bone)) return { c: P.trousers };
  if(v.part === 'Casual2_Head_1'){ var hy = B.Head.y, low = v.p.y < hy + 0.035 / v.unit, front2 = v.n.z > 0.1; if(low && front2) return { c: P.skin.clone().lerp(P.beard, 0.55) }; return { c: P.skin }; }   /* stubble, not a mask */
  if(v.mat === 'Skin') return { c: P.skin };
  return null; };
// PARAMETRIC RE-PROPORTIONING (the per-character shape row): bind-mesh displacement by body region, layered over the role colours.
//  girth: torso out along normals · shoulders: deltoid/upper-arm mass pushed out + sideways · neck · belly: front-lower torso
// rim light on any standard material: cool edge on back-lit / grazing normals (the walk-off light is a key + hemisphere)
function addRim(m, k){ m.onBeforeCompile = function(sh){ sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n float frO = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); reflectedLight.directDiffuse += vec3(0.42, 0.48, 0.56) * pow(frO, 3.0) * ' + k.toFixed(2) + ';'); };
  m.customProgramCacheKey = function(){ return 'opusRim' + k; }; m.needsUpdate = true; }
function splitClip(c, lowerRe, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? lowerRe.test(b) : !lowerRe.test(b); }); return x; }
// ---- 1+ : Ex1 improved — the spec gunman reskin (bomber #733829, knit beanie, stubble), one merged mesh, rim, gun-ready upper body
function buildEx1Plus(gunman, clips){
  var fig = THREE.SkeletonUtils.clone(gunman.scene);
  fig.traverse(function(o){ if(o.isMesh){ o.material = o.material.clone(); } });
  mergeSkinned(fig, rulesGunman);
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false; if(o.material && o.material.isMeshStandardMaterial){ if(o.name === 'merged') o.material.roughness = 0.78; addRim(o.material, 0.55); } } });
  var LOW = /^(Root|Body|Hips|UpperLeg|LowerLeg|Foot|PT)/;
  var legs = splitClip(clips.Walk, LOW, true, 'LegsWalk'), up = splitClip(clips.Idle_Gun || clips.Idle_Gun_Pointing, LOW, false, 'UpCarry');
  var m = makeMover(fig, 1.81, legs, 1.30, '1+', true, 1); m.mixer.clipAction(up).play();
}
// ---- generic FK foot-locked mocap retarget (CMU BVH -> any T-posed humanoid facing +Z with +X on its left; VALID here)
var CMU2VALID = { Hips: 'Hips', LeftUpLeg: 'LeftUpLeg', LeftLeg: 'LeftLeg', LeftFoot: 'LeftFoot', RightUpLeg: 'RightUpLeg', RightLeg: 'RightLeg', RightFoot: 'RightFoot' };
function retargetFK(text, rigSrc, MAP){ var res = new THREE.BVHLoader().parse(text), sk = res.skeleton, root = sk.bones[0], holder = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()); holder.add(root); holder.bind(sk);
  var mx = new THREE.AnimationMixer(holder); mx.clipAction(res.clip).play(); var S = {}; sk.bones.forEach(function(b){ S[b.name] = b; });
  var fps = 1 / (res.clip.tracks[0].times[1] - res.clip.tracks[0].times[0]), N = Math.floor(res.clip.duration * fps);
  function sample(t){ mx.setTime(t); holder.updateMatrixWorld(true); var o = {}; Object.keys(MAP).forEach(function(n){ o[n] = S[n].getWorldQuaternion(new Qt()); });
    o.hip = S.Hips.getWorldPosition(new V()); o.lf = S.LeftFoot.getWorldPosition(new V()); o.rf = S.RightFoot.getWorldPosition(new V()); o.lh = S.LeftUpLeg.getWorldPosition(new V()); o.rh = S.RightUpLeg.getWorldPosition(new V()); return o; }
  var rest = sample(0), legSrc = S.LeftLeg.position.length() + S.LeftFoot.position.length();
  var rig = THREE.SkeletonUtils.clone(rigSrc), rb = {}, ord = []; rig.traverse(function(o){ if(o.isBone){ rb[o.name] = o; ord.push(o); } }); rig.updateMatrixWorld(true);
  var restP = {}, restQ = {}, tRestW = {}; ord.forEach(function(b){ restP[b.name] = b.position.clone(); restQ[b.name] = b.quaternion.clone(); tRestW[b.name] = b.getWorldQuaternion(new Qt()); });
  var W = function(n){ return rb[n].getWorldPosition(new V()); }, lenA = { L: W('LeftUpLeg').distanceTo(W('LeftLeg')), R: W('RightUpLeg').distanceTo(W('RightLeg')) }, lenB = { L: W('LeftLeg').distanceTo(W('LeftFoot')), R: W('RightLeg').distanceTo(W('RightFoot')) };
  var scale = (lenA.L + lenB.L) / legSrc, hipsRestW = W('Hips'), restFootY = W('LeftFoot').y;
  var frames = []; for(var i = Math.floor(0.3 * fps); i < N; i++) frames.push(sample(i / fps));
  var a0 = frames[0].hip, z0 = frames[frames.length - 1].hip, head = Math.atan2(z0.x - a0.x, z0.z - a0.z), unYaw = new Qt().setFromAxisAngle(new V(0, 1, 0), -head), fwd = new V(Math.sin(head), 0, Math.cos(head));
  var raw = frames.map(function(f){ return f.lf.clone().sub(f.hip).dot(fwd); }), Wn = Math.round(fps * 0.05), lead = raw.map(function(_, k){ var s0 = 0, n0 = 0; for(var j = k - Wn; j <= k + Wn; j++) if(j >= 0 && j < raw.length){ s0 += raw[j]; n0++; } return s0 / n0; });
  var R = Math.round(fps * 0.35), peaks = []; for(var k = R; k < lead.length - R; k++){ var ok = true; for(var j = k - R; j <= k + R; j++) if(lead[j] > lead[k]){ ok = false; break; } if(ok && (!peaks.length || k - peaks[peaks.length - 1] > R)) peaks.push(k); }
  var best = null; for(var p = 0; p + 1 < peaks.length; p++){ var A0 = frames[peaks[p]], B0 = frames[peaks[p + 1]], err = 0; Object.keys(MAP).forEach(function(n){ err += 1 - Math.abs(A0[n].dot(B0[n])); }); if(!best || err < best.err) best = { s: peaks[p], e: peaks[p + 1], err: err }; }
  var cyc = frames.slice(best.s, best.e + 1), dur = (cyc.length - 1) / fps, dist = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).dot(fwd), hipMean = 0; cyc.forEach(function(f){ hipMean += f.hip.y; }); hipMean /= cyc.length;
  var latEnd = cyc[cyc.length - 1].hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw).x;
  function swing(b, c, d){ var q = new Qt().setFromUnitVectors(c.clone().normalize(), d.clone().normalize()), w = b.getWorldQuaternion(new Qt()).premultiply(q); b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new Qt()).invert().multiply(w)); b.updateMatrixWorld(true); }
  var srcOf = {}; Object.keys(MAP).forEach(function(s0){ srcOf[MAP[s0]] = s0; });
  var ground = 0, footMin = Infinity, step = Math.max(1, Math.round(fps / 30)), out = null;
  for(var pass = 0; pass < 2; pass++){ var times = [], qT = {}, hp = []; Object.keys(srcOf).forEach(function(n){ qT[n] = []; });
    for(var c = 0; c < cyc.length; c += step){ var f = cyc[c]; times.push(c / fps); ord.forEach(function(b){ b.position.copy(restP[b.name]); b.quaternion.copy(restQ[b.name]); }); rig.updateMatrixWorld(true);
      var off = f.hip.clone().sub(cyc[0].hip).applyQuaternion(unYaw), hw = hipsRestW.clone().add(new V((off.x - latEnd * c / (cyc.length - 1)) * scale, (f.hip.y - hipMean) * scale - ground, 0));
      rb.Hips.parent.updateWorldMatrix(true, false); rb.Hips.position.copy(rb.Hips.parent.worldToLocal(hw)); rb.Hips.updateMatrixWorld(true);
      ord.forEach(function(b){ var s0 = srcOf[b.name]; if(!s0) return; var w = f[s0].clone().multiply(rest[s0].clone().invert()).premultiply(unYaw).multiply(tRestW[b.name]);
        b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new Qt()).invert().multiply(w)); b.updateMatrixWorld(true); });
      [['L', 'Left', 'lf', 'lh'], ['R', 'Right', 'rf', 'rh']].forEach(function(sd){ var th = rb[sd[1] + 'UpLeg'], sh = rb[sd[1] + 'Leg'], ft = rb[sd[1] + 'Foot'];
        var H = th.getWorldPosition(new V()), A = H.clone().add(f[sd[2]].clone().sub(f[sd[3]]).applyQuaternion(unYaw).multiplyScalar(scale)), K0 = sh.getWorldPosition(new V()), a = lenA[sd[0]], bl = lenB[sd[0]];
        var dv = A.clone().sub(H), d = Math.min(dv.length(), (a + bl) * 0.999), u = dv.normalize(); A = H.clone().addScaledVector(u, d);
        var x = (a * a - bl * bl + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x)), pole = K0.clone().sub(H); pole.addScaledVector(u, -pole.dot(u)); if(pole.lengthSq() < 1e-10) pole.set(0, 0, 1); pole.normalize();
        var K = H.clone().addScaledVector(u, x).addScaledVector(pole, hh); swing(th, K0.clone().sub(H), K.clone().sub(H)); swing(sh, ft.getWorldPosition(new V()).sub(K), A.clone().sub(K)); footMin = Math.min(footMin, ft.getWorldPosition(new V()).y);
        var fw = f[sd[1] + 'Foot'].clone().multiply(rest[sd[1] + 'Foot'].clone().invert()).premultiply(unYaw).multiply(tRestW[sd[1] + 'Foot']); ft.parent.updateWorldMatrix(true, false); ft.quaternion.copy(ft.parent.getWorldQuaternion(new Qt()).invert().multiply(fw)); ft.updateMatrixWorld(true); });
      Object.keys(qT).forEach(function(n){ var q = rb[n].quaternion; qT[n].push(q.x, q.y, q.z, q.w); }); var hpp = rb.Hips.position; hp.push(hpp.x, hpp.y, hpp.z); }
    if(pass === 0){ ground = footMin - restFootY; footMin = Infinity; continue; }
    var tracks = [new THREE.VectorKeyframeTrack('Hips.position', times, hp)]; Object.keys(qT).forEach(function(n){ tracks.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', times, qT[n])); });
    out = new THREE.AnimationClip('CMUWalk', times[times.length - 1], tracks); out.userData = { speedModelPerSec: dist * scale / dur, legModel: lenA.L + lenB.L, cycle: +dur.toFixed(3), loopErr: +best.err.toFixed(4), ground: ground }; }
  return out; }
// ---- N2+ : N2 improved — Neon's body + dressing kept; legs = CMU mocap (free for commercial use) foot-locked onto his rig instead of the
//      local-test-only Mixamo walk; upper body = UAL Pistol_Idle (gun-ready instead of a dangling pistol); rim on his materials
function OPUS_N2P(mode, gltf){ fetch('cmu-35_02.bvh').then(function(r){ return r.text(); }).then(function(text){
    var rigSrc = THREE.SkeletonUtils.clone(gltf.scene), walk = retargetFK(text, rigSrc, CMU2VALID), clips = clipLookup(gltf.animations);
    var LOWV = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
    var up = splitClip(clips.Pistol_Idle_Loop, LOWV, false, 'UpReady');
    // pelvis hand-off: the gun layer's spine pose assumes ITS pelvis; re-seat Spine onto the mocap pelvis: Spine' = (meanHips_cmu^-1 * hips_idle) * Spine
    var hT = walk.tracks.filter(function(t){ return t.name === 'Hips.quaternion'; })[0], iT = clips.Pistol_Idle_Loop.tracks.filter(function(t){ return /(^|\.)Hips\.quaternion$|^Hips\.quaternion/.test(t.name); })[0], sT = up.tracks.filter(function(t){ return /^Spine\.quaternion$/.test(t.name); })[0];
    if(hT && iT && sT){ var mean = new THREE.Vector4(), q0 = new Qt(hT.values[0], hT.values[1], hT.values[2], hT.values[3]); for(var i = 0; i < hT.values.length; i += 4){ var q = new Qt(hT.values[i], hT.values[i + 1], hT.values[i + 2], hT.values[i + 3]); if(q.dot(q0) < 0){ q.x = -q.x; q.y = -q.y; q.z = -q.z; q.w = -q.w; } mean.x += q.x; mean.y += q.y; mean.z += q.z; mean.w += q.w; }
      var mq = new Qt(mean.x, mean.y, mean.z, mean.w).normalize(), iq = new Qt(iT.values[0], iT.values[1], iT.values[2], iT.values[3]), corr = mq.clone().invert().multiply(iq); sT.values = sT.values.slice();
      for(var j = 0; j < sT.values.length; j += 4){ var sq = corr.clone().multiply(new Qt(sT.values[j], sT.values[j + 1], sT.values[j + 2], sT.values[j + 3])); sT.values[j] = sq.x; sT.values[j + 1] = sq.y; sT.values[j + 2] = sq.z; sT.values[j + 3] = sq.w; }
      window.__N2P_corrDeg = +(2 * Math.acos(Math.min(1, Math.abs(corr.w))) * 57.3).toFixed(1); }
    var fig = THREE.SkeletonUtils.clone(gltf.scene); fig.traverse(function(o){ if(o.isMesh){ o.material = Array.isArray(o.material) ? o.material.map(function(m){ return m.clone(); }) : o.material.clone(); } });
    prepNeonMaterials(fig); fig.traverse(function(o){ if(o.isMesh){ [].concat(o.material).forEach(function(m){ if(m && m.isMeshStandardMaterial) addRim(m, 0.45); }); } });
    var sc = 1.80 / mode.fixedH, norm = new THREE.Group(); fig.scale.setScalar(sc); fig.position.y = -mode.z0 * sc; norm.add(fig);
    var m = makeMover(norm, 1.80, walk, 1, 'N2+', false, 3); m.group.updateMatrixWorld(true);
    var Bw = function(n){ var o = null; fig.traverse(function(x){ if(!o && x.isBone && x.name === n) o = x; }); return o.getWorldPosition(new V()); };
    var legWorld = Bw('LeftUpLeg').distanceTo(Bw('LeftLeg')) + Bw('LeftLeg').distanceTo(Bw('LeftFoot')), authored = walk.userData.speedModelPerSec * legWorld / walk.userData.legModel;   // units from measured leg lengths
    m.mixer._actions.forEach(function(ac){ if(ac.getClip() === walk) ac.timeScale = PATH_SPEED / authored; }); m.mixer.clipAction(up).play(); window.__N2P = { authored_mps: +authored.toFixed(3), meta: walk.userData };
    oneDone(); }).catch(function(e){ window.__WALKOFF_ERRORS.push('N2+: ' + e); failed.push('n2p'); oneDone(); }); }

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
window.__walkoff = { setMode: setMode, setDir: setDir, movers: movers, pathLength: PATH.length, camera: camera,
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
    m.mixer.update(dt); if(m.after) m.after(dt, m);
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
