// APEX WAKE — Procedural WebAudio Marine Engine, Supercharger Whine, Hull Water Rush & Splashdowns
// iOS Safari safe (audioSession playback + silent unlock buffer).

export function createMarineAudio() {
  let ctx = null;
  let master = null;
  let engOscA = null, engOscB = null, whineOsc = null;
  let engGain = null, whineGain = null;
  let waterGain = null, waterFilter = null;
  let unlocked = false;
  let muted = false;

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.72;
      master.connect(ctx.destination);

      // Silent unlock buffer for iOS WebKit
      const sb = ctx.createBuffer(1, 1, ctx.sampleRate);
      const ss = ctx.createBufferSource();
      ss.buffer = sb;
      ss.connect(master);
      ss.start();

      // 4-stroke marine jet engine (sawtooth + sub-harmonic triangle through warm lowpass)
      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 480;
      engFilter.Q.value = 2.4;

      engGain = ctx.createGain();
      engGain.gain.value = 0.08;
      engFilter.connect(engGain).connect(master);

      engOscA = ctx.createOscillator();
      engOscA.type = 'sawtooth';
      engOscA.frequency.value = 54;
      engOscA.connect(engFilter);

      engOscB = ctx.createOscillator();
      engOscB.type = 'triangle';
      engOscB.frequency.value = 27;
      engOscB.connect(engFilter);

      // Supercharger whine (high-pitch sine rising cleanly under throttle & boost)
      whineGain = ctx.createGain();
      whineGain.gain.value = 0.0;
      whineOsc = ctx.createOscillator();
      whineOsc.type = 'sine';
      whineOsc.frequency.value = 420;
      whineOsc.connect(whineGain).connect(master);

      // Water shearing & surf rush (2-second pink/white noise loop through dynamic bandpass)
      const len = ctx.sampleRate * 2;
      const nBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = nBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.950 * b2 + w * 0.048;
        ch[i] = (b0 + b1 + b2 + w * 0.18) * 1.1;
      }
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = nBuf;
      nSrc.loop = true;

      waterFilter = ctx.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.value = 950;
      waterFilter.Q.value = 0.7;

      waterGain = ctx.createGain();
      waterGain.gain.value = 0.03;
      nSrc.connect(waterFilter).connect(waterGain).connect(master);

      engOscA.start();
      engOscB.start();
      whineOsc.start();
      nSrc.start();
      unlocked = true;
    } catch {
      // Audio stays silently degraded if browser blocks
    }
  }

  function update(rpm01, speed01, carveAmt, airborne01, boostOn) {
    if (!unlocked || !ctx) return;
    const now = ctx.currentTime;
    const revBoost = airborne01 > 0.25 ? 1.18 : 1.0; // unloaded impeller revs higher in mid-air!
    const baseFreq = (48 + rpm01 * 132 + (boostOn ? 24 : 0)) * revBoost;
    engOscA.frequency.setTargetAtTime(baseFreq, now, 0.04);
    engOscB.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    engGain.gain.setTargetAtTime(0.065 + rpm01 * 0.11 + (boostOn ? 0.035 : 0), now, 0.05);

    whineOsc.frequency.setTargetAtTime(380 + rpm01 * 1420 + (boostOn ? 380 : 0), now, 0.05);
    whineGain.gain.setTargetAtTime(Math.max(0, (rpm01 - 0.35) * 0.032) + (boostOn ? 0.022 : 0), now, 0.06);

    // Water rush quiets dramatically in mid-air and surges sharply during carves!
    const inWater = 1.0 - Math.min(1, airborne01 * 1.4);
    const waterVol = (0.02 + speed01 * 0.18 + carveAmt * speed01 * 0.14) * inWater;
    waterGain.gain.setTargetAtTime(waterVol, now, 0.05);
    waterFilter.frequency.setTargetAtTime(620 + speed01 * 1450 + carveAmt * 650, now, 0.06);
  }

  function splash(intensity = 1.0) {
    if (!unlocked || !ctx) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.45);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.12));
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(920, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + 0.38);
    const g = ctx.createGain();
    g.gain.value = Math.min(0.45, 0.20 * intensity);
    src.connect(lp).connect(g).connect(master);
    src.start(now);
  }

  function gateChime(combo = 1) {
    if (!unlocked || !ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const base = 520 + Math.min(6, combo) * 65;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  function toggleMute() {
    muted = !muted;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.72, ctx.currentTime, 0.04);
    return muted;
  }

  return { unlock, update, splash, gateChime, toggleMute };
}
