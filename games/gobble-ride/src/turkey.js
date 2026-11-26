import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { DynamicTube, loft, v3, TAU, placeBetween, unitCylinder, solveTwoBone, clamp, lerp, damp, smoothstep } from './util.js';
import { makeFeatherTexture } from './textures.js';

const BODY_POS = v3(-0.13, 0.965, 0);
const BODY_PITCH = 0.35;
const THIGH = 0.36;
const SHIN = 0.37;
const HUMERUS = 0.22;
const FOREARM = 0.23;
const BEAK_L = 0.13;

function materials() {
  const feather = makeFeatherTexture();
  feather.repeat.set(9, 5);
  const whiteBase = {
    color: '#9c6b3f',
    roughness: 0.9,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ffffff'),
    bumpMap: feather,
    bumpScale: 0.45,
  };
  return {
    body: new THREE.MeshPhysicalMaterial({ ...whiteBase, color: '#ffffff', vertexColors: true }),
    white: new THREE.MeshPhysicalMaterial(whiteBase),
    panel: new THREE.MeshStandardMaterial({ color: '#7c4f27', roughness: 0.85, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 0.7, side: THREE.DoubleSide }),
    tail: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    beak: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    pouch: new THREE.MeshPhysicalMaterial({
      color: '#c22e2e',
      roughness: 0.5,
      sheen: 0.8,
      sheenColor: new THREE.Color('#ff9a8a'),
      clearcoat: 0.3,
      side: THREE.DoubleSide,
      emissive: new THREE.Color('#4a0500'),
      emissiveIntensity: 0.2,
    }),
    skin: new THREE.MeshStandardMaterial({ color: '#8fb0d8', roughness: 0.55 }),
    eye: new THREE.MeshPhysicalMaterial({ color: '#1a0c08', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12 }),
    iris: new THREE.MeshStandardMaterial({ color: '#7a3b12', roughness: 0.3 }),
    leg: new THREE.MeshPhysicalMaterial({ color: '#9c5a44', roughness: 0.5, clearcoat: 0.3 }),
    helmet: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.14 }),
    vent: new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.6 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#0b1016', metalness: 0.9, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.12 }),
    frame: new THREE.MeshPhysicalMaterial({ color: '#8a2f23', roughness: 0.25, clearcoat: 1 }),
    scarfKnot: new THREE.MeshStandardMaterial({ color: '#c1551f', roughness: 0.7 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#e8b13c', metalness: 0.85, roughness: 0.3 }),
  };
}

// Body: deformed sphere + cream breast
function bodyGeometry() {
  const g = new THREE.SphereGeometry(1, 56, 36);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const white = new THREE.Color('#96622f');
  const cream = new THREE.Color('#eed9a4');
  const grey = new THREE.Color('#68431d');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const taper = x < 0 ? 1 - 0.5 * Math.pow(-x, 1.7) : 1 - 0.14 * x * x;
    let X = x * 0.42;
    let Y = y * 0.26 * taper * (y < 0 ? 0.95 : 1);
    const Z = z * 0.245 * taper;
    if (x < -0.35) Y += (-x - 0.35) * 0.06;
    if (x > 0.2 && y > 0) X += y * 0.05 * (x - 0.2);
    p.setXYZ(i, X, Y, Z);
    c.copy(white);
    c.lerp(cream, smoothstep(0.35, 0.85, x) * smoothstep(-0.6, 0.1, y) * 0.8);
    c.lerp(grey, smoothstep(0.2, 0.9, y) * smoothstep(0.2, -0.6, x) * 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function featherShape(len, width) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(len * 0.12, width * 0.55, len * 0.5, width * 0.5);
  s.quadraticCurveTo(len * 0.92, width * 0.42, len, 0);
  s.quadraticCurveTo(len * 0.9, -width * 0.42, len * 0.5, -width * 0.5);
  s.quadraticCurveTo(len * 0.12, -width * 0.55, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  g.rotateX(Math.PI / 2); // Shape Y -> +Z (within the wing plane)
  return g;
}

function panelGeometry(len, depth, scallops) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.01);
  s.lineTo(len, -0.01);
  const n = scallops;
  for (let i = 0; i <= n; i++) {
    const x = len - (i / n) * len;
    const d = depth * (0.75 + 0.25 * Math.sin((i / n) * Math.PI));
    s.quadraticCurveTo(x + len / n / 2, d * 1.08, x, d * 0.9);
  }
  s.lineTo(0, -0.01);
  const g = new THREE.ShapeGeometry(s, 4);
  g.rotateX(Math.PI / 2);
  return g;
}

