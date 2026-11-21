// audio.js — Scaggsville 3D sound. EVERYTHING is synthesised with WebAudio:
// no audio files exist for Scaggsville (the 2D game's crew yells — "Cole
// Trickle!" / "rubbin is racing" — were on-screen text barks, never sound),
// so this module builds the whole soundscape procedurally, following the
// house approach proven in Palm City's src/audio.js (brown/white noise
// buffers, detuned-saw engine stack, LFO siren, env/burst helpers) with
// Scaggsville's own content: rally driving, house arrivals, the fake-cop
// siren, the night party at the end of the run, and the Atholton finale.
//
// iOS rules (gamepress standing): navigator.audioSession.type='playback' is
// set at init, a 1-sample silent buffer is played inside the unlocking
// gesture, and the context is resumed on every pointerdown/touchend and on
// visibilitychange. NOTHING is created or played before the first gesture —
// the host calls unlock() from the player-pick tap.
//
// API (also exposed as window.__audio for the other lanes):
//   unlock()            create/resume the context (call inside a gesture)
//   state()             { ctxState, unlocked, muted, volume, engineOn, sirenOn, partyOn }
//   engineStart() / engineStop()
//   setSpeed(v)         v = 0..1 of top speed; drives engine pitch, tyre and wind noise
//   setBoost(v)         v = 0..1 turbo (Lane A's drive.js hook): engine note climbs + whistle
//   arrival()           house-arrival sting (door thunk + chime) — a crew stop joined
//   uiTap()             tiny UI blip
//   whoop()             stylised convoy yell (the audio cousin of the 2D text barks)
//   siren(on)           fake-cop two-tone wail for the missions lane
//   partyMusic(on)      procedural funk loop for the night party
//   crowdMurmur(level)  party crowd bed, level 0..1
//   finale()            Atholton arrival sting + crowd swell
//   setVolume(v) / toggleMute() -> muted

