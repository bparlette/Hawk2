/* Hospital Escape — Neon Mixamo Cast Pass Showcase
   Loads retargeted MIT VALID cast GLBs (gunman-mixamo.glb, maya-mixamo.glb, cole-mixamo.glb)
   using pinned three@0.128.0 + GLTFLoader.js (explicitly flagged). */
(function(){
'use strict';

var Q = new URLSearchParams(location.search);
var CLEAN = Q.get('clean') === '1';
if(CLEAN) document.body.classList.add('clean');

window.__CAST_ERRORS = [];
window.addEventListener('error', function(e){ window.__CAST_ERRORS.push(String((e && e.message) || e)); });

var canvas = document.getElementById('c');
var metaEl = document.getElementById('meta');
var loadingEl = document.getElementById('loading');

var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
renderer.setSize(390, 844, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1118);
scene.fog = new THREE.Fog(0x0c1118, 16, 44);
var camera = new THREE.PerspectiveCamera(48, 390 / 844, 0.05, 120);

// Clean atmospheric St. Mercer bay lighting (reveals cloth folds & contact shadows without flat washout)
scene.add(new THREE.HemisphereLight(0xc2d8e4, 0x1a222a, 0.62));
scene.add(new THREE.AmbientLight(0xdcebf2, 0.22));
var keyL = new THREE.DirectionalLight(0xfff0dc, 1.10);
keyL.position.set(4.5, 8.5, 5.5);
keyL.castShadow = true;
keyL.shadow.mapSize.set(1024, 1024);
keyL.shadow.camera.near = 1;
keyL.shadow.camera.far = 32;
keyL.shadow.camera.left = -6; keyL.shadow.camera.right = 6;
keyL.shadow.camera.top = 12; keyL.shadow.camera.bottom = -12;
keyL.shadow.bias = -0.0005;
scene.add(keyL);
var rimL = new THREE.DirectionalLight(0x7fb4cc, 0.45);
rimL.position.set(-5.0, 4.5, -5.0);
scene.add(rimL);

// Calibrated 1.0 m grid terrazzo bay floor (proves stance foot-lock & zero floor skate visually)
(function buildBayFloor(){
  var cv = document.createElement('canvas'); cv.width = cv.height = 512;
  var cx = cv.getContext('2d');
  cx.fillStyle = '#1b242c'; cx.fillRect(0, 0, 512, 512);
  // Subtle terrazzo speckle
  for(var i = 0; i < 650; i++){
    var sx = (i * 197) % 512, sy = (i * 313) % 512;
    cx.fillStyle = (i % 3 === 0) ? 'rgba(95,120,132,0.22)' : 'rgba(18,24,30,0.35)';
    cx.fillRect(sx, sy, 4, 4);
  }
  cx.strokeStyle = 'rgba(110,165,182,0.34)'; cx.lineWidth = 4;
  cx.strokeRect(2, 2, 508, 508);
  cx.strokeStyle = 'rgba(110,165,182,0.14)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(256, 0); cx.lineTo(256, 512); cx.moveTo(0, 256); cx.lineTo(512, 256); cx.stroke();
  var tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 40); tex.anisotropy = 4;
  var fl = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 40),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.06 })
  );
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
})();

