/* Hospital Escape — OPUS shooter-asset bake-off (BAKEOFF-SHOOTER-ASSET). One gunman, five techniques.
   Shared module for games/hospital-escape-3d-sample-opus-1..5/ (each page sets window.__OPUS_EX = n and window.__OPUS_V = version).
   The pages load the LIVE game's own files read-only through <base href="../hospital-escape/"> — the live folder is never modified.
   Every example is driven from the engine's fixed step (game time), never wall-clock rAF: ff(), pause, tests and capture stay in sync.
   Evidence harness: O.showcase() + O.walkStep(dt) (stated-speed walk at gameplay framing, foot-contact slide meter). */
(function(){
'use strict';
var EX = +window.__OPUS_EX || 1, VER = +window.__OPUS_V || 99, Q = new URLSearchParams(location.search);
if(Q.get('ex')) EX = +Q.get('ex'); if(Q.get('v')) VER = +Q.get('v');
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, scene = G.scene, cam = G.camera, gb = G.greybox, V = THREE.Vector3;
var O = window.__opus = { ex: EX, ver: VER, ready: false, figs: [], log: [], clips: {} };

// ------------------------------------------------------------------ assets
function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function gunzipParts(parts){ var s = new Blob([b64ToBytes(parts.join(''))]).stream().pipeThrough(new DecompressionStream('gzip')); return new Response(s).arrayBuffer(); }
var base = { scene: null, clips: {} };
O.whenReady = [];
function loadC(){ return new Promise(function(res, rej){ gunzipParts(window.__GUNMAN_GZ_B64).then(function(buf){
  new THREE.GLTFLoader().parse(buf, '', function(g){ base.scene = g.scene; g.animations.forEach(function(c){ base.clips[c.name] = c; }); res(); }, rej); }).catch(rej); }); }

// ------------------------------------------------------------------ skinned clone (no SkeletonUtils dependency)
function cloneSkinned(src){ var c = src.clone(true), byName = {}; c.traverse(function(o){ if(o.isBone) byName[o.name] = o; });
  c.traverse(function(o){ if(o.isSkinnedMesh){ var sk = o.skeleton, bones = sk.bones.map(function(b){ return byName[b.name]; });
    o.bind(new THREE.Skeleton(bones, sk.boneInverses.map(function(m){ return m.clone(); })), o.bindMatrix.clone()); o.material = o.material.clone(); } });
  return c; }
function boneOf(root, name){ var b = null; root.traverse(function(o){ if(!b && o.isBone && o.name === name) b = o; }); return b; }

// ------------------------------------------------------------------ ONE DRAW CALL: merge every skinned part sharing the skeleton into one geometry,
// each part's flat colour baked into vertex colour (the parts are flat-coloured: no textures to atlas)
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }   // r128: no getComponent; glTF weights may be normalized ints
// ROLE RESKIN AT LOAD (repeatable per character, no Blender): every vertex gets a colour from a rule table keyed on its part, its
// dominant bone and its bind position; jacket vertices can be pushed out along their normal (bulk). Rules = the character's spec row.
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

// the plain-clothes gunman's spec row (NEON-C-CAST-SPECS: bomber #733829 anchor hue, beanie #1C1C1C dome, chest rig #1F2522, trousers/boots #22252A, beard)
function lin(h){ return new THREE.Color(h).convertSRGBToLinear(); }
var GUNMAN = { jacket: lin('#733829'), rig: lin('#1F2522'), beanie: lin('#1C1C1C'), trousers: lin('#22252A'), boots: lin('#17181b'), beard: lin('#3a2c22'), skin: lin('#b98468'), hair: lin('#1e1712') };
var ARM = /^(Shoulder|UpperArm|LowerArm)/, LEG = /^(UpperLeg|LowerLeg|Hips)/, TORSO = /^(Abdomen|Torso|Chest|Body|Root)$/;
O.rulesGunman = function(v){ var P = GUNMAN, B = v.bones;
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
O.rulesShape = function(P, colour){ colour = colour || O.rulesGunman; return function(v){ var rc = colour(v) || {}, B = v.bones, push = rc.push || 0, sh = null, x = v.p.x;
  var torso = /^(Abdomen|Torso|Chest|Body|Hips)$/.test(v.bone), arm = /^(Shoulder|UpperArm)/.test(v.bone), skinPart = /Body|Legs/.test(v.part);
  if(skinPart && torso && v.p.y > B.Hips.y){ push += P.girth || 0; if(P.belly && v.n.z > 0.3 && v.p.y < B.Chest.y) push += P.belly * v.n.z; }
  if(skinPart && (arm || (v.bone === 'Chest' && Math.abs(x) > 0.12))){ push += P.shoulders || 0; var side = x > 0 ? 1 : -1; sh = new V(side * (P.shoulderWidth || 0), 0, 0); }
  if(skinPart && v.bone === 'Neck') push += P.neck || 0;
  if(skinPart && /^LowerArm/.test(v.bone)) push += P.forearm || 0;
  if(skinPart && /^UpperLeg/.test(v.bone)) push += P.thigh || 0;
  rc.push = push; if(sh) rc.shift = sh; return rc; }; };
// ------------------------------------------------------------------ ROOM LIGHT on a real mesh: the painted cast's lamp terms (87 ceiling lamps recovered by
// painted.js collectLights) injected into MeshStandardMaterial: a key from the dominant lamp, lamp-level ambient, cool rim on back-lit edges
function lampMat(mat){ var U = { lampDir: { value: new V(0, 1, 0) }, lampKey: { value: 0 }, lampAmb: { value: 0 }, lampBack: { value: 0 }, rimCol: { value: new THREE.Color(0.32, 0.36, 0.4) } };
  mat.onBeforeCompile = function(sh){ Object.keys(U).forEach(function(k){ sh.uniforms[k] = U[k]; });
    sh.fragmentShader = 'uniform vec3 lampDir; uniform float lampKey, lampAmb, lampBack; uniform vec3 rimCol;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\n float lk = max(dot(normal, lampDir), 0.0); reflectedLight.directDiffuse += diffuseColor.rgb * lampKey * lk;\n' +
      ' reflectedLight.indirectDiffuse += diffuseColor.rgb * lampAmb;\n float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\n' +
      ' reflectedLight.directDiffuse += rimCol * pow(fr, 3.0) * (0.25 + lampBack) * (0.4 + lampKey);'); };
  mat.customProgramCacheKey = function(){ return 'opusLamp'; }; mat.userData.lamp = U; return mat; }
var _ld = new V(), _tc = new V();
function lampTerms(fig){ var U = fig.lampU; if(!U) return; var L = (window.HEPAINT && HEPAINT.lights) || [], p = fig.root.getWorldPosition(_tc.set(0, 0, 0)), indoor = !(window.HEPAINT && HEPAINT.indoor === false);
  var sum = 0, dx = 0, dy = 0, dz = 0; if(indoor) for(var i = 0; i < L.length; i++){ var l = L[i], ex = l.x - p.x, ez = l.z - p.z, ey = l.y - p.y; if(ey < 0 || ey > 4.5) continue; var d2 = ex * ex + ez * ez; if(d2 > 81) continue;
    var k = 1 / (1 + d2 / 4.0); sum += k; dx += ex * k; dy += ey * k; dz += ez * k; }
  if(!indoor){ sum = 0.6; dx = -0.4; dy = 1; dz = 0.3; }
  _ld.set(dx, dy, dz); if(_ld.lengthSq() < 1e-6) _ld.set(0, 1, 0); _ld.normalize(); var back = Math.max(0, -_ld.dot(_tc.copy(cam.position).sub(p).setY(0).normalize()));
  _ld.transformDirection(cam.matrixWorldInverse); U.lampDir.value.copy(_ld); U.lampKey.value = 0.55 * Math.min(1.4, sum); U.lampAmb.value = 0.18 + 0.12 * Math.min(1.4, sum); U.lampBack.value = back; }

// ------------------------------------------------------------------ HIT PROXIES: capsules parented to the 22 core bones; the skinned mesh never raycasts
var PROX = [['Head', 0.11, 0.24, 0.08], ['Chest', 0.17, 0.32, 0.0], ['Abdomen', 0.15, 0.26, 0.0], ['Hips', 0.16, 0.2, 0.0], ['UpperArmL', 0.055, 0.3, 0.14], ['LowerArmL', 0.05, 0.28, 0.13], ['UpperArmR', 0.055, 0.3, 0.14], ['LowerArmR', 0.05, 0.28, 0.13],
  ['UpperLegL', 0.08, 0.44, 0.22], ['LowerLegL', 0.065, 0.44, 0.22], ['UpperLegR', 0.08, 0.44, 0.22], ['LowerLegR', 0.065, 0.44, 0.22]];
function addProxies(fig){ var pm = new THREE.MeshBasicMaterial({ visible: false }); fig.proxies = [];
  PROX.forEach(function(d){ var b = boneOf(fig.model, d[0]); if(!b) return; var s = 1 / (fig.boneScale || 1), g = new THREE.CylinderGeometry(d[1] * s, d[1] * s, d[2] * s, 8);
    var m = new THREE.Mesh(g, pm); m.position.y = d[3] * s; m.name = 'proxy'; b.add(m); fig.proxies.push(m); });
  fig.model.traverse(function(o){ if(o.isSkinnedMesh) o.raycast = function(){}; }); }

// ------------------------------------------------------------------ clips + pacing (foot-contact adjudicated speeds for the C clips: Walk 1.30 / Run 3.20 m/s)
var PACE = { Walk: 1.30, Run: 3.20 };
function play(fig, name, fade, loopOnce){ if(fig.cur === name) return; var a = fig.actions[name]; if(!a) return; var prev = fig.cur ? fig.actions[fig.cur] : null;
  a.reset(); a.enabled = true; a.setEffectiveWeight(1); if(loopOnce){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else { a.setLoop(THREE.LoopRepeat, Infinity); }
  a.play(); if(prev && prev !== a) a.crossFadeFrom(prev, fade == null ? 0.2 : fade, false); fig.cur = name; }

// ------------------------------------------------------------------ BUILDERS per example (filled in below as the examples land)
var BUILD = {};
BUILD.c = function(opt){ var model = cloneSkinned(base.scene), wrap = new THREE.Group(); wrap.name = 'opusFig'; model.scale.setScalar((opt.height || 1.77) / 1.81); wrap.add(model);
  var fig = { root: wrap, model: model, mixer: new THREE.AnimationMixer(model), actions: {}, cur: null, pace: PACE };
  Object.keys(opt.clips || base.clips).forEach(function(n){ fig.actions[n] = fig.mixer.clipAction((opt.clips || base.clips)[n]); });
  if(opt.merge) mergeSkinned(model, opt.rules || null);
  if(opt.lamp){ model.traverse(function(o){ if(o.isSkinnedMesh){ o.material = lampMat(o.material.clone ? o.material.clone() : o.material); fig.lampU = o.material.userData.lamp; } }); }
  if(opt.proxies) addProxies(fig);
  model.traverse(function(o){ if(o.isMesh) o.frustumCulled = false; });
  return fig; };
O.BUILD = BUILD;
function specFor(ex, ver){ // the version table IS the iteration trail
  if(ex === 1) return ver <= 1 ? { kind: 'c' } : ver === 2 ? { kind: 'c', merge: true, lamp: true, proxies: true } : { kind: 'c', merge: true, lamp: true, proxies: true, rules: O.rulesGunman };   /* v3 = first reskin (torn seams, spiky hair); v4 = seams closed but dome projection went bald; v5 = scalp-recolour beanie, rim too low (hid the face); v6 = rim set from measured brow height */
  return (O.SPEC && O.SPEC(ex, ver)) || { kind: 'c' }; }
O.make = function(){ var s = specFor(EX, VER), f = BUILD[s.kind](s); f.spec = s; f.shadow = blob(); f.root.add(f.shadow); return f; };
function blob(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  var m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: true }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1; m.raycast = function(){}; return m; }

// ------------------------------------------------------------------ the per-figure driver (shared by in-game enemies and the showcase)
// state -> clip: dead/flinch/fire win; moving -> Walk/Run at timeScale = speed / foot-contact pace (switch with hysteresis 1.9 / 2.4 m/s); else aim / idle
function drive(fig, dt, st){ if(fig.drive) return fig.drive(fig, dt, st);
  if(st.dead){ play(fig, 'Death', 0.1, true); }
  else if(st.flinch){ play(fig, 'HitRecieve', 0.05, true); }
  else if(st.fire){ play(fig, 'Gun_Shoot', 0.05, true); }
  else if(st.speed > 0.25){ var run = fig.cur === 'Run' ? st.speed > 1.9 : st.speed > 2.4; play(fig, run ? 'Run' : 'Walk', 0.2); var a = fig.actions[fig.cur]; if(a) a.timeScale = st.speed / fig.pace[run ? 'Run' : 'Walk']; }
  else if(st.aim) play(fig, 'Idle_Gun_Pointing', 0.2); else play(fig, 'Idle_Gun', 0.25);
  if(fig.mixer) fig.mixer.update(dt); lampTerms(fig); }

// ------------------------------------------------------------------ IN-GAME: every plain gunman becomes the example's figure (engine state drives it)
var live = {};
var _add = gb.addActor; gb.addActor = function(role, kind){ var p = _add.apply(this, arguments); if(kind === 'gunman') live[role] = { p: p, fig: null, last: null, fireT: 0, flinchT: 0 }; return p; };
var _rm = gb.removeActor; gb.removeActor = function(role){ delete live[role]; return _rm.apply(this, arguments); };
function attachLive(L, role){ var f = O.make(); L.fig = f; L.p.add(f.root); L.p.children.forEach(function(c){ if(c !== f.root) c.traverse(function(o){ o.layers.set(31); }); }); L.p.userData.pk = null; L.p.userData.painted = false; f.role = role; }
var logI = 0;
function stepLive(dt){ var Lg = G._log; for(; logI < Lg.length; logI++){ var e = Lg[logI], d = e.data, L = d && live[d.role]; if(!L) continue; if(e.type === 'enemyShot') L.fireT = 0.34; else if(e.type === 'hit' && d.hp > 0) L.flinchT = 0.3; }
  Object.keys(live).forEach(function(role){ var L = live[role], en = G.combat.byRole(role); if(!L.p.parent) return; if(!L.fig){ if(!O.ready) return; attachLive(L, role); }
    var pos = L.p.position, sp = L.last && dt > 0 ? Math.hypot(pos.x - L.last.x, pos.z - L.last.z) / dt : 0; L.last = (L.last || new V()).copy(pos); L.fireT = Math.max(0, L.fireT - dt); L.flinchT = Math.max(0, L.flinchT - dt);
    // facing: toward the camera when aiming / firing, else along the motion
    var f = L.fig, yaw; if(sp > 0.25 && L.mv){ yaw = Math.atan2(L.mv.x, L.mv.z); } else yaw = Math.atan2(cam.position.x - pos.x, cam.position.z - pos.z); if(L.mv0) {}
    if(sp > 0.25){ L.mv = (L.mv || new V()).set(pos.x - (L.px || pos.x), 0, pos.z - (L.pz || pos.z)); } L.px = pos.x; L.pz = pos.z;
    f.root.rotation.y = yaw - L.p.rotation.y;
    drive(f, dt, { dead: L.p.userData.dead || (en && !en.alive), flinch: L.flinchT > 0, fire: L.fireT > 0, speed: sp, aim: !!(en && (en.exposed || en.aiming > 0)), cam: cam.position }); }); }
var _step = G.step; G.step = function(dt){ _step.apply(G, arguments); stepLive(dt); };

// ------------------------------------------------------------------ SHOWCASE: the bake-off's evidence walk — gauntlet hall, gameplay rail camera, stated speed
O.showcase = function(o){ o = Object.assign({ beat: 'gauntlet', d0: 14.5, l0: 1.05, d1: 5.2, l1: 0.75, speed: 1.4, aimFrom: null }, o || {});
  GW.start(o.beat); GW.pause(true); G.combat.clearEnemies(); G.combat.shots = []; GW.tick();
  var c = cam.position, f = cam.getWorldDirection(new V()); f.y = 0; f.normalize(); var r = new V(-f.z, 0, f.x), y = G.rail.path.pointAtS(G.rail.s).y;
  var a = c.clone().addScaledVector(f, o.d0).addScaledVector(r, o.l0), b = c.clone().addScaledVector(f, o.d1).addScaledVector(r, o.l1); a.y = b.y = y;
  if(O.show) scene.remove(O.show.root); var fig = O.make(); scene.add(fig.root); fig.root.position.copy(a); fig.root.lookAt(b.x, y, b.z);
  O.show = fig; O.walk = { a: a, b: b, s: 0, L: a.distanceTo(b), o: o, feet: null, contacts: [] }; return { from: a.toArray(), to: b.toArray(), len: O.walk.L }; };
// one fixed step of the showcase walk; samples both feet for the foot-contact slide meter
O.walkStep = function(dt){ var W = O.walk, f = O.show; if(!W) return null; W.dt = dt; var moving = W.s < W.L; W.s = Math.min(W.L, W.s + W.o.speed * dt);
  f.root.position.lerpVectors(W.a, W.b, W.s / W.L); var aiming = W.o.aimFrom != null && W.s >= W.o.aimFrom;
  drive(f, dt, { speed: moving ? W.o.speed : 0, aim: true, aimWalk: aiming, cam: cam.position });
  f.root.updateMatrixWorld(true); meterFeet(f, dt, moving); return { s: +W.s.toFixed(3), clip: f.cur }; };
function meterFeet(f, dt, moving){ var W = O.walk; FP = FP || O.footPoints();
  if(!W.feet){ W.feet = {}; ['L', 'R'].forEach(function(sd){ var b = boneOf(f.model, 'Foot' + sd); if(b){ W.feet['heel' + sd] = { b: b, off: FP[sd].heel, min: 1e9 }; W.feet['toe' + sd] = { b: b, off: FP[sd].toe, min: 1e9 }; } }); }
  Object.keys(W.feet).forEach(function(n){ var F = W.feet[n], p = F.b.localToWorld(F.off.clone()), h = p.y - W.a.y; F.min = Math.min(F.min, h); F.hist = F.hist || []; F.hist.push([p.x, h, p.z, moving]); }); }
// HEEL + TOE contact points, from the rest mesh: vertices weighted > 0.5 to the foot bone, most-back and most-front near the sole, as offsets in the foot bone's frame
O.footPoints = function(src){ src = src || base.scene; src.updateMatrixWorld(true); src.traverse(function(o){ if(o.isSkinnedMesh) o.skeleton.update(); }); var out = {};
  ['L', 'R'].forEach(function(sd){ var bn = 'Foot' + sd, fb = boneOf(src, bn), pts = [];
    src.traverse(function(o){ if(!o.isSkinnedMesh) return; var g = o.geometry, bi = o.skeleton.bones.findIndex(function(b){ return b.name === bn; }); if(bi < 0) return; var v = new V();
      for(var i = 0; i < g.attributes.position.count; i++){ var w = 0; for(var k = 0; k < 4; k++) if(comp(g.attributes.skinIndex, i, k) === bi) w += comp(g.attributes.skinWeight, i, k); if(w > 0.5){ o.boneTransform(i, v).applyMatrix4(o.matrixWorld); pts.push(v.clone());   /* the skinning path itself (the feet mesh sits under a x100 armature) */ } } });
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); }); var sole = pts.filter(function(p){ return p.y < ymin + 0.03; });
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; });
    out[sd] = { bone: bn, heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()), n: pts.length }; });
  return out; };
