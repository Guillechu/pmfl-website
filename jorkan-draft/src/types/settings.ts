export interface AudioSettings {
  /** All levels are 0..1 linear; the engine converts to gain curves. */
  master: number;
  music: number;
  sfx: number;
  announcer: number;
  muted: boolean;
  /** How far the music bed drops while the announcer speaks (0..1 of its level). */
  duckLevel: number;
  duckAttackMs: number;
  duckReleaseMs: number;
  /** SpeechSynthesis voice URI, or a provider-specific voice id. */
  voiceId: string | null;
  voiceRate: number;
  voicePitch: number;
  announcerEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  /** Countdown ticks under 10 seconds. */
  countdownEnabled: boolean;
  /**
   * Pre-draft music. A local /public/audio/intro.mp3 wins if present;
   * otherwise this hosted URL is used (Dropbox share links are rewritten to a
   * direct-delivery form automatically).
   */
  introUrl: string | null;
}

export type PresentationView = 'live' | 'board' | 'rosters' | 'summary';

export interface PresentationSettings {
  view: PresentationView;
  showTicker: boolean;
  /** Seconds the full-screen player reveal stays up before returning to live. */
  revealSeconds: number;
  /** Global UI scale multiplier for oddly-sized TVs. */
  uiScale: number;
  /** Reduce motion for very slow machines. */
  lowMotion: boolean;
  debugOverlay: boolean;
  /** Go fullscreen when the operator arms the presentation. */
  fullscreenOnArm: boolean;
}

export interface AppSettings {
  audio: AudioSettings;
  presentation: PresentationSettings;
}
