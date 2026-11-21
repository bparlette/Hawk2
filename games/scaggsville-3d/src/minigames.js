// Scaggsville 3D — Playable House Cutaway Mini-Games
//   - Kosack's Basement Arcade ('arcade'): Galaga-style retro CRT space shooter
//   - Jason's Basement Genesis ('genesis'): Holyfield Boxing counter-punch bout
//   - Any House Cooler/Fridge/Bar/Mantle ('beer'): Instant cold-one turbo + cash boost

export function createMiniGames({ onReward, gameAudio } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    #mgOverlay{position:fixed;inset:0;z-index:1500;background:rgba(8,10,20,0.88);
      display:none;flex-direction:column;align-items:center;justify-content:center;
      backdrop-filter:blur(6px);padding:14px;touch-action:none;}
    #mgFrame{background:linear-gradient(180deg,#1a1f36,#101322);border:3px solid rgba(255,210,63,0.75);
      border-radius:18px;padding:12px;box-shadow:0 16px 48px rgba(0,0,0,0.75), 0 0 28px rgba(90,140,255,0.28);
      display:flex;flex-direction:column;align-items:center;max-width:94vw;}
    #mgHeader{width:100%;display:flex;justify-content:space-between;align-items:center;
      color:#ffd23f;font-weight:900;font-size:14px;letter-spacing:.1em;margin-bottom:8px;}
    #mgClose{background:rgba(210,55,65,0.85);color:#fff;border:2px solid rgba(255,255,255,0.5);
      border-radius:10px;padding:4px 10px;font-weight:900;font-size:12px;cursor:pointer;}
    #mgCanvas{width:min(320px,84vw);height:auto;border-radius:10px;background:#070912;
      border:2px solid rgba(255,255,255,0.18);display:block;touch-action:none;}
    #mgControls{display:flex;gap:10px;margin-top:10px;width:100%;justify-content:center;}
    .mgBtn{background:rgba(255,255,255,0.12);color:#fff;border:2px solid rgba(255,255,255,0.35);
      border-radius:12px;padding:10px 18px;font-weight:900;font-size:13px;letter-spacing:.06em;
      cursor:pointer;touch-action:none;user-select:none;}
    .mgBtn:active{background:rgba(255,210,63,0.4);transform:scale(.95);}
    .mgBtn.primary{background:rgba(46,160,80,0.85);border-color:rgba(255,255,255,0.65);}
    #mgFoot{color:#b8c4e0;font-size:11px;margin-top:8px;text-align:center;}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'mgOverlay';
  overlay.innerHTML = `
    <div id="mgFrame">
      <div id="mgHeader"><span id="mgTitle">ARCADE</span><button id="mgClose">✕ QUIT</button></div>
      <canvas id="mgCanvas" width="320" height="380"></canvas>
      <div id="mgControls"></div>
      <div id="mgFoot"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('#mgTitle');
  const closeBtn = overlay.querySelector('#mgClose');
  const canvas = overlay.querySelector('#mgCanvas');
  const ctx = canvas.getContext('2d');
  const ctrlEl = overlay.querySelector('#mgControls');
  const footEl = overlay.querySelector('#mgFoot');

  let active = null; // { kind, raf, cleanup }
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (active && e.code === 'Escape') { e.preventDefault(); close(); }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  function close() {
    if (!active) return;
    if (active.raf) cancelAnimationFrame(active.raf);
    if (active.cleanup) active.cleanup();
    active = null;
    overlay.style.display = 'none';
  }
  closeBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); close(); });

  // ---------------- 1. KOSACK'S BASEMENT ARCADE (GALAGA SHOOTER) ----------------
  function openArcade() {
    close();
    titleEl.textContent = "KOSACK'S ARCADE · GALAGA";
    footEl.textContent = 'Drag / ◀ ▶ to dodge & auto-fire · 20s high-score blitz!';
    ctrlEl.innerHTML = `<button class="mgBtn" id="mgL">◀ LEFT</button><button class="mgBtn" id="mgR">RIGHT ▶</button>`;
    overlay.style.display = 'flex';

    let holdL = false, holdR = false, dragX = null;
    const bL = ctrlEl.querySelector('#mgL'), bR = ctrlEl.querySelector('#mgR');
    const bindHold = (el, set) => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); set(true); });
      const off = () => set(false);
      el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    };
    bindHold(bL, v => holdL = v); bindHold(bR, v => holdR = v);
    const onDrag = e => {
      const r = canvas.getBoundingClientRect();
      dragX = ((e.clientX - r.left) / r.width) * 320;
    };
    const onDown = e => { e.preventDefault(); onDrag(e); };
    const onMove = e => { if (dragX !== null) onDrag(e); };
    const onUp = () => { dragX = null; };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let px = 160, score = 0, timeLeft = 20.0, fireCd = 0, spawnCd = 0, done = false;
    const bullets = [], enemies = [], pops = [];
    const stars = Array.from({ length: 36 }, () => ({ x: Math.random() * 320, y: Math.random() * 380, sp: 30 + Math.random() * 75 }));

    const spawnWave = () => {
      const cols = 5, startX = 52 + Math.random() * 36;
      for (let i = 0; i < cols; i++) {
        enemies.push({ x: startX + i * 44, y: -18 - (i % 2) * 18, vx: (Math.random() - 0.5) * 45, vy: 58 + Math.random() * 38, hue: (i * 65 + score * 7) % 360 });
      }
    };
    spawnWave();

    let lastT = performance.now();
    function tick(now) {
      if (!active) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (!done) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (keys['ArrowLeft'] || keys['KeyA'] || holdL) px -= 210 * dt;
        if (keys['ArrowRight'] || keys['KeyD'] || holdR) px += 210 * dt;
        if (dragX !== null) px += (dragX - px) * Math.min(1, dt * 14);
        px = Math.max(20, Math.min(300, px));

        fireCd -= dt;
        if (fireCd <= 0) {
          fireCd = 0.19;
          bullets.push({ x: px, y: 332 });
          if (gameAudio?.uiTap) gameAudio.uiTap();
        }
        spawnCd -= dt;
        if (spawnCd <= 0) { spawnCd = 1.9; spawnWave(); }

        for (const s of stars) { s.y += s.sp * dt; if (s.y > 380) { s.y = 0; s.x = Math.random() * 320; } }
        for (let i = bullets.length - 1; i >= 0; i--) {
          bullets[i].y -= 390 * dt;
          if (bullets[i].y < -10) bullets.splice(i, 1);
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x < 18 || e.x > 302) e.vx *= -1;
          if (e.y > 395) { enemies.splice(i, 1); continue; }
          let hit = false;
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (Math.hypot(bullets[j].x - e.x, bullets[j].y - e.y) < 17) {
              bullets.splice(j, 1); hit = true; break;
            }
          }
          if (hit) {
            score++;
            pops.push({ x: e.x, y: e.y, t: 0.35, hue: e.hue });
            enemies.splice(i, 1);
          }
        }
        for (let i = pops.length - 1; i >= 0; i--) {
          pops[i].t -= dt;
          if (pops[i].t <= 0) pops.splice(i, 1);
        }
        if (timeLeft <= 0) {
          done = true;
          const cash = Math.max(100, score * 45);
          if (gameAudio?.stunt) gameAudio.stunt();
          if (onReward) onReward({ cash, turboRefill: false, label: `ARCADE HIGH SCORE (${score}) +$${cash}` });
          setTimeout(() => close(), 1500);
        }
      }

      // Draw CRT starfield + enemies + ship
      ctx.fillStyle = '#070914';
      ctx.fillRect(0, 0, 320, 380);
      ctx.fillStyle = 'rgba(200,220,255,0.55)';
      for (const s of stars) ctx.fillRect(s.x, s.y, 2, 2);

      // Bullets
      ctx.fillStyle = '#ffd23f';
      for (const b of bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);

      // Enemies
      for (const e of enemies) {
        ctx.fillStyle = `hsl(${e.hue}, 88%, 58%)`;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + 11); ctx.lineTo(e.x - 13, e.y - 8); ctx.lineTo(e.x + 13, e.y - 8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x - 5, e.y - 4, 3, 3); ctx.fillRect(e.x + 2, e.y - 4, 3, 3);
      }

      // Explosions
      for (const p of pops) {
        ctx.strokeStyle = `hsla(${p.hue}, 95%, 68%, ${p.t * 2.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, (0.38 - p.t) * 58, 0, Math.PI * 2); ctx.stroke();
      }

      // Player fighter
      ctx.fillStyle = '#48d6ff';
      ctx.beginPath();
      ctx.moveTo(px, 326); ctx.lineTo(px - 15, 354); ctx.lineTo(px, 346); ctx.lineTo(px + 15, 354);
      ctx.closePath(); ctx.fill();

      // HUD bar
      ctx.fillStyle = '#fff'; ctx.font = '900 15px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${score}`, 12, 24);
      ctx.textAlign = 'right'; ctx.fillStyle = timeLeft < 5 ? '#ff5566' : '#ffd23f';
      ctx.fillText(`${timeLeft.toFixed(1)}s`, 308, 24);
      if (done) {
        ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fillRect(0, 140, 320, 96);
        ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center'; ctx.font = '900 24px monospace';
        ctx.fillText('STAGE CLEAR!', 160, 182);
        ctx.fillStyle = '#fff'; ctx.font = '700 15px monospace';
        ctx.fillText(`+$${Math.max(100, score * 45)} CASH`, 160, 212);
      }
      active.raf = requestAnimationFrame(tick);
    }

    active = {
      kind: 'arcade',
      raf: requestAnimationFrame(tick),
      cleanup() {
        canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      },
    };
  }

  // ---------------- 2. JASON'S BASEMENT GENESIS (HOLYFIELD BOXING) ----------------
  function openBoxing() {
    close();
    titleEl.textContent = "JASON'S GENESIS · HOLYFIELD BOXING";
    footEl.textContent = '◀ / ▶ Dodge telegraphed swings · PUNCH when opponent opens up!';
    ctrlEl.innerHTML = `<button class="mgBtn" id="bxL">◀ DODGE</button><button class="mgBtn primary" id="bxP">🥊 PUNCH</button><button class="mgBtn" id="bxR">DODGE ▶</button>`;
    overlay.style.display = 'flex';

    let pHP = 100, oppHP = 100, dodge = 0, dodgeT = 0, punchT = 0, hitFlash = 0, oppFlash = 0;
    let oppState = 'idle', oppT = 1.1, oppSide = 1, ko = null;

    const doDodge = dir => { if (ko) return; dodge = dir; dodgeT = 0.34; };
    const doPunch = () => {
      if (ko || punchT > 0) return;
      punchT = 0.24;
      const dmg = oppState === 'open' ? 24 : (oppState === 'windup' ? 14 : 6);
      oppHP = Math.max(0, oppHP - dmg);
      oppFlash = 0.2;
      if (gameAudio?.crash) gameAudio.crash(dmg > 15 ? 0.55 : 0.25);
      if (oppHP <= 0) {
        ko = 'WIN';
        if (gameAudio?.stunt) gameAudio.stunt();
        if (onReward) onReward({ cash: 500, turboRefill: true, label: 'HOLYFIELD KO CHAMP +$500' });
        setTimeout(() => close(), 1600);
      }
    };

    ctrlEl.querySelector('#bxL').addEventListener('pointerdown', e => { e.preventDefault(); doDodge(-1); });
    ctrlEl.querySelector('#bxR').addEventListener('pointerdown', e => { e.preventDefault(); doDodge(1); });
    ctrlEl.querySelector('#bxP').addEventListener('pointerdown', e => { e.preventDefault(); doPunch(); });
    const onKey = e => {
      if (!active || active.kind !== 'genesis' || e.repeat) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') doDodge(-1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') doDodge(1);
      else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); doPunch(); }
    };
    window.addEventListener('keydown', onKey);

    let lastT = performance.now();
    function tick(now) {
      if (!active) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (!ko) {
        if (dodgeT > 0) { dodgeT -= dt; if (dodgeT <= 0) dodge = 0; }
        if (punchT > 0) punchT -= dt;
        if (hitFlash > 0) hitFlash -= dt;
        if (oppFlash > 0) oppFlash -= dt;

        oppT -= dt;
        if (oppT <= 0) {
          if (oppState === 'idle') {
            oppState = 'windup'; oppSide = Math.random() < 0.5 ? -1 : 1; oppT = 0.62;
          } else if (oppState === 'windup') {
            oppState = 'swing'; oppT = 0.22;
            if (dodge !== -oppSide) {
              pHP = Math.max(0, pHP - 22);
              hitFlash = 0.25;
              if (gameAudio?.crash) gameAudio.crash(0.65);
              if (pHP <= 0) {
                ko = 'LOSE';
                if (onReward) onReward({ cash: 100, turboRefill: false, label: 'GOOD BOUT +$100' });
                setTimeout(() => close(), 1500);
              }
            }
          } else if (oppState === 'swing') {
            oppState = 'open'; oppT = 0.85;
          } else {
            oppState = 'idle'; oppT = 0.75 + Math.random() * 0.5;
          }
        }
      }

      // Draw Genesis Boxing Ring
      ctx.fillStyle = hitFlash > 0 ? '#551418' : '#131b36';
      ctx.fillRect(0, 0, 320, 380);
      // Ring ropes & mat
      ctx.fillStyle = '#243a68'; ctx.fillRect(0, 235, 320, 145);
      ctx.strokeStyle = '#ff384c'; ctx.lineWidth = 4;
      for (const ry of [125, 165, 205]) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(320, ry); ctx.stroke(); }

      // Opponent boxer
      const ox = 160 + (oppState === 'windup' ? oppSide * 22 : oppState === 'swing' ? -oppSide * 24 : 0);
      const oy = 170 + (oppState === 'open' ? 8 : 0);
      ctx.fillStyle = oppFlash > 0 ? '#ffffff' : (oppState === 'open' ? '#ff9944' : '#c68642');
      ctx.fillRect(ox - 34, oy - 35, 68, 74); // torso
      ctx.beginPath(); ctx.arc(ox, oy - 55, 22, 0, Math.PI * 2); ctx.fill(); // head
      ctx.fillStyle = oppState === 'windup' ? '#ffdd33' : '#d82230'; // gloves
      ctx.beginPath(); ctx.arc(ox - 36 + (oppState === 'swing' && oppSide < 0 ? 34 : 0), oy - 8, 17, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ox + 36 - (oppState === 'swing' && oppSide > 0 ? 34 : 0), oy - 8, 17, 0, Math.PI * 2); ctx.fill();
      if (oppState === 'windup') {
        ctx.fillStyle = '#ffd23f'; ctx.font = '900 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(oppSide < 0 ? 'DODGE RIGHT ▶' : '◀ DODGE LEFT', 160, 74);
      } else if (oppState === 'open') {
        ctx.fillStyle = '#52ff88'; ctx.font = '900 15px monospace'; ctx.textAlign = 'center';
        ctx.fillText('STUNNED! COUNTER NOW!', 160, 74);
      }

      // Player foreground silhouette + gloves
      const plx = 160 + dodge * 48;
      ctx.fillStyle = '#2458c8';
      ctx.fillRect(plx - 36, 280, 72, 95);
      ctx.fillStyle = '#ff384c';
      ctx.beginPath(); ctx.arc(plx - 42, 275 - (punchT > 0 ? 58 : 0), 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(plx + 42, 275 - (punchT > 0.12 ? 32 : 0), 20, 0, Math.PI * 2); ctx.fill();

      // Health bars
      ctx.fillStyle = '#222'; ctx.fillRect(14, 14, 128, 14); ctx.fillRect(178, 14, 128, 14);
      ctx.fillStyle = '#48e070'; ctx.fillRect(16, 16, 124 * (pHP / 100), 10);
      ctx.fillStyle = '#ff4455'; ctx.fillRect(180, 16, 124 * (oppHP / 100), 10);
      ctx.fillStyle = '#fff'; ctx.font = '900 11px monospace';
      ctx.textAlign = 'left'; ctx.fillText('YOU', 16, 40);
      ctx.textAlign = 'right'; ctx.fillText('HOLYFIELD CPU', 304, 40);

      if (ko) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 140, 320, 96);
        ctx.fillStyle = ko === 'WIN' ? '#ffd23f' : '#ff5566';
        ctx.textAlign = 'center'; ctx.font = '900 26px monospace';
        ctx.fillText(ko === 'WIN' ? 'KNOCKOUT!!' : 'DOWN!', 160, 182);
        ctx.fillStyle = '#fff'; ctx.font = '700 15px monospace';
        ctx.fillText(ko === 'WIN' ? '+$500 & TURBO FULL' : '+$100 EFFORT', 160, 212);
      }

      active.raf = requestAnimationFrame(tick);
    }

    active = {
      kind: 'genesis',
      raf: requestAnimationFrame(tick),
      cleanup() { window.removeEventListener('keydown', onKey); },
    };
  }

  return {
    get active() { return !!active; },
    openArcade,
    openBoxing,
    close,
  };
}
