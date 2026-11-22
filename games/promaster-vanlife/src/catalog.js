// PROMASTER 50 — Real-World Ram ProMaster 3500 159" High Roof Modular Build Catalog (26 Lego-Snap Parts)
export const BUILD_PHASES = [
  { id: 1, title: '1 · Shell & Floor', subtitle: 'Sound deadening, thermal subfloor & oak LVP' },
  { id: 2, title: '2 · Walls & Cutouts', subtitle: '3M Thinsulate, CRL windows & MaxxAir vent' },
  { id: 3, title: '3 · Cabin & Cab', subtitle: 'Shiplap walls, cedar ceiling, swivel seats & Lagun table' },
  { id: 4, title: '4 · Sleep & Storage', subtitle: 'Transverse ProMaster platform bed, mattress & uppers' },
  { id: 5, title: '5 · Galley & Bath', subtitle: 'Water tanks, sink, Dometic fridge, induction & Nature’s Head' },
  { id: 6, title: '6 · Power & Rig', subtitle: 'Battle Born lithium, Victron, 400W solar, heater & expedition' },
];

export const PARTS = [
  // ================= PHASE 1: BASE SHELL & FLOOR =================
  {
    id: 'kilmat_sound',
    phase: 1,
    name: 'Butyl Sound Deadening',
    brand: 'Kilmat 80 mil (72 sq ft)',
    price: 140,
    weightLbs: 48,
    requires: [],
    stats: { comfort: 6, insulation: 8 },
    slotBox: { x: 0, y: 0.62, z: -1.05, w: 1.84, h: 0.08, d: 3.60 },
    explodeVec: [0, -0.35, 0],
    tip: 'First step in every real ProMaster build: cover ~40% of sheet-metal wall & floor bays to kill highway tin-can resonance.',
  },
  {
    id: 'xps_subfloor',
    phase: 1,
    name: '1" XPS + Birch Subfloor',
    brand: 'Foamular 250 + 1/2" Baltic Birch',
    price: 260,
    weightLbs: 95,
    requires: ['kilmat_sound'],
    stats: { comfort: 6, insulation: 18 },
    slotBox: { x: 0, y: 0.585, z: -1.05, w: 1.86, h: 0.03, d: 3.66 },
    explodeVec: [0, -0.55, 0],
    tip: 'Closes the corrugated steel channels with furring strips and rigid R-5 XPS foam beneath 1/2" plywood.',
  },
  {
    id: 'lvp_floor',
    phase: 1,
    name: 'White-Oak Vinyl Plank Floor',
    brand: 'SmartCore Pro Waterproof LVP',
    price: 220,
    weightLbs: 62,
    requires: ['xps_subfloor'],
    stats: { comfort: 10 },
    slotBox: { x: 0, y: 0.61, z: -1.05, w: 1.88, h: 0.02, d: 3.68 },
    explodeVec: [0, -0.78, 0],
    tip: 'The ProMaster flat FWD floor takes floating click-lock oak planks with zero step-down from sliding door.',
  },

  // ================= PHASE 2: INSULATION & CUTOUTS =================
  {
    id: 'thinsulate_walls',
    phase: 2,
    name: 'Acoustic/Thermal Insulation',
    brand: '3M Thinsulate AU6002-2 (60 linear ft)',
    price: 380,
    weightLbs: 28,
    requires: ['kilmat_sound'],
    stats: { comfort: 8, insulation: 34 },
    slotBox: { x: 0, y: 1.56, z: -1.05, w: 1.86, h: 1.80, d: 3.60 },
    explodeVec: [-0.85, 0.45, 0],
    tip: 'Hydrophobic automotive fiber — traps heat in snowy states without ever holding condensation against steel walls.',
  },
  {
    id: 'crl_slider_win',
    phase: 2,
    name: 'Sliding Door T-Vent Window',
    brand: 'CRL Ram ProMaster All-Glass FW421R',
    price: 420,
    weightLbs: 34,
    requires: [],
    stats: { comfort: 9 },
    slotBox: { x: 0.99, y: 1.72, z: 0.12, w: 0.08, h: 0.66, d: 0.96 },
    explodeVec: [0.95, 0.15, 0],
    tip: 'Cranks open for cross-breeze even in pouring rain inside your campsite.',
  },
  {
    id: 'crl_bunk_wins',
    phase: 2,
    name: 'Dual Rear Bunk Awning Windows',
    brand: 'CRL Awning 33"×10" Screened Pair',
    price: 480,
    weightLbs: 28,
    requires: [],
    stats: { comfort: 9 },
    slotBox: { x: 0, y: 1.76, z: -2.26, w: 2.02, h: 0.42, d: 0.84 },
    explodeVec: [0, 0.25, -0.65],
    tip: 'Positioned right at pillow height in the rear transverse bed for alpine & desert breeze.',
  },
  {
    id: 'maxxair_fan',
    phase: 2,
    name: '10-Speed Roof Exhaust Fan',
    brand: 'MaxxAir MaxxFan Deluxe 7500K',
    price: 340,
    weightLbs: 18,
    requires: [],
    stats: { comfort: 11, insulation: 6 },
    slotBox: { x: 0, y: 2.60, z: -0.15, w: 0.48, h: 0.18, d: 0.48 },
    explodeVec: [0, 1.05, 0],
    tip: 'Pulls cooking steam out and circulates cool night air through your open bunk windows.',
  },

  // ================= PHASE 3: WALLS, CEILING & CAB =================
  {
    id: 'wall_panels',
    phase: 3,
    name: 'Satin-White Shiplap Walls',
    brand: 'CNC-Scribed 1/4" Birch Shiplap',
    price: 360,
    weightLbs: 85,
    requires: ['thinsulate_walls'],
    stats: { comfort: 12, insulation: 8 },
    slotBox: { x: 0, y: 1.54, z: -1.05, w: 1.84, h: 1.78, d: 3.56 },
    explodeVec: [-1.15, 0, 0],
    tip: 'Mounts to rivet-nutted steel ribs, preserving every millimeter of the ProMaster 75.6" interior width.',
  },
  {
    id: 'cedar_ceiling',
    phase: 3,
    name: 'Cedar Ceiling + 6 LED Pucks',
    brand: 'Western Red Cedar T&G + Warm 3000K',
    price: 410,
    weightLbs: 70,
    requires: ['thinsulate_walls'],
    stats: { comfort: 14, insulation: 10 },
    slotBox: { x: 0, y: 2.48, z: -1.05, w: 1.76, h: 0.05, d: 3.64 },
    explodeVec: [0, 0.85, 0],
    tip: 'Aromatic knotty red cedar strips over Thinsulate with recessed 12V dimmable warm LEDs.',
  },
  {
    id: 'swivel_seats',
    phase: 3,
    name: 'Dual Cab Seat Swivel Bases',
    brand: 'SwivelsRus ProMaster Heavy-Duty Pair',
    price: 320,
    weightLbs: 54,
    requires: [],
    stats: { comfort: 12, remoteWork: 0.18 },
    slotBox: { x: 0, y: 1.15, z: 1.30, w: 1.40, h: 0.85, d: 0.65 },
    explodeVec: [0, 0.55, 0.65],
    tip: 'Spins both front captain chairs 180° into your living room when parked at camp.',
  },
  {
    id: 'lagun_table',
    phase: 3,
    name: 'Oak Lagun Swivel Dinette',
    brand: 'Lagun Marine Arm + White Oak Top',
    price: 240,
    weightLbs: 19,
    requires: ['swivel_seats'],
    stats: { comfort: 8, remoteWork: 0.25 },
    slotBox: { x: -0.42, y: 1.18, z: 0.72, w: 0.48, h: 0.35, d: 0.66 },
    explodeVec: [-0.45, 0.65, 0.55],
    tip: 'Turns your swiveled cab into a scenic park-view laptop desk (+remote job pay!) or coffee nook.',
  },

  // ================= PHASE 4: SLEEPING & STORAGE =================
  {
    id: 'bed_frame',
    phase: 4,
    name: 'Transverse Garage Bed Frame',
    brand: '80/20 Extruded Aluminum + Slats',
    price: 340,
    weightLbs: 78,
    requires: ['lvp_floor'],
    stats: { comfort: 10 },
    slotBox: { x: 0, y: 1.00, z: -2.21, w: 1.84, h: 0.74, d: 1.36 },
    explodeVec: [0, 0.40, -0.95],
    tip: 'ProMaster 75.6" width fits an East-West bed natively without exterior flares — leaving a huge gear garage below.',
  },
  {
    id: 'bed_mattress',
    phase: 4,
    name: '6" Gel Memory Foam Mattress',
    brand: 'Tochta Utopia + Cabin Plaid Quilt',
    price: 380,
    weightLbs: 46,
    requires: ['bed_frame'],
    stats: { comfort: 18 },
    slotBox: { x: 0, y: 1.50, z: -2.21, w: 1.82, h: 0.28, d: 1.32 },
    explodeVec: [0, 0.95, -1.05],
    tip: 'Real sleep restoration at campgrounds so you wake up at 100% energy & high morale.',
  },
  {
    id: 'upper_cabinets',
    phase: 4,
    name: 'Aero Upper Birch Cabinets',
    brand: 'Baltic Birch + Blum Soft-Close',
    price: 390,
    weightLbs: 58,
    requires: ['wall_panels'],
    stats: { comfort: 8 },
    slotBox: { x: -0.72, y: 2.22, z: -0.72, w: 0.36, h: 0.38, d: 2.10 },
    explodeVec: [-0.85, 0.72, 0],
    tip: 'High-bay storage bolted into ProMaster steel roof rails without cramping the center walkway.',
  },

  // ================= PHASE 5: PLUMBING, GALLEY & SANITATION =================
  {
    id: 'wheel_water_32',
    phase: 5,
    name: '32-Gal Wheel-Well Water + Pump',
    brand: 'NW Conversions + SHURflo 3.0 GPM',
    price: 460,
    weightLbs: 44,
    requires: ['lvp_floor'],
    stats: { waterGal: 27, comfort: 6 },
    slotBox: { x: 0.74, y: 0.92, z: -2.18, w: 0.34, h: 0.56, d: 1.04 },
    explodeVec: [1.10, -0.10, -0.75],
    tip: 'Molded specifically around the ProMaster right rear wheel arch, jumping capacity from 5 gal jug to 32 gal!',
  },
  {
    id: 'grey_tank_15',
    phase: 5,
    name: '15-Gal Undermount Grey Tank',
    brand: 'ProMaster Chassis Rail Tank + Valve',
    price: 280,
    weightLbs: 22,
    requires: ['wheel_water_32'],
    stats: { greyGal: 15, comfort: 4 },
    slotBox: { x: -0.52, y: 0.38, z: -0.82, w: 0.48, h: 0.16, d: 0.92 },
    explodeVec: [-0.75, -0.75, 0],
    tip: 'Tucks under the driver frame rail for easy sink drainage without sacrificing ground clearance.',
  },
  {
    id: 'galley_cabinet',
    phase: 5,
    name: 'Birch Galley + Oak Butcher Block',
    brand: '58" Custom Kitchen Block + Drawers',
    price: 520,
    weightLbs: 112,
    requires: ['lvp_floor'],
    stats: { comfort: 10 },
    slotBox: { x: -0.62, y: 1.04, z: -0.75, w: 0.56, h: 0.86, d: 1.48 },
    explodeVec: [-1.25, 0.15, 0],
    tip: 'Locks behind the driver seat with heavy latches so drawers never fly open on washboard dirt roads.',
  },
  {
    id: 'sink_faucet',
    phase: 5,
    name: 'Deep Ruvati Sink + Spray Faucet',
    brand: 'Ruvati 15"×17" Workstation + Black Tap',
    price: 290,
    weightLbs: 26,
    requires: ['galley_cabinet', 'wheel_water_32'],
    stats: { comfort: 8, sink: 1 },
    slotBox: { x: -0.60, y: 1.56, z: -0.34, w: 0.42, h: 0.34, d: 0.46 },
    explodeVec: [-0.95, 0.85, 0.25],
    tip: 'Makes washing camp dishes & filling bottles effortless inside the van instead of freezing outdoors.',
  },
  {
    id: 'dometic_fridge',
    phase: 5,
    name: '12V Compressor Marine Fridge',
    brand: 'Dometic CRX 110S Stainless (108L)',
    price: 890,
    weightLbs: 58,
    requires: ['galley_cabinet', 'battleborn_200'],
    stats: { comfort: 10, fridge: 1 },
    slotBox: { x: -0.58, y: 1.02, z: -1.14, w: 0.52, h: 0.78, d: 0.56 },
    explodeVec: [-1.15, 0.10, -0.25],
    tip: 'Keeps fresh veggies, trout, and cold drinks without hunting for bagged ice in remote national parks.',
  },
  {
    id: 'induction_cooktop',
    phase: 5,
    name: 'Dual-Zone Induction Cooktop',
    brand: 'Empava Flush 1800W Ceramic Glass',
    price: 380,
    weightLbs: 18,
    requires: ['galley_cabinet', 'victron_inverter'],
    stats: { comfort: 8, cook: 1 },
    slotBox: { x: -0.58, y: 1.50, z: -0.82, w: 0.36, h: 0.08, d: 0.50 },
    explodeVec: [-0.85, 0.78, -0.15],
    tip: 'Safe flameless electric boiling at high elevation — powered straight from your Victron inverter!',
  },
  {
    id: 'natures_head',
    phase: 5,
    name: 'Composting Toilet System',
    brand: 'Nature’s Head + 12V Vent Fan',
    price: 950,
    weightLbs: 32,
    requires: ['lvp_floor'],
    stats: { comfort: 12, toilet: 1 },
    slotBox: { x: 0.62, y: 0.88, z: -1.12, w: 0.48, h: 0.52, d: 0.54 },
    explodeVec: [1.15, 0.20, 0],
    tip: 'Separates liquids & solids cleanly with zero black tank. Remember to empty & refresh coir every ~10 days!',
  },

  // ================= PHASE 6: ELECTRICAL, SOLAR & EXPEDITION =================
  {
    id: 'battleborn_200',
    phase: 6,
    name: '2×100Ah LiFePO4 Battery Bank',
    brand: 'Battle Born 12V Heated Lithium (2400Wh)',
    price: 1150,
    weightLbs: 62,
    requires: ['bed_frame'],
    stats: { batteryWh: 2000, comfort: 6 },
    slotBox: { x: -0.70, y: 0.78, z: -2.30, w: 0.40, h: 0.34, d: 0.64 },
    explodeVec: [-1.05, -0.15, -0.95],
    tip: 'High-density lithium bank sits over the driver rear axle with Lynx fuses and smart shunt.',
  },
  {
    id: 'victron_inverter',
    phase: 6,
    name: 'Victron Power Hub + DC-DC',
    brand: 'MultiPlus 3000W + Orion 30A + Cerbo GX',
    price: 1280,
    weightLbs: 48,
    requires: ['battleborn_200'],
    stats: { comfort: 8, remoteWork: 0.22 },
    slotBox: { x: -0.82, y: 1.08, z: -1.86, w: 0.18, h: 0.48, d: 0.52 },
    explodeVec: [-1.20, 0.10, -0.75],
    tip: 'Recharges house batteries off the ProMaster alternator while driving AND runs full AC appliances.',
  },
  {
    id: 'renogy_solar_400',
    phase: 6,
    name: '400W Monocrystalline Solar Array',
    brand: '2× 200W Solar + Victron MPPT 100/50',
    price: 680,
    weightLbs: 54,
    requires: ['victron_inverter'],
    stats: { solarW: 400, comfort: 6, remoteWork: 0.20 },
    slotBox: { x: 0, y: 2.66, z: -1.75, w: 1.52, h: 0.08, d: 1.75 },
    explodeVec: [0, 1.35, -0.35],
    tip: 'Harvests free sun in desert & mountain boondocking spots so you can work remotely anywhere.',
  },
  {
    id: 'espar_heater',
    phase: 6,
    name: 'Under-Seat Air Heater',
    brand: 'Espar S2 B4L + Digi-Max Thermostat',
    price: 760,
    weightLbs: 14,
    requires: ['battleborn_200'],
    stats: { comfort: 12, insulation: 18, heater: 1 },
    slotBox: { x: 0.44, y: 0.68, z: 0.86, w: 0.22, h: 0.22, d: 0.36 },
    explodeVec: [0.55, -0.45, 0.35],
    tip: 'Sips tank fuel to keep the cabin toasty at 70°F during sub-zero Alaska & Montana nights.',
  },
  {
    id: 'exterior_expedition',
    phase: 6,
    name: 'Safari Rack + Ladder + Awning + KO2s',
    brand: 'Flatline Rack · Fiamma F65S · BFGoodrich KO2',
    price: 1450,
    weightLbs: 148,
    requires: [],
    stats: { comfort: 14, offroad: 1 },
    slotBox: { x: 0, y: 1.55, z: -0.35, w: 2.15, h: 1.95, d: 4.30 },
    explodeVec: [0.95, 0.75, 0],
    tip: 'Completes the adventure exterior: walkable safari rack, side ladder, shade awning & rugged all-terrain tires.',
  },
];

