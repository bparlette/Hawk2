// Scaggsville 3D — house interiors (Lane B), THE 2D RESTORE (Nov 21, 2026).
//
// Cherie compared the 3D dollhouse cutaways against the original 2D
// interiors and picked the 2D ones: denser, brighter, full-body people —
// and they WORK (arcade PLAY, GRAB BEER -> DRINK with the can count,
// PAT the dogs, Teter / dad / bark house beats). So entering a crew house
// here now opens that house's ORIGINAL 2D interior, played by the 2D
// game's own engine, ported verbatim:
//   src/lf_interior.js         the interior logic (walk / stairs / spots)
//   src/lf_interior_render.js  the side-cutaway painter (baked shell, the
//                              Palm City side-view person sheet, dogs)
//   src/interiors-2d-data.js   the five kits, byte-for-byte the 2D designs
// The 2D view is a fullscreen canvas overlay above the 3D world; while it
// is up the driving sim rests (the host already skips it when
// interiors.active), and exiting returns the player to the 3D world
// exactly where they were — rally state lives in the host and is never
// touched from here.
//
// What did NOT change: the outside half of this module — the GO IN
// proximity prompt, and the Lazaris + Grant door-mom beats (canon: those
// houses get no interior; the beat is at the door). The night-party seam
// (partyAnchors) still returns the same yard rings + Kosack pool cluster
// missions.js consumes; `inside` is now [] because there is no 3D stage
// under the map any more (nothing consumed those points for placement).
//
// RECONCILED with braidpairlette's cutaway mini-games (099f792, same day):
// src/minigames.js is carried over WHOLE — Kosack's basement Galaga and
// Jason's Genesis boxing are the playable layer on the same beats the 2D
// engine already fires. The engine's own event queue is the bridge: its
// 'arcade' event (PLAY at a cabinet) opens braid's game for that spot
// (src 'arcade' -> Galaga, src 'genesis' -> boxing), and its 'grab' event
// pays braid's cold-one reward through the host's onMiniGameReward
// (cash + turbo refill, per-spot 6 s cooldown, same captions). While a
// mini-game is open the interior freezes and input belongs to the game;
// PAT, the drinks themselves and every scripted beat stay the 2D
// engine's own, exactly as the 2D game plays them.
//
// Host contract (unchanged, see index.html INTEGRATION NOTES):
//   const interiors = createInteriors({ scene, camera, stops, heroRow, surfaceAt });
//   interiors.tick(dt, { started, x, z, speed, steer, up, down }) -> bool active
//   interiors.enter(stopId) / interiors.exit() / interiors.active
//   interiors.partyAnchors(stopId) / interiors.stageOrigin(stopId)
//   interiors.stats() / interiors.debugSetHero(x, floorId)
//
// Inside controls (the 2D game's): stick / WASD / arrows walk, push up or
// down at the stairs to change floors, and the ACTION prompt does what it
// says — a big button (bottom right) labelled with the interior's own
// prompt (GRAB BEER / DRINK / PLAY / PAT / EXIT), or E / SPACE on a
// keyboard. ESC or the ✕ LEAVE button leaves from anywhere; walking to
// the front door and pressing ACTION on EXIT is the diegetic way out.
import * as THREE from 'three';
import { buildPerson, poseIdle } from '../../shared/people.js';
import { CREW_PEOPLE } from './crew.js';
import { HOUSE_INTERIORS, STOP_INTERIOR, DOOR_BEATS } from './interiors-data.js';
import { KITS_2D } from './interiors-2d-data.js';
import { Interior } from './lf_interior.js';
import { InteriorRenderer } from './lf_interior_render.js';
import { createMiniGames } from './minigames.js';

export const STAGE_Y = -42;              // legacy (the cutaway stage is gone; partyAnchors keeps the field)
const ENTER_RANGE = 19;                  // m from house point: GO IN prompt
const BEAT_RANGE = 24, BEAT_REARM = 48;  // door-mom beat trigger / re-arm

const BOX = new THREE.BoxGeometry(1, 1, 1);

// who the player is, and who lives in each house (crew car ids)
const PEOPLE_NAMES = { brad: 'Brad', clayton: 'Clayton', zack: 'Zack', jason: 'Jason', rigg: 'Rigg', kosack: 'Kosack', jimmy: 'Jimmy', billy: 'Billy', grant: 'Grant' };
const HOUSE_OWNER = { kosack: 'kosack', jason: 'jason', brad: 'brad', rigg: 'rigg', floyds: 'clayton' };
const HOUSE_NAME = { kosack: 'Kosack', jason: 'Jason', brad: 'Brad', rigg: 'Rigg', floyds: 'Clayton' };   // the interior HUD reads "<name>'S HOUSE"

