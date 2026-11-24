/* Take 6 · Combine (Real AmbientCG Institutional PBR + Decimated Poly Haven CC0 Props + Cycles Interior GI + Planar Wet Mirror + Anamorphic Post) */
window.BUILD_TAKE_6 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;
  var dpr = Math.min(window.devicePixelRatio || 2, 2);
  var W = Math.round(390 * dpr), H = Math.round(844 * dpr);

  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.NoToneMapping; // Tonemap & sRGB curve run inside postSceneFinal

  scene.background = new THREE.Color(0x030609);
  scene.fog = new THREE.FogExp2(0x03070b, 0.030);
  scene.environment = D.buildCorridorPMREM(renderer, { ceilCol: '#131d23', wallCol: '#192329', floorCol: '#060a0d', trofferCol: '#cef0ff' });

  var texType = ctx.hasHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
  var rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: texType, depthBuffer: true, stencilBuffer: false };
  var sceneRT  = new THREE.WebGLRenderTarget(W, H, rtOpts);
  var bloomRT1 = new THREE.WebGLRenderTarget(Math.round(W * 0.5), Math.round(H * 0.5), rtOpts);
  var bloomRT2 = new THREE.WebGLRenderTarget(Math.round(W * 0.25), Math.round(H * 0.25), rtOpts);
  var reflRT   = new THREE.WebGLRenderTarget(390, 844, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: texType, depthBuffer: true });

  // Load lightmap (uv2), Prop PBR Atlas (col/rgh/nor), and AmbientCG CC0 PBR textures
  var lmTex  = D.loadTex('assets/combine/lightmap.jpg',        { srgb: true,  clamp: true, flipY: false });
  var pCol   = D.loadTex('assets/combine/prop_atlas_col.jpg',  { srgb: true,  clamp: true, flipY: false });
  var pRgh   = D.loadTex('assets/combine/prop_atlas_rgh.jpg',  { srgb: false, clamp: true, flipY: false });
  var pNor   = D.loadTex('assets/combine/prop_atlas_nor.jpg',  { srgb: false, clamp: true, flipY: false });

  // GLTF TEXCOORD_0 uses top-left image origin (flipY: false matches Blender glTF export 1:1!)
  var tTerCol = D.loadTex('assets/combine/pbr/terrazzo_col.jpg',    { srgb: true,  flipY: false });
  var tTerNor = D.loadTex('assets/combine/pbr/terrazzo_nor.jpg',    { srgb: false, flipY: false });
  var tWetRgh = D.loadTex('assets/combine/pbr/floor_wet_rough.jpg', { srgb: false, flipY: false });
  var tWalCol = D.loadTex('assets/combine/pbr/wall_dado_col.jpg',   { srgb: true,  flipY: false });
  var tWalNor = D.loadTex('assets/combine/pbr/plaster_nor.jpg',     { srgb: false, flipY: false });
  var tWalRgh = D.loadTex('assets/combine/pbr/plaster_rgh.jpg',     { srgb: false, flipY: false });
  var tCeCol  = D.loadTex('assets/combine/pbr/ceil_col.jpg',        { srgb: true,  flipY: false });
  var tCeNor  = D.loadTex('assets/combine/pbr/ceil_nor.jpg',        { srgb: false, flipY: false });
  var tCeRgh  = D.loadTex('assets/combine/pbr/ceil_rgh.jpg',        { srgb: false, flipY: false });
  var tMtCol  = D.loadTex('assets/combine/pbr/metal_col.jpg',       { srgb: true,  flipY: false });
  var tMtNor  = D.loadTex('assets/combine/pbr/metal_nor.jpg',       { srgb: false, flipY: false });
  var tMtRgh  = D.loadTex('assets/combine/pbr/metal_rgh.jpg',       { srgb: false, flipY: false });
  var tWdCol  = D.loadTex('assets/combine/pbr/wood_col.jpg',        { srgb: true,  flipY: false });
  var tWdNor  = D.loadTex('assets/combine/pbr/wood_nor.jpg',        { srgb: false, flipY: false });
  var tWdRgh  = D.loadTex('assets/combine/pbr/wood_rgh.jpg',        { srgb: false, flipY: false });

  var reflMatrix = new THREE.Matrix4();
  var uReflMatrix = { value: reflMatrix };
  var uReflTex    = { value: reflRT.texture };

  var floorMat = new THREE.MeshStandardMaterial({
    color: 0x2c363b,
    map: tTerCol,
    roughnessMap: tWetRgh,
    normalMap: tTerNor,
    normalScale: new THREE.Vector2(0.28, 0.28),
    lightMap: lmTex,
    lightMapIntensity: 1.50,
    roughness: 0.94,
    metalness: 0.16,
    envMapIntensity: 0.48
  });

  floorMat.onBeforeCompile = function(shader){
    shader.uniforms.uReflTex = uReflTex;
    shader.uniforms.uReflMatrix = uReflMatrix;
    shader.vertexShader = 'varying vec3 vCombWPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvCombWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );
    shader.fragmentShader = [
      'uniform sampler2D uReflTex;',
      'uniform mat4 uReflMatrix;',
      'varying vec3 vCombWPos;'
    ].join('\n') + '\n' + shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      [
        '#include <lights_fragment_end>',
        '{',
        '  vec4 rClip = uReflMatrix * vec4(vCombWPos, 1.0);',
        '  vec2 rUv = rClip.xy / max(0.0001, rClip.w) * 0.5 + 0.5;',
        '  vec3 nW = normalize(vNormal);',
        '  vec2 ripple = (nW.xz) * mix(0.004, 0.016, clamp(roughnessFactor, 0.0, 1.0));',
        '  float blurR = mix(0.0012, 0.0045, clamp(roughnessFactor, 0.0, 1.0));',
        '  vec2 bUv = rUv + ripple;',
        '  vec3 reflSample = texture2D(uReflTex, clamp(bUv, 0.003, 0.997)).rgb * 0.50',
        '                  + texture2D(uReflTex, clamp(bUv + vec2(blurR, 0.0), 0.003, 0.997)).rgb * 0.25',
        '                  + texture2D(uReflTex, clamp(bUv - vec2(blurR, 0.0), 0.003, 0.997)).rgb * 0.25;',
        '  vec3 Vw = normalize(cameraPosition - vCombWPos);',
        '  float ndv = clamp(dot(Vw, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);',
        '  float fresnel = 0.08 + 0.88 * pow(1.0 - ndv, 3.2);',
        '  float puddle = smoothstep(0.68, 0.05, roughnessFactor);',
        '  float distAtten = exp(-length(cameraPosition - vCombWPos) * 0.018);',
        '  reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, reflSample * (0.55 + 0.92 * fresnel), puddle * (0.52 + 0.44 * fresnel) * distAtten);',
        '}'
      ].join('\n')
    );
  };

  var shellMatByName = {
    ShellFloor:   floorMat,
    ShellWall:    new THREE.MeshStandardMaterial({ color: 0x526060, map: tWalCol, normalMap: tWalNor, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: tWalRgh, roughness: 0.88, metalness: 0.02, lightMap: lmTex, lightMapIntensity: 1.48 }),
    ShellCeil:    new THREE.MeshStandardMaterial({ color: 0x3f4c52, map: tCeCol,  normalMap: tCeNor,  normalScale: new THREE.Vector2(0.42, 0.42), roughnessMap: tCeRgh,  roughness: 0.92, metalness: 0.02, lightMap: lmTex, lightMapIntensity: 1.25 }),
    ShellTrim:    new THREE.MeshStandardMaterial({ color: 0x333e44, map: tMtCol,  normalMap: tMtNor,  normalScale: new THREE.Vector2(0.25, 0.25), roughnessMap: tMtRgh,  roughness: 0.36, metalness: 0.65, envMapIntensity: 1.25, lightMap: lmTex, lightMapIntensity: 1.55 }),
    ShellWood:    new THREE.MeshStandardMaterial({ color: 0x725742, map: tWdCol,  normalMap: tWdNor,  normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: tWdRgh,  roughness: 0.62, metalness: 0.05, envMapIntensity: 0.85, lightMap: lmTex, lightMapIntensity: 1.65 }),
    ShellDoor:    new THREE.MeshStandardMaterial({ color: 0x624838, map: tWdCol,  normalMap: tWdNor,  normalScale: new THREE.Vector2(0.50, 0.50), roughnessMap: tWdRgh,  roughness: 0.72, metalness: 0.06, envMapIntensity: 0.65, lightMap: lmTex, lightMapIntensity: 1.65 }),
    ShellDark:    new THREE.MeshStandardMaterial({ color: 0x0b1014, roughness: 0.92, lightMap: lmTex, lightMapIntensity: 1.5 }),
    ShellTroffer: new THREE.MeshStandardMaterial({ color: 0xe6f8ff, emissive: new THREE.Color(0xdaf3ff), emissiveIntensity: 3.3, roughness: 0.2 })
  };

  var propsAtlasMat = new THREE.MeshStandardMaterial({
    color: 0xc8d2d6,
    map: pCol,
    roughnessMap: pRgh,
    normalMap: pNor,
    normalScale: new THREE.Vector2(0.55, 0.55),
    lightMap: lmTex,
    lightMapIntensity: 1.85,
    roughness: 0.85,
    metalness: 0.24,
    envMapIntensity: 0.85
  });

  // Build unified signage + monitors + glowing door plaque atlas (1 mesh = 1 single draw call!)
  function buildMergedSignage(){
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    var c = cv.getContext('2d');
    c.fillStyle = '#08151d'; c.fillRect(0, 0, 1024, 512);

    function drawBanner(x, y, w, h, text, bg, bd, fg, fsz){
      c.fillStyle = bg; c.fillRect(x, y, w, h);
      c.strokeStyle = bd; c.lineWidth = 4; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
      c.fillStyle = fg; c.font = 'bold ' + fsz + 'px system-ui, -apple-system, sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, x + w / 2, y + h / 2 + 1);
    }
    // Row 0 (y=0..128): Elevators Fwd/Back | Nurses' Station
    drawBanner(0,   0, 512, 128, 'ELEVATORS  \u2192', '#0a1f29', '#52ccc4', '#e4f4f8', 46);
    drawBanner(512, 0, 512, 128, '\u2190  ELEVATORS', '#0a1f29', '#52ccc4', '#e4f4f8', 46);
    // Row 1 (y=128..256): Nurses' Station + Red glowing EXIT
    drawBanner(0,   128, 768, 128, "NURSES' STATION", '#0b1922', '#4aa8b8', '#dff0f4', 52);
    drawBanner(768, 128, 256, 128, 'EXIT', '#180507', '#ff3b30', '#ff5448', 68);
    // Row 2 (y=256..384): 2 ECG Monitors
    for(var m = 0; m < 2; m++){
      var mx = m * 512;
      c.fillStyle = '#061318'; c.fillRect(mx, 256, 512, 128);
      c.strokeStyle = '#0d323b'; c.lineWidth = 1;
      for(var gx = 0; gx < 512; gx += 24){ c.beginPath(); c.moveTo(mx + gx, 256); c.lineTo(mx + gx, 384); c.stroke(); }
      c.strokeStyle = m ? '#ff9d42' : '#40f0a0'; c.lineWidth = 3; c.beginPath();
      for(var px = 8; px < 504; px += 4){
        var wv = (px % 96 === 32) ? -32 : (px % 96 === 40) ? 18 : Math.sin(px * 0.14) * 3;
        var py = 324 + wv;
        if(px === 8) c.moveTo(mx + px, py); else c.lineTo(mx + px, py);
      }
      c.stroke();
      c.fillStyle = m ? '#ffbf70' : '#7ef8c0'; c.font = 'bold 20px monospace'; c.textAlign = 'left';
      c.fillText(m ? 'WARD B · ALERT' : 'HR 74 · SPO2 98%', mx + 18, 282);
    }
    // Row 3 (y=384..512): 5 Room Numbers (each 204px wide)
    ['413', '414', '415', '416', '418'].forEach(function(lbl, idx){
      drawBanner(idx * 204, 384, 200, 128, lbl, '#0e1b24', '#5c8f9e', '#dcebf0', 48);
    });

    var atlasTex = new THREE.CanvasTexture(cv);
    atlasTex.encoding = THREE.sRGBEncoding; atlasTex.anisotropy = 4;

    var posArr = [], normArr = [], uvArr = [], idxArr = [];
    function pushQuad(cx, cy, cz, w, h, ry, rx, u0, v0, u1, v1){
      var base = posArr.length / 3;
      var hw = w * 0.5, hh = h * 0.5;
      var corners = [[-hw,-hh,0],[hw,-hh,0],[hw,hh,0],[-hw,hh,0]];
      var e = new THREE.Euler(rx || 0, ry || 0, 0, 'YXZ');
      var n = new THREE.Vector3(0, 0, 1).applyEuler(e);
      corners.forEach(function(pt){
        var v = new THREE.Vector3(pt[0], pt[1], pt[2]).applyEuler(e);
        posArr.push(cx + v.x, cy + v.y, cz + v.z);
        normArr.push(n.x, n.y, n.z);
      });
      // CanvasTexture flipY=true -> canvas top y=0 is v=1.0, bottom y=512 is v=0.0!
      uvArr.push(u0, 1 - v1, u1, 1 - v1, u1, 1 - v0, u0, 1 - v0);
      idxArr.push(base, base+1, base+2, base, base+2, base+3);
    }

    // Elevators front/back
    pushQuad(12.0, 2.55, -22.978, 1.80, 0.27, 0, 0,       0.0, 0.0, 0.5, 0.25);
    pushQuad(12.0, 2.55, -23.022, 1.80, 0.27, Math.PI, 0, 0.5, 0.0, 1.0, 0.25);
    // Nurses Station overhead + dual screens facing +X corridor
    pushQuad(10.745, 2.45, -27.5, 1.55, 0.28, Math.PI / 2, 0, 0.0, 0.25, 0.75, 0.50);
    pushQuad(10.778, 1.35, -28.05, 0.40, 0.26, Math.PI / 2, 0, 0.0, 0.50, 0.50, 0.75);
    pushQuad(10.778, 1.35, -26.95, 0.40, 0.26, Math.PI / 2, 0, 0.5, 0.50, 1.00, 0.75);
    // Glowing crimson EXIT signs above cross exits (WEST WING CROSS left & LINK left)
    pushQuad(10.33, 2.55, -16.0, 0.54, 0.20, Math.PI / 2, 0, 0.75, 0.25, 1.0, 0.50);
    pushQuad(10.33, 2.55, -42.0, 0.54, 0.20, Math.PI / 2, 0, 0.75, 0.25, 1.0, 0.50);
    // Door number plates (on doors 413, 415, 418 flush; 414 & 416 rotated slightly or mounted cleanly beside frame on jamb)
    [
      [10.35, 1.58, -24.5, Math.PI/2, 0],
      [13.65, 1.82, -20.5, -Math.PI/2, 1],
      [10.35, 1.58, -31.5, Math.PI/2, 2],
      [13.65, 1.82, -28.0, -Math.PI/2, 3],
      [13.65, 1.58, -35.2, -Math.PI/2, 4]
    ].forEach(function(p){
      pushQuad(p[0], p[1], p[2], 0.20, 0.10, p[3], 0, (p[4]*204)/1024, 0.75, (p[4]*204+200)/1024, 1.0);
    });
    // Defibrillator monitor screen on crash cart top
    pushQuad(12.22, 0.94, -43.0, 0.28, 0.16, 0, -0.35, 0.0, 0.50, 0.50, 0.75);

    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(normArr, 3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr, 2));
    g.setIndex(idxArr);
    var mat = new THREE.MeshStandardMaterial({
      map: atlasTex, emissiveMap: atlasTex, emissive: new THREE.Color(0xdcf0f5),
      emissiveIntensity: 0.72, roughness: 0.85, metalness: 0.0
    });
    return new THREE.Mesh(g, mat);
  }

  // Merge all soft volumetric troffer cones & cross shafts into ONE mesh = 1 draw call!
  function buildMergedVolumetrics(){
    var specs = [
      { pos: [12.0, 1.82, -17.6], rx: 0, rz: 0, rt: 0.28, rb: 0.92, h: 2.1, col: [0.70, 0.90, 1.00], str: 0.036 },
      { pos: [12.0, 1.82, -24.0], rx: 0, rz: 0, rt: 0.28, rb: 0.92, h: 2.1, col: [0.70, 0.90, 1.00], str: 0.036 },
      { pos: [12.0, 1.82, -30.4], rx: 0, rz: 0, rt: 0.28, rb: 0.92, h: 2.1, col: [0.70, 0.90, 1.00], str: 0.032 },
      { pos: [12.0, 1.82, -36.8], rx: 0, rz: 0, rt: 0.28, rb: 0.92, h: 2.1, col: [0.70, 0.90, 1.00], str: 0.030 },
      { pos: [11.15, 2.02, -27.5], rx: 0, rz: 0, rt: 0.26, rb: 0.85, h: 1.6, col: [1.00, 0.72, 0.42], str: 0.044 },
      { pos: [9.35, 1.55, -16.0], rx: 0, rz: -Math.PI/2.6, rt: 0.70, rb: 1.55, h: 3.6, col: [0.68, 0.88, 1.00], str: 0.038 },
      { pos: [9.35, 1.55, -42.0], rx: 0, rz: -Math.PI/2.6, rt: 0.70, rb: 1.55, h: 3.6, col: [0.68, 0.88, 1.00], str: 0.036 }
    ];
    var pArr = [], nArr = [], uvArr = [], cArr = [], iArr = [];
    specs.forEach(function(sp){
      var cyl = new THREE.CylinderGeometry(sp.rt, sp.rb, sp.h, 16, 1, true);
      var mat4 = new THREE.Matrix4().compose(
        new THREE.Vector3(sp.pos[0], sp.pos[1], sp.pos[2]),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(sp.rx, 0, sp.rz)),
        new THREE.Vector3(1, 1, 1)
      );
      cyl.applyMatrix4(mat4);
      var base = pArr.length / 3;
      var pos = cyl.attributes.position, norm = cyl.attributes.normal, uv = cyl.attributes.uv;
      for(var i = 0; i < pos.count; i++){
        pArr.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        nArr.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        uvArr.push(uv.getX(i), uv.getY(i));
        cArr.push(sp.col[0] * sp.str, sp.col[1] * sp.str, sp.col[2] * sp.str);
      }
      for(var j = 0; j < cyl.index.count; j++) iArr.push(base + cyl.index.getX(j));
      cyl.dispose();
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pArr, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(nArr, 3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(uvArr, 2));
    g.setAttribute('color',    new THREE.Float32BufferAttribute(cArr, 3));
    g.setIndex(iArr);
    var vMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: [
        'attribute vec3 color; varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
        'void main(){ vCol = color; vUv = uv; vN = normalize(normal); vec4 wp = vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying vec2 vUv;',
        'void main(){',
        '  vec3 V = normalize(cameraPosition - vW);',
        '  float edgeFade = pow(abs(dot(normalize(vN), V)), 2.0);',
        '  float vertFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.08, vUv.y);',
        '  gl_FragColor = vec4(vCol * edgeFade * vertFade, 1.0);',
        '}'
      ].join('\n')
    });
    return new THREE.Mesh(g, vMat);
  }

  // Flickering tube #6 overlay quad + subtle practical specular highlights ONLY (zero runtime shadow maps!)
  var flickerLens = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 1.14),
    new THREE.MeshStandardMaterial({ color: 0x1e3028, emissive: new THREE.Color(0x66aa8e), emissiveIntensity: 0.45, roughness: 0.2 })
  );
  flickerLens.rotation.x = Math.PI / 2;
  flickerLens.position.set(12.0, 2.866, -33.6);
  scene.add(flickerLens);

  scene.add(new THREE.AmbientLight(0x131d24, 0.05));
  var pDesk = new THREE.PointLight(0xffb464, 0.60, 6.5, 2.0); pDesk.position.set(11.3, 1.75, -27.5); scene.add(pDesk);
  var pFar  = new THREE.PointLight(0xcceeff, 0.62, 8.5, 2.0); pFar.position.set(12.2, 2.05, -42.2);  scene.add(pFar);
  var pDoor = new THREE.PointLight(0xffa452, 0.55, 4.2, 2.0); pDoor.position.set(14.1, 1.45, -20.5); scene.add(pDoor);
  var pFlk  = new THREE.PointLight(0x74c6a0, 0.35, 5.5, 2.0); pFlk.position.set(12.0, 2.65, -33.6);  scene.add(pFlk);

  // Post-processing pipeline
  var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var postSceneBright = new THREE.Scene(), postSceneBlurV = new THREE.Scene(), postSceneFinal = new THREE.Scene();
  var quadGeo = new THREE.PlaneGeometry(2, 2);

  postSceneBright.add(new THREE.Mesh(quadGeo, new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tDiffuse: { value: sceneRT.texture }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){',
      '  vec3 sum = vec3(0.0);',
      '  for(int i = -5; i <= 5; i++){',
      '    float w = exp(-float(i * i) * 0.095);',
      '    vec3 s = texture2D(tDiffuse, clamp(vUv + vec2(float(i) * uTexel.x * 4.5, 0.0), 0.001, 0.999)).rgb;',
      '    float l = dot(s, vec3(0.2126, 0.7152, 0.0722));',
      '    sum += max(s - vec3(1.22), vec3(0.0)) * smoothstep(1.12, 2.25, l) * w;',
      '  }',
      '  gl_FragColor = vec4(sum * 0.22, 1.0);',
      '}'
    ].join('\n')
  })));

  postSceneBlurV.add(new THREE.Mesh(quadGeo, new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tDiffuse: { value: bloomRT1.texture }, uTexel: { value: new THREE.Vector2(2 / W, 2 / H) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform vec2 uTexel; varying vec2 vUv;',
      'void main(){',
      '  vec3 sum = vec3(0.0); float wsum = 0.0;',
      '  for(int i = -4; i <= 4; i++){',
      '    float w = exp(-float(i * i) * 0.16);',
      '    sum += texture2D(tDiffuse, clamp(vUv + vec2(float(i) * uTexel.x * 2.8, float(i) * uTexel.y * 2.0), 0.001, 0.999)).rgb * w;',
      '    wsum += w;',
      '  }',
      '  gl_FragColor = vec4(sum / wsum, 1.0);',
      '}'
    ].join('\n')
  })));

  var finalMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tScene: { value: sceneRT.texture }, tBloom: { value: bloomRT2.texture }, uTime: { value: 0.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uTime; varying vec2 vUv;',
      'vec3 acesFilm(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }',
      'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
      'void main(){',
      '  vec2 dc = vUv - 0.5; float r2 = dot(dc, dc);',
      '  vec2 ca = dc * (0.0028 * r2);',
      '  vec3 col = vec3(texture2D(tScene, vUv + ca).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - ca).b);',
      '  col += texture2D(tBloom, vUv).rgb * 0.48;',
      '  col *= 0.96;',
      '  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));',
      '  vec3 split = mix(vec3(0.84, 1.00, 1.08), vec3(1.06, 0.98, 0.90), smoothstep(0.06, 0.58, lum));',
      '  col = acesFilm(col * split);',
      '  col *= mix(1.0, 0.52, smoothstep(0.14, 0.68, r2));',
      '  col += (hash12(gl_FragCoord.xy + fract(uTime) * 37.0) - 0.5) * 0.014;',
      '  gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);',
      '}'
    ].join('\n')
  });
  postSceneFinal.add(new THREE.Mesh(quadGeo, finalMat));

  var reflCam = new THREE.PerspectiveCamera(60, 390 / 844, 0.05, 1500);
  var tmpTarget = new THREE.Vector3(), tmpDir = new THREE.Vector3();
  var floorObj = null, volObj = null;

  return new Promise(function(resolve, reject){
    if(typeof THREE.GLTFLoader !== 'function') return reject(new Error('GLTFLoader missing for Take 6'));
    var loader = new THREE.GLTFLoader();
    function loadGLB(url){
      return new Promise(function(res, rej){ loader.load(url, res, undefined, rej); });
    }
    Promise.all([loadGLB('assets/combine/combine-shell.glb'), loadGLB('assets/combine/combine-props.glb')]).then(function(res){
      var shellRoot = res[0].scene;
      var propsRoot = res[1].scene;

      shellRoot.traverse(function(o){
        if(!o.isMesh) return;
        var mn = o.material && o.material.name;
        if(mn && shellMatByName[mn]){
          o.material = shellMatByName[mn];
          if(mn === 'ShellFloor') floorObj = o;
        }
      });
      propsRoot.traverse(function(o){
        if(!o.isMesh) return;
        o.material = propsAtlasMat;
      });
      scene.add(shellRoot);
      scene.add(propsRoot);
      scene.add(buildMergedSignage());
      volObj = buildMergedVolumetrics();
      scene.add(volObj);

      resolve({
        flags: ['GLTFLoader (three@0.128.0)', 'Planar Mirror RT + Custom Filmic Anamorphic Post (3 extra RTs)'],
        render: function(r, s, c, tSec){
          var t = tSec || 0;
          var flk = (t > 0.01) ? (0.42 + 0.58 * Math.pow(Math.sin(t * 27.0) * Math.cos(t * 13.7), 2.0)) : 1.0;
          pFlk.intensity = 0.35 * flk;
          flickerLens.material.emissiveIntensity = 0.45 * flk;

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

          if(floorObj) floorObj.visible = false;
          if(volObj)   volObj.visible = false;
          r.setRenderTarget(reflRT); r.clear(); r.render(s, reflCam);
          if(floorObj) floorObj.visible = true;
          if(volObj)   volObj.visible = true;

          // 2) Full-res HDR scene pass
          r.setRenderTarget(sceneRT); r.clear(); r.render(s, c);
          // 3) Half/quarter anamorphic bloom
          r.setRenderTarget(bloomRT1); r.clear(); r.render(postSceneBright, postCam);
          r.setRenderTarget(bloomRT2); r.clear(); r.render(postSceneBlurV,  postCam);
          // 4) Final filmic composite
          finalMat.uniforms.uTime.value = t;
          r.setRenderTarget(null); r.render(postSceneFinal, postCam);
        }
      });
    }).catch(reject);
  });
};
