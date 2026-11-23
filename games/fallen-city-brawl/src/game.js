// Fallen City Brawl — Stage 1: Fallen Downtown (2.5D Belt-Scroller Engine)

import {
  STAGE_LEN,
  STREET_BOT,
  STREET_TOP,
  VIEW_H,
  VIEW_W,
  drawEffects,
  drawFighter,
  drawGoArrow,
  drawPickup,
  drawProp,
  drawRainOverlay,
  drawStageBackground,
  drawWolfCompanion,
} from './sprites.js';

const GRAVITY = 1280;
const DEPTH_HIT_TOL = 28;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export class BrawlGame {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;

    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      block: false,
      dash: false,
    };

    this.reset();
  }

  reset() {
    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.camX = 0;
    this.hitstop = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.riotFlash = 0;
    this.goArrowTimer = 0;
    this.stageClear = false;
    this.gameOver = false;
    this.started = false;
    this.bannerText = '';
    this.bannerSub = '';
    this.bannerTimer = 0;

    // Player: Sgt. Clay (Ex-SWAT)
    this.player = {
      id: 'player',
      kind: 'player',
      name: 'SGT. CLAY',
      x: 160,
      y: 428,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 1,
      hp: 100,
      maxHp: 100,
      riot: 40, // starts 40% charged so player can earn Wolf RIOT quickly!
      state: 'idle', // idle | attack | jumpAttack | dashAttack | block | hurt | knockdown | special
      stateTimer: 0,
      attackDur: 0.24,
      attackMove: 'jab',
      attackHitDone: false,
      comboStep: 0,
      comboResetTimer: 0,
      parryWindow: 0,
      invuln: 0,
      hitFlash: 0,
      moving: false,
      weapon: null, // { kind: 'pipe' | 'katana', uses: number }
      dead: false,
      telegraphTimer: 0,
    };

    // Wolf Companion (RIOT Super Assist)
    this.wolf = {
      active: false,
      x: 0,
      y: 420,
      facing: 1,
      hitIds: new Set(),
    };

    // Smashable street props along Stage 1
    this.props = [
      { id: 1, kind: 'drum', x: 460, y: 374, hp: 2, drop: 'pipe', hitFlash: 0 },
      { id: 2, kind: 'crate', x: 860, y: 472, hp: 2, drop: 'gem', hitFlash: 0 },
      { id: 3, kind: 'drum', x: 1240, y: 372, hp: 2, drop: 'katana', hitFlash: 0 },
      { id: 4, kind: 'crate', x: 1560, y: 484, hp: 2, drop: 'chicken', hitFlash: 0 },
      { id: 5, kind: 'drum', x: 1960, y: 376, hp: 2, drop: 'gem', hitFlash: 0 },
      { id: 6, kind: 'crate', x: 2380, y: 486, hp: 2, drop: 'chicken', hitFlash: 0 },
    ];

    this.pickups = [];
    this.enemies = [];
    this.sparks = [];
    this.popups = [];
    this.lastTarget = null;
    this.nextEnemyId = 1;

    // 3 Locked Wave Encounters (classic arcade belt-scroller pacing)
    this.waves = [
      {
        triggerX: 340,
        lockCamX: 180,
        triggered: false,
        cleared: false,
        spawns: [
          { kind: 'punk', side: 1, y: 396 },
          { kind: 'punk', side: 1, y: 466 },
          { kind: 'dasher', side: -1, y: 428 },
        ],
      },
      {
        triggerX: 1120,
        lockCamX: 980,
        triggered: false,
        cleared: false,
        spawns: [
          { kind: 'bruiser', side: 1, y: 426 },
          { kind: 'punk', side: -1, y: 382 },
          { kind: 'dasher', side: 1, y: 476 },
          { kind: 'punk', side: 1, y: 374 },
        ],
      },
      {
        triggerX: 1840,
        lockCamX: 1680,
        triggered: false,
        cleared: false,
        isBossWave: true,
        spawns: [
          { kind: 'boss', side: 1, y: 428 },
          { kind: 'punk', side: -1, y: 380 },
          { kind: 'dasher', side: 1, y: 478 },
        ],
      },
    ];
    this.activeWave = null;
    this.stageTimer = 99;
  }

  startGame() {
    this.started = true;
    this.showBanner('STAGE 1', 'FALLEN DOWNTOWN — FIGHT!', 2.2);
    this.audio.goChime();
  }

  showBanner(text, sub = '', dur = 2.0) {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerTimer = dur;
  }

  _spawnEnemy(kind, side, y) {
    const x = side > 0 ? this.camX + VIEW_W + 45 + Math.random() * 60 : this.camX - 45 - Math.random() * 50;
    const isBoss = kind === 'boss';
    const defs = {
      punk: { name: 'STREET PUNK', hp: 52, speed: 122, dmg: 9, range: 54 },
      bruiser: { name: 'PIPE BRUISER', hp: 86, speed: 94, dmg: 15, range: 64, weapon: { kind: 'pipe', uses: 99 } },
      dasher: { name: 'KNIFE DASHER', hp: 46, speed: 156, dmg: 11, range: 58 },
      boss: { name: 'IGNITION REX', hp: 240, speed: 118, dmg: 18, range: 74 },
    };
    const d = defs[kind] || defs.punk;
    this.enemies.push({
      id: this.nextEnemyId++,
      kind,
      name: d.name,
      isBoss,
      phase2: false,
      x: clamp(x, 20, STAGE_LEN - 20),
      y: clamp(y, STREET_TOP + 16, STREET_BOT - 12),
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: side > 0 ? -1 : 1,
      hp: d.hp,
      maxHp: d.hp,
      speed: d.speed,
      dmg: d.dmg,
      range: d.range,
      weapon: d.weapon ? { ...d.weapon } : null,
      state: 'idle',
      stateTimer: 0,
      attackDur: 0.36,
      attackMove: 'jab',
      attackHitDone: false,
      telegraphTimer: 0,
      aiCooldown: 0.4 + Math.random() * 0.6,
      hitFlash: 0,
      moving: false,
      dead: false,
      deadTimer: 0,
    });
  }

  // Player Actions
  pressAttack() {
    if (!this.started) {
      this.startGame();
      return;
    }
    if (this.gameOver || this.stageClear) return;
    const p = this.player;
    if (p.state === 'hurt' || p.state === 'knockdown' || p.state === 'special') return;

    // 1. Check nearby ground pickup first!
    if (p.z === 0) {
      const itemIdx = this.pickups.findIndex(
        (it) => Math.abs(it.x - p.x) < 48 && Math.abs(it.y - p.y) < 32
      );
      if (itemIdx >= 0) {
        const it = this.pickups.splice(itemIdx, 1)[0];
        this._collectPickup(it);
        return;
      }
    }

    // 2. Air Jump Kick
    if (p.z > 4) {
      if (p.state !== 'jumpAttack') {
        p.state = 'jumpAttack';
        p.stateTimer = 0;
        p.attackDur = 0.34;
        p.attackMove = 'jumpKick';
        p.attackHitDone = false;
        p.vx = p.facing * 240;
        this.audio.whiff();
      }
      return;
    }

    if (p.state === 'attack' && p.stateTimer < p.attackDur * 0.55) return;

    // 3. Close-range Grapple Throw if holding forward/back right on top of a standing enemy!
    const grabTarget = this.enemies.find(
      (e) => !e.dead && !e.isBoss && e.state !== 'knockdown' && e.state !== 'thrown' &&
        Math.abs(e.x - p.x) < 42 && Math.abs(e.y - p.y) < 22
    );
    if (grabTarget && (this.keys.left || this.keys.right) && p.comboStep === 0 && !p.weapon) {
      const throwDir = this.keys.left ? -1 : 1;
      p.facing = throwDir;
      p.state = 'attack';
      p.stateTimer = 0;
      p.attackDur = 0.28;
      p.attackMove = 'throw';
      p.attackHitDone = true;

      grabTarget.state = 'thrown';
      grabTarget.stateTimer = 0;
      grabTarget.x = p.x + throwDir * 24;
      grabTarget.z = 26;
      grabTarget.vx = throwDir * 440;
      grabTarget.vz = 260;
      grabTarget.facing = -throwDir;
      this._damageEnemy(grabTarget, 22, true, 'THROW!');
      this.audio.throwSlam();
      return;
    }

    // 4. Dash Attack
    if (this.keys.dash && (this.keys.left || this.keys.right)) {
      p.state = 'dashAttack';
      p.stateTimer = 0;
      p.attackDur = 0.30;
      p.attackMove = 'dash';
      p.attackHitDone = false;
      p.vx = p.facing * 390;
      this.audio.whiff();
      return;
    }

    // 5. 4-Hit Arcade Combo Chain!
    p.state = 'attack';
    p.stateTimer = 0;
    p.attackHitDone = false;
    p.comboStep = (p.comboStep % 4) + 1;
    p.comboResetTimer = 0.62;
    p.attackMove = p.comboStep === 4 ? 'finisher' : p.comboStep === 3 ? 'knee' : 'jab';
    p.attackDur = p.comboStep === 4 ? 0.32 : 0.20;
    p.vx = p.facing * (p.comboStep === 4 ? 130 : 48);
    this.audio.whiff();
  }

  pressJump() {
    if (!this.started) {
      this.startGame();
      return;
    }
    if (this.gameOver || this.stageClear) return;
    const p = this.player;
    if (p.z === 0 && p.state !== 'hurt' && p.state !== 'knockdown' && p.state !== 'special') {
      p.vz = 510;
      p.z = 1;
      this.audio.jump();
    }
  }

  setBlock(pressed) {
    if (!this.started || this.gameOver || this.stageClear) {
      this.keys.block = false;
      return;
    }
    const p = this.player;
    if (pressed && !this.keys.block && p.z === 0 && p.state === 'idle') {
      p.parryWindow = 0.28; // crisp timed parry window!
    }
    this.keys.block = pressed;
  }

  pressRiotSuper() {
    if (!this.started) {
      this.startGame();
      return;
    }
    if (this.gameOver || this.stageClear) return;
    const p = this.player;
    if (p.riot < 100 || p.state === 'knockdown') return;

    p.riot = 0;
    p.state = 'special';
    p.stateTimer = 0;
    p.attackDur = 0.65;
    p.attackMove = 'special';
    p.invuln = 1.25;
    this.riotFlash = 1.0;
    this.shakeTime = 0.45;
    this.shakeMag = 9;
    this.hitstop = 0.08;
    this.audio.riotSuper();
    this.showBanner('WOLF PACK RIOT!!', 'SUPER SPECIAL ACTIVATED', 1.4);

    // Launch Armored Wolf Companion across the entire lane!
    this.wolf.active = true;
    this.wolf.facing = p.facing;
    this.wolf.x = p.facing > 0 ? this.camX - 40 : this.camX + VIEW_W + 40;
    this.wolf.y = p.y;
    this.wolf.hitIds.clear();

    // Shockwave ring around Sgt. Clay
    this.sparks.push({ kind: 'ring', x: p.x, y: p.y - 36, r: 58, color: '#3be8ff', life: 0.4, maxLife: 0.4 });
    this.popups.push({ x: p.x, y: p.y - 96, text: 'RIOT SUPER!', color: '#3be8ff', size: 22, life: 1.0, maxLife: 1.0 });
  }

  _collectPickup(item) {
    const p = this.player;
    this.audio.pickup();
    if (item.kind === 'chicken') {
      p.hp = Math.min(p.maxHp, p.hp + 45);
      this.score += 500;
      this.popups.push({ x: p.x, y: p.y - 86, text: '+45 HP!', color: '#54ff88', size: 20, life: 0.9, maxLife: 0.9 });
    } else if (item.kind === 'gem') {
      p.riot = Math.min(100, p.riot + 40);
      this.score += 1000;
      this.popups.push({ x: p.x, y: p.y - 86, text: 'RIOT +40%!', color: '#3be8ff', size: 20, life: 0.9, maxLife: 0.9 });
    } else if (item.kind === 'pipe') {
      p.weapon = { kind: 'pipe', uses: 10 };
      this.popups.push({ x: p.x, y: p.y - 86, text: 'LEAD PIPE!', color: '#ffca3a', size: 19, life: 0.9, maxLife: 0.9 });
    } else if (item.kind === 'katana') {
      p.weapon = { kind: 'katana', uses: 10 };
      this.popups.push({ x: p.x, y: p.y - 86, text: 'KATANA!', color: '#3be8ff', size: 19, life: 0.9, maxLife: 0.9 });
    }
  }

  _spawnHitSparks(x, y, color = '#ffca3a', count = 10, ring = false) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 120 + Math.random() * 240;
      this.sparks.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        color,
        size: 4 + Math.random() * 4,
        life: 0.22 + Math.random() * 0.16,
        maxLife: 0.36,
      });
    }
    if (ring) {
      this.sparks.push({ kind: 'ring', x, y, r: 28, color, life: 0.24, maxLife: 0.24 });
    }
  }

  _damageEnemy(e, dmg, knockdown = false, label = null) {
    e.hp = Math.max(0, e.hp - dmg);
    e.hitFlash = 0.12;
    this.lastTarget = e;

    this.combo += 1;
    this.comboTimer = 2.4;
    this.score += dmg * 15 + this.combo * 25;
    this.player.riot = Math.min(100, this.player.riot + (knockdown ? 10 : 6));

    // Boss Phase 2 Rage trigger below 50% HP
    if (e.isBoss && !e.phase2 && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
      e.phase2 = true;
      e.speed = 148;
      this.showBanner('IGNITION REX ENRAGED!', 'PHASE 2 — WATCH THE SLAM!', 1.8);
      this.audio.bossSiren();
      this._spawnHitSparks(e.x, e.y - 50, '#ff4824', 18, true);
    }

    this._spawnHitSparks(e.x, e.y - 46 - e.z, knockdown ? '#ff5c38' : '#ffca3a', knockdown ? 14 : 9, knockdown);
    this.popups.push({
      x: e.x,
      y: e.y - 76 - e.z,
      text: label || `-${dmg}`,
      color: knockdown ? '#ff5c38' : '#ffca3a',
      size: knockdown ? 20 : 16,
      life: 0.72,
      maxLife: 0.72,
    });

    if (e.hp <= 0) {
      e.dead = true;
      e.deadTimer = 1.1;
      e.state = 'knockdown';
      e.vz = 270;
      e.vx = this.player.facing * 220;
      this.hitstop = 0.085;
      this.shakeTime = 0.24;
      this.shakeMag = 7;
      this.audio.ko();
      this.score += e.isBoss ? 5000 : 400;
      this.popups.push({ x: e.x, y: e.y - 98, text: e.isBoss ? 'BOSS K.O.!!' : 'K.O.!', color: '#ff3b7c', size: 24, life: 1.0, maxLife: 1.0 });
      return;
    }

    if (knockdown && e.state !== 'thrown') {
      e.state = 'knockdown';
      e.stateTimer = 0;
      e.vz = 250;
      e.vx = this.player.facing * 230;
      this.hitstop = 0.068;
      this.shakeTime = 0.18;
      this.shakeMag = 6;
    } else if (e.state !== 'thrown') {
      e.state = 'hurt';
      e.stateTimer = 0;
      e.vx = this.player.facing * 95;
      this.hitstop = 0.042;
      this.shakeTime = 0.10;
      this.shakeMag = 3.5;
    }
  }

  _damagePlayer(dmg, attacker) {
    const p = this.player;
    if (p.invuln > 0 || p.dead) return;

    // Timed Parry check!
    if (this.keys.block && p.parryWindow > 0) {
      this.audio.parry();
      p.riot = Math.min(100, p.riot + 28);
      this.hitstop = 0.07;
      this._spawnHitSparks(p.x + p.facing * 22, p.y - 48, '#3be8ff', 14, true);
      this.popups.push({ x: p.x, y: p.y - 94, text: 'PARRY!!', color: '#3be8ff', size: 22, life: 0.9, maxLife: 0.9 });
      if (attacker) {
        attacker.state = 'hurt';
        attacker.stateTimer = -0.35; // extra stagger!
        attacker.vx = -attacker.facing * 160;
      }
      return;
    }

    // Standard Block
    if (this.keys.block && p.z === 0 && p.state === 'block') {
      const chip = Math.max(2, Math.round(dmg * 0.28));
      p.hp = Math.max(1, p.hp - chip);
      p.vx = (attacker ? attacker.facing : -p.facing) * 90;
      this.audio.hitLight();
      this._spawnHitSparks(p.x + p.facing * 16, p.y - 46, '#9fd2ff', 6, false);
      this.popups.push({ x: p.x, y: p.y - 84, text: 'BLOCK', color: '#9fd2ff', size: 15, life: 0.6, maxLife: 0.6 });
      return;
    }

    p.hp = Math.max(0, p.hp - dmg);
    p.hitFlash = 0.14;
    this.combo = 0;
    this.audio.hitHeavy();
    this.shakeTime = 0.16;
    this.shakeMag = 5.5;
    this._spawnHitSparks(p.x, p.y - 46, '#ff3b30', 10, false);
    this.popups.push({ x: p.x, y: p.y - 84, text: `-${dmg}`, color: '#ff3b30', size: 18, life: 0.7, maxLife: 0.7 });

    if (p.hp <= 0) {
      p.dead = true;
      p.state = 'knockdown';
      p.vz = 240;
      this.gameOver = true;
      this.audio.ko();
      this.showBanner('GAME OVER', 'PRESS FIGHT / R TO CONTINUE', 99);
    } else if (dmg >= 15) {
      p.state = 'knockdown';
      p.stateTimer = 0;
      p.vz = 220;
      p.vx = (attacker ? attacker.facing : -p.facing) * 180;
      p.invuln = 0.7;
    } else {
      p.state = 'hurt';
      p.stateTimer = 0;
      p.invuln = 0.22;
    }
  }

  step(dt) {
    const clampedDt = Math.min(dt, 0.033);
    this.time += clampedDt;

    // Visual timers tick even during brief hitstop
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - clampedDt);
    if (this.riotFlash > 0) this.riotFlash = Math.max(0, this.riotFlash - clampedDt * 1.4);
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - clampedDt);
    if (this.goArrowTimer > 0) this.goArrowTimer = Math.max(0, this.goArrowTimer - clampedDt);

    if (!this.started) return;

    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - clampedDt);
      return;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= clampedDt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (!this.gameOver && !this.stageClear) {
      this.stageTimer = Math.max(0, this.stageTimer - clampedDt * 0.25);
    }

    this._updatePlayer(clampedDt);
    this._updateWolf(clampedDt);
    this._updateWaves();
    this._updateEnemies(clampedDt);
    this._updateEffects(clampedDt);
    this._updateCamera(clampedDt);
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (p.parryWindow > 0) p.parryWindow = Math.max(0, p.parryWindow - dt);
    if (p.comboResetTimer > 0) {
      p.comboResetTimer -= dt;
      if (p.comboResetTimer <= 0) p.comboStep = 0;
    }

    // Vertical physics (Z)
    if (p.z > 0 || p.vz !== 0) {
      p.vz -= GRAVITY * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        p.vz = 0;
        if (p.state === 'jumpAttack') p.state = 'idle';
      }
    }

    if (this.gameOver) return;

    p.stateTimer += dt;

    if (p.state === 'knockdown') {
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.05, dt);
      if (p.z === 0 && p.stateTimer > 0.65) {
        p.state = 'idle';
        p.invuln = 0.7;
      }
    } else if (p.state === 'hurt') {
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.02, dt);
      if (p.stateTimer > 0.24) p.state = 'idle';
    } else if (p.state === 'special') {
      if (p.stateTimer > p.attackDur) p.state = 'idle';
    } else if (p.state === 'attack' || p.state === 'dashAttack' || p.state === 'jumpAttack') {
      p.x += p.vx * dt;
      p.vx *= Math.pow(0.08, dt);

      // Active hitbox frame!
      if (!p.attackHitDone && p.stateTimer >= p.attackDur * 0.22) {
        p.attackHitDone = true;
        this._resolvePlayerAttackHit();
      }

      if (p.state !== 'jumpAttack' && p.stateTimer >= p.attackDur) {
        p.state = 'idle';
      }
    } else {
      // Idle / Walk / Block
      if (this.keys.block && p.z === 0) {
        p.state = 'block';
        p.moving = false;
      } else {
        p.state = 'idle';
        const mx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
        const my = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
        const spdX = this.keys.dash ? 290 : 210;
        const spdY = 148;
        p.moving = mx !== 0 || my !== 0;
        if (mx !== 0) p.facing = mx;
        p.x += mx * spdX * dt;
        p.y += my * spdY * dt;
      }
    }

    // Clamp player within active camera lock or full stage
    const minX = this.camX + 26;
    const maxX = this.activeWave ? this.camX + VIEW_W - 26 : STAGE_LEN - 26;
    p.x = clamp(p.x, minX, maxX);
    p.y = clamp(p.y, STREET_TOP + 12, STREET_BOT);
  }

  _resolvePlayerAttackHit() {
    const p = this.player;
    const weapon = p.weapon;
    const isHeavy = p.attackMove === 'finisher' || p.attackMove === 'dash' || p.attackMove === 'jumpKick';
    const reach = weapon ? (weapon.kind === 'katana' ? 98 : 88) : isHeavy ? 78 : 66;
    const baseDmg = weapon ? (weapon.kind === 'katana' ? 24 : 20) : isHeavy ? 18 : 11;

    let hitSomething = false;

    // 1. Check enemies
    for (const e of this.enemies) {
      if (e.dead || e.state === 'knockdown') continue;
      const dx = (e.x - p.x) * p.facing;
      const dy = Math.abs(e.y - p.y);
      if (dx > -16 && dx < reach && dy < DEPTH_HIT_TOL) {
        this._damageEnemy(e, baseDmg, isHeavy);
        hitSomething = true;
      }
    }

    // 2. Check smashable street props (oil drums & crates)
    for (let i = this.props.length - 1; i >= 0; i--) {
      const pr = this.props[i];
      const dx = (pr.x - p.x) * p.facing;
      const dy = Math.abs(pr.y - p.y);
      if (dx > -12 && dx < reach && dy < 34) {
        pr.hp -= 1;
        pr.hitFlash = 0.14;
        hitSomething = true;
        this.audio.crateSmash();
        this._spawnHitSparks(pr.x, pr.y - 26, '#ff9d42', 10, false);
        if (pr.hp <= 0) {
          this.pickups.push({ kind: pr.drop, x: pr.x, y: pr.y });
          this.props.splice(i, 1);
          this.score += 200;
          this.popups.push({ x: pr.x, y: pr.y - 44, text: 'SMASH!', color: '#ffca3a', size: 17, life: 0.7, maxLife: 0.7 });
        }
      }
    }

    if (hitSomething) {
      if (weapon) {
        if (weapon.kind === 'katana') this.audio.katanaSlash();
        else this.audio.pipeClang();
        weapon.uses -= 1;
        if (weapon.uses <= 0) p.weapon = null;
      } else if (isHeavy) {
        this.audio.hitHeavy();
      } else {
        this.audio.hitLight();
      }
    }
  }

  _updateWolf(dt) {
    if (!this.wolf.active) return;
    this.wolf.x += this.wolf.facing * 880 * dt;
    // Mauls every enemy across the entire street!
    for (const e of this.enemies) {
      if (e.dead || this.wolf.hitIds.has(e.id)) continue;
      if (Math.abs(e.x - this.wolf.x) < 62) {
        this.wolf.hitIds.add(e.id);
        this._damageEnemy(e, 46, true, 'WOLF MAUL!');
        this.audio.katanaSlash();
      }
    }
    if (this.wolf.x < this.camX - 120 || this.wolf.x > this.camX + VIEW_W + 120) {
      this.wolf.active = false;
    }
  }

  _updateWaves() {
    if (this.activeWave) {
      const alive = this.enemies.some((e) => !e.dead);
      if (!alive) {
        this.activeWave.cleared = true;
        const wasBoss = this.activeWave.isBossWave;
        this.activeWave = null;
        if (wasBoss) {
          this.stageClear = true;
          this.audio.victory();
          this.score += Math.round(this.stageTimer * 50) + 2500;
          this.showBanner('STAGE 1 CLEAR!!', `FINAL SCORE ${this.score.toLocaleString()}`, 99);
        } else {
          this.goArrowTimer = 4.5;
          this.audio.goChime();
          this.showBanner('AREA CLEAR!', 'ADVANCE DOWN FALLEN STREET >>>', 2.0);
        }
      }
      return;
    }

    for (const w of this.waves) {
      if (!w.triggered && this.player.x >= w.triggerX) {
        w.triggered = true;
        this.activeWave = w;
        for (const sp of w.spawns) {
          this._spawnEnemy(sp.kind, sp.side, sp.y);
        }
        if (w.isBossWave) {
          this.audio.bossSiren();
          this.showBanner('WARNING: BOSS!', 'IGNITION REX BLOCKS THE STREET!', 2.4);
        }
        break;
      }
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    // Limit simultaneous active attackers to 2 so combat stays fair & arcade-readable
    let activeAttackers = this.enemies.filter((e) => !e.dead && (e.state === 'attack' || e.telegraphTimer > 0)).length;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

      // Vertical physics
      if (e.z > 0 || e.vz !== 0) {
        e.vz -= GRAVITY * dt;
        e.z += e.vz * dt;
        if (e.z <= 0) {
          e.z = 0;
          e.vz = 0;
          if (e.state === 'thrown') {
            e.state = 'knockdown';
            e.stateTimer = 0;
            this.audio.throwSlam();
            this.shakeTime = 0.16;
            this.shakeMag = 5;
          }
        }
      }

      if (e.dead) {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.06, dt);
        e.deadTimer -= dt;
        if (e.deadTimer <= 0) this.enemies.splice(i, 1);
        continue;
      }

      e.stateTimer += dt;

      // Thrown enemy bowls over other enemies!
      if (e.state === 'thrown') {
        e.x += e.vx * dt;
        for (const other of this.enemies) {
          if (other === e || other.dead || other.state === 'knockdown') continue;
          if (Math.abs(other.x - e.x) < 42 && Math.abs(other.y - e.y) < 30) {
            this._damageEnemy(other, 18, true, 'BOWLED!');
            this.audio.hitHeavy();
          }
        }
        continue;
      }

      if (e.state === 'knockdown') {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.05, dt);
        if (e.z === 0 && e.stateTimer > 0.72) {
          e.state = 'idle';
          e.aiCooldown = 0.45;
        }
        continue;
      }

      if (e.state === 'hurt') {
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.02, dt);
        if (e.stateTimer > 0.28) e.state = 'idle';
        continue;
      }

      if (e.state === 'attack') {
        if (!e.attackHitDone && e.stateTimer >= e.attackDur * 0.42) {
          e.attackHitDone = true;
          const dx = (p.x - e.x) * e.facing;
          const dy = Math.abs(p.y - e.y);
          if (dx > -14 && dx < e.range && dy < DEPTH_HIT_TOL && p.z < 36) {
            this._damagePlayer(e.dmg + (e.phase2 ? 4 : 0), e);
          }
        }
        if (e.stateTimer >= e.attackDur) {
          e.state = 'idle';
          e.aiCooldown = e.isBoss ? (e.phase2 ? 0.55 : 0.85) : 0.75 + Math.random() * 0.55;
        }
        continue;
      }

      // Telegraph windup before striking (gives player fair reaction time to parry/dodge!)
      if (e.telegraphTimer > 0) {
        e.telegraphTimer -= dt;
        e.moving = false;
        if (e.telegraphTimer <= 0) {
          e.state = 'attack';
          e.stateTimer = 0;
          e.attackHitDone = false;
          e.attackMove = e.isBoss && e.phase2 ? 'finisher' : 'jab';
          e.attackDur = e.kind === 'bruiser' ? 0.42 : 0.34;
          this.audio.whiff();
        }
        continue;
      }

      // AI Approach & Flanking
      e.aiCooldown = Math.max(0, e.aiCooldown - dt);
      const sideSign = e.x >= p.x ? 1 : -1;
      const targetX = p.x + sideSign * (e.range - 10);
      const targetY = p.y;
      const dx = targetX - e.x;
      const dy = targetY - e.y;
      e.facing = p.x >= e.x ? 1 : -1;

      if (Math.abs(dx) < 16 && Math.abs(dy) < 18 && e.aiCooldown <= 0 && activeAttackers < 2 && !this.gameOver) {
        e.telegraphTimer = e.kind === 'bruiser' ? 0.40 : e.isBoss ? 0.34 : 0.28;
        e.moving = false;
        activeAttackers += 1;
      } else {
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
          e.x += (dx / dist) * e.speed * dt;
          e.y += (dy / dist) * (e.speed * 0.72) * dt;
          e.moving = true;
        } else {
          e.moving = false;
        }
      }

      e.x = clamp(e.x, this.camX - 30, this.camX + VIEW_W + 30);
      e.y = clamp(e.y, STREET_TOP + 12, STREET_BOT);
    }
  }

  _updateEffects(dt) {
    for (const pr of this.props) {
      if (pr.hitFlash > 0) pr.hitFlash = Math.max(0, pr.hitFlash - dt);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      if (s.kind === 'spark') {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 520 * dt;
      }
      s.life -= dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 42 * dt;
      pop.life -= dt;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }
  }

  _updateCamera(dt) {
    let targetCamX = clamp(this.player.x - VIEW_W * 0.38, 0, STAGE_LEN - VIEW_W);
    if (this.activeWave) {
      targetCamX = this.activeWave.lockCamX;
    } else if (targetCamX < this.camX) {
      // Classic arcade beat-'em-up forward scroll lock
      targetCamX = this.camX;
    }
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 6.5);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / 0.24);
      ctx.translate((Math.random() - 0.5) * m * 2, (Math.random() - 0.5) * m * 2);
    }

    drawStageBackground(ctx, this.camX, this.time, this.riotFlash);

    // Depth-sorted entities (props, pickups, player, enemies, wolf) by ground Y!
    const drawList = [];
    for (const pr of this.props) drawList.push({ y: pr.y, fn: () => drawProp(ctx, pr, this.camX, this.time) });
    for (const it of this.pickups) drawList.push({ y: it.y, fn: () => drawPickup(ctx, it, this.camX, this.time) });
    drawList.push({ y: this.player.y, fn: () => drawFighter(ctx, this.player, this.camX, this.time) });
    for (const e of this.enemies) drawList.push({ y: e.y, fn: () => drawFighter(ctx, e, this.camX, this.time) });
    if (this.wolf.active) drawList.push({ y: this.wolf.y + 4, fn: () => drawWolfCompanion(ctx, this.wolf, this.camX, this.time) });

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.fn();

    drawEffects(ctx, this.sparks, this.popups, this.camX);
    drawRainOverlay(ctx, this.time);

    if (this.goArrowTimer > 0 && !this.activeWave && !this.stageClear) {
      drawGoArrow(ctx, this.time);
    }

    // Center Arcade Banner (Stage Start / Area Clear / Boss Warning / Clear / Game Over)
    if (this.bannerTimer > 0 && this.bannerText) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 8, 20, 0.82)';
      ctx.strokeStyle = this.stageClear ? '#54ff88' : this.gameOver ? '#ff3b30' : '#ffca3a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(VIEW_W * 0.5 - 245, 198, 490, 96, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.stageClear ? '#54ff88' : this.gameOver ? '#ff3b30' : '#ffca3a';
      ctx.font = '900 32px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.bannerText, VIEW_W * 0.5, 232);

      if (this.bannerSub) {
        ctx.fillStyle = '#f6efe2';
        ctx.font = '800 14px "Arial Black", sans-serif';
        ctx.fillText(this.bannerSub, VIEW_W * 0.5, 268);
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
