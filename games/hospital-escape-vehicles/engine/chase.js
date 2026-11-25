/* Hospital Escape engine — chase: pursuer cars on the ambulance route (slot/gap spawning, close to attack distance,
   hold station and fire), component damage (tire -> veer, driver -> drift, engine -> burn), wreck/fall-out, and the
   train finale (crossingAt / trainAt / trainOccupies on the path; win with all three clauses; trapped state; no soft-lock).
   All kills are by gunfire: the ambulance never rams and never turns around. */
(function(){
'use strict';
var HE = window.HE, SLOT = { behind: 0, left: -2.6, right: 2.6 }, OUT = { tire: 'veer', driver: 'drift', engine: 'burn' };
HE.Chase = function(game){
  var T = game.data.tuning, ch = { list: [], train: null, gateS: null };
  ch.reset = function(){ ch.list.forEach(function(p){ game.greybox.removeActor(p.role); }); ch.list = []; if(ch.train) game.greybox.removeTrain(); ch.train = null; };
  ch.path = function(){ return game.rail.path; };
  ch.ambS = function(){ return game.rail.s; };
  ch.spawn = function(waveId, i, sp){ var K = T.pursuers[sp.kind], id = waveId + '_' + i, role = 'pursuer:' + id;
    var p = { id: id, role: role, wave: waveId, kind: sp.kind, slot: sp.slot, lat: SLOT[sp.slot] || 0, s: ch.ambS() - sp.gap, v: game.rail.speed(),
      hp: { tire: T.components.tire, driver: T.components.driver, engine: T.components.engine }, state: 'pursuing', t: 0, fireT: K.fireEvery * (0.7 + 0.5 * game.rng()), noGate: false };
    p.mesh = game.greybox.addCar(role, sp.kind);
    p.mesh.traverse(function(o){ if(o.userData.zone){ o.userData.hit = { role: role, component: o.userData.zone, live: function(){ return p.state === 'pursuing'; } }; } });
    ch.list.push(p); game.log('spawn', { role: role, kind: sp.kind, slot: sp.slot, wave: waveId }); ch.place(p); return p; };
  ch.byRole = function(role){ for(var i = 0; i < ch.list.length; i++) if(ch.list[i].role === role) return ch.list[i]; return null; };
  ch.setState = function(p, st, extra){ if(p.state === st) return; var from = p.state; p.state = st; p.t = 0;
    var d = { id: p.id, kind: p.kind, from: from, to: st }; if(extra) for(var k in extra) d[k] = extra[k];
    if(st === 'wrecked' && T.score){ game.combat.score += T.score.wreck; d.points = T.score.wreck; }
    game.log('pursuer', d); if(st === 'wrecked') game.waves.onPursuerOut(p); };
  ch.hitComponent = function(role, comp, dmg){ var p = ch.byRole(role); if(!p || p.state !== 'pursuing') return;
    p.hp[comp] = Math.max(0, p.hp[comp] - dmg); game.log('hit', { role: role, component: comp, hp: p.hp[comp] });
    if(p.hp[comp] <= 0) ch.setState(p, 'crippled:' + comp, { outcome: OUT[comp] }); };
  ch.active = function(p){ return p.state === 'pursuing' || p.state.indexOf('crippled') === 0; };
  ch.crossS = function(){ var d = ch.path() && ch.path().def; return d && d.crossingAt != null ? ch.path().sOf(d.crossingAt) : null; };
  ch.trainOccupying = function(){ return !!(ch.train && ch.train.state === 'occupying'); };
  ch.debugPlaceAfterCrossing = function(p){ p.noGate = true; p.s = ch.crossS() + 0.5; p.v = game.rail.speed(); };   // test hook: the data-error edge case
  ch.step = function(dt){ var amb = ch.ambS(), va = game.rail.speed(), cs = ch.crossS();
    ch.list.forEach(function(p){ var K = T.pursuers[p.kind]; p.t += dt; if(T.fairness){ var mo0 = game.actorObject(p.role); p.fair = p.state === 'pursuing' && mo0 ? game.combat.fairTick(p, mo0.position, 1.6, dt) : false; }
      if(p.state === 'pursuing'){ var att = K.attack + (p.slot === 'behind' ? 0 : 3), gap = amb - p.s, want = gap > att ? va + K.close : va + (gap - att) * 0.8; p.v += HE.clamp(want - p.v, -6 * dt, 6 * dt);
        if(game.won){ p.v = 0; }
        p.t > 1.2 && !game.won && !(T.fairness && T.fairness.seenOnly && !p.fair) && (p.fireT -= dt) <= 0 && gap < att + 6 && (p.fireT = K.fireEvery * (0.8 + 0.4 * game.rng()), (function(){ var hit = game.rng() < K.accuracy && p.fair !== false; var mo = game.actorObject(p.role); if(hit && T.fairness && mo) hit = game.combat.fairFire(p, mo.position, 1.6); game.log('enemyFire', { role: p.role, hit: hit }); game.combat.fireAtHero(p.role, mo ? mo.position.clone().add(new THREE.Vector3(0, -0.15, 0)) : new THREE.Vector3(), hit, K.damage, p.vis); })()); }
      else if(p.state.indexOf('crippled:') === 0 && game.destruction && game.destruction.drive(p, dt)){ }   // HE.Destruction owns the wreck (game/destruction.js); the stock branches below are the fallback
      else if(p.state === 'crippled:tire'){ p.v = Math.max(0, p.v - (va * 0.5 + 2) * dt); p.lat += (p.lat >= 0 ? 1 : -1) * 1.6 * dt; if(p.t >= 2.4) ch.setState(p, 'wrecked'); }
      else if(p.state === 'crippled:driver'){ p.v = Math.max(0, p.v - (va * 0.7 + 3) * dt); p.lat += Math.sin(p.t * 5) * 3 * dt; if(p.t >= 1.8) ch.setState(p, 'wrecked'); }
      else if(p.state === 'crippled:engine'){ if(p.t >= 0.8 && !p.smoke){ p.smoke = 1; game.log('burn', { id: p.id, stage: 'smoke' }); } if(p.t >= 1.6 && p.smoke === 1){ p.smoke = 2; game.log('burn', { id: p.id, stage: 'fire' }); game.combat.shake = Math.min(1, game.combat.shake + 0.25); }
        p.v = Math.max(0, p.v - (va * 0.45 + 1.5) * dt); if(p.t >= 2.6){ p.v = 0; ch.setState(p, 'wrecked'); } }
      else p.v = 0;                                                       // wrecked / trapped: 0 relative to the route
      // the crossing gate: once the train is coming, far-side cars stop short of the rails
      if(cs != null && ch.train && !p.noGate && p.farSide) p.s = Math.min(p.s + p.v * dt, cs - 6); else p.s += p.v * dt;
      ch.place(p); });
    ch.stepTrain(dt); };
  ch.place = function(p){ var path = ch.path(), pos = path.pointAtS(p.s), t = path.tangentAtS(p.s); t.y = 0; t.normalize();
    pos.add(new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(p.lat)); var m = game.actorObject(p.role); if(!m) return;
    m.position.copy(pos); m.lookAt(pos.x + t.x, pos.y, pos.z + t.z); m.visible = !(p.state === 'wrecked' && ch.ambS() - p.s > 150); };
  // ---- train finale ----
  ch.stepTrain = function(dt){ var d = ch.path().def; if(d.crossingAt == null) return; var at = game.rail.pathT(), cs = ch.crossS();
    if(!ch.train && at >= d.trainAt){ ch.train = { state: 'approach', t: 0 }; game.greybox.addTrain(cs, ch.path());
      ch.list.forEach(function(p){ p.farSide = p.s < cs - 1; }); game.log('train', { stage: 'spawn', at: +at.toFixed(4) }); }
    if(!ch.train) return; var tr = ch.train; tr.t += dt; game.greybox.placeTrain(tr.t);
    if(tr.state === 'approach' && tr.t >= T.trainApproach){ tr.state = 'occupying'; tr.t0 = tr.t; game.log('train', { stage: 'occupying' }); }
    // occupies for trainOccupies s at least, and stays until the win resolves (a pursuer past the crossing must be
    // wreckable WITH the win still able to fire: the finale must never soft-lock)
    if(tr.state === 'occupying' && tr.t - tr.t0 >= d.trainOccupies && game.won){ tr.state = 'gone'; game.log('train', { stage: 'gone' }); }
    if(!game.won && tr.state === 'occupying' && at > d.crossingAt && game.rail.s - 3 > cs){
      var act = ch.list.filter(ch.active), far = act.every(function(p){ return p.s < cs; });
      if(far){ act.forEach(function(p){ ch.setState(p, 'trapped'); }); game.win(); } } };
  ch.stateList = function(){ return ch.list.map(function(p){ return { id: p.id, kind: p.kind, state: p.state, hp: { tire: p.hp.tire, driver: p.hp.driver, engine: p.hp.engine } }; }); };
  return ch;
};
})();