// Calibrated Hospital Wheelchair Prop (handles strictly at y=0.985m, x=+-0.23m, seat=0.48m)
function buildWheelchairProp(){
  var g = new THREE.Group();
  var mChrome = new THREE.MeshStandardMaterial({ color: 0x8e98a0, roughness: 0.28, metalness: 0.78 });
  var mSeat   = new THREE.MeshStandardMaterial({ color: 0x1e252c, roughness: 0.78, metalness: 0.05 });
  var mRubber = new THREE.MeshStandardMaterial({ color: 0x101316, roughness: 0.90, metalness: 0.0 });
  var mGrip   = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.85, metalness: 0.0 });
  var mBlanket= new THREE.MeshStandardMaterial({ color: 0x9aa2a4, roughness: 0.95, metalness: 0.0 }); // cap <= 0.68 lin
  var mStripe = new THREE.MeshStandardMaterial({ color: 0x5c7f92, roughness: 0.95, metalness: 0.0 });

  function box(w, h, d, mat, x, y, z, rx){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if(rx) m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, rx, rz){
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat);
    m.position.set(x, y, z); if(rx) m.rotation.x = rx; if(rz) m.rotation.z = rz; m.castShadow = true; g.add(m); return m;
  }

  // Seat (y=0.48m), backrest (tilted slightly aft -Z), side frame rails
  box(0.46, 0.055, 0.44, mSeat, 0, 0.46, 0.04);
  box(0.45, 0.44,  0.045, mSeat, 0, 0.70, -0.19, -0.09);

  // Rear push-handle vertical tubes + rubberized push grips strictly at y=0.985m, x=+-0.23m, z=-0.30m
  var handleMarkers = {};
  [-0.23, 0.23].forEach(function(sx, idx){
    cyl(0.014, 0.014, 0.76, mChrome, sx, 0.62, -0.21, -0.14, 0);
    // Backward horizontal push bar reaching z=-0.32m at y=0.985m
    cyl(0.015, 0.015, 0.14, mGrip, sx, 0.985, -0.28, Math.PI / 2, 0);
    var mk = new THREE.Object3D(); mk.position.set(sx, 0.985, -0.30); g.add(mk);
    handleMarkers[idx === 0 ? 'R' : 'L'] = mk; // Note: character facing +Z has +X Left, -X Right!
    // Armrests
    box(0.035, 0.03, 0.34, mGrip, sx * 1.04, 0.68, 0.04);
    cyl(0.012, 0.012, 0.22, mChrome, sx * 1.04, 0.57, 0.18, 0, 0);
    // Front caster fork + footrests
    cyl(0.012, 0.012, 0.38, mChrome, sx * 0.92, 0.28, 0.27, 0.32, 0);
    box(0.14, 0.018, 0.13, mChrome, sx * 0.62, 0.12, 0.38, -0.12);
  });

  // Main rear wheels (r=0.295m, y=0.295m) & front casters (r=0.085m) grouped for spin
  var wheels = [];
  [-0.275, 0.275].forEach(function(sx){
    var wg = new THREE.Group(); wg.position.set(sx, 0.295, -0.06);
    var tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.022, 10, 24), mRubber);
    tire.rotation.y = Math.PI / 2; tire.castShadow = true; wg.add(tire);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 8, 20), mChrome);
    rim.rotation.y = Math.PI / 2; wg.add(rim);
    for(var k = 0; k < 4; k++){
      var sp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 6), mChrome);
      sp.rotation.x = (k * Math.PI) / 4; wg.add(sp);
    }
    g.add(wg); wheels.push({ grp: wg, r: 0.295 });
  });
  [-0.21, 0.21].forEach(function(sx){
    var cw = new THREE.Group(); cw.position.set(sx, 0.085, 0.30);
    var ct = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.028, 16), mRubber);
    ct.rotation.z = Math.PI / 2; ct.castShadow = true; cw.add(ct);
    g.add(cw); wheels.push({ grp: cw, r: 0.085 });
  });

    // Striped folded hospital blanket draped neatly across knees/lap inside wheelchair armrests
  var blanket = new THREE.Group();
  var bTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.024, 0.26), mBlanket);
  bTop.position.set(0, 0.628, 0.31); bTop.rotation.x = 0.14; blanket.add(bTop);
  var st = new THREE.Mesh(new THREE.BoxGeometry(0.404, 0.012, 0.06), mStripe);
  st.position.set(0, 0.630, 0.37); st.rotation.x = 0.14; blanket.add(st);
  g.add(blanket);

  return { group: g, handles: handleMarkers, wheels: wheels, blanket: blanket };
}

// Calibrated Hospital Bed Prop (length 1.96m, width 0.86m, headboard push bar strictly y=1.00m)
function buildHospitalBedProp(){
  var g = new THREE.Group();
  var mSteel = new THREE.MeshStandardMaterial({ color: 0x7b858d, roughness: 0.30, metalness: 0.72 });
  var mPad   = new THREE.MeshStandardMaterial({ color: 0x202b32, roughness: 0.65, metalness: 0.05 });
  var mSheet = new THREE.MeshStandardMaterial({ color: 0x8b9698, roughness: 0.88, metalness: 0.0 });
  var mStripe= new THREE.MeshStandardMaterial({ color: 0x5c7f92, roughness: 0.92, metalness: 0.0 });
  var mDark  = new THREE.MeshStandardMaterial({ color: 0x111518, roughness: 0.85, metalness: 0.0 });

  function bx(w, h, d, mat, x, y, z, rx){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); if(rx) m.rotation.x = rx; m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  // Frame & mattress centered cleanly from z=0.0 (headboard push bar) to z=1.92m (footboard)
  bx(0.76, 0.06, 1.88, mSteel, 0, 0.56, 0.96);
  bx(0.72, 0.14, 1.82, mPad,   0, 0.65, 0.96);
  bx(0.73, 0.06, 1.56, mSheet, 0, 0.73, 1.05);
  bx(0.50, 0.10, 0.30, mSheet, 0, 0.77, 0.25); // pillow near head end
  bx(0.74, 0.02, 0.14, mStripe,0, 0.76, 1.55); // striped blanket band
  // Side rails
  [-0.38, 0.38].forEach(function(sx){
    bx(0.025, 0.025, 1.32, mSteel, sx, 0.86, 0.96);
    [-0.5, 0.0, 0.5].forEach(function(oz){ bx(0.022, 0.24, 0.022, mSteel, sx, 0.74, 0.96 + oz); });
  });
  // Headboard tubular push bar at z=0.0, y=1.00m, x=+-0.31m
  [-0.31, 0.31].forEach(function(sx){
    bx(0.03, 0.44, 0.03, mSteel, sx, 0.78, 0.0);
    bx(0.03, 0.48, 0.03, mSteel, sx * 0.92, 0.32, 0.08);
    bx(0.03, 0.48, 0.03, mSteel, sx * 0.92, 0.32, 1.84);
  });
  var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.74, 12), mDark);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.00, 0.0); bar.castShadow = true; g.add(bar);
  var hL = new THREE.Object3D(); hL.position.set(0.31, 1.00, 0.0); g.add(hL);
  var hR = new THREE.Object3D(); hR.position.set(-0.31, 1.00, 0.0); g.add(hR);

  // Casters
  var casters = [];
  [-0.28, 0.28].forEach(function(sx){
    [0.12, 1.80].forEach(function(sz){
      var cw = new THREE.Group(); cw.position.set(sx, 0.06, sz);
      var ct = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12), mDark);
      ct.rotation.z = Math.PI / 2; cw.add(ct); g.add(cw); casters.push({ grp: cw, r: 0.06 });
    });
  });
  return { group: g, handles: { L: hL, R: hR }, wheels: casters };
}

