import type { ProbeDraftPick, ProbeDraftState, ProbeSnapshot } from './probeTypes';

/**
 * MAIN-world probe.
 *
 * Runs in the page's own JavaScript context (declared with "world": "MAIN" in
 * the manifest) purely so it can *read* state ESPN has already put on the
 * page. A React app usually keeps the draft in a store somewhere on window,
 * and reading that is far more reliable than scraping rendered markup.
 *
 * It is strictly read-only: it never calls an ESPN function, never writes to
 * a store, never touches the DOM, and never reads cookies, storage or
 * credentials. If it finds nothing it says so and the DOM parser carries on
 * alone.
 */

const CHANNEL = 'jorkan-espn-probe';
const SCAN_INTERVAL_MS = 2000;
const MAX_NODES = 20000;
const MAX_DEPTH = 7;

/** Window keys worth looking at first. */
const ROOT_KEYS = [
  '__espnfitt__',
  '__NEXT_DATA__',
  '__PRELOADED_STATE__',
  '__REDUX_STATE__',
  '__INITIAL_STATE__',
  'espn',
  'ESPN',
];

const DRAFT_KEY = /^(draftDetail|draft|draftState|draftRoom|liveDraft)$/i;
const PICKS_KEY = /^(picks|draftPicks|selections|completedPicks)$/i;

interface Candidate {
  path: string;
  value: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !(value instanceof Node);
}

/** Breadth-first walk over the page's state looking for draft-shaped objects. */
function findCandidates(): { candidates: Candidate[]; paths: string[] } {
  const candidates: Candidate[] = [];
  const paths: string[] = [];
  const seen = new WeakSet<object>();
  const queue: { path: string; value: unknown; depth: number }[] = [];

  for (const key of ROOT_KEYS) {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value !== undefined) queue.push({ path: `window.${key}`, value, depth: 0 });
  }
  // Anything else on window whose name mentions the draft.
  for (const key of Object.keys(window)) {
    if (!/draft|fitt|espn/i.test(key)) continue;
    if (ROOT_KEYS.includes(key)) continue;
    try {
      const value = (window as unknown as Record<string, unknown>)[key];
      if (isPlainObject(value)) queue.push({ path: `window.${key}`, value, depth: 0 });
    } catch {
      // Some window properties throw on access; skip them.
    }
  }

  let visited = 0;
  while (queue.length > 0 && visited < MAX_NODES) {
    const entry = queue.shift();
    if (!entry) break;
    const { path, value, depth } = entry;
    if (!isPlainObject(value) || depth > MAX_DEPTH) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    visited += 1;

    for (const key of Object.keys(value)) {
      let child: unknown;
      try {
        child = value[key];
      } catch {
        continue;
      }
      const childPath = `${path}.${key}`;

      if (DRAFT_KEY.test(key) && isPlainObject(child)) {
        candidates.push({ path: childPath, value: child });
        paths.push(childPath);
      } else if (PICKS_KEY.test(key) && Array.isArray(child) && child.length > 0) {
        candidates.push({ path: childPath, value: { picks: child } });
        paths.push(childPath);
      }

      if (isPlainObject(child) || Array.isArray(child)) {
        queue.push({ path: childPath, value: child, depth: depth + 1 });
      }
    }
  }

  return { candidates, paths: paths.slice(0, 40) };
}

const NUMBER_KEYS: Record<keyof ProbeDraftState, string[]> = {
  status: ['status', 'draftStatus', 'state'],
  round: ['round', 'roundId', 'currentRound', 'roundNumber'],
  pickInRound: ['pickInRound', 'roundPickNumber', 'pickNumber', 'currentPickInRound'],
  overallPick: ['overallPick', 'overallPickNumber', 'currentPick', 'pickOverall'],
  onTheClockTeam: ['onTheClockTeam', 'currentTeam', 'teamOnClock'],
  onDeckTeam: ['onDeckTeam', 'nextTeam'],
  timeRemainingMs: ['timeRemaining', 'timeRemainingMs', 'msRemaining', 'clock'],
  clockRunning: ['clockRunning', 'isRunning', 'inProgress'],
  picks: ['picks', 'draftPicks', 'selections'],
};

