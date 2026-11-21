// Neon Bake-Off #2 — Brad's 1987 Chevrolet Camaro (Third-Gen IROC-Z, clean-sheet)
// Reference: games/bunny-hop/reference/brad-real/ (front34.jpg, side.jpg, rear34.jpg, detail-wheel.jpg)
// Canon: 4.88 m x 1.83 m; WHITE from windshield forward fading lengthwise to DEEP MAROON behind windshield;
//        YELLOW headlights, beam & road pool.
// Pure ESM, imports 'three' only.

import * as THREE from 'three';

const WHITE_COL = new THREE.Color(0xf2f4f8);
const MAROON_COL = new THREE.Color(0x6c111b); // rich deep metallic maroon matching brad-real photos
// Brad's fleet beam colour — deep saturated amber-yellow (games/shared/gpvehicles.js, 425d2878)
const BEAM_COLOR = 0xffb800;

// Apply Brad's exact front-to-back lengthwise paint fade to any BufferGeometry in car-local space:
// z >= 0.44 (windshield base forward) -> pure WHITE; z <= -0.02 (roof & rear) -> DEEP MAROON
function applyBradFade(geo) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    // Smoothstep across the windshield base (z = 0.46 down to z = -0.04)
    let t = (0.46 - z) / (0.46 - (-0.04));
    t = Math.max(0, Math.min(1, t));
    t = t * t * (3 - 2 * t);
    c.copy(WHITE_COL).lerp(MAROON_COL, t);
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

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
      if (flipWinding) idx.push(a, d, b, b, d, c);
      else idx.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Sculpted third-gen Camaro side body panel with wedge nose, circular wheel arches & ground-effects skirt
function createCamaroSide(side) {
  // Exact spec: 4.88 m long (z = -2.44 .. +2.44), 1.83 m wide (halfW ≈ 0.915)
  // Front wheel: z = +1.38, y = 0.33, archR = 0.375
  // Rear wheel:  z = -1.24, y = 0.33, archR = 0.375
  const wfZ = 1.38, wrZ = -1.24, wY = 0.33, archR = 0.378;

  // Low wedge beltline (side.jpg): rises gently toward rear haunch, drops sharply to low wedge nose
  function beltY(z) {
    if (z > 1.76) return 0.7247 - (z - 1.76) * 0.145; // ahead of the front arch the fender crown dives with the hood into the nose tip (side.jpg)
    if (z > 0.45) return 0.84 - (z - 0.45) * 0.088; // sleek downward wedge toward nose (0.84 -> 0.665)
    if (z > -1.35) return 0.84 + Math.sin(((0.45 - z) / 1.8) * Math.PI * 0.65) * 0.042;
    return 0.878 - (-1.35 - z) * 0.015;
  }

  function halfW(z) {
    let w = 0.91;
    if (z > 1.70) {
      const t = (z - 1.70) / 0.74;
      w -= t * t * 0.105; // tapered third-gen nose (front34.jpg) — kept wide enough to meet the bumper wrap
    } else if (z < -1.65) {
      const t = (-1.65 - z) / 0.79;
      w -= t * t * 0.085;
    }
    const df = Math.abs(z - wfZ);
    const dr = Math.abs(z - wrZ);
    if (df < 0.50) w += Math.cos((df / 0.50) * Math.PI * 0.5) * 0.026;
    if (dr < 0.54) w += Math.cos((dr / 0.54) * Math.PI * 0.5) * 0.036;
    return w;
  }

  // Ground-effects lower skirt (y = 0.185) arching cleanly over both wheels
  function botY(z) {
    let y = 0.185;
    if (z < -1.85) y += (-1.85 - z) * 0.16; // rear bumper upsweep (rear34.jpg)
    const df = Math.abs(z - wfZ);
    if (df < archR) y = Math.max(y, wY + Math.sqrt(Math.max(0, archR * archR - df * df)));
    const dr = Math.abs(z - wrZ);
    if (dr < archR) y = Math.max(y, wY + Math.sqrt(Math.max(0, archR * archR - dr * dr)));
    return y;
  }

  const zs = [];
  for (let z = -2.42; z <= 2.42; z += 0.13) zs.push(+z.toFixed(3));
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

  const rings = [];
  for (const z of uniqZ) {
    const y0 = botY(z);
    const yTop = beltY(z);
    const hw = halfW(z);
    const span = Math.max(0.08, yTop - y0);
    // Crisp third-gen body crease + flared lower IROC-Z ground-effects skirt
    rings.push([
      [side * (hw - 0.055), y0, z],
      [side * (hw + 0.012), y0 + span * 0.24, z],            // lower ground-effects flare
      [side * (hw + 0.020), y0 + span * 0.56, z],            // crisp mid-body character line
      [side * (hw + 0.005), y0 + span * 0.78, z],
      [side * (hw - 0.038), yTop - 0.015, z],                // taut shoulder
      [side * (hw - 0.100), yTop + 0.010, z],                // fender crown
      [side * (hw - 0.160), yTop - 0.015, z],                // inner return
    ]);
  }
  return applyBradFade(buildLoft(rings, false, side > 0));
}

