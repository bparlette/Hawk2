// cp_features.js — COLLEGE PARK features (loaded ONLY by College Park: main.js gates this
// import on isCollegePark(TITLE), so Laurel/Fulton never fetches it and cannot regress).
//   1. FRAT ROW DARTY — DJ booth + speakers + 100 dancing students on the Fraternity Row
//      infield (areas.json green polygon that contains the OSM "Fraternity Fields" point),
//      with its own procedural WebAudio beat (the LF engine has no audio system of its own,
//      so the darty brings one: starts on first user gesture, plays only near the field).
//   2. CAMPUS FARM — fenced pens by the real barns (Horse Barn b1631, Sheep Barn b1627,
//      Poultry Barn b1630, Animal Sciences b1629): a horse and a pig wandering their pens.
//   3. STEALABLE HELICOPTER — Palm City heli.js behaviour adapted: steal from the pad on
//      the Xfinity Center lot (areas.json parking 142), altitude + ground shadow, land on
//      any open ground that is not a building / hero / pen / dance floor.
//   4. RIDEABLE SCOOTERS + BIKES — racks at Johnson-Whittle (b666), Pyon-Chen (b2196),
//      Cambridge (b1611), the Stamp (b8) and McKeldin (b0). Scooter: fast + simple steer.
//      Bike: skate-style carve + hop (Palm City skate.js feel, simplified).
//   5. YAHENTAMITSI CAFETERIA GAME — a PlaceInterior subclass for Yahentamitsi Dining
//      Hall (b673): walk the serving line, fill a tray, sit + eat, start a FOOD FIGHT.
import { drawPedAt, PED_OUTFITS } from '../../laurel-fulton/src/lf_fx.js';
import { PlaceInterior, doorPoint } from '../../laurel-fulton/src/lf_places.js';
import { project } from '../../laurel-fulton/src/lf_climb.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const dist = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0);
const inPoly = (f, x, y) => { let ins = false; for (let k = 0; k < f.length; k += 2) { const ax = f[k], ay = f[k + 1], ex = f[(k + 2) % f.length], ey = f[(k + 3) % f.length]; if ((ay > y) !== (ey > y) && x < (ex - ax) * (y - ay) / (ey - ay) + ax) ins = !ins; } return ins; };
const rngOf = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- the DJ beat
// The LF engine has no audio system / mute of its own, so the darty carries a small
// self-contained WebAudio loop: created + resumed only on a user gesture (iOS rules:
// audioSession 'playback' + resume inside the gesture), audible only near the field.
class Beat {
  constructor() { this.ctx = null; this.master = null; this.timer = null; this.step = 0; this.nextT = 0; this.want = false; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older iOS */ }
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.0; this.master.connect(ctx.destination);
    // a silent buffer inside the gesture unlocks iOS audio
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate), src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start();
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = this.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.timer = setInterval(() => this.schedule(), 42);
  }
  schedule() {
    if (!this.ctx) return;
    const ctx = this.ctx, SPB = 60 / 126 / 2;                       // 126 bpm, 8th notes
    if (this.nextT < ctx.currentTime) { this.nextT = ctx.currentTime + 0.06; this.step = 0; }
    while (this.nextT < ctx.currentTime + 0.14) { this.playStep(this.step, this.nextT); this.nextT += SPB; this.step = (this.step + 1) % 32; }
  }
  env(t, a, peak, dec) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.001, t + a + dec); g.connect(this.master); return g; }
  playStep(s, t) {
    if (!this.want) return;
    const ctx = this.ctx;
    if (s % 8 === 0 || s % 8 === 4) {                               // kick on the quarters
      const o = ctx.createOscillator(), g = this.env(t, 0.002, 0.9, 0.22);
      o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.1);
      o.connect(g); o.start(t); o.stop(t + 0.26);
    }
    if (s % 8 === 4) {                                              // clap
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.1;
      const g = this.env(t, 0.002, 0.34, 0.11); src.connect(f); f.connect(g); src.start(t); src.stop(t + 0.14);
    }
    if (s % 2 === 1) {                                              // hat offbeats
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
      const g = this.env(t, 0.001, 0.13, 0.04); src.connect(f); f.connect(g); src.start(t); src.stop(t + 0.06);
    }
    const BASS = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 58.3, 0, 73.4, 0, 55, 0, 55, 0, 65.4, 0, 55, 0, 82.4, 0, 73.4, 0, 65.4, 0, 58.3, 0];
    const fr = BASS[s];                                             // bass line (A1 groove)
    if (fr) {
      const o = ctx.createOscillator(), g = this.env(t, 0.004, 0.30, 0.19);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
      o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); f.connect(g); o.start(t); o.stop(t + 0.22);
    }
  }
  setNear(near) {
    this.want = near;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime, target = near ? 0.16 : 0.0;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(target, t, 0.25);
  }
}

// ---------------------------------------------------------------- the cafeteria
export const FOOD = {
  pizza: { name: 'PIZZA', group: 'grain', bites: 3, color: '#e8a33a' },
  burger: { name: 'BURGER', group: 'protein', bites: 3, color: '#b06a34' },
  salad: { name: 'SALAD', group: 'veg', bites: 2, color: '#6fae4e' },
  fries: { name: 'FRIES', group: 'side', bites: 2, color: '#e8c23a' },
  dessert: { name: 'DESSERT', group: 'sweet', bites: 2, color: '#d478a8' },
  drink: { name: 'DRINK', group: 'drink', bites: 2, color: '#4a90c2' },
};
const THROW_LINES = ['HEY!', 'MY SHIRT!', 'FOOD FIGHT!', 'TAKE THAT!', 'OH IT IS ON'];

