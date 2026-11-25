/* Hospital Escape engine — spec tests T1–T14 (+ extras). Classic script; tests.html runs it after the engine.
   Written BEFORE the systems. Deterministic: every game is created with a fixed seed and stepped at a fixed dt. */
setTimeout(function(){
'use strict';
var DT = 1/60, R = [];
function test(id, name, fn){ var r = { id:id, name:name, pass:false, detail:'' };
  try { var d = fn(); r.pass = d === true || (d && d.pass === true); r.detail = (d && d.detail) || (r.pass ? '' : String(d)); }
  catch(e){ r.pass = false; r.detail = 'threw: ' + (e && e.stack || e); }
  R.push(r); }
function run(g, secs, each){ var n = Math.round(secs / DT); for(var i = 0; i < n; i++){ if(each && each(g, i * DT) === false) break; g.step(DT); } }
function dist(a, b){ return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function evs(g, type){ return g.events().filter(function(e){ return e.type === type; }); }
// aim at a role's projected aim point and press/release fire (a real trigger pull through the input abstraction)
function shootAt(g, role){ var p = g.project(role); if(!p || !p.onScreen) return false; g.dbg.aim(p.x, p.y); g.dbg.fire(true); g.step(DT); g.dbg.fire(false); g.step(DT); return true; }
function clearLive(g, maxSecs){ var t = 0; while(g.state().enemiesAlive > 0 && t < maxSecs){ var tgt = g.liveEnemies()[0]; if(!tgt || !shootAt(g, tgt.role)) { g.step(DT); t += DT; } else t += 2 * DT; } return g.state().enemiesAlive === 0; }

// ---------- synthetic data (tests own their fixtures; the engine consumes ANY contract-shaped data) ----------
function fixture(over){
  var D = {
    lines: [{ id:'l1', speaker:'FRIEND', text:'Test line.', dur:0.5 }, { id:'l2', speaker:'HERO', text:'Quiet.', dur:0.5 }],
    paths: [
      { id:'p_curve', vehicle:'chair', points:[[0,0,0],[2,0,-6],[6,0,-10],[12,0,-12],[16,0,-18]], height:1.0, back:0.6, speed:1.2,
        look:[{ at:0, target:[2,1.2,-8] }], events:[{ at:1, type:'segmentEnd' }] },
      { id:'p_hold', vehicle:'chair', points:[[0,0,0],[0,0,-10],[0,0,-20]], height:1.0, back:0.6,
        speedKeys:[{ at:0, speed:1.0 }, { at:0.25, speed:0 }, { at:0.3, speed:1.6 }],
        look:[{ at:0, target:[0,1.2,-30] }], events:[{ at:0.1, type:'wave', wave:'w_hold' }, { at:1, type:'segmentEnd' }] },
      { id:'p_holdout', vehicle:'chair', points:[[0,0,0],[0,0,-1]], height:1.0, back:0.6, speedKeys:[{ at:0, speed:0 }],
        look:[{ at:0, target:[0,1.2,-12] }], events:[{ at:1, type:'segmentEnd' }] },
      { id:'p_amb', vehicle:'ambulance', points:[[0,0,0],[0,0,-100],[0,0,-200],[0,0,-300]], height:1.6, back:0, speed:14,
        crossingAt:0.5, trainAt:0.51, trainOccupies:20, events:[{ at:1, type:'segmentEnd' }] },
      { id:'p_foot', vehicle:'chair', points:[[0,0,0],[0,0,-8]], height:1.6, back:2.0, speed:0, events:[] } ],
    waves: [
      { id:'w_hold', trigger:{ type:'pathEvent' }, spawns:[{ kind:'gunman', at:[0,0,-12], count:3, stagger:0.8, behavior:'hold' }], onCleared:{ type:'resume' } },
      { id:'w_h1', trigger:{ type:'segmentStart' }, spawns:[{ kind:'gunman', at:[0,0,-9], count:2, stagger:0.5, behavior:'hold' }], onCleared:{ type:'line', line:'l1' } },
      { id:'w_h2', trigger:{ type:'afterWave', wave:'w_h1', delay:8.0 }, spawns:[{ kind:'staff', at:[1,0,-9], count:2, stagger:0.5, behavior:'rush' }], onCleared:{ type:'resume' } },
      { id:'w_one', trigger:{ type:'segmentStart' }, spawns:[{ kind:'gunman', at:[0,0,-8], count:1, stagger:0, behavior:'hold' }], onCleared:{ type:'resume' } } ],
    pursuers: [
      { id:'pz_a', trigger:{ type:'segmentStart' }, spawns:[{ kind:'patrol', slot:'behind', gap:14 }], onCleared:{ type:'line', line:'l1' } } ],
    beats: [], tuning: JSON.parse(JSON.stringify(HE.DATA.tuning)) };
  var b = function(id, segs){ return { id:id, segments:segs }; };
  D.beats = [ b('rail', [{ id:'rail_a', mode:'RAIL_CHAIR', path:'p_curve', waves:[], lines:[] }]),
              b('hold', [{ id:'hold_a', mode:'RAIL_CHAIR', path:'p_hold', waves:['w_hold'], lines:[] }]),
              b('hout', [{ id:'hout_a', mode:'HOLDOUT', path:'p_holdout', waves:['w_h1','w_h2'], lines:[] }]),
              b('one',  [{ id:'one_a', mode:'HOLDOUT', path:'p_holdout', waves:['w_one'], lines:[] }]),
              b('amb',  [{ id:'amb_a', mode:'AMBULANCE', path:'p_amb', waves:['pz_a'], lines:['l2'] }]) ];
  if(over) over(D); return D;
}

// T1 — rail fidelity
test('T1', 'Rail fidelity: rider + camera on the spline at 100 pathT samples; camera height = path height ± 0.05 m', function(){
  var g = HE.createGame({ data: fixture(), seed: 1 }); g.gotoBeat('rail');
  var P = g.rail.path, worst = 0, worstH = 0;
  for(var i = 0; i < 100; i++){ g.rail.setPathT(i / 100); g.step(0);
    var rider = g.rail.riderPos(), cam = g.camera.position, floor = new THREE.Vector3(cam.x, cam.y - P.height, cam.z);
    worst = Math.max(worst, P.distanceToSpline(rider), P.distanceToSpline(floor));
    worstH = Math.max(worstH, Math.abs((cam.y - P.floorYAt(P.atOfPoint(floor))) - P.height)); }
  return { pass: worst <= 0.05 && worstH <= 0.05, detail: 'max off-spline ' + worst.toFixed(4) + ' m, max height error ' + worstH.toFixed(4) + ' m' };
});
// T2 — no steering on rails
test('T2', 'No steering on rails: 5 s of move/aim injection changes neither the path nor pathT progression; monotonic', function(){
  var a = HE.createGame({ data: fixture(), seed: 1 }), b = HE.createGame({ data: fixture(), seed: 1 });
  a.gotoBeat('rail'); b.gotoBeat('rail'); var pts0 = JSON.stringify(a.rail.path.points), mono = true, maxDiff = 0, last = -1;
  run(a, 5, function(g, t){ var pa = g.state().pathT, pb = b.state().pathT; if(pa < last) mono = false; last = pa; maxDiff = Math.max(maxDiff, Math.abs(pa - pb));
    g.input.move.x = Math.sin(t * 7); g.input.move.y = Math.cos(t * 5); g.dbg.aim(0.5 + 0.4 * Math.sin(t * 3), 0.5); b.step(DT); });
  var same = JSON.stringify(a.rail.path.points) === pts0;
  return { pass: same && mono && maxDiff < 1e-9 && a.state().pathT > 0.05, detail: 'path unchanged ' + same + ', monotonic ' + mono + ', |ΔpathT| vs no-input run ' + maxDiff.toExponential(1) + ', pathT ' + a.state().pathT.toFixed(3) };
});
// T3 — pusher lockstep
test('T3', 'Pusher lockstep: 0.55 m ± 0.1 m across speed changes and a ≥3 s zero-speed hold', function(){
  var g = HE.createGame({ data: fixture(function(D){ D.waves[0].spawns[0].count = 1; }), seed: 1 }); g.gotoBeat('hold');
  var lo = 9, hi = 0, held = 0, speeds = {};
  run(g, 25, function(g){ if(g.state().segment !== 'hold_a') return false; var d = dist(g.rail.riderPos(), g.actorPos('friend')); lo = Math.min(lo, d); hi = Math.max(hi, d);
    var s = g.rail.speed(); speeds[s.toFixed(1)] = 1; if(s === 0) held += DT; if(held >= 3.2 && g.state().enemiesAlive > 0){ var e = g.liveEnemies()[0]; shootAt(g, e.role); } });
  return { pass: lo >= 0.45 && hi <= 0.65 && held >= 3 && Object.keys(speeds).length >= 3, detail: 'pusher distance ' + lo.toFixed(3) + '–' + hi.toFixed(3) + ' m, held ' + held.toFixed(2) + ' s, speeds seen ' + Object.keys(speeds).join('/') };
});
// T4 — rotation order on the shipped greybox data, full run by the autopilot
test('T4', 'Rotation order: full greybox run visits chair → free → holdout → ambulance; every transition logged; no switch verb', function(){
  var g = HE.createGame({ seed: 7 }); g.gotoBeat('visit'); var t = 0;
  while(!g.state().ended && !g.state().lost && t < 900){ HE.autopilot(g); g.step(DT); t += DT; }
  var modes = evs(g, 'mode').map(function(e){ return e.data.mode; }), order = [];
  modes.forEach(function(m){ if(m !== 'CUTSCENE' && order[order.length - 1] !== m && order.indexOf(m) < 0) order.push(m); });
  var beats = evs(g, 'beat').map(function(e){ return e.data.beat; });
  var keys = Object.keys(g.dbg).concat(Object.keys(g.input)).concat(Object.keys(g.state())), sw = keys.filter(function(k){ return /switch|swap|character|select/i.test(k); });
  var segCount = HE.DATA.beats.reduce(function(n, b){ return n + b.segments.length; }, 0), segEv = evs(g, 'segment').length;
  var ok = order.join('>') === 'RAIL_CHAIR>FREE_FOOT>HOLDOUT>AMBULANCE' && beats.join(',') === HE.BEAT_IDS.join(',') && segEv === segCount && sw.length === 0 && g.state().won && !g.state().lost;
  return { pass: ok, detail: 'mode order ' + order.join('>') + '; beats ' + beats.length + '/9; segment events ' + segEv + '/' + segCount + '; won ' + g.state().won + ', lost ' + g.state().lost + ', ' + t.toFixed(0) + ' s sim; switch-like keys: [' + sw.join(',') + ']' };
});
// T5 — aim/fire through __dbg
test('T5', 'Aim/fire through __dbg: hit within 3 shots at the projected position; dies after data HP in hits', function(){
  var g = HE.createGame({ data: fixture(), seed: 3 }); g.gotoBeat('one'); run(g, 0.5);
  var e = g.liveEnemies()[0], need = Math.ceil(HE.DATA.tuning.enemies.gunman.hp / HE.DATA.tuning.weapons.pistol.damage), shots = 0, firstHit = -1;
  while(g.liveEnemies().length && shots < 20){ shootAt(g, e.role); run(g, 0.2); shots = evs(g, 'shot').length; if(firstHit < 0 && evs(g, 'hit').length) firstHit = shots; }
  var dead = evs(g, 'kill').some(function(k){ return k.data.role === e.role; }), hits = evs(g, 'hit').filter(function(h){ return h.data.role === e.role; }).length;
  return { pass: firstHit > 0 && firstHit <= 3 && dead && hits === need, detail: 'first hit on shot ' + firstHit + ', killed after ' + hits + ' hits / ' + shots + ' shots (data HP/damage: ' + need + ')' };
});
// T6 — component resolution
test('T6', 'Component resolution: tire / driver / engine zones deplete only that HP → contract outcome → wrecked', function(){
  var out = [], ok = true;
  [['tire','veer'],['driver','drift'],['engine','burn']].forEach(function(c){
    var g = HE.createGame({ data: fixture(), seed: 5 }); g.gotoBeat('amb'); run(g, 3);
    var p = g.state().pursuers[0], before = JSON.stringify(p.hp), n = 0;
    while(g.state().pursuers[0].state === 'pursuing' && n < 40){ var pr = g.project('pursuer:' + p.id, c[0]); if(pr && pr.onScreen){ g.dbg.aim(pr.x, pr.y); g.dbg.fire(true); g.step(DT); g.dbg.fire(false); } g.step(DT); n++; }
    var q = g.state().pursuers[0], others = Object.keys(q.hp).filter(function(k){ return k !== c[0] && q.hp[k] !== JSON.parse(before)[k]; });
    var crip = q.state === 'crippled:' + c[0], outcome = evs(g, 'pursuer').some(function(e){ return e.data.outcome === c[1]; });
    run(g, 6); var wrecked = g.state().pursuers[0].state === 'wrecked';
    if(!(crip && outcome && wrecked && others.length === 0 && q.hp[c[0]] <= 0)) ok = false;
    out.push(c[0] + ': ' + (crip ? 'crippled:' + c[0] : q.state) + '/' + (outcome ? c[1] : 'no-outcome') + '/' + (wrecked ? 'wrecked' : 'NOT wrecked') + ' other HP touched [' + others + ']'); });
  return { pass: ok, detail: out.join('; ') };
});
// T7 — wave director
test('T7', 'Wave director: exact count, stagger ± 0.1 s, onCleared only at enemiesAlive 0, hold released within 0.5 s', function(){
  var g = HE.createGame({ data: fixture(), seed: 2 }); g.gotoBeat('hold');
  run(g, 8); var sp = evs(g, 'spawn').filter(function(e){ return e.data.wave === 'w_hold'; });
  var gaps = sp.slice(1).map(function(e, i){ return e.t - sp[i].t; }), stagOk = gaps.every(function(x){ return Math.abs(x - 0.8) <= 0.1; });
  var held = g.rail.speed() === 0, alive0 = g.state().enemiesAlive, clearedEarly = evs(g, 'waveClear').length > 0;
  var tClear = -1, tRelease = -1, t = 0;
  while(t < 20 && tRelease < 0){ var e = g.liveEnemies()[0]; if(e) shootAt(g, e.role); else g.step(DT); t += DT;
    if(tClear < 0 && evs(g, 'waveClear').length) tClear = g.time; if(tClear >= 0 && g.rail.speed() > 0) tRelease = g.time; }
  return { pass: sp.length === 3 && stagOk && held && alive0 === 3 && !clearedEarly && tClear > 0 && tRelease - tClear <= 0.5,
    detail: 'spawned ' + sp.length + '/3, stagger gaps ' + gaps.map(function(x){ return x.toFixed(2); }).join(',') + ' s, held ' + held + ' with ' + alive0 + ' alive, cleared early ' + clearedEarly + ', release ' + (tRelease - tClear).toFixed(3) + ' s after clear' };
});
// T8 — holdout
test('T8', 'Holdout: camera static ± 0.01 m over ≥10 s while two waves arrive and are cleared', function(){
  var g = HE.createGame({ data: fixture(), seed: 4 }); g.gotoBeat('hout'); g.step(DT); var c0 = g.camera.position.clone(), drift = 0, t = 0;
  while(t < 30 && g.state().segment === 'hout_a'){ var e = g.liveEnemies()[0]; if(e && t > 1.2){ shootAt(g, e.role); t += DT; } else g.step(DT); t += DT; if(g.state().segment === 'hout_a') drift = Math.max(drift, g.camera.position.distanceTo(c0)); }
  var cl = evs(g, 'waveClear').map(function(e){ return e.data.wave; });
  return { pass: drift <= 0.01 && cl.indexOf('w_h1') >= 0 && cl.indexOf('w_h2') >= 0 && t >= 10, detail: 'camera drift ' + drift.toFixed(4) + ' m over ' + t.toFixed(1) + ' s in HOLDOUT; waves cleared [' + cl + ']' };
});
// T9 — chase escalation on the shipped beat-8 data
function chaseCheck(data){ var g = HE.createGame({ data: data, seed: 9 }); g.gotoBeat('chase'); var t = 0, seenBefore = {}, seenAfter = {}, esc = false, wrecks = {}, bad = [];
  var escW = data.pursuers.filter(function(p){ return p.spawns.some(function(s){ return s.kind === 'suv'; }); })[0].id;
  while(t < 240 && g.state().beat === 'chase'){ HE.autopilot(g); g.step(DT); t += DT;
    if(evs(g, 'waveSpawn').some(function(e){ return e.data.wave === escW; })) esc = true;
    g.pursuerList().forEach(function(p){ (esc ? seenAfter : seenBefore)[p.kind + (p.spawnedAfterEsc === undefined ? '' : '')] = 1;
      if(p.state === 'wrecked'){ var w = wrecks[p.id]; if(!w) wrecks[p.id] = { s: p.s, t: t }; else { if(p.s - w.s > 0.01) bad.push(p.id + ' moved'); } } }); }
  var spawned = evs(g, 'spawn').filter(function(e){ return e.data.role.indexOf('pursuer:') === 0; }), firstSuv = spawned.findIndex(function(e){ return e.data.kind === 'suv'; });
  var markedOnlyBefore = firstSuv > 0 && spawned.slice(0, firstSuv).every(function(e){ return e.data.kind === 'patrol' || e.data.kind === 'charger'; });
  var suvOnlyAfter = spawned.slice(firstSuv).every(function(e){ return e.data.kind === 'suv'; });
  var reenter = {}; spawned.forEach(function(e){ reenter[e.data.role] = (reenter[e.data.role] || 0) + 1; }); var dup = Object.keys(reenter).filter(function(k){ return reenter[k] > 1; });
  return { pass: markedOnlyBefore && suvOnlyAfter && Object.keys(wrecks).length >= 3 && bad.length === 0 && dup.length === 0,
    detail: 'spawn kinds in order: ' + spawned.map(function(e){ return e.data.kind; }).join(',') + '; wrecked ' + Object.keys(wrecks).length + ', moved-after-wreck [' + bad + '], re-entered [' + dup + ']' };
}
test('T9', 'Chase escalation: marked kinds before the escalation trigger, only suv after; wrecked pursuers stop and never re-enter', function(){ return chaseCheck(HE.DATA); });
// T10 — train finale win
test('T10', 'Train finale win: crossed + train occupies + all pursuers far side → all trapped, won, no further spawns', function(){
  var g = HE.createGame({ data: fixture(function(D){ D.pursuers[0].spawns = [{ kind:'suv', slot:'behind', gap:14 }, { kind:'patrol', slot:'left', gap:18 }]; }), seed: 6 }); g.gotoBeat('amb');
  run(g, 30, function(g){ return !g.state().won; }); var s = g.state(), nSpawn = evs(g, 'spawn').length;
  run(g, 5); var after = evs(g, 'spawn').length;
  return { pass: s.won && s.pursuers.length === 2 && s.pursuers.every(function(p){ return p.state === 'trapped'; }) && after === nSpawn && evs(g, 'win').length === 1,
    detail: 'won ' + s.won + ' at pathT ' + s.pathT.toFixed(3) + ', pursuers ' + s.pursuers.map(function(p){ return p.id + ':' + p.state; }).join(',') + ', spawns after win ' + (after - nSpawn) };
});
// T11 — no soft-lock
test('T11', 'Train finale no soft-lock: pursuer past the crossing keeps pursuing, win waits for it to be wrecked', function(){
  var g = HE.createGame({ data: fixture(function(D){ D.pursuers[0].spawns = [{ kind:'patrol', slot:'behind', gap:14 }, { kind:'patrol', slot:'right', gap:14 }]; }), seed: 8 }); g.gotoBeat('amb');
  run(g, 20, function(g){ return g.state().pathT < 0.503; }); var ahead = g.pursuerList()[1]; g.chase.debugPlaceAfterCrossing(ahead);   // edge case: one pursuer already beyond the crossing when the train comes
  run(g, 14); var s1 = g.state(), p1 = s1.pursuers.filter(function(p){ return p.id === ahead.id; })[0];
  var noWin = !s1.won && p1.state === 'pursuing' && g.chase.trainOccupying();
  var n = 0; while(!g.state().won && n < 200){ var pr = g.project('pursuer:' + ahead.id, 'driver'); if(pr && pr.onScreen){ g.dbg.aim(pr.x, pr.y); g.dbg.fire(true); } g.step(DT); g.dbg.fire(false); g.step(DT); n++; }
  var s2 = g.state();
  return { pass: noWin && s2.won && s2.pursuers.filter(function(p){ return p.id === ahead.id; })[0].state === 'wrecked',
    detail: 'at train time: won ' + s1.won + ', ahead pursuer ' + p1.state + ', train occupying ' + g.chase.trainOccupying() + '; after wrecking it: won ' + s2.won + ', states ' + s2.pursuers.map(function(p){ return p.state; }).join(',') };
});
// T12 — damage feedback
test('T12', 'Damage feedback: damage(50) raises vignette within one frame; <30 → nearDeath + wash > 0; health 100 after reset → wash 0', function(){
  var g = HE.createGame({ data: fixture(), seed: 1 }); g.gotoBeat('rail'); g.step(DT); var v0 = g.state().feedback.vignette;
  g.dbg.damage(50); g.step(DT); var v1 = g.state().feedback.vignette; g.dbg.damage(25); g.step(DT); var s = g.state();
  g.gotoBeat('rail'); g.step(DT); var r = g.state();
  return { pass: v1 > v0 && s.nearDeath && s.feedback.wash > 0 && r.health === 100 && r.feedback.wash === 0 && !r.nearDeath,
    detail: 'vignette ' + v0.toFixed(3) + ' → ' + v1.toFixed(3) + '; at health ' + s.health + ' nearDeath ' + s.nearDeath + ' wash ' + s.feedback.wash.toFixed(3) + '; after reset health ' + r.health + ' wash ' + r.feedback.wash };
});
// T13 — beat jumpability on shipped data
test('T13', 'Beat jumpability: gotoBeat for all 9 ids from any state lands in the first segment/mode; unknown id → false; never throws', function(){
  var g = HE.createGame({ seed: 1 }), bad = [], expect = { visit:'CUTSCENE', bed_push:'RAIL_CHAIR', transfer:'CUTSCENE', elevator:'RAIL_CHAIR', gauntlet:'RAIL_CHAIR', entrance:'HOLDOUT', steal:'CUTSCENE', chase:'AMBULANCE', train_finale:'AMBULANCE' };
  HE.BEAT_IDS.forEach(function(a){ HE.BEAT_IDS.forEach(function(b){ g.gotoBeat(a); run(g, 0.3); g.dbg.damage(10); var ok = g.dbg.gotoBeat(b), s = g.state();
    var seg0 = HE.DATA.beats.filter(function(x){ return x.id === b; })[0].segments[0].id;
    if(!ok || s.beat !== b || s.segment !== seg0 || s.mode !== expect[b]) bad.push(a + '→' + b + ':' + s.mode); }); });
  var unk = g.dbg.gotoBeat('nope');
  return { pass: bad.length === 0 && unk === false, detail: '81 jumps, failures [' + bad.join(' ') + '], unknown id → ' + unk };
});
// T14 — data validity (the same validator node runs)
test('T14', 'Data validity: shipped greybox data passes the contract validator (shapes + references)', function(){
  var r = HE.validateData(HE.DATA);
  return { pass: r.errors.length === 0 && r.checked > 50, detail: r.checked + ' objects checked, ' + r.errors.length + ' errors' + (r.errors.length ? ': ' + r.errors.slice(0, 5).join(' | ') : '') };
});
// extras (beyond the floor)
test('X1', 'Lose: health ≤ 0 in any mode sets lost, logs lose, and stops the sim; gotoBeat recovers', function(){
  var g = HE.createGame({ data: fixture(), seed: 1 }); g.gotoBeat('amb'); run(g, 0.5); g.dbg.damage(150); g.step(DT); var s = g.state(), t0 = g.time; run(g, 1); var frozen = g.time === t0;
  g.dbg.gotoBeat('rail'); g.step(DT); var r = g.state();
  return { pass: s.lost && s.health <= 0 && evs(g, 'lose').length === 1 && frozen && !r.lost && r.health === 100, detail: 'lost ' + s.lost + ', sim frozen ' + frozen + ', recovered ' + !r.lost };
});
test('X2', 'Mag/reload rhythm: pistol mag 12, empty → reload 1.2 s → full; machine pistol mag 30 after the beat-5 pickup', function(){
  var g = HE.createGame({ data: fixture(), seed: 1 }); g.gotoBeat('rail'); var a0 = g.state().ammo; for(var i = 0; i < 12; i++){ g.dbg.fire(true); g.step(DT); g.dbg.fire(false); run(g, 0.2); }
  var empty = g.state().ammo.mag; g.dbg.reload(); run(g, 0.85); var mid = g.state().ammo.mag; run(g, 0.2); var full = g.state().ammo.mag;
  var h = HE.createGame({ seed: 1 }); h.gotoBeat('gauntlet'); var t = 0; while(h.state().ammo.weapon !== 'machine_pistol' && t < 200 && h.state().beat === 'gauntlet'){ HE.autopilot(h); h.step(DT); t += DT; }
  var mp = h.state().ammo;
  return { pass: a0.weapon === 'pistol' && a0.mag === 12 && empty === 0 && mid === 0 && full === 12 && mp.weapon === 'machine_pistol' && mp.mag === 30 && a0.reserve === Infinity,
    detail: 'pistol ' + a0.mag + ' → ' + empty + ' → (+1.07 s since empty) ' + mid + ' → (+1.27 s) ' + full + '; gauntlet pickup → ' + mp.weapon + ' ' + mp.mag + ', reserve ' + a0.reserve };
});
test('X3', 'Determinism: same seed + same inputs → identical event log', function(){
  var a = HE.createGame({ seed: 11 }), b = HE.createGame({ seed: 11 }); a.gotoBeat('gauntlet'); b.gotoBeat('gauntlet');
  for(var i = 0; i < 60 * 40; i++){ HE.autopilot(a); HE.autopilot(b); a.step(DT); b.step(DT); }
  var A = JSON.stringify(a.events()), B = JSON.stringify(b.events());
  return { pass: A === B && a.events().length > 20, detail: a.events().length + ' events, identical ' + (A === B) };
});

// ---------- negative controls: the same checks must FAIL on deliberately broken data / behaviour ----------
function clone(o){ return JSON.parse(JSON.stringify(o)); }
test('C1', 'Control — validator rejects 10 deliberate contract violations (each mutation alone must produce ≥ 1 error)', function(){
  var M = [ ['unknown wave ref', function(D){ D.beats[1].segments[0].waves.push('nope'); }], ['bad mode', function(D){ D.beats[1].segments[0].mode = 'SWITCH'; }],
    ['suv before marked', function(D){ D.pursuers[0].spawns[0].kind = 'suv'; }], ['crossing fields split', function(D){ delete D.paths.filter(function(p){ return p.crossingAt != null; })[0].trainAt; }],
    ['bad speaker', function(D){ D.lines[0].speaker = 'Narrator'; }], ['pathEvent wave without event', function(D){ D.paths.forEach(function(p){ p.events = (p.events || []).filter(function(e){ return e.wave !== 'bed_w1'; }); }); }],
    ['beat order', function(D){ var t = D.beats[3]; D.beats[3] = D.beats[4]; D.beats[4] = t; }], ['pursuer in a rail segment', function(D){ D.beats[1].segments[0].waves.push('chase_w1'); }],
    ['negative gap', function(D){ D.pursuers[0].spawns[0].gap = -5; }], ['first-mode mismatch', function(D){ D.beats[5].segments[0].mode = 'RAIL_CHAIR'; }] ];
  var caught = M.map(function(m){ var D = clone(HE.DATA); m[1](D); return [m[0], HE.validateData(D).errors.length]; });
  return { pass: caught.every(function(c){ return c[1] > 0; }), detail: caught.map(function(c){ return c[0] + ':' + c[1]; }).join(', ') };
});
test('C2', 'Control — the T9 chase check fails when beat 8 sends an SUV first', function(){
  var D = clone(HE.DATA); D.pursuers[0].spawns[0].kind = 'suv'; var r = chaseCheck(D);
  return { pass: r.pass === false, detail: 'mutated run: ' + r.detail };
});
test('C3', 'Control — shooting a pursuer\'s body (no component zone) depletes no HP and cripples nothing', function(){
  var g = HE.createGame({ data: fixture(), seed: 5 }); g.gotoBeat('amb'); run(g, 3); var p = g.pursuerList()[0], m = g.actorObject(p.role), body = m.children[0], v = new THREE.Vector3();
  for(var i = 0; i < 20; i++){ g.scene.updateMatrixWorld(); body.getWorldPosition(v); v.y -= 0.15; v.project(g.camera); g.dbg.aim((v.x + 1) / 2, (1 - v.y) / 2); g.dbg.fire(true); g.step(DT); g.dbg.fire(false); run(g, 0.15); }
  var q = g.state().pursuers[0], shots = evs(g, 'shot').length;
  return { pass: q.state === 'pursuing' && q.hp.tire === 30 && q.hp.driver === 40 && q.hp.engine === 60 && shots >= 10, detail: shots + ' body shots → state ' + q.state + ', hp ' + JSON.stringify(q.hp) };
});
test('C4', 'Control — no win before the train: crossing passed with no train yet (trainAt late) → won stays false', function(){
  var g = HE.createGame({ data: fixture(function(D){ D.paths[3].trainAt = 0.97; }), seed: 6 }); g.gotoBeat('amb'); run(g, 30, function(g){ return g.state().pathT < 0.9; });
  return { pass: !g.state().won && !g.chase.trainOccupying() && g.state().pathT >= 0.9, detail: 'pathT ' + g.state().pathT.toFixed(3) + ', won ' + g.state().won + ', train ' + g.chase.trainOccupying() };
});
test('C5', 'Control — no damage → vignette stays at idle and wash 0 for 5 s (feedback is not spuriously high)', function(){
  var g = HE.createGame({ data: fixture(), seed: 1 }); g.gotoBeat('rail'); g.step(DT); var v0 = g.state().feedback.vignette, mx = 0, w = 0;
  run(g, 5, function(g){ var f = g.state().feedback; mx = Math.max(mx, f.vignette); w = Math.max(w, f.wash); });
  return { pass: Math.abs(mx - v0) < 1e-9 && w === 0, detail: 'idle vignette ' + v0.toFixed(3) + ', max over 5 s ' + mx.toFixed(3) + ', max wash ' + w };
});
test('C6', 'Control — a hold is NOT released while its wave is alive (10 s, no shooting)', function(){
  var g = HE.createGame({ data: fixture(), seed: 2 }); g.gotoBeat('hold'); run(g, 6); var at0 = g.state().pathT; run(g, 10); var s = g.state();
  return { pass: s.pathT === at0 && s.enemiesAlive === 3 && g.rail.speed() === 0 && evs(g, 'release').length === 0, detail: 'pathT ' + at0.toFixed(4) + ' → ' + s.pathT.toFixed(4) + ', alive ' + s.enemiesAlive + ', releases ' + evs(g, 'release').length };
});
test('C7', 'Control — gotoSegment with a bad index and gotoBeat with an empty id both return false', function(){
  var g = HE.createGame({ seed: 1 }); return { pass: g.dbg.gotoSegment('gauntlet', 99) === false && g.dbg.gotoBeat('') === false && g.dbg.gotoSegment('gauntlet', 2) === true && g.state().mode === 'FREE_FOOT', detail: 'gotoSegment(gauntlet,2) → ' + g.state().mode };
});

var passed = R.filter(function(r){ return r.pass; }).length;
window.__testResults = { passed: passed, failed: R.length - passed, list: R };
if(typeof document !== 'undefined' && document.getElementById('results')){
  var h = '<tr><th>ID</th><th>Test</th><th>Result</th><th>Detail</th></tr>';
  R.forEach(function(r){ h += '<tr class="' + (r.pass ? 'ok' : 'bad') + '"><td>' + r.id + '</td><td>' + r.name + '</td><td>' + (r.pass ? 'PASS' : 'FAIL') + '</td><td>' + String(r.detail).replace(/</g, '&lt;') + '</td></tr>'; });
  document.getElementById('results').innerHTML = h;
  document.getElementById('summary').textContent = passed + ' passed, ' + (R.length - passed) + ' failed of ' + R.length;
}
}, 0);
