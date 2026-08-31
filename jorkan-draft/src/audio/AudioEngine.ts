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

const SFX_FILES: Record<SfxId, string> = {
  'pick-is-in': '/audio/pick-is-in.mp3',
  'on-the-clock': '/audio/on-the-clock.mp3',
  countdown: '/audio/countdown.mp3',
  transition: '/audio/transition.mp3',
  round: '/audio/transition.mp3',
  'draft-complete': '/audio/draft-complete.mp3',
};

const BED_FILE = '/audio/draft-bed.mp3';
const INTRO_FILE = '/audio/intro.mp3';

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
    const unique = new Set(Object.values(SFX_FILES));
    await Promise.all(
      [...unique].map(async (path) => {
        const ids = (Object.keys(SFX_FILES) as SfxId[]).filter((id) => SFX_FILES[id] === path);
        try {
          const response = await fetch(path, { cache: 'force-cache' });
          if (!response.ok) throw new Error(String(response.status));
          const type = response.headers.get('content-type') ?? '';
          // A dev server answers 200 with index.html for a missing file.
          if (type.includes('text/html')) throw new Error('not audio');
          const bytes = await response.arrayBuffer();
          const buffer = await this.ctx!.decodeAudioData(bytes);
          for (const id of ids) this.buffers.set(id, buffer);
        } catch {
          this.missing.add(path);
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

    if (!this.missing.has(BED_FILE) && !this.bedElement) {
      // Try the operator's own bed first; fall back to the generated one.
      const element = new Audio(BED_FILE);
      element.loop = true;
      element.preload = 'auto';
      element.onerror = () => {
        this.missing.add(BED_FILE);
        this.bedElement = null;
        this.startGeneratedBed();
      };
      element.oncanplay = () => {
        this.bedSource = 'file';
        void element.play().catch(() => {
          this.missing.add(BED_FILE);
          this.bedElement = null;
          this.startGeneratedBed();
        });
      };
      this.bedElement = element;
      this.applyLevels();
      return;
    }
    if (this.bedElement) {
      void this.bedElement.play().catch(() => undefined);
      return;
    }
    this.startGeneratedBed();
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
    const candidates = [INTRO_FILE, ...(hostedUrl ? directAudioCandidates(hostedUrl) : [])];
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
      loadedFiles: [...this.buffers.keys()].map((id) => SFX_FILES[id]),
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