export class CafeteriaInterior extends PlaceInterior {
  constructor(K, opts = {}) {
    super(K, opts);
    this.cafe = true;
    this.tray = [];                 // [{id, bites}] — what you picked up in the line
    this.trayGroups = new Set();
    this.seated = false; this.eating = false; this.biteT = 0; this.seatX = 0;
    this.score = 0; this.fight = null; this.projs = []; this.splats = []; this.hearts = [];
    this.throwCd = 0; this.studEatT = 2.5; this.fightPeak = 0;
    this.say('server', 'Welcome to Yahentamitsi! Tray up!', 2.6);
  }
  prompt() {
    const h = this.hero; if (h.frozen || h.auto || this.beat) return null;
    const s = this.spot();
    if (s && s.act === 'EXIT') return 'EXIT';
    if (this.fight) return 'THROW';
    if (this.seated) {
      if (this.eating) return 'FOOD FIGHT!';
      return this.tray.length ? 'EAT' : 'FOOD FIGHT!';   // empty tray: the fight is still on the table (throw the table's food) — walking off stands you up
    }
    if (!s) return null;
    if (FOOD[s.act]) return this.tray.length >= 6 ? null : 'TAKE ' + FOOD[s.act].name;
    if (s.act === 'table') return this.tray.length ? 'SIT + EAT' : 'SIT';
    return null;
  }
  doPrompt(pr) {
    const h = this.hero, s = this.spot();
    if (pr.startsWith('TAKE ') && s && FOOD[s.act]) {
      const id = s.act;
      this.tray.push({ id, bites: FOOD[id].bites }); this.trayGroups.add(FOOD[id].group);
      h.hold = 'tray'; this.score += 2;
      if (this.tray.length === 6) this.say('server', 'Full tray! Living large!', 2.2);
      else if (this.rnd() < 0.3) this.say('server', ['There you go!', 'Good pick!', 'Hot and fresh!'][Math.floor(this.rnd() * 3)], 1.6);
      this.events.push({ kind: 'take', what: id, t: this.time });
    } else if ((pr === 'SIT + EAT' || pr === 'SIT') && s) {
      this.seated = true; this.seatX = s.x; h.x = s.x;
      if (this.tray.length) { this.eating = true; this.biteT = 0.7; }
      this.events.push({ kind: 'sit', t: this.time });
    } else if (pr === 'EAT') { this.eating = true; this.biteT = 0.5; }
    else if (pr === 'FOOD FIGHT!') this.startFight();
    else if (pr === 'THROW') this.throwFrom(h, true);
    else if (pr === 'STAND') { this.seated = false; this.events.push({ kind: 'stand', t: this.time }); }
  }
  startFight() {
    if (this.fight) return;
    this.fight = { t: 25 }; this.eating = false; this.fightPeak = 0;
    this.banner = { text: 'FOOD FIGHT!', t: 2.2 };
    for (const a of this.npcs) { a.nextThrow = 0.3 + this.rnd() * 1.4; if (Math.abs(a.x - this.hero.x) < 13 && this.rnd() < 0.7) this.say(a.id, 'FOOD FIGHT!', 1.6); }
    this.events.push({ kind: 'foodfight', t: this.time });
  }
  throwFrom(who, isHero) {
    if (!this.fight) return;
    if (isHero && this.throwCd > 0) return;
    if (isHero) this.throwCd = 0.45;
    const target = isHero
      ? this.npcs.filter(a => !a.hidden).sort((a, b) => Math.abs(a.x - who.x) - Math.abs(b.x - who.x))[0]
      : this.hero;
    if (!target) return;
    const T = 0.55, dx = (target.x + (this.rnd() - 0.5) * 0.8) - who.x;
    const ids = Object.keys(FOOD), id = ids[Math.floor(this.rnd() * ids.length)];
    this.projs.push({ x: who.x, z: 1.15, vx: dx / T, vz: (1.0 - 1.15 + 4.9 * T * T) / T, id, target, fromHero: isHero });
  }
  splat(x, z, id, onActor) {
    this.splats.push({ x, z, id, on: onActor || null, t: 20 });
    if (this.splats.length > 70) this.splats.shift();
  }
  postStep(dt) {
    const h = this.hero;
    if (this.throwCd > 0) this.throwCd -= dt;
    // ---- eating: bites deplete the tray, item by item; the engine's eat pose rides eatT
    if (this.eating && this.tray.length) {
      const cur = this.tray[0];
      h.hold = cur.id === 'pizza' ? 'slice' : cur.id === 'fries' ? 'chips' : cur.id; h.eatT = Math.max(h.eatT, 0.42);   // 'slice'/'chips' are the shapes person() knows
      this.biteT -= dt;
      if (this.biteT <= 0) {
        this.biteT = 1.25; cur.bites--; this.score += 3;
        if (this.rnd() < 0.4) this.hearts.push({ x: h.x + (this.rnd() - 0.5) * 0.7, z: 1.7, t: 0 });
        if (cur.bites <= 0) {
          this.tray.shift(); this.score += 5;
          if (!this.tray.length) {
            this.eating = false; h.hold = null; h.eatT = 0;
            if (this.trayGroups.size >= 4) { this.score += 50; this.banner = { text: 'BALANCED TRAY +50', t: 2.6 }; for (let i = 0; i < 8; i++) this.hearts.push({ x: h.x + (this.rnd() - 0.5) * 1.6, z: 1.6 + this.rnd() * 0.5, t: -i * 0.07 }); }
            else this.banner = { text: 'TRAY CLEARED · SCORE ' + this.score, t: 2.2 };
            this.trayGroups = new Set();
          }
        }
      }
    }
    // ---- students idle-eat at their tables when it is calm
    if (!this.fight && (this.studEatT -= dt) <= 0) {
      this.studEatT = 2 + this.rnd() * 3;
      const seated = this.npcs.filter(a => a.role === 'student' && !a.hidden && !(a.eatT > 0));
      if (seated.length) { const a = seated[Math.floor(this.rnd() * seated.length)], ids = Object.keys(FOOD), pick = ids[Math.floor(this.rnd() * ids.length)]; a.hold = pick === 'pizza' ? 'slice' : pick === 'fries' ? 'chips' : pick; a.eatT = 1.9; }
    }
    // ---- the food fight
    if (this.fight) {
      this.fight.t -= dt;
      for (const a of this.npcs) {
        if (a.hidden || a.role !== 'student') continue;
        if (Math.abs(a.x - h.x) > 14) continue;
        if ((a.nextThrow -= dt) <= 0) { a.nextThrow = 1.1 + this.rnd() * 1.9; this.throwFrom(a, false); }
      }
      if (this.fight.t <= 0) {
        this.fight = null;
        this.banner = { text: 'FOOD FIGHT OVER · SCORE ' + this.score, t: 3 };
        for (const a of this.npcs) a.nextThrow = 99;
        if (this.seated && this.tray.length) { /* stay seated; prompt offers EAT again */ }
        this.events.push({ kind: 'fight_over', score: this.score, t: this.time });
      }
    }
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.x += p.vx * dt; p.z += p.vz * dt; p.vz -= 9.8 * dt;
      const tg = p.target;
      if (tg && Math.abs(p.x - tg.x) < 0.55 && p.z < 1.7 && p.z > 0.2) {
        this.splat(tg.x, 1.15, p.id, tg); tg.splatT = 20;
        if (tg === h) { this.score += 3; this.say('server', 'HEY! Not the food!', 1.6); }
        else { this.score += 10; this.say(tg.id, THROW_LINES[Math.floor(this.rnd() * THROW_LINES.length)], 1.4); if (this.fight) tg.nextThrow = Math.min(tg.nextThrow || 9, 0.35 + this.rnd() * 0.6); }
        this.projs.splice(i, 1); continue;
      }
      if (p.z <= 0.78 && this.K.props.some(q => q.kind === 'table' && Math.abs(q.x - p.x) < 0.8)) { this.splat(p.x, 0.78, p.id, null); this.projs.splice(i, 1); continue; }
      if (p.z <= 0.04) { this.splat(p.x, 0.02, p.id, null); this.projs.splice(i, 1); continue; }
      if (p.x < 0 || p.x > this.K.width) this.projs.splice(i, 1);
    }
    for (const a of [h, ...this.npcs]) if (a.splatT > 0) a.splatT -= dt;
    for (let i = this.splats.length - 1; i >= 0; i--) { this.splats[i].t -= dt; if (this.splats[i].t <= 0) this.splats.splice(i, 1); }
    for (let i = this.hearts.length - 1; i >= 0; i--) { const hh = this.hearts[i]; hh.t += dt; hh.z += dt * 0.55; if (hh.t > 1.1) this.hearts.splice(i, 1); }
    this.fightPeak = this.fight ? Math.max(this.fightPeak, this.projs.length) : this.fightPeak;
  }
  step(dt, inp = {}) {
    const pr = inp.action ? this.prompt() : null;
    if (pr === 'EXIT') { const out = super.step(dt, inp); this.postStep(dt); return out; }
    if (inp.action && pr) this.doPrompt(pr);
    let inp2 = inp;
    if (this.seated) {
      if (Math.abs(inp.jx || 0) > 0.6 || Math.abs(inp.jy || 0) > 0.6) { this.seated = false; this.eating = false; inp2 = { ...inp, action: false }; }
      else inp2 = { ...inp, action: false, jx: 0, jy: 0, jm: 0 };
    } else if (inp.action) inp2 = { ...inp, action: false };
    const out = super.step(dt, inp2);
    this.postStep(dt);
    return out;
  }
}

