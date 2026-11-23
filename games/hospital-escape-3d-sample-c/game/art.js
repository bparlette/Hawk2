/* Hospital Escape — game art library (originals only, all built in code): canvas textures, articulated people with
   real proportions + pose library, hospital props, vehicles (bed, wheelchair, ambulance with an open rear bay,
   patrol car / charger / SUV with tire-driver-engine zones), crossing gear and a locomotive-led train.
   Reusable across levels: L2–L4 reuse the cast, people, vehicle and prop builders with new environment data. */
(function(){
'use strict';
var A = window.HEART = {};
var V = THREE.Vector3;
// ---------------------------------------------------------------- textures
function cv(w, h, f){ var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); f(g, w, h); var t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; return t; }
function rep(t, x, y){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; }
function speck(g, w, h, n, cols, a){ for(var i = 0; i < n; i++){ g.fillStyle = cols[i % cols.length]; g.globalAlpha = a * (0.4 + Math.random() * 0.6); var s = 1 + Math.random() * 2; g.fillRect(Math.random() * w, Math.random() * h, s, s); } g.globalAlpha = 1; }
A.tex = {};
A.makeTextures = function(){ var T = A.tex;
  T.vinyl = cv(256, 256, function(g, w, h){ g.fillStyle = '#c9c6bb'; g.fillRect(0, 0, w, h); speck(g, w, h, 1800, ['#9d9a90', '#e4e1d6', '#8f9aa0'], 0.5); g.fillStyle = 'rgba(70,70,64,.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    g.fillStyle = 'rgba(80,120,140,.12)'; g.fillRect(128, 0, 128, 128); g.fillRect(0, 128, 128, 128); });
  T.wall = cv(256, 256, function(g, w, h){ g.fillStyle = '#dfe2dc'; g.fillRect(0, 0, w, h); speck(g, w, h, 500, ['#cfd3cc', '#eef0ea'], 0.4);
    g.fillStyle = '#6f8f8c'; g.fillRect(0, h * 0.70, w, h * 0.30); g.fillStyle = '#5c7774'; g.fillRect(0, h * 0.70, w, 4);   // wainscot
    g.fillStyle = '#b9bcb5'; g.fillRect(0, h * 0.62, w, 9); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h * 0.62 + 9, w, 3);  // handrail
    g.fillStyle = '#3d4a49'; g.fillRect(0, h * 0.95, w, h * 0.05);
    for(var i = 0; i < 26; i++){ var sx = Math.random() * w, sw2 = 6 + Math.random() * 30; g.fillStyle = 'rgba(30,28,24,' + (0.06 + Math.random() * 0.12) + ')'; g.fillRect(sx, h * (0.86 + Math.random() * 0.08), sw2, 2 + Math.random() * 5); }   // cart scuffs at the base
    var gr = g.createLinearGradient(0, h * 0.8, 0, h); gr.addColorStop(0, 'rgba(40,36,30,0)'); gr.addColorStop(1, 'rgba(40,36,30,.22)'); g.fillStyle = gr; g.fillRect(0, h * 0.8, w, h * 0.2); });   // grime at the wall base
  T.ceiling = cv(256, 256, function(g, w, h){ g.fillStyle = '#ecece6'; g.fillRect(0, 0, w, h); speck(g, w, h, 1400, ['#cfcfc7', '#ffffff'], 0.5); g.strokeStyle = '#a8a8a0'; g.lineWidth = 4; g.strokeRect(0, 0, w, h); });
  T.lightPanel = cv(64, 128, function(g, w, h){ g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8cdd0'; g.lineWidth = 6; g.strokeRect(0, 0, w, h); for(var i = 1; i < 4; i++){ g.fillStyle = 'rgba(200,210,215,.6)'; g.fillRect(0, i * h / 4 - 1, w, 2); } });
  T.door = cv(128, 256, function(g, w, h){ g.fillStyle = '#7f9db3'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a879c'; g.fillRect(8, 8, w - 16, h - 16); g.fillStyle = '#20303a'; g.fillRect(34, 40, 60, 70);
    g.fillStyle = 'rgba(170,200,220,.55)'; g.fillRect(38, 44, 52, 62); g.fillStyle = '#c9ced1'; g.fillRect(96, 130, 22, 8); g.fillStyle = '#5a7386'; g.fillRect(8, h - 38, w - 16, 30); });
  T.wood = cv(128, 128, function(g, w, h){ g.fillStyle = '#a77b4f'; g.fillRect(0, 0, w, h); for(var i = 0; i < 40; i++){ g.strokeStyle = 'rgba(80,50,25,' + (0.1 + Math.random() * 0.2) + ')'; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2); g.stroke(); } });
  T.asphalt = cv(256, 256, function(g, w, h){ g.fillStyle = '#3c3e42'; g.fillRect(0, 0, w, h); speck(g, w, h, 5000, ['#2a2c30', '#55585d', '#4a4c50'], 0.7); });
  T.sidewalk = cv(256, 256, function(g, w, h){ g.fillStyle = '#a9a69e'; g.fillRect(0, 0, w, h); speck(g, w, h, 2000, ['#8f8c85', '#c0bdb4'], 0.5); g.fillStyle = 'rgba(60,60,55,.5)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); });
  T.grass = cv(256, 256, function(g, w, h){ g.fillStyle = '#4f6a3a'; g.fillRect(0, 0, w, h); speck(g, w, h, 6000, ['#3d5630', '#66844a', '#5a7440'], 0.8); });
  T.gown = cv(128, 128, function(g, w, h){ g.fillStyle = '#a9c8d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#6f97ad'; for(var y = 8; y < h; y += 16) for(var x = (y / 16 % 2) * 8; x < w; x += 16){ g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } });
  T.blanket = cv(128, 128, function(g, w, h){ g.fillStyle = '#e9ebe6'; g.fillRect(0, 0, w, h); g.fillStyle = '#8fb3c4'; g.fillRect(0, 18, w, 6); g.fillRect(0, 30, w, 3); speck(g, w, h, 300, ['#d5d8d2'], 0.5); });
  T.seat = cv(64, 64, function(g, w, h){ g.fillStyle = '#2f5e7a'; g.fillRect(0, 0, w, h); speck(g, w, h, 400, ['#244a61', '#3a6f8e'], 0.6); });
  T.facade = function(seed, base, win){ return cv(256, 512, function(g, w, h){ g.fillStyle = base; g.fillRect(0, 0, w, h); speck(g, w, h, 1500, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.15)'], 0.4);
    var r = seed; var rnd = function(){ r = (r * 16807) % 2147483647; return r / 2147483647; };
    for(var y = 30; y < h - 40; y += 64) for(var x = 18; x < w - 30; x += 58){ var lit = rnd() < 0.45; g.fillStyle = lit ? win : '#1e2a36'; g.fillRect(x, y, 38, 40); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + 38, 38, 4); } }); };
  T.ambSide = cv(512, 128, function(g, w, h){ g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8362f'; g.fillRect(0, 62, w, 18); g.fillStyle = '#e8b730'; g.fillRect(0, 82, w, 6);
    g.fillStyle = '#c8362f'; g.font = 'bold 30px Arial,sans-serif'; g.fillText('ST. MERCER EMS', 120, 46); g.fillRect(40, 20, 34, 10); g.fillRect(52, 8, 10, 34); });
  T.patrolSide = cv(512, 128, function(g, w, h){ g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3f8a'; g.fillRect(0, 54, w, 26); g.fillStyle = '#f4f4f2'; g.font = 'bold 22px Arial,sans-serif'; g.fillText('CITY PATROL', 170, 74); g.fillStyle = '#111'; g.fillRect(0, 100, w, 28); });
  T.chargerSide = cv(512, 128, function(g, w, h){ g.fillStyle = '#eceff2'; g.fillRect(0, 0, w, h); g.fillStyle = '#16233e'; g.fillRect(0, 48, w, 14); g.fillStyle = '#b8282b'; g.fillRect(0, 64, w, 6); g.fillStyle = '#16233e'; g.font = 'bold 20px Arial,sans-serif'; g.fillText('HIGHWAY UNIT', 160, 96); });
  T.train = cv(512, 128, function(g, w, h){ g.fillStyle = '#2b4c7e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e1b23c'; g.fillRect(0, 84, w, 12); g.fillStyle = '#1b2f50'; g.fillRect(0, 104, w, 24);
    for(var x = 20; x < w; x += 46){ g.fillStyle = '#cfdbe6'; g.fillRect(x, 22, 30, 34); g.fillStyle = 'rgba(30,40,60,.5)'; g.fillRect(x, 40, 30, 16); } });
  T.boxcar = cv(512, 128, function(g, w, h){ g.fillStyle = '#7b3b24'; g.fillRect(0, 0, w, h); for(var x = 0; x < w; x += 16){ g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 3, h); } g.fillStyle = '#e8d9b0'; g.font = 'bold 26px Arial,sans-serif'; g.fillText('MIDLAND FREIGHT', 120, 70); });
  T.crossbuck = cv(256, 256, function(g, w, h){ g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); [0.7, -0.7].forEach(function(a){ g.save(); g.rotate(a); g.fillStyle = '#ffffff'; g.fillRect(-120, -18, 240, 36); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(-120, -18, 240, 36); g.fillStyle = '#111'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText(a > 0 ? 'RAILROAD' : 'CROSSING', 0, 9); g.restore(); }); });
};
A.sign = function(text, opt){ opt = opt || {}; var w = opt.w || 512, h = opt.h || 128;
  var t = cv(w, h, function(g){ g.fillStyle = opt.bg || '#1f4e79'; g.fillRect(0, 0, w, h); g.strokeStyle = opt.fg || '#fff'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = opt.fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; var lines = String(text).split('\n'), fs = opt.size || (lines.length > 1 ? 40 : 56); g.font = 'bold ' + fs + 'px Arial,Helvetica,sans-serif';
    lines.forEach(function(l, i){ g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.1); }); });
  var m = new THREE.Mesh(new THREE.PlaneGeometry(opt.mw || 1.6, (opt.mw || 1.6) * h / w), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); return m; };
// ---------------------------------------------------------------- materials
var MC = {}; A.mat = function(col, o){ var k = col + JSON.stringify(o || {}); if(MC[k]) return MC[k]; var m = new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.75, metalness: 0 }, o || {})); MC[k] = m; return m; };
var GC = {}; function geo(k, f){ return GC[k] || (GC[k] = f()); }
A.box = function(w, h, d, mat, x, y, z, parent){ var m = new THREE.Mesh(geo('b' + w + ',' + h + ',' + d, function(){ return new THREE.BoxGeometry(w, h, d); }), mat); m.position.set(x || 0, y || 0, z || 0); if(parent) parent.add(m); return m; };
A.cyl = function(r1, r2, h, mat, x, y, z, parent, seg){ var m = new THREE.Mesh(geo('c' + r1 + ',' + r2 + ',' + h + ',' + (seg || 12), function(){ return new THREE.CylinderGeometry(r1, r2, h, seg || 12); }), mat); m.position.set(x || 0, y || 0, z || 0); if(parent) parent.add(m); return m; };
A.sph = function(r, mat, x, y, z, parent, sx, sy, sz, ws, hs){ var m = new THREE.Mesh(geo('s' + r + ',' + (ws || 16) + ',' + (hs || 12), function(){ return new THREE.SphereGeometry(r, ws || 16, hs || 12); }), mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || 1, sz || 1); if(parent) parent.add(m); return m; };

