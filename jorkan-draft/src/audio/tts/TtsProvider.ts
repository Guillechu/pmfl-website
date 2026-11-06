/**
 * Text-to-speech behind an interface.
 *
 * The browser's SpeechSynthesis is the default because it needs no account,
 * no key and no network. A hosted voice (ElevenLabs, Azure, Play.ht) can be
 * added later by implementing this interface and registering it - nothing
 * else in the app has to change.
 */
export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  isDefault: boolean;
  /**
   * False when the voice is streamed from a server rather than generated on
   * the machine. Counter-intuitively that is the good sign: the network
   * voices are the modern neural ones, and the local ones are the decades-old
   * robotic engines.
   */
  localService?: boolean;
  /** 0..1, how natural this voice is expected to sound. Best first in lists. */
  quality?: number;
}

export interface SpeakOptions {
  rate: number;
  pitch: number;
  volume: number;
  voiceId: string | null;
}

export interface TtsProvider {
  readonly id: string;
  readonly label: string;
  init(): Promise<void>;
  isReady(): boolean;
  voices(): TtsVoice[];
  /** Resolves when the line has finished (or been cancelled). */
  speak(text: string, options: SpeakOptions): Promise<void>;
  cancel(): void;
}
