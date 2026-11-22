// Ember Court — small synthesized sounds, WebAudio oscillators only, no files.
// A blip on select, a chime on play, a low thud on clash, a little fanfare on win.

/** Tiny synth: one oscillator + gain envelope per note. */
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  /** Create the AudioContext on first user gesture (browsers require one). */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
  }

  note(freq, start, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Play a named sound: select | play | clash | deny | win | loss. */
  play(name) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    if (name === 'select') {
      this.note(660, 0, 0.07, 'sine', 0.12);
    } else if (name === 'play') {
      this.note(523, 0, 0.09, 'triangle', 0.16);
      this.note(784, 0.07, 0.12, 'triangle', 0.14);
    } else if (name === 'clash') {
      this.note(180, 0, 0.16, 'sawtooth', 0.14);
      this.note(90, 0, 0.2, 'square', 0.1);
    } else if (name === 'deny') {
      this.note(160, 0, 0.12, 'square', 0.08);
    } else if (name === 'win') {
      [523, 659, 784, 1047].forEach((f, i) => this.note(f, i * 0.11, 0.22, 'triangle', 0.16));
    } else if (name === 'loss') {
      [392, 330, 262].forEach((f, i) => this.note(f, i * 0.16, 0.26, 'sine', 0.13));
    }
  }
}
