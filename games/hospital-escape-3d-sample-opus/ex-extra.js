/* OPUS bake-off — per-example builders that extend opus-cast.js (loaded after it).
   Example 2: CMU motion-capture walk retargeted onto C's skeleton (rest-delta retarget, in-place, measured pacing).
   Example 3: the gunman's own SHAPE — the same body re-proportioned in the bind pose (stocky, 1.82 m, heavy bomber shoulders).
   Example 4: combat locomotion — upper body aims while the legs walk (per-bone layer), spine turns to the target, fire overlays.
   Example 5: the combination — 2's mocap legs + 3's shape + 4's aim layer + 1's reskin/light/proxies. */
(function(){
'use strict';
var O = window.__opus; if(!O) return; var V = THREE.Vector3, Qt = THREE.Quaternion;

// ------------------------------------------------------------------ MOCAP RETARGET (CMU BVH -> C skeleton), computed at load, no tools
// Both rests are T-poses facing +Z with +X on the character's left (CMU 2010 frame 0; C bind), so a world-space REST DELTA retarget
// transfers rotation including twist: q_tgt_world(t) = [q_src_world(t) * q_src_world(0)^-1] * q_tgt_world_rest.
var MAP = { Hips: 'Hips', LowerBack: 'Abdomen', Spine: 'Torso', Spine1: 'Chest', Neck: 'Neck', Head: 'Head',
  LeftShoulder: 'ShoulderL', LeftArm: 'UpperArmL', LeftForeArm: 'LowerArmL', LeftHand: 'WristL', RightShoulder: 'ShoulderR', RightArm: 'UpperArmR', RightForeArm: 'LowerArmR', RightHand: 'WristR',
  LeftUpLeg: 'UpperLegL', LeftLeg: 'LowerLegL', LeftFoot: 'FootL', RightUpLeg: 'UpperLegR', RightLeg: 'LowerLegR', RightFoot: 'FootR' };
function loadText(url){ return fetch(url).then(function(r){ if(!r.ok) throw new Error(url + ' ' + r.status); return r.text(); }); }
O.retarget = function(bvhText, opt){ opt = opt || {}; var res = new THREE.BVHLoader().parse(bvhText), sk = res.skeleton, clip = res.clip, root = sk.bones[0];
  var holder = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()); holder.add(root); holder.bind(sk);   // BVH tracks bind as .bones[Name]: they need a skinned mesh
  var mixer = new THREE.AnimationMixer(holder); mixer.clipAction(clip).play(); var src = {}; sk.bones.forEach(function(b){ src[b.name] = b; });
  var fps = 1 / (clip.tracks[0].times[1] - clip.tracks[0].times[0]), N = Math.floor(clip.duration * fps);
  function sample(t){ mixer.setTime(t); holder.updateMatrixWorld(true); var o = {}; Object.keys(MAP).forEach(function(n){ var b = src[n]; if(b) o[n] = b.getWorldQuaternion(new Qt()); });
    o.hip = src.Hips.getWorldPosition(new V()); o.lf = src.LeftFoot.getWorldPosition(new V()); o.rf = src.RightFoot.getWorldPosition(new V()); o.lh = src.LeftUpLeg.getWorldPosition(new V()); o.rh = src.RightUpLeg.getWorldPosition(new V()); return o; }
  var rest = sample(0), legSrc = src.LeftLeg.position.length() + src.LeftFoot.position.length();
  // target rest (model space): world quats of every bone at its rest local rotation
  var T = O.base.scene, tb = {}, order = []; T.traverse(function(o){ if(o.isBone){ tb[o.name] = o; order.push(o); } }); T.updateMatrixWorld(true);
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
  var rig = O.cloneSkinned(T), rb = {}, rord = []; rig.traverse(function(o){ if(o.isBone){ rb[o.name] = o; rord.push(o); } }); rig.updateMatrixWorld(true);
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

// pacing by the FOOT-CONTACT method on the retargeted clip itself: in-place, a planted foot sweeps backward at exactly the walk speed
O.contactPace = function(clip){ var m = O.cloneSkinned(O.base.scene), mx = new THREE.AnimationMixer(m), fp = O.footPoints(); mx.clipAction(clip).play(); var N = 240, H = [];
  ['L', 'R'].forEach(function(sd){ var b = O.boneOf(m, 'Foot' + sd); ['heel', 'toe'].forEach(function(k){ H.push({ b: b, off: fp[sd][k], P: [] }); }); });
  for(var i = 0; i <= N; i++){ mx.setTime(clip.duration * i / N); m.updateMatrixWorld(true); H.forEach(function(h){ h.P.push(h.b.localToWorld(h.off.clone())); }); }
  var v = []; H.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); }); for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.02 && h.P[i - 1].y < ymin + 0.02) v.push(-(h.P[i].z - h.P[i - 1].z) / (clip.duration / N)); });
  v.sort(function(a, b){ return a - b; }); return v.length ? v[v.length >> 1] * (1.77 / 1.81) : null; };   // stance-phase (heel/toe on the floor) backward sweep = walk speed; world m/s
