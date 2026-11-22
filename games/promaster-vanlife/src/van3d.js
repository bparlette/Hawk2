// PROMASTER 50 — Accurate 3D Ram ProMaster 3500 High Roof 159" Wheelbase & 26 Lego-Snap Parts
import * as THREE from '../three.module.js';
import { PARTS, PARTS_BY_ID } from './catalog.js';

export const VAN_COLORS = [
  { id: 'white', name: 'Bright White', hex: 0xf4f6f8 },
  { id: 'granite', name: 'Granite Crystal', hex: 0x5c636b },
  { id: 'patriot', name: 'Patriot Blue', hex: 0x22466e },
  { id: 'sand', name: 'Mojave Sand', hex: 0xc4b08e },
];

export function createProMasterVan(bank) {
  const root = new THREE.Group();
  root.name = 'promaster_3500_159_hr';

  // ---------- PBR Materials ----------
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f6f8,
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const blackPlasticMat = new THREE.MeshStandardMaterial({ color: 0x1e2126, roughness: 0.78, metalness: 0.06 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x262a30, roughness: 0.44, metalness: 0.72 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdce2e8, roughness: 0.18, metalness: 0.92 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0e1b26,
    roughness: 0.06,
    metalness: 0.1,
    transparent: true,
    opacity: 0.56,
    clearcoat: 1.0,
  });
  const tintGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x071018,
    roughness: 0.06,
    metalness: 0.15,
    transparent: true,
    opacity: 0.72,
    clearcoat: 1.0,
  });
  const cargoFloorMat = new THREE.MeshStandardMaterial({ map: bank.cargoSteel(3, 5), roughness: 0.52, metalness: 0.45 });
  const cargoWallMat = new THREE.MeshStandardMaterial({ color: 0xd5dce3, roughness: 0.48, metalness: 0.35 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xf6fbff });
  const taillightMat = new THREE.MeshPhysicalMaterial({ color: 0xb01616, emissive: 0x450505, emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 0.8 });

  // Build Materials
  const kilmatMat = new THREE.MeshStandardMaterial({ map: bank.kilmat(3, 4), roughness: 0.28, metalness: 0.82 });
  const xpsMat = new THREE.MeshStandardMaterial({ map: bank.xpsFoam(3, 4), roughness: 0.86 });
  const thinsulateMat = new THREE.MeshStandardMaterial({ map: bank.thinsulate(2, 3), roughness: 0.96 });
  const lvpMat = new THREE.MeshStandardMaterial({ map: bank.lvpOak(2, 4), roughness: 0.44, metalness: 0.04 });
  const shiplapMat = new THREE.MeshStandardMaterial({ map: bank.shiplap(3, 2), roughness: 0.48 });
  const cedarMat = new THREE.MeshStandardMaterial({ map: bank.cedarCeiling(2, 4), roughness: 0.58 });
  const birchMat = new THREE.MeshStandardMaterial({ map: bank.birchPly(1, 1), roughness: 0.52 });
  const butcherMat = new THREE.MeshStandardMaterial({ map: bank.butcherBlock(1, 2), roughness: 0.36, metalness: 0.04 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.92 });
  const plaidMat = new THREE.MeshStandardMaterial({ map: bank.bedPlaid(2, 2), roughness: 0.88 });
  const solarMat = new THREE.MeshPhysicalMaterial({ map: bank.solarCell(), roughness: 0.14, metalness: 0.35, clearcoat: 0.9 });
  const victronMat = new THREE.MeshStandardMaterial({ map: bank.victronBlue(), roughness: 0.36, metalness: 0.25 });
  const waterTankMat = new THREE.MeshPhysicalMaterial({ color: 0xd8eef7, roughness: 0.38, transparent: true, opacity: 0.84 });

  // Helper to place box cleanly
  const addBox = (w, h, d, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };

  // ================================================================
  // 1. RAM PROMASTER 3500 159" HIGH ROOF — CHASSIS, INTERIOR SHELL & CAB
  //    (+Z = front bumper +3.00, -Z = rear bumper -3.00, +X = passenger, -X = driver)
  // ================================================================
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  // Underbody frame rails + axles
  addBox(1.66, 0.14, 5.70, darkMetalMat, chassisGroup, 0, 0.44, 0.0);
  const axleGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.88, 12);
  axleGeo.rotateZ(Math.PI / 2);
  for (const az of [2.02, -2.02]) {
    const ax = new THREE.Mesh(axleGeo, darkMetalMat);
    ax.position.set(0, 0.38, az);
    chassisGroup.add(ax);
  }

  // Raw corrugated steel cargo bay floor (y = 0.56, z: -2.96..+0.84)
  addBox(1.94, 0.04, 3.80, cargoFloorMat, chassisGroup, 0, 0.54, -1.06);
  // Step-well lip inside sliding door
  addBox(0.30, 0.18, 1.28, blackPlasticMat, chassisGroup, 0.86, 0.45, 0.07);

  // Inner rear wheel-well housings (leaving 1.42m wide load space between them!)
  for (const sx of [-1, 1]) {
    addBox(0.28, 0.34, 0.92, bodyPaintMat, chassisGroup, sx * 0.83, 0.72, -2.02);
    // Exterior lower rugged plastic body molding (signature ProMaster lower cladding)
    addBox(0.06, 0.32, 3.84, blackPlasticMat, chassisGroup, sx * 1.03, 0.54, -1.06);
    addBox(0.06, 0.32, 0.95, blackPlasticMat, chassisGroup, sx * 1.03, 0.54, 1.38);
    // Wheel-arch plastic fender flares
    for (const wz of [2.02, -2.02]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.065, 8, 16, Math.PI), blackPlasticMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(sx * 1.01, 0.42, wz);
      chassisGroup.add(arch);
    }
  }

  // Front & rear rugged black ProMaster bumpers
  addBox(2.04, 0.36, 0.24, blackPlasticMat, chassisGroup, 0, 0.46, 2.92);
  addBox(2.04, 0.34, 0.20, blackPlasticMat, chassisGroup, 0, 0.45, -2.98);

  // Distinct Ram ProMaster snub-nose hood + wide black slatted crosshair grille + high headlights!
  const cabGroup = new THREE.Group();
  root.add(cabGroup);
  // Cab floor + firewall
  addBox(1.94, 0.06, 2.12, blackPlasticMat, cabGroup, 0, 0.54, 1.90);
  // Iconic short ProMaster sloped hood
  addBox(1.94, 0.46, 0.72, bodyPaintMat, cabGroup, 0, 0.96, 2.58, 0.16, 0, 0);
  addBox(1.96, 0.32, 0.90, bodyPaintMat, cabGroup, 0, 0.76, 2.48);
  // Wide black ProMaster grille + horizontal & crosshair slats
  addBox(1.24, 0.36, 0.06, blackPlasticMat, cabGroup, 0, 0.86, 2.95);
  addBox(1.18, 0.04, 0.08, chromeMat, cabGroup, 0, 0.88, 2.96);
  addBox(0.07, 0.32, 0.08, chromeMat, cabGroup, 0, 0.86, 2.96);
  // High-mounted wraparound clear headlights (positioned high up near windshield cowl like real ProMaster!)
  for (const sx of [-1, 1]) {
    addBox(0.32, 0.22, 0.16, headlightMat, cabGroup, sx * 0.78, 1.08, 2.86, 0.22, sx * -0.25, 0);
    // Steep A-pillars & tall cab side mirrors
    addBox(0.09, 1.18, 0.14, bodyPaintMat, cabGroup, sx * 0.96, 1.66, 2.02, -0.58, 0, 0);
    // Side mirror arm & dual-pane black housing
    addBox(0.24, 0.05, 0.05, blackPlasticMat, cabGroup, sx * 1.10, 1.56, 1.88);
    addBox(0.08, 0.32, 0.18, blackPlasticMat, cabGroup, sx * 1.22, 1.58, 1.88);
    // Cab front doors (lower body + cab windows + front quarter pillars)
    addBox(0.07, 0.74, 1.12, bodyPaintMat, cabGroup, sx * 0.99, 0.98, 1.38);
    addBox(0.04, 0.62, 0.96, glassMat, cabGroup, sx * 0.97, 1.66, 1.44);
    addBox(0.08, 1.88, 0.14, bodyPaintMat, cabGroup, sx * 0.98, 1.54, 0.84); // B-pillar
  }
  // Steep panoramic ProMaster windshield + aerodynamic sleek High-Roof cab cap (zero overhang!)
  addBox(1.82, 1.06, 0.04, glassMat, cabGroup, 0, 1.66, 2.02, -0.56, 0, 0);
  // Sloped brow header tapering seamlessly from windshield top back into high roof
  const browGeo = new THREE.CylinderGeometry(0.96, 1.02, 0.96, 4);
  browGeo.rotateY(Math.PI / 4);
  browGeo.rotateX(Math.PI / 2);
  browGeo.scale(1.36, 0.34, 1.0);
  const brow = new THREE.Mesh(browGeo, bodyPaintMat);
  brow.position.set(0, 2.34, 1.32);
  cabGroup.add(brow);
  addBox(1.94, 0.14, 0.85, bodyPaintMat, cabGroup, 0, 2.50, 1.24);
  // Crisp RAM emblem bar in front crosshair grille
  addBox(0.24, 0.09, 0.09, chromeMat, cabGroup, 0, 0.88, 2.97);

  // Dashboard, Steering Wheel & Swivelable Front Captain Chairs
  addBox(1.86, 0.44, 0.56, blackPlasticMat, cabGroup, 0, 0.96, 2.18);
  addBox(0.32, 0.16, 0.12, darkMetalMat, cabGroup, -0.46, 1.22, 2.02, -0.35, 0, 0); // Gauge hood
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 20), blackPlasticMat);
  steerWheel.position.set(-0.46, 1.22, 1.82);
  steerWheel.rotation.x = 0.52;
  cabGroup.add(steerWheel);

  const cabSeats = [];
  for (const sx of [-1, 1]) {
    const ped = addBox(0.42, 0.24, 0.44, darkMetalMat, cabGroup, sx * 0.46, 0.68, 1.36);
    const chair = new THREE.Group();
    chair.position.set(sx * 0.46, 0.84, 1.36);
    cabGroup.add(chair);
    addBox(0.48, 0.12, 0.50, blackPlasticMat, chair, 0, 0.04, 0); // cushion
    addBox(0.46, 0.62, 0.12, blackPlasticMat, chair, 0, 0.38, -0.20, -0.14, 0, 0); // backrest
    addBox(0.24, 0.20, 0.10, blackPlasticMat, chair, 0, 0.78, -0.26); // headrest
    cabSeats.push(chair);
  }

  // Structural Cargo Steel Ribs (bare-metal van interior ribs — always visible before walls cover them!)
  const ribsGroup = new THREE.Group();
  root.add(ribsGroup);
  for (const rz of [0.68, -0.18, -0.78, -1.58, -2.32, -2.86]) {
    if (rz > -0.60 && rz < 0.72) {
      // Only driver side rib across sliding door opening!
      addBox(0.05, 1.94, 0.06, cargoWallMat, ribsGroup, -0.955, 1.54, rz);
      addBox(1.88, 0.05, 0.06, cargoWallMat, ribsGroup, 0, 2.52, rz);
    } else {
      addBox(0.05, 1.94, 0.06, cargoWallMat, ribsGroup, -0.955, 1.54, rz);
      addBox(0.05, 1.94, 0.06, cargoWallMat, ribsGroup,  0.955, 1.54, rz);
      addBox(1.88, 0.05, 0.06, cargoWallMat, ribsGroup, 0, 2.52, rz);
    }
  }
  // Horizontal cargo waist rails
  addBox(0.04, 0.08, 3.74, cargoWallMat, ribsGroup, -0.96, 1.48, -1.06);
  addBox(0.04, 0.08, 2.34, cargoWallMat, ribsGroup,  0.96, 1.48, -1.78);

  // Outer Body Panels (separable for Side Cutaway & Roof Cutaway!)
  const driverWallExt = new THREE.Group();
  driverWallExt.name = 'driver_wall_cutaway';
  root.add(driverWallExt);
  // Driver-side lower & upper sheet metal + rear bunk window cutout support
  addBox(0.06, 1.98, 3.84, bodyPaintMat, driverWallExt, -1.005, 1.56, -1.06);
  // Driver inner grey steel face so no Z-fighting
  addBox(0.02, 1.92, 3.78, cargoWallMat, driverWallExt, -0.975, 1.54, -1.06);

  // Passenger Side Permanent Walls (around the 1.28m sliding door opening z: -0.58..+0.72)
  const passWallGroup = new THREE.Group();
  root.add(passWallGroup);
  addBox(0.06, 1.98, 2.40, bodyPaintMat, passWallGroup, 1.005, 1.56, -1.78);
  addBox(0.02, 1.92, 2.34, cargoWallMat, passWallGroup, 0.975, 1.54, -1.78);
  // Sliding door upper rail header
  addBox(0.07, 0.24, 1.36, bodyPaintMat, passWallGroup, 1.005, 2.43, 0.07);
  addBox(0.05, 0.04, 2.60, blackPlasticMat, passWallGroup, 1.04, 1.48, -1.80); // slide door outer track rail

  // Roof Shell Group (separable for Roof Cutaway)
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roof_cutaway';
  root.add(roofGroup);
  addBox(1.98, 0.06, 3.82, bodyPaintMat, roofGroup, 0, 2.57, -1.06);
  // Rooftop high-mount rear third brake light bar
  addBox(0.32, 0.06, 0.06, taillightMat, roofGroup, 0, 2.59, -2.97);

  // Tail light housings at rear corners
  for (const sx of [-1, 1]) {
    addBox(0.14, 0.56, 0.14, taillightMat, chassisGroup, sx * 0.94, 1.04, -2.96);
    addBox(0.14, 1.98, 0.10, bodyPaintMat, chassisGroup, sx * 0.95, 1.56, -2.95);
  }

  // Animated Passenger Sliding Door (z: -0.57..+0.71)
  const slidingDoorPivot = new THREE.Group();
  slidingDoorPivot.position.set(1.005, 0.57, 0.07);
  root.add(slidingDoorPivot);
  addBox(0.06, 1.74, 1.28, bodyPaintMat, slidingDoorPivot, 0, 0.87, 0);
  addBox(0.02, 1.70, 1.22, cargoWallMat, slidingDoorPivot, -0.025, 0.87, 0);
  addBox(0.04, 0.30, 1.28, blackPlasticMat, slidingDoorPivot, 0.02, 0.16, 0);
  addBox(0.04, 0.14, 0.04, chromeMat, slidingDoorPivot, 0.04, 0.72, 0.48); // door handle

  // Animated Dual Rear Barn Doors (hinged at ±0.90, z = -2.97)
  const barnDoorL = new THREE.Group();
  barnDoorL.position.set(-0.90, 0.57, -2.97);
  root.add(barnDoorL);
  addBox(0.90, 1.92, 0.06, bodyPaintMat, barnDoorL, 0.45, 0.96, 0);
  addBox(0.90, 1.88, 0.02, cargoWallMat, barnDoorL, 0.45, 0.96, 0.03);
  addBox(0.68, 0.56, 0.04, tintGlassMat, barnDoorL, 0.45, 1.38, -0.02); // rear left window

  const barnDoorR = new THREE.Group();
  barnDoorR.position.set(0.90, 0.57, -2.97);
  root.add(barnDoorR);
  addBox(0.90, 1.92, 0.06, bodyPaintMat, barnDoorR, -0.45, 0.96, 0);
  addBox(0.90, 1.88, 0.02, cargoWallMat, barnDoorR, -0.45, 0.96, 0.03);
  addBox(0.68, 0.56, 0.04, tintGlassMat, barnDoorR, -0.45, 1.38, -0.02); // rear right window
  addBox(0.08, 0.16, 0.04, blackPlasticMat, barnDoorR, -0.78, 0.76, -0.04); // rear door handle

  // ================================================================
  // 2. WHEELS (STOCK PROMASTER STEEL vs. EXPEDITION BFGOODRICH KO2 A/T)
  // ================================================================
  const wheelCoords = [
    [-0.95, 0.38,  2.02],
    [ 0.95, 0.38,  2.02],
    [-0.95, 0.38, -2.02],
    [ 0.95, 0.38, -2.02],
  ];
  const stockWheelGroup = new THREE.Group();
  const ko2WheelGroup = new THREE.Group();
  ko2WheelGroup.visible = false;
  root.add(stockWheelGroup, ko2WheelGroup);

  const allWheelGroups = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.88 });
  const ko2Mat = new THREE.MeshStandardMaterial({ map: bank.ko2Tread(), roughness: 0.92 });
  const steelRimMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.42, metalness: 0.7 });

  function makeWheel(wx, wy, wz, isKO2, parent) {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tGeo = new THREE.CylinderGeometry(isKO2 ? 0.40 : 0.37, isKO2 ? 0.40 : 0.37, isKO2 ? 0.27 : 0.23, 20);
    tGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tGeo, isKO2 ? ko2Mat : tireMat);
    wg.add(tire);
    const rGeo = new THREE.CylinderGeometry(0.22, 0.22, isKO2 ? 0.28 : 0.24, 16);
    rGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rGeo, isKO2 ? darkMetalMat : steelRimMat);
    wg.add(rim);
    if (isKO2) {
      // Rugged beadlock bolts ring
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.29, 10), chromeMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
    }
    parent.add(wg);
    allWheelGroups.push(wg);
  }
  wheelCoords.forEach(([wx, wy, wz]) => {
    makeWheel(wx, wy, wz, false, stockWheelGroup);
    makeWheel(wx, wy, wz, true, ko2WheelGroup);
  });

  // ================================================================
  // 3. ALL 26 SNAP-IN LEGO MODULAR PARTS
  // ================================================================
  const partGroups = {};
  function mkPart(id) {
    const g = new THREE.Group();
    g.name = `part_${id}`;
    g.visible = false;
    root.add(g);
    partGroups[id] = g;
    return g;
  }

  // --- Phase 1: Kilmat, XPS Subfloor, Oak LVP Floor ---
  {
    const g = mkPart('kilmat_sound');
    // Floor strips + driver wall patches + passenger wall patches
    for (const kz of [-2.4, -1.6, -0.8, 0.0, 0.55]) {
      addBox(1.52, 0.008, 0.42, kilmatMat, g, 0, 0.562, kz);
    }
    for (const kz of [-2.55, -1.95, -1.2, -0.45, 0.25]) {
      addBox(0.012, 0.72, 0.46, kilmatMat, g, -0.945, 1.12, kz);
      if (kz < -0.7) addBox(0.012, 0.72, 0.46, kilmatMat, g, 0.945, 1.12, kz);
    }
  }
  {
    const g = mkPart('xps_subfloor');
    addBox(1.86, 0.025, 3.68, xpsMat, g, 0, 0.576, -1.06);
  }
  {
    const g = mkPart('lvp_floor');
    addBox(1.88, 0.018, 3.70, lvpMat, g, 0, 0.598, -1.06);
    addBox(0.04, 0.022, 1.26, chromeMat, g, 0.92, 0.60, 0.07); // sliding-door aluminum trim
  }

  // --- Phase 2: Thinsulate, CRL Windows, MaxxAir Fan ---
  {
    const g = mkPart('thinsulate_walls');
    addBox(0.035, 1.72, 3.55, thinsulateMat, g, -0.935, 1.54, -1.06);
    addBox(0.035, 1.72, 2.24, thinsulateMat, g,  0.935, 1.54, -1.78);
    addBox(1.74, 0.035, 3.60, thinsulateMat, g, 0, 2.495, -1.06);
  }
  let sliderWinGroup = null;
  {
    const g = mkPart('crl_slider_win');
    // Mounts cleanly ON the sliding door itself so it slides smoothly with the door (zero floating in open doorway!)
    sliderWinGroup = new THREE.Group();
    sliderWinGroup.visible = false;
    slidingDoorPivot.add(sliderWinGroup);
    addBox(0.075, 0.64, 0.96, blackPlasticMat, sliderWinGroup, 0.005, 1.18, 0);
    addBox(0.085, 0.56, 0.88, tintGlassMat, sliderWinGroup, 0.005, 1.18, 0);
  }
  {
    const g = mkPart('crl_bunk_wins');
    for (const sx of [-1, 1]) {
      addBox(0.09, 0.42, 0.84, blackPlasticMat, g, sx * 0.99, 1.76, -2.26);
      addBox(0.10, 0.34, 0.76, tintGlassMat, g, sx * 0.99, 1.76, -2.26);
    }
  }
  let fanBlades = null;
  {
    const g = mkPart('maxxair_fan');
    addBox(0.46, 0.05, 0.46, chromeMat, g, 0, 2.52, -0.15); // interior garnish bezel
    addBox(0.50, 0.14, 0.58, blackPlasticMat, g, 0, 2.66, -0.10, 0.14, 0, 0); // aero smoke cover
    fanBlades = new THREE.Group();
    fanBlades.position.set(0, 2.54, -0.15);
    g.add(fanBlades);
    for (let i = 0; i < 6; i++) {
      const blade = addBox(0.16, 0.01, 0.05, chromeMat, fanBlades, 0.09, 0, 0, 0.35, 0, 0);
      const wrap = new THREE.Group();
      wrap.rotation.y = (i / 6) * Math.PI * 2;
      wrap.add(blade);
      fanBlades.add(wrap);
    }
  }

  // --- Phase 3: Shiplap Walls, Cedar Ceiling + LED Pucks, Swivels, Lagun Table ---
  {
    const g = mkPart('wall_panels');
    addBox(0.025, 1.78, 3.60, shiplapMat, g, -0.91, 1.54, -1.06);
    addBox(0.025, 1.78, 2.26, shiplapMat, g,  0.91, 1.54, -1.78);
    // Warm cedar window frames on interior walls
    addBox(0.04, 0.46, 0.88, birchMat, g, -0.90, 1.76, -2.26);
    addBox(0.04, 0.46, 0.88, birchMat, g,  0.90, 1.76, -2.26);
  }
  const puckMat = new THREE.MeshBasicMaterial({ color: 0xffe4b8 });
  const interiorLights = [];
  {
    const g = mkPart('cedar_ceiling');
    addBox(1.76, 0.028, 3.64, cedarMat, g, 0, 2.47, -1.06);
    // 6 warm recessed LED puck lights down both sides
    for (const pz of [-2.25, -1.05, 0.15]) {
      for (const px of [-0.52, 0.52]) {
        const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 12), puckMat);
        puck.position.set(px, 2.452, pz);
        g.add(puck);
      }
    }
    const intLi = new THREE.PointLight(0xffd79e, 0, 6.2, 1.8);
    intLi.position.set(0, 2.30, -1.1);
    g.add(intLi);
    interiorLights.push(intLi);
  }
  {
    const g = mkPart('swivel_seats');
    for (const sx of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), chromeMat);
      plate.position.set(sx * 0.46, 0.82, 1.36);
      g.add(plate);
    }
  }
  {
    const g = mkPart('lagun_table');
    // Mounted behind driver swivel seat facing cabin!
    addBox(0.04, 0.36, 0.04, blackPlasticMat, g, -0.68, 1.06, 0.66);
    addBox(0.32, 0.04, 0.05, blackPlasticMat, g, -0.54, 1.24, 0.68);
    addBox(0.46, 0.028, 0.68, butcherMat, g, -0.44, 1.28, 0.66); // White oak tabletop
    // Mini laptop & camp coffee mug prop!
    addBox(0.28, 0.012, 0.20, darkMetalMat, g, -0.44, 1.30, 0.68);
    addBox(0.28, 0.18, 0.01, darkMetalMat, g, -0.44, 1.39, 0.58, -0.22, 0, 0);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 10), chromeMat);
    mug.position.set(-0.30, 1.34, 0.84);
    g.add(mug);
  }

  // --- Phase 4: Transverse Bed Frame, Mattress & Plaid Quilt, Upper Cabinets ---
  {
    const g = mkPart('bed_frame');
    // Aluminum frame posts + slats across full 1.84m interior width!
    addBox(1.80, 0.05, 1.34, birchMat, g, 0, 1.34, -2.21);
    for (const [bx, bz] of [[-0.86, -1.58], [0.86, -1.58], [-0.86, -2.84], [0.86, -2.84]]) {
      addBox(0.05, 0.72, 0.05, darkMetalMat, g, bx, 0.96, bz);
    }
    // Decorative walnut/birch front face under bed with gear garage curtain gap
    addBox(1.80, 0.12, 0.04, birchMat, g, 0, 1.29, -1.55);
  }
  {
    const g = mkPart('bed_mattress');
    addBox(1.78, 0.20, 1.30, mattressMat, g, 0, 1.465, -2.21);
    addBox(1.79, 0.05, 0.96, plaidMat, g, 0, 1.56, -2.38); // cozy cabin plaid duvet
    // Two plump pillows at right wall headrest!
    for (const pz of [-2.48, -1.96]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.44), mattressMat);
      pil.position.set(0.68, 1.62, pz);
      pil.rotation.z = 0.25;
      g.add(pil);
    }
  }
  {
    const g = mkPart('upper_cabinets');
    // Driver-side upper cabinetry above galley/dinette
    addBox(0.36, 0.36, 2.04, birchMat, g, -0.71, 2.24, -0.68);
    // Matte-black push-latch hardware on 3 doors
    for (const dz of [-1.36, -0.68, 0.0]) {
      addBox(0.02, 0.05, 0.05, blackPlasticMat, g, -0.525, 2.15, dz);
    }
    // Passenger rear upper cubby behind sliding door
    addBox(0.36, 0.36, 0.88, birchMat, g, 0.71, 2.24, -1.10);
  }

  // --- Phase 5: Wheel-Well Water Tank, Grey Tank, Galley, Sink, Fridge, Cooktop, Compost Toilet ---
  {
    const g = mkPart('wheel_water_32');
    // 32-gallon translucent water tank arched over passenger rear wheel well
    addBox(0.32, 0.38, 1.02, waterTankMat, g, 0.72, 1.06, -2.18);
    addBox(0.28, 0.22, 0.94, new THREE.MeshBasicMaterial({ color: 0x2ba8d9, transparent: true, opacity: 0.45 }), g, 0.72, 0.99, -2.18);
    // SHURflo pump + PEX lines
    addBox(0.14, 0.10, 0.20, new THREE.MeshStandardMaterial({ color: 0xc22820, roughness: 0.5 }), g, 0.54, 0.72, -1.78);
  }
  {
    const g = mkPart('grey_tank_15');
    addBox(0.46, 0.14, 0.90, blackPlasticMat, g, -0.50, 0.38, -0.84);
    addBox(0.06, 0.06, 0.16, chromeMat, g, -0.76, 0.38, -0.84);
  }
  {
    const g = mkPart('galley_cabinet');
    // Driver-side kitchen base block + butcher-block oak countertop
    addBox(0.54, 0.84, 1.46, birchMat, g, -0.63, 1.03, -0.76);
    addBox(0.58, 0.045, 1.50, butcherMat, g, -0.61, 1.47, -0.76);
    // Cabinet drawer seams & black matte pulls
    for (const dy of [0.78, 1.05, 1.30]) {
      addBox(0.02, 0.02, 0.12, blackPlasticMat, g, -0.355, dy, -0.34);
    }
  }
  {
    const g = mkPart('sink_faucet');
    // Recessed stainless sink rim + black high-arc gooseneck faucet
    addBox(0.38, 0.02, 0.44, chromeMat, g, -0.61, 1.498, -0.34);
    addBox(0.30, 0.015, 0.36, darkMetalMat, g, -0.61, 1.495, -0.34);
    addBox(0.03, 0.22, 0.03, blackPlasticMat, g, -0.78, 1.60, -0.34);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 14, Math.PI), blackPlasticMat);
    arc.position.set(-0.70, 1.71, -0.34);
    g.add(arc);
  }
  {
    const g = mkPart('dometic_fridge');
    // Stainless steel Dometic upright fridge front face built into rear half of galley
    addBox(0.52, 0.76, 0.54, chromeMat, g, -0.59, 1.02, -1.16);
    addBox(0.02, 0.18, 0.04, blackPlasticMat, g, -0.32, 1.24, -0.94); // door latch
  }
  {
    const g = mkPart('induction_cooktop');
    addBox(0.34, 0.025, 0.48, blackPlasticMat, g, -0.60, 1.50, -0.92);
    const burnerMat = new THREE.MeshBasicMaterial({ color: 0xff3b24, transparent: true, opacity: 0.7 });
    for (const bz of [-0.80, -1.04]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.07, 18), burnerMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(-0.60, 1.515, bz);
      g.add(ring);
    }
  }
  {
    const g = mkPart('natures_head');
    // Oak hinged toilet bench box + iconic white Nature's Head unit visible above
    addBox(0.46, 0.44, 0.52, birchMat, g, 0.64, 0.83, -1.12);
    addBox(0.48, 0.04, 0.54, butcherMat, g, 0.64, 1.07, -1.12);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.12, 14), mattressMat);
    bowl.position.set(0.64, 1.04, -1.12);
    g.add(bowl);
  }

  // --- Phase 6: Battle Born Lithium, Victron Hub, 400W Solar, Espar Heater, Exterior Rig ---
  {
    const g = mkPart('battleborn_200');
    const bbMat = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.45 });
    const bbAccent = new THREE.MeshStandardMaterial({ color: 0xf06520, roughness: 0.4 });
    for (const bz of [-2.44, -2.08]) {
      addBox(0.34, 0.24, 0.28, bbMat, g, -0.72, 0.86, bz);
      addBox(0.35, 0.05, 0.26, bbAccent, g, -0.72, 0.88, bz);
    }
    addBox(0.06, 0.10, 0.46, blackPlasticMat, g, -0.72, 1.04, -2.26); // Lynx fuse busbar
  }
  {
    const g = mkPart('victron_inverter');
    addBox(0.14, 0.42, 0.36, victronMat, g, -0.84, 1.08, -1.78); // MultiPlus 3000W
    addBox(0.08, 0.20, 0.18, victronMat, g, -0.84, 1.04, -2.14); // MPPT controller
    addBox(0.03, 0.10, 0.16, new THREE.MeshBasicMaterial({ color: 0x45c8ff }), g, -0.89, 1.66, -1.36); // Cerbo GX Touch screen on shiplap wall
  }
  {
    const g = mkPart('renogy_solar_400');
    for (const sz of [-1.30, -2.22]) {
      addBox(1.48, 0.04, 0.84, solarMat, g, 0, 2.68, sz);
    }
    addBox(0.12, 0.05, 0.12, blackPlasticMat, g, -0.62, 2.63, -2.68); // cable gland
  }
  {
    const g = mkPart('espar_heater');
    addBox(0.16, 0.14, 0.32, chromeMat, g, 0.46, 0.64, 0.94);
    addBox(0.04, 0.08, 0.08, darkMetalMat, g, 0.88, 1.54, 0.72); // digital thermostat
  }

  let awningCanopy = null;
  let awningExtended = false;
  {
    const g = mkPart('exterior_expedition');
    // Walkable black aluminum perimeter safari roof rack
    for (const sx of [-0.88, 0.88]) {
      addBox(0.06, 0.08, 3.68, blackPlasticMat, g, sx, 2.64, -1.06);
    }
    for (const rz of [0.68, -0.45, -0.95, -2.74]) {
      addBox(1.80, 0.05, 0.06, blackPlasticMat, g, 0, 2.63, rz);
    }
    // Driver-side black rear ladder
    for (const lz of [-2.42, -2.76]) {
      addBox(0.04, 2.02, 0.04, blackPlasticMat, g, -1.05, 1.62, lz);
    }
    for (let ly = 0.85; ly <= 2.45; ly += 0.32) {
      addBox(0.04, 0.03, 0.36, blackPlasticMat, g, -1.05, ly, -2.59);
    }
    // Fiamma F65S roof awning box on passenger side
    addBox(0.14, 0.16, 3.20, blackPlasticMat, g, 0.98, 2.58, -0.92);
    // Extendable awning canopy & legs (deployed when parked at campground!)
    awningCanopy = new THREE.Group();
    awningCanopy.position.set(1.04, 2.52, -0.92);
    awningCanopy.visible = false;
    g.add(awningCanopy);
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xc2b8a3, roughness: 0.85, side: THREE.DoubleSide });
    addBox(1.85, 0.03, 3.08, fabricMat, awningCanopy, 0.92, -0.18, 0, 0, 0, -0.18);
    addBox(0.06, 0.06, 3.10, chromeMat, awningCanopy, 1.82, -0.35, 0);
    for (const lz of [-1.45, 1.45]) {
      addBox(0.04, 2.18, 0.04, chromeMat, awningCanopy, 1.82, -1.44, lz);
    }
  }

  // ================================================================
  // 4. PULSING GLOWING LEGO-SNAP GHOST PREVIEW BOX
  // ================================================================
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0x00f5c4,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const ghostMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
  const ghostWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x6bffea })
  );
  ghostMesh.add(ghostWire);
  ghostMesh.visible = false;
  root.add(ghostMesh);

  // State animation variables
  let doorsTarget = 0;      // 0 = closed, 1 = sliding door & barn doors open
  let doorsVal = 0;
  let explodeTarget = 0;
  let explodeVal = 0;
  let cutawayMode = 'none'; // 'none' | 'side' | 'roof'
  let ghostPartId = null;
  let activeSnapId = null;
  let activeSnapT = 0;
  let currentInstalled = new Set();

  function setPaintColor(hex) {
    bodyPaintMat.color.setHex(hex);
  }

  function setDoorsOpen(open) {
    doorsTarget = open ? 1 : 0;
  }

  function setCutaway(mode) {
    cutawayMode = mode;
    driverWallExt.visible = mode !== 'side';
    roofGroup.visible = mode !== 'roof';
  }

  function setExploded(val) {
    explodeTarget = THREE.MathUtils.clamp(val, 0, 1);
  }

  function setGhost(partId) {
    ghostPartId = partId;
    const part = partId ? PARTS_BY_ID[partId] : null;
    if (!part || currentInstalled.has(partId)) {
      ghostMesh.visible = false;
      return;
    }
    const sb = part.slotBox;
    ghostMesh.visible = true;
    ghostMesh.scale.set(sb.w, sb.h, sb.d);
    ghostMesh.position.set(sb.x, sb.y, sb.z);
  }

  function setSwiveled(swivelOn) {
    const installed = currentInstalled.has('swivel_seats');
    const rot = installed && swivelOn ? Math.PI : 0;
    cabSeats[0].rotation.y = rot;
    cabSeats[1].rotation.y = rot;
  }

  function setAwningExtended(ext) {
    awningExtended = Boolean(ext && currentInstalled.has('exterior_expedition'));
    if (awningCanopy) awningCanopy.visible = awningExtended;
  }

  function setInteriorGlow(on) {
    puckMat.color.setHex(on ? 0xffe4b8 : 0xd0cbb8);
    for (const li of interiorLights) {
      li.intensity = on ? 6.5 : 1.4;
    }
  }

  function syncInstalled(installedSet, justSnappedId = null) {
    currentInstalled = new Set(installedSet);
    for (const part of PARTS) {
      const g = partGroups[part.id];
      if (g) g.visible = currentInstalled.has(part.id);
    }
    if (sliderWinGroup) sliderWinGroup.visible = currentInstalled.has('crl_slider_win');
    // Toggle windows on sliding door & wheels
    const hasExp = currentInstalled.has('exterior_expedition');
    stockWheelGroup.visible = !hasExp;
    ko2WheelGroup.visible = hasExp;
    if (awningCanopy) awningCanopy.visible = awningExtended && hasExp;

    // Update ghost in case selected part was just snapped!
    setGhost(ghostPartId);

    if (justSnappedId && partGroups[justSnappedId]) {
      activeSnapId = justSnappedId;
      activeSnapT = 1.0;
    }
  }

  function spinWheels(dist) {
    const angle = dist / 0.38;
    for (const w of allWheelGroups) w.rotation.x += angle;
  }

  function update(dt, t) {
    // Smooth door opening (sliding door & twin barn doors)
    doorsVal += (doorsTarget - doorsVal) * Math.min(1, dt * 6.5);
    slidingDoorPivot.position.set(1.005 + Math.min(1, doorsVal * 2.5) * 0.11, 0.57, 0.07 - doorsVal * 1.18);
    barnDoorL.rotation.y = -doorsVal * 2.45;
    barnDoorR.rotation.y =  doorsVal * 2.45;

    // Smooth Lego Explode separation along each part's explodeVec
    explodeVal += (explodeTarget - explodeVal) * Math.min(1, dt * 7.5);
    for (const part of PARTS) {
      const g = partGroups[part.id];
      if (!g || !g.visible) continue;
      let ex = part.explodeVec[0] * explodeVal;
      let ey = part.explodeVec[1] * explodeVal;
      let ez = part.explodeVec[2] * explodeVal;
      if (activeSnapId === part.id && activeSnapT > 0) {
        const bounce = Math.sin(activeSnapT * Math.PI) * 0.24 * activeSnapT;
        ey += bounce;
        const sc = 1 + Math.sin(activeSnapT * Math.PI) * 0.08;
        g.scale.set(sc, sc, sc);
      } else {
        g.scale.set(1, 1, 1);
      }
      g.position.set(ex, ey, ez);
    }
    if (activeSnapT > 0) {
      activeSnapT = Math.max(0, activeSnapT - dt * 2.6);
      if (activeSnapT === 0) activeSnapId = null;
    }

    // Pulse ghost preview smoothly
    if (ghostMesh.visible) {
      ghostMat.opacity = 0.22 + 0.14 * (0.5 + 0.5 * Math.sin(t * 5.2));
    }

    // Rotate MaxxAir exhaust fan subtly if installed
    if (fanBlades && currentInstalled.has('maxxair_fan')) {
      fanBlades.rotation.y += dt * 4.5;
    }
  }

  return {
    root,
    setPaintColor,
    setDoorsOpen,
    setCutaway,
    setExploded,
    setGhost,
    setSwiveled,
    setAwningExtended,
    setInteriorGlow,
    syncInstalled,
    spinWheels,
    update,
    getSpecsReady: () => ({ explodeVal, doorsVal, cutawayMode }),
  };
}
