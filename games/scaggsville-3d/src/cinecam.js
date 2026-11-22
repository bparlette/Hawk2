// cinecam.js — Scaggsville 3D LANE E: cinematic camera moves.
//
// Cherie's shot list (Nov 20, 22:56 + sequence correction 23:00 — her
// words: "settle, then Scaggsville above, then settle, then arriving"):
//   1. DEPART SWEEP — getting in / pulling away: the camera orbits the
//      car front -> side -> back while it starts moving, then blends
//      into the regular low driving view.
//   2. SETTLE — a few seconds in the regular low 3D driving view (the
//      Bunny Hop settlement chase cam; the host owns the camera here).
//   3. ABOVE SCAGGSVILLE — the camera rises into a high, angled top-down
//      view (~55-65 deg pitch, a few blocks around the car, NOT whole-map
//      altitude): the 3D heir of the 2D game's top-down view. This is the
//      CRUISE mode — the player drives whole legs in it.
//   4. SETTLE AGAIN — nearing the destination the camera descends back
//      to the low view while still driving, and the player drives a
//      little in it.
//   5. ARRIVING — at the house: camera settles into a group framing for
//      the dap-up beat (Lane D builds the character beat; this module is
//      only the camera), then a slow pan across the parked lineup of
//      crew cars to show them off.
//   6. TAKEOFF — as the convoy rolls out, the camera pulls back wide,
//      eases down into the low view, settles, then rises back to the
//      above view for the next leg.
//
// DESIGN — one state machine, two owners. The host calls update(dt, ctx)
// every frame from the exact spot where it used to call updateCamera(dt)
// (see INTEGRATION NOTES in the lane report). update() returns TRUE while
// a cinematic owns the camera (host skips its chase cam) and FALSE while
// released (host chase cam runs, bit-identical to today). While released,
// this module SHADOW-TRACKS the real camera; while it owns the camera, it
// keeps stepping a replica of the chase cam (same constants as the host's
// updateCamera) so every blend back lands exactly on the pose the chase
// cam would have produced. On release it leaves a one-shot `handoff`
// ({yaw, pos, fov}) for the host to adopt into its camYaw/camPos/fovCur —
// that is what makes the return seamless instead of a swoop.
//
// Player agency: input never gets trapped. Steering/turbo/brake during
// the sweep fast-forwards it; throttle/steer/brake during ARRIVE cancels
// the beat back to the chase view in 0.7 s; hard steering cancels a
// takeoff. The ABOVE cruise is a driving mode, not a cinematic — input
// there is just driving. The approach descent is distance-driven and
// reverses itself if the player drives away.
//
// API (window.__cine):
//   update(dt, {player, input}) -> owned   host per-frame seam (above)
//   depart()              start a leg: sweep -> settle -> rise -> above
//   rise()                chase -> above directly (no sweep)
//   approach(dist01)      feed every frame inside the trigger radius:
//                         0 = just entered the radius, 1 = at the stop.
//                         Drives the descent; <0.2 after arrival range
//                         means "drove away" and re-rises.
//   approachEnd()         descent complete NOW -> settle in the low view
//   arrive(anchorInfo)    arrival sequence (group framing + lineup pan)
//        anchorInfo = { group:{x,z}, face:{x,z}, lineup:[{x,z}...] }
//        group  = where the crew stands (dap-up cluster centre)
//        face   = direction FROM the group TOWARD the camera side
//                 (usually house -> street); defaults: toward the car
//        lineup = parked crew-car positions to pan across, in order;
//                 defaults to a short arc around the group
//   takeoff(opts)         pull-back + return to the leg flow;
//                         opts.nextLeg === false ends at settle -> idle
//   cancel()              bail to the chase view (0.7 s blend) from any
//                         owned phase; clears the leg program
//   state                 getter: { mode, phase, owned, progress,
//                         phaseTime, time, cam, look, fov, program }
//   mode                  getter: 'chase' | 'above' | 'approach' | 'cine'
//   handoff               one-shot {yaw, pos(Vector3), fov} on release

