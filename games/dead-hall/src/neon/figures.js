// Dead Hall — Neon Pinned Figure Specs, Articulated Procedural Rigs & Motion Engine
// Originals only. Every figure has numerically pinned proportions and a distinct silhouette
// designed to read unmistakably at 390px wide in near-darkness — both still and in motion.
import * as THREE from '../../three.module.js';
import { createNeonTextureBank } from './textures.js';

// ================================================================
// 1. PINNED NUMERICAL FIGURE SPECIFICATIONS (Rooms 1–11 + 2 Decoys)
//    Room 12 (yellow room) is intentionally EMPTY — no figure.
// ================================================================
export const FIGURE_SPECS = {
  twins: {
    id: 'twins',
    room: 1,
    label: 'Hallway Twins (Pair)',
    role: 'fake',
    totalHeight: 1.12,
    shoulderWidth: 0.28,       // per child; pair span = 1.06 m
    hipWidth: 0.24,
    stanceWidth: 0.16,
    pairSpacing: 0.62,
    headRadius: 0.105,
    headRatio: 0.188,          // child head-to-body ratio (~1:5.3)
    torsoLength: 0.36,
    armLength: 0.42,
    legLength: 0.48,
    neckLength: 0.05,
    defaultMotion: 'idle',
    silhouette: 'Two short symmetrical child bell-silhouettes bridged hand-in-hand at waist height with bobbed hair and flared pleated skirts.',
  },
  doorway_woman: {
    id: 'doorway_woman',
    room: 2,
    label: 'Doorway Woman',
    role: 'fake',
    totalHeight: 1.68,
    shoulderWidth: 0.35,
    hipWidth: 0.31,
    stanceWidth: 0.17,
    headRadius: 0.115,
    headRatio: 0.137,
    torsoLength: 0.54,
    armLength: 0.64,
    legLength: 0.84,
    neckLength: 0.09,
    defaultMotion: 'idle',
    silhouette: 'Razor-narrow vertical shroud column under a single pool of light, pale oval face framed by straight dark hair, arms pinned dead-still at sides.',
  },
  exit_charger: {
    id: 'exit_charger',
    room: 3,
    label: 'EXIT Corridor Charger',
    role: 'live',
    totalHeight: 2.08,
    shoulderWidth: 0.68,
    hipWidth: 0.46,
    stanceWidth: 0.42,
    headRadius: 0.135,
    headRatio: 0.130,
    torsoLength: 0.72,
    armLength: 0.84,
    legLength: 0.98,
    neckLength: 0.07,
    defaultMotion: 'lunge',
    silhouette: 'Heavy top-loaded wedge of hunched 0.68 m coat shoulders and forward-pitched bull neck backlit under the EXIT sign.',
  },
  crawler: {
    id: 'crawler',
    room: 4,
    label: 'Night-Vision All-Fours Crawler',
    role: 'live',
    totalHeight: 0.78,         // quadrupedal height on all fours (uncoiled body length 1.72 m)
    uncoiledLength: 1.72,
    shoulderWidth: 0.46,
    hipWidth: 0.36,
    stanceWidth: 0.62,         // wide splayed spider-like elbow/knee footprint
    headRadius: 0.12,
    headRatio: 0.140,
    torsoLength: 0.64,
    armLength: 0.78,
    legLength: 0.82,
    neckLength: 0.10,
    defaultMotion: 'crawl',
    silhouette: 'Low 0.78 m spider-wide all-fours silhouette with concave arched spine, high reversed-angle elbows, and upturned eyes catching night-vision green.',
  },
  corner_figure: {
    id: 'corner_figure',
    room: 5,
    label: 'Corner Overcoat Figure',
    role: 'live',
    totalHeight: 1.78,
    shoulderWidth: 0.48,
    hipWidth: 0.38,
    stanceWidth: 0.24,
    headRadius: 0.12,
    headRatio: 0.135,
    torsoLength: 0.60,
    armLength: 0.70,
    legLength: 0.86,
    neckLength: 0.07,
    defaultMotion: 'lunge',
    silhouette: 'Slumped heavy-overcoat pillar facing away into a room corner with bowed head and flared trenchcoat hem that whips around to lunge.',
  },
  hatch_crawler: {
    id: 'hatch_crawler',
    room: 6,
    label: 'Floor-Hatch Long-Haired Crawler',
    role: 'live',
    totalHeight: 1.02,         // emerging height above floor hatch (full body 1.64 m)
    uncoiledLength: 1.64,
    shoulderWidth: 0.38,
    hipWidth: 0.32,
    stanceWidth: 0.44,
    headRadius: 0.115,
    headRatio: 0.140,
    torsoLength: 0.56,
    armLength: 0.72,
    legLength: 0.78,
    neckLength: 0.08,
    defaultMotion: 'hatch_emerge',
    silhouette: 'Half-emerged slender torso hauling out of a floor hatch beneath a thick forward-draping curtain of black hair and splayed reaching hands.',
  },
  mascot: {
    id: 'mascot',
    room: 7,
    label: 'Broken Carnival Mascot',
    role: 'live',
    totalHeight: 1.98,
    shoulderWidth: 0.64,
    hipWidth: 0.54,
    stanceWidth: 0.40,
    headRadius: 0.31,          // oversized mascot head (0.62 m tall = ~31% of body height!)
    headRatio: 0.313,
    torsoLength: 0.68,
    armLength: 0.76,
    legLength: 0.78,
    neckLength: 0.04,
    defaultMotion: 'sprint',
    silhouette: 'Barrel-chested broken plush mascot dominated by a massive 0.62 m head, one tall drooping ear, one snapped bent ear, protruding snout, and clacking hinged jaw.',
  },
  doorway_eyes: {
    id: 'doorway_eyes',
    room: 8,
    label: 'Doorway Void (Two Pale Eyes)',
    role: 'live',
    totalHeight: 1.86,
    shoulderWidth: 0.50,
    hipWidth: 0.38,
    stanceWidth: 0.28,
    headRadius: 0.13,
    headRatio: 0.140,
    torsoLength: 0.64,
    armLength: 0.74,
    legLength: 0.90,
    neckLength: 0.07,
    defaultMotion: 'idle',
    silhouette: 'Pitch-black matte silhouette squaring off an open doorway with zero surface detail except two piercing pale-white pinpoint eyes.',
  },
  tall_figure: {
    id: 'tall_figure',
    room: 9,
    label: 'Ceiling-Scraping Lanky Figure',
    role: 'live',
    totalHeight: 2.95,
    shoulderWidth: 0.36,       // ultra-narrow relative to 2.95 m height!
    hipWidth: 0.28,
    stanceWidth: 0.30,
    headRadius: 0.115,
    headRatio: 0.078,          // tiny elongated head at ceiling height
    torsoLength: 0.96,
    armLength: 1.34,           // spider-long arms hanging past knees
    legLength: 1.56,
    neckLength: 0.20,
    defaultMotion: 'unfold',
    silhouette: 'Impossibly tall 2.95 m needle-thin silhouette whose tiny head grazes the ceiling while 1.34 m arms hang below its knees and unfold into a slow lunge.',
  },
  eye_shadow: {
    id: 'eye_shadow',
    room: 10,
    label: 'Eye-Corridor Shadow Runner',
    role: 'live',
    totalHeight: 2.22,
    shoulderWidth: 0.52,
    hipWidth: 0.34,
    stanceWidth: 0.36,
    headRadius: 0.15,
    headRatio: 0.135,
    torsoLength: 0.74,
    armLength: 0.90,
    legLength: 1.10,
    neckLength: 0.09,
    defaultMotion: 'sprint',
    silhouette: 'Pitch-black athletic void sprinter with tapering shoulder wisps and a single huge luminous white cyclops eye locked on the lens.',
  },
  mannequin: {
    id: 'mannequin',
    room: 11,
    label: 'Spring-Necked Mannequin',
    role: 'live',
    totalHeight: 1.82,
    shoulderWidth: 0.44,
    hipWidth: 0.34,
    stanceWidth: 0.28,
    headRadius: 0.115,
    headRatio: 0.126,
    torsoLength: 0.56,
    armLength: 0.68,
    legLength: 0.84,
    neckLength: 0.22,          // exposed 5-coil steel spring neck!
    defaultMotion: 'flicker_step',
    silhouette: 'Pale cracked-porcelain mannequin with visible ball-joint spheres and a long 0.22 m coiled steel spring neck holding a blank head cocked 28 degrees.',
  },
  decoy_guard: {
    id: 'decoy_guard',
    room: 4,
    label: 'Dazed Security Guard (DON\'T-STAB Decoy)',
    role: 'decoy',
    totalHeight: 1.78,
    shoulderWidth: 0.46,
    hipWidth: 0.36,
    stanceWidth: 0.30,
    headRadius: 0.12,
    headRatio: 0.135,
    torsoLength: 0.58,
    armLength: 0.68,
    legLength: 0.88,
    neckLength: 0.07,
    defaultMotion: 'decoy_flee',
    silhouette: 'Normal human guard in navy uniform, peaked cap, gleaming brass badge, raised trembling hands, and an active handheld flashlight beam.',
  },
  decoy_worker: {
    id: 'decoy_worker',
    room: 8,
    label: 'Panicked Maintenance Worker (DON\'T-STAB Decoy)',
    role: 'decoy',
    totalHeight: 1.74,
    shoulderWidth: 0.45,
    hipWidth: 0.36,
    stanceWidth: 0.30,
    headRadius: 0.12,
    headRatio: 0.138,
    torsoLength: 0.56,
    armLength: 0.66,
    legLength: 0.86,
    neckLength: 0.07,
    defaultMotion: 'decoy_flee',
    silhouette: 'Normal human worker in yellow hardhat and high-vis orange vest with bright reflective chest stripes, raised trembling hands, and an active flashlight.',
  },
};