function buildMuzzleFlash(){
  var g = new THREE.Group();
  var matCore = new THREE.MeshBasicMaterial({ color: 0xfff6cf, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false });
  var matHalo = new THREE.MeshBasicMaterial({ color: 0xff8c2a, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false });
  var cone = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.13, 10, 1, true), matHalo);
  cone.rotation.x = Math.PI / 2; cone.position.z = 0.075; g.add(cone);
  var core = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), matCore);
  core.position.z = 0.014; g.add(core);
  var pL = new THREE.PointLight(0xffaa44, 2.2, 4.0, 2.0);
  g.add(pL);
  g.visible = false;
  return g;
}

function prepGLBModel(gltf, roleName){
  var root = gltf.scene;
  var tris = 0, bones = {}, meshes = [];
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
        if(!m.name || (m.name.indexOf('PistolMat') !== 0 && m.name.indexOf('LongGun') !== 0)) m.metalness = 0.0;
      });
    }
  });
  var clips = {};
  (gltf.animations || []).forEach(function(c){
    var clean = c.name.replace(/\.\d+$/, '');
    if(!clips[clean]) clips[clean] = c;
    clips[c.name] = c;
  });
  return { role: roleName, root: root, bones: bones, meshes: meshes, clips: clips, mixer: new THREE.AnimationMixer(root), tris: tris, curAction: null };
}

var MANIFEST = null;
var ACTORS = {};
var wcProp = buildWheelchairProp();
var bedProp = buildHospitalBedProp();
var muzzle = buildMuzzleFlash();
scene.add(wcProp.group);
scene.add(bedProp.group);
scene.add(muzzle);

// Track wrappers so locomotion steps linearly at true physical m/s with zero floor skate
var gunTrack = new THREE.Group(); scene.add(gunTrack);
var duoTrack = new THREE.Group(); scene.add(duoTrack);
var mayaBedTrack = new THREE.Group(); scene.add(mayaBedTrack);
var coleSoloGrp = new THREE.Group(); scene.add(coleSoloGrp);
var lineUpGrp = new THREE.Group(); scene.add(lineUpGrp);

var MODES = {
  gunman: {
    label: 'GUNMAN',
    clips: ['Pistol_Walk', 'Pistol_Walk_Fire', 'Pistol_Walk_Fire_SG', 'Pistol_Idle_Alert', 'Cover_To_Shooting', 'Dying_Headshot_Knees', 'Pistol_Aim', 'Pistol_Run_Aimed', 'Pistol_Run', 'Pistol_Strafe_L_Fire', 'Crouch_Walk_Aim', 'Cover_Fire', 'Cover_Peek', 'Shooting', 'Gunplay', 'Hit_React', 'Death_Front']
  },
  n2: {
    label: 'N2 VALID',
    clips: ['Pistol_Idle_Alert', 'Cover_To_Shooting', 'Dying_Headshot_Knees', 'Pistol_Walk', 'Pistol_Walk_Fire', 'Pistol_Run_Aimed', 'Pistol_Aim', 'Cover_Fire']
  },
  duo: {
    label: 'MAYA+COLE',
    clips: ['Wheelchair_Push']
  },
  maya_bed: {
    label: 'MAYA BED',
    clips: ['Bed_Push_Loop', 'Bed_Push_Start', 'Bed_Push_Stop', 'Walk_Fem']
  },
  cole: {
    label: 'COLE SEAT',
    clips: ['Sit_Aim_Fire', 'Walking_Arm_Injury', 'Sit_Disbelief_Forward', 'Sit_Aim_Pistol', 'Sit_Idle_Breath', 'Sit_Idle_Thighs', 'Sit_Disbelief', 'Sit_Dodge', 'Injured_Walk']
  },
  cole_bed: {
    label: 'COLE BED',
    clips: ['Lay_Breathless', 'Lay_Moaning', 'Lay_Sleeping']
  },
  all: {
    label: 'ALL CAST',
    clips: ['Lineup']
  }
};