// Long low sloping third-gen Camaro hood with V-swept racing leading edge (front.jpg, front34.jpg)
function createCamaroHood() {
  const zs = [0.44, 0.78, 1.16, 1.56, 1.94, 2.22, 2.38, 2.46];
  const xs = [-0.82, -0.64, -0.44, -0.26, -0.10, 0.0, 0.10, 0.26, 0.44, 0.64, 0.82];
  const rings = [];
  for (const z0 of zs) {
    const tFront = Math.max(0, (z0 - 1.50) / (2.46 - 1.50));
    const taper = 1.0 - tFront * tFront * 0.13;
    const ring = [];
    for (const x0 of xs) {
      const x = x0 * taper;
      const ax = Math.abs(x0);
      // Real '87 Camaro V-sweep: centerline extends ~9 cm further forward than fender corners
      const vSweep = -ax * ax * 0.13 * (tFront * tFront);
      const z = z0 + vSweep;
      // One continuous shallow descent — the last half metre rolls over smoothly
      // into the tip instead of dropping off a cliff (side.jpg nose profile)
      const tipRoll = z0 > 1.90 ? Math.pow((z0 - 1.90) / 0.56, 2) * 0.085 : 0;
      const baseY = 0.84 - (z0 - 0.44) * 0.092 - tipRoll;
      // Sleek racing crown + faint center crease (real IROC hood is near-flat, front.jpg)
      let y = baseY + Math.cos((ax / 0.86) * Math.PI * 0.5) * 0.048;
      if (ax < 0.34 && z0 < 2.28) {
        y += Math.cos((ax / 0.34) * Math.PI * 0.5) * 0.012;
      }
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }
  return applyBradFade(buildLoft(rings, false, false));
}

// Sculpted V-swept racing front nose cone + wraparound bumper + flared chin air dam (front.jpg, front34.jpg)
function createFrontNoseFascia() {
  // Continuous loft from below headlight pockets down to the flared racing chin spoiler lip
  // Profile rows restacked to the real face (front.jpg): bumper ridge is the foremost
  // plane, grille band recessed, air dam deep and near-vertical with its lip tucked
  // just BEHIND the bumper plane — no forward chin kick.
  const profile = [
    [0.470, 2.42, 0.99],  // top edge tucking under the headlight pockets
    [0.430, 2.48, 1.00],  // protruding rounded front bumper ridge — foremost plane of the face
    [0.360, 2.455, 0.99], // recessed lower grille band
    [0.280, 2.44, 0.985], // black+silver rub stripe level
    [0.200, 2.45, 0.99],  // deep near-vertical IROC-Z air dam face
    [0.130, 2.44, 0.99],  // low chin lip, behind the bumper plane (front34.jpg)
    [0.120, 2.33, 0.95],  // underside tuck
  ];
  const cols = 16;
  const rings = [];
  for (const [y, zCenter, wScale] of profile) {
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1; // -1 .. +1
      const au = Math.abs(u);
      const x = u * 0.83 * wScale;
      // Modest plan-view point: corners sit ~16 cm behind the center (front.jpg)
      const z = zCenter - au * au * 0.105 - Math.pow(au, 4) * 0.055;
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }
  return applyBradFade(buildLoft(rings, false, true));
}

// Sloped pointed center nose bridge between the two recessed headlight buckets (front.jpg)
function createCenterNoseBridge() {
  const profile = [
    [0.648, 2.44, 0.25],  // meets V-swept hood leading edge
    [0.575, 2.47, 0.27],  // forward-canting pointed bridge face
    [0.455, 2.43, 0.30],  // blends seamlessly into bumper ridge
  ];
  const cols = 8;
  const rings = [];
  for (const [y, zCenter, halfW] of profile) {
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1;
      const x = u * halfW;
      const z = zCenter - u * u * 0.032; // crisp center point
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }
  // Winding NOT flipped: with flip=true this sheet's normals point -z (into the car),
  // so the FrontSide paint material backface-culls it from the front and the nose
  // center renders see-through to the maroon rear fascia. Verified by raycast probe.
  return applyBradFade(buildLoft(rings, false, false));
}

// Smooth curved rear bumper fascia wrapping cleanly into rear quarters (rear.jpg, rear34.jpg)
function createRearBumperFascia() {
  const profile = [
    [0.615, -2.41, 0.99],  // just below taillight cluster
    [0.565, -2.47, 1.00],  // rounded horizontal rear bumper ridge (rear.jpg)
    [0.470, -2.45, 0.99],  // mid rear fascia
    [0.375, -2.42, 0.98],  // tucked lower rear valance
    [0.305, -2.32, 0.95],  // underside tuck
  ];
  const cols = 14;
  const rings = [];
  for (const [y, zCenter, wScale] of profile) {
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1;
      const au = Math.abs(u);
      const x = u * 0.84 * wScale;
      const z = zCenter + Math.pow(au, 3) * 0.14; // wraps forward into rear quarter panels
      ring.push([x, y, z]);
    }
    rings.push(ring);
  }
  return applyBradFade(buildLoft(rings, false, false));
}

