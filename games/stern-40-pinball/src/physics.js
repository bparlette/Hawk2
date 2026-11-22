// Stern Pinball 40th Anniversary — 8x Sub-Stepped 2D Pinball Physics & Rules Engine

import { BALL_R, TABLE_H, TABLE_W, buildTable } from './table.js';

const GRAVITY = 880;
const MAX_SPEED = 1480;
const SUBSTEPS = 8;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return { x: x1, y: y1, t: 0 };
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return { x: x1 + dx * t, y: y1 + dy * t, t };
}

function samplePolyline(pts, u) {
  const totalSegs = pts.length - 1;
  const scaled = clamp(u, 0, 1) * totalSegs;
  const idx = Math.min(totalSegs - 1, Math.floor(scaled));
  const f = scaled - idx;
  const a = pts[idx];
  const b = pts[idx + 1];
  return {
    x: a[0] + (b[0] - a[0]) * f,
    y: a[1] + (b[1] - a[1]) * f,
  };
}

export class PinballEngine {
  constructor(audio) {
    this.audio = audio;
    this.table = buildTable();
    this.highScore = this._loadHighScore();
    this.resetGame();
  }

  _loadHighScore() {
    try {
      const v = Number(localStorage.getItem('stern40_highscore') || '0');
      return Number.isFinite(v) ? v : 0;
    } catch (_) {
      return 0;
    }
  }

