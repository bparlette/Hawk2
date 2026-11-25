/* Hospital Escape — destruction (MOTH FIRST STAB): the chase destruction system. When a pursuer's component
   dies (chase.js states crippled:tire / crippled:driver / crippled:engine), this module owns the car from
   there: an outcome picker (veer + chain crash / rollover / fire / blowout), per-outcome motion that drives
   the same p.v / p.lat fields chase.step's stock crippled branches drive, post-place mesh work (roll, lift,
   flat wheel, ember glow), a debris pool, one-shot FX requests for the presentation layer, and the window
   gunman — a real shooter who fires through combat.fairTick / fairFire / fireAtHero (so the fairness audit
   covers him exactly like every other shooter) and is himself a registered target.

   MOTH FIRST STAB — for Opus to review, modify, and integrate. Not wired into the game yet. Not play-tested.

   Design notes for the reviewer:
   - All randomness is game.rng (seeded): the fairness audit and engine tests replay seeds, so nothing here
     may use Math.random for game state. (Presentation jitter in main.js is exempt; this file is engine-side.)
   - chase.place(p) re-aims the mesh with lookAt every step, so roll / lift / skew are applied AFTER it, in
     pose() — never stored on the mesh. A wrecked car keeps its final pose via D.rest (pose() reapplies it),
     otherwise the roll would snap back to upright the frame the episode ends.
   - The stock crippled branches in chase.step stay as the fallback: drive() returns true only while an
     episode owns the car, so with the module absent (or an outcome disabled) the game behaves exactly as now.
   - Fire reuses the existing 'burn' log stages (smoke at 0.8 s, fire at 1.6 s) so main.js processEvents sets
     userData.fire and plays the boom with no presentation changes; the ember glow is this module's own mesh.
   - Outcomes are picked per killing component with the weights in TUN.outcomes, then gated by physics: a
     car slower than TUN.rollMinSpeed cannot roll (it grinds out a blowout / veer instead). */
