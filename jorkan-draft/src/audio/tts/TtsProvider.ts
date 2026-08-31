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
