/* Hospital Escape — BAKE-OFF ENTRY C (Option 1, stock-asset route): ONE enemy — the first plain
   gunman spawned — rendered as a real 3D character instead of the painted billboard.
   Asset: Quaternius "Casual Character" (Ultimate Modular Men pack, via Poly Pizza), CC0.
   Reskinned dark (charcoal top, dark pants, black shoes) + a pistol prop bone-parented to Wrist.R.
   Clips kept: Walk / Run / Idle_Neutral / Idle_Gun / Idle_Gun_Pointing / Gun_Shoot / HitRecieve / Death.
   Driven entirely by the enemy's existing engine state + event log: no gameplay changes.
   ON with ?cast3d=1; the sample page sets window.__CAST3D_SAMPLE to default it on (?cast3d=0 opts out).
   Without the flag this file returns immediately and the game is byte-for-byte the shipped one.
   The GLB travels as gzip+base64 text chunks (game/gunman-data-*.js): the GitHub connector corrupts
   binary pushes, text survives. A real gunman.glb next to the page (assets/gunman3d/) wins if present. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var ON = Q.get('cast3d') === '1' || (Q.get('cast3d') === null && !!window.__CAST3D_SAMPLE);
if(!ON) return;
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, gb = G.greybox;
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }

// ------------------------------------------------------------------ asset
var model = { ready: false, scene: null, clips: {} };
function b64ToBytes(b64){ var bin = atob(b64), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function glbBytes(){
  return fetch('assets/gunman3d/gunman.glb').then(function(r){ if(!r.ok) throw 0; return r.arrayBuffer(); }).catch(function(){
    var parts = window.__GUNMAN_GZ_B64; if(!parts || !window.DecompressionStream) return null;
    var bytes = b64ToBytes(parts.join(''));
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  });
}
function withLoader(cb){ if(THREE.GLTFLoader) return cb();
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  s.onload = cb; s.onerror = function(){}; document.head.appendChild(s); }
withLoader(function(){ if(!THREE.GLTFLoader) return;
  glbBytes().then(function(buf){ if(!buf) return;
    new THREE.GLTFLoader().parse(buf, '', function(gltf){
      model.scene = gltf.scene;
      gltf.animations.forEach(function(c){ model.clips[c.name] = c; });
      model.scene.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false; } });
      model.ready = true; window.__cast3d = model;
      if(pending) attach(pending);
    }, function(){});
  }).catch(function(){});
});

// ------------------------------------------------------------------ marking + attach
var markedRole = null, pending = null, inst = null;
var _addActor = gb.addActor;
gb.addActor = function(role, kind){
  var p = _addActor.apply(this, arguments);
  if(!markedRole && kind === 'gunman' && !inst){ markedRole = role; p.userData.cast3dRole = role; pending = p;
    if(model.ready) attach(p); }
  return p;
};
var _removeActor = gb.removeActor;
gb.removeActor = function(role){ if(inst && inst.role === role) inst = null; if(pending && pending.name === role) pending = null;
  if(role === markedRole) markedRole = null;                       // beat restart respawns him under the same role: re-mark the next one
  return _removeActor.apply(this, arguments); };

function blobTex(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
  gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

function attach(p){
  if(!p.parent) { pending = null; markedRole = null; return; }        // he died before the model parsed: pass the role on
  var wrap = new THREE.Group(); wrap.name = 'cast3d';
  wrap.scale.setScalar(1.77 / 1.81);                                   // stock figure is 1.81 m; the painted gunman is 1.77 m
  wrap.add(model.scene);
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62),
    new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; sh.raycast = function(){}; wrap.add(sh);
  p.add(wrap);
  p.children.forEach(function(c){ if(c !== wrap) c.traverse(function(o){ o.layers.set(31); }); });   // procedural body + painted billboard off (render AND raycast)
  p.userData.pk = null;                                                // present() stops paintEnemy for him
  p.userData.painted = false;                                          // his shots take the procedural muzzle path (posed rig, co-located)
  var mixer = new THREE.AnimationMixer(model.scene), actions = {};
  Object.keys(model.clips).forEach(function(n){ actions[n] = mixer.clipAction(model.clips[n]); });
  inst = { role: p.userData.cast3dRole, p: p, wrap: wrap, mixer: mixer, actions: actions, cur: null,
           lastPos: p.position.clone(), logIdx: 0, fireT: 0, flinchT: 0, dead: false };
  play('Idle_Neutral', 0);
}
function play(name, fade){
  if(!inst || inst.cur === name) return; var a = inst.actions[name]; if(!a) return;
  var prev = inst.cur ? inst.actions[inst.cur] : null;
  a.reset(); a.enabled = true;
  if(name === 'Death' || name === 'Gun_Shoot' || name === 'HitRecieve'){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
  else { a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false; }
  a.play(); if(prev && prev !== a) a.crossFadeFrom(prev, fade == null ? 0.15 : fade, false);
  inst.cur = name; if(inst.wrap) inst.wrap.userData.clip = name;
}

// ------------------------------------------------------------------ per-frame driver (own rAF; lags the render by <1 frame)
var last = performance.now();
function tick(now){ requestAnimationFrame(tick);
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if(window.__C3FREEZE || !inst || dt <= 0) return;   // capture hook: hold the current pose (used by the evidence harness only)
  var p = inst.p, e = G.combat.byRole(inst.role);
  var L = G._log;                                                        // his shots + hits, from the same log the HUD reads
  for(; inst.logIdx < L.length; inst.logIdx++){ var ev = L[inst.logIdx];
    if(ev.data && ev.data.role === inst.role){
      if(ev.type === 'enemyShot') inst.fireT = 0.34;
      else if(ev.type === 'hit' && ev.data.hp > 0) inst.flinchT = 0.3; } }
  inst.fireT = Math.max(0, inst.fireT - dt); inst.flinchT = Math.max(0, inst.flinchT - dt);
  var sp = Math.hypot(p.position.x - inst.lastPos.x, p.position.z - inst.lastPos.z) / dt;
  inst.lastPos.copy(p.position);
  if(p.userData.dead || (e && !e.alive)){ if(!inst.dead){ inst.dead = true; play('Death', 0.1); } }
  else if(inst.flinchT > 0) play('HitRecieve', 0.05);
  else if(inst.fireT > 0) play('Gun_Shoot', 0.05);
  else if(sp > 0.3){ var run = sp > 2.3; play(run ? 'Run' : 'Walk', 0.2);
    inst.actions[inst.cur].timeScale = clamp(sp / (run ? 3.0 : 1.1), 0.5, 2.2); }   // clips authored at 1.1 m/s walk / 3.0 m/s run
  else if(e && (e.aiming > 0 || e.exposed)) play('Idle_Gun_Pointing', 0.2);
  else if(e && e.behavior === 'cover') play('Idle_Gun', 0.2);
  else play('Idle_Neutral', 0.2);
  inst.mixer.update(dt);
}
requestAnimationFrame(tick);
})();
