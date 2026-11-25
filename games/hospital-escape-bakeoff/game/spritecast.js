/* Hospital Escape — SNES sprite cast (bake-off sample only, ?look=snes).
   Replaces every character with a REAL 2D sprite sheet found online (LPC —
   Liberated Pixel Cup, see assets/sprites/SOURCES.md): camera-facing billboards
   with walk / shoot / hurt / sit frames, 4 facing rows picked from the actor's
   yaw vs the camera, tracking the same actor groups the painted cast used.
   The painted system keeps running underneath (its billboard group is hidden
   per-tick) so hit registration / muzzle maths stay exactly as shipped. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search); if(Q.get('look') !== 'snes') return;
var DIR = 'assets/sprites/', ROWS = { up: 0, left: 1, down: 2, right: 3 };
var sheets = {}, meta = null, ready = false;
var loader = new THREE.TextureLoader();
['gunman', 'maya', 'nurse', 'hale', 'cole', 'cole-chair', 'cole-bed'].forEach(function(n){
  var t = loader.load((window.__SPRITE_URLS && window.__SPRITE_URLS[n]) || (DIR + n + '.png'));
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; sheets[n] = t; });
fetch(DIR + 'sprites.json').then(function(r){ return r.json(); }).then(function(j){ meta = j; ready = true; }).catch(function(){});

function makePlane(sheetName, w, h){
  var tex = sheets[sheetName].clone(); tex.needsUpdate = true;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, fog: true }));
  m.frustumCulled = false; m.renderOrder = 3; m.raycast = function(){}; return m; }
function setFrame(mesh, sheetName, row, col){
  var t = mesh.material.map, big = (sheetName === 'cole-chair' || sheetName === 'cole-bed');
  var cols = sheetName === 'cole-chair' ? 2 : sheetName === 'cole-bed' ? 6 : 13;
  var rows = sheetName === 'cole-chair' ? 4 : sheetName === 'cole-bed' ? 1 : 10;
  t.repeat.set(1 / cols, 1 / rows); t.offset.set(col / cols, 1 - (row + 1) / rows); }
function rowFor(actor, cam){
  var f = new THREE.Vector3(); actor.getWorldDirection(f);
  var a = Math.atan2(cam.position.x - actor.position.x, cam.position.z - actor.position.z);
  var d = Math.atan2(f.x, f.z) - a; while(d > Math.PI) d -= 2 * Math.PI; while(d < -Math.PI) d += 2 * Math.PI;
  if(d > -Math.PI / 4 && d <= Math.PI / 4) return ROWS.down;
  if(d > Math.PI / 4 && d <= 3 * Math.PI / 4) return ROWS.left;
  if(d > -3 * Math.PI / 4 && d <= -Math.PI / 4) return ROWS.right;
  return ROWS.up; }

var actors = [];   // {g, role, mesh, last:Vector3, chairMesh, bedMesh}
function track(g, role, roleName){ if(!g || g.userData.__sprite) return; g.userData.__sprite = true;
  var e = { g: g, role: role, roleName: roleName, last: g.position.clone(), deadF: 0 };
  if(role === 'cole'){ e.chair = makePlane('cole-chair', 1.15, 1.15); e.bed = makePlane('cole-bed', 2.0, 2.0);
    e.mesh = makePlane('cole', 2.15, 2.15); scene().add(e.chair, e.bed, e.mesh); }
  else { var h = role === 'maya' ? 2.0 : role === 'nurse' ? 2.05 : 2.15; e.mesh = makePlane(role, h, h); scene().add(e.mesh); }
  actors.push(e); }
function scene(){ return window.__game.game.scene; }

setInterval(function(){
  if(!ready || !window.__game || !window.__heProps) return;
  var game = window.__game.game, cam = game.camera, st = game.state();
  var P = window.__heProps; track(P.maya, 'maya'); track(P.hale, 'hale'); track(P.cole, 'cole');
  game.combat.enemies.forEach(function(e){ var a = game.greybox.actors[e.role]; if(a) track(a, e.kind === 'staff' ? 'nurse' : 'gunman', e.role); });
  var now = performance.now();
  actors.forEach(function(e){ var g = e.g, u = g.userData;
    if(u.bb) u.bb.visible = false;                                   // hide the painted billboard, keep its maths alive
    var moved = g.position.distanceTo(e.last) > 0.004; e.last.copy(g.position);
    var row = rowFor(g, cam), t = Math.floor(now / 100);             // 10 fps sprite clock (SNES step)
    if(e.role === 'cole'){
      var seg = st.segment || '', bedMode = st.vehicle === 'bed' || seg === 'visit_room' || seg === 'bed_hall_push';
      var chairMode = !bedMode && st.mode !== 'AMBULANCE' && (st.segment || '').indexOf('gauntlet') !== 0;   // gauntlet = Cole seated on the bed -> sit-frame billboard (the mesh branch below)
      var cv = g.visible !== false;
      e.mesh.visible = !bedMode && !chairMode && cv; e.chair.visible = chairMode && cv; e.bed.visible = bedMode && cv;
      if(bedMode){ setFrame(e.bed, 'cole-bed', 0, 5);                       // hurt-sheet final frame: fully down, lying
        e.bed.position.copy(g.position); e.bed.position.y += 0.55;
        e.bed.rotation.set(-Math.PI / 2, 0, 0); e.bed.rotation.order = 'YXZ';
        var q = new THREE.Quaternion(); g.getWorldQuaternion(q);
        e.bed.rotation.y = new THREE.Euler().setFromQuaternion(q, 'YXZ').y; }
      else if(chairMode){ setFrame(e.chair, 'cole-chair', row, moved ? (t % 2) : 0);
        e.chair.position.copy(g.position); e.chair.position.y += 0.56;
        e.chair.lookAt(cam.position.x, e.chair.position.y, cam.position.z); }
      else { setFrame(e.mesh, 'cole', 9, 1);                               // AMBULANCE: seated sit-row frame
        place(e, g, cam); }
      return; }
    var mesh = e.mesh; if(!mesh) return;
    if(e.roleName){ var ce = null; game.combat.enemies.forEach(function(x){ if(x.role === e.roleName) ce = x; });
      mesh.visible = g.visible !== false && (!!u.dead || !!(ce && ce.pos && g.position.distanceTo(ce.pos) < 2.5)); }
    else mesh.visible = g.visible !== false;
    if(u.dead){ e.deadF = Math.min(5, e.deadF + 0.34); setFrame(mesh, e.role, 8, Math.floor(e.deadF)); }
    else if(u.fireT > 0) setFrame(mesh, e.role, 4 + row, 8 + (t % 5));       // shoot rows 4-7, frames 8-12
    else if(u.flinchT > 0) setFrame(mesh, e.role, 8, 1);
    else if(moved) setFrame(mesh, e.role, row, 1 + (t % 8));
    else setFrame(mesh, e.role, row, 0);
    place(e, g, cam);
  });
  function place(e, g, cam){ var m = meta[e.role] || { top: 15, bottom: 62 }, H = e.mesh.geometry.parameters.height;
    e.mesh.position.copy(g.position); e.mesh.position.y += (m.bottom - 32) / 64 * H;
    e.mesh.lookAt(cam.position.x, e.mesh.position.y, cam.position.z); }
}, 33);
window.__spriteCast = { actors: function(){ return actors.map(function(e){ return { role: e.role, visible: !!(e.mesh && e.mesh.visible) }; }); } };
})();
