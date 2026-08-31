import type { DraftState } from '@/types/draft';
import type { ProviderEvent } from '@/types/events';
import type { SyncStatus } from '@/types/sync';
import { EMPTY_SYNC_STATUS } from '@/types/sync';
import type { PresentationView } from '@/types/settings';
import { DraftMachine, createInitialState, type Effect } from '@/core/draftMachine';
import type { DraftProvider } from '@/providers/DraftProvider';
import { SimulatorProvider } from '@/providers/SimulatorProvider';
import { debugLog } from '@/debug/logger';
import { Store } from './store';
import { INITIAL_UI, type RevealState, type UiState } from './uiState';

/**
 * The runtime.
 *
 * Owns the state machine, the currently attached provider, and the reveal
 * choreography. Audio and animation subscribe to machine effects rather than
 * polling state, so a pick is announced exactly once no matter how many times
 * React re-renders.
 */

export type EffectHandler = (effect: Effect, state: DraftState) => void;

/** How long "THE PICK IS IN" holds before the player card appears. */
export const INCOMING_MS = 1500;

/** A player card always gets at least this long on screen, even in a burst. */
export const MIN_PLAYER_CARD_MS = 2600;

export class DraftRuntime {
  readonly draft = new Store<DraftState>(createInitialState());
  readonly status = new Store<SyncStatus>(EMPTY_SYNC_STATUS);
  readonly ui = new Store<UiState>(INITIAL_UI);

  private machine = new DraftMachine();
  private provider: DraftProvider | null = null;
  private detach: (() => void) | null = null;
  private handlers = new Set<EffectHandler>();

  /** Reveal queue: end-of-draft autopicks can arrive faster than we show them. */
  private revealQueue: RevealState[] = [];
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private revealSeconds = 7;
  private roundBannerTimer: ReturnType<typeof setTimeout> | null = null;

  /* ----------------------------- providers ---------------------------- */

  async attach(provider: DraftProvider): Promise<void> {
    this.detachProvider();
    this.provider = provider;
    this.detach = provider.subscribe((event) => this.handleEvent(event));
    await provider.connect();
    this.status.set({ ...this.status.get(), ...provider.getStatus() });
  }

  detachProvider(): void {
    this.detach?.();
    this.detach = null;
    this.provider?.disconnect();
    this.provider = null;
  }

  getProvider(): DraftProvider | null {
    return this.provider;
  }

  /** The dev/simulator provider, when one is attached. */
  getSimulator(): SimulatorProvider | null {
    return this.provider instanceof SimulatorProvider ? this.provider : null;
  }

  async resync(): Promise<void> {
    debugLog('note', 'manual resync requested');
    await this.provider?.resync();
  }

  /* ------------------------------ events ------------------------------ */

  private handleEvent(event: ProviderEvent): void {
    if (event.type === 'SYNC_STATUS') {
      this.status.set({ ...this.status.get(), ...event.status });
      return;
    }

    const effects = this.machine.apply(event);
    const state = this.machine.getState();
    this.draft.set(state);

    this.status.set({
      ...this.status.get(),
      lastEventAt: event.at,
      ...(event.type === 'SNAPSHOT'
        ? { lastReconcileAt: event.at, espnSnapshot: event.snapshot }
        : {}),
    });

    for (const effect of effects) {
      this.dispatchEffect(effect, state);
    }
  }

  private dispatchEffect(effect: Effect, state: DraftState): void {
    switch (effect.type) {
      case 'PICK_ACCEPTED':
        if (effect.live) this.enqueueReveal(effect);
        break;
      case 'ROUND_CHANGED':
        this.showRoundBanner(effect.round);
        break;
      case 'DRIFT_CORRECTED':
        this.status.set({ ...this.status.get(), drift: effect.entries });
        debugLog('event', 'drift corrected', effect.entries);
        break;
      default:
        break;
    }

    for (const handler of [...this.handlers]) {
      try {
        handler(effect, state);
      } catch (error) {
        console.error('[runtime] effect handler failed', error);
      }
    }
  }

