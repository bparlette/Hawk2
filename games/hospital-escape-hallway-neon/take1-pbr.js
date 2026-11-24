/* Take 1 · Photoreal CC0 PBR Materials (Poly Haven 1K albedo/normal/roughness + PMREM + PCFSoft shadows, core Three r128 only) */
window.BUILD_TAKE_1 = function(ctx){
  var D = ctx.data, scene = ctx.scene, renderer = ctx.renderer;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  scene.background = new THREE.Color(0x05090d);
  scene.fog = new THREE.FogExp2(0x060b0f, 0.025);
  scene.environment = D.buildCorridorPMREM(renderer, { ceilCol: '#2e3c45', wallCol: '#2a363e', floorCol: '#0d1317' });

  var tFl = { map: D.loadTex('assets/pbr/floor_diff.jpg', { srgb: true }), nor: D.loadTex('assets/pbr/floor_nor.jpg'), rgh: D.loadTex('assets/pbr/floor_rough.jpg') };
  var tWl = { map: D.loadTex('assets/pbr/wall_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/wall_nor.jpg'),  rgh: D.loadTex('assets/pbr/wall_rough.jpg') };
  var tWd = { map: D.loadTex('assets/pbr/wood_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/wood_nor.jpg'),  rgh: D.loadTex('assets/pbr/wood_rough.jpg') };
  var tMt = { map: D.loadTex('assets/pbr/metal_diff.jpg', { srgb: true }), nor: D.loadTex('assets/pbr/metal_nor.jpg'), rgh: D.loadTex('assets/pbr/metal_rough.jpg') };
  var tCe = { map: D.loadTex('assets/pbr/ceil_diff.jpg',  { srgb: true }), nor: D.loadTex('assets/pbr/ceil_nor.jpg'),  rgh: D.loadTex('assets/pbr/ceil_rough.jpg') };

  var mats = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x5c7c88, map: tFl.map, normalMap: tFl.nor, normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: tFl.rgh, roughness: 0.46, metalness: 0.08, envMapIntensity: 1.05
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xaab8b6, map: tWl.map, normalMap: tWl.nor, normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: tWl.rgh, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.42
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: 0xd8e4e8, emissive: new THREE.Color(0x1f2b33), emissiveIntensity: 0.55,
      map: tCe.map, normalMap: tCe.nor, normalScale: new THREE.Vector2(0.20, 0.20),
      roughnessMap: tCe.rgh, roughness: 0.86, metalness: 0.02, envMapIntensity: 0.40
    }),
    beam: new THREE.MeshStandardMaterial({
      color: 0x54636b, roughness: 0.82, metalness: 0.04
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0x8f7260, map: tWd.map, normalMap: tWd.nor, normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: tWd.rgh, roughness: 0.54, metalness: 0.05, envMapIntensity: 0.65
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0xad8262, map: tWd.map, normalMap: tWd.nor, normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: tWd.rgh, roughness: 0.46, metalness: 0.06, envMapIntensity: 0.85
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x454f56, roughness: 0.36, metalness: 0.65, envMapIntensity: 1.15
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x8d9aa2, normalMap: tMt.nor, normalScale: new THREE.Vector2(0.15, 0.15),
      roughnessMap: tMt.rgh, roughness: 0.32, metalness: 0.72, envMapIntensity: 1.25
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0x222b30, roughness: 0.55, metalness: 0.18 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x3f4c54, roughness: 0.42, metalness: 0.32, envMapIntensity: 0.9 }),
    counter: new THREE.MeshStandardMaterial({
      color: 0x8f9c9a, map: tWl.map, normalMap: tWl.nor, normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.72, metalness: 0.05
    })
  };

  D.buildShellGeometry(scene, mats, {
    shadows: true, trim: true,
    flickerIndex: 5, flickerIntensity: 0.5,
    floorTile: 1.85, wallTile: 1.8, ceilTile: 2.0,
    trofferColor: 0xdff5ff, trofferIntensity: 2.8, screenGlow: 1.1
  });

  // Balanced thriller ambient bounce + subtle ceiling upward bounce fill
  scene.add(new THREE.HemisphereLight(0x9ab8c8, 0x1b242a, 0.30));

  // Alternating strong/soft bay lights (tube #6 dimmer 5800K)
  [-17.6, -22.4, -27.2, -32.4, -38.4, -43.0].forEach(function(lz, i){
    var pl = new THREE.PointLight(i === 3 ? 0x9cd8c2 : 0xcceaff, i === 3 ? 0.55 : 0.98, 10.5, 1.85);
    pl.position.set(12.0, 2.72, lz);
    scene.add(pl);
  });

  // Warm task light + shadow-casting spot at Nurses' Station
  var deskSpot = new THREE.SpotLight(0xffb868, 2.60, 12.0, 0.92, 0.65, 1.6);
  deskSpot.position.set(12.1, 2.75, -27.2);
  deskSpot.target.position.set(10.8, 0.2, -27.5);
  deskSpot.castShadow = true;
  deskSpot.shadow.mapSize.set(1024, 1024);
  deskSpot.shadow.bias = -0.0005;
  scene.add(deskSpot); scene.add(deskSpot.target);

  // Crisp shadow-casting spot above Gurney & Crash Cart
  var farSpot = new THREE.SpotLight(0xdaf0ff, 2.25, 13.0, 0.88, 0.6, 1.5);
  farSpot.position.set(11.9, 2.78, -37.2);
  farSpot.target.position.set(12.8, 0.0, -40.2);
  farSpot.castShadow = true;
  farSpot.shadow.mapSize.set(1024, 1024);
  farSpot.shadow.bias = -0.0005;
  scene.add(farSpot); scene.add(farSpot.target);

  // Cross-corridor cool doorway spill
  [[-16.0, 1.15], [-42.0, 1.05]].forEach(function(c){
    var cl = new THREE.PointLight(0xaad8f4, c[1], 10.5, 1.7);
    cl.position.set(7.6, 2.4, c[0]);
    scene.add(cl);
  });

  return { flags: [] };
};