export const CINE = {
  // chase-cam replica constants — MUST match updateCamera() in index.html
  chase: { dist: 8.6, height: 2.7, yawK: 3.2, posK: 7, posYK: 5, lookAhead: 6.5, lookY: 1.12,
           fovBase: 60, fovSpeed: 7, fovBoost: 3.5, topSpeed: 41 },
  sweepT: 2.8,          // depart orbit, seconds
  settleT: 3.5,         // low-view settle after the sweep / after takeoff
  riseT: 2.4,           // chase -> above
  settle2T: 2.5,        // low-view settle after the descent (min hold;
                        // the phase actually ends when arrive() lands or
                        // the player drives away — see approach())
  groupT: 4.2,          // arrival group framing hold (ease-in 1.8 s)
  panT: 4.8,            // arrival lineup pan
  takeoffT: 2.8,        // pull-back wide, then blend to chase
  returnT: 0.7,         // cancel blend back to chase
  above: { height: 60, back: 25, ahead: 9, fov: 52, yawK: 1.6, anchorK: 4,
           speedBack: 0.3, speedHeight: 0.22 },  // view pitch = atan2(height, back+ahead)
                                                  // = atan2(60, 34) ~ 60.5 deg at rest, ~56 at top speed
};

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const smoother = t => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}
const lerp = (a, b, t) => a + (b - a) * t;
function lerpPose(a, b, t, out) {
  out.pos.x = lerp(a.pos.x, b.pos.x, t); out.pos.y = lerp(a.pos.y, b.pos.y, t); out.pos.z = lerp(a.pos.z, b.pos.z, t);
  out.look.x = lerp(a.look.x, b.look.x, t); out.look.y = lerp(a.look.y, b.look.y, t); out.look.z = lerp(a.look.z, b.look.z, t);
  out.fov = lerp(a.fov, b.fov, t);
  return out;
}
const newPose = () => ({ pos: { x: 0, y: 0, z: 0 }, look: { x: 0, y: 0, z: 0 }, fov: 60 });
function copyPose(src, dst) {
  dst.pos.x = src.pos.x; dst.pos.y = src.pos.y; dst.pos.z = src.pos.z;
  dst.look.x = src.look.x; dst.look.y = src.look.y; dst.look.z = src.look.z;
  dst.fov = src.fov; return dst;
}

