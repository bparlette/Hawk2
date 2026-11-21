// Scaggsville 3D — the garage chooser (start screen).
//
// Replaces the DOM card-grid PICK YOUR PLAYER screen with a GTA-garage
// turntable: the selected crew member's car rotates centre-screen on a lit
// stage, driver standing alongside, browse prev/next swaps car + driver
// together, and a customize panel (paint / ride height / rims / tint /
// headlight colour / chrome package) edits the ACTUAL 3D car in real time.
// START RALLY hands the customized car to startGame, which builds the
// player's car through buildCustomVehicle below — so what you see on the
// stage is exactly what you drive.
//
// Stage composition follows gamepress docs/CHARACTER-SELECTOR.md (three-
// point lighting, contact shadow, phone refit keeping the whole car and
// the figure's soles in the free area of the screen).
//
// Customization works by material fingerprinting on the built vehicle:
// gpvehicles' loft builder makes FRESH materials per build, and every
// material we touch is clone-first, so shared factory materials
// (VEHICLE_MATS, glow cards) are never mutated and parked/follower cars
// stay stock. Categories:
//   paint — physical, opaque, clearcoat >= .5, metalness >= .2 (loft
//           paint / paintFront / paintRear; Brad's length fade rides in
//           vertex colours on the base — a respray turns vertex colours
//           off, stock reset restores them, so the fade comes back)
//   glass — physical + transparent (windshield / side / rear)
//   glow  — basic + additive (headlight pool + halos follow beam colour)
//   lens  — standard/physical with a warm emissive at intensity >= 1.2
//   trim  — the loft trimBlack / trimGrey hexes (wipers included: the
//           loft wiper arm + blade are trimBlack) -> chrome package
//   rim   — standard, metalness >= .7, inside the wheel spin pivots only
import * as THREE from 'three';
import { buildVehicle, glowTexture } from '../../shared/gpvehicles.js';
import { buildPerson, poseIdle } from '../../shared/people.js';
import { CREW_VEHICLES, CREW_PEOPLE } from './crew.js';

/* ============================== CUSTOM DATA ============================== */
export function stockCustom() {
  return { paint: null, ride: 0, rimScale: 1, rimFinish: null, tint: 0, beam: null, chrome: false };
}

const RIM_FINISHES = {
  polished: { color: 0xd0d6de, metalness: 0.78, roughness: 0.26 },
  chrome:   { color: 0xf2f5f8, metalness: 1.0,  roughness: 0.08 },
  black:    { color: 0x17181c, metalness: 0.4,  roughness: 0.6 },
  gold:     { color: 0xc9a227, metalness: 0.9,  roughness: 0.3 },
  white:    { color: 0xe8e8e6, metalness: 0.3,  roughness: 0.4 },
};

