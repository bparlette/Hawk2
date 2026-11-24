/* Hospital Escape — BAKE-OFF ENTRY CX (Entry C technique, full enemy cast): EVERY enemy —
   plain gunmen AND teal-scrubs gunmen — rendered as a real 3D character instead of the painted
   billboard. Asset: Quaternius "Casual Character" (Ultimate Modular Men pack, via Poly Pizza), CC0.
   One shared GLB + skeleton + clip library; per-instance SkeletonUtils clones with cloned materials.
   Plain gunmen keep Entry C's charcoal reskin. Scrubs gunmen get a runtime reskin: teal top
   (#316E82, the role-brief colour) over the stock dark pants, a pale surgical-mask prop and a dark
   chest-rig prop bone-parented in — mask + rig + dark pants are his threat markers vs real staff.
   Cole and Maya stay painted: the clip library has no seated / wheelchair / bed poses.
   Clips: Walk / Run / Idle_Neutral / Idle_Gun / Idle_Gun_Pointing / Gun_Shoot / HitRecieve / Death.
   Driven entirely by each enemy's existing engine state + event log: no gameplay changes.
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
var CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function loadScript(src, cb){ var s = document.createElement('script'); s.src = src; s.onload = cb; s.onerror = function(){}; document.head.appendChild(s); }
function withLoaders(cb){
  var need = [];
  if(!THREE.GLTFLoader) need.push('loaders/GLTFLoader.js');
  if(!THREE.SkeletonUtils) need.push('utils/SkeletonUtils.js');
  if(!need.length) return cb();
  var i = 0; (function next(){ if(i >= need.length) return cb(); loadScript(CDN + need[i++], next); })();
}
withLoaders(function(){ if(!THREE.GLTFLoader || !THREE.SkeletonUtils) return;
  glbBytes().then(function(buf){ if(!buf) return;
    new THREE.GLTFLoader().parse(buf, '', function(gltf){
      model.scene = gltf.scene;
      gltf.animations.forEach(function(c){ model.clips[c.name] = c; });
      model.ready = true; window.__cast3d = model;
      waiters.splice(0).forEach(function(w){ attach(w.p, w.role, w.kind); });
    }, function(){});
  }).catch(function(){});
});

// ------------------------------------------------------------------ per-instance figure build
var TEAL = 0x316E82;                       // role-brief scrubs teal (converted to linear below: the
                                           // GLB's own colours are linear-authored, a raw setHex reads neon)
var MASK_AT = { dy: 0.022, dz: 0.098 };    // figure-space offsets from the Head bone origin (stage-tuned)
var RIG_AT  = { dy: 0.045, dz: 0.104 };    // figure-space offsets from the Chest bone origin
function buildFigure(kind){
  var fig = THREE.SkeletonUtils.clone(model.scene), matTop = null;
  fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
    if(Array.isArray(o.material)) o.material = o.material.map(function(m){ var c = m.clone(); if(c.name === 'LightBrown') matTop = c; return c; });
    else { o.material = o.material.clone(); if(o.material.name === 'LightBrown') matTop = o.material; } } });
  if(kind === 'staff'){
    if(matTop) matTop.color.setHex(TEAL).convertSRGBToLinear();
    var head = fig.getObjectByName('Head'), chest = fig.getObjectByName('Chest');
    // Place the props in FIGURE space (head/chest bone origin + offset, facing +Z), then attach()
    // them to the bones — bone-local axes on this rig are not world axes, so raw bone-local
    // offsets land inside the body (measured on the CX prop stage).
    var tmp = new THREE.Object3D(); tmp.add(fig); tmp.updateMatrixWorld(true);
    if(head){ var mask = new THREE.Mesh(new THREE.BoxGeometry(0.138, 0.078, 0.042),
        new THREE.MeshStandardMaterial({ color: 0xaec6d2, roughness: 0.95 }));
      mask.name = 'cxMask'; var hw = head.getWorldPosition(new THREE.Vector3());
      mask.position.set(hw.x, hw.y + MASK_AT.dy, hw.z + MASK_AT.dz); fig.add(mask); head.attach(mask); }
    if(chest){ var rigM = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.85, metalness: 0 });
      var rig = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.19, 0.075), rigM);
      rig.name = 'cxRig'; var cw = chest.getWorldPosition(new THREE.Vector3());
      rig.position.set(cw.x, cw.y + RIG_AT.dy, cw.z + RIG_AT.dz); fig.add(rig); chest.attach(rig);
      var pouch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.04), rigM);
      pouch.name = 'cxRigPouch'; pouch.position.set(0, -0.125, 0.012); rig.add(pouch); }
    tmp.remove(fig);
  }
  return fig;
}

// ------------------------------------------------------------------ marking + attach
var insts = {}, waiters = [];
var _addActor = gb.addActor;
gb.addActor = function(role, kind){
  var p = _addActor.apply(this, arguments);
  if(kind === 'gunman' || kind === 'staff'){ if(model.ready) attach(p, role, kind); else waiters.push({ p: p, role: role, kind: kind }); }
  return p;
};
var _removeActor = gb.removeActor;
gb.removeActor = function(role){ var it = insts[role]; if(it){ it.mixer.stopAllAction(); delete insts[role]; }
  for(var i = waiters.length - 1; i >= 0; i--) if(waiters[i].role === role) waiters.splice(i, 1);
  return _removeActor.apply(this, arguments); };

function blobTex(){ var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'),
  gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
var _blobTex = null;

function attach(p, role, kind){
  if(!p.parent) return;                                              // he was removed before the model parsed
  var wrap = new THREE.Group(); wrap.name = 'cast3d';
  wrap.scale.setScalar(1.77 / 1.81);                                 // stock figure is 1.81 m; the painted enemies are 1.77 m
  var fig = buildFigure(kind); wrap.add(fig);
  if(!_blobTex) _blobTex = blobTex();
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false, fog: true }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; sh.raycast = function(){}; wrap.add(sh);
  p.add(wrap);
  p.children.forEach(function(c){ if(c !== wrap) c.traverse(function(o){ o.layers.set(31); }); });   // procedural body + painted billboard off (render AND raycast)
  p.userData.pk = null;                                              // present() stops paintEnemy for him
  p.userData.painted = false;                                        // his shots take the procedural muzzle path (posed rig, co-located)
  var mixer = new THREE.AnimationMixer(fig), actions = {};
  Object.keys(model.clips).forEach(function(n){ actions[n] = mixer.clipAction(model.clips[n]); });
  var inst = { role: role, kind: kind, p: p, wrap: wrap, mixer: mixer, actions: actions, cur: null,
               lastPos: p.position.clone(), logIdx: G._log.length, fireT: 0, flinchT: 0, dead: false, paceN: 0 };
  insts[role] = inst;
  play(inst, 'Idle_Neutral', 0);
}
function play(inst, name, fade){
  if(inst.cur === name) return; var a = inst.actions[name]; if(!a) return;
  var prev = inst.cur ? inst.actions[inst.cur] : null;
  a.reset(); a.enabled = true;
  if(name === 'Death' || name === 'Gun_Shoot' || name === 'HitRecieve'){ a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
  else { a.setLoop(THREE.LoopRepeat, Infinity); a.clampWhenFinished = false; }
  a.play(); if(prev && prev !== a) a.crossFadeFrom(prev, fade == null ? 0.15 : fade, false);
  inst.cur = name; inst.wrap.userData.clip = name;
}

// pacing samples for the build report: {sp: engine speed, clip, ts: timeScale} while walking/running
window.__CXPACE = [];

// ------------------------------------------------------------------ per-frame driver (own rAF; lags the render by <1 frame)
var last = performance.now();
function tick(now){ requestAnimationFrame(tick);
  var dt = Math.min(0.1, (now - last) / 1000); last = now;
  if(window.__C3FREEZE || dt <= 0) return;   // capture hook: hold the current pose (used by the evidence harness only)
  var L = G._log;
  Object.keys(insts).forEach(function(role){ var inst = insts[role]; if(!inst) return;
    var p = inst.p, e = G.combat.byRole(inst.role);
    for(; inst.logIdx < L.length; inst.logIdx++){ var ev = L[inst.logIdx];
      if(ev.data && ev.data.role === inst.role){
        if(ev.type === 'enemyShot') inst.fireT = 0.34;
        else if(ev.type === 'hit' && ev.data.hp > 0) inst.flinchT = 0.3; } }
    inst.fireT = Math.max(0, inst.fireT - dt); inst.flinchT = Math.max(0, inst.flinchT - dt);
    var sp = Math.hypot(p.position.x - inst.lastPos.x, p.position.z - inst.lastPos.z) / dt;
    inst.lastPos.copy(p.position);
    if(p.userData.dead || (e && !e.alive)){ if(!inst.dead){ inst.dead = true; play(inst, 'Death', 0.1); } }
    else if(inst.flinchT > 0) play(inst, 'HitRecieve', 0.05);
    else if(inst.fireT > 0) play(inst, 'Gun_Shoot', 0.05);
    else if(sp > 0.3){ var run = sp > 1.5; play(inst, run ? 'Run' : 'Walk', 0.2);
      var ts = clamp(sp / (run ? 1.24 : 0.64), 0.5, 2.6);            // MEASURED authored speeds (CX stride
      inst.actions[inst.cur].timeScale = ts;                         // probe: Walk stride 0.858 m / 1.333 s = 0.64 m/s,
                                                                     // Run 0.983 m / 0.792 s = 1.24 m/s — the asset
                                                                     // manifest's 1.1 / 3.0 m/s overstates both ~1.7-2.4x)
      if(window.__CXPACE.length < 6000 && (inst.paceN++ % 5) === 0)
        window.__CXPACE.push({ sp: +sp.toFixed(3), clip: inst.cur, ts: +ts.toFixed(3) }); }
    else if(e && (e.aiming > 0 || e.exposed)) play(inst, 'Idle_Gun_Pointing', 0.2);
    else if(e && e.behavior === 'cover') play(inst, 'Idle_Gun', 0.2);
    else play(inst, 'Idle_Neutral', 0.2);
    inst.mixer.update(dt);
  });
}
requestAnimationFrame(tick);
window.__cast3dCX = { model: model, insts: insts, buildFigure: buildFigure };
})();
