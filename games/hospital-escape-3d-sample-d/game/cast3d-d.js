/* Hospital Escape — SHOOTER-ASSET BAKE-OFF, MOTH'S ENTRY (sample D): five walking shooter
   figures behind one flag, ?fig=<mode>, all enemies replaced (CX scope), Cole/Maya painted.
     retuned — Entry C's Quaternius "Casual Character" (CC0) rig, MEASURED pacing (Walk 0.64 /
               Run 1.24 m/s from the CX stride probe) + relight v2 (below).
     woman   — Quaternius "Animated Woman" (CC0, Poly Pizza), Blender-trimmed to the same 8 gun
               clips + dark reskin; her own measured pacing (probe: see bake-off report).
     mixamo  — Mixamo "Vanguard" Soldier (the three.js examples model, r128): mocap Idle/Walk/Run
               only. No gun/hit/death clips — aim/shoot/flinch fall back to Idle, death is a
               procedural fall. LOCAL TEST ONLY (Mixamo terms: use in projects, no raw redistribution).
     rigkit  — house Figure Factory method: ~30 primitive meshes on named pivots, pose tables,
               walk phase locked to distance travelled (one 2-step cycle per 1.5 m — zero slide
               by construction). No model files, no loader.
     hybrid  — the woman mesh driven by ENTRY C's clip library (same Quaternius skeleton family,
               bone names match — one clip library, many bodies) + code-built pistol prop +
               measured C pacing + relight v2.
   Relight v2 (retuned + hybrid): per-material albedo lift x1.5 (channels capped 0.85) + a warm
   point light riding each figure (0.55 intensity, 5.5 m falloff) + the house blob shadow. The
   painted cast gets per-lamp shading from its shader; this is the mesh-side approximation.
   ON with ?cast3d=1 or the sample default; ?cast3d=0 = painted. No gameplay changes. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var ON = Q.get('cast3d') === '1' || (Q.get('cast3d') === null && !!window.__CAST3D_SAMPLE);
if(!ON) return;
var FIG = Q.get('fig') || 'retuned';
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, gb = G.greybox;
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

// ------------------------------------------------------------------ mode table
var GUN8 = { Walk:'Walk', Run:'Run', Idle_Neutral:'Idle_Neutral', Idle_Gun:'Idle_Gun',
             Idle_Gun_Pointing:'Idle_Gun_Pointing', Gun_Shoot:'Gun_Shoot', HitRecieve:'HitRecieve', Death:'Death' };
var MODES = {
  retuned: { chunks: ['__GUNMAN_GZ_B64'], clipMap: GUN8, walk: 1.30, run: 3.20, topMat: 'LightBrown', relight: true,  props: true, hMode: 'fixed', fixedH: 1.81 },
  man:     { chunks: ['__MAN_GZ_B64'], clipMap: { Walk:'Man_Walk', Run:'Man_Run', Idle_Neutral:'Man_Idle', Idle_Gun:'Man_Idle',
               Idle_Gun_Pointing:'Man_Idle', Gun_Shoot:'Man_Idle', HitRecieve:'Man_Idle', Death:'Man_Death' },
             walk: 1.55, run: 3.20, topMat: 'Top', relight: true, props: true, addPistol: true, pistolBone: 'Palm.R',
             pistolPose: 'Man_Idle', hMode: 'bones', crown: 0.54 },
  mixamo:  { chunks: ['__SOLDIER_GZ_B64'], clipMap: { Walk:'Walk', Run:'Run', Idle_Neutral:'Idle', Idle_Gun:'Idle',
               Idle_Gun_Pointing:'Idle', Gun_Shoot:'Idle', HitRecieve:'Idle', Death:null },
             walk: 1.54, run: 3.60, topMat: null, relight: false, props: false, procDeath: true, hMode: 'box', tint: 0.42 },
  hybrid:  { chunks: ['__MAN_GZ_B64', '__GUNMAN_GZ_B64'], meshFrom: 0, clipsFrom: 1, clipMap: GUN8,
             walk: 1.30, run: 3.20, topMat: 'Top', relight: true, props: true, addPistol: true, pistolBone: 'Palm.R',
             pistolPose: 'Idle_Gun_Pointing', hMode: 'bones', crown: 0.54 },
  rigkit:  { procedural: true }
};
var MODE = MODES[FIG] || MODES.retuned;

// ------------------------------------------------------------------ asset loading
var asset = { ready: false, scene: null, clips: {}, height: 1.81 };
var clipAsset = null;   // hybrid: clips live in a second GLB
function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function chunkBytes(globalName){
  var parts = window[globalName]; if(!parts || !window.DecompressionStream) return Promise.resolve(null);
  var bytes = b64ToBytes(parts.join(''));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){}; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}
var waiters = [];
function findBone(fig, names){
  var want = names.map(function(n){ return n.replace(/[.:]/g, ''); });
  var found = null;
  fig.traverse(function(o){ if(!found && o.isBone && want.indexOf(o.name.replace(/[.:]/g, '')) >= 0) found = o; });
  return found;
}
// Rotation-only retarget (hybrid): C's clips carry per-bone POSITION tracks in C's local units;
// on the Man rig they drag his hips from 1.96 to 0.85 world units (measured) and fold the body.
// Keep only quaternion tracks for bones the target rig actually has — bind positions then come
// from the target skeleton itself. Cost: the hips bob (~7 cm) does not transfer.
function retargetClips(clips, targetScene){
  var bones = {}; targetScene.traverse(function(o){ if(o.isBone) bones[o.name] = 1; });
  var out = {};
  Object.keys(clips).forEach(function(n){ var c = clips[n];
    var tracks = c.tracks.filter(function(t){ return /\.quaternion$/.test(t.name) && bones[t.name.replace(/\.quaternion$/, '')]; });
    out[n] = new THREE.AnimationClip(c.name, c.duration, tracks); });
  return out;
}
function finishLoad(){
  if(MODE.clipsFrom != null && MODE.meshFrom !== MODE.clipsFrom && asset.scene)
    asset.clips = retargetClips(asset.clips, asset.scene);
  asset.ready = true; window.__cast3dD = api;
  waiters.splice(0).forEach(function(w){ attach(w.p, w.role, w.kind); });
}
if(MODE.procedural){ asset.ready = true; }
else withLoaders(function(){ if(!THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  var names = MODE.chunks;
  Promise.all(names.map(chunkBytes)).then(function(bufs){
    var loader = new THREE.GLTFLoader(); var pending = bufs.length;
    bufs.forEach(function(buf, idx){
      if(!buf){ pending = -99; return; }
      loader.parse(buf, '', function(gltf){
        var isMesh = (MODE.meshFrom == null ? 0 : MODE.meshFrom) === idx;
        var isClips = MODE.clipsFrom == null ? isMesh : (MODE.clipsFrom === idx);
        if(isMesh){ asset.scene = gltf.scene;
          // Height: Box3 lies on split-material skinned meshes (r128 Box3 ignores skinning and
          // reads raw geometry space) — the Quaternius-family modes measure the BONES instead
          // (Head bone world Y + crown offset, calibrated on the stride stage).
          if(MODE.hMode === 'fixed') asset.height = MODE.fixedH;
          else if(MODE.hMode === 'bones'){ var mx = 0; gltf.scene.updateMatrixWorld(true);
            gltf.scene.traverse(function(o){ if(o.isBone){ var y = o.getWorldPosition(new THREE.Vector3()).y; if(y > mx) mx = y; } });
            asset.height = Math.max(0.5, mx + (MODE.crown || 0.2)); }
          else { var bb = new THREE.Box3().setFromObject(gltf.scene); asset.height = Math.max(0.5, bb.max.y - bb.min.y); } }
        if(isClips){ gltf.animations.forEach(function(c){ asset.clips[c.name] = c; }); }
        if(--pending === 0) finishLoad();
      }, function(){});
    });
  }).catch(function(){});
});

// ------------------------------------------------------------------ shared bits
var TEAL = 0x316E82;
var MASK_AT = { dy: 0.022, dz: 0.098 }, RIG_AT = { dy: 0.045, dz: 0.104 };
function blobTex(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
  gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
var _blobTex = null;
function addBlob(wrap, big){
  if(!_blobTex) _blobTex = blobTex();
  var s = big ? 1.05 : 0.9;
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.69),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; sh.raycast = function(){}; wrap.add(sh);
}
function relight(fig){
  fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.isMeshStandardMaterial && m.color){
      m.color.multiplyScalar(1.8);
      m.color.r = Math.min(m.color.r, 0.9); m.color.g = Math.min(m.color.g, 0.9); m.color.b = Math.min(m.color.b, 0.9);
      if(m.emissive) m.emissive.setRGB(m.color.r * 0.16, m.color.g * 0.16, m.color.b * 0.16); } }); } });
}
function addScrubsProps(fig){
  var PS = asset.height / 1.81;   // prop dimensions are authored in metres on the C rig; scale to this rig's units
  var head = findBone(fig, ['Head']), chest = findBone(fig, ['Chest', 'Torso']);
  var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
  if(head){ var mask = new THREE.Mesh(new THREE.BoxGeometry(0.138 * PS, 0.078 * PS, 0.042 * PS),
      new THREE.MeshStandardMaterial({ color: 0xaec6d2, roughness: 0.95 }));
    var hw = head.getWorldPosition(new THREE.Vector3());
    mask.position.set(hw.x, hw.y + MASK_AT.dy * PS, hw.z + MASK_AT.dz * PS); fig.add(mask); head.attach(mask); }
  if(chest){ var rigM = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.85, metalness: 0 });
    var rig = new THREE.Mesh(new THREE.BoxGeometry(0.27 * PS, 0.19 * PS, 0.075 * PS), rigM);
    var cw = chest.getWorldPosition(new THREE.Vector3());
    rig.position.set(cw.x, cw.y + RIG_AT.dy * PS, cw.z + RIG_AT.dz * PS); fig.add(rig); chest.attach(rig);
    var pouch = new THREE.Mesh(new THREE.BoxGeometry(0.18 * PS, 0.09 * PS, 0.04 * PS), rigM);
    pouch.position.set(0, -0.125 * PS, 0.012 * PS); rig.add(pouch); }
  tmp.remove(fig);
}
function addPistol(fig){
  // pose the clone in the mode's aim/idle clip, then hang a code-built pistol on the hand bone
  // in figure space — CX's attach() technique, offsets from the posed hand.
  var clip = asset.clips[MODE.pistolPose || 'Idle_Gun_Pointing']; if(!clip) return;
  var mx = new THREE.AnimationMixer(fig); var a = mx.clipAction(clip); a.play(); mx.update(0.55);
  var wrist = findBone(fig, [MODE.pistolBone || 'Wrist.R', 'Palm.R', 'Wrist.R']); if(!wrist) return;
  var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
  var PS = asset.height / 1.81;
  var wp = wrist.getWorldPosition(new THREE.Vector3());
  var gm = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.55, metalness: 0.35 });
  var pistol = new THREE.Group();
  var slide = new THREE.Mesh(new THREE.BoxGeometry(0.032 * PS, 0.045 * PS, 0.21 * PS), gm); slide.position.set(0, 0.028 * PS, 0.055 * PS); pistol.add(slide);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.03 * PS, 0.11 * PS, 0.045 * PS), gm); grip.position.set(0, -0.035 * PS, -0.028 * PS); grip.rotation.x = 0.28; pistol.add(grip);
  pistol.position.set(wp.x, wp.y - 0.015 * PS, wp.z + 0.045 * PS);
  fig.add(pistol); wrist.attach(pistol); tmp.remove(fig); mx.stopAllAction();
}

// ------------------------------------------------------------------ skeletal figure build
function buildSkeletal(kind){
  var fig = THREE.SkeletonUtils.clone(asset.scene), matTop = null;
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    if(Array.isArray(o.material)) o.material = o.material.map(function(m){ var c = m.clone(); if(MODE.topMat && c.name === MODE.topMat) matTop = c; return c; });
    else { o.material = o.material.clone(); if(MODE.topMat && o.material.name === MODE.topMat) matTop = o.material; } } });
  if(kind === 'staff' && MODE.props){
    if(matTop) matTop.color.setHex(TEAL).convertSRGBToLinear();
    addScrubsProps(fig);
  }
  if(MODE.tint) fig.traverse(function(o){ if(o.isMesh){ var ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(function(m){ if(m && m.color) m.color.multiplyScalar(MODE.tint); }); } });
  if(MODE.addPistol) addPistol(fig);
  if(MODE.relight) relight(fig);
  return fig;
}

// ------------------------------------------------------------------ rigkit figure (house method)
// ~30 primitives on named pivots; pose tables in rigkitTargets(); walk phase is distance-locked.
function rkMat(hex){ return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0 }); }
function rkBox(w, h, d, mat, x, y, z){ var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; }
function rkPivot(x, y, z){ var g = new THREE.Group(); g.position.set(x, y, z); return g; }
function buildRigkit(kind){
  var jacket = rkMat(kind === 'staff' ? 0x1d4e5e : 0x17181d), pants = rkMat(0x14161c),
      skin = rkMat(0x8a5f3c), hairM = rkMat(0x0e0c0a), shoeM = rkMat(0x0a0a0c), gunM = rkMat(0x0d0e11);
  var root = new THREE.Group();
  var J = {};
  J.hips = rkPivot(0, 0.98, 0); root.add(J.hips);
  J.hips.add(rkBox(0.30, 0.17, 0.19, pants, 0, -0.02, 0));
  J.spine = rkPivot(0, 0.06, 0); J.hips.add(J.spine);
  J.chest = rkPivot(0, 0.16, 0); J.spine.add(J.chest);
  J.chest.add(rkBox(0.33, 0.40, 0.21, jacket, 0, 0.18, 0));
  J.chest.add(rkBox(0.34, 0.05, 0.22, hairM, 0, 0.015, 0));
  J.hips.add(rkBox(0.31, 0.05, 0.20, rkMat(0x2a2019), 0, 0.045, 0));
  if(kind === 'staff') J.chest.add(rkBox(0.27, 0.19, 0.075, gunM, 0, 0.20, 0.145));
  J.neck = rkPivot(0, 0.40, 0); J.chest.add(J.neck);
  J.head = rkPivot(0, 0.07, 0); J.neck.add(J.head);
  var skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 14), skin); skull.position.y = 0.09; skull.castShadow = true; J.head.add(skull);
  var hair = new THREE.Mesh(new THREE.SphereGeometry(0.109, 18, 14), hairM);
  hair.scale.set(1, 0.82, 1); hair.position.set(0, 0.115, -0.014); hair.castShadow = true; J.head.add(hair);
  if(kind === 'staff') J.head.add(rkBox(0.138, 0.078, 0.042, rkMat(0xaec6d2), 0, 0.075, 0.098));
  function arm(side){ var s = side === 'L' ? 1 : -1;
    var sh = rkPivot(0.215 * s, 0.36, 0); J.chest.add(sh);
    sh.add(rkBox(0.095, 0.30, 0.095, jacket, 0, -0.13, 0));
    var el = rkPivot(0, -0.28, 0); sh.add(el);
    el.add(rkBox(0.08, 0.26, 0.08, jacket, 0, -0.11, 0));
    var wr = rkPivot(0, -0.24, 0); el.add(wr);
    wr.add(rkBox(0.07, 0.09, 0.07, skin, 0, -0.03, 0));
    return { sh: sh, el: el, wr: wr }; }
  var aL = arm('L'), aR = arm('R');
  J.shL = aL.sh; J.elL = aL.el; J.wrL = aL.wr; J.shR = aR.sh; J.elR = aR.el; J.wrR = aR.wr;
  var pistol = new THREE.Group();
  pistol.add(rkBox(0.032, 0.045, 0.21, gunM, 0, 0.01, 0.075)); pistol.add(rkBox(0.03, 0.10, 0.045, gunM, 0, -0.05, 0.0));
  pistol.position.set(0, -0.06, 0.03); J.wrR.add(pistol);
  function leg(side){ var s = side === 'L' ? 1 : -1;
    var hip = rkPivot(0.105 * s, -0.06, 0); J.hips.add(hip);
    hip.add(rkBox(0.125, 0.44, 0.125, pants, 0, -0.20, 0));
    var knee = rkPivot(0, -0.42, 0); hip.add(knee);
    knee.add(rkBox(0.105, 0.42, 0.105, pants, 0, -0.19, 0));
    var ank = rkPivot(0, -0.40, 0); knee.add(ank);
    ank.add(rkBox(0.10, 0.06, 0.25, shoeM, 0, -0.045, 0.055));
    return { hip: hip, knee: knee, ank: ank }; }
  var lL = leg('L'), lR = leg('R');
  J.hipL = lL.hip; J.kneeL = lL.knee; J.ankL = lL.ank; J.hipR = lR.hip; J.kneeR = lR.knee; J.ankR = lR.ank;
  root.traverse(function(o){ o.frustumCulled = false; });
  return { group: root, joints: J, phase: 0, cur: {} };
}
function rkSet(J, name, x, y, z){ var j = J[name]; if(j) j.rotation.set(x, y || 0, z || 0); }
function rigkitPose(inst, dt, st){
  var J = inst.rk.joints, rk = inst.rk;
  rk.phase += st.distDelta / 1.5;                       // one full 2-step cycle per 1.5 m travelled
  var ph = rk.phase * Math.PI * 2;
  var walking = st.sp > 0.3, run = st.sp > 1.5;
  var amp = run ? 0.72 : 0.52;
  var sw = walking ? Math.sin(ph) : 0, sw2 = walking ? Math.sin(ph + Math.PI) : 0;
  var T = { hipL: [-sw * amp, 0, 0], hipR: [-sw2 * amp, 0, 0],
            kneeL: [walking ? Math.max(0, -Math.cos(ph)) * 0.85 : 0, 0, 0],
            kneeR: [walking ? Math.max(0, Math.cos(ph)) * 0.85 : 0, 0, 0],
            ankL: [walking ? sw * amp * 0.4 : 0, 0, 0], ankR: [walking ? sw2 * amp * 0.4 : 0, 0, 0],
            spine: [0.04, 0, 0], chest: [0, st.aiming ? 0 : Math.sin(performance.now() / 900) * 0.02, 0], neck: [0, 0, 0], head: [0.02, 0, 0] };
  if(st.dead){ T.spine = [0.5, 0, 0]; T.shL = [-0.4, 0, 0.5]; T.shR = [-0.4, 0, -0.5]; T.hipL = [-0.5, 0, 0.2]; T.hipR = [-0.3, 0, -0.2]; T.kneeL = [0.5, 0, 0]; T.kneeR = [0.4, 0, 0]; }
  else if(st.cover && !st.exposed){ // peek / cover crouch
    T.hipL = [-1.45, 0, 0.06]; T.hipR = [-1.30, 0, -0.06]; T.kneeL = [1.85, 0, 0]; T.kneeR = [1.75, 0, 0];
    T.ankL = [-0.4, 0, 0]; T.ankR = [-0.4, 0, 0]; T.spine = [0.34, 0, 0];
    T.shR = [-0.55, 0, -0.08]; T.elR = [-0.45, 0, 0]; T.shL = [-0.35, 0, 0.10]; T.elL = [-0.60, 0, 0];
  } else if(st.aiming || walking || st.fire){ // aim table — gun arm up, support hand up (A's read: held while walking)
    T.shR = [-1.38, 0, -0.06]; T.elR = [-0.18, 0, 0];
    T.shL = [-0.88, 0, 0.30]; T.elL = [-0.55, 0, 0];
    T.spine = [0.07, -0.06, 0];
  } else { // idle, gun lowered
    T.shR = [-0.30, 0, -0.07]; T.elR = [-0.35, 0, 0];
    T.shL = [-0.10, 0, 0.07]; T.elL = [-0.15, 0, 0];
  }
  if(st.flinch > 0){ T.spine[0] -= 0.28; T.head[0] -= 0.2; }
  if(!T.shL){ T.shL = [-0.10, 0, 0.07]; T.elL = [-0.15, 0, 0]; T.shR = [-0.30, 0, -0.07]; T.elR = [-0.35, 0, 0]; }
  var k = 1 - Math.exp(-dt * 14);
  Object.keys(T).forEach(function(name){ var j = J[name]; if(!j) return;
    j.rotation.x += (T[name][0] - j.rotation.x) * k;
    j.rotation.y += ((T[name][1] || 0) - j.rotation.y) * k;
    j.rotation.z += ((T[name][2] || 0) - j.rotation.z) * k; });
  var targetY = st.dead ? 0.30 : (st.cover && !st.exposed ? 0.80 : 0.98 + (walking ? Math.abs(Math.sin(ph)) * 0.028 : 0));
  J.hips.position.y += (targetY - J.hips.position.y) * k;
  if(st.dead){ inst.wrap.rotation.x += ((-Math.PI / 2 + 0.12) - inst.wrap.rotation.x) * (1 - Math.exp(-dt * 5)); }
}

// ------------------------------------------------------------------ marking + attach
var insts = {};
var _addActor = gb.addActor;
gb.addActor = function(role, kind){
  var p = _addActor.apply(this, arguments);
  if(kind === 'gunman' || kind === 'staff'){ if(asset.ready) attach(p, role, kind); else waiters.push({ p: p, role: role, kind: kind }); }
  return p;
};
var _removeActor = gb.removeActor;
gb.removeActor = function(role){ var it = insts[role]; if(it && it.mixer) it.mixer.stopAllAction(); delete insts[role];
  for(var i = waiters.length - 1; i >= 0; i--) if(waiters[i].role === role) waiters.splice(i, 1);
  return _removeActor.apply(this, arguments); };

function attach(p, role, kind){
  if(!p.parent) return;
  var wrap = new THREE.Group(); wrap.name = 'cast3dD';
  var inst = { role: role, kind: kind, p: p, wrap: wrap, cur: null, lastPos: p.position.clone(),
               logIdx: G._log.length, fireT: 0, flinchT: 0, dead: false, paceN: 0, fallT: 0 };
  if(MODE.procedural){
    inst.rk = buildRigkit(kind); wrap.add(inst.rk.group);
  } else {
    wrap.scale.setScalar(1.77 / asset.height);
    var fig = buildSkeletal(kind); wrap.add(fig);
    inst.mixer = new THREE.AnimationMixer(fig); inst.actions = {};
    Object.keys(asset.clips).forEach(function(n){ inst.actions[n] = inst.mixer.clipAction(asset.clips[n]); });
    play(inst, 'Idle_Neutral', 0);
  }
  addBlob(wrap, !!MODE.relight);
  if(MODE.relight){ var pl = new THREE.PointLight(0xffe2b8, 0.85, 7, 2); pl.position.set(0, 1.55, 0.3); wrap.add(pl); }
  p.add(wrap);
  p.children.forEach(function(c){ if(c !== wrap) c.traverse(function(o){ o.layers.set(31); }); });
  p.userData.pk = null; p.userData.painted = false;
  insts[role] = inst;
}
function play(inst, canon, fade){
  var name = MODE.clipMap[canon]; if(!name) return;                    // mixamo Death -> null: procedural fall
  if(inst.cur === canon) return; var a = inst.actions[name]; if(!a) return;
  var prevName = inst.cur ? MODE.clipMap[inst.cur] : null;
  var prev = prevName ? inst.actions[prevName] : null;
  a.reset(); a.enabled = true;
  if(canon === 'Death' || canon === 'Gun_Shoot' || canon === 'HitRecieve'){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
  else { a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false; }
  a.play(); if(prev && prev !== a) a.crossFadeFrom(prev, fade == null ? 0.15 : fade, false);
  inst.cur = canon; inst.wrap.userData.clip = canon;
}
window.__DSPACE = [];

// ------------------------------------------------------------------ per-frame driver
var last = performance.now();
function tick(now){ requestAnimationFrame(tick);
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if(window.__C3FREEZE || dt <= 0) return;
  var L = G._log;
  Object.keys(insts).forEach(function(role){ var inst = insts[role]; if(!inst) return;
    var p = inst.p, e = G.combat.byRole(inst.role);
    for(; inst.logIdx < L.length; inst.logIdx++){ var ev = L[inst.logIdx];
      if(ev.data && ev.data.role === inst.role){
        if(ev.type === 'enemyShot') inst.fireT = 0.34;
        else if(ev.type === 'hit' && ev.data.hp > 0) inst.flinchT = 0.3; } }
    inst.fireT = Math.max(0, inst.fireT - dt); inst.flinchT = Math.max(0, inst.flinchT - dt);
    var distDelta = Math.hypot(p.position.x - inst.lastPos.x, p.position.z - inst.lastPos.z);
    var sp = distDelta / dt;
    inst.lastPos.copy(p.position);
    var dead = p.userData.dead || (e && !e.alive);
    if(dead) inst.dead = true;
    var st = { sp: sp, distDelta: distDelta, dead: inst.dead, flinch: inst.flinchT, fire: inst.fireT,
               aiming: !!(e && (e.aiming > 0 || e.exposed)), exposed: !!(e && e.exposed),
               cover: !!(e && e.behavior === 'cover') };
    if(MODE.procedural){ rigkitPose(inst, dt, st); return; }
    if(inst.dead){ play(inst, 'Death', 0.1);
      if(MODE.procDeath){ inst.fallT = Math.min(1, inst.fallT + dt * 2.4);
        inst.wrap.rotation.x = -1.45 * inst.fallT; } }
    else if(inst.flinchT > 0) play(inst, 'HitRecieve', 0.05);
    else if(inst.fireT > 0) play(inst, 'Gun_Shoot', 0.05);
    else if(sp > 0.3){ var run = sp > 1.5; play(inst, run ? 'Run' : 'Walk', 0.2);
      var ts = clamp(sp / (run ? MODE.run : MODE.walk), 0.5, 2.6);
      var nm = MODE.clipMap[inst.cur]; if(nm && inst.actions[nm]) inst.actions[nm].timeScale = ts;
      if(window.__DSPACE.length < 6000 && (inst.paceN++ % 5) === 0)
        window.__DSPACE.push({ fig: FIG, sp: +sp.toFixed(3), clip: inst.cur, ts: +ts.toFixed(3) }); }
    else if(st.aiming) play(inst, 'Idle_Gun_Pointing', 0.2);
    else if(st.cover) play(inst, 'Idle_Gun', 0.2);
    else play(inst, 'Idle_Neutral', 0.2);
    inst.mixer.update(dt);
  });
}
requestAnimationFrame(tick);
var api = { mode: FIG, model: asset, insts: insts };
if(MODE.procedural) window.__cast3dD = api;
})();