// Smooth integrated wraparound third-gen ducktail spoiler (rear.jpg, rear34.jpg, side.jpg)
function createDucktailSpoiler() {
  const profile = [
    [0.865, -2.14, 0.84],  // flush base meeting rear hatch deck
    [0.910, -2.26, 0.845], // upward ducktail sweep
    [0.942, -2.39, 0.835], // crisp trailing spoiler lip
    [0.892, -2.41, 0.835], // vertical rear lip face above taillights
    [0.835, -2.37, 0.835], // underside lip return
  ];
  const cols = 14;
  const rings = [];
  for (const [y, zCenter, halfW] of profile) {
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1;
      const au = Math.abs(u);
      const x = u * halfW;
      const z = zCenter + Math.pow(au, 3) * 0.10;
      const yCurve = y - au * au * 0.015;
      ring.push([x, yCurve, z]);
    }
    rings.push(ring);
  }
  return applyBradFade(buildLoft(rings, false, true));
}

// Curved flush windshield matching A-pillar tumblehome & gentle forward bow (zero overhang)
function createWindshieldGeo() {
  const rows = 6, cols = 8;
  const rings = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows; // 0 = cowl bottom (z=0.56, y=0.845), 1 = roof header (z=0.14, y=1.245)
    const zBase = 0.56 - t * 0.42;
    const yBase = 0.845 + t * 0.400;
    const halfW = 0.77 - t * 0.145;
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1; // -1 .. +1
      const x = u * halfW;
      const bowZ = (1 - u * u) * (0.065 - t * 0.02);
      const crownY = (1 - u * u) * 0.022;
      ring.push([x, yBase + crownY, zBase + bowZ]);
    }
    rings.push(ring);
  }
  return buildLoft(rings, false, false);
}

// Exact-fit trapezoidal side door window following cabin tumblehome (never overlaps A/B pillars or body)
function createSideWindowGeo(side) {
  // 4 corners strictly inside A-pillar, roof rail, B-pillar leading edge, and door beltline
  const rows = 4, cols = 4;
  const rings = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows; // 0 = beltline (y=0.845), 1 = roof rail (y=1.235)
    const y = 0.845 + t * 0.390;
    const zFront = 0.54 - t * 0.39;   // matches A-pillar rake exactly
    const zBack = -0.52 + t * 0.04;   // matches B-pillar forward cant
    const x = side * (0.785 - t * 0.155); // follows inward tumblehome
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const z = zFront + u * (zBack - zFront);
      const bulge = Math.sin(u * Math.PI) * Math.sin(t * Math.PI) * 0.014;
      ring.push([x + side * bulge, y, z]);
    }
    rings.push(ring);
  }
  return buildLoft(rings, false, side > 0);
}

