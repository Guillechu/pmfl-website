/**
 * Original synthesised broadcast cues.
 *
 * Every sound the presentation makes out of the box is generated here from
 * oscillators and noise - nothing is sampled or borrowed. If the operator
 * drops their own file into /public/audio the engine uses that instead; these
 * exist so the show always has sound, offline and with no licensing to worry
 * about.
 */

export type SfxId =
  | 'pick-is-in'
  | 'on-the-clock'
  | 'countdown'
  | 'transition'
  | 'round'
  | 'draft-complete';

interface CueContext {
  ctx: AudioContext;
  destination: AudioNode;
  at: number;
}

/** Short burst of filtered noise, the backbone of the whooshes and swells. */
function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function tone(
  { ctx, destination, at }: CueContext,
  options: {
    type: OscillatorType;
    from: number;
    to?: number;
    start: number;
    duration: number;
    gain: number;
    attack?: number;
    filter?: number;
    detune?: number;
  },
): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = options.type;
  if (options.detune) osc.detune.value = options.detune;

  const t0 = at + options.start;
  const t1 = t0 + options.duration;
  osc.frequency.setValueAtTime(options.from, t0);
  if (options.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), t1);

  const attack = options.attack ?? 0.012;
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain), t0 + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t1);

  let node: AudioNode = osc;
  if (options.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.filter;
    osc.connect(filter);
    node = filter;
  }
  node.connect(gainNode).connect(destination);

  osc.start(t0);
  osc.stop(t1 + 0.05);
}

function noiseSweep(
  { ctx, destination, at }: CueContext,
  options: {
    start: number;
    duration: number;
    gain: number;
    fromHz: number;
    toHz: number;
    q?: number;
  },
): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, options.duration + 0.05);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = options.q ?? 1.2;
  const gainNode = ctx.createGain();

  const t0 = at + options.start;
  const t1 = t0 + options.duration;
  filter.frequency.setValueAtTime(options.fromHz, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, options.toHz), t1);
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, t0 + options.duration * 0.35);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t1);

  source.connect(filter).connect(gainNode).connect(destination);
  source.start(t0);
  source.stop(t1 + 0.05);
}

/**
 * A struck bell.
 *
 * What makes a bell sound like a bell is that its partials are not a harmonic
 * series - they sit at stubbornly non-musical ratios of the strike note, which
 * is why a bell has a pitch you can hum and a shimmer you cannot. The ratios
 * below are the classic ones, each partial with its own decay so the bright
 * ones die away first and leave the low hum ringing, exactly as metal does.
 */
function bell(
  { ctx, destination, at }: CueContext,
  options: { note: number; start: number; decay: number; gain: number },
): void {
  /** ratio to the strike note, relative loudness, share of the full decay. */
  const PARTIALS: Array<[number, number, number]> = [
    [0.28, 0.9, 1.0], // sub-hum: weight on a television speaker
    [0.56, 1.0, 1.0], // hum
    [0.92, 0.67, 0.9],
    [1.19, 1.0, 0.65],
    [1.71, 1.8, 0.5],
    [2.0, 2.67, 0.32],
    [2.74, 1.67, 0.3],
    [3.0, 1.46, 0.24],
    [3.76, 1.33, 0.18],
    [4.07, 1.33, 0.14],
  ];
  const total = PARTIALS.reduce((sum, [, amp]) => sum + amp, 0);
  const t0 = at + options.start;

  for (const [ratio, amp, share] of PARTIALS) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(options.note * ratio, t0);
    // A real bell is never quite in tune with itself; a couple of cents of
    // drift on the upper partials is what gives it that slow warble.
    if (ratio > 1) osc.detune.value = (ratio * 7) % 9;

    const peak = (amp / total) * options.gain;
    const end = t0 + options.decay * share;
    gainNode.gain.setValueAtTime(0.0001, t0);
    gainNode.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gainNode).connect(destination);
    osc.start(t0);
    osc.stop(end + 0.05);
  }

  // The strike itself: the hammer on the metal, over almost before it starts.
  noiseSweep({ ctx, destination, at }, {
    start: options.start,
    duration: 0.045,
    gain: options.gain * 0.5,
    fromHz: options.note * 6,
    toHz: options.note * 3,
    q: 0.8,
  });
}

/** Play one cue. Returns roughly how long it lasts, in seconds. */
export function playCue(ctx: AudioContext, destination: AudioNode, id: SfxId): number {
  const cue: CueContext = { ctx, destination, at: ctx.currentTime + 0.02 };

  switch (id) {
    case 'pick-is-in': {
      // One bell, struck hard. It rings for about two and a half seconds,
      // which puts the tail underneath the announcer rather than in front of
      // him - he starts a second and a half after the strike.
      bell(cue, { note: 523, start: 0, decay: 2.6, gain: 0.5 });
      return 2.6;
    }

    case 'on-the-clock': {
      tone(cue, { type: 'triangle', from: 660, to: 880, start: 0, duration: 0.18, gain: 0.16 });
      tone(cue, { type: 'triangle', from: 880, to: 1180, start: 0.14, duration: 0.22, gain: 0.13 });
      return 0.4;
    }

    case 'countdown': {
      tone(cue, { type: 'square', from: 1180, to: 1180, start: 0, duration: 0.07, gain: 0.11, attack: 0.004 });
      return 0.1;
    }

    case 'transition': {
      noiseSweep(cue, { start: 0, duration: 0.55, gain: 0.16, fromHz: 3400, toHz: 320, q: 1.6 });
      tone(cue, { type: 'sine', from: 420, to: 140, start: 0, duration: 0.5, gain: 0.1 });
      return 0.6;
    }

    case 'round': {
      noiseSweep(cue, { start: 0, duration: 0.7, gain: 0.14, fromHz: 300, toHz: 4200, q: 1 });
      tone(cue, { type: 'sawtooth', from: 196, to: 392, start: 0.18, duration: 0.7, gain: 0.16, filter: 2000 });
      return 0.9;
    }

    case 'draft-complete': {
      // Rising fanfare on an open chord; deliberately celebratory, not fussy.
      const notes = [196, 262, 330, 392, 523];
      notes.forEach((frequency, index) => {
        tone(cue, {
          type: 'sawtooth',
          from: frequency,
          to: frequency,
          start: index * 0.14,
          duration: 2.2 - index * 0.14,
          gain: 0.16,
          filter: 2600,
        });
      });
      noiseSweep(cue, { start: 0, duration: 1.6, gain: 0.12, fromHz: 400, toHz: 5200, q: 0.7 });
      return 2.4;
    }

    default:
      return 0;
  }
}
