/* Hospital Escape — the shipped game: engine (../engine) + Level 1 data + art/world, presentation, HUD, input, audio.
   Everything the player sees is driven by engine state + the engine's event log (shots, hits, kills, red shots,
   pursuer outcomes, train). Contract v1 / he-dbg-1 untouched; additions are listed in tasking/responses/opus-full.md. */
(function(){
'use strict';
var A = window.HEART, W = window.HEWORLD, V = THREE.Vector3, Q = new URLSearchParams(location.search), HC = window.HECAST || null;   /* INTEGRATION: the 3D cast (game/cast3d.js); null = painted cast */
var $ = function(id){ return document.getElementById(id); };
// ------------------------------------------------------------------ engine + world
var game = HE.install(HE.createGame({ seed: +Q.get('seed') || 1 })), scene = game.scene, camera = game.camera, inp = game.input;
scene.children.filter(function(o){ return o.isLight; }).forEach(function(l){ scene.remove(l); });
var hemi = new THREE.HemisphereLight(0xf2f7ff, 0x6b665c, 0.95), sun = new THREE.DirectionalLight(0xffffff, 0.45); sun.position.set(20, 40, 10); scene.add(hemi); scene.add(sun); scene.add(sun.target);
var flashLight = new THREE.PointLight(0xffd59a, 0, 7, 2); scene.add(flashLight);
var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * (Q.get('post') === '0' ? 1 : 0.7));   // patient-eyes: composite no longer runs at full res
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;   /* HDR scene target; ACES + sRGB happen in the post composite */ $('game').appendChild(renderer.domElement);
function resize(){ renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); } addEventListener('resize', resize); resize();
var worldRoot = W.build(scene, HE.DATA);
if(window.HEENCLOSE) HEENCLOSE.close(scene, worldRoot, HE.DATA, A);   // CAMERA-FIX: seal the holes from any room into the void (game/enclose.js)
// CAMERA-FIX: the camera never enters geometry. Called by the engine INSIDE camera placement (so the reticle ray uses exactly this camera):
// a ray from the pivot (the rider / Maya at eye height, always in open space) to the wanted camera position; if the world is in the way,
// the camera comes in to 0.25 m short of it (the near plane is 0.05 m, so no wall can fill the lens).
var camRay = new THREE.Raycaster(), _cd = new V(), _pd = new V(); game.camStats = { checks: 0, pulls: 0, maxPull: 0 };
/* the collision world: a double-sided proxy of every static world mesh (built once, on first use, after the T4 pass + enclosure), plus the live
   door groups (they swing) — single-sided furniture must stop the lens from behind too */
var camWorld = null, CAM_MAT = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
function buildCamWorld(){ camWorld = []; worldRoot.updateMatrixWorld(true); var doorSet = new Set(); W.doors.forEach(function(d){ [d.group, d.hinge].forEach(function(q){ if(q && q.isObject3D) q.traverse(function(o){ doorSet.add(o); }); }); });
  worldRoot.traverse(function(o){ if(!o.isMesh || doorSet.has(o) || !o.visible || (o.material && (o.material.transparent || o.material.opacity < 0.9))) return; var m = new THREE.Mesh(o.geometry, CAM_MAT); m.matrixAutoUpdate = false; m.matrixWorld.copy(o.matrixWorld); camWorld.push(m); });
  W.doors.forEach(function(d){ [d.group, d.hinge].forEach(function(q){ if(q && q.isObject3D) camWorld.push(q); }); }); game.camStats.meshes = camWorld.length; }
// CAMERA-FIX: Maya on foot has a body. Her move (prev -> next) is swept at knee and chest height with a 0.35 m radius against the collision
// world; she stops short of a wall and slides along it (one slide), so neither she nor the camera pivot can enter geometry.
var _fm = new V(), _fn = new V(), _fo = new V();
function sweep(from, move, out){ var L = move.length(); if(L < 1e-5) return null; _fm.copy(move).divideScalar(L); var best = null;
  [0.45, 1.25].forEach(function(hy){ _fo.copy(from); _fo.y += hy; camRay.set(_fo, _fm); camRay.near = 0; camRay.far = L + 0.35; var hs = camRay.intersectObjects(camWorld, true);
    for(var i = 0; i < hs.length; i++){ var o = hs[i].object; if(o.material && o.material.transparent && o.material !== CAM_MAT) continue; if(!best || hs[i].distance < best.distance) best = hs[i]; break; } });
  return best; }
game.footCollide = function(prev, next){ if(!camWorld) buildCamWorld(); var mv = next.clone().sub(prev); mv.y = 0; var h = sweep(prev, mv);
  if(!h){ return next; } game.camStats.footStops = (game.camStats.footStops || 0) + 1; var L = mv.length(), go = Math.max(0, h.distance - 0.35);
  _fn.copy(h.face ? h.face.normal : new V(-mv.x, 0, -mv.z)).transformDirection(h.object.matrixWorld); _fn.y = 0; if(_fn.lengthSq() < 1e-6) _fn.set(-mv.x, 0, -mv.z); _fn.normalize(); if(_fn.dot(mv) > 0) _fn.negate();
  var p = prev.clone().addScaledVector(mv, go / L), rest = mv.clone().multiplyScalar(1 - go / L); rest.addScaledVector(_fn, -rest.dot(_fn));   /* slide along the wall */
  if(rest.lengthSq() > 1e-8 && !sweep(p, rest)) p.add(rest); next.x = p.x; next.z = p.z; return next; };
game.cameraCollide = function(cam, pivot){ game.camStats.checks++; if(!camWorld) buildCamWorld(); var _before = cam.position.clone();
  // 1) 0.3 m of air around the lens: 8 short horizontal probes; a wall closer than that pushes the camera off it
  for(var k = 0; k < 8; k++){ var a = k * Math.PI / 4; _pd.set(Math.sin(a), 0, Math.cos(a)); camRay.set(cam.position, _pd); camRay.near = 0; camRay.far = 0.3; var hh = camRay.intersectObjects(camWorld, true);
    for(var j = 0; j < hh.length; j++){ var oo = hh[j].object; if(!oo.visible || (oo.material && (oo.material.transparent || oo.material.opacity < 0.9))) continue; cam.position.addScaledVector(_pd, -(0.3 - hh[j].distance)); game.camStats.pushes = (game.camStats.pushes || 0) + 1; break; } }
  // 2) LAST: nothing solid between the pivot (open space by construction) and the lens — pulled in to 0.25 m short of the first hit
  _cd.subVectors(cam.position, pivot); var L = _cd.length(); if(L < 1e-3) return; _cd.divideScalar(L);
  camRay.set(pivot, _cd); camRay.near = 0; camRay.far = L + 0.25; var hits = camRay.intersectObjects(camWorld, true);
  for(var i = 0; i < hits.length; i++){ var o = hits[i].object; if(!o.visible || (o.material && (o.material.transparent || o.material.opacity < 0.9))) continue;
    var d = Math.max(0.05, hits[i].distance - 0.25); if(d < L){ cam.position.copy(pivot).addScaledVector(_cd, d); game.camStats.pulls++; game.camStats.maxPull = Math.max(game.camStats.maxPull, +(L - d).toFixed(2)); } break; }
  game.camStats.last = { pivot: pivot.toArray(), before: _before.toArray(), after: cam.position.toArray(), n: hits.length }; };
var post = window.HEPOST ? HEPOST.create(renderer, scene, camera) : null; window.__post = post; window.__renderer = renderer;
scene.traverse(function(o){ if(o.material && o.material.map === A.tex.lightPanel){ o.material.color.setRGB(3.2, 3.3, 3.5); } });   // HDR ceiling panels -> bloom
var T4 = window.HET4 && HET4.on ? HET4 : null;   /* T4-FULL-PORT: Neon's Take 4 look over the whole game (game/t4look.js); ?t4=0 = the previous look */
if(T4){ T4.apply({ renderer: renderer, scene: scene, root: worldRoot, A: A }); if(post) post.u.t4.value = 1; }
var sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: {},
  vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  uniforms: { time: { value: 0 }, flash: { value: 0 } },
  fragmentShader: 'uniform float time, flash; varying vec3 vp; float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); } float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }'
    + ' float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.1; a *= 0.5; } return s; }'
    + ' void main(){ vec3 d = normalize(vp); float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(vec3(0.42,0.46,0.52), vec3(0.06,0.10,0.17), pow(h, 0.5));'
    + ' vec2 uv = d.xz / max(0.08, d.y) * 0.6 + vec2(time * 0.01, 0.0); float cl = fbm(uv * 1.4); c = mix(c, vec3(0.12,0.15,0.2) + flash * vec3(0.9,0.95,1.1), smoothstep(0.35, 0.8, cl) * smoothstep(0.0, 0.25, d.y));'
    + ' c += vec3(0.55,0.32,0.18) * pow(1.0 - h, 6.0) * 0.6; c = mix(c, vec3(0.08,0.08,0.1), clamp(-d.y * 4.0, 0.0, 1.0)); gl_FragColor = vec4(c * 0.55, 1.0); }' }));
scene.add(sky);
// ------------------------------------------------------------------ cast + vehicles (bound to engine roles)
var cole = A.cast.cole(), maya = A.cast.maya(), hale = A.cast.hale(); [cole, maya, hale].forEach(function(p){ scene.add(p); });
HE.bindActor('hero', cole); HE.bindActor('friend', maya);
var bed = A.bed(), chair = A.wheelchair(), amb = A.ambulance(); scene.add(bed); scene.add(chair); scene.add(amb);
window.__heProps = { bed: bed, chair: chair, amb: amb, cole: cole, maya: maya };   // verification readout (INTEGRATION)
// the painted cast (OPUS-INTEGRATE-PAINTED): billboards from assets/painted; the procedural people stay as the fallback
var PT = window.HEPAINT || null, PS = window.HEPAINTED_DATA ? HEPAINTED_DATA.scale : 341.6, paintLight = new THREE.PointLight(0xffa042, 0, 3.5, 2), paintLightT = 0; scene.add(paintLight);
if(PT){ PT.lightAt = function(pos, col){ [flashLight, paintLight].forEach(function(L){ if(L.intensity <= 0) return; var k = L.intensity * Math.pow(Math.max(0, 1 - L.position.distanceTo(pos) / (L.distance * 1.6)), 2) * 0.22; col.r += 1.0 * k; col.g += 0.6 * k; col.b += 0.28 * k; }); }; }   // warm muzzle spill on the painted cast
if(PT){ PT.collectLights(scene, A.tex.lightPanel); }
if(PT && Q.get('painted') !== '0'){ [cole, maya, hale].forEach(function(g){ PT.attach(g); }); PT.load('assets/painted/', function(ok){ window.__painted = ok; }); } else window.__painted = false;
var gb = game.greybox; gb.showVehicle = function(){}; Object.keys(gb.vehicles).forEach(function(k){ gb.vehicles[k].visible = false; });
var nEnemy = 0;
gb.addActor = function(role, kind){ var p;
  if(kind === 'bystander'){ var b = game.bystanders.list.filter(function(x){ return x.role === role; })[0]; p = A.cast.bystander(b ? b.def.kind : 'nurse', nEnemy++); }
  else { p = (A.cast[kind] || A.cast.gunman)(nEnemy++); if(PT && PT.live.length && (kind === 'gunman' || kind === 'staff')){ PT.attach(p); p.userData.pk = kind === 'staff' ? 'enemy-scrubs' : 'enemy-plain'; } }
  p.name = role; scene.add(p); gb.actors[role] = p; p.userData.kind = kind; return p; };
