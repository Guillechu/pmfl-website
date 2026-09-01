import type { SpeakOptions, TtsProvider, TtsVoice } from './TtsProvider';

/*
 * Which browser voice should read the draft.
 *
 * The brief is a woman's voice, as natural as this machine can manage, and
 * the gap between the best and the worst available is enormous - the neural
 * voices are close to a broadcast read, the twenty-year-old local engines are
 * unmistakably a computer. Nothing in the Web Speech API says a voice's
 * gender or its quality, so both have to be recognised by name.
 */

/** Neural voices, in the order they sound best for reading a draft. */
const NATURAL_FEMALE = /\b(aria|jenny|michelle|ana|emma|ava|amber|ashley|cora|elizabeth|monica|sara|nancy|jane|nova|sonia|libby|maisie|natasha|clara|molly|neerja|serena|samantha)\b/i;
/** The older local engines: women's voices, and audibly synthetic. */
const CLASSIC_FEMALE = /\b(zira|hazel|susan|linda|heera|catherine|eva|karen|moira|tessa|fiona|kate|victoria|allison)\b/i;
/** Named men's voices, so a search for "natural" does not land on one. */
const MALE = /\b(guy|andrew|brian|christopher|eric|roger|steffan|davis|tony|jason|william|liam|ryan|thomas|alfie|elliot|david|mark|george|james|daniel|fred|alex|oliver|rishi|richard|male)\b/i;

/**
 * How good a fit a voice is, highest first. Anything at zero or below is
 * either the wrong language or a man's voice, and is never chosen by
 * default - though it stays in the list for anyone who wants it.
 */
export function scoreVoice(name: string, lang: string, localService: boolean): number {
  const language = lang.toLowerCase();
  if (!language.startsWith('en')) return -100;
  // "female" contains "male", but not as a word, so the boundaries here are
  // load-bearing: Google UK English Female must not read as a man.
  if (MALE.test(name)) return -50;

  let score = 1;
  // "Natural" and "Online" are how Microsoft labels its neural voices, and
  // they are the closest thing to a real announcer a browser will give us.
  if (/natural|neural/i.test(name)) score += 120;
  if (/online/i.test(name)) score += 60;
  if (NATURAL_FEMALE.test(name)) score += 70;
  else if (CLASSIC_FEMALE.test(name)) score += 30;
  else if (/\bfemale\b/i.test(name)) score += 45;
  // Streamed voices are the modern ones; local means the old robotic engine.
  if (!localService) score += 40;
  if (/google/i.test(name)) score += 25;

  if (language.startsWith('en-us')) score += 12;
  else if (language.startsWith('en-gb')) score += 8;
  return score;
}

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
        this.cached = list
          .map((voice) => ({
            id: voice.voiceURI,
            name: voice.name,
            lang: voice.lang,
            isDefault: voice.default,
            localService: voice.localService,
            quality: scoreVoice(voice.name, voice.lang, voice.localService),
          }))
          .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0));
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

  /**
   * The most natural woman's English voice on this machine.
   *
   * The list is already sorted best-first by the same scoring, so this is the
   * head of it. Anything English will do rather than nothing.
   */
  pickDefaultVoice(): string | null {
    const best = this.cached.find((voice) => (voice.quality ?? 0) > 0);
    if (best) return best.id;
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