var state = {
  mode: Q.get('mode') || 'gunman',
  clip: Q.get('clip') || 'Pistol_Walk',
  coleClip: Q.get('coleClip') || 'Sit_Aim_Fire',
  cam: Q.get('cam') || '3q',
  t: Q.has('t') ? parseFloat(Q.get('t')) : 0.0,
  paused: Q.has('t') || CLEAN,
  speedOverride: Q.has('speed') ? parseFloat(Q.get('speed')) : null
};

var FIRE_CLIPS = new Set(['Pistol_Walk_Fire', 'Pistol_Walk_Fire_SG', 'Pistol_Strafe_L_Fire', 'Pistol_Run_Aimed_Fire', 'Shooting', 'Shooting_Gun', 'Gunplay', 'Cover_Fire', 'Cover_To_Shooting', 'Sit_Aim_Fire']);
var COLE_ARMED_CLIPS = new Set(['Sit_Aim_Pistol', 'Sit_Aim_Fire', 'Sit_Lower_Pistol', 'Sit_Gun_Motion']);

function playClip(actor, name, timeScale, timeSec){
  var c = actor.clips[name] || Object.values(actor.clips)[0];
  if(!c) return null;
  actor.mixer.stopAllAction();
  var act = actor.mixer.clipAction(c);
  act.reset();
  act.enabled = true;
  act.setEffectiveWeight(1.0);
  act.timeScale = 1.0;
  act.play();
  actor.curAction = act;
  var scaledT = (timeSec || 0) * (timeScale || 1.0);
  var dur = c.duration || 1.0;
  var wrapped = (name.indexOf('Death') >= 0 || name.indexOf('Dying') >= 0 || name === 'Bed_Push_Start' || name === 'Bed_Push_Stop')
    ? Math.min(dur - 0.001, Math.max(0, scaledT))
    : ((scaledT % dur) + dur) % dur;
  actor.mixer.setTime(wrapped);
  return c;
}

var BARREL_TIPS = {
  gunman: { tip: new THREE.Vector3(0.0237, 0.1865, 0.0720), dir: new THREE.Vector3(-0.1506, 0.8818, 0.4469) },
  n2:     { tip: new THREE.Vector3(0.0237, 0.1865, 0.0720), dir: new THREE.Vector3(-0.1506, 0.8818, 0.4469) },
  cole:   { tip: new THREE.Vector3(0.0150, 0.1594, 0.1089), dir: new THREE.Vector3(-0.2042, 0.7189, 0.6645) }
};

function placeMuzzleForActor(actor, roleKey, hz, tSec){
  var rh = actor.bones.RightHand;
  var wm = MANIFEST && MANIFEST[roleKey] && MANIFEST[roleKey].weapon_muzzle;
  var spec = wm ? { tip: new THREE.Vector3().fromArray(wm.tip), dir: new THREE.Vector3().fromArray(wm.dir) } : BARREL_TIPS[roleKey];
  if(!rh || !spec) return;
  var phase = (tSec * hz) % 1.0;
  if(phase >= 0.18) return;
  var tipW = rh.localToWorld(spec.tip.clone());
  var tgtW = rh.localToWorld(spec.tip.clone().add(spec.dir));
  muzzle.visible = true;
  muzzle.position.copy(tipW);
  muzzle.lookAt(tgtW);
}

function getStanceSpeed(roleKey, clipName){
  var rec = MANIFEST && MANIFEST[roleKey] && MANIFEST[roleKey].clips && MANIFEST[roleKey].clips[clipName];
  return rec ? (rec.authored_stance_mps || rec.authored_root_mps || 0) : 0;
}