function readState(candidate: Candidate): ProbeDraftState | null {
  const source = candidate.value;
  const out: ProbeDraftState = {};
  let found = 0;

  const pull = (keys: string[]): unknown => {
    for (const key of keys) {
      const direct = source[key];
      if (direct !== undefined && direct !== null) return direct;
      // One level down: ESPN nests the live bits under objects like "clock".
      for (const nestedKey of Object.keys(source)) {
        const nested = source[nestedKey];
        if (isPlainObject(nested) && nested[key] !== undefined && nested[key] !== null) {
          return nested[key];
        }
      }
    }
    return undefined;
  };

  const status = pull(NUMBER_KEYS.status);
  if (typeof status === 'string') {
    out.status = status;
    found += 1;
  }
  for (const field of ['round', 'pickInRound', 'overallPick'] as const) {
    const value = pull(NUMBER_KEYS[field]);
    if (typeof value === 'number' || typeof value === 'string') {
      out[field] = value;
      found += 1;
    }
  }
  const time = pull(NUMBER_KEYS.timeRemainingMs);
  if (typeof time === 'number' && time >= 0 && time < 60 * 60 * 1000) {
    // ESPN has used both seconds and milliseconds over the years.
    out.timeRemainingMs = time > 3600 ? time : time * 1000;
    found += 1;
  }
  const running = pull(NUMBER_KEYS.clockRunning);
  if (typeof running === 'boolean') out.clockRunning = running;

  for (const field of ['onTheClockTeam', 'onDeckTeam'] as const) {
    const value = pull(NUMBER_KEYS[field]);
    if (typeof value === 'string') {
      out[field] = value;
      found += 1;
    } else if (isPlainObject(value) && typeof value['name'] === 'string') {
      out[field] = value['name'] as string;
      found += 1;
    }
  }

  const picks = pull(NUMBER_KEYS.picks);
  if (Array.isArray(picks) && picks.length > 0) {
    const mapped = picks.map(readPick).filter((pick): pick is ProbeDraftPick => pick !== null);
    if (mapped.length > 0) {
      out.picks = mapped.slice(-60);
      found += 1;
    }
  }

  return found > 0 ? out : null;
}

function readPick(raw: unknown): ProbeDraftPick | null {
  if (!isPlainObject(raw)) return null;
  const pick: ProbeDraftPick = {};
  const copyNumber = (target: keyof ProbeDraftPick, keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'number' || typeof value === 'string') {
        (pick as Record<string, unknown>)[target] = value;
        return;
      }
    }
  };
  const copyString = (target: keyof ProbeDraftPick, keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'string' && value.trim()) {
        (pick as Record<string, unknown>)[target] = value.trim();
        return;
      }
      if (isPlainObject(value) && typeof value['name'] === 'string') {
        (pick as Record<string, unknown>)[target] = value['name'];
        return;
      }
    }
  };

  copyNumber('overallPick', ['overallPickNumber', 'overallPick', 'pickNumber', 'overall']);
  copyNumber('round', ['roundId', 'round', 'roundNumber']);
  copyNumber('pickInRound', ['roundPickNumber', 'pickInRound', 'selectionNumber']);
  copyNumber('playerId', ['playerId', 'id', 'athleteId']);
  copyString('playerName', ['playerName', 'fullName', 'displayName', 'name', 'player']);
  copyString('position', ['position', 'defaultPositionAbbrev', 'positionAbbrev', 'pos']);
  copyString('proTeam', ['proTeamAbbrev', 'proTeam', 'teamAbbrev', 'nflTeam']);
  copyString('teamName', ['teamName', 'fantasyTeamName', 'owner', 'teamLocation']);
  copyNumber('teamId', ['teamId', 'fantasyTeamId']);
  if (typeof raw['autoDraftTypeId'] === 'number' && raw['autoDraftTypeId'] > 0) pick.autoPick = true;
  if (raw['autoPick'] === true) pick.autoPick = true;

  return pick.overallPick !== undefined || pick.playerName !== undefined ? pick : null;
}

function scan(): ProbeSnapshot {
  let best: { state: ProbeDraftState; path: string; score: number } | null = null;
  const { candidates, paths } = findCandidates();

  for (const candidate of candidates) {
    const state = readState(candidate);
    if (!state) continue;
    const score =
      (state.picks?.length ? 3 : 0) +
      (state.overallPick !== undefined ? 2 : 0) +
      (state.status ? 1 : 0) +
      (state.timeRemainingMs !== undefined ? 1 : 0);
    if (!best || score > best.score) best = { state, path: candidate.path, score };
  }

  return {
    capturedAt: Date.now(),
    source: best?.path ?? 'none',
    draft: best?.state ?? null,
    candidatePaths: paths,
  };
}

function publish(): void {
  try {
    const snapshot = scan();
    window.postMessage({ channel: CHANNEL, snapshot }, window.location.origin);
  } catch (error) {
    window.postMessage(
      { channel: CHANNEL, error: String(error instanceof Error ? error.message : error) },
      window.location.origin,
    );
  }
}

publish();
setInterval(publish, SCAN_INTERVAL_MS);

// The isolated-world observer can ask for a fresh read on demand.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data as { channel?: string; request?: string } | null;
  if (data?.channel === CHANNEL && data.request === 'scan') publish();
});