/* ====================== CUSTOMIZATION ENGINE ====================== */
// Scan a built vehicle once: fingerprint its materials (cloning each one
// we may touch, per mesh) and record stock values + transform baselines.
function scanVehicle(veh) {
  if (veh._gz) return veh._gz;
  const gz = { paint: [], glass: [], glow: [], lens: [], trim: [], rim: [], children: [], wheels: [], stockBeam: veh.beamColor };
  const capture = m => ({
    color: m.color ? m.color.getHex() : 0,
    emissive: m.emissive ? m.emissive.getHex() : 0,
    emissiveIntensity: m.emissiveIntensity ?? 1,
    opacity: m.opacity ?? 1,
    vertexColors: !!m.vertexColors,
    metalness: m.metalness ?? 0,
    roughness: m.roughness ?? 0,
  });
  function own(mesh, cat) {
    const m = mesh.material;
    if (!m || Array.isArray(m)) return;
    if (!m.userData.__gzOwned) {
      const c = m.clone();
      c.userData.__gzOwned = true;
      mesh.material = c;
      gz[cat].push({ mat: c, stock: capture(c) });
    } else if (!gz[cat].some(e => e.mat === m)) {
      gz[cat].push({ mat: m, stock: capture(m) });
    }
  }
  const wheelPivots = new Set();
  for (const key of ['fl', 'fr', 'rl', 'rr']) {
    const w = veh.wheels && veh.wheels[key];
    if (!w) continue;
    const pivot = w.pivot || w.steerPivot, spin = w.spin || w.spinPivot;
    if (pivot) wheelPivots.add(pivot);
    if (pivot && spin) gz.wheels.push({ pivot, spin, baseY: pivot.position.y });
  }
  veh.group.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m = o.material;
    if (m.isMeshPhysicalMaterial && !m.transparent && (m.clearcoat || 0) >= 0.5 && (m.metalness || 0) >= 0.2) own(o, 'paint');
    else if (m.isMeshPhysicalMaterial && m.transparent) own(o, 'glass');
    else if (m.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending && !o.userData?.isTailGlow) own(o, 'glow');
    else if ((m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && m.emissive && (m.emissiveIntensity || 0) >= 1.2 && m.emissive.g > 0.3) own(o, 'lens');
    else if (m.isMeshStandardMaterial && !m.transparent && m.color && (m.color.getHex() === 0x181a1e || m.color.getHex() === 0x454a52)) own(o, 'trim');
  });
  for (const w of gz.wheels) {
    w.spin.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      if (m.isMeshStandardMaterial && (m.metalness || 0) >= 0.7) own(o, 'rim');
    });
  }
  // ride-height baselines: every direct child except the wheel pivots and
  // the underglow ground plane (a flat plane hugging the road) rides with
  // the body — driver anchor and light bar included.
  for (const child of veh.group.children) {
    if (wheelPivots.has(child)) continue;
    if (child.isMesh && child.geometry && child.geometry.type === 'PlaneGeometry' && child.position.y < 0.2) continue;
    gz.children.push({ obj: child, baseY: child.position.y });
  }
  veh._gz = gz;
  return gz;
}

export function applyCustomization(veh, custom) {
  const gz = scanVehicle(veh);
  const c = custom || stockCustom();
  // paint (null = stock; on split cars stock = the vertex-colour fade)
  for (const e of gz.paint) {
    if (c.paint == null) {
      e.mat.color.setHex(e.stock.color);
      if (e.mat.vertexColors !== e.stock.vertexColors) { e.mat.vertexColors = e.stock.vertexColors; e.mat.needsUpdate = true; }
    } else {
      e.mat.color.setHex(c.paint);
      if (e.mat.vertexColors) { e.mat.vertexColors = false; e.mat.needsUpdate = true; }
    }
  }
  // window tint 0..1 (0 = stock glass)
  for (const e of gz.glass) {
    const t = THREE.MathUtils.clamp(c.tint || 0, 0, 1);
    e.mat.opacity = e.stock.opacity + (0.98 - e.stock.opacity) * t;
    e.mat.color.setHex(e.stock.color).lerp(new THREE.Color(0x04060a), t * 0.75);
  }
  // headlight colour: beam (host spotlight reads veh.beamColor) + pool /
  // halo glow cards + the lamp lenses themselves
  const beam = (c.beam == null) ? gz.stockBeam : c.beam;
  veh.beamColor = beam;
  for (const e of gz.glow) e.mat.color.setHex(beam == null ? e.stock.color : beam);
  for (const e of gz.lens) {
    if (c.beam == null) { e.mat.emissive.setHex(e.stock.emissive); e.mat.color.setHex(e.stock.color); }
    else {
      e.mat.emissive.setHex(beam);
      e.mat.color.setHex(beam).lerp(new THREE.Color(0xffffff), 0.45);
    }
  }
  // chrome package: trim (wipers, mirror housings, stalks) goes bright
  for (const e of gz.trim) {
    if (c.chrome) { e.mat.color.setHex(0xe6ecf4); e.mat.metalness = 0.95; e.mat.roughness = 0.16; }
    else { e.mat.color.setHex(e.stock.color); e.mat.metalness = e.stock.metalness; e.mat.roughness = e.stock.roughness; }
  }
  // ride height: body children move, wheels stay planted
  const drop = c.ride > 0 ? c.ride * 0.11 : c.ride * 0.08; // ride>0 slammed, ride<0 lifted
  for (const ch of gz.children) ch.obj.position.y = ch.baseY - drop;
  // rims: size scales the whole wheel on its axle; finish recolours the rim
  const rs = THREE.MathUtils.clamp(c.rimScale || 1, 0.8, 1.3);
  for (const w of gz.wheels) {
    w.spin.scale.setScalar(rs);
    w.pivot.position.y = w.baseY * rs;
  }
  const fin = c.rimFinish && RIM_FINISHES[c.rimFinish];
  for (const e of gz.rim) {
    if (fin) { e.mat.color.setHex(fin.color); e.mat.metalness = fin.metalness; e.mat.roughness = fin.roughness; }
    else { e.mat.color.setHex(e.stock.color); e.mat.metalness = e.stock.metalness; e.mat.roughness = e.stock.roughness; }
  }
  return veh;
}

