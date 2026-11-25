/* Hospital Escape — DRESSING SAMPLE (Moth, Nov 25): Cherie's visual-upgrade picks 1+2+3 on ONE sample build.
   1) DRESSING: grime/scuff decals, floor wear, scattered paper + tray clutter, a tipped crash cart (upper elevator
      lobby) and a tipped wheelchair (ground lobby), taped paper notices, blood decals that fade in after the
      door-block fight, a flickering EXIT sign.
   2) LIGHT WITH SHADOWS AND LIFE: always-on shadow-casting spot keys over both elevator lobbies and the cafeteria
      (the rigged cast grounds into the floor); a flickering fluorescent fixture + matched point light in Corridor A;
      one fake volumetric shaft + drifting dust motes under a ceiling panel in the upper elevator lobby.
   3) WET / REFLECTIVE: high-gloss overlay floors in both elevator lobbies (roughness 0.05 + T4 area-light term +
      boosted env reflection = panel streaks on the floor) and a wet, dark, glossy overlay in the ambulance bay
      with a red EMERGENCY light streak.
   Everything is procedural (canvas textures, no new asset files), added once at boot as a scene-level group —
   the game's world, engine and data are untouched. Per-frame work rides HEWORLD.anims (called from present()).
   The light SET never changes after boot (intensity animation only) — no mid-game program recompiles.
   Off switch: ?dressing=0. Readout: window.HEDRESS = { spots, bloodShown, meshes }. */