(function(){
'use strict';
var HE = window.HE;

// ---------------------------------------------------------------- tuning (every knob lives here)
var TUN = {
  // outcome weights per killing component (chase.js OUT map: tire->veer, driver->drift, engine->burn —
  // those stay the *flavour*; these weights pick the destruction episode that plays it out)
  outcomes: {
    tire:   { blowout: 0.60, rollover: 0.22, veer: 0.18 },
    driver: { veer: 0.52, rollover: 0.30, blowout: 0.18 },
    engine: { fire: 0.68, veer: 0.18, rollover: 0.14 }
  },
  rollMinSpeed: 6.5,        // m/s along the path: below this a picked rollover degrades to blowout / veer
  rollDurPer: 0.62,         // s per full roll, before the 0.55 s settle tail
  veerRate: 2.3,            // m/s lateral speed while veering toward the target lane / road edge
  veerEdge: 4.4,            // lateral target (m) when no chain target exists (chase_road is 12 wide)
  chainWindow: 16,          // m of path distance ahead searched for a chain-crash target
  chainDamage: { driver: 50, engine: 70 },   // component damage dealt on impact (> the 40 / 60 component HP)
  blowoutDur: 3.4, veerDur: 2.3, fireDur: 2.6,   // episode lengths (stock crippled timers: 2.4 / 1.8 / 2.6)
  limpK: 0.45,              // blowout: decays toward ambulance speed x limpK, then to 0 over the last quarter
  debrisMax: 42, debrisLife: 2.6,
  gunman: { chance: 0.55, hp: 30, fireEvery: 1.5, accuracy: 0.26, damage: 3, leanTime: 0.8, height: 1.7, range: 30 }
  // gunman numbers mirror tuning.enemies.gunman (hp 30) softened for a moving platform; when integrating,
  // move these into level1.js tuning (e.g. tuning.gunman) so data owns them like every other actor.
};

HE.Destruction = function(game){
  var T = game.data.tuning, R = game.rng;
  var D = { episodes: {}, rest: {}, gunmen: {}, rigs: {}, debris: [], fx: [] };

  // ---------------------------------------------------------- per-car rig (wheels / dims, found once)
  // A.car (game/art.js) does not store its wheel groups, so they are identified by position: the four wheel
  // Groups sit at y = 0.36, |x| = W/2 - 0.02, |z| = L/2 - 0.85. In the greybox engine the car differs and
  // the rig simply finds no wheels — every wheel effect then no-ops instead of crashing.
  function rig(p){
    var r = D.rigs[p.role]; if(r) return r;
    r = { mesh: null, wheels: [], L: 4.8, W: 1.88, base: 0.38, H: 0.72, cabH: 0.55, cabZ: -0.25 };
    var m = game.actorObject(p.role); r.mesh = m;
    if(m && m.userData.kind === 'suv'){ r.L = 4.9; r.W = 2.0; r.base = 0.45; r.H = 1.0; r.cabH = 0.75; r.cabZ = -0.45; }
    if(m) m.children.forEach(function(c){
      if(c.isGroup && Math.abs(c.position.y - 0.36) < 0.02 && Math.abs(Math.abs(c.position.z) - (r.L / 2 - 0.85)) < 0.06 && Math.abs(c.position.x) > 0.5)
        r.wheels.push({ g: c, front: c.position.z > 0, side: c.position.x > 0 ? 1 : -1 });
    });
    D.rigs[p.role] = r; return r;
  }
  function wheelWorld(p, w){
    if(!w) return null; var m = game.actorObject(p.role); if(!m) return null;
    m.updateMatrixWorld(true); return w.g.getWorldPosition(new THREE.Vector3());
  }

  // ---------------------------------------------------------- debris pool (module-owned scene meshes)
  var debrisGeo = null, debrisMats = null;
  function shedDebris(p, n, spread){
    var m = game.actorObject(p.role); if(!m || !game.scene) return;
    if(!debrisGeo){ debrisGeo = new THREE.BoxGeometry(1, 1, 1);
      debrisMats = [0x2a2d31, 0x8a929c, 0x1b2733].map(function(c){ return new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.6 }); }); }
    for(var i = 0; i < n && D.debris.length < TUN.debrisMax; i++){
      var d = new THREE.Mesh(debrisGeo, debrisMats[Math.floor(R() * debrisMats.length)]);
      d.scale.setScalar(0.1 + R() * 0.22);
      d.position.copy(m.position).add(new THREE.Vector3((R() - 0.5) * 1.6, 0.7 + R() * 0.5, (R() - 0.5) * 1.6));
      d.userData.vel = new THREE.Vector3((R() - 0.5) * spread * 2, 1.5 + R() * 2, (R() - 0.5) * spread * 2);
      d.userData.rot = new THREE.Vector3(R() * 6 - 3, R() * 6 - 3, R() * 6 - 3); d.userData.t = 0;
      game.scene.add(d); D.debris.push(d);
    }
  }
  function stepDebris(dt){
    for(var i = D.debris.length - 1; i >= 0; i--){ var d = D.debris[i], v = d.userData.vel; d.userData.t += dt;
      v.y -= 14 * dt; d.position.addScaledVector(v, dt);
      if(d.position.y < 0.08){ d.position.y = 0.08; v.y = Math.abs(v.y) * 0.35; v.x *= 0.6; v.z *= 0.6; d.userData.rot.multiplyScalar(0.5); }
      d.rotation.x += d.userData.rot.x * dt; d.rotation.y += d.userData.rot.y * dt; d.rotation.z += d.userData.rot.z * dt;
      if(d.userData.t > TUN.debrisLife){ var k = 1 - (d.userData.t - TUN.debrisLife) / 0.4;
        if(k <= 0){ game.scene.remove(d); D.debris.splice(i, 1); } else d.scale.setScalar(Math.max(0.01, 0.3 * k)); } }
  }

  // ---------------------------------------------------------- outcome picker
  function pickOutcome(p, comp){
    var w = TUN.outcomes[comp] || TUN.outcomes.driver, roll = R(), acc = 0, pick = 'veer';
    for(var k in w){ acc += w[k]; if(roll < acc){ pick = k; break; } }
    if(pick === 'rollover' && p.v < TUN.rollMinSpeed) pick = comp === 'tire' ? 'blowout' : 'veer';
    return pick;
  }
  function chainTarget(p){
    var best = null, bd = TUN.chainWindow;
    game.chase.list.forEach(function(q){ if(q === p || !game.chase.active(q)) return;
      var ds = q.s - p.s; if(ds > -2 && ds < bd){ bd = ds; best = q; } });
    return best;
  }

  // ---------------------------------------------------------- episodes
  function startEpisode(p, comp, forced){
    var out = forced || pickOutcome(p, comp);
    var ep = { p: p, kind: out, comp: comp, t: 0, dur: TUN.veerDur,
      dir: p.lat !== 0 ? Math.sign(p.lat) : (R() < 0.5 ? -1 : 1),
      target: null, chained: false, theta: 0, slam: 0, stage: 0, sparkT: 0, wheel: null, pullDir: 1, ember: null, rolls: 0, rest: 0 };
    if(out === 'veer'){ ep.target = chainTarget(p); if(ep.target) ep.dir = Math.sign(ep.target.lat - p.lat) || ep.dir; }
    if(out === 'blowout'){ ep.dur = TUN.blowoutDur; ep.target = chainTarget(p);
      var ws = rig(p).wheels.filter(function(w){ return w.front; });
      ep.wheel = ws.length ? ws[Math.floor(R() * ws.length)] : null;
      ep.pullDir = ep.wheel ? ep.wheel.side : ep.dir; shedDebris(p, 3, 1.2); }
    if(out === 'rollover'){ ep.rolls = R() < 0.65 ? 2 : 3; ep.rest = R() < 0.55 ? Math.PI : Math.PI / 2;
      ep.dur = ep.rolls * TUN.rollDurPer + 0.55; }
    if(out === 'fire') ep.dur = TUN.fireDur;
    D.episodes[p.role] = ep;
    game.log('destruction', { id: p.id, role: p.role, kind: out, comp: comp, v: +p.v.toFixed(1) });
    var g = D.gunmen[p.role];
    if(g && g.alive && (out === 'rollover' || out === 'fire')) killGunman(g, 'crash');   // he does not ride out a roll or a fire
    return ep;
  }
  function endEpisode(p, ep){
    delete D.episodes[p.role];
    if(ep.kind === 'rollover') D.rest[p.role] = { theta: ep.theta, wheel: null };
    if(ep.kind === 'blowout' && ep.wheel) D.rest[p.role] = { theta: 0, wheel: ep.wheel };
    var g = D.gunmen[p.role]; if(g && g.alive) retireGunman(g);
    game.chase.setState(p, 'wrecked');   // logs, scores T.score.wreck, waves.onPursuerOut — the stock path
  }
  // chain crash: this wreck reaches another active pursuer. A pursuing victim is put through the real
  // damage path (hitComponent with lethal component damage, so its own episode picks from that component);
  // a victim already down just stops the wreck dead.
  function tryChain(p, ep){
    if(ep.chained || !ep.target) return;
    var q = ep.target;
    if(!game.chase.active(q)){ ep.target = null; return; }
    if(Math.abs(p.s - q.s) > 5.2 || Math.abs(p.lat - q.lat) > 1.7) return;
    ep.chained = true;
    game.log('destruction', { id: p.id, role: p.role, kind: 'chain', to: q.id, toState: q.state });
    game.combat.shake = Math.min(1, game.combat.shake + 0.3);
    shedDebris(p, 6, 2.2); shedDebris(q, 4, 1.8);
    var m = game.actorObject(p.role); if(m) D.fx.push({ type: 'sparks', pos: m.position.clone().setY(0.5), n: 7 });
    if(q.state === 'pursuing'){ var comp = R() < 0.6 ? 'driver' : 'engine'; game.chase.hitComponent(q.role, comp, TUN.chainDamage[comp]); }
    else p.v = 0;
  }

  // ---- per-outcome motion. Each drives p.v / p.lat exactly where chase.step's stock branch would have;
  // ---- the crossing-gate clamp and ch.place(p) still run after us inside chase.step, untouched.
  function driveVeer(p, ep, dt, va){
    var want = ep.target && game.chase.active(ep.target) ? ep.target.lat : ep.dir * TUN.veerEdge;
    p.lat += HE.clamp(want - p.lat, -TUN.veerRate * dt, TUN.veerRate * dt);
    p.v = Math.max(0, p.v - (va * 0.6 + 2.6) * dt);
    tryChain(p, ep);
  }
  function driveBlowout(p, ep, dt, va){
    var k = ep.t / ep.dur;
    p.lat += ep.pullDir * (0.8 + 1.5 * k) * dt;                       // the pull worsens as the tire shreds
    var limp = k < 0.75 ? va * TUN.limpK : 0;                          // limps on the rim, then gives up
    p.v += HE.clamp(limp - p.v, -7 * dt, 3 * dt);
    ep.sparkT -= dt;
    if(ep.sparkT <= 0 && p.v > 2){ ep.sparkT = 0.09; var wp = wheelWorld(p, ep.wheel); if(wp) D.fx.push({ type: 'sparks', pos: wp, n: 2 }); }
    tryChain(p, ep);
  }
  function driveFire(p, ep, dt, va){                                   // stock engine-burn timings, kept
    p.v = Math.max(0, p.v - (va * 0.45 + 1.5) * dt);
    if(ep.t >= 0.8 && ep.stage === 0){ ep.stage = 1; game.log('burn', { id: p.id, stage: 'smoke' }); }
    if(ep.t >= 1.6 && ep.stage === 1){ ep.stage = 2; game.log('burn', { id: p.id, stage: 'fire' }); game.combat.shake = Math.min(1, game.combat.shake + 0.25); }
  }
  function driveRoll(p, ep, dt, va){
    var left = Math.max(0, 1 - ep.t / ep.dur);
    p.v = Math.max(0, p.v - (va * 0.35 + 2.2 + (1 - left) * 4) * dt);  // scrubs speed, harder as it settles
    p.lat += ep.dir * 0.85 * dt * left;                                // keeps travelling in the roll direction
  }

  // chase.step hook: returns true while an episode owns this crippled car (stock branch skipped).
  D.drive = function(p, dt){
    if(p.state.indexOf('crippled:') !== 0) return false;
    var ep = D.episodes[p.role];
    if(!ep) ep = startEpisode(p, p.state.slice(9));                    // 'crippled:tire'.slice(9) === 'tire'
    if(game.won){ p.v = 0; return true; }                              // the finale freeze still wins
    ep.t += dt; var va = game.rail.speed();
    if(ep.kind === 'veer') driveVeer(p, ep, dt, va);
    else if(ep.kind === 'blowout') driveBlowout(p, ep, dt, va);
    else if(ep.kind === 'fire') driveFire(p, ep, dt, va);
    else if(ep.kind === 'rollover') driveRoll(p, ep, dt, va);
    if(ep.t >= ep.dur) endEpisode(p, ep);
    return true;
  };
  D.owns = function(p){ return !!D.episodes[p.role] || !!D.rest[p.role]; };   // presentation: skip stock spin for these

  // ---------------------------------------------------------- window gunman
  // A figure parented to the car mesh (so it rides the car AND sits inside the car's hittable subtree —
  // combat.shoot raycasts game.hittables(), which includes every chase car). His shots go through the
  // same fairTick / fairFire / fireAtHero path as a pursuer's own fire, with his record standing in for
  // the shooter object the fairness contract expects ({fair, vis, visT} fields included).
  function makeFigure(p, side){
    var fig;
    if(window.A && A.person){ fig = A.person({ height: 1.75, top: 0x23262b, bottom: 0x1d1f24, hairStyle: 'short', gun: 'smg' }); }
    else { fig = new THREE.Group(); var dark = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.8 });
      var torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.24), dark); torso.position.y = 1.05; fig.add(torso);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc8957a, roughness: 0.6 })); head.position.y = 1.5; fig.add(head); }
    fig.name = 'gunman:' + p.id; return fig;
  }
  function spawnGunman(p){
    var r = rig(p), m = game.actorObject(p.role); if(!m) return;
    var g = { role: 'gunman:' + p.id, pursuer: p, hp: TUN.gunman.hp, alive: true, deployed: 0, fireT: 1 + R(),
      fair: false, vis: null, visT: 0, fairT: 0, side: 0, fig: null, deadT: 0 };
    g.fig = makeFigure(p); m.add(g.fig);
    g.fig.traverse(function(o){ if(o.isMesh) o.userData.hit = { role: g.role, gunman: true, live: function(){ return g.alive && g.deployed >= 1; } }; });
    if(game.greybox && game.greybox.actors) game.greybox.actors[g.role] = g.fig;   // lets main.js find his muzzle for the flash
    D.gunmen[p.role] = g;
    game.log('destruction', { id: p.id, role: g.role, kind: 'gunmanSpawn' });
    return g;
  }
  // which side faces the ambulance? try both window anchors in world space, keep the nearer to the rider
  function gunmanSide(p, g){
    var m = game.actorObject(p.role); if(!m) return 1;
    m.updateMatrixWorld(true); var r = rig(p), rp = game.rail.riderPos();
    var a = m.localToWorld(new THREE.Vector3(r.W / 2, 1.4, r.cabZ)), b = m.localToWorld(new THREE.Vector3(-r.W / 2, 1.4, r.cabZ));
    return a.distanceTo(rp) <= b.distanceTo(rp) ? 1 : -1;
  }
  function poseGunman(p, g, dt){
    if(!g.fig) return; var r = rig(p);
    if(!g.side) g.side = gunmanSide(p, g);
    if(!g.alive){ g.deadT += dt; g.fig.position.y -= dt * 0.35; if(g.deadT > 1.1) g.fig.visible = false; return; }
    var lean = g.deployed;   // 0 = still inside, 1 = fully out the window
    g.fig.position.set(g.side * (r.W / 2 - 0.38 + 0.5 * lean), r.base + r.H + r.cabH * 0.28, r.cabZ - 0.25);
    g.fig.rotation.set(0, g.side * 0.55, g.side * -0.16 * lean);
    if(window.A && A.pose) A.pose(g.fig, 'lean', game.time, { side: g.side });
  }
  function stepGunman(p, g, dt){
    if(!g.alive || p.state !== 'pursuing') return;
    if(g.deployed < 1){ g.deployed = Math.min(1, g.deployed + dt / TUN.gunman.leanTime); return; }   // still leaning out
    if(game.won) return;
    var m = game.actorObject(p.role); if(!m || !g.fig) return;
    var pos = g.fig.getWorldPosition(new THREE.Vector3());
    if(pos.distanceTo(game.camera.position) > TUN.gunman.range){ g.fair = false; return; }
    var K = TUN.gunman, F = T.fairness;
    if(F){ g.fair = game.combat.fairTick(g, pos, K.height, dt); if(F.seenOnly && !g.fair) return; }
    else g.fair = true;
    g.fireT -= dt; if(g.fireT > 0) return;
    g.fireT = K.fireEvery * (0.8 + 0.4 * R());
    var hit = R() < K.accuracy && g.fair !== false;
    if(hit && F) hit = game.combat.fairFire(g, pos, K.height);
    game.log('enemyFire', { role: g.role, hit: hit, via: 'gunman' });
    game.combat.fireAtHero(g.role, pos, hit, K.damage, g.vis);   // 'enemyShot' carries his vis: the audit sees him
  }
  function slumpGunman(g){ if(g.fig && window.A && A.pose) A.pose(g.fig, 'dead', 0); }
  function killGunman(g, by){ g.alive = false; game.log('kill', { role: g.role, kind: 'gunman', points: 0, by: by }); slumpGunman(g); }
  function retireGunman(g){ g.alive = false; if(g.fig) g.fig.visible = false; }
  // combat.shoot hook (see adapter): the player shot the gunman himself
  D.hitGunman = function(role, dmg){
    var g = null; for(var k in D.gunmen) if(D.gunmen[k].role === role) g = D.gunmen[k];
    if(!g || !g.alive) return;
    g.hp -= dmg; game.log('hit', { role: role, hp: Math.max(0, g.hp), via: 'gunman' });
    if(g.hp <= 0){ var pts = 0; if(T.score && T.score.kill){ pts = T.score.kill; game.combat.score += pts; }
      g.alive = false; game.log('kill', { role: role, kind: 'gunman', points: pts }); slumpGunman(g); }
  };

  // ---------------------------------------------------------- per-frame step (after chase.step)
  D.step = function(dt){
    game.chase.list.forEach(function(p){
      if(p.state === 'pursuing' && !p._gmRolled && p.t > 0.9){ p._gmRolled = true; if(R() < TUN.gunman.chance) spawnGunman(p); }
      var g = D.gunmen[p.role]; if(g) stepGunman(p, g, dt);
      var ep = D.episodes[p.role];
      if(ep && p.state.indexOf('crippled:') !== 0) delete D.episodes[p.role];   // trapped / removed mid-episode: drop it
    });
  };

  // ---------------------------------------------------------- post-place mesh work (presentation calls this)
  function poseRoll(p, ep){
    var m = game.actorObject(p.role); if(!m) return;
    var rollT = ep.dur - 0.55, ph = HE.clamp(ep.t / rollT, 0, 1);
    var ease = 1 - Math.pow(1 - ph, 2.1);                       // fast first roll, slower last — weight, not a metronome
    var th = ep.dir * (ep.rolls * Math.PI * 2 + ep.rest) * ease; ep.theta = th;
    var lift = 0.34 * Math.abs(Math.sin(th)) * (1 - ph * 0.5);  // centre height of a box rolling on its corners
    if(ph >= 1){ var st = ep.t - rollT; lift += 0.09 * Math.abs(Math.sin(st * 16)) * Math.max(0, 1 - st / 0.55); }   // settle bounce
    m.rotateZ(th); m.position.y += lift;                        // roll about the car's forward axis (local +z)
    var slam = Math.floor(Math.abs(th) / Math.PI);
    if(slam > ep.slam){ ep.slam = slam;
      if(ph < 1){ shedDebris(p, 3, 1.6); D.fx.push({ type: 'sparks', pos: m.position.clone().setY(0.4), n: 5 });
        game.combat.shake = Math.min(1, game.combat.shake + 0.1); game.log('destruction', { id: p.id, role: p.role, kind: 'slam', n: slam }); } }
  }
  function poseFire(p, ep){
    var m = game.actorObject(p.role); if(!m) return;
    m.userData.smoke = true;                                    // main.js present() puffs TX.smoke / TX.fire off these flags
    if(ep.stage >= 2) m.userData.fire = true;
    if(ep.stage >= 1){                                          // ember glow under the hood: a flickering additive
      if(!ep.ember){ var r = rig(p);                          // plane, NOT flame geometry — the house standard
        var mat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        ep.ember = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95), mat);
        ep.ember.position.set(0, r.base + 0.22, r.L / 2 - 0.7); ep.ember.rotation.x = -Math.PI / 2; m.add(ep.ember); }
      ep.ember.material.opacity = (ep.stage >= 2 ? 0.42 : 0.26) + Math.sin(game.time * 31 + p.s) * 0.1 + Math.sin(game.time * 47) * 0.05;
    }
  }
  function poseBlowout(p, ep){
    if(!ep.wheel) return;
    ep.wheel.g.scale.y = 0.55;                                  // flat: the wheel group squashes to the rim
    ep.wheel.g.position.y = 0.36 - 0.14;
    var m = game.actorObject(p.role);
    if(m && p.v > 1) m.rotateY(Math.sin(ep.t * 21) * 0.022);    // rim wobble skew while it still has speed
  }
  D.pose = function(dt){
    game.chase.list.forEach(function(p){
      var ep = D.episodes[p.role], rest = D.rest[p.role], m = game.actorObject(p.role);
      if(ep){ if(ep.kind === 'rollover') poseRoll(p, ep); else if(ep.kind === 'fire') poseFire(p, ep); else if(ep.kind === 'blowout') poseBlowout(p, ep);
        else if(ep.kind === 'veer' && m) m.rotateZ(ep.dir * -0.045); }   // body lean into the veer
      else if(rest && p.state === 'wrecked' && m){ if(rest.theta) m.rotateZ(rest.theta); if(rest.wheel){ rest.wheel.g.scale.y = 0.55; rest.wheel.g.position.y = 0.22; } }
      var g = D.gunmen[p.role]; if(g) poseGunman(p, g, dt);
    });
    stepDebris(dt);
  };
  D.drainFx = function(){ var f = D.fx; D.fx = []; return f; };   // one-shot sprite requests for main.js

  D.reset = function(){
    D.debris.forEach(function(d){ if(game.scene) game.scene.remove(d); });
    for(var k in D.gunmen) if(game.greybox && game.greybox.actors && game.greybox.actors[D.gunmen[k].role]) delete game.greybox.actors[D.gunmen[k].role];
    D.episodes = {}; D.rest = {}; D.gunmen = {}; D.rigs = {}; D.debris = []; D.fx = [];
  };
  D.debugList = function(){ var out = {}; for(var k in D.episodes) out[k] = D.episodes[k].kind; return out; };
  return D;
};