// One tail feather: pointed oval in the XY plane (length along +Y) with the
// classic turkey banding — chestnut base, dark subterminal band, cream tip.
function tailFeatherGeometry(len, width) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(width * 0.62, len * 0.3, width * 0.5, len * 0.62);
  s.quadraticCurveTo(width * 0.42, len * 0.88, 0, len);
  s.quadraticCurveTo(-width * 0.42, len * 0.88, -width * 0.5, len * 0.62);
  s.quadraticCurveTo(-width * 0.62, len * 0.3, 0, 0);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const base = new THREE.Color('#7c4f27');
  const mid = new THREE.Color('#a06a30');
  const band = new THREE.Color('#2a1a0e');
  const tip = new THREE.Color('#ecd7a4');
  const shaft = new THREE.Color('#c9a35f');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / len;
    const xc = Math.abs(p.getX(i)) / (width * 0.6);
    c.copy(base).lerp(mid, smoothstep(0.05, 0.55, t));
    if (t > 0.78 && t < 0.9) c.copy(band);
    if (t >= 0.9) c.copy(tip);
    if (xc < 0.16) c.lerp(shaft, 0.55);
    // subtle barring across the vane
    const bar = 0.92 + 0.08 * Math.sin(t * 46);
    col.set([c.r * bar, c.g * bar, c.b * bar], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function footGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.02, 0.012);
  s.quadraticCurveTo(0.04, 0.03, 0.1, 0.05);
  s.quadraticCurveTo(0.09, 0.028, 0.105, 0.022);
  s.quadraticCurveTo(0.11, 0.01, 0.125, 0.0);
  s.quadraticCurveTo(0.11, -0.01, 0.105, -0.022);
  s.quadraticCurveTo(0.09, -0.028, 0.1, -0.05);
  s.quadraticCurveTo(0.04, -0.03, -0.02, -0.012);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); // Lay flat, toes toward +X
  return g;
}

function upperBeak() {
  const base = new THREE.Color('#d9c39a');
  const mid = new THREE.Color('#cbb489');
  const tip = new THREE.Color('#a5854f');
  const nail = new THREE.Color('#8a6f4d');
  return loft({
    segs: 36,
    ring: 20,
    center: (t) => v3(t * BEAK_L, -0.004 * t - 0.007 * t * t * t, 0),
    section: (t, a) => {
      const th = a * TAU;
      const close = Math.sqrt(Math.max(0, 1 - Math.pow(t, 10)));
      const w = (0.02 * (1 - 0.4 * t) + 0.004) * close;
      const h = (0.014 * (1 - 0.4 * t) + 0.003) * close;
      const c = Math.cos(th);
      const ridge = c > 0.9 ? 1.18 : 1;
      return [c > 0 ? c * h * ridge : c * h * 0.3, Math.sin(th) * w];
    },
    color: (t, a, c) => {
      c.copy(base).lerp(mid, smoothstep(0.0, 0.35, t)).lerp(tip, smoothstep(0.5, 0.95, t));
      if (t > 0.94) c.copy(nail);
      if (Math.cos(a * TAU) > 0.85) c.offsetHSL(0, 0, 0.06);
    },
  });
}

function lowerBeak() {
  const c0 = new THREE.Color('#b39b6d');
  const c1 = new THREE.Color('#8a6f4d');
  return loft({
    segs: 30,
    ring: 14,
    center: (t) => v3(t * BEAK_L * 0.97, -0.018 - 0.008 * t - 0.012 * t * t * t, 0),
    section: (t, a) => {
      const th = a * TAU;
      const close = Math.sqrt(Math.max(0, 1 - Math.pow(t, 10)));
      const w = (0.018 * (1 - 0.4 * t) + 0.003) * close;
      const h = 0.005 * close + 0.001;
      return [Math.cos(th) * h, Math.sin(th) * w];
    },
    color: (t, a, c) => c.copy(c0).lerp(c1, t),
  });
}

