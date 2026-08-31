import type { SpeakOptions, TtsProvider, TtsVoice } from './TtsProvider';

/**
 * Browser SpeechSynthesis.
 *
 * Works offline and everywhere Chrome runs, with two well-known quirks handled
 * here: the voice list arrives asynchronously, and Chrome silently stops
 * long utterances after about fifteen seconds unless it is nudged.
 */
export class SpeechSynthesisProvider implements TtsProvider {
  readonly id = 'speech-synthesis';
  readonly label = 'Browser voice (offline)';

  private ready = false;
  private cached: TtsVoice[] = [];
  private current: SpeechSynthesisUtterance | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    await this.loadVoices();
    this.ready = true;
    // Warm the engine so the first real announcement is not clipped.
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
  }

  isReady(): boolean {
    return this.ready;
  }

  voices(): TtsVoice[] {
    return this.cached;
  }

  private loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const collect = () => {
        const list = window.speechSynthesis.getVoices();
        if (list.length === 0) return false;
        this.cached = list.map((voice) => ({
          id: voice.voiceURI,
          name: voice.name,
          lang: voice.lang,
          isDefault: voice.default,
        }));
        return true;
      };
      if (collect()) {
        resolve();
        return;
      }
      const onChange = () => {
        if (collect()) {
          window.speechSynthesis.removeEventListener('voiceschanged', onChange);
          resolve();
        }
      };
      window.speechSynthesis.addEventListener('voiceschanged', onChange);
      // Some platforms never fire the event; do not block the presentation.
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onChange);
        collect();
        resolve();
      }, 2500);
    });
  }

  /** Best English voice available, preferring a natural US English one. */
  pickDefaultVoice(): string | null {
    const preferred = [
      /google us english/i,
      /microsoft (guy|aria|jenny|david)/i,
      /natural/i,
      /en-us/i,
    ];
    for (const pattern of preferred) {
      const match = this.cached.find(
        (voice) => pattern.test(voice.name) || pattern.test(voice.lang),
      );
      if (match) return match.id;
    }
    return this.cached.find((voice) => voice.lang.toLowerCase().startsWith('en'))?.id ?? null;
  }

  speak(text: string, options: SpeakOptions): Promise<void> {
    if (!this.ready || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.volume = options.volume;

      if (options.voiceId) {
        const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === options.voiceId);
        if (voice) utterance.voice = voice;
      }

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.stopKeepAlive();
        this.current = null;
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      this.current = utterance;
      window.speechSynthesis.speak(utterance);
      this.startKeepAlive();

      // Safety net: if the engine never reports back, do not stall the queue.
      const estimateMs = Math.max(4000, (text.length / 12) * 1000 * (1 / Math.max(0.5, options.rate)));
      setTimeout(finish, estimateMs + 5000);
    });
  }

  cancel(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    this.stopKeepAlive();
    this.current = null;
  }

  /** Chrome stops speaking after ~15s unless pause/resume is toggled. */
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAlive = setInterval(() => {
      if (!this.current) return;
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10_000);
  }

  private stopKeepAlive(): void {
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }
}