// ------------------------------------------------------------------ prep: retarget at load for the examples that use it
var mocap = null;
O.prep = function(base, done){ var needs = O.ex === 2 || O.ex === 5; if(!needs) return done();
  var file = O.ver <= 1 && O.ex === 2 ? '16_15' : '35_02';
  loadText('../hospital-escape-3d-sample-opus/mocap/' + file + '.bvh').then(function(t){ var opt = O.ex === 2 && O.ver <= 1 ? { sway: 1 } : O.ex === 2 && O.ver === 2 ? { sway: 0.6 } : O.ex === 2 && O.ver === 3 ? { sway: 0.6, footLock: true } : { sway: 1, footLock: true };   /* trail: v1 root-speed pacing, v2 contact pacing, v3 foot-locked IK (sway 0.6 drifted the planted foot 8 cm sideways), v4 full sway */
    var clip = O.retarget(t, opt), cp = O.contactPace(clip), rs = clip.userData.rootSpeedSrc_mps * (1.77 / 1.81), pace = (O.ex === 2 && O.ver <= 1) || (opt.footLock && new URLSearchParams(location.search).get('pace') !== 'contact') ? rs : cp;   /* foot-locked: the planted ankle copies the actor's world-static ankle, so root speed x leg ratio IS the contact speed (verified by the slide meter) */
    mocap = { clip: clip, pace: pace, file: file }; O.mocap = { file: file, meta: clip.userData, pace_mps: +pace.toFixed(3), contactEstimate_mps: +cp.toFixed(3), rootSpeedScaled_mps: +rs.toFixed(3), footLock: !!opt.footLock }; done(); })
    .catch(function(e){ window.__opusReady = 'fail:' + e; }); };

// ------------------------------------------------------------------ spec table = the iteration trail of each example
O.SPEC = function(ex, ver){ var full = { kind: 'c', merge: true, lamp: true, proxies: true, rules: O.rulesGunman };
  if(ex === 2) return Object.assign({}, full, { kind: 'mocap' });
  if(ex === 4) return Object.assign({}, full, { kind: 'combat', legs: 'c' });
  if(ex === 5) return Object.assign({}, full, { kind: 'combat', legs: 'mocap', height: 1.82, rules: O.rulesShape({ girth: 0.032, belly: 0.025, shoulders: 0.03, shoulderWidth: 0.022, neck: 0.018, forearm: 0.008, thigh: 0.012 }) });
  // ex3 trail: v1 first shape row; v2 tuned against the spec (stocky 1.82 m, heavy bomber shoulders, thick neck — the beanie silhouette)
  if(ex === 3) return Object.assign({}, full, { height: 1.82, rules: O.rulesShape(ver <= 1 ? { girth: 0.05, shoulders: 0.05, shoulderWidth: 0.03, neck: 0.02 } :
    { girth: 0.032, belly: 0.025, shoulders: 0.03, shoulderWidth: 0.022, neck: 0.018, forearm: 0.008, thigh: 0.012 }) });
  return null; };
