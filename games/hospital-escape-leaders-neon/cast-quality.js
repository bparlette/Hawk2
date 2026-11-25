/* Hospital Escape — CAST-QUALITY T4-lit in-scene showcase (dr_hale, cole, patient_lying, nurse_female, nurse_male + maya, gunman) */
(function(){
'use strict';

window.__CAST_ERRORS = [];
window.addEventListener('error', function(e){ window.__CAST_ERRORS.push(e.message || String(e)); });
window.addEventListener('unhandledrejection', function(e){ window.__CAST_ERRORS.push(String(e.reason || e)); });

var Q = new URLSearchParams(location.search);
var CLEAN = Q.get('clean') === '1';
if(CLEAN) document.getElementById('hud').classList.add('hidden');

var state = {
  mode: Q.get('mode') || 'room412',
  clip: Q.get('clip') || '',
  cam:  Q.get('cam') || 'hero',
  t:    +(Q.get('t') || 0.6),
  paused: Q.has('t') || CLEAN,
  blanketOff: true
};

// ---- Renderer (exact T4: ACES Filmic 1.06, sRGB, PCFSoftShadowMap) ----
var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x05090d);
scene.fog = new THREE.FogExp2(0x081016, 0.020);

var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 80);
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- T4 corridorPMREM & Analytic Rectangular Panel GLSL ----
function corridorPMREM(r){
  var pm = new THREE.PMREMGenerator(r);
  pm.compileEquirectangularShader();
  var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  var c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#243038'); g.addColorStop(0.45, '#2b3740');
  g.addColorStop(0.55, '#1e272d'); g.addColorStop(1.0, '#11161a');
  c.fillStyle = g; c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#e4f8ff';
  for(var i = 0; i < 6; i++) c.fillRect(28 + i * 82, 16, 46, 18);
  var wg = c.createRadialGradient(135, 132, 4, 135, 132, 62);
  wg.addColorStop(0, 'rgba(255,190,115,0.85)'); wg.addColorStop(1, 'rgba(255,190,115,0)');
  c.fillStyle = wg; c.fillRect(60, 70, 150, 125);
  var eq = new THREE.CanvasTexture(cv);
  eq.mapping = THREE.EquirectangularReflectionMapping;
  eq.encoding = THREE.sRGBEncoding;
  var tex = pm.fromEquirectangular(eq).texture;
  eq.dispose(); pm.dispose();
  return tex;
}
scene.environment = corridorPMREM(renderer);

var K = 8;
var U = { uPan: { value: [] }, uHalf: { value: [] }, uCol: { value: [] } };
var PANELS = [
  [-1.8, 2.87, -2.5, 1.0],
  [ 1.8, 2.87, -2.5, 1.0],
  [-1.8, 2.87,  0.5, 1.0],
  [ 1.8, 2.87,  0.5, 1.0],
  [ 0.0, 2.87,  2.2, 1.0],
  [ 0.0, 2.87, -0.8, 1.0],
  [ 0.0, 2.87, -3.8, 0.9],
  [ 0.0, 2.87,  3.8, 0.9]
];
for(var pi = 0; pi < K; pi++){
  var p = PANELS[pi];
  U.uPan.value.push(new THREE.Vector4(p[0], p[1], p[2], p[3]));
  U.uHalf.value.push(new THREE.Vector2(0.32, 0.62));
  U.uCol.value.push(new THREE.Vector3(0.84, 0.95, 1.0));
}

var RECT = [
  'varying vec3 vAreaWPos;',
  'varying vec3 vAreaWNorm;',
  'uniform vec4 uPan[' + K + '];',
  'uniform vec2 uHalf[' + K + '];',
  'uniform vec3 uCol[' + K + '];',
  'float rectIrradiance(vec3 P, vec3 N, vec3 Lc, float hx, float hz){',
  '  vec3 cp = vec3(clamp(P.x, Lc.x - hx, Lc.x + hx), Lc.y, clamp(P.z, Lc.z - hz, Lc.z + hz));',
  '  vec3 d = cp - P; float dist2 = dot(d, d) + 0.18; vec3 L = normalize(d);',
  '  float nDotL = clamp(dot(N, L) * 0.72 + 0.28, 0.0, 1.0);',
  '  float lampFacing = smoothstep(-0.15, 0.45, -L.y);',
  '  return (nDotL * lampFacing) / dist2;',
  '}'
].join('\n');

