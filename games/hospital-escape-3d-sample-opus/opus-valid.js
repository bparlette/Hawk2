/* Hospital Escape — OPUS gunmen (BAKEOFF-SHOOTER-ASSET, "best five"). Photoreal VALID bodies (MIT) prepared offline by
   tools in this folder (prep-valid.mjs: decode, strip mouth internals, skin-safe simplify to ~9k tris, 1024 JPEG), driven by the
   CC0 UAL clip library (as retargeted to the VALID rig by Neon; clips-only file), dressed AT LOAD per design:
     - garment recolour in the shader by body region (bone weights): the texture's folds stay, the colour becomes the design's
     - a pistol in the right hand, built and seated from the rest pose
     - room light from the 87 ceiling lamps (the painted cast's lamp terms), floor contact shadow
     - walk legs + aim/fire upper body layered (never stops to shoot); spine aims from the measured gun-arm direction
     - hit/LOS proxies between rest joints; skinned raycast off
   window.__OPUS_G picks the design (1..5). Driven from the engine's fixed step. Harness: __opus.showcase / walkStep / slideReport / cost. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search), GN = +(Q.get('g') || window.__OPUS_G || 1);
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, scene = G.scene, cam = G.camera, gb = G.greybox, V = THREE.Vector3, Qt = THREE.Quaternion;
var DIR = '../hospital-escape-3d-sample-opus/valid/';
function lin(h){ return new THREE.Color(h).convertSRGBToLinear(); }
// ------------------------------------------------------------------ THE FIVE (each: body, height, garments, extras)
var DESIGNS = {
  1: { name: 'Beanie bomber', body: 'g-Black_M_3_Casual.glb', h: 1.82, jacket: '#733829', pants: '#22252A', shoes: '#141517', hat: '#1C1C1C', rig: '#1F2522', bulk: 0.018 },
  2: { name: 'Hooded runner', body: 'g-White_M_2_Casual.glb', h: 1.80, jacket: '#2B2F36', pants: '#3A3F33', shoes: '#18191b', hood: true, bulk: 0.016 },
  3: { name: 'Field-jacket veteran', body: 'g-MENA_M_3_Casual.glb', h: 1.81, jacket: '#3D4434', pants: '#1E2024', shoes: '#2a2119', rig: '#1F2522', bulk: 0.02 },
  4: { name: 'Leather-jacket enforcer', body: 'g-Black_M_2_Casual.glb', h: 1.84, jacket: '#1B1A1C', pants: '#283041', shoes: '#121212', bulk: 0.014, gloss: true },
  5: { name: 'Windbreaker lookout', body: 'g-Hispanic_M_2_Casual.glb', h: 1.78, jacket: '#1F2B44', pants: '#2E3033', shoes: '#151618', hat: '#202226', bulk: 0.012 } };
var D = DESIGNS[GN] || DESIGNS[1];
var O = window.__opus = { g: GN, design: D, ready: false };
// ------------------------------------------------------------------ load
var L = new THREE.GLTFLoader(), base = null, clips = {};
function load(f){ return new Promise(function(res, rej){ L.load(DIR + f, res, undefined, rej); }); }
Promise.all([load(D.body), load('ual-clips.glb')]).then(function(r){ base = r[0]; prepBase();
  // clips: rotations only (bone translations would impose the clip-author's body proportions), plus the hip bob re-based onto THIS body's rest,
  // unit-matched (the clip's hip track is in metres, this rig in centimetres when its bob amplitude says so)
  var hipsRest = boneOf(base.scene, 'Hips').position.clone();
  r[1].animations.forEach(function(c){ var hp = null; c.tracks = c.tracks.filter(function(t){ if(t.name === 'Hips.position'){ hp = t; return true; } return /\.quaternion$/.test(t.name); });
    if(hp){ var v = hp.values, n = v.length / 3, my = 0, lo = Infinity, hi = -Infinity; for(var i = 0; i < n; i++){ my += v[i * 3 + 1]; lo = Math.min(lo, v[i * 3 + 1]); hi = Math.max(hi, v[i * 3 + 1]); } my /= n;
      var k = Math.abs(hipsRest.y) > 5 && (hi - lo) < 0.5 ? 100 : 1, x0 = v[0], z0 = v[2];
      for(var j = 0; j < n; j++){ v[j * 3] = hipsRest.x + (v[j * 3] - x0) * k; v[j * 3 + 1] = hipsRest.y + (v[j * 3 + 1] - my) * k; v[j * 3 + 2] = hipsRest.z + (v[j * 3 + 2] - z0) * k * (/Death|Hit/.test(c.name) ? 1 : 0); } }
    clips[c.name] = c; }); O.ready = true; window.__opusReady = true; }).catch(function(e){ window.__opusReady = 'fail:' + e; });
function boneOf(root, n){ var b = null; root.traverse(function(o){ if(!b && o.isBone && o.name === n) b = o; }); return b; }
function comp(a, i, k){ var v = a.array[i * a.itemSize + k]; if(a.normalized){ var A = a.array; v /= A instanceof Uint8Array ? 255 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Int16Array ? 32767 : 1; } return v; }
// ------------------------------------------------------------------ prepare the base once: regions, texture luminance per garment, rest measures
var REG = { jacket: 0, pants: 1, shoes: 2, hat: 3 }, regionAttr = null, lumRef = [0.3, 0.3, 0.3, 0.3], rest = {};
function prepBase(){ var s = base.scene; s.updateMatrixWorld(true); var body = null; s.traverse(function(o){ if(o.isSkinnedMesh && /HighRes/.test(o.name)) body = o; });
  O.body = body; var g = body.geometry, sk = body.skeleton, n = g.attributes.position.count, reg = new Float32Array(n * 4), v = new V();
  var bp = {}; sk.bones.forEach(function(b){ bp[b.name] = b.getWorldPosition(new V()); }); rest.bp = bp;
  var foot = Math.min(bp.LeftToeBase ? bp.LeftToeBase.y : bp.LeftFoot.y, bp.LeftFoot.y), crown = bp.HeadEnd ? bp.HeadEnd.y : bp.Head.y + 0.1 * (bp.Head.y - foot); rest.height = crown - foot; rest.foot = foot;
  var neckY = bp.Neck.y, hipY = bp.Hips.y, headY = bp.Head.y;
  for(var i = 0; i < n; i++){ var bi = 0, bw = -1; for(var k = 0; k < 4; k++){ var w = comp(g.attributes.skinWeight, i, k); if(w > bw){ bw = w; bi = comp(g.attributes.skinIndex, i, k); } }
    var nm = sk.bones[bi] ? sk.bones[bi].name : ''; body.boneTransform(i, v).applyMatrix4(body.matrixWorld); var r = -1;
    if(/Spine|Shoulder|Arm$|ForeArm/.test(nm)) r = REG.jacket;
    else if(nm === 'Hips') r = v.y > hipY + 0.06 * rest.height ? REG.jacket : REG.pants;
    else if(/UpLeg|Leg$/.test(nm)) r = REG.pants; else if(/Foot|Toe/.test(nm)) r = REG.shoes;
    else if(nm === 'Neck' && D.hood) r = REG.jacket;
    else if(/Head/.test(nm) && (D.hat || D.hood) && v.y > headY + 0.075 * rest.height * (D.hood ? 0.8 : 1)) r = REG.hat;
    if(r >= 0) reg[i * 4 + r] = 1; }
  regionAttr = new THREE.BufferAttribute(reg, 4);
  // mean texture luminance per region (keeps the fabric's folds when recoloured)
  var map = body.material.map, img = map && map.image; if(img){ var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 256, 256); var px = cx.getImageData(0, 0, 256, 256).data, sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0], uv = g.attributes.uv;
    for(var j = 0; j < n; j += 3){ for(var r2 = 0; r2 < 4; r2++){ if(!reg[j * 4 + r2]) continue; var x = Math.min(255, Math.max(0, Math.floor(comp(uv, j, 0) * 256))), y = Math.min(255, Math.max(0, Math.floor((map.flipY ? 1 - comp(uv, j, 1) : comp(uv, j, 1)) * 256))), o = (y * 256 + x) * 4;
      var l = Math.pow((0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255, 2.2); sum[r2] += l; cnt[r2]++; } }
    for(var r3 = 0; r3 < 4; r3++) if(cnt[r3]) lumRef[r3] = Math.max(0.02, sum[r3] / cnt[r3]); }
  O.lumRef = lumRef.map(function(x){ return +x.toFixed(3); }); }
// ------------------------------------------------------------------ skinned clone
function cloneSkinned(src){ var c = src.clone(true), by = {}; c.traverse(function(o){ if(o.isBone) by[o.name] = o; });
  c.traverse(function(o){ if(o.isSkinnedMesh){ var sk = o.skeleton; o.bind(new THREE.Skeleton(sk.bones.map(function(b){ return by[b.name]; }), sk.boneInverses.map(function(m){ return m.clone(); })), o.bindMatrix.clone()); o.material = o.material.clone(); } });
  return c; }
// ------------------------------------------------------------------ the figure material: garment recolour + bulk + room lamps
function figMat(mat){ var tgt = [D.jacket, D.pants, D.shoes, D.hat || D.jacket].map(function(h){ return h ? lin(h) : null; });
  var U = { gJ: { value: tgt[0] || new THREE.Color(1, 1, 1) }, gP: { value: tgt[1] || new THREE.Color(1, 1, 1) }, gS: { value: tgt[2] || new THREE.Color(1, 1, 1) }, gH: { value: tgt[3] || new THREE.Color(1, 1, 1) },
    gOn: { value: new THREE.Vector4(tgt[0] ? 1 : 0, tgt[1] ? 1 : 0, tgt[2] ? 1 : 0, (D.hat || D.hood) ? 1 : 0) }, lumRef: { value: new THREE.Vector4(lumRef[0], lumRef[1], lumRef[2], lumRef[3]) }, bulk: { value: D.bulk || 0 },
    lampDir: { value: new V(0, 1, 0) }, lampKey: { value: 0 }, lampAmb: { value: 0 }, lampBack: { value: 0 } };
  mat.onBeforeCompile = function(sh){ Object.keys(U).forEach(function(k){ sh.uniforms[k] = U[k]; });
    sh.vertexShader = 'attribute vec4 region; varying vec4 vRegion; uniform float bulk;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRegion = region; transformed += objectNormal * bulk * (region.x + region.w * 0.6) * 100.0;');   // jacket/hood/hat stand off the body (rig in cm)
    sh.fragmentShader = 'varying vec4 vRegion; uniform vec3 gJ, gP, gS, gH; uniform vec4 gOn, lumRef; uniform vec3 lampDir; uniform float lampKey, lampAmb, lampBack;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n { float lu = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)); vec4 w = vRegion * gOn;' +
        ' diffuseColor.rgb = mix(diffuseColor.rgb, gJ * clamp(pow(lu / lumRef.x, 0.55), 0.55, 1.35), w.x); diffuseColor.rgb = mix(diffuseColor.rgb, gP * clamp(pow(lu / lumRef.y, 0.55), 0.55, 1.35), w.y);' +
        ' diffuseColor.rgb = mix(diffuseColor.rgb, gS * clamp(pow(lu / lumRef.z, 0.55), 0.55, 1.35), w.z); diffuseColor.rgb = mix(diffuseColor.rgb, gH * clamp(lu / max(lumRef.w, 0.05), 0.5, 1.4), w.w); }')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n float lk = max(dot(normal, lampDir), 0.0); reflectedLight.directDiffuse += diffuseColor.rgb * lampKey * lk; reflectedLight.indirectDiffuse += diffuseColor.rgb * lampAmb;\n' +
        ' float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); reflectedLight.directDiffuse += vec3(0.30, 0.34, 0.38) * pow(fr, 3.0) * (0.25 + lampBack) * (0.4 + lampKey);'); };
  mat.customProgramCacheKey = function(){ return 'opusValid' + GN; }; if(D.gloss){ mat.roughness = 0.55; } mat.userData.U = U; return mat; }
var _ld = new V(), _tc = new V();
function lampTerms(fig){ var U = fig.U, Ls = (window.HEPAINT && HEPAINT.lights) || [], p = fig.root.getWorldPosition(_tc.set(0, 0, 0)), indoor = !(window.HEPAINT && HEPAINT.indoor === false), sum = 0, dx = 0, dy = 0, dz = 0;
  if(indoor) for(var i = 0; i < Ls.length; i++){ var l = Ls[i], ex = l.x - p.x, ez = l.z - p.z, ey = l.y - p.y; if(ey < 0 || ey > 4.5) continue; var d2 = ex * ex + ez * ez; if(d2 > 81) continue; var k = 1 / (1 + d2 / 4); sum += k; dx += ex * k; dy += ey * k; dz += ez * k; }
  if(!indoor){ sum = 0.6; dx = -0.4; dy = 1; dz = 0.3; } _ld.set(dx, dy, dz); if(_ld.lengthSq() < 1e-6) _ld.set(0, 1, 0); _ld.normalize();
  var back = Math.max(0, -_ld.dot(_tc.copy(cam.position).sub(p).setY(0).normalize())); _ld.transformDirection(cam.matrixWorldInverse);
  U.lampDir.value.copy(_ld); U.lampKey.value = 0.5 * Math.min(1.4, sum); U.lampAmb.value = 0.16 + 0.1 * Math.min(1.4, sum); U.lampBack.value = back; }
// ------------------------------------------------------------------ pistol: matte polymer frame + steel slide, seated in the rest-pose hand
function pistol(){ var g = new THREE.Group(), m1 = new THREE.MeshStandardMaterial({ color: 0x151618, roughness: 0.45, metalness: 0.6 }), m2 = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 });
  var box = function(w, h, d, m, x, y, z, rx){ var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if(rx) b.rotation.x = rx; g.add(b); return b; };
  box(0.03, 0.032, 0.19, m1, 0, 0.026, 0.05); box(0.028, 0.11, 0.045, m2, 0, -0.03, -0.01, -0.28); box(0.026, 0.02, 0.07, m2, 0, 0.0, 0.04); return g; }   // slide (barrel +Z), grip, trigger guard
function seatPistol(fig){ var m = fig.model, h = boneOf(m, 'RightHand'), mid = boneOf(m, 'RightHandMiddle1'), ix = boneOf(m, 'RightHandIndex1'), pk = boneOf(m, 'RightHandPinky1'); if(!h || !mid) return;
  m.updateMatrixWorld(true); var H = h.getWorldPosition(new V()), M = mid.getWorldPosition(new V()), I = ix.getWorldPosition(new V()), P = pk.getWorldPosition(new V());
  var fwd = M.clone().sub(H).normalize(), across = I.clone().sub(P).normalize(), palm = new V().crossVectors(fwd, across).normalize();   // palm normal (rest T-pose: down)
  var gp = pistol(), basis = new THREE.Matrix4().makeBasis(new V().crossVectors(palm.clone().negate(), fwd).normalize(), palm.clone().negate(), fwd);   // gun +z along the fingers, gun +y out of the back of the hand
  gp.quaternion.setFromRotationMatrix(basis); gp.position.copy(H.clone().lerp(M, 0.55).addScaledVector(palm, 0.035));   /* world metres (the root's cm->m scale is already in H, M) */ gp.updateMatrixWorld(true); h.attach(gp); fig.gun = gp; }
