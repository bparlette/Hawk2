/* Hospital Escape — HECAST: the 3D cast (tasking/INTEGRATION.md, Opus). Replaces the painted billboard cast for the
   gunmen, Maya and Cole with Neon's cast-pass bodies (VALID rig) driven by Mixamo clips:
     - gunmen = N2 (n2-mixamo.glb, the walk-off winner) on the 27 offline-retargeted Mixamo gunman clips (mx-gunman.glb);
     - Maya   = maya-mixamo.glb (her own push loops) + the gunman set's aim / fire / flinch / crouch on her rig;
     - Cole   = cole-mixamo.glb (seated / bed set) wherever the painted Cole used to be shown.
   Pacing law: forward Walk below 2.04 m/s, Run at/above; every locomotion clip's timeScale = engine speed / that clip's OWN
   stance-phase foot-contact speed on that body (measured at load, contactPace). Recoil = the authored Mixamo kick, 1.0x, additive.
   Hits land on bone-parented capsules (the skinned mesh never raycasts). The pistol is seated in the AIM pose (grip in the palm,
   fingers wrapped by the clip, barrel along the forearm) and parented to RightHand. ?cast=painted restores the painted cast. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search); if(Q.get('cast') === 'painted' || !THREE.GLTFLoader) return;
var V = THREE.Vector3, Qt = THREE.Quaternion, DIR = 'assets/cast/';
var C = window.HECAST = { ready: false, stats: { styles: {}, deaths: {}, hits: {} }, figs: [] };
var L = new THREE.GLTFLoader(), base = {}, clipsMX = {}, seat = {}, rest = {}, paces = {};
function load(f){ return new Promise(function(res, rej){ L.load(DIR + f, res, undefined, rej); }); }
function boneOf(root, n){ var b = null; root.traverse(function(o){ if(!b && (o.isBone || o.type === 'Object3D') && o.name === n) b = o; }); return b; }
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }
var TARGET_H = { n2: 1.79, maya: 1.68, cole: 1.80, pa: 1.77, pb: 1.74 };
// ------------------------------------------------------------------ load + prepare
Promise.all([load('n2-mixamo.glb'), load('maya-mixamo.glb'), load('cole-mixamo.glb'), load('mx-gunman.glb')]).then(function(r){
  base.n2 = r[0]; base.maya = r[1]; base.cole = r[2]; var mx = r[3];
  ['n2', 'maya', 'cole'].forEach(function(k){ var s = base[k].scene; var kill = []; s.traverse(function(o){ if(o.isMesh && ((o.material && /Pistol/i.test(o.material.name || '')) || /Pistol/i.test(o.name))) kill.push(o); });
    kill.forEach(function(o){ o.parent.remove(o); }); s.updateMatrixWorld(true); measure(k); });
  // the Mixamo gunman set: rotations as authored; the hips track re-based per body (leg ratio, in the hips' parent space)
  var refHips = mx.scene.getObjectByName('Hips'), refLeg = legLocal(mx.scene);
  mx.animations.forEach(function(c){ c.tracks = c.tracks.filter(function(t){ return t.name === 'Hips.position' || /\.quaternion$/.test(t.name); }); clipsMX[c.name] = { clip: c, ref: refHips.position.clone(), refLeg: refLeg }; });
  ['n2', 'maya', 'cole'].forEach(function(k){ seat[k] = seatPistol(k); });
  paces.n2 = {}; [['pistol-walk', [0, 0, 1]], ['pistol-run-aimed', [0, 0, 1]], ['pistol-walk-backward', [0, 0, -1]], ['pistol-strafe', [1, 0, 0]], ['pistol-strafe-mirrored', [-1, 0, 0]], ['crouch-walk-forward', [0, 0, 1]],
    ['pistol-walk-arc-left', [0.24, 0, 0.97]], ['pistol-walk-arc-right', [-0.21, 0, 0.98]]].forEach(function(d){ paces.n2[d[0]] = contactPace('n2', mxClip('n2', d[0]), new V().fromArray(d[1])); });
  paces.maya = {}; base.maya.animations.forEach(function(c){ if(/Push_Loop|Wheelchair_Push|Walk_Fem/.test(c.name)) paces.maya[c.name] = contactPace('maya', c, new V(0, 0, 1)); });
  C.paces = {}; Object.keys(paces).forEach(function(k){ C.paces[k] = {}; Object.keys(paces[k]).forEach(function(n){ C.paces[k][n] = +paces[k][n].toFixed(3); }); });
  C.ready = true; window.__castReady = true;
  /* background patients: two VALID bodies + 7 retargeted patient clips, loaded after the cast (never blocks it) */
  Promise.all([load('patient-a.glb'), load('patient-b.glb'), load('mx-patients.glb')]).then(function(q){ base.pa = q[0]; base.pb = q[1]; measure('pa'); measure('pb');
    var rh = q[2].scene.getObjectByName('Hips'), rl = legLocal(q[2].scene); q[2].animations.forEach(function(c){ c.tracks = c.tracks.filter(function(t){ return t.name === 'Hips.position' || /\.quaternion$/.test(t.name); }); clipsMX[c.name] = { clip: c, ref: rh.position.clone(), refLeg: rl }; });
    C.patientsReady = true; if(C.onPatientsReady) C.onPatientsReady(); }).catch(function(e){ console.error('HECAST patients failed', e); });
  }).catch(function(e){ console.error('HECAST load failed', e); window.__castReady = 'fail:' + e; });
function legLocal(sc){ sc.updateMatrixWorld(true); var h = sc.getObjectByName('Hips'), par = h.parent, P = function(n){ return par.worldToLocal(sc.getObjectByName(n).getWorldPosition(new V())); };
  return P('LeftUpLeg').distanceTo(P('LeftLeg')) + P('LeftLeg').distanceTo(P('LeftFoot')); }