var INJECT = [
  '#include <lights_fragment_end>',
  '{',
  '  vec3 Nw = normalize(vAreaWNorm); vec3 Vw = normalize(cameraPosition - vAreaWPos); vec3 Rw = reflect(-Vw, Nw);',
  '  vec3 aDiff = vec3(0.0); vec3 aSpec = vec3(0.0); float roughA = clamp(material.specularRoughness, 0.12, 0.95);',
  '  for(int i = 0; i < ' + K + '; i++){',
  '    vec3 lc = uPan[i].xyz; float dim = uPan[i].w; vec3 col = uCol[i]; vec2 hh = uHalf[i];',
  '    float irr = rectIrradiance(vAreaWPos, Nw, lc, hh.x, hh.y) * 0.96 * dim; aDiff += col * irr;',
  '    if(Rw.y > 0.04){',
  '      float tHit = (lc.y - vAreaWPos.y) / Rw.y; vec3 hit = vAreaWPos + Rw * tHit;',
  '      vec2 dRect = max(abs(hit.xz - lc.xz) - hh, vec2(0.0));',
  '      float specCone = exp(-dot(dRect, dRect) / (0.03 + roughA * roughA * 1.4));',
  '      aSpec += col * specCone * dim * (1.0 - roughA) * 0.62;',
  '    }',
  '  }',
  '  reflectedLight.directDiffuse += aDiff * diffuseColor.rgb * 0.85;',
  '  if(Nw.y < -0.5) reflectedLight.indirectDiffuse += vec3(0.11, 0.14, 0.16) * diffuseColor.rgb;',
  '  reflectedLight.directSpecular += aSpec * mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);',
  '}'
].join('\n');

function withArea(mat){
  if(!mat || !mat.isMeshStandardMaterial || mat.userData.t4) return mat;
  mat.userData.t4 = true;
  var prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function(sh, r){
    if(prev) prev.call(this, sh, r);
    sh.uniforms.uPan = U.uPan; sh.uniforms.uHalf = U.uHalf; sh.uniforms.uCol = U.uCol;
    sh.vertexShader = 'varying vec3 vAreaWPos;\nvarying vec3 vAreaWNorm;\n' +
      sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvAreaWNorm = normalize(mat3(modelMatrix) * objectNormal);')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAreaWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = RECT + '\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', INJECT);
  };
  var key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : function(){ return ''; };
  mat.customProgramCacheKey = function(){ return key() + '|t4area'; };
  mat.needsUpdate = true;
  return mat;
}

// ---- T4 PBR Room Architecture (../hospital-escape/assets/t4/) ----
var pendingLoads = 0;
var allAssetsDoneCbs = [];
function trackDone(){
  pendingLoads--;
  if(pendingLoads <= 0){
    var cbs = allAssetsDoneCbs.slice();
    allAssetsDoneCbs.length = 0;
    cbs.forEach(function(fn){ fn(); });
  }
}
function waitAllAssets(){
  if(pendingLoads <= 0) return Promise.resolve();
  return new Promise(function(res){ allAssetsDoneCbs.push(res); });
}