var FP = null;
// after a walk: contacts = runs where a foot sits within 2.5 cm of its lowest height while the figure moves; slide = max horizontal travel within the contact
O.slideReport = function(){ var W = O.walk, out = {}; Object.keys(W.feet).forEach(function(n){ var F = W.feet[n], run = null, sl = []; F.hist.forEach(function(s){ var planted = s[3] && s[1] < F.min + 0.02;   /* this contact point is on the floor (2 cm band) */
    if(planted){ if(!run) run = { x: s[0], z: s[2], n: 0, max: 0 }; else { run.n++; run.max = Math.max(run.max, Math.hypot(s[0] - run.x, s[2] - run.z)); } } else if(run){ if(run.n >= 3) sl.push(run.max); run = null; } });
    // strict contact (standard foot-skate test): within 1 cm of the floor AND moving < 0.6 m/s horizontally (excludes pre-contact grazing in swing)
    var run2 = null, sl2 = [], H = F.hist; for(var i = 1; i < H.length; i++){ var s1 = H[i], s0 = H[i - 1], v = Math.hypot(s1[0] - s0[0], s1[2] - s0[2]) / (W.dt || 1 / 30), pl = s1[3] && s1[1] < F.min + 0.01 && v < 0.6;
      if(pl){ if(!run2) run2 = { x: s1[0], z: s1[2], n: 0, max: 0 }; else { run2.n++; run2.max = Math.max(run2.max, Math.hypot(s1[0] - run2.x, s1[2] - run2.z)); } } else if(run2){ if(run2.n >= 3) sl2.push(run2.max); run2 = null; } }
    sl2.sort(function(a, b){ return a - b; }); F.strict = { contacts: sl2.length, median_cm: sl2.length ? +(100 * sl2[sl2.length >> 1]).toFixed(1) : null, max_cm: sl2.length ? +(100 * sl2[sl2.length - 1]).toFixed(1) : null };
    sl.sort(function(a, b){ return a - b; }); out[n] = { strict: F.strict, contacts: sl.length, median_cm: sl.length ? +(100 * sl[sl.length >> 1]).toFixed(1) : null, max_cm: sl.length ? +(100 * sl[sl.length - 1]).toFixed(1) : null }; });
  return out; };
// cost: one figure alone (draw calls / triangles of its own meshes)
O.height = function(){ var f = O.show; if(!f) return null; var h = f.headBone || boneOf(f.model, 'Head'); if(!h) return null; return +(h.getWorldPosition(new V()).y - O.walk.a.y + 0.12).toFixed(2); };
O.cost = function(){ var f = O.show || O.make(), calls = 0, tris = 0; f.root.traverse(function(o){ if(o.isMesh && o.visible !== false && !(o.material && o.material.visible === false) && o.name !== 'proxy'){ calls++; var g = o.geometry; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return { calls: calls, tris: Math.round(tris) }; };

// ------------------------------------------------------------------ boot
loadC().then(function(){ var go = function(){ O.ready = true; window.__opusReady = true; }; if(O.prep) O.prep(base, go); else go(); }).catch(function(e){ window.__opusReady = 'fail:' + e; });
O.base = base; O.lampMat = lampMat; O.lampTerms = lampTerms; O.mergeSkinned = mergeSkinned; O.cloneSkinned = cloneSkinned; O.boneOf = boneOf; O.play = play; O.addProxies = addProxies; O.PACE = PACE;
})();
