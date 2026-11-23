/* Hospital Escape engine — combat core: reticle raycast hits, weapons (mag/reload), hero health, damage feedback,
   enemy actors (cover / rush / hold) with seeded, data-driven fire. Vehicle component hits are resolved in chase.js. */
(function(){
'use strict';
var HE = window.HE;
HE.Combat = function(game){
  var T = game.data.tuning, c = { enemies: [], health: 100, weapon: 'pistol', mag: 0, reloadT: 0, fireHeld: false, fireCool: 0,
    pulse: 0, shake: 0, feedback: { vignette: 0, wash: 0, shake: 0 } };
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), _cf = new THREE.Vector3(), _to = new THREE.Vector3();
  c.reset = function(weapon){ c.health = 100; c.setWeapon(weapon || 'pistol'); c.pulse = 0; c.shake = 0; c.reloadT = 0; c.fireHeld = false; c.fireCool = 0; c.clearEnemies(); c.updateFeedback(0); };
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
    game.log('shot', { weapon: c.weapon, aim: [+aim.x.toFixed(3), +aim.y.toFixed(3)], hit: h ? h.info.role : null });
    if(!h) return; game.log('hitmarker', { x: aim.x, y: aim.y });
    if(h.info.component) game.chase.hitComponent(h.info.role, h.info.component, dmg);
    else c.hitEnemy(h.info.role, dmg); };
  // ---- enemies ----
  c.clearEnemies = function(){ c.enemies.forEach(function(e){ game.greybox.removeActor(e.role); }); c.enemies = []; };
  c.spawnEnemy = function(waveId, idx, sp, pos){ var K = T.enemies[sp.kind], role = 'enemy:' + waveId + '_' + idx, R = game.rng;
    var e = { role: role, wave: waveId, kind: sp.kind, behavior: sp.behavior || 'hold', hp: K.hp, pos: pos.clone(), alive: true, exposed: true, t: 0,
      fireT: K.fireEvery * (0.6 + 0.6 * R()), cover: null, peekT: 0 };
    if(e.behavior === 'cover'){ var side = R() < 0.5 ? -1 : 1, to = game.playerPos().clone().sub(pos).setY(0).normalize(); e.cover = pos.clone().add(new THREE.Vector3(-to.z, 0, to.x).multiplyScalar(side * (1.2 + R())));
      e.coverBox = game.greybox.addCover(e.cover.clone().addScaledVector(to, 0.7)); }
    e.mesh = game.greybox.addActor(role, sp.kind); e.mesh.userData.hit = { role: role, live: function(){ return e.alive && e.exposed; } };
    c.enemies.push(e); game.log('spawn', { role: role, kind: sp.kind, behavior: e.behavior, wave: waveId }); c.placeEnemy(e); return e; };
  c.placeEnemy = function(e){ var m = game.actorObject(e.role); if(!m) return; m.position.copy(e.pos); m.position.y += e.exposed ? 0 : -0.95;
    var p = game.playerPos(); m.lookAt(p.x, m.position.y, p.z); };
  c.hitEnemy = function(role, dmg){ var e = c.byRole(role); if(!e || !e.alive) return; e.hp -= dmg; game.log('hit', { role: role, hp: Math.max(0, e.hp) });
    if(e.hp <= 0){ e.alive = false; game.log('kill', { role: role, kind: e.kind }); game.greybox.killActor(role); if(e.coverBox) game.greybox.removeObject(e.coverBox); game.waves.onEnemyDead(e); } };
  c.byRole = function(role){ for(var i = 0; i < c.enemies.length; i++) if(c.enemies[i].role === role) return c.enemies[i]; return null; };
  c.live = function(){ return c.enemies.filter(function(e){ return e.alive; }); };
  c.stepEnemies = function(dt){ var P = game.playerPos(), R = game.rng;
    c.enemies.forEach(function(e){ if(!e.alive) return; var K = T.enemies[e.kind]; e.t += dt;
      if(e.behavior === 'rush'){ var d = P.clone().sub(e.pos).setY(0), L = d.length(); if(L > 3.5) e.pos.addScaledVector(d.normalize(), Math.min(L - 3.5, K.speed * dt)); }
      else if(e.behavior === 'cover'){ if(e.pos.distanceTo(e.cover) > 0.05){ var v = e.cover.clone().sub(e.pos), l = v.length(); e.pos.addScaledVector(v.normalize(), Math.min(l, K.speed * dt)); e.exposed = true; }
        else { e.peekT += dt; var cyc = e.peekT % (T.cover.exposed + T.cover.hidden); e.exposed = cyc < T.cover.exposed; } }
      c.placeEnemy(e);
      if(e.t < T.enemyFireDelay || !e.exposed) return;
      // fair-fire rule: an enemy only shoots from inside the camera's view arc (±75° of where the camera looks)
      game.camera.getWorldDirection(_cf); _to.subVectors(e.pos, game.camera.position).setY(0).normalize(); _cf.setY(0).normalize(); if(_to.dot(_cf) < Math.cos(75 * Math.PI / 180)) return;
      e.fireT -= dt; if(e.fireT > 0) return; e.fireT = K.fireEvery * (0.8 + 0.4 * R());
      var hit = R() < K.accuracy; game.log('enemyFire', { role: e.role, hit: hit }); if(hit) c.damage(K.damage, e.role); }); };
  return c;
};
})();
