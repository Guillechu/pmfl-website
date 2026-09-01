import type { AudioSettings } from '@/types/settings';
import type { DraftState } from '@/types/draft';
import { displayedMs } from '@/core/clock';
import type { Effect } from '@/core/draftMachine';
import { INCOMING_MS, type DraftRuntime } from '@/state/DraftRuntime';
import { debugLog } from '@/debug/logger';
import { AudioEngine, audioEngine } from './AudioEngine';
import { Announcer } from './Announcer';
import {
  draftCompleteLine,
  draftStartLine,
  onTheClockLine,
  pickLine,
  roundLine,
} from './phrases';

/**
 * The show caller.
 *
 * Turns state-machine effects into sound, on the same clock as the on-screen
 * animation:
 *
 *   pick detected -> "the pick is in" hit -> reveal -> announcer reads the
 *   selection -> transition -> next team on the clock
 *
 * Nothing here can influence the draft; it only reacts to what ESPN has
 * already done.
 */
export class Director {
  private readonly engine: AudioEngine;
  private readonly announcer: Announcer;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private lastCountdownKey = '';
  private lastPickAcceptedAt = 0;
  private detach: (() => void) | null = null;
  private settings: AudioSettings | null = null;
  private introUrl: string | null = null;

  constructor(
    private readonly runtime: DraftRuntime,
    engine: AudioEngine = audioEngine,
  ) {
    this.engine = engine;
    this.announcer = new Announcer(this.engine);
  }

  getAnnouncer(): Announcer {
    return this.announcer;
  }

  getEngine(): AudioEngine {
    return this.engine;
  }

  /**
   * Called from ARM PRESENTATION - the one user gesture browsers require
   * before any audio may start.
   */
  async arm(settings: AudioSettings, introUrl: string | null): Promise<void> {
    this.settings = settings;
    this.introUrl = introUrl;
    await this.engine.unlock(settings);
    await this.announcer.init(settings);

    this.detach?.();
    this.detach = this.runtime.onEffect((effect, state) => this.handle(effect, state));
    this.startCountdownWatcher();

    const phase = this.runtime.draft.get().phase;
    if (phase === 'idle' || phase === 'waiting') {
      // Not awaited: a slow or dead music URL must not hold up fullscreen or
      // the rest of arming.
      void this.engine.playIntro(introUrl).then((played) => {
        debugLog('note', played ? 'intro music playing' : 'no intro music available');
        // The intro is a file on the far end of somebody's Dropbox link. When
        // it will not play there used to be no music at all, and nothing on
        // screen said why - so fall through to the bed we generate ourselves,
        // which needs no network and cannot go missing.
        if (!played) this.engine.startBed();
      });
    } else if (phase === 'in_progress') {
      // Arming in the middle of a draft - a reloaded tab, a second screen
      // opened late. The bed normally starts on the change into in_progress,
      // which has already happened, so without this the room stays silent for
      // the rest of the night.
      this.engine.startBed();
    }
  }

  setSettings(settings: AudioSettings): void {
    this.settings = settings;
    this.engine.setSettings(settings);
    this.announcer.setSettings(settings);
  }

  /* ------------------------------ effects ------------------------------ */

  private handle(effect: Effect, state: DraftState): void {
    switch (effect.type) {
      case 'DRAFT_STARTED':
        this.onDraftStarted();
        break;

      case 'PICK_ACCEPTED':
        if (effect.live) this.onPick(effect.pick, state);
        break;

      case 'ON_THE_CLOCK':
        this.onTheClock(effect);
        break;

      case 'ROUND_CHANGED':
        this.schedule(() => {
          this.engine.playSfx('round');
          this.announcer.say(roundLine(effect.round));
        }, this.pickSequenceDelay() + 120);
        break;

      case 'PHASE_CHANGED':
        this.onPhaseChanged(effect.to);
        break;

      case 'DRAFT_COMPLETE':
        this.onComplete();
        break;

      default:
        break;
    }
  }

  private onDraftStarted(): void {
    // ESPN starting the draft is what ends the pre-draft music.
    this.engine.fadeOutIntro(2200);
    this.schedule(() => this.engine.playSfx('round'), 900);
    this.schedule(() => {
      this.engine.startBed();
      this.announcer.say(draftStartLine());
    }, 1400);
  }

  private onPick(pick: Parameters<typeof pickLine>[0], state: DraftState): void {
    this.lastPickAcceptedAt = Date.now();
    // No cue on the pick itself: the reveal is the announcer's, and a sound
    // under it only competes with him. The bell comes afterwards, when the
    // clock moves to the next team.
    
    this.schedule(() => {
      this.announcer.say(pickLine(pick), {
        onDone: () => this.engine.playSfx('transition'),
      });
    }, INCOMING_MS);
    void state;
  }

  private onTheClock(effect: Extract<Effect, { type: 'ON_THE_CLOCK' }>): void {
    const delay = this.pickSequenceDelay();
    this.schedule(() => {
      this.engine.playSfx('on-the-clock');
      this.announcer.say(onTheClockLine(effect.team, effect.round, effect.pickInRound), {
        // If ESPN has moved on while this was queued, do not read it out.
        stillRelevant: () => this.runtime.draft.get().overallPick === effect.overallPick,
      });
    }, delay);
  }

  /** Keeps the on-the-clock call behind the pick it follows. */
  private pickSequenceDelay(): number {
    const sincePick = Date.now() - this.lastPickAcceptedAt;
    if (sincePick > INCOMING_MS + 500) return 250;
    return INCOMING_MS - sincePick + 350;
  }

  private onPhaseChanged(to: DraftState['phase']): void {
    if (to === 'paused') {
      this.engine.duck(false);
    }
    if (to === 'in_progress') {
      this.engine.startBed();
    }
  }

  private onComplete(): void {
    this.announcer.cancel();
    this.engine.stopBed();
    this.engine.playSfx('draft-complete');
    this.schedule(() => this.announcer.say(draftCompleteLine()), 1800);
  }

  /* ----------------------------- countdown ----------------------------- */

  /**
   * Ticks through the last five seconds. Purely a sound: the clock running
   * out is ESPN's business, and nothing here influences it.
   */
  private startCountdownWatcher(): void {
    if (this.countdownTimer) return;
    this.countdownTimer = setInterval(() => {
      const settings = this.settings;
      if (!settings?.countdownEnabled || settings.muted) return;
      const state = this.runtime.draft.get();
      if (state.phase !== 'in_progress') return;
      const ms = displayedMs(state.clock, Date.now());
      if (ms === null || !state.clock.running) return;
      if (ms > 5_000 || ms <= 0) return;
      const second = Math.ceil(ms / 1000);
      const key = `${state.overallPick}:${second}`;
      if (key === this.lastCountdownKey) return;
      this.lastCountdownKey = key;
      this.engine.playSfx('countdown');
    }, 200);
  }

  /* ------------------------------- utils ------------------------------- */

  private schedule(fn: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, Math.max(0, delayMs));
    this.timers.add(timer);
  }

  status() {
    return {
      audio: this.engine.status(),
      announcer: this.announcer.status(),
      introUrl: this.introUrl,
      pendingTimers: this.timers.size,
    };
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    this.detach?.();
    this.detach = null;
    this.announcer.cancel();
  }
}

let directorSingleton: Director | null = null;

export function getDirector(runtime: DraftRuntime): Director {
  if (!directorSingleton) directorSingleton = new Director(runtime);
  return directorSingleton;
}
