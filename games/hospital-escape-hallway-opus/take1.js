/* TAKE 1 — Photoreal CC0 PBR + real-time lights. Route: sourced PBR (ambientCG CC0: colour + normal + roughness), every ceiling panel
   a real PointLight (physically-falling-off, no fake pools), hemisphere fill cut to a bounce, the game's post pipeline as shipped. */
window.__HALL_TAKE = function(H){
  var V = H.V, P = H.parts, R = +(new URLSearchParams(location.search).get('r') || 9);   // ?r= replays an earlier round
  function pbr(m, name, tile, o){ o = o || {}; var rep = m.map ? m.map.repeat.clone() : new THREE.Vector2(1, 1), k = (m.userData.tile || 1.2) / tile;
    var col = H.tex(name + '_col.jpg', [rep.x * k * (o.sx || 1), rep.y * k * (o.sy || 1)], true), nrm = H.tex(name + '_nrm.jpg', [rep.x * k * (o.sx || 1), rep.y * k * (o.sy || 1)]), rgh = H.tex(name + '_rgh.jpg', [rep.x * k * (o.sx || 1), rep.y * k * (o.sy || 1)]);
    var n = new THREE.MeshStandardMaterial({ map: col, normalMap: nrm, roughnessMap: rgh, roughness: o.rough == null ? 1 : o.rough, metalness: 0, color: new THREE.Color(o.tint || 0xffffff), normalScale: new THREE.Vector2(o.ns || 1, o.ns || 1) });
    return n; }
  var lightsOn = R >= 2, tint = R >= 3;
  P.floor.forEach(function(m){ m.material = pbr(m.material, 'floor', 2.4, { rough: R >= 8 ? 0.42 : R >= 3 ? 0.75 : 1, tint: R >= 8 ? 0xb4b9b8 : tint ? 0xd8dde0 : 0xffffff }); });
  P.wall.forEach(function(m){ m.material = pbr(m.material, 'wall', 3.0, { sx: 1, sy: 2.9 / 3, tint: R >= 8 ? 0xd3d9d2 : tint ? 0xc9d6d4 : 0xffffff, ns: 0.6 }); });
  if(R >= 8) P.wall.forEach(function(m){ var mt = m.material, y0 = H.zone.y; mt.onBeforeCompile = function(sh){   // r8: painted wainscot below a chair rail (hospital two-tone wall), in-shader so doors stay untouched
      sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vWy;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float hy = vWy - ' + y0.toFixed(2) + ';\n if(hy < 1.0) diffuseColor.rgb *= vec3(0.42, 0.55, 0.56);\n else if(hy < 1.09) diffuseColor.rgb = vec3(0.30, 0.32, 0.33);\n if(hy < 0.12) diffuseColor.rgb = vec3(0.06, 0.07, 0.075);'); };
    mt.customProgramCacheKey = function(){ return 'opusWainscot'; }; mt.needsUpdate = true; });
  P.ceil.forEach(function(m){ m.material = pbr(m.material, 'ceil', 2.4, { tint: R >= 9 ? 0xbcbcb8 : 0xe8e8e4 }); });
  P.pool.forEach(function(m){ m.visible = !lightsOn; });
  if(lightsOn){
    // lamp positions: centres of the panel quads (non-indexed merged mesh: 6 verts per quad)
    var pts = []; (R >= 6 ? P.panel : P.panel.slice(0, 1)).forEach(function(pm){ var pa = pm.geometry.attributes.position; for(var i = 0; i + 6 <= pa.count; i += 6){ var c = new V(); for(var k = 0; k < 6; k++) c.add(new V().fromBufferAttribute(pa, i + k)); pts.push(c.multiplyScalar(1 / 6)); } });   /* r6: every hall's panels (r2-5 lit only the first hall's) */
    H.lamps = pts;
    pts.forEach(function(p){ var L = new THREE.PointLight(0xfff3e2, R >= 7 ? 2.4 : R >= 5 ? 11 : R >= 3 ? 2.2 : 1.6, R >= 7 ? 8 : R >= 5 ? 10 : R >= 3 ? 7.5 : 9, 2); L.position.copy(p).add(new V(0, R >= 9 ? -0.55 : -0.25, 0)); H.root.add(L); });
    H.gameLights.forEach(function(l){ if(l.isHemisphereLight) l.intensity = R >= 5 ? 0.24 : R >= 3 ? 0.16 : 0.3; else l.intensity *= 0.3; });
    P.panel.forEach(function(m){ var k = R >= 5 ? 2.3 : 4.2; m.material.color.setRGB(k, k, k * 0.96); });
  }
  if(R >= 4){ // round 4: door + frame + station read as real materials: brushed steel frames/kickplates, soft key on doors
    P.other.forEach(function(m){ var mt = m.material; if(mt && mt.isMeshStandardMaterial && mt.metalness > 0.2 && !mt.map){ mt.roughness = 0.35; mt.metalness = 0.85; } });
    H.focus = 9; H.soft = 0.45;
  }
  H.post = function(u){ u.exposure.value = R >= 8 ? 0.62 : R >= 5 ? 0.9 : R >= 3 ? 0.95 : 0.8; if(R >= 5) u.bloom.value = 0.55; };
};