// ------------------------------------------------------------------ hit/LOS proxies between rest joints (bone -> child joint), in each bone's frame
var SEGS = [['Hips', 'Hips', 'Spine1', 0.15], ['Spine1', 'Spine1', 'Neck', 0.16], ['Neck', 'Neck', 'Head', 0.06], ['Head', 'Head', 'HeadEnd', 0.105],
  ['LeftShoulder', 'LeftShoulder', 'LeftArm', 0.06], ['LeftArm', 'LeftArm', 'LeftForeArm', 0.055], ['LeftForeArm', 'LeftForeArm', 'LeftHand', 0.047], ['LeftHand', 'LeftHand', 'LeftHandMiddle2', 0.045],
  ['RightShoulder', 'RightShoulder', 'RightArm', 0.06], ['RightArm', 'RightArm', 'RightForeArm', 0.055], ['RightForeArm', 'RightForeArm', 'RightHand', 0.047], ['RightHand', 'RightHand', 'RightHandMiddle2', 0.055],
  ['LeftUpLeg', 'LeftUpLeg', 'LeftLeg', 0.08], ['LeftLeg', 'LeftLeg', 'LeftFoot', 0.062], ['LeftFoot', 'LeftFoot', 'LeftToeBase_end', 0.05], ['RightUpLeg', 'RightUpLeg', 'RightLeg', 0.08], ['RightLeg', 'RightLeg', 'RightFoot', 0.062], ['RightFoot', 'RightFoot', 'RightToeBase_end', 0.05]];
