// Procedural WebAudio Arcade Pinball Synthesizer (iOS-safe, zero external assets)

export class PinballAudio {
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

  _tone(freq, endFreq, dur, type = 'triangle', gainPeak = 0.16, delay = 0) {
    if (!this._ready()) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gainPeak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur = 0.04, gainPeak = 0.12, highpass = 900) {
    if (!this._ready()) return;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = highpass;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gainPeak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  }

  flipper(up = true) {
    if (!this._ready()) return;
    if (up) {
      this._tone(190, 75, 0.045, 'square', 0.11);
      this._noise(0.028, 0.14, 1200);
    } else {
      this._tone(110, 58, 0.032, 'triangle', 0.06);
    }
  }

  bumper(pitchIndex = 0) {
    if (!this._ready()) return;
    const notes = [440, 554.37, 659.25, 880];
    const base = notes[pitchIndex % notes.length];
    this._tone(160, 52, 0.075, 'sine', 0.22);
    this._tone(base, base * 1.18, 0.13, 'triangle', 0.14);
    this._noise(0.022, 0.09, 1800);
  }

  slingshot() {
    if (!this._ready()) return;
    this._tone(280, 120, 0.065, 'sawtooth', 0.14);
    this._tone(520, 780, 0.09, 'square', 0.08);
    this._noise(0.03, 0.12, 1500);
  }

  dropTarget(count = 1) {
    if (!this._ready()) return;
    const scale = [392, 440, 493.88, 587.33, 659.25, 783.99];
    const f = scale[(count - 1) % scale.length];
    this._tone(f, f * 1.02, 0.14, 'square', 0.11);
    this._tone(f * 2, f * 1.5, 0.1, 'triangle', 0.08, 0.02);
    this._noise(0.025, 0.1, 2000);
  }

  rollover(idx = 0) {
    if (!this._ready()) return;
    const freqs = [660, 784, 988];
    this._tone(freqs[idx % freqs.length], freqs[idx % freqs.length] * 1.15, 0.09, 'sine', 0.11);
  }

  plungerRelease(power = 0.8) {
    if (!this._ready()) return;
    const top = 260 + power * 340;
    this._tone(95, top, 0.16, 'sawtooth', 0.14);
    this._noise(0.06, 0.12, 700);
  }

  rampWhoosh() {
    if (!this._ready()) return;
    this._tone(320, 960, 0.26, 'sawtooth', 0.11);
    this._tone(640, 1280, 0.24, 'triangle', 0.09, 0.06);
  }

  vortexSwirl() {
    if (!this._ready()) return;
    const freqs = [330, 440, 587, 784, 1046];
    freqs.forEach((f, i) => {
      this._tone(f, f * 1.25, 0.14, 'sine', 0.1, i * 0.07);
    });
  }

  multiballFanfare() {
    if (!this._ready()) return;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, i) => {
      this._tone(f, f * 1.01, 0.24, 'sawtooth', 0.11, i * 0.075);
      this._tone(f * 0.5, f * 0.5, 0.28, 'triangle', 0.1, i * 0.075);
    });
  }

  drain() {
    if (!this._ready()) return;
    this._tone(310, 92, 0.36, 'sawtooth', 0.12);
    this._tone(220, 68, 0.38, 'triangle', 0.1, 0.08);
  }

  nudge() {
    if (!this._ready()) return;
    this._tone(90, 44, 0.08, 'sine', 0.2);
    this._noise(0.04, 0.14, 300);
  }

  tilt() {
    if (!this._ready()) return;
    this._tone(140, 110, 0.45, 'sawtooth', 0.16);
    this._tone(110, 82, 0.45, 'square', 0.12, 0.12);
  }
}
