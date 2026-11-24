/* Take 3 · Painted Push (Hand-painted impasto maps + custom stylized wrap-lighting & edge ink GLSL shader, core only) */
window.BUILD_TAKE_3 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene.background = new THREE.Color(0x060d12);
  scene.fog = new THREE.FogExp2(0x08131a, 0.027);

  var tFl  = D.loadTex('assets/painted/floor.jpg',  { srgb: true });
  var tWl  = D.loadTex('assets/painted/wall.jpg',   { srgb: true });
  var tCe  = D.loadTex('assets/painted/ceil.jpg',   { srgb: true });
  var tDr  = D.loadTex('assets/painted/door.jpg',   { srgb: true });
  var tWd  = D.loadTex('assets/painted/wood.jpg',   { srgb: true });
  var tPst = D.loadTex('assets/painted/poster.jpg', { srgb: true, clamp: true });

  // Inject painterly warm-key / deep-teal-shadow stylization + subtle corner ink crease
  function makePainterly(baseMat, opts){
    opts = opts || {};
    baseMat.onBeforeCompile = function(shader){
      shader.vertexShader = 'varying vec3 vPaintWorldPos;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPaintWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
      shader.fragmentShader = 'varying vec3 vPaintWorldPos;\n' + shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        [
          '// Stylized painterly warm-cool split + soft crease ink',
          'float lumP = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));',
          'float stepBand = smoothstep(0.06, 0.58, lumP);',
          'vec3 coolShadow = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(0.55, 0.85, 1.15) + vec3(0.010, 0.025, 0.045), 0.65);',
          'vec3 warmLit    = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.12, 1.01, 0.88), 0.45);',
          'gl_FragColor.rgb = mix(coolShadow, warmLit, stepBand);',
          '// Architectural floor-wall & ceiling-wall ink crease darkening',
          'float wallDist = min(abs(vPaintWorldPos.x - 10.3), abs(vPaintWorldPos.x - 13.7));',
          'float edgeCrease = smoothstep(0.0, 0.18, wallDist + vPaintWorldPos.y) * smoothstep(0.0, 0.18, wallDist + abs(2.9 - vPaintWorldPos.y));',
          'gl_FragColor.rgb *= mix(0.48, 1.0, edgeCrease);',
          '#include <dithering_fragment>'
        ].join('\n')
      );
    };
    return baseMat;
  }

  var mats = {
    floor:   makePainterly(new THREE.MeshStandardMaterial({ color: 0xaebebe, map: tFl, roughness: 0.55, metalness: 0.05 })),
    wall:    makePainterly(new THREE.MeshStandardMaterial({ color: 0xbcc8c6, map: tWl, roughness: 0.85, metalness: 0.02 })),
    ceiling: makePainterly(new THREE.MeshStandardMaterial({ color: 0xc2d0d4, map: tCe, roughness: 0.90, metalness: 0.02 })),
    beam:    makePainterly(new THREE.MeshStandardMaterial({ color: 0x56747d, roughness: 0.84, metalness: 0.02 })),
    door:    makePainterly(new THREE.MeshStandardMaterial({ color: 0x98745e, map: tDr, roughness: 0.62, metalness: 0.04 })),
    wood:    makePainterly(new THREE.MeshStandardMaterial({ color: 0xb68860, map: tWd, roughness: 0.58, metalness: 0.04 })),
    frame:   makePainterly(new THREE.MeshStandardMaterial({ color: 0x3f4e56, roughness: 0.52, metalness: 0.25 })),
    metal:   makePainterly(new THREE.MeshStandardMaterial({ color: 0x80929a, roughness: 0.44, metalness: 0.40 })),
    trim:    makePainterly(new THREE.MeshStandardMaterial({ color: 0x1a3036, roughness: 0.65 })),
    rail:    makePainterly(new THREE.MeshStandardMaterial({ color: 0x345860, roughness: 0.55 })),
    counter: makePainterly(new THREE.MeshStandardMaterial({ color: 0xa4b4b2, map: tWl, roughness: 0.78 })),
    redCart: makePainterly(new THREE.MeshStandardMaterial({ color: 0x9e1c16, roughness: 0.40 }))
  };

  D.buildShellGeometry(scene, mats, {
    shadows: true, trim: true,
    wallFullHeight: true,
    flickerIndex: 5, flickerIntensity: 0.55,
    floorTile: 1.4, wallTile: 1.9, ceilTile: 1.4,
    trofferColor: 0xe4f6e8, trofferIntensity: 2.4, screenGlow: 1.15
  });

  // Painted directional floor safety stripes + framed St. Mercer hand-painted awareness posters
  var stripeMat = makePainterly(new THREE.MeshStandardMaterial({ color: 0x266c72, roughness: 0.65 }));
  D.addBox(scene, 0.09, 0.004, 26.0, stripeMat, 10.65, 0.003, -29.0, null);
  D.addBox(scene, 0.09, 0.004, 26.0, stripeMat, 13.35, 0.003, -29.0, null);

  var posterMat = new THREE.MeshStandardMaterial({ map: tPst, roughness: 0.68 });
  [
    { x: 10.315, z: -21.2, ry: Math.PI / 2 },
    { x: 10.315, z: -36.5, ry: Math.PI / 2 }
  ].forEach(function(p){
    var frm = D.addBox(scene, 0.03, 0.92, 0.68, mats.frame, p.x, 1.56, p.z, { cast: true, recv: true });
    var art = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.84), posterMat);
    art.position.set(p.x + 0.017, 1.56, p.z);
    art.rotation.y = p.ry;
    scene.add(art);
  });

  scene.add(new THREE.HemisphereLight(0x74a4b8, 0x15222c, 0.28));

  [-17.6, -22.8, -28.0, -33.2, -39.5, -43.0].forEach(function(lz, i){
    var pl = new THREE.PointLight(i === 3 ? 0x9cd8c2 : 0xcbe8f0, i === 3 ? 0.50 : 0.88, 10.5, 1.8);
    pl.position.set(12.0, 2.70, lz);
    scene.add(pl);
  });

  var warmDesk = new THREE.PointLight(0xffad58, 2.15, 8.5, 1.65);
  warmDesk.position.set(11.3, 1.95, -27.5);
  scene.add(warmDesk);

  var dirKey = new THREE.SpotLight(0xfff0d0, 1.85, 16.0, 0.95, 0.7, 1.4);
  dirKey.position.set(11.8, 2.75, -24.5);
  dirKey.target.position.set(11.5, 0.0, -28.5);
  dirKey.castShadow = true;
  dirKey.shadow.mapSize.set(1024, 1024);
  scene.add(dirKey); scene.add(dirKey.target);

  return { flags: [] };
};