export function createGameAudio() {
  // iOS 17+: keep the silent switch from muting WebAudio. Set at init and
  // again at unlock (cheap, and covers browsers that expose it late).
  const setSession = () => {
    try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch (_) {}
  };
  setSession();

  let ctx = null;          // AudioContext, created on first gesture only
  let master = null;       // master gain -> destination (volume + mute live here)
  let white = null, brown = null;   // shared noise buffers
  let eng = null;          // { oscs:[], filter, gain } — engine stack
  let road = null;         // { filter, gain } — tyre/road noise
  let wind = null;         // { filter, gain } — wind at speed
  let sirenNodes = null;   // { gain }
  let crowdBus = null;     // gain for the murmur bed
  let partyBus = null;     // gain for the music loop
  let engineOn = false, sirenOn = false, partyOn = false;
  let speed = 0;           // last setSpeed value, 0..1
  let boostTarget = 0, boostCur = 0;   // turbo amount (setBoost), eased in applySpeed
  let whistle = null;      // { gain } — turbo whistle, gain follows boostCur
  let screech = null;      // { filter, gain } — continuous tyre screech loop during drift/slip
  let volume = 0.9, muted = false;
  const party = { timer: null, step: 0, nextTime: 0, runId: 0 };

  /* ------------------------------ unlock ------------------------------ */
  function unlock() {
    setSession();
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      buildGraph();
    }
    // 1-sample silent buffer inside the gesture: the classic iOS unlock.
    try {
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start();
    } catch (_) {}
    if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    return true;
  }
  function resume() { if (ctx && ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } }

  // Resume on every gesture + when the tab comes back (standing iOS rule).
  if (typeof window !== 'undefined') {
    const g = () => { if (ctx) resume(); else unlock(); };
    window.addEventListener('pointerdown', g, { passive: true });
    window.addEventListener('touchend', g, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); });
  }

  /* ------------------------------ graph ------------------------------- */
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  function buildGraph() {
    master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ctx.destination);

    // noise buffers (Palm City pattern): 3 s brown, 1 s white
    const len = ctx.sampleRate * 3, bb = ctx.createBuffer(1, len, ctx.sampleRate), d = bb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    brown = bb;
    const wb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), w = wb.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
    white = wb;

    // engine: two detuned saws + square sub into a lowpass (idles silent)
    const eF = ctx.createBiquadFilter(); eF.type = 'lowpass'; eF.frequency.value = 320; eF.Q.value = 3.5;
    const eG = ctx.createGain(); eG.gain.value = 0;
    const oscs = [0, 1, 2].map(i => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'square' : 'sawtooth';
      if (i === 1) o.detune.value = 16;
      o.frequency.value = 52;
      o.connect(eF); o.start(); return o;
    });
    eF.connect(eG); eG.connect(master);
    eng = { oscs, filter: eF, gain: eG };

    // tyre/road noise: white noise through a bandpass, gain follows speed
    const rF = ctx.createBiquadFilter(); rF.type = 'bandpass'; rF.frequency.value = 640; rF.Q.value = 0.7;
    const rG = ctx.createGain(); rG.gain.value = 0;
    loop(white).connect(rF); rF.connect(rG); rG.connect(master);
    road = { filter: rF, gain: rG };

    // wind: white noise through a higher bandpass, only up at speed
    const wF = ctx.createBiquadFilter(); wF.type = 'bandpass'; wF.frequency.value = 420; wF.Q.value = 0.55;
    const wG = ctx.createGain(); wG.gain.value = 0;
    loop(white).connect(wF); wF.connect(wG); wG.connect(master);
    wind = { filter: wF, gain: wG };

    // turbo whistle: white noise through a tight high bandpass (gain 0
    // unless boosting — Lane A's drive.js turbo, hook wired by the host)
    const tF = ctx.createBiquadFilter(); tF.type = 'bandpass'; tF.frequency.value = 1900; tF.Q.value = 7;
    const tG = ctx.createGain(); tG.gain.value = 0;
    loop(white).connect(tF); tF.connect(tG); tG.connect(master);
    whistle = { gain: tG };

    // tyre screech: high-Q resonant bandpass white noise (gain 0 unless slipping/drifting)
    const scF = ctx.createBiquadFilter(); scF.type = 'bandpass'; scF.frequency.value = 1280; scF.Q.value = 6.5;
    const scG = ctx.createGain(); scG.gain.value = 0;
    loop(white).connect(scF); scF.connect(scG); scG.connect(master);
    screech = { filter: scF, gain: scG };

    // siren: triangle swept by an LFO through a bandpass (gain 0 until on)
    const sG = ctx.createGain(); sG.gain.value = 0;
    const so = ctx.createOscillator(); so.type = 'triangle'; so.frequency.value = 780;
    const sl = ctx.createOscillator(); sl.frequency.value = 0.55;
    const slg = ctx.createGain(); slg.gain.value = 165;
    sl.connect(slg); slg.connect(so.frequency); sl.start(); so.start();
    const sF = ctx.createBiquadFilter(); sF.type = 'bandpass'; sF.frequency.value = 950; sF.Q.value = 0.7;
    so.connect(sF); sF.connect(sG); sG.connect(master);
    sirenNodes = { gain: sG };

    // crowd murmur: brown noise -> bandpass, with two slow LFOs wobbling the
    // gain so it breathes like a room full of people instead of a fan
    const cF = ctx.createBiquadFilter(); cF.type = 'bandpass'; cF.frequency.value = 480; cF.Q.value = 0.35;
    const wob = ctx.createGain(); wob.gain.value = 0.72;
    for (const [fr, amt] of [[0.09, 0.20], [0.043, 0.14]]) {
      const l = ctx.createOscillator(); l.frequency.value = fr;
      const lg = ctx.createGain(); lg.gain.value = amt;
      l.connect(lg); lg.connect(wob.gain); l.start();
    }
    crowdBus = ctx.createGain(); crowdBus.gain.value = 0;
    loop(brown).connect(cF); cF.connect(wob); wob.connect(crowdBus); crowdBus.connect(master);

    // party music bus (instruments are scheduled per-note, see below)
    partyBus = ctx.createGain(); partyBus.gain.value = 0; partyBus.connect(master);
  }

  /* --------------------------- small helpers -------------------------- */
  function env(node, a, peak, dur, t0, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dur);
    node.connect(g); g.connect(dest || master);
    return g;
  }
  function burst(freq, q, peak, dur, type = 'lowpass', dest) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = white;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    s.connect(f); env(f, 0.005, peak, dur, t, dest);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function note(freq, t0, dur, peak, type = 'triangle', cutoff = 2400, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    o.connect(f); env(f, 0.02, peak, dur, t0, dest);
    o.start(t0); o.stop(t0 + dur + 0.15);
  }
  const ready = () => !!ctx;

  /* ------------------------------ engine ------------------------------ */
  // CAR_LEVEL: the whole driving soundscape (engine stack, turbo whistle,
  // tyre/road noise, wind) scaled by this. Cherie, Nov 21, on the live
  // build: "Volume of car is 90% too loud" — so the car sits at 10% of its
  // original level. Nothing else routes through these four paths: siren,
  // party, crowd, stings and UI all connect to master directly, untouched.
  const CAR_LEVEL = 0.1;
  function applySpeed() {
    if (!ctx || !eng) return;
    const t = ctx.currentTime, v = speed;
    boostCur += (boostTarget - boostCur) * 0.18;   // eased per call (host calls per frame)
    const f = (52 + v * 128) * (1 + 0.3 * boostCur);   // idle growl -> full-throttle note, turbo climbs it
    eng.oscs[0].frequency.setTargetAtTime(f, t, 0.06);
    eng.oscs[1].frequency.setTargetAtTime(f * 1.003, t, 0.06);
    eng.oscs[2].frequency.setTargetAtTime(f * 0.5, t, 0.06);
    eng.filter.frequency.setTargetAtTime(300 + v * 1500 + boostCur * 900, t, 0.09);
    eng.gain.gain.setTargetAtTime(engineOn ? (0.05 + v * 0.075 + boostCur * 0.03) * CAR_LEVEL : 0, t, 0.12);
    if (whistle) whistle.gain.gain.setTargetAtTime(engineOn ? boostCur * 0.045 * CAR_LEVEL : 0, t, 0.09);
    road.gain.gain.setTargetAtTime(engineOn ? Math.pow(v, 1.6) * 0.13 * CAR_LEVEL : 0, t, 0.1);
    road.filter.frequency.setTargetAtTime(480 + v * 720, t, 0.15);
    const wv = Math.max(0, v - 0.3);
    wind.gain.gain.setTargetAtTime(engineOn ? wv * wv * 0.34 * CAR_LEVEL : 0, t, 0.2);
    wind.filter.frequency.setTargetAtTime(320 + v * 880, t, 0.2);
  }

  /* --------------------------- party music ---------------------------- */
  // 112 BPM, 8th-note steps, 2-bar loop. A-minor funk: four-on-the-floor
  // kick, offbeat hats, clap on 2 & 4, a two-bar bassline, Am stab chords.
  const STEP = 60 / 112 / 2;
  const BASS = [45, 0, 45, 0, 48, 0, 45, 0, 43, 0, 43, 0, 50, 0, 52, 0]; // A2 . A2 . C3 . A2 . G2 . G2 . D3 . E3 .
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);
  function kick(t) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(128, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    env(o, 0.004, 0.5, 0.22, t, partyBus); o.start(t); o.stop(t + 0.3);
  }
  function hat(t, open) {
    const s = ctx.createBufferSource(); s.buffer = white;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6800;
    s.connect(f); env(f, 0.003, open ? 0.085 : 0.05, open ? 0.14 : 0.045, t, partyBus);
    s.start(t); s.stop(t + 0.25);
  }
  function clap(t) { burst(1700, 1.1, 0.13, 0.09, 'bandpass', partyBus); }
  function bassNote(m, t) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mf(m);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 640;
    o.connect(f); env(f, 0.006, 0.17, 0.2, t, partyBus);
    o.start(t); o.stop(t + 0.3);
  }
  function stab(t) { for (const m of [57, 60, 64]) note(mf(m), t, 0.16, 0.042, 'sawtooth', 1700, partyBus); }
  function playStep(step, t) {
    if (step % 4 === 0) kick(t);
    if (step % 4 === 2) clap(t);
    if (step % 2 === 1) hat(t, step === 15);
    else if (step % 4 !== 0) hat(t, false);
    const b = BASS[step]; if (b) bassNote(b, t);
    if (step === 8) stab(t);
  }
  function partyMusic(on) {
    if (!ready()) return;
    if (on === partyOn) return;
    partyOn = on;
    const t = ctx.currentTime;
    if (on) {
      partyBus.gain.cancelScheduledValues(t);
      partyBus.gain.setTargetAtTime(0.5, t, 0.25);
      party.step = 0; party.nextTime = t + 0.08;
      const id = ++party.runId;
      party.timer = setInterval(() => {
        if (id !== party.runId || !partyOn) return;
        while (party.nextTime < ctx.currentTime + 0.25) { playStep(party.step, party.nextTime); party.step = (party.step + 1) % 16; party.nextTime += STEP; }
      }, 90);
    } else {
      partyBus.gain.setTargetAtTime(0, t, 0.18);
      const id = ++party.runId;
      setTimeout(() => { if (id === party.runId && party.timer) { clearInterval(party.timer); party.timer = null; } }, 600);
    }
  }

  /* ------------------------------- API -------------------------------- */
  const api = {
    unlock,
    resume,
    state() {
      return { ctxState: ctx ? ctx.state : 'none', unlocked: !!ctx, muted, volume, engineOn, sirenOn, partyOn, boost: boostTarget };
    },
    engineStart() { if (!ready()) unlock(); if (!ctx) return; engineOn = true; applySpeed(); },
    engineStop() { engineOn = false; applySpeed(); },
    setSpeed(v) { speed = Math.max(0, Math.min(1, v || 0)); applySpeed(); },
    setBoost(v) { boostTarget = Math.max(0, Math.min(1, v || 0)); applySpeed(); },
    arrival() {
      if (!ready()) return;
      const t = ctx.currentTime;
      burst(165, 1, 0.5, 0.16);                 // door thunk
      burst(1250, 4, 0.1, 0.045, 'bandpass');   // latch click
      note(659, t + 0.1, 0.14, 0.07);           // dap-up chime, two notes
      note(880, t + 0.2, 0.24, 0.07);
    },
    uiTap() { if (ready()) note(1250, ctx.currentTime, 0.05, 0.045, 'square', 3600); },
    whoop() {
      // stylised crew yell — a formant-swept shout, NOT speech; the audio
      // cousin of the 2D game's "Cole Trickle!" text barks.
      if (!ready()) return;
      const t = ctx.currentTime;
      for (const dt of [0, 0.34]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(290, t + dt);
        o.frequency.exponentialRampToValueAtTime(640, t + dt + 0.1);
        o.frequency.exponentialRampToValueAtTime(390, t + dt + 0.24);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 950; f.Q.value = 1.6;
        o.connect(f); env(f, 0.03, dt ? 0.07 : 0.11, 0.26, t + dt);
        o.start(t + dt); o.stop(t + dt + 0.4);
      }
    },
    siren(on) {
      if (!ready()) return;
      sirenOn = !!on;
      sirenNodes.gain.gain.setTargetAtTime(on ? 0.085 : 0, ctx.currentTime, on ? 0.35 : 0.15);
    },
    setScreech(level) {
      if (!ready() || !screech) return;
      const v = engineOn ? Math.max(0, Math.min(1, level || 0)) : 0;
      const t = ctx.currentTime;
      screech.gain.gain.setTargetAtTime(v > 0.08 ? v * 0.14 * CAR_LEVEL : 0, t, 0.05);
      screech.filter.frequency.setTargetAtTime(1080 + v * 480, t, 0.08);
    },
    crash(intensity = 0.6) {
      if (!ready()) return;
      const k = Math.max(0.15, Math.min(1, intensity || 0.6));
      const t = ctx.currentTime;
      burst(240 + k * 280, 0.9, 0.24 * k, 0.22 + k * 0.14);
      burst(1850, 2.2, 0.11 * k, 0.12, 'bandpass');
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(115, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 0.18);
      env(o, 0.004, 0.28 * k, 0.2, t);
      o.start(t); o.stop(t + 0.25);
    },
    stunt() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + i * 0.055, 0.18, 0.075));
    },
    horn() {
      if (!ready()) return;
      const t = ctx.currentTime;
      for (const f of [392, 494]) note(f, t, 0.16, 0.055, 'sawtooth', 1450);
    },
    partyMusic,
    crowdMurmur(level) {
      if (!ready()) return;
      const v = Math.max(0, Math.min(1, level || 0));
      crowdBus.gain.setTargetAtTime(v * 0.17, ctx.currentTime, 0.4);
    },
    finale() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [440, 554, 659, 880].forEach((f, i) => note(f, t + i * 0.09, 0.22, 0.08));       // rising arp
      [440, 554, 659, 880].forEach(f => note(f, t + 0.4, 0.75, 0.055, 'sawtooth', 1500)); // brass-ish stab
      burst(110, 1, 0.5, 0.5);                                                            // low thump
      // crowd swell: noise band sweeping up, in and back out
      const s = ctx.createBufferSource(); s.buffer = white;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(420, t); f.frequency.linearRampToValueAtTime(1250, t + 0.55);
      s.connect(f); env(f, 0.5, 0.16, 1.3, t);
      s.start(t); s.stop(t + 2);
    },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && !muted) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.03); },
    toggleMute() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02); return muted; },
    isMuted() { return muted; },
  };

  if (typeof window !== 'undefined') window.__audio = api;   // for the other lanes
  return api;
}

// Singleton the host uses.
export const gameAudio = createGameAudio();
