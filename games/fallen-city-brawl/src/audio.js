// Procedural WebAudio 90s Arcade Beat-'Em-Up Sound Engine (iOS-safe, zero external assets)

export class BrawlAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (_) {}
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    try {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch (_) {}
    this.unlocked = true;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _ready() {
    return !this.muted && this.ctx && this.ctx.state === 'running';
  }

  _tone(f0, f1, dur, type = 'square', gainPeak = 0.14, delay = 0) {
    if (!this._ready()) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, f0), t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(25, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gainPeak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur = 0.07, gainPeak = 0.18, filterFreq = 1100, filterType = 'bandpass', delay = 0) {
    if (!this._ready()) return;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.3);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime + delay;
    g.gain.setValueAtTime(gainPeak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  }

  whiff() {
    this._noise(0.055, 0.09, 1400, 'highpass');
    this._tone(240, 110, 0.05, 'triangle', 0.05);
  }

  hitLight() {
    this._tone(190, 62, 0.075, 'triangle', 0.22);
    this._noise(0.06, 0.2, 950, 'bandpass');
  }

  hitHeavy() {
    this._tone(150, 38, 0.14, 'sawtooth', 0.24);
    this._tone(90, 32, 0.15, 'sine', 0.26);
    this._noise(0.11, 0.28, 700, 'lowpass');
  }

  pipeClang() {
    this._tone(820, 460, 0.12, 'square', 0.14);
    this._tone(1240, 620, 0.1, 'triangle', 0.12);
    this._noise(0.07, 0.2, 1600, 'bandpass');
  }

  katanaSlash() {
    this._noise(0.1, 0.22, 2600, 'highpass');
    this._tone(1400, 380, 0.09, 'sawtooth', 0.11);
  }

  parry() {
    this._tone(880, 1760, 0.12, 'triangle', 0.18);
    this._tone(1320, 1980, 0.14, 'sine', 0.14, 0.02);
  }

  jump() {
    this._tone(170, 420, 0.11, 'triangle', 0.1);
  }

  throwSlam() {
    this._tone(120, 36, 0.18, 'sine', 0.28);
    this._noise(0.14, 0.26, 480, 'lowpass');
  }

  crateSmash() {
    this._noise(0.14, 0.24, 650, 'bandpass');
    this._tone(210, 68, 0.12, 'square', 0.14);
  }

  pickup() {
    this._tone(523.25, 659.25, 0.09, 'square', 0.11);
    this._tone(783.99, 1046.5, 0.12, 'square', 0.11, 0.06);
  }

  riotSuper() {
    // Dramatic wolf howl + arcade bass shockwave
    this._tone(280, 620, 0.28, 'sawtooth', 0.16);
    this._tone(620, 360, 0.36, 'sawtooth', 0.15, 0.24);
    this._tone(110, 34, 0.45, 'sine', 0.3);
    this._noise(0.32, 0.24, 800, 'lowpass', 0.05);
  }

  ko() {
    this._tone(240, 55, 0.32, 'sawtooth', 0.2);
    this._noise(0.18, 0.2, 600, 'lowpass', 0.04);
  }

  goChime() {
    this._tone(587.33, 587.33, 0.08, 'square', 0.1);
    this._tone(880, 880, 0.14, 'square', 0.11, 0.09);
  }

  bossSiren() {
    this._tone(340, 520, 0.25, 'sawtooth', 0.13);
    this._tone(520, 340, 0.25, 'sawtooth', 0.13, 0.25);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this._tone(n, n, 0.18, 'square', 0.12, i * 0.1));
  }
}