function measure(k){ var s = base[k].scene, bp = {}; s.traverse(function(o){ if(o.isBone) bp[o.name] = o.getWorldPosition(new V()); });
  var foot = Math.min(bp.LeftToeBase.y, bp.LeftFoot.y, bp.RightToeBase.y, bp.RightFoot.y), crown = bp.HeadEnd ? bp.HeadEnd.y : bp.Head.y + 0.12 * (bp.Head.y - foot);
  rest[k] = { foot: foot, height: crown - foot, hips: s.getObjectByName('Hips').position.clone(), leg: legLocal(s) }; }
var _clipCache = {};
function mxClip(k, name){ var key = k + ':' + name; if(_clipCache[key]) return _clipCache[key]; var M = clipsMX[name]; if(!M) return null; var c = M.clip.clone(), R = rest[k], kl = R.leg / M.refLeg;
  c.tracks = c.tracks.map(function(t){ if(t.name !== 'Hips.position') return t; var t2 = t.clone(), v = t2.values; for(var j = 0; j < v.length; j += 3){ v[j] = R.hips.x + (v[j] - M.ref.x) * kl; v[j + 1] = R.hips.y + (v[j + 1] - M.ref.y) * kl; v[j + 2] = R.hips.z + (v[j + 2] - M.ref.z) * kl; } return t2; });
  c.name = name; return (_clipCache[key] = c); }
function cloneSkinned(src){ var c = src.clone(true), by = {}; c.traverse(function(o){ if(o.isBone) by[o.name] = o; });
  c.traverse(function(o){ if(o.isSkinnedMesh){ var sk = o.skeleton; o.bind(new THREE.Skeleton(sk.bones.map(function(b){ return by[b.name]; }), sk.boneInverses.map(function(m){ return m.clone(); })), o.bindMatrix.clone()); } });
  return c; }
// ------------------------------------------------------------------ the pistol: one merged mesh; seated ONCE per body in the aim pose, stored relative to RightHand
function pistolMesh(){ var parts = [[0.03, 0.032, 0.19, 0, 0.026, 0.05, 0, 0.30], [0.028, 0.11, 0.045, 0, -0.03, -0.01, -0.28, 0.12], [0.026, 0.02, 0.07, 0, 0.0, 0.04, 0, 0.12]], pos = [], nor = [], col = [];
  parts.forEach(function(p){ var g = new THREE.BoxGeometry(p[0], p[1], p[2]).toNonIndexed(); var m = new THREE.Matrix4().makeRotationX(p[6]).setPosition(p[3], p[4], p[5]); g.applyMatrix4(m);
    pos.push.apply(pos, g.attributes.position.array); nor.push.apply(nor, g.attributes.normal.array); for(var i = 0; i < g.attributes.position.count; i++) col.push(p[7] * 0.06, p[7] * 0.062, p[7] * 0.068); });
  var mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.55 })); }
var GRIP = { along: 0.35, palm: 0.035, up: -0.05 };   /* tuned on 2x close-ups (seat-ab): the slide rests on the web of the hand, the grip inside the fist */
function seatPistol(k){ var s = base[k].scene, mx = new THREE.AnimationMixer(s), c = mxClip(k, 'pistol-walk'), a = mx.clipAction(c); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); mx.setTime(c.duration * 0.3); s.updateMatrixWorld(true);
  var W = function(n){ return s.getObjectByName(n).getWorldPosition(new V()); }, H = W('RightHand'), F = W('RightForeArm'), M = W('RightHandMiddle1'), I = W('RightHandIndex1'), P = W('RightHandPinky1'), M3 = W('RightHandMiddle3');
  var u0 = H.distanceTo(F) > 5 ? 100 : 1, b = H.clone().sub(F).normalize(), up = I.clone().sub(P); up.addScaledVector(b, -up.dot(b)).normalize();
  var side = new V().crossVectors(up, b).normalize(); if(M3.clone().sub(M).dot(side) < 0) side.negate();   /* the palm side = where the fingers curl */
  var G = H.clone().lerp(M, GRIP.along).addScaledVector(side, GRIP.palm * u0).addScaledVector(up, GRIP.up * u0);
  var q = new Qt().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V().crossVectors(up, b).normalize(), up, b)), gw = new THREE.Matrix4().compose(G.clone().sub(new V(0, -0.03, -0.01).multiplyScalar(u0).applyQuaternion(q)), q, new V(u0, u0, u0));
  var hand = s.getObjectByName('RightHand'), local = new THREE.Matrix4().copy(hand.matrixWorld).invert().multiply(gw); mx.stopAllAction(); mx.uncacheRoot(s);
  resetPose(s); return local; }
function resetPose(s){ s.traverse(function(o){ if(o.isSkinnedMesh) o.skeleton.pose(); }); s.updateMatrixWorld(true); }
// ------------------------------------------------------------------ stance-phase foot-contact pace (the law's ONLY measure): sole heel/toe points of this body, clip at 240 samples
function footPoints(k){ var s = base[k].scene, body = null; s.traverse(function(o){ if(o.isSkinnedMesh && !body) body = o; }); var g = body.geometry, sk = body.skeleton, v = new V(), out = {}; resetPose(s);
  ['Left', 'Right'].forEach(function(sd){ var ids = sk.bones.map(function(x, i){ return /Foot|Toe/.test(x.name) && x.name.indexOf(sd) === 0 ? i : -1; }).filter(function(i){ return i >= 0; }), pts = [];
    for(var i = 0; i < g.attributes.position.count; i += 2){ var w = 0; for(var j = 0; j < 4; j++) if(ids.indexOf(comp(g.attributes.skinIndex, i, j)) >= 0) w += comp(g.attributes.skinWeight, i, j); if(w > 0.5) pts.push(body.boneTransform(i, v.set(0, 0, 0)).applyMatrix4(body.matrixWorld).clone()); }
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); }); var sole = pts.filter(function(p){ return p.y < ymin + 0.03 * rest[k].height; });
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; }), fb = s.getObjectByName(sd + 'Foot');
    out[sd] = { heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()) }; }); return out; }