// a figure for the door-mom beats (the only 3D figures left in this module)
function makeFigure(row) {
  const p = buildPerson(row);
  p.group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return p;
}

// ---------- the factory ----------
export function createInteriors(opts) {
  const { scene, stops } = opts;
  const heroRow = opts.heroRow || (() => CREW_PEOPLE.brad);
  const surfaceAt = opts.surfaceAt || null;
  const gameAudio = opts.gameAudio || null;
  const onMiniGameReward = opts.onMiniGameReward || null;

  // braidpairlette's playable cutaway mini-games (src/minigames.js),
  // rewarded through the host exactly as his interiors wired them.
  const minigames = createMiniGames({
    gameAudio,
    onReward: r => {
      if (onMiniGameReward) onMiniGameReward(r);
      if (r && r.label) showCaption(`<b>${r.label}</b>`, 2.6);
    },
  });

  // ----- module-owned DOM -----
  const style = document.createElement('style');
  style.textContent = `
    #intFade{position:fixed;inset:0;background:#0b0916;opacity:0;pointer-events:none;transition:opacity .3s ease;z-index:1400;}
    #intCanvas{position:fixed;inset:0;width:100vw;height:100vh;z-index:1140;pointer-events:none;display:none;}
    .intBtn{position:fixed;z-index:1250;border:3px solid rgba(255,255,255,.55);color:#fff;font-weight:900;letter-spacing:.06em;
      background:rgba(46,120,200,.88);border-radius:999px;padding:13px 22px;font-size:15px;cursor:pointer;touch-action:none;
      box-shadow:0 4px 14px rgba(0,0,0,.45);text-shadow:0 1px 3px rgba(0,0,0,.5);font-family:inherit;}
    .intBtn:active{filter:brightness(1.4);}
    #intEnter{left:50%;transform:translateX(-50%);bottom:calc(188px + env(safe-area-inset-bottom));display:none;}
    #intExit{top:calc(86px + env(safe-area-inset-top));right:14px;background:rgba(120,40,40,.85);padding:9px 16px;font-size:13px;display:none;}
    #intAction{right:16px;bottom:calc(108px + env(safe-area-inset-bottom));background:rgba(38,140,62,.9);padding:16px 24px;font-size:16px;display:none;}
    #intCaption{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(248px + env(safe-area-inset-bottom));
      width:min(92vw,560px);text-align:center;color:#ffe4b0;background:rgba(27,20,48,.78);border-radius:12px;
      padding:9px 14px;font-size:15px;font-weight:700;line-height:1.35;z-index:1250;pointer-events:none;display:none;}
    #intCaption b{color:#fff;}
    #intHint{position:fixed;left:50%;transform:translateX(-50%);top:calc(112px + env(safe-area-inset-top));
      color:#cfd6ea;background:rgba(10,14,26,.55);border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;
      z-index:1250;pointer-events:none;display:none;white-space:nowrap;}`;
  document.head.appendChild(style);
  const fadeEl = document.createElement('div'); fadeEl.id = 'intFade'; document.body.appendChild(fadeEl);
  const canvas = document.createElement('canvas'); canvas.id = 'intCanvas'; document.body.appendChild(canvas);
  const ctx2d = canvas.getContext('2d');
  const enterBtn = document.createElement('button'); enterBtn.className = 'intBtn'; enterBtn.id = 'intEnter'; document.body.appendChild(enterBtn);
  const exitBtn = document.createElement('button'); exitBtn.className = 'intBtn'; exitBtn.id = 'intExit'; exitBtn.textContent = '✕ LEAVE'; document.body.appendChild(exitBtn);
  const actionBtn = document.createElement('button'); actionBtn.className = 'intBtn'; actionBtn.id = 'intAction'; document.body.appendChild(actionBtn);
  const captionEl = document.createElement('div'); captionEl.id = 'intCaption'; document.body.appendChild(captionEl);
  const hintEl = document.createElement('div'); hintEl.id = 'intHint';
  hintEl.textContent = '◀ ▶ walk · ▲ ▼ at the stairs · the green button does what it says · door = way out'; document.body.appendChild(hintEl);

  const IR = new InteriorRenderer(ctx2d);
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  function sizeCanvas() {
    canvas.width = Math.round(innerWidth * DPR);
    canvas.height = Math.round(innerHeight * DPR);
  }
  sizeCanvas();
  window.addEventListener('resize', () => { sizeCanvas(); if (S) IR.camX = null; });

  // ----- captions (door-mom beats, outside) -----
  let tSec = 0;
  const cap = { until: 0, queue: [] };
  function setCaption(html, dur) {
    captionEl.innerHTML = html; captionEl.style.display = 'block';
    cap.until = tSec + dur;
  }
  function showCaption(html, dur = 2.8) {
    if (tSec < cap.until) { if (cap.queue.length < 3) cap.queue.push({ html, dur }); return; }
    setCaption(html, dur);
  }
  function captionTick() {
    if (cap.until && tSec >= cap.until) {
      cap.until = 0;
      const nx = cap.queue.shift();
      if (nx) setCaption(nx.html, nx.dur); else captionEl.style.display = 'none';
    }
  }

  // ----- state -----
  let S = null;              // active interior session { stopId, dataId, I }
  let fading = false;
  let promptStop = null;
  let actionQueued = false;
  const beats = {};          // door-beat runtime state per stop id
  for (const id of Object.keys(DOOR_BEATS)) beats[id] = { mom: null, boots: null, armed: true, playing: false, seqT: 0, fired: new Set() };

  // ----- braid mini-game bridges (the 2D engine's events -> his games) -----
  const spotCd = new Map();   // per-spot cold-one cooldown (braid's rule: 6 s)
  function beerReward(spotKey) {
    const now = performance.now();
    if ((spotCd.get(spotKey) || 0) > now) { showCaption('Already grabbed one here — hit another spot!', 1.8); return; }
    spotCd.set(spotKey, now + 6000);
    if (gameAudio && gameAudio.arrival) gameAudio.arrival();
    if (onMiniGameReward) onMiniGameReward({ cash: 75, turboRefill: true, label: 'COLD ONE! +$75 · TURBO FULL' });
    showCaption('<b>🍺 Cold one secured!</b> Turbo 100% · +$75', 2.4);
  }
  function drainEvents(I) {
    if (!I.events.length) return;
    const evs = I.events.splice(0, I.events.length);
    for (const ev of evs) {
      if (ev.kind === 'grab') beerReward(`${S.dataId}:${I.hero.floor}:${ev.src}`);
      else if (ev.kind === 'arcade') {
        const sp = I.near('PLAY');
        if (sp && sp.src === 'arcade') minigames.openArcade();
        else if (sp && sp.src === 'genesis') minigames.openBoxing();
      }
    }
  }

  enterBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (promptStop) enter(promptStop); });
  exitBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); exit(); });
  actionBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); actionQueued = true; });
  window.addEventListener('keydown', e => {
    if (minigames.active) return;   // the mini-game owns the keyboard (its Escape quits it)
    if (S) {
      if (e.code === 'Escape') exit();
      else if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) actionQueued = true;
    } else if (e.code === 'KeyE' && promptStop) enter(promptStop);
  });

  function playerWho() {
    const row = heroRow();
    const id = Object.keys(CREW_PEOPLE).find(k => CREW_PEOPLE[k] === row) || 'brad';
    return { id, name: PEOPLE_NAMES[id] || id };
  }

  function enter(stopId) {
    if (S || fading) return;
    const dataId = STOP_INTERIOR[stopId];
    if (!dataId || !KITS_2D[dataId] || !stops[stopId]) return;
    fading = true;
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      buildActive(stopId, dataId);
      fadeEl.style.opacity = '0';
      fading = false;
    }, 330);
  }
  function exit() {
    if (!S || fading) return;
    fading = true;
    fadeEl.style.opacity = '1';
    setTimeout(() => {
      disposeActive();
      fadeEl.style.opacity = '0';
      fading = false;
    }, 330);
  }

  function buildActive(stopId, dataId) {
    const who = playerWho();
    const owner = HOUSE_OWNER[dataId];
    // the 2D game's rule: visiting someone else's house, the owner is home
    // (idles at the kit's cpuIdle spot with a beer); your own house, no guest.
    const guests = owner && owner !== who.id ? [{ id: owner, name: PEOPLE_NAMES[owner] || owner }] : [];
    const I = new Interior(KITS_2D[dataId], { who, house: HOUSE_NAME[dataId] || who.name, guests });
    S = { stopId, dataId, I };
    IR.camX = null;
    sizeCanvas();
    canvas.style.display = 'block';
    exitBtn.style.display = 'block';
    enterBtn.style.display = 'none';
    actionBtn.style.display = 'none';
    hintEl.style.display = 'block';
    setTimeout(() => { hintEl.style.display = 'none'; }, 6000);
  }

  function disposeActive() {
    if (!S) return;
    minigames.close();
    S = null;
    canvas.style.display = 'none';
    exitBtn.style.display = 'none';
    actionBtn.style.display = 'none';
    hintEl.style.display = 'none';
    actionQueued = false;
  }

  // ----- inside update: step the 2D interior, paint it, mirror its prompt -----
  function updateInterior(dt, frame) {
    if (minigames.active) { actionBtn.style.display = 'none'; return; }   // interior frozen under the game
    const I = S.I;
    const inp = {
      jx: frame ? (frame.steer || 0) : 0,
      jy: frame && frame.down ? 1 : frame && frame.up ? -1 : 0,
      jm: 0, keys: {}, action: actionQueued,
    };
    inp.jm = Math.min(1, Math.hypot(inp.jx, inp.jy));
    actionQueued = false;
    if (I.step(dt, inp) === 'exit') { exit(); return; }
    drainEvents(I);
    if (minigames.active) { actionBtn.style.display = 'none'; return; }   // PLAY just opened one
    IR.draw(I, innerWidth, innerHeight, DPR, tSec);
    const pr = I.prompt();
    if (pr) {
      if (actionBtn.textContent !== pr) actionBtn.textContent = pr;
      actionBtn.style.display = 'block';
    } else actionBtn.style.display = 'none';
  }

  // ----- door-mom beats (outside; Lazaris + Grant) — unchanged -----
  function beatTick(dt, frame) {
    for (const [stopId, beat] of Object.entries(DOOR_BEATS)) {
      const st = beats[stopId], stop = stops[stopId];
      if (!stop) continue;
      const d = Math.hypot(frame.x - stop.hx, frame.z - stop.hz);
      if (!st.mom && d < 130) {
        const mx = stop.hx + (stop.sx - stop.hx) * 0.16, mz = stop.hz + (stop.sz - stop.hz) * 0.16;
        st.mom = makeFigure(beat.momRow);
        st.mom.group.position.set(mx, 0, mz);
        st.mom.group.rotation.y = Math.atan2(stop.sx - mx, stop.sz - mz);
        scene.add(st.mom.group);
        if (beat.boots) {
          const bg = new THREE.Group();
          const bm = new THREE.MeshStandardMaterial({ color: 0x6e5136, roughness: 0.9 });
          for (const [ox, oz, ry] of [[0, 0, 0.4], [0.5, 0.35, 2.2]]) {
            const boot = new THREE.Mesh(BOX, bm);
            boot.scale.set(0.13, 0.24, 0.3); boot.position.set(ox, 0.12, oz); boot.rotation.y = ry;
            bg.add(boot);
          }
          bg.position.set(stop.hx + (stop.sx - stop.hx) * 0.34 + 1.2, 0, stop.hz + (stop.sz - stop.hz) * 0.34 + 0.6);
          scene.add(bg); st.boots = bg;
        }
      }
      if (st.mom && d > 175) {
        scene.remove(st.mom.group);
        st.mom.group.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
        st.mom = null;
        if (st.boots) { scene.remove(st.boots); st.boots = null; }
      }
      if (!st.mom) continue;
      poseIdle(st.mom, tSec + st.mom.phase);
      if (st.armed && d < BEAT_RANGE) { st.armed = false; st.playing = true; st.seqT = 0; st.fired.clear(); }
      if (!st.armed && d > BEAT_REARM) st.armed = true;
      if (st.playing) {
        st.seqT += dt;
        beat.sequence.forEach((line, i) => {
          if (st.seqT >= line.at && !st.fired.has(i)) {
            st.fired.add(i);
            showCaption(`<b>${line.who}:</b> ${line.text}`, 2.4);
          }
        });
        const last = beat.sequence[beat.sequence.length - 1];
        if (st.seqT > last.at + 2.6) st.playing = false;
      }
    }
  }

  // ----- proximity prompt — unchanged -----
  function promptTick(frame) {
    promptStop = null;
    if (frame.started && frame.speed !== undefined && Math.abs(frame.speed) < 3) {
      let best = ENTER_RANGE;
      for (const stopId of Object.keys(STOP_INTERIOR)) {
        const stop = stops[stopId];
        if (!stop) continue;
        // houses sit back from their street stop point (Kosack's is ~38 m);
        // measure to whichever end of the driveway is closer
        const d = Math.min(Math.hypot(frame.x - stop.hx, frame.z - stop.hz),
                           Math.hypot(frame.x - stop.sx, frame.z - stop.sz) + 4);
        if (d < best) { best = d; promptStop = stopId; }
      }
    }
    if (promptStop && !fading) {
      const data = HOUSE_INTERIORS[STOP_INTERIOR[promptStop]];
      enterBtn.textContent = `▼ GO IN — ${data.display}`;
      enterBtn.style.display = 'block';
    } else enterBtn.style.display = 'none';
  }

  // ----- public API -----
  function tick(dt, frame) {
    tSec += dt;
    captionTick();
    if (S) { updateInterior(dt, frame); return true; }
    if (!fading && frame && frame.started) { promptTick(frame); beatTick(dt, frame); }
    else if (!fading) enterBtn.style.display = 'none';
    return false;
  }
  function partyAnchors(stopId) {
    const stop = stops[stopId];
    if (!stop) return null;
    const ux = (stop.sx - stop.hx), uz = (stop.sz - stop.hz), uL = Math.hypot(ux, uz) || 1;
    const sux = ux / uL, suz = uz / uL;   // unit vector house -> street
    const yard = [];
    for (const r of [7.5, 10.5, 13.5, 16.5]) {
      const n = Math.max(8, Math.floor(2 * Math.PI * r / 1.4));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = stop.hx + Math.cos(a) * r, pz = stop.hz + Math.sin(a) * r;
        const dot = Math.cos(a) * sux + Math.sin(a) * suz;
        if (dot > 0.55 && r < 12) continue;                    // keep the street frontage clear
        if (surfaceAt && surfaceAt(px, pz) === 'road') continue;
        yard.push({ x: px, y: 0, z: pz });
      }
    }
    if (stopId === 'kosack') {                                    // the pool cluster (back yard)
      const cx = stop.hx - sux * 13, cz = stop.hz - suz * 13;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++)
        yard.push({ x: cx + (i - 2) * 2.3, y: 0, z: cz + (j - 1) * 2.3 });
    }
    // the party floor span stays on the record, but there is no 3D stage
    // under the map any more, so no inside points are handed out.
    let insideFloor = null, partySpan = null;
    const data = HOUSE_INTERIORS[STOP_INTERIOR[stopId]];
    if (data && data.party) {
      const f = data.floors.find(fl => fl.id === data.party.floor);
      insideFloor = f.id; partySpan = { ...data.party };
    }
    return { yard, inside: [], insideFloor, partySpan, stageY: STAGE_Y };
  }
  function stageOrigin(stopId) {
    const stop = stops[stopId];
    return stop ? { x: stop.hx, y: STAGE_Y, z: stop.hz } : null;
  }
  function stats() {
    if (!S) return { active: false };
    const I = S.I;
    return { active: true, house: S.stopId, floor: I.hero.floor, heroX: +I.hero.x.toFixed(2),
             drank: I.hero.drank, beer: !!I.hero.beer, dogs: I.dogs.length, mode: '2d', miniGame: minigames.active };
  }
  // proof/debug seam (host __proof.houseHero): place the hero directly —
  // headless SwiftShader renders this world at <1 fps, so scripted walks
  // take minutes of wall time; real play walks at full speed.
  function debugSetHero(x, floorId) {
    if (!S) return false;
    const I = S.I, H = I.hero;
    if (floorId && I.F[floorId]) H.floor = floorId;
    const f = I.F[H.floor];
    if (!f) return false;
    H.x = Math.max(f.x0 + 0.35, Math.min(f.x1 - 0.35, x));
    H.link = null;
    IR.camX = null;
    return true;
  }
  return {
    tick, enter, exit, partyAnchors, stageOrigin, stats, debugSetHero,
    openMiniGame(kind) { if (kind === 'genesis') minigames.openBoxing(); else minigames.openArcade(); },
    closeMiniGame() { minigames.close(); },
    get miniGameActive() { return minigames.active; },
    get active() { return !!S; },
  };
}
export default createInteriors;