var T4_DIR = '../hospital-escape/assets/t4/';
var texLoader = new THREE.TextureLoader();
function t4Tex(file, srgb, rx, ry){
  pendingLoads++;
  var t = texLoader.load(T4_DIR + file, trackDone, undefined, function(){
    window.__CAST_ERRORS.push('Tex load fail: ' + file); trackDone();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  if(srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}

function tileGeo(g, w, h, tile){
  var uv = g.attributes.uv;
  for(var i = 0; i < uv.count; i++){
    uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (h / tile));
  }
  uv.needsUpdate = true;
  return g;
}

function buildT4Stage(){
  var stage = new THREE.Group();
  var flMap = t4Tex('floor_diff.jpg', true, 1, 1), flNor = t4Tex('floor_nor.jpg', false, 1, 1), flRgh = t4Tex('floor_rough.jpg', false, 1, 1);
  var wlMap = t4Tex('wall_diff.jpg',  true, 1, 1), wlNor = t4Tex('wall_nor.jpg',  false, 1, 1), wlRgh = t4Tex('wall_rough.jpg',  false, 1, 1);
  var ceMap = t4Tex('ceil_diff.jpg',  true, 1, 1), ceNor = t4Tex('ceil_nor.jpg',  false, 1, 1), ceRgh = t4Tex('ceil_rough.jpg',  false, 1, 1);
  var wdMap = t4Tex('wood_diff.jpg',  true, 1, 1), wdNor = t4Tex('wood_nor.jpg',  false, 1, 1), wdRgh = t4Tex('wood_rough.jpg',  false, 1, 1);

  var mFloor = withArea(new THREE.MeshStandardMaterial({ color: 0x5c7a86, map: flMap, normalMap: flNor, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: flRgh, roughness: 0.42, metalness: 0.02 }));
  var mWall  = withArea(new THREE.MeshStandardMaterial({ color: 0xb6c2c0, map: wlMap, normalMap: wlNor, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: wlRgh, roughness: 0.86, metalness: 0.0 }));
  var mCeil  = withArea(new THREE.MeshStandardMaterial({ color: 0xd0dade, map: ceMap, normalMap: ceNor, normalScale: new THREE.Vector2(0.22, 0.22), roughnessMap: ceRgh, roughness: 0.88, metalness: 0.0 }));
  var mWood  = withArea(new THREE.MeshStandardMaterial({ color: 0x947462, map: wdMap, normalMap: wdNor, roughnessMap: wdRgh, roughness: 0.54, metalness: 0.0 }));
  var mLens  = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.894 * 2.6, 0.961 * 2.6, 1.0 * 2.6), toneMapped: false });

  var flMesh = new THREE.Mesh(tileGeo(new THREE.PlaneGeometry(14, 14), 14, 14, 1.85), mFloor);
  flMesh.rotation.x = -Math.PI / 2; flMesh.receiveShadow = true; stage.add(flMesh);

  var ceMesh = new THREE.Mesh(tileGeo(new THREE.PlaneGeometry(14, 14), 14, 14, 1.90), mCeil);
  ceMesh.rotation.x = Math.PI / 2; ceMesh.position.y = 2.90; stage.add(ceMesh);

  function addWall(w, h, x, y, z, ry){
    var m = new THREE.Mesh(tileGeo(new THREE.PlaneGeometry(w, h), w, h, 1.80), mWall);
    m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; stage.add(m);
    // Wainscot trim strip
    var wTrim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.03), withArea(new THREE.MeshStandardMaterial({ color: 0x3b4d52, roughness: 0.55, metalness: 0.0 })));
    wTrim.position.set(x, 0.98, z); wTrim.rotation.y = ry; wTrim.receiveShadow = true; stage.add(wTrim);
  }
  addWall(14, 2.90,  0, 1.45, -5.0, 0);
  addWall(14, 2.90, -5.0, 1.45, 1.0, Math.PI / 2);
  addWall(14, 2.90,  5.0, 1.45, 1.0, -Math.PI / 2);

  // Two recessed wood hospital doors on the back wall
  [-3.2, 3.2].forEach(function(dx){
    var door = new THREE.Mesh(tileGeo(new THREE.BoxGeometry(1.02, 2.12, 0.06), 1.02, 2.12, 1.0), mWood);
    door.position.set(dx, 1.06, -4.96); door.receiveShadow = true; stage.add(door);
    var frm = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.18, 0.08), withArea(new THREE.MeshStandardMaterial({ color: 0x7c868d, roughness: 0.4, metalness: 0.45 })));
    frm.position.set(dx, 1.09, -4.98); stage.add(frm);
  });

  // Ceiling troffers matching PANELS
  for(var i = 0; i < K; i++){
    var p = PANELS[i];
    var lm = new THREE.Mesh(new THREE.PlaneGeometry(0.60, 1.20), mLens);
    lm.rotation.x = Math.PI / 2; lm.position.set(p[0], 2.885, p[2]); stage.add(lm);
  }
  scene.add(stage);

  // T4 hemisphere + key shadow spot + warm accent bounce + soft front fill so 3D faces read under ACES
  var hemi = new THREE.HemisphereLight(0x7a9eb0, 0x1a2228, 0.24); scene.add(hemi);
  var keySpot = new THREE.SpotLight(0xdff2ff, 1.55, 16.0, 0.98, 0.65, 1.25);
  keySpot.position.set(0.6, 2.82, 3.2);
  keySpot.target.position.set(0, 0.85, 0);
  keySpot.castShadow = true;
  keySpot.shadow.mapSize.set(1024, 1024);
  keySpot.shadow.bias = -0.0005;
  scene.add(keySpot); scene.add(keySpot.target);

  var warmBounce = new THREE.PointLight(0xffc278, 0.85, 9.0, 1.5);
  warmBounce.position.set(-2.2, 1.65, 1.8);
  scene.add(warmBounce);

  var frontFill = new THREE.DirectionalLight(0xd6e8f2, 0.48);
  frontFill.position.set(0.2, 1.9, 5.2);
  scene.add(frontFill);

  return { stage: stage, mWood: mWood, keySpot: keySpot, warmBounce: warmBounce };
}
var stageEnv = buildT4Stage();