// ---------------------------------------------------------------- placements
// Anchored to real map data (areas.json, fetched fresh from Hawk2 main):
//  - darty field: the green polygon containing (2140, 3872) — the OSM "Fraternity
//    Fields" point run through the Pyon-Chen lat/lon->game transform; frat houses
//    b764-777 ring it.
//  - farm pens: open pasture between the real barns — Sheep Barn b1627 (west),
//    Animal Sciences b1629 (south), Horse Barn b1631 (east), Poultry Barn b1630 (SW).
//  - heli pad: parking 142, the big lot north of the Xfinity Center (b1615).
//  - racks: Johnson-Whittle b666, Pyon-Chen b2196, Cambridge b1611, Stamp b8, McKeldin b0.
const DARTY = { booth: [1330, 3905], floor: [1780, 3900], rx: 330, ry: 150, sign: [1245, 3905], anchor: [2140, 3872] };
const FARM = {
  horsePen: { x0: -565, y0: -502, x1: -445, y1: -407, cx: -505, cy: -455 },
  pigPen: { x0: -445, y0: -840, x1: -335, y1: -760, cx: -390, cy: -800 },
  sign: [-505, -388],
};
const PAD = { x: -450, y: -3200 };
const RACKS = [
  { at: [-2350, 262], name: 'JOHNSON-WHITTLE' },
  { at: [-1900, -270], name: 'PYON-CHEN' },
  { at: [-1313, -298], name: 'CAMBRIDGE' },
  { at: [-1991, 1885], name: 'THE STAMP' },
  { at: [-2231, 3062], name: 'MCKELDIN' },
];
const HELI = { top: 240, cruise: 105 };