function addProxies(fig){ var m = fig.model, pm = new THREE.MeshBasicMaterial({ visible: false }); fig.proxies = []; m.updateMatrixWorld(true); var k = 1;   /* radii in world metres */
  SEGS.forEach(function(d){ var b = boneOf(m, d[0]), a = boneOf(m, d[1]), e = boneOf(m, d[2]) || boneOf(m, d[2].replace('_end', '')); if(!b || !a || !e) return; var A = a.getWorldPosition(new V()), E = e.getWorldPosition(new V()); if(A.distanceTo(E) < 1e-4) return;
    var s = b.getWorldScale(new V()).x, r = d[3] * k, Ln = A.distanceTo(E) + r, mesh = new THREE.Mesh(new THREE.CylinderGeometry(r / s, r / s, Ln / s, 8), pm), la = b.worldToLocal(A.clone()), le = b.worldToLocal(E.clone());
    mesh.position.copy(la).add(le).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(new V(0, 1, 0), le.clone().sub(la).normalize()); mesh.name = 'proxy'; b.add(mesh); fig.proxies.push(mesh); });
  m.traverse(function(o){ if(o.isSkinnedMesh) o.raycast = function(){}; }); }
// ------------------------------------------------------------------ build a figure
var LOWER = /^(Hips|LeftUpLeg|LeftLeg|LeftFoot|LeftToe|RightUpLeg|RightLeg|RightFoot|RightToe)/;
function sub(c, low, name){ var x = c.clone(); x.name = name; x.tracks = x.tracks.filter(function(t){ var b = t.name.split('.')[0]; return low ? LOWER.test(b) : !LOWER.test(b); }); return x; }
O.make = function(){ var model = cloneSkinned(base.scene), root = new THREE.Group(); root.name = 'opusFig'; root.add(model); root.scale.setScalar(D.h / rest.height); model.position.y = -rest.foot;   /* VALID's origin is the hips: stand the soles on the floor */
  var fig = { root: root, model: model, mixer: new THREE.AnimationMixer(model), actions: {}, layers: { low: null, up: null }, twist: 0 };
  model.traverse(function(o){ if(o.isSkinnedMesh){ o.frustumCulled = false; if(/HighRes/.test(o.name)){ o.geometry = o.geometry.clone(); o.geometry.setAttribute('region', regionAttr); o.material = figMat(o.material); fig.U = o.material.userData.U; } } });
  var C = { LegsWalk: sub(clips.Walk_Loop, true, 'LegsWalk'), LegsIdle: sub(clips.Pistol_Idle_Loop, true, 'LegsIdle'), UpAim: sub(clips.Pistol_Aim_Neutral, false, 'UpAim'), UpFire: sub(clips.Pistol_Shoot, false, 'UpFire'),
    UpCarry: sub(clips.Pistol_Idle_Loop, false, 'UpCarry'), Death: clips.Death01, Hit: clips.Hit_Chest };
  Object.keys(C).forEach(function(n){ var a = fig.mixer.clipAction(C[n]); a.setLoop(/UpFire|Death|Hit/.test(n) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = /UpFire|Death|Hit/.test(n); fig.actions[n] = a; });
  fig.pace = O.pace; fig.spine = ['Spine', 'Spine1', 'Spine2'].map(function(n){ return boneOf(model, n); }); fig.armR = [boneOf(model, 'RightArm'), boneOf(model, 'RightHand')];
  seatPistol(fig); addProxies(fig); fig.shadow = blob(); root.add(fig.shadow); fig.shadow.scale.setScalar(1 / root.scale.x); return fig; };
function blob(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  var m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: true })); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1; m.raycast = function(){}; return m; }
function lay(f, slot, name, fade){ var cur = f.layers[slot]; if(cur === name) return; var a = f.actions[name]; a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play(); if(cur && f.actions[cur]) a.crossFadeFrom(f.actions[cur], fade, false); f.layers[slot] = name; }
function drive(f, dt, st){
  if(st.dead){ if(f.layers.low !== 'Death'){ f.mixer.stopAllAction(); f.layers = { low: 'Death', up: 'Death' }; var a = f.actions.Death; a.reset(); a.play(); } f.mixer.update(dt); lampTerms(f); return; }
  var moving = st.speed > 0.25; lay(f, 'low', moving ? 'LegsWalk' : 'LegsIdle', 0.2); if(moving) f.actions.LegsWalk.timeScale = st.speed / O.pace;
  var aiming = st.aim !== false; if(st.fire) lay(f, 'up', 'UpFire', 0.05); else if(!(f.layers.up === 'UpFire' && f.actions.UpFire.isRunning())) lay(f, 'up', aiming ? 'UpAim' : 'UpCarry', 0.25);
  f.mixer.update(dt);
  if(st.cam && aiming){ f.model.updateMatrixWorld(true); var sh = f.armR[0].getWorldPosition(new V()), ad = f.armR[1].getWorldPosition(new V()).sub(sh); ad.y = 0; ad.normalize(); var to = st.cam.clone().sub(sh); to.y = 0; to.normalize();
    var want = Math.max(-1.4, Math.min(1.4, Math.atan2(ad.z * to.x - ad.x * to.z, ad.dot(to)))); f.twist += (want - f.twist) * Math.min(1, dt * 8); } else f.twist *= Math.max(0, 1 - dt * 6);
  if(Math.abs(f.twist) > 1e-3) f.spine.forEach(function(b){ if(b) b.rotateOnWorldAxis(new V(0, 1, 0), f.twist / 3); });
  lampTerms(f); }
