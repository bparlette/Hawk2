// Stern Pinball 40th Anniversary Poster — Hand-Inked Screen-Print 2D Canvas Renderer

import { BALL_R, EDITIONS, TABLE_H, TABLE_W } from './table.js';

export class PinballRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.editionKey = 'dark';
    this.halftonePattern = null;
    this._halftoneColor = null;
  }

  setEdition(key) {
    if (EDITIONS[key]) {
      this.editionKey = key;
      this.halftonePattern = null;
    }
  }

  getEdition() {
    return EDITIONS[this.editionKey] || EDITIONS.dark;
  }

  _getHalftone(ctx, color) {
    if (this.halftonePattern && this._halftoneColor === color) {
      return this.halftonePattern;
    }
    const tile = document.createElement('canvas');
    tile.width = 14;
    tile.height = 14;
    const tctx = tile.getContext('2d');
    tctx.fillStyle = color;
    tctx.beginPath();
    tctx.arc(3.5, 3.5, 1.45, 0, Math.PI * 2);
    tctx.arc(10.5, 10.5, 1.45, 0, Math.PI * 2);
    tctx.fill();
    this.halftonePattern = ctx.createPattern(tile, 'repeat');
    this._halftoneColor = color;
    return this.halftonePattern;
  }

  render(engine) {
    const ctx = this.ctx;
    const pal = this.getEdition();
    const t = engine.time;

    ctx.save();

    // Screen shake on nudge / multiball
    if (engine.shakeTime > 0) {
      const s = engine.shakeMag * (engine.shakeTime / 0.3);
      ctx.translate((Math.random() - 0.5) * s * 2, (Math.random() - 0.5) * s * 2);
    }

    // 1. Poster Edition Backdrop
    this._drawBackdrop(ctx, pal, t);

    // 2. Playfield Base Arch & Cabinet Frame
    this._drawPlayfieldBase(ctx, pal, t);

    // 3. Top Rollover Lanes (4 - 0 - TH)
    this._drawRollovers(ctx, engine, pal);

    // 4. Center Playfield S-T-E-R-N Inserts + Ball Save + Kickback
    this._drawCenterInserts(ctx, engine, pal, t);

    // 5. Lower-Right "0" Spiral Whirlpool Vortex
    this._drawVortex0(ctx, engine, pal);

    // 6. Lower-Left "4" Slingshot & Right Slingshot
    this._drawSlingshot4(ctx, engine, pal);
    this._drawSlingshotRight(ctx, engine, pal);

    // 7. "Y-E-A-R-S-!" 6-Bank Drop Targets
    this._drawYearsTargets(ctx, engine, pal);

    // 8. Static Walls, Inlanes, Guides, Shooter Divider
    this._drawWallsAndGuides(ctx, engine, pal);

    // 9. Pop Bumpers (40 - TH - ★)
    this._drawBumpers(ctx, engine, pal);

    // 10. Spring Plunger in Shooter Lane
    this._drawPlunger(ctx, engine, pal);

    // 11. Mechanical Flippers
    this._drawFlippers(ctx, engine, pal);

    // 12. Playfield-level Balls (under elevated S-T-E-R-N track)
    for (const b of engine.balls) {
      if (b.mode !== 'ramp') this._drawBall(ctx, b, pal);
    }

    // 13. Elevated Crimson "S - T - E - R - N" Poster Wireform Track (iconic centerpiece!)
    this._drawSternElevatedTrack(ctx, engine, pal, t);

    // 14. Ramp-riding Balls (on top of elevated crimson S-T-E-R-N track!)
    for (const b of engine.balls) {
      if (b.mode === 'ramp') this._drawBall(ctx, b, pal, true);
    }

    // 15. Bottom Apron & Poster Edition Stamp
    this._drawApron(ctx, engine, pal);

    // 16. Sparks & Comic Starburst Popups
    this._drawSparks(ctx, engine);
    this._drawPopups(ctx, engine, pal);

    // 17. TILT / Game Over Overlay Banner (lightweight, crisp)
    if (engine.tilted) {
      this._drawBanner(ctx, 'TILT!', 'FLIPPERS LOCKED', '#ff3b30', pal);
    } else if (engine.gameOver) {
      this._drawBanner(ctx, 'GAME OVER', `FINAL SCORE ${engine.score.toLocaleString()}`, pal.gold, pal);
    }

    ctx.restore();
  }

  _drawBackdrop(ctx, pal, t) {
    if (pal.foil) {
      // Iridescent holographic rainbow foil gradient that shimmers smoothly
      const shift = (Math.sin(t * 0.7) * 0.5 + 0.5) * 140;
      const g = ctx.createLinearGradient(0, 0, TABLE_W + shift, TABLE_H);
      g.addColorStop(0.0, '#ffd4e5');
      g.addColorStop(0.18, '#fff2b8');
      g.addColorStop(0.36, '#bff5da');
      g.addColorStop(0.54, '#bce6ff');
      g.addColorStop(0.72, '#dec8ff');
      g.addColorStop(0.88, '#ffc8e2');
      g.addColorStop(1.0, '#ffe8b8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);

      // Diagonal holographic sheen sweep
      const sheenX = ((t * 90) % (TABLE_W * 2.2)) - TABLE_W * 0.6;
      const sg = ctx.createLinearGradient(sheenX, 0, sheenX + 180, TABLE_H);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.28)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, TABLE_H);
      g.addColorStop(0, pal.bgTop);
      g.addColorStop(1, pal.bgBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    }

    // Halftone dot print texture
    ctx.fillStyle = this._getHalftone(ctx, pal.halftone);
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
  }

  _drawPlayfieldBase(ctx, pal, t) {
    // Arch-shaped inner playfield surface
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(24, 865);
    ctx.lineTo(24, 266);
    ctx.arc(271, 266, 247, Math.PI, 0, false);
    ctx.lineTo(518, 865);
    ctx.closePath();

    if (pal.foil) {
      const g = ctx.createLinearGradient(24, 20, 518, 865);
      g.addColorStop(0, 'rgba(255, 246, 232, 0.72)');
      g.addColorStop(0.45, 'rgba(218, 240, 255, 0.68)');
      g.addColorStop(1, 'rgba(242, 224, 255, 0.74)');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(260, 420, 40, 260, 450, 460);
      g.addColorStop(0, pal.playfieldInner);
      g.addColorStop(1, pal.playfieldBg);
      ctx.fillStyle = g;
    }
    ctx.fill();

    // Subtle halftone overlay inside playfield
    ctx.fillStyle = this._getHalftone(ctx, pal.halftone);
    ctx.fill();

    // Decorative comic sunburst rays behind center playfield
    ctx.save();
    ctx.clip();
    ctx.translate(258, 450);
    ctx.fillStyle = pal.foil ? 'rgba(255,255,255,0.16)' : 'rgba(255,220,140,0.045)';
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2 + t * 0.04;
      const a1 = a0 + Math.PI / 32;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * 520, Math.sin(a0) * 520);
      ctx.lineTo(Math.cos(a1) * 520, Math.sin(a1) * 520);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Shooter lane subtle tint
    ctx.fillStyle = pal.foil ? 'rgba(40,35,70,0.10)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(486, 246, 32, 619);

    // Bold comic ink outer cabinet rim (rebuild arch path explicitly)
    ctx.beginPath();
    ctx.moveTo(24, 865);
    ctx.lineTo(24, 266);
    ctx.arc(271, 266, 247, Math.PI, 0, false);
    ctx.lineTo(518, 865);
    ctx.closePath();
    ctx.lineWidth = 6;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    ctx.restore();
  }

  _drawRollovers(ctx, engine, pal) {
    for (const r of engine.table.rollovers) {
      ctx.save();
      const lit = r.lit || r.flash > 0.1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fillStyle = lit ? pal.gold : pal.blueDeep;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      if (lit) {
        ctx.shadowColor = pal.gold;
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = lit ? pal.ink : pal.cream;
      ctx.font = '900 12px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, r.x, r.y + 1);
      ctx.restore();
    }
  }

  _drawCenterInserts(ctx, engine, pal, t) {
    // "40TH ANNIVERSARY" crest subtle watermark in center playfield
    ctx.save();
    ctx.fillStyle = pal.foil ? 'rgba(22,20,38,0.22)' : 'rgba(247,239,216,0.14)';
    ctx.font = '900 15px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STERN PINBALL • EST. 1986', 255, 535);
    ctx.restore();

    // 5 glowing S - T - E - R - N inserts in an arc above the flippers
    for (const ins of engine.table.sternInserts) {
      ctx.save();
      const lit = ins.lit || ins.flash > 0.1;
      ctx.beginPath();
      ctx.arc(ins.x, ins.y, ins.r, 0, Math.PI * 2);
      ctx.fillStyle = lit ? pal.gold : pal.blueDeep;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      if (lit) {
        ctx.beginPath();
        ctx.arc(ins.x, ins.y, ins.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 202, 58, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.fillStyle = lit ? pal.ink : pal.cream;
      ctx.font = '900 14px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ins.letter, ins.x, ins.y + 1);
      ctx.restore();
    }

    // Center BALL SAVE indicator between flippers
    const saveLit = engine.ballSaveTimer > 0;
    const blink = saveLit && (engine.ballSaveTimer > 3 || Math.floor(t * 10) % 2 === 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(255, 742, 19, 0, Math.PI * 2);
    ctx.fillStyle = blink ? pal.trackFill : pal.blueDeep;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();
    ctx.fillStyle = pal.cream;
    ctx.font = '900 8px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BALL', 255, 738);
    ctx.fillText('SAVE', 255, 748);
    ctx.restore();

    // Left outlane KICKBACK indicator
    ctx.save();
    ctx.beginPath();
    ctx.arc(42, 718, 12, 0, Math.PI * 2);
    ctx.fillStyle = engine.kickbackLit ? pal.cyan : pal.blueDeep;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();
    ctx.fillStyle = engine.kickbackLit ? pal.ink : pal.cream;
    ctx.font = '900 11px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↑', 42, 718);
    ctx.restore();
  }

  _drawVortex0(ctx, engine, pal) {
    const v = engine.table.vortex;
    ctx.save();
    ctx.translate(v.x, v.y);

    // Outer drop shadow
    ctx.beginPath();
    ctx.arc(4, 6, v.outerR + 3, 0, Math.PI * 2);
    ctx.fillStyle = pal.trackShadow;
    ctx.fill();

    // Concentric stacked slate-blue "0" spiral rings (matching poster's lower-right "0")
    const rings = [
      { r: v.outerR, col: pal.blueFill },
      { r: v.outerR * 0.78, col: pal.blueHi },
      { r: v.outerR * 0.58, col: pal.blueDeep },
      { r: v.outerR * 0.36, col: v.flash > 0.1 ? pal.cyan : '#141e36' },
    ];
    for (const rg of rings) {
      ctx.beginPath();
      ctx.arc(0, 0, rg.r, 0, Math.PI * 2);
      ctx.fillStyle = rg.col;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();
    }

    // Animated spiral swirl arcs inside the "0"
    ctx.rotate(v.spinPhase);
    ctx.strokeStyle = v.flash > 0.1 ? pal.gold : pal.cream;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const a0 = (i * Math.PI * 2) / 3;
      ctx.arc(0, 0, v.outerR * 0.68, a0, a0 + 0.9);
      ctx.stroke();
    }

    // Center glowing "0" badge
    ctx.rotate(-v.spinPhase);
    ctx.fillStyle = v.flash > 0.1 ? pal.ink : pal.cyan;
    ctx.font = '900 16px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', 0, 1);

    ctx.restore();
  }

  _drawSlingshot4(ctx, engine, pal) {
    const s = engine.table.slingshot4;
    const [p0, p1, p2] = s.pts;
    ctx.save();

    // Drop shadow
    ctx.beginPath();
    ctx.moveTo(p0[0] + 4, p0[1] + 5);
    ctx.lineTo(p1[0] + 4, p1[1] + 5);
    ctx.lineTo(p2[0] + 4, p2[1] + 5);
    ctx.closePath();
    ctx.fillStyle = pal.trackShadow;
    ctx.fill();

    // Main slate-blue "4" triangular slingshot body
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fillStyle = s.flash > 0.1 ? pal.cyan : pal.blueFill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    // Energized rubber hypotenuse band
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.strokeStyle = s.flash > 0.1 ? pal.gold : pal.cream;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Bold comic "4" emblem inside slingshot (mirroring poster's lower-left "4")
    ctx.fillStyle = s.flash > 0.1 ? pal.ink : pal.cream;
    ctx.font = '900 34px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = pal.ink;
    ctx.strokeText('4', 109, 666);
    ctx.fillText('4', 109, 666);

    ctx.restore();
  }

  _drawSlingshotRight(ctx, engine, pal) {
    const s = engine.table.slingshotRight;
    const [p0, p1, p2] = s.pts;
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(p0[0] + 3, p0[1] + 4);
    ctx.lineTo(p1[0] + 3, p1[1] + 4);
    ctx.lineTo(p2[0] + 3, p2[1] + 4);
    ctx.closePath();
    ctx.fillStyle = pal.trackShadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.closePath();
    ctx.fillStyle = s.flash > 0.1 ? pal.gold : pal.blueFill;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.strokeStyle = s.flash > 0.1 ? pal.cream : pal.gold;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  _drawYearsTargets(ctx, engine, pal) {
    const targets = engine.table.dropTargets;
    ctx.save();

    // Comic red/ink housing bar behind the Y-E-A-R-S-! bank
    const first = targets[0];
    const last = targets[targets.length - 1];
    ctx.beginPath();
    ctx.moveTo(first.x1 + 6, first.y1 - 4);
    ctx.lineTo(last.x2 + 6, last.y2 + 4);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(first.x1 + 6, first.y1 - 4);
    ctx.lineTo(last.x2 + 6, last.y2 + 4);
    ctx.strokeStyle = pal.blueDeep;
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    for (const d of targets) {
      ctx.save();
      ctx.translate(d.cx, d.cy);
      const ang = Math.atan2(d.y2 - d.y1, d.x2 - d.x1);
      ctx.rotate(ang);

      const w = 18;
      const h = 15;
      ctx.fillStyle = d.down ? pal.gold : d.flash > 0.1 ? pal.cream : pal.trackFill;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.stroke();

      ctx.rotate(-ang);
      ctx.fillStyle = d.down ? pal.ink : pal.cream;
      ctx.font = '900 11px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.letter, 0, 0.5);
      ctx.restore();
    }
    ctx.restore();
  }

  _drawWallsAndGuides(ctx, engine, pal) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const w of engine.table.walls) {
      if (w.tag.startsWith('sling') || w.tag === 'arch' || w.tag === 'apron') continue;
      // Outer ink stroke
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = w.tag === 'divider' ? 8 : 7;
      ctx.stroke();

      // Inner metallic rail highlight
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.strokeStyle = w.tag === 'inlane' ? pal.blueHi : pal.cream;
      ctx.lineWidth = 2.8;
      ctx.stroke();
    }

    // One-way gate wire at top of shooter lane
    const g = engine.table.oneWayGate;
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  _drawBumpers(ctx, engine, pal) {
    for (const b of engine.table.bumpers) {
      ctx.save();
      const pulse = 1 + b.flash * 0.16;
      ctx.translate(b.x, b.y);
      ctx.scale(pulse, pulse);

      // Shadow
      ctx.beginPath();
      ctx.arc(3, 5, b.r + 1, 0, Math.PI * 2);
      ctx.fillStyle = pal.trackShadow;
      ctx.fill();

      // Outer crimson ring
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.flash > 0.1 ? pal.gold : pal.bumperRing;
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      // Inner cream/gold cap
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 0.64, 0, Math.PI * 2);
      ctx.fillStyle = b.flash > 0.1 ? pal.cream : pal.bumperCap;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      // Label
      ctx.fillStyle = pal.ink;
      ctx.font = '900 13px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, 0, 1);
      ctx.restore();
    }
  }

  _drawSternElevatedTrack(ctx, engine, pal, t) {
    const ramp = engine.table.sternRamp;
    const pts = ramp.path;
    ctx.save();

    // Ramp mouth glowing entrance arrow at (102, 392)
    ctx.save();
    ctx.translate(ramp.entryX, ramp.entryY);
    const glow = 0.65 + 0.35 * Math.sin(t * 5.5);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = ramp.flash > 0.1 ? pal.gold : `rgba(255, 202, 58, ${0.28 * glow})`;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.gold;
    ctx.stroke();
    ctx.fillStyle = pal.gold;
    ctx.font = '900 15px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲', 0, -1);
    ctx.restore();

    // Helper to stroke the smooth S-T-E-R-N wireform path
    const tracePath = (ox = 0, oy = 0) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i][0] + pts[i + 1][0]) * 0.5 + ox;
        const yc = (pts[i][1] + pts[i + 1][1]) * 0.5 + oy;
        ctx.quadraticCurveTo(pts[i][0] + ox, pts[i][1] + oy, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0] + ox, last[1] + oy);
    };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Elevated drop shadow on playfield below
    tracePath(5, 8);
    ctx.strokeStyle = pal.trackShadow;
    ctx.lineWidth = 22;
    ctx.stroke();

    // 2. Bold comic ink outer outline
    tracePath(0, 0);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 22;
    ctx.stroke();

    // 3. Crimson-red screen-print track body (semi-translucent so upper bumpers remain visible!)
    ctx.save();
    ctx.globalAlpha = ramp.flash > 0.1 ? 0.96 : 0.84;
    tracePath(0, 0);
    ctx.strokeStyle = ramp.flash > 0.1 ? pal.trackHi : pal.trackFill;
    ctx.lineWidth = 15;
    ctx.stroke();

    // 4. Inner highlight rail stripe
    tracePath(-1.5, -1.5);
    ctx.strokeStyle = pal.trackHi;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    // 5. Golden animated directional chevrons along the track
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 17]);
    ctx.lineDashOffset = -t * 36;
    tracePath(0, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Iconic "S - T - E - R - N" comic letter medallions mounted along the crimson track!
    const medallions = [
      { ch: 'S', x: 112, y: 204 },
      { ch: 'T', x: 256, y: 165 },
      { ch: 'E', x: 396, y: 214 },
      { ch: 'R', x: 334, y: 344 },
      { ch: 'N', x: 170, y: 422 },
    ];
    for (const m of medallions) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = ramp.flash > 0.1 ? pal.gold : pal.trackFill;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      ctx.fillStyle = ramp.flash > 0.1 ? pal.ink : pal.cream;
      ctx.font = '900 15px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.ch, 0, 1);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawPlunger(ctx, engine, pal) {
    const x = engine.table.shooterX;
    const baseY = 865;
    const topY = engine.table.shooterRestY + BALL_R + 2 + engine.plungerCharge * 18;

    ctx.save();
    // Coiled spring
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    const coils = 6;
    for (let i = 0; i <= coils; i++) {
      const y = topY + ((baseY - topY) * i) / coils;
      const ox = i % 2 === 0 ? -7 : 7;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x + ox, y);
    }
    ctx.stroke();

    // Plunger head
    ctx.fillStyle = pal.trackFill;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x - 10, topY - 4, 20, 8, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawFlippers(ctx, engine, pal) {
    for (const f of engine.table.flippers) {
      const tipX = f.x + Math.cos(f.angle) * f.length;
      const tipY = f.y + Math.sin(f.angle) * f.length;

      ctx.save();
      // Drop shadow
      ctx.beginPath();
      ctx.moveTo(f.x + 3, f.y + 5);
      ctx.lineTo(tipX + 3, tipY + 5);
      ctx.lineCap = 'round';
      ctx.lineWidth = f.radius * 2 + 2;
      ctx.strokeStyle = pal.trackShadow;
      ctx.stroke();

      // Bold ink outline
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = f.radius * 2 + 5;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      // Crimson rubber rim
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = f.radius * 2;
      ctx.strokeStyle = pal.flipperRubber;
      ctx.stroke();

      // Cream inner blade
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = f.radius * 1.15;
      ctx.strokeStyle = pal.flipperFill;
      ctx.stroke();

      // Pivot bolt
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = pal.gold;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = pal.ink;
      ctx.stroke();

      ctx.restore();
    }
  }

  _drawBall(ctx, b, pal, elevated = false) {
    // Luminous motion trail
    if (b.trail.length > 1) {
      for (let i = 0; i < b.trail.length - 1; i++) {
        const pt = b.trail[i];
        const a = (i / b.trail.length) * 0.32;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, BALL_R * (0.45 + 0.5 * (i / b.trail.length)), 0, Math.PI * 2);
        ctx.fillStyle = elevated ? `rgba(255, 202, 58, ${a})` : `rgba(124, 198, 255, ${a})`;
        ctx.fill();
      }
    }

    ctx.save();
    const r = elevated ? BALL_R * 1.12 : BALL_R;
    // Shadow
    ctx.beginPath();
    ctx.arc(b.x + 3, b.y + 4, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fill();

    // Metallic chrome steel ball gradient
    const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, r * 0.12, b.x, b.y, r);
    g.addColorStop(0.0, '#ffffff');
    g.addColorStop(0.32, '#e2ebf5');
    g.addColorStop(0.7, '#7c8ea8');
    g.addColorStop(1.0, '#2a3448');

    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    // Specular glint
    ctx.beginPath();
    ctx.arc(b.x - r * 0.34, b.y - r * 0.34, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  _drawApron(ctx, engine, pal) {
    ctx.save();
    // Left apron wedge
    ctx.beginPath();
    ctx.moveTo(24, 758);
    ctx.lineTo(180, 862);
    ctx.lineTo(180, 892);
    ctx.lineTo(24, 892);
    ctx.closePath();
    ctx.fillStyle = pal.blueDeep;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    // Right apron wedge
    ctx.beginPath();
    ctx.moveTo(486, 758);
    ctx.lineTo(330, 862);
    ctx.lineTo(330, 892);
    ctx.lineTo(486, 892);
    ctx.closePath();
    ctx.fillStyle = pal.blueDeep;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    // Poster edition stamp along bottom edge
    ctx.fillStyle = pal.cream;
    ctx.font = '800 10.5px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`STERN 40TH  •  ${pal.editionTag}`, 255, 882);
    ctx.restore();
  }

  _drawSparks(ctx, engine) {
    for (const s of engine.sparks) {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPopups(ctx, engine, pal) {
    for (const p of engine.popups) {
      const alpha = Math.min(1, (p.life / p.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 16px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = pal.ink;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  _drawBanner(ctx, title, sub, accent, pal) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 13, 24, 0.84)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(70, 388, 400, 114, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = '900 34px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 270, 428);

    ctx.fillStyle = pal.cream;
    ctx.font = '700 14px "Arial Black", sans-serif';
    ctx.fillText(sub, 270, 468);
    ctx.restore();
  }
}
