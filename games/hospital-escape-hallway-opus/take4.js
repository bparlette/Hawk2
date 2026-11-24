/* TAKE 4 — Maximum-density kit-bash. Route: take 1's lighting + PBR as the base, then the corridor dressed as a working ward:
   wall handrails on brackets (broken at every door + the station), stainless kick/bumper strips, corner guards, sanitiser dispensers at
   every door, fire-extinguisher cabinet, wall clock, notice boards + framed posters (painted on canvas, the hospital's own), exit + room
   signage, ceiling vents / smoke detectors / sprinkler heads, waiting chairs, a parked wheelchair, linen + waste carts, wet-floor sign,
   worn-floor decals and scuff marks. Code-built geometry (+ the game's own prop builders), merged per material so the draw calls stay flat. */
(function(){ var base = window.__HALL_TAKE;
window.__HALL_TAKE = function(H){ base(H); var R = +(new URLSearchParams(location.search).get('r4') || 9), V = H.V, A = H.A, z = H.zone, x0 = z.a[0], y = z.y, hw = z.w / 2, zA = z.a[1], zB = z.b[1];
  var g = new THREE.Group(); g.name = 'dressing';
  var M = function(c, o){ return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0 }, o || {})); };
  var steel = M(0xb9c0c4, { metalness: 0.85, roughness: 0.3 }), rail = M(0xd8d2c6, { roughness: 0.45 }), red = M(0xb3221c, { roughness: 0.4 }), dark = M(0x23272b), white = M(0xe8ece9), yellow = M(0xf0c419, { roughness: 0.5 });
  var box = function(w, h, d, m, px, py, pz, ry, par){ var b = A.box(w, h, d, m, px, py, pz, par || g); if(ry) b.rotation.y = ry; return b; };
  var LX = x0 - hw, RX = x0 + hw, doorsL = z.doorsL, doorsR = z.doorsR, st = z.station.z;
  var clearAt = function(zz, side){ var ds = side < 0 ? doorsL : doorsR; for(var i = 0; i < ds.length; i++) if(Math.abs(zz - ds[i]) < 0.85) return false; if(side < 0 && Math.abs(zz - st) < 1.6) return false; return true; };
  // 1 handrails + bumper strips along both walls, broken at doors and the station
  [-1, 1].forEach(function(side){ var wx = side < 0 ? LX + 0.07 : RX - 0.07, run = null;
    for(var zz = zA - 0.1; zz >= zB + 0.1; zz -= 0.05){ var ok = clearAt(zz, side); if(ok && run === null) run = zz; if((!ok || zz - 0.05 < zB + 0.1) && run !== null){ var z1 = zz + (ok ? 0 : 0.05), L = run - z1;
        if(L > 0.4){ var mz = (run + z1) / 2; A.cyl(0.022, 0.022, L, rail, wx, y + 0.9, mz, g, 8).rotation.x = Math.PI / 2;
          for(var b = run - 0.2; b > z1 + 0.1; b -= 1.2) box(0.07, 0.05, 0.03, steel, wx - side * 0.04, y + 0.88, b);
          if(R >= 2) box(0.012, 0.16, L, steel, side < 0 ? LX + 0.006 : RX - 0.006, y + 0.3, mz); }   // kick strip
        run = null; } } });
  // 2 door-side dressing: sanitiser dispenser + room plate on the latch side of every door
  [[doorsL, -1], [doorsR, 1]].forEach(function(e){ e[0].forEach(function(dz){ var wx = e[1] < 0 ? LX + 0.05 : RX - 0.05; box(0.1, 0.22, 0.09, white, wx, y + 1.25, dz + 0.82); box(0.06, 0.05, 0.1, dark, wx, y + 1.13, dz + 0.82);
      if(R >= 2) box(0.02, 0.32, 0.24, M(0x2a3d4f), wx, y + 1.62, dz - 0.82); }); });
  // 3 fire extinguisher cabinet + clock + exit sign + notice boards / posters (canvas-painted, the hospital's own)
  var fx = RX - 0.07, fz = -31.6; box(0.14, 0.75, 0.55, M(0xdedad2), fx, y + 1.15, fz); box(0.01, 0.6, 0.42, M(0x9fb7c2, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.4 }), fx - 0.075, y + 1.15, fz); A.cyl(0.075, 0.075, 0.5, red, fx - 0.02, y + 1.1, fz, g, 12);
  var canvasMat = function(draw, w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); };
  var clock = canvasMat(function(x, w){ x.fillStyle = '#f4f2ec'; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 4, 0, 6.3); x.fill(); x.lineWidth = 6; x.strokeStyle = '#222'; x.stroke(); for(var i = 0; i < 12; i++){ var a = i / 12 * 6.283; x.fillRect(w / 2 + Math.cos(a) * (w / 2 - 18) - 3, w / 2 + Math.sin(a) * (w / 2 - 18) - 3, 6, 6); } x.lineWidth = 8; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 + 30, w / 2 - 50); x.stroke(); x.lineWidth = 5; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 - 70, w / 2 + 12); x.stroke(); }, 256, 256);
  var ck = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), clock); ck.position.set(LX + 0.02, y + 2.3, -33.4); ck.rotation.y = Math.PI / 2; g.add(ck);
  var poster = function(title, sub, col){ return canvasMat(function(x, w, h){ x.fillStyle = '#f3f1ea'; x.fillRect(0, 0, w, h); x.fillStyle = col; x.fillRect(0, 0, w, h * 0.24); x.fillStyle = '#fff'; x.font = 'bold 34px Arial'; x.fillText(title, 18, 52);
    x.fillStyle = '#333'; x.font = '22px Arial'; sub.forEach(function(s, i){ x.fillText(s, 18, h * 0.24 + 44 + i * 34); }); x.fillStyle = '#c9c4b8'; for(var i = 0; i < 6; i++) x.fillRect(18, h * 0.62 + i * 18, w * (0.5 + 0.4 * ((i * 37) % 10) / 10), 8); }, 320, 440); };
  [['WASH YOUR HANDS', ['St. Mercer Infection', 'Control · Ward 4B'], '#2f6f78', LX + 0.02, -22.6, 1], ['VISITING HOURS', ['10:00 – 20:00', 'Two visitors per bed'], '#5b3b7a', RX - 0.02, -24.2, -1],
   ['QUIET PLEASE', ['Patients resting', 'Ward 4B · West Wing'], '#7a3b3b', LX + 0.02, -36.8, 1], ['FALL RISK', ['Call, don\'t fall.', 'Ask a nurse for help'], '#b07a16', RX - 0.02, -40.4, -1]].forEach(function(p){
    var m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.58), poster(p[0], p[1], p[2])); m.position.set(p[3], y + 1.55, p[4]); m.rotation.y = p[5] > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(m); box(0.015, 0.62, 0.46, dark, p[3] - p[5] * 0.008, y + 1.55, p[4]); });
  var exitM = new THREE.MeshBasicMaterial({ color: 0x23e07a }); box(0.36, 0.14, 0.04, exitM, x0, y + 2.6, zB + 0.25); var ex = A.sign('EXIT', { w: 256, h: 96, mw: 0.32, bg: '#0f7a3c', size: 64 }); ex.position.set(x0, y + 2.6, zB + 0.28); g.add(ex);
  // 4 ceiling services: return-air vents, smoke detectors, sprinkler heads
  if(R >= 2) for(var cz = zA - 1.6; cz > zB; cz -= 3.2){ box(0.55, 0.02, 0.55, M(0xd6d8d4, { roughness: 0.7 }), x0 + 0.95, y + z.h - 0.012, cz); for(var k = -2; k <= 2; k++) box(0.5, 0.012, 0.025, dark, x0 + 0.95, y + z.h - 0.025, cz + k * 0.09);
    A.cyl(0.05, 0.05, 0.03, white, x0 - 0.9, y + z.h - 0.02, cz + 0.8, g, 12); A.cyl(0.015, 0.008, 0.06, steel, x0 - 0.3, y + z.h - 0.04, cz - 0.6, g, 6); }
  // 5 furniture + clutter, all inside 0.6 m of the walls (the route stays clear): waiting chairs, parked wheelchair, linen + waste carts, wet-floor sign
  var add = function(o, px, pz, ry){ o.position.set(px, y, pz); o.rotation.y = ry || 0; g.add(o); return o; };
  add(A.chairRow(3), RX - 0.32, -32.9, -Math.PI / 2);
  add(A.wheelchair(), LX + 0.42, -34.6, Math.PI / 2.4);
  var linen = new THREE.Group(); box(0.55, 0.85, 0.75, M(0x3f6d8a), 0, 0.5, 0, 0, linen); box(0.58, 0.04, 0.78, steel, 0, 0.94, 0, 0, linen); box(0.5, 0.18, 0.7, M(0xeef0ee), 0, 1.02, 0, 0, linen); add(linen, RX - 0.36, -22.4);
  var bin = new THREE.Group(); A.cyl(0.2, 0.17, 0.62, M(0xd0c13b), 0, 0.31, 0, bin, 14); A.cyl(0.21, 0.21, 0.04, dark, 0, 0.63, 0, bin, 14); add(bin, LX + 0.28, -29.6);
  var bio = new THREE.Group(); box(0.4, 0.5, 0.32, M(0xc7362c), 0, 0.25, 0, 0, bio); add(bio, RX - 0.25, -36.4);
  var wet = new THREE.Group(); [-1, 1].forEach(function(s){ var p = box(0.32, 0.62, 0.012, yellow, 0, 0.3, s * 0.09, 0, wet); p.rotation.x = s * 0.28; }); var ws = A.sign('CAUTION · WET FLOOR', { w: 256, h: 64, mw: 0.3, bg: '#f0c419', fg: '#111', size: 26 }); ws.position.set(0, 0.42, 0.13); ws.rotation.x = -0.28; wet.add(ws); add(wet, LX + 0.55, -19.6, 0.4);
  if(R >= 2){ add(A.ivPole(), LX + 0.25, -39.6); add(A.monitorStand ? A.monitorStand() : new THREE.Group(), RX - 0.3, -26.6, -Math.PI / 2); }
  // 6 floor wear: scuffed paths down the centre line + rubber marks at doors (decals: transparent quads just above the floor)
  var decal = canvasMat(function(x, w, h){ x.clearRect(0, 0, w, h); for(var i = 0; i < 260; i++){ x.strokeStyle = 'rgba(30,28,24,' + (0.04 + Math.random() * 0.06) + ')'; x.lineWidth = 1 + Math.random() * 3; var px = w * (0.3 + 0.4 * Math.random()), py = Math.random() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 30, py + Math.random() * 60); x.stroke(); } }, 256, 1024);
  decal.transparent = true; decal.depthWrite = false; decal.polygonOffset = true; decal.polygonOffsetFactor = -2;
  var dm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, zA - zB), decal); dm.rotation.x = -Math.PI / 2; dm.position.set(x0, y + 0.004, (zA + zB) / 2); dm.renderOrder = 2; H.root.add(dm);
  g.traverse(function(o){ if(o.isMesh && o.material && o.material.map === undefined) {} });
  if(R >= 3){ // r3: wall graphics big enough to read at phone size + bulletin board + door kickplates + exposure trim
    [[RX - 0.02, -18.3, -1, '#2f6f78', 'WARD 4B', ['Beds 413 – 430', 'Nurses\' station →']], [LX + 0.02, -41.2, 1, '#8a3d2e', 'NO ENTRY', ['Staff only beyond', 'this point']]].forEach(function(p){
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62), poster(p[4], p[5], p[3])); m.position.set(p[0], y + 1.6, p[1]); m.rotation.y = p[2] > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(m); });
    var cork = canvasMat(function(x, w, h){ x.fillStyle = '#a7774a'; x.fillRect(0, 0, w, h); var cols = ['#f4f1e6', '#fdf3a8', '#cde7f0', '#f6d1d8', '#e6f2d4']; for(var i = 0; i < 16; i++){ x.save(); x.translate(20 + Math.random() * (w - 90), 16 + Math.random() * (h - 100)); x.rotate((Math.random() - 0.5) * 0.15); x.fillStyle = cols[i % 5]; x.fillRect(0, 0, 60 + Math.random() * 30, 70 + Math.random() * 30); x.fillStyle = '#c33'; x.beginPath(); x.arc(30, 6, 4, 0, 6.3); x.fill(); x.fillStyle = '#777'; for(var k = 0; k < 4; k++) x.fillRect(8, 20 + k * 12, 50, 4); x.restore(); } x.lineWidth = 14; x.strokeStyle = '#6b5a45'; x.strokeRect(0, 0, w, h); }, 512, 300);
    var cb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.82), cork); cb.position.set(RX - 0.02, y + 1.55, -38.0); cb.rotation.y = -Math.PI / 2; g.add(cb);
    [[doorsL, -1], [doorsR, 1]].forEach(function(e){ e[0].forEach(function(dz){ box(0.012, 0.28, 0.98, steel, e[1] < 0 ? LX + 0.03 : RX - 0.03, y + 0.15, dz + 0.01); }); });
    H.post = function(u){ u.exposure.value = 0.55; u.bloom.value = 0.55; }; }
  H.root.add(H.W.merge(g));
};
})();
