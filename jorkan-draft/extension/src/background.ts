import type {
  BackgroundToPage,
  BridgeState,
  DebugEntry,
  EspnToBackground,
  PageToBackground,
  ParseMeta,
} from '@shared/protocol';
import { ESPN_ORIGIN, PRESENTATION_ORIGINS, PROTOCOL_VERSION } from '@shared/protocol';
import type { DraftSnapshot } from '@/types/draft';
import { applySnapshot as foldSnapshot, emptyMirror, type Mirror } from './mirror';

/**
 * Background service worker.
 *
 * The single authority on what the extension believes about the draft:
 *
 *   - it holds the mirror of ESPN's state and every confirmed pick
 *   - it decides what is new, so a pick is emitted exactly once no matter how
 *     many times ESPN re-renders it or how many frames report it
 *   - it persists that mirror, so a service-worker restart, an extension
 *     reload or a refreshed presentation tab restores instead of replaying
 *
 * Content scripts talk to it over long-lived ports, which also keeps the
 * worker alive for as long as the draft room is open.
 */

const STORAGE_KEY = 'jorkan.mirror.v1';
/** Picks sent with each incremental snapshot; the full list goes on connect. */
const SNAPSHOT_TAIL = 40;
/** A stored mirror older than this is from a different draft night. */
const MIRROR_TTL_MS = 12 * 60 * 60 * 1000;
/*
 * Two budgets, not one.
 *
 * A single 600-entry ring buffer lost the DOM captures from a real draft
 * room: the parse log filled it and evicted exactly the entries the capture
 * existed to collect. Structure is scarce and precious; parse lines are
 * plentiful and repetitive.
 */
const MAX_DEBUG_SAMPLES = 400;
const MAX_DEBUG_PARSES = 300;

let mirror: Mirror = emptyMirror();
let seen = new Set<string>();
let lastMeta: ParseMeta | null = null;
let lastSnapshot: DraftSnapshot | null = null;
let observerActive = false;
let espnPorts = new Set<chrome.runtime.Port>();
let pagePorts = new Set<chrome.runtime.Port>();
let debugMode = false;
let debugSamples: DebugEntry[] = [];
let debugParses: DebugEntry[] = [];

/** Newest-last, both budgets merged, for export. */
function allDebugEntries(): DebugEntry[] {
  return [...debugSamples, ...debugParses].sort((a, b) => a.at - b.at);
}
let restored = false;

const extensionVersion = chrome.runtime.getManifest().version;

/* ----------------------------- persistence ---------------------------- */

async function restore(): Promise<void> {
  if (restored) return;
  restored = true;
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY] as Mirror | undefined;
    if (!value || Date.now() - value.updatedAt > MIRROR_TTL_MS) return;
    mirror = { ...emptyMirror(), ...value };
    seen = new Set(mirror.seen);
  } catch {
    // A failed restore just means we rebuild from ESPN on the next snapshot.
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    mirror.seen = [...seen].slice(-400);
    mirror.updatedAt = Date.now();
    void chrome.storage.local.set({ [STORAGE_KEY]: mirror }).catch(() => undefined);
  }, 1000);
}

/* ------------------------------- state -------------------------------- */

function bridgeState(includeAllPicks = true): BridgeState {
  return {
    protocolVersion: PROTOCOL_VERSION,
    extensionVersion,
    espnTabDetected: espnPorts.size > 0,
    observerActive,
    debugMode,
    phase: mirror.phase,
    leagueId: mirror.leagueId,
    picks: includeAllPicks ? mirror.picks : mirror.picks.slice(-SNAPSHOT_TAIL),
    snapshot: lastSnapshot,
    meta: lastMeta,
    lastEspnEventAt: mirror.updatedAt || null,
    updatedAt: Date.now(),
  };
}

function broadcast(message: BackgroundToPage): void {
  for (const port of [...pagePorts]) {
    try {
      port.postMessage(message);
    } catch {
      pagePorts.delete(port);
    }
  }
}

/* -------------------------- snapshot handling ------------------------- */

function applySnapshot(snapshot: DraftSnapshot, meta: ParseMeta): void {
  const result = foldSnapshot(mirror, seen, snapshot, meta, {
    snapshotTail: SNAPSHOT_TAIL,
    bestConfidence: lastMeta?.confidence ?? null,
    now: Date.now(),
  });
  if (!result.accepted) return;

  lastSnapshot = snapshot;
  lastMeta = meta;
  persist();
  /*
   * A block of history rather than live play: send the whole mirror, which
   * the presentation restores from silently, instead of a hundred pick
   * events it would try to announce one after another.
   */
  if (result.backfilled) {
    broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
  }
  broadcast({ kind: 'EVENTS', at: Date.now(), events: result.events });
}

/* ------------------------------- senders ------------------------------ */

/**
 * Who is allowed to talk to this worker.
 *
 * Chrome's default, when a manifest does not declare externally_connectable,
 * is that *any other installed extension* may connect - only web pages are
 * blocked. Since this worker will hand back a mirror of an authenticated ESPN
 * draft room, every message and every port is checked against our own
 * extension id, and then against the origin appropriate to the role the
 * caller claims. The port name is chosen by the caller and proves nothing.
 */
function isOwnSender(sender: chrome.runtime.MessageSender | undefined): boolean {
  return sender?.id === chrome.runtime.id;
}

