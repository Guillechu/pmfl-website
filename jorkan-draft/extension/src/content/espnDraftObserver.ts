import type { BackgroundToEspn, DebugEntry, EspnToBackground } from '@shared/protocol';
import type { DraftSnapshot } from '@/types/draft';
import { PARSER_VERSION, parseDraftRoom } from './espnParser';
import { collectRegions, pageSummary } from './debugCollector';
import type { ProbeSnapshot } from './probeTypes';

/**
 * ESPN draft room observer.
 *
 * READ ONLY. This script watches the draft room and reports what it sees. It
 * never clicks, never submits, never writes to the page and never changes
 * ESPN's state in any way - the managers draft on ESPN exactly as they always
 * have, and we mirror it.
 *
 * Two mechanisms run side by side, because either one alone can miss:
 *
 *   - a MutationObserver, so a pick appears on the TV within a frame or two
 *   - a slow reconcile pass, so a missed mutation is caught within seconds
 */

const PROBE_CHANNEL = 'jorkan-espn-probe';
const RECONCILE_MS = 1500;
const MUTATION_DEBOUNCE_MS = 180;
/** Never parse more often than this, however noisy ESPN's React tree gets. */
const MIN_PARSE_GAP_MS = 250;

let port: chrome.runtime.Port | null = null;
let observer: MutationObserver | null = null;
let reconcileTimer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastParseAt = 0;
let lastSignature = '';
let probe: ProbeSnapshot | null = null;
let previous: DraftSnapshot | null = null;
let debugMode = false;
let debugQueue: DebugEntry[] = [];
let reconnectDelay = 500;

/* ------------------------------ plumbing ------------------------------ */

function leagueIdFromUrl(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get('leagueId') ?? params.get('leagueid');
}

function send(message: EspnToBackground): void {
  try {
    port?.postMessage(message);
  } catch {
    // The service worker recycled; the port's onDisconnect will reconnect us.
    port = null;
  }
}

function connect(): void {
  try {
    port = chrome.runtime.connect({ name: 'espn' });
  } catch {
    scheduleReconnect();
    return;
  }
  reconnectDelay = 500;

  port.onDisconnect.addListener(() => {
    port = null;
    scheduleReconnect();
  });

  port.onMessage.addListener((message: BackgroundToEspn) => {
    switch (message.kind) {
      case 'SET_DEBUG_MODE':
        debugMode = message.enabled;
        if (debugMode) captureDebugRegions();
        break;
      case 'FORCE_RESYNC':
        window.postMessage({ channel: PROBE_CHANNEL, request: 'scan' }, location.origin);
        parseNow('forced-resync');
        break;
      default:
        break;
    }
  });

  send({
    kind: 'ESPN_HELLO',
    at: Date.now(),
    url: location.href,
    leagueId: leagueIdFromUrl(),
    parserVersion: PARSER_VERSION,
  });
  send({ kind: 'ESPN_OBSERVER_STATUS', at: Date.now(), observerActive: observer !== null });
  parseNow('connect');
}

function scheduleReconnect(): void {
  setTimeout(() => {
    if (!port) connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 8000);
}

/* ------------------------------- parsing ------------------------------ */

function parseNow(reason: string): void {
  const now = Date.now();
  if (now - lastParseAt < MIN_PARSE_GAP_MS && reason === 'mutation') return;
  lastParseAt = now;

  let result;
  try {
    result = parseDraftRoom({
      leagueId: leagueIdFromUrl(),
      probe,
      previous,
    });
  } catch (error) {
    send({
      kind: 'ESPN_ERROR',
      at: now,
      message: `parse failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }

  previous = result.snapshot;

  // Only talk when something actually changed; ESPN re-renders constantly.
  const signature = signatureOf(result.snapshot);
  const isReconcile = reason === 'reconcile' || reason === 'forced-resync' || reason === 'connect';
  if (signature === lastSignature && !isReconcile) return;
  lastSignature = signature;

  send({ kind: 'ESPN_SNAPSHOT', at: now, snapshot: result.snapshot, meta: result.meta });

  if (debugMode) {
    debugQueue.push({
      at: now,
      kind: 'parse',
      message: `parse (${reason})`,
      data: {
        page: pageSummary(),
        strategies: result.meta.strategies,
        confidence: result.meta.confidence,
        durationMs: result.meta.durationMs,
        warnings: result.meta.warnings,
        probeSource: probe?.source ?? 'none',
        probePaths: probe?.candidatePaths ?? [],
        snapshot: {
          phase: result.snapshot.phase,
          round: result.snapshot.round,
          pickInRound: result.snapshot.pickInRound,
          overallPick: result.snapshot.overallPick,
          clockMs: result.snapshot.clockMs,
          onTheClock: result.snapshot.onTheClock?.fantasyTeamName ?? null,
          pickCount: result.snapshot.picks.length,
          lastPick: result.snapshot.picks[result.snapshot.picks.length - 1] ?? null,
        },
      },
    });
    flushDebug();
  }
}

function signatureOf(snapshot: DraftSnapshot): string {
  return [
    snapshot.phase,
    snapshot.round,
    snapshot.pickInRound,
    snapshot.overallPick,
    snapshot.onTheClock?.fantasyTeamId ?? '',
    // Round the clock to a second: the digits change constantly and that is
    // not, by itself, news worth a message.
    snapshot.clockMs === null ? '' : Math.round(snapshot.clockMs / 1000),
    snapshot.picks.length,
    snapshot.picks[snapshot.picks.length - 1]?.eventId ?? '',
  ].join('|');
}

function captureDebugRegions(): void {
  try {
    debugQueue.push(...collectRegions());
    flushDebug();
  } catch (error) {
    send({ kind: 'ESPN_ERROR', at: Date.now(), message: `debug capture failed: ${String(error)}` });
  }
}

function flushDebug(): void {
  if (debugQueue.length === 0) return;
  const entries = debugQueue.slice(-40);
  debugQueue = [];
  send({ kind: 'ESPN_DEBUG', at: Date.now(), entries });
}

/* ------------------------------ observers ----------------------------- */

function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      parseNow('mutation');
    }, MUTATION_DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    // Attributes churn on every hover; text and structure are what matter.
    attributes: false,
  });
  send({ kind: 'ESPN_OBSERVER_STATUS', at: Date.now(), observerActive: true });
}

function startReconcile(): void {
  if (reconcileTimer) return;
  reconcileTimer = setInterval(() => parseNow('reconcile'), RECONCILE_MS);
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data as { channel?: string; snapshot?: ProbeSnapshot } | null;
  if (data?.channel !== PROBE_CHANNEL || !data.snapshot) return;
  probe = data.snapshot;
});

// A draft room is a single-page app: the URL can change under us.
let lastUrl = location.href;
setInterval(() => {
  if (location.href === lastUrl) return;
  lastUrl = location.href;
  lastSignature = '';
  send({ kind: 'ESPN_HELLO', at: Date.now(), url: location.href, leagueId: leagueIdFromUrl(), parserVersion: PARSER_VERSION });
  parseNow('navigation');
}, 1000);

window.addEventListener('pagehide', () => {
  observer?.disconnect();
  observer = null;
  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = null;
});

startObserver();
startReconcile();
connect();
