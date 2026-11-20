// Neon Bake-Off #1 — Classic Muscle Ute (clean-sheet, procedural Three.js)
// Reference: games/bunny-hop/reference/car-bar/ute-shop-dusk.jpg, drive-5.jpg, ute-shop-night.jpg, drive-1..2.jpg
// Pure ESM, imports 'three' only.

import * as THREE from 'three';

// Build a smooth lofted mesh from an array of cross-section rings (each ring = array of [x, y, z])
function buildLoft(rings, closeLoop = false, flipWinding = false) {
  const nRings = rings.length;
  const nPts = rings[0].length;
  const pos = [];
  const uvs = [];
  const idx = [];

  for (let r = 0; r < nRings; r++) {
    const v = r / (nRings - 1);
    for (let i = 0; i < nPts; i++) {
      const [x, y, z] = rings[r][i];
      pos.push(x, y, z);
      uvs.push(i / (nPts - 1), v);
    }
  }
  const segs = closeLoop ? nPts : nPts - 1;
  for (let r = 0; r < nRings - 1; r++) {
    for (let i = 0; i < segs; i++) {
      const ni = (i + 1) % nPts;
      const a = r * nPts + i;
      const b = (r + 1) * nPts + i;
      const c = (r + 1) * nPts + ni;
      const d = r * nPts + ni;
      if (flipWinding) {
        idx.push(a, d, b, b, d, c);
      } else {
        idx.push(a, b, d, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Sculpted side body panel (left or right) with true wheel-arch cutouts, Coke-bottle hip & tumblehome
function createSideBodyPanel(side) {
  // Coordinates: +Z = front nose (+2.54), -Z = rear tail (-2.56)
  // Front wheel center: z = +1.52, y = 0.36, arch radius = 0.41
  // Rear wheel center:  z = -1.42, y = 0.36, arch radius = 0.41
  const wfZ = 1.52, wrZ = -1.42, wY = 0.36, archR = 0.415;

  // Beltline height along Z (gentle muscle-car kick-up over rear quarter — ute-shop-dusk.jpg)
  function beltY(z) {
    if (z > 0.45) return 0.90 - (z - 0.45) * 0.032; // slight forward rake down nose
    if (z > -0.65) return 0.90 + Math.sin(((0.45 - z) / 1.1) * Math.PI * 0.5) * 0.035;
    return 0.935 - (-0.65 - z) * 0.012; // long flat-taut bed rail
  }

  // Half-width along Z (tapers at nose and tail, subtle hip flare over rear wheel)
  function halfW(z) {
    let w = 0.95;
    if (z > 1.75) {
      const t = (z - 1.75) / 0.80;
      w -= t * t * 0.095;
    } else if (z < -1.85) {
      const t = (-1.85 - z) / 0.72;
      w -= t * t * 0.065;
    }
    // Subtle muscular flare around wheel arches
    const df = Math.abs(z - wfZ);
    const dr = Math.abs(z - wrZ);
    if (df < 0.55) w += Math.cos((df / 0.55) * Math.PI * 0.5) * 0.028;
    if (dr < 0.60) w += Math.cos((dr / 0.60) * Math.PI * 0.5) * 0.038;
    return w;
  }

  // Lower edge height (follows rocker sill y=0.25, arches cleanly up over both wheels!)
  function botY(z) {
    let y = 0.25;
    if (z > 2.05) y += (z - 2.05) * 0.16; // front valance tuck
    if (z < -2.05) y += (-2.05 - z) * 0.14; // rear quarter tuck
    const df = Math.abs(z - wfZ);
    if (df < archR) y = Math.max(y, wY + Math.sqrt(Math.max(0, archR * archR - df * df)));
    const dr = Math.abs(z - wrZ);
    if (dr < archR) y = Math.max(y, wY + Math.sqrt(Math.max(0, archR * archR - dr * dr)));
    return y;
  }

  // Dense Z stations around wheel arches for crisp circular cutouts
  const zs = [];
  for (let z = -2.54; z <= 2.52; z += 0.14) zs.push(+z.toFixed(3));
  for (const wz of [wrZ, wfZ]) {
    for (let a = 0; a <= 12; a++) {
      const ang = (a / 12) * Math.PI;
      zs.push(+(wz - Math.cos(ang) * archR).toFixed(3));
    }
  }
  zs.sort((a, b) => a - b);
  const uniqZ = [];
  for (const z of zs) {
    if (!uniqZ.length || Math.abs(z - uniqZ[uniqZ.length - 1]) > 0.015) uniqZ.push(z);
  }

  // 7 vertical profile points per Z station: tucked rocker -> mid bulge -> crisp character line -> upper tumblehome -> inner bed lip
  const rings = [];
  for (const z of uniqZ) {
    const y0 = botY(z);
    const yTop = beltY(z);
    const hw = halfW(z);
    const span = Math.max(0.08, yTop - y0);
    const ring = [
      [side * (hw - 0.095), y0, z],                          // tucked lower sill
      [side * (hw - 0.015), y0 + span * 0.22, z],            // lower swell
      [side * (hw + 0.018), y0 + span * 0.56, z],            // widest Coke-bottle mid crease
      [side * (hw + 0.008), y0 + span * 0.78, z],            // upper flank
      [side * (hw - 0.032), yTop - 0.015, z],                // rounded shoulder
      [side * (hw - 0.085), yTop + 0.012, z],                // top fender/bed-rail crown
      [side * (hw - 0.145), yTop - 0.010, z],                // inner lip return
    ];
    rings.push(ring);
  }
  return buildLoft(rings, false, side > 0);
}

// Sculpted hood with raised central muscle power-bulge (ute-shop-dusk.jpg, ute-shop-night.jpg)
function createHoodGeo() {
  const zs = [0.46, 0.75, 1.15, 1.55, 1.95, 2.28, 2.48, 2.55];
  const xs = [-0.84, -0.66, -0.44, -0.34, -0.22, 0.0, 0.22, 0.34, 0.44, 0.66, 0.84];
  const rings = [];
  for (const z of zs) {
    const tFront = Math.max(0, (z - 0.46) / (2.55 - 0.46));
    const taper = 1.0 - Math.max(0, (z - 1.75) / 0.80) ** 2 * 0.10;
    const baseY = 0.90 - (z - 0.46) * 0.034 - (z > 2.42 ? (z - 2.42) * 0.52 : 0);
    const ring = [];
    for (const x0 of xs) {
      const x = x0 * taper;
      const ax = Math.abs(x0);
      // Gentle cross-hood crown
      let y = baseY + Math.cos((ax / 0.86) * Math.PI * 0.5) * 0.042;
      // Raised central power-bulge / cowl scoop tapering toward front
      if (ax < 0.38 && z < 2.28) {
        const bx = Math.cos((ax / 0.38) * Math.PI * 0.5);
        const bz = Math.sin(Math.min(1, (2.28 - z) / 1.75) * Math.PI * 0.78);
        y += bx * bx * bz * 0.072;
      }
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }
  return buildLoft(rings, false, false);
}

// Sweeping curved fastback sail-panel / C-pillar buttress (the signature El Camino / Ranchero line!)
function createSailPanel(side) {
  // Flows smoothly from roof rear corner down onto the bed rail
  const steps = 10;
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Cubic ease from roof (z = -0.38, y = 1.37) sweeping back to bed rail (z = -1.16, y = 0.935)
    const zTop = -0.36 - t * 0.82;
    const yTop = 1.375 - (3 * t * t - 2 * t * t * t) * 0.44;
    const zLead = -0.34 - t * 0.16; // rear cab window vertical edge
    const xOut = side * (0.72 + t * 0.155);
    const xIn = side * (0.67 + t * 0.135);
    const yBot = 0.935;
    rings.push([
      [xOut, yBot, zTop],
      [xOut, yTop, zTop],
      [xIn, yTop, zTop],
      [xIn, yBot, zLead],
    ]);
  }
  return buildLoft(rings, true, side > 0);
}

// Detailed Magnum-500 / 5-spoke classic muscle wheel with rounded whitewall tire
function createMuscleWheel(mats) {
  const g = new THREE.Group();

  // 1. Rounded tire profile via LatheGeometry (axis Y -> rotated Z by PI/2 so axle is X)
  const tirePts = [
    new THREE.Vector2(0.225, -0.115),
    new THREE.Vector2(0.325, -0.125),
    new THREE.Vector2(0.355, -0.095),
    new THREE.Vector2(0.362, 0.0),
    new THREE.Vector2(0.355, 0.095),
    new THREE.Vector2(0.325, 0.125),
    new THREE.Vector2(0.225, 0.115),
  ];
  const tireGeo = new THREE.LatheGeometry(tirePts, 28);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, mats.tire);
  tire.castShadow = true;
  g.add(tire);

  // 2. Classic whitewall stripe ring on outer sidewall (ute-shop-dusk.jpg, drive-5.jpg)
  const wwGeo = new THREE.RingGeometry(0.242, 0.278, 28);
  wwGeo.rotateY(Math.PI / 2);
  const ww = new THREE.Mesh(wwGeo, mats.whitewall);
  ww.position.x = 0.124;
  g.add(ww);

  // 3. Deep-dish chrome outer rim lip
  const rimPts = [
    new THREE.Vector2(0.185, 0.03),
    new THREE.Vector2(0.228, 0.118),
    new THREE.Vector2(0.238, 0.122),
    new THREE.Vector2(0.238, 0.102),
    new THREE.Vector2(0.215, 0.092),
    new THREE.Vector2(0.185, 0.02),
  ];
  const rimGeo = new THREE.LatheGeometry(rimPts, 24);
  rimGeo.rotateZ(Math.PI / 2);
  g.add(new THREE.Mesh(rimGeo, mats.chrome));

  // 4. Dark recessed rim backing / brake drum
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 20), mats.darkMetal);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.02;
  g.add(barrel);

  // 5. 5 sculpted Magnum-500 spokes + chrome center hub + 5 lug nuts
  const spokeGeo = new THREE.BoxGeometry(0.026, 0.18, 0.058);
  const lugGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.03, 6);
  lugGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(spokeGeo, mats.chrome);
    sp.position.set(0.088, Math.cos(a) * 0.115, Math.sin(a) * 0.115);
    sp.rotation.x = a;
    g.add(sp);

    const lug = new THREE.Mesh(lugGeo, mats.chrome);
    lug.position.set(0.104, Math.cos(a + 0.31) * 0.048, Math.sin(a + 0.31) * 0.048);
    g.add(lug);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.045, 16), mats.chrome);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 0.105;
  g.add(cap);

  return g;
}

