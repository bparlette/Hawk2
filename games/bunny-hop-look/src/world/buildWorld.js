// Bunny Hop — world module (standalone): builds the neighbourhood meshes and
// returns the query surface the game loop / physics consume.
// Interface (fixed): buildWorld(scene) -> {
//   groundAt(x,z)->y,                 // single source of truth for rideable height
//   surfaces: { groundAt, bins },     // surface data bundle
//   colliders: [{minX,maxX,minZ,maxZ,top}],
//   water: { y, contains(x,z), bounds:{minX,maxX,minZ,maxZ} },
//   climbOutAt(x,z) -> {x,z,heading} | null,
//   spawn: { x, z, heading },
// }
import * as THREE from 'three';

export const WATER_Y = -0.55;
const CANAL_HALF = 10;
const DECK_Y = 1.5, DECK_HALF_X = 5.2, DECK_HALF_Z = 12.5, RAMP_END = 20.5;
const BIN_TOP = 1.06;

export function buildWorld(scene) {
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
  const mat = (color, rough = 0.9, metal = 0.0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  function box(w, h, d, material, x = 0, y = 0, z = 0, parent = scene, shadow = true) {
    const m = new THREE.Mesh(BOX, material); m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
  }

  const bins = [];
  const colliders = [];

  /* ---- LOOK PASS: procedural surface textures (canvas, no external assets).
     Flat colours were the biggest "toy" tell; these give asphalt grain +
     patches + cracks, jointed concrete, mottled grass and streaked water. */
  function canvasTex(size, draw) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  function speckle(g, size, n, alpha) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 2.2})`;
      g.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
    }
  }
  function asphaltDraw(g, s) {
    g.fillStyle = '#454a52'; g.fillRect(0, 0, s, s);
    speckle(g, s, 5200, 0.05);
    for (let i = 0; i < 7; i++) { // repair patches
      g.fillStyle = 'rgba(0,0,0,0.10)';
      g.fillRect(Math.random() * (s - 80), Math.random() * (s - 60), 30 + Math.random() * 60, 20 + Math.random() * 40);
    }
    g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 1; // cracks
    for (let i = 0; i < 5; i++) {
      g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 46; y += (Math.random() - 0.5) * 46; g.lineTo(x, y); }
      g.stroke();
    }
  }
  const asphaltTex = canvasTex(256, asphaltDraw); asphaltTex.repeat.set(30, 2);
  const deckTex = canvasTex(256, asphaltDraw); deckTex.repeat.set(2, 5);
  const concTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#918d86'; g.fillRect(0, 0, s, s);
    speckle(g, s, 3800, 0.05);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, 2, s); g.fillRect(0, 0, s, 2); // slab joints (tile edges)
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, s / 2, s, 2);
  }); concTex.repeat.set(56, 1);
  const grassTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#3d5a3c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4200; i++) {
      g.fillStyle = Math.random() < 0.55 ? 'rgba(20,40,18,0.20)' : 'rgba(140,170,90,0.10)';
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    for (let i = 0; i < 8; i++) { // worn dirt flecks
      g.fillStyle = 'rgba(96,78,52,0.12)';
      g.fillRect(Math.random() * (s - 30), Math.random() * (s - 30), 12 + Math.random() * 22, 8 + Math.random() * 14);
    }
  }); grassTex.repeat.set(46, 22);
  const waterTex = canvasTex(256, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, '#2a74a8'); gr.addColorStop(0.5, '#1f6394'); gr.addColorStop(1, '#2a74a8');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 52; i++) { // soft light streaks running along the canal
      g.fillStyle = `rgba(170,215,245,${0.04 + Math.random() * 0.09})`;
      g.fillRect(Math.random() * s * 0.5, Math.random() * s, 30 + Math.random() * 110, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 12; i++) { // warm sun glints
      g.fillStyle = `rgba(255,178,105,${0.06 + Math.random() * 0.09})`;
      g.fillRect(Math.random() * s * 0.6, Math.random() * s, 16 + Math.random() * 46, 1.4);
    }
  }); waterTex.repeat.set(9, 1);

  /* grass — two slabs that STOP at the canal quay walls (outer face z=±10.65).
     A single full-size plane used to run straight over the canal at y=0 and
     hide the water (y=-0.55) beneath it: the canal rendered as dark lawn. */
  {
    const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 });
    for (const s of [1, -1]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(280, 129.35), grassMat);
      g.rotation.x = -Math.PI / 2; g.position.z = s * 75.325;
      g.receiveShadow = true; scene.add(g);
    }
  }
  /* roads + sidewalks */
  const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.94 }), walkMat = new THREE.MeshStandardMaterial({ map: concTex, roughness: 0.95 }), lineMat = mat(0xd8c95a, 0.8);
  function roadEW(zc) {
    box(170, 0.04, 9, roadMat, 0, 0.02, zc, scene, false);
    box(170, 0.05, 0.28, lineMat, 0, 0.045, zc, scene, false);
    box(170, 0.12, 1.3, walkMat, 0, 0.06, zc - 5.15, scene, false);
    box(170, 0.12, 1.3, walkMat, 0, 0.06, zc + 5.15, scene, false);
  }
  roadEW(24); roadEW(-24);
  box(9, 0.04, 120, roadMat, 34, 0.02, 0, scene, false);
  box(0.28, 0.05, 120, lineMat, 34, 0.045, 0, scene, false);

  /* canal: bed, quay walls, shallows, water */
  let waterMat;
  {
    /* bed kept LIGHT blue-teal: seen through the translucent surface it is
       what makes the strip read as water instead of a dark trench */
    box(280, 0.1, 20.4, mat(0x3d7a8c, 1), 0, -1.6, 0, scene, false);
    box(280, 1.8, 0.7, mat(0x5d6066, 1), 0, -0.75, 10.3, scene, false);
    box(280, 1.8, 0.7, mat(0x5d6066, 1), 0, -0.75, -10.3, scene, false);
    const shelfMat = mat(0x51707a, 1);
    for (const s of [1, -1]) {
      const sh = box(280, 0.18, 2.0, shelfMat, 0, -1.06, s * 9.1, scene, false);
      sh.rotation.x = s * 0.42;
    }
    waterMat = new THREE.MeshStandardMaterial({ map: waterTex, transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.05, emissive: 0x0d4a63, emissiveIntensity: 0.9 });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(280, 20.2), waterMat);
    w.rotation.x = -Math.PI / 2; w.position.y = WATER_Y; scene.add(w);
    /* static light streaks floating a hair above the surface — fake the
       dusk glints streetlights/sun would throw, without any animation */
    const streakMat = new THREE.MeshBasicMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.13, depthWrite: false });
    const streaks = [[-88, -3.5, 46, 1.1], [-52, 4.2, 30, 0.7], [-18, -5.8, 38, 0.9], [16, 5.2, 34, 0.8], [48, -4.4, 42, 1.2], [86, 3.4, 36, 0.7], [112, -2.8, 26, 0.9], [-118, 4.8, 30, 0.8]];
    for (const [sx, sz, sl, sw] of streaks) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(sl, sw), streakMat);
      st.rotation.x = -Math.PI / 2; st.position.set(sx, WATER_Y + 0.02, sz); scene.add(st);
    }
  }
  /* bridge: deck, ramps, rails, pillars */
  const deckMat = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.94 }), railMat = mat(0xb8452e, 0.7, 0.25);
  {
    box(DECK_HALF_X * 2, 0.55, DECK_HALF_Z * 2, deckMat, 0, DECK_Y - 0.28, 0);
    for (const s of [1, -1]) {
      const ramp = box(DECK_HALF_X * 2, 0.5, 8.3, deckMat, 0, 0.5, s * 16.5);
      ramp.rotation.x = s * -0.183;
      box(DECK_HALF_X * 2, 0.1, 1.2, walkMat, 0, 0.05, s * 21.1, scene, false);
    }
    for (const s of [1, -1]) {
      box(0.34, 0.52, DECK_HALF_Z * 2, railMat, s * 4.75, DECK_Y + 0.26, 0);
      for (let z = -11; z <= 11; z += 5.5) box(0.4, 0.3, 0.4, railMat, s * 4.75, DECK_Y + 0.62, z);
    }
    for (const px of [-3.4, 3.4]) for (const pz of [-6, 6])
      box(1.1, 3.2, 1.1, mat(0x555a61, 1), px, -0.6, pz, scene, false);
  }
  /* buildings */
  function facadeTexture(base, lit) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = Math.random() < 0.45 ? lit : 'rgba(20,24,38,0.9)';
      g.fillRect(10 + x * 30, 14 + y * 30, 18, 20);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  {
    const mats = [facadeTexture('#4a4258', '#ffd98a'), facadeTexture('#3d4a5c', '#a8d8ff'), facadeTexture('#5c4a3d', '#ffca7a')]
      .map(t => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    const spots = [
      [-26, 44, 16, 15, 13], [6, 46, 20, 17, 11], [30, 44, 14, 12, 15], [-52, 42, 18, 14, 10], [58, 40, 16, 16, 12],
      [-26, -44, 16, 15, 12], [8, -46, 20, 17, 14], [32, -44, 14, 12, 10], [-54, -42, 18, 14, 13], [60, -42, 15, 15, 11],
      [-58, 14, 14, 12, 12], [-58, -14, 14, 12, 10], [64, 12, 15, 13, 13], [64, -16, 15, 13, 11], [-24, 64, 18, 14, 12], [24, -64, 18, 14, 13],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, z, w, d, h] = spots[i];
      const m = new THREE.Mesh(BOX, mats[i % 3]); m.scale.set(w, h, d); m.position.set(x, h / 2, z);
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, top: h });
    }
  }
  /* trash bins: line on the main-street sidewalk + scattered */
  const binBodyMat = mat(0x3f7048, 0.6, 0.35), binLidMat = mat(0x2c4f34, 0.6, 0.35), binBlueMat = mat(0x2e4d7a, 0.6, 0.35);
  function addBin(x, z, blue = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    box(0.95, 0.98, 0.95, blue ? binBlueMat : binBodyMat, 0, 0.55, 0, g);
    box(1.05, 0.12, 1.05, binLidMat, 0, BIN_TOP - 0.03, 0, g);
    box(0.7, 0.05, 0.08, mat(0x222222, 0.7), 0, 0.86, 0.5, g);
    bins.push({ x, z, top: BIN_TOP });
  }
  for (let i = 0; i < 6; i++) addBin(-24 + i * 3.4, 18.75, i % 2 === 1);
  addBin(13.5, 18.75); addBin(24, -18.75, true); addBin(-16, -18.75); addBin(9.5, 15.5, true); addBin(-9.5, -15.5);
  /* streetlights + trees */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,190,110,0.85)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  function streetlight(x, z, armDir = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const pole = new THREE.Mesh(CYL, mat(0x3a3f45, 0.6, 0.5)); pole.scale.set(0.16, 5.2, 0.16); pole.position.y = 2.6; pole.castShadow = true; g.add(pole);
    box(1.4, 0.09, 0.09, mat(0x3a3f45, 0.6, 0.5), armDir * 0.6, 5.15, 0, g);
    const head = box(0.5, 0.1, 0.24, mat(0xffc37a, 0.4), armDir * 1.25, 5.1, 0, g); head.castShadow = false;
    head.material = new THREE.MeshStandardMaterial({ color: 0xffc37a, emissive: 0xffa64d, emissiveIntensity: 2.2 });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(2.5, 2.5, 1); sp.position.set(armDir * 1.25, 5.05, 0); g.add(sp);
    colliders.push({ minX: x - 0.14, maxX: x + 0.14, minZ: z - 0.14, maxZ: z + 0.14, top: 5 });
  }
  for (let x = -72; x <= 72; x += 24) { streetlight(x, 19.55, -1); streetlight(x + 12, 29.1, 1); streetlight(x, -29.1, -1); streetlight(x + 12, -19.55, 1); }
  streetlight(-7.5, 13.8, 1); streetlight(7.5, -13.8, -1);
  function tree(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const tr = new THREE.Mesh(CYL, mat(0x4c3a28, 1)); tr.scale.set(0.34, 1.6, 0.34); tr.position.y = 0.8; tr.castShadow = true; g.add(tr);
    const leafMat = mat(0x2e5231, 1);
    const s1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), leafMat); s1.position.y = 2.6; s1.castShadow = true; g.add(s1);
    const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 0), leafMat); s2.position.set(0.7, 3.4, 0.3); s2.castShadow = true; g.add(s2);
    colliders.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25, top: 4 });
  }
  [[-14, 34], [16, 36], [-40, 10], [48, 20], [-16, -34], [20, -36], [52, -8], [-48, -30], [12, 58], [-30, 58], [44, 58], [-44, 58]].forEach(p => tree(p[0], p[1]));

  /* ================= query surface ================= */
  function groundAt(x, z) {
    let h = 0;
    if (Math.abs(x) < 85) {
      if ((z > 17.55 && z < 19.95) || (z > 28.05 && z < 30.45) || (z > -30.45 && z < -28.05) || (z > -19.95 && z < -17.55)) h = Math.max(h, 0.12);
    }
    if (Math.abs(z) < CANAL_HALF) {
      h = -1.5;
      const az = Math.abs(z);
      if (az > 8.3) h = -1.5 + (az - 8.3) / 1.7 * 0.68;
    }
    if (Math.abs(x) <= DECK_HALF_X) {
      const az = Math.abs(z);
      if (az <= DECK_HALF_Z) h = Math.max(h, DECK_Y);
      else if (az < RAMP_END) h = Math.max(h, DECK_Y * (RAMP_END - az) / (RAMP_END - DECK_HALF_Z));
      if (az <= DECK_HALF_Z && Math.abs(Math.abs(x) - 4.75) < 0.2) h = Math.max(h, DECK_Y + 0.52);
    }
    for (const b of bins) { if (Math.abs(x - b.x) < 0.52 && Math.abs(z - b.z) < 0.52) h = Math.max(h, BIN_TOP); }
    return h;
  }
  const water = {
    y: WATER_Y,
    bounds: { minX: -130, maxX: 130, minZ: -9.6, maxZ: 9.6 },
    contains(x, z) { return Math.abs(z) < CANAL_HALF && !(Math.abs(x) <= DECK_HALF_X && Math.abs(z) <= DECK_HALF_Z); },
  };
  function climbOutAt(x, z) {
    if (Math.abs(z) > 8.15 && Math.abs(z) < CANAL_HALF) {
      const side = z >= 0 ? 1 : -1;
      return { x, z: side * 11.9, heading: side > 0 ? 0 : Math.PI };
    }
    return null;
  }
  return {
    groundAt,
    surfaces: { groundAt, bins },
    colliders,
    bins,
    water,
    climbOutAt,
    spawn: { x: -2, z: 24, heading: Math.PI / 2 },
    waterMat,
  };
}

export default buildWorld;