var FP = {};
function contactPace(k, clip, dir){ if(!clip) return 1; FP[k] = FP[k] || footPoints(k); var m = cloneSkinned(base[k].scene), mx = new THREE.AnimationMixer(m), N = 240, H = [], a = mx.clipAction(clip); a.play();
  ['Left', 'Right'].forEach(function(sd){ var b = m.getObjectByName(sd + 'Foot'); ['heel', 'toe'].forEach(function(t){ H.push({ b: b, off: FP[k][sd][t], P: [] }); }); });
  var sc = TARGET_H[k] / rest[k].height; for(var i = 0; i <= N; i++){ mx.setTime(clip.duration * i / N * 0.9999); m.updateMatrixWorld(true); H.forEach(function(h){ h.P.push(h.b.localToWorld(h.off.clone()).multiplyScalar(sc)); }); }
  var v = []; H.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); }); for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01) v.push(-h.P[i].clone().sub(h.P[i - 1]).dot(dir) / (clip.duration / N)); });
  v.sort(function(x, y){ return x - y; }); return v.length ? Math.max(0.2, v[v.length >> 1]) : 1; }
// ------------------------------------------------------------------ hit capsules: bone-parented, between rest joints (world metres)
var SEGS = [['Hips', 'Hips', 'Spine1', 0.15], ['Spine1', 'Spine1', 'Neck', 0.16], ['Neck', 'Neck', 'Head', 0.06], ['Head', 'Head', 'HeadEnd', 0.105],
  ['LeftArm', 'LeftArm', 'LeftForeArm', 0.055], ['LeftForeArm', 'LeftForeArm', 'LeftHand', 0.047], ['RightArm', 'RightArm', 'RightForeArm', 0.055], ['RightForeArm', 'RightForeArm', 'RightHand', 0.047],
  ['LeftUpLeg', 'LeftUpLeg', 'LeftLeg', 0.08], ['LeftLeg', 'LeftLeg', 'LeftFoot', 0.062], ['RightUpLeg', 'RightUpLeg', 'RightLeg', 0.08], ['RightLeg', 'RightLeg', 'RightFoot', 0.062],
  ['LeftShoulder', 'LeftShoulder', 'LeftArm', 0.06], ['RightShoulder', 'RightShoulder', 'RightArm', 0.06], ['LeftHand', 'LeftHand', 'LeftHandMiddle2', 0.045], ['RightHand', 'RightHand', 'RightHandMiddle2', 0.05],
  ['LeftFoot', 'LeftFoot', 'LeftToeBase', 0.05], ['RightFoot', 'RightFoot', 'RightToeBase', 0.05]];
var PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });
function addCapsules(f){ var m = f.model; f.root.updateMatrixWorld(true); f.proxies = [];
  SEGS.forEach(function(d){ var b = m.getObjectByName(d[0]), A = m.getObjectByName(d[1]), E = m.getObjectByName(d[2]); if(!b || !A || !E) return; var Pa = A.getWorldPosition(new V()), Pe = E.getWorldPosition(new V()); if(Pa.distanceTo(Pe) < 1e-4) return;
    var s = b.getWorldScale(new V()).x, r = d[3], Ln = Pa.distanceTo(Pe) + r, mesh = new THREE.Mesh(new THREE.CylinderGeometry(r / s, r / s, Ln / s, 8), PROXY_MAT), la = b.worldToLocal(Pa.clone()), le = b.worldToLocal(Pe.clone());
    mesh.position.copy(la).add(le).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new V(0, 1, 0), le.clone().sub(la).normalize()); mesh.name = 'proxy'; mesh.userData.seg = d[0]; b.add(mesh); f.proxies.push(mesh); }); }
