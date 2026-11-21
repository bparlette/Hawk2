// missions.js — Scaggsville 3D LANE D: the two mission beats the 2D game
// (Hawk games/laurel-fulton) has and 3D didn't: M-B Kosack's FAKE-COP
// pull-over and M-C the NIGHT PARTY. Beats + rules ported from the built
// 2D modules (src/lf_fakecop.js, src/lf_party.js, DESIGN-G17/G18); the
// mechanics are rebuilt for 3D driving. All UI is this module's own DOM
// (z-index >= 1100, gptouch-safe); the host only feeds it a per-frame
// snapshot and three small hooks (see INTEGRATION NOTES in the lane report).
//
// SEAMS to parallel lanes (search markers):
//   SEAM-A (crowd): Lane A's src/crowd.js landed DURING this lane's build
//     and the host exposes it as window.__crowd for this lane. buildParty()
//     consumes spawnCrowd(x, z, count, {radius, stand, speed}) for the far
//     crowd when present; the local fallback (hand-merged silhouette
//     guests, fleet.js technique) covers a host without it. Near guests +
//     the crew greeters stay on shared/people.js either way — they need
//     scripted walk/wave the instanced system doesn't do.
//   SEAM-B (interiors): Lane B's src/interiors.js also landed during the
//     build (cutaway stage under the map, STAGE_Y=-42, with a Kosack pool
//     cluster). The party here is still staged outdoors — yard / driveway
//     / street in front of Kosack's house (10400 Derby) from the stop's own
//     house/street points, per this lane's brief. Swap point: partySite().
//   SEAM-C (audio): Lane C's src/audio.js — gameAudio.siren(on),
//     partyMusic(on), crowdMurmur(level), whoop(), arrival() are called
//     through a guarded dynamic import, so a missing/renamed audio module
//     degrades to silence instead of breaking the beat.
//   SEAM-NIGHT: the day/night lane (src/daynight.js) owns ALL scene
//     lighting and walks the rally golden -> night (finale lands at phase
//     0.92, full night, and holds). This lane therefore does NOT touch the
//     lights when ctx.daynight is present: party.nightK is READ off the
//     cycle phase and only drives this module's own party lights + string
//     bulbs. The local lerp (applyNight) remains as a fallback for a host
//     without the cycle.

import * as THREE from 'three';
import { buildPerson, poseIdle, poseWave, poseWalk } from '../../shared/people.js';
import { CREW_PEOPLE } from './crew.js';
import { makeParkedFleet } from './fleet.js';
import { pursue, collide } from './drive.js';

/* ------------------------------ audio seam ------------------------------ */
let AUDIO = null;
import('./audio.js').then(m => { AUDIO = m.gameAudio || null; }).catch(() => { AUDIO = null; });
const snd = {
  siren(on) { try { AUDIO && AUDIO.siren && AUDIO.siren(!!on); } catch (_) {} },
  woop() { try { AUDIO && AUDIO.whoop && AUDIO.whoop(); } catch (_) {} },
  arrival() { try { AUDIO && AUDIO.arrival && AUDIO.arrival(); } catch (_) {} },
  party(on) { try { AUDIO && AUDIO.partyMusic && AUDIO.partyMusic(!!on); } catch (_) {} },
  murmur(v) { try { AUDIO && AUDIO.crowdMurmur && AUDIO.crowdMurmur(v); } catch (_) {} },
};

/* ------------------------------ 2D canon -------------------------------- */
// DESIGN-G17 §6 barks, verbatim from the built 2D game.
const KOSACK_LINES = [
  "Pull it over, buddy! ...Nah, I'm messing with ya!",
  "Step out the vehicle — wait, got any ones?",
  "Sir, you were doing forty in a Cavalier zone.",
  "Relax, I'm not a cop. Cool car though.",
  "Don't tell nobody, I'm late to Atholton anyway.",
];
const DRIVER_PULL_LINES = [
  "Wait... you're seventeen in a red Cavalier?!",
  "Man, I hid my stash for THAT?!",
  "Officer—hold up, I went to school with you!",
];