  onEffect(handler: EffectHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /* ------------------------------ reveals ----------------------------- */

  setRevealSeconds(seconds: number): void {
    this.revealSeconds = seconds;
  }

  private enqueueReveal(effect: Extract<Effect, { type: 'PICK_ACCEPTED' }>): void {
    const reveal: RevealState = { pick: effect.pick, stage: 'incoming', startedAt: Date.now() };
    // Never let a backlog build. Picks normally arrive minutes apart, but a run
    // of autopicks at the end of the draft can burst: in that case the newest
    // pick is the one that matters, so we drop the queue and cut a reveal that
    // has already had its moment.
    this.revealQueue = [reveal];
    const showing = this.ui.get().reveal;
    if (!showing) {
      this.advanceReveal();
      return;
    }
    const shownFor = Date.now() - showing.startedAt;
    if (shownFor >= INCOMING_MS + MIN_PLAYER_CARD_MS) this.advanceReveal();
  }

  private advanceReveal(): void {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
    const next = this.revealQueue.shift();
    if (!next) {
      this.ui.update((ui) => ({ ...ui, reveal: null }));
      return;
    }
    this.ui.update((ui) => ({ ...ui, reveal: { ...next, stage: 'incoming' } }));
    this.revealTimer = setTimeout(() => {
      this.ui.update((ui) =>
        ui.reveal ? { ...ui, reveal: { ...ui.reveal, stage: 'player' } } : ui,
      );
      this.revealTimer = setTimeout(() => this.advanceReveal(), this.revealSeconds * 1000);
    }, INCOMING_MS);
  }

  /** Operator escape hatch: drop whatever is on screen and go back to live. */
  clearReveal(): void {
    this.revealQueue = [];
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.revealTimer = null;
    this.ui.update((ui) => ({ ...ui, reveal: null }));
  }

  /** Used by the debug panel's TEST PLAYER REVEAL button. */
  previewReveal(reveal: RevealState): void {
    this.revealQueue.push(reveal);
    if (!this.ui.get().reveal) this.advanceReveal();
  }

  private showRoundBanner(round: number): void {
    if (this.roundBannerTimer) clearTimeout(this.roundBannerTimer);
    this.ui.update((ui) => ({ ...ui, roundBanner: round }));
    this.roundBannerTimer = setTimeout(() => {
      this.ui.update((ui) => ({ ...ui, roundBanner: null }));
    }, 3200);
  }

  /* -------------------------------- ui -------------------------------- */

  arm(): void {
    this.ui.update((ui) => ({ ...ui, armed: true }));
  }

  setView(view: PresentationView): void {
    this.ui.update((ui) => ({ ...ui, view }));
  }

  toggle(key: 'showDebug' | 'showMixer' | 'showChecklist' | 'showSimulator'): void {
    this.ui.update((ui) => ({ ...ui, [key]: !ui[key] }));
  }

  setFullscreen(value: boolean): void {
    this.ui.update((ui) => ({ ...ui, fullscreen: value }));
  }

  machineSummary() {
    return this.machine.summary();
  }

  /** Hard reset: only ever used by the operator panel as a recovery tool. */
  resetPresentation(): void {
    this.machine.reset();
    this.clearReveal();
    this.draft.set(this.machine.getState());
  }

  dispose(): void {
    this.detachProvider();
    if (this.revealTimer) clearTimeout(this.revealTimer);
    if (this.roundBannerTimer) clearTimeout(this.roundBannerTimer);
    this.handlers.clear();
  }
}

/** Single runtime per page, kept across HMR reloads in development. */
let runtimeSingleton: DraftRuntime | null = null;

export function getRuntime(): DraftRuntime {
  if (!runtimeSingleton) runtimeSingleton = new DraftRuntime();
  return runtimeSingleton;
}
