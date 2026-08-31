import type {
  BackgroundToPage,
  BridgeState,
  DebugEntry,
  EspnToBackground,
  PageToBackground,
  ParseMeta,
} from '@shared/protocol';
import { PROTOCOL_VERSION } from '@shared/protocol';
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
const MAX_DEBUG_ENTRIES = 600;

let mirror: Mirror = emptyMirror();
let seen = new Set<string>();
let lastMeta: ParseMeta | null = null;
let lastSnapshot: DraftSnapshot | null = null;
let observerActive = false;
let espnPorts = new Set<chrome.runtime.Port>();
let pagePorts = new Set<chrome.runtime.Port>();
let debugMode = false;
let debugEntries: DebugEntry[] = [];
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
  broadcast({ kind: 'EVENTS', at: Date.now(), events: result.events });
}

/* -------------------------------- ports ------------------------------- */

chrome.runtime.onConnect.addListener((port) => {
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
        debugEntries.push(...message.entries);
        if (debugEntries.length > MAX_DEBUG_ENTRIES) {
          debugEntries = debugEntries.slice(-MAX_DEBUG_ENTRIES);
        }
        break;

      case 'ESPN_ERROR':
        debugEntries.push({ at: message.at, kind: 'error', message: message.message });
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
          entries: debugEntries,
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

chrome.runtime.onMessage.addListener((message: { kind?: string; enabled?: boolean }, _sender, respond) => {
  void restore().then(() => {
    if (message?.kind === 'POPUP_STATE') {
      respond({
        state: bridgeState(false),
        pickCount: mirror.picks.length,
        espnFrames: espnPorts.size,
        presentationTabs: pagePorts.size,
        debugEntries: debugEntries.length,
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
      debugEntries = [];
      lastSnapshot = null;
      lastMeta = null;
      void chrome.storage.local.remove(STORAGE_KEY);
      broadcast({ kind: 'STATE_SYNC', at: Date.now(), state: bridgeState(true) });
      respond({ ok: true });
      return;
    }
    if (message?.kind === 'POPUP_EXPORT') {
      respond({ entries: debugEntries, state: bridgeState(true) });
      return;
    }
    respond({ ok: false });
  });
  return true;
});

void restore();