// ---------------------------------------------------------------- people
// A person is a joint hierarchy with real proportions (≈1.62–1.86 m). Joints: hips, spine, neck, head, shoulders/elbows,
// hips/knees. Every limb segment is a tapered cylinder so silhouettes read; clothing is per-part colour + optional
// coat skirt / gown / scrub top / mask / cap / hair style. Pose() drives joint angles.
function limb(len, r0, r1, mat, parent){ var g = new THREE.Group(); parent.add(g); var m = A.cyl(r0, r1, len, mat, 0, -len / 2, 0, g, 10); m.castShadow = false; g.userData.len = len; return g; }
function tint(c, k){ return new THREE.Color(c).multiplyScalar(k).getHex(); }
function mixc(a, b, t){ return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex(); }
function ball(r, mat, x, y, z, parent, sx, sy, sz){ return A.sph(r, mat, x, y, z, parent, sx, sy, sz, 8, 6); }
// Hand: palm + grouped fingers + thumb. grip=true curls the fingers into a fist around the gun grip. Returns the hand group (J.handL/R).
function makeHand(parent, mats, sx, grip){ var h = new THREE.Group(); h.position.y = -0.3; parent.add(h); var skin = mats.skin;
  if(grip){
    A.box(0.034, 0.05, 0.075, skin, -0.025 * sx, -0.03, 0.06, h);                                          // palm against the grip
    A.box(0.056, 0.014, 0.074, skin, 0.0, -0.0, 0.06, h);                                                  // fingers across the front of the grip
    for(var i = 0; i < 4; i++) A.box(0.014, 0.05, 0.017, skin, 0.03 * sx, -0.03, 0.03 + i * 0.0185, h);        // curled finger tips (one per finger)
    var th = A.box(0.014, 0.014, 0.05, skin, -0.012 * sx, -0.058, 0.07, h); th.rotation.x = 0.2;           // thumb
  } else {
    A.box(0.058, 0.07, 0.028, skin, 0, 0.0, 0, h);                                                          // palm
    var f1 = new THREE.Group(); f1.position.set(0, -0.035, 0); f1.rotation.x = 0.28; h.add(f1); A.box(0.056, 0.04, 0.022, skin, 0, -0.02, 0, f1);   // four fingers, first segment
    var f2 = new THREE.Group(); f2.position.set(0, -0.04, 0); f2.rotation.x = 0.55; f1.add(f2); A.box(0.054, 0.034, 0.019, skin, 0, -0.017, 0, f2);   // second segment, curled
    var th2 = A.box(0.016, 0.046, 0.017, skin, -0.032 * sx, -0.012, 0.012, h); th2.rotation.set(0.25, 0, 0.18 * sx);                                // thumb
  }
  return h; }
