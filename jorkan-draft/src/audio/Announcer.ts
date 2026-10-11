import type { AudioSettings } from '@/types/settings';
import { applyPronunciations, loadPronunciations, type PronunciationRule } from '@/config/pronunciations';
import { debugLog } from '@/debug/logger';
import type { AudioEngine } from './AudioEngine';
import type { TtsProvider } from './tts/TtsProvider';
import { SpeechSynthesisProvider } from './tts/SpeechSynthesisProvider';

/**
 * The voice.
 *
 * Serialises everything it is asked to say - two announcements can never
 * overlap - ducks the music bed while speaking, and applies pronunciation
 * overrides at the last moment so the screen keeps the real spelling.
 */

interface QueueItem {
  text: string;
  /** Dropped without speaking if this returns false when its turn comes. */
  stillRelevant?: () => boolean;
  onStart?: () => void;
  onDone?: () => void;
}

export class Announcer {
  private provider: TtsProvider;
  private queue: QueueItem[] = [];
  private speaking = false;
  private settings: AudioSettings | null = null;
  private rules: PronunciationRule[] = [];
  private lastSpokenAt: number | null = null;
  private lastLine = '';
  /** The voice we resolved at init when the operator has not chosen one. */
  private defaultVoiceId: string | null = null;

  constructor(private readonly engine: AudioEngine) {
    this.provider = new SpeechSynthesisProvider();
  }

  async init(settings: AudioSettings): Promise<void> {
    this.rules = loadPronunciations();
    await this.provider.init();
    if (this.provider instanceof SpeechSynthesisProvider) {
      this.defaultVoiceId = this.provider.pickDefaultVoice();
    }
    this.settings = this.withVoice(settings);
  }

  setProvider(provider: TtsProvider): void {
    this.provider.cancel();
    this.provider = provider;
  }

  getProvider(): TtsProvider {
    return this.provider;
  }

  setSettings(settings: AudioSettings): void {
    this.settings = this.withVoice(settings);
  }

  /**
   * Settings say voiceId: null for "best available", and every settings
   * update used to overwrite the voice chosen at init with that null - so the
   * announcer quietly reverted to whatever voice the browser defaults to,
   * which is rarely the natural woman's voice we went looking for.
   */
  private withVoice(settings: AudioSettings): AudioSettings {
    if (settings.voiceId || !this.defaultVoiceId) return settings;
    return { ...settings, voiceId: this.defaultVoiceId };
  }

  reloadPronunciations(): void {
    this.rules = loadPronunciations();
  }

  /** Queue a line. Resolves when it has actually been spoken (or skipped). */
  say(text: string, options: Omit<QueueItem, 'text'> = {}): void {
    if (!text.trim()) return;
    this.queue.push({ text, ...options });
    void this.pump();
  }

  /** Drop everything queued and stop mid-sentence. Recovery tool only. */
  cancel(): void {
    this.queue = [];
    this.provider.cancel();
    this.speaking = false;
    this.engine.duck(false);
  }

  private async pump(): Promise<void> {
    if (this.speaking) return;
    const item = this.queue.shift();
    if (!item) return;
    if (item.stillRelevant && !item.stillRelevant()) {
      void this.pump();
      return;
    }
    const settings = this.settings;
    if (!settings || !settings.announcerEnabled || settings.muted) {
      item.onDone?.();
      void this.pump();
      return;
    }

    this.speaking = true;
    item.onStart?.();
    this.engine.duck(true);

    const spoken = applyPronunciations(item.text, this.rules);
    this.lastLine = item.text;
    this.lastSpokenAt = Date.now();
    debugLog('event', 'announcer', { text: item.text });

    try {
      await this.provider.speak(spoken, {
        rate: settings.voiceRate,
        pitch: settings.voicePitch,
        volume: Math.max(0, Math.min(1, settings.announcer * settings.master)),
        voiceId: settings.voiceId,
      });
    } catch (error) {
      debugLog('error', 'announcer failed', String(error));
    }

    this.speaking = false;
    item.onDone?.();

    if (this.queue.length === 0) this.engine.duck(false);
    void this.pump();
  }

  status() {
    return {
      provider: this.provider.id,
      ready: this.provider.isReady(),
      speaking: this.speaking,
      queued: this.queue.length,
      voices: this.provider.voices().length,
      lastLine: this.lastLine,
      lastSpokenAt: this.lastSpokenAt,
    };
  }
}