// ------------------------------------------------------------------ foot points (heel/toe) from the sole vertices; contact pace of the walk clip
O.footPoints = function(){ var out = {}, b = O.body, g = b.geometry, sk = b.skeleton, v = new V(); base.scene.updateMatrixWorld(true); sk.update();
  ['Left', 'Right'].forEach(function(sd){ var ids = sk.bones.map(function(x, i){ return /Foot|Toe/.test(x.name) && x.name.indexOf(sd) === 0 ? i : -1; }).filter(function(i){ return i >= 0; }), pts = [];
    for(var i = 0; i < g.attributes.position.count; i++){ var w = 0; for(var k = 0; k < 4; k++) if(ids.indexOf(comp(g.attributes.skinIndex, i, k)) >= 0) w += comp(g.attributes.skinWeight, i, k); if(w > 0.5){ pts.push(b.boneTransform(i, v.set(0, 0, 0)).applyMatrix4(b.matrixWorld).clone()); } }
    var ymin = Infinity; pts.forEach(function(p){ ymin = Math.min(ymin, p.y); }); var sole = pts.filter(function(p){ return p.y < ymin + 0.03 * rest.height; });
    var heel = sole.reduce(function(a, p){ return p.z < a.z ? p : a; }), toe = sole.reduce(function(a, p){ return p.z > a.z ? p : a; }), fb = boneOf(base.scene, sd + 'Foot');
    out[sd] = { heel: fb.worldToLocal(heel.clone()), toe: fb.worldToLocal(toe.clone()) }; });
  return out; };