A.person = function(o){ o = Object.assign({ height: 1.75, build: 1.0, skin: 0xc8957a, top: 0x3a4552, bottom: 0x2b2f36, shoes: 0x1b1b1d, hair: 0x2a1d15, hairStyle: 'short', sleeves: 'long', gun: null }, o);
  var s = o.height / 1.75, b = o.build, root = new THREE.Group(), J = {}, M = { skin: A.mat(o.skin, { roughness: 0.6 }), top: o.topMat || A.mat(o.top), bottom: A.mat(o.bottom), shoes: A.mat(o.shoes, { roughness: 0.5 }), hair: A.mat(o.hair, { roughness: 0.9 }) };
  var scrubs = !!o.mask || (o.top === o.bottom && o.sleeves === 'short' && !o.gown), gownish = !!(o.gown || o.topMat), cm = o.coat ? A.mat(o.coat, { side: THREE.DoubleSide, roughness: 0.8 }) : null;
  var SL = cm || M.top, cuffM = cm ? A.mat(o.coat) : A.mat(tint(o.top, 0.78));
  var body = new THREE.Group(); body.scale.setScalar(s); root.add(body);
  J.hips = new THREE.Group(); J.hips.position.y = 0.95; body.add(J.hips);
  A.cyl(0.155 * b, 0.165 * b, 0.2, M.bottom, 0, 0.0, 0, J.hips, 14).scale.z = 0.72;                       // pelvis
  J.spine = new THREE.Group(); J.spine.position.y = 0.08; J.hips.add(J.spine);
  var torso = A.cyl(0.19 * b, 0.15 * b, 0.48, M.top, 0, 0.26, 0, J.spine, 16); torso.scale.z = 0.62;       // chest tapers to the waist
  A.sph(0.19 * b, M.top, 0, 0.47, 0, J.spine, 1.12, 0.42, 0.66);                                          // shoulder line
  [-1, 1].forEach(function(k){ var tz = A.box(0.1, 0.035, 0.085, M.top, k * 0.085 * b, 0.505, -0.01, J.spine); tz.rotation.z = -k * 0.38; });   // trapezius slope into the neck
  ball(0.15 * b, M.top, 0, 0.37, 0.05, J.spine, 1.05, 0.72, 0.42);                                         // chest
  ball(0.15 * b, M.top, 0, 0.4, -0.05, J.spine, 1.05, 0.7, 0.42);                                          // upper back
  J.neck = new THREE.Group(); J.neck.position.y = 0.53; J.spine.add(J.neck); A.cyl(0.042, 0.057, 0.1, M.skin, 0, 0.04, 0, J.neck);   // tapered neck
  if(!scrubs && !gownish && !o.coat){ A.cyl(0.066, 0.076, 0.035, o.jacket ? A.mat(tint(o.top, 0.8)) : M.top, 0, 0.515, 0, J.spine, 14); }   // collar band
  if(scrubs){ var vs = new THREE.Shape(); vs.moveTo(-0.034, 0.512); vs.lineTo(0.034, 0.512); vs.lineTo(0, 0.44); var vn = new THREE.Mesh(geo('vneck', function(){ return new THREE.ShapeGeometry(vs); }), M.skin); vn.position.z = 0.127 * b; J.spine.add(vn); }   // V-neck opening
  if(o.belt !== false && !gownish && !o.coat && !scrubs && o.top !== o.bottom){ var bm = A.mat(0x17130f, { roughness: 0.55 }); A.cyl(0.157 * b, 0.157 * b, 0.032, bm, 0, 0.035, 0, J.spine, 16).scale.z = 0.66; A.box(0.032, 0.026, 0.012, A.mat(0xb5b09a, { metalness: 0.7, roughness: 0.35 }), 0, 0.035, 0.108 * b, J.spine); }   // belt + buckle
  J.head = new THREE.Group(); J.head.position.y = 0.1; J.neck.add(J.head);
  face(o, J.head, M, scrubs);
  hair(o, J.head, M);
  ['L', 'R'].forEach(function(side){ var sx = side === 'L' ? 1 : -1;
    var sh = J['sh' + side] = new THREE.Group(); sh.position.set(sx * 0.2 * b, 0.46, 0); J.spine.add(sh);
    var up = limb(0.29, 0.052 * b, 0.045 * b, o.sleeves === 'short' ? M.skin : SL, sh); if(o.sleeves === 'short') A.cyl(0.056 * b, 0.05 * b, 0.12, M.top, 0, -0.06, 0, up);
    var el = J['el' + side] = new THREE.Group(); el.position.y = -0.29; up.add(el); var fo = limb(0.26, 0.042, 0.035, o.sleeves === 'long' ? SL : M.skin, el);
    if(o.sleeves === 'long') A.cyl(0.039, 0.039, 0.034, cuffM, 0, -0.243, 0, fo, 10);                      // sleeve cuff
    J['hand' + side] = makeHand(fo, M, sx, !!(o.gun && side === 'R'));
    var hp = J['hip' + side] = new THREE.Group(); hp.position.set(sx * 0.09 * b, -0.02, 0); J.hips.add(hp);
    var th = limb(0.44, 0.078 * b, 0.06 * b, M.bottom, hp); var kn = J['kn' + side] = new THREE.Group(); kn.position.y = -0.44; th.add(kn);
    var shin = limb(0.43, 0.055, 0.042, M.bottom, kn); A.box(0.09, 0.07, 0.24, M.shoes, 0, -0.46, 0.05, shin); A.box(0.094, 0.024, 0.25, A.mat(0x0b0b0c, { roughness: 0.9 }), 0, -0.489, 0.05, shin);   // shoe + sole
  });
  if(o.coat){ // open lab coat: back + side panels (front left open), lapels, collar, pockets
    var open = 0.5, skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * b, 0.275 * b, 0.62, 18, 1, true, open, Math.PI * 2 - open * 2), cm); skirt.position.set(0, -0.22, 0); skirt.scale.z = 0.72; J.hips.add(skirt);
    var chest = new THREE.Mesh(new THREE.CylinderGeometry(0.205 * b, 0.172 * b, 0.5, 18, 1, true, open * 0.8, Math.PI * 2 - open * 1.6), cm); chest.position.set(0, 0.26, 0); chest.scale.z = 0.66; J.spine.add(chest);
    [-1, 1].forEach(function(k){ var lp = A.box(0.055, 0.34, 0.012, cm, k * 0.075 * b, 0.34, 0.122 * b, J.spine); lp.rotation.z = k * 0.22; lp.rotation.y = -k * 0.18;   // lapels
      var cl = A.box(0.07, 0.05, 0.05, cm, k * 0.05, 0.525, -0.005, J.spine); cl.rotation.z = -k * 0.3;                                                      // collar wing
      var pk = A.box(0.075, 0.07, 0.012, A.mat(tint(o.coat, 0.93)), k * 0.125 * b, -0.2, 0.15 * b, J.hips); pk.rotation.y = k * 0.5; });                         // hip pockets
    A.box(0.05, 0.045, 0.01, A.mat(tint(o.coat, 0.93)), 0.09 * b, 0.4, 0.13 * b, J.spine); A.box(0.008, 0.07, 0.008, A.mat(0x2a4a8a), 0.092 * b, 0.445, 0.132 * b, J.spine);   // breast pocket + pen
    var lg = A.box(0.014, 0.035, 0.008, A.mat(0xd8d8d0, { roughness: 0.5 }), -0.07 * b, 0.4, 0.13 * b, J.spine); }   // id badge
  if(o.jacket){ var jm = A.mat(tint(o.top, 0.86)), zp = A.mat(0x2a2218, { metalness: 0.5 });
    A.box(0.008, 0.46, 0.006, zp, 0, 0.26, 0.119 * b, J.spine);                                            // zip
    [-1, 1].forEach(function(k){ A.box(0.058, 0.052, 0.014, jm, k * 0.075 * b, 0.33, 0.118 * b, J.spine);   // chest pockets
      A.box(0.065, 0.065, 0.014, jm, k * 0.095 * b, 0.1, 0.1 * b, J.spine);                                                                                                                        // lower pockets
      var cl = A.box(0.06, 0.04, 0.05, jm, k * 0.05, 0.525, 0.02, J.spine); cl.rotation.z = -k * 0.35; });   // collar flaps
    A.cyl(0.158 * b, 0.158 * b, 0.05, jm, 0, 0.02, 0, J.spine, 16).scale.z = 0.66; }                        // hem band
  if(o.gown || gownish){ var gm = new THREE.MeshStandardMaterial({ map: A.tex.gown, roughness: 0.9 }); if(o.gown){ var gs = A.cyl(0.19, 0.25, 0.6, gm, 0, -0.22, 0, J.hips, 16); gs.scale.z = 0.7; }
    var tm2 = A.mat(tint(o.top, 0.85)); A.box(0.012, 0.09, 0.006, tm2, -0.03, 0.4, -0.103 * b, J.spine).rotation.z = 0.25; A.box(0.012, 0.09, 0.006, tm2, 0.03, 0.4, -0.103 * b, J.spine).rotation.z = -0.25;   // back ties
    A.box(0.012, 0.08, 0.006, tm2, -0.03, 0.2, -0.1 * b, J.spine).rotation.z = 0.2; A.box(0.012, 0.08, 0.006, tm2, 0.03, 0.2, -0.1 * b, J.spine).rotation.z = -0.2; }
  if(o.vest){ A.cyl(0.2 * b, 0.17 * b, 0.4, A.mat(o.vest, { roughness: 0.6 }), 0, 0.28, 0, J.spine, 14).scale.z = 0.7; }
  if(o.bag){ var bag = A.cyl(0.08, 0.08, 0.3, A.mat(0x2b2b2b), 0.17, 0.02, -0.06, J.spine, 10); bag.rotation.z = Math.PI / 2; A.box(0.02, 0.5, 0.02, A.mat(0x1a1a1a), 0.02, 0.28, -0.12, J.spine).rotation.z = -0.6; }
  if(o.gun){ J.gun = gunMesh(o.gun); J.gun.position.set(0, -0.33, 0.06); J.gun.rotation.x = Math.PI / 2;   /* barrel out past the hand (was -PI/2: pointed back up the forearm) */ J.handR.parent.add(J.gun); }
  root.userData.J = J; root.userData.person = o; root.userData.scale = s;
  // contact shadow
  var sh = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; root.add(sh); J.shadow = sh;
  A.pose(root, 'stand', 0); return root; };