O.mocapClip = function(){ return mocap.clip; }; O.mocapPace = function(){ return mocap.pace; };
O.BUILD.mocap = function(opt){ var clips = Object.assign({}, O.base.clips, { Walk: mocap.clip }), f = O.BUILD.c(Object.assign({}, opt, { clips: clips }));
  f.pace = { Walk: mocap.pace, Run: O.PACE.Run }; return f; };
})();
// ------------------------------------------------------------------ EXAMPLE 4 (and 5): COMBAT LOCOMOTION — split the skeleton, layer clips
(function(){ var O = window.__opus, V = THREE.Vector3, Qt = THREE.Quaternion;
var LOWER = /^(Root|Body|Hips|UpperLeg|LowerLeg|Foot|PT)/;   // legs + pelvis + the IK-baked feet
function sub(clip, keepLower, name){ var c = clip.clone(); c.name = name; c.tracks = c.tracks.filter(function(t){ var b = t.name.split('.')[0]; return keepLower ? LOWER.test(b) : !LOWER.test(b); }); return c; }
O.BUILD.combat = function(opt){ var legsSrc = opt.legs === 'mocap' ? O.mocapClip() : O.base.clips.Walk, C = O.base.clips;
  var clips = { LegsWalk: sub(legsSrc, true, 'LegsWalk'), LegsIdle: sub(C.Idle_Gun, true, 'LegsIdle'), UpAim: sub(C.Idle_Gun_Pointing, false, 'UpAim'), UpFire: sub(C.Gun_Shoot, false, 'UpFire'),
    UpCarry: sub(legsSrc, false, 'UpCarry'), Death: C.Death, HitRecieve: C.HitRecieve };
  var f = O.BUILD.c(Object.assign({}, opt, { clips: clips })); f.pace = { Walk: opt.legs === 'mocap' ? O.mocapPace() : O.PACE.Walk };
  f.spine = ['Abdomen', 'Torso', 'Chest'].map(function(n){ return O.boneOf(f.model, n); }); f.armR = [O.boneOf(f.model, 'UpperArmR'), O.boneOf(f.model, 'WristR')]; f.twist = 0; f.layers = { low: null, up: null };
  ['LegsWalk', 'LegsIdle', 'UpAim', 'UpFire', 'UpCarry'].forEach(function(n){ var a = f.actions[n]; a.setLoop(n === 'UpFire' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = n === 'UpFire'; });
  function lay(slot, name, fade){ var cur = f.layers[slot]; if(cur === name) return; var a = f.actions[name]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if(cur) a.crossFadeFrom(f.actions[cur], fade, false); f.layers[slot] = name; }
  f.drive = function(fig, dt, st){
    if(st.dead){ if(fig.layers.low !== 'Death'){ fig.mixer.stopAllAction(); fig.layers = { low: 'Death', up: 'Death' }; O.play(fig, 'Death', 0.1, true); } fig.mixer.update(dt); O.lampTerms(fig); return; }
    var moving = st.speed > 0.25; lay('low', moving ? 'LegsWalk' : 'LegsIdle', 0.2); if(moving) fig.actions.LegsWalk.timeScale = st.speed / fig.pace.Walk;
    var aiming = st.aim || st.aimWalk; if(st.fire){ lay('up', 'UpFire', 0.05); } else if(fig.layers.up === 'UpFire' && fig.actions.UpFire.time < fig.actions.UpFire.getClip().duration * 0.95){ }
    else lay('up', aiming ? 'UpAim' : (moving ? 'UpCarry' : 'UpAim'), 0.25);
    if(fig.layers.up === 'UpCarry') fig.actions.UpCarry.timeScale = fig.actions.LegsWalk.timeScale;
    fig.mixer.update(dt);
    // spine twist toward the target (camera): yaw split over three spine bones, clamped +-60 deg, eased
    if(st.cam && aiming){   // aim error measured on the GUN ARM as the clip posed it (C's pointing stance is bladed ~70 deg off the hips), then spent on the spine
      fig.model.updateMatrixWorld(true); var sh = fig.armR[0].getWorldPosition(new V()), wr = fig.armR[1].getWorldPosition(new V()), ad = wr.sub(sh); ad.y = 0; ad.normalize(); var to = st.cam.clone().sub(sh); to.y = 0; to.normalize();
      var want = Math.max(-1.4, Math.min(1.4, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); fig.twist += (want - fig.twist) * Math.min(1, dt * 8); }
    else fig.twist += (0 - fig.twist) * Math.min(1, dt * 6);
    if(Math.abs(fig.twist) > 1e-3) fig.spine.forEach(function(b){ if(b) b.rotateOnWorldAxis(new V(0, 1, 0), fig.twist / 3); });
    O.lampTerms(fig); };
  return f; };
})();