export class CPF {
  constructor(api) {
    this.api = api;
    this.mode = null;                    // null | 'scooter' | 'bike' | 'heli'
    this.raw = { jx: 0, jy: 0, jm: 0 };  // the stick as read, before preStep zeroes it
    this.wantLand = false; this.wantOff = false; this.wantHop = false;
    this.heli = { x: PAD.x, y: PAD.y, h: -Math.PI / 2, alt: 0, state: 'pad', vx: 0, vy: 0 };
    this.veh = null;                     // the rideable being ridden {kind,x,y,h,v,hopT,ent}
    this.rideables = [];
    RACKS.forEach((r, ri) => {
      ['scooter', 'bike', 'scooter', 'bike'].forEach((kind, i) => {
        this.rideables.push({ kind, x: r.at[0] + (i - 1.5) * 17, y: r.at[1], h: -Math.PI / 2, v: 0, hopT: 0, rack: r.name, hue: (ri * 2 + i) % 5 });
      });
    });
    this.dancers = null; this.fieldPoly = null;
    this.animals = [
      { kind: 'horse', pen: FARM.horsePen, x: -488, y: -438, h: 0.6, mode: 'idle', t: 2, tx: 0, ty: 0, ph: 1.7 },
      { kind: 'pig', pen: FARM.pigPen, x: -390, y: -800, h: -0.8, mode: 'idle', t: 3.5, tx: 0, ty: 0, ph: 4.1 },
    ];
    this.beat = new Beat();
    this.caption = null; this.zone = '';
    this.wrapped = false; this.built = false;
    const unlock = () => this.beat.ensure();
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
    window.__cpf = this;                 // test/debug handle (College Park only — this module never loads in Laurel)
  }
  foot() { return this.api.getFoot(); }
  areas() { return this.api.getAreas(); }
  build() {
    // the darty crowd, scattered on the real field polygon
    const A = this.areas(); if (!A || !A.A) return;
    let poly = null;
    for (const f of A.A.green) if (inPoly(f, DARTY.anchor[0], DARTY.anchor[1])) { poly = f; break; }
    this.fieldPoly = poly;
    const rnd = rngOf(4242), out = [];
    let guard = 0;
    while (out.length < 100 && guard++ < 4000) {
      const a = rnd() * TAU, r = Math.sqrt(rnd());
      const x = DARTY.floor[0] + Math.cos(a) * r * DARTY.rx, y = DARTY.floor[1] + Math.sin(a) * r * DARTY.ry;
      if (poly && !inPoly(poly, x, y)) continue;
      out.push({ who: { id: 'guest' }, outfit: PED_OUTFITS[Math.floor(rnd() * PED_OUTFITS.length)], x, y, px: x, py: y, h: rnd() * TAU, dap: 0, ph: rnd() * TAU, noShadow: false });
    }
    this.dancers = out; this.built = true;
  }
  // main.js calls this right after input.read(), before the foot/car branches: when a
  // vehicle owns the player, CPF keeps the raw stick and zeroes the engine's copy so
  // stepOnFoot / car entry / doors never fight the vehicle state.
  preStep(dt, inp) {
    // the engine's input contract: inp.jx/jy/jm carry the TOUCH stick only — the
    // keyboard lives in inp.keys, and each consumer (stepFoot, interiors, the sim)
    // re-derives its own stick from keys. Mirror that derivation (Interior.step's own)
    // so the vehicles answer to keyboard and touch alike.
    let jx = inp.jx || 0, jy = inp.jy || 0, jm = inp.jm || 0;
    const k = inp.keys || {};
    if (k.left || k.right || k.up || k.down) { jx = (k.right ? 1 : 0) - (k.left ? 1 : 0); jy = (k.down ? 1 : 0) - (k.up ? 1 : 0); jm = (jx || jy) ? 1 : 0; }
    this.raw = { jx, jy, jm };
    if (!this.mode) return;
    if (inp.action) {
      if (this.mode === 'heli') { if (this.heli.state === 'fly') this.wantLand = true; }
      else if (this.mode === 'bike') { if (this.veh && this.veh.v > 25) this.wantHop = true; else this.wantOff = true; }
      else if (this.mode === 'scooter') this.wantOff = true;
    }
    if (inp.punch && this.mode === 'bike' && this.veh && this.veh.v > 25) this.wantHop = true;
    inp.jx = 0; inp.jy = 0; inp.jm = 0; inp.action = false; inp.punch = false; inp.turbo = false;
    inp.keys = {};   // stepFoot & friends re-derive movement from keys — starve them too while a vehicle owns the player
  }
  step(dt, inp, tod) {
    if (!this.wrapped) this.wrap();
    if (!this.built) this.build();
    const F = this.foot(); if (!F) return;
    if (this.mode && !F.active) this.mode = null;                    // something else took the player (car, interior)
    if (this.mode === 'heli') this.stepHeli(dt, F);
    else if (this.mode) this.stepRide(dt, F);
    else if (F.active && inp.action) this.tryBoard(F);
    this.stepAnimals(dt);
    // DJ music: only near the field
    const near = dist(F.x, F.y, DARTY.booth[0], DARTY.booth[1]) < 680;
    this.beat.setNear(near && !!this.beat.ctx);
    this.zones(F);
  }
  wrap() {
    this.wrapped = true;
    const R = this.api.renderer, owf = R.worldFx, opl = R.postLights, self = this;
    R.worldFx = (g, S, t, vis, vx0, vy0, vx1, vy1) => { if (owf) owf(g, S, t, vis, vx0, vy0, vx1, vy1); self.drawWorld(g, t, vis, vx0, vy0, vx1, vy1); };
    R.postLights = (g, S, gr, t, vis) => { if (opl) opl(g, S, gr, t, vis); self.drawPost(g, S, gr, t, vis); };
  }
  tryBoard(F) {
    if (dist(F.x, F.y, this.heli.x, this.heli.y) < 48 && this.heli.state === 'pad') {
      this.mode = 'heli'; this.heli.state = 'takeoff'; this.heli.vx = 0; this.heli.vy = 0;
      F.x = this.heli.x; F.y = this.heli.y; F.px = F.x; F.py = F.y;
      this.say('HELICOPTER · ACTION TO LAND ON OPEN GROUND');
      return;
    }
    let best = null, bd = 34;
    for (const r of this.rideables) { const d = dist(F.x, F.y, r.x, r.y); if (d < bd) { bd = d; best = r; } }
    if (best) {
      this.mode = best.kind; this.veh = { kind: best.kind, h: best.h, v: 0, hopT: 0, ent: best };
      F.x = best.x; F.y = best.y; F.h = best.h; F.px = F.x; F.py = F.y;
      this.say(best.kind === 'bike' ? 'BIKE · ACTION AT SPEED = HOP · SLOW + ACTION = GET OFF' : 'SCOOTER · ACTION = GET OFF');
    }
  }
  stepRide(dt, F) {
    const v = this.veh, inp = this.raw;
    const top = v.kind === 'scooter' ? 150 : 190;
    if (inp.jm > 0.15) {
      const want = Math.atan2(inp.jy, inp.jx), turn = (v.kind === 'scooter' ? 3.4 : 3.6) * dt;
      v.h += clamp(wrapA(want - v.h), -turn, turn);
      const aligned = Math.cos(wrapA(want - v.h));
      if (v.kind === 'scooter') v.v += clamp(inp.jm * top - v.v, -320 * dt, 240 * dt);
      else { if (aligned > 0.4) v.v += 165 * inp.jm * dt; v.v -= v.v * 0.32 * dt + 4 * dt; if (v.v < 0) v.v = 0; }
    } else {
      v.v = Math.max(0, v.v - (v.kind === 'scooter' ? 260 : 60) * dt);
    }
    v.v = clamp(v.v, 0, top);
    if (this.wantHop && v.hopT <= 0) { v.hopT = 0.001; this.wantHop = false; }
    if (v.hopT > 0) v.hopT += dt;
    const hopDur = 0.46, z = v.hopT > 0 ? (v.hopT >= hopDur ? 0 : Math.sin(Math.PI * v.hopT / hopDur) * 26) : 0;
    if (v.hopT >= hopDur) v.hopT = 0;
    F.x += Math.cos(v.h) * v.v * dt; F.y += Math.sin(v.h) * v.v * dt;
    F.h = v.h; F.z = z; F.vz = 0; F.avx = 0; F.avy = 0; F.air = v.hopT > 0; F.climb = null; F.sup = 0; F.moving = v.v > 4;   // avx/avy: stepOnFoot's ballistic branch integrates them — they must never be undefined
    v.ent.x = F.x; v.ent.y = F.y; v.ent.h = v.h;
    if (this.wantOff) {
      this.wantOff = false; this.mode = null; this.veh = null;
      F.x += Math.cos(F.h + Math.PI / 2) * 24; F.y += Math.sin(F.h + Math.PI / 2) * 24; F.z = 0; F.air = false; F.px = F.x; F.py = F.y;
    }
  }
  landableAt(x, y) {
    const S = this.api.sim;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const hi of S.houseGrid.get((Math.floor(x / 256) + i) * 100003 + Math.floor(y / 256) + j) || []) {
      const bb = S.houseBox[hi]; if (x < bb[0] - 6 || x > bb[2] + 6 || y < bb[1] - 6 || y > bb[3] + 6) continue;
      if (inPoly(S.houses[hi], x, y)) return false;
    }
    const A = this.areas();
    if (A) for (const h of A.heroes) if (Math.abs(h.cx - x) < 420 && Math.abs(h.cy - y) < 420 && inPoly(h.f, x, y)) return false;
    for (const pen of [FARM.horsePen, FARM.pigPen]) if (x > pen.x0 - 20 && x < pen.x1 + 20 && y > pen.y0 - 20 && y < pen.y1 + 20) return false;
    const ex = (x - DARTY.floor[0]) / (DARTY.rx + 30), ey = (y - DARTY.floor[1]) / (DARTY.ry + 30);
    if (ex * ex + ey * ey < 1) return false;
    return true;
  }
  stepHeli(dt, F) {
    const H = this.heli, inp = this.raw;
    if (H.state === 'takeoff') {
      H.alt += HELI.cruise / 1.5 * dt;
      if (H.alt >= HELI.cruise) { H.alt = HELI.cruise; H.state = 'fly'; }
    } else if (H.state === 'landing') {
      H.alt -= HELI.cruise / 0.95 * dt;
      H.vx *= 0.9; H.vy *= 0.9; F.x += H.vx * dt; F.y += H.vy * dt;
      if (H.alt <= 0) {
        H.alt = 0; H.state = 'pad'; H.x = F.x; H.y = F.y; this.mode = null;
        F.x += 36; F.y += 26; F.z = 0; F.px = F.x; F.py = F.y;
        this.say('HELICOPTER PARKED · WALK UP + ACTION TO FLY AGAIN');
        this.syncFoot(F); return;
      }
      this.syncFoot(F); return;
    }
    // fly (and drift while taking off)
    const pw = H.state === 'takeoff' ? 0.3 : 1;
    const tx = inp.jx * HELI.top * pw * (inp.jm || 0), ty = inp.jy * HELI.top * pw * (inp.jm || 0);
    H.vx += (tx - H.vx) * Math.min(1, 2.8 * dt); H.vy += (ty - H.vy) * Math.min(1, 2.8 * dt);
    F.x += H.vx * dt; F.y += H.vy * dt;
    const sp = Math.hypot(H.vx, H.vy);
    if (sp > 12) { const want = Math.atan2(H.vy, H.vx); H.h += clamp(wrapA(want - H.h), -2.6 * dt, 2.6 * dt); }
    F.h = H.h;
    if (this.wantLand) {
      this.wantLand = false;
      if (H.state === 'fly') {
        if (this.landableAt(F.x, F.y)) H.state = 'landing';
        else this.say("CAN'T LAND HERE — NEED OPEN GROUND");
      }
    }
    this.syncFoot(F);
  }
  syncFoot(F) {
    const H = this.heli;
    F.z = H.alt; F.vz = 0; F.avx = 0; F.avy = 0; F.air = H.alt > 2; F.climb = null; F.sup = 0; F.moving = false;   // avx/avy pinned: the ballistic branch in stepOnFoot would NaN the position on undefined air velocity
    if (this.mode === 'heli') { H.x = F.x; H.y = F.y; }
  }
  stepAnimals(dt) {
    const rnd = Math.random;
    for (const a of this.animals) {
      a.t -= dt;
      if (a.mode === 'idle') {
        if (a.t <= 0) {
          const p = a.pen;
          a.tx = p.x0 + 26 + rnd() * (p.x1 - p.x0 - 52); a.ty = p.y0 + 22 + rnd() * (p.y1 - p.y0 - 44);
          a.mode = 'walk';
        }
      } else {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy), sp = a.kind === 'horse' ? 15 : 10;
        if (d < 4) { a.mode = 'idle'; a.t = 2.5 + rnd() * 4.5; }
        else {
          const want = Math.atan2(dy, dx);
          a.h += clamp(wrapA(want - a.h), -2.2 * dt, 2.2 * dt);
          const nx = a.x + Math.cos(a.h) * sp * dt, ny = a.y + Math.sin(a.h) * sp * dt;
          if (a.kind === 'horse' && nx > -564 && nx < -492 && ny > -504 && ny < -450) { a.mode = 'idle'; a.t = 1.5; }   // the run-in shed is solid
          else { a.x = nx; a.y = ny; }
        }
      }
    }
  }
  zones(F) {
    let z = '';
    if (dist(F.x, F.y, DARTY.floor[0], DARTY.floor[1]) < 430) z = 'darty';
    else if (dist(F.x, F.y, FARM.horsePen.cx, FARM.horsePen.cy) < 210 || dist(F.x, F.y, FARM.pigPen.cx, FARM.pigPen.cy) < 180) z = 'farm';
    else if (dist(F.x, F.y, PAD.x, PAD.y) < 170) z = 'pad';
    if (z !== this.zone) {
      this.zone = z;
      if (z === 'darty') this.say('FRAT ROW DARTY · DJ + 100 KIDS DANCING');
      else if (z === 'farm') this.say('CAMPUS FARM · MIND THE PENS');
      else if (z === 'pad') this.say('XFINITY LOT HELIPAD · ACTION STEALS THE HELICOPTER');
    }
    if (this.caption && performance.now() > this.caption.until) this.caption = null;
  }
  say(text) { this.caption = { text, until: performance.now() + 3600 }; }
  // ---- drawing: world pass (under the grade) --------------------------------
  drawWorld(g, t, vis, vx0, vy0, vx1, vy1) {
    const inV = (x, y, m = 260) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
    this.drawFarm(g, t, inV);
    this.drawDarty(g, t, inV);
    this.drawDoor(g, t, inV);
    // rideables (parked + the one being ridden, which sits under the rider's feet)
    for (const r of this.rideables) if (inV(r.x, r.y, 80)) this.drawRideable(g, r, t);
    // the helicopter: shadow always at the true ground spot; body here when parked
    const H = this.heli;
    if (inV(H.x, H.y, 200)) {
      const shA = H.alt > 0 ? clamp(0.42 - H.alt / HELI.cruise * 0.22, 0.12, 0.42) : 0.4;
      const shR = H.alt > 0 ? 34 - H.alt / HELI.cruise * 10 : 34;
      g.fillStyle = `rgba(20,14,30,${shA})`; g.beginPath(); g.ellipse(H.x, H.y, shR, shR * 0.62, 0, 0, TAU); g.fill();
      if (H.alt > 0) { g.strokeStyle = 'rgba(255,255,255,0.20)'; g.lineWidth = 2; g.beginPath(); g.ellipse(H.x, H.y, shR + 12 + Math.sin(t * 22) * 3, (shR + 12) * 0.62, 0, 0, TAU); g.stroke(); }
      if (H.state === 'pad') this.drawHeli(g, H.x, H.y, H.h, t, 1, false);
      // the pad itself
      g.strokeStyle = 'rgba(255,210,92,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(PAD.x, PAD.y, 52, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,210,92,0.9)'; g.font = '900 44px system-ui'; g.textAlign = 'center'; g.fillText('H', PAD.x, PAD.y + 15);
    }
  }
  drawPost(g, S, gr, t, vis) {
    // airborne helicopter, projected like the engine's roof-walkers (lf_climb.project)
    const H = this.heli;
    if (H.alt > 1) {
      const p = project(H.x, H.y, H.alt, this.api.cam);
      this.drawHeli(g, p.x, p.y, H.h, t, p.k, true);
    }
    // darty light pools as dusk falls
    const tod = this.api.timeOfDay();
    if (tod > 0.55 && this.dancers) {
      const a = (tod - 0.55) * 0.55;
      for (const [x, y, r] of [[DARTY.booth[0], DARTY.booth[1], 190], [DARTY.floor[0], DARTY.floor[1], 380]]) {
        const gr2 = g.createRadialGradient(x, y, 10, x, y, r);
        gr2.addColorStop(0, `rgba(255,190,110,${a})`); gr2.addColorStop(1, 'rgba(255,190,110,0)');
        g.fillStyle = gr2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    }
  }
  drawHeli(g, x, y, h, t, k, flying) {
    g.save(); g.translate(x, y); g.rotate(h); g.scale(k, k);
    g.strokeStyle = 'rgba(30,34,44,0.9)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-16, -15); g.lineTo(20, -15); g.moveTo(-16, 15); g.lineTo(20, 15); g.stroke();   // skids
    g.fillStyle = '#7a2e2a'; g.beginPath(); g.moveTo(-18, -4); g.lineTo(-58, -2); g.lineTo(-58, 2); g.lineTo(-18, 4); g.closePath(); g.fill();   // tail boom
    g.fillStyle = '#a6192e'; g.fillRect(-62, -9, 5, 18);                                                  // tail fin
    const bg = g.createLinearGradient(-24, 0, 30, 0); bg.addColorStop(0, '#d8dde2'); bg.addColorStop(1, '#f4f6f8');
    g.fillStyle = bg; g.beginPath(); g.ellipse(2, 0, 30, 15.5, 0, 0, TAU); g.fill();
    g.lineWidth = 2.2; g.strokeStyle = '#210f2e'; g.stroke();
    g.fillStyle = '#a6192e'; g.fillRect(-8, -15.5, 12, 31);                                              // UMD red band
    g.fillStyle = 'rgba(70,130,180,0.85)'; g.beginPath(); g.ellipse(19, 0, 12, 10.5, 0, 0, TAU); g.fill();   // cockpit glass
    const ra = flying ? t * 41 : t * 2.2;
    g.strokeStyle = 'rgba(24,26,34,0.75)'; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(Math.cos(ra) * 47, Math.sin(ra) * 47 * 0.36); g.lineTo(-Math.cos(ra) * 47, -Math.sin(ra) * 47 * 0.36); g.stroke();
    g.beginPath(); g.moveTo(Math.cos(ra + Math.PI / 2) * 47, Math.sin(ra + Math.PI / 2) * 47 * 0.36); g.lineTo(-Math.cos(ra + Math.PI / 2) * 47, -Math.sin(ra + Math.PI / 2) * 47 * 0.36); g.stroke();
    g.fillStyle = 'rgba(24,26,34,0.10)'; g.beginPath(); g.ellipse(0, 0, 47, 17, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2e38'; g.beginPath(); g.arc(0, 0, 4.6, 0, TAU); g.fill();
    g.restore();
  }
  drawRideable(g, r, t) {
    const HUES = ['#a6192e', '#1f8a8a', '#e8c23a', '#3a6ad8', '#e8e6dc'];
    g.save(); g.translate(r.x, r.y); g.rotate(r.h);
    g.fillStyle = 'rgba(20,14,30,0.30)'; g.beginPath(); g.ellipse(1.5, 2.5, 17, 8, 0, 0, TAU); g.fill();
    if (r.kind === 'scooter') {
      // city rental e-scooter (owner reference, Nov 21): WHITE deck + stem, matte black
      // wheels / grips / grip tape / stem clamp, long low deck, rear fender, no seat.
      const INK = '#210f2e', WH = '#f0eee6', BK = '#17181d';
      // rear fender: a white arc hugging the back of the rear wheel
      g.strokeStyle = WH; g.lineWidth = 3.4; g.beginPath(); g.arc(-13, 0, 6.6, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.arc(-13, 0, 8.1, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
      // wheels: solid black, front a touch larger than the rear
      g.fillStyle = BK; g.beginPath(); g.arc(-13, 0, 4.3, 0, TAU); g.arc(13, 0, 5, 0, TAU); g.fill();
      g.fillStyle = '#3a3d46'; g.beginPath(); g.arc(-13, 0, 1.2, 0, TAU); g.arc(13, 0, 1.4, 0, TAU); g.fill();
      // deck: long, low, narrow — white, rising into the stem at the front nose
      g.fillStyle = WH; g.beginPath(); g.roundRect(-15.5, -3.1, 30.5, 6.2, 3); g.fill();
      g.beginPath(); g.ellipse(14.5, 0, 4.8, 3.4, 0, 0, TAU); g.fill();
      g.lineWidth = 1.6; g.strokeStyle = INK; g.beginPath(); g.roundRect(-15.5, -3.1, 30.5, 6.2, 3); g.stroke();
      // grip tape: the black strip down the deck's top (white deck shows all around it)
      g.fillStyle = '#1b1c21'; g.beginPath(); g.roundRect(-12.5, -1.3, 22.5, 2.6, 1.3); g.fill();
      // stem: white, ink-edged, leaning out over the front wheel; black clamp band 1/3 up
      g.lineCap = 'round';
      g.strokeStyle = INK; g.lineWidth = 6.4; g.beginPath(); g.moveTo(13, 0); g.lineTo(20.5, 0); g.stroke();
      g.strokeStyle = WH; g.lineWidth = 4.2; g.beginPath(); g.moveTo(13, 0); g.lineTo(20.5, 0); g.stroke();
      g.strokeStyle = BK; g.lineWidth = 5.2; g.beginPath(); g.moveTo(16.4, 0); g.lineTo(17.7, 0); g.stroke();
      // handlebar: straight black bar, thicker grips at the ends
      g.strokeStyle = BK; g.lineWidth = 2.8; g.beginPath(); g.moveTo(20.5, -5.6); g.lineTo(20.5, 5.6); g.stroke();
      g.lineWidth = 4.4; g.beginPath(); g.moveTo(20.5, -5.6); g.lineTo(20.5, -3.6); g.moveTo(20.5, 3.6); g.lineTo(20.5, 5.6); g.stroke();
      g.lineCap = 'butt';
    } else {
      g.strokeStyle = '#20242e'; g.lineWidth = 2.6;
      g.beginPath(); g.arc(-12, 0, 6.4, 0, TAU); g.stroke(); g.beginPath(); g.arc(13, 0, 6.4, 0, TAU); g.stroke();
      g.strokeStyle = HUES[r.hue]; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-12, 0); g.lineTo(1, -6); g.lineTo(13, 0); g.moveTo(1, -6); g.lineTo(3, 0); g.lineTo(-12, 0); g.stroke();
      g.strokeStyle = '#20242e'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(11, -7); g.lineTo(13, 0); g.moveTo(-3, -8); g.lineTo(1, -6); g.stroke();
      g.fillStyle = '#20242e'; g.fillRect(-6, -9.4, 6, 2.8);
    }
    g.restore();
  }
  drawFarm(g, t, inV) {
    for (const pen of [FARM.horsePen, FARM.pigPen]) {
      if (!inV(pen.cx, pen.cy, 320)) continue;
      g.strokeStyle = 'rgba(90,60,32,0.55)'; g.lineWidth = 7; g.strokeRect(pen.x0, pen.y0, pen.x1 - pen.x0, pen.y1 - pen.y0);
      g.strokeStyle = '#a87c48'; g.lineWidth = 3.4; g.strokeRect(pen.x0, pen.y0, pen.x1 - pen.x0, pen.y1 - pen.y0);
      g.fillStyle = '#7a5230';
      for (let x = pen.x0; x <= pen.x1; x += 38) { g.fillRect(x - 2.6, pen.y0 - 2.6, 5.2, 5.2); g.fillRect(x - 2.6, pen.y1 - 2.6, 5.2, 5.2); }
      for (let y = pen.y0; y <= pen.y1; y += 38) { g.fillRect(pen.x0 - 2.6, y - 2.6, 5.2, 5.2); g.fillRect(pen.x1 - 2.6, y - 2.6, 5.2, 5.2); }
    }
    // a little run-in shed in the horse pen
    if (inV(-528, -478, 200)) {
      g.fillStyle = 'rgba(20,14,30,0.30)'; g.fillRect(-556 + 5, -496 + 6, 56, 38);
      g.fillStyle = '#9a4a3a'; g.fillRect(-556, -496, 56, 38);
      g.lineWidth = 2.2; g.strokeStyle = '#210f2e'; g.strokeRect(-556, -496, 56, 38);
      g.fillStyle = '#6a3428'; g.fillRect(-556, -496, 56, 10);
      g.fillStyle = '#3a2418'; g.fillRect(-534, -482, 18, 24);
    }
    for (const a of this.animals) if (inV(a.x, a.y, 160)) this.drawAnimal(g, a, t);
    this.drawSign(g, FARM.sign[0], FARM.sign[1], 'CAMPUS FARM', 'UMD · EST. 1856');
  }
  drawAnimal(g, a, t) {
    const walking = a.mode === 'walk', ph = t * 7 + a.ph;
    g.save(); g.translate(a.x, a.y); g.rotate(a.h);
    g.fillStyle = 'rgba(20,14,30,0.30)'; g.beginPath(); g.ellipse(1.5, 3, a.kind === 'horse' ? 25 : 15, a.kind === 'horse' ? 11 : 8, 0, 0, TAU); g.fill();
    if (a.kind === 'horse') {
      g.strokeStyle = '#5d3d22'; g.lineWidth = 3.4;
      const lp = walking ? Math.sin(ph) * 4 : 0;
      for (const [lx, ly] of [[13, -8], [13, 8], [-13, -8], [-13, 8]]) { g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + (ly > 0 ? lp : -lp) * 0.4, ly + Math.sign(ly) * 5); g.stroke(); }
      const dip = !walking && Math.sin(t * 0.6 + a.ph) > 0.25 ? 4.5 : 0;      // graze: head dips to the grass
      g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(0, 0, 24, 10.5, 0, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#210f2e'; g.stroke();
      g.save(); g.translate(21, dip * 0.4); g.rotate(0.5 + dip * 0.05);
      g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(6, 0, 12.5, 6.4, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#6e4525'; g.beginPath(); g.ellipse(15.5, 0, 5.4, 4.4, 0, 0, TAU); g.fill();
      g.fillStyle = '#5d3d22'; g.beginPath(); g.moveTo(-2, -5); g.lineTo(2, -9.5); g.lineTo(5, -4.6); g.closePath(); g.fill();   // ear
      g.restore();
      g.strokeStyle = '#5d3d22'; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-8, -9.6); g.lineTo(16, -9.2); g.stroke();          // mane
      g.lineWidth = 3; g.beginPath(); g.moveTo(-23, 0); g.quadraticCurveTo(-30, 3, -28, 9); g.stroke();                          // tail
      g.fillStyle = '#e8e2d4'; g.beginPath(); g.ellipse(-3, 3.5, 6.4, 3.4, 0.4, 0, TAU); g.fill();                                // blaze patch
    } else {
      g.strokeStyle = '#c47f88'; g.lineWidth = 2.8;
      const lp = walking ? Math.sin(ph) * 2.6 : 0;
      for (const [lx, ly] of [[8, -5.4], [8, 5.4], [-8, -5.4], [-8, 5.4]]) { g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + (ly > 0 ? lp : -lp) * 0.4, ly + Math.sign(ly) * 3.4); g.stroke(); }
      const dip = !walking && Math.sin(t * 0.8 + a.ph) > 0.1 ? 3 : 0;         // rooting in the mud
      g.fillStyle = '#e8a0a8'; g.beginPath(); g.ellipse(0, 0, 15.5, 8.6, 0, 0, TAU); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#210f2e'; g.stroke();
      g.save(); g.translate(12.5, dip * 0.4); g.rotate(dip * 0.04);
      g.fillStyle = '#e8a0a8'; g.beginPath(); g.ellipse(3.4, 0, 6.8, 5.2, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#d4788a'; g.beginPath(); g.ellipse(8.6, 0, 3.1, 2.7, 0, 0, TAU); g.fill();                                  // snout
      g.fillStyle = '#d4788a'; g.beginPath(); g.moveTo(-1, -4.6); g.lineTo(2.4, -8); g.lineTo(4.4, -3.8); g.closePath(); g.fill();   // ear
      g.restore();
      g.strokeStyle = '#c47f88'; g.lineWidth = 2; g.beginPath(); g.arc(-17.5, 2.5, 3.2, 0.4, 4.4); g.stroke();                    // curly tail
      g.fillStyle = 'rgba(150,110,80,0.5)'; g.beginPath(); g.ellipse(-4, 4, 5, 2.4, 0.3, 0, TAU); g.fill();                       // mud patch
    }
    g.restore();
  }
  drawDarty(g, t, inV) {
    const [fx, fy] = DARTY.floor;
    if (!inV(fx, fy, 700) && !inV(DARTY.booth[0], DARTY.booth[1], 300)) return;
    // the dance floor: a sunlit clearing ellipse over the grass
    g.fillStyle = 'rgba(255,240,200,0.10)'; g.beginPath(); g.ellipse(fx, fy, DARTY.rx + 26, DARTY.ry + 22, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,210,92,0.5)'; g.lineWidth = 2.6; g.setLineDash([16, 11]); g.beginPath(); g.ellipse(fx, fy, DARTY.rx + 26, DARTY.ry + 22, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    // DJ booth + speaker stacks
    const [bx, by] = DARTY.booth;
    g.fillStyle = 'rgba(20,14,30,0.3)'; g.fillRect(bx - 62 + 5, by - 40 + 6, 124, 80);
    g.fillStyle = '#5a3c78'; g.fillRect(bx - 62, by - 40, 124, 80);
    g.lineWidth = 2.4; g.strokeStyle = '#210f2e'; g.strokeRect(bx - 62, by - 40, 124, 80);
    g.fillStyle = '#ffd25c'; g.font = '900 17px system-ui'; g.textAlign = 'center'; g.fillText('DJ', bx, by + 32);
    for (const sy of [by - 88, by + 88]) {
      g.fillStyle = '#22242e'; g.fillRect(bx + 22, sy - 19, 34, 38);
      g.lineWidth = 2; g.strokeStyle = '#210f2e'; g.strokeRect(bx + 22, sy - 19, 34, 38);
      g.fillStyle = '#3d4152'; g.beginPath(); g.arc(bx + 39, sy - 7, 8.4, 0, TAU); g.fill();
      g.beginPath(); g.arc(bx + 39, sy + 9, 5.6, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,210,92,${0.24 + 0.16 * Math.sin(t * 9.4 + sy)})`; g.lineWidth = 2;
      g.beginPath(); g.arc(bx + 39, sy, 24 + Math.sin(t * 9.4 + sy) * 4, 0, TAU); g.stroke();
    }
    drawPedAt(g, { who: { id: 'dj' }, outfit: 'ped_sun', x: bx - 18, y: by, px: bx - 18, py: by, h: 0, dap: Math.sin(t * 8.4) * 0.8, ph: 0 }, t);
    // beach balls on the grass
    for (const [px, py, c] of [[fx - 210, fy + 120, '#d44a3a'], [fx + 260, fy - 96, '#3a6ad8'], [fx + 60, fy + 138, '#e8c23a']]) {
      g.fillStyle = c; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(px - 3, py - 3, 4, 0, TAU); g.fill();
      g.lineWidth = 1.6; g.strokeStyle = '#210f2e'; g.beginPath(); g.arc(px, py, 10, 0, TAU); g.stroke();
    }
    // the crowd: 100 students, dance-bobbing (the party crowd's own dap recipe)
    if (this.dancers) for (const d of this.dancers) {
      if (!inV(d.x, d.y, 60)) continue;
      const bob = 0.75 + 0.25 * Math.sin(t * 4 + d.ph);
      d.dap = Math.sin(t * 8.4 + d.ph) * bob;
      drawPedAt(g, d, t);
    }
    this.drawSign(g, DARTY.sign[0], DARTY.sign[1], 'FRAT ROW DARTY', 'DJ · DAY PARTY');
  }
  drawDoor(g, t, inV) {
    const PL = this.api.getPL && this.api.getPL(); if (!PL) return;
    const pl = PL.place('yahentamitsi'); if (!pl) return;
    const d = doorPoint(pl);
    if (!inV(d.x, d.y, 200)) return;
    const pu = 0.6 + 0.4 * Math.sin(t * 3.2);
    g.strokeStyle = `rgba(255,210,92,${0.55 + 0.3 * pu})`; g.lineWidth = 3;
    g.beginPath(); g.arc(d.x, d.y, 20 + pu * 6, 0, TAU); g.stroke();
    this.drawSign(g, d.x, d.y - 64, 'YAHENTAMITSI', 'DINING HALL · GO IN');
  }
  drawSign(g, x, y, title, sub) {
    g.font = '900 16px system-ui';
    const w = Math.max(g.measureText(title).width, sub ? g.measureText(sub).width * 1.14 : 0) + 26, h = sub ? 46 : 30;
    g.fillStyle = '#4a3220'; g.fillRect(x - 3, y + h / 2 - 4, 6, 26);
    g.fillStyle = 'rgba(20,14,30,0.28)'; g.beginPath(); g.roundRect(x - w / 2 + 4, y - h / 2 + 5, w, h, 8); g.fill();
    g.fillStyle = '#2a1430'; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 8); g.fill();
    g.lineWidth = 2; g.strokeStyle = '#ffd25c'; g.stroke();
    g.fillStyle = '#ffe4b0'; g.textAlign = 'center'; g.fillText(title, x, y + (sub ? -1 : 6));
    if (sub) { g.font = '800 10.5px system-ui'; g.fillStyle = '#d8c8a8'; g.fillText(sub, x, y + 15); }
  }
  // ---- drawing: screen overlay (captions + prompts) -------------------------
  drawOverlay(g, VW, H, t) {
    g.setTransform(this.api.DPR(), 0, 0, this.api.DPR(), 0, 0);
    g.textAlign = 'center';
    if (this.caption) {
      g.font = '900 13px system-ui';
      const w = g.measureText(this.caption.text).width + 28;
      g.fillStyle = 'rgba(27,20,48,0.78)'; g.beginPath(); g.roundRect(VW / 2 - w / 2, 84, w, 27, 13); g.fill();
      g.fillStyle = '#ffe4b0'; g.fillText(this.caption.text, VW / 2, 102);
    }
    let prompt = null;
    const F = this.foot();
    if (this.mode === 'heli') prompt = this.heli.state === 'fly' ? 'ACTION · LAND ON OPEN GROUND' : this.heli.state === 'landing' ? 'LANDING…' : 'TAKING OFF…';
    else if (this.mode === 'bike') prompt = 'ACTION · HOP — SLOW + ACTION · GET OFF';
    else if (this.mode === 'scooter') prompt = 'ACTION · GET OFF';
    else if (F && F.active) {
      if (dist(F.x, F.y, this.heli.x, this.heli.y) < 48 && this.heli.state === 'pad') prompt = 'ACTION · STEAL HELICOPTER';
      else { for (const r of this.rideables) if (dist(F.x, F.y, r.x, r.y) < 34) { prompt = 'ACTION · RIDE ' + (r.kind === 'bike' ? 'BIKE' : 'SCOOTER'); break; } }
    }
    if (prompt) {
      g.font = '900 12.5px system-ui';
      const w = g.measureText(prompt).width + 26;
      g.fillStyle = 'rgba(27,20,48,0.78)'; g.beginPath(); g.roundRect(VW / 2 - w / 2, H - 176, w, 26, 13); g.fill();
      g.fillStyle = '#ffd25c'; g.fillText(prompt, VW / 2, H - 159);
    }
  }
  // ---- drawing: the cafeteria overlay (inside Yahentamitsi) -----------------
  drawInside(inside, R, VW, H, DPR, t) {
    if (!inside || !inside.cafe || !R.SX) return;
    const g = this._ctx || (this._ctx = document.getElementById('game').getContext('2d'));
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const SX = R.SX, SY = R.SY, k = R.k, h = inside.hero;
    // splats (floor / table / on a person)
    for (const s of inside.splats) {
      const x = s.on ? s.on.x : s.x, z = s.on ? 1.12 : s.z;
      g.globalAlpha = Math.min(1, s.t / 5) * 0.85;
      g.fillStyle = FOOD[s.id].color;
      g.beginPath(); g.ellipse(SX(x), SY(z), 0.30 * k, (s.on ? 0.20 : s.z > 0.5 ? 0.16 : 0.10) * k, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(SX(x) + 0.2 * k, SY(z) - 0.08 * k, 0.13 * k, 0.09 * k, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // flying food
    for (const p of inside.projs) this.drawFood(g, p.id, SX(p.x), SY(p.z), 0.42 * k);
    // hearts over the eater
    g.textAlign = 'center';
    for (const hh of inside.hearts) {
      if (hh.t < 0) continue;
      g.globalAlpha = Math.max(0, 1 - hh.t / 1.1);
      g.font = `900 ${Math.round(0.42 * k)}px system-ui`; g.fillStyle = '#ff7aa8';
      g.fillText('♥', SX(hh.x), SY(hh.z));
    }
    g.globalAlpha = 1;
    // the tray in the hero's hands: a board + the picked items riding on it
    if (h.hold === 'tray' && inside.tray.length) {
      const hx = SX(h.x) + h.face * 0.34 * k, hy = SY(0.92);
      g.fillStyle = '#8a5a34'; g.beginPath(); g.roundRect(hx - 0.46 * k, hy, 0.92 * k, 0.10 * k, 3); g.fill();
      inside.tray.forEach((it, i) => this.drawFood(g, it.id, hx + (i - (inside.tray.length - 1) / 2) * 0.17 * k, hy - 0.13 * k, 0.20 * k));
    }
    // tray HUD: bottom-left slots with icons + short labels
    if (inside.tray.length || inside.seated) {
      const x0 = 10, y0 = H - 60, sw = 37;
      g.fillStyle = 'rgba(27,20,48,0.66)'; g.beginPath(); g.roundRect(x0 - 4, y0 - 16, 6 * sw + 8, 66, 10); g.fill();
      g.font = '800 8.5px system-ui'; g.fillStyle = '#ffe4b0'; g.textAlign = 'left'; g.fillText('TRAY', x0 + 2, y0 - 4);
      for (let i = 0; i < 6; i++) {
        const cx = x0 + i * sw + sw / 2;
        g.fillStyle = 'rgba(255,241,216,0.13)'; g.beginPath(); g.roundRect(x0 + i * sw + 2, y0, sw - 5, 32, 7); g.fill();
        const it = inside.tray[i];
        if (it) {
          this.drawFood(g, it.id, cx, y0 + 13, 21);
          g.font = '800 7.5px system-ui'; g.fillStyle = '#e8dcc8'; g.textAlign = 'center'; g.fillText(FOOD[it.id].name, cx, y0 + 41);
          if (it.bites < FOOD[it.id].bites) { g.fillStyle = '#ffd25c'; g.fillText('·'.repeat(it.bites), cx, y0 + 49); }
        }
      }
    }
    // score + fight status
    g.font = '900 12px system-ui';
    const sc = 'SCORE ' + inside.score, swd = g.measureText(sc).width + 20;
    g.fillStyle = 'rgba(27,20,48,0.72)'; g.beginPath(); g.roundRect(VW - swd - 10, 12, swd, 24, 11); g.fill();
    g.fillStyle = '#ffd25c'; g.textAlign = 'center'; g.fillText(sc, VW - swd / 2 - 10, 28);
    if (inside.fight) {
      const ft = 'FOOD FIGHT · ' + Math.ceil(inside.fight.t) + 's';
      g.font = '900 13px system-ui';
      const w = g.measureText(ft).width + 26;
      g.fillStyle = 'rgba(166,25,46,0.82)'; g.beginPath(); g.roundRect(VW / 2 - w / 2, 58, w, 26, 13); g.fill();
      g.fillStyle = '#fff1d8'; g.fillText(ft, VW / 2, 76);
      const chaos = Math.min(100, inside.projs.length * 18 + inside.splats.length * 2.2);
      g.fillStyle = 'rgba(27,20,48,0.6)'; g.beginPath(); g.roundRect(VW / 2 - 60, 90, 120, 8, 4); g.fill();
      g.fillStyle = '#e8a33a'; g.beginPath(); g.roundRect(VW / 2 - 60, 90, chaos * 1.2, 8, 4); g.fill();
    }
  }
  drawFood(g, id, x, y, s) {
    g.save(); g.translate(x, y);
    const u = s / 24; g.scale(u, u);
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(33,15,46,0.8)';
    if (id === 'pizza') {
      g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(-9, -7); g.lineTo(9, -7); g.lineTo(0, 10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#c97b2d'; g.fillRect(-9.4, -9.4, 18.8, 3.6);
      g.fillStyle = '#b83a2a'; for (const [cx, cy] of [[-3.4, -2], [3.6, 0.6], [-0.6, 4.6]]) { g.beginPath(); g.arc(cx, cy, 2.1, 0, TAU); g.fill(); }
    } else if (id === 'burger') {
      g.fillStyle = '#e0aa5e'; g.beginPath(); g.arc(0, -1.5, 9, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = '#6fae4e'; g.fillRect(-9.4, -1.2, 18.8, 2.8);
      g.fillStyle = '#7a4a26'; g.fillRect(-8.8, 1.8, 17.6, 3.8);
      g.fillStyle = '#e0aa5e'; g.beginPath(); g.roundRect(-8.8, 5.8, 17.6, 3.6, 1.8); g.fill(); g.stroke();
    } else if (id === 'salad') {
      g.fillStyle = '#6fae4e'; for (const [cx, cy] of [[-4.6, -3.4], [0.6, -5], [4.8, -3], [-1.4, -1.2]]) { g.beginPath(); g.arc(cx, cy, 3.3, 0, TAU); g.fill(); }
      g.fillStyle = '#d4788a'; g.beginPath(); g.arc(2.8, -4.4, 1.9, 0, TAU); g.fill();
      g.fillStyle = '#dfe6ea'; g.beginPath(); g.arc(0, 0.6, 9.4, 0, Math.PI); g.fill(); g.stroke();
    } else if (id === 'fries') {
      g.strokeStyle = '#e8c23a'; g.lineWidth = 3.1;
      for (const dx of [-5.4, -1.8, 1.8, 5.4]) { g.beginPath(); g.moveTo(dx, 1); g.lineTo(dx * 0.82, -8.6); g.stroke(); }
      g.fillStyle = '#c23a2a'; g.beginPath(); g.moveTo(-8, -1.6); g.lineTo(8, -1.6); g.lineTo(6, 9); g.lineTo(-6, 9); g.closePath(); g.fill();
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(33,15,46,0.8)'; g.stroke();
    } else if (id === 'dessert') {
      g.fillStyle = '#d478a8'; g.beginPath(); g.moveTo(-6.4, 0); g.lineTo(6.4, 0); g.lineTo(3.8, 9); g.lineTo(-3.8, 9); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff4f8'; g.beginPath(); g.arc(0, -2.6, 6.8, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#c22a3a'; g.beginPath(); g.arc(0, -8.6, 2.3, 0, TAU); g.fill();
    } else {   // drink
      g.fillStyle = '#4a90c2'; g.beginPath(); g.moveTo(-6.6, -5); g.lineTo(6.6, -5); g.lineTo(5, 9); g.lineTo(-5, 9); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e8e6dc'; g.fillRect(-7.4, -7.2, 14.8, 2.8);
      g.strokeStyle = '#c22a3a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(2.4, -7); g.lineTo(5.2, -12); g.stroke();
    }
    g.restore();
  }
  // ---- interior factory + hooks used by main.js
  makeInterior(pl, K, who) {
    if (!K || pl.id !== 'yahentamitsi') return null;
    return new CafeteriaInterior(K, { who, exitAt: pl });
  }
  debugState() {
    const F = this.foot();
    return { mode: this.mode, heli: { ...this.heli }, dancers: this.dancers ? this.dancers.length : 0, foot: F ? { x: Math.round(F.x), y: Math.round(F.y), z: Math.round(F.z || 0), active: F.active } : null, rideables: this.rideables.length };
  }
}

export function init(api) { return new CPF(api); }