// Face on the head group (head centre ~ y 0.1): skull, jaw, chin, cheekbones, nose, eyes in sockets, brows, ears, lips, mask / beard / glasses.
function face(o, head, M, scrubs){
  var dk = A.mat(tint(o.skin, 0.62), { roughness: 0.8 }), lipM = A.mat(mixc(o.skin, 0x8a2f2f, 0.55), { roughness: 0.45 }), brM = A.mat(o.hairStyle === 'grey' ? 0x7a7a78 : tint(o.hair, 0.8), { roughness: 0.9 });
  A.sph(0.1, M.skin, 0, 0.1, 0.005, head, 0.92, 1.12, 1.0);                                                // skull
  A.sph(0.08, M.skin, 0, 0.042, 0.018, head, 0.9, 0.85, 0.95);                                             // jaw
  ball(0.03, M.skin, 0, 0.018, 0.074, head, 1.0, 0.75, 0.8);                                               // chin
  ball(0.03, M.skin, 0, 0.088, 0.093, head, 0.55, 1.1, 0.8);                                               // nose bridge + tip
  if(!o.mask) ball(0.02, M.skin, 0, 0.074, 0.103, head, 0.9, 0.7, 0.75);
  [-1, 1].forEach(function(k){
    ball(0.019, dk, k * 0.037, 0.106, 0.084, head, 1.2, 0.85, 0.5);                                         // eye socket
    ball(0.0095, A.mat(0x20170f, { roughness: 0.25 }), k * 0.037, 0.105, 0.0925, head, 1.15, 0.9, 0.7);    // eye (dark, set into the socket)
    A.box(0.046, 0.009, 0.014, brM, k * 0.037, 0.128, 0.087, head).rotation.z = -k * 0.12;                   // eyebrow
    ball(0.02, M.skin, k * 0.056, 0.078, 0.062, head, 1, 0.6, 0.5);                                            // cheekbone
    ball(0.021, M.skin, k * 0.093, 0.095, 0.0, head, 0.4, 1.0, 0.7); });                                          // ear
  if(!o.mask) A.box(0.036, 0.007, 0.012, lipM, 0, 0.037, 0.096, head);                                       // lips
  if(o.mask){ ball(0.084, A.mat(o.mask, { roughness: 0.85 }), 0, 0.03, 0.022, head, 1.03, 0.9, 1.0);        // surgical mask wraps the jaw
  }
  if(o.beard){ ball(0.088, M.hair, 0, 0.026, 0.028, head, 1.0, 0.62, 0.9);                                   // beard hugs the jaw
    A.box(0.05, 0.012, 0.014, M.hair, 0, 0.05, 0.094, head); }                                              // moustache
  if(o.glasses){ var gm = A.mat(0x222222), gl = A.mat(0x99aabb, { transparent: true, opacity: 0.5 }); A.box(0.15, 0.012, 0.01, gm, 0, 0.106, 0.104, head);
    [-1, 1].forEach(function(k){ A.box(0.05, 0.036, 0.008, gl, k * 0.038, 0.1, 0.104, head); A.box(0.004, 0.004, 0.1, gm, k * 0.082, 0.106, 0.05, head); }); } }
function hair(o, head, M){ var h = o.hairStyle;
  if(h === 'bald') return;
  if(h === 'cap'){ A.sph(0.108, A.mat(o.capCol || 0x2a3340), 0, 0.15, 0, head, 1, 0.6, 1.05); A.box(0.16, 0.015, 0.09, A.mat(o.capCol || 0x2a3340), 0, 0.14, 0.1, head); return; }
  if(h === 'beanie'){ A.sph(0.11, A.mat(o.capCol || 0x1c1c1c), 0, 0.16, 0, head, 1, 0.75, 1.02); return; }
  if(h === 'surgical'){ A.sph(0.108, A.mat(o.capCol || 0x5d8fa8), 0, 0.155, -0.005, head, 1, 0.62, 1.05); return; }
  A.sph(0.106, M.hair, 0, 0.14, -0.012, head, 0.98, 0.78, 1.04);
  if(h === 'ponytail'){ var p = A.cyl(0.035, 0.018, 0.3, M.hair, 0, 0.0, -0.13, head); p.rotation.x = 0.35; A.sph(0.04, M.hair, 0, 0.12, -0.1, head); }
  if(h === 'bun'){ A.sph(0.052, M.hair, 0, 0.17, -0.09, head); }
  if(h === 'long'){ A.box(0.2, 0.26, 0.06, M.hair, 0, -0.02, -0.08, head); }
  if(h === 'curly'){ for(var i = 0; i < 7; i++){ var a = i / 7 * Math.PI * 2; A.sph(0.04, M.hair, Math.cos(a) * 0.08, 0.17 + Math.sin(i) * 0.01, Math.sin(a) * 0.07 - 0.01, head); } }
  if(h === 'grey'){ M.hair.color.set(0x9a9a98); } }
function gunMesh(kind){ var g = new THREE.Group(), m = A.mat(0x1b1c1e, { metalness: 0.5, roughness: 0.4 });
  if(kind === 'smg'){ A.box(0.05, 0.08, 0.32, m, 0, 0.02, 0.1, g); A.box(0.035, 0.12, 0.05, m, 0, -0.07, 0.02, g); A.box(0.03, 0.14, 0.04, m, 0, -0.08, 0.14, g); }
  else { A.box(0.035, 0.05, 0.2, m, 0, 0.02, 0.06, g); A.box(0.03, 0.1, 0.045, m, 0, -0.045, 0.0, g); }
  g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.03, kind === 'smg' ? 0.28 : 0.17); g.add(g.userData.muzzle); return g; }