// Build a crew car with a customization applied — used by the stage AND
// by startGame, so the driven car is the stage car, byte for byte.
export function buildCustomVehicle(carId, custom) {
  const veh = buildVehicle(CREW_VEHICLES[carId]);
  applyCustomization(veh, custom || stockCustom());
  return veh;
}

function disposeVehicle(veh) {
  if (!veh || !veh.group) return;
  veh.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
}

/* ============================== THE STAGE ============================== */
// Free-area framing: the DOM head/plate sit at the top and the customize
// panel + START at the bottom; the car is fitted into the band between
// them (fractions of screen height) via an off-axis view offset — the
// CHARACTER-SELECTOR refit rule (whole car + soles stay visible).
// Compacted layout (Cherie, Nov 21): headings ~11% + bottom zone ~37%
// leaves the band below — if the DOM heights change, retune these.
const FREE_TOP = 0.13, FREE_BOT = 0.63; // tuned by screenshot pass
function createStage(environment) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141126);
  scene.fog = new THREE.Fog(0x141126, 30, 72);
  if (environment) scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 160);

  const key = new THREE.DirectionalLight(0xffe3b3, 2.6);
  key.position.set(4.5, 6.5, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 1; key.shadow.camera.far = 25; key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7a9cc6, 0.75); fill.position.set(-5.5, 3, -1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbfd9ff, 1.7); rim.position.set(-2, 4.5, -6.5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x8a90c0, 0x1a1626, 0.55));

  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 48),
    new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.28, 3.44, 64),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; scene.add(blob);

  const table = new THREE.Group(); scene.add(table);
  let veh = null, person = null, fitLen = 4.9, fitWid = 1.9, fitH = 1.8;
  const START_AZ = -0.62;

  function refit() {
    camera.aspect = innerWidth / innerHeight;
    const fy = (FREE_TOP + FREE_BOT) / 2, fh = FREE_BOT - FREE_TOP;
    camera.setViewOffset(innerWidth, innerHeight, 0, (0.5 - fy) * innerHeight, innerWidth, innerHeight);
    const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const hTan = vTan * camera.aspect;
    // projected half-width of the car at the 3/4 start azimuth (+ margin
    // for the orbiting driver figure); at exact side-on the bumpers may
    // kiss the screen edges — the drag spin is how you view those angles.
    const projHalf = (fitLen / 2) * Math.sin(Math.abs(START_AZ)) + (fitWid / 2) * Math.cos(START_AZ) + 0.35;
    const distH = projHalf / (hTan * 0.94);
    const distV = (fitH / 2 + 0.22) / (vTan * fh);
    const dist = Math.max(distH, distV) * 1.13; // margin: whole car inside at every spin angle (side-on projects narrower than the fitted 3/4 view)
    const el = 0.30, ty = fitH * 0.44;
    camera.position.set(Math.sin(START_AZ) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(START_AZ) * Math.cos(el) * dist);
    camera.lookAt(0, ty, 0);
    camera.updateProjectionMatrix();
  }
  function setContent(newVeh, newPerson) {
    while (table.children.length) table.remove(table.children[0]);
    veh = newVeh; person = newPerson;
    if (veh) {
      table.add(veh.group);
      const d = veh.dims;
      const px = d.wid / 2 + 0.55;
      if (person) {
        person.group.position.set(-px, 0, 0.35); // camera side at the start azimuth
        person.group.rotation.y = -0.85;
        table.add(person.group);
      }
      fitLen = d.len; fitWid = d.wid;
      fitH = Math.max(1.55, person ? 1.82 : 1.5);
      blob.scale.set(d.wid * 1.5, d.len * 1.12, 1);
      ring.scale.setScalar(Math.max(1, Math.hypot(d.len / 2 + 0.1, px + 0.3) / 3.3));
    }
    table.rotation.y = 0.5;
    refit();
  }
  let idleT = 0, vel = 0, dragging = false;
  return {
    scene, camera, setContent, refit,
    get veh() { return veh; },
    get person() { return person; },
    dragStart() { dragging = true; vel = 0; },
    dragBy(dx) { table.rotation.y += dx * 0.008; idleT = 0; },
    dragEnd() { dragging = false; },
    update(dt, t) {
      idleT += dt;
      if (!dragging && idleT > 2.2) table.rotation.y += dt * 0.45; // idle turntable
      if (person) poseIdle(person, t);
      if (veh) veh.updateWheels(0, 0, dt);
    },
    render(renderer) { renderer.render(scene, camera); },
  };
}