// ------------------------------------------------------------------ light: the room's lamp terms (the painted cast's lamp list) + the light-modulated contact shadow (T4)
var BLOB_TEX = (function(){ var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.92)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
var SHADOW = { dark: 0.52, light: 0.13 };   /* T4's values (Cherie, Nov 24): a firmer shadow in the dark stretches, a whisper in the lamp pools */
function lampSum(p){ var Ls = (window.HEPAINT && HEPAINT.lights) || [], s = 0; for(var i = 0; i < Ls.length; i++){ var l = Ls[i], ex = l.x - p.x, ez = l.z - p.z, ey = l.y - p.y; if(ey < 0 || ey > 4.5) continue; var d2 = ex * ex + ez * ez; if(d2 > 36) continue; s += 1 / (1 + d2 / 2.2); } return s; }
function lightFig(f){ var p = f.root.getWorldPosition(new V()), s = lampSum(p), n = Math.min(1, s / 1.4), indoor = !(window.HEPAINT && HEPAINT.indoor === false);
  if(f.blob){ f.blob.material.opacity = (indoor ? SHADOW.dark + (SHADOW.light - SHADOW.dark) * n : 0.4) * (f.blobK == null ? 1 : f.blobK); }
  if(f.amb){ f.amb.intensity = indoor ? 0.25 + 0.9 * n : 0.55; } }
// ------------------------------------------------------------------ build a figure
var LOWER = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
function sub(c, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? LOWER.test(b) : !LOWER.test(b); }); return x; }
function additive(c, a, b, name){ var AU = THREE.AnimationUtils; return AU.makeClipAdditive(sub(AU.subclip(c, name, a, b, 30), false, name)); }
C.make = function(k){ var model = cloneSkinned(base[k].scene), root = new THREE.Group(), s = TARGET_H[k] / rest[k].height; root.add(model); model.scale.setScalar(s); model.position.y = -rest[k].foot * s; root.name = 'cast3d';
  var f = { k: k, root: root, model: model, mixer: new THREE.AnimationMixer(model), acts: {}, cur: {}, twist: 0, yawOff: 0, offs: new V() };
  model.traverse(function(o){ if(o.isMesh){ o.frustumCulled = false; o.raycast = function(){}; if(o.material){ o.material = o.material.clone(); o.material.envMapIntensity = 0.6; } } });
  var hand = model.getObjectByName('RightHand'), gun = pistolMesh(); gun.matrixAutoUpdate = false; gun.matrix.copy(seat[k]); gun.raycast = function(){}; hand.add(gun); f.gun = gun;
  var bl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.62), new THREE.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, opacity: 0.4 })); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.015; bl.renderOrder = 1; bl.raycast = function(){}; root.add(bl); f.blob = bl;
  if(window.HET4 && HET4.on) HET4.dressFigure(root);   /* T4-FULL: the area term + real shadows on the cast */
  addCapsules(f); C.figs.push(f); return f; };
C.action = function(f, clip, opt){ if(!clip) return null; var a = f.acts[clip.name + (opt && opt.tag || '')]; if(a) return a; a = f.mixer.clipAction(clip); if(opt && opt.additive) a.blendMode = THREE.AdditiveAnimationBlendMode;
  if(opt && opt.once){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = !!opt.clamp; } f.acts[clip.name + (opt && opt.tag || '')] = a; return a; };
function play(f, slot, clip, fade, opt){ if(!clip) return null; var cur = f.cur[slot]; if(cur && cur.getClip() === clip && cur.isRunning()) return cur; var a = C.action(f, clip, opt); a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(1); a.play();
  if(cur && cur !== a) a.crossFadeFrom(cur, fade == null ? 0.25 : fade, false); f.cur[slot] = a; return a; }
function stopSlot(f, slot, fade){ var cur = f.cur[slot]; if(cur){ cur.fadeOut(fade || 0.2); f.cur[slot] = null; } }
function pulse(f, clip, w){ var a = C.action(f, clip, { additive: true, once: true }); a.reset(); a.setEffectiveWeight(w == null ? 1 : w); a.play(); }
C.muzzle = function(p, out){ var f = p.userData.c3; if(!f) return null; return f.gun.localToWorld(out.set(0, 0.026, 0.145)); };
// ------------------------------------------------------------------ GUNMEN: N2 on the Mixamo set; behaviour -> clip
var GC = null;
function gunClips(){ if(GC) return GC; var g = function(n){ return mxClip('n2', n); }, AU = THREE.AnimationUtils;
  GC = { walk: g('pistol-walk'), run: g('pistol-run-aimed'), back: g('pistol-walk-backward'), strafeL: g('pistol-strafe'), strafeR: g('pistol-strafe-mirrored'), arcL: g('pistol-walk-arc-left'), arcR: g('pistol-walk-arc-right'), crouch: g('crouch-walk-forward'),
    legsIdle: sub(g('pistol-idle'), true, 'legsIdle'), upAim: sub(AU.subclip(g('pistol-aim'), 'aimHold', 0, 16, 30), false, 'upAim'), kneel: g('pistol-kneeling-idle'), coverIdle: g('cover-idle-standing'), coverFire: g('shooting-pistol'),
    turnL: sub(g('left-turn'), true, 'turnL'), turnR: sub(g('right-turn'), true, 'turnR'),
    fire: additive(g('shooting'), 6, 33, 'fire'), hit: additive(g('hit-reaction'), 0, 30, 'hit'), hitL: additive(g('hit-reaction-left'), 0, 30, 'hitL'),
    dieHead: g('dying'), dieChest: g('dying-backwards') }; return GC; }