export const FIGURE_IDS = Object.keys(FIGURE_SPECS);

// ================================================================
// 2. SHARED UNIT GEOMETRIES (minimizes GPU buffer allocations)
// ================================================================
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 14, 12);
const UNIT_CONE = new THREE.CylinderGeometry(0.32, 0.5, 1, 12);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

function meshBox(w, h, d, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(UNIT_BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function meshCyl(rTop, rBot, len, mat, parent, x = 0, y = 0, z = 0) {
  const geo = Math.abs(rTop - rBot) < 0.004 ? UNIT_CYL : new THREE.CylinderGeometry(rTop, rBot, len, 10);
  const m = new THREE.Mesh(geo, mat);
  if (geo === UNIT_CYL) m.scale.set(rTop * 2, len, rTop * 2);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function meshSphere(rx, ry, rz, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(UNIT_SPHERE, mat);
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function makeGlowSprite(color, scale, opacity) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: t,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  s.scale.set(scale, scale, 1);
  return s;
}

// ================================================================
// 3. ARTICULATED RIG BUILDER (respects every pinned FIGURE_SPECS value)
// ================================================================
function buildSingleHumanoid(spec, bank, opts = {}) {
  const g = new THREE.Group();
  const {
    shoulderWidth: sw,
    hipWidth: hw,
    stanceWidth: stw,
    headRadius: hr,
    torsoLength: tl,
    armLength: al,
    legLength: ll,
    neckLength: nl,
  } = spec;

  const skinMat = opts.skinMat || bank.skin('pale', '#b9afa2', 41);
  const clothMat = opts.clothMat || bank.dress('dark', '#2b2d30', 31, false);
  const hairMat = bank.getMat('hairDark', () => new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 0.98 }));
  const jointMat = opts.jointMat || clothMat;
  const limbThin = opts.limbScale || 1.0;

  // Root pelvis at hip height so legs hang down to y=0 cleanly
  const pelvis = new THREE.Group();
  pelvis.position.set(0, ll, 0);
  g.add(pelvis);

  // --- Legs (upper thigh + articulated knee + shin + foot) ---
  const thighLen = ll * 0.50;
  const shinLen = ll * 0.50;
  const legR = Math.max(0.032, hw * 0.16 * limbThin);

  function mkLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * (stw * 0.44), 0, 0);
    pelvis.add(hip);
    const legMat = opts.bareLegs ? skinMat : clothMat;
    // Hip socket cap prevents gap on extreme crawl/sprint poses
    meshSphere(legR * 1.12, legR * 1.12, legR * 1.12, legMat, hip, 0, 0, 0);
    meshCyl(legR * 1.12, legR * 0.88, thighLen, legMat, hip, 0, -thighLen * 0.5, 0);

    const knee = new THREE.Group();
    knee.position.set(0, -thighLen, 0);
    hip.add(knee);
    if (opts.ballJoints) {
      meshSphere(legR * 1.1, legR * 1.1, legR * 1.1, jointMat, knee, 0, 0, 0);
    }
    meshCyl(legR * 0.85, legR * 0.68, shinLen, legMat, knee, 0, -shinLen * 0.5, 0);
    // Foot
    meshBox(legR * 1.8, 0.055, legR * 3.1, opts.footMat || clothMat, knee, 0, -shinLen + 0.028, legR * 0.6);
    return { hip, knee };
  }
  const L = mkLeg(-1);
  const R = mkLeg(1);

  // --- Torso (pelvis + sculpted upper chest / dress / coat) ---
  const torsoG = new THREE.Group();
  pelvis.add(torsoG);

  const depth = opts.torsoDepth || Math.max(0.16, sw * 0.46);
  if (opts.dress === 'bell') {
    // Flared child bell dress (Twins)
    const skirtH = ll * 0.72 + tl * 0.35;
    const skirt = meshCyl(hw * 0.48, opts.skirtBottom || hw * 1.18, skirtH, clothMat, torsoG, 0, -ll * 0.72 + skirtH * 0.5, 0);
    skirt.scale.z = 0.85;
    meshBox(sw * 0.88, tl * 0.65, depth * 0.88, clothMat, torsoG, 0, tl * 0.66, 0);
    // Pale Peter-Pan collar + waist sash for high-contrast phone readability
    const trimMat = bank.getMat('twinCollar', () => new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.85 }));
    meshBox(sw * 0.78, 0.045, depth * 0.94, trimMat, torsoG, 0, tl * 0.95, 0);
    meshBox(hw * 0.96, 0.05, depth * 0.96, trimMat, torsoG, 0, tl * 0.22, 0);
  } else if (opts.dress === 'shroud') {
    // Floor-sweeping narrow shroud column (Doorway Woman / Hatch)
    const shroudH = ll * 0.96 + tl * 0.55;
    meshCyl(sw * 0.40, opts.skirtBottom || hw * 0.76, shroudH, clothMat, torsoG, 0, -ll * 0.96 + shroudH * 0.5, 0);
    meshBox(sw * 0.86, tl * 0.52, depth * 0.85, clothMat, torsoG, 0, tl * 0.74, 0);
  } else if (opts.coat) {
    // Heavy overcoat / trenchcoat silhouette (EXIT Charger / Corner Figure)
    meshCyl(sw * 0.46, hw * 0.68, ll * 0.58 + tl * 0.35, clothMat, torsoG, 0, -ll * 0.58 + (ll * 0.58 + tl * 0.35) * 0.5, 0);
    meshBox(sw * 0.96, tl * 0.74, depth * 1.12, clothMat, torsoG, 0, tl * 0.64, 0);
    // Broad shoulder pads / coat lapels
    meshSphere(sw * 0.52, tl * 0.24, depth * 0.62, clothMat, torsoG, 0, tl * 0.90, 0);
  } else if (opts.barrel) {
    // Bulky barrel plush torso (Broken Mascot)
    meshSphere(sw * 0.50, tl * 0.58, depth * 0.72, clothMat, torsoG, 0, tl * 0.50, 0);
    // Belly patch
    const bellyMat = bank.getMat('mascotBelly', () => new THREE.MeshStandardMaterial({ color: 0x9b8668, roughness: 0.96 }));
    meshSphere(sw * 0.34, tl * 0.38, depth * 0.22, bellyMat, torsoG, 0, tl * 0.46, depth * 0.56);
  } else {
    // Tapered anatomical torso (Crawler, Tall, Eye Shadow, Mannequin, Decoys)
    meshCyl(sw * 0.44, hw * 0.42, tl * 0.96, clothMat, torsoG, 0, tl * 0.50, 0);
    meshBox(sw * 0.88, tl * 0.42, depth * 0.88, clothMat, torsoG, 0, tl * 0.76, 0);
  }

  // Decoy high-vis reflective stripes or guard badge
  if (opts.hivis) {
    const stripeMat = bank.getMat('hivisStripe', () => new THREE.MeshStandardMaterial({
      color: 0xe6ece2,
      emissive: 0x7b8c6e,
      emissiveIntensity: 0.75,
      roughness: 0.35,
      metalness: 0.3,
    }));
    meshBox(sw * 0.94, 0.055, depth * 0.96, stripeMat, torsoG, 0, tl * 0.42, 0);
    meshBox(sw * 0.94, 0.055, depth * 0.96, stripeMat, torsoG, 0, tl * 0.68, 0);
  }
  if (opts.badge) {
    const badgeMat = bank.getMat('guardBadge', () => new THREE.MeshStandardMaterial({
      color: 0xf0c954,
      emissive: 0x8a6b18,
      emissiveIntensity: 0.95,
      metalness: 0.85,
      roughness: 0.25,
    }));
    meshBox(0.068, 0.088, 0.016, badgeMat, torsoG, sw * 0.22, tl * 0.76, depth * 0.48);
    // Shoulder epaulettes
    meshBox(sw * 0.22, 0.025, depth * 0.42, badgeMat, torsoG, -sw * 0.38, tl * 0.97, 0);
    meshBox(sw * 0.22, 0.025, depth * 0.42, badgeMat, torsoG, sw * 0.38, tl * 0.97, 0);
  }

  // Shadow tendrils for Eye-Corridor Shadow Runner
  if (opts.shadowWisps) {
    for (const sx of [-1, 1]) {
      const wisp = meshCyl(0.01, 0.075, tl * 0.75, clothMat, torsoG, sx * sw * 0.56, tl * 0.86, -0.06);
      wisp.rotation.z = sx * -0.42;
      wisp.rotation.x = -0.35;
    }
  }

  // --- Arms (shoulder + upper arm + articulated elbow + forearm + hand/claw) ---
  const upperArmLen = al * 0.48;
  const foreArmLen = al * 0.52;
  const armR = Math.max(0.024, sw * 0.095 * limbThin);

  function mkArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * (sw * 0.48), tl * 0.90, 0);
    torsoG.add(arm);
    // Shoulder cap keeps upper arm anchored cleanly at extreme angles
    meshSphere(armR * (opts.ballJoints ? 1.25 : 1.12), armR * (opts.ballJoints ? 1.25 : 1.12), armR * (opts.ballJoints ? 1.25 : 1.12), opts.ballJoints ? jointMat : clothMat, arm, 0, 0, 0);
    meshCyl(armR * 1.05, armR * 0.88, upperArmLen, clothMat, arm, 0, -upperArmLen * 0.5, 0);

    const fore = new THREE.Group();
    fore.position.set(0, -upperArmLen, 0);
    arm.add(fore);
    if (opts.ballJoints) {
      meshSphere(armR * 1.05, armR * 1.05, armR * 1.05, jointMat, fore, 0, 0, 0);
    }
    const foreMat = opts.sleevedForearm ? clothMat : skinMat;
    meshCyl(armR * 0.85, armR * 0.68, foreArmLen, foreMat, fore, 0, -foreArmLen * 0.5, 0);

    // Hand (mittens for mascot, long claws for crawler/tall/hatch, open palms for decoys)
    const handMat = opts.handMat || skinMat;
    if (opts.mittenHands) {
      meshSphere(armR * 1.85, armR * 2.1, armR * 1.5, clothMat, fore, 0, -foreArmLen - armR * 1.1, 0.02);
    } else if (opts.clawHands) {
      meshBox(armR * 2.1, 0.11, 0.032, handMat, fore, 0, -foreArmLen - 0.055, 0.01);
      for (const fx of [-0.028, 0, 0.028]) {
        const cl = meshCyl(0.008, 0.003, 0.11, handMat, fore, fx, -foreArmLen - 0.14, 0.025);
        cl.rotation.x = 0.28;
      }
    } else {
      meshBox(armR * 2.0, 0.11, 0.035, handMat, fore, 0, -foreArmLen - 0.055, 0.01);
    }
    return { arm, fore };
  }
  const AL = mkArm(-1);
  const AR = mkArm(1);

  // --- Neck & Head ---
  const neckG = new THREE.Group();
  neckG.position.set(0, tl, 0);
  torsoG.add(neckG);

  let neckSpring = null;
  if (opts.springNeck) {
    // Exposed 5-coil tilted steel spring neck (Mannequin)
    const coilMat = bank.getMat('springSteel', () => new THREE.MeshStandardMaterial({
      color: 0x585c62,
      roughness: 0.38,
      metalness: 0.82,
    }));
    neckSpring = new THREE.Group();
    neckG.add(neckSpring);
    const torusGeo = new THREE.TorusGeometry(0.052, 0.012, 7, 16);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(torusGeo, coilMat);
      ring.rotation.x = Math.PI / 2 + 0.08 * (i % 2 ? 1 : -1);
      ring.position.y = 0.025 + i * (nl / 5);
      neckSpring.add(ring);
    }
  } else {
    meshCyl(hr * 0.34, hr * 0.40, nl + 0.04, opts.neckMat || skinMat, neckG, 0, nl * 0.5, 0);
  }

  const headG = new THREE.Group();
  headG.position.set(0, nl, 0);
  neckG.add(headG);

  const headScaleY = opts.headScaleY || 1.08;
  const headScaleX = opts.headScaleX || 0.92;
  const head = meshSphere(hr * headScaleX, hr * headScaleY, hr * 0.96, opts.headMat || skinMat, headG, 0, hr * headScaleY, 0);

  // Face decal or glowing eye plane
  let eyeMesh = null;
  if (opts.face) {
    const faceMat = bank.face(opts.face, !!opts.emissiveFace);
    const fSize = hr * (opts.faceScale || 1.72);
    const fm = new THREE.Mesh(UNIT_PLANE, faceMat);
    fm.scale.set(fSize, fSize, 1);
    fm.position.set(0, hr * headScaleY, hr * 0.97);
    headG.add(fm);
    if (opts.emissiveFace) eyeMesh = fm;
  }

  // Hair variations
  if (opts.hair === 'bob') {
    // Child bob cut (Twins)
    meshSphere(hr * 1.05, hr * 0.95, hr * 1.05, hairMat, headG, 0, hr * 1.32, -hr * 0.08);
    meshBox(hr * 0.32, hr * 1.35, hr * 1.1, hairMat, headG, -hr * 0.92, hr * 0.85, -hr * 0.05);
    meshBox(hr * 0.32, hr * 1.35, hr * 1.1, hairMat, headG, hr * 0.92, hr * 0.85, -hr * 0.05);
  } else if (opts.hair === 'parted') {
    // Straight parted hair framing face (Doorway Woman)
    meshSphere(hr * 1.04, hr * 0.96, hr * 1.06, hairMat, headG, 0, hr * 1.32, -hr * 0.1);
    meshBox(hr * 0.30, hr * 2.6, hr * 0.8, hairMat, headG, -hr * 0.90, hr * 0.25, -hr * 0.12);
    meshBox(hr * 0.30, hr * 2.6, hr * 0.8, hairMat, headG, hr * 0.90, hr * 0.25, -hr * 0.12);
    meshBox(hr * 1.95, hr * 2.7, 0.05, hairMat, headG, 0, hr * 0.25, -hr * 0.96);
  } else if (opts.hair === 'veil') {
    // Heavy cascading hair veil over the front of the face (Floor-Hatch Crawler)
    meshSphere(hr * 1.12, hr * 1.02, hr * 1.12, hairMat, headG, 0, hr * 1.36, -hr * 0.06);
    for (const [hx, len, rz] of [[-0.68, 0.56, 0.1], [-0.28, 0.64, 0.04], [0.14, 0.62, -0.04], [0.58, 0.54, -0.1]]) {
      const strand = meshBox(hr * 0.42, len, 0.022, hairMat, headG, hx * hr, hr * 1.1 - len * 0.5, hr * 0.95);
      strand.rotation.x = 0.16;
      strand.rotation.z = rz;
    }
    meshBox(hr * 2.0, 0.58, 0.04, hairMat, headG, 0, hr * 0.72, -hr * 0.96);
  }

  // Broken Carnival Mascot head hardware (one tall drooping ear, one snapped ear, snout + hinged jaw)
  let jaw = null;
  if (opts.mascotHead) {
    const earL = meshCyl(0.03, hr * 0.26, hr * 1.35, clothMat, headG, -hr * 0.68, hr * 2.18, 0);
    earL.rotation.z = 0.32;
    earL.rotation.x = 0.22;
    // Right ear snapped mid-shaft
    const earRBase = meshCyl(hr * 0.18, hr * 0.25, hr * 0.55, clothMat, headG, hr * 0.65, hr * 1.88, 0);
    earRBase.rotation.z = -0.35;
    const earRTip = meshCyl(0.025, hr * 0.17, hr * 0.62, clothMat, headG, hr * 0.98, hr * 1.95, 0.05);
    earRTip.rotation.z = -1.35;
    // Snout + nose
    meshBox(hr * 0.92, hr * 0.44, hr * 0.68, clothMat, headG, 0, hr * 0.84, hr * 0.88);
    const noseMat = bank.getMat('mascotNose', () => new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 0.4 }));
    meshSphere(hr * 0.22, hr * 0.15, hr * 0.16, noseMat, headG, 0, hr * 0.98, hr * 1.24);
    // Hinged lower jaw
    jaw = new THREE.Group();
    jaw.position.set(0, hr * 0.54, hr * 0.48);
    headG.add(jaw);
    meshBox(hr * 0.84, hr * 0.18, hr * 0.64, clothMat, jaw, 0, -hr * 0.08, hr * 0.34);
  }

  // Decoy headgear (hardhat or peaked security cap) + handheld flashlight
  if (opts.hardhat) {
    const hatMat = bank.getMat('hardhatYellow', () => new THREE.MeshStandardMaterial({
      color: 0xe6b81c,
      emissive: 0x3b2c04,
      emissiveIntensity: 0.45,
      roughness: 0.38,
    }));
    meshSphere(hr * 1.14, hr * 0.72, hr * 1.16, hatMat, headG, 0, hr * 1.66, 0);
    meshBox(hr * 1.35, 0.028, hr * 1.55, hatMat, headG, 0, hr * 1.48, hr * 0.22);
  } else if (opts.guardCap) {
    const capMat = bank.getMat('guardCapMat', () => new THREE.MeshStandardMaterial({ color: 0x182334, roughness: 0.85 }));
    meshCyl(hr * 1.06, hr * 1.02, hr * 0.42, capMat, headG, 0, hr * 1.88, 0);
    meshBox(hr * 1.15, 0.024, hr * 0.85, capMat, headG, 0, hr * 1.68, hr * 0.88);
  }

  let torch = null;
  if (opts.torch) {
    torch = new THREE.Group();
    torch.position.set(0.03, -foreArmLen - 0.04, 0.07);
    AR.fore.add(torch);
    const metalMat = bank.getMat('torchMetal', () => new THREE.MeshStandardMaterial({ color: 0x25282c, metalness: 0.7, roughness: 0.4 }));
    const body = meshCyl(0.022, 0.028, 0.15, metalMat, torch, 0, 0, 0);
    body.rotation.x = Math.PI / 2;
    const lens = makeGlowSprite(0xfff1c4, 0.78, 0.85);
    lens.position.set(0, 0, 0.14);
    torch.add(lens);
    const li = new THREE.PointLight(0xffe8b0, 4.5, 5.5, 2);
    li.position.set(0, 0, 0.28);
    torch.add(li);
  }

  g.userData.spec = spec;
  g.userData.parts = {
    pelvis,
    legL: L.hip,
    legR: R.hip,
    kneeL: L.knee,
    kneeR: R.knee,
    torsoG,
    armL: AL.arm,
    armR: AR.arm,
    foreL: AL.fore,
    foreR: AR.fore,
    neckG,
    neckSpring,
    headG,
    head,
    jaw,
    eyeMesh,
    torch,
  };
  return g;
}

