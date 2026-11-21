// Neon Clothing Bake-Off — Clothing That Lives Like Clothing (not body parts)
// Exact Bunny Hop rider proportions, face, backwards cap & BMX bike from games/bunny-hop/index.html.
// 3 switchable outfit variants with real open-hem separation, mid-upper-arm hollow sleeves,
// open collar around bare neck, cloth drape folds, and zero poke-through across ride/pedal/crouch.
// Pure ESM, imports 'three' only.

import * as THREE from 'three';

function makeFabricTexture(baseHex, weaveHex, mode = 'cotton') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 256, 256);

  if (mode === 'plaid') {
    // Classic flannel plaid pattern
    g.fillStyle = 'rgba(22, 32, 48, 0.55)';
    for (let i = 0; i < 256; i += 64) {
      g.fillRect(i, 0, 22, 256);
      g.fillRect(0, i, 256, 22);
    }
    g.fillStyle = 'rgba(236, 224, 200, 0.32)';
    for (let i = 36; i < 256; i += 64) {
      g.fillRect(i, 0, 4, 256);
      g.fillRect(0, i, 256, 4);
    }
  } else {
    // Fine woven cotton / denim texture + subtle vertical drape shading
    let s = 421;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    g.fillStyle = weaveHex;
    for (let y = 0; y < 256; y += 3) {
      g.globalAlpha = 0.08 + rnd() * 0.06;
      g.fillRect(0, y, 256, 1);
    }
    for (let x = 0; x < 256; x += 4) {
      g.globalAlpha = 0.06 + rnd() * 0.05;
      g.fillRect(x, 0, 1, 256);
    }
    g.globalAlpha = 1.0;
    // Double-stitched bottom hem line
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.fillRect(0, 240, 256, 3);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(0, 243, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Lofted open-bottom draped shirt geometry with real vertical cloth folds, open collar & open flared hem
function createDrapedShirtGeo({
  openFront = false,
  hemDrop = -0.155,
  hemFlare = 0.215,
  chestR = 0.192,
  neckR = 0.095,
  topY = 0.455,
} = {}) {
  const rows = 10;
  const cols = 28;
  const pos = [];
  const uvs = [];
  const idx = [];

  // Angle range: full 360 deg for closed tee, or open front gap for unbuttoned flannel
  const aStart = openFront ? 0.34 : 0.0;
  const aEnd = openFront ? (Math.PI * 2 - 0.34) : Math.PI * 2;

  for (let r = 0; r <= rows; r++) {
    const v = r / rows; // 0 = bottom hem, 1 = collar/shoulder top
    const y = hemDrop + v * (topY - hemDrop);

    // Radius profile: flares gently toward bottom hem so it hangs OFF the pants with an air gap!
    let rx, rz;
    if (v < 0.78) {
      const t = v / 0.78;
      rx = hemFlare - t * (hemFlare - chestR);
      rz = (hemFlare * 0.86) - t * (hemFlare * 0.86 - chestR * 0.78);
    } else {
      const t = (v - 0.78) / 0.22;
      const ease = t * t * (3 - 2 * t);
      rx = chestR * (1 - ease) + neckR * ease;
      rz = (chestR * 0.78) * (1 - ease) + (neckR * 0.92) * ease;
    }

    // Cloth drape wave amplitude strongest at the hanging hem, zero at the collar
    const foldAmp = (1 - v) * (1 - v) * 0.014;
    // Slight backward drape at hem so it hangs cleanly over the seated pelvis without poke-through
    const hemShiftZ = (1 - v) * (1 - v) * -0.022;

    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const a = aStart + u * (aEnd - aStart);
      // Note: a=0 is +Z (front), a=PI is -Z (back)
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);
      const fold = (Math.sin(a * 5.0 + 0.4) * 0.6 + Math.cos(a * 3.0 - 0.8) * 0.4) * foldAmp;
      const x = sinA * (rx + fold);
      const z = cosA * (rz + fold) + hemShiftZ;
      // Subtle scalloped cloth hem
      const yScallop = y + (1 - v) * Math.sin(a * 5.0) * 0.006;
      pos.push(x, yScallop, z);
      uvs.push(u, 1 - v);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = (r + 1) * (cols + 1) + c;
      const d = r * (cols + 1) + (c + 1);
      const e = (r + 1) * (cols + 1) + (c + 1);
      idx.push(a, d, b, b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Open-cuff short sleeve ending MID-UPPER-ARM (~0.165 m of 0.30 m upper arm) with flared cloth cuff!
function createShortSleeveGeo(len = 0.168) {
  const rows = 6, cols = 16;
  const pos = [], uvs = [], idx = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows; // 0 = shoulder top, 1 = open mid-bicep cuff
    const y = 0.03 - v * (len + 0.03);
    // Slightly flared open cuff so bare arm visibly emerges from INSIDE the hollow sleeve
    const rad = 0.078 - v * 0.008 + Math.pow(v, 3) * 0.012;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const a = u * Math.PI * 2;
      const fold = Math.sin(a * 4.0) * v * 0.005;
      pos.push(Math.cos(a) * (rad + fold), y, Math.sin(a) * (rad + fold));
      uvs.push(u, v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = (r + 1) * (cols + 1) + c;
      const d = r * (cols + 1) + (c + 1);
      const e = (r + 1) * (cols + 1) + (c + 1);
      idx.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function tapered(rTop, rBot, len, seg = 12) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  g.translate(0, -len / 2, 0);
  return g;
}

// Exact Bunny Hop head + face + backwards cap from games/bunny-hop/index.html
function buildHead(parent, mats) {
  const headGroup = new THREE.Group();
  parent.add(headGroup);

  // Bare neck rising visibly out of the open shirt collar!
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.11, 14), mats.skin);
  neck.position.set(0, 0.02, 0.0);
  neck.castShadow = true;
  headGroup.add(neck);

  // Cranium, jaw, ears, nose
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.112, 18, 14), mats.skin);
  cranium.scale.set(0.95, 1.06, 1.02);
  cranium.position.set(0, 0.145, 0);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.064, 0.08, 14), mats.skin);
  jaw.scale.set(1, 1, 1.08);
  jaw.position.set(0, 0.075, 0.014);
  headGroup.add(jaw);

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), mats.skin);
    ear.scale.set(0.45, 0.98, 0.72);
    ear.position.set(s * 0.104, 0.13, -0.004);
    headGroup.add(ear);

    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 10, 8), mats.eyeWhite);
    eyeW.scale.set(1, 1.15, 0.55);
    eyeW.position.set(s * 0.041, 0.145, 0.096);
    headGroup.add(eyeW);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 8), mats.hair);
    pupil.position.set(s * 0.041, 0.145, 0.107);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.011, 0.014), mats.hair);
    brow.position.set(s * 0.042, 0.178, 0.10);
    headGroup.add(brow);
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), mats.skin);
  nose.position.set(0, 0.112, 0.108);
  nose.rotation.x = 1.25;
  headGroup.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.013, 0.012), mats.hair);
  mouth.position.set(0, 0.066, 0.096);
  headGroup.add(mouth);

  const hairBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.114, 0.117, 0.085, 14, 1, true, Math.PI * 0.30, Math.PI * 1.40),
    mats.hair
  );
  hairBack.scale.set(0.97, 1, 1.03);
  hairBack.position.set(0, 0.092, -0.004);
  headGroup.add(hairBack);

  // Exact BACKWARDS cap with dark visor + light underbrim + snap strap
  const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.121, 18, 10, 0, Math.PI * 2, 0, 1.35), mats.cap);
  capDome.position.set(0, 0.148, 0);
  capDome.castShadow = true;
  headGroup.add(capDome);

  const capBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.014, 10), mats.cap);
  capBtn.position.set(0, 0.268, 0);
  headGroup.add(capBtn);

  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.026, 0.145), mats.capDark);
  brim.position.set(0, 0.140, -0.150);
  brim.rotation.x = -0.10;
  headGroup.add(brim);

  const underBrim = new THREE.Mesh(new THREE.BoxGeometry(0.188, 0.009, 0.135), mats.shoe);
  underBrim.position.set(0, 0.123, -0.152);
  underBrim.rotation.x = -0.10;
  headGroup.add(underBrim);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.034, 0.016), mats.strap);
  strap.position.set(0, 0.182, -0.104);
  strap.rotation.x = -0.15;
  headGroup.add(strap);
}

