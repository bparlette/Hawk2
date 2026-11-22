// APEX WAKE — Lofted PBR Supercharged Watercraft (Realistic Deep-V Hull, Handlebars, Live Dash & Jet Nozzle)
import * as THREE from '../three.module.js';

// ================================================================
// 1. PROCEDURAL MARINE TEXTURES (Gelcoat Livery, Carbon Fiber, EVA Deck, Live Dash)
// ================================================================
function makeCarbonTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#15181d';
  x.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let px = 0; px < 128; px += 8) {
      const alt = ((px + y) / 8) % 2 === 0;
      x.fillStyle = alt ? '#232830' : '#0f1216';
      x.fillRect(px, y, 7, 4);
      x.fillStyle = alt ? '#1b2028' : '#262c36';
      x.fillRect(px, y + 4, 7, 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeEvaDeckTex(accent = '#00e5ff') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#1d2128';
  x.fillRect(0, 0, 256, 256);
  // Diamond groove pattern
  x.strokeStyle = 'rgba(255,255,255,0.08)';
  x.lineWidth = 2;
  for (let i = -256; i < 512; i += 16) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke();
    x.beginPath(); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke();
  }
  // Accent pin-stripe border
  x.strokeStyle = accent;
  x.lineWidth = 6;
  x.strokeRect(8, 8, 240, 240);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeHullLiveryTex(palette) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const x = c.getContext('2d');

  // Base pearl / metallic coat
  const bg = x.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, palette.top);
  bg.addColorStop(0.55, palette.mid);
  bg.addColorStop(1, palette.base);
  x.fillStyle = bg;
  x.fillRect(0, 0, 512, 512);

  // Dynamic racing graphics sweeping bow-to-stern
  x.fillStyle = palette.stripeA;
  x.beginPath();
  x.moveTo(0, 260); x.lineTo(512, 165); x.lineTo(512, 230); x.lineTo(0, 315);
  x.closePath();
  x.fill();

  x.fillStyle = palette.stripeB;
  x.beginPath();
  x.moveTo(0, 325); x.lineTo(512, 242); x.lineTo(512, 268); x.lineTo(0, 344);
  x.closePath();
  x.fill();

  // Carbon-look side intake gills
  x.fillStyle = '#0e1116';
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    x.moveTo(150 + i * 24, 150);
    x.lineTo(164 + i * 24, 150);
    x.lineTo(154 + i * 24, 212);
    x.lineTo(140 + i * 24, 212);
    x.closePath();
    x.fill();
  }

  // Model badge typography
  x.save();
  x.font = 'italic 900 34px system-ui, -apple-system, sans-serif';
  x.fillStyle = palette.badge;
  x.fillText(palette.code, 255, 224);
  x.font = '700 13px ui-monospace, monospace';
  x.fillStyle = 'rgba(255,255,255,0.75)';
  x.fillText('SUPERCHARGED · SVHO', 258, 244);
  x.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function createDashCanvas() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  function draw(mph, rpm01, boost01) {
    x.fillStyle = '#050b12';
    x.fillRect(0, 0, 256, 128);
    // Border glow
    x.strokeStyle = '#18b8d4';
    x.lineWidth = 3;
    x.strokeRect(4, 4, 248, 120);
    // RPM segmented arc bar across top
    for (let i = 0; i < 16; i++) {
      const on = i / 16 < rpm01;
      x.fillStyle = !on ? '#142433' : (i > 12 ? '#ff3b30' : (i > 9 ? '#ffb020' : '#00f0ff'));
      x.fillRect(14 + i * 14.2, 14, 11, 16);
    }
    // Big digital MPH readout
    x.fillStyle = '#eefaff';
    x.font = '900 54px ui-monospace, monospace';
    x.textAlign = 'center';
    x.fillText(String(Math.round(mph)).padStart(2, '0'), 112, 88);
    x.font = '700 16px ui-monospace, monospace';
    x.fillStyle = '#70d8eb';
    x.fillText('MPH', 184, 84);
    // Boost bar bottom
    x.fillStyle = '#112230';
    x.fillRect(14, 102, 228, 12);
    x.fillStyle = boost01 > 0.2 ? '#ff9f1c' : '#18b8d4';
    x.fillRect(14, 102, 228 * Math.max(0, Math.min(1, boost01)), 12);
    tex.needsUpdate = true;
  }
  draw(0, 0.1, 1.0);
  return { tex, draw };
}

