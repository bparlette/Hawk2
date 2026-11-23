/* Hospital Escape engine — combat core: reticle raycast hits, weapons (mag/reload), hero health, damage feedback,
   enemy actors (cover / rush / hold) with seeded, data-driven fire. Vehicle component hits are resolved in chase.js. */
(function(){
'use strict';
var HE = window.HE;
HE.Combat = function(game){
  var T = game.data.tuning, c = { enemies: [], shots: [], score: 0, streak: 0, shotsFired: 0, shotsHit: 0, health: 100, weapon: 'pistol', mag: 0, reloadT: 0, fireHeld: false, fireCool: 0,
    pulse: 0, shake: 0, feedback: { vignette: 0, wash: 0, shake: 0 } };
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), _cf = new THREE.Vector3(), _to = new THREE.Vector3();
  c.reset = function(weapon){ c.shots = []; c.score = 0; c.streak = 0; c.shotsFired = 0; c.shotsHit = 0; c.partnerT = 1; c.health = 100; c.setWeapon(weapon || 'pistol'); c.pulse = 0; c.shake = 0; c.reloadT = 0; c.fireHeld = false; c.fireCool = 0; c.clearEnemies(); c.updateFeedback(0); };
  c.setWeapon = function(w){ c.weapon = w; c.mag = T.weapons[w].mag; c.reloadT = 0; };
  c.ammo = function(){ return { weapon: c.weapon, mag: c.mag, reserve: Infinity }; };
  c.startReload = function(){ if(c.reloadT > 0 || c.mag === T.weapons[c.weapon].mag) return; c.reloadT = T.weapons[c.weapon].reloadTime; game.log('reload', { weapon: c.weapon }); };
  // ---- hero damage + feedback (engine output, recomputed every frame) ----
  c.damage = function(n, src){ if(game.lost || game.won) return; c.health = Math.max(0, c.health - n); c.pulse = Math.min(1, c.pulse + n / 40); c.shake = Math.min(1, c.shake + n / 30);
    game.log('heroHit', { n: n, src: src || 'test', health: c.health }); if(c.health <= 0) game.lose(); };
  c.updateFeedback = function(dt){ c.pulse = Math.max(0, c.pulse - 1.2 * dt); c.shake = Math.max(0, c.shake - 2.5 * dt);
    var base = game.mode === 'RAIL_CHAIR' ? 0.16 : 0.06, hurt = 1 - c.health / 100;   // seated injury: constant light vignette, deepening with damage
    c.feedback.vignette = HE.clamp(base + hurt * 0.38 + c.pulse * 0.5, 0, 1);
    c.feedback.wash = c.health < 30 ? HE.clamp(0.25 + 0.75 * (30 - c.health) / 30, 0, 1) : 0;
    c.feedback.shake = HE.clamp(c.shake, 0, 1); };
  // ---- firing: one shot per trigger press (pistol) or automatic while held (machine_pistol); empty -> auto reload ----
  c.handleInput = function(inp, dt){
    c.fireCool = Math.max(0, c.fireCool - dt);
    if(c.reloadT > 0){ c.reloadT -= dt; if(c.reloadT <= 0){ c.reloadT = 0; c.mag = T.weapons[c.weapon].mag; game.log('reloaded', { weapon: c.weapon }); } }
    if(inp.reload){ inp.reload = false; c.startReload(); }
    var W = T.weapons[c.weapon], press = inp.fire && !c.fireHeld, want = W.auto ? inp.fire : press; c.fireHeld = inp.fire;
    if(!want || c.fireCool > 0 || c.reloadT > 0) return;
    if(c.mag <= 0){ game.log('dryFire', {}); c.startReload(); return; }
    c.mag--; c.fireCool = 1 / W.rate; c.shoot(inp.aim, W.damage); if(c.mag === 0) c.startReload(); };
  c.shoot = function(aim, dmg){ game.scene.updateMatrixWorld(); ndc.set(aim.x * 2 - 1, -(aim.y * 2 - 1)); ray.setFromCamera(ndc, game.camera);
    var hits = ray.intersectObjects(game.hittables(), true), h = null;
    for(var i = 0; i < hits.length; i++){ var o = hits[i].object; while(o && !o.userData.hit) o = o.parent; if(o && o.userData.hit && o.userData.hit.live()){ h = { info: o.userData.hit, point: hits[i].point }; break; } }
    var occl = h && h.info.occluder ? h.point : null;
    game.log('shot', { weapon: c.weapon, aim: [+aim.x.toFixed(3), +aim.y.toFixed(3)], hit: h && !occl ? h.info.role : null, point: h ? [+h.point.x.toFixed(2), +h.point.y.toFixed(2), +h.point.z.toFixed(2)] : null });
    if(h && h.info.occluder){ h = null; }   // ext: cover props / walls stop the round (the spark lands on them; logged as a miss)
    c.shotsFired++; if(!h || h.info.bystander){ c.streak = 0; } else { c.shotsHit++; c.streak++; }
    if(!h) return; if(h.info.bystander){ game.bystanders.hit(h.info.role); return; } game.log('hitmarker', { x: aim.x, y: aim.y });
    if(h.info.component) game.chase.hitComponent(h.info.role, h.info.component, dmg);
    else c.hitEnemy(h.info.role, dmg); };
  // ---- enemies ----
  c.clearEnemies = function(){ c.enemies.forEach(function(e){ game.greybox.removeActor(e.role); if(e.coverBox) game.greybox.removeObject(e.coverBox); }); c.enemies = []; c.shots = []; };
  c.spawnEnemy = function(waveId, idx, sp, pos){ var K = T.enemies[sp.kind], role = 'enemy:' + waveId + '_' + idx, R = game.rng;
    var e = { role: role, wave: waveId, kind: sp.kind, behavior: sp.behavior || 'hold', hp: K.hp, pos: pos.clone(), alive: true, exposed: true, t: 0,
      fireT: K.fireEvery * (T.firstShot != null ? T.firstShot * (0.7 + 0.6 * R()) : 0.6 + 0.6 * R()), cover: null,   /* ext: tuning.firstShot scales the first shot's delay */ peekT: 0 };
    if(e.behavior === 'cover'){ var side = R() < 0.5 ? -1 : 1, to = game.playerPos().clone().sub(pos).setY(0).normalize(), sw = T.cover.side; e.cover = pos.clone().add(new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(side * (sw != null ? sw * (0.6 + 0.4 * R()) : 1.2 + R())));   // ext: cover.side = sidestep width
      e.hideDir = new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(side); e.coverBox = game.greybox.addCover(e.cover.clone().addScaledVector(to, 0.7), e); }
    e.mesh = game.greybox.addActor(role, sp.kind); e.mesh.userData.hit = { role: role, live: function(){ return e.alive && e.exposed; } };
    c.enemies.push(e); game.log('spawn', { role: role, kind: sp.kind, behavior: e.behavior, wave: waveId }); c.placeEnemy(e); return e; };
  c.placeEnemy = function(e){ var m = game.actorObject(e.role); if(!m) return; m.position.copy(e.pos);
    if(!e.exposed){ if(T.cover.lateral && e.hideDir) m.position.addScaledVector(e.hideDir, T.cover.lateral); else m.position.y += -0.95; }   // ext: corner-pop hides sideways behind the corner
    var p = game.playerPos(); m.lookAt(p.x, m.position.y, p.z); };
  c.hitEnemy = function(role, dmg, partner){ var e = c.byRole(role); if(!e || !e.alive) return; e.hp -= dmg; game.log('hit', { role: role, hp: Math.max(0, e.hp), by: partner ? 'partner' : 'player' });
    if(e.hp <= 0){ e.alive = false; var pts = 0, quick = false;
      if(T.score && !partner){ quick = e.firstSeen != null && e.t - e.firstSeen <= T.score.quickDraw; pts = T.score.kill + (quick ? T.score.quick : 0) + T.score.streak * Math.min(c.streak, 10); c.score += pts; }
      game.log('kill', { role: role, kind: e.kind, points: pts, quick: quick }); game.greybox.killActor(role); if(e.coverBox) game.greybox.removeObject(e.coverBox); game.waves.onEnemyDead(e); } };
  c.byRole = function(role){ for(var i = 0; i < c.enemies.length; i++) if(c.enemies[i].role === role) return c.enemies[i]; return null; };
  c.live = function(){ return c.enemies.filter(function(e){ return e.alive; }); };
  c.stepEnemies = function(dt){ var P = game.playerPos(), R = game.rng;
    c.enemies.forEach(function(e){ if(!e.alive) return; var K = T.enemies[e.kind]; e.t += dt;
      if(e.behavior === 'rush'){ var d = P.clone().sub(e.pos).setY(0), L = d.length(), rs = T.rushStop || 3.5; if(L > rs) e.pos.addScaledVector(d.normalize(), Math.min(L - rs, K.speed * dt)); else if(T.rushStop && L < rs - 0.3) e.pos.addScaledVector(d.normalize(), -K.speed * dt); }   // ext: rushStop — holds its distance, backs off if the rider closes (screen presence)
      else if(e.behavior === 'cover'){ if(e.pos.distanceTo(e.cover) > 0.05){ var v = e.cover.clone().sub(e.pos), l = v.length(); e.pos.addScaledVector(v.normalize(), Math.min(l, K.speed * dt)); e.exposed = true; }
        else if(T.cover.commit && e.committed){ e.exposed = true; if(T.rushStop){ var kd = e.pos.clone().sub(P).setY(0), kl = kd.length(); if(kl < T.rushStop - 0.3){ e.pos.addScaledVector(kd.normalize(), K.speed * dt); e.cover.copy(e.pos); } } }   // committed shooters also keep their distance   // ext (cover.commit): once it is an active shooter it STAYS out — no hide-and-peek while attacking
        else { e.peekT += dt; var per = T.cover.exposed + T.cover.hidden, cyc = e.peekT % per; e.exposed = cyc < T.cover.exposed;
          // ext: advance pressure — every `advanceEvery` peek cycles the cover point steps toward the player (doorways/corners as waypoints)
          if(T.cover.advance && Math.floor(e.peekT / per) >= (e.adv || 0) + (T.cover.advanceEvery || 2)){ e.adv = (e.adv || 0) + (T.cover.advanceEvery || 2); var tp = P.clone().sub(e.cover).setY(0), dl = tp.length();
            if(dl > (T.cover.minDist || 7)){ e.cover.addScaledVector(tp.normalize(), Math.min(T.cover.advance, dl - (T.cover.minDist || 7))); game.log('advance', { role: e.role }); if(e.coverBox) game.greybox.moveCover(e.coverBox, e.cover, e); } } } }
      // ext (data-gated by cover.recoverAfter): an enemy that stays off-screen this long relocates into view ahead (no soft-lock)
      if(T.cover.recoverAfter){ _to.copy(e.pos); _to.y += 1.3; _to.project(game.camera); var off = _to.z > 1 || Math.abs(_to.x) > 1.05; e.offT = off ? (e.offT || 0) + dt : 0;
        if(e.offT > T.cover.recoverAfter){ e.offT = 0; game.camera.getWorldDirection(_cf); _cf.y = 0; _cf.normalize(); var np = game.camera.position.clone().addScaledVector(_cf, 8); np.y = e.pos.y;
          e.pos.copy(np); if(e.cover) e.cover.copy(np); if(e.coverBox) game.greybox.moveCover(e.coverBox, np, e); game.log('reposition', { role: e.role }); } }
      c.placeEnemy(e);
      e.fair = T.fairness ? (e.exposed ? c.fairTick(e, e.pos, 1.75, dt) : (e.visT = 0, false)) : true;
      if(e.exposed && e.firstSeen == null) e.firstSeen = e.t; if(e.fair && T.fairness) e.committed = true;
      // ext (fairness.seenOnly): no shot at all — not even a visual-only one — unless the shooter meets the visibility contract right now
      if(T.fairness && T.fairness.seenOnly && !e.fair){ e.aiming = 0; return; }
      if(e.t < T.enemyFireDelay || !e.exposed){ e.aiming = 0; return; }
      // fair-fire rule: an enemy only shoots from inside the camera's view arc (±75° of where the camera looks)
      game.camera.getWorldDirection(_cf); _to.subVectors(e.pos, game.camera.position).setY(0).normalize(); _cf.setY(0).normalize(); if(_to.dot(_cf) < Math.cos(75 * Math.PI / 180)) return;
      // ext (data-gated by tuning.screenFire): stricter fair-fire — only from on (or just off) the actual screen, so the shot is always seen
      if(T.screenFire && !T.fairness){ _to.copy(e.pos); _to.y += 1.3; _to.project(game.camera); if(_to.z > 1 || Math.abs(_to.x) > T.screenFire || Math.abs(_to.y) > 1.2) return; }
      if(e.aiming > 0){ e.aiming -= dt; if(e.aiming > 0) return; }
      else { e.fireT -= dt; if(e.fireT > 0) return;
        if(T.aimTell){ e.aiming = T.aimTell; game.log('enemyAim', { role: e.role }); return; } }   // ext: the aiming glint is the last tell before the shot
      var near = T.closeRange ? HE.clamp(e.pos.distanceTo(P) / T.closeRange, 0.45, 1) : 1;     // ext: fire intensity rises as they close
      e.fireT = K.fireEvery * near * (0.8 + 0.4 * R());
      var hit = R() < K.accuracy && e.fair !== false; if(hit && T.fairness) hit = c.fairFire(e, e.pos, 1.75); game.log('enemyFire', { role: e.role, hit: hit }); c.fireAtHero(e.role, e.pos, hit, K.damage, e.vis); }); };
  // ext (data-gated by tuning.fairness): the SHOOTER FAIRNESS CONTRACT. A shooter may deal damage only if, as it fires,
  // it is inside the player's effective visible zone (game.visibleZone: the screen minus eyelids/tunnel, with margin),
  // its line of sight from the camera is clear (game.losBlocked hook: scenery, furniture, characters), it is >= minPx tall
  // on an 844-px-tall screen, and it has been continuously visible that way for >= telegraph seconds. Otherwise its shots
  // are visual-only (never red, never damage). Every shot logs these facts at fire time for the audit.
  var _a = new THREE.Vector3(), _b = new THREE.Vector3();
  c.fairVis = function(pos, height, self){ var F = T.fairness, cam = game.camera; _a.copy(pos); _a.y += height * 0.72; _b.copy(_a).project(cam);
    var sx = (_b.x + 1) / 2, sy = (1 - _b.y) / 2, front = _b.z < 1, Z = game.visibleZone || { x0: 0, x1: 1, y0: 0, y1: 1 }, m = F.margin;
    var inZone = front && sx > Z.x0 + m && sx < Z.x1 - m && sy > Z.y0 + m && sy < Z.y1 - m;
    _b.copy(pos).project(cam); var yb = (1 - _b.y) / 2; _b.copy(pos); _b.y += height; _b.project(cam); var px = Math.abs(yb - (1 - _b.y) / 2) * 844;
    return { inZone: inZone, sx: +sx.toFixed(3), sy: +sy.toFixed(3), px: Math.round(px), occl: false }; };
  // at the INSTANT of a damaging shot, line of sight is re-tested fresh (the per-frame check is throttled to 0.12 s)
  c.fairFire = function(o, pos, height){ if(!T.fairness || !o.fair) return !!o.fair || !T.fairness; var bl = !!(game.losBlocked && game.losBlocked(game.camera.position, _a.copy(pos).setY(pos.y + height * 0.72), o.role));
    if(bl){ o.fair = false; o.visT = 0; o.occl = true; if(o.vis){ o.vis.occl = true; o.vis.visT = 0; } } return !bl; };
  c.fairTick = function(o, pos, height, dt){ var F = T.fairness; if(!F) return true; o.fairT = (o.fairT || 0) - dt; var v = c.fairVis(pos, height, o);
    if(v.inZone && v.px >= F.minPx){ if(o.fairT <= 0){ o.fairT = 0.2; o.occl = !!(game.losBlocked && game.losBlocked(game.camera.position, _a.copy(pos).setY(pos.y + height * 0.72), o.role)); } v.occl = !!o.occl; }
    else { v.occl = !!o.occl; }
    var ok = v.inZone && v.px >= F.minPx && !v.occl; o.visT = ok ? (o.visT || 0) + dt : 0; v.visT = +(o.visT || 0).toFixed(2); o.vis = v; return ok && o.visT >= F.telegraph; };
  // ext (data-gated by tuning.shotSpeed): enemy shots are travelling projectiles. A shot that will hit is flagged red
  // at launch and its damage lands on ARRIVAL — never damage from nowhere. Without shotSpeed: instant (v1 behaviour).
  c.fireAtHero = function(role, from, hit, dmg, vis){
    if(!T.shotSpeed){ if(hit && !c.heroOut(role)) c.damage(dmg, role); return; }
    var R = game.rng, tgt = game.heroTarget(), f = from.clone(); f.y += 1.45; var to = tgt.clone();
    if(!hit){ var off = new THREE.Vector3((R() - 0.5) * 2.4, (R() - 0.6) * 1.6, (R() - 0.5) * 1.2); if(off.length() < 0.7) off.setLength(0.7); to.add(off); to.y = Math.max(game.floorY() + 0.02, to.y); }
    var eta = game.time + f.distanceTo(to) / T.shotSpeed, sh = { role: role, from: f, to: to, hit: hit, red: hit, dmg: dmg, t0: game.time, eta: eta };
    c.shots.push(sh); game.log('enemyShot', { role: role, hit: hit, red: hit, from: [+f.x.toFixed(2), +f.y.toFixed(2), +f.z.toFixed(2)], to: [+to.x.toFixed(2), +to.y.toFixed(2), +to.z.toFixed(2)], eta: +eta.toFixed(3), vis: vis || null }); };
  c.stepShots = function(){ for(var i = c.shots.length - 1; i >= 0; i--){ var sh = c.shots[i]; if(game.time + 1e-9 < sh.eta) continue; c.shots.splice(i, 1);
      game.log('shotLand', { role: sh.role, hit: sh.hit, at: [+sh.to.x.toFixed(2), +sh.to.y.toFixed(2), +sh.to.z.toFixed(2)] }); if(sh.hit && !c.heroOut(sh.role)) c.damage(sh.dmg, sh.role); } };
  // ext (data-gated by tuning.fairness.outGate): CONSCIOUSNESS GATE. While the hero is OUT (the presentation reports eyelid
  // closure via game.heroClosure() >= outGate) no damage applies. Checked at the moment damage would apply (arrival); the shot
  // still flies and lands for pressure, logged 'heroSpared'. Absent outGate or hook: v1 behaviour.
  c.heroOut = function(role){ var F = T.fairness; if(!F || !F.outGate || !game.heroClosure) return false; var cl = +game.heroClosure() || 0;
    if(cl >= F.outGate){ game.log('heroSpared', { role: role, closure: +cl.toFixed(3) }); return true; } return false; };
  // ext (data-gated by tuning.partner): Maya fires too, in the rail/holdout beats — logged, seeded, at the nearest exposed enemy in view
  c.stepPartner = function(dt){ var Pt = T.partner; if(!Pt || !(game.mode === 'RAIL_CHAIR' || game.mode === 'HOLDOUT')) return; c.partnerT = (c.partnerT == null ? 1 : c.partnerT) - dt; if(c.partnerT > 0) return;
    var cam = game.camera.position, best = null, bd = 1e9; game.camera.getWorldDirection(_cf);
    c.enemies.forEach(function(e){ if(!e.alive || !e.exposed) return; _to.subVectors(e.pos, cam).normalize(); if(_to.dot(_cf) < 0.6) return; var d = e.pos.distanceTo(cam); if(d < bd){ bd = d; best = e; } });
    c.partnerT = Pt.fireEvery * (0.8 + 0.4 * game.rng()); if(!best) return; var hit = game.rng() < Pt.accuracy;
    game.log('partnerShot', { role: best.role, hit: hit, to: [+best.pos.x.toFixed(2), +(best.pos.y + 1.3).toFixed(2), +best.pos.z.toFixed(2)] }); if(hit) c.hitEnemy(best.role, Pt.damage, true); };
  return c;
};
})();