// ================================================================
// 4. PUBLIC FACTORY: createFigure(id, bank)
// ================================================================
export function createFigure(id, bank = createNeonTextureBank()) {
  const spec = FIGURE_SPECS[id];
  if (!spec) throw new Error(`Unknown Dead Hall figure id: ${id}`);

  if (id === 'twins') {
    const group = new THREE.Group();
    const dressMat = bank.dress('twinsBlue', '#556572', 21, true);
    const skinMat = bank.skin('twinPale', '#c8c2b8', 11);
    const left = buildSingleHumanoid(spec, bank, {
      dress: 'bell',
      skirtBottom: 0.27,
      bareLegs: true,
      clothMat: dressMat,
      skinMat,
      hair: 'bob',
      face: 'twins',
    });
    const right = buildSingleHumanoid(spec, bank, {
      dress: 'bell',
      skirtBottom: 0.27,
      bareLegs: true,
      clothMat: dressMat,
      skinMat,
      hair: 'bob',
      face: 'twins',
    });
    left.position.x = -spec.pairSpacing * 0.5;
    right.position.x = spec.pairSpacing * 0.5;
    // Inner arms meet cleanly hand-in-hand at center without crossing
    left.userData.parts.armR.rotation.z = 0.42;
    left.userData.parts.foreR.rotation.z = 0.04;
    right.userData.parts.armL.rotation.z = -0.42;
    right.userData.parts.foreL.rotation.z = -0.04;
    group.add(left, right);
    group.userData.spec = spec;
    group.userData.twins = [left, right];
    group.userData.parts = left.userData.parts; // compatibility handle
    return group;
  }

  const voidMat = bank.getMat('voidBlack', () => new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 1.0 }));
  const darkCoatMat = bank.dress('darkCoat', '#25272b', 33, false);
  const paleSkin = bank.skin('pale', '#bfb7aa', 41);
  const greySkin = bank.skin('grey', '#9a988e', 52);

  switch (id) {
    case 'doorway_woman':
      return buildSingleHumanoid(spec, bank, {
        dress: 'shroud',
        skirtBottom: 0.24,
        clothMat: bank.dress('womanShroud', '#80796d', 15, true),
        skinMat: paleSkin,
        hair: 'parted',
        face: 'woman',
        limbScale: 0.85,
      });

    case 'exit_charger':
      return buildSingleHumanoid(spec, bank, {
        coat: true,
        clothMat: darkCoatMat,
        skinMat: greySkin,
        face: 'exit_charger',
        limbScale: 1.25,
        sleevedForearm: true,
      });

    case 'crawler':
      return buildSingleHumanoid(spec, bank, {
        clothMat: bank.dress('crawlerRags', '#2b302a', 44, false),
        skinMat: greySkin,
        face: 'crawler',
        emissiveFace: true,
        clawHands: true,
        limbScale: 0.82,
      });

    case 'corner_figure':
      return buildSingleHumanoid(spec, bank, {
        coat: true,
        clothMat: bank.dress('cornerTrench', '#36342e', 55, false),
        skinMat: paleSkin,
        face: 'exit_charger',
        sleevedForearm: true,
      });

    case 'hatch_crawler':
      return buildSingleHumanoid(spec, bank, {
        dress: 'shroud',
        skirtBottom: 0.22,
        clothMat: bank.dress('hatchShroud', '#6b655c', 66, true),
        skinMat: paleSkin,
        hair: 'veil',
        face: 'hatch',
        clawHands: true,
        limbScale: 0.84,
      });

    case 'mascot':
      return buildSingleHumanoid(spec, bank, {
        barrel: true,
        clothMat: bank.mascotPlush(),
        skinMat: bank.mascotPlush(),
        headMat: bank.mascotPlush(),
        mascotHead: true,
        mittenHands: true,
        sleevedForearm: true,
        face: 'mascot',
        faceScale: 1.45,
        limbScale: 1.35,
      });

    case 'doorway_eyes':
      return buildSingleHumanoid(spec, bank, {
        coat: true,
        clothMat: voidMat,
        skinMat: voidMat,
        headMat: voidMat,
        neckMat: voidMat,
        handMat: voidMat,
        footMat: voidMat,
        sleevedForearm: true,
        face: 'doorway_eyes',
        emissiveFace: true,
        faceScale: 1.65,
      });

    case 'tall_figure':
      return buildSingleHumanoid(spec, bank, {
        clothMat: bank.dress('tallDark', '#1c1d20', 91, false),
        skinMat: greySkin,
        face: 'tall',
        headScaleY: 1.38,
        headScaleX: 0.78,
        clawHands: true,
        limbScale: 0.62,
        torsoDepth: 0.15,
      });

    case 'eye_shadow':
      return buildSingleHumanoid(spec, bank, {
        clothMat: voidMat,
        skinMat: voidMat,
        headMat: voidMat,
        neckMat: voidMat,
        handMat: voidMat,
        footMat: voidMat,
        sleevedForearm: true,
        shadowWisps: true,
        face: 'eye_shadow',
        emissiveFace: true,
        faceScale: 1.45,
      });

    case 'mannequin': {
      const porc = bank.porcelain();
      const fig = buildSingleHumanoid(spec, bank, {
        clothMat: porc,
        skinMat: porc,
        headMat: porc,
        neckMat: porc,
        handMat: porc,
        footMat: porc,
        jointMat: bank.getMat('mannequinJoint', () => new THREE.MeshStandardMaterial({ color: 0x76746c, roughness: 0.5 })),
        ballJoints: true,
        springNeck: true,
        headScaleY: 1.14,
        headScaleX: 0.86,
      });
      fig.userData.parts.headG.rotation.z = 0.48; // unmistakable 28-deg cocked blank head
      return fig;
    }

    case 'decoy_guard':
      return buildSingleHumanoid(spec, bank, {
        clothMat: bank.getMat('guardNavy', () => new THREE.MeshStandardMaterial({ color: 0x1e2c42, roughness: 0.88 })),
        skinMat: bank.skin('humanWarm', '#c8a88c', 81),
        face: 'decoy',
        badge: true,
        guardCap: true,
        torch: true,
        sleevedForearm: true,
      });

    case 'decoy_worker':
      return buildSingleHumanoid(spec, bank, {
        clothMat: bank.getMat('workerHivis', () => new THREE.MeshStandardMaterial({
          color: 0xd97312,
          emissive: 0x4a2202,
          emissiveIntensity: 0.55,
          roughness: 0.75,
        })),
        skinMat: bank.skin('humanWarmB', '#c29f82', 82),
        face: 'decoy',
        hivis: true,
        hardhat: true,
        torch: true,
        sleevedForearm: true,
      });

    default:
      throw new Error(`Unhandled figure id: ${id}`);
  }
}