/* ============================== THE UI ============================== */
const PAINTS = [
  ['Stock', null], ['White', 0xf2f0ea], ['Black', 0x14151a], ['Red', 0xb02020], ['Maroon', 0x6e1f2a],
  ['Blue', 0x2a66b0], ['Teal', 0x2a7d8c], ['Green', 0x2e6b34], ['Silver', 0xc8ccd2], ['Gold', 0xc9a227],
  ['Purple', 0x5b2a86], ['Orange', 0xd86a1e], ['Pink', 0xd86a9a],
];
const BEAMS = [
  ['Stock', null], ['Warm', 0xffd9a8], ['Yellow', 0xffb800], ['Blue', 0x0066ff],
  ['Ice', 0xbfe3ff], ['Purple', 0xb46bff], ['Red', 0xff2b2b], ['Green', 0x51ff7a],
];
const FINISHES = [['Stock', null], ['Polished', 'polished'], ['Chrome', 'chrome'], ['Black', 'black'], ['Gold', 'gold'], ['White', 'white']];
const css = `
#pick{background:linear-gradient(180deg, rgba(8,6,18,.62), rgba(8,6,18,0) 26%, rgba(8,6,18,0) 58%, rgba(8,6,18,.66)) !important; overflow:hidden;
  padding:calc(6px + env(safe-area-inset-top)) 10px 8px !important;}
#pick h1{font-size:19px;margin:0;letter-spacing:.1em;}
#pick h2{font-size:10px;margin:1px 0 3px;letter-spacing:.16em;}
.grg-drag{position:absolute;inset:0;z-index:1;touch-action:none;}
.grg-head{position:relative;z-index:2;text-align:center;pointer-events:none;}
.grg-plate{position:relative;z-index:2;text-align:center;pointer-events:none;margin-top:0;}
.grg-plate .nm{color:#fff;font-size:20px;font-weight:900;letter-spacing:.05em;text-shadow:0 2px 10px rgba(0,0,0,.8);line-height:1.0;}
.grg-plate .st{color:#ffd9a0;font-size:10px;font-weight:800;letter-spacing:.16em;text-shadow:0 1px 5px rgba(0,0,0,.9);margin-top:1px;}
.grg-plate .car{color:#cfd6ea;font-size:11.5px;font-weight:700;text-shadow:0 1px 5px rgba(0,0,0,.9);margin-top:0;}
.grg-nav{position:absolute;top:35%;z-index:3;width:54px;height:74px;border-radius:14px;border:2px solid rgba(255,255,255,.35);
  background:rgba(12,14,28,.55);color:#ffd23f;font-size:34px;font-weight:900;line-height:1;cursor:pointer;pointer-events:auto;
  display:flex;align-items:center;justify-content:center;text-shadow:0 2px 6px rgba(0,0,0,.7);}
.grg-nav:active{background:rgba(255,210,63,.25);}
.grg-prev{left:8px;} .grg-next{right:8px;}
.grg-count{position:absolute;top:calc(35% + 80px);z-index:2;width:54px;text-align:center;color:#cfd6ea;font-size:12px;font-weight:800;pointer-events:none;}
.grg-count-l{left:8px;} .grg-count-r{right:8px;display:none;}
.grg-bottom{position:relative;z-index:2;margin-top:auto;width:min(560px,96vw);display:flex;flex-direction:column;align-items:stretch;}
.grg-panel{background:rgba(10,12,24,.78);border:2px solid rgba(255,255,255,.16);border-radius:14px;padding:6px 10px 8px;
  max-height:26.3vh;overflow-y:auto;pointer-events:auto;backdrop-filter:blur(3px);
  -webkit-mask-image:linear-gradient(180deg,#000 90%,transparent 100%);mask-image:linear-gradient(180deg,#000 90%,transparent 100%);}
.grg-panel.at-end{-webkit-mask-image:none;mask-image:none;}
.grg-row{display:flex;align-items:center;gap:7px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.07);}
.grg-row:last-child{border-bottom:none;}
.grg-lab{color:#ffd9a0;font-size:10px;font-weight:900;letter-spacing:.1em;width:58px;flex:none;}
.grg-swatches{display:flex;gap:5px;flex-wrap:wrap;align-items:center;}
.grg-sw{width:23px;height:23px;border-radius:50%;border:2px solid rgba(255,255,255,.35);cursor:pointer;flex:none;padding:0;}
.grg-sw.on{border-color:#ffd23f;box-shadow:0 0 0 2px rgba(255,210,63,.5);}
.grg-sw.stock{width:auto;height:23px;border-radius:12px;padding:0 8px;color:#fff;font-size:9px;font-weight:900;letter-spacing:.08em;background:rgba(255,255,255,.12);}
.grg-sw.fin{width:auto;height:23px;border-radius:12px;padding:0 8px;color:#fff;font-size:9px;font-weight:900;letter-spacing:.06em;}
.grg-range{flex:1;accent-color:#ffd23f;height:26px;}
.grg-tog{border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;border-radius:12px;height:26px;
  padding:0 11px;font-size:10px;font-weight:900;letter-spacing:.08em;cursor:pointer;}
.grg-tog.on{border-color:#ffd23f;background:rgba(255,210,63,.25);color:#ffd23f;}
.grg-start{margin-top:8px;pointer-events:auto;border:3px solid #ffd23f;background:rgba(46,160,80,.88);color:#fff;border-radius:14px;
  font-size:18px;font-weight:900;letter-spacing:.1em;padding:9px 10px;cursor:pointer;text-shadow:0 1px 4px rgba(0,0,0,.5);
  box-shadow:0 6px 22px rgba(0,0,0,.5);}
.grg-start:active{filter:brightness(1.25);}
.grg-foot{color:#8f97ad;font-size:10px;margin-top:6px;text-align:center;line-height:1.4;position:relative;z-index:2;}
`;

