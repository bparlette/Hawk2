/* Mixamo (Y Bot rig) -> VALID rig retarget, run offline in a page with three r128 + GLTFLoader + GLTFExporter (see run.cjs).
   args: { dir: converted GLB folder, body: VALID glb, clips: [names], inplace: [names], out: path }
   Per frame (the clip's own 30 fps keys):
   1. sample the source: world rotation of every bone shared by name, world positions of hips / thigh / ankle / toe
   2. every shared bone: targetWorld = srcWorld * inverse(srcRestWorld) * tgtRestWorld   (both rests are +Z-facing T-poses, +X = left)
      written back as local = inverse(parentWorld) * targetWorld, parents first
   3. hips translation = tgtHipsRest + (srcHips - srcHipsRest) * s, s = target leg / source leg (also converts m -> cm)
      in-place clips: the straight-line travel (end - start) * t / T is removed; sway, bob and turn stay
   4. foot-lock: the ankle goal = target thigh joint + (srcAnkle - srcThigh) * s, two-bone IK (law of cosines, knee pole = current knee),
      then the source foot world rotation re-applied — the source's planted feet stay planted on the new proportions
   5. ground pass: pass 1 measures the lowest toe/ankle point (locomotion: over the cycle; everything else: in the first frame, which stands
      or sits on the floor; the laying clips: none, they are authored on a bed), pass 2 shifts the hips so it meets the rest sole height
   Measured per clip: loop error, root-motion speed on the VALID body, stance-phase foot speed (in-place clips). */
