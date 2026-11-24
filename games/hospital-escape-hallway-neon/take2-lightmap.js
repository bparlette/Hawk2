/* Take 2 · Blender Cycles Metal-GPU Baked Lightmaps + Zero Runtime Shadows (GLTFLoader flagged) */
window.BUILD_TAKE_2 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;

  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  scene.background = new THREE.Color(0x05090d);
  scene.fog = new THREE.FogExp2(0x070d12, 0.018);

  var lmTex = D.loadTex('assets/baked/lightmap.jpg', { srgb: true, clamp: true, flipY: false });
  var dFl = D.loadTex('assets/pbr/floor_diff.jpg', { srgb: true });
  var dWl = D.loadTex('assets/pbr/wall_diff.jpg',  { srgb: true });
  var dCe = D.loadTex('assets/pbr/ceil_diff.jpg',  { srgb: true });
  var dWd = D.loadTex('assets/pbr/wood_diff.jpg',  { srgb: true });
  var dMt = D.loadTex('assets/pbr/metal_diff.jpg', { srgb: true });

  var glbPromise = new Promise(function(resolve, reject){
    if(typeof THREE.GLTFLoader !== 'function'){
      return reject(new Error('GLTFLoader missing for Take 2'));
    }
    var loader = new THREE.GLTFLoader();
    loader.load('assets/baked/hallway-baked.glb', function(gltf){
      var root = gltf.scene;
      // Rotate Y +180? No! Blender Y_up=True converts Blender (X, Y, Z) -> Three (X, Z, -Y)!!
      // Wait: in bake_cycles_hallway.py we placed Blender y = -z_three (+16..+43.7).
      // Three.js glTF converter maps Blender (x, y, z) -> Three (x, z, -y)!
      // Therefore Blender y=+29.85 becomes Three z=-29.85, Blender z=+2.9 becomes Three y=+2.9 — EXACT alignment!
      var matByName = {
        BakeFloor:   new THREE.MeshStandardMaterial({ color: 0x5c7c88, map: dFl, lightMap: lmTex, lightMapIntensity: 2.35, roughness: 0.40, metalness: 0.08 }),
        BakeWall:    new THREE.MeshStandardMaterial({ color: 0xd0dad8, map: dWl, lightMap: lmTex, lightMapIntensity: 2.65, roughness: 0.85, metalness: 0.02 }),
        BakeCeil:    new THREE.MeshStandardMaterial({ color: 0xdce4e6, map: dCe, lightMap: lmTex, lightMapIntensity: 2.35, roughness: 0.90, metalness: 0.02 }),
        BakeDoor:    new THREE.MeshStandardMaterial({ color: 0x9e7a64, map: dWd, lightMap: lmTex, lightMapIntensity: 2.40, roughness: 0.54, metalness: 0.05 }),
        BakeFrame:   new THREE.MeshStandardMaterial({ color: 0x5c666d, map: dMt, lightMap: lmTex, lightMapIntensity: 2.25, roughness: 0.36, metalness: 0.52 }),
        BakeWood:    new THREE.MeshStandardMaterial({ color: 0x967660, map: dWd, lightMap: lmTex, lightMapIntensity: 2.35, roughness: 0.52, metalness: 0.05 }),
        BakeSheet:   new THREE.MeshStandardMaterial({ color: 0xdce6e8, lightMap: lmTex, lightMapIntensity: 2.50, roughness: 0.72, metalness: 0.06 }),
        BakeRed:     new THREE.MeshStandardMaterial({ color: 0x7e1210, lightMap: lmTex, lightMapIntensity: 2.45, roughness: 0.34, metalness: 0.16 }),
        BakeTroffer: new THREE.MeshStandardMaterial({ color: 0xe6f8ff, emissive: new THREE.Color(0xdcf4ff), emissiveIntensity: 2.6, roughness: 0.2 }),
        BakeScreen:  new THREE.MeshStandardMaterial({ color: 0x162228, roughness: 0.35 })
      };

      root.traverse(function(obj){
        if(!obj.isMesh) return;
        var mn = obj.material && obj.material.name;
        if(mn && matByName[mn]){
          obj.material = matByName[mn];
        }
      });
      scene.add(root);

      // Crisp diagnostic monitor screens facing into corridor (+X) over baked housings
      [-0.55, 0.55].forEach(function(dz, idx){
        var stex = D.makeMonitorTexture(idx);
        var sm = new THREE.Mesh(
          new THREE.PlaneGeometry(0.40, 0.26),
          new THREE.MeshStandardMaterial({ map: stex, emissiveMap: stex, emissive: new THREE.Color(idx ? 0xff9b45 : 0x58f0b0), emissiveIntensity: 1.05, roughness: 0.25 })
        );
        sm.position.set(10.76, 1.32, -27.5 + dz);
        sm.rotation.y = Math.PI / 2;
        scene.add(sm);
      });

      // Add matching signage & door plaques onto baked coordinates
      var sElv = D.buildSignPanel(D.ELEVATOR_SIGN.text, 1.80, { w: 512, h: 96, mh: 0.27, size: 48, bg: '#0c2430', border: '#54d0c8' });
      sElv.position.set(12.0, 2.55, -23.0); scene.add(sElv);
      var sElvB = D.buildSignPanel('\u2190  ELEVATORS', 1.80, { w: 512, h: 96, mh: 0.27, size: 48, bg: '#0c2430', border: '#54d0c8' });
      sElvB.position.set(12.0, 2.55, -23.02); sElvB.rotation.y = Math.PI; scene.add(sElvB);

      var sNrs = D.buildSignPanel("NURSES' STATION", 1.55, { w: 512, h: 96, mh: 0.28, size: 42, bg: '#0c1d28', emissiveIntensity: 0.22 });
      sNrs.position.set(10.72, 2.45, -27.5); sNrs.rotation.y = Math.PI / 2; scene.add(sNrs);

      D.DOORS.forEach(function(d){
        var pl = D.buildSignPanel(d.label, 0.20, { w: 128, h: 64, mh: 0.10, size: 38, bg: '#111e27', border: '#6598a6' });
        pl.position.set(d.x + d.inwardX * 0.04, 1.58, d.z);
        pl.rotation.y = d.inwardX > 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(pl);
      });

      // Minimal non-shadowed specular highlights ONLY (Cycles lightmap handles all diffuse GI + shadows)
      scene.add(new THREE.AmbientLight(0x162228, 0.10));
      var gDesk = new THREE.PointLight(0xffbe74, 0.42, 6.5, 2.0); gDesk.position.set(11.3, 1.8, -27.5); scene.add(gDesk);
      var gFar  = new THREE.PointLight(0xd4eeff, 0.35, 7.5, 2.0); gFar.position.set(12.2, 2.2, -39.5);  scene.add(gFar);

      resolve({ flags: ['GLTFLoader (three@0.128.0)'] });
    }, undefined, function(err){ reject(err); });
  });

  return glbPromise;
};