gb.killActor = function(role){ var p = gb.actors[role]; if(p){ p.userData.dead = true; p.userData.deadT = 0; } };
gb.removeActor = function(role){ var p = gb.actors[role]; if(p && p.parent) p.parent.remove(p); delete gb.actors[role]; };
// cover props: a real object between the corner-pop and the heroes (they stop the player's rounds too)
var coverKinds = { bed_push: 'cart', transfer: 'cart', elevator: 'pillar', gauntlet: 'cart', entrance: 'planter' };
game.extraOccluders = [];
gb.addCover = function(p, e){ var seg = game.segment || '', o; if(e && e.hideDir){ p = p.clone().addScaledVector(e.hideDir, 0.8); }   // the prop shields the HIDDEN (ducked-back) spot; the lean-out is clear
  if(/cafeteria/.test(seg)){ o = A.table(); o.rotation.z = Math.PI / 2; o.position.y = 0.4; }
  else if(/waiting/.test(seg)){ o = A.chairRow(2); }
  else if(/ward/.test(seg)){ o = new THREE.Group(); A.box(1.5, 1.1, 0.6, A.mat(0xd8d2c4), 0, 0.55, 0, o); A.box(0.5, 0.35, 0.05, A.mat(0x111111), 0, 1.3, 0, o); }
  else if(coverKinds[game.beat] === 'planter'){ o = new THREE.Group(); A.box(1.3, 0.85, 0.9, A.mat(0x7b6a58), 0, 0.42, 0, o); var pl = A.plant(); pl.position.y = 0.6; o.add(pl); }
  else if(coverKinds[game.beat] === 'pillar'){ o = new THREE.Group(); A.box(0.7, 1.15, 0.7, A.mat(0xb9c1c7, { metalness: 0.6 }), 0, 0.57, 0, o); }
  else { o = (nEnemy % 2) ? A.crashCart() : (function(){ var g = new THREE.Group(); A.box(1.1, 1.0, 0.6, A.mat(0x5f7f9a), 0, 0.6, 0, g); A.box(1.0, 0.4, 0.5, A.mat(0xe8e8e8), 0, 1.25, 0, g); return g; })(); }
  o.position.set(p.x, p.y + (o.position.y || 0), p.z); var cam = camera.position; o.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z) + (o.rotation.y || 0);
  o.userData.hit = { role: 'occluder', occluder: true, live: function(){ return true; } }; scene.add(o); game.extraOccluders.push(o); return o; };
gb.moveCover = function(o, p, e){ if(o){ var q = p.clone(); if(e && e.hideDir) q.addScaledVector(e.hideDir, 0.8); o.userData.slideTo = new V(q.x, o.position.y, q.z); } };
var _rm = gb.removeObject; gb.removeObject = function(o){ var i = game.extraOccluders.indexOf(o); if(i >= 0) game.extraOccluders.splice(i, 1); _rm(o); };
gb.addCar = function(role, kind){ var c = A.car(kind); c.name = role; scene.add(c); gb.actors[role] = c; c.userData.spin = 0; return c; };
var train = null; gb.addTrain = function(){ if(train) scene.remove(train); train = A.train(); scene.add(train); gb.train = train; placeTrain(0); sfx.horn(); };
function placeTrain(t){ var ci = W.crossingInfo; if(!ci || !train) return; var ap = HE.DATA.tuning.trainApproach, x = Math.min((t - ap) * 13, 90);   /* rolls through at ~47 km/h: the locomotive crosses the frame for seconds */ train.position.copy(ci.pos).addScaledVector(ci.along, x); train.lookAt(train.position.clone().add(ci.along)); }
gb.placeTrain = placeTrain; gb.removeTrain = function(){ if(train) scene.remove(train); train = null; };
// ------------------------------------------------------------------ helpers
var _a = new V(), _b = new V(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), DOWN = new V(0, -1, 0);
function aimArm(p, side, dirWorld){ var J = p.userData.J, sh = J['sh' + side]; if(!sh || !sh.parent) return; sh.parent.updateMatrixWorld(true);
  _q.setFromRotationMatrix(_m.extractRotation(sh.parent.matrixWorld)).invert(); _a.copy(dirWorld).applyQuaternion(_q).normalize();
  sh.quaternion.setFromUnitVectors(DOWN, _a); J['el' + side].rotation.set(0, 0, 0); }
function yawTo(o, dir){ o.rotation.set(0, Math.atan2(dir.x, dir.z), 0); }
function aimRay(){ var v = new V((inp.aim.x * 2 - 1), -(inp.aim.y * 2 - 1), 0.5).unproject(camera).sub(camera.position).normalize(); return v; }
function fwdOf(path, s){ var t = path.tangentAtS(s); t.y = 0; return t.normalize(); }
function project(p){ var v = p.clone().project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, front: v.z < 1 }; }
// ------------------------------------------------------------------ FX: sprites, tracers, projectiles, particles
function glowTex(c0, c1){ var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, c0); gr.addColorStop(0.35, c1); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
var TX = { flash: glowTex('rgba(255,255,230,1)', 'rgba(255,180,60,.8)'), red: glowTex('rgba(255,240,240,1)', 'rgba(255,30,20,.95)'), tracer: glowTex('rgba(255,255,240,1)', 'rgba(255,220,140,.7)'), smoke: glowTex('rgba(90,90,90,.55)', 'rgba(60,60,60,.3)'), fire: glowTex('rgba(255,240,180,1)', 'rgba(255,90,20,.85)'), glint: glowTex('rgba(255,255,255,1)', 'rgba(180,220,255,.8)'), spark: glowTex('rgba(255,250,200,1)', 'rgba(255,170,40,.9)') };
var fx = [];
function sprite(tex, pos, size, life, o){ var m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: (o && o.normal) ? THREE.NormalBlending : THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: !(o && o.noDepth) }));
  m.position.copy(pos); m.scale.setScalar(size); scene.add(m); var f = Object.assign({ o: m, life: life, t: 0, size: size, vel: null, grow: 0 }, o || {}); fx.push(f); return f; }
