/**
 * Generative background bed.
 *
 * An original, endlessly looping music bed built from oscillators: a slow pad
 * moving through a four-chord cycle, a soft heartbeat pulse and a light
 * shaker. It is deliberately quiet and static - broadcast underscore, not
 * something anyone should notice. Because it is generated there is no seam to
 * loop and nothing to license. Drop draft-bed.mp3 into /public/audio to
 * replace it with your own track.
 */

const BPM = 92;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

/** Four bars of an open, unresolved progression; roots in Hz. */
const PROGRESSION: number[][] = [
  [110, 164.81, 220], // A minor-ish open fifth stack
  [87.31, 130.81, 174.61], // F
  [130.81, 196, 261.63], // C
  [98, 146.83, 196], // G
];

export class GenerativeBed {
  private readonly ctx: AudioContext;
  private readonly output: GainNode;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private running = false;
  private live = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(destination);
  }

  isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextBarTime = this.ctx.currentTime + 0.15;
    this.bar = 0;
    // Look ahead a couple of bars and top up four times a second: enough to
    // stay glitch-free without holding a long queue of scheduled nodes.
    this.scheduler = setInterval(() => this.schedule(), 250);
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    const now = this.ctx.currentTime;
    for (const node of this.live) {
      try {
        node.stop(now + 0.05);
      } catch {
        // Already stopped.
      }
    }
    this.live.clear();
  }

  private schedule(): void {
    if (!this.running) return;
    const horizon = this.ctx.currentTime + 2 * BAR;
    while (this.nextBarTime < horizon) {
      this.scheduleBar(this.nextBarTime, this.bar);
      this.nextBarTime += BAR;
      this.bar += 1;
    }
  }

  private scheduleBar(at: number, bar: number): void {
    const chord = PROGRESSION[bar % PROGRESSION.length] ?? PROGRESSION[0] ?? [110];

    // Pad: two detuned saws per chord tone through a soft lowpass.
    for (const frequency of chord) {
      for (const detune of [-6, 6]) {
        this.padVoice(frequency, detune, at, BAR * 1.05);
      }
    }

    // Pulse on beats 1 and 3, plus a shaker on the offbeats.
    this.pulse(at, 0.16);
    this.pulse(at + BEAT * 2, 0.11);
    for (let beat = 0; beat < 4; beat += 1) {
      this.shaker(at + beat * BEAT + BEAT / 2, 0.035);
    }
  }

  private padVoice(frequency: number, detune: number, at: number, duration: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.6;

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.05, at + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    osc.connect(filter).connect(gain).connect(this.output);
    osc.start(at);
    osc.stop(at + duration + 0.05);
    this.track(osc);
  }

  private pulse(at: number, gainValue: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.16);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainValue, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    osc.connect(gain).connect(this.output);
    osc.start(at);
    osc.stop(at + 0.3);
    this.track(osc);
  }

  private shaker(at: number, gainValue: number): void {
    if (!this.noise) {
      const frames = Math.floor(this.ctx.sampleRate * 0.2);
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainValue, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    source.connect(filter).connect(gain).connect(this.output);
    source.start(at);
    source.stop(at + 0.12);
    this.track(source);
  }

  /** Keep a handle on scheduled nodes so stop() can silence them all. */
  private track(node: AudioScheduledSourceNode): void {
    this.live.add(node);
    node.onended = () => {
      this.live.delete(node);
      node.onended = null;
    };
  }
}
