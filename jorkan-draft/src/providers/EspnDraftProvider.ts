import type { DraftSnapshot } from '@/types/draft';
import type { ProviderKind } from '@/types/sync';
import type { BridgeState } from '@shared/protocol';
import { LEAGUE } from '@/config/league';
import { ingestDebug, debugLog } from '@/debug/logger';
import { BaseProvider } from './DraftProvider';
import { extensionBridge, type ExtensionBridge } from './bridge/extensionBridge';

/**
 * The real thing: ESPN, by way of the Chrome extension.
 *
 * The extension owns detection and deduplication; this provider is the thin
 * adapter that turns its messages into the same event stream the simulator
 * produces, so the presentation cannot tell the difference.
 */

/** No word from ESPN for this long during a live draft is worth flagging. */
const STALE_AFTER_MS = 12_000;

export class EspnDraftProvider extends BaseProvider {
  readonly kind: ProviderKind = 'espn';

  private detach: (() => void) | null = null;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private lastEventAt: number | null = null;

  constructor(private readonly bridge: ExtensionBridge = extensionBridge) {
    super();
  }

  async connect(): Promise<void> {
    this.patchStatus({ connection: 'connecting', provider: 'espn' });

    this.detach = this.bridge.subscribe((message) => {
      switch (message.kind) {
        case 'STATE_SYNC':
          this.onStateSync(message.state);
          break;

        case 'EVENTS':
          this.lastEventAt = message.at;
          for (const event of message.events) {
            if (event.type === 'SNAPSHOT') this.snapshot = event.snapshot;
            this.emit(event);
          }
          this.patchStatus({ connection: 'connected', lastEventAt: message.at });
          break;

        case 'DEBUG_EXPORT':
          ingestDebug(message.entries);
          debugLog('note', `imported ${message.entries.length} debug entries from the extension`);
          break;

        case 'BRIDGE_ERROR':
          debugLog('error', `bridge: ${message.message}`);
          this.patchStatus({
            connection: 'disconnected',
            errors: [message.message],
          });
          break;

        default:
          break;
      }
    });

    this.bridge.start();
    this.bridge.requestState();

    this.staleTimer = setInterval(() => this.checkStale(), 3000);
  }

  override disconnect(): void {
    this.detach?.();
    this.detach = null;
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    super.disconnect();
  }

  async resync(): Promise<DraftSnapshot | null> {
    this.bridge.requestResync();
    return this.snapshot;
  }

  /** True once the extension has answered at least once. */
  isBridgeConnected(): boolean {
    return this.bridge.isConnected();
  }

  setDebugCapture(enabled: boolean): void {
    this.bridge.setDebug(enabled);
  }

  requestDebugExport(): void {
    this.bridge.exportDebug();
  }

  /**
   * A full state sync: everything the extension knows. Emitted as one
   * SNAPSHOT, which the state machine restores from silently the first time
   * and reconciles against afterwards.
   */
  private onStateSync(state: BridgeState): void {
    const snapshot: DraftSnapshot = {
      phase: state.phase,
      leagueId: state.leagueId ?? LEAGUE.espnLeagueId,
      round: state.snapshot?.round ?? null,
      pickInRound: state.snapshot?.pickInRound ?? null,
      overallPick: state.snapshot?.overallPick ?? null,
      onTheClock: state.snapshot?.onTheClock ?? null,
      onDeck: state.snapshot?.onDeck ?? null,
      clockMs: state.snapshot?.clockMs ?? null,
      clockRunning: state.snapshot?.clockRunning ?? null,
      picks: state.picks,
      capturedAt: state.updatedAt,
    };
    this.snapshot = snapshot;
    this.lastEventAt = state.lastEspnEventAt ?? this.lastEventAt;

    this.patchStatus({
      connection: state.espnTabDetected ? 'connected' : 'connecting',
      provider: 'espn',
      extensionVersion: state.extensionVersion,
      espnTabDetected: state.espnTabDetected,
      observerActive: state.observerActive,
      parserConfidence: state.meta?.confidence ?? null,
      strategies: state.meta?.strategies ?? {},
      espnSnapshot: snapshot,
      lastReconcileAt: state.updatedAt,
    });

    this.emit({ type: 'SNAPSHOT', at: Date.now(), snapshot });
  }

  private checkStale(): void {
    // A dropped bridge is disconnected even though we still hold its last
    // state: showing "synced" while nothing is listening is the one lie the
    // status pill must never tell.
    if (!this.bridge.isConnected()) {
      this.patchStatus({ connection: 'disconnected' });
      return;
    }
    const state = this.bridge.getState();
    if (!state) {
      this.patchStatus({ connection: 'disconnected', espnTabDetected: false });
      return;
    }
    if (!state.espnTabDetected) {
      this.patchStatus({ connection: 'connecting', espnTabDetected: false });
      return;
    }
    const silentFor = this.lastEventAt === null ? Infinity : Date.now() - this.lastEventAt;
    const live = state.phase === 'in_progress';
    this.patchStatus({
      connection: live && silentFor > STALE_AFTER_MS ? 'stale' : 'connected',
      espnTabDetected: true,
    });
  }
}
