/* Hospital Escape — the shipped game: engine (../engine) + Level 1 data + art/world, presentation, HUD, input, audio.
   Everything the player sees is driven by engine state + the engine's event log (shots, hits, kills, red shots,
   pursuer outcomes, train). Contract v1 / he-dbg-1 untouched; additions are listed in tasking/responses/opus-full.md. */
(function(){
'use strict';
var A = window.HEART, W = window.HEWORLD, V = THREE.Vector3, Q = new URLSearchParams(location.search);
var $ = function(id){ return document.getElementById(id); };
// ------------------------------------------------------------------ engine + world
var game = HE.install(HE.createGame({ seed: +Q.get('seed') || 1 })), scene = game.scene, camera = game.camera, inp = game.input;
scene.children.filter(function(o){ return o.isLight; }).forEach(function(l){ scene.remove(l); });
var hemi = new THREE.HemisphereLight(0xf2f7ff, 0x6b665c, 0.95), sun = new THREE.DirectionalLight(0xffffff, 0.45); sun.position.set(20, 40, 10); scene.add(hemi); scene.add(sun); scene.add(sun.target);
var flashLight = new THREE.PointLight(0xffd59a, 0, 7, 2); scene.add(flashLight);
var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.LinearEncoding; renderer.toneMapping = THREE.NoToneMapping;   /* HDR scene target; ACES + sRGB happen in the post composite */ $('game').appendChild(renderer.domElement);
function resize(){ renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); } addEventListener('resize', resize); resize();
W.build(scene, HE.DATA);
var post = window.HEPOST ? HEPOST.create(renderer, scene, camera) : null; window.__post = post; window.__renderer = renderer;
scene.traverse(function(o){ if(o.material && o.material.map === A.tex.lightPanel){ o.material.color.setRGB(3.2, 3.3, 3.5); } });   // HDR ceiling panels -> bloom
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
var gb = game.greybox; gb.showVehicle = function(){}; Object.keys(gb.vehicles).forEach(function(k){ gb.vehicles[k].visible = false; });
var nEnemy = 0;
gb.addActor = function(role, kind){ var p;
  if(kind === 'bystander'){ var b = game.bystanders.list.filter(function(x){ return x.role === role; })[0]; p = A.cast.bystander(b ? b.def.kind : 'nurse', nEnemy++); }
  else p = (A.cast[kind] || A.cast.gunman)(nEnemy++);
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
function placeTrain(t){ var ci = W.crossingInfo; if(!ci || !train) return; var ap = HE.DATA.tuning.trainApproach, x = Math.min((t - ap) * 32, 75); train.position.copy(ci.pos).addScaledVector(ci.along, x); train.lookAt(train.position.clone().add(ci.along)); }
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
  flashLight.intensity = Math.max(0, flashLight.intensity - dt * 30); }
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
var aimDrag = null, stick = null, keys = {}, started = false, auto = Q.get('auto') === '1', lastMode = null, score = 0, banner = null;
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
window.__game = { game: game, start: function(beat){ $('start').style.display = 'none'; started = true; game.gotoBeat(beat || 'visit'); }, ff: function(secs, ap){ var n = Math.round(secs * 60); for(var i = 0; i < n && !game.ended && !game.lost; i++){ if(ap) HE.autopilot(game); game.step(1 / 60); present(1 / 60); } } };
if(Q.get('autostart') === '1'){ $('start').style.display = 'none'; started = true; game.gotoBeat(Q.get('beat') || 'visit'); }
// ------------------------------------------------------------------ per-mode presentation
var BEAT_TITLES = { visit: '1 · ROOM 412', bed_push: '2 · THE BED', transfer: '3 · THE TRANSFER', elevator: '4 · GOING DOWN', gauntlet: '5 · THE GAUNTLET', entrance: '6 · THE FRONT DOORS', steal: '7 · THE AMBULANCE', chase: '8 · HARBOR AVENUE', train_finale: '9 · THE LINE 9 CROSSING' };
var outdoor = false, tAnim = 0, lastBeat = null, coleAim = new V(0, 0, -1), mayaFireT = 0, mayaTarget = new V(), bedParked = null, chairParked = null, ambParked = null;
// night hospital (dim, cold ambient; the ceiling panels and pools carry the light) / storm dusk outside
function setOutdoor(on){ if(on === outdoor) return; outdoor = on; if(on){ scene.fog = new THREE.Fog(0x2b3440, 35, 300); hemi.color.set(0x7f93b0); hemi.groundColor.set(0x1d1a19); hemi.intensity = 0.45; sun.color.set(0xa8b8d8); sun.intensity = 0.55; sun.position.set(-60, 50, 40); sky.visible = true; }
  else { scene.fog = new THREE.Fog(0x1c2328, 14, 60); hemi.color.set(0xb9c9d6); hemi.groundColor.set(0x3a342e); hemi.intensity = 0.48; sun.color.set(0xdfe8ff); sun.intensity = 0.18; sun.position.set(20, 40, 10); sky.visible = false; } }
setOutdoor(true); setOutdoor(false);
function placeOnPath(o, path, s, off){ var p = path.pointAtS(s), t = fwdOf(path, s); o.position.copy(p); if(off) o.position.add(off); yawTo(o, t); return t; }
function present(dt){ tAnim += dt; var st = game.state(), r = game.rail, m = st.mode, seg = st.segment || '';
  if(st.beat !== lastBeat){ lastBeat = st.beat; if(started) showBanner(BEAT_TITLES[st.beat] || st.beat, 'title', 2200); }
  setOutdoor(st.beat === 'steal' && seg !== 'steal_cut' || st.beat === 'chase' || st.beat === 'train_finale' || seg === 'steal_cut');
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
  game.combat.enemies.forEach(function(e){ var p = gb.actors[e.role]; if(!p) return; if(p.userData.dead){ p.userData.deadT += dt; A.pose(p, 'dead', 0); p.position.y = e.pos.y; return; }
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
  W.doors.forEach(function(d){ if(!d.elevator) return; if(seg === 'elevator_ride'){ if(d.floor === 'upper' && d.end === 0) d.target = r.pathT() < 0.86 ? 1 : 0; if(d.floor === 'ground') d.target = 0; }
    else if(seg === 'elevator_doors_ground'){ if(d.floor === 'ground' && d.end === 1) d.target = game.segT > 0.35 ? 1 : 0; } });
  W.update(dt, tAnim); stepFx(dt); stepFlights(); }
function stageCutscene(seg){ var r = game.rail;
  if(seg === 'visit_room'){ var bp = game.path('bed_hall'); placeOnPath(bed, bp, bp.lead - 0.25); bed.visible = true; var t = fwdOf(bp, bp.lead);
    cole.position.copy(bed.position).addScaledVector(t, 0.78); cole.position.y += 0.8; yawTo(cole, t); A.pose(cole, 'recline', tAnim); aimArm(cole, 'R', new V(0.5, -0.4, -0.3).normalize());
    maya.position.set(0.95, 0, -3.1); yawTo(maya, new V(-0.4, 0, -1)); A.pose(maya, 'talk', tAnim); hale.position.set(0.3, 0, -4.75); yawTo(hale, new V(0.45, 0, 1)); A.pose(hale, 'talk', tAnim + 1); chair.visible = false; }
  else if(seg === 'transfer_cut'){ var cp = game.path('chair_corridor'); chair.visible = true; placeOnPath(chair, cp, cp.lead); var tt = fwdOf(cp, cp.lead); cole.position.copy(chair.position); yawTo(cole, tt); A.pose(cole, 'sit', tAnim);
    maya.position.copy(chair.position).add(new V(-0.75, 0, 0.2)); yawTo(maya, new V(1, 0, -0.2)); A.pose(maya, 'push', tAnim); bed.visible = true; }
  else if(seg === 'steal_cut'){ var ap = game.path('bay_route'); placeOnPath(amb, ap, ap.lead); chair.visible = true; chair.position.set(58.6, -12, -177.2); chair.rotation.y = Math.PI; cole.position.copy(chair.position); yawTo(cole, new V(0, 0, -1)); A.pose(cole, 'sit', tAnim);
    maya.position.set(59.6, -12, -178.4); yawTo(maya, new V(-0.4, 0, -1)); A.pose(maya, 'walk', tAnim); bed.visible = false; } }
// ------------------------------------------------------------------ engine events -> FX / HUD
var logIdx = 0;
function processEvents(){ var L = game._log; for(; logIdx < L.length; logIdx++){ var e = L[logIdx], d = e.data;
  if(e.type === 'shot'){ var gunner = game.mode === 'FREE_FOOT' ? maya : cole, mz = A.muzzleWorld(gunner, new V()) || camera.position.clone(); muzzle(mz, d.weapon === 'machine_pistol'); sfx.shot(d.weapon === 'machine_pistol');
    var end = d.point ? new V().fromArray(d.point) : mz.clone().addScaledVector(aimRay(), 40); tracer(mz, end, 0xffe2a0, 0.06, 0.03); if(d.point){ sparks(end, d.hit ? 3 : 6); } }
  else if(e.type === 'partnerShot'){ var en = game.combat.byRole(d.role); if(en){ mayaTarget.copy(en.pos).setY(en.pos.y + 1.3); } mayaFireT = 0.45; var mm = A.muzzleWorld(maya, new V()); if(mm){ muzzle(mm); tracer(mm, new V().fromArray(d.to), 0xffd080, 0.07, 0.03); } sfx.shot(false); }
  else if(e.type === 'enemyShot'){ addFlight(d); var src = gb.actors[d.role], mz2 = src ? (A.muzzleWorld(src, new V()) || new V().fromArray(d.from)) : new V().fromArray(d.from); muzzle(mz2, true); sprite(TX.flash, mz2, 1.3, 0.07); sfx.enemy(d.red); }
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
  $('vig').style.opacity = f.vignette; $('wash').style.opacity = f.wash; $('hm').style.opacity = Math.max(0, (+$('hm').style.opacity || 0) - 0.07);
  var showGun = started && m && m !== 'CUTSCENE' && !s.lost && !s.ended; $('ret').style.display = showGun ? 'block' : 'none'; $('ret').style.left = inp.aim.x * innerWidth + 'px'; $('ret').style.top = inp.aim.y * innerHeight + 'px';
  fireBtn.style.display = showGun ? 'flex' : 'none'; var W0 = HE.DATA.tuning.weapons[s.ammo.weapon], low = s.ammo.mag <= W0.mag * 0.3 || game.combat.reloadT > 0; $('reload').style.display = showGun && (m === 'FREE_FOOT' || low) ? 'flex' : 'none'; $('reload').textContent = game.combat.reloadT > 0 ? '···' : 'RELOAD';
  $('full').style.display = m === 'FREE_FOOT' && showGun ? 'flex' : 'none';     // the full HUD exists only in the on-foot segment
  if(m === 'FREE_FOOT'){ $('hpbar').style.width = s.health + '%'; $('hpbar').style.background = s.nearDeath ? '#c9d84a' : '#f2f2ee'; $('ammo').textContent = s.ammo.mag + ' / ∞'; $('score').textContent = s.score; }
  $('sub').innerHTML = s.subtitle ? '<b>' + ({ HERO: 'COLE', FRIEND: 'MAYA' }[s.subtitle.speaker] || s.subtitle.speaker.replace(/^NPC:/, '').toUpperCase()) + '</b> ' + s.subtitle.text.replace(/</g, '&lt;') : '';
  if(s.lost){ $('cardTitle').textContent = 'COLE IS DOWN'; $('cardBody').textContent = 'Every hit you took was a red shot first. Watch for the red.'; $('cardBtn').textContent = 'RETRY THIS BEAT'; $('card').style.display = 'flex'; }
  else if(s.ended && $('card').style.display !== 'flex'){ $('cardTitle').textContent = 'OUT. NOTHING IN THE MIRRORS.'; $('cardBody').innerHTML = 'Score <b>' + s.score + '</b> · Accuracy <b>' + Math.round(s.accuracy * 100) + '%</b><br>Staff & patients spared <b>' + s.bystanders.spared + '</b> · hit <b>' + s.bystanders.hit + '</b><br><small>Level 1 — St. Mercer Memorial</small>'; $('cardBtn').textContent = 'RUN IT AGAIN'; $('card').style.display = 'flex'; }
  var chasing = s.pursuers.some(function(p){ return p.state === 'pursuing' && p.kind !== 'suv'; }); sfx.siren(chasing && !s.won); }
// ------------------------------------------------------------------ loop
var acc = 0, last = performance.now(), DT = 1 / 60;
function frame(now){ acc += Math.min(0.1, (now - last) / 1000); last = now;
  if(started){ if(game.mode === 'FREE_FOOT'){ var gi = getInput(); if(!auto){ inp.move.x = gi.x; inp.move.y = gi.y; } }
    while(acc >= DT){ if(auto) HE.autopilot(game); game.step(DT); acc -= DT; processEvents(); present(DT); } }
  else { acc = 0; present(0); }
  sky.position.copy(camera.position); hud(); var sh = game.state().feedback.shake * 0.05, ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh; camera.position.x += ox; camera.position.y += oy;
  if(post && post.enabled && Q.get('post') !== '0'){ tunePost(); post.render(tAnim); } else renderer.render(scene, camera);
  camera.position.x -= ox; camera.position.y -= oy; requestAnimationFrame(frame); }
// what the wounded eye focuses on: the nearest threat in view (enemy / pursuer), else the corridor ahead
var focusS = 8, kick = 0, lastHp = 100;
function tunePost(){ var u = post.u, s = game.state(), f = s.feedback, m = s.mode, cam = camera.position, best = 1e9;
  game.combat.live().forEach(function(e){ var d = e.pos.distanceTo(cam); if(d < best) best = d; }); game.chase.list.forEach(function(p){ if(p.state === 'pursuing'){ var o = gb.actors[p.role]; if(o){ var d = o.position.distanceTo(cam); if(d < best) best = d; } } });
  var want = best < 1e8 ? best : (m === 'AMBULANCE' ? 16 : m === 'CUTSCENE' ? 3.2 : 8); focusS += (want - focusS) * 0.06;
  if(s.health < lastHp) kick = 1; lastHp = s.health; kick = Math.max(0, kick - 0.04);
  u.focus.value = focusS; u.nearBlur.value = m === 'CUTSCENE' ? 3 : m === 'AMBULANCE' ? 7 : 8; u.farBlur.value = outdoor ? 3.5 : 4.5;
  u.hurt.value = HE.clamp((f.vignette - 0.2) * 1.3 + kick * 0.6, 0, 1.2); u.dying.value = f.wash; u.kick.value = kick;
  u.exposure.value = outdoor ? 0.62 : 0.72; u.soft.value = 1.25; u.edge.value = 6.5; sky.material.uniforms.time.value = tAnim;
  var fl = outdoor && (Math.sin(tAnim * 0.37) > 0.995 || Math.sin(tAnim * 0.53 + 1) > 0.997) ? 1 : 0; sky.material.uniforms.flash.value += (fl - sky.material.uniforms.flash.value) * 0.3; }
game.gotoBeat(Q.get('beat') || 'visit'); requestAnimationFrame(frame);
})();