function contactPace(){ var m = cloneSkinned(base.scene), mx = new THREE.AnimationMixer(m), fp = O.footPoints(), N = 240, H = [], clip = clips.Walk_Loop; mx.clipAction(clip).play();
  ['Left', 'Right'].forEach(function(sd){ var b = boneOf(m, sd + 'Foot'); ['heel', 'toe'].forEach(function(k){ H.push({ b: b, off: fp[sd][k], P: [] }); }); });
  var k = D.h / rest.height; for(var i = 0; i <= N; i++){ mx.setTime(clip.duration * i / N); m.updateMatrixWorld(true); H.forEach(function(h){ h.P.push(h.b.localToWorld(h.off.clone()).multiplyScalar(k)); }); }   /* metres */
  var v = []; H.forEach(function(h){ var ymin = Infinity; h.P.forEach(function(p){ ymin = Math.min(ymin, p.y); }); for(var i = 1; i < h.P.length; i++) if(h.P[i].y < ymin + 0.01 && h.P[i - 1].y < ymin + 0.01) v.push(-(h.P[i].z - h.P[i - 1].z) / (clip.duration / N)); });
  v.sort(function(a, b){ return a - b; }); return v.length ? v[v.length >> 1] : 1.1; }
var _ready = setInterval(function(){ if(!O.ready || O.pace) return; O.pace = contactPace(); O.paceRaw = +O.pace.toFixed(3); clearInterval(_ready); }, 50);
// ------------------------------------------------------------------ in-game: every plain gunman is this design, driven by engine state
var live = {}, logI = 0;
var _add = gb.addActor; gb.addActor = function(role, kind){ var p = _add.apply(this, arguments); if(kind === 'gunman') live[role] = { p: p, fig: null, fireT: 0, flinchT: 0 }; return p; };
var _rm = gb.removeActor; gb.removeActor = function(role){ delete live[role]; return _rm.apply(this, arguments); };
function stepLive(dt){ var Lg = G._log; for(; logI < Lg.length; logI++){ var e = Lg[logI], d = e.data, Lv = d && live[d.role]; if(!Lv) continue; if(e.type === 'enemyShot') Lv.fireT = 0.34; else if(e.type === 'hit' && d.hp > 0) Lv.flinchT = 0.3; }
  Object.keys(live).forEach(function(role){ var Lv = live[role], en = G.combat.byRole(role); if(!Lv.p.parent) return;
    if(!Lv.fig){ if(!O.ready || !O.pace) return; var f = O.make(); Lv.fig = f; Lv.p.add(f.root); Lv.p.children.forEach(function(c){ if(c !== f.root) c.traverse(function(o){ o.layers.set(31); }); }); Lv.p.userData.pk = null; Lv.p.userData.painted = false; }
    var pos = Lv.p.position, sp = Lv.last && dt > 0 ? Math.hypot(pos.x - Lv.last.x, pos.z - Lv.last.z) / dt : 0; if(sp > 0.25 && Lv.last) Lv.mv = new V(pos.x - Lv.last.x, 0, pos.z - Lv.last.z); Lv.last = (Lv.last || new V()).copy(pos);
    Lv.fireT = Math.max(0, Lv.fireT - dt); Lv.flinchT = Math.max(0, Lv.flinchT - dt); var F = Lv.fig, yaw = sp > 0.25 && Lv.mv ? Math.atan2(Lv.mv.x, Lv.mv.z) : Math.atan2(cam.position.x - pos.x, cam.position.z - pos.z);
    F.root.rotation.y = yaw - Lv.p.rotation.y; drive(F, dt, { dead: Lv.p.userData.dead || (en && !en.alive), fire: Lv.fireT > 0, speed: sp, aim: true, cam: cam.position }); }); }