// Smooth crowned lofted roof panel (z = +0.14 .. -0.54) seamlessly meeting windshield & rear hatch
function createRoofGeo() {
  const zs = [0.14, -0.02, -0.20, -0.38, -0.54];
  const cols = 8;
  const rings = [];
  for (const z of zs) {
    const t = (0.14 - z) / (0.14 - (-0.54));
    const halfW = 0.625 + Math.sin(t * Math.PI) * 0.018;
    const yEdge = 1.242 + Math.sin(t * Math.PI) * 0.012;
    const ring = [];
    for (let c = 0; c <= cols; c++) {
      const u = (c / cols) * 2 - 1;
      const x = u * halfW;
      const crown = (1 - u * u) * 0.032;
      ring.push([x, yEdge + crown, z]);
    }
    rings.push(ring);
  }
  return applyBradFade(buildLoft(rings, false, true));
}

// Smooth curved B-pillar / sail hoop blending seamlessly from roof corner into rear quarter shoulder (rear34.jpg)
function createBPillarGeo(side) {
  const steps = 8;
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = beltline shoulder (y=0.855), 1 = roof corner (y=1.245)
    const y = 0.855 + t * 0.390;
    const xOut = side * (0.835 - (3 * t * t - 2 * t * t * t) * 0.210);
    const xIn = side * (0.765 - (3 * t * t - 2 * t * t * t) * 0.175);
    // Wider curved base flowing into the quarter panel, tapering smoothly up to the roof rail
    const zLead = -0.52 + t * 0.04;
    const zTrail = -0.82 + Math.pow(t, 0.72) * 0.28;
    rings.push([
      [xOut, y, zLead],
      [xOut, y, zTrail],
      [xIn, y, zTrail],
      [xIn, y, zLead],
    ]);
  }
  return applyBradFade(buildLoft(rings, true, side < 0));
}

// Giant curved wraparound rear glass hatchback tucked cleanly inside B-pillars & rear quarters (side.jpg, rear34.jpg)
function createRearHatchGlass() {
  const steps = 12;
  const rings = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = -0.53 - t * 1.62;
    const yCenter = 1.258 - Math.pow(t, 1.06) * 0.375;
    // Matches roof width at top (0.61) and flares smoothly to sit flush inside rear quarters (0.76)
    const halfW = 0.605 + Math.sin(t * Math.PI * 0.65) * 0.165;
    const ring = [];
    for (let j = 0; j <= 10; j++) {
      const u = (j / 10) * 2 - 1;
      const x = u * halfW;
      const drop = u * u * (0.042 + (1 - t) * 0.048);
      ring.push([x, yCenter - drop, z]);
    }
    rings.push(ring);
  }
  return buildLoft(rings, false, true);
}

// Authentic 1987 IROC-Z 5-spoke dual-line alloy wheel (detail-wheel.jpg!)
function createIrocWheel(mats) {
  const g = new THREE.Group();

  // Low-profile radial tire (LatheGeometry)
  const tirePts = [
    new THREE.Vector2(0.215, -0.115),
    new THREE.Vector2(0.305, -0.125),
    new THREE.Vector2(0.330, -0.092),
    new THREE.Vector2(0.336, 0.0),
    new THREE.Vector2(0.330, 0.092),
    new THREE.Vector2(0.305, 0.125),
    new THREE.Vector2(0.215, 0.115),
  ];
  const tireGeo = new THREE.LatheGeometry(tirePts, 28);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, mats.tire);
  tire.castShadow = true;
  g.add(tire);

  // Machined silver outer alloy rim lip
  const rimPts = [
    new THREE.Vector2(0.180, 0.02),
    new THREE.Vector2(0.218, 0.112),
    new THREE.Vector2(0.228, 0.116),
    new THREE.Vector2(0.228, 0.096),
    new THREE.Vector2(0.205, 0.088),
    new THREE.Vector2(0.180, 0.015),
  ];
  const rimGeo = new THREE.LatheGeometry(rimPts, 24);
  rimGeo.rotateZ(Math.PI / 2);
  g.add(new THREE.Mesh(rimGeo, mats.alloy));

  // Gunmetal recessed inner barrel (shows between the 5 spokes, detail-wheel.jpg)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.198, 0.198, 0.12, 20), mats.wheelAccent);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.02;
  g.add(barrel);

  // 5 broad IROC-Z spokes, each with the signature dark center groove stripe (detail-wheel.jpg!)
  const spokeOuter = new THREE.BoxGeometry(0.024, 0.165, 0.068);
  const spokeGroove = new THREE.BoxGeometry(0.027, 0.155, 0.018);
  const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.03, 6).rotateZ(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(spokeOuter, mats.alloy);
    sp.position.set(0.086, Math.cos(a) * 0.112, Math.sin(a) * 0.112);
    sp.rotation.x = a;
    g.add(sp);

    const gr = new THREE.Mesh(spokeGroove, mats.wheelAccent);
    gr.position.set(0.087, Math.cos(a) * 0.112, Math.sin(a) * 0.112);
    gr.rotation.x = a;
    g.add(gr);

    const lug = new THREE.Mesh(lugGeo, mats.darkTrim);
    lug.position.set(0.098, Math.cos(a + 0.628) * 0.052, Math.sin(a + 0.628) * 0.052);
    g.add(lug);
  }

  // Black IROC-Z center cap (detail-wheel.jpg)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.040, 0.04, 16), mats.darkTrim);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 0.096;
  g.add(cap);

  return g;
}

