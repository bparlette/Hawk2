/* Hospital Escape — CAST3D (Option-1 sample): ONE enemy as a real 3D figure.
   Built by the house Figure Factory / rigkit method (gamepress docs/FIGURE-FACTORY.md, tools/rigkit):
   a character is a DATA ROW (proportions + palette) manufactured from primitive meshes hung on
   NAMED PIVOT groups — no rig, no skinning, no external model files. Poses are joint-angle tables;
   the walk is four keyframe poses (contact / passing / contact / passing) stepped by phase.
   Adapted to this game's architecture: plain script, global THREE 0.128 (gpchar.js in the kit is an
   ES module bound to the kit's own three copy; the pivot/pose consumption pattern is the same).
   The figure faces +Z (combat.placeEnemy lookAts the actor group at the player). Feet plant at y=0. */
(function(){
'use strict';
// ---------------------------------------------------------------- the data row
var GUNMAN = {
  height: 1.77,                                   // matches the painted plain enemy's measured 1.77 m
  palette: { jacket: 0x26282e, sleeve: 0x2b2e35, pants: 0x35302a, skin: 0xc68850, hair: 0x191411,
             shoe: 0x17130f, shirt: 0x55585e, gun: 0x0b0b0d, belt: 0x1c1712 },
  dims: { hipW: 0.105, shoulderW: 0.235, headR: 0.118, thighR: 0.078, shinR: 0.058, armR: 0.056, foreR: 0.047 }
};
// segment lengths (m) — ankle .08 / knee .50 / hip .92 / shoulder 1.44 / head centre 1.63, top ~1.77
var SEG = { thigh: 0.42, shin: 0.42, upperArm: 0.30, foreArm: 0.27, hipY: 0.92, shoulderY: 1.44 };
// ---------------------------------------------------------------- helpers
function mat(color, rough){ return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.88 : rough, metalness: 0.0 }); }
function mesh(geo, material, parent, x, y, z){ var m = new THREE.Mesh(geo, material); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; if(parent) parent.add(m); return m; }
function pivot(parent, x, y, z){ var g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function cyl(rt, rb, len, material, parent, y){ return mesh(new THREE.CylinderGeometry(rt, rb, len, 10), material, parent, 0, y, 0); }
function box(w, h, d, material, parent, x, y, z){ return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z); }
function sph(r, material, parent, x, y, z, sx, sy, sz){ var m = mesh(new THREE.SphereGeometry(r, 14, 11), material, parent, x, y, z); if(sx) m.scale.set(sx, sy, sz); return m; }
// ---------------------------------------------------------------- manufacture
function buildFigure(row){
  var P = row.palette, D = row.dims;
  var mJacket = mat(P.jacket, 0.92), mSleeve = mat(P.sleeve, 0.92), mPants = mat(P.pants, 0.95),
      mSkin = mat(P.skin, 0.62), mHair = mat(P.hair, 0.95), mShoe = mat(P.shoe, 0.7),
      mShirt = mat(P.shirt, 0.9), mGun = mat(P.gun, 0.45), mBelt = mat(P.belt, 0.8);
  var root = new THREE.Group(); root.name = 'cast3d-gunman';
  var J = {};   // named pivots, rigkit style
  // legs: hip pivot -> thigh -> knee pivot -> shin -> ankle pivot -> foot
  function leg(side){ var s = side < 0 ? 'L' : 'R';
    var hip = pivot(root, D.hipW * side, SEG.hipY, 0); J['hip' + s] = hip;
    cyl(D.thighR * 0.92, D.thighR, SEG.thigh, mPants, hip, -SEG.thigh / 2);
    sph(D.thighR, mPants, hip, 0, -0.02, 0);
    var knee = pivot(hip, 0, -SEG.thigh, 0); J['knee' + s] = knee;
    cyl(D.shinR * 0.9, D.shinR, SEG.shin, mPants, knee, -SEG.shin / 2);
    var ank = pivot(knee, 0, -SEG.shin, 0); J['ankle' + s] = ank;
    box(0.095, 0.06, 0.25, mShoe, ank, 0, -0.05, 0.055);          // shoe, toe forward +Z
    return hip; }
  leg(-1); leg(1);
  // pelvis + torso
  box(0.335, 0.17, 0.205, mPants, root, 0, SEG.hipY + 0.045, 0);
  box(0.345, 0.05, 0.215, mBelt, root, 0, SEG.hipY + 0.145, 0);
  var spine = pivot(root, 0, SEG.hipY + 0.10, 0); J.spine = spine;
  box(0.375, 0.30, 0.225, mJacket, spine, 0, 0.15, 0);            // jacket body
  var chest = pivot(spine, 0, 0.28, 0); J.chest = chest;
  box(0.415, 0.26, 0.24, mJacket, chest, 0, 0.12, 0);             // chest / shoulders mass
  box(0.13, 0.17, 0.012, mShirt, chest, 0, 0.10, 0.122);         // shirt V at the collar
  box(0.43, 0.05, 0.25, mJacket, chest, 0, 0.245, 0);             // shoulder bar
  // head
  var neck = pivot(chest, 0, 0.27, 0); J.neck = neck;
  cyl(0.045, 0.05, 0.07, mSkin, neck, 0.02, 0);
  var head = pivot(neck, 0, 0.06, 0); J.head = head;
  sph(D.headR, mSkin, head, 0, 0.115, 0, 0.92, 1.06, 0.98);       // skull
  sph(D.headR * 1.01, mHair, head, 0, 0.145, -0.018, 0.94, 1.0, 0.99);   // hair mass, back/top
  box(0.15, 0.028, 0.01, mHair, head, 0, 0.155, 0.104);            // brow line
  box(0.026, 0.016, 0.01, mHair, head, -0.042, 0.118, 0.108);     // eyes (dark, read at phone size)
  box(0.026, 0.016, 0.01, mHair, head, 0.042, 0.118, 0.108);
  box(0.03, 0.05, 0.025, mSkin, head, 0, 0.085, 0.112);           // nose
  // arms: shoulder pivot -> upper arm -> elbow pivot -> forearm -> wrist (hand [+ pistol on R])
  function arm(side){ var s = side < 0 ? 'L' : 'R';
    var sh = pivot(chest, D.shoulderW * side, 0.225, 0); J['shoulder' + s] = sh;
    sph(D.armR * 1.25, mJacket, sh, 0, 0, 0);                     // deltoid
    cyl(D.armR * 0.9, D.armR, SEG.upperArm, mSleeve, sh, -SEG.upperArm / 2);
    var el = pivot(sh, 0, -SEG.upperArm, 0); J['elbow' + s] = el;
    cyl(D.foreR * 0.88, D.foreR, SEG.foreArm, mSleeve, el, -SEG.foreArm / 2);
    var wr = pivot(el, 0, -SEG.foreArm, 0); J['wrist' + s] = wr;
    sph(0.047, mSkin, wr, 0, -0.045, 0, 0.85, 1.15, 0.9);         // hand
    return wr; }
  arm(-1); var wristR = arm(1);
  // pistol in the right hand: grip + slide + barrel, muzzle marker at the tip
  var gun = new THREE.Group(); gun.position.set(0, -0.05, 0.02); wristR.add(gun);
  box(0.034, 0.105, 0.045, mGun, gun, 0, -0.03, 0.01).rotation.x = 0.25;      // grip
  box(0.03, 0.045, 0.17, mGun, gun, 0, 0.035, 0.055);                        // slide
  box(0.016, 0.02, 0.07, mGun, gun, 0, 0.032, 0.165);                        // barrel
  var muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.032, 0.21); gun.add(muzzle);
  root.traverse(function(o){ if(o.isMesh) o.castShadow = true; });
  return { group: root, joints: J, muzzle: muzzle, phase: 0, cur: {}, tgt: null, kick: 0 };
}
// ---------------------------------------------------------------- poses (joint-angle tables, radians; figure faces +Z, arms/legs hang -Y, rotation.x<0 swings a limb forward)
var POSES = {
  aim:   { hipL: [-0.10, 0, 0], hipR: [0.14, 0, 0], kneeL: [0.10, 0, 0], kneeR: [0.04, 0, 0], ankleL: [-0.04, 0, 0], ankleR: [0.02, 0, 0],
           spine: [-0.05, 0.10, 0], chest: [0, 0.14, 0], neck: [0.03, -0.10, 0], head: [0.02, 0, 0],
           shoulderL: [-0.92, 0, 0.18], elbowL: [-0.62, 0, 0], shoulderR: [-1.50, 0, -0.06], elbowR: [-0.10, 0, 0], $hipsY: 0 },
  peek:  { hipL: [-0.78, 0, 0], hipR: [-0.62, 0, 0], kneeL: [0.95, 0, 0], kneeR: [0.85, 0, 0], ankleL: [0.25, 0, 0], ankleR: [0.28, 0, 0],
           spine: [0.22, 0, 0], chest: [0.06, 0, 0], neck: [0.18, 0, 0], head: [0.22, 0, 0],
           shoulderL: [-0.35, 0, 0.25], elbowL: [-0.5, 0, 0], shoulderR: [-0.55, 0, -0.1], elbowR: [-0.35, 0, 0], $hipsY: -0.34 },
  flinch:{ hipL: [-0.06, 0, 0], hipR: [0.10, 0, 0], kneeL: [0.14, 0, 0], kneeR: [0.10, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0],
           spine: [0.20, -0.15, 0], chest: [0.08, -0.2, 0], neck: [-0.15, 0.15, 0], head: [-0.18, 0, 0.1],
           shoulderL: [-0.7, 0, 0.5], elbowL: [-0.9, 0, 0], shoulderR: [-1.1, 0, -0.3], elbowR: [-0.45, 0, 0], $hipsY: -0.03 }
};
// walk keyframes: [contact R, passing, contact L, passing] — legs + counter-swing; right arm keeps the gun up (the painted aimWalk read)
var WALK = [
  { hipL: [0.46, 0, 0], hipR: [-0.56, 0, 0], kneeL: [0.28, 0, 0], kneeR: [0.06, 0, 0], ankleL: [0.10, 0, 0], ankleR: [-0.14, 0, 0], spine: [-0.04, -0.06, 0.02], shoulderL: [-0.55, 0, 0.2], elbowL: [-0.75, 0, 0], $bob: 0.0 },
  { hipL: [0.10, 0, 0], hipR: [-0.08, 0, 0], kneeL: [0.10, 0, 0], kneeR: [0.55, 0, 0], ankleL: [0.02, 0, 0], ankleR: [0.30, 0, 0], spine: [-0.03, 0.0, 0.0], shoulderL: [-0.38, 0, 0.2], elbowL: [-0.6, 0, 0], $bob: 0.028 },
  { hipL: [-0.56, 0, 0], hipR: [0.46, 0, 0], kneeL: [0.06, 0, 0], kneeR: [0.28, 0, 0], ankleL: [-0.14, 0, 0], ankleR: [0.10, 0, 0], spine: [-0.04, 0.06, -0.02], shoulderL: [-0.2, 0, 0.2], elbowL: [-0.5, 0, 0], $hipsY: 0, $bob: 0.0 },
  { hipL: [-0.08, 0, 0], hipR: [0.10, 0, 0], kneeL: [0.55, 0, 0], kneeR: [0.10, 0, 0], ankleL: [0.30, 0, 0], ankleR: [0.02, 0, 0], spine: [-0.03, 0.0, 0.0], shoulderL: [-0.38, 0, 0.2], elbowL: [-0.6, 0, 0], $bob: 0.028 }
];
var AIM_OVER = { chest: [0, 0.14, 0], neck: [0.03, -0.10, 0], head: [0.02, 0, 0], shoulderR: [-1.50, 0, -0.06], elbowR: [-0.10, 0, 0] };   // gun arm + head stay on the aim table while walking
function applyPose(rig, table, hipsY){ var J = rig.joints;
  for(var k in table){ if(k.charAt(0) === '$') continue; var j = J[k]; if(!j) continue; var a = table[k]; j.rotation.set(a[0], a[1], a[2]); }
  rig.group.position.y = hipsY || 0; }
