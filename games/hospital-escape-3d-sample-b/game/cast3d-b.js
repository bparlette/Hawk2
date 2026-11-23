/* Hospital Escape — BAKE-OFF B (Option 1 sample): ONE painted gunman replaced by a real 3D figure.
   Mesh: Hunyuan3D-2 image-to-3D from the gunman's own aim painting, finished + rigged in Blender
   (vertex colours projected from the painting, Walk/Aim clips). Delivered as base64 chunks
   (glb-b64-*.js) because the GitHub connector corrupts raw binaries.
   Contract: active only with ?cast3d=1 (or the sample page's default-on marker); claims the FIRST
   plain gunman of the bed_push beat; without the flag — or before the GLB lands — the game is
   exactly the shipped painted build. No gameplay state is touched: this only re-renders one enemy. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search);
var ON = Q.get('cast3d') === '1' || (window.__CAST3D_DEFAULT_ON && Q.get('cast3d') !== '0');
if(!ON) return;
var S = { role: null, fig: null, mixer: null, walk: null, aim: null, cur: null, ready: false,
          dead: false, deadT: 0, lastPos: null, walkV: 0, blob: null, state: 'loading', speed: 0 };
window.__cast3d = S;   // capture/debug handle (additive, mirrors __dbg)

function load(){
  var b64 = (window.__GLB_B64 || []).join('');
  if(!b64 || !THREE.GLTFLoader){ S.state = 'failed:noloader'; return; }
  var bin = atob(b64), bytes = new Uint8Array(bin.length);
  for(var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  var url = URL.createObjectURL(new Blob([bytes.buffer], { type: 'model/gltf-binary' }));
  new THREE.GLTFLoader().load(url, function(gltf){
    var fig = gltf.scene;
    fig.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.frustumCulled = false;
      // the corridors are lit for the painted cast's custom relight shader; a plain PBR figure
      // under the same lamps goes near-black, so the vertex colours get a flat lift (the same
      // advantage the painted shader's level term gives the billboards)
      if(o.material && o.material.color) o.material.color.setRGB(1.7, 1.65, 1.6); } });
    S.fig = fig;
    S.mixer = new THREE.AnimationMixer(fig);
    gltf.animations.forEach(function(c){
      if(c.name === 'Walk') S.walk = S.mixer.clipAction(c);
      if(c.name === 'Aim') S.aim = S.mixer.clipAction(c);
    });
    if(S.aim){ S.aim.play(); S.cur = 'aim'; }
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    S.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    S.blob.rotation.x = -Math.PI / 2; S.blob.renderOrder = 2;
    S.ready = true; S.state = 'aim';
  }, undefined, function(){ S.state = 'failed:load'; });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();

function setClip(name){
  if(S.cur === name || !S.walk || !S.aim) return;
  var a = name === 'walk' ? S.walk : S.aim, b = name === 'walk' ? S.aim : S.walk;
  b.fadeOut(0.18); a.reset().fadeIn(0.18).play(); S.cur = name;
}

window.CAST3DB = { handle: function(e, p, dt){
  var G = window.__game && window.__game.game;
  if(!G) return false;
  if(!S.role){
    if(!p.userData || p.userData.pk !== 'enemy-plain') return false;
    var st = G.state();
    if(!st || (st.beat !== 'bed_push' && st.beat !== 'gauntlet')) return false;   // bed_push in normal play; gauntlet start = the capture harness's open-room walker
    S.role = e.role; S.lastPos = null; S.walkV = 0;
  }
  if(e.role !== S.role || !S.ready) return false;
  if(!S.fig.parent){ G.scene.add(S.fig); if(S.blob) G.scene.add(S.blob); }
  p.visible = false;
  var pos = e.pos, vx = 0, vz = 0, sp = 0;
  if(S.lastPos && dt > 0){
    vx = (pos.x - S.lastPos.x) / dt; vz = (pos.z - S.lastPos.z) / dt;
    sp = Math.hypot(vx, vz);
  }
  S.walkV += (sp - S.walkV) * Math.min(1, dt * 10);
  S.speed = S.walkV;
  if(dt > 0){ (S.lastPos || (S.lastPos = new THREE.Vector3())).copy(pos); }
  S.fig.position.set(pos.x, pos.y, pos.z);
  if(S.blob) S.blob.position.set(pos.x, pos.y + 0.02, pos.z);
  if(p.userData.dead){
    S.dead = true; S.deadT += dt; S.state = 'dead';
    var k = Math.min(1, S.deadT / 0.4);
    S.fig.rotation.set(-Math.PI / 2 * k * 0.97, S.fig.rotation.y, 0);
    S.fig.position.y = pos.y - 0.02 * k;
    return true;
  }
  var hidden = e.behavior === 'cover' && !e.exposed;
  var walking = S.walkV > 0.25 && !hidden;
  // facing: along his motion while walking; at the hero while aiming (painted enemies face the camera side)
  var dx, dz;
  if(walking && sp > 0.05){ dx = vx; dz = vz; }
  else { var hp = G.playerPos(); dx = hp.x - pos.x; dz = hp.z - pos.z; }
  if(dx * dx + dz * dz > 1e-6) S.fig.rotation.y = Math.atan2(dx, dz);
  if(walking){
    setClip('walk'); S.state = 'walk';
    if(S.walk) S.walk.timeScale = Math.max(0.4, S.walkV / 0.88);   // one 2-step cycle per 0.88 m, the painted stride measure
  } else { setClip('aim'); S.state = hidden ? 'hidden' : 'aim'; }
  if(S.mixer && dt > 0) S.mixer.update(dt);
  return true;
} };
})();
