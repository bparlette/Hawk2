// APEX WAKE — Anatomically Sculpted Realistic Rider with Wet PBR Skin, PFD Vest & 2-Bone Handlebar IK
import * as THREE from 'three';

// Smooth organic limb segment via LatheGeometry (no boxy primitives)
function makeOrganicLimb(len, rTop, rMid, rBot, segs = 14) {
  const pts = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(rBot * 0.85, -len * 0.04),
    new THREE.Vector2(rBot, -len * 0.14),
    new THREE.Vector2(rMid, -len * 0.48),
    new THREE.Vector2(rTop, -len * 0.86),
    new THREE.Vector2(rTop * 0.88, -len * 0.96),
    new THREE.Vector2(0.001, -len),
  ];
  // Lathe from y=0 (joint) down to y=-len
  const geo = new THREE.LatheGeometry(pts, segs);
  geo.computeVertexNormals();
  return geo;
}

// Sculpted athletic torso + buckled PFD life vest texture
function makeVestTex(accentHex = '#00d8f0') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  // Neoprene charcoal base
  x.fillStyle = '#181c22';
  x.fillRect(0, 0, 256, 256);
  // Quilted buoyancy foam panels
  x.strokeStyle = '#0c0e12';
  x.lineWidth = 4;
  for (let py = 20; py < 230; py += 52) {
    x.fillStyle = '#242a34';
    x.fillRect(16, py, 102, 42);
    x.strokeRect(16, py, 102, 42);
    x.fillRect(138, py, 102, 42);
    x.strokeRect(138, py, 102, 42);
  }
  // High-vis racing accent stripes across chest/back
  x.fillStyle = accentHex;
  x.fillRect(0, 68, 256, 24);
  // Dual horizontal nylon webbing straps + center quick-release buckles
  for (const sy of [118, 174]) {
    x.fillStyle = '#0d0f13';
    x.fillRect(0, sy, 256, 18);
    x.fillStyle = '#383e48';
    x.fillRect(112, sy - 3, 32, 24);
    x.strokeStyle = '#6c7686';
    x.lineWidth = 2;
    x.strokeRect(114, sy - 1, 28, 20);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Realistic sunlit tanned wet skin texture
function makeSkinTex(base = '#c88c68') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  // Subtle warm subsurface tone variation
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,215,185,0.14)');
  g.addColorStop(0.5, 'rgba(180,105,70,0.08)');
  g.addColorStop(1, 'rgba(110,55,35,0.18)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createRider(opts = {}) {
  const skinTone = opts.skinTone || '#c98e6a';
  const vestAccent = opts.vestAccent || '#00d8f0';
  const shortColor = opts.shortColor || 0x162232;
  const hairColor = opts.hairColor || 0x1b1510;

  const root = new THREE.Group();
  root.name = 'realistic_rider';

  // Wet sun-gleaming PBR skin (subtle clearcoat mimics ocean spray sheen on arms/neck/calves!)
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: makeSkinTex(skinTone),
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.42,
    clearcoatRoughness: 0.22,
  });
  const rashMat = new THREE.MeshPhysicalMaterial({
    color: 0x171c24,
    roughness: 0.52,
    metalness: 0.05,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  });
  const vestMat = new THREE.MeshPhysicalMaterial({
    map: makeVestTex(vestAccent),
    roughness: 0.48,
    metalness: 0.06,
    clearcoat: 0.32,
    clearcoatRoughness: 0.28,
  });
  const shortsMat = new THREE.MeshStandardMaterial({ color: shortColor, roughness: 0.72, metalness: 0.04 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.65, metalness: 0.1 });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: hairColor,
    roughness: 0.28,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x05283a,
    emissive: 0x041e2e,
    emissiveIntensity: 0.35,
    roughness: 0.06,
    metalness: 0.85,
    clearcoat: 1.0,
  });

  // --- Pelvis / Hips anchored above the jet ski saddle ---
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.72, -0.34);
  root.add(pelvis);

  // Sculpted hips / boardshorts base
  const hipGeo = new THREE.SphereGeometry(0.165, 16, 12);
  hipGeo.scale(1.12, 0.84, 0.92);
  const hipMesh = new THREE.Mesh(hipGeo, shortsMat);
  pelvis.add(hipMesh);

  // --- Legs (straddling the saddle, planted in EVA footwells) ---
  const thighLen = 0.40;
  const shinLen = 0.40;
  const thighGeo = makeOrganicLimb(thighLen, 0.072, 0.088, 0.095, 14);
  const shinGeo = makeOrganicLimb(shinLen, 0.046, 0.064, 0.062, 14);

  function mkLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.165, -0.02, 0.02);
    pelvis.add(hip);

    // Thigh (upper half shorts, lower half wet tanned skin)
    const upperThigh = new THREE.Mesh(makeOrganicLimb(thighLen * 0.64, 0.082, 0.092, 0.098, 14), shortsMat);
    hip.add(upperThigh);
    const lowerThigh = new THREE.Mesh(thighGeo, skinMat);
    lowerThigh.scale.set(0.95, 1.0, 0.95);
    hip.add(lowerThigh);

    const knee = new THREE.Group();
    knee.position.set(0, -thighLen, 0);
    hip.add(knee);
    const kneecap = new THREE.Mesh(new THREE.SphereGeometry(0.060, 12, 10), skinMat);
    knee.add(kneecap);

    const shin = new THREE.Mesh(shinGeo, skinMat);
    knee.add(shin);

    // Neoprene water-bootie foot planted flat in footwell
    const ankle = new THREE.Group();
    ankle.position.set(0, -shinLen, 0);
    knee.add(ankle);
    const footGeo = new THREE.SphereGeometry(0.058, 12, 10);
    footGeo.scale(0.88, 0.56, 1.85);
    const foot = new THREE.Mesh(footGeo, shoeMat);
    foot.position.set(0, -0.02, 0.055);
    ankle.add(foot);

    return { hip, knee, ankle };
  }
  const legL = mkLeg(-1);
  const legR = mkLeg(1);

  // --- Spine & Muscular Torso + PFD Life Vest ---
  const spine = new THREE.Group();
  spine.position.set(0, 0.06, 0);
  pelvis.add(spine);

  // Athletic tapered upper torso (Lathe profile from waist to shoulders)
  const torsoPts = [
    new THREE.Vector2(0.001, 0.00),
    new THREE.Vector2(0.155, 0.02),
    new THREE.Vector2(0.165, 0.14),
    new THREE.Vector2(0.195, 0.30),
    new THREE.Vector2(0.215, 0.44),
    new THREE.Vector2(0.165, 0.51),
    new THREE.Vector2(0.065, 0.53),
    new THREE.Vector2(0.001, 0.54),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 18);
  torsoGeo.scale(1.12, 1.0, 0.72);
  torsoGeo.computeVertexNormals();
  const torsoMesh = new THREE.Mesh(torsoGeo, vestMat);
  spine.add(torsoMesh);

  // Fitted neoprene collar & shoulder caps
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.095, 0.06, 14), rashMat);
  collar.position.y = 0.52;
  spine.add(collar);

  // --- Sculpted Neck, Anatomical Head, Wet Hair & Polarized Sunglasses ---
  const neck = new THREE.Group();
  neck.position.set(0, 0.53, 0.01);
  spine.add(neck);
  const neckCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.062, 0.10, 12), skinMat);
  neckCyl.position.y = 0.045;
  neck.add(neckCyl);

  const head = new THREE.Group();
  head.position.set(0, 0.09, 0.01);
  neck.add(head);

  // Cranium + tapered jawline
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.106, 18, 14), skinMat);
  skull.scale.set(0.88, 1.04, 0.98);
  skull.position.set(0, 0.10, 0);
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 10), skinMat);
  jaw.scale.set(0.84, 0.85, 0.92);
  jaw.position.set(0, 0.042, 0.025);
  head.add(jaw);
  // Subtle nose + ears
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 8), skinMat);
  nose.rotation.x = Math.PI * 0.45;
  nose.position.set(0, 0.088, 0.105);
  head.add(nose);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
    ear.scale.set(0.45, 1.2, 0.78);
    ear.position.set(s * 0.092, 0.092, -0.005);
    head.add(ear);
  }

  // Wind-swept slicked-back wet hair cap + back taper
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.111, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hairCap.scale.set(0.90, 1.02, 1.04);
  hairCap.rotation.x = -0.22;
  hairCap.position.set(0, 0.112, -0.012);
  head.add(hairCap);
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.092, 12, 10), hairMat);
  hairBack.scale.set(0.86, 0.95, 0.75);
  hairBack.position.set(0, 0.085, -0.055);
  head.add(hairBack);

  // Wraparound sport polarized sunglasses
  const shadesGeo = new THREE.CylinderGeometry(0.098, 0.096, 0.040, 14, 1, true, -Math.PI * 0.36, Math.PI * 0.72);
  const shades = new THREE.Mesh(shadesGeo, lensMat);
  shades.position.set(0, 0.108, 0.018);
  head.add(shades);

  // --- Sculpted Arms (Upper + Forearm + Gripping Hand) driven by 2-Bone Analytical IK ---
  const upperLen = 0.295;
  const foreLen = 0.275;
  const upperGeo = makeOrganicLimb(upperLen, 0.044, 0.054, 0.056, 12);
  const foreGeo = makeOrganicLimb(foreLen, 0.032, 0.044, 0.044, 12);

  function mkArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.228, 0.455, 0.01);
    spine.add(shoulder);

    // Sculpted deltoid cap (rashguard short sleeve)
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), rashMat);
    shoulder.add(deltoid);
    const sleeve = new THREE.Mesh(makeOrganicLimb(upperLen * 0.56, 0.052, 0.056, 0.058, 12), rashMat);
    shoulder.add(sleeve);

    // Tanned muscular lower bicep
    const bicep = new THREE.Mesh(upperGeo, skinMat);
    bicep.scale.set(0.96, 1.0, 0.96);
    shoulder.add(bicep);

    const elbow = new THREE.Group();
    elbow.position.set(0, -upperLen, 0);
    shoulder.add(elbow);
    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.040, 10, 8), skinMat);
    elbow.add(elbowCap);

    const forearm = new THREE.Mesh(foreGeo, skinMat);
    elbow.add(forearm);

    // Wrapped gripping hand (neoprene riding glove accent)
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), shoeMat);
    hand.scale.set(0.9, 1.15, 0.85);
    hand.position.set(0, -foreLen - 0.015, 0);
    elbow.add(hand);

    return { shoulder, elbow, side };
  }
  const armL = mkArm(-1);
  const armR = mkArm(1);

  // Reusable scratch vectors for zero-GC 2-bone analytical arm IK
  const _shW = new THREE.Vector3();
  const _tgtW = new THREE.Vector3();
  const _toTgt = new THREE.Vector3();
  const _pole = new THREE.Vector3();
  const _axisX = new THREE.Vector3();
  const _axisY = new THREE.Vector3();
  const _axisZ = new THREE.Vector3();
  const _mat = new THREE.Matrix4();
  const _qParentInv = new THREE.Quaternion();
  const _qWorld = new THREE.Quaternion();

  function solveArmIK(arm, gripObj, skiQuat) {
    spine.updateMatrixWorld(true);
    gripObj.getWorldPosition(_tgtW);
    arm.shoulder.getWorldPosition(_shW);

    _toTgt.subVectors(_tgtW, _shW);
    const maxReach = (upperLen + foreLen) * 0.985;
    const dist = Math.min(maxReach, Math.max(0.12, _toTgt.length()));
    const dir = _toTgt.clone().divideScalar(Math.max(0.001, _toTgt.length()));

    // Law of cosines for shoulder & elbow bend
    const cosA = THREE.MathUtils.clamp((upperLen * upperLen + dist * dist - foreLen * foreLen) / (2 * upperLen * dist), -1, 1);
    const angA = Math.acos(cosA);
    const cosB = THREE.MathUtils.clamp((upperLen * upperLen + foreLen * foreLen - dist * dist) / (2 * upperLen * foreLen), -1, 1);
    const angB = Math.PI - Math.acos(cosB);

    // Pole vector: elbows flare slightly outward & downward naturally
    _pole.set(arm.side * 0.85, -0.72, -0.25).applyQuaternion(skiQuat).normalize();
    // Build orthonormal basis where -Y points along upper arm
    const bendDir = _pole.clone().addScaledVector(dir, -_pole.dot(dir)).normalize();
    const upperDir = dir.clone().multiplyScalar(Math.cos(angA)).addScaledVector(bendDir, Math.sin(angA)).normalize();

    _axisY.copy(upperDir).negate();
    _axisX.crossVectors(_axisY, bendDir).normalize();
    _axisZ.crossVectors(_axisX, _axisY).normalize();
    _mat.makeBasis(_axisX, _axisY, _axisZ);
    _qWorld.setFromRotationMatrix(_mat);

    spine.getWorldQuaternion(_qParentInv).invert();
    arm.shoulder.quaternion.copy(_qParentInv).multiply(_qWorld);
    // Elbow bends inward toward target along local +X
    arm.elbow.rotation.set(angB, 0, 0);
  }

  return {
    root,
    update(skiParts, steer, speed01, airborne01, impactJolt, t) {
      // Dynamic athletic posture:
      // - Lean body aggressively INTO carves
      // - Rise slightly off saddle on swells/airtime (knees act as suspension!)
      // - Tuck forward aerodynamically at high speed / boost
      const standAmt = THREE.MathUtils.clamp(airborne01 * 0.85 + Math.abs(steer) * 0.25 + impactJolt * 0.35, 0, 1);
      const tuck = speed01 * 0.26;
      const breath = Math.sin(t * 2.6) * 0.006;

      // Pelvis shifts laterally into carve + lifts off seat on waves
      pelvis.position.set(
        -steer * 0.145,
        0.72 + standAmt * 0.13 - impactJolt * 0.075 + breath,
        -0.36 - standAmt * 0.04
      );
      pelvis.rotation.set(
        0.16 + tuck * 0.45 - airborne01 * 0.10,
        steer * 0.20,
        steer * 0.26
      );

      // Legs straddle hull and flex smoothly with hip height
      const kneeFlex = 1.08 - standAmt * 0.34 + impactJolt * 0.26;
      const hipPitch = -0.68 + standAmt * 0.24;
      for (const [leg, side] of [[legL, -1], [legR, 1]]) {
        leg.hip.rotation.set(hipPitch, side * 0.16, side * (0.34 - standAmt * 0.05));
        leg.knee.rotation.set(kneeFlex, 0, side * -0.14);
        leg.ankle.rotation.set(-kneeFlex * 0.45, 0, 0);
      }

      // Upper torso leans forward over bars & banks into turn
      spine.rotation.set(
        0.30 + tuck * 0.55 + impactJolt * 0.16,
        steer * 0.16,
        steer * 0.18
      );

      // Head looks toward the turn apex and counter-levels horizon!
      head.rotation.set(
        -0.34 - tuck * 0.38 - impactJolt * 0.12,
        steer * 0.36,
        -steer * 0.24
      );

      // Lock both hands physically to the moving handlebar grips via 2-bone IK!
      const skiQuat = new THREE.Quaternion();
      root.getWorldQuaternion(skiQuat);
      solveArmIK(armL, skiParts.gripL, skiQuat);
      solveArmIK(armR, skiParts.gripR, skiQuat);
    },

    // Natural surface swimming, treading water & underwater breaststroke/dive animation!
    updateSwim(speed01, steer, divePitch, underwater, t) {
      const moving = THREE.MathUtils.clamp(speed01 * 1.4, 0, 1);

      if (!underwater && moving < 0.15) {
        // Relaxed treading water at the ocean surface (upright, sculling hands, gentle kick)
        pelvis.position.set(0, -0.58 + Math.sin(t * 2.4) * 0.04, 0);
        pelvis.rotation.set(0.18, 0, steer * 0.12);
        spine.rotation.set(0.08, 0, 0);
        head.rotation.set(-0.18, steer * 0.25, 0);

        const tread = Math.sin(t * 3.4);
        legL.hip.rotation.set(tread * 0.42, 0, -0.14);
        legR.hip.rotation.set(-tread * 0.42, 0, 0.14);
        legL.knee.rotation.set(0.55 + Math.max(0, -tread) * 0.35, 0, 0);
        legR.knee.rotation.set(0.55 + Math.max(0, tread) * 0.35, 0, 0);
        legL.ankle.rotation.set(0.35, 0, 0);
        legR.ankle.rotation.set(0.35, 0, 0);

        const scull = Math.sin(t * 3.0);
        armL.shoulder.rotation.set(-0.55 + scull * 0.28, 0, -0.55 - Math.abs(scull) * 0.25);
        armR.shoulder.rotation.set(-0.55 - scull * 0.28, 0,  0.55 + Math.abs(scull) * 0.25);
        armL.elbow.rotation.set(0.75, 0, 0);
        armR.elbow.rotation.set(0.75, 0, 0);
        return;
      }

      // Horizontal streamlined swimmer body:
      // pelvis.rotation.x = +PI/2 maps local +Y (head) -> +Z (forward), -Y (legs) -> -Z (trailing behind), -Z (back) -> +Y (up)!
      const clampedDive = THREE.MathUtils.clamp(divePitch, -0.55, 0.55);
      const pitchBase = Math.PI * 0.5 - clampedDive * 0.65;
      const bodyRoll = underwater ? (steer * 0.34) : (Math.sin(t * 5.0) * 0.18 + steer * 0.25);
      pelvis.position.set(0, 0.0, 0);
      pelvis.rotation.set(pitchBase, 0, bodyRoll);
      spine.rotation.set(-0.08 + Math.sin(t * 3.4) * 0.05, steer * 0.14, 0);
      // Tilt head upward (-X rotates face toward -Z = up) so swimmer looks forward along reef!
      head.rotation.set(-0.68, steer * 0.22, -bodyRoll * 0.3);

      if (underwater) {
        // Graceful underwater breaststroke sweep + rhythmic flutter kick
        const phase = t * (3.0 + moving * 1.6);
        const pull = Math.sin(phase);
        const glide = Math.cos(phase);
        // Arms reach forward (+PI = forward along +Y) and sweep gracefully out & back
        const armPitch = 2.65 - (glide * 0.5 + 0.5) * 1.25;
        const armOut = 0.24 + (pull * 0.5 + 0.5) * 0.85;
        armL.shoulder.rotation.set(armPitch, 0, -armOut);
        armR.shoulder.rotation.set(armPitch, 0,  armOut);
        armL.elbow.rotation.set(-0.28 - Math.max(0, pull) * 0.45, 0, 0);
        armR.elbow.rotation.set(-0.28 - Math.max(0, pull) * 0.45, 0, 0);

        // Legs trail cleanly straight behind with smooth alternating flutter kick
        const kick = Math.sin(phase * 2.0);
        legL.hip.rotation.set(kick * 0.24, 0, -0.07);
        legR.hip.rotation.set(-kick * 0.24, 0, 0.07);
        legL.knee.rotation.set(0.18 + Math.max(0, -kick) * 0.24, 0, 0);
        legR.knee.rotation.set(0.18 + Math.max(0, kick) * 0.24, 0, 0);
        legL.ankle.rotation.set(0.45, 0, 0);
        legR.ankle.rotation.set(0.45, 0, 0);
      } else {
        // Natural alternating freestyle crawl on the ocean surface
        const stroke = t * (4.6 + moving * 2.0);
        const sL = Math.sin(stroke);
        const sR = Math.sin(stroke + Math.PI);
        armL.shoulder.rotation.set(2.25 + sL * 1.05, 0, -0.22 - Math.max(0, Math.cos(stroke)) * 0.45);
        armR.shoulder.rotation.set(2.25 + sR * 1.05, 0,  0.22 + Math.max(0, Math.cos(stroke + Math.PI)) * 0.45);
        armL.elbow.rotation.set(-0.32 - Math.max(0, -sL) * 0.48, 0, 0);
        armR.elbow.rotation.set(-0.32 - Math.max(0, -sR) * 0.48, 0, 0);

        const kick = Math.sin(stroke * 2.0);
        legL.hip.rotation.set(kick * 0.28, 0, -0.06);
        legR.hip.rotation.set(-kick * 0.28, 0, 0.06);
        legL.knee.rotation.set(0.16 + Math.max(0, -kick) * 0.26, 0, 0);
        legR.knee.rotation.set(0.16 + Math.max(0, kick) * 0.26, 0, 0);
        legL.ankle.rotation.set(0.45, 0, 0);
        legR.ankle.rotation.set(0.45, 0, 0);
      }
    },
  };
}