export function buildCamaro(skipBody = false) {
  const car = new THREE.Group();
  car.name = 'Brad87Camaro';

  const mats = {
    // Vertex-colored clearcoat paint: seamless lengthwise WHITE -> DEEP MAROON fade!
    paint: new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0.44,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.65,
    }),
    darkTrim: new THREE.MeshStandardMaterial({ color: 0x16181e, roughness: 0.55, metalness: 0.35 }),
    silverPin: new THREE.MeshStandardMaterial({ color: 0xd6dce4, roughness: 0.3, metalness: 0.7 }),
    alloy: new THREE.MeshStandardMaterial({ color: 0xdce2ea, metalness: 0.85, roughness: 0.18, envMapIntensity: 1.5 }),
    wheelAccent: new THREE.MeshStandardMaterial({ color: 0x3b404a, metalness: 0.55, roughness: 0.42 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.88 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x0b1420,
      metalness: 0.22,
      roughness: 0.04,
      transparent: true,
      opacity: 0.58,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.0,
      side: THREE.DoubleSide,
    }),
    // Darker tinted rear hatch glass so the glass silhouette & car shape read clearly
    glassRear: new THREE.MeshPhysicalMaterial({
      color: 0x060a12,
      metalness: 0.28,
      roughness: 0.04,
      transparent: true,
      opacity: 0.84,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.2,
      side: THREE.DoubleSide,
    }),
    interior: new THREE.MeshStandardMaterial({ color: 0x20222a, roughness: 0.88 }),
    // LOCKED CANON: Brad's YELLOW headlights — the fleet beam treatment shipped in
    // games/shared/gpvehicles.js (425d2878): beam 0xffb800, lens face = beam colour
    // lerped 0.2 toward white, emissive = beam colour at intensity 3.4.
    yellowHeadlight: new THREE.MeshStandardMaterial({
      color: new THREE.Color(BEAM_COLOR).lerp(new THREE.Color(0xffffff), 0.2),
      emissive: BEAM_COLOR, emissiveIntensity: 3.4, roughness: 0.12,
    }),
    amberSignal: new THREE.MeshStandardMaterial({
      color: 0xff9820, emissive: 0xff7a10, emissiveIntensity: 2.0, roughness: 0.25,
    }),
    tailRed: new THREE.MeshStandardMaterial({
      color: 0xd61e2a, emissive: 0xff1a2b, emissiveIntensity: 3.2, roughness: 0.18,
    }),
    tailWhite: new THREE.MeshStandardMaterial({
      color: 0xeef2f8, emissive: 0xdce6f5, emissiveIntensity: 1.2, roughness: 0.25,
    }),
    plate: new THREE.MeshStandardMaterial({
      color: 0xf7f5ec, emissive: 0xffeec8, emissiveIntensity: 1.8, roughness: 0.35,
    }),
    driverShirt: new THREE.MeshStandardMaterial({ color: 0x2e3b4e, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc28a62, roughness: 0.72 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.9 }),
  };

  function addPaintedBox(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d, 2, 1, 6);
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    applyBradFade(g);
    const m = new THREE.Mesh(g, mats.paint);
    m.castShadow = true;
    m.receiveShadow = true;
    car.add(m);
    return m;
  }

  // ---- 1 & 2. Sculpted Flanks + Hood (skipped when Blender SubD GLB supplies the body shell) ----
  if (!skipBody) {
    for (const s of [-1, 1]) {
      const panel = new THREE.Mesh(createCamaroSide(s), mats.paint);
      panel.castShadow = true;
      panel.receiveShadow = true;
      car.add(panel);
    }
    const hood = new THREE.Mesh(createCamaroHood(), mats.paint);
    hood.castShadow = true;
    hood.receiveShadow = true;
    car.add(hood);
  }

  // Twin dark hood louvers (front34.jpg)
  for (const s of [-1, 1]) {
    const louver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.44), mats.darkTrim);
    // Procedural hood surface at this spot is ~0.825 — seat the insert ON it (it was
    // buried ~2 cm under the surface and invisible); the SubD shell keeps its seat.
    louver.position.set(s * 0.32, skipBody ? 0.805 : 0.829, 1.05);
    louver.rotation.x = 0.095;
    car.add(louver);
  }

  // ---- 3. Sculpted V-Swept Racing Front Nose, Recessed Quad Headlight Buckets (YELLOW!), Flared Chin Air Dam ----
  {
    if (!skipBody) {
      const noseFascia = new THREE.Mesh(createFrontNoseFascia(), mats.paint);
      noseFascia.castShadow = true;
      noseFascia.receiveShadow = true;
      car.add(noseFascia);

      const centerBridge = new THREE.Mesh(createCenterNoseBridge(), mats.paint);
      centerBridge.castShadow = true;
      car.add(centerBridge);
    }

    // Center black grille slot in the lower band (front.jpg) — fog lamps live INSIDE
    // it at each end, plate in the middle; it is a slot in the fascia, not a slab on it
    const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.15, 0.08), mats.darkTrim);
    lowerGrille.position.set(0, 0.345, 2.395);
    car.add(lowerGrille);

    // Black headlight pockets spanning nearly the full face width (front.jpg):
    // inner edge ~±0.24, outer ~±0.84, band ~0.17 tall, lamp faces set just inside
    // the pocket mouth (~3 mm) instead of buried 20 cm behind the nose.
    for (const s of [-1, 1]) {
      const pocket = new THREE.Group();
      pocket.position.set(s * 0.54, 0.555, 2.335);
      pocket.rotation.y = -s * 0.16; // follows the wraparound corner curve
      const bucket = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.17, 0.16), mats.darkTrim);
      pocket.add(bucket);
      for (const hxOff of [-0.148, 0.148]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.125, 0.03), mats.yellowHeadlight);
        lamp.position.set(hxOff, 0, 0.062);
        pocket.add(lamp);
      }
      car.add(pocket);
      // Fog lamp inside the grille slot (front.jpg)
      const fog = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.085, 0.025), mats.tailWhite);
      fog.position.set(s * 0.27, 0.345, 2.42);
      car.add(fog);
      // Outboard turn-signal / park lamp rectangle in the bumper face (front.jpg)
      const sig = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.085, 0.03), mats.amberSignal);
      sig.position.set(s * 0.635, 0.36, 2.375);
      sig.rotation.y = -s * 0.16;
      car.add(sig);
      // Front amber side marker (side.jpg, detail-wheel.jpg)
      const fMarker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.042, 0.15), mats.amberSignal);
      fMarker.position.set(s * 0.87, 0.47, 2.02);
      car.add(fMarker);
    }

    // Perimeter black + silver ground-effects stripe following the side skirts (side.jpg)
    for (const s of [-1, 1]) {
      const sStripeB = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.032, 4.30), mats.darkTrim);
      sStripeB.position.set(s * 0.916, 0.30, -0.02);
      car.add(sStripeB);
      const sStripeS = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 4.30), mats.silverPin);
      sStripeS.position.set(s * 0.917, 0.318, -0.02);
      car.add(sStripeS);
      const rub = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 2.05), mats.darkTrim);
      rub.position.set(s * 0.930, 0.56, 0.05);
      car.add(rub);
    }
  }

  // ---- 4. Smooth Crowned Roof, Seamless B-Pillars, Flush Windshield & Dark-Tinted Glass Hatch ----
  {
    if (!skipBody) {
      const roofMesh = new THREE.Mesh(createRoofGeo(), mats.paint);
      roofMesh.castShadow = true;
      roofMesh.receiveShadow = true;
      car.add(roofMesh);
    }

    const tCenter = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.68), mats.darkTrim);
    tCenter.position.set(0, 1.278, -0.20);
    car.add(tCenter);

    // Steeply raked A-pillars & smooth curved B-pillar hoops
    for (const s of [-1, 1]) {
      const pA = new THREE.Vector3(s * 0.785, 0.845, 0.56);
      const pB = new THREE.Vector3(s * 0.625, 1.245, 0.14);
      const dir = new THREE.Vector3().subVectors(pB, pA);
      const aGeo = new THREE.CylinderGeometry(0.022, 0.028, dir.length(), 8);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      aGeo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      aGeo.translate((pA.x + pB.x) * 0.5, (pA.y + pB.y) * 0.5, (pA.z + pB.z) * 0.5);
      applyBradFade(aGeo);
      car.add(new THREE.Mesh(aGeo, mats.paint));

      if (!skipBody) {
        const bPillar = new THREE.Mesh(createBPillarGeo(s), mats.paint);
        bPillar.castShadow = true;
        bPillar.receiveShadow = true;
        car.add(bPillar);
      }

      // Sport aero side mirror (front34.jpg, side.jpg) + black door handle
      addPaintedBox(0.11, 0.068, 0.13, s * 0.88, 0.865, 0.32);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.028, 0.13), mats.darkTrim);
      handle.position.set(s * 0.915, 0.77, -0.44);
      car.add(handle);

      // Exact-fit trapezoidal side door window (zero overhang!)
      car.add(new THREE.Mesh(createSideWindowGeo(s), mats.glass));
    }

    // Curved flush windshield matching A-pillars & roof header
    car.add(new THREE.Mesh(createWindshieldGeo(), mats.glass));

    // Giant wraparound curved glass hatchback (darker tinted so shape reads clearly!)
    car.add(new THREE.Mesh(createRearHatchGlass(), mats.glassRear));
  }

  // ---- 5. Smooth Curved Rear Bumper, Wraparound Ducktail Spoiler & Multi-Grid Taillights (rear.jpg!) ----
  {
    if (!skipBody) {
      const rearBumper = new THREE.Mesh(createRearBumperFascia(), mats.paint);
      rearBumper.castShadow = true;
      rearBumper.receiveShadow = true;
      car.add(rearBumper);

      const spoiler = new THREE.Mesh(createDucktailSpoiler(), mats.paint);
      spoiler.castShadow = true;
      spoiler.receiveShadow = true;
      car.add(spoiler);
    }

    // High-mount 3rd brake light strip under spoiler lip
    const chmsl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 0.03), mats.tailRed);
    chmsl.position.set(0, 0.925, -2.41);
    car.add(chmsl);

    // Iconic multi-grid third-gen taillight cluster (red outer + amber turn + white reverse + black grid, rear.jpg)
    const tailBg = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.21, 0.06), mats.darkTrim);
    tailBg.position.set(0, 0.72, -2.38);
    car.add(tailBg);

    for (const s of [-1, 1]) {
      const redOut = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.165, 0.03), mats.tailRed);
      redOut.position.set(s * 0.58, 0.72, -2.41);
      car.add(redOut);
      const amb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.165, 0.03), mats.amberSignal);
      amb.position.set(s * 0.33, 0.72, -2.41);
      car.add(amb);
      const rev = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.165, 0.03), mats.tailWhite);
      rev.position.set(s * 0.19, 0.72, -2.41);
      car.add(rev);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.015, 0.036), mats.darkTrim);
      hBar.position.set(s * 0.44, 0.72, -2.415);
      car.add(hBar);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.03), mats.plate);
    plate.position.set(0, 0.71, -2.405);
    car.add(plate);
  }

  // ---- 6. Underbody, Cabin Interior & Seated Driver (Brad) ----
  {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 4.46), mats.darkTrim);
    chassis.position.set(0, 0.24, 0.0);
    car.add(chassis);

    // Interior floor, rear hatch shelf, twin bucket seats, dash & steering wheel
    const hatchShelf = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 1.38), mats.interior);
    hatchShelf.position.set(0, 0.74, -1.36);
    car.add(hatchShelf);
    for (const s of [-1, 1]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.44), mats.interior);
      seat.position.set(s * 0.34, 0.64, -0.22);
      car.add(seat);
    }
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.24, 0.34), mats.interior);
    dash.position.set(0, 0.76, 0.34);
    car.add(dash);
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.015, 8, 20), mats.darkTrim);
    wheelRing.position.set(0.34, 0.80, 0.14);
    wheelRing.rotation.x = 0.42;
    car.add(wheelRing);

    // Seated Brad silhouette inside cabin
    const brad = new THREE.Group();
    brad.position.set(0.34, 0.50, -0.18);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.40, 10), mats.driverShirt);
    torso.scale.set(1.15, 1, 0.76);
    torso.position.set(0, 0.26, -0.02);
    torso.rotation.x = -0.16;
    brad.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.098, 12, 10), mats.skin);
    head.position.set(0, 0.56, 0.0);
    brad.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.102, 12, 8, 0, Math.PI * 2, 0, 1.75), mats.hair);
    hair.position.set(0, 0.58, -0.01);
    brad.add(hair);
    car.add(brad);
  }

  // ---- 7. Four Authentic '87 IROC-Z 5-Spoke Alloy Wheels ----
  const wheelCoords = [
    [-0.82, 0.336, 1.38, -1],
    [0.82, 0.336, 1.38, 1],
    [-0.82, 0.336, -1.24, -1],
    [0.82, 0.336, -1.24, 1],
  ];
  for (const [wx, wy, wz, side] of wheelCoords) {
    const w = createIrocWheel(mats);
    w.position.set(wx, wy, wz);
    if (side < 0) w.rotation.y = Math.PI;
    car.add(w);
  }

  // ---- 8. LOCKED CANON: Brad's YELLOW Headlight Beam & Road Pool ----
  // The fleet beam treatment from games/shared/gpvehicles.js (425d2878), applied
  // verbatim: a white radial glow texture tinted by the material colour; front
  // halo cards at the lamp clusters (beam colour lerped 0.1 toward white,
  // opacity 0.95, FrontSide-only so nothing bleeds through from behind); the
  // road pool tinted with the pure beam colour at opacity 0.34.
  {
    // White radial glow sprite (same stops as gpvehicles glowTexture())
    const gt = (() => {
      const gc = document.createElement('canvas'); gc.width = gc.height = 128;
      const gg = gc.getContext('2d');
      const ggr = gg.createRadialGradient(64, 64, 2, 64, 64, 64);
      ggr.addColorStop(0, 'rgba(255,255,255,1)');
      ggr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      ggr.addColorStop(1, 'rgba(255,255,255,0)');
      gg.fillStyle = ggr; gg.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(gc);
    })();

    const beam = new THREE.Color(BEAM_COLOR);

    // Front halo cards at the quad lamp clusters, angled with the V-swept nose
    // — FrontSide only, so the rear view keeps exactly the presentation it had.
    const haloMat = new THREE.MeshBasicMaterial({
      color: beam.clone().lerp(new THREE.Color(0xffffff), 0.1), map: gt,
      transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.FrontSide, fog: false,
    });
    for (const s of [-1, 1]) {
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
      halo.position.set(s * 0.54, 0.555, 2.46);
      halo.rotation.y = -s * 0.16;
      halo.scale.set(0.8, 0.4, 1);
      halo.renderOrder = 3;
      car.add(halo);
    }

    // Long forward road pool tinted with the beam colour (matches fleet.json
    // light overlay extending well ahead of the nose)
    const beamPool = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 7.6),
      new THREE.MeshBasicMaterial({ color: beam, map: gt, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    beamPool.rotation.x = -Math.PI / 2;
    beamPool.position.set(0, 0.016, 5.6);
    beamPool.renderOrder = 2;
    car.add(beamPool);

    // Yellow radial texture for the rear glow below (unchanged)
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0.0, 'rgba(255, 232, 68, 0.82)');
    gr.addColorStop(0.42, 'rgba(255, 212, 36, 0.36)');
    gr.addColorStop(1.0, 'rgba(255, 196, 16, 0.0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const yellowTex = new THREE.CanvasTexture(c);
    yellowTex.colorSpace = THREE.SRGBColorSpace;

    // Subtle red rear taillight ground glow
    const tailPool = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.0),
      new THREE.MeshBasicMaterial({
        map: yellowTex, color: 0xff2233, transparent: true, opacity: 0.55,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    tailPool.rotation.x = -Math.PI / 2;
    tailPool.position.set(0, 0.016, -3.3);
    car.add(tailPool);
  }

  return car;
}

export default buildCamaro;