var _step = G.step; G.step = function(dt){ _step.apply(G, arguments); stepLive(dt); };
// ------------------------------------------------------------------ evidence harness (same protocol as the lane entries)
O.showcase = function(o){ o = Object.assign({ beat: 'gauntlet', d0: 14.5, l0: 1.05, d1: 5.2, l1: 0.75, speed: 1.4, fireEvery: 1.6, fireFrom: 3 }, o || {}); GW.start(o.beat); GW.pause(true); G.combat.clearEnemies(); G.combat.shots = []; GW.tick();
  var c = cam.position, f = cam.getWorldDirection(new V()); f.y = 0; f.normalize(); var r = new V(-f.z, 0, f.x), y = G.rail.path.pointAtS(G.rail.s).y, a = c.clone().addScaledVector(f, o.d0).addScaledVector(r, o.l0), b = c.clone().addScaledVector(f, o.d1).addScaledVector(r, o.l1); a.y = b.y = y;
  if(O.show) scene.remove(O.show.root); var fig = O.make(); scene.add(fig.root); fig.root.position.copy(a); fig.root.lookAt(b.x, y, b.z); O.show = fig; O.walk = { a: a, b: b, s: 0, L: a.distanceTo(b), o: o, t: 0 }; return { from: a.toArray(), to: b.toArray(), len: O.walk.L }; };
