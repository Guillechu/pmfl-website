import type { DraftSnapshot } from '@/types/draft';
import type { ProviderEvent } from '@/types/events';
import type { ProviderKind, SyncStatus } from '@/types/sync';
import { EMPTY_SYNC_STATUS } from '@/types/sync';

export type ProviderListener = (event: ProviderEvent) => void;
export type Unsubscribe = () => void;

/**
 * A source of draft truth.
 *
 * ESPN sits behind this adapter so its parsing can be replaced or repaired
 * without the presentation knowing. Note the deviation from a naive design:
 * a provider reports what the *source* currently shows (a DraftSnapshot) and
 * streams events; it never owns DraftState. DraftState has exactly one owner,
 * the state machine, which is what makes duplicate protection tractable.
 */
export interface DraftProvider {
  readonly kind: ProviderKind;
  connect(): Promise<void>;
  disconnect(): void;
  /** Latest authoritative read of the source, or null if we have not read it. */
  getState(): DraftSnapshot | null;
  getStatus(): SyncStatus;
  subscribe(listener: ProviderListener): Unsubscribe;
  /** Force a fresh full read of the source. */
  resync(): Promise<DraftSnapshot | null>;
}

/** Listener bookkeeping shared by every provider implementation. */
export abstract class BaseProvider implements DraftProvider {
  abstract readonly kind: ProviderKind;

  private listeners = new Set<ProviderListener>();
  protected status: SyncStatus = { ...EMPTY_SYNC_STATUS };
  protected snapshot: DraftSnapshot | null = null;

  abstract connect(): Promise<void>;
  abstract resync(): Promise<DraftSnapshot | null>;

  disconnect(): void {
    this.listeners.clear();
  }

  getState(): DraftSnapshot | null {
    return this.snapshot;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: ProviderListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(event: ProviderEvent): void {
    if (event.type !== 'CLOCK' && event.type !== 'SYNC_STATUS') {
      this.status = { ...this.status, lastEventAt: event.at };
    }
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch (error) {
        // One broken listener must never stop the draft feed.
        console.error('[provider] listener failed', error);
      }
    }
  }

  protected patchStatus(patch: Partial<SyncStatus>, at = Date.now()): void {
    this.status = { ...this.status, ...patch };
    this.emit({ type: 'SYNC_STATUS', at, status: patch });
  }
}