function updateSceneAt(tSec){
  state.t = tSec;
  var g = ACTORS.gunman, m = ACTORS.maya, c = ACTORS.cole;
  gunTrack.visible = false; duoTrack.visible = false; mayaBedTrack.visible = false;
  coleSoloGrp.visible = false; lineUpGrp.visible = false;
  wcProp.group.visible = false; bedProp.group.visible = false; muzzle.visible = false;

  var followPos = new THREE.Vector3(0, 0.92, 0);
  var activePathSpeed = 0;

  if(state.mode === 'gunman' || state.mode === 'n2'){
    var shooterKey = (state.mode === 'n2') ? 'n2' : 'gunman';
    var shooter = ACTORS[shooterKey];
    gunTrack.visible = true;
    gunTrack.remove(g.root);
    if(ACTORS.n2) gunTrack.remove(ACTORS.n2.root);
    gunTrack.add(shooter.root);
    shooter.root.position.set(0, 0, 0);
    shooter.root.rotation.set(0, 0, 0);

    var authored = getStanceSpeed(shooterKey, state.clip);
    var pathSpeed = 0;
    if(state.speedOverride !== null && !isNaN(state.speedOverride)) pathSpeed = state.speedOverride;
    else if(state.clip.indexOf('Run') >= 0) pathSpeed = 3.20;
    else if(authored > 0.45) pathSpeed = 1.30;

    var ts = (authored > 0.1 && pathSpeed > 0.05) ? (pathSpeed / authored) : 1.0;
    playClip(shooter, state.clip, ts, tSec);

    var zTravel = (state.clip.indexOf('Back') >= 0) ? -pathSpeed * tSec : (state.clip.indexOf('Strafe') >= 0 ? 0 : pathSpeed * tSec);
    var xTravel = (state.clip.indexOf('Strafe_L') >= 0) ? pathSpeed * tSec : (state.clip.indexOf('Strafe_R') >= 0 ? -pathSpeed * tSec : 0);
    // Keep within +-8m bay lane cyclically when running live
    zTravel = ((zTravel + 6) % 14) - 6;
    gunTrack.position.set(xTravel, 0, zTravel);
    activePathSpeed = pathSpeed;
    followPos.set(xTravel, (state.clip.indexOf('Dying') >= 0) ? 0.62 : (state.clip.indexOf('Cover') >= 0 ? 0.82 : 0.96), zTravel);

    // Muzzle flash on firing clips during shot peak phase (update gunTrack first so world matrix matches zTravel!)
    gunTrack.updateMatrixWorld(true);
    if(state.clip.indexOf('Dying') >= 0 && shooter.bones.Hips){
      var hwD = new THREE.Vector3().setFromMatrixPosition(shooter.bones.Hips.matrixWorld);
      followPos.set(hwD.x, Math.max(0.48, hwD.y - 0.04), hwD.z + 0.08);
    }
    var inFireWindow = (state.clip !== 'Cover_To_Shooting') || (tSec % 3.17 >= 0.85 && tSec % 3.17 <= 1.65);
    if(FIRE_CLIPS.has(state.clip) && inFireWindow){
      var hz = (state.clip === 'Gunplay') ? 5.0 : 2.2;
      placeMuzzleForActor(shooter, shooterKey, hz, tSec);
    }
  }
  else if(state.mode === 'duo'){
    duoTrack.visible = true;
    wcProp.group.visible = true;
    wcProp.blanket.visible = true;
    duoTrack.add(m.root);
    duoTrack.add(wcProp.group);
    duoTrack.add(c.root);

    var mSpeed = getStanceSpeed('maya', 'Wheelchair_Push') || 1.48;
    var pathSp = (state.speedOverride !== null && !isNaN(state.speedOverride)) ? state.speedOverride : mSpeed;
    var zPos = ((pathSp * tSec + 5) % 12) - 5;
    duoTrack.position.set(0, 0, zPos);
    duoTrack.updateMatrixWorld(true);

    m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0);
    playClip(m, 'Wheelchair_Push', pathSp / mSpeed, tSec);
    duoTrack.updateMatrixWorld(true);

    // Align wheelchair rear handles (+-0.23m) cleanly with Maya's IK-raised hands in Z & sit Cole inside seat!
    var lH = new THREE.Vector3().setFromMatrixPosition(m.bones.LeftHand.matrixWorld);
    var rH = new THREE.Vector3().setFromMatrixPosition(m.bones.RightHand.matrixWorld);
    var meanLocalZ = 0.5 * ((lH.z - duoTrack.position.z) + (rH.z - duoTrack.position.z));
    // Handles are at wcProp z=-0.30 -> place wcProp at z = meanLocalZ + 0.30 so hands rest dead-on grips!
    var wcZ = meanLocalZ + 0.30;
    wcProp.group.position.set(0, 0, wcZ);
    wcProp.wheels.forEach(function(w){ w.grp.rotation.x = (pathSp * tSec) / w.r; });

    // Sit Cole snugly inside wheelchair seat cushion (seat center at wcZ + 0.05)
    c.root.position.set(0, -0.02, wcZ + 0.05);
    c.root.rotation.set(0, 0, 0);
    var cClip = state.coleClip || 'Sit_Aim_Fire';
    playClip(c, cClip, 1.0, tSec);
    var pistolMesh = c.meshes.find(function(ms){ return ms.name.indexOf('ColePistol') >= 0; });
    if(pistolMesh) pistolMesh.visible = COLE_ARMED_CLIPS.has(cClip);
    duoTrack.updateMatrixWorld(true);
    if(FIRE_CLIPS.has(cClip)) placeMuzzleForActor(c, 'cole', 2.2, tSec);

    activePathSpeed = pathSp;
    followPos.set(0, 0.88, zPos + wcZ * 0.4 + 0.24);
  }
  else if(state.mode === 'maya_bed'){
    mayaBedTrack.visible = true;
    bedProp.group.visible = true;
    mayaBedTrack.add(m.root);
    mayaBedTrack.add(bedProp.group);

    var bClip = state.clip || 'Bed_Push_Loop';
    var bAuth = getStanceSpeed('maya', bClip) || 0.72;
    var bSp = (state.speedOverride !== null && !isNaN(state.speedOverride)) ? state.speedOverride : bAuth;
    var zB = ((bSp * tSec + 5) % 12) - 5;
    mayaBedTrack.position.set(0, 0, zB);
    mayaBedTrack.updateMatrixWorld(true);

    m.root.position.set(0, 0, 0);
    playClip(m, bClip, 1.0, tSec);
    mayaBedTrack.updateMatrixWorld(true);
    var lHb = new THREE.Vector3().setFromMatrixPosition(m.bones.LeftHand.matrixWorld);
    var rHb = new THREE.Vector3().setFromMatrixPosition(m.bones.RightHand.matrixWorld);
    var bedZ = 0.5 * ((lHb.z - mayaBedTrack.position.z) + (rHb.z - mayaBedTrack.position.z));
    bedProp.group.position.set(0, 0, bedZ);
    bedProp.wheels.forEach(function(w){ w.grp.rotation.x = (bSp * tSec) / w.r; });

    activePathSpeed = bSp;
    followPos.set(0, 0.88, zB + 0.32);
  }
  else if(state.mode === 'cole'){
    coleSoloGrp.visible = true;
    coleSoloGrp.add(c.root);
    c.root.position.set(0, 0, 0);
    var cc = state.clip || 'Sit_Aim_Fire';
    var showChair = (cc.indexOf('Sit_') >= 0 && cc.indexOf('Stand') < 0);
    var cAuth = getStanceSpeed('cole', cc);
    var cSp = (!showChair && cAuth > 0.45) ? (state.speedOverride !== null && !isNaN(state.speedOverride) ? state.speedOverride : 1.30) : 0;
    var cTs = (cSp > 0.05 && cAuth > 0.1) ? (cSp / cAuth) : 1.0;
    playClip(c, cc, cTs, tSec);
    if(showChair){
      wcProp.group.visible = true; wcProp.blanket.visible = (cc !== 'Sit_Disbelief_Forward');
      coleSoloGrp.add(wcProp.group);
      wcProp.group.position.set(0, 0, -0.05);
      c.root.position.set(0, (cc === 'Sit_Disbelief_Forward') ? -0.065 : -0.02, 0.0);
      followPos.set(0, 0.78, 0.18);
    } else {
      var cZ = (cSp > 0.05) ? (((cSp * tSec + 5) % 12) - 5) : 0;
      c.root.position.set(0, 0, cZ);
      activePathSpeed = cSp;
      followPos.set(0, 0.90, cZ);
    }
    var cp = c.meshes.find(function(ms){ return ms.name.indexOf('ColePistol') >= 0; });
    if(cp) cp.visible = COLE_ARMED_CLIPS.has(cc);
  }
  else if(state.mode === 'cole_bed'){
    coleSoloGrp.visible = true;
    bedProp.group.visible = true;
    coleSoloGrp.add(bedProp.group);
    coleSoloGrp.add(c.root);
    bedProp.group.position.set(0, 0, -0.96);
    // Align Mixamo Laying clip onto mattress top (y~0.76) facing foot end (+Z)
    c.root.position.set(0, -0.22, -0.14);
    c.root.rotation.set(0, 0, 0);
    playClip(c, state.clip || 'Lay_Breathless', 1.0, tSec);
    var cpb = c.meshes.find(function(ms){ return ms.name.indexOf('ColePistol') >= 0; });
    if(cpb) cpb.visible = false;
    followPos.set(0, 0.85, 0);
  }
  else {
    // ALL CAST lineup
    lineUpGrp.visible = true;
    wcProp.group.visible = true; wcProp.blanket.visible = true;
    lineUpGrp.add(g.root); lineUpGrp.add(m.root); lineUpGrp.add(c.root); lineUpGrp.add(wcProp.group);
    g.root.position.set(-0.78, 0, -0.10); playClip(g, 'Pistol_Aim', 1.0, tSec);
    m.root.position.set(0.0, 0, -0.35); playClip(m, 'Wheelchair_Push', 1.0, tSec);
    lineUpGrp.updateMatrixWorld(true);
    var lHa = new THREE.Vector3().setFromMatrixPosition(m.bones.LeftHand.matrixWorld);
    var rHa = new THREE.Vector3().setFromMatrixPosition(m.bones.RightHand.matrixWorld);
    var wcZa = 0.5 * (lHa.z + rHa.z) + 0.30;
    wcProp.group.position.set(0.0, 0, wcZa);
    c.root.position.set(0.0, -0.02, wcZa + 0.05); playClip(c, 'Sit_Aim_Fire', 1.0, tSec);
    var cpa = c.meshes.find(function(ms){ return ms.name.indexOf('ColePistol') >= 0; });
    if(cpa) cpa.visible = true;
    followPos.set(-0.20, 0.90, 0.14);
  }

  scene.updateMatrixWorld(true);

  // Camera framing tailored per angle for 390x844 mobile viewport
  var isGrip2x = (state.cam === 'grip2x' || state.cam === 'grip2x_l');
  if(isGrip2x){
    var gActor = (state.mode === 'n2') ? ACTORS.n2 : (state.mode === 'cole') ? ACTORS.cole : ACTORS.gunman;
    var rhPos = (gActor && gActor.bones.RightHand) ? new THREE.Vector3().setFromMatrixPosition(gActor.bones.RightHand.matrixWorld) : followPos.clone();
    var lhPos = (gActor && gActor.bones.LeftHand) ? new THREE.Vector3().setFromMatrixPosition(gActor.bones.LeftHand.matrixWorld) : rhPos.clone();
    var gripMid = rhPos.clone().add(lhPos).multiplyScalar(0.5);
    var gDist = 1.12;
    var gAz = (state.cam === 'grip2x_l') ? -0.92 : 0.78;
    var gElev = 0.16;
    camera.position.set(
      gripMid.x + Math.sin(gAz) * gDist,
      gripMid.y + Math.sin(gElev) * gDist,
      gripMid.z + Math.cos(gAz) * gDist
    );
    camera.lookAt(gripMid.x, gripMid.y, gripMid.z);
    camera.updateMatrixWorld(true);
  } else {
    var isSide = (state.cam === 'side');
    var isDying = (state.mode === 'gunman' || state.mode === 'n2') && (state.clip === 'Dying_Headshot_Knees');
    var isWideGun = (state.mode === 'gunman' || state.mode === 'n2') && (state.clip === 'Cover_To_Shooting');
    var dist = (state.mode === 'all') ? 5.15 : (state.mode === 'maya_bed') ? (isSide ? 4.35 : 4.25) : (state.mode === 'duo') ? (isSide ? 3.95 : 4.25) : (state.mode === 'cole' ? 3.40 : isDying ? 4.25 : isWideGun ? 3.75 : (isSide ? 3.25 : 2.95));
    var lookZ = isSide ? (followPos.z + ((state.mode === 'duo') ? 0.30 : (state.mode === 'maya_bed') ? -0.05 : 0.14)) : ((state.clip === 'Cover_To_Shooting') ? followPos.z + 0.16 : followPos.z);
    var az = { '3q': 0.56, 'front': 0.0, 'side': Math.PI / 2, 'back': Math.PI - 0.12 }[state.cam] || 0.56;
    var elev = isSide ? 0.14 : 0.22;
    camera.position.set(
      followPos.x + Math.sin(az) * dist,
      followPos.y + Math.sin(elev) * dist + 0.16,
      lookZ + Math.cos(az) * dist
    );
    camera.lookAt(followPos.x, followPos.y - 0.04, lookZ);
    camera.updateMatrixWorld(true);
  }

  renderer.info.reset();
  renderer.render(scene, camera);

  // Compute live wrist-to-handle gap (mm) and Cole live seated crown height (m)
  var liveMeasure = {};
  if(state.mode === 'duo' && m.bones.LeftHand && m.bones.RightHand){
    var wL = new THREE.Vector3().setFromMatrixPosition(m.bones.LeftHand.matrixWorld);
    var wR = new THREE.Vector3().setFromMatrixPosition(m.bones.RightHand.matrixWorld);
    var hL = new THREE.Vector3().setFromMatrixPosition(wcProp.handles.L.matrixWorld);
    var hR = new THREE.Vector3().setFromMatrixPosition(wcProp.handles.R.matrixWorld);
    liveMeasure.wheelchairWristGapMM = +(0.5 * (wL.distanceTo(hL) + wR.distanceTo(hR)) * 1000).toFixed(1);
    liveMeasure.mayaWristY = +(0.5 * (wL.y + wR.y)).toFixed(4);
  }
  if(state.mode === 'maya_bed' && m.bones.LeftHand && m.bones.RightHand){
    var wbL = new THREE.Vector3().setFromMatrixPosition(m.bones.LeftHand.matrixWorld);
    var wbR = new THREE.Vector3().setFromMatrixPosition(m.bones.RightHand.matrixWorld);
    var hbL = new THREE.Vector3().setFromMatrixPosition(bedProp.handles.L.matrixWorld);
    var hbR = new THREE.Vector3().setFromMatrixPosition(bedProp.handles.R.matrixWorld);
    liveMeasure.bedWristGapMM = +(0.5 * (wbL.distanceTo(hbL) + wbR.distanceTo(hbR)) * 1000).toFixed(1);
  }
  if((state.mode === 'duo' || state.mode === 'cole') && c.bones.Head){
    var hd = new THREE.Vector3().setFromMatrixPosition(c.bones.Head.matrixWorld);
    liveMeasure.coleHeadBoneY = +hd.y.toFixed(3);
    liveMeasure.coleEstCrownY = +(hd.y + 0.21).toFixed(3);
  }

  return {
    mode: state.mode, clip: state.clip, cam: state.cam, t: +tSec.toFixed(3),
    pathSpeedMPS: +activePathSpeed.toFixed(3),
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    textures: renderer.info.memory.textures,
    programs: (renderer.info.programs && renderer.info.programs.length) || 0,
    jsHeapMB: (performance && performance.memory) ? +(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) : null,
    flags: ['GLTFLoader (three@0.128.0)'],
    measure: liveMeasure,
    consoleErrors: window.__CAST_ERRORS
  };
}

