// Dead Hall — Neon Phase 2: 12-Room Set-Dressing, Lighting Moods & Fake-Out Staging Variants
// Matches games/dead-hall/tasking/refs/REFS.md compositions without touching combat, walk,
// camera, or locked flicker cadence (rooms 1 & 11). Uses InstancedMesh to keep draw calls lean.
import * as THREE from '../../three.module.js';
import { createNeonTextureBank } from './textures.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

function makeGlowTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.34)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeInstancedBoxes(specs, mat, parent) {
  const im = new THREE.InstancedMesh(UNIT_BOX, mat, specs.length);
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const P = new THREE.Vector3();
  const S = new THREE.Vector3();
  specs.forEach((s, i) => {
    P.set(s.x, s.y, s.z);
    E.set(s.rx || 0, s.ry || 0, s.rz || 0);
    Q.setFromEuler(E);
    S.set(s.w, s.h, s.d);
    M.compose(P, Q, S);
    im.setMatrixAt(i, M);
  });
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

function makeInstancedCyls(specs, mat, parent) {
  const im = new THREE.InstancedMesh(UNIT_CYL, mat, specs.length);
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const E = new THREE.Euler();
  const P = new THREE.Vector3();
  const S = new THREE.Vector3();
  specs.forEach((s, i) => {
    P.set(s.x, s.y, s.z);
    E.set(s.rx || 0, s.ry || 0, s.rz || 0);
    Q.setFromEuler(E);
    S.set(s.r * 2, s.h, s.r * 2);
    M.compose(P, Q, S);
    im.setMatrixAt(i, M);
  });
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

function addPlane(w, h, mat, x, y, z, rx, ry, parent) {
  const m = new THREE.Mesh(UNIT_PLANE, mat);
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  parent.add(m);
  return m;
}

// ================================================================
// MAIN ROOMS & ATMOSPHERE PASS (all 12 rooms + 3 fake-out variants)
// ================================================================
export function applyNeonRoomsPass(scene, refs = {}) {
  const bank = createNeonTextureBank();
  const root = new THREE.Group();
  root.name = 'neon_rooms_pass';
  scene.add(root);

  const glowTex = makeGlowTex();
  const darkWoodMat = bank.roomWall('splinterTimber', 1, 1);
  const darkMetalMat = bank.getMat('neonDarkMetal', () => new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.52, metalness: 0.65 }));
  const brassMat = bank.getMat('neonBrass', () => new THREE.MeshStandardMaterial({ color: 0xb6954c, roughness: 0.35, metalness: 0.82 }));
  const blackVoidMat = bank.getMat('neonVoid', () => new THREE.MeshBasicMaterial({ color: 0x020203 }));
  const frostedGreenMat = bank.getMat('frostedExitGlass', () => new THREE.MeshBasicMaterial({
    color: 0x6dff98, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const warmBackGlowMat = bank.getMat('warmDoorGlow', () => new THREE.MeshBasicMaterial({
    color: 0xffc67a, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const alarmRedGlowMat = bank.getMat('alarmRedGlow', () => new THREE.MeshBasicMaterial({
    color: 0xff3b1f, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));

  const addGlow = (col, scale, x, y, z, opacity = 0.42, parent = root) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: col, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    s.scale.set(scale, scale, 1);
    s.position.set(x, y, z);
    parent.add(s);
    return s;
  };

  // ----------------------------------------------------------------
  // ROOM 1 — Hallway Twins (01.jpg): Symmetrical hotel corridor rhythm
  // Corridor B: x in [-30.5..-16], z = -44, twins at (-28.85, -44.62/-43.42)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_01_twins'; root.add(g);
    // Center hotel carpet runner leading straight to the twins
    addPlane(16.0, 2.0, bank.roomWall('dampCarpet', 6, 1), -23.2, 0.008, -44, -Math.PI / 2, 0, g);
    // Symmetrical repeating hotel doorframes + wainscoting on both N & S walls (1 InstancedMesh!)
    const trimBoxes = [];
    for (const dx of [-22.6, -26.2, -29.2]) {
      for (const sz of [-42.34, -45.66]) {
        trimBoxes.push({ x: dx, y: 1.15, z: sz, w: 1.15, h: 2.3, d: 0.06 }); // door slab recess
        trimBoxes.push({ x: dx, y: 2.32, z: sz, w: 1.30, h: 0.10, d: 0.10 }); // lintel trim
      }
    }
    // Symmetrical ceiling pendant stems down the vanishing point
    for (const px of [-20.0, -24.2, -28.0]) {
      trimBoxes.push({ x: px, y: 3.12, z: -44, w: 0.04, h: 0.36, d: 0.04 });
    }
    makeInstancedBoxes(trimBoxes, darkWoodMat, g);
    // Flat, even ceiling-pendant globes (1 InstancedMesh) + flat corridor fill light
    const globeMat = bank.getMat('pendantGlobe', () => new THREE.MeshBasicMaterial({ color: 0xffebc6 }));
    makeInstancedCyls([
      { x: -20.0, y: 2.90, z: -44, r: 0.11, h: 0.12 },
      { x: -24.2, y: 2.90, z: -44, r: 0.11, h: 0.12 },
      { x: -28.0, y: 2.90, z: -44, r: 0.11, h: 0.12 },
    ], globeMat, g);
  }

  // ----------------------------------------------------------------
  // ROOM 2 — Doorway Woman (02.jpg): Domestic hall, dark doorway behind her,
  // clutter strictly at frame edges (sideboard + frames)
  // R1 side room: x in [1.8..6.5], z in [-17.6..-11.4], woman at (2.45, -14.5)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_02_doorway_woman'; root.add(g);
    // Peeling domestic plaster overlay on R1 far wall + black open doorway behind her
    addPlane(6.2, 3.2, bank.roomWall('peelingPlaster', 2, 1), 6.38, 1.6, -14.5, 0, -Math.PI / 2, g);
    addPlane(1.35, 2.35, blackVoidMat, 6.34, 1.18, -14.5, 0, -Math.PI / 2, g);
    // Edge-only domestic clutter: doorway jamb + sideboard on south edge + crooked picture frames (1 InstancedMesh)
    makeInstancedBoxes([
      { x: 6.32, y: 1.20, z: -15.22, w: 0.12, h: 2.40, d: 0.12 }, // inner jamb L
      { x: 6.32, y: 1.20, z: -13.78, w: 0.12, h: 2.40, d: 0.12 }, // inner jamb R
      { x: 6.32, y: 2.40, z: -14.50, w: 0.12, h: 0.12, d: 1.56 }, // inner lintel
      { x: 3.9,  y: 0.44, z: -11.78, w: 1.65, h: 0.88, d: 0.52 }, // edge sideboard (south wall)
      { x: 4.1,  y: 1.72, z: -11.54, w: 0.68, h: 0.52, d: 0.04, rz: 0.09 }, // crooked picture frame S
      { x: 3.8,  y: 1.68, z: -17.46, w: 0.58, h: 0.72, d: 0.04, rz: -0.07 }, // crooked picture frame N
    ], darkWoodMat, g);
  }

  // ----------------------------------------------------------------
  // ROOM 3 — EXIT-Sign Silhouette (03.jpg): Frosted double doors backlit sickly green
  // + red-orange wall spill under EXIT sign at Corridor A end (x=0.1, z=-44.18)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_03_exit_charge'; root.add(g);
    // Charred concrete accent behind A-end + frosted backlit double-door glass
    addPlane(2.2, 2.35, frostedGreenMat, 0.1, 1.22, -44.14, 0, 0, g);
    // Double-door mullions + horizontal panic push-bars (1 InstancedMesh)
    makeInstancedBoxes([
      { x: 0.1,  y: 1.22, z: -44.12, w: 0.08, h: 2.42, d: 0.08 }, // center mullion
      { x: -1.0, y: 1.22, z: -44.12, w: 0.10, h: 2.42, d: 0.10 }, // left jamb
      { x: 1.2,  y: 1.22, z: -44.12, w: 0.10, h: 2.42, d: 0.10 }, // right jamb
      { x: 0.1,  y: 2.44, z: -44.12, w: 2.30, h: 0.10, d: 0.10 }, // transom
      { x: -0.45, y: 1.02, z: -44.06, w: 0.88, h: 0.07, d: 0.08 }, // left push bar
      { x: 0.65,  y: 1.02, z: -44.06, w: 0.88, h: 0.07, d: 0.08 }, // right push bar
    ], darkMetalMat, g);
    // Sickly green backlight + warm red-orange EXIT wall glow
    addGlow(0x6dff98, 3.6, 0.1, 1.35, -43.92, 0.34, g);
    addGlow(0xff5226, 2.2, 0.1, 2.66, -43.95, 0.38, g);
  }

  // ----------------------------------------------------------------
  // ROOM 4 — Night-Vision Crawler (04.jpg): Institutional clinical tile walls/floor
  // R2: x in [1.8..6.3], z in [-38.7..-34.9]
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_04_nightvision'; root.add(g);
    const tileMat = bank.roomWall('nvClinicalTile', 2, 1);
    addPlane(3.6, 3.2, tileMat, 6.18, 1.6, -36.8, 0, -Math.PI / 2, g); // far wall
    addPlane(4.4, 3.5, bank.roomWall('nvClinicalTile', 2, 2), 4.0, 0.01, -36.8, -Math.PI / 2, 0, g); // floor
    // Overturned institutional utility cart tucked to north edge (clear of crawler path)
    makeInstancedBoxes([
      { x: 4.3, y: 0.32, z: -38.35, w: 1.15, h: 0.62, d: 0.06, rx: 0.25 },
      { x: 4.3, y: 0.12, z: -38.10, w: 1.15, h: 0.06, d: 0.55 },
    ], darkMetalMat, g);
  }

  // ----------------------------------------------------------------
  // ROOM 5 — Corner Figure (05.jpg): Bare mold-stained stone corner walls
  // R3: x in [-13.6..-9.6], z in [-50.6..-45.8], cornerFig at (-12.95, -50.15)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_05_corner'; root.add(g);
    const moldMat = bank.roomWall('moldDrywall', 2, 1);
    // Bare corner wall faces (left of frame stays stark empty stone per 05.jpg)
    addPlane(4.6, 3.2, moldMat, -13.48, 1.6, -48.2, 0, Math.PI / 2, g);
    addPlane(3.9, 3.2, moldMat, -11.6, 1.6, -50.48, 0, 0, g);
    // Cast-shadow decal pressed into the corner directly in front of cornerFig
    const shadMat = bank.getMat('cornerShadow', () => new THREE.MeshBasicMaterial({
      color: 0x050506, transparent: true, opacity: 0.58, depthWrite: false,
    }));
    addPlane(0.62, 1.78, shadMat, -13.44, 0.92, -50.15, 0, Math.PI / 2, g);
  }

  // ----------------------------------------------------------------
  // ROOM 6 — Floor Hatch (06.jpg): Circular/rimmed stone-and-iron floor opening,
  // cold blue overhead pool, pure black shaft
  // Hatch at (-24.8, 0, -44)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_06_hatch'; root.add(g);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.11, 8, 20),
      bank.roomWall('rustHatchMetal', 3, 1),
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(-24.8, 0.08, -44);
    g.add(collar);
    // Deep black circular well mouth
    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), blackVoidMat);
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(-24.8, 0.035, -44);
    g.add(pit);
    // Cold blue overhead pool illuminating the rim & emerging hair/claws (06.jpg)
    const bluePool = new THREE.PointLight(0x7fb4ff, 11, 6.5, 2);
    bluePool.position.set(-24.8, 2.35, -44);
    g.add(bluePool);
    addGlow(0x88bcff, 2.1, -24.8, 2.55, -44, 0.34, g);
  }

  // ----------------------------------------------------------------
  // ROOM 7 — Broken Mascot Sprint (07.jpg): Checkered B&W linoleum hall,
  // far doorway frame + single overhead hanging lamp above the mascot
  // Corridor D: x in [-30..-3], z = -73.2, mascot starts at (-6.6, -73.2)
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_07_mascot'; root.add(g);
    // Checkered scuffed linoleum floor runner along Corridor D
    addPlane(27.0, 3.38, bank.roomWall('scuffedLinoleum', 10, 1.5), -16.8, 0.009, -73.2, -Math.PI / 2, 0, g);
    // Framed archway & single hanging lamp right over the mascot's start spot (-6.6, -73.2)
    makeInstancedBoxes([
      { x: -6.1, y: 1.65, z: -71.56, w: 0.24, h: 3.3, d: 0.32 }, // arch pillar N
      { x: -6.1, y: 1.65, z: -74.84, w: 0.24, h: 3.3, d: 0.32 }, // arch pillar S
      { x: -6.1, y: 3.05, z: -73.20, w: 0.24, h: 0.5, d: 3.55 }, // arch header
      { x: -6.6, y: 2.98, z: -73.20, w: 0.03, h: 0.62, d: 0.03 }, // lamp cord
    ], darkMetalMat, g);
    const mascotSpot = new THREE.PointLight(0xffd28e, 18, 9.5, 2);
    mascotSpot.position.set(-6.6, 2.55, -73.2);
    g.add(mascotSpot);
    addGlow(0xffcf82, 1.8, -6.6, 2.65, -73.2, 0.44, g);
  }

  // ----------------------------------------------------------------
  // ROOM 8 — Doorway Void / Two Pale Eyes (08.jpg): Splintered jamb +
  // industrial DOOR/LIGHT control panel at frame left as scale anchor
  // Cellar doorway: x = -28.32, z = -51
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_08_doorway_eyes'; root.add(g);
    // Heavy splintered timber doorframe + industrial DOOR/LIGHT panel at frame left (z=-50.02)
    makeInstancedBoxes([
      { x: -28.36, y: 1.20, z: -50.14, w: 0.14, h: 2.40, d: 0.14 }, // left jamb
      { x: -28.36, y: 1.20, z: -51.86, w: 0.14, h: 2.40, d: 0.14 }, // right jamb
      { x: -28.36, y: 2.40, z: -51.00, w: 0.14, h: 0.14, d: 1.86 }, // lintel
      { x: -28.44, y: 1.38, z: -49.82, w: 0.08, h: 0.36, d: 0.22 }, // DOOR/LIGHT control box
    ], darkMetalMat, g);
    // Glowing red DOOR button + pale white LIGHT button on control box
    const redBtnMat = bank.getMat('doorBtnRed', () => new THREE.MeshBasicMaterial({ color: 0xff3224 }));
    const whtBtnMat = bank.getMat('doorBtnWht', () => new THREE.MeshBasicMaterial({ color: 0xdceeff }));
    const b1 = new THREE.Mesh(UNIT_BOX, redBtnMat); b1.scale.set(0.03, 0.065, 0.08); b1.position.set(-28.49, 1.46, -49.82); g.add(b1);
    const b2 = new THREE.Mesh(UNIT_BOX, whtBtnMat); b2.scale.set(0.03, 0.065, 0.08); b2.position.set(-28.49, 1.32, -49.82); g.add(b2);
    // Cold threshold rim light
    const rim = new THREE.PointLight(0x9ec4e8, 5.5, 4.5, 2);
    rim.position.set(-28.15, 1.85, -51.0);
    g.add(rim);
  }

  // ----------------------------------------------------------------
  // ROOM 9 — Ceiling-Scraping Tall Figure (09.jpg): Tall backlit doorway glow
  // behind figure rimming its limbs + pooling on the floor between its feet
  // R4 tall room: x in [-38.6..-32.0], z in [-61.3..-56.7], H = 5.0
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_09_tall'; root.add(g);
    addPlane(4.4, 5.0, bank.roomWall('tallIndustrialWall', 2, 2), -38.48, 2.5, -59, 0, Math.PI / 2, g);
    // Tall backlit doorway portal right behind tallFig (-38.42, -59)
    addPlane(1.75, 3.65, warmBackGlowMat, -38.40, 1.85, -59, 0, Math.PI / 2, g);
    // Warm floor spill pooling between its wide-planted feet
    addPlane(3.2, 1.8, warmBackGlowMat, -36.8, 0.014, -59, -Math.PI / 2, 0, g);
    const backRim = new THREE.PointLight(0xffb464, 18, 10, 2);
    backRim.position.set(-38.0, 2.2, -59);
    g.add(backRim);
    addGlow(0xffb868, 3.8, -38.1, 2.1, -59, 0.45, g);
  }

  // ----------------------------------------------------------------
  // ROOM 10 — Eye-Wall Chase (10.jpg): Alarm-red corridor mood, black tendril
  // arms reaching from walls (1 InstancedMesh), bright hazard glow at far EXIT
  // Activates dynamically during chase so Room 7 mascot stays clean!
  // ----------------------------------------------------------------
  const chaseMood = { lights: [], tendrils: null, hazardGlow: null };
  {
    const g = new THREE.Group(); g.name = 'room_10_eye_chase'; root.add(g);
    // Alarm-red pulse lights along Corridor D (intensity = 0 until chase)
    for (const cx of [-24, -15.5, -7.5]) {
      const rl = new THREE.PointLight(0xff2218, 0, 13, 2);
      rl.position.set(cx, 2.75, -73.2);
      g.add(rl);
      chaseMood.lights.push(rl);
    }
    // 18 black tendril arms reaching out of N/S corridor walls (1 InstancedMesh)
    const tendrilSpecs = [];
    for (let i = 0; i < 18; i++) {
      const north = i % 2 === 0;
      const tx = -27.5 + i * 1.25;
      const ty = 0.85 + ((i * 37) % 14) * 0.12;
      tendrilSpecs.push({
        x: tx,
        y: ty,
        z: north ? -71.82 : -74.58,
        r: 0.048,
        h: 0.92,
        rx: north ? 1.22 : -1.22,
        rz: ((i % 3) - 1) * 0.28,
      });
    }
    chaseMood.tendrils = makeInstancedCyls(tendrilSpecs, blackVoidMat, g);
    chaseMood.tendrils.visible = false;
    // Bright fire/hazard glow at the far EXIT end (-3.5, -73.2)
    chaseMood.hazardGlow = addGlow(0xff6b24, 4.2, -3.6, 1.55, -73.2, 0.0, g);
    addPlane(3.2, 3.0, alarmRedGlowMat, -3.26, 1.5, -73.2, 0, Math.PI / 2, g);
  }

  // ----------------------------------------------------------------
  // ROOM 11 — Spring-Necked Mannequin (11.jpg): Cracked plaster back wall,
  // flat study-like framing (flicker timing in index.html is LOCKED & untouched)
  // R5 storage room: x in [-21.9..-16.3], z in [-51.6..-45.8]
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_11_mannequin'; root.add(g);
    addPlane(5.6, 3.2, bank.roomWall('crackedStoragePlaster', 2, 1), -19.1, 1.6, -51.48, 0, 0, g);
    // Subtle overhead study rim + storage floor tape lines marking the center aisle
    const tapeMat = bank.getMat('aisleTape', () => new THREE.MeshBasicMaterial({ color: 0xb89e48, transparent: true, opacity: 0.55 }));
    makeInstancedBoxes([
      { x: -20.25, y: 0.008, z: -48.6, w: 0.06, h: 0.005, d: 5.2 },
      { x: -17.95, y: 0.008, z: -48.6, w: 0.06, h: 0.005, d: 5.2 },
    ], tapeMat, g);
  }

  // ----------------------------------------------------------------
  // ROOM 12 — The Yellow Room (12.jpg): Mono-yellow wallpaper, damp carpet,
  // acoustic drop-tile ceiling, liminal repeating pillars, flat shadowless light,
  // EMPTY — NO MONSTER.
  // Corridor C yellow stretch: x in [-32.0..-28.4], z in [-71.0..-61.5]
  // ----------------------------------------------------------------
  {
    const g = new THREE.Group(); g.name = 'room_12_yellow'; root.add(g);
    const yWall = bank.roomWall('yellowWallpaper', 3, 1);
    const yCeil = bank.roomWall('acousticCeiling', 2, 6);
    const yCarp = bank.roomWall('dampCarpet', 2, 6);
    // Upgrade yellow stretch surfaces to crisp Backrooms mono-yellow variants
    addPlane(9.6, 3.28, yWall, -31.88, 1.64, -66.2, 0, Math.PI / 2, g);
    addPlane(9.6, 3.28, yWall, -28.52, 1.64, -66.2, 0, -Math.PI / 2, g);
    addPlane(3.38, 9.6, yCeil, -30.2, 3.28, -66.2, Math.PI / 2, 0, g);
    addPlane(3.38, 9.6, yCarp, -30.2, 0.011, -66.2, -Math.PI / 2, 0, g);
    // Repeating liminal yellow partition pilasters along both walls (1 InstancedMesh)
    const pillars = [];
    for (const pz of [-62.5, -65.0, -67.5, -70.0]) {
      pillars.push({ x: -31.72, y: 1.65, z: pz, w: 0.34, h: 3.3, d: 0.36 });
      pillars.push({ x: -28.68, y: 1.65, z: pz, w: 0.34, h: 3.3, d: 0.36 });
    }
    makeInstancedBoxes(pillars, yWall, g);
    // Flat, even fluorescent fill at both ends of the stretch (eliminates harsh shadows per 12.jpg)
    const yFillN = new THREE.PointLight(0xf6e6a6, 12, 11, 1.6); yFillN.position.set(-30.2, 2.95, -63.0); g.add(yFillN);
    const yFillS = new THREE.PointLight(0xf6e6a6, 12, 11, 1.6); yFillS.position.set(-30.2, 2.95, -69.5); g.add(yFillS);
  }

  // ----------------------------------------------------------------
  // 3 FAKE-OUT STAGING VARIANTS (slot into existing non-lethal beats)
  // ----------------------------------------------------------------
  const fakeouts = {
    // 1. Falling object: rusted conduit pipe + toolbox clattering down in Corridor A (z=-20)
    falling_pipes: (() => {
      const grp = new THREE.Group();
      grp.position.set(-1.15, 2.85, -19.8);
      root.add(grp);
      const pipe = new THREE.Mesh(UNIT_CYL, darkMetalMat);
      pipe.scale.set(0.08, 1.45, 0.08);
      pipe.rotation.z = Math.PI / 2;
      grp.add(pipe);
      const box = new THREE.Mesh(UNIT_BOX, bank.roomWall('rustHatchMetal', 1, 1));
      box.scale.set(0.42, 0.24, 0.26);
      box.position.set(0.18, 0.14, 0);
      grp.add(box);
      const puff = addGlow(0x9a9080, 1.9, -1.15, 0.35, -19.8, 0.0, root);
      return { grp, puff, t: -1, triggered: false };
    })(),

    // 2. Second-look silhouette: distant figure glimpsed down Corridor A (-29.5) -> gone on blink
    second_look_silhouette: (() => {
      const grp = new THREE.Group();
      grp.position.set(0.0, 0, -29.5);
      grp.visible = false;
      root.add(grp);
      const body = new THREE.Mesh(UNIT_BOX, blackVoidMat);
      body.scale.set(0.42, 1.42, 0.20);
      body.position.y = 0.88;
      grp.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), blackVoidMat);
      head.position.y = 1.72;
      grp.add(head);
      const rim = addGlow(0x9cb8d4, 1.4, 0, 1.45, 0.15, 0.32, grp);
      return { grp, rim, t: -1, triggered: false };
    })(),

    // 3. Sound with an empty room: swinging bare bulb + rattling door at Corridor C entrance (-28.6, -47.5)
    empty_room_knock: (() => {
      const grp = new THREE.Group();
      grp.position.set(-30.2, 3.25, -47.5);
      root.add(grp);
      const cord = new THREE.Mesh(UNIT_CYL, darkMetalMat);
      cord.scale.set(0.02, 0.65, 0.02);
      cord.position.y = -0.32;
      grp.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe4b5 }));
      bulb.position.y = -0.66;
      grp.add(bulb);
      const li = new THREE.PointLight(0xffcf88, 6, 6.5, 2);
      li.position.y = -0.72;
      grp.add(li);
      return { grp, li, t: -1, triggered: false };
    })(),
  };

  function triggerFakeout(name) {
    const f = fakeouts[name];
    if (!f) return false;
    f.t = 0;
    f.triggered = true;
    if (name === 'second_look_silhouette') f.grp.visible = true;
    return true;
  }

  function reset() {
    fakeouts.falling_pipes.t = -1;
    fakeouts.falling_pipes.triggered = false;
    fakeouts.falling_pipes.grp.position.set(-1.15, 2.85, -19.8);
    fakeouts.falling_pipes.grp.rotation.set(0, 0, 0);
    fakeouts.falling_pipes.puff.material.opacity = 0;

    fakeouts.second_look_silhouette.t = -1;
    fakeouts.second_look_silhouette.triggered = false;
    fakeouts.second_look_silhouette.grp.visible = false;

    fakeouts.empty_room_knock.t = -1;
    fakeouts.empty_room_knock.triggered = false;
    fakeouts.empty_room_knock.grp.rotation.set(0, 0, 0);

    for (const rl of chaseMood.lights) rl.intensity = 0;
    if (chaseMood.tendrils) chaseMood.tendrils.visible = false;
    if (chaseMood.hazardGlow) chaseMood.hazardGlow.material.opacity = 0;
    alarmRedGlowMat.opacity = 0;
  }

  function update(G, dt = 1 / 30) {
    const t = G?.t || 0;
    const st = G?.state || 'walk';
    const d = G?.d || 0;

    // Room 10 chase alarm-red mood + reaching wall tendrils (ONLY active during chase!)
    const inChase = st === 'chase';
    if (chaseMood.tendrils) chaseMood.tendrils.visible = inChase;
    const pulse = inChase ? (0.55 + 0.45 * Math.sin(t * 7.5)) : 0;
    for (let i = 0; i < chaseMood.lights.length; i++) {
      chaseMood.lights[i].intensity = inChase ? (14 + 10 * Math.sin(t * 7.5 + i * 1.4)) : 0;
    }
    if (chaseMood.hazardGlow) chaseMood.hazardGlow.material.opacity = inChase ? 0.65 * pulse : 0;
    alarmRedGlowMat.opacity = inChase ? 0.24 * pulse : 0;

    // Auto-trigger subtle ambient fake-outs at quiet corridor stretches (zero combat impact)
    if (!fakeouts.falling_pipes.triggered && d >= 18.2 && d <= 20.5) triggerFakeout('falling_pipes');
    if (!fakeouts.second_look_silhouette.triggered && d >= 21.5 && d <= 23.5) triggerFakeout('second_look_silhouette');
    if (!fakeouts.empty_room_knock.triggered && d >= 78.5 && d <= 81.0) triggerFakeout('empty_room_knock');

    // Animate active fake-outs
    const fp = fakeouts.falling_pipes;
    if (fp.t >= 0) {
      fp.t += dt;
      const u = Math.min(1, fp.t / 0.42);
      fp.grp.position.y = 2.85 - (2.85 - 0.14) * u * u;
      fp.grp.rotation.x = u * 0.45;
      fp.grp.rotation.z = u * 0.25;
      fp.puff.material.opacity = fp.t > 0.36 ? Math.max(0, 0.45 * (1 - (fp.t - 0.36) / 1.1)) : 0;
    }

    const sl = fakeouts.second_look_silhouette;
    if (sl.t >= 0) {
      sl.t += dt;
      // Glimpsed for 0.65s then vanishes completely on the second look
      sl.grp.visible = sl.t < 0.65;
    }

    const ek = fakeouts.empty_room_knock;
    if (ek.t >= 0) {
      ek.t += dt;
      const damp = Math.exp(-ek.t * 0.7);
      ek.grp.rotation.z = Math.sin(ek.t * 5.2) * 0.38 * damp;
      ek.li.intensity = 6 + Math.sin(ek.t * 14) * 2 * damp;
    }
  }

  return {
    root,
    bank,
    triggerFakeout,
    reset,
    update,
    fakeoutNames: Object.keys(fakeouts),
  };
}