// Simplified BMX bike matching Bunny Hop geometry so rider sits in authentic riding/crouch pose
function buildBike(parent, mats) {
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.042, 10, 24);
  wheelGeo.rotateY(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(0.275, 0.014, 8, 20);
  rimGeo.rotateY(Math.PI / 2);

  function addWheel(z) {
    const wg = pivot(parent, 0, 0.36, z);
    const t = new THREE.Mesh(wheelGeo, mats.tire);
    t.castShadow = true;
    wg.add(t);
    wg.add(new THREE.Mesh(rimGeo, mats.chrome));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.10, 10).rotateZ(Math.PI / 2), mats.chrome);
    wg.add(hub);
    return wg;
  }
  const wheelF = addWheel(0.52);
  const wheelR = addWheel(-0.52);

  function tube(a, b, r, mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const d = new THREE.Vector3().subVectors(vb, va);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
    m.position.copy(va).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true;
    parent.add(m);
  }
  tube([0, 0.36, -0.52], [0, 0.42, 0.0], 0.022, mats.frame);
  tube([0, 0.42, 0.0], [0, 0.92, -0.18], 0.026, mats.frame);
  tube([0, 0.42, 0.0], [0, 0.88, 0.40], 0.026, mats.frame);
  tube([0, 0.92, -0.18], [0, 0.90, 0.39], 0.024, mats.frame);
  tube([0, 0.92, -0.18], [0, 0.36, -0.52], 0.018, mats.frame);
  tube([0, 0.96, 0.41], [0, 0.36, 0.52], 0.020, mats.chrome);

  // Seat + handlebars
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.055, 0.25), mats.tire);
  seat.position.set(0, 0.96, -0.20);
  parent.add(seat);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.56, 8).rotateZ(Math.PI / 2), mats.chrome);
  bar.position.set(0, 1.08, 0.44);
  parent.add(bar);

  const crank = pivot(parent, 0, 0.42, 0.0);
  const sprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.016, 16).rotateZ(Math.PI / 2), mats.chrome);
  crank.add(sprocket);
  return { wheelF, wheelR, crank };
}

