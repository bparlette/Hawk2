// PROMASTER 50 — Dual Photorealistic 3D Environments:
// 1. Sunlit Workshop Garage (Pegboard, Tool Chest, Sawhorses, Overhead Fixtures, PMREM Reflections)
// 2. 7 Biome-Reactive National/State Park Campsites (Day / Golden / Night + Milky Way + Aurora + Bears + Campfire + Birds)
// 3. Scenic Highway Drive Mode (animated asphalt, mileposts & roadside pines for Oregon Trail hops)
import * as THREE from '../three.module.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ================================================================
// 1. ATMOSPHERIC SKY DOME SHADER (DAY / GOLDEN / NIGHT + MILKY WAY + AURORA)
// ================================================================
const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform float uTime;
uniform float uNight;      // 0 = day, 1 = deep night
uniform float uGolden;     // 0..1 golden hour warmth
uniform float uAurora;     // 0..1 northern lights strength
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
varying vec3 vDir;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);

  // Day/Golden gradient blended cleanly into star-filled dark night
  vec3 dayCol = mix(uHorizon, uZenith, pow(h, 0.58));
  float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
  dayCol += mix(vec3(1.0, 0.92, 0.78), vec3(1.0, 0.56, 0.24), uGolden) * pow(sunCos, 10.0) * (0.45 + 0.45 * uGolden);
  dayCol += vec3(3.0, 2.7, 2.2) * smoothstep(0.9985, 0.9996, sunCos) * (1.0 - uNight);

  vec3 nightZenith = vec3(0.012, 0.024, 0.062);
  vec3 nightHorizon = vec3(0.032, 0.062, 0.115);
  vec3 nightCol = mix(nightHorizon, nightZenith, pow(h, 0.65));

  if (uNight > 0.05 && dir.y > 0.02) {
    // Milky Way diagonal dust & starlit core band
    float bandAxis = dir.x * 0.62 + dir.z * 0.48 - dir.y * 0.52;
    float mwBand = exp(-bandAxis * bandAxis * 16.0) * smoothstep(0.04, 0.32, dir.y);
    float mwCloud = fbm(vec2(dir.x * 3.8 + dir.z * 2.1, dir.y * 4.5));
    nightCol += mix(vec3(0.08, 0.14, 0.28), vec3(0.28, 0.36, 0.52), mwCloud) * mwBand * 0.85 * uNight;

    // Multi-tier twinkling starfield
    vec2 suv1 = dir.xz / (dir.y + 0.32) * 58.0;
    vec2 grid1 = floor(suv1);
    float h1 = hash21(grid1);
    if (h1 > 0.945) {
      vec2 sp = fract(suv1) - 0.5;
      float d = length(sp);
      float twinkle = 0.68 + 0.32 * sin(uTime * 3.5 + h1 * 90.0);
      nightCol += vec3(0.95, 0.98, 1.0) * smoothstep(0.24, 0.02, d) * twinkle * 1.45 * uNight;
    }

    vec2 suv2 = dir.xz / (dir.y + 0.42) * 120.0;
    float h2 = hash21(floor(suv2));
    if (h2 > 0.965) {
      float d2 = length(fract(suv2) - 0.5);
      nightCol += vec3(0.75, 0.88, 1.0) * smoothstep(0.22, 0.03, d2) * 0.75 * uNight;
    }

    // Northern Lights Aurora Borealis shimmer ribbon!
    if (uAurora > 0.01 && dir.y > 0.08) {
      float aWave = sin(dir.x * 5.2 + uTime * 0.38) * cos(dir.z * 3.8 - uTime * 0.24);
      float curtain = smoothstep(0.15, 0.85, fbm(vec2(dir.x * 2.6 + aWave * 0.45, dir.y * 1.1 - uTime * 0.06)));
      float heightFade = smoothstep(0.08, 0.36, dir.y) * smoothstep(0.92, 0.32, dir.y);
      vec3 aurCol = mix(vec3(0.10, 0.95, 0.58), vec3(0.55, 0.24, 0.92), clamp(dir.y * 1.4 - 0.2, 0.0, 1.0));
      nightCol += aurCol * curtain * heightFade * 1.35 * uAurora * uNight;
    }
  }

  // Soft sunlit cirrus/cumulus clouds in day/golden
  if (dir.y > 0.02 && uNight < 0.95) {
    vec2 cuv = dir.xz / (dir.y + 0.16) * 1.1 + vec2(uTime * 0.006, 0.0);
    float c = smoothstep(0.48, 0.82, fbm(cuv));
    vec3 cloudCol = mix(vec3(0.98, 0.99, 1.0), vec3(1.0, 0.68, 0.42), uGolden);
    dayCol = mix(dayCol, cloudCol, c * 0.60 * smoothstep(0.02, 0.20, dir.y));
  }

  gl_FragColor = vec4(mix(dayCol, nightCol, uNight), 1.0);
}
`;

export function createEnvironments(scene, renderer, bank) {
  // ---------- Shared Lighting ----------
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.3);
  sunLight.position.set(16, 22, 14);
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0xaad6ff, 0x3b444c, 0.88);
  scene.add(hemiLight);

  // Subtle PMREM environment for clearcoat ProMaster paint reflections
  let envRT = null;
  function refreshEnv(zenithHex, horizonHex, groundHex) {
    const es = new THREE.Scene();
    es.add(new THREE.HemisphereLight(zenithHex, groundHex, 1.4));
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(20, 16, 12),
      new THREE.MeshBasicMaterial({ color: horizonHex, side: THREE.BackSide })
    );
    es.add(dome);
    const gen = new THREE.PMREMGenerator(renderer);
    gen.compileCubemapShader();
    if (envRT) envRT.dispose();
    envRT = gen.fromScene(es, 0.04);
    scene.environment = envRT.texture;
    gen.dispose();
  }
  refreshEnv(0xcce4ff, 0xe8eff5, 0x5c6066);

  // ================================================================
  // ENVIRONMENT A: SUNLIT WORKSHOP GARAGE
  // ================================================================
  const garageGroup = new THREE.Group();
  garageGroup.name = 'workshop_garage';
  scene.add(garageGroup);

  const concreteMat = new THREE.MeshStandardMaterial({ map: bank.garageConcrete(8, 8), roughness: 0.48, metalness: 0.06 });
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), concreteMat);
  gFloor.rotation.x = -Math.PI / 2;
  garageGroup.add(gFloor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x8d959e, roughness: 0.85 });
  const wallBotMat = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.8 });
  const pegMat = new THREE.MeshStandardMaterial({ map: bank.pegboard(2, 1), roughness: 0.72 });
  const redChestMat = new THREE.MeshPhysicalMaterial({ color: 0xb81c1c, roughness: 0.28, clearcoat: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ map: bank.butcherBlock(1, 1), roughness: 0.6 });

  const gBox = (w, h, d, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    garageGroup.add(m);
    return m;
  };

  // Back & side workshop bay walls + safety yellow bay lines on floor
  gBox(16, 5.2, 0.25, wallMat, 0, 2.6, -7.2);
  gBox(16, 1.4, 0.28, wallBotMat, 0, 0.7, -7.18);
  gBox(0.25, 5.2, 16, wallMat, -7.2, 2.6, 0);
  gBox(0.28, 1.4, 16, wallBotMat, -7.18, 0.7, 0);
  gBox(0.25, 5.2, 16, wallMat, 7.2, 2.6, 0);
  gBox(0.28, 1.4, 16, wallBotMat, 7.18, 0.7, 0);

  // High sunlit clerestory windows on right wall + bright shop fluorescent strips overhead
  const brightWindowMat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
  for (const wz of [-3.5, 0, 3.5]) {
    gBox(0.08, 1.35, 2.6, brightWindowMat, 7.05, 3.6, wz);
    gBox(0.08, 1.35, 2.6, brightWindowMat, -7.05, 3.6, wz);
  }
  for (const lx of [-2.4, 2.4]) {
    gBox(0.28, 0.08, 5.2, brightWindowMat, lx, 4.95, 0);
  }
  // Workbench, pegboard, rolling red tool chest & sawhorses with cedar planks on back/left walls
  gBox(3.4, 0.92, 0.85, woodMat, -2.5, 0.46, -6.5);
  gBox(3.4, 1.45, 0.06, pegMat, -2.5, 1.65, -7.02);
  gBox(1.45, 1.15, 0.68, redChestMat, 1.8, 0.58, -6.45);
  // Birch/cedar lumber stack ready for build!
  gBox(0.85, 0.14, 2.6, woodMat, -5.8, 0.82, -2.2);
  gBox(0.85, 0.08, 2.6, woodMat, -5.8, 0.94, -2.2);
  // Yellow workshop safety lines around van bay
  const safetyMat = new THREE.MeshBasicMaterial({ color: 0xe6b822 });
  gBox(0.08, 0.005, 6.8, safetyMat, -1.55, 0.004, 0);
  gBox(0.08, 0.005, 6.8, safetyMat,  1.55, 0.004, 0);

  // ================================================================
  // ENVIRONMENT B: SKY DOME + 7 NATIONAL/STATE PARK BIOMES
  // ================================================================
  const skyGeo = new THREE.SphereGeometry(260, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uGolden: { value: 0 },
      uAurora: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.45, 0.55, 0.65).normalize() },
      uZenith: { value: new THREE.Color(0x1e6ec4) },
      uHorizon: { value: new THREE.Color(0xc5e4f5) },
    },
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  const campGroup = new THREE.Group();
  campGroup.name = 'park_campsite';
  campGroup.visible = false;
  scene.add(campGroup);

  // Campsite terrain disk (radial organic relief beyond central gravel pad!)
  const terrainGeo = new THREE.PlaneGeometry(240, 240, 64, 64);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainMat = new THREE.MeshStandardMaterial({ map: bank.terrainTex('alpine_bear'), roughness: 0.92 });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  campGroup.add(terrainMesh);

  // Distant mountain / mesa / cliff ring around the park horizon
  const ridgeGeo = new THREE.ConeGeometry(28, 36, 7);
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x4b5560, roughness: 0.92, flatShading: true });
  const ridges = new THREE.InstancedMesh(ridgeGeo, ridgeMat, 22);
  campGroup.add(ridges);

  // Water body (lake or ocean cove for forest_lake / coastal_cliff / tropical_palms)
  const lakeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f5c78, roughness: 0.14, metalness: 0.25, clearcoat: 1.0 });
  const lakeMesh = new THREE.Mesh(new THREE.CircleGeometry(65, 32), lakeMat);
  lakeMesh.rotation.x = -Math.PI / 2;
  lakeMesh.position.set(14, -0.35, -72);
  campGroup.add(lakeMesh);

  // Gravel campsite pull-in pad right under the van
  const padMat = new THREE.MeshStandardMaterial({ color: 0x7a766d, roughness: 0.96 });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(7.2, 24), padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.scale.set(1.15, 1.35, 1);
  pad.position.set(0.5, 0.015, -0.4);
  campGroup.add(pad);

  // Wooden Campground Picnic Table & Stately Park Wooden Post Sign (at x = +3.6)
  const picnicMat = new THREE.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.86 });
  const picnic = new THREE.Group();
  picnic.position.set(3.8, 0, -0.8);
  campGroup.add(picnic);
  const addC = (w, h, d, mat, parent, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  addC(1.1, 0.06, 2.0, picnicMat, picnic, 0, 0.74, 0);
  addC(0.32, 0.05, 2.0, picnicMat, picnic, -0.68, 0.44, 0);
  addC(0.32, 0.05, 2.0, picnicMat, picnic,  0.68, 0.44, 0);
  addC(1.3, 0.72, 0.12, picnicMat, picnic, 0, 0.36, -0.65);
  addC(1.3, 0.72, 0.12, picnicMat, picnic, 0, 0.36,  0.65);

  // National Park Bear-Proof Heavy Steel Food Locker (highlighted in bearCountry states!)
  const lockerMat = new THREE.MeshStandardMaterial({ color: 0x3b352c, roughness: 0.55, metalness: 0.65 });
  const bearBox = new THREE.Group();
  bearBox.position.set(4.5, 0, -3.2);
  campGroup.add(bearBox);
  addC(1.15, 0.92, 0.78, lockerMat, bearBox, 0, 0.46, 0);
  addC(1.18, 0.08, 0.82, lockerMat, bearBox, 0, 0.94, 0, 0.08, 0, 0);

  // Bear Lock Padlock Indicator Badge
  const bearBadgeMat = new THREE.MeshBasicMaterial({ color: 0xff9f1c });
  const bearBadge = addC(0.24, 0.16, 0.04, bearBadgeMat, bearBox, 0, 0.68, 0.40);

  // Animated Distant Black/Grizzly Bear in Bear Country States!
  const bearGroup = new THREE.Group();
  campGroup.add(bearGroup);
  const bearFurMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.95 });
  addC(0.75, 0.82, 1.45, bearFurMat, bearGroup, 0, 0.78, 0);
  addC(0.45, 0.42, 0.52, bearFurMat, bearGroup, 0, 0.92, 0.88); // head
  for (const [bx, bz] of [[-0.24, 0.48], [0.24, 0.48], [-0.24, -0.48], [0.24, -0.48]]) {
    addC(0.22, 0.55, 0.22, bearFurMat, bearGroup, bx, 0.28, bz);
  }
  bearGroup.position.set(-14, 0, -18);

  // Crackling 3D Campfire Ring + Logs + Animated Flames + Flickering Light
  const fireGroup = new THREE.Group();
  fireGroup.position.set(3.2, 0, 2.2);
  campGroup.add(fireGroup);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x62666b, roughness: 0.92 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneMat);
    st.position.set(Math.cos(a) * 0.62, 0.10, Math.sin(a) * 0.62);
    fireGroup.add(st);
  }
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3b2616, roughness: 0.9 });
  addC(0.12, 0.12, 0.82, logMat, fireGroup, 0, 0.12, 0, 0.15, 0.4, 0);
  addC(0.12, 0.12, 0.82, logMat, fireGroup, 0, 0.12, 0, -0.15, -0.8, 0);

  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: 0.88 });
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.02, 0.55 - i * 0.06, 6), flameMat);
    f.position.set((i - 1.5) * 0.08, 0.34, ((i % 2) - 0.5) * 0.08);
    fireGroup.add(f);
    flames.push(f);
  }
  const fireLight = new THREE.PointLight(0xff7b24, 5.5, 16, 1.8);
  fireLight.position.set(3.2, 0.75, 2.2);
  campGroup.add(fireLight);

  // Instanced Biome Trees & Boulders (fast single-batch rendering)
  const treeTrunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 3.2, 7);
  treeTrunkGeo.translate(0, 1.6, 0);
  const treeCanopyGeo = new THREE.ConeGeometry(2.1, 6.4, 8);
  treeCanopyGeo.translate(0, 5.2, 0);
  const trunkIMMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
  const canopyIMMat = new THREE.MeshStandardMaterial({ color: 0x24562a, roughness: 0.82, flatShading: true });
  const TREE_COUNT = 54;
  const trunkIM = new THREE.InstancedMesh(treeTrunkGeo, trunkIMMat, TREE_COUNT);
  const canopyIM = new THREE.InstancedMesh(treeCanopyGeo, canopyIMMat, TREE_COUNT);
  campGroup.add(trunkIM, canopyIM);

  const rockGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const rockIMMat = new THREE.MeshStandardMaterial({ color: 0x82654c, roughness: 0.92, flatShading: true });
  const rockIM = new THREE.InstancedMesh(rockGeo, rockIMMat, 28);
  campGroup.add(rockIM);

  // Animated 3D Birds soaring/perching around campsite for Bird-Watching!
  const birds = [];
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x2c4b75, roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const bg = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), birdMat);
    body.scale.set(0.7, 0.7, 1.5);
    bg.add(body);
    const wingL = addC(0.45, 0.03, 0.16, birdMat, bg, -0.22, 0.02, 0);
    const wingR = addC(0.45, 0.03, 0.16, birdMat, bg,  0.22, 0.02, 0);
    campGroup.add(bg);
    birds.push({ group: bg, wingL, wingR, rad: 9 + i * 3.5, h: 6.5 + (i % 3) * 2.5, speed: 0.35 + i * 0.06, phase: i * 1.1 });
  }

  // ================================================================
  // ENVIRONMENT C: SCENIC HIGHWAY DRIVE GROUP
  // ================================================================
  const driveGroup = new THREE.Group();
  driveGroup.name = 'highway_drive';
  driveGroup.visible = false;
  scene.add(driveGroup);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2d3138, roughness: 0.85 });
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 220), roadMat);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.position.y = 0.01;
  driveGroup.add(roadMesh);

  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe6b832 });
  const dashGeo = new THREE.BoxGeometry(0.18, 0.01, 3.2);
  const dashIM = new THREE.InstancedMesh(dashGeo, stripeMat, 24);
  driveGroup.add(dashIM);

  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x455233, roughness: 0.94 });
  const shL = new THREE.Mesh(new THREE.PlaneGeometry(80, 220), shoulderMat);
  shL.rotation.x = -Math.PI / 2; shL.position.set(-45, 0.0, 0);
  const shR = shL.clone(); shR.position.set(45, 0.0, 0);
  driveGroup.add(shL, shR);

  const passTrees = [];
  for (let i = 0; i < 24; i++) {
    const tg = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.0, 7), trunkIMMat);
    tr.position.y = 1.5;
    const cn = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5.5, 7), canopyIMMat);
    cn.position.y = 4.6;
    tg.add(tr, cn);
    tg.position.set((i % 2 === 0 ? -1 : 1) * (8.5 + (i % 4) * 3.5), 0, -90 + i * 8);
    driveGroup.add(tg);
    passTrees.push(tg);
  }

  // Biome Configuration Helper
  let currentEnv = 'garage'; // 'garage' | 'camp' | 'drive'
  let currentTimeMood = 'golden'; // 'day' | 'golden' | 'night'
  let currentBiome = 'alpine_bear';

  function rebuildBiome(biomeKey, hasBear = false, unlockedAurora = false) {
    currentBiome = biomeKey;
    const rng = mulberry32(biomeKey.length * 911 + 17);
    terrainMat.map = bank.terrainTex(biomeKey, 20, 20);
    terrainMat.needsUpdate = true;

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      let y = 0;
      if (r > 9) {
        const u = Math.min(1, (r - 9) / 38);
        const hScale = biomeKey === 'red_rock' ? 9.5 : (biomeKey === 'prairie_badlands' ? 4.2 : 6.8);
        y = (Math.sin(x * 0.07) * Math.cos(z * 0.07) * 0.5 + 0.5) * hScale * u;
        if (z < -26 && Math.abs(x - 14) < 34 && (biomeKey === 'forest_lake' || biomeKey === 'coastal_cliff' || biomeKey === 'tropical_palms')) {
          y = -1.8;
        }
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    terrainGeo.computeVertexNormals();

    lakeMesh.visible = biomeKey === 'forest_lake' || biomeKey === 'coastal_cliff' || biomeKey === 'tropical_palms';
    lakeMat.color.setHex(biomeKey === 'tropical_palms' ? 0x068899 : 0x0f5672);

    const ridgeCols = {
      alpine_bear: 0x4b5866,
      red_rock: 0xa64e32,
      coastal_cliff: 0x4b5c58,
      forest_lake: 0x3d5244,
      prairie_badlands: 0x997954,
      tropical_palms: 0x3b6e4c,
      tundra_aurora: 0x6f7e8a,
    };
    ridgeMat.color.setHex(ridgeCols[biomeKey] || 0x4b5866);
    canopyIMMat.color.setHex(
      biomeKey === 'red_rock' ? 0x5c6e44 :
      biomeKey === 'tropical_palms' ? 0x2d7a36 :
      biomeKey === 'tundra_aurora' ? 0x38584e : 0x24562a
    );
    rockIMMat.color.setHex(biomeKey === 'red_rock' ? 0xa95234 : (biomeKey === 'tundra_aurora' ? 0x727c85 : 0x6c6860));

    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const dist = 85 + rng() * 30;
      const sy = biomeKey === 'prairie_badlands' ? (0.45 + rng() * 0.45) : (0.85 + rng() * 1.1);
      P.set(Math.cos(a) * dist, 10 * sy, Math.sin(a) * dist);
      E.set(0, rng() * 6.28, 0);
      Q.setFromEuler(E);
      S.set(1 + rng() * 0.9, sy, 1 + rng() * 0.9);
      M.compose(P, Q, S);
      ridges.setMatrixAt(i, M);
    }
    ridges.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < TREE_COUNT; i++) {
      const a = rng() * Math.PI * 2;
      const dist = 10 + rng() * 56;
      const tx = Math.cos(a) * dist;
      const tz = Math.sin(a) * dist;
      const sc = biomeKey === 'red_rock' ? (0.35 + rng() * 0.35) : (0.7 + rng() * 0.75);
      P.set(tx, -0.1, tz);
      E.set(0, rng() * 6.28, 0);
      Q.setFromEuler(E);
      S.set(sc, sc, sc);
      M.compose(P, Q, S);
      trunkIM.setMatrixAt(i, M);
      canopyIM.setMatrixAt(i, M);
    }
    trunkIM.instanceMatrix.needsUpdate = true;
    canopyIM.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < 28; i++) {
      const a = rng() * Math.PI * 2;
      const dist = 9 + rng() * 44;
      const sc = 0.7 + rng() * 1.8;
      P.set(Math.cos(a) * dist, 0.2, Math.sin(a) * dist);
      E.set(rng(), rng() * 6.28, rng());
      Q.setFromEuler(E);
      S.set(sc * 1.3, sc * 0.75, sc);
      M.compose(P, Q, S);
      rockIM.setMatrixAt(i, M);
    }
    rockIM.instanceMatrix.needsUpdate = true;

    bearGroup.visible = hasBear;
    bearBadge.visible = hasBear;
    skyMat.uniforms.uAurora.value = (unlockedAurora || biomeKey === 'tundra_aurora') ? 1.0 : 0.0;
  }

  function applyTimeMood(mood) {
    currentTimeMood = mood;
    if (currentEnv === 'garage') {
      skyMat.uniforms.uNight.value = 0;
      skyMat.uniforms.uGolden.value = 0;
      skyMat.uniforms.uZenith.value.setHex(0x88b4d8);
      skyMat.uniforms.uHorizon.value.setHex(0xeaf2f8);
      sunLight.color.setHex(0xfff8ee);
      sunLight.intensity = 2.4;
      sunLight.position.set(12, 20, 14);
      hemiLight.color.setHex(0xdcebff);
      hemiLight.groundColor.setHex(0x52575e);
      hemiLight.intensity = 1.15;
      renderer.toneMappingExposure = 1.05;
      return;
    }

    if (mood === 'night') {
      skyMat.uniforms.uNight.value = 1.0;
      skyMat.uniforms.uGolden.value = 0.0;
      sunLight.color.setHex(0x8bb6ff);
      sunLight.intensity = 0.52;
      sunLight.position.set(-18, 26, -14);
      hemiLight.color.setHex(0x28436b);
      hemiLight.groundColor.setHex(0x091118);
      hemiLight.intensity = 0.45;
      renderer.toneMappingExposure = 1.18;
    } else if (mood === 'golden') {
      skyMat.uniforms.uNight.value = 0.0;
      skyMat.uniforms.uGolden.value = 1.0;
      skyMat.uniforms.uZenith.value.setHex(0x1f497d);
      skyMat.uniforms.uHorizon.value.setHex(0xffb878);
      skyMat.uniforms.uSunDir.value.set(-0.55, 0.19, -0.82).normalize();
      sunLight.color.setHex(0xffbd75);
      sunLight.intensity = 2.6;
      sunLight.position.set(-22, 8.5, -30);
      hemiLight.color.setHex(0xffcfa0);
      hemiLight.groundColor.setHex(0x2e2a24);
      hemiLight.intensity = 0.85;
      renderer.toneMappingExposure = 1.08;
    } else {
      skyMat.uniforms.uNight.value = 0.0;
      skyMat.uniforms.uGolden.value = 0.0;
      skyMat.uniforms.uZenith.value.setHex(0x1762b8);
      skyMat.uniforms.uHorizon.value.setHex(0xbfe4f7);
      skyMat.uniforms.uSunDir.value.set(0.42, 0.68, 0.58).normalize();
      sunLight.color.setHex(0xfff7e6);
      sunLight.intensity = 2.5;
      sunLight.position.set(18, 28, 22);
      hemiLight.color.setHex(0xadd9ff);
      hemiLight.groundColor.setHex(0x3a473a);
      hemiLight.intensity = 0.95;
      renderer.toneMappingExposure = 1.04;
    }
  }

  function setMode(mode, timeMood = currentTimeMood) {
    currentEnv = mode;
    garageGroup.visible = mode === 'garage';
    campGroup.visible = mode === 'camp';
    driveGroup.visible = mode === 'drive';
    applyTimeMood(timeMood);
  }

  const _M = new THREE.Matrix4();
  let driveOffset = 0;

  function update(t, dt, van, installedCount = 0) {
    skyMat.uniforms.uTime.value = t;
    if (currentEnv === 'camp') {
      // Animate flickering 3D campfire
      const flick = 0.85 + 0.30 * Math.sin(t * 14.0) * Math.cos(t * 9.3);
      fireLight.intensity = (currentTimeMood === 'night' ? 8.5 : 4.2) * flick;
      flames.forEach((f, i) => {
        const s = 0.78 + 0.32 * Math.sin(t * (11 + i * 2.5) + i);
        f.scale.set(1, s, 1);
      });
      // Animate patrolling bear in background if bearCountry
      if (bearGroup.visible) {
        const ang = t * 0.14;
        bearGroup.position.set(-14 + Math.cos(ang) * 4.5, 0, -18 + Math.sin(ang) * 4.5);
        bearGroup.rotation.y = -ang;
      }
      // Animate park birds
      for (const b of birds) {
        const a = t * b.speed + b.phase;
        b.group.position.set(Math.cos(a) * b.rad, b.h + Math.sin(a * 2) * 1.1, Math.sin(a) * b.rad - 6);
        b.group.rotation.y = -a;
        const flap = Math.sin(t * 8.5 + b.phase) * 0.42;
        b.wingL.rotation.z = flap;
        b.wingR.rotation.z = -flap;
      }
      // Illuminate van interior warm LED pucks at dusk/night!
      van.setInteriorGlow(currentTimeMood === 'night' || currentTimeMood === 'golden');
    } else if (currentEnv === 'drive') {
      driveOffset = (driveOffset + dt * 28.0) % 10.0;
      for (let i = 0; i < 24; i++) {
        const dz = ((i * 9.2 + driveOffset) % 210) - 105;
        _M.makeTranslation(0, 0.015, dz);
        dashIM.setMatrixAt(i, _M);
      }
      dashIM.instanceMatrix.needsUpdate = true;
      for (const tr of passTrees) {
        tr.position.z -= dt * 28.0;
        if (tr.position.z < -95) tr.position.z += 190;
      }
      van.spinWheels(dt * 28.0);
      van.setInteriorGlow(false);
    } else {
      van.setInteriorGlow(installedCount > 0);
    }
  }

  return {
    setMode,
    applyTimeMood,
    rebuildBiome,
    update,
    setBearBoxGlow: (safe) => {
      bearBadgeMat.color.setHex(safe ? 0x2ecc71 : 0xff4d3b);
    },
  };
}