// ---- Calibrated Hospital Bed Prop (A.bed exact mattress top y = 0.72 m, clear front view) ----
function buildHospitalBed(options){
  options = options || {};
  var g = new THREE.Group();
  var mSteel = withArea(new THREE.MeshStandardMaterial({ color: 0x7b858d, roughness: 0.30, metalness: 0.72 }));
  var mPad   = withArea(new THREE.MeshStandardMaterial({ color: 0x202b32, roughness: 0.65, metalness: 0.05 }));
  var mSheet = withArea(new THREE.MeshStandardMaterial({ color: 0x90999b, roughness: 0.88, metalness: 0.0 }));
  var mStripe= withArea(new THREE.MeshStandardMaterial({ color: 0x5c7f92, roughness: 0.90, metalness: 0.0 }));
  var mDark  = withArea(new THREE.MeshStandardMaterial({ color: 0x111518, roughness: 0.85, metalness: 0.0 }));

  function bx(w, h, d, mat, x, y, z, rx){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if(rx) m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  // Frame & mattress spanning z = 0.0 (head) to z = 1.92 (foot), mattress TOP strictly y = 0.720 m!
  bx(0.76, 0.06, 1.88, mSteel, 0, 0.55, 0.96);
  bx(0.72, 0.14, 1.84, mPad,   0, 0.65, 0.96);      // top = 0.65 + 0.07 = 0.720 m
  bx(0.70, 0.008, 1.82, mSheet, 0, 0.718, 0.96);    // fitted sheet flush at y = 0.722 m
  bx(0.46, 0.075, 0.28, mSheet, 0, 0.752, 0.24);    // thin hospital pillow under head
  // Far-side rail raised, near-side rail lowered/omitted so torso/gown/calves/socks are unobstructed
  if(!options.noFarRail){
    bx(0.025, 0.025, 1.18, mSteel, -0.39, 0.86, 0.96);
    [-0.45, 0.0, 0.45].forEach(function(oz){ bx(0.022, 0.24, 0.022, mSteel, -0.39, 0.74, 0.96 + oz); });
  }
  if(!options.openNearSide){
    bx(0.025, 0.025, 1.18, mSteel, 0.39, 0.68, 0.96);
  }
  [-0.31, 0.31].forEach(function(sx){
    bx(0.03, 0.44, 0.03, mSteel, sx, 0.78, 0.0);
    bx(0.03, 0.48, 0.03, mSteel, sx * 0.92, 0.30, 0.08);
    bx(0.03, 0.48, 0.03, mSteel, sx * 0.92, 0.30, 1.84);
  });
  var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.74, 12), mDark);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.00, 0.0); bar.castShadow = true; g.add(bar);
  // Foot stripe accent on mattress end (leaves lower legs & grippy socks visible!)
  bx(0.71, 0.010, 0.14, mStripe, 0, 0.720, 1.80);

  [-0.28, 0.28].forEach(function(sx){
    [0.12, 1.80].forEach(function(sz){
      var ct = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12), mDark);
      ct.rotation.z = Math.PI / 2; ct.position.set(sx, 0.06, sz); g.add(ct);
    });
  });
  return g;
}

// ---- Wheelchair Prop ----
function buildWheelchairProp(){
  var g = new THREE.Group();
  var mChrome = withArea(new THREE.MeshStandardMaterial({ color: 0x8e969e, roughness: 0.28, metalness: 0.85 }));
  var mSeat   = withArea(new THREE.MeshStandardMaterial({ color: 0x1e2832, roughness: 0.75, metalness: 0.05 }));
  var mRubber = withArea(new THREE.MeshStandardMaterial({ color: 0x16191c, roughness: 0.88, metalness: 0.0 }));
  function bx(w, h, d, mat, x, y, z, rx){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if(rx) m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  bx(0.46, 0.05, 0.44, mSeat, 0, 0.49, 0.04);
  bx(0.46, 0.46, 0.05, mSeat, 0, 0.75, -0.17, -0.06);
  [-0.25, 0.25].forEach(function(sx){
    bx(0.035, 0.035, 0.44, mSeat, sx, 0.68, 0.02);
    bx(0.024, 0.36, 0.024, mChrome, sx, 0.34, 0.24);
    bx(0.024, 0.62, 0.024, mChrome, sx, 0.56, -0.20);
    bx(0.022, 0.022, 0.16, mChrome, sx * 0.92, 0.99, -0.27);
    var rt = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.022, 10, 28), mRubber);
    rt.rotation.y = Math.PI / 2; rt.position.set(sx > 0 ? 0.29 : -0.29, 0.295, -0.04); rt.castShadow = true; g.add(rt);
    var ct = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.028, 16), mRubber);
    ct.rotation.z = Math.PI / 2; ct.position.set(sx * 0.84, 0.085, 0.30); ct.castShadow = true; g.add(ct);
  });
  bx(0.40, 0.02, 0.15, mChrome, 0, 0.13, 0.34, 0.15);
  return g;
}