function hash(s){ var h = 2166136261; for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function styleFor(e){ var r = hash(e.role), W = window.HEWORLD;
  if(e.behavior === 'cover'){ var nearDoor = W && W.doors && W.doors.some(function(d){ return !d.elevator && Math.hypot(d.pos.x - e.pos.x, d.pos.z - e.pos.z) < 2.6 && Math.abs(d.pos.y - e.pos.y) < 1.5; });
    if(nearDoor) return 'door'; return r < 0.45 ? 'kneel' : 'stand'; }
  if(e.behavior === 'rush') return r < 0.34 ? 'flank' : 'rush'; return 'stand'; }
C.attachEnemy = function(p, kind){ if(!C.ready || (kind !== 'gunman' && kind !== 'staff')) return false; var f = C.make('n2');
  p.children.slice().forEach(function(c){ c.traverse(function(o){ o.layers.set(31); }); }); p.add(f.root); p.userData.c3 = f; p.userData.pk = null; p.userData.painted = false; f.p = p; return true; };
var _v = new V(), _w = new V(), _q = new Qt(), UPV = new V(0, 1, 0);
C.stepEnemy = function(e, p, dt, game){ var f = p.userData.c3, K = gunClips(); if(!f) return; if(!f.style){ f.style = styleFor(e); C.stats.styles[f.style] = (C.stats.styles[f.style] || 0) + 1; if(f.style === 'door') e.noCommit = true; }
  // displayed position: the engine may jump the actor (corner hide / reposition) — the figure walks it off instead of teleporting
  p.updateMatrixWorld(true); var tgt = p.getWorldPosition(_w); if(!f.disp || f.disp.distanceTo(tgt) > 2.0) f.disp = tgt.clone(); var prev = f.disp.clone(); f.disp.lerp(tgt, Math.min(1, dt * 7));
  f.root.position.copy(p.worldToLocal(f.disp.clone())); f.root.position.y = 0;
  var vel = dt > 0 ? f.disp.clone().sub(prev).divideScalar(dt) : new V(); vel.y = 0; f.vs = (f.vs || new V()).lerp(vel, Math.min(1, dt * 10)); var sp = f.vs.length();
  if(p.userData.dead){ if(!f.dead){ f.dead = true; var hd = f.lastHit && f.lastHit.head || f.style === 'kneel', dc = hd ? K.dieHead : K.dieChest; C.stats.deaths[hd ? 'head-knees' : 'chest-backwards'] = (C.stats.deaths[hd ? 'head-knees' : 'chest-backwards'] || 0) + 1;
      f.mixer.stopAllAction(); f.cur = {}; var da = play(f, 'full', dc, 0.1, { once: true, clamp: true }); if(f.style === 'kneel') da.time = dc.duration * 0.45; }   /* a kneeling shooter joins the head-impact death where it is already down on one knee */ f.mixer.update(dt); lightFig(f); return; }
  // the engine re-aims the actor at the hero every step: the figure KEEPS its world facing and turns into the new one (turn clips when it is big)
  var pd = p.getWorldDirection(new V()), pyaw = Math.atan2(pd.x, pd.z); if(f.pyaw != null){ var dy = pyaw - f.pyaw; while(dy > Math.PI) dy -= 2 * Math.PI; while(dy < -Math.PI) dy += 2 * Math.PI; f.root.rotation.y -= dy; } f.pyaw = pyaw;
  // local velocity (the actor faces the hero: +Z local = toward him)
  _q.copy(p.quaternion).invert(); var lv = f.vs.clone().applyQuaternion(_q), ang = Math.atan2(lv.x, lv.z), hidden = e.behavior === 'cover' && !e.exposed;
  if(sp > 0.3){ var aa = Math.abs(ang), clip, pace;
    if(aa < 0.44){ if(f.style === 'flank'){ clip = K.crouch; pace = paces.n2['crouch-walk-forward']; } else if(sp >= 2.04){ clip = K.run; pace = paces.n2['pistol-run-aimed']; } else { clip = K.walk; pace = paces.n2['pistol-walk']; } }
    else if(aa < 1.13){ clip = ang > 0 ? K.arcL : K.arcR; pace = paces.n2[ang > 0 ? 'pistol-walk-arc-left' : 'pistol-walk-arc-right']; }
    else if(aa < 2.0){ clip = ang > 0 ? K.strafeL : K.strafeR; pace = paces.n2[ang > 0 ? 'pistol-strafe' : 'pistol-strafe-mirrored']; }
    else { clip = K.back; pace = paces.n2['pistol-walk-backward']; }
    var a = play(f, 'full', clip, 0.22); a.setEffectiveTimeScale(sp / pace); stopSlot(f, 'up'); f.turn = null; f.gait = clip.name; }
  else { f.gait = null;
    if(f.style === 'kneel' && e.behavior === 'cover' && e.cover && e.pos.distanceTo(e.cover) < 0.1){ play(f, 'full', K.kneel, 0.35); stopSlot(f, 'up'); }
    else if(hidden){ play(f, 'full', K.coverIdle, 0.25); stopSlot(f, 'up'); }
    else { var yawErr = f.root.rotation.y;   /* turning in place: the legs step through the turn while the body comes round */
      if(!f.turn && Math.abs(yawErr) > 0.55){ f.turn = { clip: yawErr > 0 ? K.turnR : K.turnL, t: 0 }; C.stats.turns = (C.stats.turns || 0) + 1; }
      if(f.turn){ f.turn.t += dt; play(f, 'full', f.turn.clip, 0.2); if(f.turn.t > 0.9 || Math.abs(yawErr) < 0.08) f.turn = null; }
      else play(f, 'full', K.legsIdle, 0.3);
      play(f, 'up', K.upAim, 0.25); } }
  // the figure's own yaw: the engine snaps the actor to face the hero; the figure eases round (turn clips cover the in-place case)
  if(sp > 0.3){ f.root.rotation.y *= Math.max(0, 1 - dt * 10); } else f.root.rotation.y *= Math.max(0, 1 - dt * (f.turn ? 3.2 : 6));
  // shots / hits from the engine log (fed by main.js)
  if(f.fireQ){ f.fireQ = false; pulse(f, K.fire, 1.0); }
  if(f.hitQ){ var hl = f.hitQ; f.hitQ = null; pulse(f, hl.left ? K.hitL : K.hit, 1.0); }
  f.mixer.update(dt);
  // aim correction: twist the spine so the gun arm points at the camera (kneel / door / stand); never while walking
  if(!hidden && !f.gait && game){ f.model.updateMatrixWorld(true); var sh = f.model.getObjectByName('RightArm').getWorldPosition(new V()), ad = f.gun.localToWorld(new V(0, 0.026, 0.3)).sub(f.gun.localToWorld(new V(0, 0.026, 0))); ad.y = 0; ad.normalize();
    var to = game.camera.position.clone().sub(sh); to.y = 0; to.normalize(); var want = Math.max(-0.9, Math.min(0.9, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); f.twist += (want - f.twist) * Math.min(1, dt * 6); } else f.twist *= Math.max(0, 1 - dt * 6);
  if(Math.abs(f.twist) > 1e-3) ['Spine', 'Spine1', 'Spine2'].forEach(function(n){ var b = f.model.getObjectByName(n); if(b) b.rotateOnWorldAxis(UPV, f.twist / 3); });
  lightFig(f); };
C.onShot = function(point){ C.lastShot = point ? new V().fromArray(point) : null; };
C.onHit = function(p, partner){ var f = p && p.userData.c3; if(!f) return; var pt = !partner && C.lastShot; f.model.updateMatrixWorld(true); var rec = { left: false, head: false };
  if(pt){ var loc = f.root.worldToLocal(pt.clone()); rec.left = loc.x > 0.08; var head = f.model.getObjectByName('Head').getWorldPosition(new V()); rec.head = pt.y > head.y - 0.06; }
  f.lastHit = rec; f.hitQ = rec; C.stats.hits[rec.head ? 'head' : rec.left ? 'left' : 'front/right'] = (C.stats.hits[rec.head ? 'head' : rec.left ? 'left' : 'front/right'] || 0) + 1; };
C.onFire = function(p){ var f = p && p.userData.c3; if(f) f.fireQ = true; };
// ------------------------------------------------------------------ MAYA + COLE
var maya3 = null, cole3 = null, MC = null;
function mayaClips(){ if(MC) return MC; var A = {}; base.maya.animations.forEach(function(c){ A[c.name] = c; }); var g = function(n){ return mxClip('maya', n); }, AU = THREE.AnimationUtils;
  MC = { chair: A.Wheelchair_Push, bed: A.Bed_Push_Loop, walk: A.Walk_Fem, legsIdle: sub(g('pistol-idle'), true, 'mLegsIdle'), upAim: sub(AU.subclip(g('pistol-aim'), 'mAimHold', 0, 16, 30), false, 'mUpAim'), aimWalk: g('pistol-walk'),
    kneelAim: g('pistol-kneeling-idle'), crouch: g('cover-idle-crouched'), fire: additive(g('shooting'), 6, 33, 'mFire'), flinch: additive(g('hit-reaction'), 0, 24, 'mFlinch'), duck: additive(g('sitting-dodges') || g('hit-reaction-left'), 0, 40, 'mDuck') }; return MC; }
C.ownsFriends = function(){ return C.ready; };
C.stepMaya = function(o){ var maya = o.maya; if(!C.ready) return false; var K = mayaClips(); if(!maya3){ maya3 = C.make('maya'); maya3.blobK = 1; maya.add(maya3.root); maya3.root.visible = false; }
  var m = o.mode, seg = o.seg, show = true, f = maya3; f.gun.visible = true;
  if(m === 'RAIL_CHAIR'){ var bed = o.vehicle === 'bed', loop = bed ? K.bed : K.chair, pace = paces.maya[loop.name] || 1, sp = o.speed;
    if(o.fireT > 0){ play(f, 'full', sp > 0.05 ? loop : K.legsIdle, 0.2); play(f, 'up', K.upAim, 0.15); } else { play(f, 'full', loop, 0.3); stopSlot(f, 'up', 0.3); f.gun.visible = false; }
    f.cur.full.setEffectiveTimeScale(sp > 0.05 ? sp / pace : 0.0001); }
  else if(m === 'HOLDOUT'){ if(o.fireT > 0){ play(f, 'full', K.kneelAim, 0.2); } else play(f, 'full', K.crouch, 0.3); stopSlot(f, 'up'); }
  else if(m === 'CUTSCENE' && (seg === 'visit_room' || seg === 'steal_cut')){ play(f, 'full', K.legsIdle, 0.3); play(f, 'up', K.upAim, 0.3); }
  else if(m === 'CUTSCENE' && seg === 'transfer_cut'){ play(f, 'full', K.crouch, 0.3); stopSlot(f, 'up'); }
  else show = false;
  f.root.visible = show; hideOthers(maya, f, show); if(!show) return false;
  if(o.fireQ){ pulse(f, K.fire, 1.0); }
  // REACTIONS to nearby gunfire (INTEGRATION item 5): a round that passes within 1.6 m of her -> flinch; a red (hitting) round -> duck
  if(o.nearShot && (f.reactT || 0) <= 0){ pulse(f, o.nearShot.red ? K.duck : K.flinch, o.nearShot.red ? 0.9 : 0.75); f.reactT = 0.7; C.stats.mayaReact = C.stats.mayaReact || { flinch: 0, duck: 0 }; C.stats.mayaReact[o.nearShot.red ? 'duck' : 'flinch']++; }
  f.reactT = (f.reactT || 0) - o.dt;
  f.mixer.update(o.dt);
  if(o.aimAt && f.cur.up){ f.model.updateMatrixWorld(true); var sh = f.model.getObjectByName('RightArm').getWorldPosition(new V()), ad = f.gun.localToWorld(new V(0, 0.026, 0.3)).sub(f.gun.localToWorld(new V(0, 0.026, 0))); ad.y = 0; ad.normalize();
    var to = o.aimAt.clone().sub(sh); to.y = 0; to.normalize(); var want = Math.max(-1.3, Math.min(1.3, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); f.twist += (want - f.twist) * Math.min(1, o.dt * 8); } else f.twist *= Math.max(0, 1 - o.dt * 6);
  if(Math.abs(f.twist) > 1e-3) ['Spine', 'Spine1', 'Spine2'].forEach(function(n){ var b = f.model.getObjectByName(n); if(b) b.rotateOnWorldAxis(UPV, f.twist / 3); });
  lightFig(f); return true; };
/* while the 3D figure shows, the procedural rig + billboard are off (layer 31); when it doesn't, the procedural rig comes back
   unless the painted billboard owns the character (painted.js toggles those itself) */
function hideOthers(g, f, show){ var bb = g.userData.bb; if(show){ g.children.forEach(function(c){ if(c !== f.root) c.traverse(function(x){ x.layers.set(31); }); }); g.userData.c3hid = true; }
  else if(g.userData.c3hid && !g.userData.painted){ g.children.forEach(function(c){ if(c !== f.root && c !== bb) c.traverse(function(x){ x.layers.set(0); }); }); g.userData.c3hid = false; } }
C.bedDz = 0.7; C.bedDy = -0.15;   /* Lay_Breathless on A.bed(): measured — head end at the bed origin, mattress top ~0.15 m under the clip's authored lying height */
C.mayaMuzzle = function(out){ return maya3 && maya3.root.visible && maya3.gun.visible ? maya3.gun.localToWorld(out.set(0, 0.026, 0.145)) : null; };
var CC = null;
function coleClips(){ if(CC) return CC; var A = {}; base.cole.animations.forEach(function(c){ A[c.name] = c; }); CC = { sit: A.Sit_Idle_Breath, bed: A.Lay_Breathless, braced: A.Sit_Disbelief_Forward || A.Sit_Idle_Still }; return CC; }
/* where the painted Cole used to stand in: 'chair' (seated in the wheelchair), 'bed' (lying on the bed), 'braced' (ambulance bay floor). Returns true if shown. */
C.stepCole = function(o){ if(!C.ready) return false; var cole = o.cole, K = coleClips(); if(!cole3){ cole3 = C.make('cole'); cole3.gun.visible = false; cole3.blobK = 0.6; cole.add(cole3.root); }
  var f = cole3; hideOthers(cole, f, !!o.pose);
  if(!o.pose){ f.root.visible = false; return false; } f.root.visible = true; f.root.position.set(0, o.dy || 0, o.dz || 0); f.root.rotation.y = o.yaw || 0; f.blob.visible = o.pose !== 'bed';
  play(f, 'full', o.pose === 'bed' ? K.bed : o.pose === 'braced' ? K.braced : K.sit, 0.3); f.mixer.update(o.dt); lightFig(f); return true; };
// ------------------------------------------------------------------ BACKGROUND PATIENTS: frozen poses, merged per room (1 draw call), built once the world exists
/* bake one skinned figure at one clip frame into a plain world-space geometry (position, normal, uv) */
function bakePose(k, clip, frac, world){ if(!clip) return []; var m = cloneSkinned(base[k].scene), mx = new THREE.AnimationMixer(m), a = mx.clipAction(clip); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); mx.setTime(clip.duration * frac); m.updateMatrixWorld(true);
  var out = [], v = new V(), n = new V(), sc = TARGET_H[k] / rest[k].height;
  m.traverse(function(o){ if(!o.isSkinnedMesh || !/HighRes/.test(o.name) || /Pistol|Gauze|Blood|Strap|Gear|Ponytail|Beanie|Eye/i.test(o.material && o.material.name || '')) return; var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, cnt = P.count;
    var pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), sk = o.skeleton, bm = new THREE.Matrix4(), sm = new THREE.Matrix4(), nm = new THREE.Matrix3();
    for(var i = 0; i < cnt; i++){ v.fromBufferAttribute(P, i);   /* linear-blend skinning by hand, as three r128's shader does it */
      var ii = i; sm.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); var wsum = 0;
      for(var j = 0; j < 4; j++){ var w = comp(g.attributes.skinWeight, ii, j); if(w === 0) continue; var bi = comp(g.attributes.skinIndex, ii, j); bm.multiplyMatrices(sk.bones[bi].matrixWorld, sk.boneInverses[bi]); for(var e = 0; e < 16; e++) sm.elements[e] += bm.elements[e] * w; wsum += w; }
      sm.multiply(o.bindMatrix); v.applyMatrix4(sm).applyMatrix4(o.bindMatrixInverse).applyMatrix4(o.matrixWorld);
      nm.getNormalMatrix(sm); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      v.sub(m.position).multiplyScalar(sc); v.y -= rest[k].foot * sc; v.applyMatrix4(world); n.transformDirection(world);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; nor[i * 3] = n.x; nor[i * 3 + 1] = n.y; nor[i * 3 + 2] = n.z; if(U){ uv[i * 2] = U.getX(i); uv[i * 2 + 1] = U.getY(i); } }
    out.push({ pos: pos, nor: nor, uv: uv, map: o.material.map }); });
  mx.stopAllAction(); return out; }
