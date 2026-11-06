import type { AudioSettings } from '@/types/settings';
import { GenerativeBed } from './bed';
import { playCue, type SfxId } from './synth';
import { directAudioCandidates } from './urls';

/**
 * The audio engine.
 *
 * Three buses - music, effects, announcer - under one master, with automatic
 * ducking of the bed whenever the announcer speaks. Every sound has a
 * built-in synthesised fallback, so a missing file quietens one cue rather
 * than breaking the show.
 *
 * Browsers refuse to start audio before a user gesture; unlock() is called
 * from ARM PRESENTATION and is the only place the context is created.
 */

export type AudioStatus = {
  unlocked: boolean;
  contextState: AudioContextState | 'none';
  bedRunning: boolean;
  bedSource: 'file' | 'generated' | 'none';
  loadedFiles: string[];
  missingFiles: string[];
  introPlaying: boolean;
  ducked: boolean;
};

/**
 * Operator-supplied audio.
 *
 * Base names, not paths: every extension is tried in turn, so whatever a
 * sound arrives as - an .m4a off a phone, a .wav out of a recorder - it works
 * by being dropped in under the right name, with nothing to convert and no
 * code to edit. None of these files are committed (see public/audio/
 * .gitignore); they stay on the machine running the show.
 */
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'ogg', 'wav'];

const SFX_BASE: Record<SfxId, string> = {
  'on-the-clock': 'on-the-clock',
  countdown: 'countdown',
  transition: 'transition',
  round: 'transition',
  'draft-complete': 'draft-complete',
};

const BED_BASE = 'draft-bed';
const INTRO_BASE = 'intro';