// ---- Nurses' Station Desk + Stool ----
function buildNurseStation(){
  var g = new THREE.Group();
  var mBase = withArea(new THREE.MeshStandardMaterial({ color: 0x3b5862, roughness: 0.72, metalness: 0.0 }));
  var mTop  = withArea(new THREE.MeshStandardMaterial({ color: 0x7e6452, roughness: 0.55, metalness: 0.0 }));
  var mMon  = withArea(new THREE.MeshStandardMaterial({ color: 0x151a1e, roughness: 0.42, metalness: 0.2 }));
  var mScr  = new THREE.MeshBasicMaterial({ color: 0x4ca6c8, toneMapped: false });
  var mChr  = withArea(new THREE.MeshStandardMaterial({ color: 0x202a30, roughness: 0.65, metalness: 0.1 }));

  function bx(w, h, d, mat, x, y, z){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  // Low typing workdesk at y = 0.64 m (so Staff_Typing hands at y=0.67-0.70 hover cleanly above keyboard!)
  bx(2.2, 0.04, 0.62, mTop, 0, 0.62, 0.58);
  bx(0.05, 0.60, 0.58, mBase, -1.05, 0.30, 0.58);
  bx(0.05, 0.60, 0.58, mBase,  1.05, 0.30, 0.58);
  // Keyboard & mouse pad on typing surface (z ~ 0.46)
  bx(0.42, 0.016, 0.14, mChr, 0.0, 0.648, 0.48);
  // Raised reception counter behind typing surface (z = 0.88, y = 0.96)
  bx(2.4, 0.94, 0.18, mBase, 0, 0.47, 0.88);
  bx(2.48, 0.05, 0.30, mTop, 0, 0.96, 0.88);
  // Monitors on typing desk off to left so torso/badge/stethoscope stay clear (y = 0.64..1.05, z = 0.72)
  bx(0.48, 0.30, 0.03, mMon, -0.34, 0.86, 0.72);
  bx(0.42, 0.24, 0.01, mScr, -0.34, 0.86, 0.702);
  bx(0.08, 0.16, 0.06, mMon, -0.34, 0.70, 0.74);
  // Desk stool aligned with Staff_Typing hips (y = 0.45 m)
  var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), mChr);
  seat.position.set(0, 0.44, -0.02); seat.castShadow = true; seat.receiveShadow = true; g.add(seat);
  bx(0.04, 0.40, 0.04, mChr, 0, 0.22, -0.02);
  bx(0.36, 0.03, 0.36, mChr, 0, 0.02, -0.02);
  return g;
}

// ---- GLB Loader & Actor Preparation (preserves metallic roughness/metalness!) ----
function prepActor(gltf, role){
  var root = gltf.scene;
  var bones = {}, meshes = [], tris = 0;
  var METAL_NAMES = /^(HaleGlassesMat|HaleClipMetal|NurseStethMetal|PistolMat|LongGunMat|GearMat)/;
  root.traverse(function(o){
    if(o.isBone) bones[o.name] = o;
    if(o.isMesh){
      meshes.push(o);
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      if(o.geometry && o.geometry.index) tris += Math.round(o.geometry.index.count / 3);
      else if(o.geometry && o.geometry.attributes && o.geometry.attributes.position) tris += Math.round(o.geometry.attributes.position.count / 3);
      var ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach(function(m){
        if(!m) return;
        if(m.map) m.map.encoding = THREE.sRGBEncoding;
        if(!m.name || !METAL_NAMES.test(m.name)){
          if(m.metalness > 0.2) m.metalness = m.metalness; // keep any explicit metal
          else m.metalness = 0.0;
        }
        withArea(m);
      });
    }
  });
  var clips = {};
  (gltf.animations || []).forEach(function(c){
    var clean = c.name.replace(/\.\d+$/, '');
    if(!clips[clean]) clips[clean] = c;
    clips[c.name] = c;
  });
  return { role: role, root: root, bones: bones, meshes: meshes, clips: clips, mixer: new THREE.AnimationMixer(root), tris: tris, curAction: null };
}

function playClip(actor, name, tSec){
  var clip = actor.clips[name];
  if(!clip){
    var keys = Object.keys(actor.clips);
    clip = keys.length ? actor.clips[keys[0]] : null;
  }
  if(!clip) return;
  if(!actor.curAction || actor.curAction.getClip() !== clip){
    if(actor.curAction) actor.curAction.stop();
    actor.curAction = actor.mixer.clipAction(clip);
    actor.curAction.reset();
    actor.curAction.play();
  }
  var dur = Math.max(clip.duration || 1.0, 0.01);
  actor.mixer.setTime(tSec % dur);
  actor.root.updateMatrixWorld(true);
}

var ACTORS = {};
var CQ_MANIFEST = {}, CP_MANIFEST = {};
var props = {
  bed1: buildHospitalBed({ openNearSide: true }),
  bed2: buildHospitalBed({ openNearSide: true }),
  wc:   buildWheelchairProp(),
  desk: buildNurseStation()
};
scene.add(props.bed1); scene.add(props.bed2); scene.add(props.wc); scene.add(props.desk);

var stageGrp = new THREE.Group();
scene.add(stageGrp);
var t4Props = {};