function mergeParts(parts){ var n = 0; parts.forEach(function(p){ n += p.pos.length / 3; }); var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), o = 0;
  parts.forEach(function(p){ P.set(p.pos, o * 3); N.set(p.nor, o * 3); U.set(p.uv, o * 2); o += p.pos.length / 3; }); var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return g; }
/* rooms: [{ name, body: 'pa'|'pb', spots: [{ clip, frac, pos: V, yaw, dy }] }] -> ONE mesh per room (one body texture, one material = 1 draw call) */
C.buildPatients = function(scene, rooms){ if(!C.patientsReady) return null; var out = [];
  rooms.forEach(function(R){ var parts = [], k = R.body || 'pa'; R.spots.forEach(function(s){ var w = new THREE.Matrix4().compose(s.pos.clone().setY(s.pos.y + (s.dy || 0)), new Qt().setFromAxisAngle(UPV, s.yaw || 0), new V(1, 1, 1)); bakePose(k, mxClip(k, s.clip), s.frac, w).forEach(function(p){ parts.push(p); }); });
    if(!parts.length) return; var map = parts[0].map, g = mergeParts(parts), mat = new THREE.MeshStandardMaterial({ map: map, roughness: 0.8, color: 0xd8e4ea });
    if(window.HET4 && HET4.on) HET4.withArea(mat);
    var mesh = new THREE.Mesh(g, mat); mesh.name = 'patients:' + R.name; mesh.receiveShadow = true; mesh.userData.figures = R.spots.length; mesh.raycast = function(){}; scene.add(mesh); out.push(mesh); });
  C.patients = out; return out; };