function rebuildHUD(){
  if(CLEAN) return;
  var mr = document.getElementById('mode-row'), cr = document.getElementById('clip-row'), cm = document.getElementById('cam-row');
  mr.innerHTML = ''; cr.innerHTML = ''; cm.innerHTML = '';
  Object.keys(MODES).forEach(function(mk){
    var b = document.createElement('button');
    b.className = 'pill' + (state.mode === mk ? ' active' : '');
    b.textContent = MODES[mk].label;
    b.onclick = function(){
      state.mode = mk;
      state.clip = MODES[mk].clips[0];
      state.paused = false; state.t = 0;
      rebuildHUD();
    };
    mr.appendChild(b);
  });
  (MODES[state.mode] ? MODES[state.mode].clips : []).forEach(function(cl){
    var b = document.createElement('button');
    b.className = 'pill' + (state.clip === cl ? ' active' : '');
    b.textContent = cl.replace(/_/g, ' ');
    b.onclick = function(){ state.clip = cl; state.paused = false; rebuildHUD(); };
    cr.appendChild(b);
  });
  ['3q', 'front', 'side', 'back', 'grip2x', 'grip2x_l'].forEach(function(ang){
    var b = document.createElement('button');
    b.className = 'pill' + (state.cam === ang ? ' active' : '');
    b.textContent = ang.toUpperCase();
    b.onclick = function(){ state.cam = ang; rebuildHUD(); updateHUD(updateSceneAt(state.t)); };
    cm.appendChild(b);
  });
}