A.gunMesh = gunMesh;
// ---- poses: joint angles; t = animation clock. aimDir (local, optional) points the right arm.
A.pose = function(p, name, t, opt){ var J = p.userData.J; if(!J) return; opt = opt || {}; var S = Math.sin, k;
  var set = function(j, x, y, z){ if(J[j]) J[j].rotation.set(x || 0, y || 0, z || 0); };
  ['hips', 'spine', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'].forEach(function(j){ set(j); });
  J.hips.position.y = 0.95; J.hips.position.x = 0; J.hips.position.z = 0; p.userData.pose = name;
  if(name === 'walk' || name === 'run'){ var f = name === 'run' ? 9 : 5.5, a = name === 'run' ? 0.75 : 0.45; k = S(t * f);
    set('hipL', k * a); set('hipR', -k * a); set('knL', Math.max(0, -k) * a * 1.3); set('knR', Math.max(0, k) * a * 1.3); set('shL', -k * a * 0.8); set('shR', k * a * 0.8); set('elL', -0.4); set('elR', -0.4);
    set('spine', name === 'run' ? 0.18 : 0.04); J.hips.position.y = 0.95 + Math.abs(S(t * f)) * 0.03; }
  if(name === 'aim' || name === 'aimWalk' || name === 'lean'){ set('shR', -1.45 + (opt.pitch || 0), 0, 0.05); set('elR', 0); set('shL', -1.3 + (opt.pitch || 0), 0, -0.45); set('elL', -0.35); set('spine', 0, opt.yaw || 0, 0);
    if(name === 'lean'){ set('spine', 0, 0, (opt.side || 1) * 0.32); J.hips.position.x = (opt.side || 1) * 0.12; }
    if(name === 'aimWalk'){ k = S(t * 6); set('hipL', k * 0.35); set('hipR', -k * 0.35); set('knL', Math.max(0, -k) * 0.5); set('knR', Math.max(0, k) * 0.5); } }
  if(name === 'crouch'){ J.hips.position.y = 0.55; set('hipL', -1.4); set('hipR', -1.2); set('knL', 2.2); set('knR', 2.0); set('spine', 0.35); set('shR', -0.6); set('elR', -0.8); set('shL', -0.4); set('elL', -0.9); }
  if(name === 'peek'){ J.hips.position.y = 0.6; set('hipL', -1.3); set('hipR', -1.0); set('knL', 2.0); set('knR', 1.7); set('spine', 0.2, 0, (opt.side || 1) * 0.25); set('shR', -1.4); set('shL', -1.2, 0, -0.4); set('elL', -0.3); }
  if(name === 'dead'){ J.hips.position.y = 0.12; set('hips', -Math.PI / 2 + 0.05); set('shL', -2.6, 0, -0.5); set('shR', -2.2, 0, 0.7); set('elR', -0.4); set('hipL', 0.15, 0, 0.12); set('hipR', -0.05, 0, -0.18); set('knL', 0.3); set('head', 0, 0.5, 0); }
  if(name === 'hurt'){ J.hips.position.y = 0.55; set('hipL', -1.4); set('hipR', -1.4); set('knL', 2.3); set('knR', 2.3); set('spine', 0.6); set('shL', -1.0); set('elL', -1.6); set('shR', -0.6); set('elR', -1.9); set('head', 0.3); }
  if(name === 'sit'){ J.hips.position.y = 0.47; set('hipL', -1.45); set('hipR', -1.45); set('knL', 1.45); set('knR', 1.45); set('spine', opt.upright ? -0.05 : 0.42); set('neck', opt.upright ? 0 : -0.3); set('shL', -0.25, 0, -0.15); set('elL', -1.1);
    set('shR', -1.35 + (opt.pitch || 0), opt.yaw || 0, 0.1); set('elR', -0.1); }
  if(name === 'lie'){ J.hips.position.y = 0.0; set('hips', -Math.PI / 2); set('neck', -0.55); set('head', 0.15); set('shL', -0.2, 0, 0.1); set('elL', -0.6);
    set('shR', -2.6 + (opt.pitch || 0), opt.yaw || 0, 0.15); set('elR', 0); }
  if(name === 'push' || name === 'pushFire'){ set('spine', 0.74); set('shL', -0.85, 0, -0.06); set('elL', -0.2); set('shR', -0.85, 0, 0.06); set('elR', -0.2); set('neck', -0.6); set('head', -0.12); J.hips.position.y = 0.9;
    k = S(t * 5.2) * (opt.speed || 0); set('hipL', k * 0.4 - 0.1); set('hipR', -k * 0.4 - 0.1); set('knL', Math.max(0, -k) * 0.5 + 0.1); set('knR', Math.max(0, k) * 0.5 + 0.1);
    if(name === 'pushFire'){ set('shR', -1.5 + (opt.pitch || 0), opt.yaw || 0, -0.1); set('elR', 0); set('spine', 0.74, 0, 0); } }   // fires one-handed, staying as low as the push and never twisting across the player's line of sight
  if(name === 'recline'){ J.hips.position.y = 0.0; set('spine', -0.72); set('neck', 0.35); set('head', 0.1); set('hipL', -1.5); set('hipR', -1.5); set('knL', 0.12); set('knR', 0.12); set('shL', -0.3, 0, 0.15); set('elL', -0.9);
    set('shR', -1.4 + (opt.pitch || 0), opt.yaw || 0, 0.1); }
  if(name === 'drive'){ J.hips.position.y = 0.52; set('hipL', -1.4); set('hipR', -1.4); set('knL', 1.3); set('knR', 1.3); set('shL', -1.1); set('elL', -0.6); set('shR', -1.1); set('elR', -0.6); }
  if(name === 'talk'){ set('shR', -0.5 + S(t * 3) * 0.15, 0, 0.2); set('elR', -1.2); set('head', 0, S(t * 1.3) * 0.15, 0); }
  if(name === 'cower'){ J.hips.position.y = 0.6; set('hipL', -1.3); set('hipR', -1.3); set('knL', 2.0); set('knR', 2.0); set('spine', 0.7); set('shL', -2.3, 0, -0.4); set('elL', -2.0); set('shR', -2.3, 0, 0.4); set('elR', -2.0); }
  if(name === 'flee'){ A.pose(p, 'run', t); set('shL', -2.4, 0, -0.3); set('elL', -1.5); set('shR', -2.4, 0, 0.3); set('elR', -1.5); p.userData.pose = 'flee'; }
};
A.muzzleWorld = function(p, out){ var J = p.userData.J; if(!J || !J.gun) return null; return J.gun.userData.muzzle.getWorldPosition(out || new V()); };

// ---- the cast (originals) ----
A.cast = {
  cole: function(){ return A.person({ height: 1.8, skin: 0xb98668, top: 0xa9c8d8, topMat: new THREE.MeshStandardMaterial({ map: A.tex.gown, roughness: 0.9 }), bottom: 0x8fb0c2, hair: 0x2b1d14, hairStyle: 'curly', beard: true, sleeves: 'short', gun: 'pistol', shoes: 0x9aa4a8 }); },
  maya: function(){ return A.person({ height: 1.68, build: 0.9, skin: 0x9b6b4c, top: 0x3f4649, bottom: 0x1f2a44, hair: 0x15100d, hairStyle: 'ponytail', gun: 'pistol', bag: true, jacket: true, shoes: 0x3b2a20 }); },
  hale: function(){ return A.person({ height: 1.78, skin: 0xd9a98c, top: 0x6c8fb0, bottom: 0x30343c, hair: 0x9a9a98, hairStyle: 'grey', glasses: true, coat: 0xf2f2ee }); },
  gunman: function(i){ var tops = [0x2b2f36, 0x5a2c24, 0x34402f, 0x3b3a52], hs = ['beanie', 'short', 'cap', 'bald'];
    return A.person({ height: 1.76 + (i % 3) * 0.05, build: 1.05 + (i % 2) * 0.08, skin: [0xc8957a, 0x8a5a3c, 0xe0b090, 0x6b4630][i % 4], top: tops[i % 4], bottom: 0x22252a, hairStyle: hs[i % 4], capCol: 0x1c1c1c, vest: i % 2 ? 0x1f2522 : null, gun: i % 3 === 2 ? 'smg' : 'pistol' }); },
  staff: function(i){ var sc = [0x5d8fa8, 0x4f7f6d, 0x6c78a8][i % 3]; return A.person({ height: 1.78, build: 1.05, skin: [0xd0a080, 0x7a4a30, 0xb88a6a][i % 3], top: sc, bottom: sc, sleeves: 'short', hairStyle: 'surgical', capCol: sc, mask: 0xbfd5e0, gun: i % 2 ? 'smg' : 'pistol' }); },
  bystander: function(kind, i){ if(kind === 'nurse') return A.person({ height: 1.64, build: 0.88, skin: [0xe2b49a, 0x8d5c40][i % 2], top: 0xe57fa0, bottom: 0xe57fa0, sleeves: 'short', hair: 0x6b4a2e, hairStyle: 'bun', shoes: 0xeeeeee });
    if(kind === 'patient') return A.person({ height: 1.7, skin: 0xc9a088, gown: true, top: 0xa9c8d8, topMat: new THREE.MeshStandardMaterial({ map: A.tex.gown, roughness: 0.9 }), bottom: 0xc9a088, sleeves: 'short', hair: 0x9a9a98, hairStyle: 'grey' });
    return A.person({ height: 1.74, skin: 0x8a5a3c, top: 0x7a8fa0, bottom: 0x7a8fa0, sleeves: 'short', hairStyle: 'short' }); }
};

// ---------------------------------------------------------------- vehicles + props
A.bed = function(){ var g = new THREE.Group(), steel = A.mat(0xb8bcc0, { metalness: 0.6, roughness: 0.35 }), dark = A.mat(0x2c3034);
  // head end at local z = 0 (the rider point — Cole's head), foot toward +z (travel direction)
  A.box(0.95, 0.12, 2.1, steel, 0, 0.5, 1.0, g); A.box(0.92, 0.16, 2.02, A.mat(0xaeb3b4), 0, 0.64, 1.0, g);                                  // frame + mattress
  [-0.47, 0.47].forEach(function(x){ A.box(0.04, 0.5, 0.04, steel, x, 0.8, -0.06, g); }); A.box(0.98, 0.04, 0.04, steel, 0, 1.02, -0.06, g); A.box(0.98, 0.36, 0.05, A.mat(0xcfd6da), 0, 0.68, 2.06, g);   // open head rail + foot board
  var back = A.box(0.9, 0.08, 0.6, A.mat(0xaeb3b4), 0, 0.9, 0.42, g); back.rotation.x = 0.72;                                                    // raised back section (Cole reclines on it)
  [-0.5, 0.5].forEach(function(x){ A.box(0.03, 0.03, 1.4, steel, x, 0.88, 0.95, g); A.box(0.03, 0.22, 0.03, steel, x, 0.77, 0.3, g); A.box(0.03, 0.22, 0.03, steel, x, 0.77, 1.6, g); });   // side rails
  A.box(0.9, 0.035, 0.035, steel, 0, 1.0, -0.12, g); [-0.45, 0.45].forEach(function(x){ A.box(0.03, 0.2, 0.03, steel, x, 0.9, -0.12, g); });   // push bar at the head (1.0 m: Maya's painted grip height)
  [[-0.4, 0.1], [0.4, 0.1], [-0.4, 1.9], [0.4, 1.9]].forEach(function(c){ A.cyl(0.07, 0.07, 0.05, dark, c[0], 0.08, c[1], g).rotation.z = Math.PI / 2; A.box(0.03, 0.38, 0.03, steel, c[0], 0.29, c[1], g); });
  var bl = new THREE.MeshStandardMaterial({ map: A.tex.blanket, roughness: 0.95 }); var b = A.box(0.9, 0.14, 1.25, bl, 0, 0.8, 1.38, g); b.name = 'blanket';
  var pil = A.box(0.5, 0.1, 0.3, A.mat(0xffffff), 0, 1.22, 0.06, g); pil.rotation.x = 0.72;   // pillow on the raised back
  g.userData.grip = new V(0, 1.0, -0.12); return g; };
A.wheelchair = function(){ var g = new THREE.Group(), steel = A.mat(0x9aa0a6, { metalness: 0.7, roughness: 0.3 }), seat = A.mat(0x24272b);
  A.box(0.48, 0.05, 0.46, seat, 0, 0.5, 0, g); A.box(0.48, 0.45, 0.05, seat, 0, 0.78, -0.22, g);                                         // seat + low back (Cole's shoulders clear it)
  [-0.27, 0.27].forEach(function(x){ var w = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 24), A.mat(0x111111)); w.position.set(x, 0.31, -0.05); w.rotation.y = Math.PI / 2; g.add(w);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.01, 6, 24), steel); rim.position.copy(w.position); rim.position.x += x > 0 ? 0.03 : -0.03; rim.rotation.y = Math.PI / 2; g.add(rim);
    A.box(0.025, 0.02, 0.45, steel, x * 0.95, 0.66, 0.0, g); A.box(0.025, 0.55, 0.025, steel, x * 0.92, 0.78, -0.24, g); A.box(0.025, 0.025, 0.14, A.mat(0x111111), x * 0.92, 1.05, -0.3, g);   // armrests, uprights, handles
    A.cyl(0.06, 0.06, 0.03, A.mat(0x111111), x * 0.8, 0.07, 0.3, g).rotation.z = Math.PI / 2; A.box(0.02, 0.4, 0.02, steel, x * 0.8, 0.28, 0.24, g); });
  A.box(0.4, 0.02, 0.14, steel, 0, 0.14, 0.38, g);                                                                                     // footplate
  g.userData.grip = new V(0, 1.05, -0.34); return g; };