var loader = new THREE.GLTFLoader();
function loadGLB(url, role){
  return new Promise(function(res, rej){
    loader.load(url, function(gltf){ res(prepActor(gltf, role)); }, undefined, rej);
  });
}
function loadPropsGLB(){
  return new Promise(function(res){
    loader.load(T4_DIR + 'props.glb', function(gltf){
      gltf.scene.traverse(function(o){
        if(o.name) t4Props[o.name] = o;
        if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; if(o.material) withArea(o.material); }
      });
      res();
    }, undefined, function(){ res(); });
  });
}

function setColeArmed(armed){
  if(!ACTORS.cole) return;
  ACTORS.cole.meshes.forEach(function(m){
    if(m.name && m.name.indexOf('ColePistol') >= 0) m.visible = !!armed;
  });
}

function resetVisibility(){
  props.bed1.visible = false; props.bed2.visible = false;
  props.wc.visible = false; props.desk.visible = false;
  Object.keys(ACTORS).forEach(function(k){
    var a = ACTORS[k];
    if(a.root.parent === stageGrp) stageGrp.remove(a.root);
    a.root.position.set(0, 0, 0);
    a.root.rotation.set(0, 0, 0);
    a.root.scale.setScalar(1);
  });
  Object.keys(t4Props).forEach(function(k){
    if(t4Props[k].parent === stageGrp) stageGrp.remove(t4Props[k]);
  });
}

function getBedDy(role, clip){
  var m = CQ_MANIFEST[role] || {};
  var bo = (m.bed_offsets || {})[clip];
  return bo ? bo.bed_dy_for_mattress_072m : -0.24;
}

