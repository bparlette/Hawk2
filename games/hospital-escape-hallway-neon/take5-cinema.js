/* Take 5 · Cinematography (Real Mirrored Planar Wet-Floor Reflection + Volumetric Haze Cones + Filmic Anamorphic Post) */
window.BUILD_TAKE_5 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;
  var dpr = Math.min(window.devicePixelRatio || 2, 2);
  var W = Math.round(390 * dpr), H = Math.round(844 * dpr);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Final tonemapping happens in our custom filmic composite shader so keep direct HDR render linear
  renderer.toneMapping = THREE.NoToneMapping;

  scene.background = new THREE.Color(0x030609);
  scene.fog = new THREE.FogExp2(0x04090e, 0.026);
  scene.environment = D.buildCorridorPMREM(renderer, { ceilCol: '#17222a', wallCol: '#1f2b33', floorCol: '#070b0e', trofferCol: '#d6f4ff' });

  // Offscreen render targets (HalfFloat if supported for crisp HDR bloom, else UnsignedByte fallback)
  var texType = ctx.hasHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
  var rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: texType, depthBuffer: true, stencilBuffer: false };
  var sceneRT = new THREE.WebGLRenderTarget(W, H, rtOpts);
  var bloomRT1 = new THREE.WebGLRenderTarget(Math.round(W * 0.5), Math.round(H * 0.5), rtOpts);
  var bloomRT2 = new THREE.WebGLRenderTarget(Math.round(W * 0.25), Math.round(H * 0.25), rtOpts);
  var reflRT   = new THREE.WebGLRenderTarget(390, 844, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: texType, depthBuffer: true });

  var tFlCol = D.loadTex('assets/cinema/floor_col.jpg',   { srgb: true });
  var tFlRgh = D.loadTex('assets/cinema/floor_rough.jpg', { srgb: false });
  var tFlNor = D.loadTex('assets/cinema/floor_nor.jpg',   { srgb: false });
  var tWlCol = D.loadTex('assets/cinema/wall_col.jpg',    { srgb: true });
  var tWlNor = D.loadTex('assets/cinema/wall_nor.jpg',    { srgb: false });
  var tCeCol = D.loadTex('assets/cinema/ceil_col.jpg',    { srgb: true });
  var tDrCol = D.loadTex('assets/cinema/door_col.jpg',    { srgb: true });
  var tMtNor = D.loadTex('assets/pbr/metal_nor.jpg',      { srgb: false });
  var tMtRgh = D.loadTex('assets/pbr/metal_rough.jpg',    { srgb: false });
  var tWdCol = D.loadTex('assets/pbr/wood_diff.jpg',      { srgb: true });

  var reflMatrix = new THREE.Matrix4();
  var uReflMatrix = { value: reflMatrix };
  var uReflTex    = { value: reflRT.texture };

  var floorMat = new THREE.MeshStandardMaterial({
    color: 0x5c6d72,
    map: tFlCol,
    roughnessMap: tFlRgh,
    normalMap: tFlNor,
    normalScale: new THREE.Vector2(0.38, 0.38),
    roughness: 0.92,
    metalness: 0.12,
    envMapIntensity: 0.72
  });

  // Inject real planar wet-floor mirror lookup gated smoothly by floor_rough.jpg puddle streaks
  floorMat.onBeforeCompile = function(shader){
    shader.uniforms.uReflTex = uReflTex;
    shader.uniforms.uReflMatrix = uReflMatrix;
    shader.vertexShader = 'varying vec3 vFlWorldPos;\nvarying vec2 vFlUvTile;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvFlWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvFlUvTile = uv;'
    );
    shader.fragmentShader = [
      'uniform sampler2D uReflTex;',
      'uniform mat4 uReflMatrix;',
      'varying vec3 vFlWorldPos;',
      'varying vec2 vFlUvTile;'
    ].join('\n') + '\n' + shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      [
        '#include <lights_fragment_end>',
        '{',
        '  vec4 rClip = uReflMatrix * vec4(vFlWorldPos, 1.0);',
        '  vec2 rUv = rClip.xy / max(0.0001, rClip.w) * 0.5 + 0.5;',
        '  vec3 nW = normalize(vNormal);',
        '  vec2 ripple = (nW.xz) * mix(0.006, 0.022, clamp(roughnessFactor, 0.0, 1.0));',
        '  float blurR = mix(0.0012, 0.0055, clamp(roughnessFactor, 0.0, 1.0));',
        '  vec2 baseUv = rUv + ripple;',
        '  vec3 reflSample = texture2D(uReflTex, clamp(baseUv, 0.003, 0.997)).rgb * 0.50',
        '                  + texture2D(uReflTex, clamp(baseUv + vec2(blurR, 0.0), 0.003, 0.997)).rgb * 0.25',
        '                  + texture2D(uReflTex, clamp(baseUv - vec2(blurR, 0.0), 0.003, 0.997)).rgb * 0.25;',
        '  vec3 Vw = normalize(cameraPosition - vFlWorldPos);',
        '  float ndv = clamp(dot(Vw, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);',
        '  float fresnel = 0.08 + 0.86 * pow(1.0 - ndv, 3.4);',
        '  float puddleMask = smoothstep(0.68, 0.06, roughnessFactor);',
        '  float distAtten = exp(-length(cameraPosition - vFlWorldPos) * 0.020);',
        '  reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, reflSample * (0.48 + 0.85 * fresnel), puddleMask * (0.50 + 0.44 * fresnel) * distAtten);',
        '}'
      ].join('\n')
    );
  };

  var mats = {
    floor:   floorMat,
    wall:    new THREE.MeshStandardMaterial({ color: 0xa2b2b2, map: tWlCol, normalMap: tWlNor, normalScale: new THREE.Vector2(0.65, 0.65), roughness: 0.84, metalness: 0.03 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xaabac0, map: tCeCol, roughness: 0.90, metalness: 0.02 }),
    beam:    new THREE.MeshStandardMaterial({ color: 0x4b5c64, roughness: 0.78, metalness: 0.04 }),
    door:    new THREE.MeshStandardMaterial({ color: 0x866554, map: tDrCol, roughness: 0.52, metalness: 0.06, envMapIntensity: 0.75 }),
    wood:    new THREE.MeshStandardMaterial({ color: 0xa47a5a, map: tWdCol, roughness: 0.44, metalness: 0.06, envMapIntensity: 0.90 }),
    frame:   new THREE.MeshStandardMaterial({ color: 0x3b454c, roughness: 0.36, metalness: 0.65, envMapIntensity: 1.15 }),
    metal:   new THREE.MeshStandardMaterial({ color: 0x90a0a8, normalMap: tMtNor, normalScale: new THREE.Vector2(0.15, 0.15), roughnessMap: tMtRgh, roughness: 0.28, metalness: 0.78, envMapIntensity: 1.35 }),
    trim:    new THREE.MeshStandardMaterial({ color: 0x1e282e, roughness: 0.48, metalness: 0.25 }),
    rail:    new THREE.MeshStandardMaterial({ color: 0x34434a, roughness: 0.38, metalness: 0.42, envMapIntensity: 1.05 }),
    counter: new THREE.MeshStandardMaterial({ color: 0x829090, map: tWlCol, roughness: 0.72 }),
    redCart: new THREE.MeshStandardMaterial({ color: 0x6b0b0b, roughness: 0.28, metalness: 0.18, envMapIntensity: 1.0 })
  };

  var refs = D.buildShellGeometry(scene, mats, {
    shadows: true, trim: true,
    wallFullHeight: true,
    ajarDoors: { '416': -0.32 },
    flickerIndex: 5, flickerIntensity: 0.45,
    floorTile: 1.45, wallTile: 1.85, ceilTile: 1.40,
    trofferColor: 0xdff6ff, trofferIntensity: 3.8, screenGlow: 1.35
  });

  // Moody horror-thriller illumination: low hemisphere fill + sculpted overhead pools
  scene.add(new THREE.HemisphereLight(0x527688, 0x10171d, 0.16));

  var flickerPl = null;
  D.TROFFERS.forEach(function(tz, idx){
    var isDim = (idx === 5);
    var pl = new THREE.PointLight(isDim ? 0x76c4a0 : 0xc6ecff, isDim ? 0.38 : 0.76, 8.8, 2.0);
    pl.position.set(12.0, 2.74, tz);
    scene.add(pl);
    if(isDim) flickerPl = pl;
  });

  // Warm tungsten pool over Nurses' Station contrasting cold corridor
  var deskSpot = new THREE.SpotLight(0xffb668, 3.10, 11.5, 0.88, 0.68, 1.55);
  deskSpot.position.set(12.2, 2.76, -27.3);
  deskSpot.target.position.set(10.8, 0.2, -27.5);
  deskSpot.castShadow = true; deskSpot.shadow.mapSize.set(1024, 1024); deskSpot.shadow.bias = -0.0005;
  scene.add(deskSpot); scene.add(deskSpot.target);

  // Subtle warm interior spill behind ajar Door 416
  var plDoor416 = new THREE.PointLight(0xffa855, 0.65, 3.8, 2.0);
  plDoor416.position.set(13.92, 1.4, -28.0);
  scene.add(plDoor416);

  // Far gurney & red crash cart rim key
  var farSpot = new THREE.SpotLight(0xd4f0ff, 2.25, 12.5, 0.86, 0.62, 1.5);
  farSpot.position.set(11.9, 2.78, -37.0);
  farSpot.target.position.set(12.9, 0.0, -40.2);
  farSpot.castShadow = true; farSpot.shadow.mapSize.set(1024, 1024); farSpot.shadow.bias = -0.0005;
  scene.add(farSpot); scene.add(farSpot.target);

  // Bright side-corridor cool shafts pouring into WEST WING B from WEST WING CROSS & LINK
  [[-16.0, 1.95], [-42.0, 1.75]].forEach(function(c){
    var pl = new THREE.PointLight(0x9ce0ff, c[1], 11.0, 1.65);
    pl.position.set(7.8, 2.25, c[0]);
    scene.add(pl);
  });

  // Soft edge-free volumetric haze cones & doorway spill beams
  var volMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(0xbcecff) },
      uStrength: { value: 0.046 }
    },
    vertexShader: [
      'varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
      'void main(){',
      '  vUv = uv;',
      '  vN = normalize(mat3(modelMatrix) * normal);',
      '  vec4 wp = modelMatrix * vec4(position, 1.0);',
      '  vW = wp.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor; uniform float uStrength;',
      'varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
      'void main(){',
      '  vec3 V = normalize(cameraPosition - vW);',
      '  float edgeFade = pow(abs(dot(normalize(vN), V)), 1.9);',
      '  float topBot = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.08, vUv.y);',
      '  float a = edgeFade * topBot * uStrength;',
      '  gl_FragColor = vec4(uColor * a, 1.0);',
      '}'
    ].join('\n')
  });

  // Tapered soft haze cylinders under active key troffers (top open, never touches floor sharply)
  [-17.6, -24.0, -30.4, -36.8, -43.2].forEach(function(tz){
    var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 1.05, 2.15, 20, 1, true), volMat);
    cone.position.set(12.0, 1.80, tz);
    scene.add(cone);
  });

  // Warm haze glow over Nurses' Station + bright cross-corridor spill beams
  var warmVolMat = volMat.clone();
  warmVolMat.uniforms = { uColor: { value: new THREE.Color(0xffc078) }, uStrength: { value: 0.055 } };
  var deskCone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.95, 1.65, 18, 1, true), warmVolMat);
  deskCone.position.set(11.15, 2.02, -27.5); scene.add(deskCone);

  [-16.0, -42.0].forEach(function(cz){
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.65, 3.8, 20, 1, true), volMat);
    shaft.rotation.z = -Math.PI / 2.6;
    shaft.position.set(9.4, 1.55, cz);
    scene.add(shaft);
  });

  // Custom full-screen post-processing quad: half-res anamorphic cyan-white streak + bloom + film grade + vignette
  var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var postSceneBright = new THREE.Scene();
  var postSceneBlurV  = new THREE.Scene();
  var postSceneFinal  = new THREE.Scene();
  var quadGeo = new THREE.PlaneGeometry(2, 2);

  var brightMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tDiffuse: { value: sceneRT.texture }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){',
      '  vec3 sum = vec3(0.0);',
      '  // Strong horizontal anamorphic streak filter + vertical soft capture',
      '  for(int i = -5; i <= 5; i++){',
      '    float w = exp(-float(i * i) * 0.09);',
      '    vec3 s = texture2D(tDiffuse, clamp(vUv + vec2(float(i) * uTexel.x * 5.0, 0.0), 0.001, 0.999)).rgb;',
      '    float l = dot(s, vec3(0.2126, 0.7152, 0.0722));',
      '    vec3 hi = max(s - vec3(1.15), vec3(0.0)) * smoothstep(1.05, 2.20, l);',
      '    sum += hi * w;',
      '  }',
      '  gl_FragColor = vec4(sum * 0.22, 1.0);',
      '}'
    ].join('\n')
  });
  postSceneBright.add(new THREE.Mesh(quadGeo, brightMat));

  var blurVMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tDiffuse: { value: bloomRT1.texture }, uTexel: { value: new THREE.Vector2(2 / W, 2 / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){',
      '  vec3 sum = vec3(0.0); float wsum = 0.0;',
      '  for(int i = -4; i <= 4; i++){',
      '    float w = exp(-float(i * i) * 0.16);',
      '    sum += texture2D(tDiffuse, clamp(vUv + vec2(float(i) * uTexel.x * 3.0, float(i) * uTexel.y * 2.2), 0.001, 0.999)).rgb * w;',
      '    wsum += w;',
      '  }',
      '  gl_FragColor = vec4(sum / wsum, 1.0);',
      '}'
    ].join('\n')
  });
  postSceneBlurV.add(new THREE.Mesh(quadGeo, blurVMat));

  var finalMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: sceneRT.texture },
      tBloom: { value: bloomRT2.texture },
      uTime:  { value: 0.0 }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uTime; varying vec2 vUv;',
      'vec3 acesFilm(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
      'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
      'void main(){',
      '  vec2 dc = vUv - 0.5;',
      '  float r2 = dot(dc, dc);',
      '  // Subtle radial optical chromatic aberration at lens perimeter',
      '  vec2 caOff = dc * (0.0032 * r2);',
      '  float r = texture2D(tScene, vUv + caOff).r;',
      '  float g = texture2D(tScene, vUv).g;',
      '  float b = texture2D(tScene, vUv - caOff).b;',
      '  vec3 col = vec3(r, g, b);',
      '  vec3 bloom = texture2D(tBloom, vUv).rgb;',
      '  col += bloom * 0.62;',
      '  // Filmic exposure + subtle cyan-teal shadow / warm-amber highlight split-tone',
      '  col *= 1.18;',
      '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
      '  vec3 split = mix(vec3(0.86, 1.02, 1.10), vec3(1.06, 0.99, 0.92), smoothstep(0.08, 0.62, lum));',
      '  col *= split;',
      '  col = acesFilm(col);',
      '  // Soft optical vignette + clean 35mm fine grain',
      '  col *= mix(1.0, 0.72, smoothstep(0.18, 0.72, r2));',
      '  col += (hash12(gl_FragCoord.xy + fract(uTime) * 37.0) - 0.5) * 0.016;',
      '  // Linear -> sRGB encoding (renderer.outputEncoding handles screen quad automatically when toneMapping=NoToneMapping)',
      '  gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);',
      '}'
    ].join('\n')
  });
  postSceneFinal.add(new THREE.Mesh(quadGeo, finalMat));

  // Virtual mirror camera for planar wet-floor reflection pass
  var reflCam = new THREE.PerspectiveCamera(60, 390 / 844, 0.05, 1500);
  var tmpTarget = new THREE.Vector3();
  var tmpDir = new THREE.Vector3();

  return {
    flags: ['Planar Mirror RenderTarget + Custom Filmic Anamorphic Post (2 extra RTs)'],
    render: function(r, s, c, tSec){
      // Subtle tube #6 fluorescent ballast flicker during live dolly / time playback
      if(flickerPl && refs.trofferLenses[5]){
        var t = tSec || 0;
        var flk = (t > 0.01) ? (0.45 + 0.55 * Math.pow(Math.sin(t * 27.0) * Math.cos(t * 13.7), 2.0)) : 1.0;
        flickerPl.intensity = 0.38 * flk;
        refs.trofferLenses[5].material.emissiveIntensity = 0.45 * flk;
      }
      // 1) Mirror pass across y=0 floor plane
      c.getWorldDirection(tmpDir);
      reflCam.fov = c.fov; reflCam.aspect = c.aspect; reflCam.near = c.near; reflCam.far = c.far;
      reflCam.updateProjectionMatrix();
      reflCam.position.set(c.position.x, -c.position.y, c.position.z);
      tmpTarget.set(c.position.x + tmpDir.x, -(c.position.y + tmpDir.y), c.position.z + tmpDir.z);
      reflCam.up.set(0, -1, 0);
      reflCam.lookAt(tmpTarget);
      reflCam.updateMatrixWorld(true);
      reflMatrix.multiplyMatrices(reflCam.projectionMatrix, reflCam.matrixWorldInverse);

      refs.floorMeshes.forEach(function(fm){ fm.visible = false; });
      r.setRenderTarget(reflRT);
      r.clear();
      r.render(s, reflCam);
      refs.floorMeshes.forEach(function(fm){ fm.visible = true; });

      // 2) Full-res HDR scene pass
      r.setRenderTarget(sceneRT);
      r.clear();
      r.render(s, c);

      // 3) Half-res anamorphic bright extraction + quarter-res soft bloom
      r.setRenderTarget(bloomRT1); r.clear(); r.render(postSceneBright, postCam);
      r.setRenderTarget(bloomRT2); r.clear(); r.render(postSceneBlurV,  postCam);

      // 4) Final filmic grade composite to screen
      finalMat.uniforms.uTime.value = tSec || 0;
      r.setRenderTarget(null);
      r.render(postSceneFinal, postCam);
    }
  };
};