var FP = null;
O.walkStep = function(dt){ var W = O.walk, f = O.show; if(!W) return null; W.dt = dt; var moving = W.s < W.L; W.s = Math.min(W.L, W.s + W.o.speed * dt); W.t += dt; f.root.position.lerpVectors(W.a, W.b, W.s / W.L);
  var fire = W.o.fireEvery && W.s > W.o.fireFrom && (W.t % W.o.fireEvery) < 0.34; drive(f, dt, { speed: moving ? W.o.speed : 0, aim: true, fire: fire, cam: cam.position }); f.root.updateMatrixWorld(true);
  FP = FP || O.footPoints(); if(!W.feet){ W.feet = {}; ['Left', 'Right'].forEach(function(sd){ var b = boneOf(f.model, sd + 'Foot'); W.feet['heel' + sd] = { b: b, off: FP[sd].heel, min: 1e9, hist: [] }; W.feet['toe' + sd] = { b: b, off: FP[sd].toe, min: 1e9, hist: [] }; }); }
  Object.keys(W.feet).forEach(function(n){ var F = W.feet[n], p = F.b.localToWorld(F.off.clone()), h = p.y - W.a.y; F.min = Math.min(F.min, h); F.hist.push([p.x, h, p.z, moving]); });
  return { s: +W.s.toFixed(3), clip: f.layers.low + '+' + f.layers.up }; };