// zones: tire (front wheels), driver (windshield), engine (hood) — the engine's chase raycast resolves by these
A.car = function(kind){ var g = new THREE.Group(), suv = kind === 'suv', L = suv ? 4.9 : 4.8, W = suv ? 2.0 : 1.88, H = suv ? 1.0 : 0.72, base = suv ? 0.45 : 0.38;
  var paint = kind === 'suv' ? A.mat(0x0e0f11, { metalness: 0.6, roughness: 0.35 }) : A.mat(0xf0f1ef, { metalness: 0.3, roughness: 0.45 });
  var sideTex = kind === 'patrol' ? A.tex.patrolSide : kind === 'charger' ? A.tex.chargerSide : null;
  var sideMat = sideTex ? new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.45, metalness: 0.2 }) : paint;
  var body = A.box(W, H, L, [sideMat, sideMat, paint, paint, paint, paint], 0, base + H / 2, 0, g); body.material = [sideMat, sideMat, paint, paint, paint, paint];
  var glass = A.mat(0x1b2733, { metalness: 0.6, roughness: 0.15 }), cabH = suv ? 0.75 : 0.55, cabL = suv ? 2.9 : 2.1, cabZ = suv ? -0.45 : -0.25;
  A.box(W - 0.14, cabH, cabL, kind === 'suv' ? A.mat(0x0b0c0e, { metalness: 0.5, roughness: 0.3 }) : paint, 0, base + H + cabH / 2, cabZ, g);
  [-1, 1].forEach(function(sx){ A.box(0.02, cabH * 0.75, cabL * 0.85, glass, sx * (W / 2 - 0.06), base + H + cabH * 0.48, cabZ, g); });
  var ws = A.box(W - 0.2, cabH * 0.95, 0.06, A.mat(0x6e8ea6, { metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 }), 0, base + H + cabH * 0.5, cabZ + cabL / 2 + 0.04, g); ws.rotation.x = -0.45; ws.userData.zone = 'driver';
  var driver = A.person({ height: 1.75, top: suv ? 0x111111 : 0x1d3f8a, hairStyle: suv ? 'short' : 'cap', capCol: 0x1d2a4a }); A.pose(driver, 'drive', 0); driver.scale.setScalar(0.9); driver.position.set(-0.4, base + H - 0.75, cabZ + 0.2); g.add(driver);
  var hood = A.box(W - 0.1, 0.05, 1.1, kind === 'suv' ? A.mat(0x16181b, { metalness: 0.6, roughness: 0.3 }) : paint, 0, base + H + 0.03, L / 2 - 0.62, g); hood.userData.zone = 'engine';
  A.box(W - 0.3, 0.22, 0.05, A.mat(0x151515), 0, base + H * 0.55, L / 2 + 0.01, g);                                                  // grille
  [-1, 1].forEach(function(sx){ A.box(0.34, 0.12, 0.04, A.mat(0xfff4d6, { emissive: 0xfff2c8, emissiveIntensity: 1.2 }), sx * (W / 2 - 0.3), base + H * 0.68, L / 2 + 0.02, g); });
  if(kind === 'charger'){ var pb = A.mat(0x111111, { metalness: 0.4 }); A.box(1.5, 0.08, 0.08, pb, 0, base + 0.35, L / 2 + 0.28, g); A.box(1.5, 0.08, 0.08, pb, 0, base + 0.65, L / 2 + 0.28, g); [-0.6, 0.6].forEach(function(x){ A.box(0.08, 0.5, 0.08, pb, x, base + 0.5, L / 2 + 0.28, g); }); }
  if(kind !== 'suv'){ var bar = new THREE.Group(); bar.position.set(0, base + H + cabH + 0.06, cabZ); g.add(bar); var red = A.mat(0xff2020, { emissive: 0xff0000, emissiveIntensity: 2 }), blue = A.mat(0x2050ff, { emissive: 0x1040ff, emissiveIntensity: 2 });
    A.box(0.55, 0.1, 0.22, red, -0.3, 0, 0, bar); A.box(0.55, 0.1, 0.22, blue, 0.3, 0, 0, bar); g.userData.lightbar = bar; }
  var tm = A.mat(0x121212, { roughness: 0.8 }), rimM = A.mat(0x9a9a9a, { metalness: 0.7 });
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function(c, i){ var w = new THREE.Group(); w.position.set(c[0] * (W / 2 - 0.02), 0.36, c[1] * (L / 2 - 0.85)); g.add(w);
    var t = A.cyl(0.36, 0.36, 0.26, tm, 0, 0, 0, w, 16); t.rotation.z = Math.PI / 2; var r = A.cyl(0.2, 0.2, 0.27, rimM, 0, 0, 0, w, 10); r.rotation.z = Math.PI / 2; if(c[1] > 0){ t.userData.zone = 'tire'; r.userData.zone = 'tire'; } });
  var sh = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, L + 0.5), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
  g.userData.kind = kind; return g; };