function updateHUD(st){
  if(CLEAN) return;
  var ex = st.measure.wheelchairWristGapMM !== undefined ? (' | gap ' + st.measure.wheelchairWristGapMM + 'mm') :
           st.measure.bedWristGapMM !== undefined ? (' | gap ' + st.measure.bedWristGapMM + 'mm') : '';
  metaEl.textContent = state.mode.toUpperCase() + ' · ' + state.clip + ' · ' + state.cam.toUpperCase() +
    ' | calls ' + st.calls + ' | tris ' + st.triangles + ' | speed ' + st.pathSpeedMPS + ' m/s' + ex + ' | [GLTFLoader]';
}

var loader = new THREE.GLTFLoader();
function loadGLB(url, role){
  return new Promise(function(res, rej){
    loader.load(url, function(gltf){ res(prepGLBModel(gltf, role)); }, undefined, rej);
  });
}

fetch('assets/cast-pass/cast-pass-manifest.json')
  .then(function(r){ return r.json(); })
  .then(function(man){
    MANIFEST = man;
    return Promise.all([
      loadGLB('assets/cast-pass/gunman-mixamo.glb', 'gunman'),
      loadGLB('assets/cast-pass/maya-mixamo.glb', 'maya'),
      loadGLB('assets/cast-pass/cole-mixamo.glb', 'cole'),
      loadGLB('assets/cast-pass/n2-mixamo.glb', 'n2')
    ]);
  })
  .then(function(list){
    ACTORS.gunman = list[0]; ACTORS.maya = list[1]; ACTORS.cole = list[2]; ACTORS.n2 = list[3];
    loadingEl.style.display = 'none';
    rebuildHUD();
    var st0 = updateSceneAt(state.t);
    updateHUD(st0);

    window.__castPassReady = true;
    window.__castPassRig = {
      ready: true,
      manifest: MANIFEST,
      scene: scene,
      actors: ACTORS,
      setState: function(opts){
        if(opts){
          if(opts.mode !== undefined) state.mode = opts.mode;
          if(opts.clip !== undefined) state.clip = opts.clip;
          if(opts.coleClip !== undefined) state.coleClip = opts.coleClip;
          if(opts.cam !== undefined) state.cam = opts.cam;
          if(opts.speed !== undefined) state.speedOverride = opts.speed;
          if(typeof opts.t === 'number') state.t = opts.t;
        }
        state.paused = true;
        var st = updateSceneAt(state.t);
        updateHUD(st);
        return st;
      },
      stepTime: function(tSec){
        state.paused = true;
        var st = updateSceneAt(tSec);
        updateHUD(st);
        return st;
      },
      getStats: function(){ return updateSceneAt(state.t); }
    };

    var lastNow = performance.now();
    function tick(now){
      requestAnimationFrame(tick);
      if(state.paused) return;
      var dt = Math.min(0.05, (now - lastNow) * 0.001);
      lastNow = now;
      updateHUD(updateSceneAt(state.t + dt));
    }
    requestAnimationFrame(tick);
  })
  .catch(function(err){
    window.__CAST_ERRORS.push(String(err && err.stack || err));
    loadingEl.textContent = 'LOAD ERROR: ' + err.message;
  });
})();
