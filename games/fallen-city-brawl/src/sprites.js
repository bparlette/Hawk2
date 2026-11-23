// Fallen City Brawl — 90s Neo-Geo / Streets of Rage Arcade Sprite & Stage Renderer

export const VIEW_W = 960;
export const VIEW_H = 540;
export const STREET_TOP = 334;
export const STREET_BOT = 510;
export const STAGE_LEN = 2640;

function pxRect(ctx, x, y, w, h, fill, stroke = null, lw = 2) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  }
}

export function drawStageBackground(ctx, camX, time, riotFlash) {
  // 1. Gritty Burning Night Sky
  const sky = ctx.createLinearGradient(0, 0, 0, STREET_TOP);
  sky.addColorStop(0, '#0a0818');
  sky.addColorStop(0.55, '#1d1436');
  sky.addColorStop(0.86, '#482038');
  sky.addColorStop(1, '#7a2f32');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, STREET_TOP);

  // Subtle moonlight / smog haze
  const moonX = 760 - camX * 0.04;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 224, 178, 0.14)';
  ctx.beginPath();
  ctx.arc(moonX, 78, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe5b8';
  ctx.beginPath();
  ctx.arc(moonX, 78, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Distant Skyline Silhouette (parallax 0.2)
  const farOff = -(camX * 0.2);
  const towers = [
    [20, 96, 78, 175], [110, 66, 92, 205], [218, 118, 70, 152],
    [304, 54, 108, 218], [428, 102, 84, 170], [530, 74, 96, 198],
    [644, 112, 74, 160], [734, 60, 114, 212], [866, 92, 86, 180],
    [972, 70, 98, 202], [1088, 110, 82, 162], [1188, 64, 110, 208],
    [1318, 96, 88, 176], [1422, 82, 94, 190],
  ];
  for (let i = 0; i < towers.length; i++) {
    const [bx, by, bw, bh] = towers[i];
    const x = bx + farOff;
    if (x + bw < -40 || x > VIEW_W + 40) continue;
    ctx.fillStyle = '#130e24';
    ctx.fillRect(x, by, bw, bh);
    // Lit windows grid
    ctx.fillStyle = i % 3 === 0 ? '#ff9d42' : '#ffd17a';
    for (let wy = by + 12; wy < by + bh - 26; wy += 16) {
      for (let wx = x + 10; wx < x + bw - 14; wx += 14) {
        if (((wx * 7 + wy * 3 + i) % 5) === 0) {
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }

  // 3. Street-Level Brick Buildings & Storefronts (1:1 world coordinates)
  const buildings = [
    { x: 0, w: 340, h: 255, col: '#251c2f', sign: 'ARCADE', signCol: '#ff3b7c', glow: '#ff3b7c' },
    { x: 340, w: 300, h: 235, col: '#2c2228', sign: 'PAWN 24H', signCol: '#ffbe2e', glow: '#ff9c1a' },
    { x: 640, w: 360, h: 265, col: '#1f2336', sign: 'METRO BAR', signCol: '#29e3ff', glow: '#29e3ff' },
    { x: 1000, w: 280, h: 220, col: '#281e2c', sign: 'AUTO SHOP', signCol: '#ff5c38', glow: '#ff5c38' },
    { x: 1280, w: 380, h: 270, col: '#232034', sign: 'FALLS GYM', signCol: '#54ff88', glow: '#36e86c' },
    { x: 1660, w: 320, h: 245, col: '#2d2028', sign: 'HOTEL RIOT', signCol: '#ff3858', glow: '#ff3858' },
    { x: 1980, w: 360, h: 260, col: '#1e2234', sign: 'WAREHOUSE 9', signCol: '#ffae2b', glow: '#ff8800' },
    { x: 2340, w: 360, h: 275, col: '#281826', sign: 'IGNITION HQ', signCol: '#ff2b2b', glow: '#ff2b2b' },
  ];

  for (const b of buildings) {
    const sx = b.x - camX;
    if (sx + b.w < -40 || sx > VIEW_W + 40) continue;
    const topY = STREET_TOP - 28 - b.h;
    // Main brick facade
    pxRect(ctx, sx, topY, b.w, b.h, b.col, '#0d0a14', 2);

    // Subtle brick bands
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let ry = topY + 20; ry < STREET_TOP - 32; ry += 22) {
      ctx.fillRect(sx + 4, ry, b.w - 8, 2);
    }

    // Upper floor shuttered/lit windows
    for (let wx = sx + 26; wx < sx + b.w - 48; wx += 62) {
      pxRect(ctx, wx, topY + 26, 36, 48, '#141020', '#0a0810', 2);
      if (((wx + b.x) % 3) !== 0) {
        ctx.fillStyle = 'rgba(255, 190, 96, 0.34)';
        ctx.fillRect(wx + 4, topY + 30, 28, 40);
      }
      // Fire escape rail
      ctx.strokeStyle = '#111018';
      ctx.lineWidth = 2;
      ctx.strokeRect(wx - 4, topY + 62, 44, 14);
    }

    // Ground storefront shutter / doorway
    pxRect(ctx, sx + 22, STREET_TOP - 116, b.w - 44, 88, '#181422', '#0b0910', 2);
    // Metal roll-up shutter lines
    ctx.fillStyle = '#252136';
    for (let sy = STREET_TOP - 108; sy < STREET_TOP - 34; sy += 9) {
      ctx.fillRect(sx + 26, sy, b.w - 52, 4);
    }

    // Neon Sign with subtle arcade flicker
    const flick = Math.sin(time * 13 + b.x) > -0.88 ? 1 : 0.45;
    ctx.save();
    ctx.globalAlpha = flick;
    const signW = Math.min(188, b.w - 50);
    const signX = sx + (b.w - signW) * 0.5;
    const signY = STREET_TOP - 156;
    ctx.fillStyle = '#0d0914';
    ctx.fillRect(signX, signY, signW, 30);
    ctx.strokeStyle = b.signCol;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = b.glow;
    ctx.shadowBlur = 12;
    ctx.strokeRect(signX, signY, signW, 30);
    ctx.fillStyle = b.signCol;
    ctx.font = '900 15px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.sign, signX + signW * 0.5, signY + 16);
    ctx.restore();
  }

  // 4. Sidewalk & Curb
  const curbY = STREET_TOP - 28;
  ctx.fillStyle = '#3b3748';
  ctx.fillRect(0, curbY, VIEW_W, 24);
  ctx.fillStyle = '#24212e';
  ctx.fillRect(0, curbY + 24, VIEW_W, 8);
  // Sidewalk expansion joints
  ctx.fillStyle = '#262332';
  for (let gx = -(camX % 72); gx < VIEW_W; gx += 72) {
    ctx.fillRect(gx, curbY, 2, 24);
  }

  // 5. Parked Wrecked Police Cruiser near x=940 (background prop with flashing siren!)
  const carX = 940 - camX;
  if (carX > -220 && carX < VIEW_W + 60) {
    const cy = curbY - 38;
    pxRect(ctx, carX, cy + 20, 174, 34, '#242a3d', '#0b0d14', 2);
    pxRect(ctx, carX + 36, cy, 92, 24, '#e8edf7', '#0b0d14', 2);
    pxRect(ctx, carX + 44, cy + 4, 34, 15, '#192236');
    pxRect(ctx, carX + 84, cy + 4, 36, 15, '#192236');
    pxRect(ctx, carX + 46, cy + 24, 72, 22, '#e8edf7');
    ctx.fillStyle = '#182238';
    ctx.font = '900 10px "Arial Black", sans-serif';
    ctx.fillText('METRO PD', carX + 54, cy + 38);
    // Wheels
    ctx.fillStyle = '#101218';
    ctx.beginPath();
    ctx.arc(carX + 34, cy + 54, 15, 0, Math.PI * 2);
    ctx.arc(carX + 138, cy + 54, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c869c';
    ctx.beginPath();
    ctx.arc(carX + 34, cy + 54, 6, 0, Math.PI * 2);
    ctx.arc(carX + 138, cy + 54, 6, 0, Math.PI * 2);
    ctx.fill();
    // Flashing red/blue lightbar
    const redOn = Math.floor(time * 7) % 2 === 0;
    ctx.save();
    ctx.fillStyle = redOn ? '#ff2b3a' : '#2b8cff';
    ctx.shadowColor = redOn ? '#ff2b3a' : '#2b8cff';
    ctx.shadowBlur = 18;
    ctx.fillRect(carX + 68, cy - 8, 28, 8);
    ctx.restore();
  }

  // 6. Streetlamps with Volumetric Glow Cones
  for (let lx = 160; lx < STAGE_LEN; lx += 380) {
    const sx = lx - camX;
    if (sx < -120 || sx > VIEW_W + 120) continue;
    ctx.fillStyle = '#151520';
    ctx.fillRect(sx - 4, 128, 8, curbY - 120);
    ctx.fillRect(sx - 4, 128, 30, 6);
    ctx.fillStyle = '#ffdfa0';
    ctx.fillRect(sx + 16, 134, 14, 5);
    // Light cone
    const cone = ctx.createLinearGradient(sx + 22, 138, sx + 22, STREET_TOP + 60);
    cone.addColorStop(0, 'rgba(255, 214, 130, 0.24)');
    cone.addColorStop(1, 'rgba(255, 214, 130, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(sx + 12, 139);
    ctx.lineTo(sx + 34, 139);
    ctx.lineTo(sx + 105, STREET_TOP + 60);
    ctx.lineTo(sx - 55, STREET_TOP + 60);
    ctx.closePath();
    ctx.fill();
  }

  // 7. Cracked Wet Asphalt Street (Walkable Belt Plane)
  const road = ctx.createLinearGradient(0, STREET_TOP, 0, VIEW_H);
  road.addColorStop(0, '#242433');
  road.addColorStop(0.5, '#1d1d2b');
  road.addColorStop(1, '#141420');
  ctx.fillStyle = road;
  ctx.fillRect(0, STREET_TOP, VIEW_W, VIEW_H - STREET_TOP);

  // Yellow dashed road divider line
  ctx.fillStyle = 'rgba(255, 200, 56, 0.45)';
  for (let rx = -(camX % 110); rx < VIEW_W; rx += 110) {
    ctx.fillRect(rx, 422, 54, 6);
  }

  // Subtle neon puddle reflections on asphalt
  for (let px = 220; px < STAGE_LEN; px += 460) {
    const sx = px - camX;
    if (sx < -120 || sx > VIEW_W + 120) continue;
    ctx.fillStyle = (px % 920 === 220) ? 'rgba(41, 227, 255, 0.09)' : 'rgba(255, 59, 124, 0.09)';
    ctx.beginPath();
    ctx.ellipse(sx, 456, 68, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8. Dramatic RIOT Super Screen Dim / Lightning Backdrop
  if (riotFlash > 0) {
    ctx.fillStyle = `rgba(12, 6, 28, ${Math.min(0.68, riotFlash * 0.72)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawRainOverlay(ctx, time) {
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 210, 255, 0.14)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 42; i++) {
    const x = ((i * 97 + time * 190) % (VIEW_W + 80)) - 40;
    const y = ((i * 61 + time * 640) % (VIEW_H + 60)) - 30;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y + 20);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawProp(ctx, p, camX, time) {
  const sx = p.x - camX;
  const sy = p.y;
  if (sx < -80 || sx > VIEW_W + 80) return;

  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 24, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const shake = p.hitFlash > 0 ? (Math.random() - 0.5) * 6 : 0;
  ctx.translate(sx + shake, sy);

  if (p.kind === 'drum') {
    // Burning red/rust oil drum
    pxRect(ctx, -18, -48, 36, 48, p.hitFlash > 0 ? '#ffffff' : '#9c2d26', '#0b0910', 2.5);
    pxRect(ctx, -18, -34, 36, 6, '#591815');
    pxRect(ctx, -18, -16, 36, 6, '#591815');
    // Animated fire flames bursting from top!
    const f1 = Math.sin(time * 18 + p.x) * 4;
    const f2 = Math.cos(time * 22 + p.x) * 4;
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.moveTo(-14, -48);
    ctx.quadraticCurveTo(-8, -72 + f1, 0, -56);
    ctx.quadraticCurveTo(8, -76 + f2, 14, -48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(-8, -48);
    ctx.quadraticCurveTo(0, -64 + f2, 8, -48);
    ctx.closePath();
    ctx.fill();
  } else {
    // Wooden street crate
    pxRect(ctx, -20, -42, 40, 42, p.hitFlash > 0 ? '#ffffff' : '#8e5a2b', '#120c08', 2.5);
    ctx.strokeStyle = '#4e2f14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -40);
    ctx.lineTo(18, -2);
    ctx.moveTo(18, -40);
    ctx.lineTo(-18, -2);
    ctx.stroke();
    ctx.strokeRect(-16, -38, 32, 34);
  }
  ctx.restore();
}

export function drawPickup(ctx, item, camX, time) {
  const sx = item.x - camX;
  const sy = item.y;
  if (sx < -60 || sx > VIEW_W + 60) return;

  const bob = Math.sin(time * 6 + item.x) * 3;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(sx, sy - 10 + bob);
  // Subtle glow ring
  ctx.strokeStyle = item.kind === 'chicken' ? '#ffcf48' : item.kind === 'gem' ? '#3be8ff' : '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 8);
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (item.kind === 'pipe') {
    ctx.rotate(-0.25);
    pxRect(ctx, -20, -4, 40, 8, '#a6b4c8', '#0d1018', 2);
    pxRect(ctx, -18, -2, 36, 3, '#e4edf7');
  } else if (item.kind === 'katana') {
    ctx.rotate(-0.22);
    pxRect(ctx, -24, -3, 36, 5, '#e8f4ff', '#0d1018', 1.8);
    pxRect(ctx, 10, -7, 4, 13, '#ffca3a', '#0d1018', 1.5);
    pxRect(ctx, 14, -3, 12, 6, '#c82032', '#0d1018', 1.5);
  } else if (item.kind === 'chicken') {
    // Classic arcade roast chicken / meat leg!
    ctx.fillStyle = '#d97a2b';
    ctx.strokeStyle = '#140b06';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(-3, 0, 14, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    pxRect(ctx, 9, -3, 10, 6, '#f6efe2', '#140b06', 1.8);
  } else if (item.kind === 'gem') {
    // Cyan RIOT crystal gem
    ctx.fillStyle = '#3be8ff';
    ctx.strokeStyle = '#0a1426';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFighter(ctx, f, camX, time) {
  const sx = f.x - camX;
  const sy = f.y;
  if (sx < -120 || sx > VIEW_W + 120) return;

  // KO blink flicker before despawn
  if (f.dead && Math.floor(time * 20) % 2 === 0) return;

  const scale = f.isBoss ? 1.32 : f.kind === 'bruiser' ? 1.12 : 1.0;

  ctx.save();
  // Ground shadow
  const shadowScale = Math.max(0.45, 1 - f.z / 160);
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 2, 24 * scale * shadowScale, 9 * scale * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Boss Phase 2 Rage Aura
  if (f.isBoss && f.phase2) {
    ctx.save();
    ctx.strokeStyle = '#ff4824';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.45 + 0.3 * Math.sin(time * 16);
    ctx.beginPath();
    ctx.ellipse(sx, sy - 42 * scale, 36 * scale, 54 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(sx, sy - f.z);
  ctx.scale(f.facing * scale, scale);

  // Knockdown / Launched flat rotation
  if (f.state === 'knockdown' || f.state === 'thrown') {
    ctx.translate(0, -14);
    ctx.rotate(f.state === 'thrown' ? -Math.PI * 0.48 : -Math.PI * 0.5);
    ctx.translate(0, 26);
  }

  // Palette per fighter archetype
  const pal = getFighterPalette(f);
  const flash = f.hitFlash > 0;
  const ink = '#0d0b14';

  const walkCycle = f.moving ? Math.sin(time * 14) : 0;
  const idleBob = f.moving ? Math.abs(Math.cos(time * 14)) * 3 : Math.sin(time * 5.5) * 2;
  const attacking = f.state === 'attack' || f.state === 'jumpAttack' || f.state === 'dashAttack' || f.state === 'special';
  const blocking = f.state === 'block';
  const hurt = f.state === 'hurt';

  const atkExt = attacking ? Math.sin(Math.min(1, f.stateTimer / Math.max(0.08, f.attackDur)) * Math.PI) : 0;
  const leanX = hurt ? -7 : attacking ? 6 * atkExt : f.moving ? 3 : 0;

  ctx.translate(leanX, -idleBob);

  // Back leg
  const legA = walkCycle * 10;
  const legB = -walkCycle * 10;
  pxRect(ctx, -10 + legB * 0.6, -28, 11, 22, flash ? '#ffffff' : pal.pantsDark, ink, 2);
  pxRect(ctx, -11 + legB * 0.6, -9, 14, 9, flash ? '#ffffff' : pal.boots, ink, 2);

  // Front leg (or jump-kick extended leg!)
  if (f.state === 'jumpAttack') {
    pxRect(ctx, 2, -30, 28, 11, flash ? '#ffffff' : pal.pants, ink, 2);
    pxRect(ctx, 26, -32, 12, 13, flash ? '#ffffff' : pal.boots, ink, 2);
  } else {
    pxRect(ctx, 1 + legA * 0.6, -28, 11, 22, flash ? '#ffffff' : pal.pants, ink, 2);
    pxRect(ctx, 1 + legA * 0.6, -9, 15, 9, flash ? '#ffffff' : pal.boots, ink, 2);
  }

  // Torso / Jacket / Armor
  pxRect(ctx, -14, -62, 28, 36, flash ? '#ffffff' : pal.shirt, ink, 2.2);
  // Tactical vest / jacket lapels
  pxRect(ctx, -15, -62, 10, 34, flash ? '#ffffff' : pal.vest, ink, 2);
  pxRect(ctx, 5, -62, 10, 34, flash ? '#ffffff' : pal.vest, ink, 2);
  // Belt
  pxRect(ctx, -14, -31, 28, 5, '#191922', ink, 1.5);
  pxRect(ctx, -2, -31, 6, 5, '#ffca3a');

  // Boss cyber shoulder pauldrons
  if (f.isBoss) {
    pxRect(ctx, -21, -65, 13, 14, flash ? '#ffffff' : '#c62828', ink, 2);
    pxRect(ctx, 9, -65, 13, 14, flash ? '#ffffff' : '#c62828', ink, 2);
  }

  // Head
  pxRect(ctx, -10, -82, 20, 20, flash ? '#ffffff' : pal.skin, ink, 2.2);
  // Hair / Headband / Mohawk / Visor
  if (f.kind === 'player') {
    // Sgt. Clay red tactical headband + spiked hair
    pxRect(ctx, -11, -84, 22, 7, '#241b16', ink, 1.8);
    pxRect(ctx, -11, -78, 22, 4, '#e12525');
    // Headband tails flowing back
    pxRect(ctx, -19, -78, 8, 3, '#e12525');
    pxRect(ctx, -21, -74, 7, 3, '#b81a1a');
  } else if (f.kind === 'punk') {
    // Crimson mohawk
    pxRect(ctx, -5, -93, 10, 13, '#ff2b5e', ink, 1.8);
    pxRect(ctx, 1, -76, 8, 3, '#101018'); // shades
  } else if (f.kind === 'bruiser') {
    // Bandana & beard
    pxRect(ctx, -11, -83, 22, 6, '#396b3e', ink, 1.8);
    pxRect(ctx, -9, -68, 18, 6, '#2b2018');
  } else if (f.kind === 'dasher') {
    // Hoodie & red scarf
    pxRect(ctx, -12, -85, 24, 10, '#3e2462', ink, 1.8);
    pxRect(ctx, -12, -64, 24, 6, '#e12525', ink, 1.5);
  } else if (f.isBoss) {
    // Ignition Rex armored helmet + glowing orange visor
    pxRect(ctx, -12, -85, 24, 11, '#262b3c', ink, 2);
    pxRect(ctx, -2, -76, 13, 5, '#ff7b1a');
  }

  // Eyes (for non-visor fighters)
  if (!f.isBoss && f.kind !== 'punk') {
    ctx.fillStyle = '#111018';
    ctx.fillRect(3, -74, 3, 3);
  }

  // Front Attack / Guard Arm + Held Weapon
  if (blocking) {
    // Guard arms crossed + glowing blue parry shield arc
    pxRect(ctx, 4, -56, 12, 22, flash ? '#ffffff' : pal.skin, ink, 2);
    ctx.save();
    ctx.strokeStyle = f.parryWindow > 0 ? '#3be8ff' : 'rgba(130, 210, 255, 0.55)';
    ctx.lineWidth = f.parryWindow > 0 ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(16, -46, 22, -1.0, 1.0);
    ctx.stroke();
    ctx.restore();
  } else if (attacking) {
    const reach = (f.attackMove === 'finisher' || f.attackMove === 'dash' ? 32 : 24) * atkExt;
    const armY = f.attackMove === 'finisher' ? -64 : -54;
    pxRect(ctx, 6, armY, 12 + reach, 10, flash ? '#ffffff' : pal.skin, ink, 2);
    // Fist / Tape
    pxRect(ctx, 14 + reach, armY - 1, 10, 12, f.isBoss ? '#ff6a1a' : '#f2ede0', ink, 2);

    // Held Weapon swing arc!
    if (f.weapon) {
      ctx.save();
      ctx.translate(18 + reach, armY + 4);
      if (f.weapon.kind === 'pipe') {
        pxRect(ctx, -2, -5, 36, 7, '#b5c4d8', ink, 2);
      } else if (f.weapon.kind === 'katana') {
        pxRect(ctx, -2, -4, 44, 5, '#f0f8ff', ink, 1.8);
        // Cyan slash smear
        ctx.strokeStyle = 'rgba(59, 232, 255, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-8, 4, 44, -0.7, 0.55);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f.attackMove === 'finisher' || f.attackMove === 'special') {
      // Fiery punch impact arc
      ctx.strokeStyle = '#ffca3a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(16 + reach, armY + 5, 16, -1.1, 1.1);
      ctx.stroke();
    }
  } else {
    // Idle / Walk arm + carried weapon
    pxRect(ctx, -4 - walkCycle * 4, -56, 10, 22, flash ? '#ffffff' : pal.skin, ink, 2);
    if (f.weapon) {
      ctx.save();
      ctx.translate(4, -40);
      ctx.rotate(-0.45);
      if (f.weapon.kind === 'pipe') {
        pxRect(ctx, 0, -3, 30, 6, '#b5c4d8', ink, 2);
      } else {
        pxRect(ctx, 0, -2, 36, 4, '#eef7ff', ink, 1.6);
      }
      ctx.restore();
    }
  }

  // Telegraph flash exclamation above enemy winding up a heavy swing
  if (f.telegraphTimer > 0) {
    ctx.save();
    ctx.scale(f.facing, 1); // keep text unmirrored
    ctx.fillStyle = '#ff3b30';
    ctx.font = '900 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#0d0b14';
    ctx.lineWidth = 4;
    ctx.strokeText('!', 0, -96);
    ctx.fillText('!', 0, -96);
    ctx.restore();
  }

  ctx.restore();
}

function getFighterPalette(f) {
  if (f.kind === 'player') {
    return {
      skin: '#e6b18a',
      shirt: '#f2efe6',
      vest: '#213559',
      pants: '#323c52',
      pantsDark: '#232a3b',
      boots: '#1c1816',
    };
  }
  if (f.kind === 'punk') {
    return {
      skin: '#dfa882',
      shirt: '#2a2230',
      vest: '#1b1822',
      pants: '#3b4f78',
      pantsDark: '#293858',
      boots: '#1a1414',
    };
  }
  if (f.kind === 'bruiser') {
    return {
      skin: '#c98e64',
      shirt: '#4c5f3b',
      vest: '#36442a',
      pants: '#3d342d',
      pantsDark: '#2b241f',
      boots: '#191412',
    };
  }
  if (f.kind === 'dasher') {
    return {
      skin: '#e0ae8b',
      shirt: '#3e2462',
      vest: '#291744',
      pants: '#222230',
      pantsDark: '#161622',
      boots: '#18141c',
    };
  }
  // Boss: Ignition Rex
  return {
    skin: '#c48a66',
    shirt: '#2a2e3e',
    vest: '#8e1c24',
    pants: '#262938',
    pantsDark: '#191b26',
    boots: '#383d50',
  };
}

export function drawWolfCompanion(ctx, wolf, camX, time) {
  if (!wolf || !wolf.active) return;
  const sx = wolf.x - camX;
  const sy = wolf.y;
  const leap = Math.abs(Math.sin(time * 22)) * 14;

  ctx.save();
  // Speed trail
  ctx.fillStyle = 'rgba(59, 232, 255, 0.28)';
  ctx.fillRect(sx - wolf.facing * 90, sy - 38 - leap, 90, 26);

  ctx.translate(sx, sy - leap);
  ctx.scale(wolf.facing, 1);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, leap + 2, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const ink = '#0d0b14';
  // Wolf body (armored silver-charcoal)
  pxRect(ctx, -26, -34, 46, 20, '#8d9cb5', ink, 2.2);
  pxRect(ctx, -18, -32, 22, 10, '#2c3a56', ink, 1.5); // tactical harness
  // Head & Snout
  pxRect(ctx, 14, -44, 22, 18, '#a7b6cf', ink, 2.2);
  pxRect(ctx, 30, -37, 12, 9, '#d6e0f0', ink, 2);
  // Ears
  pxRect(ctx, 16, -52, 6, 9, '#72829c', ink, 1.8);
  // Glowing cyan eye
  ctx.fillStyle = '#3be8ff';
  ctx.fillRect(26, -40, 5, 4);
  // Tail
  pxRect(ctx, -38, -36, 14, 7, '#72829c', ink, 1.8);
  // Running legs
  const run = Math.sin(time * 26) * 10;
  pxRect(ctx, -22 + run, -16, 8, 16, '#64728a', ink, 1.8);
  pxRect(ctx, 14 - run, -16, 8, 16, '#a7b6cf', ink, 1.8);

  ctx.restore();
}

export function drawEffects(ctx, sparks, popups, camX) {
  // Sparks & impact rings
  for (const s of sparks) {
    const sx = s.x - camX;
    const alpha = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (s.kind === 'ring') {
      const r = s.r * (1.8 - alpha * 0.9);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(sx, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.color;
      ctx.fillRect(sx - s.size * 0.5, s.y - s.size * 0.5, s.size, s.size);
    }
    ctx.restore();
  }

  // Floating arcade damage / callout popups
  for (const p of popups) {
    const sx = p.x - camX;
    const alpha = Math.min(1, (p.life / p.maxLife) * 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${p.size || 18}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#0c0914';
    ctx.strokeText(p.text, sx, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, sx, p.y);
    ctx.restore();
  }
}

export function drawGoArrow(ctx, time) {
  if (Math.floor(time * 4.5) % 2 !== 0) return;
  ctx.save();
  const x = VIEW_W - 118;
  const y = 128;
  ctx.fillStyle = '#ffca3a';
  ctx.strokeStyle = '#0d0914';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x + 48, y - 16);
  ctx.lineTo(x + 48, y - 30);
  ctx.lineTo(x + 88, y);
  ctx.lineTo(x + 48, y + 30);
  ctx.lineTo(x + 48, y + 16);
  ctx.lineTo(x, y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e12525';
  ctx.font = '900 22px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GO!', x + 32, y + 1);
  ctx.restore();
}
