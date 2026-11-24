/* TAKE 2 — Baked lighting. Route: lighting computed OFFLINE (?bake=1 runs the baker in a browser; tools/bake writes PNGs), the runtime only
   SHOWS it: every floor / wall / ceiling quad gets its own lightmap (direct light from the 19 ceiling lamps with ray-traced shadows from
   walls, doors, station and props + ambient occlusion + a one-bounce ambient term), drawn unlit (MeshBasicMaterial map x lightMap).
   No real-time lights on the architecture. Doors (they open) and props take a matched hemisphere probe. Textures: the same CC0 PBR colour maps. */
window.__HALL_TAKE = function(H){
  var V = H.V, P = H.parts, Q = new URLSearchParams(location.search), R = +(Q.get('r') || 5), BAKE = Q.get('bake') === '1';
  var TPM = R >= 3 ? 14 : 8;                        // lightmap texels per metre (r1-2: 8, r3+: 14)
  var pts = []; P.panel.forEach(function(pm){ var pa = pm.geometry.attributes.position; for(var i = 0; i + 6 <= pa.count; i += 6){ var c = new V(); for(var k = 0; k < 6; k++) c.add(new V().fromBufferAttribute(pa, i + k)); pts.push(c.multiplyScalar(1 / 6)); } });
  P.pool.forEach(function(m){ m.visible = false; });
  var surfaces = [].concat(P.floor.map(function(m){ return ['floor', m]; }), P.wall.map(function(m){ return ['wall', m]; }), P.ceil.map(function(m){ return ['ceil', m]; }));
  function quad(m){ var g = m.geometry, pa = g.attributes.position, uv = g.attributes.uv, c = {}; for(var i = 0; i < pa.count; i++){ var u = Math.round(uv.getX(i)), v = Math.round(uv.getY(i)); c[u + '' + v] = new V().fromBufferAttribute(pa, i); }
    var n = new V().fromBufferAttribute(g.attributes.normal, 0); return { c00: c['00'], c10: c['10'], c01: c['01'], c11: c['11'], n: n }; }
  function key(kind, m){ var q = quad(m), c = q.c00.clone().add(q.c11).multiplyScalar(0.5); return kind + '_' + [c.x, c.y, c.z].map(function(x){ return Math.round(x * 10); }).join('_'); }
  var TEXSET = { floor: 'floor_col.jpg', wall: 'wall_col.jpg', ceil: 'ceil_col.jpg' }, TILE = { floor: 2.4, wall: 3.0, ceil: 2.4 };
  // ------------------------------------------------------------------ the baker
  function bake(){ var occ = []; H.root.traverse(function(o){ if(o.isMesh && o.visible && P.panel.indexOf(o) < 0 && P.pool.indexOf(o) < 0 && P.glass.indexOf(o) < 0) occ.push(o); });
    var rc = new THREE.Raycaster(), out = {}, dirs = []; for(var i = 0; i < 24; i++){ var u = (i + 0.5) / 24, phi = i * 2.39996, r = Math.sqrt(u); dirs.push([r * Math.cos(phi), Math.sqrt(1 - u), r * Math.sin(phi)]); }   // cosine-weighted hemisphere
    function blocked(p, d, dist){ rc.set(p, d); rc.near = 0.004; rc.far = dist; var h = rc.intersectObjects(occ, true); return h.length > 0; }
    surfaces.forEach(function(sm){ var kind = sm[0], m = sm[1], q = quad(m), ex = q.c10.clone().sub(q.c00), ey = q.c01.clone().sub(q.c00), W = Math.max(4, Math.ceil(ex.length() * TPM)), Hh = Math.max(4, Math.ceil(ey.length() * TPM));
      var t = new V(), b = new V(); t.copy(ex).normalize(); b.crossVectors(q.n, t).normalize(); var data = new Float32Array(W * Hh);
      for(var y = 0; y < Hh; y++) for(var x = 0; x < W; x++){ var p = q.c00.clone().addScaledVector(ex, (x + 0.5) / W).addScaledVector(ey, (y + 0.5) / Hh).addScaledVector(q.n, 0.01), e = 0;
        pts.forEach(function(L){ var d = L.clone().sub(p), dist = d.length(); if(dist > 9) return; d.normalize(); var cr = q.n.dot(d); if(cr <= 0) return; var ce = Math.max(0, d.y) * 0.85 + 0.15;   /* panel faces down: emitter cosine = d.y (r1-r3 had the sign flipped) */ if(blocked(p, d, dist - 0.05)) return; e += (R >= 5 ? 4.2 : 2.4) * cr * ce / (dist * dist); });
        var ao = 0, nd = R >= 2 ? dirs.length : 0; for(var k = 0; k < nd; k++){ var dd = dirs[k], w = t.clone().multiplyScalar(dd[0]).addScaledVector(q.n, dd[1]).addScaledVector(b, dd[2]); if(!blocked(p, w, 0.7)) ao++; }
        var aof = nd ? ao / nd : 1, bounce = kind === 'ceil' ? 0.34 : kind === 'floor' ? 0.2 : 0.26;   // one-bounce ambient: the ceiling sees the lit floor and walls most
        data[y * W + x] = e + bounce * aof * (R >= 4 ? 1.15 : 1); }
      out[key(kind, m)] = { w: W, h: Hh, data: data }; });
    return out; }
  function encode(lm){ var c = document.createElement('canvas'); c.width = lm.w; c.height = lm.h; var x = c.getContext('2d'), id = x.createImageData(lm.w, lm.h);
    for(var i = 0; i < lm.w * lm.h; i++){ var v = Math.pow(Math.min(1, lm.data[i] / 2), 1 / 2.2) * 255; var row = lm.h - 1 - Math.floor(i / lm.w), col = i % lm.w, o = (row * lm.w + col) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = v; id.data[o + 3] = 255; }
    x.putImageData(id, 0, 0); return c; }
  if(BAKE){ var t0 = performance.now(), maps = bake(); H.baked = {}; Object.keys(maps).forEach(function(k){ H.baked[k] = encode(maps[k]).toDataURL('image/png'); }); H.bakeMs = Math.round(performance.now() - t0); }
  // ------------------------------------------------------------------ runtime: show the bake
  var dir = '../hospital-escape-hallway-opus/take2/lm-r' + R + '/';
  var loads = surfaces.map(function(sm){ var kind = sm[0], m = sm[1], k = key(kind, m); return new Promise(function(res){
    var apply = function(tex){ tex.encoding = THREE.sRGBEncoding; tex.flipY = true; var g = m.geometry; if(!g.attributes.uv2) g.setAttribute('uv2', g.attributes.uv);
      var rep = m.material.map ? m.material.map.repeat.clone() : new THREE.Vector2(1, 1), kk = 1.2 / TILE[kind], col = H.tex(TEXSET[kind], [rep.x * kk, rep.y * kk * (kind === 'wall' ? 2.9 / 3 : 1)], true);
      m.material = new THREE.MeshBasicMaterial({ map: col, lightMap: tex, lightMapIntensity: 2.0, color: new THREE.Color(kind === 'wall' ? 0xd3d9d2 : kind === 'floor' ? 0xb4b9b8 : 0xbcbcb8) });
      if(kind === 'wall' && R >= 5){ var y0 = H.zone.y, mt = m.material; mt.onBeforeCompile = function(sh){ sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = 'varying float vWy;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float hy = vWy - ' + y0.toFixed(2) + ';\n if(hy < 1.0) diffuseColor.rgb *= vec3(0.42, 0.55, 0.56); else if(hy < 1.09) diffuseColor.rgb = vec3(0.30, 0.32, 0.33); if(hy < 0.12) diffuseColor.rgb = vec3(0.06, 0.07, 0.075);'); };
        mt.customProgramCacheKey = function(){ return 'opusWainscotB'; }; }
      res(); };
    if(BAKE) new THREE.TextureLoader().load(H.baked[k], apply, undefined, function(){ res(); }); else new THREE.TextureLoader().load(dir + k + '.png', apply, undefined, function(){ res(); }); }); });
  // the parts that move or are not baked: matched probe (hemisphere at the bake's average level), panels bright
  H.gameLights.forEach(function(l){ if(l.isHemisphereLight){ l.intensity = 0.9; l.color.setHex(0xfff4e6); l.groundColor.setHex(0x6b6a63); } else l.intensity = 0.25; });
  P.panel.forEach(function(m){ m.material.color.setRGB(2.3, 2.3, 2.2); });
  H.post = function(u){ u.exposure.value = 0.66; u.bloom.value = 0.55; };
  return Promise.all(loads);
};