// ================================================================
// 5. MOTION ENGINE — animateFigure(fig, mode, t, opts)
//    Quality is judged IN MOTION: walk, lunge, crawl, sprint,
//    unfold, flicker_step, hatch_emerge, decoy_flee, idle.
// ================================================================
function resetPose(p, spec) {
  p.pelvis.position.set(0, spec.legLength, 0);
  p.pelvis.rotation.set(0, 0, 0);
  p.torsoG.rotation.set(0, 0, 0);
  p.legL.rotation.set(0, 0, 0);
  p.legR.rotation.set(0, 0, 0);
  p.kneeL.rotation.set(0, 0, 0);
  p.kneeR.rotation.set(0, 0, 0);
  p.armL.rotation.set(0, 0, 0);
  p.armR.rotation.set(0, 0, 0);
  p.foreL.rotation.set(0, 0, 0);
  p.foreR.rotation.set(0, 0, 0);
  p.neckG.rotation.set(0, 0, 0);
  p.headG.rotation.set(0, 0, 0);
  if (p.jaw) p.jaw.rotation.set(0, 0, 0);
}

export function animateFigure(fig, mode, t, opts = {}) {
  const spec = fig.userData.spec;
  const activeMode = mode || spec.defaultMotion || 'idle';

  // Twins animate symmetrically as a pair
  if (fig.userData.twins) {
    const [left, right] = fig.userData.twins;
    const sway = Math.sin(t * 1.4) * 0.03;
    const headTilt = Math.sin(t * 0.9) * 0.09;
    left.userData.parts.torsoG.rotation.z = sway;
    right.userData.parts.torsoG.rotation.z = -sway;
    left.userData.parts.headG.rotation.z = headTilt;
    right.userData.parts.headG.rotation.z = -headTilt;
    // Keep inner hands linked cleanly without crossing
    left.userData.parts.armR.rotation.z = 0.42;
    right.userData.parts.armL.rotation.z = -0.42;
    return;
  }

  const p = fig.userData.parts;
  resetPose(p, spec);

  if (activeMode === 'idle') {
    const breath = Math.sin(t * 1.6);
    p.torsoG.rotation.x = 0.03 + breath * 0.025;
    p.torsoG.rotation.z = Math.sin(t * 0.9) * 0.025;
    p.headG.rotation.z = Math.sin(t * 0.7 + 0.8) * 0.06;
    p.armL.rotation.z = -0.06;
    p.armR.rotation.z = 0.06;
    if (spec.id === 'corner_figure') {
      p.torsoG.rotation.x = 0.16;
      p.headG.rotation.x = 0.34;
    } else if (spec.id === 'mannequin') {
      p.headG.rotation.z = 0.48;
    }
    return;
  }

  if (activeMode === 'walk') {
    const w = t * 5.2;
    const s = Math.sin(w);
    const c = Math.cos(w);
    p.pelvis.position.y = spec.legLength - Math.abs(s) * 0.055;
    p.pelvis.rotation.z = s * 0.04;
    p.legL.rotation.x = s * 0.45;
    p.legR.rotation.x = -s * 0.45;
    p.kneeL.rotation.x = Math.max(0, -c) * 0.65;
    p.kneeR.rotation.x = Math.max(0, c) * 0.65;
    p.torsoG.rotation.x = 0.12 + Math.abs(s) * 0.04;
    p.torsoG.rotation.y = -s * 0.12;
    p.armL.rotation.x = -s * 0.42 - 0.15;
    p.armR.rotation.x = s * 0.42 - 0.15;
    p.foreL.rotation.x = -0.35;
    p.foreR.rotation.x = -0.35;
    p.headG.rotation.z = Math.sin(w * 0.5) * 0.10;
    return;
  }

  if (activeMode === 'sprint') {
    const w = t * 11.5;
    const s = Math.sin(w);
    const c = Math.cos(w);
    p.pelvis.position.y = spec.legLength * 0.90 + Math.abs(c) * 0.09;
    p.pelvis.rotation.z = s * 0.08;
    p.legL.rotation.x = s * 0.88 - 0.15;
    p.legR.rotation.x = -s * 0.88 - 0.15;
    p.kneeL.rotation.x = Math.max(0.15, -c * 1.15 + 0.35);
    p.kneeR.rotation.x = Math.max(0.15, c * 1.15 + 0.35);
    p.torsoG.rotation.x = 0.34 + Math.sin(w * 2) * 0.05;
    p.torsoG.rotation.y = -s * 0.22;
    p.armL.rotation.x = -s * 0.95 - 0.35;
    p.armR.rotation.x = s * 0.95 - 0.35;
    p.foreL.rotation.x = -1.15;
    p.foreR.rotation.x = -1.15;
    p.headG.rotation.x = -0.22 + Math.sin(w * 2) * 0.08;
    p.headG.rotation.z = s * 0.14;
    if (p.jaw) p.jaw.rotation.x = 0.15 + Math.abs(Math.sin(w * 1.5)) * 0.48;
    return;
  }

  if (activeMode === 'lunge') {
    const cycle = (t * 0.85) % 1; // 0..0.35 windup, 0.35..0.75 pounce, 0.75..1.0 reach
    const w = t * 8.2;
    const s = Math.sin(w);
    const pounce = Math.min(1, Math.max(0, (cycle - 0.2) / 0.45));
    p.pelvis.position.y = spec.legLength * (0.86 - pounce * 0.10);
    p.torsoG.rotation.x = 0.20 + pounce * 0.42;
    p.torsoG.rotation.z = Math.sin(t * 6.0) * 0.09;
    p.legL.rotation.x = s * 0.65 - pounce * 0.35;
    p.legR.rotation.x = -s * 0.65 + pounce * 0.25;
    p.kneeL.rotation.x = 0.55 + Math.max(0, -s) * 0.45;
    p.kneeR.rotation.x = 0.55 + Math.max(0, s) * 0.45;
    // Arms snap forward into grabbing reach
    const reach = -0.45 - pounce * 1.15;
    p.armL.rotation.x = reach;
    p.armR.rotation.x = reach + Math.sin(t * 9) * 0.12;
    p.armL.rotation.z = -0.22 - pounce * 0.18;
    p.armR.rotation.z = 0.22 + pounce * 0.18;
    p.foreL.rotation.x = -0.45 + pounce * 0.25;
    p.foreR.rotation.x = -0.45 + pounce * 0.25;
    p.headG.rotation.x = -0.30 * pounce;
    p.headG.rotation.z = Math.sin(t * 7.5) * 0.18;
    return;
  }

  if (activeMode === 'crawl') {
    // True quadrupedal all-fours scuttle (low 0.78 m silhouette)
    const w = t * 7.4;
    const s = Math.sin(w);
    const c = Math.cos(w);
    p.pelvis.position.set(s * 0.06, 0.42 + Math.abs(c) * 0.05, 0);
    p.pelvis.rotation.x = 1.38; // horizontal spine
    p.torsoG.rotation.x = 0.12 + Math.sin(w * 2) * 0.05;
    p.torsoG.rotation.y = s * 0.22;
    // Splayed spider legs
    p.legL.rotation.x = -1.15 + s * 0.52;
    p.legR.rotation.x = -1.15 - s * 0.52;
    p.legL.rotation.z = -0.38;
    p.legR.rotation.z = 0.38;
    p.kneeL.rotation.x = 1.35 - s * 0.35;
    p.kneeR.rotation.x = 1.35 + s * 0.35;
    // High reversed-angle reaching arms
    p.armL.rotation.x = -1.32 - s * 0.58;
    p.armR.rotation.x = -1.32 + s * 0.58;
    p.armL.rotation.z = -0.42;
    p.armR.rotation.z = 0.42;
    p.foreL.rotation.x = -0.88 + c * 0.28;
    p.foreR.rotation.x = -0.88 - c * 0.28;
    // Upturned head glaring into lens
    p.neckG.rotation.x = -0.85;
    p.headG.rotation.x = -0.52;
    p.headG.rotation.z = Math.sin(w * 0.5) * 0.20;
    return;
  }

  if (activeMode === 'hatch_emerge') {
    // Torso hauling up out of floor hatch (y=0 is floor plane)
    const u = Math.min(1, Math.max(0, (t * 0.55) % 1.2));
    const pull = Math.sin(t * 4.4);
    p.pelvis.position.set(0, -0.18 + u * 0.42, 0);
    p.pelvis.rotation.x = 0.85 - u * 0.22;
    p.legL.rotation.x = 0.6;
    p.legR.rotation.x = 0.6;
    p.torsoG.rotation.y = pull * 0.18;
    // Alternating clawed hands clawing forward across the floor
    p.armL.rotation.x = -1.55 + Math.max(0, pull) * 0.55;
    p.armR.rotation.x = -1.55 + Math.max(0, -pull) * 0.55;
    p.armL.rotation.z = -0.35;
    p.armR.rotation.z = 0.35;
    p.foreL.rotation.x = -0.65;
    p.foreR.rotation.x = -0.65;
    p.headG.rotation.x = -0.48 + Math.sin(t * 3.1) * 0.08;
    p.headG.rotation.z = pull * 0.14;
    return;
  }

  if (activeMode === 'unfold') {
    // Tall figure (2.95 m) unfolds from ceiling crouch into slow terrifying reach
    const u = 0.5 - 0.5 * Math.cos(t * 1.4); // 0 = folded, 1 = unfolded lunge
    p.pelvis.position.y = spec.legLength * (0.72 + u * 0.26);
    p.legL.rotation.x = -(1 - u) * 0.65;
    p.legR.rotation.x = -(1 - u) * 0.58;
    p.kneeL.rotation.x = (1 - u) * 1.15;
    p.kneeR.rotation.x = (1 - u) * 1.05;
    p.torsoG.rotation.x = (1 - u) * 0.68 + u * 0.28;
    p.torsoG.rotation.z = Math.sin(t * 1.1) * 0.07;
    // Spider-long arms uncoil outward then forward
    p.armL.rotation.x = -0.25 - u * 1.25;
    p.armR.rotation.x = -0.25 - u * 1.18;
    p.armL.rotation.z = -0.18 - u * 0.24;
    p.armR.rotation.z = 0.18 + u * 0.24;
    p.foreL.rotation.x = -(1 - u) * 1.1 - 0.25;
    p.foreR.rotation.x = -(1 - u) * 1.1 - 0.25;
    p.headG.rotation.x = -0.32 * (1 - u);
    p.headG.rotation.z = Math.sin(t * 0.9) * 0.22;
    return;
  }

  if (activeMode === 'flicker_step') {
    // Spring-necked mannequin: discrete snapped predator poses (moves ONLY during flicker!)
    const step = Math.floor(t * 1.8) % 4;
    const poses = [
      { tx: 0.04, ty: 0.0,  al: -0.1, ar: -0.1,  hz: 0.48, hx: 0.04, ll: 0.0,  lr: 0.0  },
      { tx: 0.18, ty: 0.24, al: -0.8, ar: -0.2,  hz: -0.58, hx: 0.12, ll: 0.35, lr: -0.28 },
      { tx: 0.28, ty: -0.2, al: -1.35, ar: -1.1, hz: 0.68, hx: -0.15, ll: -0.35, lr: 0.42 },
      { tx: 0.42, ty: 0.08, al: -1.65, ar: -1.55, hz: -0.45, hx: -0.25, ll: 0.45, lr: -0.45 },
    ][step];
    const localT = (t * 1.8) % 1;
    // Damped spring-neck wobble right after each pose snap
    const springOsc = Math.exp(-localT * 6.5) * Math.sin(localT * 28) * 0.32;
    p.pelvis.position.y = spec.legLength * (0.98 - step * 0.04);
    p.torsoG.rotation.x = poses.tx;
    p.torsoG.rotation.y = poses.ty;
    p.legL.rotation.x = poses.ll;
    p.legR.rotation.x = poses.lr;
    p.kneeL.rotation.x = Math.max(0, poses.ll * 0.8);
    p.kneeR.rotation.x = Math.max(0, poses.lr * 0.8);
    p.armL.rotation.x = poses.al;
    p.armR.rotation.x = poses.ar;
    p.foreL.rotation.x = -0.55;
    p.foreR.rotation.x = -0.55;
    p.neckG.rotation.z = springOsc;
    p.headG.rotation.z = poses.hz + springOsc * 1.2;
    p.headG.rotation.x = poses.hx + springOsc * 0.4;
    return;
  }

  if (activeMode === 'decoy_flee') {
    // Panicked human decoy: raised trembling hands, flashlight wavering, backing away
    const trem = Math.sin(t * 22) * 0.055;
    const step = Math.sin(t * 5.8);
    p.pelvis.position.y = spec.legLength - Math.abs(step) * 0.04;
    p.torsoG.rotation.x = -0.10; // leaning back in fear
    p.torsoG.rotation.z = Math.sin(t * 4.2) * 0.06;
    p.legL.rotation.x = step * 0.32;
    p.legR.rotation.x = -step * 0.32;
    p.kneeL.rotation.x = Math.max(0, -step) * 0.42;
    p.kneeR.rotation.x = Math.max(0, step) * 0.42;
    // Both arms raised defensively (left palm out "DON'T SHOOT", right holding trembling flashlight)
    p.armL.rotation.x = -1.95 + trem;
    p.armL.rotation.z = -0.45;
    p.foreL.rotation.x = -0.65;
    p.armR.rotation.x = -1.45 - trem;
    p.armR.rotation.z = 0.28;
    p.foreR.rotation.x = -0.35 + trem * 1.4;
    p.headG.rotation.y = Math.sin(t * 6.5) * 0.22; // frantic head shake
    return;
  }
}

// ================================================================
// 6. MEASUREMENT HELPER (honest geometry/draw-call reporting)
// ================================================================
export function measureFigure(fig) {
  fig.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fig);
  const size = new THREE.Vector3();
  box.getSize(size);
  let meshes = 0;
  let tris = 0;
  fig.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      const g = o.geometry;
      if (g.index) tris += g.index.count / 3;
      else if (g.attributes.position) tris += g.attributes.position.count / 3;
    }
  });
  return {
    id: fig.userData.spec?.id || 'unknown',
    meshes,
    tris: Math.round(tris),
    boundsM: {
      w: +size.x.toFixed(2),
      h: +size.y.toFixed(2),
      d: +size.z.toFixed(2),
    },
  };
}