// the ambulance: box body with an OPEN rear bay (interior + door frame are in the AMBULANCE rig's view); front = +z
A.ambulance = function(){ var g = new THREE.Group(), white = A.mat(0xb9bbb8, { roughness: 0.5 }), sideM = new THREE.MeshStandardMaterial({ map: A.tex.ambSide, roughness: 0.5 }), dark = A.mat(0x24282c);
  var Lb = 3.8, W = 2.3, floor = 0.75, Hb = 2.05, zb = -0.9;                                                                           // the bay box: z from zb-Lb/2 .. zb+Lb/2
  A.box(W, 0.12, Lb, A.mat(0x7f8a8f), 0, floor, zb, g);                                                                                 // bay floor
  A.box(0.08, Hb, Lb, sideM, -W / 2, floor + Hb / 2, zb, g).material = sideM; A.box(0.08, Hb, Lb, sideM, W / 2, floor + Hb / 2, zb, g).material = sideM;
  A.box(W, 0.08, Lb, white, 0, floor + Hb, zb, g); A.box(W, Hb, 0.08, white, 0, floor + Hb / 2, zb + Lb / 2, g);
  var inner = A.mat(0x8f999e, { roughness: 0.6 }); A.box(0.3, 1.1, 2.4, inner, -W / 2 + 0.2, floor + 1.25, zb + 0.3, g); A.box(0.25, 0.6, 2.4, A.mat(0x7c868b), W / 2 - 0.16, floor + 0.35, zb + 0.3, g);   // cabinets + bench
  A.box(0.6, 0.12, 1.9, A.mat(0x7f898e), 0.2, floor + 0.5, zb + 0.4, g); A.box(0.06, 0.4, 0.06, A.mat(0x9aa0a6), 0.2, floor + 0.25, zb + 0.9, g);                                      // stretcher
  for(var i = 0; i < 3; i++) A.box(1.4, 0.05, 0.1, A.mat(0xfff8e8, { emissive: 0xfff3d8, emissiveIntensity: 1.5 }), 0, floor + Hb - 0.06, zb - 1.2 + i * 1.1, g);                        // bay lights
  A.box(0.08, Hb, 0.12, A.mat(0xcc3a30), -W / 2 + 0.04, floor + Hb / 2, zb - Lb / 2, g); A.box(0.08, Hb, 0.12, A.mat(0xcc3a30), W / 2 - 0.04, floor + Hb / 2, zb - Lb / 2, g);                // door frame
  A.box(W, 0.12, 0.12, A.mat(0xcc3a30), 0, floor + Hb - 0.04, zb - Lb / 2, g); A.box(W, 0.1, 0.25, A.mat(0x3a3a3a), 0, floor - 0.05, zb - Lb / 2 - 0.1, g);                           // header + step
  [-1, 1].forEach(function(sx){ var d = new THREE.Group(); d.position.set(sx * W / 2, floor, zb - Lb / 2); g.add(d); var dm = A.box(1.12, 1.9, 0.06, white, -sx * 0.56, 0.98, 0, d); A.box(0.6, 0.55, 0.07, A.mat(0x2b3a46, { metalness: 0.5, roughness: 0.2 }), -sx * 0.56, 1.45, 0, d);
    d.rotation.y = sx * 1.85; });                                                                                                         // rear doors swung OPEN
  var cab = new THREE.Group(); cab.position.set(0, 0, zb + Lb / 2 + 0.95); g.add(cab); A.box(W - 0.05, 1.15, 1.9, white, 0, 1.1, 0, cab); A.box(W - 0.15, 0.7, 0.08, A.mat(0x24323d, { metalness: 0.6, roughness: 0.15 }), 0, 1.95, 0.5, cab).rotation.x = -0.4;
  A.box(W - 0.1, 0.75, 1.2, white, 0, 2.05, -0.3, cab); A.box(W - 0.3, 0.35, 0.05, dark, 0, 0.85, 0.96, cab);
  var bar = new THREE.Group(); bar.position.set(0, floor + Hb + 0.1, zb + Lb / 2 - 0.2); g.add(bar); A.box(0.6, 0.12, 0.25, A.mat(0xff2a2a, { emissive: 0xff0000, emissiveIntensity: 2 }), -0.45, 0, 0, bar); A.box(0.6, 0.12, 0.25, A.mat(0xff2a2a, { emissive: 0xff0000, emissiveIntensity: 2 }), 0.45, 0, 0, bar); g.userData.lightbar = bar;
  var tm = A.mat(0x121212); [[-1, zb - 1.0], [1, zb - 1.0], [-1, zb + Lb / 2 + 0.9], [1, zb + Lb / 2 + 0.9]].forEach(function(c){ A.cyl(0.42, 0.42, 0.3, tm, c[0] * (W / 2 - 0.05), 0.42, c[1], g, 16).rotation.z = Math.PI / 2; });
  A.box(W - 0.2, 0.3, Lb + 2.3, dark, 0, 0.5, zb + 1.1, g);                                                                            // chassis
  g.userData.bayFloor = floor; g.userData.rearZ = zb - Lb / 2; return g; };
A.train = function(){ var g = new THREE.Group(), side = new THREE.MeshStandardMaterial({ map: A.tex.train, roughness: 0.5, metalness: 0.3, emissive: 0x16243a, emissiveIntensity: 0.6 }), dark = A.mat(0x1a1d22), yel = A.mat(0xf2c12e, { emissive: 0x5a4208, emissiveIntensity: 0.9 });   // high-contrast livery: reads in the dark grade
  // locomotive (front = +z): long hood, raised cab, sloped nose, headlights, ditch lights, handrails, bogies
  var loco = new THREE.Group(); g.add(loco); A.box(3.0, 2.6, 17, side, 0, 2.6, -8.5, loco).material = [side, side, A.mat(0x2b4c7e), dark, A.mat(0x2b4c7e), A.mat(0x2b4c7e)];
  A.box(3.1, 1.2, 3.2, A.mat(0x2b4c7e), 0, 4.3, -1.8, loco); A.box(2.6, 0.6, 0.06, A.mat(0x182531, { metalness: 0.6, roughness: 0.1 }), 0, 4.45, -0.18, loco);
  var nose = A.box(3.0, 1.4, 1.4, yel, 0, 2.0, 0.6, loco); nose.rotation.x = 0.25;
  [-0.9, 0.9].forEach(function(x){ A.sph(0.32, A.mat(0xfff6d6, { emissive: 0xfff3c0, emissiveIntensity: 9 }), x, 1.6, 1.4, loco); }); A.sph(0.36, A.mat(0xfff6d6, { emissive: 0xfff3c0, emissiveIntensity: 9 }), 0, 4.0, 0.05, loco);   // ditch lights + headlight: bloom
  [-1.52, 1.52].forEach(function(x){ A.box(0.04, 0.35, 16.6, A.mat(0xf2c12e, { emissive: 0x6a4c08, emissiveIntensity: 1.2 }), x, 1.75, -8.5, loco); A.box(0.04, 0.2, 16.6, A.mat(0xd8282b, { emissive: 0x500808, emissiveIntensity: 1 }), x, 2.2, -8.5, loco); });   // side stripes
  A.box(3.2, 0.25, 0.4, A.mat(0x8c8c8c), 0, 0.9, 1.5, loco);                                                                         // pilot / plough
  function bogies(parent, z0, len){ [z0 + 2.2, z0 + len - 2.2].forEach(function(z){ A.box(2.6, 0.7, 3.0, dark, 0, 0.75, z, parent); [-1, 1].forEach(function(sx){ [-0.8, 0.8].forEach(function(dz){ A.cyl(0.5, 0.5, 0.2, A.mat(0x3a3a3a, { metalness: 0.6 }), sx * 1.28, 0.55, z + dz, parent, 14).rotation.z = Math.PI / 2; }); }); }); }
  bogies(loco, -17, 17); A.box(0.06, 1.0, 15, A.mat(0xd8d8d8), 1.6, 3.5, -9, loco); A.box(0.06, 1.0, 15, A.mat(0xd8d8d8), -1.6, 3.5, -9, loco);
  var box = new THREE.MeshStandardMaterial({ map: A.tex.boxcar, roughness: 0.8 });
  for(var i = 0; i < 7; i++){ var car = new THREE.Group(); car.position.z = -17.8 - i * 15.4; g.add(car); A.box(3.0, 3.1, 14.6, box, 0, 2.75, -7.3, car).material = [box, box, A.mat(0x6a3320), dark, A.mat(0x6a3320), A.mat(0x6a3320)]; bogies(car, -14.6, 14.6); }
  g.userData.length = 17.8 + 7 * 15.4; return g; };
