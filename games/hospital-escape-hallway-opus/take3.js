/* TAKE 3 — Painted push. Route: no sourced textures, no real-time light. Every floor / wall / ceiling quad gets its OWN hand-painted canvas
   (procedural brushwork in the painted cast's language: teal-slate shadows, warm tungsten highlights), painted FOR ITS PLACE: the light pools
   are painted where the real lamps are, walls glow under each lamp and fall into shadow toward the floor, grime collects at the skirting, the
   floor carries painted tile seams and painted lamp reflections. Drawn unlit (MeshBasicMaterial). */
window.__HALL_TAKE = function(H){
  var V = H.V, P = H.parts, R = +(new URLSearchParams(location.search).get('r') || 9), PPM = 48;
  var rnd = (function(seed){ return function(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; })(41);
  var lamps = []; P.panel.forEach(function(pm){ var pa = pm.geometry.attributes.position; for(var i = 0; i + 6 <= pa.count; i += 6){ var c = new V(); for(var k = 0; k < 6; k++) c.add(new V().fromBufferAttribute(pa, i + k)); lamps.push(c.multiplyScalar(1 / 6)); } });
  P.pool.forEach(function(m){ m.visible = false; });
  function quad(m){ var g = m.geometry, pa = g.attributes.position, uv = g.attributes.uv, c = {}; for(var i = 0; i < pa.count; i++) c[Math.round(uv.getX(i)) + '' + Math.round(uv.getY(i))] = new V().fromBufferAttribute(pa, i);
    return { o: c['00'], ex: c['10'].clone().sub(c['00']), ey: c['01'].clone().sub(c['00']), n: new V().fromBufferAttribute(g.attributes.normal, 0) }; }
  function hex(c, a){ return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function strokes(x, w, h, base, n, len, jit){ for(var i = 0; i < n; i++){ var px = rnd() * w, py = rnd() * h, a = (rnd() - 0.5) * 0.5, L = len * (0.5 + rnd()), c = [base[0] + (rnd() - 0.5) * jit, base[1] + (rnd() - 0.5) * jit, base[2] + (rnd() - 0.5) * jit];
      x.strokeStyle = hex(c, 0.05 + rnd() * 0.07); x.lineWidth = 2 + rnd() * 6; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + L * 0.5 * Math.cos(a) + (rnd() - 0.5) * 8, py + L * 0.5 * Math.sin(a) + (rnd() - 0.5) * 8, px + L * Math.cos(a), py + L * Math.sin(a)); x.stroke(); } }
  function paint(kind, m){ var q = quad(m), Wm = q.ex.length(), Hm = q.ey.length(), W = Math.min(2048, Math.max(32, Math.round(Wm * PPM))), Hh = Math.min(2048, Math.max(32, Math.round(Hm * PPM)));
    var cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; var x = cv.getContext('2d'), ux = q.ex.clone().normalize(), uy = q.ey.clone().normalize();
    var toPx = function(p){ var d = p.clone().sub(q.o); return [d.dot(ux) / Wm * W, (1 - d.dot(uy) / Hm) * Hh]; };   // canvas row 0 = v = 1 (flipY)
    var near = lamps.filter(function(L){ var d = L.clone().sub(q.o), u = d.dot(ux), v = d.dot(uy); return u > -4 && u < Wm + 4 && v > -4 && v < Hm + 4 && Math.abs(d.dot(q.n)) < 4.5; });
    if(kind === 'floor'){
      var base = R >= 3 ? [92, 104, 102] : [120, 128, 124]; x.fillStyle = hex(base, 1); x.fillRect(0, 0, W, Hh);
      strokes(x, W, Hh, base, Math.round(W * Hh / 160), 40, 28);
      x.strokeStyle = 'rgba(30,38,40,0.35)'; x.lineWidth = 1.5; for(var s = 0; s < Wm; s += 0.6){ var X = s / Wm * W; x.beginPath(); x.moveTo(X + (rnd() - 0.5) * 2, 0); x.lineTo(X + (rnd() - 0.5) * 2, Hh); x.stroke(); }
      for(var t = 0; t < Hm; t += 0.6){ var Y = Hh - t / Hm * Hh; x.beginPath(); x.moveTo(0, Y); x.lineTo(W, Y + (rnd() - 0.5) * 2); x.stroke(); }
      near.forEach(function(L){ var c = toPx(L.clone().setY(q.o.y)), r = 1.9 * PPM, g = x.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);   // painted light pool under each lamp
        g.addColorStop(0, R >= 3 ? 'rgba(255,236,200,0.55)' : 'rgba(255,240,215,0.4)'); g.addColorStop(0.5, 'rgba(230,214,180,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
        if(R >= 2){ x.save(); x.translate(c[0], c[1]); x.scale(1, 0.35); var g2 = x.createRadialGradient(0, 0, 0, 0, 0, 0.7 * PPM); g2.addColorStop(0, 'rgba(255,250,235,0.5)'); g2.addColorStop(1, 'rgba(255,250,235,0)'); x.fillStyle = g2; x.beginPath(); x.arc(0, 0, 0.7 * PPM, 0, 6.3); x.fill(); x.restore(); } });   // painted gloss streak
      if(R >= 3){ var e = x.createLinearGradient(0, 0, 0, Hh); var alongX = Math.abs(q.ex.x) > 0.5; if(!alongX){ e = x.createLinearGradient(0, 0, W, 0); }   // dirt + shadow creeping in from the walls
        e.addColorStop(0, 'rgba(20,30,32,0.5)'); e.addColorStop(0.18, 'rgba(20,30,32,0)'); e.addColorStop(0.82, 'rgba(20,30,32,0)'); e.addColorStop(1, 'rgba(20,30,32,0.5)'); x.fillStyle = e; x.fillRect(0, 0, W, Hh); } }
    else if(kind === 'wall'){
      var top = R >= 3 ? [168, 182, 176] : [190, 198, 192], low = R >= 3 ? [66, 98, 100] : [96, 124, 122], railY = Hh * (1 - 1.0 / Hm), rail2 = Hh * (1 - 1.09 / Hm);
      var gr = x.createLinearGradient(0, 0, 0, railY); gr.addColorStop(0, hex([top[0] * 0.78, top[1] * 0.8, top[2] * 0.82], 1)); gr.addColorStop(1, hex(top, 1)); x.fillStyle = gr; x.fillRect(0, 0, W, railY);
      x.fillStyle = hex(low, 1); x.fillRect(0, railY, W, Hh - railY); strokes(x, W, Hh, top, Math.round(W * Hh / 220), 50, 22);
      x.fillStyle = 'rgba(52,58,60,1)'; x.fillRect(0, rail2, W, railY - rail2); x.fillStyle = 'rgba(14,18,20,1)'; x.fillRect(0, Hh - 0.12 * PPM, W, 0.12 * PPM);   // chair rail + skirting
      near.forEach(function(L){ var c = toPx(L), r = 2.4 * PPM, g = x.createRadialGradient(c[0], 0, 0, c[0], 0, r); g.addColorStop(0, 'rgba(255,232,196,' + (R >= 3 ? 0.5 : 0.35) + ')'); g.addColorStop(1, 'rgba(255,232,196,0)'); x.fillStyle = g; x.fillRect(0, 0, W, Hh); });   // lamp wash down the wall
      if(R >= 2){ for(var i2 = 0; i2 < W / 30; i2++){ var gx = rnd() * W, gw = 10 + rnd() * 40; var gg = x.createLinearGradient(0, Hh - 0.45 * PPM, 0, Hh); gg.addColorStop(0, 'rgba(30,26,20,0)'); gg.addColorStop(1, 'rgba(30,26,20,' + (0.15 + rnd() * 0.2) + ')'); x.fillStyle = gg; x.fillRect(gx, Hh - 0.45 * PPM, gw, 0.45 * PPM); } }   // scuffs above the skirting
      var sh = x.createLinearGradient(0, 0, 0, Hh); sh.addColorStop(0, 'rgba(10,20,24,0.25)'); sh.addColorStop(0.15, 'rgba(10,20,24,0)'); sh.addColorStop(0.85, 'rgba(10,20,24,0)'); sh.addColorStop(1, 'rgba(10,20,24,0.35)'); x.fillStyle = sh; x.fillRect(0, 0, W, Hh); }
    else { var cb = R >= 3 ? [150, 156, 152] : [178, 182, 176]; x.fillStyle = hex(cb, 1); x.fillRect(0, 0, W, Hh); strokes(x, W, Hh, cb, Math.round(W * Hh / 260), 30, 16);
      x.strokeStyle = 'rgba(80,88,88,0.4)'; x.lineWidth = 1.2; for(var s2 = 0; s2 < Wm; s2 += 0.6){ var X2 = s2 / Wm * W; x.beginPath(); x.moveTo(X2, 0); x.lineTo(X2, Hh); x.stroke(); } for(var t2 = 0; t2 < Hm; t2 += 0.6){ var Y2 = t2 / Hm * Hh; x.beginPath(); x.moveTo(0, Y2); x.lineTo(W, Y2); x.stroke(); }
      near.forEach(function(L){ var c = toPx(L), g = x.createRadialGradient(c[0], c[1], 0, c[0], c[1], 1.6 * PPM); g.addColorStop(0, 'rgba(255,244,222,0.5)'); g.addColorStop(1, 'rgba(255,244,222,0)'); x.fillStyle = g; x.fillRect(0, 0, W, Hh); });
      var cs = x.createLinearGradient(0, 0, W, 0); if(Math.abs(q.ex.x) < 0.5){ cs = x.createLinearGradient(0, 0, 0, Hh); } cs.addColorStop(0, 'rgba(20,28,30,0.45)'); cs.addColorStop(0.2, 'rgba(20,28,30,0)'); cs.addColorStop(0.8, 'rgba(20,28,30,0)'); cs.addColorStop(1, 'rgba(20,28,30,0.45)'); x.fillStyle = cs; x.fillRect(0, 0, W, Hh); }
    var t3 = new THREE.CanvasTexture(cv); t3.encoding = THREE.sRGBEncoding; t3.anisotropy = 8; return new THREE.MeshBasicMaterial({ map: t3 }); }
  P.floor.forEach(function(m){ m.material = paint('floor', m); }); P.wall.forEach(function(m){ m.material = paint('wall', m); }); P.ceil.forEach(function(m){ m.material = paint('ceil', m); });
  // doors / station / props: painted-cast tone (flat key from above + teal shadow side), the cast's grade
  H.gameLights.forEach(function(l){ if(l.isHemisphereLight){ l.intensity = 1.0; l.color.setHex(0xffe9cc); l.groundColor.setHex(0x2f4a50); } else l.intensity = 0.3; });
  P.panel.forEach(function(m){ m.material.color.setRGB(2.0, 1.95, 1.8); });
  H.soft = R >= 3 ? 0.8 : 0.55; H.post = function(u){ u.exposure.value = R >= 3 ? 0.74 : 0.7; u.bloom.value = 0.6; if(R >= 3){ u.sat.value = 0.8; } };
};
