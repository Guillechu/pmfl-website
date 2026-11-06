import type { DraftSnapshot } from './draft';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'stale';
export type ProviderKind = 'none' | 'espn' | 'simulator';

/** One field the presentation and ESPN disagree about. */
export interface DriftEntry {
  field: string;
  espn: string | number | null;
  presentation: string | number | null;
}

export interface SyncStatus {
  connection: ConnectionState;
  provider: ProviderKind;
  /** Version reported by the Chrome extension, when connected. */
  extensionVersion: string | null;
  /** True when the extension can see an ESPN draft room tab. */
  espnTabDetected: boolean;
  /** True when the content script's MutationObserver is attached. */
  observerActive: boolean;
  lastEventAt: number | null;
  lastReconcileAt: number | null;
  /** Non-empty when reconciliation found ESPN and the presentation disagreeing. */
  drift: readonly DriftEntry[];
  /** Most recent authoritative view of ESPN, for the debug panel. */
  espnSnapshot: DraftSnapshot | null;
  /** Parser confidence 0..1 reported by the content script. */
  parserConfidence: number | null;
  /** Which parse strategy produced each field, for the debug panel. */
  strategies: Record<string, string>;
  errors: readonly string[];
}

export const EMPTY_SYNC_STATUS: SyncStatus = {
  connection: 'disconnected',
  provider: 'none',
  extensionVersion: null,
  espnTabDetected: false,
  observerActive: false,
  lastEventAt: null,
  lastReconcileAt: null,
  drift: [],
  espnSnapshot: null,
  parserConfidence: null,
  strategies: {},
  errors: [],
};