function lerpPose(rig, table, k, hipsY){ var J = rig.joints;
  for(var key in table){ if(key.charAt(0) === '$') continue; var j = J[key]; if(!j) continue; var a = table[key];
    j.rotation.x += (a[0] - j.rotation.x) * k; j.rotation.y += (a[1] - j.rotation.y) * k; j.rotation.z += (a[2] - j.rotation.z) * k; }
  rig.group.position.y += ((hipsY || 0) - rig.group.position.y) * k; }
// rig driver: setPose lerps (aim/peek/flinch); setWalk steps the keyframes by phase (radians of cycle, 2 steps per 2π)
function drive(rig){ return {
    pose: function(name, dt){ var t = POSES[name] || POSES.aim; lerpPose(rig, t, Math.min(1, dt * 11), t.$hipsY); },
    walk: function(phase, dt){ var u = (phase / (Math.PI * 2)) % 1; if(u < 0) u += 1; var seg = Math.floor(u * 4), f = (u * 4) % 1;
      var A = WALK[seg], B = WALK[(seg + 1) % 4], T = {};
      for(var k in A){ if(k.charAt(0) === '$') continue; T[k] = [A[k][0] + (B[k][0] - A[k][0]) * f, A[k][1] + (B[k][1] - A[k][1]) * f, A[k][2] + (B[k][2] - A[k][2]) * f]; }
      for(var k2 in AIM_OVER) T[k2] = AIM_OVER[k2];
      applyPose(rig, T, 0); rig.group.position.y = (A.$bob || 0) + ((B.$bob || 0) - (A.$bob || 0)) * f; }
  }; }
window.HECAST3D = { ROW: GUNMAN, build: function(){ var rig = buildFigure(GUNMAN); rig.drive = drive(rig); applyPose(rig, POSES.aim, 0); return rig; } };
})();