function tracer(from, to, col, life, width){ var dir = to.clone().sub(from), L = dir.length(); var g = new THREE.Mesh(new THREE.PlaneGeometry(width || 0.05, L), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.position.copy(from).add(to).multiplyScalar(0.5); g.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.normalize()); scene.add(g); fx.push({ o: g, life: life || 0.07, t: 0, fadeMat: true }); }
function sparks(p, n, col){ for(var i = 0; i < n; i++){ sprite(TX.spark, p, 0.12 + Math.random() * 0.1, 0.25 + Math.random() * 0.2, { vel: new V((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), grav: 9 }); } sprite(TX.flash, p, 0.45, 0.08); }
function muzzle(p, big){ sprite(TX.flash, p, big ? 0.9 : 0.55, 0.06); flashLight.position.copy(p); flashLight.intensity = big ? 2.2 : 1.6; }
function stepFx(dt){ for(var i = fx.length - 1; i >= 0; i--){ var f = fx[i]; f.t += dt; var k = f.t / f.life;
    if(f.vel){ f.o.position.addScaledVector(f.vel, dt); if(f.grav) f.vel.y -= f.grav * dt; }
    if(f.grow) f.o.scale.setScalar(f.size * (1 + f.grow * k));
    if(f.o.material){ var base = f.alpha == null ? 1 : f.alpha; f.o.material.opacity = base * (1 - k); }
    if(k >= 1){ scene.remove(f.o); if(f.o.material){ if(f.o.material.map && f.o.material.map !== null && f.fadeMat) {} f.o.material.dispose(); } if(f.o.geometry) f.o.geometry.dispose(); fx.splice(i, 1); } }
  flashLight.intensity = Math.max(0, flashLight.intensity - dt * 30); paintLightT -= dt; if(paintLightT <= 0) paintLight.intensity = 0; }
// incoming shots in flight (from the engine's enemyShot events): red = will hit (the telegraph), pale = will miss
var flights = [];
function addFlight(d){ var from = new V().fromArray(d.from), to = new V().fromArray(d.to), red = d.red;
  var head = new THREE.Sprite(new THREE.SpriteMaterial({ map: red ? TX.red : TX.tracer, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  head.scale.setScalar(red ? 0.55 : 0.28); scene.add(head);
  var tail = new THREE.Mesh(new THREE.PlaneGeometry(red ? 0.07 : 0.035, 1), new THREE.MeshBasicMaterial({ color: red ? 0xff2a1a : 0xffe6a8, transparent: true, opacity: red ? 0.95 : 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(tail);
  flights.push({ from: from, to: to, t0: game.time, eta: d.eta, head: head, tail: tail, red: red }); }
function stepFlights(){ for(var i = flights.length - 1; i >= 0; i--){ var f = flights[i], k = HE.clamp((game.time - f.t0) / Math.max(0.01, f.eta - f.t0), 0, 1), p = f.from.clone().lerp(f.to, k), back = f.from.clone().lerp(f.to, Math.max(0, k - 0.14));
    f.head.position.copy(p); var d = p.clone().sub(back), L = Math.max(0.01, d.length()); f.tail.scale.set(1, L, 1); f.tail.position.copy(p).add(back).multiplyScalar(0.5); f.tail.quaternion.setFromUnitVectors(new V(0, 1, 0), d.normalize());
    if(k >= 1 || game.time > f.eta + 0.05){ scene.remove(f.head); scene.remove(f.tail); f.head.material.dispose(); f.tail.material.dispose(); f.tail.geometry.dispose(); flights.splice(i, 1); } } }
function clearFlights(){ flights.forEach(function(f){ scene.remove(f.head); scene.remove(f.tail); }); flights = []; }
// ------------------------------------------------------------------ audio (procedural; iOS unlock chain)
var AC = null, master = null, sirenNode = null;
function audioUnlock(){ try { if(navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(e){}
  if(!AC){ var C = window.AudioContext || window.webkitAudioContext; if(!C) return; AC = new C(); master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
    var b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0); }
  if(AC.state !== 'running') AC.resume(); }
['pointerdown', 'touchend'].forEach(function(ev){ addEventListener(ev, audioUnlock, { passive: true }); });
document.addEventListener('visibilitychange', function(){ if(AC && !document.hidden) AC.resume(); });
var noiseBuf = null; function noise(){ if(!noiseBuf){ noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); var d = noiseBuf.getChannelData(0); for(var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } var s = AC.createBufferSource(); s.buffer = noiseBuf; return s; }
function env(node, a, d, peak){ var g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(g); g.connect(master); return g; }
var sfx = { shot: function(heavy){ if(!AC) return; var n = noise(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = heavy ? 1800 : 2600; n.connect(f); env(f, 0.002, heavy ? 0.16 : 0.12, 0.9); n.start(); n.stop(AC.currentTime + 0.3);
    var o = AC.createOscillator(); o.frequency.setValueAtTime(140, AC.currentTime); o.frequency.exponentialRampToValueAtTime(45, AC.currentTime + 0.12); env(o, 0.002, 0.14, 0.6); o.start(); o.stop(AC.currentTime + 0.2); },
  enemy: function(red){ if(!AC) return; var n = noise(), f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; n.connect(f); env(f, 0.002, 0.1, 0.35); n.start(); n.stop(AC.currentTime + 0.2);
    if(red){ var o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1800, AC.currentTime); o.frequency.exponentialRampToValueAtTime(500, AC.currentTime + 0.25); env(o, 0.01, 0.22, 0.08); o.start(); o.stop(AC.currentTime + 0.3); } },
  impact: function(){ if(!AC) return; var n = noise(), f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; n.connect(f); env(f, 0.001, 0.05, 0.25); n.start(); n.stop(AC.currentTime + 0.1); },
  hurt: function(){ if(!AC) return; var o = AC.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(90, AC.currentTime); o.frequency.exponentialRampToValueAtTime(50, AC.currentTime + 0.25); env(o, 0.005, 0.25, 0.7); o.start(); o.stop(AC.currentTime + 0.3); },
  penalty: function(){ if(!AC) return; [440, 330].forEach(function(fq, i){ var o = AC.createOscillator(); o.type = 'square'; o.frequency.value = fq; var g = env(o, 0.01, 0.25, 0.18); o.start(AC.currentTime + i * 0.2); o.stop(AC.currentTime + 0.5 + i * 0.2); }); },
  ding: function(){ if(!AC) return; [880, 660].forEach(function(fq, i){ var o = AC.createOscillator(); o.frequency.value = fq; env(o, 0.01, 0.6, 0.2); o.start(AC.currentTime + i * 0.3); o.stop(AC.currentTime + 1 + i * 0.3); }); },
  boom: function(){ if(!AC) return; var n = noise(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; n.connect(f); env(f, 0.005, 0.6, 1); n.start(); n.stop(AC.currentTime + 0.7); },
  horn: function(){ if(!AC) return; [311, 370].forEach(function(fq){ var o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fq; var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200; o.connect(f); env(f, 0.05, 2.2, 0.16); o.start(); o.stop(AC.currentTime + 2.4); }); },
  siren: function(on){ if(!AC) return; if(on && !sirenNode){ var o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = 700; l.frequency.value = 0.7; lg.gain.value = 220; l.connect(lg); lg.connect(o.frequency); g.gain.value = 0.05; o.connect(g); g.connect(master); o.start(); l.start(); sirenNode = { o: o, l: l, g: g }; }
    if(!on && sirenNode){ sirenNode.o.stop(); sirenNode.l.stop(); sirenNode = null; } } };
// ------------------------------------------------------------------ HUD + input
var paused = false, aimDrag = null, stick = null, keys = {}, started = false, auto = Q.get('auto') === '1', lastMode = null, score = 0, banner = null;
function showBanner(text, cls, ms){ var b = $('banner'); b.textContent = text; b.className = 'show ' + (cls || ''); clearTimeout(banner); banner = setTimeout(function(){ b.className = ''; }, ms || 1600); }
function popup(text, x, y, cls){ var d = document.createElement('div'); d.className = 'pop ' + (cls || ''); d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; $('pops').appendChild(d); setTimeout(function(){ d.remove(); }, 900); }
function isUI(e){ return e.target.closest && e.target.closest('.btn,#card,#start,#dev'); }
addEventListener('pointerdown', function(e){ if(isUI(e) || !started) return; e.preventDefault();
  if(game.mode === 'FREE_FOOT' && e.clientX < innerWidth / 2 && !stick){ stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; var s = $('stick'); s.style.display = 'block'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; return; }
  if(!aimDrag) aimDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' }; if(e.pointerType === 'mouse'){ inp.aim.x = e.clientX / innerWidth; inp.aim.y = e.clientY / innerHeight; inp.fire = true; } }, { passive: false });
addEventListener('pointermove', function(e){ if(stick && e.pointerId === stick.id){ var dx = HE.clamp((e.clientX - stick.x) / 50, -1, 1), dy = HE.clamp((e.clientY - stick.y) / 50, -1, 1); inp.move.x = dx; inp.move.y = dy; $('stick').firstChild.style.transform = 'translate(' + dx * 32 + 'px,' + dy * 32 + 'px)'; return; }
  if(e.pointerType === 'mouse' && started && !auto){ inp.aim.x = HE.clamp(e.clientX / innerWidth, 0, 1); inp.aim.y = HE.clamp(e.clientY / innerHeight, 0, 1); return; }
  if(aimDrag && e.pointerId === aimDrag.id && !auto){ inp.aim.x = HE.clamp(inp.aim.x + (e.clientX - aimDrag.x) / innerWidth * 1.5, 0.02, 0.98); inp.aim.y = HE.clamp(inp.aim.y + (e.clientY - aimDrag.y) / innerHeight * 1.5, 0.05, 0.9); aimDrag.x = e.clientX; aimDrag.y = e.clientY; } });
function up(e){ if(stick && e.pointerId === stick.id){ stick = null; inp.move.x = inp.move.y = 0; $('stick').style.display = 'none'; } if(aimDrag && e.pointerId === aimDrag.id){ if(aimDrag.mouse) inp.fire = false; aimDrag = null; } }
addEventListener('pointerup', up); addEventListener('pointercancel', up);
document.addEventListener('dblclick', function(e){ e.preventDefault(); }, { passive: false }); ['gesturestart', 'gesturechange'].forEach(function(n){ document.addEventListener(n, function(e){ e.preventDefault(); }, { passive: false }); });
document.addEventListener('touchmove', function(e){ if(e.touches.length > 1) e.preventDefault(); }, { passive: false });
var fireBtn = $('fire'); fireBtn.addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); inp.fire = true; fireBtn.setPointerCapture(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(n){ fireBtn.addEventListener(n, function(){ inp.fire = false; }); });
$('reload').addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); inp.reload = true; });
addEventListener('keydown', function(e){ keys[e.code] = true; if(e.code === 'KeyR') inp.reload = true; if(e.code === 'Space'){ inp.fire = true; e.preventDefault(); } });
addEventListener('keyup', function(e){ keys[e.code] = false; if(e.code === 'Space') inp.fire = false; });
// gptouch getInput(): joystick merged with keyboard (FREE_FOOT only — the one free segment)
function getInput(){ var kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  return { x: stick ? inp.move.x : kx, y: stick ? inp.move.y : ky }; }
$('startBtn').addEventListener('click', function(){ audioUnlock(); $('start').style.display = 'none'; started = true; game.gotoBeat(Q.get('beat') || 'visit'); if(Q.get('seg')) game.gotoSegment(Q.get('beat'), +Q.get('seg')); });
$('cardBtn').addEventListener('click', function(){ $('card').style.display = 'none'; clearFlights(); if(game.ended) game.gotoBeat('visit'); else game.gotoBeat(game.beat); });
window.__dbg.autopilot = function(on){ auto = !!on; if(!auto) inp.fire = false; return auto; };          // ext: verification autopilot (additive)
window.__game = { game: game, tick: function(){ processEvents(); present(1 / 60); }, pause: function(v){ paused = !!v; }, start: function(beat){ $('start').style.display = 'none'; $('card').style.display = 'none'; started = true; game.gotoBeat(beat || 'visit'); }, ff: function(secs, ap){ var n = Math.round(secs * 60); for(var i = 0; i < n; i++){ if(!game.ended && !game.lost){ if(ap) HE.autopilot(game); game.step(1 / 60); } processEvents(); present(1 / 60); } } };
if(Q.get('autostart') === '1'){ $('start').style.display = 'none'; started = true; game.gotoBeat(Q.get('beat') || 'visit'); }
// ------------------------------------------------------------------ per-mode presentation
var BEAT_TITLES = { visit: '1 · ROOM 412', bed_push: '2 · THE BED', transfer: '3 · THE TRANSFER', elevator: '4 · GOING DOWN', gauntlet: '5 · THE GAUNTLET', entrance: '6 · THE FRONT DOORS', steal: '7 · THE AMBULANCE', chase: '8 · HARBOR AVENUE', train_finale: '9 · THE LINE 9 CROSSING' };
var outdoor = false, tAnim = 0, lastBeat = null, coleAim = new V(0, 0, -1), mayaFireT = 0, mayaTarget = new V(), bedParked = null, chairParked = null, ambParked = null;
// night hospital (dim, cold ambient; the ceiling panels and pools carry the light) / storm dusk outside
function setOutdoor(on){ if(on === outdoor) return; outdoor = on; if(PT){ PT.env.setRGB(on ? 0.79 : 1.0, on ? 0.83 : 1.0, on ? 0.92 : 1.0); PT.indoor = !on; }   /* painted cast graded to the room */ if(on){ scene.fog = new THREE.Fog(0x2b3440, 35, 300); hemi.color.set(0x8799b0); hemi.groundColor.set(0x1d1a19); hemi.intensity = 0.47; sun.color.set(0xb6bcd0); sun.intensity = 0.50; sun.position.set(-60, 50, 40); sky.visible = true; }
  else { scene.fog = new THREE.Fog(0x1c2328, 14, 60); hemi.color.set(0xb9c9d6); hemi.groundColor.set(0x3a342e); hemi.intensity = 0.48; sun.color.set(0xdfe8ff); sun.intensity = 0.18; sun.position.set(20, 40, 10); sky.visible = false; }
  if(T4){ T4.fog(scene, on); if(!on) T4.indoorLights(hemi, sun); } }   // T4: FogExp2 mood + T4's hemisphere indoors
// BEAUTY PASS B1: per-area indoor fog (was one binary 14/60). [color, near, far] — far is set per area so the
// longest scripted shot there stays <= ~40% fogged (probe-dist.cjs, seeds 3+7: halls max 24.5 m, elevator
// doors 15.7 m, cafeteria 18.4 m, holdout 16.1 m). Outdoor keeps the setOutdoor fog. Painted cast follows via
// painted.js's fog chunks — do not re-tint sprites for a fog change.
var AREA_FOG = { visit_room: [0x1c2328, 10, 44], bed_hall_push: [0x1c2328, 11, 50], transfer_cut: [0x1c2328, 11, 50], transfer_chair_corridor: [0x1c2328, 11, 50],
  elevator_ride: [0x1a2126, 5, 30], elevator_doors_ground: [0x1a2126, 5, 30], gauntlet_halls: [0x1c2328, 11, 50], gauntlet_cafeteria: [0x1c2328, 12, 55],
  gauntlet_ward_on_foot: [0x1c2328, 8, 34], gauntlet_waiting_room: [0x1c2328, 10, 44], entrance_holdout: [0x1c2328, 12, 58] };
function areaFog(seg, pathT){ if(T4 || outdoor || !scene.fog) return; var a = AREA_FOG[seg], c, n, f;
  if(seg === 'entrance_exit_push'){ var t = Math.max(0, Math.min(1, pathT || 0)); c = 0x1c2328; n = 12 + 12 * t; f = 58 + 82 * t; }   // lobby fog eases toward the street values on the way out
  else if(a){ c = a[0]; n = a[1]; f = a[2]; } else return;
  if(scene.fog.color.getHex() !== c) scene.fog.color.setHex(c); scene.fog.near = n; scene.fog.far = f; }
setOutdoor(true); setOutdoor(false);
function placeOnPath(o, path, s, off){ var p = path.pointAtS(s), t = fwdOf(path, s); o.position.copy(p); if(off) o.position.add(off); yawTo(o, t); return t; }
function present(dt){ tAnim += dt; if(PT) PT.time = tAnim; patientStep(dt); if(T4) T4.step(camera, !outdoor, game.state().segment); var st = game.state(), r = game.rail, m = st.mode, seg = st.segment || '';
  if((estK > 0 || estWas) && r.path && (m === 'RAIL_CHAIR' || m === 'AMBULANCE')) r.place(0, false); estWas = estK > 0;   // the offset lands on this very frame (a clean cut)
  if(st.beat !== lastBeat){ lastBeat = st.beat; if(started) showBanner(BEAT_TITLES[st.beat] || st.beat, 'title', 2200); }
  setOutdoor(st.beat === 'steal' && seg !== 'steal_cut' || st.beat === 'chase' || st.beat === 'train_finale' || seg === 'steal_cut');
  areaFog(seg, r.pathT ? r.pathT() : 0);
  hale.visible = st.beat === 'visit'; if(m !== 'AMBULANCE' && seg !== 'steal_cut'){ var bp0 = game.path('bay_route'); placeOnPath(amb, bp0, bp0.lead); }
  var aimDir = aimRay(); coleAim.lerp(aimDir, Math.min(1, dt * 14)).normalize();
  mayaFireT = Math.max(0, mayaFireT - dt);
  if(m === 'RAIL_CHAIR' || m === 'HOLDOUT'){ var path = r.path, t = fwdOf(path, r.s), right = new V(-t.z, 0, t.x);
    if(st.vehicle === 'bed'){ bed.visible = true; placeOnPath(bed, path, r.s - 0.25); chair.visible = !!chairParked;
      cole.position.copy(bed.position).addScaledVector(t, 0.78); cole.position.y += 0.8; yawTo(cole, t); A.pose(cole, 'recline', tAnim); }
    else { chair.visible = true; placeOnPath(chair, path, r.s); cole.position.copy(chair.position); yawTo(cole, t); A.pose(cole, 'sit', tAnim); bed.visible = !!bedParked; }
    if(m === 'HOLDOUT'){ maya.position.copy(chair.position).addScaledVector(right, -0.75).addScaledVector(t, 0.55); yawTo(maya, t); A.pose(maya, 'aim', tAnim); aimArm(maya, 'R', mayaFireT > 0 ? mayaTarget.clone().sub(maya.position).setY(mayaTarget.y - maya.position.y - 1.35).normalize() : t.clone().setY(-0.02)); }
    else { maya.position.copy(r.pusherPos()).addScaledVector(right, -0.4); yawTo(maya, t); A.pose(maya, mayaFireT > 0 ? 'pushFire' : 'push', tAnim, { speed: r.speed() > 0 ? 1 : 0 });
      if(mayaFireT > 0) aimArm(maya, 'R', mayaTarget.clone().sub(maya.position.clone().setY(maya.position.y + 1.35)).normalize()); }
    aimArm(cole, 'R', coleAim); if(st.vehicle === 'bed') bedParked = { at: bed.position.clone() }; else chairParked = true; }
  else if(m === 'FREE_FOOT'){ var f = game.foot, fp = f.path; chair.visible = true; placeOnPath(chair, fp, fp.lead); cole.position.copy(chair.position); yawTo(cole, f.fwd); A.pose(cole, 'sit', tAnim); aimArm(cole, 'R', f.fwd.clone().setY(-0.05));
    maya.position.copy(f.pos); var mv = getInput(); yawTo(maya, f.fwd); A.pose(maya, (Math.abs(inp.move.x) + Math.abs(inp.move.y)) > 0.1 ? 'aimWalk' : 'aim', tAnim); aimArm(maya, 'R', aimDir); aimArm(maya, 'L', aimDir.clone().add(new V(0.15, 0, 0)).normalize()); }
  else if(m === 'AMBULANCE'){ var ap = r.path, at = fwdOf(ap, r.s); placeOnPath(amb, ap, r.s); chair.visible = st.beat === 'steal' && false; bed.visible = false;
    var back = at.clone().negate(), rt = new V(-back.z, 0, back.x); cole.position.copy(camera.position).addScaledVector(back, 1.15).addScaledVector(rt, 0.5); cole.position.y = amb.position.y + 0.81; yawTo(cole, back); A.pose(cole, 'sit', tAnim); aimArm(cole, 'R', coleAim);
    maya.position.copy(amb.position).addScaledVector(at, 1.9).addScaledVector(new V(-at.z, 0, at.x), -0.45); maya.position.y = amb.position.y + 0.25; yawTo(maya, at); A.pose(maya, 'drive', tAnim);
    if(amb.userData.lightbar) amb.userData.lightbar.children.forEach(function(c, i){ c.visible = Math.floor(tAnim * 6 + i) % 2 === 0; }); }
  else if(m === 'CUTSCENE'){ stageCutscene(seg); }
  // enemies: pose by behaviour state (corner-pop lean / duck, advance, aim tell, dead)
  paintCast(dt, st, m, seg);
  game.combat.enemies.forEach(function(e){ var p = gb.actors[e.role]; if(!p) return;
    if(HC && (p.userData.c3 || (!p.userData.dead && HC.attachEnemy(p, p.userData.kind)))){ HC.stepEnemy(e, p, dt, game); return; }   // INTEGRATION: the N2 cast on Mixamo clips
    if(p.userData.pk && PT.use(p, true)){ paintEnemy(e, p, dt); return; } if(p.userData.dead){ p.userData.deadT += dt; A.pose(p, 'dead', 0); p.position.y = e.pos.y; return; }
    var moving = (e.behavior === 'cover' && e.cover && e.pos.distanceTo(e.cover) > 0.05) || (e.behavior === 'rush' && e.pos.distanceTo(game.playerPos().setY(e.pos.y)) > 3.6);
    if(moving) A.pose(p, e.behavior === 'rush' ? 'aimWalk' : 'run', tAnim + e.t); else if(e.behavior === 'cover' && !e.exposed) A.pose(p, 'peek', tAnim, { side: 1 }); else A.pose(p, e.behavior === 'cover' ? 'lean' : 'aim', tAnim, { side: e.hideDir ? -Math.sign(e.hideDir.x || e.hideDir.z || 1) : 1 });
    if(e.exposed || moving){ var tgt = game.heroTarget(); aimArm(p, 'R', tgt.clone().sub(p.position.clone().setY(p.position.y + 1.35)).normalize()); }
    if(e.aiming > 0 && Math.random() < 0.5){ var mz = A.muzzleWorld(p, new V()); if(mz) sprite(TX.glint, mz, 0.35 + Math.random() * 0.2, 0.06); } });
  game.extraOccluders.forEach(function(o){ if(o.userData.slideTo){ o.position.lerp(o.userData.slideTo, Math.min(1, dt * 2)); } });
  game.bystanders.list.forEach(function(b){ var p = gb.actors[b.role]; if(!p) return; if(b.state === 'hit'){ A.pose(p, 'hurt', 0); return; } A.pose(p, b.state === 'pause' ? 'cower' : (b.def.speed || 1.6) > 1.9 ? 'flee' : 'walk', tAnim); });
  game.chase.list.forEach(function(pz){ var c = gb.actors[pz.role]; if(!c) return; if(c.userData.lightbar) c.userData.lightbar.children.forEach(function(x, i){ x.visible = pz.state === 'pursuing' && Math.floor(tAnim * 7 + i) % 2 === 0; });
    if(pz.state === 'crippled:driver' || (pz.state === 'wrecked' && pz.outcome === 'drift')){ c.userData.spin = Math.min(2.6, c.userData.spin + dt * 2.4); } else if(pz.state === 'crippled:tire'){ c.userData.spin = Math.min(0.5, c.userData.spin + dt * 0.4); }
    c.rotateY(c.userData.spin); if(c.userData.smoke && Math.random() < dt * 14){ var sp = c.position.clone().add(new V(0, 1.2, 0)); sprite(c.userData.fire ? TX.fire : TX.smoke, sp, 1.0, 1.2, { vel: new V((Math.random() - 0.5), 1.6, (Math.random() - 0.5)), grow: 1.5, normal: !c.userData.fire, alpha: 0.8 }); } });
  if(train) placeTrain(game.chase.train ? game.chase.train.t : 0);
  W.crossings.forEach(function(x){ var on = !!game.chase.train; x.userData.lights.forEach(function(l, i){ l.material.emissiveIntensity = on && (Math.floor(tAnim * 3) + i) % 2 ? 3 : 0; }); x.userData.arm.rotation.z = on ? Math.max(-0.0, x.userData.arm.rotation.z - dt) : Math.min(1.45, x.userData.arm.rotation.z + dt); if(!on) x.userData.arm.rotation.z = 1.45; });
  // elevator doors: close as the car fills on 4, open hot on G
  W.doors.forEach(function(d){ if(!d.elevator) return; if((d.floor === 'upper' && d.end === 1) || (d.floor === 'ground' && d.end === 0)){ d.target = 0; return; }   // CAMERA-FIX: the far end of each car stays shut (it opened onto the void) if(seg === 'elevator_ride'){ if(d.floor === 'upper' && d.end === 0) d.target = (r.pathT() < 0.86 || game.combat.live().some(function(e){ return e.wave === 'el_block'; })) ? 1 : 0;   /* ELEVATOR-BLOCK: a live door-holder keeps the car doors open */ if(d.floor === 'ground') d.target = 0; }
    else if(seg === 'elevator_doors_ground'){ if(d.floor === 'ground' && d.end === 1) d.target = game.segT > 0.35 ? 1 : 0; } });
  W.update(dt, tAnim); stepFx(dt); stepFlights(); }
// ------------------------------------------------------------------ the painted cast: per-beat frames + placement
var pushPh = 0, haleUp = false, BAR = { bed: new V(0, 1.0, -0.12), chair: new V(0, 1.05, -0.36) }, _gs = new V();
function screenX(p){ return p.clone().project(camera).x; }
// Maya's grip (audit note 1): solve her billboard so the painted hands land ON the push bar as seen from the camera. The hand
// point is put on the camera->bar ray at the depth where its painted height (per frame, above that frame's own bottom) meets it.
function gripSolve(veh, barLocal, f, mir){ veh.updateMatrixWorld(true); var B = veh.localToWorld(_gs.copy(barLocal)), C = camera.position, fl = veh.position.y;
  var hand = (f.bottom + 1 - f.grip[1]) / PS, hc = C.y - fl, hb = B.y - fl, k = HE.clamp((hc - hand) / Math.max(0.05, hc - hb), 0.3, 0.98);
  var H = C.clone().lerp(B, k), dx = (f.grip[0] - f.feet) / PS * mir, yaw = Math.atan2(C.x - H.x, C.z - H.z);
  maya.position.set(H.x - Math.cos(yaw) * dx, fl, H.z + Math.sin(yaw) * dx); }
var mayaFireQ = false, mayaNearQ = null;
function mayaNear(d){ if(!HC || !d.from || !d.to) return; var a = new V().fromArray(d.from), b = new V().fromArray(d.to), p = maya.position.clone(); p.y += 1.2; var ab = b.clone().sub(a), t = HE.clamp(p.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1);
  if(a.clone().addScaledVector(ab, t).distanceTo(p) < 1.6) mayaNearQ = { red: !!d.red }; }   // a round passing within 1.6 m of Maya
function castFriends(dt, st, m, seg){ var r = game.rail; if(!HC || !HC.ready) return { maya: false, cole: false }; HC.roomVis(seg);
  if(PT && maya.userData.painted) PT.use(maya, false);
  var sm = HC.stepMaya({ maya: maya, mode: m, seg: seg, vehicle: st.vehicle, speed: r.path ? r.speed() : 0, fireT: mayaFireT, fireQ: mayaFireQ, nearShot: mayaNearQ, aimAt: m === 'FREE_FOOT' ? camera.position.clone().addScaledVector(aimRay(), 20) : mayaFireT > 0 ? mayaTarget : null, dt: dt }); mayaFireQ = false; mayaNearQ = null;
  var pose = null, yaw = 0, dz = 0, dy = 0;   /* where the painted Cole used to appear: in the bed (visit + the bed push's opening), in the chair (cutscenes, parked on foot) */
  if((m === 'CUTSCENE' && seg === 'visit_room') || (m === 'RAIL_CHAIR' && st.vehicle === 'bed' && estK > 0)){ pose = 'bed'; cole.position.copy(bed.position); cole.rotation.copy(bed.rotation); dy = HC.bedDy || 0; dz = HC.bedDz || 0; yaw = HC.bedYaw || 0; bed.visible = true; }
  else if(m === 'CUTSCENE' && (seg === 'transfer_cut' || seg === 'steal_cut')){ pose = 'chair'; cole.position.copy(chair.position); cole.rotation.copy(chair.rotation); chair.visible = true; dz = HC.chairDz || 0; dy = HC.chairDy || 0; }
  else if((m === 'RAIL_CHAIR' && st.vehicle !== 'bed') || m === 'HOLDOUT'){ pose = 'chair'; cole.position.copy(chair.position); cole.rotation.copy(chair.rotation); chair.visible = true; dz = HC.chairDz || 0; dy = HC.chairDy || 0; }   // his own chair views: the camera rides behind him
  else if(m === 'FREE_FOOT' && cole.position.distanceTo(camera.position) > 3.0){ pose = 'chair'; cole.position.copy(chair.position); cole.rotation.copy(chair.rotation); chair.visible = true; dz = HC.chairDz || 0; dy = HC.chairDy || 0; }
  var sc = false; if(pose){ if(PT && cole.userData.painted) PT.use(cole, false); cole.scale.setScalar(1); cole.visible = true; sc = HC.stepCole({ cole: cole, pose: pose, yaw: yaw, dz: dz, dy: dy, dt: dt }); } else HC.stepCole({ cole: cole, pose: null, dt: dt });
  return { maya: sm, cole: sc }; }
function paintCast(dt, st, m, seg){ var own = castFriends(dt, st, m, seg); if(!PT || !PT.ready){ return; } var r = game.rail;
  // Dr. Hale (the opening only): objecting -> hands up once Maya's gun is out (her line)
  if(st.beat !== 'visit') haleUp = false; if(hale.visible){ PT.use(hale, true); if(st.subtitle && st.subtitle.speaker === 'FRIEND') haleUp = true; PT.show(hale, haleUp ? 'dr-hale-hands-up' : 'dr-hale-objecting', 1, camera); }
  // Maya
  if(own.maya){ }   // INTEGRATION: the 3D Maya (cast3d.js) owns this view
  else if((m === 'RAIL_CHAIR') && r.path){ PT.use(maya, true); var veh = st.vehicle === 'bed' ? bed : chair, sp = r.speed();
    if(mayaFireT > 0){ var fa = PT.frames['maya-aim-side'], dir = screenX(mayaTarget) > screenX(maya.position) ? 1 : -1; PT.show(maya, 'maya-aim-side', dir * fa.face, camera); }
    else { pushPh = sp > 0.05 ? pushPh + sp * dt / 0.36 : Math.round(pushPh / 2) * 2; var nm = 'maya-push-0' + (1 + (Math.floor(pushPh) % 4)), f = PT.frames[nm]; gripSolve(veh, BAR[st.vehicle === 'bed' ? 'bed' : 'chair'], f, 1); PT.show(maya, nm, 1, camera); } }
  else if(m === 'HOLDOUT'){ PT.use(maya, true); var ne = game.combat.live()[0], fc = PT.frames['maya-crouch-chair'], dr = ne ? (screenX(ne.pos) > screenX(maya.position) ? 1 : -1) : -1; PT.show(maya, 'maya-crouch-chair', dr * fc.face, camera); }
  else if(m === 'CUTSCENE' && (seg === 'visit_room' || seg === 'steal_cut')){ PT.use(maya, true); PT.show(maya, 'maya-aim-side', seg === 'visit_room' ? 1 : -1, camera); }
  else if(m === 'CUTSCENE' && seg === 'transfer_cut'){ PT.use(maya, true); PT.show(maya, 'maya-crouch-chair', 1, camera); }
  else PT.use(maya, false);
  // Cole: the painted patient where the camera sees HIM (cutscenes + the ambulance establishing shot); his own eyes otherwise
  if(!own.cole) cole.scale.setScalar(1);
  if(own.cole){ }   // INTEGRATION: the 3D Cole owns this view
  else if(m === 'CUTSCENE' && seg === 'visit_room'){ PT.use(cole, true); bed.visible = false; cole.position.copy(bed.position).addScaledVector(fwdOf(game.path('bed_hall'), game.path('bed_hall').lead), 1.0); cole.position.y = bed.position.y; PT.show(cole, 'cole-bed-foot', 1, camera, 1, 'box'); }
  else if(m === 'CUTSCENE' && (seg === 'transfer_cut' || seg === 'steal_cut')){ PT.use(cole, true); chair.visible = false; cole.position.copy(chair.position); PT.show(cole, 'cole-wheelchair-front3q', 1, camera, 1, 'box'); }
  else if(m === 'AMBULANCE' && estK > 0){ PT.use(cole, true); cole.userData.reflect = false;   /* the bay floor is ribbed steel, not wet linoleum */ amb.updateMatrixWorld(true); cole.position.copy(amb.localToWorld(new V(0.05, 0.81, -1.7))); cole.scale.setScalar(0.62);   /* seated on the bay floor: head ~1.0 m above it (the painting's figure is drawn at standing scale, like the chair Cole Moth scaled 0.73) */ PT.show(cole, 'cole-ambulance-braced', 1, camera, 1, 'box'); }
  else if(m === 'FREE_FOOT'){ PT.use(cole, true); chair.visible = false; cole.position.copy(chair.position); var dc = cole.position.distanceTo(camera.position); cole.userData.opac = HE.clamp((dc - 3.0) / 1.5, 0, 1);   // parked: the painted patient in his chair, faded out while he is right beside Maya's camera
    PT.show(cole, 'cole-wheelchair-front3q', 1, camera, 1, 'box'); cole.userData.bb.userData.sh.visible = cole.userData.opac > 0.5; }
  else if(m === 'RAIL_CHAIR' && st.vehicle === 'bed' && estK > 0){ PT.use(cole, true); bed.visible = false; var bf2 = fwdOf(game.rail.path, game.rail.s); cole.position.copy(bed.position).addScaledVector(bf2, 1.0); cole.position.y = bed.position.y; PT.show(cole, 'cole-bed-foot', 1, camera, 1, 'box'); }   // defect 5: the bed push's establishing shot takes the PAINTED bed (the visit treatment) — the occupant is the painted Cole, not the grey figure
  else if((m === 'RAIL_CHAIR' && st.vehicle !== 'bed') || m === 'HOLDOUT'){ PT.use(cole, true); chair.visible = false; cole.position.copy(chair.position); cole.scale.setScalar(0.73); PT.show(cole, 'cole-wheelchair-front3q', 1, camera, 1, 'box'); }   // defect 5: the wheelchair's occupant is the painted Cole in every chair beat (the FREE_FOOT treatment extended to play views) — no more empty chair behind Maya. Scaled 0.73: the painting's figure measures 1.79 m but a seated man's head tops ~1.31 m — at full size his head would fill the play view and block the fairness sight-lines over the chair
  else PT.use(cole, false);
  if(m !== 'FREE_FOOT'){ cole.userData.opac = 1; if(cole.userData.bb) cole.userData.bb.userData.sh.visible = true; }
  // OPUS-FOREGROUND-COLE: in his own play views the procedural Cole (back of head, shoulders, gun arm) clashed with the painted cast and
  // no painted back view exists -> he is hidden there (method b). The bed / chair / ambulance bay still frame the view; his shots leave
  // from an off-screen gun point at the lower right of HIS view (fgMuzzle).
  coleGunFG = (m === 'RAIL_CHAIR' && st.vehicle !== 'bed') || m === 'HOLDOUT' || m === 'AMBULANCE';   // in the chair / bay play views his shots still leave from the off-screen gun point, painted occupant or not (the painting carries no muzzle)
  coleHidden = (m === 'RAIL_CHAIR' || m === 'HOLDOUT' || m === 'AMBULANCE') && !cole.userData.painted && !own.cole; cole.visible = !coleHidden; }
var coleHidden = false, coleGunFG = false;
function fgMuzzle(out){ var q = camera.quaternion; return out.copy(camera.position).add(new V(0.2, -0.3, -0.62).applyQuaternion(q)); }
// an enemy as its painted frames: peek / aim / fire / flinch / down, mirrored to face the screen centre (the camera side)
function paintEnemy(e, p, dt){ var u = p.userData, pk = u.pk, fr; u.kick = Math.max(0, (u.fireT || 0) / 0.14); u.fireT = Math.max(0, (u.fireT || 0) - dt); u.flinchT = Math.max(0, (u.flinchT || 0) - dt);
  if(u.dead){ u.deadT += dt; p.position.y = e.pos.y; fr = u.deadT < 0.3 ? 'flinch' : 'down'; }
  else { var hidden = e.behavior === 'cover' && !e.exposed;
    // WALK (OPUS-INTEGRATE-WALK-COLE): measured world speed, not behaviour flags. The pose advances by DISTANCE travelled —
    // one pose per 0.44 m (half the 0.88 m step measured between walk-03's two contact clusters) — so the planted foot doesn't skate
    // at any speed. A new walk starts on pose 02 (the cycle's first full stride; walk-01 is the near-standing frame, audit trait).
    var sp = 0; if(u.lastPos && dt > 0){ sp = Math.hypot(e.pos.x - u.lastPos.x, e.pos.z - u.lastPos.z) / dt; } u.walkV = (u.walkV || 0) + (sp - (u.walkV || 0)) * Math.min(1, dt * 10);
    var walking = u.walkV > 0.25 && !hidden; if(walking){ if(!u.walking) u.walkD = 0.44; u.walkD += sp * dt; } u.walking = walking;
    fr = u.fireT > 0 ? 'fire' : u.flinchT > 0 ? 'flinch' : walking ? 'walk-0' + (1 + Math.floor(u.walkD / 0.44) % 4) : hidden ? (pk === 'enemy-plain' ? 'peek' : 'aim') : 'aim'; }
  if(fr.indexOf('walk') === 0 && u.lastPos){ var cr = new V(1, 0, 0).applyQuaternion(camera.quaternion), vx = (e.pos.x - u.lastPos.x) * cr.x + (e.pos.z - u.lastPos.z) * cr.z;   // world velocity along the view's right: camera turns don't flip him
    if(Math.abs(vx) > 0.002) u.face = vx > 0 ? 1 : -1; else if(u.face == null) u.face = PT.sideOf(p.position, camera) > 0 ? -1 : 1; }   // walks the way he crosses the screen
  else if(u.face == null || (!u.dead && fr !== 'fire' && fr !== 'flinch')) u.face = PT.sideOf(p.position, camera) > 0 ? -1 : 1;   // toward screen centre; frozen through fire / flinch / down
  if(dt > 0){ (u.lastPos || (u.lastPos = new V())).copy(e.pos); }
  var nm = pk + '-' + fr; PT.show(p, nm, u.face * PT.frames[nm].face, camera);
  // feet planted: a walk pose is HELD where it began (stop-motion, like the painted cycle itself) and steps to the next pose's spot,
  // so the planted foot never slides; the engine position stays continuous (the visual leads/lags it by < 0.44 m)
  var bbo = p.userData.bb; if(bbo){ if(fr.indexOf('walk') === 0){ if(u.pose !== fr || !u.poseAt){ u.pose = fr; (u.poseAt || (u.poseAt = new V())).copy(e.pos); }
      p.updateMatrixWorld(true); bbo.position.copy(p.worldToLocal(u.poseAt.clone())); bbo.position.y = 0; } else { u.pose = null; bbo.position.set(0, 0, 0); } }
  if(e.aiming > 0 && !u.dead && dt > 0 && Math.random() < 0.5){ var mz = PT.muzzle(p, new V()); if(mz) sprite(TX.glint, mz, 0.3 + Math.random() * 0.15, 0.06); } }
function stageCutscene(seg){ var r = game.rail;
  if(seg === 'visit_room'){ var bp = game.path('bed_hall'); placeOnPath(bed, bp, bp.lead - 0.25); bed.visible = true; var t = fwdOf(bp, bp.lead);
    cole.position.copy(bed.position).addScaledVector(t, 0.78); cole.position.y += 0.8; yawTo(cole, t); A.pose(cole, 'recline', tAnim); aimArm(cole, 'R', new V(0.5, -0.4, -0.3).normalize());
    maya.position.set(0.95, 0, -3.1); yawTo(maya, new V(-0.4, 0, -1)); A.pose(maya, 'talk', tAnim); hale.position.set(PT && PT.ready ? 0.75 : 0.3, 0, PT && PT.ready ? -5.0 : -4.75); yawTo(hale, new V(0.45, 0, 1)); A.pose(hale, 'talk', tAnim + 1); chair.visible = false; }
  else if(seg === 'transfer_cut'){ var cp = game.path('chair_corridor'); chair.visible = true; placeOnPath(chair, cp, cp.lead); var tt = fwdOf(cp, cp.lead); cole.position.copy(chair.position); yawTo(cole, tt); A.pose(cole, 'sit', tAnim);
    maya.position.copy(chair.position).add(new V(-0.75, 0, 0.2)); yawTo(maya, new V(1, 0, -0.2)); A.pose(maya, 'push', tAnim); bed.visible = true; }
  else if(seg === 'steal_cut'){ var ap = game.path('bay_route'); placeOnPath(amb, ap, ap.lead); chair.visible = true; chair.position.set(58.6, -12, -177.2); chair.rotation.y = Math.PI; cole.position.copy(chair.position); yawTo(cole, new V(0, 0, -1)); A.pose(cole, 'sit', tAnim);
    maya.position.set(59.6, -12, -178.4); yawTo(maya, new V(-0.4, 0, -1)); A.pose(maya, 'walk', tAnim); bed.visible = false; } }

// ------------------------------------------------------------------ PATIENT EYES (PATIENT-EYES-SPEC.md): neck, lids, focus drift, ambulance sway
// The neck drives game.cameraOffset (applied INSIDE the engine's camera placement, so aim = what you see).
var estK = 0, estWas = false, BAY_CAM_Z = 0;   /* local z of the bay rig camera (= -bayOffset), read from the path at use */
var PE = { sy: 0, sp: 0, vy: 0, vp: 0, ey: null, ep: null, jy: 0, jp: 0, jr: 0, jvy: 0, jvp: 0, jvr: 0, swR: 0, swY: 0, svR: 0, svY: 0,
  lid: 0, lidB: 0, out: 0, fade: null, nextFade: 9, pend: -1, spike: 0, heat: 0, drift: 0, driftT: 0, driftLen: 0, nextDrift: 6, closeT: 0, t: 0, hitN: 0 };
game.cameraOffset = { yaw: 0, pitch: 0, roll: 0 };
window.__pe = function(){ return { lid: PE.lid, lidB: PE.lidB, out: PE.out, closure: closure(), phase: PE.fade ? PE.fade.ph : null, depth: PE.fade ? PE.fade.depth : 0, w: PE.w, red: post ? post.u.lidRed.value : 0, heat: PE.heat, drift: PE.drift, closeT: PE.closeT }; };   // verification readout
function closure(){ return Math.min(1, PE.lid + PE.lidB); }                                   // fraction of the screen behind the lids
game.heroClosure = closure;                                                                      // engine consciousness gate (tuning.fairness.outGate)   // verification readout
var _ld = new V();
function wrapA(a){ while(a > Math.PI) a -= 2 * Math.PI; while(a < -Math.PI) a += 2 * Math.PI; return a; }
function pseudo(k){ var x = Math.sin(k * 12.9898 + PE.hitN * 78.233) * 43758.5453; return x - Math.floor(x); }
function patientStep(dt){ if(dt <= 0) return; PE.t += dt; var st = game.state(), m = st.mode, cole = m !== 'FREE_FOOT', dmg = 1 - st.health / 100, O = game.cameraOffset, t = PE.t;
  // --- engine look (pre-offset) as yaw/pitch; an under-damped spring follows it: lag + ~15% overshoot + settle
  if(m === 'FREE_FOOT' && game.foot) _ld.copy(game.foot.fwd); else _ld.copy(game.rail.lookDir);
  var ey = Math.atan2(-_ld.x, -_ld.z), ep = Math.asin(HE.clamp(_ld.y, -1, 1));
  if(PE.ey === null || Math.abs(wrapA(ey - PE.ey)) > 1.2 || PE.seg !== st.segment){ PE.sy = ey; PE.sp = ep; PE.vy = PE.vp = 0; PE.jy = PE.jp = PE.jr = PE.jvy = PE.jvp = PE.jvr = 0; PE.swR = PE.swY = PE.svR = PE.svY = 0; PE.seg = st.segment; }   // segment cut: no whip-pan
  PE.ey = ey; PE.ep = ep; var out = PE.out, w = (cole ? 6.5 - dmg * 2 : 9) * (1 - 0.72 * out), z = 0.5 + 0.25 * out; PE.w = w;   // slack neck while he's going/gone out
  PE.vy += (w * w * wrapA(ey - PE.sy) - 2 * z * w * PE.vy) * dt; PE.sy = wrapA(PE.sy + PE.vy * dt);
  PE.vp += (w * w * (ep - PE.sp) - 2 * z * w * PE.vp) * dt; PE.sp += PE.vp * dt;
  // --- weak neck: incommensurate wobble + drift, a hunch that deepens with damage
  var amb = m === 'AMBULANCE', A0 = cole ? (0.007 + dmg * 0.022) * (amb ? 1.7 : 1) * (1 + 1.6 * out) : 0.002;
  var wy = A0 * (Math.sin(t * 0.91) + 0.6 * Math.sin(t * 2.33 + 1.0) + 0.3 * Math.sin(t * 4.07 + 2.2));
  var wp = A0 * 0.8 * (Math.sin(t * 1.13 + 2.0) + 0.5 * Math.sin(t * 2.87 + 0.4));
  var wr = A0 * 0.9 * (Math.sin(t * 0.67 + 0.5) + 0.4 * Math.sin(t * 1.93 + 1.7));
  var hunch = cole && m !== 'CUTSCENE' ? -(0.022 + dmg * 0.05) - out * 0.17 : 0, sag = cole ? out * 0.1 * (PE.fade ? PE.fade.side : 1) : 0;   // the head drops + tips as he goes
  // --- hit jolt: an impulse, then an over-damped, slower-when-hurt re-centre
  var jw = 4.2 - dmg * 2.4, jz = 1.15;
  PE.jvy += (-jw * jw * PE.jy - 2 * jz * jw * PE.jvy) * dt; PE.jy += PE.jvy * dt;
  PE.jvp += (-jw * jw * PE.jp - 2 * jz * jw * PE.jvp) * dt; PE.jp += PE.jvp * dt;
  PE.jvr += (-jw * jw * PE.jr - 2 * jz * jw * PE.jvr) * dt; PE.jr += PE.jvr * dt;
  // --- ambulance: the head rolls and lags WITH the vehicle (path yaw rate x speed), sloshy spring, scaled by damage
  var tgR = 0, tgY = 0;
  if(amb && game.rail.path){ var pth = game.rail.path, sp0 = game.rail.speed(), t1 = pth.tangentAtS(game.rail.s), t2 = pth.tangentAtS(game.rail.s + 4);
    var rate = wrapA(Math.atan2(-t2.x, -t2.z) - Math.atan2(-t1.x, -t1.z)) / 4 * sp0;                       // rad/s of vehicle yaw
    var k = 1 + dmg * 1.5; tgR = HE.clamp(-rate * 0.3 * k, -0.12, 0.12); tgY = HE.clamp(-rate * 0.16 * k, -0.07, 0.07);
    var woozy = (0.01 + dmg * 0.02) * Math.min(1, sp0 / 12); tgR += woozy * Math.sin(t * 0.53 + 0.3); tgY += woozy * 0.7 * Math.sin(t * 0.41 + 1.1); }
  var sw = 2.4, sz = 0.6; PE.svR += (sw * sw * (tgR - PE.swR) - 2 * sz * sw * PE.svR) * dt; PE.swR += PE.svR * dt; PE.svY += (sw * sw * (tgY - PE.swY) - 2 * sz * sw * PE.svY) * dt; PE.swY += PE.svY * dt;
  O.yaw = (cole ? wrapA(PE.sy - ey) : 0) + wy + PE.jy + PE.swY; O.pitch = (cole ? PE.sp - ep : 0) + wp + hunch + PE.jp; O.roll = wr + PE.jr + PE.swR + sag;
  if(m === 'CUTSCENE'){ O.yaw *= 0.4; O.pitch = O.pitch * 0.4; O.roll *= 0.4; }
  // --- establishing shots (presentation only; the rig, speeds and timings are untouched): the bed push opens pulled back
  // behind Maya so her hands on the push bar read, then dollies into the play framing by 3.4 s (first wave ~5.7 s); the
  // ambulance opens outside the open rear doors on Cole braced on the bay floor, then cuts to the bay at 1.9 s.
  estK = 0; O.pos = O.pos || new V(); O.pos.set(0, 0, 0); var sT = game.segT, rp = game.rail.path;
  if(PT && PT.ready && rp && st.segment === 'bed_hall_push' && sT < 3.4){ var e0 = HE.clamp((sT - 1.9) / 1.5, 0, 1); estK = 1 - e0 * e0 * (3 - 2 * e0);
    var tt = fwdOf(rp, game.rail.s); O.pos.addScaledVector(tt, -1.35 * estK).add(new V(-tt.z, 0, tt.x).multiplyScalar(-0.4 * estK)); O.pos.y += 0.3 * estK; O.pitch += -0.06 * estK; }
  else if(PT && PT.ready && rp && st.segment === 'steal_staging' && sT < 1.9){ estK = 1; BAY_CAM_Z = -(rp.def.bayOffset == null ? 1.9 : rp.def.bayOffset); var ta = rp.tangentAtS(game.rail.s); ta.y = 0; ta.normalize();
    O.pos.addScaledVector(ta, -4.85 - BAY_CAM_Z).add(new V(ta.z, 0, -ta.x).multiplyScalar(0.2)); O.pos.y += 0.85; O.yaw = Math.PI; O.pitch = -0.33; O.roll = 0; }   // the repainted braced Cole's own viewpoint: standing eye height (~1.6 m above the bay floor he sits on), ~20° down
  else if(rp && st.segment === 'elevator_ride' && game.rail.pathT() > 0.85){ var rk = HE.clamp((game.rail.pathT() - 0.85) / 0.08, 0, 1); estK = rk * rk * (3 - 2 * rk); O.yaw += 0.22 * estK; O.pitch += -0.05 * estK; }   // defect 7: once the chair is inside the car (pathT > 0.85 — never during the el_up lobby fight), turn the view to the occupants (Maya at the chair's side + the chair itself) instead of staring at the car doors; the segment cut to the ground doors ends it
  // --- eyelids: base coverage by health + droop under sustained fire (FLOOR RULE <= 30%/lid), plus ONE lid system on top: CONSCIOUSNESS.
  // No blinks. Fades are driven by hurt (deeper, longer, more often as HP falls) and spike after heavy hits: heavy slow onset -> hold ->
  // uneven swim back (re-dips). At full depth he is OUT: lids meet, black, muffled. The engine deals no damage while closure >= outGate.
  PE.heat = Math.max(0, PE.heat - dt * 0.28);
  var base = cole ? 0.03 + 0.26 * Math.pow(dmg, 1.15) : 0, droop = Math.min(0.14, PE.heat * 0.1), cover = Math.min(0.3, base + droop);
  if(cole && !st.lost){
    if(!PE.fade && dmg > 0.12 && m !== 'CUTSCENE' && estK === 0){ PE.nextFade -= dt; if(PE.nextFade <= 0) fadeStart(dmg, 0); }
    if(PE.pend >= 0){ PE.pend -= dt; if(PE.pend < 0 && m !== 'CUTSCENE') fadeStart(dmg, PE.spike); }
    if(PE.fade) fadeStep(dt, dmg); }
  else if(!cole){ PE.fade = null; PE.pend = -1; PE.out = Math.max(0, PE.out - dt * 2); }
  if(st.lost){ PE.fade = null; PE.closeT = Math.min(1, PE.closeT + dt / 1.6); var e = PE.closeT * PE.closeT * (3 - 2 * PE.closeT); PE.out = Math.max(PE.out, e); }   // the fade that doesn't come back
  else PE.closeT = 0;
  PE.cover = cover; PE.lid = cover + PE.out * (0.56 - cover); PE.lidB = PE.lid * (0.82 + 0.18 * PE.out); updateVisibleZone(st);
  muffle(PE.out);
  // --- focus drift episodes: longer + more frequent out-of-focus stretches with damage
  PE.nextDrift -= dt; if(cole && PE.nextDrift <= 0 && PE.driftT <= 0){ PE.driftLen = 1.0 + dmg * 3.2; PE.driftT = PE.driftLen; PE.nextDrift = (9 - dmg * 6.5) * (0.6 + 0.8 * pseudo(t + 3)); }
  if(PE.driftT > 0){ PE.driftT -= dt; var dk = 1 - Math.abs(1 - 2 * (1 - PE.driftT / PE.driftLen)); PE.drift = Math.max(0, dk) * (0.35 + dmg * 0.65); } else PE.drift = Math.max(0, PE.drift - dt);
}
function patientHit(n){ PE.hitN++; var sgn = pseudo(PE.t + 7) < 0.5 ? -1 : 1, k = Math.min(2, n / 4.5) * (game.mode === 'AMBULANCE' ? 0.55 : 1);
  PE.jvy += sgn * 0.85 * k; PE.jvp += 0.65 * k; PE.jvr += -sgn * 0.75 * k; PE.heat = Math.min(3, PE.heat + n / 9);
  var dmg = 1 - game.combat.health / 100, heavy = (n / 5) * (0.45 + 1.6 * dmg) + Math.max(0, PE.heat - 0.8) * 0.6;   // how hard this one hits HIM, now
  if(game.mode !== 'FREE_FOOT' && heavy > 0.85 && PE.pend < 0){ PE.pend = 0.22 + 0.25 * pseudo(PE.t + 2); PE.spike = Math.min(0.4, (heavy - 0.85) * 0.5 + 0.12); } }   // a fade spike, after the hit
// one consciousness episode. depth 0..1 (1 = OUT). Starts from wherever he is (a spike during a swim-back drags him back under).
function fadeStart(dmg, spike){ var d = HE.clamp(0.16 + 0.92 * Math.pow(dmg, 1.25) + spike, 0.12, 1); if(PE.fade && PE.fade.ph !== 'swim' && PE.fade.depth >= d) return;
  PE.fade = { ph: 'on', t: 0, from: PE.out, depth: d, on: 0.75 + 0.95 * d, hold: 0.12 + 0.75 * d * d, swim: 1.1 + 2.1 * d, side: pseudo(PE.t + 5) < 0.5 ? -1 : 1, ph0: pseudo(PE.t + 9) * 6.28 };
  PE.spike = 0; }
function fadeStep(dt, dmg){ var F = PE.fade; F.t += dt;
  if(F.ph === 'on'){ var u = Math.min(1, F.t / F.on), e = u * u * u * (u * (6 * u - 15) + 10); PE.out = F.from + (F.depth - F.from) * Math.pow(e, 1.35); if(u >= 1){ F.ph = 'hold'; F.t = 0; } }   // heavy + slow
  else if(F.ph === 'hold'){ PE.out = F.depth >= 0.99 ? 1 : F.depth - 0.05 * F.depth * Math.abs(Math.sin(F.t * 5.3 + F.ph0)); if(F.t >= F.hold){ F.ph = 'swim'; F.t = 0; } }
  else { var p = Math.min(1, F.t / F.swim), back = Math.pow(1 - p, 1.5), dip = 0.3 * F.depth * Math.pow(Math.max(0, Math.sin(p * Math.PI * 3 + F.ph0)), 2) * 4 * p * (1 - p) * (1 - p);   // uneven: surfaces, sinks a little, surfaces
    PE.out = Math.max(0, F.depth * back + dip); if(p >= 1){ PE.fade = null; PE.out = 0; PE.nextFade = (15 - 10 * dmg) * (0.7 + 0.6 * pseudo(PE.t + 11)); } } }
// muffled hearing while he's going out: a master low-pass + duck
var muffleF = null, muffleLast = -1;
function muffle(out){ if(!AC || !master) return; if(!muffleF){ muffleF = AC.createBiquadFilter(); muffleF.type = 'lowpass'; muffleF.Q.value = 0.9; master.disconnect(); master.connect(muffleF); muffleF.connect(AC.destination); }
  if(Math.abs(out - muffleLast) < 0.01) return; muffleLast = out; var t = AC.currentTime;
  muffleF.frequency.setTargetAtTime(300 + 17700 * Math.pow(1 - out, 3), t, 0.05); master.gain.setTargetAtTime(0.55 * (1 - 0.55 * out), t, 0.05); }

// ------------------------------------------------------------------ FAIRNESS hooks (OPUS-FIX-FAIRNESS-PACE §1): what the player can actually see
// visibleZone = the screen minus the eyelids (health + droop + consciousness fade; there are no blinks) and the near-death tunnel, 0..1 screen coords
// losBlocked  = a ray from the camera to the shooter is blocked by scenery, furniture, cover or another character (glass does not block)
var losRay = new THREE.Raycaster(), losList = null;
function occluders(){ if(!losList) losList = []; losList.length = 0; worldRoot.children.forEach(function(o){ losList.push(o); });
  game.extraOccluders.forEach(function(o){ losList.push(o); }); [cole, maya, bed, chair, amb, hale].forEach(function(o){ if(o.visible) losList.push(o); });
  Object.keys(gb.actors).forEach(function(k){ losList.push(gb.actors[k]); }); return losList; }
game.losBlocked = function(from, to, selfRole){ var d = to.clone().sub(from), L = d.length(); losRay.set(from, d.normalize()); losRay.near = 0.05; losRay.far = Math.max(0.1, L - 0.45);
  var hits = losRay.intersectObjects(occluders(), true);
  for(var i = 0; i < hits.length; i++){ var o = hits[i].object; if(o.material && !o.userData.solid && (o.material.transparent || o.material.opacity < 0.9)) continue; if(o.isSprite) continue;
    var r = o; while(r && r.parent && r.parent !== scene && !r.name) r = r.parent; if(r && r.name === selfRole) continue; var self = false; for(var q = o; q; q = q.parent) if(q.name === selfRole){ self = true; break; } if(self) continue;
    return true; } return false; };
function updateVisibleZone(st){ var Z = game.visibleZone || (game.visibleZone = { x0: 0, x1: 1, y0: 0, y1: 1 }); if(st.mode === 'FREE_FOOT'){ Z.x0 = 0; Z.x1 = 1; Z.y0 = 0; Z.y1 = 1; return; }
  var tun = st.feedback.wash * 0.12; Z.y0 = PE.lid + tun; Z.y1 = 1 - PE.lidB - tun; Z.x0 = tun; Z.x1 = 1 - tun; }
// ------------------------------------------------------------------ engine events -> FX / HUD
var logIdx = 0;
function processEvents(){ var L = game._log; for(; logIdx < L.length; logIdx++){ var e = L[logIdx], d = e.data;
  if(e.type === 'shot' && HC){ HC.onShot(d.point); if(game.mode === 'FREE_FOOT') mayaFireQ = true; }
  if(e.type === 'shot'){ var gunner = game.mode === 'FREE_FOOT' ? maya : cole, mz = (gunner === cole && (coleHidden || coleGunFG)) ? fgMuzzle(new V()) : ((gunner === maya && HC && HC.mayaMuzzle(new V())) || A.muzzleWorld(gunner, new V()) || camera.position.clone()); muzzle(mz, d.weapon === 'machine_pistol'); sfx.shot(d.weapon === 'machine_pistol');
    var end = d.point ? new V().fromArray(d.point) : mz.clone().addScaledVector(aimRay(), 40); tracer(mz, end, 0xffe2a0, 0.06, 0.03); if(d.point){ sparks(end, d.hit ? 3 : 6); } }
  else if(e.type === 'partnerShot'){ var en = game.combat.byRole(d.role); if(en){ mayaTarget.copy(en.pos).setY(en.pos.y + 1.3); } mayaFireT = 0.45; mayaFireQ = true; var mm = (HC && HC.mayaMuzzle(new V())) || A.muzzleWorld(maya, new V()); if(mm){ muzzle(mm); tracer(mm, new V().fromArray(d.to), 0xffd080, 0.07, 0.03); } sfx.shot(false); }
  else if(e.type === 'enemyShot' && gb.actors[d.role] && gb.actors[d.role].userData.c3){ var s3 = gb.actors[d.role]; HC.onFire(s3); var m3 = HC.muzzle(s3, new V()); addFlight(Object.assign({}, d, { from: m3.toArray() })); muzzle(m3, true); sprite(TX.flash, m3, 0.9, 0.06); sfx.enemy(d.red); mayaNear(d); }   // INTEGRATION: the round leaves the seated pistol's barrel
  else if(e.type === 'enemyShot'){ var src = gb.actors[d.role]; mayaNear(d);
    var en3 = game.combat.byRole(d.role), fl = null, br = null; if(src && src.userData.painted && en3 && !src.userData.dead){ src.userData.fireT = 0.14; src.userData.flinchT = 0; paintEnemy(en3, src, 0);   // fire frame NOW, so the flash anchors on it
      fl = PT.muzzle(src, new V(), true); br = PT.muzzle(src, new V(), false); }
    if(fl && br){ paintLight.position.copy(fl); paintLight.intensity = 3.2; paintLightT = 0.07;   // 70 ms warm spill (MANIFEST §5)
      sprite(TX.flash, fl, 0.55, 0.06); addFlight(Object.assign({}, d, { from: br.toArray() })); sfx.enemy(d.red); }                            // the telegraph leaves the painted barrel
    else { addFlight(d); var mz2 = src ? (A.muzzleWorld(src, new V()) || new V().fromArray(d.from)) : new V().fromArray(d.from); muzzle(mz2, true); sprite(TX.flash, mz2, 1.3, 0.07); sfx.enemy(d.red); } }
  else if(e.type === 'hit' && HC && gb.actors[d.role] && gb.actors[d.role].userData.c3){ HC.onHit(gb.actors[d.role], d.by === 'partner'); }
  else if(e.type === 'hit'){ var ho = gb.actors[d.role]; if(ho && d.hp > 0) ho.userData.flinchT = 0.24 + (ho.userData.fireT || 0); }   /* a hit mid-shot flinches right after the fire frame */
  else if(e.type === 'heroHit'){ patientHit(d.n || 5); }
  else if(e.type === 'shotLand'){ var p = new V().fromArray(d.at); sparks(p, d.hit ? 4 : 7); sfx.impact(); if(d.hit){ sprite(TX.red, p, 0.9, 0.18); sfx.hurt(); } }
  else if(e.type === 'hitmarker'){ var hm = $('hm'); hm.style.left = d.x * innerWidth + 'px'; hm.style.top = d.y * innerHeight + 'px'; hm.style.opacity = 1; }
  else if(e.type === 'kill'){ var o = gb.actors[d.role]; if(o && d.points){ var pp = project(o.position.clone().setY(o.position.y + 1.9)); popup('+' + d.points, pp.x, pp.y, d.quick ? 'quick' : ''); if(d.quick) popup('QUICK DRAW', pp.x, pp.y - 26, 'quick'); } }
  else if(e.type === 'bystanderHit'){ showBanner('CIVILIAN HIT   −' + d.penalty, 'penalty', 1800); $('flash').className = 'on'; setTimeout(function(){ $('flash').className = ''; }, 140); sfx.penalty(); }
  else if(e.type === 'spawn' && d.role.indexOf('enemy:') === 0){ var en2 = game.combat.byRole(d.role); if(en2) W.openDoorNear(en2.pos, 2.8); }
  else if(e.type === 'pursuer'){ var c = gb.actors['pursuer:' + d.id]; var pz = game.chase.list.filter(function(x){ return x.id === d.id; })[0]; if(pz && d.outcome) pz.outcome = d.outcome;
    if(c){ if(d.to === 'crippled:engine'){ c.userData.smoke = true; } if(d.to === 'crippled:tire' || d.to === 'crippled:driver'){ c.userData.smoke = true; } if(d.to === 'wrecked'){ var pp2 = project(c.position.clone().setY(2)); if(d.points) popup('+' + d.points, pp2.x, pp2.y, 'quick'); sfx.boom(); } } }
  else if(e.type === 'burn'){ var c2 = gb.actors['pursuer:' + d.id]; if(c2 && d.stage === 'fire'){ c2.userData.fire = true; sfx.boom(); } }
  else if(e.type === 'beat'){ clearFlights(); if(d.beat === 'elevator') {} }
  else if(e.type === 'segment'){ clearFlights(); if(d.segment === 'elevator_doors_ground') sfx.ding(); }
  else if(e.type === 'win'){ showBanner('THEY\'RE CUT OFF', 'title', 2600); }
  else if(e.type === 'pickup'){ showBanner('MACHINE PISTOL', 'title', 1400); } } }
// ------------------------------------------------------------------ HUD render
function hud(){ var s = game.state(), f = s.feedback, m = s.mode;
  var pe = post && post.enabled && Q.get('post') !== '0'; $('vig').style.opacity = pe ? 0 : f.vignette; $('wash').style.opacity = pe ? 0 : f.wash;   /* patient eyes: the lids + post carry damage */
  $('hm').style.opacity = Math.max(0, (+$('hm').style.opacity || 0) - 0.07);   // the hit marker fades over ~0.25 s (was swallowed by a trailing comment since 014aaeb: it never cleared)
  var showGun = started && m && m !== 'CUTSCENE' && !s.lost && !s.ended; $('ret').style.display = showGun ? 'block' : 'none'; $('ret').style.left = inp.aim.x * innerWidth + 'px'; $('ret').style.top = inp.aim.y * innerHeight + 'px';
  fireBtn.style.display = showGun ? 'flex' : 'none'; var W0 = HE.DATA.tuning.weapons[s.ammo.weapon], low = s.ammo.mag <= W0.mag * 0.3 || game.combat.reloadT > 0; $('reload').style.display = showGun && (m === 'FREE_FOOT' || low) ? 'flex' : 'none'; $('reload').textContent = game.combat.reloadT > 0 ? '···' : 'RELOAD';
  $('full').style.display = m === 'FREE_FOOT' && showGun ? 'flex' : 'none';     // the full HUD exists only in the on-foot segment
  if(m === 'FREE_FOOT'){ $('hpbar').style.width = s.health + '%'; $('hpbar').style.background = s.nearDeath ? '#c9d84a' : '#f2f2ee'; $('ammo').textContent = s.ammo.mag + ' / ∞'; $('score').textContent = s.score; }
  $('sub').innerHTML = s.subtitle ? '<b>' + ({ HERO: 'COLE', FRIEND: 'MAYA' }[s.subtitle.speaker] || s.subtitle.speaker.replace(/^NPC:/, '').toUpperCase()) + '</b> ' + s.subtitle.text.replace(/</g, '&lt;') : '';
  if(s.lost && PE.closeT >= 0.95){ $('cardTitle').textContent = 'COLE IS DOWN'; $('cardBody').textContent = 'Every hit you took was a red shot first. Watch for the red.'; $('cardBtn').textContent = 'RETRY THIS BEAT'; $('card').style.display = 'flex'; }
  else if(s.ended && $('card').style.display !== 'flex'){ $('cardTitle').textContent = 'OUT. NOTHING IN THE MIRRORS.'; $('cardBody').innerHTML = 'Score <b>' + s.score + '</b> · Accuracy <b>' + Math.round(s.accuracy * 100) + '%</b><br>Staff & patients spared <b>' + s.bystanders.spared + '</b> · hit <b>' + s.bystanders.hit + '</b><br><small>Level 1 — St. Mercer Memorial</small>'; $('cardBtn').textContent = 'RUN IT AGAIN'; $('card').style.display = 'flex'; }
  var chasing = s.pursuers.some(function(p){ return p.state === 'pursuing' && p.kind !== 'suv'; }); sfx.siren(chasing && !s.won); }
// ------------------------------------------------------------------ loop
var acc = 0, last = performance.now(), DT = 1 / 60;
function frame(now){ acc += Math.min(0.1, (now - last) / 1000); last = now;
  if(started && !paused){ if(game.mode === 'FREE_FOOT'){ var gi = getInput(); if(!auto){ inp.move.x = gi.x; inp.move.y = gi.y; } }
    while(acc >= DT){ if(auto) HE.autopilot(game); game.step(DT); acc -= DT; processEvents(); present(DT); } }
  else { acc = 0; present(0); }
  sky.position.copy(camera.position); hud(); var sh = game.state().feedback.shake * 0.05, ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh; camera.position.x += ox; camera.position.y += oy;
  if(post && post.enabled && Q.get('post') !== '0'){ tunePost(); post.render(tAnim); } else renderer.render(scene, camera);
  camera.position.x -= ox; camera.position.y -= oy; requestAnimationFrame(frame); }
// what the wounded eye focuses on: the nearest threat in view (enemy / pursuer), else the corridor ahead
var focusS = 8, kick = 0, lastHp = 100;
// BEAUTY PASS A1: per-segment exposure (was one binary indoor 0.72 / outdoor 0.62). Every value sits within
// +/-0.06 of its binary base and none goes under the old outdoor floor 0.62; placed from the fixed-baseline
// luminance survey so Room 412, the corridors, cafeteria and lobby sit on one night grade and the dark
// outdoor beats (steal mean luma 33/255 vs indoor 63-75) lift toward the same movie.
var EXPO = { visit_room: 0.70, bed_hall_push: 0.74, transfer_cut: 0.72, transfer_chair_corridor: 0.72, elevator_ride: 0.72, elevator_doors_ground: 0.72,
  gauntlet_halls: 0.73, gauntlet_cafeteria: 0.73, gauntlet_ward_on_foot: 0.72, gauntlet_waiting_room: 0.72, entrance_holdout: 0.76, entrance_exit_push: 0.72,
  steal_cut: 0.66, steal_staging: 0.68, chase_harbor_ave: 0.66, finale_line9_crossing: 0.66 };
var COMBAT_SEG = { bed_hall_push: 1, transfer_chair_corridor: 1, elevator_doors_ground: 1, gauntlet_halls: 1, gauntlet_cafeteria: 1, gauntlet_ward_on_foot: 1, gauntlet_waiting_room: 1, entrance_holdout: 1, entrance_exit_push: 1 };
function tunePost(){ var u = post.u, s = game.state(), f = s.feedback, m = s.mode, cam = camera.position, best = 1e9;
  game.combat.live().forEach(function(e){ var d = e.pos.distanceTo(cam); if(d < best) best = d; }); game.chase.list.forEach(function(p){ if(p.state === 'pursuing'){ var o = gb.actors[p.role]; if(o){ var d = o.position.distanceTo(cam); if(d < best) best = d; } } });
  var want = best < 1e8 ? best : (m === 'AMBULANCE' ? 16 : m === 'CUTSCENE' ? 3.2 : 8); focusS += (want - focusS) * 0.06;
  if(s.health < lastHp) kick = 1; lastHp = s.health; kick = Math.max(0, kick - 0.04);
  u.focus.value = focusS; u.nearBlur.value = m === 'CUTSCENE' ? 3 : m === 'AMBULANCE' ? 7 : 8; u.farBlur.value = outdoor ? 3.5 : (COMBAT_SEG[s.segment] ? 5.0 : 4.5);   // BEAUTY PASS A3: combat-segment farBlur cap 5.0 (was flat 4.5; 5.5 was tried and pushed the 20 m+ shooters toward mush in dof-check — 5.0 is the cap where the farthest scripted shooter still reads at 390x844); fairness-gated, first to revert
  u.hurt.value = HE.clamp((f.vignette - 0.2) * 1.3 + kick * 0.6, 0, 1.2); u.dying.value = f.wash; u.kick.value = kick;
  u.exposure.value = EXPO[s.segment] != null ? EXPO[s.segment] : (outdoor ? 0.62 : 0.72); var foot = m === 'FREE_FOOT';
  u.lidTop.value = PE.lid; u.lidBot.value = PE.lidB; u.lidRed.value = HE.clamp(PE.heat * 0.55, 0, 1) * (1 - PE.out);   /* going out = black */ u.drift.value = PE.drift; u.tunnel.value = f.wash;
  if(foot){ u.soft.value = 0.6; u.edge.value = 3; } u.soft.value = 1.25; u.edge.value = 6.5; if(m === 'FREE_FOOT'){ u.soft.value = 0.6; u.edge.value = 3; } sky.material.uniforms.time.value = tAnim;
  var fl = outdoor && (Math.sin(tAnim * 0.37) > 0.995 || Math.sin(tAnim * 0.53 + 1) > 0.997) ? 1 : 0; sky.material.uniforms.flash.value += (fl - sky.material.uniforms.flash.value) * 0.3; }
game.gotoBeat(Q.get('beat') || 'visit'); requestAnimationFrame(frame);
})();