const fwd = h => ({ x: Math.sin(h), z: Math.cos(h) });
const right = h => ({ x: Math.cos(h), z: -Math.sin(h) });
const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ============================ module factory ============================ */
export function createMissions(ctx) {
  const { scene, camera, renderer, world, stops } = ctx;
  const KOS = stops['kosack'];

  /* ------------------------------ DOM UI ------------------------------ */
  const style = document.createElement('style');
  style.textContent = `
    #msn-root{position:fixed;inset:0;pointer-events:none;z-index:1300;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
    .msn-bark{position:absolute;transform:translate(-50%,-100%);background:rgba(255,241,216,.96);color:#210f2e;
      border:2px solid #210f2e;border-radius:10px;padding:5px 10px;font-size:13px;font-weight:700;max-width:230px;
      text-align:center;line-height:1.25;box-shadow:0 3px 10px rgba(0,0,0,.45);white-space:normal;}
    .msn-bark b{color:#8a1f2d;}
    #msn-pill{position:absolute;left:50%;top:21%;transform:translateX(-50%);background:rgba(27,20,48,.92);color:#fff;
      border-radius:999px;padding:9px 18px;font-size:15px;font-weight:900;letter-spacing:.03em;text-align:center;
      border-left:8px solid #ff2e38;border-right:8px solid #3882ff;box-shadow:0 4px 16px rgba(0,0,0,.5);display:none;max-width:92vw;}
    #msn-toast{position:absolute;left:50%;top:104px;transform:translateX(-50%);background:rgba(27,20,48,.92);color:#ffd25c;
      border-radius:12px;padding:8px 16px;font-size:14px;font-weight:900;text-align:center;
      border-left:6px solid #ff2e38;border-right:6px solid #3882ff;box-shadow:0 4px 14px rgba(0,0,0,.5);display:none;max-width:92vw;}
    #msn-panel{position:absolute;left:50%;bottom:calc(118px + env(safe-area-inset-bottom));transform:translateX(-50%);
      width:min(430px,94vw);background:rgba(27,20,48,.95);border:2px solid rgba(255,255,255,.25);border-radius:16px;
      color:#fff;padding:14px 16px 12px;pointer-events:auto;touch-action:none;display:none;box-shadow:0 10px 34px rgba(0,0,0,.6);z-index:1400;}
    #msn-panel h3{margin:0 0 4px;font-size:16px;letter-spacing:.04em;}
    #msn-panel .who{color:#ffd9a0;font-size:12px;font-weight:800;letter-spacing:.12em;}
    #msn-panel p{margin:6px 0 10px;font-size:15px;line-height:1.4;color:#f4ecd8;}
    #msn-panel .ticket{background:#fdf6dd;color:#210f2e;border-radius:10px;padding:10px 12px;font-size:13.5px;line-height:1.5;margin:8px 0 10px;}
    .msn-btn{display:block;width:100%;margin:7px 0 0;padding:13px 10px;border-radius:12px;border:2px solid rgba(255,255,255,.35);
      background:rgba(255,255,255,.10);color:#fff;font-size:15.5px;font-weight:800;text-align:center;cursor:pointer;}
    .msn-btn:active{background:rgba(255,210,63,.25);border-color:#ffd23f;}
    #msn-night{position:absolute;right:14px;bottom:calc(196px + env(safe-area-inset-bottom));pointer-events:auto;touch-action:none;
      background:rgba(27,20,48,.92);color:#ffd9a0;border:2px solid rgba(255,217,160,.5);border-radius:999px;
      padding:11px 16px;font-size:14px;font-weight:900;display:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5);}
  `;
  document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'msn-root';
  root.innerHTML = `<div id="msn-barks"></div><div id="msn-pill"></div><div id="msn-toast"></div>
    <div id="msn-panel"></div><button id="msn-night">🌙 CALL IT A NIGHT</button>`;
  document.body.appendChild(root);
  const barkBox = root.querySelector('#msn-barks'), pillEl = root.querySelector('#msn-pill'),
        toastEl = root.querySelector('#msn-toast'), panelEl = root.querySelector('#msn-panel'),
        nightBtn = root.querySelector('#msn-night');

  let toastTimer = null;
  function showToast(text, hold = 2800) {
    toastEl.textContent = text; toastEl.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.style.display = 'none', hold);
  }
  function showPill(text) { if (text) { pillEl.textContent = text; pillEl.style.display = 'block'; } else pillEl.style.display = 'none'; }

  /* barks: world-anchored speech bubbles (the 2D game's cream pills) */
  const barks = [];   // { anchor:()=>({x,y,z}), text, t }
  function bark(anchor, text, dur = 2.8) {
    barks.push({ anchor, text, t: dur, el: null });
    if (barks.length > 3) { const b = barks.shift(); if (b.el) b.el.remove(); }
  }
  const _pv = new THREE.Vector3();
  function drawBarks(dt) {
    for (let i = barks.length - 1; i >= 0; i--) {
      const b = barks[i]; b.t -= dt;
      if (b.t <= 0) { if (b.el) b.el.remove(); barks.splice(i, 1); continue; }
      if (!b.el) { b.el = document.createElement('div'); b.el.className = 'msn-bark'; b.el.textContent = b.text; barkBox.appendChild(b.el); }
      const a = b.anchor(); _pv.set(a.x, a.y, a.z).project(camera);
      if (_pv.z > 1 || _pv.z < -1) { b.el.style.display = 'none'; continue; }
      b.el.style.display = 'block';
      b.el.style.left = ((_pv.x * 0.5 + 0.5) * innerWidth) + 'px';
      b.el.style.top = ((-_pv.y * 0.5 + 0.5) * innerHeight) + 'px';
      b.el.style.opacity = Math.min(1, b.t * 2);
    }
  }

  /* ===================== FAKE-COP: strobe light bar ===================== */
  // crew.js already rows Kosack's Cavalier with lightBar:true and
  // gpvehicles bakes the bar (blue lamp = own emissive material, red lamp =
  // shared tail material). The fleet layer here DRIVES the baked lamps:
  // wig-wag at the 2D cadence (6.4 Hz alternating red/blue, DESIGN-G17 §2)
  // + one alternating point light for the asphalt wash. If the baked lamps
  // can't be found (future factory change), an overlay bar is built instead.
  const rigs = new Map();   // veh object -> rig
  function strobeRig(veh) {
    if (!veh || rigs.has(veh)) return rigs.get(veh);
    let blue = null, red = null;
    for (const ch of veh.group.children) {
      if (!ch.isMesh || Math.abs(ch.position.z + 0.45) > 0.06 || ch.position.y < 1.0) continue;
      if (Math.abs(ch.position.x - 0.27) < 0.06) blue = ch;
      if (Math.abs(ch.position.x + 0.27) < 0.06) red = ch;
    }
    const rig = { veh, blue, red, light: null, overlay: null };
    const li = new THREE.PointLight(0xff2e38, 0, 21, 1.8);
    li.position.set(0, (blue ? blue.position.y : 1.5) + 0.25, -0.45);
    veh.group.add(li); rig.light = li;
    if (!blue || !red) {   // fallback overlay bar
      const g = new THREE.Group();
      const mR = new THREE.MeshStandardMaterial({ color: 0x550d10, emissive: 0xff2e38, emissiveIntensity: 0.1 });
      const mB = new THREE.MeshStandardMaterial({ color: 0x0d1e55, emissive: 0x3882ff, emissiveIntensity: 0.1 });
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.24), mR); r.position.set(-0.27, 1.52, -0.45);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.24), mB); b.position.set(0.27, 1.52, -0.45);
      g.add(r, b); veh.group.add(g);
      rig.overlay = { mR, mB };
    }
    rigs.set(veh, rig);
    return rig;
  }
  function driveStrobes(t, px, pz) {
    const ph = Math.floor(t * 6.4) % 2;                       // wig-wag phase
    const dbl = (Math.floor(t * 25.6) % 16) < 2 ? 0.25 : 1;  // double-strobe stutter every 4th beat
    for (const rig of rigs.values()) {
      const gp = rig.veh.group.position;
      const near = dist2d(gp.x, gp.z, px, pz) < 260;
      const on = near ? dbl : 0;
      if (rig.blue) rig.blue.material.emissiveIntensity = ph ? 3.4 * on : 0.12 * on;
      if (rig.red) rig.red.visible = !ph && near;
      if (rig.overlay) {
        rig.overlay.mB.emissiveIntensity = ph ? 3.4 * on : 0.1;
        rig.overlay.mR.emissiveIntensity = !ph ? 3.4 * on : 0.1;
      }
      rig.light.color.setHex(ph ? 0x3882ff : 0xff2e38);
      rig.light.intensity = 30 * on;
    }
  }

  /* ===================== FAKE-COP: the beat (M-B) ====================== */
  // 2D direction (lf_fakecop.js): the PLAYER drives Kosack's car and bluffs
  // traffic. 3D direction (lane brief): Kosack — in the convoy, in his own
  // Cavalier — pulls the PLAYER over on the Atholton leg. Same rules DNA:
  // hesitate -> stop -> comedy exchange, zero wanted stars, score toasts
  // (+250 FAKE STOP / +100 BUSTED BLUFF), 6.4 Hz strobes, his 5 barks.
  const cop = {
    phase: 'watch',       // watch|approach|park|walkup|panel|walkback|chase|rejoin|done
    f: null,              // Kosack follower entry (host followers[])
    joinedAt: -1, stillT: 0, t: 0, fig: null, figPhase: 0,
    lineIdx: 0, siren: false, inputLock: false,
  };
  function setSiren(on) { if (cop.siren !== on) { cop.siren = on; snd.siren(on); } }
  function driveFollower(f, dt, tx, tz, arriveDist) {
    let rest = dt;
    while (rest > 0) {   // substep like the host's 60 Hz physics
      const sdt = Math.min(rest, 1 / 30); rest -= sdt;
      pursue(f.state, tx, tz, sdt, world.surfaceAt(f.state.x, f.state.z), { arriveDist: arriveDist || 26, stop: true });
      collide(f.state, world.colliders);
    }
    f.veh.group.position.set(f.state.x, 0, f.state.z);
    f.veh.group.rotation.y = f.state.heading;
    f.veh.updateWheels(f.state.speed, f.state.steerVis, dt);
  }
  function figWalkTo(fig, tx, tz, dt, speed) {
    const P = fig.group.position;
    const dx = tx - P.x, dz = tz - P.z, dd = Math.hypot(dx, dz);
    if (dd < 0.55) return true;
    fig.group.rotation.y = Math.atan2(dx, dz);   // P is the position Vector3 — rotation lives on the group
    const step = Math.min(dd, speed * dt);
    P.x += dx / dd * step; P.z += dz / dd * step;
    cop.figPhase += dt * 7.5; poseWalk(fig, cop.figPhase);
    return false;
  }
  function openPanel(html) { panelEl.innerHTML = html; panelEl.style.display = 'block'; cop.inputLock = true; }
  function closePanel() { panelEl.style.display = 'none'; cop.inputLock = false; }
  function panelBtn(id, fn) {
    const el = panelEl.querySelector('#' + id);
    if (el) el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); fn(); });
  }
  function copCleanup(rejoin) {
    setSiren(false); showPill(null); closePanel();
    if (cop.fig) { scene.remove(cop.fig.group); cop.fig = null; }
    if (cop.f && rejoin) cop.f.missionHold = false;
    cop.phase = 'done';
  }
  function showStopPanel() {
    const line = KOSACK_LINES[cop.lineIdx % KOSACK_LINES.length];
    openPanel(`<div class="who">🚔 "OFFICER" KOSACK · FAKE TRAFFIC STOP</div>
      <h3>He's not a cop.</h3><p><b>Kosack:</b> "${line}"</p>
      <button class="msn-btn" id="pb-window">🙂 Roll down the window</button>
      <button class="msn-btn" id="pb-ticket">🎫 "You can't ticket me — you're not a cop"</button>
      <button class="msn-btn" id="pb-floor">🏎️ Floor it!</button>`);
    panelBtn('pb-window', () => {
      const reply = DRIVER_PULL_LINES[cop.lineIdx % DRIVER_PULL_LINES.length];
      openPanel(`<div class="who">🚔 FAKE TRAFFIC STOP</div>
        <p><b>You:</b> "${reply}"</p><p><b>Kosack:</b> "${KOSACK_LINES[3]}"</p>
        <button class="msn-btn" id="pb-letgo">😅 Okay okay — you got me</button>`);
      panelBtn('pb-letgo', () => {
        showToast('+250 FAKE STOP · he let you off 😎');
        bark(() => carRoof(cop.f), 'Kosack: ' + KOSACK_LINES[3], 3.0);
        closePanel(); cop.phase = 'walkback';
      });
    });
    panelBtn('pb-ticket', () => {
      openPanel(`<div class="who">🚔 FAKE TRAFFIC STOP</div>
        <p>He writes you a ticket anyway. On a Ledo napkin.</p>
        <div class="ticket"><b>OFFICIAL-ISH TICKET</b><br>Offence: doing 40 in a Cavalier zone<br>
        Fine: one (1) ones · Officer: B. Kosack <i>(not a cop)</i><br>Stars added: <b>ZERO</b> — he has no authority</div>
        <button class="msn-btn" id="pb-pay">💵 Pay the ones</button>`);
      panelBtn('pb-pay', () => {
        showToast('🎫 FAKE TICKET "PAID" — one (1) ones');
        bark(() => carRoof(cop.f), 'Kosack: ' + KOSACK_LINES[1], 3.0);
        closePanel(); cop.phase = 'walkback';
      });
    });
    panelBtn('pb-floor', () => {
      closePanel();
      showToast('🏎️ YOU FLOOR IT —');
      cop.phase = 'chase'; cop.t = 6; setSiren(true);
    });
  }
  function carRoof(f) {
    if (!f) return { x: 0, y: 2, z: 0 };
    return { x: f.state.x, y: 2.1, z: f.state.z };
  }
  function updateCop(dt, snap, tNow) {
    // strobes live on Kosack's car wherever it is (2D: always flashing)
    if (snap.parkedVehs && snap.parkedVehs['kosack']) strobeRig(snap.parkedVehs['kosack']);
    if (snap.playerStop === 'kosack' && snap.playerVeh) strobeRig(snap.playerVeh);
    const f = (snap.followers || []).find(x => x.carId === 'kosack');
    if (f) { strobeRig(f.veh); if (cop.f !== f) { cop.f = f; if (cop.joinedAt < 0) cop.joinedAt = tNow; } }

    switch (cop.phase) {
      case 'watch': {
        if (!snap.started || snap.finished || cop.f === null || !cop.f || snap.playerStop === 'kosack') break;
        if (tNow - cop.joinedAt > 9 && Math.abs(snap.player.speed) > 3) {
          cop.phase = 'approach'; cop.t = 26; cop.stillT = 0;
          cop.f.missionHold = true; setSiren(true);
          showPill('🚨 KOSACK IS "PULLING YOU OVER" — STOP YOUR CAR');
          bark(() => carRoof(cop.f), 'Kosack: ' + KOSACK_LINES[0], 3.2);
        }
        break;
      }
      case 'approach': {
        const p = snap.player, pf = fwd(p.heading);
        driveFollower(cop.f, dt, p.x - pf.x * 10.5, p.z - pf.z * 10.5, 30);
        cop.t -= dt;
        if (Math.abs(p.speed) < 0.6) cop.stillT += dt; else cop.stillT = 0;
        if (cop.stillT > 1.0 && dist2d(cop.f.state.x, cop.f.state.z, p.x, p.z) < 20) { cop.phase = 'park'; }
        else if (cop.t <= 0 || snap.finished) {   // fizzle: he gives up, no penalty (2D spirit)
          bark(() => carRoof(cop.f), 'Kosack: ' + KOSACK_LINES[4], 3.0);
          copCleanup(true);
        }
        break;
      }
      case 'park': {
        const p = snap.player, pf = fwd(p.heading);
        const tx = p.x - pf.x * 11, tz = p.z - pf.z * 11;
        driveFollower(cop.f, dt, tx, tz, 7);
        if (dist2d(cop.f.state.x, cop.f.state.z, tx, tz) < 1.6 && Math.abs(cop.f.state.speed) < 0.8) {
          setSiren(false);
          cop.fig = buildPerson(CREW_PEOPLE.kosack);
          const rt = right(cop.f.state.heading);
          cop.fig.group.position.set(cop.f.state.x + rt.x * 1.3, 0, cop.f.state.z + rt.z * 1.3);
          scene.add(cop.fig.group);
          cop.phase = 'walkup';
        }
        break;
      }
      case 'walkup': {
        const p = snap.player, pr = right(p.heading), pf = fwd(p.heading);
        const tx = p.x + pr.x * 1.8 + pf.x * 0.15, tz = p.z + pr.z * 1.8 + pf.z * 0.15;
        if (figWalkTo(cop.fig, tx, tz, dt, 1.7)) {
          cop.fig.group.rotation.y = Math.atan2(p.x - tx, p.z - tz);
          poseIdle(cop.fig, tNow);
          cop.lineIdx = 1 + Math.floor(Math.random() * 2);   // vary the opener line
          cop.phase = 'panel'; showStopPanel();
        }
        break;
      }
      case 'panel': break;   // waiting on the player's tap (input locked by host hook)
      case 'walkback': {
        const rt = right(cop.f.state.heading);
        if (figWalkTo(cop.fig, cop.f.state.x + rt.x * 1.3, cop.f.state.z + rt.z * 1.3, dt, 1.9)) copCleanup(true);
        break;
      }
      case 'chase': {
        // Kosack gives chase for 6 s, then laughs it off (2D PEEL_OFF beat,
        // roles swapped). His figure dives back in instantly.
        if (cop.fig) { scene.remove(cop.fig.group); cop.fig = null; }
        cop.t -= dt;
        const p = snap.player;
        driveFollower(cop.f, dt, p.x, p.z, 34);
        if (cop.t <= 0 || dist2d(cop.f.state.x, cop.f.state.z, p.x, p.z) > 60) {
          showToast('+100 BUSTED BLUFF');
          bark(() => carRoof(cop.f), 'Kosack: ' + KOSACK_LINES[4], 3.0);
          copCleanup(true);
        }
        break;
      }
    }
  }

  /* ===================== NIGHT PARTY: site (M-C) ======================= */
  // SEAM-B: staged from the stop's own points — yard behind the house,
  // driveway + street in front. Lane B's interiors.partyAnchors('kosack')
  // landed during the build and IS consumed in buildParty() when exposed
  // (road-filtered yard rings + the back-yard pool cluster); the stop-point
  // layout below remains the fallback if the seam is absent.
  function partySite() {
    const h = { x: KOS.hx, z: KOS.hz }, s = { x: KOS.sx, z: KOS.sz };
    let fx = s.x - h.x, fz = s.z - h.z; const fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
    const front = { x: fx, z: fz }, back = { x: -fx, z: -fz }, side = { x: fz, z: -fx };
    return { h, s, front, back, side,
             yard: { x: h.x + back.x * 13, z: h.z + back.z * 13 },
             drive: { x: h.x + front.x * 8.5, z: h.z + front.z * 8.5 } };
  }
  // SEAM-A: local fallback crowd — swap for Lane A's spawnCrowd when it lands.
  function mergeFigureGeos(list) {
    const pos = [], nor = [], col = [];
    const M4 = new THREE.Matrix4();
    function push(geo, x, y, z, ry, hex) {
      const g = geo.index ? geo.toNonIndexed() : geo;
      M4.makeRotationY(ry).setPosition(x, y, z); g.applyMatrix4(M4);
      const n = g.attributes.position.count, c = new THREE.Color(hex);
      pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      col.push(arr);
    }
    const torso = new THREE.CapsuleGeometry(0.155, 0.52, 3, 8);
    const head = new THREE.SphereGeometry(0.105, 8, 6);
    const legs = new THREE.BoxGeometry(0.30, 0.88, 0.19);
    for (const f of list) {
      push(legs, f.x, 0.44, f.z, f.ry, f.pants);
      push(torso, f.x, 1.03, f.z, f.ry, f.shirt);
      push(head, f.x, 1.60, f.z, f.ry, f.skin);
    }
    let total = 0; for (const a of pos) total += a.length;
    const P = new Float32Array(total), N = new Float32Array(total), C = new Float32Array(total);
    let o = 0; for (let i = 0; i < pos.length; i++) { P.set(pos[i], o); N.set(nor[i], o); C.set(col[i], o); o += pos[i].length; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  }

  const party = {
    phase: 'dormant',   // dormant|invited|active|complete
    built: false, nightK: 0, greeted: false, musicOn: false,
    greeters: [], near: [], chunks: [], lights: [], bulbs: null,
    day: null, center: null,
  };
  function buildParty() {
    const S = partySite(); party.center = S.yard;
    const rnd = mulberry32(19961120);
    const grp = new THREE.Group(); scene.add(grp);
    const clearOfHouse = (x, z, r) => dist2d(x, z, S.h.x, S.h.z) >= r;

    /* --- crowd placement: sample the real ground around the house --- */
    const yardPts = [], streetPts = [];
    for (let i = 0; i < 900 && (yardPts.length < 60 || streetPts.length < 24); i++) {
      const a = rnd() * Math.PI * 2, r = 7.5 + rnd() * 24;
      const x = S.h.x + Math.cos(a) * r, z = S.h.z + Math.sin(a) * r;
      const surf = world.surfaceAt(x, z);
      if (surf === 'grass' && clearOfHouse(x, z, 7.5)) yardPts.push({ x, z });
      else if (surf === 'road' && clearOfHouse(x, z, 9)) streetPts.push({ x, z });
    }
    const SHIRTS = [0xb8503a, 0x3a6ea5, 0xe8e6df, 0x2e5e34, 0xd9a441, 0x707880, 0x8a1f2d, 0x5b4a8a, 0xe07840, 0x3f7d8c];
    const PANTS = [0x2a3a5e, 0x23232a, 0x565048, 0x4a4238, 0x37414e, 0x6a6248];
    const SKINS = [0xe0ac69, 0xf1c27d, 0xc68642, 0x8d5524];
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    /* SEAM-A: Lane A's instanced crowd when the host exposes it (their
       system skips collider interiors and animates milling/standing). */
    const crowdAPI = (typeof window !== 'undefined' && window.__crowd && window.__crowd.spawnCrowd) ? window.__crowd : null;
    if (crowdAPI) {
      const h1 = crowdAPI.spawnCrowd(S.yard.x, S.yard.z, 62, { radius: 11.5, stand: 0.4, speed: 0.8 });
      const h2 = crowdAPI.spawnCrowd(S.drive.x, S.drive.z, 23, { radius: 10, stand: 0.4, speed: 0.8 });
      party.crowdHandles = [h1, h2];
      party.crowdPlaced = (h1 ? h1.placed : 0) + (h2 ? h2.placed : 0);
    } else {
      const farList = [];
      const farFrom = (pts, n, spread) => {
        for (let i = 0; i < n && pts.length; i++) {
          const p = pts[Math.floor(rnd() * pts.length)];
          farList.push({ x: p.x + (rnd() - 0.5) * spread, z: p.z + (rnd() - 0.5) * spread,
                         ry: rnd() * Math.PI * 2, shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS) });
        }
      };
      farFrom(yardPts, 62, 2.2); farFrom(streetPts, 23, 2.6);   // 85 far guests
      party.crowdPlaced = farList.length;
      for (let c = 0; c < 3; c++) {
        const chunk = mergeFigureGeos(farList.filter((_, i) => i % 3 === c));
        grp.add(chunk); party.chunks.push(chunk);
      }
    }
    /* SEAM-B bAnchors: Lane B's partyAnchors('kosack') — yard standing
       points (rings around the house, street frontage + roads filtered
       out) ending with the back-yard pool cluster. Consumed when the host
       exposes them (ctx.interiors or the __proof seam); stop-point layout
       above stays as the fallback. */
    let bAnchors = null;
    try {
      bAnchors = (ctx.interiors && ctx.interiors.partyAnchors && ctx.interiors.partyAnchors('kosack')) ||
        (typeof window !== 'undefined' && window.__proof && window.__proof.partyAnchors && window.__proof.partyAnchors('kosack')) || null;
    } catch (e) { bAnchors = null; }
    if (bAnchors && bAnchors.yard && bAnchors.yard.length > 15 && crowdAPI) {
      const pool = bAnchors.yard.slice(-15);
      const pcx = pool.reduce((a, p) => a + p.x, 0) / pool.length, pcz = pool.reduce((a, p) => a + p.z, 0) / pool.length;
      const h3 = crowdAPI.spawnCrowd(pcx, pcz, 18, { radius: 5.5, stand: 0.45, speed: 0.8 });
      if (h3) { party.crowdHandles.push(h3); party.crowdPlaced += h3.placed; }
    }
    /* near guests: full people.js figures (8) in the yard/driveway —
       on Lane B's anchor points (street-nearest spread) when available */
    const nearSpots = [];
    if (bAnchors && bAnchors.yard && bAnchors.yard.length >= 8) {
      const byStreet = [...bAnchors.yard].sort((a, b) =>
        dist2d(a.x, a.z, S.s.x, S.s.z) - dist2d(b.x, b.z, S.s.x, S.s.z));
      for (let i = 0; i < 8; i++) {
        const p = byStreet[Math.floor(i * byStreet.length / 8)];
        nearSpots.push({ x: p.x, z: p.z });
      }
    }
    for (let i = 0; i < 8 && nearSpots.length < 8; i++) {
      const base = i < 5 ? S.yard : S.drive, a = rnd() * Math.PI * 2, r = 2.5 + rnd() * 4.5;
      const x = base.x + Math.cos(a) * r, z = base.z + Math.sin(a) * r;
      if (!clearOfHouse(x, z, 7.2)) continue;
      nearSpots.push({ x, z });
    }
    for (const sp of nearSpots) {
      const row = { skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS), hair: 0x2a1a0e,
                    hairStyle: pick(['short', 'long', 'cap']), hat: rnd() < 0.4 ? pick(['cap', 'brim', 'beanie']) : undefined,
                    hatColor: pick(SHIRTS) };
      const fig = buildPerson(row);
      fig.group.position.set(sp.x, 0, sp.z);
      fig.group.rotation.y = rnd() * Math.PI * 2;
      grp.add(fig.group);
      party.near.push({ fig, phase: rnd() * 9, dance: rnd() < 0.5 });
    }
    /* the crew greeters: all 7 households in the driveway arc */
    Object.keys(CREW_PEOPLE).forEach((carId, i) => {
      const off = (i - 3) * 1.7;
      const x = S.drive.x + S.side.x * off + S.back.x * (i % 2) * 1.3;
      const z = S.drive.z + S.side.z * off + S.back.z * (i % 2) * 1.3;
      const fig = buildPerson(CREW_PEOPLE[carId]);
      fig.group.position.set(x, 0, z);
      fig.group.rotation.y = Math.atan2(S.s.x - x, S.s.z - z);
      grp.add(fig.group);
      party.greeters.push({ fig, carId, mode: 'idle', tx: x, tz: z, phase: rnd() * 9, hx: x, hz: z });
    });
    /* parked dressing cars on Kosack's street (fleet.js silhouettes) */
    const placements = []; let lastX = 1e9, lastZ = 1e9;
    for (const p of streetPts) {
      if (placements.length >= 7) break;
      if (dist2d(p.x, p.z, lastX, lastZ) < 7.5) continue;
      placements.push({ x: p.x, z: p.z, ry: Math.atan2(S.side.x, S.side.z) + (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.2,
                        paint: pick([0xb02020, 0x8a8f96, 0x5d6a7a, 0x3a7d4c, 0x9a958a, 0x2a66b0]) });
      lastX = p.x; lastZ = p.z;
    }
    if (placements.length) grp.add(makeParkedFleet(placements));

    /* --- string lights: poles + catenary strands of warm bulbs --- */
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.9 });
    const pole = (x, z, hgt) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, hgt, 6), poleMat);
      m.position.set(x, hgt / 2, z); grp.add(m); return { x, y: hgt, z };
    };
    const A = (v, s, f, y) => ({ x: S.h.x + S.side.x * s + S.front.x * f, y, z: S.h.z + S.side.z * s + S.front.z * f });
    const anchors = [
      A(0, 6, 4.5, 3.2),
      pole(S.drive.x + S.side.x * 7 + S.front.x * 3, S.drive.z + S.side.z * 7 + S.front.z * 3, 3.0),
      pole(S.drive.x - S.side.x * 7 + S.front.x * 3, S.drive.z - S.side.z * 7 + S.front.z * 3, 3.0),
      A(0, -6, 4.5, 3.2),
      { x: S.h.x + S.back.x * 4 + S.side.x * 5, y: 3.1, z: S.h.z + S.back.z * 4 + S.side.z * 5 },
      pole(S.yard.x + S.back.x * 6, S.yard.z + S.back.z * 6, 3.2),
      { x: S.h.x + S.back.x * 4 - S.side.x * 5, y: 3.1, z: S.h.z + S.back.z * 4 - S.side.z * 5 },
    ];
    const bulbPos = [], bulbCol = [];
    const bulbC = [new THREE.Color(0xffc37a), new THREE.Color(0xffb36b), new THREE.Color(0xffd9a0)];
    for (let sIdx = 0; sIdx < anchors.length - 1; sIdx++) {
      const a = anchors[sIdx], b = anchors[sIdx + 1];
      const len = dist2d(a.x, a.z, b.x, b.z), steps = Math.max(4, Math.floor(len / 0.85));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        bulbPos.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * 0.55, a.z + (b.z - a.z) * t);
        const c = bulbC[Math.floor(rnd() * 3)]; bulbCol.push(c.r, c.g, c.b);
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bulbPos, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(bulbCol, 3));
    const bmat = new THREE.PointsMaterial({ size: 0.34, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    party.bulbs = new THREE.Points(bg, bmat); grp.add(party.bulbs);
    /* party lights: porch warm, yard warm, back-door (basement) cyan */
    const mk = (x, y, z, color, max) => { const L = new THREE.PointLight(color, 0, max * 1.9, 1.8); L.position.set(x, y, z); grp.add(L); party.lights.push({ L, max }); return L; };
    mk(S.h.x + S.front.x * 2.5, 2.8, S.h.z + S.front.z * 2.5, 0xffb36b, 34);
    mk(S.yard.x, 3.4, S.yard.z, 0xff9a4d, 52);
    mk(S.h.x + S.back.x * 3.5, 1.6, S.h.z + S.back.z * 3.5, 0x37c8e8, 24);

    /* day lighting snapshot for the nightfall lerp */
    party.day = {
      sunI: ctx.sun.intensity, sunC: ctx.sun.color.clone(),
      hemiI: ctx.hemi.intensity, hemiS: ctx.hemi.color.clone(), hemiG: ctx.hemi.groundColor.clone(),
      ambI: ctx.amb.intensity, ambC: ctx.amb.color.clone(),
      fogC: scene.fog ? scene.fog.color.clone() : null, fogN: scene.fog ? scene.fog.near : 80, fogF: scene.fog ? scene.fog.far : 700,
      exp: renderer.toneMappingExposure,
      zen: domeU('uZen'), mid: domeU('uMid'), hor: domeU('uHor'),
    };
    party.built = true;
    function domeU(name) {
      const u = ctx.dome && ctx.dome.material && ctx.dome.material.uniforms && ctx.dome.material.uniforms[name];
      return u ? u.value.clone() : null;
    }
  }
  const NIGHT = {
    sunI: 0.32, sunC: new THREE.Color(0x86a8ff),
    hemiI: 0.85, hemiS: new THREE.Color(0x33477a), hemiG: new THREE.Color(0x14161f),
    ambI: 0.5, ambC: new THREE.Color(0x39548c),
    fogC: new THREE.Color(0x141d33), fogN: 55, fogF: 520, exp: 1.12,
    zen: new THREE.Vector3(0.015, 0.03, 0.10), mid: new THREE.Vector3(0.05, 0.09, 0.22), hor: new THREE.Vector3(0.23, 0.13, 0.16),
  };
  function applyNight(k) {   // SEAM-NIGHT swap point
    if (!party.day || k <= 0) return;
    const D = party.day, L = (a, b) => a + (b - a) * k;
    ctx.sun.intensity = L(D.sunI, NIGHT.sunI); ctx.sun.color.copy(D.sunC).lerp(NIGHT.sunC, k);
    ctx.hemi.intensity = L(D.hemiI, NIGHT.hemiI); ctx.hemi.color.copy(D.hemiS).lerp(NIGHT.hemiS, k);
    ctx.hemi.groundColor.copy(D.hemiG).lerp(NIGHT.hemiG, k);
    ctx.amb.intensity = L(D.ambI, NIGHT.ambI); ctx.amb.color.copy(D.ambC).lerp(NIGHT.ambC, k);
    if (scene.fog && D.fogC) { scene.fog.color.copy(D.fogC).lerp(NIGHT.fogC, k); scene.fog.near = L(D.fogN, NIGHT.fogN); scene.fog.far = L(D.fogF, NIGHT.fogF); }
    renderer.toneMappingExposure = L(D.exp, NIGHT.exp);
    const U = ctx.dome && ctx.dome.material && ctx.dome.material.uniforms;
    if (U) {
      if (U.uZen && D.zen) U.uZen.value.copy(D.zen).lerp(NIGHT.zen, k);
      if (U.uMid && D.mid) U.uMid.value.copy(D.mid).lerp(NIGHT.mid, k);
      if (U.uHor && D.hor) U.uHor.value.copy(D.hor).lerp(NIGHT.hor, k);
    }
    drivePartyLights(k);
  }
  function drivePartyLights(k) {   // this module's OWN lights only (porch/yard/basement + bulbs)
    for (const e of party.lights) e.L.intensity = e.max * k;
    if (party.bulbs) party.bulbs.material.opacity = 0.95 * k;
  }
  function setPartyMusic(on) {
    if (party.musicOn === on) return; party.musicOn = on;
    snd.party(on); snd.murmur(on ? 0.8 : 0);
  }
  nightBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); completeParty(); });
  function completeParty() {
    if (party.phase !== 'active') return;
    party.phase = 'complete'; nightBtn.style.display = 'none';
    ctx.showBanner('🌙 THAT\'S A SCAGGSVILLE NIGHT', 'Rally + party complete — free cruise', 6000);
    if (ctx.rallyEl) ctx.rallyEl.textContent = 'RALLY 7/7 🏁 · PARTY ✓';
  }
  function updateParty(dt, snap, tNow) {
    if (!snap.started) return;
    if (!party.built) buildParty();
    const p = snap.player;
    const dParty = dist2d(p.x, p.z, party.center.x, party.center.z);
    if (party.phase === 'dormant' && snap.finished) {
      party.phase = 'invited';
      world.target.setStop(KOS);
      if (ctx.targetEl) ctx.targetEl.textContent = 'AFTER-PARTY: Kosack\'s · Derby Drive — 100 guests';
      ctx.showBanner('🎉 AFTER-PARTY AT KOSACK\'S', 'The crew\'s heading to Derby Drive — follow the beacon', 5200);
    }
    if (ctx.daynight) {   // SEAM-NIGHT: the cycle owns the scene; read it
      party.nightK = THREE.MathUtils.clamp((ctx.daynight.phase - 0.60) / 0.32, 0, 1);
      drivePartyLights(party.nightK);
    } else {              // fallback: local nightfall lerp (no cycle in host)
      const wantNight = party.phase !== 'dormant' ? 1 : 0;
      if (Math.abs(party.nightK - wantNight) > 0.001) {
        party.nightK += Math.sign(wantNight - party.nightK) * Math.min(Math.abs(wantNight - party.nightK), dt * 0.055);
        applyNight(party.nightK);
      }
    }
    if (party.phase === 'invited' && dParty < 30 && party.nightK > 0.45) {
      party.phase = 'active'; party.greeted = true;
      const pf = fwd(p.heading);
      for (const g of party.greeters) {   // the rally's arrival beat: they come to YOU
        g.mode = 'walk';
        g.tx = p.x + pf.x * 4.2 + (Math.random() - 0.5) * 3.4;
        g.tz = p.z + pf.z * 4.2 + (Math.random() - 0.5) * 3.4;
      }
      ctx.showBanner('🎉 THE CREW\'S ALL HERE!', 'Night party at Kosack\'s — 100 guests', 5200);
      snd.woop(); snd.arrival(); setPartyMusic(true);
      nightBtn.style.display = 'block';
    }
    if (party.phase === 'active' && dParty > 95) completeParty();
    setPartyMusic(party.phase === 'active' || (party.phase === 'complete' && dParty < 120));
    /* animate the crowd */
    for (const g of party.greeters) {
      if (g.mode === 'walk') {
        const P = g.fig.group.position, dx = g.tx - P.x, dz = g.tz - P.z, dd = Math.hypot(dx, dz);
        if (dd < 0.6) { g.mode = 'wave'; }
        else { g.fig.group.rotation.y = Math.atan2(dx, dz); const st = Math.min(dd, 1.6 * dt); P.x += dx / dd * st; P.z += dz / dd * st; g.phase += dt * 7.5; poseWalk(g.fig, g.phase); }
      } else if (g.mode === 'wave') poseWave(g.fig, tNow + g.phase);
      else poseIdle(g.fig, tNow + g.phase);
    }
    for (const n of party.near) {
      poseIdle(n.fig, tNow + n.phase);
      if (n.dance) n.fig.group.position.y = Math.abs(Math.sin(tNow * 4.2 + n.phase)) * 0.055;
    }
    party.chunks.forEach((c, i) => { c.position.y = Math.sin(tNow * 2.1 + i * 2.1) * 0.022; });
  }

  /* ============================ public API ============================= */
  return {
    update(dt, snap) {
      const tNow = performance.now() / 1000;
      if (snap && snap.started) {
        updateCop(dt, snap, tNow);
        updateParty(dt, snap, tNow);
        if (snap.player) driveStrobes(tNow, snap.player.x, snap.player.z);
      }
      drawBarks(dt);
    },
    modInput(input) {
      if (cop.inputLock) return { steer: 0, throttle: 0, brake: true };
      return input;
    },
    navStop() {
      if (party.phase === 'invited' || party.phase === 'active') return KOS;
      return null;
    },
    debug: {
      state() {
        return { cop: cop.phase, copSiren: cop.siren, party: party.phase, nightK: +party.nightK.toFixed(2),
                 greeted: party.greeted, guests: party.built ? (party.crowdPlaced || 0) + party.near.length + party.greeters.length : 0 };
      },
      pullover() { if (cop.f && cop.phase === 'watch') { cop.joinedAt = -1e3; } },
      party() { if (party.phase === 'dormant') party.phase = 'invited';
        if (ctx.daynight && ctx.daynight.setPhase) ctx.daynight.setPhase('night');
        else { party.nightK = 1; applyNight(1); } },
    },
  };
}