export function mountGarage(pickEl, opts) {
  const { households, stops, environment, onStart } = opts;
  if (!document.getElementById('grg-css')) {
    const st = document.createElement('style'); st.id = 'grg-css'; st.textContent = css; document.head.appendChild(st);
  }
  pickEl.innerHTML = `
    <div class="grg-drag"></div>
    <div class="grg-head"><h1>SCAGGSVILLE 3D</h1><h2>PICK YOUR PLAYER</h2></div>
    <div class="grg-plate"><div class="nm"></div><div class="st"></div><div class="car"></div></div>
    <button class="grg-nav grg-prev" aria-label="Previous player">‹</button>
    <button class="grg-nav grg-next" aria-label="Next player">›</button>
    <div class="grg-count grg-count-l"></div>
    <div class="grg-bottom">
      <div class="grg-panel"></div>
      <button class="grg-start">START RALLY ▸</button>
    </div>
    <div class="grg-foot">Drag the car to spin it · Left stick / WASD steers · A = gas · B = brake &amp; reverse</div>`;
  const stage = createStage(environment);
  const customs = {};   // stopId -> custom (kept across browsing)
  let idx = 0, curVeh = null, curFig = null, curCarId = null, launched = false;
  const $ = s => pickEl.querySelector(s);
  const nameEl = $('.grg-plate .nm'), streetEl = $('.grg-plate .st'), carEl = $('.grg-plate .car'),
        countEl = $('.grg-count'), panelEl = $('.grg-panel');

  function custom() { const id = households[idx].stop; return customs[id] || (customs[id] = stockCustom()); }
  function applyToStage() { if (curVeh) applyCustomization(curVeh, custom()); syncPanel(); }

  function swatchRow(lab, items, get, set) {
    const row = document.createElement('div'); row.className = 'grg-row';
    const l = document.createElement('div'); l.className = 'grg-lab'; l.textContent = lab; row.appendChild(l);
    const wrap = document.createElement('div'); wrap.className = 'grg-swatches'; row.appendChild(wrap);
    for (const [name, val] of items) {
      const b = document.createElement('button');
      const isColor = typeof val === 'number';
      b.className = 'grg-sw' + (val === null ? ' stock' : '') + (!isColor && val !== null ? ' fin' : '');
      if (isColor) b.style.background = '#' + val.toString(16).padStart(6, '0');
      else b.textContent = name;
      b.title = name;
      b.dataset.on = get() === val ? '1' : '';
      if (get() === val) b.classList.add('on');
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); set(val); applyToStage(); });
      wrap.appendChild(b);
    }
    return row;
  }
  function sliderRow(lab, min, max, step, get, set) {
    const row = document.createElement('div'); row.className = 'grg-row';
    const l = document.createElement('div'); l.className = 'grg-lab'; l.textContent = lab; row.appendChild(l);
    const r = document.createElement('input');
    r.type = 'range'; r.className = 'grg-range'; r.min = min; r.max = max; r.step = step; r.value = get();
    r.addEventListener('input', () => { set(parseFloat(r.value)); if (curVeh) applyCustomization(curVeh, custom()); });
    row.appendChild(r);
    return row;
  }
  function syncPanel() {
    const cu = custom();
    panelEl.innerHTML = '';
    panelEl.scrollTop = 0; panelEl.classList.remove('at-end');
    // Row order (Cherie, Nov 21): the everyday adjustments first; PAINT is
    // demoted to the very last row — below the fold, scroll to reach it.
    panelEl.appendChild(sliderRow('RIDE', -100, 100, 1, () => Math.round(cu.ride * 100), v => { cu.ride = v / 100; }));
    panelEl.appendChild(sliderRow('RIMS', 85, 125, 1, () => Math.round(cu.rimScale * 100), v => { cu.rimScale = v / 100; }));
    panelEl.appendChild(swatchRow('FINISH', FINISHES, () => cu.rimFinish, v => { cu.rimFinish = v; }));
    panelEl.appendChild(sliderRow('TINT', 0, 100, 1, () => Math.round(cu.tint * 100), v => { cu.tint = v / 100; }));
    panelEl.appendChild(swatchRow('LIGHTS', BEAMS, () => cu.beam, v => { cu.beam = v; }));
    const row = document.createElement('div'); row.className = 'grg-row';
    const l = document.createElement('div'); l.className = 'grg-lab'; l.textContent = 'CHROME'; row.appendChild(l);
    const tog = document.createElement('button');
    tog.className = 'grg-tog' + (cu.chrome ? ' on' : ''); tog.textContent = cu.chrome ? 'ON — WIPERS TOO' : 'OFF';
    tog.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cu.chrome = !cu.chrome; applyToStage(); });
    row.appendChild(tog);
    const rst = document.createElement('button');
    rst.className = 'grg-tog'; rst.textContent = 'RESET STOCK'; rst.style.marginLeft = 'auto';
    rst.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); customs[households[idx].stop] = stockCustom(); applyToStage(); });
    row.appendChild(rst);
    panelEl.appendChild(row);
    panelEl.appendChild(swatchRow('PAINT', PAINTS, () => cu.paint, v => { cu.paint = v; }));
  }

  function show(i) {
    idx = (i + households.length) % households.length;
    const hh = households[idx], s = stops[hh.stop];
    curCarId = hh.cars[0];
    const old = curVeh, oldFig = curFig;
    curVeh = buildCustomVehicle(curCarId, custom());
    curFig = CREW_PEOPLE[curCarId] ? buildPerson(CREW_PEOPLE[curCarId]) : null;
    stage.setContent(curVeh, curFig);
    if (old) disposeVehicle(old);
    if (oldFig) oldFig.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    nameEl.textContent = hh.label;
    streetEl.textContent = s.street.toUpperCase();
    carEl.textContent = hh.cars.map(cId => CREW_VEHICLES[cId].name).join(' · ');
    countEl.textContent = (idx + 1) + ' / ' + households.length;
    syncPanel();
  }
  // the panel's bottom fade (the "more below" hint) lifts at scroll end
  panelEl.addEventListener('scroll', () => {
    panelEl.classList.toggle('at-end', panelEl.scrollTop + panelEl.clientHeight >= panelEl.scrollHeight - 4);
  }, { passive: true });
  $('.grg-prev').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); show(idx - 1); });
  $('.grg-next').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); show(idx + 1); });
  $('.grg-start').addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (launched) return; launched = true;
    onStart(households[idx].stop, { ...custom() });
  });
  // drag to spin (yield from the current angle — never snaps back)
  const dragEl = $('.grg-drag');
  let dragId = null, lastX = 0;
  dragEl.addEventListener('pointerdown', e => { dragId = e.pointerId; lastX = e.clientX; stage.dragStart(); try { dragEl.setPointerCapture(e.pointerId); } catch (_) {} });
  dragEl.addEventListener('pointermove', e => { if (e.pointerId !== dragId) return; stage.dragBy(e.clientX - lastX); lastX = e.clientX; });
  const endDrag = e => { if (e.pointerId === dragId) { dragId = null; stage.dragEnd(); } };
  dragEl.addEventListener('pointerup', endDrag); dragEl.addEventListener('pointercancel', endDrag);
  window.addEventListener('keydown', e => {
    if (launched) return;
    if (e.code === 'ArrowLeft') show(idx - 1);
    else if (e.code === 'ArrowRight') show(idx + 1);
    else if (e.code === 'Enter') $('.grg-start').dispatchEvent(new PointerEvent('pointerdown'));
  });
  window.addEventListener('resize', () => { if (!launched) stage.refit(); });

  show(0);
  return {
    scene: stage.scene,
    camera: stage.camera,
    update(dt, t) { if (!launched) stage.update(dt, t); },
    render(renderer) { if (!launched) stage.render(renderer); },
    selection() { return { stop: households[idx].stop, carId: curCarId, custom: { ...custom() } }; },
    get launched() { return launched; },
  };
}