var V = THREE.Vector3, Qt = THREE.Quaternion;
var body = await ld(args.body), rig = body.scene; var rb = {}, ord = []; rig.traverse(function(o){ if(o.isBone){ rb[o.name] = o; ord.push(o); } }); rig.updateMatrixWorld(true);
var restP = {}, restQ = {}, tRestW = {}; ord.forEach(function(b){ restP[b.name] = b.position.clone(); restQ[b.name] = b.quaternion.clone(); tRestW[b.name] = b.getWorldQuaternion(new Qt()); });
function W(n){ return rb[n].getWorldPosition(new V()); }
var lenA = { L: W('LeftUpLeg').distanceTo(W('LeftLeg')), R: W('RightUpLeg').distanceTo(W('RightLeg')) }, lenB = { L: W('LeftLeg').distanceTo(W('LeftFoot')), R: W('RightLeg').distanceTo(W('RightFoot')) };
var hipsRestW = W('Hips'), restSole = Math.min(W('LeftToeBase').y, W('LeftFoot').y, W('RightToeBase').y, W('RightFoot').y);
function swing(b, c, d){ var q = new Qt().setFromUnitVectors(c.clone().normalize(), d.clone().normalize()), w = b.getWorldQuaternion(new Qt()).premultiply(q); b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new Qt()).invert().multiply(w)); b.updateMatrixWorld(true); }
function setW(b, w){ b.parent.updateWorldMatrix(true, false); b.quaternion.copy(b.parent.getWorldQuaternion(new Qt()).invert().multiply(w)); b.updateMatrixWorld(true); }
var outClips = [], report = {};
for(var ci = 0; ci < args.clips.length; ci++){ var name = args.clips[ci], g = await ld(args.dir + '/' + name + '.glb'), src = g.scene, clip = g.animations[0];
  var S = {}; src.traverse(function(o){ if(o.name) S[o.name] = o; }); src.updateMatrixWorld(true);
  var shared = ord.filter(function(b){ return S[b.name] && S[b.name] !== src; }).map(function(b){ return b.name; });
  var sRest = {}; shared.forEach(function(n){ sRest[n] = S[n].getWorldQuaternion(new Qt()); }); var sHipsRest = S.Hips.getWorldPosition(new V());
  var legS = S.LeftUpLeg.getWorldPosition(new V()).distanceTo(S.LeftLeg.getWorldPosition(new V())) + S.LeftLeg.getWorldPosition(new V()).distanceTo(S.LeftFoot.getWorldPosition(new V())), s = (lenA.L + lenB.L) / legS;
  var mx = new THREE.AnimationMixer(src), act = mx.clipAction(clip); act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.play();   /* LoopOnce: at t = duration a repeating action wraps to 0 */ var times = clip.tracks[0].times, N = times.length, frames = [];
  for(var i = 0; i < N; i++){ mx.setTime(times[i]); src.updateMatrixWorld(true); var f = { q: {} }; shared.forEach(function(n){ f.q[n] = S[n].getWorldQuaternion(new Qt()); });
    ['Hips', 'LeftUpLeg', 'RightUpLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].forEach(function(n){ f[n] = S[n].getWorldPosition(new V()); }); frames.push(f); }
  var inplace = args.inplace.indexOf(name) >= 0, T = times[N - 1] - times[0], travel = frames[N - 1].Hips.clone().sub(frames[0].Hips); travel.y = 0;
  var loopErr = 0; shared.forEach(function(n){ loopErr += 1 - Math.abs(frames[0].q[n].dot(frames[N - 1].q[n])); });
  var ground = 0, res = null;
  for(var pass = 0; pass < 2; pass++){ var qT = {}, hp = [], soleMin = Infinity, soleFirst = Infinity, feet = []; shared.forEach(function(n){ qT[n] = []; });
    for(var k = 0; k < N; k++){ var f = frames[k]; ord.forEach(function(b){ b.position.copy(restP[b.name]); b.quaternion.copy(restQ[b.name]); }); rig.updateMatrixWorld(true);
      var off = f.Hips.clone().sub(sHipsRest); if(inplace) off.sub(travel.clone().multiplyScalar((times[k] - times[0]) / T));
      var hw = hipsRestW.clone().add(off.multiplyScalar(s)); hw.y -= ground; rb.Hips.parent.updateWorldMatrix(true, false); rb.Hips.position.copy(rb.Hips.parent.worldToLocal(hw)); rb.Hips.updateMatrixWorld(true);
      ord.forEach(function(b){ if(!f.q[b.name]) return; setW(b, f.q[b.name].clone().multiply(sRest[b.name].clone().invert()).multiply(tRestW[b.name])); });
      [['L', 'Left'], ['R', 'Right']].forEach(function(sd){ var th = rb[sd[1] + 'UpLeg'], sh = rb[sd[1] + 'Leg'], ft = rb[sd[1] + 'Foot'], H = th.getWorldPosition(new V());
        var A = H.clone().add(f[sd[1] + 'Foot'].clone().sub(f[sd[1] + 'UpLeg']).multiplyScalar(s)), K0 = sh.getWorldPosition(new V()), a = lenA[sd[0]], bl = lenB[sd[0]];
        var dv = A.clone().sub(H), d = Math.max(1e-4, Math.min(dv.length(), (a + bl) * 0.999)), u = dv.normalize(); A = H.clone().addScaledVector(u, d);
        var x = (a * a - bl * bl + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x)), pole = K0.clone().sub(H); pole.addScaledVector(u, -pole.dot(u)); if(pole.lengthSq() < 1e-10) pole.set(0, 0, 1); pole.normalize();
        var K = H.clone().addScaledVector(u, x).addScaledVector(pole, hh); swing(th, K0.clone().sub(H), K.clone().sub(H)); swing(sh, ft.getWorldPosition(new V()).sub(K), A.clone().sub(K));
        setW(ft, f.q[sd[1] + 'Foot'].clone().multiply(sRest[sd[1] + 'Foot'].clone().invert()).multiply(tRestW[sd[1] + 'Foot']));
        rb[sd[1] + 'ToeBase'].updateMatrixWorld(true); var ap = ft.getWorldPosition(new V()), tp = rb[sd[1] + 'ToeBase'].getWorldPosition(new V()); soleMin = Math.min(soleMin, ap.y, tp.y); if(k === 0) soleFirst = Math.min(soleFirst, ap.y, tp.y); feet.push([sd[0], k, ap, tp]); });
      shared.forEach(function(n){ var q = rb[n].quaternion; qT[n].push(q.x, q.y, q.z, q.w); }); var hpp = rb.Hips.position; hp.push(hpp.x, hpp.y, hpp.z); }
    if(pass === 0){ ground = inplace ? soleMin - restSole : soleFirst - restSole; if(/^laying/.test(name)) ground = 0; continue; }
    var tt = Array.prototype.map.call(times, function(t){ return t - times[0]; }), tracks = [new THREE.VectorKeyframeTrack('Hips.position', tt, hp)];
    shared.forEach(function(n){ tracks.push(new THREE.QuaternionKeyframeTrack(n + '.quaternion', tt, qT[n])); }); res = new THREE.AnimationClip(name, T, tracks);
    // stance-phase foot speed (in-place clips): a point is in contact while within 1 cm (of the body's scale: 0.55% of leg) of its own lowest height
    var r = { frames: N, dur_s: +T.toFixed(3), loopErr: +loopErr.toFixed(4), scale: +s.toFixed(2), rootSpeed_src_ms: +(travel.length() / T).toFixed(3), rootSpeed_model: +(travel.length() * s / T).toFixed(2), ground_cm: +ground.toFixed(2) };
    if(inplace){ var dir = travel.clone().normalize(), v = []; ['L', 'R'].forEach(function(sd){ [2, 3].forEach(function(pi){ var P = feet.filter(function(e){ return e[0] === sd; }).map(function(e){ return e[pi]; }), lo = Infinity; P.forEach(function(p){ lo = Math.min(lo, p.y); });
        for(var j = 1; j < P.length; j++) if(P[j].y < lo + 1.0 && P[j - 1].y < lo + 1.0) v.push(-P[j].clone().sub(P[j - 1]).dot(dir) / (times[1] - times[0])); }); });
      v.sort(function(a, b){ return a - b; }); r.stanceSamples = v.length; r.stanceSpeed_model = v.length ? +v[v.length >> 1].toFixed(2) : null; r.travelDir = dir.toArray().map(function(x){ return +x.toFixed(2); }); }
    report[name] = r; }
  outClips.push(res); }
// export: the bare VALID skeleton (no mesh) + every clip, binary glTF
ord.forEach(function(b){ b.position.copy(restP[b.name]); b.quaternion.copy(restQ[b.name]); }); var skel = new THREE.Group(); var rootBone = rb.Hips; while(rootBone.parent && rootBone.parent.isBone) rootBone = rootBone.parent;
var holder = rootBone.parent; var meshes = []; rig.traverse(function(o){ if(o.isMesh) meshes.push(o); }); meshes.forEach(function(m){ m.parent.remove(m); });
var glb = await new Promise(function(res){ new THREE.GLTFExporter().parse(rig, res, { binary: true, animations: outClips, onlyVisible: false }); });
var u8 = new Uint8Array(glb), bin = ''; for(var i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
var files = {}; files[args.out] = btoa(bin); return { legT: +(lenA.L + lenB.L).toFixed(2), report: report, bytes: u8.length, __files: files };
