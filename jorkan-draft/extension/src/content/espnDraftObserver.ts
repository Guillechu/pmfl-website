import type { BackgroundToEspn, DebugEntry, EspnToBackground } from '@shared/protocol';
import type { DraftSnapshot } from '@/types/draft';
import { LEAGUE } from '@/config/league';
import { PARSER_VERSION, parseDraftRoom } from './espnParser';
import { collectDiagnostics, pageSummary } from './debugCollector';
import { EspnDraftApi, type ApiDraftState } from './espnDraftApi';
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
/** How often ESPN's own draft feed is asked what has been picked. */
const API_POLL_MS = 2500;
/** After repeated failures, back off rather than hammering ESPN. */
const API_BACKOFF_MS = 30_000;
const API_FAILURES_BEFORE_BACKOFF = 4;
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
let lastDebugCaptureAt = 0;
let lastCapturedPhase = '';
let api: EspnDraftApi | null = null;
let apiKey = '';
let apiState: ApiDraftState | null = null;
let apiInFlight = false;
let apiFailures = 0;
let apiTimer: ReturnType<typeof setTimeout> | null = null;
/** How often the page is re-photographed while debug capture is on. */
const DEBUG_CAPTURE_INTERVAL_MS = 20_000;

/* ------------------------------ plumbing ------------------------------ */

/**
 * Is this page actually a draft room?
 *
 * A real capture showed the mock draft *lobby* reporting alongside the draft
 * room, and the lobby's "draft starts in 9:55" countdown was being read as
 * the pick clock. A tab that is not a draft room must stay silent rather than
 * feed the presentation a number from somewhere else entirely.
 */
function looksLikeDraftRoom(): boolean {
  const url = location.href.toLowerCase();
  if (url.includes('lobby')) return false;
  return true;
}

function leagueIdFromUrl(): string | null {
  const params = new URLSearchParams(location.search);
  return params.get('leagueId') ?? params.get('leagueid');
}

function seasonFromUrl(): number {
  const params = new URLSearchParams(location.search);
  const value = Number(params.get('seasonId') ?? params.get('seasonid'));
  return Number.isFinite(value) && value > 2000 && value < 2100 ? value : LEAGUE.season;
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
        apiFailures = 0;
        void pollApi();
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
  if (!looksLikeDraftRoom()) return;
  const now = Date.now();
  if (now - lastParseAt < MIN_PARSE_GAP_MS && reason === 'mutation') return;
  lastParseAt = now;

  let result;
  try {
    result = parseDraftRoom({
      leagueId: leagueIdFromUrl(),
      probe,
      previous,
      apiPicks: apiState?.picks ?? [],
      apiOrder: apiState?.order ?? [],
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
  result.meta.feed = {
    picks: apiState?.picks.length ?? 0,
    unnamed: apiState?.unnamed.length ?? 0,
    placeholders: apiState?.placeholders ?? 0,
    error: api?.error ?? null,
  };
  for (const warning of apiState?.warnings ?? []) {
    if (!result.meta.warnings.includes(warning)) result.meta.warnings.push(warning);
  }
  if (api?.error) {
    const message = `ESPN draft feed unreachable: ${api.error}`;
    if (!result.meta.warnings.includes(message)) result.meta.warnings.push(message);
  }

  // A lone timer is not a draft room. Any page can have a countdown on it, and
  // publishing one as the pick clock is worse than publishing nothing.
  const read = Object.keys(result.meta.strategies);
  if (read.length === 0 || (read.length === 1 && read[0] === 'clock')) return;

  // Only talk when something actually changed; ESPN re-renders constantly.
  const signature = signatureOf(result.snapshot);
  const isReconcile = reason === 'reconcile' || reason === 'forced-resync' || reason === 'connect';
  if (signature === lastSignature && !isReconcile) return;
  lastSignature = signature;

  send({ kind: 'ESPN_SNAPSHOT', at: now, snapshot: result.snapshot, meta: result.meta });

  if (debugMode) {
    // Re-photograph the page when it changes character or every so often: the
    // draft room mid-draft looks nothing like the one before it starts, and a
    // single capture at the moment debug was switched on misses the part we
    // most need to see.
    const phase = result.snapshot.phase;
    if (phase !== lastCapturedPhase || now - lastDebugCaptureAt > DEBUG_CAPTURE_INTERVAL_MS) {
      lastCapturedPhase = phase;
      lastDebugCaptureAt = now;
      captureDebugRegions();
    }
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
        api: {
          picks: apiState?.picks.length ?? 0,
          unnamed: apiState?.unnamed.slice(0, 10) ?? [],
          drafted: apiState?.drafted ?? null,
          inProgress: apiState?.inProgress ?? null,
          error: api?.error ?? null,
        },
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
    debugQueue.push(...collectDiagnostics());
    flushDebug();
  } catch (error) {
    send({ kind: 'ESPN_ERROR', at: Date.now(), message: `debug capture failed: ${String(error)}` });
  }
}

function flushDebug(): void {
  if (debugQueue.length === 0) return;
  // Send in chunks rather than dropping: a diagnostics capture is ~60 entries
  // and every one of them is a clue.
  const pending = debugQueue;
  debugQueue = [];
  for (let i = 0; i < pending.length; i += 40) {
    send({ kind: 'ESPN_DEBUG', at: Date.now(), entries: pending.slice(i, i + 40) });
  }
}

/* --------------------------- ESPN draft feed --------------------------- */

/**
 * Ask ESPN what has actually been drafted.
 *
 * The completed board is not in the draft room's DOM - the strip along the
 * top is the picks still to come - so this is where the picks come from. It
 * is a read: see espnDraftApi.ts for the rules it keeps. A failure here is
 * never fatal; the DOM parser carries on reading the clock, the round and who
 * is on the clock exactly as before.
 */
function ensureApi(): void {
  const leagueId = leagueIdFromUrl();
  if (!leagueId) return;
  const season = seasonFromUrl();
  const key = `${leagueId}:${season}`;
  if (api && apiKey === key) return;
  api = new EspnDraftApi(leagueId, season);
  apiKey = key;
  apiState = null;
  apiFailures = 0;
}

async function pollApi(): Promise<void> {
  if (apiInFlight || !looksLikeDraftRoom()) return;
  ensureApi();
  if (!api) return;
  apiInFlight = true;
  try {
    const next = await api.read();
    if (!next) {
      apiFailures += 1;
      return;
    }
    const grew = next.picks.length !== (apiState?.picks.length ?? 0);
    apiFailures = 0;
    apiState = next;
    // A new pick is news; say so immediately rather than waiting for the next
    // reconcile tick.
    if (grew) parseNow('espn-api');
  } catch {
    apiFailures += 1;
  } finally {
    apiInFlight = false;
  }
}

function scheduleApiPoll(): void {
  if (apiTimer) return;
  const delay = apiFailures >= API_FAILURES_BEFORE_BACKOFF ? API_BACKOFF_MS : API_POLL_MS;
  apiTimer = setTimeout(() => {
    apiTimer = null;
    void pollApi().finally(scheduleApiPoll);
  }, delay);
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
  if (apiTimer) clearTimeout(apiTimer);
  apiTimer = null;
});

startObserver();
startReconcile();
scheduleApiPoll();
connect();