export const OUTFIT_VARIANTS = [
  {
    id: 1,
    name: '1 · Coastal Heavyweight Tee + Indigo Jeans',
    shirtHex: '#1d6f8a',
    weaveHex: '#134e63',
    shirtMode: 'cotton',
    collarHex: '#185b73',
    cuffHex: null,
    openFront: false,
    pantsHex: '#253854',
    beltHex: '#18181c',
  },
  {
    id: 2,
    name: '2 · Open Flannel over White Tank + Khaki Chinos',
    shirtHex: '#9c2d30',
    weaveHex: '#222e42',
    shirtMode: 'plaid',
    collarHex: '#842226',
    cuffHex: '#7a1f23',
    openFront: true,
    innerTankHex: '#eef1f6',
    pantsHex: '#8c7a5e',
    beltHex: '#3b281c',
  },
  {
    id: 3,
    name: '3 · Vintage Gold Ringer Tee + Olive Cargos',
    shirtHex: '#d9a42e',
    weaveHex: '#b3821c',
    shirtMode: 'cotton',
    collarHex: '#1b263b',   // bold navy ringer collar
    cuffHex: '#1b263b',     // bold navy ringer sleeve cuffs
    openFront: false,
    pantsHex: '#3c4a38',
    beltHex: '#1e1f22',
  },
];