  _saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('stern40_highscore', String(this.highScore));
      } catch (_) {}
    }
  }

  resetGame() {
    this.table = buildTable();
    this.score = 0;
    this.ballNum = 1;
    this.maxBalls = 3;
    this.multiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.rampCount = 0;
    this.vortexCount = 0;
    this.multiballActive = false;
    this.ballSaveTimer = 0;
    this.kickbackLit = true;
    this.tilted = false;
    this.nudgeWarnings = 0;
    this.nudgeDecayTimer = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.gameOver = false;
    this.started = false;
    this.time = 0;

    // Plunger state
    this.plungerCharging = false;
    this.plungerCharge = 0; // 0..1

    // Visual effects
    this.sparks = [];
    this.popups = [];

    // DMD status message
    this.dmdText = 'STERN 40TH ANNIVERSARY';
    this.dmdSub = 'PULL PLUNGER OR PRESS SPACE';
    this.dmdTimer = 0;

    this.balls = [];
    this._spawnBallInShooter();
  }

  _spawnBallInShooter() {
    this.balls.push({
      x: this.table.shooterX,
      y: this.table.shooterRestY,
      vx: 0,
      vy: 0,
      inShooter: true,
      mode: 'field', // 'field' | 'ramp' | 'vortex'
      rampU: 0,
      vortexAngle: 0,
      vortexProgress: 0,
      vortexCooldown: 0,
      rampCooldown: 0,
      trail: [],
    });
  }

  _spawnPlayfieldBall(x, y, vx, vy) {
    this.balls.push({
      x,
      y,
      vx,
      vy,
      inShooter: false,
      mode: 'field',
      rampU: 0,
      vortexAngle: 0,
      vortexProgress: 0,
      vortexCooldown: 1.5,
      rampCooldown: 1.0,
      trail: [],
    });
  }

  setDmd(text, sub = '', duration = 2.6) {
    this.dmdText = text;
    this.dmdSub = sub;
    this.dmdTimer = duration;
  }

  addScore(points, x, y, label = null, color = '#ffca3a') {
    const total = Math.round(points * this.multiplier);
    this.score += total;
    this._saveHighScore();
    if (x != null && y != null) {
      const txt = label || `+${total.toLocaleString()}`;
      this.popups.push({
        x,
        y,
        text: txt,
        color,
        life: 0.95,
        maxLife: 0.95,
      });
    }
    return total;
  }

  spawnSparks(x, y, color = '#ffca3a', count = 10, speed = 260) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        size: 2.2 + Math.random() * 2.8,
        life: 0.32 + Math.random() * 0.25,
        maxLife: 0.55,
      });
    }
  }

  setFlipper(side, pressed) {
    if (this.tilted || this.gameOver) {
      for (const f of this.table.flippers) f.pressed = false;
      return;
    }
    const f = this.table.flippers.find((fl) => fl.side === side);
    if (!f) return;
    if (f.pressed !== pressed) {
      f.pressed = pressed;
      this.audio.flipper(pressed);
    }
  }

  startPlunger() {
    if (this.gameOver) {
      this.resetGame();
      return;
    }
    this.plungerCharging = true;
  }

  releasePlunger(forcedPower = null) {
    if (this.gameOver) return;
    const power = forcedPower != null ? forcedPower : Math.max(0.58, this.plungerCharge);
    this.plungerCharging = false;
    this.plungerCharge = 0;

    let launched = false;
    for (const b of this.balls) {
      if (b.inShooter && b.y > 760) {
        // Strong enough to clear top arch smoothly into upper lanes
        b.vy = -(1040 + power * 360);
        b.vx = (Math.random() - 0.5) * 14;
        b.inShooter = false;
        launched = true;
      }
    }
    if (launched) {
      this.started = true;
      this.ballSaveTimer = Math.max(this.ballSaveTimer, 10.0);
      this.audio.plungerRelease(power);
      this.setDmd(`BALL ${this.ballNum} IN PLAY`, 'SHOOT STERN RAMP & YEARS!', 2.2);
      this.spawnSparks(this.table.shooterX, this.table.shooterRestY - 12, '#ffca3a', 12, 220);
    }
  }

  nudge(dirX = 0) {
    if (this.gameOver || this.tilted) return;
    const active = this.balls.some((b) => !b.inShooter && b.mode === 'field');
    if (!active) return;

    this.nudgeWarnings += 1;
    this.nudgeDecayTimer = 3.2;
    this.shakeTime = 0.22;
    this.shakeMag = 6.5;

    if (this.nudgeWarnings >= 3) {
      this.tilted = true;
      for (const f of this.table.flippers) f.pressed = false;
      this.audio.tilt();
      this.setDmd('TILT!', 'FLIPPERS LOCKED', 3.0);
      return;
    }

    this.audio.nudge();
    const impulseX = dirX !== 0 ? dirX * 150 : (Math.random() - 0.5) * 180;
    for (const b of this.balls) {
      if (!b.inShooter && b.mode === 'field') {
        b.vx += impulseX;
        b.vy -= 95;
      }
    }
    this.setDmd(this.nudgeWarnings === 2 ? 'DANGER! DANGER!' : 'WARNING: NUDGE', 'CAREFUL — TILT NEAR', 1.4);
  }

  triggerMultiball() {
    if (this.gameOver) this.resetGame();
    // Ensure at least one ball is active in playfield
    for (const b of this.balls) {
      if (b.inShooter) {
        b.x = 240;
        b.y = 180;
        b.vx = -120;
        b.vy = 160;
        b.inShooter = false;
      }
    }
    this.started = true;
    this.multiballActive = true;
    this.ballSaveTimer = Math.max(this.ballSaveTimer, 14.0);
    this.audio.multiballFanfare();
    this.addScore(50000, 260, 440, '40TH MULTIBALL!', '#ff4842');
    this.setDmd('40TH MULTIBALL!!', '3 BALLS — SHOOT EVERYTHING!', 3.6);
    this.shakeTime = 0.35;
    this.shakeMag = 7;

    while (this.balls.length < 3) {
      const idx = this.balls.length;
      const vx = idx === 1 ? -190 : 185;
      this._spawnPlayfieldBall(255 + (idx === 1 ? -34 : 34), 175, vx, 90);
      this.spawnSparks(255, 175, '#3be8ff', 14, 300);
    }
  }

  _lightNextSternInsert() {
    const next = this.table.sternInserts.find((ins) => !ins.lit);
    if (next) {
      next.lit = true;
      next.flash = 1.0;
      this.spawnSparks(next.x, next.y, '#ffca3a', 10, 220);
    }
    if (this.table.sternInserts.every((ins) => ins.lit)) {
      this.addScore(100000, 255, 580, 'STERN JACKPOT!', '#3be8ff');
      this.setDmd('STERN 40TH JACKPOT!', '+100K + BALL SAVE LIT', 3.2);
      this.audio.multiballFanfare();
      this.ballSaveTimer = Math.max(this.ballSaveTimer, 12.0);
      this.kickbackLit = true;
      for (const ins of this.table.sternInserts) {
        ins.lit = false;
        ins.flash = 1.0;
      }
    }
  }

  step(dt) {
    const clampedDt = Math.min(dt, 0.033);
    this.time += clampedDt;

    // Plunger charging
    if (this.plungerCharging) {
      this.plungerCharge = clamp(this.plungerCharge + clampedDt * 1.15, 0, 1);
    }

    // Timers
    if (this.comboTimer > 0) {
      this.comboTimer -= clampedDt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    if (this.ballSaveTimer > 0) {
      this.ballSaveTimer = Math.max(0, this.ballSaveTimer - clampedDt);
    }
    if (this.nudgeDecayTimer > 0) {
      this.nudgeDecayTimer -= clampedDt;
      if (this.nudgeDecayTimer <= 0 && !this.tilted) {
        this.nudgeWarnings = Math.max(0, this.nudgeWarnings - 1);
      }
    }
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - clampedDt);
    }
    if (this.dmdTimer > 0) {
      this.dmdTimer -= clampedDt;
      if (this.dmdTimer <= 0 && !this.gameOver) {
        this.dmdText = this.multiballActive
          ? '40TH MULTIBALL ACTIVE'
          : `SCORE ${this.score.toLocaleString()}`;
        this.dmdSub = this.ballSaveTimer > 0
          ? `BALL SAVE ${Math.ceil(this.ballSaveTimer)}S  •  ${this.multiplier}X`
          : `BALL ${this.ballNum}/${this.maxBalls}  •  ${this.multiplier}X MULTIPLIER`;
      }
    }

    // Decay visual flashes
    const decay = clampedDt * 3.4;
    this.table.slingshot4.flash = Math.max(0, this.table.slingshot4.flash - decay);
    this.table.slingshotRight.flash = Math.max(0, this.table.slingshotRight.flash - decay);
    this.table.sternRamp.flash = Math.max(0, this.table.sternRamp.flash - decay * 0.7);
    this.table.vortex.flash = Math.max(0, this.table.vortex.flash - decay * 0.7);
    this.table.vortex.spinPhase += clampedDt * (this.table.vortex.flash > 0 ? 7.5 : 2.1);
    for (const b of this.table.bumpers) b.flash = Math.max(0, b.flash - decay);
    for (const r of this.table.rollovers) r.flash = Math.max(0, r.flash - decay);
    for (const d of this.table.dropTargets) d.flash = Math.max(0, d.flash - decay);
    for (const ins of this.table.sternInserts) ins.flash = Math.max(0, ins.flash - decay);

    // Update sparks & popups
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * clampedDt;
      s.y += s.vy * clampedDt;
      s.vy += 420 * clampedDt;
      s.life -= clampedDt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y -= 36 * clampedDt;
      p.life -= clampedDt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    if (this.gameOver) return;

    // 8x sub-stepped physics loop
    const subDt = clampedDt / SUBSTEPS;
    for (let stepIdx = 0; stepIdx < SUBSTEPS; stepIdx++) {
      this._stepFlippers(subDt);
      this._stepBalls(subDt);
      this._collideBallToBall();
    }

    // Update ball trails & handle drained balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();

      if (b.y > TABLE_H + 28) {
        this._handleDrain(i);
      }
    }
  }

  _stepFlippers(dt) {
    for (const f of this.table.flippers) {
      f.prevAngle = f.angle;
      const target = f.pressed ? f.activeAngle : f.restAngle;
      const speed = f.pressed ? 24.0 : 14.5;
      const diff = target - f.angle;
      const maxStep = speed * dt;
      if (Math.abs(diff) <= maxStep) {
        f.angle = target;
      } else {
        f.angle += Math.sign(diff) * maxStep;
      }
      f.omega = (f.angle - f.prevAngle) / dt;
    }
  }

  _stepBalls(dt) {
    const {
      walls,
      bumpers,
      rollovers,
      dropTargets,
      vortex,
      sternRamp,
      flippers,
      oneWayGate,
    } = this.table;

    for (const b of this.balls) {
      if (b.vortexCooldown > 0) b.vortexCooldown -= dt;
      if (b.rampCooldown > 0) b.rampCooldown -= dt;

      // Mode 1: Riding elevated crimson S-T-E-R-N wireform ramp
      if (b.mode === 'ramp') {
        b.rampU += dt * 0.78;
        const pos = samplePolyline(sternRamp.path, b.rampU);
        b.vx = (pos.x - b.x) / Math.max(dt, 1e-4);
        b.vy = (pos.y - b.y) / Math.max(dt, 1e-4);
        b.x = pos.x;
        b.y = pos.y;
        if (Math.random() < 0.25) {
          this.spawnSparks(b.x, b.y, '#ffca3a', 1, 90);
        }
        if (b.rampU >= 1) {
          b.mode = 'field';
          b.rampCooldown = 1.4;
          b.vx = 18;
          b.vy = 240;
        }
        continue;
      }

      // Mode 2: Swirling inside lower-right "0" spiral whirlpool vortex
      if (b.mode === 'vortex') {
        b.vortexProgress += dt * 1.15;
        b.vortexAngle += dt * 9.8;
        const radius = 34 * (1 - 0.55 * Math.sin(b.vortexProgress * Math.PI));
        b.x = vortex.x + Math.cos(b.vortexAngle) * radius;
        b.y = vortex.y + Math.sin(b.vortexAngle) * radius;
        if (Math.random() < 0.25) {
          this.spawnSparks(b.x, b.y, '#3be8ff', 1, 110);
        }
        if (b.vortexProgress >= 1.0) {
          b.mode = 'field';
          b.vortexCooldown = 1.9;
          // Eject smoothly up-left toward center/flippers
          b.x = vortex.x - 28;
          b.y = vortex.y - 26;
          b.vx = -290 - Math.random() * 90;
          b.vy = -340 - Math.random() * 80;
          this.spawnSparks(vortex.x, vortex.y, '#3be8ff', 14, 260);
        }
        continue;
      }

      // Standard playfield physics
      if (b.inShooter) {
        const restY = this.table.shooterRestY + this.plungerCharge * 18;
        b.x = this.table.shooterX;
        b.y = restY;
        b.vx = 0;
        b.vy = 0;
        continue;
      }

      // Integrate gravity & light air/playfield drag
      b.vy += GRAVITY * dt;
      b.vx *= 1 - 0.06 * dt;
      b.vy *= 1 - 0.06 * dt;

      // Speed cap
      const spd = Math.hypot(b.vx, b.vy);
      if (spd > MAX_SPEED) {
        const s = MAX_SPEED / spd;
        b.vx *= s;
        b.vy *= s;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Left outlane kickback rescue (when ball falls down left outlane x < 56, y > 715)
      if (this.kickbackLit && !this.tilted && b.x < 56 && b.y > 710 && b.y < 758 && b.vy > 0) {
        b.vy = -820;
        b.vx = 95;
        this.kickbackLit = false;
        this.audio.slingshot();
        this.addScore(10000, b.x + 14, b.y - 10, 'KICKBACK!', '#3be8ff');
        this.setDmd('LEFT KICKBACK!', 'SAVED FROM OUTLANE', 1.8);
        this.spawnSparks(b.x, b.y, '#3be8ff', 14, 280);
      }

      // One-way gate at top of shooter lane
      if (b.x > 466 && b.y > 205 && b.y < 270) {
        const cp = closestPointOnSegment(b.x, b.y, oneWayGate.x1, oneWayGate.y1, oneWayGate.x2, oneWayGate.y2);
        const dx = b.x - cp.x;
        const dy = b.y - cp.y;
        const dist = Math.hypot(dx, dy);
        // Only block when ball is trying to drop DOWN or RIGHT back into shooter lane
        if (dist < BALL_R && dist > 1e-5 && (b.vy > -20 || b.vx > 20) && b.x < 495) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cp.x + nx * BALL_R;
          b.y = cp.y + ny * BALL_R;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.55 * vn * nx;
            b.vy -= 1.55 * vn * ny;
          }
        }
      }

      // Collide with static walls & slingshots
      for (const w of walls) {
        const cp = closestPointOnSegment(b.x, b.y, w.x1, w.y1, w.x2, w.y2);
        const dx = b.x - cp.x;
        const dy = b.y - cp.y;
        const dist = Math.hypot(dx, dy);
        if (dist < BALL_R && dist > 1e-6) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cp.x + nx * BALL_R;
          b.y = cp.y + ny * BALL_R;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            const e = w.restitution;
            b.vx -= (1 + e) * vn * nx;
            b.vy -= (1 + e) * vn * ny;

            if ((w.tag === 'sling4' || w.tag === 'slingR') && !this.tilted) {
              const sling = w.tag === 'sling4' ? this.table.slingshot4 : this.table.slingshotRight;
              b.vx += nx * sling.kick * 0.55;
              b.vy += ny * sling.kick * 0.55;
              sling.flash = 1.0;
              this.audio.slingshot();
              this.addScore(1500, cp.x, cp.y, w.tag === 'sling4' ? '4-SLING!' : '+1,500', '#7cc6ff');
              this.spawnSparks(cp.x, cp.y, '#7cc6ff', 8, 240);
            }
          }
        }
      }

      // Collide with Pop Bumpers
      for (const bmp of bumpers) {
        const dx = b.x - bmp.x;
        const dy = b.y - bmp.y;
        const dist = Math.hypot(dx, dy);
        const minDist = BALL_R + bmp.r;
        if (dist < minDist && dist > 1e-5) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = bmp.x + nx * minDist;
          b.y = bmp.y + ny * minDist;
          const kick = this.tilted ? 180 : 540;
          b.vx = nx * kick + (Math.random() - 0.5) * 45;
          b.vy = ny * kick + (Math.random() - 0.5) * 45;
          if (!this.tilted) {
            bmp.flash = 1.0;
            this.audio.bumper(bmp.id);
            this.addScore(bmp.points, bmp.x, bmp.y - bmp.r, null, '#ffca3a');
            this.spawnSparks(bmp.x + nx * bmp.r, bmp.y + ny * bmp.r, '#ffca3a', 10, 260);
          }
        }
      }

      // Collide with "Y-E-A-R-S-!" 6-Bank Drop Targets
      for (const dtgt of dropTargets) {
        const cp = closestPointOnSegment(b.x, b.y, dtgt.x1, dtgt.y1, dtgt.x2, dtgt.y2);
        const dx = b.x - cp.x;
        const dy = b.y - cp.y;
        const dist = Math.hypot(dx, dy);
        const hitR = BALL_R + 4;
        if (dist < hitR && dist > 1e-5) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cp.x + nx * hitR;
          b.y = cp.y + ny * hitR;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.72 * vn * nx;
            b.vy -= 1.72 * vn * ny;
          }
          if (!this.tilted && !dtgt.down) {
            dtgt.down = true;
            dtgt.flash = 1.0;
            const downCount = dropTargets.filter((d) => d.down).length;
            this.audio.dropTarget(downCount);
            this.addScore(5000, dtgt.cx - 12, dtgt.cy, `YEARS: ${dtgt.letter}`, '#ff6454');
            this.spawnSparks(dtgt.cx, dtgt.cy, '#ff6454', 10, 250);

            if (downCount === dropTargets.length) {
              // Completed all 6 Y-E-A-R-S-! targets -> 40TH ANNIVERSARY MULTIBALL!
              for (const d of dropTargets) {
                d.down = false;
                d.flash = 1.0;
              }
              this.triggerMultiball();
            } else {
              this.setDmd(`Y-E-A-R-S-! (${downCount}/6)`, 'COMPLETE FOR 40TH MULTIBALL', 1.8);
            }
          }
        }
      }

      // Top Rollover Lanes (4 - 0 - TH)
      if (!this.tilted) {
        for (const ro of rollovers) {
          const dist = Math.hypot(b.x - ro.x, b.y - ro.y);
          if (dist < ro.r && ro.flash <= 0.1) {
            ro.flash = 1.0;
            ro.lit = true;
            this.audio.rollover(ro.id);
            this.addScore(2000, ro.x, ro.y - 12, ro.label, '#3be8ff');
            if (rollovers.every((r) => r.lit)) {
              this.multiplier = Math.min(5, this.multiplier + 1);
              for (const r of rollovers) {
                r.lit = false;
                r.flash = 1.0;
              }
              this.addScore(15000, 240, 120, `${this.multiplier}X BONUS!`, '#ffca3a');
              this.setDmd(`${this.multiplier}X PLAYFIELD!`, 'TOP LANES COMPLETED', 2.2);
              this.audio.vortexSwirl();
            }
          }
        }
      }

      // Lower-Right "0" Spiral Whirlpool Vortex Capture
      if (!this.tilted && b.vortexCooldown <= 0) {
        const dv = Math.hypot(b.x - vortex.x, b.y - vortex.y);
        if (dv < vortex.captureR) {
          b.mode = 'vortex';
          b.vortexProgress = 0;
          b.vortexAngle = Math.atan2(b.y - vortex.y, b.x - vortex.x);
          vortex.flash = 1.0;
          this.vortexCount += 1;
          this.audio.vortexSwirl();
          this.addScore(15000, vortex.x, vortex.y - 34, '0-VORTEX!', '#3be8ff');
          this.setDmd('0-SPIRAL VORTEX!', `+${(15000 * this.multiplier).toLocaleString()} PTS`, 2.2);
          this._lightNextSternInsert();
          continue;
        }
      }

      // Elevated Crimson "S-T-E-R-N" Wireform Ramp Entry (shot upward into mid-left mouth)
      if (!this.tilted && b.rampCooldown <= 0 && b.vy < -160) {
        const dr = Math.hypot(b.x - sternRamp.entryX, b.y - sternRamp.entryY);
        if (dr < sternRamp.entryR) {
          b.mode = 'ramp';
          b.rampU = 0;
          sternRamp.flash = 1.0;
          this.rampCount += 1;
          this.comboCount += 1;
          this.comboTimer = 6.5;
          const rampPts = 20000 * Math.min(4, this.comboCount);
          this.audio.rampWhoosh();
          this.addScore(rampPts, sternRamp.entryX + 40, sternRamp.entryY - 24,
            this.comboCount > 1 ? `STERN ${this.comboCount}X!` : 'STERN RAMP!', '#ffca3a');
          this.setDmd('S-T-E-R-N RAMP!', `COMBO ${this.comboCount}X  •  +${(rampPts * this.multiplier).toLocaleString()}`, 2.4);
          this._lightNextSternInsert();
          this.spawnSparks(sternRamp.entryX, sternRamp.entryY, '#ffca3a', 14, 280);
          continue;
        }
      }

      // Swept Rotating Capsule Flippers
      for (const f of flippers) {
        const tipX = f.x + Math.cos(f.angle) * f.length;
        const tipY = f.y + Math.sin(f.angle) * f.length;
        const cp = closestPointOnSegment(b.x, b.y, f.x, f.y, tipX, tipY);
        const dx = b.x - cp.x;
        const dy = b.y - cp.y;
        const dist = Math.hypot(dx, dy);
        const minDist = BALL_R + f.radius;
        if (dist < minDist && dist > 1e-6) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = cp.x + nx * minDist;
          b.y = cp.y + ny * minDist;

          // Surface velocity of the flipper at contact point: v = omega x r
          const rx = cp.x - f.x;
          const ry = cp.y - f.y;
          const svx = -f.omega * ry;
          const svy = f.omega * rx;

          const rvx = b.vx - svx;
          const rvy = b.vy - svy;
          const vn = rvx * nx + rvy * ny;

          if (vn < 0) {
            const restitution = Math.abs(f.omega) > 2 ? 0.62 : 0.32;
            b.vx -= (1 + restitution) * vn * nx;
            b.vy -= (1 + restitution) * vn * ny;

            // Extra crisp arcade punch on active upward swing
            if (Math.abs(f.omega) > 4) {
              const leverage = 0.45 + 0.55 * cp.t;
              b.vx += svx * 0.28 * leverage;
              b.vy += svy * 0.28 * leverage;
            }
          }
        }
      }

      // Safety bounds clamp inside cabinet
      if (b.x < 24 + BALL_R) {
        b.x = 24 + BALL_R;
        if (b.vx < 0) b.vx *= -0.5;
      }
      if (b.x > 518 - BALL_R) {
        b.x = 518 - BALL_R;
        if (b.vx > 0) b.vx *= -0.5;
      }
      if (b.y < 20 + BALL_R) {
        b.y = 20 + BALL_R;
        if (b.vy < 0) b.vy *= -0.5;
      }
    }
  }

  _collideBallToBall() {
    const n = this.balls.length;
    if (n < 2) return;
    const minDist = BALL_R * 2;
    for (let i = 0; i < n; i++) {
      const a = this.balls[i];
      if (a.mode !== 'field' || a.inShooter) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.balls[j];
        if (b.mode !== 'field' || b.inShooter) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist && dist > 1e-5) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const vn = rvx * nx + rvy * ny;
          if (vn < 0) {
            const imp = -0.92 * vn;
            a.vx -= imp * nx;
            a.vy -= imp * ny;
            b.vx += imp * nx;
            b.vy += imp * ny;
          }
        }
      }
    }
  }

  _handleDrain(index) {
    this.balls.splice(index, 1);

    // If multiball still has balls in play, keep going!
    if (this.balls.length > 0) {
      if (this.balls.length === 1) this.multiballActive = false;
      return;
    }

    // Ball Save active -> instant free re-launch!
    if (this.ballSaveTimer > 0 && !this.tilted) {
      this._spawnPlayfieldBall(255, 175, (Math.random() - 0.5) * 140, 120);
      this.ballSaveTimer = 0;
      this.audio.vortexSwirl();
      this.setDmd('BALL SAVED!', 'SHOOT AGAIN — FREE BALL', 2.4);
      this.spawnSparks(255, 175, '#3be8ff', 16, 280);
      return;
    }

    this.audio.drain();
    this.multiballActive = false;
    this.tilted = false;
    this.nudgeWarnings = 0;
    this.multiplier = 1;
    this.kickbackLit = true;

    if (this.ballNum < this.maxBalls) {
      this.ballNum += 1;
      this._spawnBallInShooter();
      this.setDmd(`BALL ${this.ballNum} READY`, 'PULL PLUNGER TO LAUNCH', 3.0);
    } else {
      this.gameOver = true;
      this._saveHighScore();
      this.setDmd('GAME OVER', `FINAL ${this.score.toLocaleString()} — TAP TO REPLAY`, 99);
    }
  }
}