export const PARTS_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export function getEffectivePrice(part, discountPartId) {
  return part.id === discountPartId ? Math.round(part.price * 0.75) : part.price;
}

export function canInstallPart(partId, installedSet) {
  const part = PARTS_BY_ID[partId];
  if (!part || installedSet.has(partId)) return { ok: false, missing: [] };
  const missing = part.requires.filter((req) => !installedSet.has(req));
  return { ok: missing.length === 0, missing };
}

export function computeVanSpecs(installedSet) {
  let weightLbs = 0;
  let comfort = 14;
  let insulation = 10;
  let solarW = 0;
  let batteryCapWh = 500;
  let waterCapGal = 5;
  let greyCapGal = 2;
  let remotePayMul = 1.0;
  let hasSink = false;
  let hasToilet = false;
  let hasFridge = false;
  let hasCooktop = false;
  let hasHeater = false;
  let hasAwning = false;
  let hasInverter = installedSet.has('victron_inverter');
  let hasBunkWin = installedSet.has('crl_bunk_wins');
  let hasFan = installedSet.has('maxxair_fan');

  for (const part of PARTS) {
    if (!installedSet.has(part.id)) continue;
    weightLbs += part.weightLbs;
    const st = part.stats || {};
    if (st.comfort) comfort += st.comfort;
    if (st.insulation) insulation += st.insulation;
    if (st.solarW) solarW += st.solarW;
    if (st.batteryWh) batteryCapWh += st.batteryWh;
    if (st.waterGal) waterCapGal += st.waterGal;
    if (st.greyGal) greyCapGal += st.greyGal;
    if (st.remoteWork) remotePayMul += st.remoteWork;
    if (st.sink) hasSink = true;
    if (st.toilet) hasToilet = true;
    if (st.fridge) hasFridge = true;
    if (st.cook) hasCooktop = true;
    if (st.heater) hasHeater = true;
    if (st.offroad) hasAwning = true;
  }

  return {
    weightLbs,
    comfort: Math.min(100, comfort),
    insulation: Math.min(100, insulation),
    solarW,
    batteryCapWh,
    waterCapGal,
    greyCapGal,
    remotePayMul: +remotePayMul.toFixed(2),
    hasSink,
    hasToilet,
    hasFridge,
    hasCooktop,
    hasHeater,
    hasAwning,
    hasInverter,
    hasBunkWin,
    hasFan,
    installedCount: installedSet.size,
    totalCount: PARTS.length,
    buildPct: Math.round((installedSet.size / PARTS.length) * 100),
  };
}