function wattleGeometry() {
  const g = new THREE.SphereGeometry(0.03, 14, 12);
  g.scale(0.55, 1.25, 0.4);
  g.translate(0, -0.032, 0);
  return g;
}

function snoodGeometry() {
  const g = new THREE.CapsuleGeometry(0.009, 0.035, 4, 10);
  g.rotateZ(Math.PI / 2 - 0.5);
  return g;
}

function helmetGeometry() {
  const black = new THREE.Color('#26221f');
  const bandC = new THREE.Color('#14100d');
  const paintGeo = (g, c) => {
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < g.attributes.position.count; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const crown = paintGeo(new THREE.CylinderGeometry(0.052, 0.06, 0.075, 24), black);
  crown.translate(0, 0.055, 0);
  const brim = paintGeo(new THREE.CylinderGeometry(0.118, 0.118, 0.009, 28), black);
  brim.translate(0, 0.016, 0);
  const band = paintGeo(new THREE.CylinderGeometry(0.0615, 0.0625, 0.02, 24), bandC);
  band.translate(0, 0.026, 0);
  const g = BufferGeometryUtils.mergeGeometries([crown, brim, band]);
  g.scale(1.25, 1, 1.05);
  return g;
}

export function createTurkey() {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'pelican';
  const hitMeshes = [];
  const reg = (m, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    hitMeshes.push(m);
    return m;
  };

  // ---------- Body ----------
  const body = new THREE.Group();
  body.position.copy(BODY_POS);
  body.rotation.z = BODY_PITCH;
  root.add(body);
  const bodyMesh = reg(new THREE.Mesh(bodyGeometry(), M.body));
  body.add(bodyMesh);
  const anchor = (x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    body.add(o);
    return o;
  };
  const A = {
    hipL: anchor(-0.05, -0.125, -0.09),
    hipR: anchor(-0.05, -0.125, 0.09),
    shL: anchor(0.14, 0.085, -0.17),
    shR: anchor(0.14, 0.085, 0.17),
    neck: anchor(0.3, 0.1, 0),
  };
  // Tail fan: the turkey's signature — big banded feathers splayed upright
  const tail = new THREE.Group();
  tail.position.set(-0.42, 0.14, 0);
  body.add(tail);
  for (let i = 0; i < 13; i++) {
    const d = Math.abs(i - 6) / 6;
    const f = new THREE.Mesh(tailFeatherGeometry(0.62 - d * 0.15, 0.105), M.tail);
    const pivot = new THREE.Group();
    // Near-zero Z tilt in body space: the body's own BODY_PITCH (0.35, nose-up)
    // leans the fan back, so a small pivot tilt lands it upright in world space.
    pivot.rotation.set((i - 6) / 6 * 1.08, 0, 0.1 - d * 0.05);
    f.castShadow = true;
    pivot.add(f);
    tail.add(pivot);
  }

  // ---------- Neck (rebuilt every frame) ----------
  const neck = new DynamicTube(28, 18, (t) => {
    const r = lerp(0.058, 0.034, smoothstep(0.0, 0.45, t));
    return r + 0.003 * Math.sin(t * Math.PI) + (t > 0.85 ? (t - 0.85) * 0.02 : 0);
  });
  const neckMesh = reg(new THREE.Mesh(neck.geometry, M.white));
  neckMesh.frustumCulled = false;
  root.add(neckMesh);
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.018, 10, 24), M.scarfKnot);
  knot.castShadow = true;
  root.add(knot);

  // ---------- Head ----------
  const head = new THREE.Group();
  root.add(head);
  const skull = reg(new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 20), M.white));
  skull.scale.set(1.3, 1.0, 0.9);
  const forehead = reg(new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), M.white));
  forehead.scale.set(1.45, 0.85, 0.85);
  forehead.position.set(0.05, -0.006, 0);
  const throat = reg(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), M.white));
  throat.position.set(0.02, -0.045, 0);
  head.add(skull, forehead, throat);
  const eyes = [];
  const lids = [];
  for (const s of [-1, 1]) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), M.skin);
    patch.scale.set(1.25, 0.8, 0.45);
    patch.position.set(0.048, 0.004, s * 0.05);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0128, 16, 12), M.eye);
    eye.position.set(0.05, 0.008, s * 0.06);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), M.iris);
    iris.position.set(0.054, 0.009, s * 0.0715);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), M.eye);
    pupil.position.set(0.0555, 0.009, s * 0.0752);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 16, 12), M.skin);
    lid.position.copy(eye.position);
    lid.scale.setScalar(0.001);
    head.add(patch, eye, iris, pupil, lid);
    eyes.push(eye);
    lids.push(lid);
  }
  // Pilgrim hat
  const helmet = new THREE.Group();
  const shell = new THREE.Mesh(helmetGeometry(), M.helmet);
  shell.castShadow = true;
  helmet.add(shell);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.034), M.gold);
  buckle.position.set(0.072, 0.028, 0);
  helmet.add(buckle);
  helmet.position.set(-0.015, 0.045, 0);
  helmet.rotation.z = -0.1;
  head.add(helmet);
  // Sunglasses
  const glasses = new THREE.Group();
  for (const s of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 24), M.lens);
    lens.rotation.x = Math.PI / 2;
    lens.rotation.y = s * 0.35;
    lens.position.set(0.058, 0.01, s * 0.079);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 24), M.frame);
    rim.position.copy(lens.position);
    rim.rotation.y = s * 0.35;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.004), M.frame);
    arm.position.set(0.005, 0.02, s * 0.074);
    arm.rotation.y = -s * 0.06;
    glasses.add(lens, rim, arm);
  }
  const bridgeCurve = new THREE.CatmullRomCurve3([v3(0.064, 0.022, -0.068), v3(0.085, 0.04, 0), v3(0.064, 0.022, 0.068)]);
  glasses.add(new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 16, 0.003, 6), M.frame));
  head.add(glasses);

  // Beak, wattle and snood
  const beak = new THREE.Group();
  beak.position.set(0.085, -0.008, 0);
  beak.rotation.z = -0.15;
  head.add(beak);
  const snood = reg(new THREE.Mesh(snoodGeometry(), M.pouch));
  snood.position.set(0.028, 0.018, 0);
  beak.add(snood);
  const upper = reg(new THREE.Mesh(upperBeak(), M.beak));
  const upperPivot = new THREE.Group();
  upperPivot.add(upper);
  beak.add(upperPivot);
  const jaw = new THREE.Group();
  beak.add(jaw);
  const lower = reg(new THREE.Mesh(lowerBeak(), M.beak));
  const pouch = reg(new THREE.Mesh(wattleGeometry(), M.pouch));
  pouch.position.set(0.012, -0.006, 0);
  jaw.add(lower, pouch);
  // Beak-tip anchor (used for treat-catching checks)
  const beakTip = new THREE.Object3D();
  beakTip.position.set(BEAK_L * 0.85, -0.015, 0);
  beak.add(beakTip);
  const mouth = new THREE.Object3D();
  mouth.position.set(BEAK_L * 0.45, -0.028, 0);
  beak.add(mouth);

  // ---------- Legs ----------
  const leg = (s) => {
    const thigh = reg(new THREE.Mesh(unitCylinder(0.064, 0.042, 14), M.white));
    const knee = reg(new THREE.Mesh(new THREE.SphereGeometry(0.043, 14, 10), M.white));
    const shin = reg(new THREE.Mesh(unitCylinder(0.024, 0.019, 10), M.leg));
    const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), M.leg);
    const foot = new THREE.Mesh(footGeometry(), M.leg);
    foot.castShadow = true;
    ankle.castShadow = true;
    root.add(thigh, knee, shin, ankle, foot);
    return { thigh, knee, shin, ankle, foot, s };
  };
  const legs = [leg(-1), leg(1)];

  // ---------- Wings ----------
  const tertial = panelGeometry(HUMERUS, 0.14, 4);
  const covert = panelGeometry(FOREARM, 0.085, 5);
  const secondary = panelGeometry(FOREARM, 0.165, 7);
  const primaryGeos = [0.2, 0.24, 0.27, 0.28, 0.27, 0.24].map((l) => featherShape(l, 0.05));
  const wing = (s) => {
    const sh = new THREE.Group();
    const el = new THREE.Group();
    const wr = new THREE.Group();
    const hum = reg(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M.white));
    hum.scale.set(HUMERUS / 2 + 0.025, 0.036, 0.07);
    hum.position.set(HUMERUS / 2, 0, 0.018);
    const tp = new THREE.Mesh(tertial, M.panel);
    tp.position.y = -0.004;
    sh.add(hum, tp);
    const fa = reg(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M.white));
    fa.scale.set(FOREARM / 2 + 0.02, 0.03, 0.058);
    fa.position.set(FOREARM / 2, 0, 0.014);
    const cv = new THREE.Mesh(covert, M.panel);
    cv.position.y = 0.002;
    const sc = new THREE.Mesh(secondary, M.black);
    sc.position.y = -0.004;
    el.add(fa, cv, sc);
    const hand = reg(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M.white));
    hand.scale.set(0.05, 0.03, 0.038);
    hand.position.x = 0.02;
    wr.add(hand);
    const prim = primaryGeos.map((g, i) => {
      const f = new THREE.Mesh(g, M.black);
      f.position.set(0.01, -0.003 - i * 0.0015, 0.004 * i);
      f.castShadow = true;
      wr.add(f);
      return f;
    });
    for (const o of [sh, el, wr]) {
      o.traverse((c) => {
        if (c.isMesh) c.castShadow = true;
      });
      root.add(o);
    }
    return { sh, el, wr, prim, s };
  };
  const wings = [wing(-1), wing(1)];

  // ---------- Animation state ----------
  const st = {
    jaw: 0,
    jawTarget: 0,
    bulge: 0,
    blink: 0,
    nextBlink: 1.5,
    blinkT: -1,
    honkT: -1,
    gulpT: -1,
    yaw: 0,
    pitch: 0,
    spread: 0,
    headBob: 0,
  };

  const V = {
    hip: new THREE.Vector3(),
    knee: new THREE.Vector3(),
    ank: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    sh: new THREE.Vector3(),
    el: new THREE.Vector3(),
    wr: new THREE.Vector3(),
    elS: new THREE.Vector3(),
    wrS: new THREE.Vector3(),
    pole: new THREE.Vector3(),
    tmp: new THREE.Vector3(),
    trail: new THREE.Vector3(),
    headPos: new THREE.Vector3(),
    neckBase: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  };
  const neckPts = [v3(0, 0, 0), v3(0, 0, 0), v3(0, 0, 0), v3(0, 0, 0), v3(0, 0, 0)];
  const _bx = new THREE.Vector3();
  const _by = new THREE.Vector3();
  const _bz = new THREE.Vector3();
  const _mb = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _ax = new THREE.Vector3(1, 0, 0);

  const local = (anchorObj, out) => out.copy(anchorObj.position).applyMatrix4(body.matrix);

  // Build a joint frame from the bone direction and the trailing-edge direction
  function orientJoint(obj, from, to, trailHint) {
    _bx.subVectors(to, from).normalize();
    _bz.copy(trailHint).addScaledVector(_bx, -trailHint.dot(_bx));
    if (_bz.lengthSq() < 1e-6) _bz.set(0, -1, 0);
    _bz.normalize();
    _by.crossVectors(_bz, _bx);
    _mb.makeBasis(_bx, _by, _bz);
    obj.position.copy(from);
    obj.quaternion.setFromRotationMatrix(_mb);
  }

  function honk() {
    st.honkT = 0;
  }
  function gulp() {
    st.gulpT = 0;
  }

  function update(dt, ctx) {
    const { t, crankAngle, pedal, airborne, trick, look, grips, pedals, accel } = ctx;
    // Body bobs and sways with the pedalling
    const bob = -Math.abs(Math.sin(crankAngle)) * 0.012 * pedal;
    body.position.set(BODY_POS.x, BODY_POS.y + bob + airborne * 0.025 + trick * 0.03, BODY_POS.z);
    body.rotation.set(Math.sin(crankAngle) * 0.035 * pedal, 0, BODY_PITCH + trick * 0.14 - clamp(accel, -3, 3) * 0.012);
    body.updateMatrix();
    tail.rotation.y = Math.sin(crankAngle) * 0.09 * pedal + Math.sin(t * 2) * 0.03;
    tail.rotation.z = trick * 0.25;

    // ----- Leg IK -----
    for (const L of legs) {
      local(L.s < 0 ? A.hipL : A.hipR, V.hip);
      const p = L.s < 0 ? pedals.L : pedals.R;
      V.tgt.set(p.x - 0.04, p.y + 0.046, p.z * 0.92);
      V.pole.set(1, 0.15, L.s * 0.32);
      solveTwoBone(V.hip, V.tgt, THIGH, SHIN, V.pole, V.knee, V.ank);
      placeBetween(L.thigh, V.hip, V.knee);
      L.knee.position.copy(V.knee);
      placeBetween(L.shin, V.knee, V.ank);
      L.ankle.position.copy(V.ank);
      L.foot.position.set(V.ank.x - 0.012, V.ank.y - 0.04, V.ank.z);
      L.foot.rotation.set(0, 0, -0.08 + Math.sin(-crankAngle + (L.s > 0 ? 0 : Math.PI) + 0.6) * 0.12);
    }

    // ----- Wings: grips <-> spread -----
    st.spread = damp(st.spread, trick, 5, dt);
    const k = smoothstep(0, 1, st.spread);
    const flap = Math.sin(t * 8.5) * 0.55 * airborne + Math.sin(t * 2.6) * 0.32 * k + k * 0.08;
    for (const W of wings) {
      const s = W.s;
      local(s < 0 ? A.shL : A.shR, V.sh);
      const grip = s < 0 ? grips.L : grips.R;
      V.pole.set(-0.25, 0.75, s * 0.85);
      solveTwoBone(V.sh, grip, HUMERUS, FOREARM, V.pole, V.el, V.wr);
      // Spread pose (flapping about the shoulder x-axis)
      V.elS.set(0.0, 0.06, s * HUMERUS * 0.98);
      V.wrS.set(0.02, 0.1, s * (HUMERUS * 0.98 + FOREARM * 0.99));
      _q.setFromAxisAngle(_ax, -s * flap);
      V.elS.applyQuaternion(_q).add(V.sh);
      V.wrS.applyQuaternion(_q).add(V.sh);
      V.el.lerp(V.elS, k);
      V.wr.lerp(V.wrS, k);
      V.trail.set(-1, lerp(-0.7, 0.0, k), 0);
      orientJoint(W.sh, V.sh, V.el, V.trail);
      orientJoint(W.el, V.el, V.wr, V.trail);
      // Hand direction: along the forearm when gripping, extending outward when spread
      V.tmp.subVectors(V.wr, V.el).normalize().multiplyScalar(0.1).add(V.wr);
      orientJoint(W.wr, V.wr, V.tmp, V.trail);
      W.prim.forEach((f, i) => {
        const folded = Math.PI - 0.12 - i * 0.05;
        const spread = i * 0.2 - 0.1;
        f.rotation.y = -lerp(folded, spread, k);
        f.scale.setScalar(1 + k * 0.45);
      });
    }

    // ----- Head: look target; the head stays steady as the body bobs -----
    local(A.neck, V.neckBase);
    st.headBob = damp(st.headBob, bob * 0.25, 10, dt);
    V.headPos.set(V.neckBase.x + 0.075, V.neckBase.y + 0.27 - bob * 0.75 + st.headBob, 0);
    let yawT = 0;
    let pitchT = -0.05;
    if (look) {
      V.dir.subVectors(look, V.headPos);
      yawT = Math.atan2(-V.dir.z, V.dir.x);
      pitchT = Math.atan2(V.dir.y, Math.hypot(V.dir.x, V.dir.z));
      if (V.dir.x < -0.2) yawT = clamp(yawT, -1.2, 1.2);
    }
    yawT = clamp(yawT, -1.05, 1.05);
    pitchT = clamp(pitchT, -0.55, 0.5);
    // Gobble: head back, beak wide open
    let honkK = 0;
    if (st.honkT >= 0) {
      st.honkT += dt;
      honkK = Math.sin(Math.min(1, st.honkT / 0.9) * Math.PI);
      if (st.honkT > 0.9) st.honkT = -1;
    }
    let gulpK = 0;
    if (st.gulpT >= 0) {
      st.gulpT += dt;
      gulpK = st.gulpT < 0.18 ? st.gulpT / 0.18 : Math.max(0, 1 - (st.gulpT - 0.18) / 0.25);
      if (st.gulpT < 0.3) st.bulge = Math.max(st.bulge, st.gulpT / 0.3);
      if (st.gulpT > 1.2) st.gulpT = -1;
    }
    pitchT += honkK * 0.55 + gulpK * 0.35 + trick * 0.15;
    st.yaw = damp(st.yaw, yawT, 5, dt);
    st.pitch = damp(st.pitch, pitchT, 6, dt);
    V.headPos.x -= honkK * 0.02;
    V.headPos.y += honkK * 0.03;
    head.position.copy(V.headPos);
    head.rotation.set(Math.sin(t * 1.3) * 0.03, st.yaw, st.pitch, 'YZX');
    head.updateMatrix();

    st.jawTarget = Math.max(honkK * 0.55, gulpK * 0.7, ctx.mouthOpen || 0);
    st.jaw = damp(st.jaw, st.jawTarget, 20, dt);
    jaw.rotation.z = -st.jaw;
    upperPivot.rotation.z = st.jaw * 0.12;
    st.bulge = Math.max(0, st.bulge - dt * 0.45);
    pouch.scale.setScalar(clamp(1 + st.bulge * 0.7 + Math.sin(t * 20) * 0.05 * st.bulge + honkK * 0.3, 1, 2.1));

    // Blinking
    st.nextBlink -= dt;
    if (st.nextBlink <= 0 && st.blinkT < 0) {
      st.blinkT = 0;
      st.nextBlink = 2 + Math.random() * 4;
    }
    let blink = 0;
    if (st.blinkT >= 0) {
      st.blinkT += dt;
      blink = Math.sin(Math.min(1, st.blinkT / 0.16) * Math.PI);
      if (st.blinkT > 0.16) st.blinkT = -1;
    }
    for (const l of lids) l.scale.setScalar(Math.max(0.001, blink > 0.05 ? blink : 0.001));

    // S-curve neck
    neckPts[0].copy(V.neckBase).add(V.tmp.set(-0.03, -0.03, 0));
    neckPts[1].copy(V.neckBase).add(V.tmp.set(0.035, 0.07, 0));
    neckPts[2].copy(V.neckBase).lerp(V.headPos, 0.45).add(V.tmp.set(0.035, 0, 0));
    neckPts[3].set(-0.06, -0.08, 0).applyMatrix4(head.matrix).lerp(V.tmp.copy(V.headPos).add(_by.set(-0.06, -0.08, 0)), 0.4);
    neckPts[4].set(-0.025, -0.025, 0).applyMatrix4(head.matrix);
    neck.update(neckPts);
    // Scarf knot sits at the base of the neck
    const ki = Math.round(neck.tub * 0.2);
    knot.position.copy(neck._P[ki]);
    knot.quaternion.setFromUnitVectors(_bz.set(0, 0, 1), neck._T[ki]);

    helmet.visible = ctx.helmet;
    glasses.visible = ctx.glasses;
  }

  return {
    root,
    body,
    head,
    beakTip,
    mouth,
    knot,
    hitMeshes,
    update,
    honk,
    gulp,
    materials: M,
    state: st,
  };
}
