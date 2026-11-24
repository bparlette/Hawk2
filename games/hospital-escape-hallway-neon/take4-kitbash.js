/* Take 4 · Maximum-Density Architectural Kit-Bash + Analytical 9-Panel Area Lights (GLTFLoader flagged) */
window.BUILD_TAKE_4 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  scene.background = new THREE.Color(0x05090d);
  scene.fog = new THREE.FogExp2(0x081016, 0.020);
  scene.environment = D.buildCorridorPMREM(renderer, { ceilCol: '#243038', wallCol: '#2b3740', floorCol: '#11161a' });

  // World-space rectangular 9-panel ceiling area-light GLSL integration injected into Standard materials
  var TROFFER_Z = D.TROFFERS; // 9 panels
  var uTime = { value: 0.0 };

  function withAreaLights(mat){
    mat.onBeforeCompile = function(shader){
      shader.uniforms.uAreaTime = uTime;
      shader.vertexShader = 'varying vec3 vAreaWPos;\nvarying vec3 vAreaWNorm;\n' + shader.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvAreaWNorm = normalize(mat3(modelMatrix) * objectNormal);')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAreaWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');

      var rectLoop = [
        'uniform float uAreaTime;',
        'varying vec3 vAreaWPos;',
        'varying vec3 vAreaWNorm;',
        'float rectIrradiance(vec3 P, vec3 N, vec3 Lc, float hx, float hz){',
        '  vec3 cp = vec3(clamp(P.x, Lc.x - hx, Lc.x + hx), Lc.y, clamp(P.z, Lc.z - hz, Lc.z + hz));',
        '  vec3 d = cp - P;',
        '  float dist2 = dot(d, d) + 0.18;',
        '  vec3 L = normalize(d);',
        '  float nDotL = clamp(dot(N, L) * 0.72 + 0.28, 0.0, 1.0);',
        '  float lampFacing = smoothstep(-0.15, 0.45, -L.y);',
        '  return (nDotL * lampFacing) / dist2;',
        '}'
      ].join('\n');

      var injectLight = [
        '#include <lights_fragment_end>',
        '{',
        '  vec3 Nw = normalize(vAreaWNorm);',
        '  vec3 Vw = normalize(cameraPosition - vAreaWPos);',
        '  vec3 Rw = reflect(-Vw, Nw);',
        '  float tz[9];',
        '  tz[0]=-17.6; tz[1]=-20.8; tz[2]=-24.0; tz[3]=-27.2; tz[4]=-30.4; tz[5]=-33.6; tz[6]=-36.8; tz[7]=-40.0; tz[8]=-43.2;',
        '  vec3 aDiff = vec3(0.0); vec3 aSpec = vec3(0.0);',
        '  float roughA = clamp(material.specularRoughness, 0.12, 0.95);',
        '  for(int i = 0; i < 9; i++){',
        '    vec3 lc = vec3(12.0, 2.86, tz[i]);',
        '    float dim = (i == 5) ? 0.48 : 1.0;',
        '    vec3 col = (i == 5) ? vec3(0.70, 0.92, 0.80) : vec3(0.84, 0.95, 1.00);',
        '    float irr = rectIrradiance(vAreaWPos, Nw, lc, 0.28, 0.58) * 0.96 * dim;',
        '    aDiff += col * irr;',
        '    if(Rw.y > 0.04){',
        '      float tHit = (2.86 - vAreaWPos.y) / Rw.y;',
        '      vec3 hit = vAreaWPos + Rw * tHit;',
        '      vec2 dRect = max(abs(hit.xz - lc.xz) - vec2(0.28, 0.58), vec2(0.0));',
        '      float specCone = exp(-dot(dRect, dRect) / (0.03 + roughA * roughA * 1.4));',
        '      aSpec += col * specCone * dim * (1.0 - roughA) * 0.62;',
        '    }',
        '  }',
        '  reflectedLight.directDiffuse += aDiff * diffuseColor.rgb * 0.85;',
        '  // Subtle floor bounce irradiance so ceiling panels read physically lit in kitbash take',
        '  if(Nw.y < -0.5) reflectedLight.indirectDiffuse += vec3(0.11, 0.14, 0.16) * diffuseColor.rgb;',
        '  reflectedLight.directSpecular += aSpec * mix(vec3(0.04), diffuseColor.rgb, metalnessFactor);',
        '}'
      ].join('\n');

      shader.fragmentShader = rectLoop + '\n' + shader.fragmentShader.replace('#include <lights_fragment_end>', injectLight);
    };
    return mat;
  }

  var tFl = { map: D.loadTex('assets/pbr/floor_diff.jpg', { srgb: true }), nor: D.loadTex('assets/pbr/floor_nor.jpg'), rgh: D.loadTex('assets/pbr/floor_rough.jpg') };
  var tWl = { map: D.loadTex('assets/pbr/wall_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/wall_nor.jpg'),  rgh: D.loadTex('assets/pbr/wall_rough.jpg') };
  var tWd = { map: D.loadTex('assets/pbr/wood_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/wood_nor.jpg'),  rgh: D.loadTex('assets/pbr/wood_rough.jpg') };
  var tMt = { map: D.loadTex('assets/pbr/metal_diff.jpg', { srgb: true }), nor: D.loadTex('assets/pbr/metal_nor.jpg'), rgh: D.loadTex('assets/pbr/metal_rough.jpg') };
  var tCe = { map: D.loadTex('assets/pbr/ceil_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/ceil_nor.jpg'),  rgh: D.loadTex('assets/pbr/ceil_rough.jpg') };

  var mats = {
    floor:   withAreaLights(new THREE.MeshStandardMaterial({ color: 0x5c7a86, map: tFl.map, normalMap: tFl.nor, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: tFl.rgh, roughness: 0.42, metalness: 0.08 })),
    wall:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0xb6c2c0, map: tWl.map, normalMap: tWl.nor, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: tWl.rgh, roughness: 0.86 })),
    ceiling: withAreaLights(new THREE.MeshStandardMaterial({ color: 0xd0dade, map: tCe.map, normalMap: tCe.nor, normalScale: new THREE.Vector2(0.22, 0.22), roughnessMap: tCe.rgh, roughness: 0.88 })),
    beam:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0x4f5e66, roughness: 0.82, metalness: 0.04 })),
    door:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0x947462, map: tWd.map, normalMap: tWd.nor, roughnessMap: tWd.rgh, roughness: 0.54 })),
    wood:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0xb08666, map: tWd.map, normalMap: tWd.nor, roughnessMap: tWd.rgh, roughness: 0.46 })),
    frame:   withAreaLights(new THREE.MeshStandardMaterial({ color: 0x454f56, roughness: 0.34, metalness: 0.65 })),
    metal:   withAreaLights(new THREE.MeshStandardMaterial({ color: 0x909ca4, normalMap: tMt.nor, normalScale: new THREE.Vector2(0.15, 0.15), roughness: 0.30, metalness: 0.72 })),
    trim:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0x222b30, roughness: 0.55, metalness: 0.18 })),
    rail:    withAreaLights(new THREE.MeshStandardMaterial({ color: 0x3e4d55, roughness: 0.42, metalness: 0.35 })),
    counter: withAreaLights(new THREE.MeshStandardMaterial({ color: 0x949e9c, map: tWl.map, roughness: 0.74 }))
  };

  D.buildShellGeometry(scene, mats, {
    shadows: true, trim: true,
    skipBasicProps: true,
    ajarDoors: { '414': -0.24, '416': -0.40 },
    flickerIndex: 5, flickerIntensity: 0.55,
    floorTile: 1.85, wallTile: 1.8, ceilTile: 1.9,
    trofferColor: 0xdff5ff, trofferIntensity: 2.6, screenGlow: 1.15
  });

  // Architectural ceiling cable conduit & sprinkler pipe along left soffit + corner guards
  D.addBox(scene, 0.06, 0.05, 22.4, mats.metal, 10.42, 2.78, -29.0, { cast: true, recv: true });
  var pipeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 22.4, 8), mats.metal);
  pipeCyl.rotation.x = Math.PI / 2; pipeCyl.position.set(10.52, 2.78, -29.0); scene.add(pipeCyl);
  [-17.7, -40.3].forEach(function(zc){ D.addBox(scene, 0.05, 1.4, 0.05, mats.metal, 10.30, 0.70, zc, { cast: true, recv: true }); });

  // Soft interior room spill behind cracked doors 414 & 416
  var doorGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd092 });
  [-20.5, -28.0].forEach(function(dz){
    var plRoom = new THREE.PointLight(0xffbe72, 0.85, 4.5, 1.8);
    plRoom.position.set(13.95, 1.5, dz); scene.add(plRoom);
  });

  // Base fill + warm Nurses' Station task pool + soft shadow spot
  scene.add(new THREE.HemisphereLight(0x7a9eb0, 0x1a2228, 0.22));
  var warmDesk = new THREE.SpotLight(0xffc278, 1.9, 10.0, 0.9, 0.65, 1.6);
  warmDesk.position.set(11.9, 2.75, -27.2); warmDesk.target.position.set(10.8, 0.2, -27.5);
  warmDesk.castShadow = true; warmDesk.shadow.mapSize.set(1024, 1024);
  scene.add(warmDesk); scene.add(warmDesk.target);

  var farShadow = new THREE.SpotLight(0xd6eeff, 1.4, 12.0, 0.9, 0.6, 1.5);
  farShadow.position.set(12.0, 2.78, -37.2); farShadow.target.position.set(12.9, 0.0, -40.2);
  farShadow.castShadow = true; farShadow.shadow.mapSize.set(1024, 1024);
  scene.add(farShadow); scene.add(farShadow.target);

  // Subtle dark wet sheen patch under WetFloorCone
  var dampPatch = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    withAreaLights(new THREE.MeshStandardMaterial({ color: 0x0b1214, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.26 }))
  );
  dampPatch.rotation.x = -Math.PI / 2; dampPatch.position.set(12.78, 0.004, -25.85);
  scene.add(dampPatch);

  // Load dense hero kit-bash GLB
  return new Promise(function(resolve, reject){
    if(typeof THREE.GLTFLoader !== 'function'){
      return reject(new Error('GLTFLoader missing for Take 4'));
    }
    var loader = new THREE.GLTFLoader();
    loader.load('assets/kitbash/props.glb', function(gltf){
      var bank = {};
      gltf.scene.traverse(function(o){
        if(o.name && ['GurneyHero','CrashCartHero','IVStandHero','WetFloorCone','VisitorChair','FireCabinet','WallDispenser','WallClock','ChartStack'].indexOf(o.name) >= 0){
          bank[o.name] = o;
        }
      });

      function placeProp(key, x, y, z, ry, rx, rz, sc){
        var src = bank[key];
        if(!src) return null;
        var clone = src.clone(true);
        clone.traverse(function(ch){
          if(ch.isMesh){
            ch.castShadow = true; ch.receiveShadow = true;
            if(ch.material){
              ch.material = ch.material.clone();
              withAreaLights(ch.material);
            }
          }
        });
        clone.position.set(x, y, z);
        if(ry) clone.rotation.y = ry;
        if(rx) clone.rotation.x = rx;
        if(rz) clone.rotation.z = rz;
        if(sc) clone.scale.setScalar(sc);
        scene.add(clone);
        return clone;
      }

      // Exact Stage 1 hero prop coords + extra architectural dressing
      placeProp('GurneyHero',    D.PROPS.gurney.x,    0, D.PROPS.gurney.z,    0);
      placeProp('CrashCartHero', D.PROPS.crashCart.x, 0, D.PROPS.crashCart.z, D.PROPS.crashCart.rotY);
      placeProp('IVStandHero',   13.26, 0, -37.25, 0.35);
      var cone = placeProp('WetFloorCone',  12.78, 0, -25.85, 0.25, 0, 0, 0.85);
      if(cone) cone.traverse(function(c){ if(c.isMesh && c.material) c.material.color.setHex(0xe8a818); });
      placeProp('VisitorChair',  13.36, 0, -23.35, -Math.PI / 2);
      placeProp('VisitorChair',  13.36, 0, -24.08, -Math.PI / 2 + 0.08);
      placeProp('FireCabinet',   10.32, 1.38, -21.5, Math.PI / 2);
      placeProp('WallClock',     10.33, 2.34, -25.55, Math.PI / 2);
      placeProp('ChartStack',    10.82, 1.10, -28.05, 0.18);
      placeProp('ChartStack',    10.80, 1.10, -26.85, -0.45);
      [
        [10.33, 1.30, -23.6, Math.PI / 2],
        [10.33, 1.30, -30.6, Math.PI / 2],
        [13.67, 1.30, -19.6, -Math.PI / 2],
        [13.67, 1.30, -27.1, -Math.PI / 2]
      ].forEach(function(w){ placeProp('WallDispenser', w[0], w[1], w[2], w[3]); });

      resolve({
        flags: ['GLTFLoader (three@0.128.0)'],
        render: function(r, s, c, tSec){
          uTime.value = tSec || 0;
          r.render(s, c);
        }
      });
    }, undefined, function(err){ reject(err); });
  });
};