export function createCineCam({ camera }) {
  if (!camera) throw new Error('createCineCam: { camera } required');
  const _lookV = camera.position.clone();      // scratch Vector3 (no THREE import needed)
  const _handV = camera.position.clone();

  let phase = 'idle';        // idle|sweep|settle|rise|above|descend|settle2|arriveGroup|arrivePan|arriveHold|takeoff|return
  let program = null;        // 'leg' while the depart..takeoff flow is armed
  let owned = false;         // true while this module writes the camera
  let phaseTime = 0, time = 0;
  let handoff = null;

  // shadow chase state — replica of the host's camYaw/camPos/fovCur
  const sh = { yaw: 0, pos: { x: 0, y: 2.7, z: 0 }, fov: 60, init: false };
  // above-view state
  let aboveYaw = 0; const aboveAnchor = { x: 0, z: 0 };
  // per-phase scratch
  const startPose = newPose(), curPose = newPose(), tmpA = newPose(), tmpB = newPose();
  let lastLook = { x: 0, y: 1.12, z: 0 };
  let approachVal = 0, approachAt = -10, settle2AwayT = 0;
  let beatTime = 0;          // seconds since arrive() — drives the greeter track
  let anchors = null;        // arrive() anchorInfo, defaults filled
  let takeoffNextLeg = true;

  const fwd = h => ({ x: Math.sin(h), z: Math.cos(h) });

  /* ---------------- shadow chase (host updateCamera replica) ---------------- */
  function chaseLook(player, out) {
    const f = fwd(player.heading);
    out.x = player.x + f.x * CINE.chase.lookAhead; out.y = CINE.chase.lookY; out.z = player.z + f.z * CINE.chase.lookAhead;
    return out;
  }
  function syncShadow(player) {
    // released: adopt the real camera wholesale so any cinematic starts
    // from (and returns to) exactly where the host cam is
    sh.pos.x = camera.position.x; sh.pos.y = camera.position.y; sh.pos.z = camera.position.z;
    sh.yaw = Math.atan2(player.x - camera.position.x, player.z - camera.position.z);
    sh.fov = camera.fov; sh.init = true;
    chaseLook(player, lastLook);
  }
  function stepShadow(dt, player) {
    // owned: keep the replica running so blend-back targets stay live
    if (!sh.init) { syncShadow(player); return; }
    sh.yaw = lerpAngle(sh.yaw, player.heading, Math.min(1, dt * CINE.chase.yawK));
    const f = fwd(sh.yaw);
    const tx = player.x - f.x * CINE.chase.dist, tz = player.z - f.z * CINE.chase.dist;
    const k = Math.min(1, dt * CINE.chase.posK), ky = Math.min(1, dt * CINE.chase.posYK);
    sh.pos.x += (tx - sh.pos.x) * k; sh.pos.z += (tz - sh.pos.z) * k;
    sh.pos.y += (CINE.chase.height - sh.pos.y) * ky;
    const targetFov = CINE.chase.fovBase + Math.min(1, Math.abs(player.speed) / CINE.chase.topSpeed) * CINE.chase.fovSpeed + (player.boosting ? CINE.chase.fovBoost : 0);
    sh.fov += (targetFov - sh.fov) * Math.min(1, dt * 3);
  }
  function chasePose(player, out) {
    out.pos.x = sh.pos.x; out.pos.y = sh.pos.y; out.pos.z = sh.pos.z;
    chaseLook(player, out.look); out.fov = sh.fov; return out;
  }

  /* ---------------- above view ---------------- */
  function stepAbove(dt, player) {
    aboveYaw = lerpAngle(aboveYaw, player.heading, Math.min(1, dt * CINE.above.yawK));
    const k = Math.min(1, dt * CINE.above.anchorK);
    aboveAnchor.x += (player.x - aboveAnchor.x) * k;
    aboveAnchor.z += (player.z - aboveAnchor.z) * k;
  }
  function abovePose(player, out) {
    const A = CINE.above, f = fwd(aboveYaw), sp = Math.abs(player.speed);
    const back = A.back + sp * A.speedBack, height = A.height + sp * A.speedHeight;
    out.pos.x = aboveAnchor.x - f.x * back; out.pos.y = height; out.pos.z = aboveAnchor.z - f.z * back;
    out.look.x = aboveAnchor.x + f.x * A.ahead; out.look.y = 0; out.look.z = aboveAnchor.z + f.z * A.ahead;
    out.fov = A.fov; return out;
  }

  /* ---------------- pose plumbing ---------------- */
  function captureStart() {
    startPose.pos.x = camera.position.x; startPose.pos.y = camera.position.y; startPose.pos.z = camera.position.z;
    startPose.look.x = lastLook.x; startPose.look.y = lastLook.y; startPose.look.z = lastLook.z;
    startPose.fov = camera.fov;
  }
  function applyPose(p) {
    camera.position.set(p.pos.x, p.pos.y, p.pos.z);
    camera.up.set(0, 1, 0);
    _lookV.set(p.look.x, p.look.y, p.look.z);
    camera.lookAt(_lookV);
    if (Math.abs(p.fov - camera.fov) > 0.05) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
    lastLook.x = p.look.x; lastLook.y = p.look.y; lastLook.z = p.look.z;
    copyPose(p, curPose);
  }
  function setPhase(next) { phase = next; phaseTime = 0; }
  function release() {
    owned = false;
    _handV.set(sh.pos.x, sh.pos.y, sh.pos.z);
    handoff = { yaw: sh.yaw, pos: _handV.clone(), fov: sh.fov };
  }
  function beginOwned(next) { captureStart(); owned = true; handoff = null; setPhase(next); }

  /* ---------------- triggers ---------------- */
  function depart() {
    if (phase !== 'idle' && phase !== 'settle' && phase !== 'settle2') return false;
    program = 'leg'; beginOwned('sweep'); return true;
  }
  function rise() {
    if (owned && phase !== 'return') return false;
    program = program || 'leg';
    aboveYaw = sh.yaw; aboveAnchor.x = lastPlayer ? lastPlayer.x : 0; aboveAnchor.z = lastPlayer ? lastPlayer.z : 0;
    beginOwned('rise'); return true;
  }
  function approach(v) {
    v = clamp(+v || 0, 0, 1);
    approachVal = v; approachAt = time;
    if (phase === 'above') { beginOwned('descend'); }
    // a host still feeding approach() after a stale-feed re-rise is still
    // inside the trigger radius — re-enter the descent instead of sitting
    // in the above view ignoring the feed
    else if (phase === 'rise') { beginOwned('descend'); }
    else if (phase === 'idle' && v < 0.95) { program = program || 'leg'; setPhase('settle2'); settle2AwayT = 0; }
    return true;
  }
  function approachEnd() {
    if (phase === 'descend') { release(); setPhase('settle2'); settle2AwayT = 0; return true; }
    return false;
  }
  function arrive(info) {
    info = info || {};
    const p = lastPlayer;
    // Anchor hardening: a host-side slip (undefined/NaN field) must never
    // reach the camera — non-finite pieces fall back to sane defaults and
    // lineup points are filtered to finite coordinates.
    const finPt = (pt, fb) => (pt && Number.isFinite(pt.x) && Number.isFinite(pt.z)) ? { x: pt.x, z: pt.z } : fb;
    const group = finPt(info.group, p ? { x: p.x, z: p.z } : { x: 0, z: 0 });
    let face = finPt(info.face, null);
    if (!face && p) { const dx = p.x - group.x, dz = p.z - group.z; const d = Math.hypot(dx, dz) || 1; face = { x: dx / d, z: dz / d }; }
    if (!face) face = { x: 0, z: 1 };
    const fl = Math.hypot(face.x, face.z) || 1; face = { x: face.x / fl, z: face.z / fl };
    const lineup = (Array.isArray(info.lineup) ? info.lineup : []).filter(pt => pt && Number.isFinite(pt.x) && Number.isFinite(pt.z));
    anchors = { group, face, lineup };
    beatTime = 0;
    beginOwned('arriveGroup'); return true;
  }
  function takeoff(opts) {
    takeoffNextLeg = !(opts && opts.nextLeg === false);
    beginOwned('takeoff'); return true;
  }
  function cancel() {
    if (owned) { beginOwned('return'); }
    program = null;
    if (!owned) setPhase('idle');
    return true;
  }

  /* ---------------- arrival poses ---------------- */
  /* The celebration framing TRACKS THE PEOPLE (Cherie, Nov 21: "the
     camera either needs to zoom out more or follow the people and show
     the greeting"). The greeter walks from the group point to the
     player's car at the host's walk speed (1.6 m/s, stopping ~2 m short
     — the dap happens at the car). The camera follows the action point
     between greeter and car, pulled back far enough that BOTH stay
     framed with margin for the whole beat; as the gap closes it settles
     ~9.5 m out, where a standing figure reads ~17% of the portrait
     frame height. (The old framing parked 7-8 m off the HOUSE group:
     the player car sat behind the camera and the greeting walked out
     of the shot.) */
  const _gr = { x: 0, z: 0 };
  function greeterPos() {
    const p = lastPlayer, g = anchors.group;
    if (!p) { _gr.x = g.x; _gr.z = g.z; return _gr; }
    const dx = p.x - g.x, dz = p.z - g.z, sep = Math.hypot(dx, dz);
    const walk = Math.max(0, sep - 2.0);
    const f = walk > 0 ? clamp(beatTime * 1.6 / walk, 0, 1) : 1;
    _gr.x = g.x + dx * f; _gr.z = g.z + dz * f; return _gr;
  }
  function trackPose(orbit, out) {
    const p = lastPlayer || anchors.group;
    const g = greeterPos();
    const ax = g.x * 0.55 + p.x * 0.45, az = g.z * 0.55 + p.z * 0.45;
    const gap = Math.hypot(p.x - g.x, p.z - g.z);
    const dist = clamp(7.5 + 0.62 * gap, 9.5, 17);
    const ca = Math.cos(orbit), sa = Math.sin(orbit);
    const ox = anchors.face.x * ca - anchors.face.z * sa, oz = anchors.face.x * sa + anchors.face.z * ca;
    out.pos.x = ax + ox * dist; out.pos.y = 3.0; out.pos.z = az + oz * dist;
    out.look.x = ax; out.look.y = 1.05; out.look.z = az;
    out.fov = 58; return out;
  }
  function groupPose(t, out) { return trackPose(0, out); }
  function panPose(p, out) {
    // The pan keeps tracking the greeting (greeter closing on the car)
    // while the camera swings a gentle ~40 deg arc around the action.
    return trackPose(lerp(-0.15, 0.55, p), out);
  }

  /* ---------------- per-frame ---------------- */
  let lastPlayer = null;
  function update(dt, ctx) {
    const player = ctx && ctx.player;
    if (!player || !(dt > 0)) return owned;
    lastPlayer = player;
    time += dt; phaseTime += dt;
    if (phase === 'arriveGroup' || phase === 'arrivePan' || phase === 'arriveHold') beatTime += dt;
    const input = (ctx && ctx.input) || {};
    const steer = input.steer || 0, throttle = input.throttle || 0;

    if (owned) stepShadow(dt, player); else syncShadow(player);
    if (phase === 'above' || phase === 'rise' || phase === 'descend') stepAbove(dt, player);

    switch (phase) {
      case 'idle': return false;

      case 'settle':                       // released: host chase cam owns
        if (phaseTime >= CINE.settleT && program === 'leg') {
          aboveYaw = sh.yaw; aboveAnchor.x = player.x; aboveAnchor.z = player.z;
          beginOwned('rise');
          return true;
        }
        return false;

      case 'settle2': {                    // released: low view near the stop
        // drove away again (host keeps feeding approach() while in radius)
        if (time - approachAt < 0.5 && approachVal < 0.2) {
          settle2AwayT += dt;
          if (settle2AwayT > 0.5 && program === 'leg') {
            aboveYaw = sh.yaw; aboveAnchor.x = player.x; aboveAnchor.z = player.z;
            beginOwned('rise'); return true;
          }
        } else settle2AwayT = 0;
        return false;
      }

      case 'sweep': {
        // steering / turbo / brake fast-forward the orbit to its blend
        if ((Math.abs(steer) > 0.3 || input.boost || input.brake) && phaseTime < CINE.sweepT - 0.55)
          phaseTime = CINE.sweepT - 0.55;
        const p = clamp(phaseTime / CINE.sweepT, 0, 1);
        const f = fwd(player.heading);
        const left = { x: -f.z, z: f.x };
        const beta = lerp(-0.45, Math.PI, smoother(p));       // front -> left side -> back
        const r = lerp(6.2, CINE.chase.dist, sstep(p));
        tmpA.pos.x = player.x + (f.x * Math.cos(beta) + left.x * Math.sin(beta)) * r;
        tmpA.pos.y = lerp(1.5, CINE.chase.height, sstep(p));
        tmpA.pos.z = player.z + (f.z * Math.cos(beta) + left.z * Math.sin(beta)) * r;
        tmpA.look.x = player.x; tmpA.look.y = 1.0; tmpA.look.z = player.z; tmpA.fov = 58;
        if (p > 0.6) {                      // final 40%: blend into the chase pose
          chasePose(player, tmpB);
          lerpPose(tmpA, tmpB, sstep((p - 0.6) / 0.4), curPose);
        } else copyPose(tmpA, curPose);
        applyPose(curPose);
        if (p >= 1) { release(); setPhase('settle'); }
        return owned;
      }

      case 'rise': {
        const p = clamp(phaseTime / CINE.riseT, 0, 1);
        abovePose(player, tmpB);
        lerpPose(startPose, tmpB, smoother(p), curPose);
        applyPose(curPose);
        if (p >= 1) setPhase('above');
        return true;
      }

      case 'above':                        // cruise mode: the player drives here
        abovePose(player, curPose);
        applyPose(curPose);
        return true;

      case 'descend': {
        if (time - approachAt > 1.0) {     // host stopped feeding: out of radius
          beginOwned('rise'); return true;
        }
        if (approachVal < 0.25 && phaseTime > 0.4) {   // drove away mid-descent
          beginOwned('rise'); return true;
        }
        abovePose(player, tmpA);
        chasePose(player, tmpB);
        lerpPose(tmpA, tmpB, sstep(approachVal), curPose);
        applyPose(curPose);
        if (approachVal >= 0.98) { release(); setPhase('settle2'); settle2AwayT = 0; }
        return owned;
      }

      case 'arriveGroup': {
        if (throttle > 0.35 || Math.abs(steer) > 0.4 || input.brake) { beginOwned('return'); return true; }
        groupPose(phaseTime, tmpB);
        const e = smoother(clamp(phaseTime / 1.8, 0, 1));
        lerpPose(startPose, tmpB, e, curPose);
        applyPose(curPose);
        if (phaseTime >= CINE.groupT) beginOwned('arrivePan');
        return true;
      }

      case 'arrivePan': {
        if (throttle > 0.35 || Math.abs(steer) > 0.4 || input.brake) { beginOwned('return'); return true; }
        panPose(smoother(clamp(phaseTime / CINE.panT, 0, 1)), tmpB);
        if (phaseTime < 0.8) lerpPose(startPose, tmpB, smoother(phaseTime / 0.8), curPose);
        else copyPose(tmpB, curPose);
        applyPose(curPose);
        if (phaseTime >= CINE.panT) setPhase('arriveHold');
        return true;
      }

      case 'arriveHold':                   // hold the last framing until takeoff/cancel/input
        if (throttle > 0.35 || Math.abs(steer) > 0.4 || input.brake) { beginOwned('return'); return true; }
        panPose(1, curPose);
        applyPose(curPose);
        return true;

      case 'takeoff': {
        if (Math.abs(steer) > 0.6) { beginOwned('return'); return true; }
        const p = clamp(phaseTime / CINE.takeoffT, 0, 1);
        const f = fwd(player.heading);
        tmpA.pos.x = player.x - f.x * 23; tmpA.pos.y = 8.5; tmpA.pos.z = player.z - f.z * 23;
        tmpA.look.x = player.x + f.x * 10; tmpA.look.y = 1.0; tmpA.look.z = player.z + f.z * 10; tmpA.fov = 57;
        if (p < 0.55) lerpPose(startPose, tmpA, smoother(p / 0.55), curPose);
        else { chasePose(player, tmpB); lerpPose(tmpA, tmpB, sstep((p - 0.55) / 0.45), curPose); }
        applyPose(curPose);
        if (p >= 1) { release(); if (takeoffNextLeg) { program = 'leg'; setPhase('settle'); } else { program = null; setPhase('idle'); } }
        return owned;
      }

      case 'return': {
        const p = clamp(phaseTime / CINE.returnT, 0, 1);
        chasePose(player, tmpB);
        lerpPose(startPose, tmpB, smoother(p), curPose);
        applyPose(curPose);
        if (p >= 1) { release(); setPhase('idle'); }
        return owned;
      }
    }
    return owned;
  }

  /* ---------------- state ---------------- */
  function snapshot() {
    return {
      mode: phase === 'above' ? 'above' : phase === 'descend' ? 'approach'
          : (phase === 'idle' || phase === 'settle' || phase === 'settle2') ? 'chase' : 'cine',
      phase, owned, program,
      progress: phase === 'sweep' ? clamp(phaseTime / CINE.sweepT, 0, 1)
        : phase === 'rise' ? clamp(phaseTime / CINE.riseT, 0, 1)
        : phase === 'descend' ? approachVal
        : phase === 'arriveGroup' ? clamp(phaseTime / CINE.groupT, 0, 1)
        : phase === 'arrivePan' ? clamp(phaseTime / CINE.panT, 0, 1)
        : phase === 'takeoff' ? clamp(phaseTime / CINE.takeoffT, 0, 1)
        : phase === 'return' ? clamp(phaseTime / CINE.returnT, 0, 1) : 0,
      phaseTime, time,
      cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      look: { x: lastLook.x, y: lastLook.y, z: lastLook.z },
      fov: camera.fov,
      shadow: { yaw: sh.yaw, pos: { x: sh.pos.x, y: sh.pos.y, z: sh.pos.z }, fov: sh.fov },
      handoffPending: !!handoff,
    };
  }

  const api = {
    update, depart, rise, approach, approachEnd, arrive, takeoff, cancel,
    get state() { return snapshot(); },
    get mode() { return snapshot().mode; },
    get handoff() { return handoff; },
    set handoff(v) { handoff = v; },
  };
  if (typeof window !== 'undefined') window.__cine = api;
  return api;
}
