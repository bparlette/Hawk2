// PROMASTER 50 — Persistent Game State, Build Progression, Oregon Trail Survival, Chores, Jobs & Activities
import { PARTS, PARTS_BY_ID, canInstallPart, computeVanSpecs, getEffectivePrice } from './catalog.js';
import { STATES } from './states.js';

const SAVE_KEY = 'promaster50_save_v1';

const DEFAULT_STATE = () => ({
  cash: 2450,
  day: 1,
  miles: 0,
  stateCode: 'MD',
  visited: ['MD'],
  stamps: [],
  birdsSpotted: [],
  constellations: [],
  installed: [],
  paintHex: 0xf4f6f8,
  fuel: 100,
  freshWater: 5.0,
  greyWater: 0,
  toiletFill: 8,
  dirtyDishes: 1,
  batteryWh: 480,
  food: 6,
  vanHealth: 100,
  morale: 90,
  bearSafe: false,
  discountPartId: null,
  journal: ['Day 1 · Parked your stock Ram ProMaster 3500 159" High Roof in the Maryland garage. Time to build & hit all 50 states!'],
});

export function createGameStore() {
  let raw = DEFAULT_STATE();
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.stateCode && STATES[parsed.stateCode]) {
        raw = { ...DEFAULT_STATE(), ...parsed };
      }
    }
  } catch {
    // Ignore storage quota / parse errors
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
    } catch {}
  }

  function log(msg) {
    raw.journal.unshift(`Day ${raw.day} · ${msg}`);
    if (raw.journal.length > 24) raw.journal.length = 24;
  }

  function getSpecs() {
    return computeVanSpecs(new Set(raw.installed));
  }

  function clampVitals() {
    const sp = getSpecs();
    raw.fuel = Math.max(0, Math.min(100, raw.fuel));
    raw.freshWater = Math.max(0, Math.min(sp.waterCapGal, +raw.freshWater.toFixed(1)));
    raw.greyWater = Math.max(0, Math.min(100, Math.round(raw.greyWater)));
    raw.toiletFill = Math.max(0, Math.min(100, Math.round(raw.toiletFill)));
    raw.dirtyDishes = Math.max(0, Math.min(10, raw.dirtyDishes));
    raw.batteryWh = Math.max(0, Math.min(sp.batteryCapWh, Math.round(raw.batteryWh)));
    raw.food = Math.max(0, Math.min(24, raw.food));
    raw.vanHealth = Math.max(10, Math.min(100, Math.round(raw.vanHealth)));
    raw.morale = Math.max(10, Math.min(100, Math.round(raw.morale)));
  }

  function installPart(partId) {
    const set = new Set(raw.installed);
    const check = canInstallPart(partId, set);
    if (!check.ok) {
      return { ok: false, reason: check.missing.length ? `Needs: ${check.missing.map((m) => PARTS_BY_ID[m]?.name).join(', ')}` : 'Already snapped in!' };
    }
    const part = PARTS_BY_ID[partId];
    const cost = getEffectivePrice(part, raw.discountPartId);
    if (raw.cash < cost) {
      return { ok: false, reason: `Need $${cost} (earn cash via Jobs or Campground Photos!)` };
    }
    raw.cash -= cost;
    raw.installed.push(partId);
    if (raw.discountPartId === partId) raw.discountPartId = null;

    // Immediately grant extra capacity when tanks/batteries snap in
    if (partId === 'wheel_water_32') raw.freshWater += 27;
    if (partId === 'battleborn_200') raw.batteryWh += 1800;
    if (partId === 'renogy_solar_400') raw.batteryWh += 400;

    clampVitals();
    log(`Snapped in ${part.name} (-$${cost}).`);
    save();
    return { ok: true, part, cost };
  }

  function unlockAllSandbox() {
    raw.installed = PARTS.map((p) => p.id);
    const sp = getSpecs();
    raw.freshWater = sp.waterCapGal;
    raw.batteryWh = sp.batteryCapWh;
    raw.morale = 100;
    log('Loaded complete 26-piece ProMaster 159" camper conversion in Garage!');
    save();
  }

  function resetToStock() {
    raw = DEFAULT_STATE();
    save();
  }

  function setPaint(hex) {
    raw.paintHex = hex;
    save();
  }

  // ---------- CHORES & VAN UPKEEP ----------
  function washDishes() {
    if (raw.dirtyDishes <= 0) return { ok: false, msg: 'Sink is already sparkling clean!' };
    const sp = getSpecs();
    const waterUse = sp.hasSink ? 0.6 : 1.5;
    if (raw.freshWater < waterUse) return { ok: false, msg: 'Not enough Fresh Water — refill tank first!' };
    if (raw.greyWater >= 96) return { ok: false, msg: 'Grey Tank is full — dump at park station first!' };
    raw.freshWater -= waterUse;
    raw.greyWater += sp.hasSink ? 10 : 18;
    raw.dirtyDishes = 0;
    raw.morale += 8;
    clampVitals();
    log('Washed dirty dishes in the galley sink.');
    save();
    return { ok: true, msg: 'Dishes sparkling clean! +8 Morale' };
  }

  function emptyToilet() {
    if (raw.toiletFill <= 0) return { ok: false, msg: 'Compost toilet is already empty & fresh!' };
    const sp = getSpecs();
    const fee = sp.hasToilet ? 4 : 0;
    if (raw.cash < fee) return { ok: false, msg: 'Need $4 for fresh coco coir brick.' };
    raw.cash -= fee;
    raw.toiletFill = 0;
    raw.morale += 7;
    clampVitals();
    log(sp.hasToilet ? 'Emptied Nature’s Head solids & refreshed coconut coir (-$4).' : 'Visited campground vault station (+7 Morale).');
    save();
    return { ok: true, msg: sp.hasToilet ? 'Compost toilet refreshed! +7 Morale' : 'Camp sanitation clean! +7 Morale' };
  }

  function refillWaterAndDump() {
    const sp = getSpecs();
    const fee = 6;
    if (raw.cash < fee) return { ok: false, msg: 'Need $6 for park fill & dump station.' };
    raw.cash -= fee;
    raw.freshWater = sp.waterCapGal;
    raw.greyWater = 0;
    log(`Refilled potable tank (${sp.waterCapGal} gal) & dumped grey water (-$6).`);
    save();
    return { ok: true, msg: `Water ${sp.waterCapGal} gal · Grey 0% (-$6)` };
  }

  function cookMeal() {
    if (raw.food <= 0) return { ok: false, msg: 'Cooler is out of groceries — grab supplies at Town Service!' };
    const sp = getSpecs();
    raw.food -= 1;
    raw.dirtyDishes += 1;
    if (sp.hasCooktop) raw.batteryWh = Math.max(0, raw.batteryWh - 95);
    const boost = 8 + (sp.hasFridge ? 5 : 0) + (sp.hasCooktop ? 5 : 0);
    raw.morale += boost;
    clampVitals();
    log(sp.hasCooktop ? 'Cooked skillet trout & veggies on the Empava induction cooktop!' : 'Made cold camp sandwiches by the picnic table.');
    save();
    return { ok: true, msg: `Great meal! +${boost} Morale` };
  }

  function lockBearBox() {
    raw.bearSafe = true;
    raw.morale += 4;
    clampVitals();
    log('Secured cooler & scented gear inside the steel bear-proof locker.');
    save();
    return { ok: true, msg: 'Food secured in Bear Locker!' };
  }

  function serviceVan() {
    const fuelNeeded = Math.max(0, 100 - raw.fuel);
    const repairCost = Math.round((100 - raw.vanHealth) * 1.4);
    const groceriesCost = raw.food < 10 ? 35 : 0;
    const total = Math.max(15, Math.round(fuelNeeded * 0.9 + repairCost + groceriesCost));
    if (raw.cash < total) return { ok: false, msg: `Service, fuel & groceries costs $${total}.` };
    raw.cash -= total;
    raw.fuel = 100;
    raw.vanHealth = 100;
    if (groceriesCost) raw.food += 6;
    clampVitals();
    log(`Full diesel/gas tank, van maintenance & camp groceries (-$${total}).`);
    save();
    return { ok: true, msg: `Fuel 100% · Van 100% · +Food (-$${total})` };
  }

  // ---------- JOBS & EARNING CASH ----------
  function doLocalGig() {
    const st = STATES[raw.stateCode];
    const sp = getSpecs();
    const pay = st.gig.pay + Math.round(sp.comfort * 0.45);
    raw.cash += pay;
    raw.batteryWh -= 140;
    raw.dirtyDishes += 1;
    raw.toiletFill += 14;
    raw.day += 1;
    // Solar recharge during daytime gig!
    raw.batteryWh += Math.round(sp.solarW * 2.1);
    clampVitals();
    log(`Worked "${st.gig.title}" in ${st.name}: +$${pay}.`);
    save();
    return { ok: true, pay, title: st.gig.title };
  }

  function doRemoteSprint() {
    const sp = getSpecs();
    if (raw.batteryWh < 160 && sp.solarW === 0) {
      return { ok: false, msg: 'House battery too low for laptop sprint! Drive or add solar/Battle Born.' };
    }
    const pay = Math.round(145 * sp.remotePayMul);
    raw.cash += pay;
    raw.batteryWh = raw.batteryWh - 220 + Math.round(sp.solarW * 1.8);
    raw.toiletFill += 10;
    raw.day += 1;
    clampVitals();
    log(`Completed remote cloud work sprint from the van: +$${pay}.`);
    save();
    return { ok: true, pay };
  }

  // ---------- OREGON TRAIL ROAD TRAVEL ENGINE ----------
  function getRouteInfo(targetCode) {
    const cur = STATES[raw.stateCode];
    const dst = STATES[targetCode];
    if (!cur || !dst || targetCode === raw.stateCode) return null;
    const isNeighbor = cur.neighbors.includes(targetCode);
    const dx = dst.mx - cur.mx, dy = dst.my - cur.my;
    const approxMiles = Math.max(115, Math.round(Math.hypot(dx, dy) * (dst.ferry || cur.ferry ? 5.5 : 3.6)));
    const fuelUse = Math.min(72, Math.max(16, Math.round(approxMiles * 0.085)));
    const ferryFee = (dst.ferry || cur.ferry) ? 140 : 0;
    return { isNeighbor, approxMiles, fuelUse, ferryFee };
  }

  function travelTo(targetCode) {
    const info = getRouteInfo(targetCode);
    if (!info) return { ok: false, msg: 'Invalid destination state.' };
    if (raw.fuel < info.fuelUse) {
      return { ok: false, msg: `Need ${info.fuelUse}% fuel to reach ${STATES[targetCode].name}! Refuel first.` };
    }
    if (raw.cash < info.ferryFee) {
      return { ok: false, msg: `Ferry crossing requires $${info.ferryFee}!` };
    }

    const sp = getSpecs();
    const dst = STATES[targetCode];
    raw.fuel -= info.fuelUse;
    raw.cash -= info.ferryFee;
    raw.miles += info.approxMiles;
    raw.day += info.isNeighbor ? 1 : 2;
    raw.stateCode = targetCode;
    if (!raw.visited.includes(targetCode)) raw.visited.push(targetCode);

    // Wear, chores & alternator + solar charging along the highway!
    const altCharge = sp.hasInverter ? 950 : 220;
    raw.batteryWh += altCharge + Math.round(sp.solarW * 1.4);
    raw.toiletFill += 18;
    raw.dirtyDishes += 1;
    raw.bearSafe = false;

    // Insulation & chassis impact
    const wear = Math.max(2, Math.round(7 - sp.insulation * 0.04));
    raw.vanHealth -= wear;
    const comfortBonus = Math.round((sp.comfort - 45) * 0.14);
    raw.morale += comfortBonus;
    if (raw.toiletFill > 85) raw.morale -= 9;
    if (raw.dirtyDishes >= 4) raw.morale -= 6;
    clampVitals();

    log(`Drove ${info.approxMiles} mi into ${dst.name} (${dst.park}).`);
    save();

    return {
      ok: true,
      state: dst,
      miles: info.approxMiles,
      ferryFee: info.ferryFee,
      eventText: dst.trailEvent,
    };
  }

  function applyTrailChoice(choice) {
    // choice: { cashDelta, healthDelta, moraleDelta, fuelDelta, note }
    if (choice.cashDelta) raw.cash = Math.max(0, raw.cash + choice.cashDelta);
    if (choice.healthDelta) raw.vanHealth += choice.healthDelta;
    if (choice.moraleDelta) raw.morale += choice.moraleDelta;
    if (choice.fuelDelta) raw.fuel += choice.fuelDelta;
    clampVitals();
    if (choice.note) log(choice.note);
    save();
  }

  // ---------- SLEEP NIGHT AT CAMPGROUND ----------
  function sleepNight() {
    const st = STATES[raw.stateCode];
    const sp = getSpecs();
    raw.day += 1;
    // Morning solar boost + sleep morale based on mattress & insulation/heater
    raw.batteryWh += Math.round(sp.solarW * 2.4);
    if (raw.batteryWh > 120) raw.batteryWh -= (sp.hasFridge ? 180 : 40);

    let alert = null;
    if (st.bearCountry && !raw.bearSafe && raw.food > 0) {
      raw.food = Math.max(0, raw.food - 2);
      raw.morale -= 16;
      alert = `Night Bear Raid in ${st.name}! A black bear pried your camp cooler open (-2 food, -16 morale). Lock the Bear Box next time!`;
    } else if (st.biome === 'alpine_bear' || st.biome === 'tundra_aurora') {
      if (!sp.hasHeater && sp.insulation < 45) {
        raw.morale -= 10;
        alert = `Chilly 24°F night in ${st.park}! Add Thinsulate or an Espar Heater (-10 morale).`;
      } else {
        raw.morale += 14;
      }
    } else {
      raw.morale += 10 + Math.round(sp.comfort * 0.10);
    }

    raw.bearSafe = false;
    clampVitals();
    log(alert || `Slept peacefully under ${st.name} stars inside your ProMaster.`);
    save();
    return { ok: true, alert };
  }

  // ---------- PARK ACTIVITIES (BIRDS, HIKING STAMPS, STARGAZING, MEET PEOPLE) ----------
  function logBird(birdName) {
    const isNew = !raw.birdsSpotted.includes(birdName);
    if (isNew) raw.birdsSpotted.push(birdName);
    const bounty = isNew ? 65 : 25;
    raw.cash += bounty;
    raw.morale += 6;
    clampVitals();
    log(`Photographed ${birdName} (${isNew ? 'NEW Life-List species!' : 'bonus shot'} +$${bounty}).`);
    save();
    return { isNew, bounty };
  }

  function completeHike(mode) {
    const st = STATES[raw.stateCode];
    const isNewStamp = !raw.stamps.includes(st.code);
    if (isNewStamp) raw.stamps.push(st.code);
    const pay = (mode === 'summit' ? 140 : 75) + (isNewStamp ? 50 : 0);
    raw.cash += pay;
    raw.morale += mode === 'summit' ? 14 : 10;
    raw.freshWater = Math.max(0, raw.freshWater - 0.5);
    clampVitals();
    log(`Hiked ${st.park} (${st.famous}) — ${isNewStamp ? 'EARNED STATE STAMP!' : 'repeat scenic run'} (+$${pay}).`);
    save();
    return { isNewStamp, pay, totalStamps: raw.stamps.length };
  }

  function logConstellation(name) {
    const isNew = !raw.constellations.includes(name);
    if (isNew) raw.constellations.push(name);
    const pay = isNew ? 55 : 20;
    raw.cash += pay;
    raw.morale += 8;
    clampVitals();
    log(`Stargazed & logged constellation ${name} above ${STATES[raw.stateCode].name} (+$${pay}).`);
    save();
    return { isNew, pay };
  }

  function meetCamper() {
    const uninstalled = PARTS.filter((p) => !raw.installed.includes(p.id));
    let giftPart = null;
    if (uninstalled.length > 0) {
      giftPart = uninstalled[Math.floor(Math.random() * uninstalled.length)];
      raw.discountPartId = giftPart.id;
    }
    raw.morale += 12;
    clampVitals();
    const note = giftPart
      ? `Met a veteran ProMaster vanlifer around the fire — shared a coupon for 25% OFF "${giftPart.name}"!`
      : `Shared campfire stories with friendly national park neighbors (+12 Morale)!`;
    log(note);
    save();
    return { giftPart, note };
  }

  return {
    get raw() { return raw; },
    getSpecs,
    installPart,
    unlockAllSandbox,
    resetToStock,
    setPaint,
    washDishes,
    emptyToilet,
    refillWaterAndDump,
    cookMeal,
    lockBearBox,
    serviceVan,
    doLocalGig,
    doRemoteSprint,
    getRouteInfo,
    travelTo,
    applyTrailChoice,
    sleepNight,
    logBird,
    completeHike,
    logConstellation,
    meetCamper,
    save,
  };
}
