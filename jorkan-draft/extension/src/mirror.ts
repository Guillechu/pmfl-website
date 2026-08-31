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

export interface ApplyResult {
  events: ProviderEvent[];
  /** False when the snapshot was ignored as too low quality to trust. */
  accepted: boolean;
}

export interface ApplyOptions {
  /** Picks included on the outgoing reconcile snapshot. */
  snapshotTail: number;
  /** Confidence of the best parse we have seen, for the quality gate. */
  bestConfidence: number | null;
  now: number;
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
    return { events: [], accepted: false };
  }

  const at = options.now;
  const events: ProviderEvent[] = [];

  if (snapshot.leagueId) mirror.leagueId = snapshot.leagueId;

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
  for (const pick of incoming) {
    if (seen.has(pick.eventId)) continue;
    seen.add(pick.eventId);
    const existingIndex = mirror.picks.findIndex((p) => p.overallPick === pick.overallPick);
    if (existingIndex >= 0) {
      // ESPN corrected a pick: replace it rather than record two.
      mirror.picks[existingIndex] = pick;
    } else {
      mirror.picks.push(pick);
    }
    events.push({ type: 'PICK_MADE', at, pick });
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
  return { events, accepted: true };
}