// ================================================================
// 2. MULTI-STATION LOFTED DEEP-V HULL + SCULPTED TOP DECK GEOMETRY
//    (+Z = bow forward, -Z = stern, +Y = up)
// ================================================================
function buildLoftedSurface(stations, ringSamples = 18) {
  // Each station: { z, pts: [[x, y], ...] } (half-profile from keel/bottom-center up to deck-center)
  // We mirror left & right seamlessly around X=0
  const verts = [];
  const uvs = [];
  const indices = [];

  // Resample each station to full mirrored ring
  const fullRingCount = (ringSamples - 1) * 2;
  const zMin = stations[0].z;
  const zMax = stations[stations.length - 1].z;

  function sampleHalfProfile(pts, u) {
    const segs = pts.length - 1;
    const f = u * segs;
    const i0 = Math.min(segs - 1, Math.floor(f));
    const t = f - i0;
    return [
      pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * t,
      pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * t,
    ];
  }

  for (let si = 0; si < stations.length; si++) {
    const st = stations[si];
    const vCoord = (st.z - zMin) / Math.max(0.001, zMax - zMin);
    const ring = [];
    // Right side: bottom-center -> chine -> gunwale -> top-center
    for (let k = 0; k < ringSamples; k++) {
      const [px, py] = sampleHalfProfile(st.pts, k / (ringSamples - 1));
      ring.push([px, py, k / (ringSamples - 1) * 0.5]);
    }
    // Left side: top-center -> left gunwale -> left chine -> bottom-center
    for (let k = ringSamples - 2; k >= 1; k--) {
      const [px, py] = sampleHalfProfile(st.pts, k / (ringSamples - 1));
      ring.push([-px, py, 0.5 + (1 - k / (ringSamples - 1)) * 0.5]);
    }
    for (let r = 0; r < fullRingCount; r++) {
      verts.push(ring[r][0], ring[r][1], st.z);
      uvs.push(vCoord, ring[r][2]);
    }
  }

  for (let si = 0; si < stations.length - 1; si++) {
    const row0 = si * fullRingCount;
    const row1 = (si + 1) * fullRingCount;
    for (let r = 0; r < fullRingCount; r++) {
      const next = (r + 1) % fullRingCount;
      indices.push(row0 + r, row0 + next, row1 + r);
      indices.push(row0 + next, row1 + next, row1 + r);
    }
  }

  // Cap stern transom (station 0)
  const sternCenterIdx = verts.length / 3;
  verts.push(0, 0.14, stations[0].z);
  uvs.push(0, 0.5);
  for (let r = 0; r < fullRingCount; r++) {
    const next = (r + 1) % fullRingCount;
    indices.push(sternCenterIdx, next, r);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Lower Deep-V Stepped Hull (keel -> strake -> chine -> rub-rail)
function buildLowerHullGeo() {
  const stations = [
    // Stern transom (z = -1.62)
    { z: -1.62, pts: [[0, -0.22], [0.28, -0.16], [0.54, -0.05], [0.60, 0.09], [0.56, 0.18], [0, 0.18]] },
    { z: -1.15, pts: [[0, -0.24], [0.30, -0.17], [0.57, -0.04], [0.63, 0.11], [0.58, 0.21], [0, 0.21]] },
    { z: -0.55, pts: [[0, -0.25], [0.31, -0.17], [0.58, -0.02], [0.64, 0.14], [0.59, 0.23], [0, 0.23]] },
    { z:  0.10, pts: [[0, -0.24], [0.28, -0.15], [0.55,  0.01], [0.61, 0.18], [0.56, 0.27], [0, 0.27]] },
    { z:  0.72, pts: [[0, -0.18], [0.22, -0.09], [0.46,  0.07], [0.52, 0.24], [0.46, 0.32], [0, 0.32]] },
    { z:  1.24, pts: [[0, -0.05], [0.14,  0.04], [0.30,  0.17], [0.34, 0.31], [0.28, 0.37], [0, 0.37]] },
    { z:  1.62, pts: [[0,  0.14], [0.06,  0.20], [0.12,  0.29], [0.13, 0.36], [0.09, 0.39], [0, 0.39]] },
    { z:  1.80, pts: [[0,  0.29], [0.01,  0.32], [0.02,  0.35], [0.02, 0.38], [0.01, 0.39], [0, 0.39]] },
  ];
  return buildLoftedSurface(stations, 12);
}

// Sculpted Upper Top-Deck & Aero Bow Hood
function buildUpperDeckGeo() {
  const stations = [
    { z: -1.60, pts: [[0, 0.16], [0.55, 0.16], [0.57, 0.28], [0.46, 0.34], [0.24, 0.36], [0, 0.38]] },
    { z: -1.05, pts: [[0, 0.18], [0.58, 0.18], [0.61, 0.31], [0.52, 0.42], [0.28, 0.46], [0, 0.48]] },
    { z: -0.35, pts: [[0, 0.20], [0.60, 0.21], [0.62, 0.35], [0.54, 0.46], [0.30, 0.54], [0, 0.56]] },
    { z:  0.28, pts: [[0, 0.24], [0.57, 0.25], [0.58, 0.40], [0.48, 0.58], [0.26, 0.72], [0, 0.76]] },
    { z:  0.76, pts: [[0, 0.29], [0.48, 0.30], [0.48, 0.44], [0.38, 0.62], [0.20, 0.74], [0, 0.78]] },
    { z:  1.22, pts: [[0, 0.34], [0.32, 0.35], [0.31, 0.45], [0.23, 0.56], [0.11, 0.62], [0, 0.65]] },
    { z:  1.58, pts: [[0, 0.37], [0.13, 0.38], [0.12, 0.44], [0.08, 0.49], [0.04, 0.51], [0, 0.52]] },
    { z:  1.78, pts: [[0, 0.38], [0.01, 0.39], [0.01, 0.40], [0.01, 0.41], [0.01, 0.42], [0, 0.42]] },
  ];
  return buildLoftedSurface(stations, 12);
}

// ================================================================
// 3. LIVERY PRESETS & JET SKI FACTORY
// ================================================================
export const JETSKI_PALETTES = {
  apex: {
    top: '#f4f8fc',
    mid: '#dfe7ef',
    base: '#12171e',
    stripeA: '#00d2e8',
    stripeB: '#ff362e',
    badge: '#ffffff',
    accent: '#00e5ff',
    seatAccent: 0x00d8f0,
    code: 'APEX 1800R',
  },
  solar: {
    top: '#ffd016',
    mid: '#e6a800',
    base: '#14161a',
    stripeA: '#181c22',
    stripeB: '#ff521b',
    badge: '#14161a',
    accent: '#ffd016',
    seatAccent: 0xffc812,
    code: 'RXP-325',
  },
  crimson: {
    top: '#d91e2a',
    mid: '#9e111b',
    base: '#13161c',
    stripeA: '#f2f5f8',
    stripeB: '#00d2e8',
    badge: '#ffffff',
    accent: '#ff3342',
    seatAccent: 0xff3342,
    code: 'WAVE-X',
  },
};

const sharedLowerGeo = buildLowerHullGeo();
const sharedUpperGeo = buildUpperDeckGeo();
let sharedCarbonTex = null;

export function createJetSki(paletteKey = 'apex') {
  const pal = JETSKI_PALETTES[paletteKey] || JETSKI_PALETTES.apex;
  if (!sharedCarbonTex) sharedCarbonTex = makeCarbonTex();

  const root = new THREE.Group();
  root.name = `jetski_${paletteKey}`;

  // High-gloss wet marine gelcoat materials (clearcoat 1.0 reflects the real ocean sky!)
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: 0x161b22,
    roughness: 0.14,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const deckMat = new THREE.MeshPhysicalMaterial({
    map: makeHullLiveryTex(pal),
    roughness: 0.15,
    metalness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const carbonMat = new THREE.MeshPhysicalMaterial({
    map: sharedCarbonTex,
    roughness: 0.26,
    metalness: 0.32,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.82, metalness: 0.08 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.62, metalness: 0.06 });
  const seatTrimMat = new THREE.MeshStandardMaterial({ color: pal.seatAccent, roughness: 0.45, metalness: 0.15 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe6edf2, roughness: 0.12, metalness: 0.94 });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1622,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.55,
    transparent: true,
    opacity: 0.86,
    clearcoat: 1.0,
  });
  const evaMat = new THREE.MeshStandardMaterial({ map: makeEvaDeckTex(pal.accent), roughness: 0.9 });

  // --- Lower Deep-V Hull + Upper Sculpted Deck ---
  const lowerHull = new THREE.Mesh(sharedLowerGeo, hullMat);
  const upperDeck = new THREE.Mesh(sharedUpperGeo, deckMat);
  root.add(lowerHull, upperDeck);

  // Protective rub-rail bumper along perimeter (left & right swept strips)
  for (const side of [-1, 1]) {
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.58, 0.17, -1.58),
      new THREE.Vector3(side * 0.63, 0.21, -0.55),
      new THREE.Vector3(side * 0.60, 0.25,  0.22),
      new THREE.Vector3(side * 0.46, 0.32,  0.86),
      new THREE.Vector3(side * 0.22, 0.38,  1.45),
      new THREE.Vector3(0, 0.39, 1.79),
    ]);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 22, 0.036, 8, false), rubberMat);
    root.add(rail);

    // Side carving sponsons (bolted to rear lower chines)
    const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.72), carbonMat);
    sponson.position.set(side * 0.58, 0.02, -0.95);
    sponson.rotation.z = side * 0.16;
    root.add(sponson);

    // Non-slip EVA footwell mats + rear swim deck pads
    const footMat = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.48), evaMat);
    footMat.rotation.x = -Math.PI / 2;
    footMat.position.set(side * 0.37, 0.355, -0.52);
    root.add(footMat);
  }
  // Rear boarding deck mat
  const rearDeckMat = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.44), evaMat);
  rearDeckMat.rotation.x = -Math.PI / 2;
  rearDeckMat.position.set(0, 0.365, -1.36);
  root.add(rearDeckMat);

  // --- Sculpted Front Cowling, Carbon Hood Spine & Smoked Wind Deflector ---
  const hoodSpine = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.92), carbonMat);
  hoodSpine.position.set(0, 0.68, 1.02);
  hoodSpine.rotation.x = 0.30;
  root.add(hoodSpine);

  // Smoked aerodynamic visor over instrument pod
  const visorGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.44, 16, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.rotation.x = -0.98;
  visor.position.set(0, 0.83, 0.66);
  root.add(visor);

  // Side mirrors integrated into front cowling wings
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.075, 0.16), carbonMat);
    pod.position.set(side * 0.39, 0.69, 0.56);
    pod.rotation.y = side * -0.35;
    pod.rotation.z = side * -0.15;
    root.add(pod);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055), chromeMat);
    glass.position.set(side * 0.39, 0.69, 0.478);
    glass.rotation.y = Math.PI + side * -0.35;
    root.add(glass);
  }

  // Chrome bow tow-hook eye
  const towHook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 14), chromeMat);
  towHook.position.set(0, 0.25, 1.76);
  towHook.rotation.y = Math.PI / 2;
  root.add(towHook);

  // --- 2-Tier Sculpted Racing Bolster Saddle Seat ---
  const seatGroup = new THREE.Group();
  root.add(seatGroup);
  // Main rider cushion
  const mainSeat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.88), seatMat);
  mainSeat.position.set(0, 0.56, -0.22);
  seatGroup.add(mainSeat);
  // Rounded upper saddle crown + smooth sculpted bolster end-caps
  const seatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.19, 0.88, 16), seatMat);
  seatTop.rotation.x = Math.PI / 2;
  seatTop.scale.set(1.0, 1.0, 0.55);
  seatTop.position.set(0, 0.63, -0.22);
  seatGroup.add(seatTop);
  // Racing lumbar bolster + smooth domed rear passenger tail
  const bolster = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.195, 0.48, 16), seatMat);
  bolster.rotation.x = Math.PI / 2;
  bolster.scale.set(1.02, 1.0, 0.62);
  bolster.position.set(0, 0.66, -0.78);
  seatGroup.add(bolster);
  const tailCap = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 10), seatMat);
  tailCap.scale.set(1.02, 0.62, 0.88);
  tailCap.position.set(0, 0.66, -1.02);
  seatGroup.add(tailCap);
  const frontCap = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 10), seatMat);
  frontCap.scale.set(0.98, 0.56, 0.72);
  frontCap.position.set(0, 0.63, 0.22);
  seatGroup.add(frontCap);
  // Colored racing stripe along seat sides
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.035, 1.24), seatTrimMat);
    strip.position.set(side * 0.182, 0.57, -0.45);
    seatGroup.add(strip);
  }
  // Rear passenger grab rail
  const grabBar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 16, Math.PI), chromeMat);
  grabBar.rotation.x = Math.PI / 2;
  grabBar.position.set(0, 0.50, -1.16);
  seatGroup.add(grabBar);

  // --- Live Backlit LCD Instrument Pod ---
  const dash = createDashCanvas();
  const dashPod = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), carbonMat);
  dashPod.position.set(0, 0.82, 0.52);
  dashPod.rotation.x = -0.58;
  root.add(dashPod);
  const dashScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.21, 0.10),
    new THREE.MeshBasicMaterial({ map: dash.tex })
  );
  dashScreen.position.set(0, 0.825, 0.478);
  dashScreen.rotation.x = -0.58;
  dashScreen.rotation.y = Math.PI;
  root.add(dashScreen);

  // --- Articulated Steering Column & Handlebars ---
  const steerPivot = new THREE.Group();
  steerPivot.position.set(0, 0.78, 0.34);
  steerPivot.rotation.x = -0.26;
  root.add(steerPivot);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, 0.18, 12), carbonMat);
  stem.position.y = 0.04;
  steerPivot.add(stem);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.085, 0.075), seatMat);
  pad.position.set(0, 0.14, 0);
  steerPivot.add(pad);

  // Swept aluminum handlebars
  const barCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.36, 0.13, -0.10),
    new THREE.Vector3(-0.20, 0.16, -0.02),
    new THREE.Vector3( 0.00, 0.15,  0.00),
    new THREE.Vector3( 0.20, 0.16, -0.02),
    new THREE.Vector3( 0.36, 0.13, -0.10),
  ]);
  const barMesh = new THREE.Mesh(new THREE.TubeGeometry(barCurve, 20, 0.016, 10, false), chromeMat);
  steerPivot.add(barMesh);

  // Textured rubber grips + rider hand anchor targets
  const gripL = new THREE.Group();
  gripL.position.set(-0.32, 0.136, -0.082);
  steerPivot.add(gripL);
  const gripLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.14, 10), rubberMat);
  gripLMesh.rotation.z = Math.PI / 2;
  gripLMesh.rotation.y = 0.44;
  gripL.add(gripLMesh);

  const gripR = new THREE.Group();
  gripR.position.set(0.32, 0.136, -0.082);
  steerPivot.add(gripR);
  const gripRMesh = gripLMesh.clone();
  gripRMesh.rotation.y = -0.44;
  gripR.add(gripRMesh);

  // Right-hand throttle lever
  const throttle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.024), seatTrimMat);
  throttle.position.set(-0.02, -0.025, 0.032);
  gripR.add(throttle);

  // --- Articulated Rear Jet-Pump Nozzle & Reverse Gate ---
  const pumpHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.22, 14), carbonMat);
  pumpHousing.rotation.x = Math.PI / 2;
  pumpHousing.position.set(0, -0.04, -1.60);
  root.add(pumpHousing);

  const nozzlePivot = new THREE.Group();
  nozzlePivot.position.set(0, -0.04, -1.68);
  root.add(nozzlePivot);
  const nozzleCone = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.095, 0.22, 14, 1, true), chromeMat);
  nozzleCone.rotation.x = Math.PI / 2;
  nozzleCone.position.z = -0.08;
  nozzlePivot.add(nozzleCone);

  // Wake & spray emission anchor points
  const nozzleExit = new THREE.Object3D();
  nozzleExit.position.set(0, 0.0, -0.18);
  nozzlePivot.add(nozzleExit);

  return {
    root,
    parts: { steerPivot, gripL, gripR, nozzlePivot, nozzleExit },
    setControls(steer, throttleVal, mph, rpm01, boost01) {
      steerPivot.rotation.y = steer * 0.42;
      nozzlePivot.rotation.y = -steer * 0.48;
      throttle.rotation.x = throttleVal * 0.35;
      dash.draw(mph, rpm01, boost01);
    },
  };
}
