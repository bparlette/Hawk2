// PROMASTER 50 — iOS-Safe Procedural WebAudio (Lego Snap, Campfire Crackle, Water, Shutter & Stamp Chimes)

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;
  let campGain = null;

  function unlock() {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.68;
      master.connect(ctx.destination);

      // Silent unlock buffer for iOS WebKit
      const sb = ctx.createBuffer(1, 1, ctx.sampleRate);
      const ss = ctx.createBufferSource();
      ss.buffer = sb;
      ss.connect(master);
      ss.start();

      // Subtle continuous ambient crackle bed (controlled smoothly by campGain)
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.03 * w) / 1.03;
        ch[i] = last * 2.2 + (Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.55 : 0);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'bandpass';
      lp.frequency.value = 620;
      campGain = ctx.createGain();
      campGain.gain.value = 0;
      src.connect(lp).connect(campGain).connect(master);
      src.start();

      unlocked = true;
    } catch {
      // Audio stays gracefully muted
    }
  }

  function playSnap() {
    unlock();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    // Crisply satisfying mechanical Lego snap + wrench torque click
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.055);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 0.16);

    const hi = ctx.createOscillator();
    const hg = ctx.createGain();
    hi.type = 'sine';
    hi.frequency.setValueAtTime(1180, now + 0.045);
    hg.gain.setValueAtTime(0.14, now + 0.045);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    hi.connect(hg).connect(master);
    hi.start(now + 0.045);
    hi.stop(now + 0.17);
  }

  function playSplash() {
    unlock();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.28);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, now);
    bp.frequency.exponentialRampToValueAtTime(1600, now + 0.22);
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(bp).connect(g).connect(master);
    src.start(now);
  }

  function playShutter() {
    unlock();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playStamp() {
    unlock();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
      osc.connect(g).connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  function setAmbience(inCamp) {
    if (!unlocked || !ctx || !campGain) return;
    campGain.gain.setTargetAtTime(inCamp && !muted ? 0.045 : 0.0, ctx.currentTime, 0.25);
  }

  function toggleMute() {
    muted = !muted;
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.68, ctx.currentTime, 0.05);
    return muted;
  }

  return { unlock, playSnap, playSplash, playShutter, playStamp, setAmbience, toggleMute };
}
