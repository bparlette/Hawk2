/* Hospital Escape — HE.Destruction: the chase destruction system (Moth's first stab, reworked by Opus Nov 25).
   When a pursuer's component dies (chase.js: crippled:tire / crippled:driver / crippled:engine) this module owns the car:
   an outcome DIRECTOR (veer + chain crash / rollover / fire / blown tire), per-outcome motion on the same p.v / p.lat fields the
   stock crippled branches drive, a spring SUSPENSION on every chase car (weight transfer under braking and swerving, bounce and
   settle after every impact), impact-matched crumple / glass / lightbar damage, a recycled debris pool, dark-smoke + ember fire,
   and the WINDOW GUNMAN — a real shooter through combat.fairTick / fairFire / fireAtHero (the fairness audit covers him) and a
   real target (combat.shoot routes his hits to D.hitGunman).

   Determinism: every OUTCOME decision uses game.rng (seeded; tests and audits replay it). Debris scatter, smoke and sparks are
   pure presentation and use Math.random so frame rate can never shift the game's random stream.
   Transform rule: chase.place() rebuilds each car's transform every step; D.step snapshots it (D.base) and D.pose() starts from
   that snapshot every frame, so roll / pitch / lift never accumulate, even on frames that render without a step.

   VEHICLE INTERFACE (what this module reads from a car object — Moth's modeled cars only need to provide these):
     userData.kind                      'patrol' | 'charger' | 'suv' (dims fall back per kind if dims absent)
     userData.dims  (optional)          { L, W, H, base, cabH, cabZ }  body length / width / body height / body floor / cabin h / cabin z
     userData.wheels (optional)         [{ g: Object3D, front: bool, side: ±1 }]  — else found by A.car's layout (y 0.36, |z| L/2-0.85)
     meshes with userData.zone          'engine' (hood: buckles on frontal impact), 'driver', 'tire' (hit zones, unchanged)
     userData.lightbar (optional)       knocked off on a rollover
     userData.glass (optional)          [mesh,...] side glass, shattered on the struck side — else found as the thin side boxes
     userData.anchors (optional)        { hood: V3, window: { L: V3, R: V3 } } local points for the ember glow and the gunman
   Local frame: +z forward (chase.place uses lookAt), +y up, origin on the road at the car's centre. */