/* the rooms (INTEGRATION item 4): WARD 2 · RECOVERY gets four occupied beds along its north wall (clear of Maya's on-foot route),
   the waiting room gets seated patients on its existing chair rows. Patients: one merged mesh per room. The new beds: merged per
   material (A.bed() is ~10 meshes each). Built once, as soon as the patient assets are in. Numbers -> C.roomStats. */
function mergeByMaterial(group, name){ group.updateMatrixWorld(true); var buckets = {}, out = new THREE.Group(); out.name = name;
  group.traverse(function(o){ if(!o.isMesh || !o.geometry || !o.material || Array.isArray(o.material)) return; var mt = o.material, key = [mt.type, mt.color ? mt.color.getHex() : 0, mt.map ? mt.map.uuid : '', mt.metalness, mt.roughness, mt.emissive ? mt.emissive.getHex() : 0].join('|');
    var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); (buckets[key] || (buckets[key] = { m: mt, gs: [] })).gs.push(g); });
  Object.keys(buckets).forEach(function(k){ var B = buckets[k], n = 0; B.gs.forEach(function(g){ n += g.attributes.position.count; }); var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), o = 0;
    B.gs.forEach(function(g){ P.set(g.attributes.position.array, o * 3); if(g.attributes.normal) N.set(g.attributes.normal.array, o * 3); if(g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
    var mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(U, 2)); out.add(new THREE.Mesh(mg, B.m)); });
  return out; }