(function(){
'use strict';
var Q = new URLSearchParams(location.search); if(Q.get('dressing') === '0') return;
var A = window.HEART, W = window.HEWORLD, T4 = window.HET4;
if(!A || !W || !window.__game || !window.__game.game) return;
var game = window.__game.game, scene = game.scene, V = THREE.Vector3;
var D = window.HEDRESS = { on: true, bloodShown: false, meshes: 0 };
// deterministic placement (stable across loads / before-after captures)
var _s = 1234567; function rnd(){ _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; }
function rr(a, b){ return a + rnd() * (b - a); }
// ------------------------------------------------------------------ canvas textures
function cnv(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, srgb){ var t = new THREE.CanvasTexture(c); if(srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }
function blobTex(draw, size){ var cc = cnv(size || 256, size || 256); draw(cc[1], cc[0].width, cc[0].height); return ctex(cc[0], true); }
var grimeTex = blobTex(function(g, w, h){ g.clearRect(0, 0, w, h);
  for(var i = 0; i < 26; i++){ var x = rr(30, w - 30), y = rr(30, h - 30), r = rr(18, 74), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(12,12,10,' + rr(0.10, 0.30).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(12,12,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for(var j = 0; j < 9; j++){ g.strokeStyle = 'rgba(10,10,10,' + rr(0.08, 0.2).toFixed(2) + ')'; g.lineWidth = rr(2, 7); g.beginPath(); var sx = rr(0, w), sy = rr(0, h); g.moveTo(sx, sy); g.lineTo(sx + rr(-90, 90), sy + rr(-26, 26)); g.stroke(); } });
var scuffTex = blobTex(function(g, w, h){ g.clearRect(0, 0, w, h);
  for(var i = 0; i < 34; i++){ g.strokeStyle = 'rgba(14,13,11,' + rr(0.10, 0.34).toFixed(2) + ')'; g.lineWidth = rr(1, 4); g.beginPath(); var y = rr(h * 0.25, h * 0.95); g.moveTo(rr(0, w * 0.3), y); g.lineTo(rr(w * 0.5, w), y + rr(-9, 9)); g.stroke(); }
  for(var j = 0; j < 8; j++){ var x = rr(20, w - 20), y = rr(h * 0.4, h - 14), r = rr(8, 30), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(12,12,10,0.25)'); gr.addColorStop(1, 'rgba(12,12,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
var bloodTex = blobTex(function(g, w, h){ g.clearRect(0, 0, w, h); var cx = w / 2, cy = h / 2;
  g.fillStyle = 'rgba(96,10,8,0.92)';
  for(var i = 0; i < 15; i++){ var a = i / 15 * Math.PI * 2, rad = rr(18, 46); g.beginPath(); g.arc(cx + Math.cos(a) * rad * 0.55, cy + Math.sin(a) * rad * 0.55, rr(10, 30), 0, 7); g.fill(); }
  g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.fill();
  for(var j = 0; j < 26; j++){ var a2 = rr(0, Math.PI * 2), d = rr(44, 118); g.beginPath(); g.arc(cx + Math.cos(a2) * d, cy + Math.sin(a2) * d * 0.8, rr(1.5, 6.5), 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(96,10,8,0.75)'; for(var k = 0; k < 5; k++){ g.lineWidth = rr(2, 5); g.beginPath(); var a3 = rr(0, Math.PI * 2); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a3) * rr(50, 105), cy + Math.sin(a3) * rr(30, 70)); g.stroke(); } });
function noticeTexFn(title, lines){ return blobTex(function(g, w, h){ g.fillStyle = '#e9e7de'; g.fillRect(0, 0, w, h); g.fillStyle = '#b0242a'; g.fillRect(0, 0, w, 52);
  g.fillStyle = '#fff'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillText(title, w / 2, 37);
  g.fillStyle = '#22252a'; g.font = '700 25px Arial'; lines.forEach(function(ln, i){ g.fillText(ln, w / 2, 108 + i * 40); });
  g.fillStyle = 'rgba(30,30,30,0.55)'; for(var i = 0; i < 5; i++) g.fillRect(28, 268 + i * 22, w - 56 - (i % 3) * 34, 7);
  g.fillStyle = 'rgba(214,203,160,0.85)'; g.fillRect(6, 2, 52, 16); g.fillRect(w - 58, 2, 52, 16); }, 340); }
var notice1 = noticeTexFn('NOTICE', ['CAR 2 — OUT OF', 'SERVICE', 'USE CAR 1']);
var notice2 = noticeTexFn('WARD 4B', ['VISITING HOURS', '9 AM — 9 PM', 'NO EXCEPTIONS']);
var exitTex = blobTex(function(g, w, h){ g.fillStyle = '#160404'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff3524'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#ff4030'; g.font = '900 92px Arial'; g.textAlign = 'center'; g.fillText('EXIT', w / 2, h / 2 + 34); });
var shaftTex = (function(){ var cc = cnv(64, 256), g = cc[1]; var gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256); var t = ctex(cc[0], false); return t; })();
var dotTex = (function(){ var cc = cnv(32, 32), g = cc[1]; var gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return ctex(cc[0], false); })();
var streakTex = (function(){ var cc = cnv(128, 256), g = cc[1]; var gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,70,50,0.85)'); gr.addColorStop(1, 'rgba(255,70,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  var gr2 = g.createLinearGradient(0, 0, 128, 0); gr2.addColorStop(0, 'rgba(0,0,0,1)'); gr2.addColorStop(0.5, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr2; g.fillRect(0, 0, 128, 256); return ctex(cc[0], false); })();
// ------------------------------------------------------------------ builders
var root = new THREE.Group(); root.name = 'dressing'; scene.add(root);
var PLANE = new THREE.PlaneGeometry(1, 1);
function stdMat(o){ var m = new THREE.MeshStandardMaterial(o); if(T4 && T4.withArea) T4.withArea(m); return m; }
function floorDecal(tex, w, h, x, y, z, op, rough){ var m = new THREE.Mesh(PLANE, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: op, roughness: rough == null ? 0.92 : rough, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rr(0, Math.PI * 2); m.scale.set(w, h, 1); m.position.set(x, y, z); m.renderOrder = 3; m.receiveShadow = true; m.raycast = function(){}; root.add(m); return m; }
function wallDecal(tex, w, h, x, y, z, ry, op){ var m = new THREE.Mesh(PLANE, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: op, roughness: 0.94, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.scale.set(w, h, 1); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 3; m.receiveShadow = true; m.raycast = function(){}; root.add(m); return m; }
function paper(x, y, z, tex){ var mat = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }) : stdMat({ color: 0xdfe3e6, roughness: 0.95 });
  var m = new THREE.Mesh(PLANE, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = rr(0, Math.PI * 2); m.scale.set(0.21, 0.297, 1); m.position.set(x, y, z); m.receiveShadow = true; m.raycast = function(){}; root.add(m); return m; }
function papers(cx, cz, y, n, spread){ for(var i = 0; i < n; i++) paper(cx + rr(-spread, spread), y + 0.016 + i * 0.0006, cz + rr(-spread, spread)); }
function glossFloor(w, d, x, y, z, op, col, envInt){ var m = new THREE.Mesh(PLANE, stdMat({ color: col, roughness: 0.05, metalness: 0.08, transparent: true, opacity: op, envMapIntensity: envInt, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x, y, z); m.renderOrder = 2; m.receiveShadow = true; m.raycast = function(){}; root.add(m); return m; }
function shadowify(o, cast){ o.traverse(function(c){ if(c.isMesh){ c.castShadow = !!cast; c.receiveShadow = true; c.raycast = function(){}; } }); }
// ------------------------------------------------------------------ 1) DRESSING — elevator lobbies (upper y=0 z -74..-66 / ground y=-12 z -86..-77.8)
[0, -12].forEach(function(fy){ var up = fy === 0, cz = up ? -70 : -82;
  floorDecal(grimeTex, 3.6, 2.8, 0.4, fy + 0.011, cz - 1.6, 0.5);                 // traffic wear in front of the car doors
  floorDecal(grimeTex, 2.6, 2.0, -1.9, fy + 0.011, cz + 2.2, 0.34);
  floorDecal(grimeTex, 2.1, 1.7, 2.3, fy + 0.011, cz - 2.4, 0.3);
  wallDecal(scuffTex, 2.4, 0.55, -3.96, fy + 0.42, cz + 1, Math.PI / 2, 0.85);    // low scuffs, west wall
  wallDecal(scuffTex, 2.4, 0.55, 3.96, fy + 0.38, cz - 1.2, -Math.PI / 2, 0.8);   // east wall
  papers(1.6, cz - 2.6, fy, 4, 1.1); papers(-2.4, cz + 2.4, fy, 3, 0.9);
  var nz = up ? -73.93 : -77.87, nry = up ? 0 : Math.PI;
  wallDecal(up ? notice1 : notice2, 0.52, 0.68, 3.28, fy + 1.62, nz, nry, 0.97);  // taped notice beside the closed car
});
// tipped crash cart, upper lobby west corner; tipped wheelchair, ground lobby east side
var cart = A.crashCart(); cart.position.set(-3.0, 0.34, -67.4); cart.rotation.set(0, 0.5, 1.82); shadowify(cart, true); root.add(cart);
var chairT = A.wheelchair(); chairT.position.set(3.05, -11.72, -84.3); chairT.rotation.set(0, -0.6, 2.05); shadowify(chairT, true); root.add(chairT);
// blood after the door-block fight (upper lobby, in front of the car doors) — hidden until the blocker drops
var bloodMats = [];
function bloodSplat(w, h, x, z, op){ var m = floorDecal(bloodTex, w, h, x, 0.014, z, 0, 0.3); m.material.opacity = 0; m.material.roughness = 0.32; m.visible = false; bloodMats.push({ m: m, op: op }); return m; }
bloodSplat(1.25, 1.0, 0.65, -72.4, 0.95); bloodSplat(0.7, 0.55, -0.15, -71.4, 0.8); bloodSplat(1.5, 0.4, 1.45, -73.1, 0.6); bloodSplat(0.45, 0.35, 0.1, -73.3, 0.7); bloodSplat(1.1, 0.9, 0.35, -69.3, 0.9);
// ------------------------------------------------------------------ 1) DRESSING — cafeteria (y=-12, x 22..46, z -128..-104)
floorDecal(grimeTex, 3.2, 2.4, 24.6, -11.989, -116, 0.42); floorDecal(grimeTex, 2.8, 2.1, 41, -11.989, -118.5, 0.36); floorDecal(grimeTex, 2.4, 1.8, 33, -11.989, -110, 0.26);
wallDecal(scuffTex, 2.6, 0.55, 45.96, -11.55, -112, -Math.PI / 2, 0.8);
papers(30, -114, -12, 5, 2.6); papers(38, -121, -12, 4, 2.2);
[[24.2, -112.5, 0.4], [38, -120.5, 2.2], [29, -107.5, 1.1]].forEach(function(t){ var tray = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.03, 0.36), stdMat({ color: 0x2f6f8f, roughness: 0.5 })); tray.position.set(t[0], -11.965, t[1]); tray.rotation.y = t[2]; tray.castShadow = true; tray.receiveShadow = true; tray.raycast = function(){}; root.add(tray); });
[[24.55, -112.2], [37.6, -120.9]].forEach(function(c){ var cup = A.cyl(0.035, 0.028, 0.09, stdMat({ color: 0xe8e8e8, roughness: 0.6 }), c[0], -11.955, c[1], root); cup.castShadow = true; cup.raycast = function(){}; });
var tipChair = new THREE.Group(); tipChair.position.set(26.5, -11.78, -113.5); tipChair.rotation.set(0, 0.7, 1.62);
A.box(0.44, 0.05, 0.44, stdMat({ color: 0xd06a2a, roughness: 0.7 }), 0, 0.24, 0, tipChair); A.box(0.44, 0.46, 0.05, stdMat({ color: 0xd06a2a, roughness: 0.7 }), 0, 0.45, -0.22, tipChair);
A.box(0.04, 0.24, 0.04, A.mat(0x555a60, { metalness: 0.6 }), 0.18, 0.1, 0.18, tipChair); A.box(0.04, 0.24, 0.04, A.mat(0x555a60, { metalness: 0.6 }), -0.18, 0.1, 0.18, tipChair);
shadowify(tipChair, true); root.add(tipChair);
// ------------------------------------------------------------------ 1) DRESSING — ward corridor (Corridor A: x ±1.8, z -86..-117.8, y=-12)
wallDecal(scuffTex, 2.2, 0.5, -1.76, -11.55, -96, Math.PI / 2, 0.8); wallDecal(scuffTex, 2.2, 0.5, 1.76, -11.5, -106, -Math.PI / 2, 0.75);
floorDecal(grimeTex, 2.6, 2.0, 0.6, -11.989, -113, 0.32);
papers(0.4, -100, -12, 4, 1.0); papers(-0.6, -109, -12, 3, 0.9);
// ------------------------------------------------------------------ 2) LIGHT — shadow keys (always on; intensity never toggles)
function keySpot(x, y, z, tx, ty, tz, angle, inten){ var s = new THREE.SpotLight(0xd8ecff, inten, 20, angle, 0.55, 1.3);
  s.position.set(x, y, z); s.target.position.set(tx, ty, tz); s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
  s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.camera.near = 0.4; s.shadow.camera.far = 16;
  scene.add(s); scene.add(s.target); return s; }
var spotUp = keySpot(0, 3.02, -69.4, 0.3, 0, -71.4, 0.66, 1.15);
var spotGnd = keySpot(0, -8.98, -80.4, 0.3, -12, -82.4, 0.66, 1.15);
var spotCaf = keySpot(33, -8.2, -116, 33.5, -12, -115.5, 0.95, 1.0);
D.spots = [spotUp, spotGnd, spotCaf];
// flickering EXIT sign over the car doors, both lobbies (upper flickers, ground steady)
function exitSign(x, y, z, ry){ var mat = new THREE.MeshBasicMaterial({ map: exitTex }); mat.color.setRGB(2.1, 2.1, 2.1);
  var m = new THREE.Mesh(PLANE, mat); m.scale.set(0.92, 0.34, 1); m.position.set(x, y, z); m.rotation.y = ry; m.raycast = function(){}; root.add(m); return mat; }
var exitMatUp = exitSign(0, 2.82, -73.9, 0), exitMatGnd = exitSign(0, -9.18, -77.9, Math.PI);
// flickering fluorescent fixture in Corridor A (housing + emissive tube + matched point light)
var fixGrp = new THREE.Group(); fixGrp.position.set(0, -9.15, -100); root.add(fixGrp);
A.box(0.5, 0.07, 1.3, A.mat(0x3c4147, { metalness: 0.5, roughness: 0.5 }), 0, 0, 0, fixGrp);
var tubeMat = new THREE.MeshBasicMaterial({ color: 0xd9ecf5 }); tubeMat.color.setRGB(2.4, 2.5, 2.6);
var tube = new THREE.Mesh(PLANE, tubeMat); tube.rotation.x = Math.PI / 2; tube.scale.set(0.4, 1.15, 1); tube.position.y = -0.045; tube.raycast = function(){}; fixGrp.add(tube);
var fixLight = new THREE.PointLight(0xcfe4ee, 0.65, 7.5, 2); fixLight.position.set(0, -9.55, -100); scene.add(fixLight);
// fake volumetric shaft + dust motes, upper elevator lobby (under the panel at z -70.2)
var shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, color: 0x8fb8cc, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.85, 3.05, 24, 1, true), shaftMat);
shaft.position.set(0, 1.66, -70.2); shaft.rotation.z = 0.05; shaft.renderOrder = 5; shaft.raycast = function(){}; root.add(shaft);
var DUST = 130, dustPos = new Float32Array(DUST * 3), dustSpd = new Float32Array(DUST), dustPh = new Float32Array(DUST);
for(var di = 0; di < DUST; di++){ dustPos[di * 3] = rr(-1.25, 1.25); dustPos[di * 3 + 1] = rr(0.15, 3.0); dustPos[di * 3 + 2] = -70.2 + rr(-1.25, 1.25); dustSpd[di] = rr(0.02, 0.075); dustPh[di] = rr(0, 6.28); }
var dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.032, map: dotTex, color: 0xcfe2ee, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
dust.renderOrder = 6; dust.raycast = function(){}; root.add(dust);
// ------------------------------------------------------------------ 3) WET / REFLECTIVE — glossy lobby floors + wet ambulance bay
glossFloor(8, 8, 0, 0.008, -70, 0.34, 0x0a0e11, 2.0);
glossFloor(8, 8.2, 0, -11.992, -81.9, 0.34, 0x0a0e11, 2.0);
var bay = glossFloor(23, 19, 58, -11.975, -184, 0.55, 0x0b0f12, 2.3); bay.renderOrder = 2;
var streak = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
streak.rotation.x = -Math.PI / 2; streak.rotation.z = Math.PI; streak.scale.set(3.2, 8, 1); streak.position.set(66, -11.965, -180.5); streak.renderOrder = 4; streak.raycast = function(){}; root.add(streak);
root.traverse(function(o){ if(o.isMesh || o.isPoints) D.meshes++; });
// ------------------------------------------------------------------ per-frame: flicker, dust, blood reveal (intensity/opacity only)
function flickVal(t){ var n = Math.sin(t * 23.7) * Math.sin(t * 7.31 + 1.7) * Math.sin(t * 41.3 + 0.4) * Math.sin(t * 3.1 + 2.0);
  if(n > 0.42) return 0.12; if(n > 0.36) return 0.45; if(n > 0.30) return 0.7; return 1.0; }
var bloodT = -1;
W.anims.push(function(dt, t){
  var f = flickVal(t);
  tubeMat.color.setRGB(2.4 * f, 2.5 * f, 2.6 * f); fixLight.intensity = 0.65 * f;
  var ef = flickVal(t * 1.37 + 40); exitMatUp.color.setRGB(2.1 * (0.35 + 0.65 * ef), 2.1 * (0.35 + 0.65 * ef), 2.1 * (0.35 + 0.65 * ef));
  shaftMat.opacity = 0.07 + 0.015 * Math.sin(t * 0.7);
  var pa = dustGeo.attributes.position.array;
  for(var i = 0; i < DUST; i++){ pa[i * 3 + 1] -= dustSpd[i] * dt; pa[i * 3] += Math.sin(t * 0.6 + dustPh[i]) * 0.0006; if(pa[i * 3 + 1] < 0.12) pa[i * 3 + 1] = 2.98; }
  dustGeo.attributes.position.needsUpdate = true;
  if(bloodT < 0){ try { var es = game.combat.enemies, has = false, live = false;
      for(var j = 0; j < es.length; j++){ if(es[j].wave === 'el_block'){ has = true; } }
      if(has && game.beat === 'elevator'){ live = game.combat.live().some(function(e){ return e.wave === 'el_block'; }); if(!live) bloodT = 0; } } catch(e){} }
  else if(bloodT < 1.0){ bloodT += dt; var k = Math.min(1, bloodT / 0.8); bloodMats.forEach(function(b){ b.m.visible = true; b.m.material.opacity = b.op * k; }); if(k >= 1) D.bloodShown = true; }
});
})();