function updateScene(tSec){
  state.t = tSec;
  resetVisibility();
  setColeArmed(false);
  var md = state.mode;

  if(md === 'room412'){
    // Room 412 opening scene: Cole lying on bed (left/center), Maya standing alongside, Dr. Hale objecting in doorway
    props.bed1.visible = true;
    props.bed1.position.set(-0.75, 0, -0.96);
    stageGrp.add(ACTORS.cole.root);
    var cDy = getBedDy('cole', 'Lay_Breathless');
    ACTORS.cole.root.position.set(-0.75, cDy, 0.0);
    playClip(ACTORS.cole, 'Lay_Breathless', tSec);

    stageGrp.add(ACTORS.maya.root);
    ACTORS.maya.root.position.set(0.02, 0, 0.12);
    ACTORS.maya.root.rotation.y = 0.85;
    playClip(ACTORS.maya, 'Walk_Fem', 0.1);

    stageGrp.add(ACTORS.dr_hale.root);
    ACTORS.dr_hale.root.position.set(0.74, 0, -0.35);
    ACTORS.dr_hale.root.rotation.y = -0.62;
    playClip(ACTORS.dr_hale, state.clip || 'Hale_Objecting', tSec);

    if(t4Props.IVStandHero){ t4Props.IVStandHero.position.set(-1.35, 0, -0.82); stageGrp.add(t4Props.IVStandHero); }
    stageEnv.keySpot.position.set(0.2, 2.82, 2.8);
    stageEnv.keySpot.target.position.set(0.0, 0.9, -0.2);
    camera.position.set(2.25, 1.56, 3.85);
    camera.lookAt(0.06, 1.00, -0.15);
  }
  else if(md === 'ward_beds'){
    // Two calibrated beds side by side: Patient Lying (left, sagely gown) + Cole (right, pajama trousers & grippy socks)
    props.bed1.visible = true; props.bed1.position.set(-0.68, 0, -0.96);
    props.bed2.visible = true; props.bed2.position.set( 0.68, 0, -0.96);

    var pClip = state.clip || 'Lay_Breathless';
    stageGrp.add(ACTORS.patient_lying.root);
    ACTORS.patient_lying.root.position.set(-0.68, getBedDy('patient_lying', pClip), 0.0);
    playClip(ACTORS.patient_lying, pClip, tSec);

    stageGrp.add(ACTORS.cole.root);
    ACTORS.cole.root.position.set(0.68, getBedDy('cole', 'Lay_Sleeping'), 0.0);
    playClip(ACTORS.cole, 'Lay_Sleeping', tSec);

    if(state.cam === 'cole_legs'){
      camera.position.set(1.52, 1.18, 1.38);
      camera.lookAt(0.68, 0.80, 0.48);
    } else if(state.cam === 'patient_side'){
      camera.position.set(-2.35, 1.56, 0.92);
      camera.lookAt(-0.42, 0.76, 0.08);
    } else {
      camera.position.set(0.0, 1.62, 2.30);
      camera.lookAt(0.0, 0.84, 0.05);
    }
  }
  else if(md === 'cole_chair'){
    props.wc.visible = true;
    props.wc.position.set(0, 0, -0.05);
    stageGrp.add(ACTORS.cole.root);
    ACTORS.cole.root.position.set(0, -0.02, 0.0);
    playClip(ACTORS.cole, state.clip || 'Sit_Idle_Breath', tSec);
    if(state.cam === 'legs'){
      camera.position.set(0.72, 0.56, 1.05);
      camera.lookAt(0.0, 0.34, 0.28);
    } else {
      camera.position.set(0.95, 1.05, 1.48);
      camera.lookAt(0.0, 0.68, 0.10);
    }
  }
  else if(md === 'nurse_station'){
    props.desk.visible = true;
    props.desk.position.set(-0.15, 0, 0.25);
    props.desk.rotation.y = 0.0;

    stageGrp.add(ACTORS.nurse_female.root);
    ACTORS.nurse_female.root.position.set(-0.15, -0.02, 0.22);
    playClip(ACTORS.nurse_female, state.clip || 'Staff_Typing', tSec);

    stageGrp.add(ACTORS.nurse_male.root);
    ACTORS.nurse_male.root.position.set(0.68, 0, 0.22);
    ACTORS.nurse_male.root.rotation.y = 0.18;
    playClip(ACTORS.nurse_male, 'Staff_Talking_On_Phone', tSec);

    stageEnv.warmBounce.position.set(0.2, 1.55, 1.5);
    camera.position.set(0.95, 1.62, 3.35);
    camera.lookAt(0.24, 0.94, 0.24);
  }
  else if(md === 'corridor'){
    stageGrp.add(ACTORS.dr_hale.root);
    ACTORS.dr_hale.root.position.set(-0.85, 0, -0.4);
    ACTORS.dr_hale.root.rotation.y = 0.08;
    playClip(ACTORS.dr_hale, state.clip || 'Hale_Walk', tSec);

    stageGrp.add(ACTORS.nurse_female.root);
    ACTORS.nurse_female.root.position.set(0.02, 0, 0.2);
    playClip(ACTORS.nurse_female, 'Staff_Walk', tSec);

    stageGrp.add(ACTORS.nurse_male.root);
    ACTORS.nurse_male.root.position.set(0.88, 0, -0.2);
    ACTORS.nurse_male.root.rotation.y = -0.08;
    playClip(ACTORS.nurse_male, 'Staff_Walk', tSec + 0.35);

    if(t4Props.WetFloorCone){ t4Props.WetFloorCone.position.set(-1.55, 0, 1.15); stageGrp.add(t4Props.WetFloorCone); }
    camera.position.set(0.0, 1.50, 4.95);
    camera.lookAt(0.0, 0.94, -0.15);
  }
  else if(md === 'hale_detail'){
    stageGrp.add(ACTORS.dr_hale.root);
    var hClip = state.clip || 'Hale_Objecting';
    playClip(ACTORS.dr_hale, hClip, tSec);
    if(state.cam === 'side'){
      camera.position.set(1.22, 1.34, 0.38); camera.lookAt(0, 1.24, 0);
    } else {
      camera.position.set(0.26, 1.36, 1.38); camera.lookAt(0, 1.18, 0.04);
    }
  }
  else if(md === 'nurse_f_detail'){
    stageGrp.add(ACTORS.nurse_female.root);
    playClip(ACTORS.nurse_female, state.clip || 'Staff_Idle', tSec);
    if(state.cam === 'back'){
      camera.position.set(0.24, 1.28, -1.28); camera.lookAt(0, 1.16, 0);
    } else {
      camera.position.set(0.22, 1.24, 1.32); camera.lookAt(0, 1.12, 0.04);
    }
  }
  else if(md === 'nurse_m_detail'){
    stageGrp.add(ACTORS.nurse_male.root);
    playClip(ACTORS.nurse_male, state.clip || 'Staff_Idle', tSec);
    camera.position.set(0.28, 1.28, 1.42); camera.lookAt(0, 1.16, 0.02);
  }
  else {
    // Full 7-character staggered cast portrait (fits 390x844 mobile portrait aspect cleanly!)
    var order = [
      ['dr_hale',      -0.84, 0.35, 'Hale_Objecting',    0.18],
      ['cole',         -0.28, 0.55, 'Sit_Idle_Breath',   0.06],
      ['nurse_female',  0.28, 0.45, 'Staff_Idle',       -0.06],
      ['nurse_male',    0.84, 0.35, 'Staff_Idle',       -0.18],
      ['patient_lying',-0.56,-0.75, 'Sit_Idle_Breath',   0.10],
      ['maya',          0.02,-0.80, 'Walk_Fem',          0.02],
      ['gunman',        0.58,-0.75, 'Pistol_Idle_Alert',-0.12]
    ];
    order.forEach(function(item){
      var a = ACTORS[item[0]];
      if(!a) return;
      stageGrp.add(a.root);
      a.root.position.set(item[1], 0, item[2]);
      a.root.rotation.y = item[4];
      playClip(a, item[3], tSec);
    });
    camera.position.set(0.0, 1.46, 5.40);
    camera.lookAt(0.0, 0.90, -0.10);
  }

  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);

  var info = renderer.info.render;
  var headBone = (ACTORS.patient_lying && ACTORS.patient_lying.bones.Head) ? ACTORS.patient_lying.bones.Head : null;
  var headPos = headBone ? new THREE.Vector3().setFromMatrixPosition(headBone.matrixWorld).toArray() : null;
  return {
    mode: state.mode, clip: state.clip, cam: state.cam, t: +state.t.toFixed(2),
    calls: info.calls, triangles: info.triangles,
    consoleErrors: window.__CAST_ERRORS.slice(),
    patientHeadWorld: headPos
  };
}