C.buildRooms = function(){ if(C.roomsBuilt || !C.patientsReady || !window.HE || !HE.DATA || !window.__game) return null; var scene = __game.game.scene, A = window.HEART, W = window.HEWORLD, zones = HE.DATA.env.zones, stats = {};
  var ward = zones.filter(function(z){ return z.kind === 'ward'; })[0], wait = zones.filter(function(z){ return z.kind === 'waiting'; })[0]; if(!ward || !wait) return null; C.roomsBuilt = true;
  /* ward: beds head-to-wall (yaw PI: the bed runs from its head-end origin along local +Z = world -Z into the room) */
  var bedsG = new THREE.Group(), wy = ward.y, bedX = [53.0, 55.4, 57.8], spots = [], LAY = ['laying-sleeping', 'laying-breathless', 'laying-moaning'];
  bedX.forEach(function(x, i){ var b = A.bed(); b.position.set(x, wy, ward.max[2] - 0.35); b.rotation.y = Math.PI; bedsG.add(b);
    spots.push({ clip: LAY[i % 3], frac: 0.35 + 0.2 * i, pos: new V(x, wy, ward.max[2] - 0.35 - C.bedDz), yaw: Math.PI, dy: C.bedDy }); });
  scene.add(bedsG); var callsBefore = 0; bedsG.traverse(function(o){ if(o.isMesh) callsBefore++; }); var bedsM = mergeByMaterial(bedsG, 'ward-beds'); scene.remove(bedsG); scene.add(bedsM);
  stats.wardBeds = { beds: bedX.length, callsBefore: callsBefore, callsAfter: bedsM.children.length };
  /* waiting room: the same chair rows world.js builds (path-checked identically); every row gets 1-2 seated patients */
  var wsp = [], SIT = ['sitting-idle-still', 'sitting-idle-breathing', 'sitting-rubbing-arm', 'sitting-disbelief'], k = 0;
  for(var r = 0; r < 4; r++){ [-1, 1].forEach(function(sd){ var rx = sd < 0 ? wait.min[0] + 0.8 : 61.4, rz = -135.5 - r * 3.4; if(W.pathDist(W.data, ['g_wait'], rx + 0.9, rz) < 1.6) return;
      [(k % 2) ? 0 : 1, (k % 3) ? 3 : null].forEach(function(seat){ if(seat === null) return; wsp.push({ clip: SIT[k % 4], frac: 0.2 + 0.15 * (k % 4), pos: new V(rx + seat * 0.58, wait.y, rz + C.seatDz), yaw: 0, dy: C.seatDy }); k++; }); }); }
  var made = C.buildPatients(scene, [{ name: 'ward', body: 'pa', spots: spots }, { name: 'waiting', body: 'pb', spots: wsp }]) || [];
  made.forEach(function(m){ var t = 0, g = m.geometry; t = g.attributes.position.count / 3; stats[m.name] = { figures: m.userData.figures, drawCalls: 1, tris: Math.round(t), callsIfAnimated: m.userData.figures * 2 }; });
  C.roomStats = stats; return stats; };
C.seatDz = 0.0; C.seatDy = 0.0;
/* the rooms only draw in the segments that can see them (frustum culling alone keeps them through walls) */
var ROOM_SEGS = { 'patients:ward': /gauntlet_(cafeteria|ward_on_foot|waiting_room)/, 'ward-beds': /gauntlet_(cafeteria|ward_on_foot|waiting_room)/, 'patients:waiting': /gauntlet_(ward_on_foot|waiting_room)|entrance_holdout/ };
C.roomVis = function(seg){ if(!C.roomsBuilt || !window.__game) return; __game.game.scene.children.forEach(function(o){ var re = ROOM_SEGS[o.name]; if(re) o.visible = re.test(seg || ''); }); };
C.onPatientsReady = function(){ C.buildRooms(); };
})();