/* ================================================================================================
   ADAPTER — the exact hooks integration needs. Nothing above is live until these land; each is a
   one-line (or one-branch) change, left as TODOs here instead of editing the files from this stab.

   1) index.html — load order (this file needs HE + THREE + A; engine-only contexts need HE only):
        <script src="game/destruction.js"></script>     after game/art.js, before game/main.js
   2) engine/director.js line 73 (where game.chase is constructed):
        game.destruction = HE.Destruction ? HE.Destruction(game) : null;
      and in game.step, immediately after line 144 (if(m === 'AMBULANCE') game.chase.step(dt);):
        if(m === 'AMBULANCE' && game.destruction) game.destruction.step(dt);
      and wherever game.chase.reset() runs on a beat change:
        if(game.destruction) game.destruction.reset();
   3) engine/chase.js, in ch.step — insert as the FIRST else-if after the 'pursuing' branch, leaving
      the three stock crippled branches below it untouched as the fallback:
        else if(p.state.indexOf('crippled:') === 0 && game.destruction && game.destruction.drive(p, dt)){ }
   4) engine/combat.js, in c.shoot where hits are routed (after the h.info.component branch):
        else if(h.info.gunman && game.destruction) game.destruction.hitGunman(h.info.role, dmg);
   5) game/main.js, in present() after the chase-list loop (~line 240) — drains spark requests and runs
      the post-place mesh work; and inside that same loop, skip the stock userData.spin accumulation
      for cars destruction owns, or the yaw spin fights the roll:
        if(game.destruction){ game.destruction.drainFx().forEach(function(f){ if(f.type === 'sparks') sparks(f.pos, f.n || 4); }); game.destruction.pose(dt); }
        spin guard: (pz.state === 'crippled:driver' || ...) && !(game.destruction && game.destruction.owns(pz))
   ================================================================================================ */
})();
