/**
 * Wire protocol shared by the Chrome extension and the presentation app.
 *
 * Domain types are imported from the app rather than duplicated so the two
 * halves can never drift apart. Types erase at build time; the only runtime
 * values crossing over are the constants below.
 *
 *   ESPN content script  --ESPN_SNAPSHOT-->  background (authoritative mirror,
 *   dedupe, persistence)  --EVENTS/STATE_SYNC-->  bridge content script
 *   --window.postMessage-->  presentation app
 */
import type { DraftPick, DraftSnapshot, DraftPhase } from '../src/types/draft';
import type { ProviderEvent } from '../src/types/events';

export const PROTOCOL_VERSION = 1;

/** window.postMessage channel between the bridge content script and the page. */
export const PAGE_CHANNEL = 'jorkan-draft-bridge';

/**
 * The port the presentation is served on.
 *
 * This is a security boundary, not just a convenience. Chrome match patterns
 * cannot express a port, so the bridge content script is injected into every
 * page served from loopback; the port is what distinguishes the presentation
 * from any other local server. Vite pins it with strictPort so it can never
 * silently move. Change it here and the server, the bridge and the
 * background's origin checks all follow.
 */
export const PRESENTATION_PORT = '5173';

/** Origins the background will accept a presentation port from. */
export const PRESENTATION_ORIGINS = [
  `http://localhost:${PRESENTATION_PORT}`,
  `http://127.0.0.1:${PRESENTATION_PORT}`,
];

/** The ESPN origin the observer content script is allowed to report from. */
export const ESPN_ORIGIN = 'https://fantasy.espn.com';

/** Marker the presentation page sets so the bridge knows it is on the right page. */
export const PAGE_READY_ATTRIBUTE = 'data-jorkan-presentation';

export interface ParseMeta {
  parserVersion: string;
  /** field name -> strategy id that produced it, e.g. { round: 'embedded-json' }. */
  strategies: Record<string, string>;
  /** 0..1; how much of the expected state we managed to read this pass. */
  confidence: number;
  warnings: string[];
  /** Milliseconds the parse took, watched so we never bog down the ESPN tab. */
  durationMs: number;
  /**
   * What ESPN's own draft feed answered, which is where the board comes from.
   *
   * Carried all the way to the popup on purpose: "the board is empty" has
   * several very different causes - the feed never answered, it answered with
   * nothing, or it named players we could not put a name to - and telling
   * them apart from a screenshot is the difference between a diagnosis and a
   * guess.
   */
  feed?: {
    /** Picks the feed returned and we could use. */
    picks: number;
    /** Picks the feed returned that we refused to show for lack of a name. */
    unnamed: number;
    /** Slots the feed listed with no player in them (ESPN's playerId -1). */
    placeholders: number;
    /** Why the last read failed, in words, or null when it worked. */
    error: string | null;
  };
}

export interface DebugEntry {
  at: number;
  kind: 'parse' | 'mutation' | 'event' | 'error' | 'note' | 'dom-sample';
  message: string;
  /** Sanitised payload. Never contains cookies, tokens or credentials. */
  data?: unknown;
}

/* ---------------------------------------------------------------- *
 * ESPN content script  ->  background
 * ---------------------------------------------------------------- */
export type EspnToBackground =
  | { kind: 'ESPN_HELLO'; at: number; url: string; leagueId: string | null; parserVersion: string }
  | { kind: 'ESPN_SNAPSHOT'; at: number; snapshot: DraftSnapshot; meta: ParseMeta }
  | { kind: 'ESPN_OBSERVER_STATUS'; at: number; observerActive: boolean; note?: string }
  | { kind: 'ESPN_DEBUG'; at: number; entries: DebugEntry[] }
  | { kind: 'ESPN_ERROR'; at: number; message: string };

/* ---------------------------------------------------------------- *
 * background  ->  ESPN content script
 * ---------------------------------------------------------------- */
export type BackgroundToEspn =
  | { kind: 'SET_DEBUG_MODE'; enabled: boolean }
  | { kind: 'FORCE_RESYNC' }
  | { kind: 'PING' };

/* ---------------------------------------------------------------- *
 * presentation page  ->  background (through the bridge content script)
 * ---------------------------------------------------------------- */
export type PageToBackground =
  | { kind: 'PAGE_HELLO'; at: number; protocolVersion: number }
  | { kind: 'PAGE_REQUEST_STATE'; at: number }
  | { kind: 'PAGE_REQUEST_RESYNC'; at: number }
  | { kind: 'PAGE_SET_DEBUG'; at: number; enabled: boolean }
  | { kind: 'PAGE_EXPORT_DEBUG'; at: number };

/* ---------------------------------------------------------------- *
 * background  ->  presentation page
 * ---------------------------------------------------------------- */

/** Everything the presentation needs to rebuild itself from scratch. */
export interface BridgeState {
  protocolVersion: number;
  extensionVersion: string;
  espnTabDetected: boolean;
  observerActive: boolean;
  debugMode: boolean;
  phase: DraftPhase;
  leagueId: string | null;
  /** All picks the extension has confirmed, ascending by overall pick. */
  picks: DraftPick[];
  /** Most recent ESPN read. */
  snapshot: DraftSnapshot | null;
  meta: ParseMeta | null;
  lastEspnEventAt: number | null;
  updatedAt: number;
}

export type BackgroundToPage =
  | { kind: 'STATE_SYNC'; at: number; state: BridgeState }
  | { kind: 'EVENTS'; at: number; events: ProviderEvent[] }
  | { kind: 'DEBUG_EXPORT'; at: number; entries: DebugEntry[]; state: BridgeState }
  | { kind: 'BRIDGE_ERROR'; at: number; message: string };

/** Envelope used for window.postMessage between bridge content script and page. */
export interface PageEnvelope<T> {
  channel: typeof PAGE_CHANNEL;
  direction: 'to-page' | 'to-extension';
  protocolVersion: number;
  payload: T;
}

export function isPageEnvelope(value: unknown): value is PageEnvelope<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as PageEnvelope<unknown>).channel === PAGE_CHANNEL &&
    typeof (value as PageEnvelope<unknown>).direction === 'string'
  );
}

export type { DraftPick, DraftSnapshot, DraftPhase, ProviderEvent };
