import type { DraftPhase, DraftPick, DraftSnapshot } from '@/types/draft';
import type { ProviderEvent } from '@/types/events';
import type { ParseMeta } from '@shared/protocol';

/**
 * The extension's mirror of the ESPN draft.
 *
 * Pure logic, deliberately free of any Chrome API, so it can be tested
 * directly and so the service worker stays a thin adapter around it. This is
 * where "a pick is emitted exactly once" is actually decided.
 */

export interface Mirror {
  phase: DraftPhase;
  leagueId: string | null;
  overallPick: number | null;
  round: number | null;
  pickInRound: number | null;
  onTheClockId: string | null;
  clockMs: number | null;
  clockRunning: boolean | null;
  picks: DraftPick[];
  seen: string[];
  updatedAt: number;
}

export function emptyMirror(): Mirror {
  return {
    phase: 'idle',
    leagueId: null,
    overallPick: null,
    round: null,
    pickInRound: null,
    onTheClockId: null,
    clockMs: null,
    clockRunning: null,
    picks: [],
    seen: [],
    updatedAt: 0,
  };
}

/**
 * Throw the mirror away when the draft room is a different draft.
 *
 * Every ESPN mock draft gets its own league id, so a night of rehearsals used
 * to pile the picks of one room on top of another. The moment that reached
 * 180 the presentation declared the draft complete and stopped listening to
 * everything after it. A new league starts from nothing.
 *
 * Returns true when it actually threw something away.
 */
export function startNewLeague(mirror: Mirror, seen: Set<string>, leagueId: string | null): boolean {
  if (!leagueId) return false;
  if (mirror.leagueId === leagueId) return false;
  const hadState = mirror.leagueId !== null && (mirror.picks.length > 0 || mirror.phase !== 'idle');
  Object.assign(mirror, emptyMirror(), { leagueId });
  seen.clear();
  return hadState;
}

export interface ApplyResult {
  events: ProviderEvent[];
  /** False when the snapshot was ignored as too low quality to trust. */
  accepted: boolean;
  /**
   * True when this read taught us a block of history rather than live play -
   * joining a draft already at pick 104, say. The caller sends the whole
   * mirror instead, so the board fills in silently rather than the television
   * announcing a hundred picks that happened before anyone switched it on.
   */
  backfilled: boolean;
}

export interface ApplyOptions {
  /** Picks included on the outgoing reconcile snapshot. */
  snapshotTail: number;
  /** Confidence of the best parse we have seen, for the quality gate. */
  bestConfidence: number | null;
  now: number;
  /**
   * More new picks than this in a single read is history, not live play.
   * ESPN never completes four selections inside one poll - even a room full
   * of autopicks takes seconds per pick - so this only ever fires when we
   * have just learned about a draft that was already under way.
   */
  backfillThreshold?: number;
}

/**
 * Fold one ESPN read into the mirror and report what changed.
 *
 * The caller owns the seen-set so it can be persisted; everything else about
 * "what is new" is decided here.
 */
export function applySnapshot(
  mirror: Mirror,
  seen: Set<string>,
  snapshot: DraftSnapshot,
  meta: ParseMeta,
  options: ApplyOptions,
): ApplyResult {
  // A frame that can barely read the page must not overwrite a good read.
  if (meta.confidence < 0.2 && (options.bestConfidence ?? 0) >= 0.2) {
    return { events: [], accepted: false, backfilled: false };
  }

  const at = options.now;
  const events: ProviderEvent[] = [];

  startNewLeague(mirror, seen, snapshot.leagueId);

  // Phase. 'idle' means "could not tell", which is never news.
  if (snapshot.phase !== 'idle' && snapshot.phase !== mirror.phase) {
    const from = mirror.phase;
    // A finished draft does not un-finish because one read looked different.
    if (!(from === 'complete' && snapshot.phase !== 'complete')) {
      mirror.phase = snapshot.phase;
      switch (snapshot.phase) {
        case 'waiting':
          events.push({ type: 'DRAFT_WAITING', at });
          break;
        case 'in_progress':
          events.push(from === 'paused' ? { type: 'DRAFT_RESUMED', at } : { type: 'DRAFT_STARTED', at });
          break;
        case 'paused':
          events.push({ type: 'DRAFT_PAUSED', at });
          break;
        case 'complete':
          events.push({ type: 'DRAFT_COMPLETE', at });
          break;
        default:
          break;
      }
    }
  }

  // Picks, in draft order, each emitted exactly once.
  const incoming = [...snapshot.picks].sort((a, b) => a.overallPick - b.overallPick);
  const unseen = incoming.filter((pick) => !seen.has(pick.eventId));
  const backfilled = unseen.length > (options.backfillThreshold ?? 3);
  for (const pick of unseen) {
    seen.add(pick.eventId);
    const existingIndex = mirror.picks.findIndex((p) => p.overallPick === pick.overallPick);
    if (existingIndex >= 0) {
      // ESPN corrected a pick: replace it rather than record two.
      mirror.picks[existingIndex] = pick;
    } else {
      mirror.picks.push(pick);
    }
    if (!backfilled) events.push({ type: 'PICK_MADE', at, pick });
  }
  mirror.picks.sort((a, b) => a.overallPick - b.overallPick);

  // Who is on the clock.
  const teamId = snapshot.onTheClock?.fantasyTeamId ?? null;
  if (
    snapshot.overallPick !== null &&
    snapshot.round !== null &&
    snapshot.pickInRound !== null &&
    snapshot.onTheClock &&
    (snapshot.overallPick !== mirror.overallPick || teamId !== mirror.onTheClockId)
  ) {
    mirror.overallPick = snapshot.overallPick;
    mirror.round = snapshot.round;
    mirror.pickInRound = snapshot.pickInRound;
    mirror.onTheClockId = teamId;
    events.push({
      type: 'ON_THE_CLOCK',
      at,
      round: snapshot.round,
      pickInRound: snapshot.pickInRound,
      overallPick: snapshot.overallPick,
      team: snapshot.onTheClock,
      onDeck: snapshot.onDeck,
    });
  }

  // Clock, only when it has actually moved a second or changed state.
  if (snapshot.clockMs !== null) {
    const movedASecond = mirror.clockMs === null || Math.abs(snapshot.clockMs - mirror.clockMs) >= 900;
    const runningChanged = snapshot.clockRunning !== mirror.clockRunning;
    if (movedASecond || runningChanged) {
      mirror.clockMs = snapshot.clockMs;
      mirror.clockRunning = snapshot.clockRunning;
      events.push({
        type: 'CLOCK',
        at,
        remainingMs: snapshot.clockMs,
        running: snapshot.clockRunning ?? true,
      });
    }
  }

  // The reconcile snapshot the presentation checks itself against.
  events.push({
    type: 'SNAPSHOT',
    at,
    snapshot: { ...snapshot, picks: mirror.picks.slice(-options.snapshotTail) },
  });

  mirror.updatedAt = at;
  return { events, accepted: true, backfilled };
}