function fileCandidates(base: string): string[] {
  return AUDIO_EXTENSIONS.map((extension) => `/audio/${base}.${extension}`);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private bed: GenerativeBed | null = null;
  private bedElement: HTMLAudioElement | null = null;
  private bedSource: AudioStatus['bedSource'] = 'none';
  private bedWanted = false;

  private intro: HTMLAudioElement | null = null;
  private introPlaying = false;

  private buffers = new Map<SfxId, AudioBuffer>();
  private loadedFrom = new Map<SfxId, string>();
  private bedLoading = false;
  private missing = new Set<string>();
  private ducked = false;
  private settings: AudioSettings | null = null;
  private introFade: ReturnType<typeof setInterval> | null = null;

  /* ------------------------------- setup ------------------------------- */

  isUnlocked(): boolean {
    return this.ctx !== null;
  }

  /** Must be called from a user gesture. Safe to call more than once. */
  async unlock(settings: AudioSettings): Promise<void> {
    this.settings = settings;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.bed = new GenerativeBed(this.ctx, this.musicGain);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.applyLevels();
    void this.preload();
  }

  setSettings(settings: AudioSettings): void {
    this.settings = settings;
    this.applyLevels();
    if (!settings.musicEnabled || settings.muted) this.stopBed();
    else if (this.bedWanted) this.startBed();
  }

  private applyLevels(): void {
    if (!this.ctx || !this.master || !this.musicGain || !this.sfxGain || !this.settings) return;
    const s = this.settings;
    const now = this.ctx.currentTime;
    const master = s.muted ? 0 : s.master;
    this.master.gain.setTargetAtTime(master, now, 0.04);
    const musicTarget = (s.musicEnabled ? s.music : 0) * (this.ducked ? s.duckLevel : 1);
    this.musicGain.gain.setTargetAtTime(musicTarget, now, this.ducked ? s.duckAttackMs / 3000 : s.duckReleaseMs / 3000);
    this.sfxGain.gain.setTargetAtTime(s.sfxEnabled ? s.sfx : 0, now, 0.04);
    if (this.bedElement) this.bedElement.volume = clamp01(master * (s.musicEnabled ? s.music : 0) * (this.ducked ? s.duckLevel : 1));
    if (this.intro) this.intro.volume = clamp01(master * (s.musicEnabled ? s.music : 0));
  }

  /** Load any operator-supplied files. Missing files are simply noted. */
  private async preload(): Promise<void> {
    if (!this.ctx) return;
    const bases = [...new Set(Object.values(SFX_BASE))];
    await Promise.all(
      bases.map(async (base) => {
        const ids = (Object.keys(SFX_BASE) as SfxId[]).filter((id) => SFX_BASE[id] === base);
        for (const path of fileCandidates(base)) {
          try {
            const response = await fetch(path, { cache: 'force-cache' });
            if (!response.ok) throw new Error(String(response.status));
            const type = response.headers.get('content-type') ?? '';
            // A dev server answers 200 with index.html for a missing file.
            if (type.includes('text/html')) throw new Error('not audio');
            const bytes = await response.arrayBuffer();
            const buffer = await this.ctx!.decodeAudioData(bytes);
            for (const id of ids) {
              this.buffers.set(id, buffer);
              this.loadedFrom.set(id, path);
            }
            return;
          } catch {
            this.missing.add(path);
          }
        }
      }),
    );
  }

  /* -------------------------------- sfx -------------------------------- */

  playSfx(id: SfxId): void {
    if (!this.ctx || !this.sfxGain || !this.settings) return;
    if (!this.settings.sfxEnabled || this.settings.muted) return;

    const buffer = this.buffers.get(id);
    if (buffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.sfxGain);
      source.start();
      source.onended = () => {
        source.disconnect();
        source.onended = null;
      };
      return;
    }
    playCue(this.ctx, this.sfxGain, id);
  }

  /* ------------------------------- music ------------------------------- */

  startBed(): void {
    this.bedWanted = true;
    if (!this.ctx || !this.settings) return;
    if (!this.settings.musicEnabled || this.settings.muted) return;

    if (this.bedElement) {
      void this.bedElement.play().catch(() => undefined);
      return;
    }
    if (this.bedLoading) return;

    // Try the operator's own bed first; fall back to the generated one.
    const candidates = fileCandidates(BED_BASE).filter((path) => !this.missing.has(path));
    if (candidates.length === 0) {
      this.startGeneratedBed();
      return;
    }
    this.bedLoading = true;
    void this.loadBedElement(candidates).then((loaded) => {
      this.bedLoading = false;
      if (loaded && !this.bedWanted) this.bedElement?.pause();
      if (!loaded && this.bedWanted) this.startGeneratedBed();
    });
  }

  /** Each candidate in turn; resolves true as soon as one is playing. */
  private async loadBedElement(candidates: string[]): Promise<boolean> {
    for (const path of candidates) {
      const playing = await new Promise<boolean>((resolve) => {
        const element = new Audio();
        element.loop = true;
        element.preload = 'auto';
        let settled = false;
        const done = (value: boolean) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        element.onerror = () => done(false);
        element.oncanplay = () => {
          void element
            .play()
            .then(() => {
              this.bedElement = element;
              this.bedSource = 'file';
              this.applyLevels();
              done(true);
            })
            .catch(() => done(false));
        };
        element.src = path;
        // Never hang the show on a file the browser will not decode.
        setTimeout(() => done(false), 4000);
      });
      if (playing) return true;
      this.missing.add(path);
    }
    return false;
  }

  private startGeneratedBed(): void {
    if (!this.bed) return;
    this.bedSource = 'generated';
    this.bed.start();
    this.applyLevels();
  }

  stopBed(): void {
    this.bedWanted = false;
    this.bed?.stop();
    if (this.bedElement) {
      this.bedElement.pause();
    }
  }

  /* ------------------------------- intro ------------------------------- */

  /**
   * Pre-draft music. Tries the operator's local file first, then the hosted
   * URL from settings (Dropbox links are rewritten to a direct form).
   */
  async playIntro(hostedUrl?: string | null): Promise<boolean> {
    const candidates = [...fileCandidates(INTRO_BASE), ...(hostedUrl ? directAudioCandidates(hostedUrl) : [])];
    for (const url of candidates) {
      if (this.missing.has(url)) continue;
      const ok = await this.tryPlayIntro(url);
      if (ok) return true;
      this.missing.add(url);
    }
    return false;
  }

  private tryPlayIntro(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const element = new Audio();
      element.loop = true;
      element.preload = 'auto';
      element.volume = 0;
      let settled = false;
      const done = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      element.onerror = () => {
        element.remove();
        done(false);
      };
      element.oncanplay = () => {
        void element
          .play()
          .then(() => {
            this.intro = element;
            this.introPlaying = true;
            this.applyLevels();
            done(true);
          })
          .catch(() => done(false));
      };
      element.src = url;
      // Never hang the pre-draft screen on a slow or dead URL.
      setTimeout(() => done(false), 4000);
    });
  }

  fadeOutIntro(ms = 2200): void {
    const element = this.intro;
    if (!element) return;
    if (this.introFade) clearInterval(this.introFade);
    const startVolume = element.volume;
    const startedAt = performance.now();
    this.introFade = setInterval(() => {
      const t = Math.min(1, (performance.now() - startedAt) / ms);
      element.volume = clamp01(startVolume * (1 - t));
      if (t >= 1) {
        element.pause();
        element.src = '';
        if (this.introFade) clearInterval(this.introFade);
        this.introFade = null;
        this.intro = null;
        this.introPlaying = false;
      }
    }, 60);
  }

  /* ------------------------------ ducking ------------------------------ */

  duck(active: boolean): void {
    if (this.ducked === active) return;
    this.ducked = active;
    this.applyLevels();
  }

  /* ------------------------------- status ------------------------------ */

  status(): AudioStatus {
    return {
      unlocked: this.ctx !== null,
      contextState: this.ctx?.state ?? 'none',
      bedRunning: Boolean(this.bed?.isRunning()) || Boolean(this.bedElement && !this.bedElement.paused),
      bedSource: this.bedSource,
      loadedFiles: [...new Set(this.loadedFrom.values())],
      missingFiles: [...this.missing],
      introPlaying: this.introPlaying,
      ducked: this.ducked,
    };
  }

  dispose(): void {
    this.stopBed();
    this.fadeOutIntro(1);
    if (this.introFade) clearInterval(this.introFade);
    void this.ctx?.close();
    this.ctx = null;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export const audioEngine = new AudioEngine();