(function(){
'use strict';
var HE = window.HE, ART = function(){ return window.HEART || null; }, V3 = function(x, y, z){ return new THREE.Vector3(x, y, z); }, MR = Math.random;

var TUN = {
  // component flavour weights (used to break ties inside the variety deck below)
  outcomes: { tire: { blowout: 0.55, rollover: 0.25, veer: 0.2 }, driver: { veer: 0.5, rollover: 0.32, blowout: 0.18 }, engine: { fire: 0.66, veer: 0.18, rollover: 0.16 } },
  rollMinSpeed: 6.5,          // m/s: below this nothing rolls
  rollDurPer: 0.6, settle: 0.7,
  veerRate: 2.6, veerEdge: 4.6, chainWindow: 18, chainReach: { ds: 4.9, dlat: 1.95 }, chainDamage: { driver: 60, engine: 80 },
  blowoutDur: 3.4, veerDur: 2.4, veerMax: 3.6, fireDur: 2.8,
  limpK: 0.45, debrisMax: 64, debrisLife: 3.2,
  rollFire: 0.4,              // chance a rolled car (fast roll) keeps smouldering where it lands
  spring: { k: 95, c: 9.5, pitchPerAcc: 0.011, rollPerLat: 0.06, maxPitch: 0.16, maxRoll: 0.14 },
  gunman: { first: 1.0, chance: 0.5, hp: 30, fireEvery: 1.6, accuracy: 0.26, damage: 3, leanTime: 0.6, height: 1.0, range: 32, closeGap: 7.5, closeRate: 3.5 }
};
HE.DestructionTuning = TUN;

HE.Destruction = function(game){
  var T = game.data.tuning, R = game.rng;
  var D = { episodes: {}, rest: {}, gunmen: {}, rigs: {}, sus: {}, base: {}, debris: [], fx: [], deck: [], stats: { veer: 0, chain: 0, rollover: 0, fire: 0, blowout: 0, gunmen: 0, gunmanShots: 0, gunmanKills: 0 }, nGun: 0 };
  function obj(p){ return game.actorObject(p.role); }

  // ------------------------------------------------------------------ per-car rig (read through the vehicle interface)
  function rig(p){
    var r = D.rigs[p.role]; if(r) return r; var m = obj(p), kind = m && m.userData.kind;
    r = { L: 4.8, W: 1.88, base: 0.38, H: 0.72, cabH: 0.55, cabZ: -0.25, wheels: [], hood: null, glass: [], bar: null };
    if(kind === 'suv'){ r.L = 4.9; r.W = 2.0; r.base = 0.45; r.H = 1.0; r.cabH = 0.75; r.cabZ = -0.45; }
    if(!m){ D.rigs[p.role] = r; return r; }
    if(m.userData.dims) Object.assign(r, m.userData.dims);
    r.wheels = m.userData.wheels || [];
    m.children.forEach(function(c){
      if(!m.userData.wheels && c.isGroup && Math.abs(c.position.y - 0.36) < 0.02 && Math.abs(Math.abs(c.position.z) - (r.L / 2 - 0.85)) < 0.06 && Math.abs(c.position.x) > 0.5)
        r.wheels.push({ g: c, front: c.position.z > 0, side: c.position.x > 0 ? 1 : -1, y0: c.position.y });
      if(c.isMesh && c.userData.zone === 'engine') r.hood = { m: c, p0: c.position.clone(), r0: c.rotation.x };
      if(!m.userData.glass && c.isMesh && c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.02) r.glass.push(c);   // A.car side glass (0.02 thick)
    });
    if(m.userData.glass) r.glass = m.userData.glass;
    r.bar = m.userData.lightbar || null;
    D.rigs[p.role] = r; return r;
  }
  function groundY(p){ var path = game.chase.path(); return path ? path.pointAtS(p.s).y : 0; }

  // ------------------------------------------------------------------ debris (recycled pool, shared materials: no new shader programs mid-chase)
  var geo = null, MAT = null;
  function mats(){ if(MAT) return MAT; geo = new THREE.BoxGeometry(1, 1, 1);
    var S = function(c, o){ return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.6 }, o || {})); };
    MAT = { panel: [S(0x2a2d31), S(0x8a929c), S(0xd8d9d6, { metalness: 0.3 })], glass: [S(0x9fc4d8, { metalness: 0.8, roughness: 0.1 })], shred: [S(0x111111, { metalness: 0, roughness: 0.95 })],
            light: [S(0xff2020, { emissive: 0xff0000, emissiveIntensity: 1.5 }), S(0x2050ff, { emissive: 0x1040ff, emissiveIntensity: 1.5 })] }; return MAT; }
  // kind: panel | glass | shred | light. from: world point. push: world velocity (impact direction) added to the scatter.
  function shed(p, kind, n, from, push, spread){
    if(!game.scene) return; mats(); var m = obj(p); if(!m) return; var fwd = V3(0, 0, 1).applyQuaternion(m.quaternion).setY(0).normalize(), gy = groundY(p);
    for(var i = 0; i < n; i++){
      var d = D.debris.length >= TUN.debrisMax ? D.debris.shift() : new THREE.Mesh(geo, MAT.panel[0]);
      var list = MAT[kind] || MAT.panel; d.material = list[Math.floor(MR() * list.length)];
      if(kind === 'glass') d.scale.set(0.05 + MR() * 0.06, 0.012, 0.05 + MR() * 0.06);
      else if(kind === 'shred') d.scale.set(0.08 + MR() * 0.1, 0.025, 0.25 + MR() * 0.3);
      else if(kind === 'light') d.scale.set(0.2, 0.08, 0.15);
      else d.scale.set(0.12 + MR() * 0.3, 0.02 + MR() * 0.05, 0.1 + MR() * 0.35);
      d.userData.s0 = d.scale.clone();
      d.position.copy(from || m.position).add(V3((MR() - 0.5) * 1.2, 0.3 + MR() * 0.6, (MR() - 0.5) * 1.2));
      var sp = spread || 1.5;
      d.userData.vel = fwd.clone().multiplyScalar(p.v * (0.55 + MR() * 0.3)).add(V3((MR() - 0.5) * sp * 2, 1.4 + MR() * 2.4 * sp * 0.6, (MR() - 0.5) * sp * 2));
      if(push) d.userData.vel.add(push);
      d.userData.rot = V3(MR() * 12 - 6, MR() * 12 - 6, MR() * 12 - 6); d.userData.t = 0; d.userData.gy = gy; d.visible = true;
      if(!d.parent) game.scene.add(d); D.debris.push(d);
    }
  }
  function stepDebris(dt){
    for(var i = D.debris.length - 1; i >= 0; i--){ var d = D.debris[i], u = d.userData, v = u.vel; u.t += dt;
      v.y -= 13 * dt; d.position.addScaledVector(v, dt);
      if(d.position.y < u.gy + 0.03){ d.position.y = u.gy + 0.03; if(v.y < -1){ v.y = -v.y * 0.3; } else v.y = 0; v.x *= Math.pow(0.08, dt * 3); v.z *= Math.pow(0.08, dt * 3); u.rot.multiplyScalar(Math.pow(0.05, dt * 3)); }   // ground friction: pieces skid and stop
      d.rotation.x += u.rot.x * dt; d.rotation.y += u.rot.y * dt; d.rotation.z += u.rot.z * dt;
      if(u.t > TUN.debrisLife){ var k = 1 - (u.t - TUN.debrisLife) / 0.5; if(k <= 0){ d.visible = false; D.debris.splice(i, 1); game.scene.remove(d); } else d.scale.copy(u.s0).multiplyScalar(k); } }
  }
  function fx(type, pos, o){ var f = { type: type, pos: pos }; if(o) for(var k in o) f[k] = o[k]; D.fx.push(f); }

  // ------------------------------------------------------------------ suspension: a damped spring per car (pitch / roll / heave), driven by
  // the car's own longitudinal and lateral acceleration. Braking dives the nose, swerving rolls the body, impacts kick heave.
  function sus(p){ return D.sus[p.role] || (D.sus[p.role] = { pitch: 0, vp: 0, roll: 0, vr: 0, heave: 0, vh: 0, pv: p.v, pl: p.lat, plv: 0 }); }
  function stepSus(p, dt){ if(dt <= 0) return; var s = sus(p), K = TUN.spring;
    var a = (p.v - s.pv) / dt, lv = (p.lat - s.pl) / dt, la = (lv - s.plv) / dt; s.pv = p.v; s.pl = p.lat; s.plv = lv;
    var tp = HE.clamp(-a * K.pitchPerAcc, -K.maxPitch, K.maxPitch), tr = HE.clamp(la * K.rollPerLat * 0.1, -K.maxRoll, K.maxRoll);
    s.vp += (-K.k * (s.pitch - tp) - K.c * s.vp) * dt; s.pitch += s.vp * dt;
    s.vr += (-K.k * (s.roll - tr) - K.c * s.vr) * dt; s.roll += s.vr * dt;
    s.vh += (-K.k * s.heave - K.c * s.vh) * dt; s.heave += s.vh * dt; }
  function kick(p, heave, pitch, roll){ var s = sus(p); s.vh += heave || 0; s.vp += pitch || 0; s.vr += roll || 0; }

  // ------------------------------------------------------------------ the outcome director: a shuffled DECK of the four outcomes, so every
  // playthrough sees all of them early and no two consecutive wrecks match; the component and the physics pick WHICH card from the deck.
  function refill(){ var d = ['veer', 'rollover', 'fire', 'blowout']; for(var i = d.length - 1; i > 0; i--){ var j = Math.floor(R() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; } D.deck = d; }
  function feasible(k, p){ if(k === 'rollover') return p.v >= TUN.rollMinSpeed; if(k === 'veer') return true; return true; }
  function pick(p, comp){
    if(!D.deck.length) refill();
    var w = TUN.outcomes[comp] || TUN.outcomes.driver, tgt = chainTarget(p), best = -1, bs = -1;
    D.deck.forEach(function(k, i){ if(!feasible(k, p) || k === D.last) return;
      var sc = (w[k] || 0.05) + (i === 0 ? 0.35 : 0) + R() * 0.25;
      if(k === 'veer') sc += tgt ? 0.6 : -0.3;          // a veer next to another car becomes the chain crash
      if(sc > bs){ bs = sc; best = i; } });
    var out = best >= 0 ? D.deck.splice(best, 1)[0] : (p.v >= TUN.rollMinSpeed ? 'rollover' : 'veer');
    D.last = out; return out;
  }
  function chainTarget(p){ var best = null, bd = 1e9;
    game.chase.list.forEach(function(q){ if(q === p || q.state !== 'pursuing') return; var ds = q.s - p.s, d = Math.abs(ds) + Math.abs(q.lat - p.lat) * 2;
      if(Math.abs(ds) < TUN.chainWindow && d < bd){ bd = d; best = q; } }); return best; }

  // ------------------------------------------------------------------ episodes
  function startEpisode(p, comp){
    var forced = D.forced && D.forced[p.role]; if(forced) delete D.forced[p.role];
    var out = forced ? forced.kind : pick(p, comp), k = HE.clamp((p.v - 6) / 14, 0, 1);   // k: impact-speed scale 0..1
    var ep = { p: p, kind: out, comp: comp, t: 0, dur: TUN.veerDur, k: k, dir: p.lat !== 0 ? Math.sign(p.lat) : (R() < 0.5 ? -1 : 1),
      target: null, chained: false, theta: 0, lift: 0, yaw: 0, slam: 0, stage: 0, wheel: null, pull: 1, rolls: 0, restA: 0, smokeT: 0, sparkT: 0, scrape: false };
    if(forced && forced.dir) ep.dir = forced.dir;
    if(out === 'veer'){ ep.target = forced ? null : chainTarget(p); if(ep.target) ep.dir = Math.sign(ep.target.lat - p.lat) || ep.dir; ep.dur = ep.target ? TUN.veerMax : TUN.veerDur; }
    if(out === 'blowout'){ ep.dur = TUN.blowoutDur; var ws = rig(p).wheels.filter(function(w){ return w.front; }); ep.wheel = ws.length ? ws[Math.floor(R() * ws.length)] : null;
      ep.pull = ep.wheel ? ep.wheel.side * -1 : ep.dir; var m = obj(p); if(m && ep.wheel) shed(p, 'shred', 5, ep.wheel.g.getWorldPosition(V3()), null, 1.2);
      fx('pop', m ? m.position.clone().setY(groundY(p) + 0.4) : null); kick(p, -0.6, 0.5, ep.pull * 0.8); }
    if(out === 'rollover'){ ep.rolls = 2 + (k > 0.45 && R() < 0.55 ? 1 : 0); ep.restA = [0, Math.PI / 2, Math.PI][Math.floor(R() * 3)];   // lands on wheels / side / roof
      ep.trip = 0.35 + 0.25 * R(); ep.tripT = 0.35; ep.dur = ep.tripT + ep.rolls * TUN.rollDurPer * (1.15 - k * 0.3) + TUN.settle; ep.air = 0.25 + 0.55 * k; }
    if(out === 'fire'){ ep.dur = TUN.fireDur; kick(p, 0, 0.9, 0); }
    if(forced && forced.chainedFrom) ep.victim = true;
    D.episodes[p.role] = ep; D.stats[out]++;
    game.log('destruction', { id: p.id, role: p.role, kind: out, comp: comp, v: +p.v.toFixed(1), rolls: ep.rolls || undefined, chainTarget: ep.target ? ep.target.id : undefined, victim: ep.victim || undefined });
    var g = D.gunmen[p.role]; if(g && g.alive && out !== 'blowout') killGunman(g, 'crash');
    return ep;
  }
  function endEpisode(p, ep){
    delete D.episodes[p.role];
    var rest = { theta: 0, wheel: null, yaw: ep.yaw, fireT: 0 };
    if(ep.kind === 'rollover'){ rest.theta = ep.dir * (ep.rolls * Math.PI * 2 + ep.restA); if(ep.k > 0.5 && R() < TUN.rollFire) rest.fireT = 9; }
    if(ep.kind === 'blowout') rest.wheel = ep.wheel;
    if(ep.kind === 'fire') rest.fireT = 12;
    D.rest[p.role] = rest;
    var g = D.gunmen[p.role]; if(g && g.alive) retireGunman(g);
    game.chase.setState(p, 'wrecked');   // logs, scores T.score.wreck, waves.onPursuerOut — the stock path
  }
  // CHAIN CRASH: contact with another active pursuer. Momentum decides the victim's fate: a hard hit (fast closing / side-on) flips it,
  // a softer one spins it into its own veer — through the real hitComponent path so scoring and waves stay honest.
  function tryChain(p, ep){
    if(ep.chained || !ep.target) return; var q = ep.target;
    if(q.state !== 'pursuing'){ ep.target = chainTarget(p); if(ep.target) ep.dir = Math.sign(ep.target.lat - p.lat) || ep.dir; return; }
    // homing: the out-of-control car carries its momentum into the target's line
    var ds = q.s - p.s; if(ds > 0) p.v = Math.max(p.v, q.v + 3.5); else p.v = Math.min(p.v, q.v - 4);
    if(Math.abs(ds) > TUN.chainReach.ds || Math.abs(p.lat - q.lat) > TUN.chainReach.dlat) return;
    ep.chained = true; D.stats.chain++;
    var close = Math.abs(p.v - q.v) + Math.abs(p.lat - q.lat) * 2, side = Math.sign(q.lat - p.lat) || ep.dir, mp = obj(p), mq = obj(q);
    var contact = mp && mq ? mp.position.clone().lerp(mq.position, 0.5).setY(groundY(p) + 0.7) : null;
    game.log('destruction', { id: p.id, role: p.role, kind: 'chain', to: q.id, close: +close.toFixed(1) });
    game.combat.shake = Math.min(1, game.combat.shake + 0.35);
    var push = mq && mp ? mq.position.clone().sub(mp.position).setY(0).normalize().multiplyScalar(2.5) : null;
    shed(p, 'panel', 8, contact, push, 2); shed(q, 'glass', 10, contact, push, 1.6); fx('sparks', contact, { n: 14 }); fx('crunch', contact);
    crumple(p, ds > 0 ? 'front' : 'rear', 0.7); crumple(q, 'side', 0.7, -side); shatter(q, -side);
    kick(p, -1.2, ds > 0 ? 2.2 : -2.2, side * 1.5); kick(q, -1.4, 0, side * 3.2);
    D.forced = D.forced || {}; D.forced[q.role] = { kind: q.v > TUN.rollMinSpeed && close > 5 ? 'rollover' : 'veer', dir: side, chainedFrom: p.id };
    game.chase.hitComponent(q.role, 'driver', TUN.chainDamage.driver);
    p.v = Math.max(0, Math.min(p.v, q.v) - 3); ep.dur = Math.min(ep.dur, ep.t + 1.2);
  }

  // ------------------------------------------------------------------ damage presentation helpers (impact-matched)
  function crumple(p, where, amt, side){ var r = rig(p); if(where === 'front' && r.hood){ r.hood.m.rotation.x = r.hood.r0 - 0.35 * amt; r.hood.m.position.y = r.hood.p0.y + 0.12 * amt; r.hood.m.position.z = r.hood.p0.z - 0.18 * amt; }
    var m = obj(p); if(m) m.userData.crumple = { where: where, amt: amt, side: side || 0 }; }
  function shatter(p, side){ var r = rig(p), m = obj(p); r.glass.forEach(function(g){ if(!side || Math.sign(g.position.x) === Math.sign(side)) g.visible = false; });
    if(m) shed(p, 'glass', 8, m.localToWorld(V3((side || 1) * r.W / 2, r.base + r.H + r.cabH * 0.5, r.cabZ)), null, 1.4); }
  function knockBar(p){ var r = rig(p), m = obj(p); if(r.bar && r.bar.visible !== false){ r.bar.visible = false; if(m) shed(p, 'light', 2, m.localToWorld(V3(0, r.base + r.H + r.cabH + 0.1, r.cabZ)), V3(0, 2, 0), 1.2); } }

  // ------------------------------------------------------------------ per-outcome motion (engine step)
  function driveVeer(p, ep, dt, va){
    var homing = ep.target && !ep.chained && ep.target.state === 'pursuing', want = homing ? ep.target.lat : ep.dir * TUN.veerEdge;
    var rate = TUN.veerRate * (0.8 + 0.6 * ep.k);
    p.lat += HE.clamp(want - p.lat, -rate * dt, rate * dt);
    if(!homing) p.v = Math.max(0, p.v - (va * 0.6 + 2.6) * dt);
    ep.yaw += (ep.dir * (0.45 + 0.4 * ep.k) - ep.yaw) * Math.min(1, dt * 2.5);           // the tail steps out into a slide
    tryChain(p, ep);
    if(!homing && Math.abs(p.lat) > TUN.veerEdge - 0.05 && !ep.kerb){ ep.kerb = true; kick(p, -0.9, 0.8, -ep.dir * 2.4); var m = obj(p); if(m){ fx('sparks', m.position.clone().setY(groundY(p) + 0.3), { n: 8 }); fx('crunch', m.position.clone()); } p.v *= 0.5; }   // hits the kerb / barrier
    if(ep.chained === false && ep.target && ep.t > ep.dur - 0.05){ ep.target = null; }
    smoke(p, ep, dt, 'tire');
  }
  function driveBlowout(p, ep, dt, va){
    var k = ep.t / ep.dur;
    p.lat += ep.pull * (0.7 + 1.6 * k) * dt;
    var limp = k < 0.72 ? va * TUN.limpK : 0; p.v += HE.clamp(limp - p.v, -7 * dt, 3 * dt);
    ep.yaw += (ep.pull * 0.22 - ep.yaw) * Math.min(1, dt * 3);
    ep.sparkT -= dt; if(ep.sparkT <= 0 && p.v > 1.5 && ep.wheel){ ep.sparkT = 0.06; var m = obj(p); if(m){ m.updateMatrixWorld(true); fx('sparks', ep.wheel.g.getWorldPosition(V3()).setY(groundY(p) + 0.08), { n: 2 }); } }   // rim on asphalt
    if(Math.abs(p.lat) > TUN.veerEdge + 0.4){ p.lat = Math.sign(p.lat) * (TUN.veerEdge + 0.4); p.v *= 0.6; }
    if(ep.t > 0.3 && ep.t - dt <= 0.3 + dt && obj(p)) shed(p, 'shred', 4, null, null, 1);
    smoke(p, ep, dt, 'tire');
    tryChain(p, ep);
  }
  function driveFire(p, ep, dt, va){
    p.v = Math.max(0, p.v - (va * 0.45 + 1.5) * dt);
    if(ep.t >= 0.8 && ep.stage === 0){ ep.stage = 1; game.log('burn', { id: p.id, stage: 'smoke' }); }
    if(ep.t >= 1.6 && ep.stage === 1){ ep.stage = 2; game.log('burn', { id: p.id, stage: 'fire' }); game.combat.shake = Math.min(1, game.combat.shake + 0.25); kick(p, 1.4, 0, 0); var m = obj(p); if(m){ shed(p, 'panel', 4, m.localToWorld(V3(0, 1.2, rig(p).L / 2 - 0.6)), V3(0, 3, 0), 1.2); fx('whump', m.position.clone()); } }   // the hood pops
    if(ep.stage >= 1) smoke(p, ep, dt, 'fire');
  }
  function driveRoll(p, ep, dt, va){
    var rollT = ep.dur - ep.tripT - TUN.settle, ph = HE.clamp((ep.t - ep.tripT) / rollT, 0, 1);
    if(ep.t < ep.tripT){ ep.yaw += (ep.dir * ep.trip - ep.yaw) * Math.min(1, dt * 8); p.lat += ep.dir * 1.5 * dt; p.v = Math.max(0, p.v - 4 * dt); ep.theta = ep.dir * 0.25 * (ep.t / ep.tripT); return; }   // trips: the tail slides, the wheels dig in
    var ease = 1 - Math.pow(1 - ph, 1.8), th = ep.dir * (0.25 + (ep.rolls * Math.PI * 2 + ep.restA - 0.25) * ease); ep.theta = th;
    var lift = 0;
    var air = ph < 0.4 ? ep.air * Math.sin(Math.PI * ph / 0.4) : 0;           // the first roll launches off the trip
    if(ph >= 1){ air = 0; if(!ep.landed){ ep.landed = true; kick(p, -1.6, 0, ep.dir * 3); } }
    ep.lift = lift + air;
    p.v = Math.max(0, p.v - (va * 0.3 + 2.4 + ph * 5) * dt); p.lat += ep.dir * (1.4 + ep.k) * dt * (1 - ph);
    var slam = Math.floor(Math.abs(th) / (Math.PI / 2));                      // a contact every quarter turn: side, roof, side, wheels
    if(slam > ep.slam && ph < 1){ ep.slam = slam; var m = obj(p), at = m ? m.position.clone().setY(groundY(p) + 0.3) : null, hard = (slam % 2 === 0 ? 1 : 0.6) * (0.5 + ep.k);
      shed(p, slam === 1 ? 'glass' : 'panel', Math.round(3 + 4 * hard), at, null, 1.2 + hard); fx('sparks', at, { n: Math.round(4 + 8 * hard) }); fx('crunch', at);
      if(slam === 1) shatter(p, 0); if(slam === 2) { knockBar(p); crumple(p, 'roof', 0.6); }
      game.combat.shake = Math.min(1, game.combat.shake + 0.06 + 0.06 * hard); game.log('destruction', { id: p.id, role: p.role, kind: 'slam', n: slam }); }
    if(ph >= 1 && ep.restA === Math.PI && p.v > 1){ ep.sparkT -= dt; if(ep.sparkT <= 0){ ep.sparkT = 0.05; var m2 = obj(p); if(m2) fx('sparks', m2.position.clone().setY(groundY(p) + 0.05), { n: 3 }); } }   // sliding on its roof
  }
  // dark smoke / tire smoke requests, rate-limited
  function smoke(p, ep, dt, kind){ ep.smokeT -= dt; var m = obj(p); if(!m || ep.smokeT > 0) return; var r = rig(p);
    if(kind === 'fire'){ ep.smokeT = 0.07; fx('smoke', m.localToWorld(V3((MR() - 0.5) * 0.8, r.base + r.H + 0.2, r.L / 2 - 0.7)), { dark: true, size: 1.1 + MR() * 0.6 }); if(MR() < 0.5) fx('ember', m.localToWorld(V3((MR() - 0.5) * 1.2, r.base + r.H, r.L / 2 - 0.6 - MR() * 0.8))); }
    else if(p.v > 2){ ep.smokeT = 0.09; var w = ep.wheel ? ep.wheel.g.getWorldPosition(V3()) : m.localToWorld(V3(ep.dir * r.W / 2, 0.2, -r.L / 2 + 0.8)); fx('smoke', w.setY(groundY(p) + 0.25), { dark: false, size: 0.8 }); }
  }

  // chase.step hook: true while an episode owns this crippled car (the stock branch is skipped)
  D.drive = function(p, dt){
    if(p.state.indexOf('crippled:') !== 0) return false;
    var ep = D.episodes[p.role]; if(!ep) ep = startEpisode(p, p.state.slice(9));
    if(game.won){ p.v = 0; return true; }
    ep.t += dt; var va = game.rail.speed();
    if(ep.kind === 'veer') driveVeer(p, ep, dt, va); else if(ep.kind === 'blowout') driveBlowout(p, ep, dt, va);
    else if(ep.kind === 'fire') driveFire(p, ep, dt, va); else if(ep.kind === 'rollover') driveRoll(p, ep, dt, va);
    if(ep.t >= ep.dur) endEpisode(p, ep);
    return true;
  };
  D.owns = function(p){ return !!D.episodes[p.role] || !!D.rest[p.role]; };

  // ------------------------------------------------------------------ the window gunman
  function spawnGunman(p){
    var m = obj(p); var A = ART(); if(!m || !(A && A.person)) return null; var r = rig(p);
    var mount = new THREE.Group(), fig = A.person({ height: 1.75, top: 0x23262b, bottom: 0x1d1f24, hairStyle: 'short', gun: 'smg' });
    fig.scale.setScalar(0.95); mount.add(fig); m.add(mount); mount.name = 'gunman:' + p.id;
    var g = { role: 'gunman:' + p.id, pursuer: p, hp: TUN.gunman.hp, alive: true, deployed: 0, fireT: 0.25 + R() * 0.3, fair: false, vis: null, visT: 0, fairT: 0, side: 0, mount: mount, fig: fig, deadT: 0, flinch: 0 };
    fig.traverse(function(o){ if(o.isMesh) o.userData.hit = { role: g.role, gunman: true, live: function(){ return g.alive && g.deployed >= 0.5; } }; });
    if(game.greybox && game.greybox.actors) game.greybox.actors[g.role] = fig;
    D.gunmen[p.role] = g; D.stats.gunmen++; D.nGun++;
    game.log('destruction', { id: p.id, role: g.role, kind: 'gunmanSpawn' }); return g;
  }
  // he leans out of the window nearer the centre of the player's view (the ambulance's rear doors frame the shot; the outer window is
  // usually hidden behind the door pillar) — and if he cannot get a clear line for 2.5 s he ducks back in and tries the other window
  function gunmanSide(p, g){ var m = obj(p); if(!m) return 1; var r = rig(p), cam = game.camera; m.updateMatrixWorld(true); cam.updateMatrixWorld();
    var a = m.localToWorld(V3(r.W / 2, 1.5, r.cabZ)).project(cam), b = m.localToWorld(V3(-r.W / 2, 1.5, r.cabZ)).project(cam);
    var s = Math.abs(a.x) <= Math.abs(b.x) ? 1 : -1; if(g && g.blockedT > 2.5) s = -g.side; return s; }
  function neckWorld(g){ var J = g.fig.userData.J; var o = (J && (J.head || J.neck)) || g.fig; return o.getWorldPosition(V3()); }
  function poseGunman(p, g, dt){ var A = ART();
    var r = rig(p), m = obj(p); if(!m) return; if(!g.side) g.side = gunmanSide(p, g);
    var an = m.userData.anchors && m.userData.anchors.window ? m.userData.anchors.window[g.side > 0 ? 'R' : 'L'] : null;
    var lean = g.alive ? g.deployed : 1, s = g.side;
    g.mount.position.set(an ? an.x : s * (r.W / 2 - 0.22), an ? an.y : r.base + r.H + 0.08, an ? an.z : r.cabZ + 0.15);
    if(!g.alive){ g.deadT += dt; var k = Math.min(1, g.deadT / 0.5); g.mount.rotation.set(0, 0, -s * (0.55 + 0.75 * k)); A.pose(g.fig, 'hurt', 0); g.fig.position.set(0, -0.95 * 0.95 + 0.3 * (1 - k), 0); g.fig.rotation.set(0.3 * k, 0, 0); return; }   // hangs out of the window
    g.mount.rotation.set(0, 0, -s * (0.1 + 0.5 * lean) + (g.flinch > 0 ? s * 0.25 * g.flinch : 0)); g.flinch = Math.max(0, g.flinch - dt * 4);
    g.fig.position.set(0, -0.95 * 0.95 + 0.15, 0);                              // hips just above the sill, legs inside the door
    m.updateMatrixWorld(true); var c = g.mount.worldToLocal(game.camera.position.clone()); g.fig.rotation.set(0, Math.atan2(c.x, c.z), 0);
    A.pose(g.fig, 'aim', game.time, { pitch: HE.clamp(Math.atan2(c.y - 1.3, Math.hypot(c.x, c.z)), -0.5, 0.5) });
  }
  function stepGunman(p, g, dt){
    if(!g.alive || p.state !== 'pursuing') return;
    if(g.ducking){ g.deployed = Math.max(0, g.deployed - dt / 0.4); if(g.deployed <= 0){ g.ducking = false; g.side = gunmanSide(p, g); g.blockedT = 0; } return; }
    if(g.deployed < 1){ if(!g.side) g.side = gunmanSide(p, g); g.deployed = Math.min(1, g.deployed + dt / TUN.gunman.leanTime); return; }
    if(game.won) return; var m = obj(p); if(!m || !g.fig) return;
    m.updateMatrixWorld(true); var neck = neckWorld(g), K = TUN.gunman, F = T.fairness;
    if(neck.distanceTo(game.camera.position) > K.range){ g.fair = false; g.visT = 0; return; }
    var foot = neck.clone(); foot.y -= K.height * 0.72;                         // fairness 'feet' point: its LOS target (feet + 0.72 h) is his neck, out of the window
    if(F){ g.fair = game.combat.fairTick(g, foot, K.height, dt); g.blockedT = g.visT > 0 ? 0 : (g.blockedT || 0) + dt; if(g.blockedT > 2.5){ g.ducking = true; game.log('destruction', { role: g.role, kind: 'gunmanSwitch' }); return; } if(F.seenOnly && !g.fair) return; } else g.fair = true;
    g.fireT -= dt; if(g.fireT > 0) return; g.fireT = K.fireEvery * (0.8 + 0.4 * R());
    var hit = R() < K.accuracy && g.fair !== false; if(hit && F) hit = game.combat.fairFire(g, foot, K.height);
    var A = ART(), mz = (A && A.muzzleWorld && A.muzzleWorld(g.fig, V3())) || neck;
    game.log('enemyFire', { role: g.role, hit: hit, via: 'gunman' }); D.stats.gunmanShots++;
    fx('flash', mz.clone());
    game.combat.fireAtHero(g.role, mz.clone().setY(mz.y - 1.45), hit, K.damage, g.vis);
  }
  function killGunman(g, by){ if(!g.alive) return; g.alive = false; game.log('kill', { role: g.role, kind: 'gunman', points: 0, by: by }); }
  function retireGunman(g){ g.alive = false; }
  D.hitGunman = function(role, dmg){ var g = null; for(var k in D.gunmen) if(D.gunmen[k].role === role) g = D.gunmen[k];
    if(!g || !g.alive) return; g.hp -= dmg; g.flinch = 1; game.log('hit', { role: role, hp: Math.max(0, g.hp), via: 'gunman' });
    if(g.hp <= 0){ var pts = T.score && T.score.kill ? T.score.kill : 0; game.combat.score += pts; g.alive = false; D.stats.gunmanKills++; game.log('kill', { role: role, kind: 'gunman', points: pts }); } };

  // ------------------------------------------------------------------ per-step (engine; after chase.step)
  D.step = function(dt){
    game.chase.list.forEach(function(p){
      if(p.state === 'pursuing' && !p._gmRolled && p.t > 0.3){ p._gmRolled = true; if(R() < (D.nGun === 0 ? TUN.gunman.first : TUN.gunman.chance)) spawnGunman(p); }
      var g = D.gunmen[p.role]; if(g) stepGunman(p, g, dt);
      // a car carrying a live gunman surges in to a shooting distance where he reads (the fairness minPx rule) — the readable tell
      if(g && g.alive && g.deployed > 0 && p.state === 'pursuing' && !game.won){
        // ...but never out of the player's reach: it tucks in toward the centre line (|lat| <= 1.5 m) and keeps |lat| / gap inside the
        // rear-door view cone (tan 14 deg ~ 0.25), so the car's own hit zones stay on screen while its gunman is.
        if(Math.abs(p.lat) > 1.5) p.lat -= Math.sign(p.lat) * Math.min(Math.abs(p.lat) - 1.5, 1.2 * dt);
        var gap = Math.max(TUN.gunman.closeGap, Math.abs(p.lat) / 0.25 + 1), want = game.chase.ambS() - gap; if(p.s < want) p.s = Math.min(want, p.s + TUN.gunman.closeRate * dt); }
      if(D.episodes[p.role] && p.state.indexOf('crippled:') !== 0) delete D.episodes[p.role];
      var rs = D.rest[p.role]; if(rs && rs.fireT > 0){ rs.fireT -= dt; var fakeEp = rs.ep || (rs.ep = { smokeT: 0 }); smoke(p, fakeEp, dt, 'fire'); }
      stepSus(p, dt);
      var m = obj(p); if(m){ var b = D.base[p.role] || (D.base[p.role] = { pos: V3(), q: new THREE.Quaternion() }); b.pos.copy(m.position); b.q.copy(m.quaternion); }
    });
  };

  // ------------------------------------------------------------------ per-frame presentation (main.js present(), before the stock chase loop)
  var _q = new THREE.Quaternion(), _e = new THREE.Euler();
  // roll about the body's centre (not the road-level origin), with the centre held at the height the rotated body actually needs:
  // h(θ) = W/2·|sin θ| + Hc/2·|cos θ| — so it rides up onto its corners mid-roll and rests on its door, roof or wheels
  function rollAbout(m, r, th, extra){ var yc = (r.base + r.H + r.cabH) / 2; m.translateY(yc); m.rotateZ(th); m.translateY(-yc);
    m.position.y += (r.W / 2) * Math.abs(Math.sin(th)) + yc * Math.abs(Math.cos(th)) - yc + (extra || 0); }
  D.pose = function(dt){
    game.chase.list.forEach(function(p){
      var m = obj(p), b = D.base[p.role]; if(!m || !b) return;
      m.position.copy(b.pos); m.quaternion.copy(b.q);
      var ep = D.episodes[p.role], rest = D.rest[p.role], s = D.sus[p.role];
      if(ep){ if(ep.yaw) m.rotateY(ep.yaw);
        if(ep.kind === 'rollover') rollAbout(m, rig(p), ep.theta, ep.lift);
        if(ep.kind === 'blowout' && ep.wheel){ ep.wheel.g.scale.y = 0.6; ep.wheel.g.position.y = 0.22; if(p.v > 1) m.rotateY(Math.sin(ep.t * 23) * 0.02); m.rotateZ(ep.wheel.side * 0.05); }
        if(ep.kind === 'veer') m.rotateZ(-ep.dir * 0.05); }
      else if(rest){ if(rest.yaw) m.rotateY(rest.yaw); if(rest.theta) rollAbout(m, rig(p), rest.theta, 0);
        if(rest.wheel){ rest.wheel.g.scale.y = 0.6; rest.wheel.g.position.y = 0.22; m.rotateZ(rest.wheel.side * 0.05); }
      }
      if(s){ m.rotateX(s.pitch); m.rotateZ(s.roll); m.position.y += s.heave * 0.12; }
      var cr = m.userData.crumple; if(cr && cr.where === 'roof'){ /* the roof crush reads through the knocked-off lightbar + glass */ }
      if((ep && ep.kind === 'fire' && ep.stage >= 1) || (rest && rest.fireT > 0)) ember(p, m, rest && !ep ? Math.min(1, rest.fireT / 3) : 1);
      m.userData.fire = false; if(ep || rest) m.userData.smoke = false;   // NO flame sprites (house fire standard): this module emits its own dark smoke
      var g = D.gunmen[p.role]; if(g) poseGunman(p, g, dt);
    });
    stepDebris(dt);
  };
  // ember glow: additive planes under the hood seam + in the grille, flickering (no flame geometry, no new light: a light would recompile programs)
  var emberMat = null;
  function ember(p, m, k){ var r = rig(p); if(!r.ember){ if(!emberMat) emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      var a = m.userData.anchors && m.userData.anchors.hood, g = new THREE.Group(); g.position.copy(a || V3(0, r.base + r.H + 0.02, r.L / 2 - 0.65));
      var p1 = new THREE.Mesh(new THREE.PlaneGeometry(r.W - 0.3, 1.0), emberMat.clone()); p1.rotation.x = -Math.PI / 2; p1.position.y = 0.04; g.add(p1);
      var p2 = new THREE.Mesh(new THREE.PlaneGeometry(r.W - 0.4, 0.25), emberMat.clone()); p2.position.set(0, -r.H * 0.4, 0.66); g.add(p2);
      m.add(g); r.ember = [p1, p2]; }
    var t = game.time, f = 0.75 + Math.sin(t * 23 + p.s) * 0.12 + Math.sin(t * 41.3) * 0.08 + Math.sin(t * 7.1) * 0.05;
    r.ember[0].material.opacity = 0.42 * f * k; r.ember[1].material.opacity = 0.6 * f * k;
    r.ember[0].material.color.setHSL(0.06 + 0.02 * Math.sin(t * 13), 1, 0.5); }
  D.drainFx = function(){ var f = D.fx; D.fx = []; return f; };

  D.reset = function(){
    D.debris.forEach(function(d){ if(game.scene) game.scene.remove(d); });
    for(var k in D.gunmen) if(game.greybox && game.greybox.actors) delete game.greybox.actors[D.gunmen[k].role];
    D.episodes = {}; D.rest = {}; D.gunmen = {}; D.rigs = {}; D.sus = {}; D.base = {}; D.debris = []; D.fx = []; D.forced = {};
  };
  D.debugList = function(){ var out = {}; for(var k in D.episodes) out[k] = D.episodes[k].kind; return out; };
  return D;
};

/* ADAPTER (landed Nov 25):
   index.html      <script src="game/destruction.js"> after game/art.js
   director.js     game.destruction = HE.Destruction ? HE.Destruction(game) : null;  step: after chase.step;  reset: next to chase.reset()
   chase.js        first crippled else-if: game.destruction && game.destruction.drive(p, dt)
   combat.js       c.shoot: h.info.gunman -> game.destruction.hitGunman(role, dmg)
   main.js         present(): D.pose(dt) + drain fx before the stock chase loop; stock spin / smoke skipped for owned cars */
})();
