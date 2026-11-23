/* Hospital Escape engine — director: the game object, the beat -> segment -> mode rotation state machine, the wave
   director, dialogue/subtitles, the transition log, window.__dbg (he-dbg-1) and a scripted autopilot (tests + demo).
   Mode changes happen ONLY at segment boundaries / inside CUTSCENE segments. There is no switch verb anywhere. */
(function(){
'use strict';
var HE = window.HE, RAIL_MODES = { RAIL_CHAIR: 1, HOLDOUT: 1, AMBULANCE: 1 };

HE.Waves = function(game){
  var W = { list: [] };
  W.init = function(seg){ W.list = (seg.waves || []).map(function(id){ var p = game.pursuerDef(id), d = p || game.waveDef(id);
    return { id: id, def: d, pursuer: !!p, status: 'pending', queue: [], alive: 0, clearedAt: -1, startedAt: -1 }; }); };
  W.get = function(id){ for(var i = 0; i < W.list.length; i++) if(W.list[i].id === id) return W.list[i]; return null; };
  W.trigger = function(id){ var w = W.get(id); if(!w || w.status !== 'pending') return; if(w.pursuer && game.won) return;
    w.status = 'spawning'; w.startedAt = game.time; var t0 = game.time;
    w.def.spawns.forEach(function(sp, si){ var n = sp.count || 1;
      for(var k = 0; k < n; k++) w.queue.push({ t: t0 + k * (sp.stagger || 0), sp: sp, k: k, si: si }); });
    w.queue.sort(function(a, b){ return a.t - b.t; }); game.log('waveSpawn', { wave: id, count: w.queue.length }); };
  W.step = function(){ var segT = game.segT;
    W.list.forEach(function(w){ if(w.status !== 'pending') return; var tr = w.def.trigger;
      if(tr.type === 'segmentStart') W.trigger(w.id);
      else if(tr.type === 'timer' && segT >= tr.delay - 1e-9) W.trigger(w.id);
      else if(tr.type === 'afterWave'){ var o = W.get(tr.wave); if(o && o.status === 'cleared' && game.time >= o.clearedAt + (tr.delay || 0) - 1e-9) W.trigger(w.id); } });
    W.list.forEach(function(w){
      while(w.queue.length && w.queue[0].t <= game.time + 1e-9){ var q = w.queue.shift(), sp = q.sp, i = w.spawned = (w.spawned || 0); w.spawned++;
        if(w.pursuer){ if(game.won) continue; game.chase.spawn(w.id, i, sp); }
        else { var c = sp.count || 1, off = (q.k - (c - 1) / 2) * 1.1; game.combat.spawnEnemy(w.id, i, sp, new THREE.Vector3(sp.at[0] + off, sp.at[1], sp.at[2])); }
        w.alive++; }
      if(w.status === 'spawning' && !w.queue.length) w.status = 'active';
      if(w.status === 'active' && w.alive <= 0) W.clear(w); }); };
  W.clear = function(w){ w.status = 'cleared'; w.clearedAt = game.time; game.log('waveClear', { wave: w.id }); var a = w.def.onCleared; if(!a) return;
    if(a.type === 'resume') game.resume(w.id); else if(a.type === 'line') game.playLine(a.line); else if(a.type === 'wave') W.trigger(a.wave); };
  W.onEnemyDead = function(e){ var w = W.get(e.wave); if(w) w.alive--; };
  W.onPursuerOut = function(p){ var w = W.get(p.wave); if(w && !p.counted){ p.counted = true; w.alive--; } };
  W.allCleared = function(){ return W.list.every(function(w){ return w.status === 'cleared'; }); };
  W.busy = function(){ return W.list.some(function(w){ return w.status === 'spawning' || w.status === 'active' || (w.status === 'pending' && w.def.trigger.type !== 'pathEvent'); }); };
  return W;
};

HE.createGame = function(opts){
  opts = opts || {}; var data = opts.data || HE.DATA;
  var game = { data: data, seed: opts.seed || 1, time: 0, segT: 0, won: false, lost: false, ended: false, mode: null, beat: null, segment: null, vehicle: null,
    input: HE.makeInput(), subtitle: null, _log: [], _paths: {} };
  game.rng = HE.rng(game.seed);
  game.scene = new THREE.Scene(); game.scene.background = new THREE.Color(0x20232a);
  game.scene.add(new THREE.HemisphereLight(0xffffff, 0x404048, 0.9)); var sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(30, 60, 20); game.scene.add(sun);
  game.camera = new THREE.PerspectiveCamera(60, opts.aspect || 390 / 844, 0.05, 1500); game.scene.add(game.camera);
  var idx = function(arr){ var m = {}; (arr || []).forEach(function(o){ m[o.id] = o; }); return m; };
  var B = idx(data.beats), PD = idx(data.paths), WD = idx(data.waves), PU = idx(data.pursuers), LD = idx(data.lines);
  game.path = function(id){ if(!PD[id]) return null; return game._paths[id] || (game._paths[id] = HE.compilePath(PD[id])); };
  game.waveDef = function(id){ return WD[id] || null; }; game.pursuerDef = function(id){ return PU[id] || null; };
  game.log = function(type, d){ game._log.push({ t: +game.time.toFixed(4), type: type, data: d || {} }); };
  game.events = function(){ return game._log.slice(); };
  game.rail = HE.Rail(game); game.greybox = HE.Greybox(game); game.combat = HE.Combat(game); game.chase = HE.Chase(game); game.waves = HE.Waves(game);
  game.greybox.build(data); game.greybox.addActor('hero', 'hero'); game.greybox.addActor('friend', 'friend');
  game.actorObject = function(role){ return game.greybox.object(role); };
  game.actorPos = function(role){ var o = game.actorObject(role); return o ? o.position.clone() : null; };
  game.hittables = function(){ var out = []; game.combat.enemies.forEach(function(e){ if(e.alive){ var o = game.actorObject(e.role); if(o) out.push(o); } });
    game.chase.list.forEach(function(p){ var o = game.actorObject(p.role); if(o) out.push(o); }); return out; };
  game.liveEnemies = function(){ return game.combat.live().map(function(e){ return { role: e.role, kind: e.kind, wave: e.wave, pos: e.pos.clone(), exposed: e.exposed }; }); };
  game.pursuerList = function(){ return game.chase.list; };
  game.nearestEnemy = function(from){ var b = null, bd = 1e9; game.combat.live().forEach(function(e){ var d = e.pos.distanceTo(from); if(d < bd){ bd = d; b = e.pos; } }); return b; };
  game.groupCentroid = function(waveId){ var c = new THREE.Vector3(), n = 0;
    game.combat.live().forEach(function(e){ if(e.wave === waveId){ c.add(e.pos); n++; } });
    game.chase.list.forEach(function(p){ if(p.wave === waveId && game.chase.active(p)){ var o = game.actorObject(p.role); if(o){ c.add(o.position); n++; } } });
    if(!n) return null; c.multiplyScalar(1 / n); c.y += 1.2; return c; };
  game.playerPos = function(){ if(game.mode === 'FREE_FOOT' && game.foot) return game.foot.pos.clone().setY(game.foot.pos.y + 1.4); return game.camera.position.clone(); };
  // ---- dialogue ----
  game.playLine = function(id){ var l = LD[id]; if(!l) return; game.subtitle = { id: id, speaker: l.speaker, text: l.text, t: l.dur }; game.log('line', { id: id, speaker: l.speaker }); };
  // ---- segment machine ----
  function enterBeat(bi){ game.bi = bi; game.beat = data.beats[bi].id; game.log('beat', { beat: game.beat }); }
  function enterSegment(si){ var seg = data.beats[game.bi].segments[si], prevMode = game.mode; game.si = si; game.segment = seg.id; game.segDef = seg; game.segT = 0;
    game.endReached = false; game.quietT = -1; game.lineQ = seg.mode === 'CUTSCENE' ? (seg.lines || []).slice() : []; game.subtitle = seg.mode === 'CUTSCENE' ? null : game.subtitle;
    game.combat.clearEnemies(); game.chase.reset(); game.mode = seg.mode;
    var path = seg.path ? game.path(seg.path) : null; if(path) game.vehicle = path.vehicle;
    game.log('segment', { beat: game.beat, segment: seg.id, index: si, mode: seg.mode });
    if(prevMode !== seg.mode || si === 0) game.log('mode', { mode: seg.mode, beat: game.beat, segment: seg.id });
    var fov = seg.mode === 'AMBULANCE' ? data.tuning.ambulanceFov || 80 : 60; if(game.camera.fov !== fov){ game.camera.fov = fov; game.camera.updateProjectionMatrix(); }   // generous aim arc out the rear doors
    if(path && (RAIL_MODES[seg.mode] || seg.mode === 'CUTSCENE')) game.rail.setPath(path, seg.mode === 'CUTSCENE' ? 'RAIL_CHAIR' : seg.mode);
    if(seg.mode === 'FREE_FOOT'){ var t = path.tangentAtS(path.lead); t.y = 0; t.normalize(); game.foot = { pos: path.pointAt(0), fwd: t, path: path }; game.rail.path = path; game.rail.s = path.lead; }
    game.waves.init(seg); game.placeActors(); }
  function advance(){ var beat = data.beats[game.bi];
    if(game.si + 1 < beat.segments.length) return enterSegment(game.si + 1);
    if(game.bi + 1 < data.beats.length){ enterBeat(game.bi + 1); return enterSegment(0); }
    game.ended = true; game.log('end', {}); }
  game.gotoBeat = function(id){ var bi = data.beats.findIndex(function(b){ return b.id === id; }); if(bi < 0) return false;
    game.won = false; game.lost = false; game.ended = false; game.mode = null; game.subtitle = null;
    var gi = data.beats.findIndex(function(b){ return b.id === 'gauntlet'; }); game.combat.reset(gi >= 0 && bi > gi ? 'machine_pistol' : 'pistol');
    game.input.fire = false; game.input.reload = false; game.input.move.x = game.input.move.y = 0;
    enterBeat(bi); enterSegment(0); game.combat.updateFeedback(0); return true; };
  game.gotoSegment = function(id, i){ if(!game.gotoBeat(id)) return false; var segs = data.beats[game.bi].segments; if(!(i >= 0 && i < segs.length)) return false; if(i > 0) enterSegment(i); return true; };
  game.resume = function(waveId){ if(RAIL_MODES[game.mode]) game.rail.release(); game.log('resume', { wave: waveId }); };
  game.pathEvent = function(e){ game.log('pathEvent', { type: e.type, at: e.at });
    if(e.type === 'line') game.playLine(e.line); else if(e.type === 'wave') game.waves.trigger(e.wave); else if(e.type === 'segmentEnd') game.endReached = true;
    else if(e.type === 'pickup'){ game.combat.setWeapon(e.weapon); game.log('pickup', { weapon: e.weapon }); } };
  game.win = function(){ if(game.won) return; game.won = true; game.log('win', { pathT: +game.rail.pathT().toFixed(4) });
    var ls = game.segDef.lines || []; if(ls.length) game.playLine(ls[ls.length - 1]); game.quietT = (ls.length && LD[ls[ls.length - 1]] ? LD[ls[ls.length - 1]].dur : 0) + 1.5; };
  game.lose = function(){ if(game.lost) return; game.lost = true; game.input.fire = false; game.log('lose', { beat: game.beat, segment: game.segment }); };
  game.placeActors = function(){ var hero = game.actorObject('hero'), fr = game.actorObject('friend'), r = game.rail; if(!r.path) return;
    if(game.mode === 'FREE_FOOT'){ var p0 = game.foot.path.pointAt(0); hero.position.copy(p0); fr.position.copy(game.foot.pos); game.greybox.showVehicle('chair', p0, game.foot.fwd); return; }
    var pos = r.riderPos(), t = r.path.tangentAtS(r.s); t.y = 0; t.normalize();
    if(game.mode === 'AMBULANCE'){ game.greybox.showVehicle('ambulance', pos, t.clone().negate()); hero.position.copy(pos).addScaledVector(t, -1.2).setY(pos.y + 0.9); fr.position.copy(pos).addScaledVector(t, 1.8).setY(pos.y + 0.9); hero.visible = false; hero.scale.set(1, 1, 1); return; }
    // greybox only: the seated hero renders shortened and shifted left so the seated-height rig looks past his right shoulder
    hero.visible = true; game.greybox.showVehicle(game.vehicle === 'bed' ? 'bed' : 'chair', pos, t.clone().negate()); hero.scale.set(1, 0.6, 1);
    hero.position.copy(pos).addScaledVector(new THREE.Vector3(t.z, 0, -t.x), 0.5).setY(pos.y + (game.vehicle === 'bed' ? 0.45 : 0.1)); fr.position.copy(r.pusherPos()); };
  game.step = function(dt){ var inp = game.input;
    if(game.lost || game.ended){ game.combat.updateFeedback(dt); return; }
    game.time += dt; game.segT += dt; var m = game.mode;
    if(m === 'CUTSCENE'){ if(game.subtitle) game.subtitle.t -= dt;
      if(!game.subtitle || game.subtitle.t <= 0){ if(game.lineQ.length) game.playLine(game.lineQ.shift()); else if(game.segT >= 0.6){ game.subtitle = null; advance(); return; } } }
    else if(game.subtitle){ game.subtitle.t -= dt; if(game.subtitle.t <= 0) game.subtitle = null; }
    if(RAIL_MODES[m]) game.rail.step(dt);
    else if(m === 'FREE_FOOT') stepFoot(dt);
    else if(m === 'CUTSCENE' && game.rail.path) game.rail.place(dt, false);
    if(m !== 'CUTSCENE') game.combat.handleInput(inp, dt);
    game.waves.step(); game.combat.stepEnemies(dt); if(m === 'AMBULANCE') game.chase.step(dt);
    game.placeActors(); game.combat.updateFeedback(dt);
    if(game.lost) return;
    // hold safety: a hold with nothing left that could ever release it releases itself (never soft-locks)
    if(RAIL_MODES[m] && game.rail.speed() === 0 && !game.rail.endReached && game.rail.pathT() < 1 && !game.waves.busy() && game.combat.live().length === 0){ game.idleHold = (game.idleHold || 0) + dt; if(game.idleHold > 1.0){ game.idleHold = 0; game.rail.release(); game.log('holdAutoRelease', {}); } } else game.idleHold = 0;
    var alive = game.combat.live().length, chasing = game.chase.list.some(game.chase.active);
    var finale = game.rail.path && game.rail.path.def.crossingAt != null && m === 'AMBULANCE';
    if(finale){ if(game.won){ game.quietT -= dt; if(game.quietT <= 0) advance(); } return; }
    if(m === 'RAIL_CHAIR' || m === 'AMBULANCE'){ if((game.endReached || game.rail.pathT() >= 1) && alive === 0 && !chasing && !game.waves.busy()) advance(); }
    else if(m === 'HOLDOUT'){ if(game.waves.allCleared() && game.segT > 0.5) advance(); }
    else if(m === 'FREE_FOOT'){ var end = game.foot.path.pointAt(1); if(game.waves.allCleared() && game.foot.pos.distanceTo(end) < 2.0) advance(); } };
  function stepFoot(dt){ var f = game.foot, mv = game.input.move, right = new THREE.Vector3(-f.fwd.z, 0, f.fwd.x), sp = data.tuning.footSpeed;
    var d = f.fwd.clone().multiplyScalar(-mv.y).addScaledVector(right, mv.x); if(d.lengthSq() > 1) d.normalize(); f.pos.addScaledVector(d, sp * dt);
    var n = f.path.nearestS(f.pos), w = (data.tuning.footHalfWidth || 3); if(n.d > w){ var c = f.path.pointAtS(n.s); f.pos.sub(c).setLength(w).add(c); }
    var cam = game.camera; cam.position.copy(f.pos).addScaledVector(f.fwd, -f.path.back).addScaledVector(right, 0.5); cam.position.y = f.pos.y + f.path.height;
    cam.lookAt(cam.position.clone().add(f.fwd).setY(cam.position.y - 0.05)); cam.updateMatrixWorld(); }
  // ---- outputs ----
  game.state = function(){ var c = game.combat, fb = c.feedback;
    return { beat: game.beat, segment: game.segment, mode: game.mode, vehicle: game.vehicle, health: c.health, nearDeath: c.health < 30, ammo: c.ammo(),
      enemiesAlive: c.live().length, pursuers: game.chase.stateList(), pathT: game.mode === 'FREE_FOOT' ? 0 : game.rail.pathT(),
      feedback: { vignette: fb.vignette, wash: fb.wash, shake: fb.shake }, won: game.won, lost: game.lost, ended: game.ended,
      subtitle: game.subtitle ? { speaker: game.subtitle.speaker, text: game.subtitle.text } : null }; };
  var _v = new THREE.Vector3();
  game.project = function(role, zone){ var o = zone ? game.greybox.zoneObject(role, zone) : game.actorObject(role); if(!o) return null; game.scene.updateMatrixWorld();
    o.getWorldPosition(_v); if(!zone) _v.y += 1.25; if(zone === 'tire') _v.y -= 0.12;
    var cs = _v.clone().applyMatrix4(game.camera.matrixWorldInverse); _v.project(game.camera);
    var x = (_v.x + 1) / 2, y = (1 - _v.y) / 2; return { x: x, y: y, onScreen: cs.z < 0 && x >= 0 && x <= 1 && y >= 0 && y <= 1 }; };
  game.dbg = { version: 'he-dbg-1', state: game.state, gotoBeat: game.gotoBeat, gotoSegment: game.gotoSegment,
    aim: function(nx, ny){ game.input.aim.x = HE.clamp(+nx, 0, 1); game.input.aim.y = HE.clamp(+ny, 0, 1); },
    fire: function(down){ game.input.fire = !!down; }, reload: function(){ game.input.reload = true; },
    damage: function(n){ game.combat.damage(+n, 'dbg'); game.combat.updateFeedback(0); }, events: game.events };
  return game;
};
HE.install = function(game){ HE.current = game; HE.input = game.input; window.__dbg = game.dbg; return game; };

// ---- autopilot: plays any beat through the same input verbs a player has (aim / fire / reload / move) ----
HE.autopilot = function(game){ var inp = game.input, s = game.mode; game._ap = (game._ap || 0) + 1;
  if(s === 'CUTSCENE' || game.lost || game.ended){ inp.fire = false; return; }
  var tgt = null, best = 1e9, P = game.playerPos();
  game.chase.list.forEach(function(p){ if(p.state !== 'pursuing') return; var zone = ['driver', 'engine', 'tire'][p.id.length % 3]; var pr = game.project(p.role, zone); var o = game.actorObject(p.role);
    if(pr && pr.onScreen && o){ var d = o.position.distanceTo(P); if(d < best){ best = d; tgt = pr; } } });
  if(!tgt) game.combat.live().forEach(function(e){ if(!e.exposed) return; var pr = game.project(e.role); if(pr && pr.onScreen){ var d = e.pos.distanceTo(P); if(d < best){ best = d; tgt = pr; } } });
  if(s === 'FREE_FOOT'){ var f = game.foot; if(!tgt && game.combat.live().length === 0){ var to = f.path.pointAt(1).sub(f.pos); to.y = 0; var right = new THREE.Vector3(-f.fwd.z, 0, f.fwd.x);
      inp.move.y = -HE.clamp(to.dot(f.fwd), -1, 1); inp.move.x = HE.clamp(to.dot(right), -1, 1); } else { inp.move.x = 0; inp.move.y = 0; } }
  if(!tgt){ inp.fire = false; return; }
  inp.aim.x = tgt.x; inp.aim.y = tgt.y; var auto = game.data.tuning.weapons[game.combat.weapon].auto; inp.fire = auto ? true : (game._ap % 2 === 0); };
})();