A.crossing = function(){ var g = new THREE.Group(), pole = A.mat(0xdedede, { metalness: 0.4 }), lights = [];
  var cb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: A.tex.crossbuck, transparent: true, side: THREE.DoubleSide })); cb.position.set(0, 3.6, 0); g.add(cb);
  A.cyl(0.07, 0.07, 4.2, pole, 0, 2.1, 0, g); A.box(1.2, 0.08, 0.08, A.mat(0x222222), 0, 2.7, 0.1, g);
  [-0.45, 0.45].forEach(function(x){ var l = A.sph(0.16, A.mat(0x400000, { emissive: 0xff1010, emissiveIntensity: 0 }), x, 2.7, 0.2, g); lights.push(l); A.cyl(0.24, 0.24, 0.06, A.mat(0x111111), x, 2.7, 0.14, g).rotation.x = Math.PI / 2; });
  var arm = new THREE.Group(); arm.position.set(0.3, 1.1, 0.2); g.add(arm); for(var i = 0; i < 8; i++) A.box(0.9, 0.12, 0.08, A.mat(i % 2 ? 0xd02020 : 0xf4f4f4), 0.45 + i * 0.9, 0, 0, arm);
  g.userData.lights = lights; g.userData.arm = arm; return g; };
A.crashCart = function(){ var g = new THREE.Group(), red = A.mat(0xc0332b, { roughness: 0.4 }); A.box(0.9, 0.95, 0.6, red, 0, 0.6, 0, g); for(var i = 0; i < 4; i++) A.box(0.86, 0.02, 0.02, A.mat(0x7a1d18), 0, 0.3 + i * 0.22, 0.31, g);
  A.box(0.5, 0.25, 0.35, A.mat(0x2f3a3f), 0, 1.2, 0, g); A.box(0.4, 0.18, 0.02, A.mat(0x6fe0a0, { emissive: 0x30c070, emissiveIntensity: 0.8 }), 0, 1.22, 0.18, g); [-0.4, 0.4].forEach(function(x){ A.cyl(0.05, 0.05, 0.04, A.mat(0x111111), x, 0.05, 0.25, g).rotation.z = Math.PI / 2; A.cyl(0.05, 0.05, 0.04, A.mat(0x111111), x, 0.05, -0.25, g).rotation.z = Math.PI / 2; }); return g; };
A.gurney = function(){ var g = new THREE.Group(), st = A.mat(0xb8bcc0, { metalness: 0.6 }); A.box(0.7, 0.08, 1.9, st, 0, 0.8, 0, g); A.box(0.66, 0.1, 1.85, A.mat(0xe8f0f2), 0, 0.88, 0, g); A.box(0.05, 0.75, 0.05, st, 0, 0.42, 0.7, g); A.box(0.05, 0.75, 0.05, st, 0, 0.42, -0.7, g); A.box(0.6, 0.04, 1.5, st, 0, 0.12, 0, g); return g; };
A.ivPole = function(){ var g = new THREE.Group(), st = A.mat(0xc0c4c8, { metalness: 0.7 }); A.cyl(0.015, 0.015, 1.9, st, 0, 0.95, 0, g); A.cyl(0.25, 0.25, 0.03, st, 0, 0.05, 0, g, 5); A.box(0.12, 0.2, 0.04, A.mat(0xdff0f6, { transparent: true, opacity: 0.8 }), 0.05, 1.75, 0, g); return g; };
A.monitorStand = function(){ var g = new THREE.Group(); A.cyl(0.02, 0.02, 1.3, A.mat(0x888888), 0, 0.65, 0, g); var s = A.box(0.38, 0.28, 0.06, A.mat(0x1a1a1a), 0, 1.4, 0, g); A.box(0.33, 0.22, 0.01, A.mat(0x0a2a14, { emissive: 0x20d060, emissiveIntensity: 0.6 }), 0, 1.4, 0.035, g); return g; };
A.chairRow = function(n){ var g = new THREE.Group(), st = A.mat(0x8a9096, { metalness: 0.5 }), seat = new THREE.MeshStandardMaterial({ map: A.tex.seat, roughness: 0.8 });
  A.box(n * 0.58, 0.05, 0.08, st, (n - 1) * 0.29, 0.25, 0, g); for(var i = 0; i < n; i++){ A.box(0.52, 0.08, 0.5, seat, i * 0.58, 0.46, 0, g); A.box(0.52, 0.5, 0.07, seat, i * 0.58, 0.74, -0.24, g); A.box(0.04, 0.45, 0.04, st, i * 0.58 - 0.27, 0.22, 0, g); } return g; };
A.table = function(){ var g = new THREE.Group(); A.box(1.2, 0.05, 0.8, new THREE.MeshStandardMaterial({ map: A.tex.wood }), 0, 0.75, 0, g); A.cyl(0.05, 0.05, 0.72, A.mat(0x555a60, { metalness: 0.6 }), 0, 0.37, 0, g); A.cyl(0.32, 0.32, 0.03, A.mat(0x555a60), 0, 0.015, 0, g);
  A.box(0.35, 0.02, 0.26, A.mat(0x2f6f8f), -0.25, 0.79, 0.1, g); A.cyl(0.04, 0.035, 0.1, A.mat(0xf0f0f0), 0.3, 0.83, -0.15, g); return g; };
A.plant = function(){ var g = new THREE.Group(); A.cyl(0.22, 0.17, 0.4, A.mat(0x6b4a33), 0, 0.2, 0, g); for(var i = 0; i < 6; i++) A.sph(0.22, A.mat(0x3f6b34), Math.cos(i) * 0.15, 0.6 + (i % 3) * 0.18, Math.sin(i) * 0.15, g); return g; };
A.vending = function(){ var g = new THREE.Group(); A.box(0.9, 1.85, 0.8, A.mat(0xb3262b), 0, 0.925, 0, g); A.box(0.6, 1.3, 0.02, A.mat(0xdff4ff, { emissive: 0x9fd8ff, emissiveIntensity: 0.6 }), -0.1, 1.05, 0.41, g); return g; };
A.streetLight = function(){ var g = new THREE.Group(), m = A.mat(0x5a5e63, { metalness: 0.6 }); A.cyl(0.08, 0.11, 7, m, 0, 3.5, 0, g); A.box(1.6, 0.08, 0.1, m, 0.75, 6.95, 0, g); A.box(0.5, 0.12, 0.25, A.mat(0xfff2c8, { emissive: 0xffe2a0, emissiveIntensity: 2 }), 1.45, 6.85, 0, g); return g; };
A.tree = function(s){ var g = new THREE.Group(); A.cyl(0.12, 0.18, 2.4, A.mat(0x4a3628), 0, 1.2, 0, g); var lm = A.mat(0x3c5e30, { roughness: 0.9 }); for(var i = 0; i < 5; i++) A.sph(1.1, lm, Math.cos(i * 1.3) * 0.7, 3 + (i % 2) * 0.6, Math.sin(i * 1.3) * 0.7, g, 1, 0.85, 1); g.scale.setScalar(s || 1); return g; };
})();
