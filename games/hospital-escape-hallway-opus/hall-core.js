/* Hospital Escape — OPUS hallway bake-off (BAKEOFF-HALLWAY), shared core.
   The page loads the LIVE game read-only (<base href="../hospital-escape/">). The core:
     - moves everything the game built onto a hidden layer (render + raycast) — the game keeps running untouched underneath;
     - rebuilds the Stage 1 corridor WEST WING B (the nurses' station hall: x 12, z -16 .. -43.7, 3.4 x 2.9 m, doors L -24.5/-31.5,
       R -20.5/-28/-35.2, station z -27.5) plus the two halls it opens onto, with the GAME'S OWN world.js builder and data,
       so the footprint, doors, station, props and signs are identical by construction; the take then restyles it;
     - the judging rig: 3 fixed viewpoints + the centre dolly at eye height, rendered through the game's own post pipeline with the
       patient-eyes effects (lids, drift, hurt) neutralised so the environment is judged, not Cole's injuries.
   API: window.__hall = { ready, view(i), dolly(t01), info(), take }   (a take sets window.__HALL_TAKE = function(H){ ... }) */
(function(){
'use strict';
var GW = window.__game; if(!GW || !GW.game) return;
var G = GW.game, scene = G.scene, cam = G.camera, W = window.HEWORLD, A = window.HEART, V = THREE.Vector3;
var H = window.__hall = { ready: false, V: V, scene: scene, camera: cam, A: A, W: W };
var NAMES = ['WEST WING CROSS', 'WEST WING B', 'WEST WING LINK'];
function start(){
  GW.start('bed_push'); GW.pause(true);
  // hide the game's world + cast on layer 31 (the game's per-frame code toggles .visible, never layers)
  scene.children.slice().forEach(function(o){ if(o.isLight || o === cam) return; o.traverse(function(c){ c.layers.set(31); }); });
  H.gameLights = scene.children.filter(function(o){ return o.isLight; });
  var zones = HE.DATA.env.zones.filter(function(z){ return NAMES.indexOf(z.name) >= 0; });
  H.zone = zones.filter(function(z){ return z.name === 'WEST WING B'; })[0];
  H.root = W.build(scene, { env: { zones: zones } });   // the game's own builder, the game's own data
  H.root.name = 'opusHall'; H.root.traverse(function(c){ c.layers.set(0); });
  // classify the built meshes by what they are (the builder's shared textures identify them)
  H.parts = { floor: [], wall: [], ceil: [], panel: [], pool: [], door: [], frame: [], glass: [], other: [] };
  var by = function(m){ if(!m) return 'other'; var mp = m.map && m.map.image; if(mp){ if(mp === A.tex.vinyl.image) return 'floor'; if(mp === A.tex.wall.image) return 'wall'; if(mp === A.tex.ceiling.image) return 'ceil';
      if(mp === A.tex.lightPanel.image) return 'panel'; if(A.tex.door && mp === A.tex.door.image) return 'door'; } if(m.blending === THREE.AdditiveBlending) return 'pool'; if(m.transparent && m.opacity < 0.5) return 'glass'; return 'other'; };
  H.root.traverse(function(o){ if(o.isMesh && !Array.isArray(o.material)){ H.parts[by(o.material)].push(o); } });
  // judging rig
  var hz = H.zone, x = hz.a[0], y = hz.y, eye = 1.6;
  H.views = [ { name: 'entrance', pos: new V(x, y + eye, -16.6), look: new V(x, y + 1.35, -30) },
              { name: 'station', pos: new V(x + 0.75, y + eye, -24.6), look: new V(x - 0.9, y + 1.15, -30.5) },
              { name: 'far-end', pos: new V(x, y + eye, -43.0), look: new V(x, y + 1.35, -28) } ];
  H.dollyFrom = new V(x, y + eye, -16.6); H.dollyTo = new V(x, y + eye, -43.0);
  var _look = new V();
  H.setCam = function(p, l){ cam.position.copy(p); cam.lookAt(l); cam.updateMatrixWorld(true); if(cam.fov !== 60){ cam.fov = 60; cam.updateProjectionMatrix(); } };
  H.view = function(i){ var v = H.views[i]; H.cur = { p: v.pos.clone(), l: v.look.clone() }; H.setCam(H.cur.p, H.cur.l); return v.name; };
  H.dolly = function(t){ var p = H.dollyFrom.clone().lerp(H.dollyTo, t); _look.copy(p).add(new V(0, -0.22, -6)); p.y += Math.sin(t * 40) * 0.012; H.cur = { p: p, l: _look.clone() }; H.setCam(p, _look); };
  // keep the rig camera through the game's frame (the paused game does not move the camera; we re-assert it every frame anyway)
  var post = window.__post, R = window.__renderer;
  if(post){ var orig = post.render; post.render = function(t){ if(H.cur) H.setCam(H.cur.p, H.cur.l); var u = post.u;
      u.lidTop.value = 0; u.lidBot.value = 0; u.lidRed.value = 0; u.drift.value = 0; u.hurt.value = 0; u.kick.value = 0; u.dying.value = 0; u.tunnel.value = 0;
      u.focus.value = H.focus || 7; u.soft.value = H.soft != null ? H.soft : 0.55; u.edge.value = H.edge != null ? H.edge : 3;
      if(H.post) H.post(u, t); return orig.apply(this, arguments); }; }
  H.info = function(){ R.info.autoReset = false; R.info.reset(); if(H.cur) H.setCam(H.cur.p, H.cur.l); R.setRenderTarget(null); R.render(scene, cam); var a = { sceneCalls: R.info.render.calls, sceneTris: R.info.render.triangles };
    R.info.reset(); post.render(1); a.frameCalls = R.info.render.calls; a.frameTris = R.info.render.triangles; R.info.autoReset = true; return a; };
  H.view(0);
  var done = function(){ H.ready = true; window.__hallReady = true; };
  if(window.__HALL_TAKE){ var r = window.__HALL_TAKE(H); if(r && r.then) r.then(done, function(e){ window.__hallReady = 'fail:' + e; }); else done(); } else done(); }
var t0 = setInterval(function(){ if(window.__painted === undefined || !window.__post) return; clearInterval(t0); try { start(); } catch(e){ window.__hallReady = 'fail:' + e; } }, 50);
// shared helpers for takes
H.tex = function(name, rep, srgb){ var t = new THREE.TextureLoader().load('../hospital-escape-hallway-opus/tex/' + name); t.wrapS = t.wrapT = THREE.RepeatWrapping; if(rep) t.repeat.set(rep[0], rep[1]); if(srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; };
H.size = function(mesh){ mesh.geometry.computeBoundingBox(); var b = mesh.geometry.boundingBox, s = new V(); b.getSize(s); return s; };
})();