O.slideReport = function(){ var W = O.walk, out = {}; Object.keys(W.feet).forEach(function(n){ var F = W.feet[n], H = F.hist, run = null, sl = [];
    for(var i = 1; i < H.length; i++){ var s1 = H[i], s0 = H[i - 1], v = Math.hypot(s1[0] - s0[0], s1[2] - s0[2]) / (W.dt || 1 / 30), pl = s1[3] && s1[1] < F.min + 0.01 && v < 0.6;
      if(pl){ if(!run) run = { x: s1[0], z: s1[2], n: 0, max: 0 }; else { run.n++; run.max = Math.max(run.max, Math.hypot(s1[0] - run.x, s1[2] - run.z)); } } else if(run){ if(run.n >= 3) sl.push(run.max); run = null; } }
    sl.sort(function(a, b){ return a - b; }); out[n] = { strict: { contacts: sl.length, median_cm: sl.length ? +(100 * sl[sl.length >> 1]).toFixed(1) : null, max_cm: sl.length ? +(100 * sl[sl.length - 1]).toFixed(1) : null } }; }); return out; };
O.cost = function(){ var f = O.show || O.make(), calls = 0, tris = 0; f.root.traverse(function(o){ if(o.isMesh && o.name !== 'proxy' && o.visible !== false){ calls++; var g = o.geometry; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; } }); return { calls: calls, tris: Math.round(tris) }; };
O.height = function(){ var f = O.show; if(!f) return null; var h = boneOf(f.model, 'HeadEnd') || boneOf(f.model, 'Head'); return +(h.getWorldPosition(new V()).y - O.walk.a.y).toFixed(2); };
O.mocap = null; O.boneOf = boneOf;
})();