// ---- Interactive HUD ----
function buildHUD(){
  var modes = [
    ['room412', 'Room 412'], ['ward_beds', 'Ward Beds'], ['cole_chair', 'Cole Chair'],
    ['nurse_station', 'Nurse Station'], ['corridor', 'Corridor Walk'],
    ['hale_detail', 'Hale Close'], ['nurse_f_detail', 'Nurse F'], ['nurse_m_detail', 'Nurse M'],
    ['lineup', 'Full Lineup']
  ];
  var mb = document.getElementById('modeBar');
  modes.forEach(function(m){
    var b = document.createElement('button');
    b.className = 'btn' + (state.mode === m[0] ? ' on' : '');
    b.textContent = m[1];
    b.onclick = function(){
      state.mode = m[0]; state.clip = ''; state.cam = 'hero';
      Array.from(mb.children).forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      updateHUD(updateScene(state.t));
    };
    mb.appendChild(b);
  });
}
function updateHUD(st){
  if(CLEAN) return;
  document.getElementById('meta').textContent =
    'mode=' + st.mode + ' cam=' + st.cam + ' t=' + st.t + ' | calls=' + st.calls + ' tris=' + st.triangles;
}

// ---- Boot ----
Promise.all([
  fetch('assets/cast-pass/cast-quality-manifest.json').then(function(r){ return r.json(); }),
  fetch('assets/cast-pass/cast-pass-manifest.json').then(function(r){ return r.json(); })
]).then(function(mans){
  CQ_MANIFEST = mans[0]; CP_MANIFEST = mans[1];
  return Promise.all([
    loadGLB('assets/cast-pass/dr-hale-mixamo.glb', 'dr_hale'),
    loadGLB('assets/cast-pass/cole-mixamo.glb', 'cole'),
    loadGLB('assets/cast-pass/patient-lying-mixamo.glb', 'patient_lying'),
    loadGLB('assets/cast-pass/nurse-female-mixamo.glb', 'nurse_female'),
    loadGLB('assets/cast-pass/nurse-male-mixamo.glb', 'nurse_male'),
    loadGLB('assets/cast-pass/maya-mixamo.glb', 'maya'),
    loadGLB('assets/cast-pass/gunman-mixamo.glb', 'gunman'),
    loadPropsGLB()
  ]);
}).then(function(list){
  ACTORS.dr_hale = list[0];
  ACTORS.cole = list[1];
  ACTORS.patient_lying = list[2];
  ACTORS.nurse_female = list[3];
  ACTORS.nurse_male = list[4];
  ACTORS.maya = list[5];
  ACTORS.gunman = list[6];
  return waitAllAssets();
}).then(function(){
  document.getElementById('loading').style.display = 'none';
  buildHUD();
  var st0 = updateScene(state.t);
  updateHUD(st0);

  window.__castQualityReady = true;
  window.__castQualityRig = {
    ready: true,
    manifest: CQ_MANIFEST,
    actors: ACTORS,
    setState: function(opts){
      if(opts){
        if(opts.mode !== undefined) state.mode = opts.mode;
        if(opts.clip !== undefined) state.clip = opts.clip;
        if(opts.cam  !== undefined) state.cam  = opts.cam;
        if(typeof opts.t === 'number') state.t = opts.t;
      }
      state.paused = true;
      var st = updateScene(state.t);
      updateHUD(st);
      return st;
    }
  };

  var last = performance.now();
  function tick(now){
    requestAnimationFrame(tick);
    if(state.paused) return;
    var dt = Math.min(0.05, (now - last) * 0.001);
    last = now;
    updateHUD(updateScene(state.t + dt));
  }
  requestAnimationFrame(tick);
}).catch(function(err){
  window.__CAST_ERRORS.push(String(err && err.stack || err));
  document.getElementById('loading').textContent = 'LOAD ERROR: ' + err.message;
});
})();
