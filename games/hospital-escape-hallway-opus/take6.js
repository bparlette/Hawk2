/* TAKE 6 — COMBINE (COMBINE-ROUND.md): T2's bake rebuilt on a scripted Blender Cycles GI bake (combine/cycles_bake.py) + T5's atmosphere
   (Reflector wet floor, haze, light cones, desk practical, failing tube) + T4's dressing, merged to hold the draw calls down.
   Loads combine/<round>/hall-baked.glb (GLTFLoader, pinned CDN — flagged) + lightmap.png + bake.json. The game-built hall is hidden.
   Every lit surface = albedo x Cycles lightmap (unlit material: the light IS the bake — true bounce, soft contact shadows, no ceiling blowout). */
window.__HALL_TAKE = function(H){
  var V = H.V, Q = new URLSearchParams(location.search), R = Q.get('r6') || 'r4', BASE = '../hospital-escape-hallway-opus/combine/' + R + '/';
  var z = H.zone, x0 = z.a[0], y = z.y;
  H.root.visible = false;
  return Promise.all([ new Promise(function(res, rej){ new THREE.GLTFLoader().load(BASE + 'hall-baked.glb', res, undefined, rej); }),
    fetch(BASE + 'bake.json').then(function(r){ return r.json(); }),
    new Promise(function(res){ new THREE.TextureLoader().load(BASE + 'lightmap.png', res); }) ]).then(function(a){
    var gl = a[0], meta = a[1], lm = a[2]; lm.encoding = THREE.sRGBEncoding; lm.flipY = false;
    var tune = meta.tune || {}, gain = tune.gain || 1;
    gl.scene.updateMatrixWorld(true);
    // ---- merge (r3): textures keyed by IMAGE CONTENT (the exporter cloned one texture per wall strip); every non-tiling small texture
    //      (posters, door plates, signs, clock, cork board) packed into a runtime ATLAS (one lit, one unlit); all flat colours = one vertex-coloured mesh
    var hashC = document.createElement('canvas'); hashC.width = hashC.height = 8; var hx = hashC.getContext('2d');
    var CK = new WeakMap(); function ckey(t){ if(!t || !t.image) return 'none'; if(CK.has(t)) return CK.get(t); hx.clearRect(0, 0, 8, 8); hx.drawImage(t.image, 0, 0, 8, 8); var d = hx.getImageData(0, 0, 8, 8).data, h = 0; for(var i = 0; i < d.length; i += 3) h = (h * 31 + d[i]) | 0; var kk = (t.image.width || 0) + 'x' + (t.image.height || 0) + ':' + h; CK.set(t, kk); return kk; }
    function inUnit(g){ var uv = g.attributes.uv; if(!uv) return false; for(var i = 0; i < uv.count; i++){ var u = uv.getX(i), v = uv.getY(i); if(u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return false; } return true; }
    var groups = {}, n0 = 0;
    gl.scene.traverse(function(o){ if(!o.isMesh) return; n0++; var m = o.material, g = o.geometry, lit = !!g.attributes.uv2, tex = m.map || null, atl = tex && !m.transparent && inUnit(g);
      var isPanel = /LAMPPANEL/.test(o.name) || (o.parent && /LAMPPANEL/.test(o.parent.name)); if(isPanel) atl = false;
      var key = isPanel ? 'U:panel' : atl ? (lit ? 'L:atlas' : 'U:atlas') : lit ? (tex ? 'L:' + ckey(tex) + ':' + m.color.getHexString() : 'L:flat') : 'U:' + (tex ? ckey(tex) : m.color.getHexString()) + ':' + m.type + (m.transparent ? 'T' + m.opacity : '');
      (groups[key] = groups[key] || { lit: lit, tex: atl ? null : tex, atlas: atl, mat: m, list: [] }).list.push(o); });
    function buildAtlas(gr){ var seen = {}, items = []; gr.list.forEach(function(o){ var t = o.material.map, k = ckey(t); if(!seen[k]){ var w = Math.min(512, t.image.width), h = Math.round(t.image.height * w / t.image.width); seen[k] = { t: t, w: w, h: h }; items.push(seen[k]); } o.userData.at = seen[k]; });
      items.sort(function(a, b){ return b.h - a.h; }); var W = 2048, x = 0, y = 0, rowH = 0; items.forEach(function(it){ if(x + it.w > W){ x = 0; y += rowH + 4; rowH = 0; } it.x = x; it.y = y; x += it.w + 4; rowH = Math.max(rowH, it.h); });
      var H2 = 1; while(H2 < y + rowH) H2 *= 2; var cv = document.createElement('canvas'); cv.width = W; cv.height = H2; var cx = cv.getContext('2d'); items.forEach(function(it){ cx.drawImage(it.t.image, it.x, it.y, it.w, it.h); });
      var at = new THREE.CanvasTexture(cv); at.flipY = false; at.encoding = THREE.sRGBEncoding; at.anisotropy = 4; gr.atlasTex = at; gr.AW = W; gr.AH = H2; gr.items = items.length; }
    function merge(gr){ var pos = [], nrm = [], uv = [], uv2 = [], col = [], c = new THREE.Color();
      gr.list.forEach(function(o){ var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); var n = g.attributes.position.count;
        pos.push.apply(pos, g.attributes.position.array); if(g.attributes.normal) nrm.push.apply(nrm, g.attributes.normal.array);
        var at = gr.atlas ? o.userData.at : null;
        for(var i = 0; i < n; i++){ var u0 = g.attributes.uv ? g.attributes.uv.getX(i) : 0, v0 = g.attributes.uv ? g.attributes.uv.getY(i) : 0; if(at){ u0 = (at.x + Math.min(1, Math.max(0, u0)) * at.w) / gr.AW; v0 = (at.y + Math.min(1, Math.max(0, v0)) * at.h) / gr.AH; }
          uv.push(u0, v0); if(gr.lit) uv2.push(g.attributes.uv2.getX(i), g.attributes.uv2.getY(i)); }
        if(!gr.tex && !gr.atlas){ c.copy(o.material.color || new THREE.Color(1, 1, 1)); for(var j = 0; j < n; j++) col.push(c.r, c.g, c.b); } });
      var bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if(nrm.length) bg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); if(uv2.length) bg.setAttribute('uv2', new THREE.Float32BufferAttribute(uv2, 2)); if(col.length) bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return bg; }
    var hall = new THREE.Group(); hall.name = 'combined'; var calls = 0;
    Object.keys(groups).forEach(function(k){ var gr = groups[k], m; if(gr.atlas) buildAtlas(gr);
      if(gr.atlas){ m = new THREE.MeshBasicMaterial({ map: gr.atlasTex, lightMap: gr.lit ? lm : null, lightMapIntensity: meta.k * gain, fog: true }); }
      else if(gr.lit){ m = new THREE.MeshBasicMaterial({ map: gr.tex, color: gr.tex ? gr.mat.color.clone() : new THREE.Color(1, 1, 1), vertexColors: !gr.tex, lightMap: lm, lightMapIntensity: meta.k * gain, fog: true }); }
      else { m = gr.mat; if(m.emissive && /LAMPPANEL/.test(gr.list[0].name + (gr.list[0].parent ? gr.list[0].parent.name : ''))) {} }
      var mesh = new THREE.Mesh(merge(gr), m); mesh.name = k; hall.add(mesh); calls++; });
    H.scene.add(hall); H.combined = { meshesIn: n0, drawGroups: calls, meta: meta, groups: Object.keys(groups) };
    H.camera.layers.enable(1); hall.children.forEach(function(ms){ var big = /^L:[0-9]+x[0-9]+:/.test(ms.name) && ms.material.map && ms.material.map.image && ms.material.map.image.width >= 1024; if(!big && ms.name !== 'U:panel') ms.layers.set(1); });
    // panels: find them (unlit, bright) and keep them bright but not blinding
    hall.children.forEach(function(ms){ if(ms.name !== 'U:panel') return; ms.material = ms.material.clone(); var c = ms.material.color; if(c){ c.setRGB(tune.panel || 1.8, tune.panel || 1.8, (tune.panel || 1.8) * 0.95); ms.userData.panel = true; } });
    // ---- T5 atmosphere
    var L = Math.abs(z.b[1] - z.a[1]), zc = (z.a[1] + z.b[1]) / 2;
    if(THREE.Reflector && tune.mirror !== false){ var mir = new THREE.Reflector(new THREE.PlaneGeometry(z.w - 0.02, L), { textureWidth: 256, textureHeight: 1024, color: 0x8a9196, clipBias: 0.003 });
      mir.rotation.x = -Math.PI / 2; mir.position.set(x0, y + 0.004, zc); mir.material.transparent = true; mir.material.depthWrite = false; mir.renderOrder = 3;
      mir.material.fragmentShader = mir.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );', 'gl_FragColor = vec4( base.rgb * color * 1.2, ' + (tune.mirrorA || 0.4).toFixed(2) + ' );');
      mir.raycast = function(){}; H.scene.add(mir); }
    var lamps = []; H.parts.panel.forEach(function(pm){ var pa = pm.geometry.attributes.position; for(var i = 0; i + 6 <= pa.count; i += 6){ var c = new V(); for(var k = 0; k < 6; k++) c.add(new V().fromBufferAttribute(pa, i + k)); lamps.push(c.multiplyScalar(1 / 6)); } });
    var failing = lamps.reduce(function(a, p){ return Math.abs(p.z + 37) < Math.abs(a.z + 37) && Math.abs(p.x - x0) < 0.3 ? p : a; }, lamps[0]);
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; var x = cv.getContext('2d'), gr2 = x.createLinearGradient(0, 0, 0, 128); gr2.addColorStop(0, 'rgba(255,236,205,0.55)'); gr2.addColorStop(1, 'rgba(255,236,205,0)'); x.fillStyle = gr2; x.fillRect(0, 0, 64, 128);
    var sd = x.createLinearGradient(0, 0, 64, 0); sd.addColorStop(0, 'rgba(0,0,0,1)'); sd.addColorStop(0.5, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = sd; x.fillRect(0, 0, 64, 128);
    var coneMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: tune.cones || 0.1, fog: false });
    var cg = [], fg = null; lamps.forEach(function(p){ var c = new THREE.CylinderGeometry(0.42, 1.25, z.h - 0.05, 16, 1, true); c.translate(p.x, p.y - (z.h - 0.05) / 2, p.z); if(p === failing) fg = c; else cg.push(c.toNonIndexed()); });
    var cones = new THREE.Mesh(mergeG(cg), coneMat); cones.renderOrder = 4; cones.raycast = function(){}; H.scene.add(cones);
    var fcone = new THREE.Mesh(fg, coneMat.clone()); fcone.renderOrder = 4; H.scene.add(fcone);
    // failing tube: its light was LEFT OUT of the bake; at runtime its panel + cone + a small warm-white point light (lights only nothing lit — basic mats) flicker
    var dark = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.22), new THREE.MeshBasicMaterial({ color: 0x15181a })); dark.rotation.x = Math.PI / 2; dark.position.copy(failing).add(new V(0, -0.012, 0)); H.scene.add(dark);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1.1) })); bulb.position.set(x0 - z.w / 2 + 0.75, y + 1.35, z.station.z); H.scene.add(bulb);
    H.focus = 9; H.soft = 0.7;
    H.post = function(u){ var s = performance.now() / 1000, on = (Math.sin(s * 23.1) + Math.sin(s * 7.7) > 1.2) ? 0 : 1; dark.visible = !on; fcone.material.opacity = (tune.cones || 0.1) * on;
      u.exposure.value = tune.exposure || 0.72; u.bloom.value = tune.bloom || 0.7; u.sat.value = 0.72; u.shadowTint.value.setHex(0x173844); u.hiTint.value.setHex(0xffcf94);
      if(H.scene.fog){ H.scene.fog.color.setHex(0x161e22); H.scene.fog.near = tune.fogNear || 3; H.scene.fog.far = tune.fogFar || 26; } };
  });
  function mergeG(list){ var pos = [], uv = []; list.forEach(function(g){ pos.push.apply(pos, g.attributes.position.array); uv.push.apply(uv, g.attributes.uv.array); }); var b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); b.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return b; }
};