export function buildRiderScene(variantIdx = 0) {
  const v = OUTFIT_VARIANTS[variantIdx] || OUTFIT_VARIANTS[0];
  const root = new THREE.Group();

  const shirtTex = makeFabricTexture(v.shirtHex, v.weaveHex, v.shirtMode);
  const pantsTex = makeFabricTexture(v.pantsHex, '#111620', 'cotton');

  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.78 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1e1814, roughness: 0.92 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.4 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x24304f, roughness: 0.85 }),
    capDark: new THREE.MeshStandardMaterial({ color: 0x182238, roughness: 0.85 }),
    strap: new THREE.MeshStandardMaterial({ color: 0x30363f, roughness: 0.8 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.68 }),
    shirt: new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.90, side: THREE.DoubleSide }),
    collar: new THREE.MeshStandardMaterial({ color: v.collarHex, roughness: 0.88 }),
    cuff: new THREE.MeshStandardMaterial({ color: v.cuffHex || v.shirtHex, roughness: 0.88, side: THREE.DoubleSide }),
    shadowInside: new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 1.0, side: THREE.DoubleSide }),
    innerTank: new THREE.MeshStandardMaterial({ color: v.innerTankHex || 0xeef1f6, roughness: 0.88 }),
    pants: new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.92, side: THREE.DoubleSide }),
    belt: new THREE.MeshStandardMaterial({ color: v.beltHex, roughness: 0.65 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xd8323e, roughness: 0.25, metalness: 0.6 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.2, metalness: 0.88 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.92 }),
  };

  const bike = buildBike(root, mats);

  // ---- RIDER RIG (matching live index.html pivots & dimensions) ----
  const riderRig = pivot(root, 0, 0, 0);

  // Pelvis / trouser seat + distinct waistband & belt (visible in the shadow gap under the hanging shirt hem!)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.142, 16, 12), mats.pants);
  pelvis.scale.set(1.06, 0.72, 1.04);
  pelvis.position.set(0, 1.02, -0.19);
  pelvis.castShadow = true;
  riderRig.add(pelvis);

  const waistband = new THREE.Mesh(new THREE.CylinderGeometry(0.150, 0.154, 0.055, 16), mats.belt);
  waistband.scale.set(1.04, 1, 0.86);
  waistband.position.set(0, 1.095, -0.19);
  riderRig.add(waistband);

  // Spine pivot
  const spineJ = pivot(riderRig, 0, 1.05, -0.19);

  // Inner slim body torso (or white inner tank for Variant 2 open flannel) so open collar & open front show real depth!
  const innerChest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.120, 0.40, 14),
    v.openFront ? mats.innerTank : mats.skin
  );
  innerChest.scale.set(1.06, 1, 0.78);
  innerChest.position.set(0, 0.19, 0.0);
  spineJ.add(innerChest);

  // ---- CLOTHING #1: DRAPED OPEN-BOTTOM SHIRT WITH VISIBLE HEM SHADOW GAP ----
  const shirtGeo = createDrapedShirtGeo({ openFront: v.openFront });
  const shirtMesh = new THREE.Mesh(shirtGeo, mats.shirt);
  shirtMesh.castShadow = true;
  shirtMesh.receiveShadow = true;
  spineJ.add(shirtMesh);

  // ---- CLOTHING #2: TRUE OPEN COLLAR RING AROUND BARE NECK ----
  if (v.openFront) {
    // Folded flannel shirt collar flaps framing the bare neck + white tank
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.11), mats.collar);
      lapel.position.set(s * 0.088, 0.455, 0.035);
      lapel.rotation.set(0.25, s * 0.35, -s * 0.42);
      spineJ.add(lapel);
    }
    const backCollar = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.018, 8, 18, Math.PI * 1.15), mats.collar);
    backCollar.rotation.set(Math.PI / 2, 0, Math.PI * 0.92);
    backCollar.position.set(0, 0.462, -0.005);
    spineJ.add(backCollar);
  } else {
    // Ribbed crew-neck collar ring standing cleanly around the bare neck (visible skin inside!)
    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.017, 10, 22), mats.collar);
    collarRing.rotation.x = Math.PI / 2 + 0.14;
    collarRing.position.set(0, 0.456, 0.010);
    spineJ.add(collarRing);
  }

  // Head & backwards cap
  const neckJ = pivot(spineJ, 0, 0.465, 0.012);
  buildHead(neckJ, mats);

  // ---- CLOTHING #3: SHORT HOLLOW SLEEVES ENDING MID-UPPER-ARM + BARE ARMS EMERGING ----
  const sleeveGeo = createShortSleeveGeo(0.168);
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = pivot(spineJ, side * 0.185, 0.375, 0.01);
    const el = pivot(sh, 0, -0.30, 0);

    // Dropped cloth shoulder cap + hollow short sleeve ending mid-bicep (y = -0.168)
    const shCap = new THREE.Mesh(new THREE.SphereGeometry(0.077, 14, 10), mats.shirt);
    shCap.scale.set(1.0, 0.88, 1.0);
    shCap.position.set(0, 0.0, 0);
    shCap.castShadow = true;
    sh.add(shCap);

    const sleeve = new THREE.Mesh(sleeveGeo, mats.shirt);
    sleeve.castShadow = true;
    sh.add(sleeve);

    // Distinct cuff band (contrast navy on Variant 3 ringer tee, stitched hem on 1 & 2)
    const cuffBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.084, 0.024, 16, 1, true),
      mats.cuff
    );
    cuffBand.position.set(0, -0.164, 0);
    sh.add(cuffBand);

    // Dark shadow cavity inside open sleeve cuff -> proves sleeve is hollow cloth around a real arm!
    const cuffShadow = new THREE.Mesh(
      new THREE.RingGeometry(0.044, 0.081, 16).rotateX(Math.PI / 2),
      mats.shadowInside
    );
    cuffShadow.position.set(0, -0.174, 0);
    sh.add(cuffShadow);

    // BARE SKIN upper arm visibly emerging below the mid-bicep sleeve cuff down to elbow!
    const bareUpper = new THREE.Mesh(tapered(0.044, 0.039, 0.17), mats.skin);
    bareUpper.position.set(0, -0.135, 0);
    bareUpper.castShadow = true;
    sh.add(bareUpper);

    // Bare elbow + forearm + hand
    const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.039, 10, 8), mats.skin);
    el.add(elbowBall);
    const forearm = new THREE.Mesh(tapered(0.038, 0.031, 0.25), mats.skin);
    forearm.castShadow = true;
    el.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), mats.skin);
    hand.scale.set(0.85, 1.05, 1.2);
    hand.position.set(0, -0.275, 0.01);
    el.add(hand);

    arms.push({ sh, el, side });
  }

  // ---- LOOSE FULL-LENGTH PANTS WITH ANKLE CUFFS OVER SNEAKERS ----
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = pivot(riderRig, side * 0.10, 1.03, -0.18);
    const knee = pivot(hip, 0, -0.40, 0);
    const ank = pivot(knee, 0, -0.40, 0);

    const thigh = new THREE.Mesh(tapered(0.088, 0.072, 0.42), mats.pants);
    thigh.castShadow = true;
    hip.add(thigh);
    const kneeCloth = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), mats.pants);
    knee.add(kneeCloth);
    const shin = new THREE.Mesh(tapered(0.072, 0.064, 0.37), mats.pants);
    shin.castShadow = true;
    knee.add(shin);

    // Open trouser ankle cuff with dark shadow rim above the sneaker
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.068, 0.03, 14, 1, true), mats.pants);
    cuff.position.set(0, -0.365, 0);
    knee.add(cuff);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.22), mats.shoe);
    shoe.position.set(0, -0.02, 0.045);
    shoe.castShadow = true;
    ank.add(shoe);

    legs.push({ hip, knee, ank, side });
  }

  // Pose updater supporting riding, pedalling, and full crouch (crouch01 = 0..0.95) with zero poke-through
  function setPose(crouch01 = 0, pedalPhase = 0) {
    riderRig.position.set(0, -crouch01 * 0.15, -crouch01 * 0.10);
    spineJ.rotation.x = 0.46 + crouch01 * 0.36;
    neckJ.rotation.x = -0.26 - crouch01 * 0.24;

    for (const a of arms) {
      a.sh.rotation.x = -1.04 - crouch01 * 0.14;
      a.sh.rotation.z = a.side * (0.08 + crouch01 * 0.05);
      a.el.rotation.x = -0.56 - crouch01 * 0.14;
    }

    bike.crank.rotation.x = -pedalPhase;
    for (let i = 0; i < legs.length; i++) {
      const ph = pedalPhase + i * Math.PI;
      legs[i].hip.rotation.x = -0.52 - crouch01 * 0.22 + Math.sin(ph) * 0.46;
      legs[i].knee.rotation.x = 0.78 + crouch01 * 0.25 + Math.cos(ph) * 0.36;
      legs[i].ank.rotation.x = -0.22;
    }
  }

  setPose(0, 0.4);
  return { root, setPose, bike, variant: v };
}

export default buildRiderScene;