function senderOrigin(sender: chrome.runtime.MessageSender | undefined): string | null {
  const url = sender?.url;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function mayUsePort(port: chrome.runtime.Port): boolean {
  if (!isOwnSender(port.sender)) return false;
  const origin = senderOrigin(port.sender);
  if (!origin) return false;
  if (port.name === 'espn') return origin === ESPN_ORIGIN;
  if (port.name === 'page') return PRESENTATION_ORIGINS.includes(origin);
  return false;
}

/* -------------------------------- ports ------------------------------- */

chrome.runtime.onConnect.addListener((port) => {
  if (!mayUsePort(port)) {
    port.disconnect();
    return;
  }
  void restore().then(() => {
    if (port.name === 'espn') attachEspnPort(port);
    else if (port.name === 'page') attachPagePort(port);
  });
});

function attachEspnPort(port: chrome.runtime.Port): void {
  espnPorts.add(port);
  port.onDisconnect.addListener(() => {
    espnPorts.delete(port);
    if (espnPorts.size === 0) observerActive = false;
    broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(false) });
  });

  port.onMessage.addListener((message: EspnToBackground) => {
    switch (message.kind) {
      case 'ESPN_HELLO':
        if (message.leagueId) mirror.leagueId = message.leagueId;
        if (debugMode) port.postMessage({ kind: 'SET_DEBUG_MODE', enabled: true });
        broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(false) });
        break;

      case 'ESPN_SNAPSHOT':
        applySnapshot(message.snapshot, message.meta);
        break;

      case 'ESPN_OBSERVER_STATUS':
        observerActive = message.observerActive;
        broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(false) });
        break;

      case 'ESPN_DEBUG':
        for (const entry of message.entries) {
          if (entry.kind === 'dom-sample') debugSamples.push(entry);
          else debugParses.push(entry);
        }
        if (debugSamples.length > MAX_DEBUG_SAMPLES) {
          debugSamples = debugSamples.slice(-MAX_DEBUG_SAMPLES);
        }
        if (debugParses.length > MAX_DEBUG_PARSES) {
          debugParses = debugParses.slice(-MAX_DEBUG_PARSES);
        }
        break;

      case 'ESPN_ERROR':
        debugParses.push({ at: message.at, kind: 'error', message: message.message });
        broadcast({ kind: 'BRIDGE_ERROR', at: message.at, message: message.message });
        break;

      default:
        break;
    }
  });

  broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(false) });
}

function attachPagePort(port: chrome.runtime.Port): void {
  pagePorts.add(port);
  port.onDisconnect.addListener(() => pagePorts.delete(port));

  port.onMessage.addListener((message: PageToBackground) => {
    switch (message.kind) {
      case 'PAGE_HELLO':
      case 'PAGE_REQUEST_STATE':
        // A fresh or refreshed presentation gets the whole picture at once.
        port.postMessage({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
        break;

      case 'PAGE_REQUEST_RESYNC':
        for (const espn of espnPorts) {
          try {
            espn.postMessage({ kind: 'FORCE_RESYNC' });
          } catch {
            espnPorts.delete(espn);
          }
        }
        port.postMessage({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
        break;

      case 'PAGE_SET_DEBUG':
        debugMode = message.enabled;
        for (const espn of espnPorts) {
          try {
            espn.postMessage({ kind: 'SET_DEBUG_MODE', enabled: debugMode });
          } catch {
            espnPorts.delete(espn);
          }
        }
        port.postMessage({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(false) });
        break;

      case 'PAGE_EXPORT_DEBUG':
        port.postMessage({
          kind: 'DEBUG_EXPORT',
          at: Date.now(),
          entries: allDebugEntries(),
          state: bridgeState(true),
        });
        break;

      default:
        break;
    }
  });

  port.postMessage({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
}

/* ------------------------------- popup -------------------------------- */

chrome.runtime.onMessage.addListener((message: { kind?: string; enabled?: boolean }, sender, respond) => {
  // Only our own popup. Another extension asking to turn on debug capture and
  // hand back what it collected is exactly the request to refuse.
  if (!isOwnSender(sender) || senderOrigin(sender) !== `chrome-extension://${chrome.runtime.id}`) {
    return false;
  }
  void restore().then(() => {
    if (message?.kind === 'POPUP_STATE') {
      respond({
        state: bridgeState(false),
        pickCount: mirror.picks.length,
        espnFrames: espnPorts.size,
        presentationTabs: pagePorts.size,
        debugEntries: debugSamples.length + debugParses.length,
      });
      return;
    }
    if (message?.kind === 'POPUP_SET_DEBUG') {
      debugMode = Boolean(message.enabled);
      for (const espn of espnPorts) {
        try {
          espn.postMessage({ kind: 'SET_DEBUG_MODE', enabled: debugMode });
        } catch {
          espnPorts.delete(espn);
        }
      }
      respond({ ok: true, debugMode });
      return;
    }
    if (message?.kind === 'POPUP_RESET') {
      mirror = emptyMirror();
      seen = new Set();
      debugSamples = [];
      debugParses = [];
      lastSnapshot = null;
      lastMeta = null;
      void chrome.storage.local.remove(STORAGE_KEY);
      broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
      respond({ ok: true });
      return;
    }
    if (message?.kind === 'POPUP_EXPORT') {
      respond({ entries: allDebugEntries(), state: bridgeState(true) });
      return;
    }
    respond({ ok: false });
  });
  return true;
});

void restore();