// Seated driver visible through the cabin glass (ute-shop-dusk.jpg, drive-5.jpg)
function createSeatedDriver(mats) {
  const d = new THREE.Group();
  // Position on left (US driver side: +X when facing +Z)
  d.position.set(0.34, 0.56, -0.02);

  // Torso (white tank top)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.44, 12), mats.driverShirt);
  torso.scale.set(1.18, 1, 0.78);
  torso.position.set(0, 0.28, -0.05);
  torso.rotation.x = -0.14;
  d.add(torso);

  // Neck + head + hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), mats.skin);
  head.scale.set(0.92, 1.08, 0.98);
  head.position.set(0, 0.60, -0.02);
  d.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.109, 14, 10, 0, Math.PI * 2, 0, 1.7), mats.hair);
  hair.position.set(0, 0.62, -0.03);
  d.add(hair);

  // Arms reaching forward to steering wheel
  const armGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.38, 8);
  for (const sx of [-1, 1]) {
    const upper = new THREE.Mesh(armGeo, mats.skin);
    upper.position.set(sx * 0.19, 0.34, 0.10);
    upper.rotation.set(1.15, 0, sx * 0.15);
    d.add(upper);
  }
  return d;
}

export function buildUte() {
  const car = new THREE.Group();
  car.name = 'ClassicMuscleUte';

  const mats = {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0x1855a2,       // deep cobalt muscle-car blue (ute-shop-dusk.jpg)
      metalness: 0.52,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.65,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: 0xeaf0f8,
      metalness: 0.96,
      roughness: 0.08,
      envMapIntensity: 1.6,
    }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x1a1e26, metalness: 0.55, roughness: 0.55 }),
    bedLiner: new THREE.MeshStandardMaterial({ color: 0x1c2028, metalness: 0.15, roughness: 0.88 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.88 }),
    whitewall: new THREE.MeshStandardMaterial({ color: 0xeef1f5, roughness: 0.65 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x1d344e,
      metalness: 0.15,
      roughness: 0.05,
      transparent: true,
      opacity: 0.36,
      clearcoat: 1.0,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
    }),
    interior: new THREE.MeshStandardMaterial({ color: 0x22252d, roughness: 0.88 }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xfff4dc, emissive: 0xffe2a8, emissiveIntensity: 3.4, roughness: 0.15,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xf02438, emissive: 0xff1e34, emissiveIntensity: 3.6, roughness: 0.2,
    }),
    amberMarker: new THREE.MeshStandardMaterial({
      color: 0xff9828, emissive: 0xff7b14, emissiveIntensity: 1.8, roughness: 0.25,
    }),
    plate: new THREE.MeshStandardMaterial({
      color: 0xfff8ea, emissive: 0xffeec8, emissiveIntensity: 2.2, roughness: 0.35,
    }),
    driverShirt: new THREE.MeshStandardMaterial({ color: 0xe6e8ee, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc28a62, roughness: 0.72 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x241c16, roughness: 0.9 }),
  };

  // ---- 1. Sculpted Left & Right Side Body Panels (with wheel arch cutouts & tumblehome) ----
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(createSideBodyPanel(s), mats.paint);
    panel.castShadow = true;
    panel.receiveShadow = true;
    car.add(panel);
  }

  // ---- 2. Sculpted Hood with Central Muscle Power-Bulge ----
  const hood = new THREE.Mesh(createHoodGeo(), mats.paint);
  hood.castShadow = true;
  hood.receiveShadow = true;
  car.add(hood);

  // ---- 3. Roof Cap + Raked A-Pillars + Sweeping El Camino Sail Panels ----
  {
    const roofGeo = new THREE.BoxGeometry(1.42, 0.065, 0.84);
    const roof = new THREE.Mesh(roofGeo, mats.paint);
    roof.position.set(0, 1.385, -0.02);
    roof.castShadow = true;
    car.add(roof);

    // Subtle roof crown pad
    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.03, 0.74), mats.paint);
    crown.position.set(0, 1.42, -0.02);
    car.add(crown);

    // Exact point-to-point raked A-pillars connecting cowl (z=0.72) to roof front corner (z=0.38)
    for (const s of [-1, 1]) {
      const pA = new THREE.Vector3(s * 0.83, 0.90, 0.72);
      const pB = new THREE.Vector3(s * 0.71, 1.385, 0.38);
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const aPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, dir.length(), 8), mats.paint);
      aPillar.position.copy(pA).addScaledVector(dir, 0.5);
      aPillar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      car.add(aPillar);

      // Sweeping fastback sail panel / C-pillar buttress
      const sail = new THREE.Mesh(createSailPanel(s), mats.paint);
      sail.castShadow = true;
      sail.receiveShadow = true;
      car.add(sail);

      // Chrome side mirror + door handle + script badge
      const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), mats.chrome);
      mirrorStem.position.set(s * 0.96, 0.94, 0.42);
      car.add(mirrorStem);
      const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.12), mats.chrome);
      mirrorHead.position.set(s * 1.01, 0.96, 0.40);
      car.add(mirrorHead);

      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.028, 0.14), mats.chrome);
      handle.position.set(s * 0.96, 0.84, -0.14);
      car.add(handle);

      // Chrome bed-rail molding & lower rocker trim
      const bedTrim = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.026, 2.12), mats.chrome);
      bedTrim.position.set(s * 0.855, 0.942, -1.46);
      car.add(bedTrim);

      const rockerTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 1.98), mats.chrome);
      rockerTrim.position.set(s * 0.88, 0.27, 0.05);
      car.add(rockerTrim);

      // Side amber/red marker lights (ute-shop-night.jpg)
      const fMarker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.14), mats.amberMarker);
      fMarker.position.set(s * 0.90, 0.50, 2.22);
      car.add(fMarker);
      const rMarker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.14), mats.taillight);
      rMarker.position.set(s * 0.91, 0.52, -2.28);
      car.add(rMarker);
    }
  }

  // ---- 4. Open Pickup Bed (Floor, Ribs, Inner Walls, Bulkhead, Tailgate) ----
  {
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 2.08), mats.bedLiner);
    bedFloor.position.set(0, 0.52, -1.46);
    bedFloor.receiveShadow = true;
    car.add(bedFloor);

    // Corrugated bed floor ribs
    for (let x = -0.64; x <= 0.65; x += 0.16) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, 2.02), mats.bedLiner);
      rib.position.set(x, 0.56, -1.46);
      car.add(rib);
    }

    // Inner bed walls + front bulkhead
    for (const s of [-1, 1]) {
      const iWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 2.10), mats.bedLiner);
      iWall.position.set(s * 0.77, 0.73, -1.46);
      car.add(iWall);
    }
    const bulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.44, 0.08), mats.paint);
    bulkhead.position.set(0, 0.73, -0.42);
    car.add(bulkhead);

    // Tailgate + rear fascia + chrome trim + stacked dual taillights + glowing plate (drive-1, drive-2)
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.58, 0.10), mats.paint);
    tailgate.position.set(0, 0.65, -2.51);
    tailgate.castShadow = true;
    car.add(tailgate);

    const tgTopTrim = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.032, 0.11), mats.chrome);
    tgTopTrim.position.set(0, 0.935, -2.51);
    car.add(tgTopTrim);

    // Stacked dual red taillights (drive-1.jpg, drive-2.jpg)
    for (const s of [-1, 1]) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.05), mats.chrome);
      housing.position.set(s * 0.78, 0.64, -2.55);
      car.add(housing);
      for (const ty of [0.72, 0.56]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), mats.taillight);
        lens.position.set(s * 0.78, ty, -2.57);
        car.add(lens);
      }
    }

    // Lit rear license plate
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.17, 0.03), mats.plate);
    plate.position.set(0, 0.44, -2.56);
    car.add(plate);

    // Heavy wraparound chrome rear bumper
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.16, 0.18), mats.chrome);
    rBumper.position.set(0, 0.35, -2.58);
    car.add(rBumper);
    for (const s of [-1, 1]) {
      const rEnd = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.34), mats.chrome);
      rEnd.position.set(s * 0.90, 0.35, -2.44);
      car.add(rEnd);
    }
  }

  // ---- 5. Front Clip: Recessed Classic Grille, Twin Round Headlights & Chrome Bumper ----
  {
    const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.34, 0.14), mats.darkMetal);
    grilleBg.position.set(0, 0.62, 2.48);
    car.add(grilleBg);

    // Horizontal grille slats + chrome surround
    for (let gy = 0.50; gy <= 0.74; gy += 0.06) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.015, 0.03), mats.chrome);
      slat.position.set(0, gy, 2.55);
      car.add(slat);
    }
    const grilleTop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.035, 0.08), mats.chrome);
    grilleTop.position.set(0, 0.80, 2.53);
    car.add(grilleTop);

    // Quad classic round headlights in chrome bezels (ute-shop-night.jpg)
    const hlGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.04, 16);
    hlGeo.rotateX(Math.PI / 2);
    for (const hx of [-0.66, -0.46, 0.46, 0.66]) {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 16).rotateX(Math.PI / 2), mats.chrome);
      bezel.position.set(hx, 0.63, 2.54);
      car.add(bezel);
      const lamp = new THREE.Mesh(hlGeo, mats.headlight);
      lamp.position.set(hx, 0.63, 2.555);
      car.add(lamp);
    }

    // Wraparound chrome front bumper + lower valance
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.17, 0.20), mats.chrome);
    fBumper.position.set(0, 0.38, 2.58);
    car.add(fBumper);
    for (const s of [-1, 1]) {
      const fEnd = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.17, 0.36), mats.chrome);
      fEnd.position.set(s * 0.88, 0.38, 2.44);
      car.add(fEnd);
    }
    const valance = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.16, 0.18), mats.paint);
    valance.position.set(0, 0.29, 2.42);
    car.add(valance);
  }

  // ---- 6. Cabin Interior, Transparent Glass & Seated Driver ----
  {
    // Underbody chassis pan (prevents seeing daylight under wheel wells)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.16, 4.60), mats.darkMetal);
    chassis.position.set(0, 0.31, 0.0);
    car.add(chassis);

    // Bench seat, backrest, dash & 3-spoke steering wheel
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.20, 0.54), mats.interior);
    seatBase.position.set(0, 0.56, 0.04);
    car.add(seatBase);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.46, 0.14), mats.interior);
    seatBack.position.set(0, 0.82, -0.22);
    seatBack.rotation.x = -0.18;
    car.add(seatBack);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.26, 0.36), mats.interior);
    dash.position.set(0, 0.82, 0.44);
    car.add(dash);

    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 8, 20), mats.darkMetal);
    wheelRing.position.set(0.34, 0.88, 0.25);
    wheelRing.rotation.x = 0.38;
    car.add(wheelRing);

    // Seated driver clearly visible through the side glass
    car.add(createSeatedDriver(mats));

    // Raked windshield (tilted back from cowl z=0.72 to roof z=0.38) + rear cab window + clear side windows
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 0.60), mats.glass);
    ws.position.set(0, 1.14, 0.55);
    ws.rotation.x = -0.62;
    car.add(ws);

    const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.42), mats.glass);
    rw.position.set(0, 1.16, -0.40);
    rw.rotation.x = 0.12;
    car.add(rw);

    for (const s of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.40), mats.glass);
      sw.position.set(s * 0.78, 1.14, 0.02);
      sw.rotation.y = s * Math.PI / 2;
      car.add(sw);
    }
  }

  // ---- 7. Four Detailed Magnum-500 Whitewall Wheels ----
  const wheelCoords = [
    [-0.86, 0.362, 1.52, -1],
    [0.86, 0.362, 1.52, 1],
    [-0.86, 0.362, -1.42, -1],
    [0.86, 0.362, -1.42, 1],
  ];
  for (const [wx, wy, wz, side] of wheelCoords) {
    const w = createMuscleWheel(mats);
    w.position.set(wx, wy, wz);
    if (side < 0) w.rotation.y = Math.PI;
    car.add(w);
  }

  // ---- 8. Additive Headlight & Taillight Ground Pools (drive-1, drive-2) ----
  {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0.0, 'rgba(255, 240, 200, 0.65)');
    gr.addColorStop(0.45, 'rgba(255, 224, 175, 0.24)');
    gr.addColorStop(1.0, 'rgba(255, 210, 150, 0.0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const poolTex = new THREE.CanvasTexture(c);
    poolTex.colorSpace = THREE.SRGBColorSpace;

    const headPool = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 5.8),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    headPool.rotation.x = -Math.PI / 2;
    headPool.position.set(0, 0.015, 5.2);
    car.add(headPool);

    const tailPool = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.2),
      new THREE.MeshBasicMaterial({
        map: poolTex, color: 0xff2244, transparent: true, opacity: 0.65,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    tailPool.rotation.x = -Math.PI / 2;
    tailPool.position.set(0, 0.015, -3.5);
    car.add(tailPool);
  }

  return car;
}

export default buildUte;
