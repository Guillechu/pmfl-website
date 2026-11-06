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
 * Partials are given in hertz rather than as ratios because they were
 * measured off a recording rather than chosen: a bell's overtones do not sit
 * where a musical instrument's do, which is exactly what makes it sound like
 * metal being hit. Each one dies at its own rate, so the bright ones go first
 * and leave the low note behind.
 */
function struck(
  { ctx, destination, at }: CueContext,
  options: {
    start: number;
    gain: number;
    /** [frequency in Hz, relative loudness, seconds to fade out]. */
    partials: Array<[number, number, number]>;
  },
): void {
  const total = options.partials.reduce((sum, [, amp]) => sum + amp, 0);
  const t0 = at + options.start;

  for (const [hz, amp, decay] of options.partials) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, t0);
    // Bells are never quite in tune with themselves; this is the warble.
    osc.detune.value = (hz % 7) - 3;

    const peak = (amp / total) * options.gain;
    const end = t0 + decay;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(env).connect(destination);
    osc.start(t0);
    osc.stop(end + 0.05);
  }

  // The hammer on the metal, over before it has begun.
  noiseSweep({ ctx, destination, at }, {
    start: options.start,
    duration: 0.04,
    gain: options.gain * 0.45,
    fromHz: 4200,
    toHz: 2000,
    q: 0.9,
  });
}

/** Clocks alternate; five identical beeps would not read as one ticking. */
let tock = false;

/** Play one cue. Returns roughly how long it lasts, in seconds. */
export function playCue(ctx: AudioContext, destination: AudioNode, id: SfxId): number {
  const cue: CueContext = { ctx, destination, at: ctx.currentTime + 0.02 };

  switch (id) {
    case 'on-the-clock': {
      // A church bell, struck once and kept short. These frequencies are not
      // invented: they were measured off the recording the league sent, where
      // the octave at 787Hz carries the sound, the fifth at 590 sits under it
      // and 393 is the hum. The tail is cut to well under a second so the
      // announcer can name the team over the top of it.
      struck(cue, {
        start: 0,
        gain: 0.52,
        partials: [
          [393, 0.1, 0.62],
          [590, 0.5, 0.58],
          [787, 1.0, 0.6],
          [1179, 0.14, 0.34],
          [1585, 0.2, 0.32],
          [1767, 0.12, 0.28],
          [2357, 0.44, 0.3],
        ],
      });
      return 0.7;
    }

    case 'countdown': {
      // A clock, not a beep: a hard click with a short knock under it, the
      // pitch alternating so the last five seconds tick rather than repeat.
      tock = !tock;
      const pitch = tock ? 1 : 0.84;
      noiseSweep(cue, { start: 0, duration: 0.022, gain: 0.24, fromHz: 3600 * pitch, toHz: 1900 * pitch, q: 1.4 });
      tone(cue, {
        type: 'square',
        from: 900 * pitch,
        to: 620 * pitch,
        start: 0,
        duration: 0.05,
        gain: 0.13,
        attack: 0.002,
        filter: 2800,
      });
      return 0.07;
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
