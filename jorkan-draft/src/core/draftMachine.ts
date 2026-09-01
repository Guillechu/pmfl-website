import type { DraftPick, DraftPhase, DraftSnapshot, DraftState } from '@/types/draft';
import type { TeamRef } from '@/types/league';
import type { ProviderEvent } from '@/types/events';
import type { DriftEntry } from '@/types/sync';
import { LEAGUE, TOTAL_PICKS, teamBySlot } from '@/config/league';
import { SeenEvents, pickEventId } from './dedupe';
import { applyEspnClock, emptyClock } from './clock';
import { coordsFromOverall, isValidOverall, slotForOverall } from './snake';

/**
 * The draft state machine.
 *
 * Every change to draft state goes through here, and every side effect the
 * presentation performs (announcing, sounds, the reveal animation) is emitted
 * from here exactly once. Keeping both in one deterministic place is what
 * makes "never announce the same pick twice" a property of the system rather
 * than a hope.
 */

export type Effect =
  | { type: 'PHASE_CHANGED'; from: DraftPhase; to: DraftPhase; at: number }
  | { type: 'DRAFT_STARTED'; at: number }
  | { type: 'PICK_ACCEPTED'; pick: DraftPick; live: boolean; at: number }
  | {
      type: 'ON_THE_CLOCK';
      team: TeamRef;
      round: number;
      pickInRound: number;
      overallPick: number;
      at: number;
    }
  | { type: 'ROUND_CHANGED'; round: number; at: number }
  | { type: 'DRAFT_COMPLETE'; at: number }
  | { type: 'DRIFT_CORRECTED'; entries: DriftEntry[]; at: number };

export function teamRefForSlot(slot: number): TeamRef | null {
  const team = teamBySlot(slot);
  if (!team) return null;
  return {
    fantasyTeamId: team.id,
    fantasyTeamName: team.name,
    managerName: team.manager.name,
  };
}

/** Configured draft order says who owns this overall pick. ESPN can override. */
export function expectedTeamForOverall(overallPick: number): TeamRef | null {
  if (!isValidOverall(overallPick)) return null;
  return teamRefForSlot(slotForOverall(overallPick));
}

export function createInitialState(leagueId = LEAGUE.espnLeagueId): DraftState {
  return {
    phase: 'idle',
    leagueId,
    round: 1,
    pickInRound: 1,
    overallPick: 1,
    onTheClock: null,
    onDeck: expectedTeamForOverall(2),
    nextUp: expectedTeamForOverall(3),
    clock: emptyClock(),
    picks: [],
    lastPickAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: 0,
  };
}

interface AdvanceOptions {
  /** ESPN-reported coordinates win over anything we derive. */
  espnCoords?: { round: number; pickInRound: number; overallPick: number } | null;
  espnTeam?: TeamRef | null;
  espnOnDeck?: TeamRef | null;
}

export interface MachineSummary {
  hydrated: boolean;
  seenCount: number;
  pickCount: number;
}

export class DraftMachine {
  private state: DraftState;
  private seen: SeenEvents;
  /**
   * False until we have taken our first look at ESPN. The first look restores
   * history silently; only what happens afterwards gets announced.
   */
  private hydrated = false;

  constructor(leagueId = LEAGUE.espnLeagueId, seenLimit = 1200) {
    this.state = createInitialState(leagueId);
    this.seen = new SeenEvents(seenLimit);
  }

  getState(): DraftState {
    return this.state;
  }

  summary(): MachineSummary {
    return {
      hydrated: this.hydrated,
      seenCount: this.seen.size,
      pickCount: this.state.picks.length,
    };
  }

  reset(leagueId = this.state.leagueId): void {
    this.state = createInitialState(leagueId);
    this.seen.clear();
    this.hydrated = false;
  }

  applyMany(events: readonly ProviderEvent[]): Effect[] {
    const effects: Effect[] = [];
    for (const event of events) effects.push(...this.apply(event));
    return effects;
  }

  apply(event: ProviderEvent): Effect[] {
    switch (event.type) {
      case 'DRAFT_WAITING':
        return this.setPhase('waiting', event.at);

      case 'DRAFT_STARTED': {
        const effects = this.setPhase('in_progress', event.at);
        if (this.state.startedAt === null) {
          this.state = { ...this.state, startedAt: event.at };
          effects.push({ type: 'DRAFT_STARTED', at: event.at });
        }
        if (!this.state.onTheClock) {
          this.advanceTo(this.state.overallPick, event.at, {});
        }
        return effects;
      }

      case 'DRAFT_PAUSED':
        return this.setPhase('paused', event.at);

      case 'DRAFT_RESUMED':
        return this.setPhase('in_progress', event.at);

      case 'DRAFT_COMPLETE':
        return this.complete(event.at);

      case 'CLOCK': {
        this.state = {
          ...this.state,
          clock: applyEspnClock(
            this.state.clock,
            event.remainingMs,
            event.running,
            event.at,
            event.raw,
          ),
          updatedAt: event.at,
        };
        return [];
      }

      case 'ON_THE_CLOCK':
        return this.onTheClock(event);

      case 'PICK_MADE':
        return this.acceptPick(event.pick, event.at, true);

      case 'SNAPSHOT':
        return this.reconcile(event.snapshot, event.at);

      case 'SYNC_STATUS':
        return [];

      default: {
        // Exhaustiveness guard: a new event type must be handled explicitly.
        const _never: never = event;
        void _never;
        return [];
      }
    }
  }

  /* ------------------------------------------------------------------ */

  private setPhase(next: DraftPhase, at: number): Effect[] {
    const from = this.state.phase;
    if (from === next) return [];
    // A completed draft never falls back to an earlier phase on a stale read.
    if (from === 'complete' && next !== 'complete') return [];
    this.state = { ...this.state, phase: next, updatedAt: at };
    return [{ type: 'PHASE_CHANGED', from, to: next, at }];
  }

  private complete(at: number): Effect[] {
    if (this.state.phase === 'complete') return [];
    const effects = this.setPhase('complete', at);
    this.state = {
      ...this.state,
      completedAt: at,
      onTheClock: null,
      onDeck: null,
      nextUp: null,
      clock: { ...this.state.clock, running: false },
      updatedAt: at,
    };
    effects.push({ type: 'DRAFT_COMPLETE', at });
    return effects;
  }

  private onTheClock(event: Extract<ProviderEvent, { type: 'ON_THE_CLOCK' }>): Effect[] {
    const effects: Effect[] = [];
    // ESPN putting a team on the clock is itself proof the draft is live.
    if (this.state.phase === 'idle' || this.state.phase === 'waiting') {
      effects.push(...this.setPhase('in_progress', event.at));
      if (this.state.startedAt === null) {
        this.state = { ...this.state, startedAt: event.at };
        effects.push({ type: 'DRAFT_STARTED', at: event.at });
      }
    }

    const key = `otc|${event.overallPick}|${event.team.fantasyTeamId}`;
    const changed =
      this.state.overallPick !== event.overallPick ||
      this.state.onTheClock?.fantasyTeamId !== event.team.fantasyTeamId;
    const previousRound = this.state.round;

    this.state = {
      ...this.state,
      round: event.round,
      pickInRound: event.pickInRound,
      overallPick: event.overallPick,
      onTheClock: event.team,
      onDeck: event.onDeck ?? expectedTeamForOverall(event.overallPick + 1),
      nextUp: expectedTeamForOverall(event.overallPick + 2),
      updatedAt: event.at,
    };

    // Announce the change once per (pick, team) even though ESPN re-renders it.
    if (changed && this.seen.add(key)) {
      if (event.round !== previousRound) {
        effects.push({ type: 'ROUND_CHANGED', round: event.round, at: event.at });
      }
      effects.push({
        type: 'ON_THE_CLOCK',
        team: event.team,
        round: event.round,
        pickInRound: event.pickInRound,
        overallPick: event.overallPick,
        at: event.at,
      });
    }
    return effects;
  }

  /**
   * Add a pick. `live` distinguishes a selection we watched happen from one we
   * reconstructed out of ESPN's history (a restore, or a mutation we missed).
   */
  private acceptPick(input: DraftPick, at: number, live: boolean): Effect[] {
    if (!isValidOverall(input.overallPick)) return [];

    const eventId = input.eventId || pickEventId(this.state.leagueId, input);
    const coords = coordsFromOverall(input.overallPick);
    const pick: DraftPick = {
      ...input,
      eventId,
      round: input.round || coords.round,
      pickInRound: input.pickInRound || coords.pickInRound,
      timestamp: input.timestamp || at,
      backfilled: !live,
    };

    const existing = this.state.picks.find((p) => p.overallPick === pick.overallPick);
    if (existing) {
      if (existing.eventId === eventId) {
        // Same pick again: merge in anything ESPN filled in late (headshot,
        // NFL team) but never re-announce.
        const merged = mergePick(existing, pick);
        if (merged !== existing) {
          this.state = {
            ...this.state,
            picks: this.state.picks.map((p) => (p === existing ? merged : p)),
            updatedAt: at,
          };
        }
        return [];
      }
      // Different player at the same slot: ESPN corrected itself. ESPN wins.
      this.seen.add(eventId);
      this.state = {
        ...this.state,
        picks: this.state.picks.map((p) => (p === existing ? pick : p)),
        updatedAt: at,
      };
      return [{ type: 'PICK_ACCEPTED', pick, live: false, at }];
    }

    if (!this.seen.add(eventId)) return [];

    const picks = [...this.state.picks, pick].sort((a, b) => a.overallPick - b.overallPick);
    this.state = {
      ...this.state,
      picks,
      lastPickAt: at,
      updatedAt: at,
    };

    const effects: Effect[] = [{ type: 'PICK_ACCEPTED', pick, live, at }];

    if (pick.overallPick >= TOTAL_PICKS || this.state.picks.length >= TOTAL_PICKS) {
      effects.push(...this.complete(at));
      return effects;
    }

    /*
     * Move the clock on optimistically to the pick that follows this one;
     * ESPN confirms (or corrects) within a second or two.
     *
     * Deliberately *not* "the lowest slot with no pick in it": ESPN's draft
     * room only shows recent history, so a presentation that joined at pick
     * 100 has real gaps at the start of the board, and that rule would throw
     * the broadcast back to round 1 on the next selection. The guard keeps
     * this monotonic, so a late backfill for an old slot cannot rewind the
     * draft either.
     */
    if (live) {
      const nextOverall = pick.overallPick + 1;
      if (nextOverall > this.state.overallPick) {
        effects.push(...this.advanceTo(nextOverall, at, {}));
      }
    }
    return effects;
  }

  private advanceTo(overallPick: number, at: number, options: AdvanceOptions): Effect[] {
    const coords = options.espnCoords ?? coordsFromOverall(overallPick);
    const team = options.espnTeam ?? expectedTeamForOverall(coords.overallPick);
    const effects: Effect[] = [];
    if (coords.round !== this.state.round) {
      effects.push({ type: 'ROUND_CHANGED', round: coords.round, at });
    }
    this.state = {
      ...this.state,
      round: coords.round,
      pickInRound: coords.pickInRound,
      overallPick: coords.overallPick,
      onTheClock: team,
      onDeck: options.espnOnDeck ?? expectedTeamForOverall(coords.overallPick + 1),
      nextUp: expectedTeamForOverall(coords.overallPick + 2),
      // The clock for the new pick is unknown until ESPN tells us.
      clock: { ...this.state.clock, remainingMs: null, running: false, source: 'unknown' },
      updatedAt: at,
    };
    return effects;
  }

  /**
   * Reconcile against a full authoritative read of ESPN.
   *
   * This is the safety net for a missed MutationObserver event and the path
   * used to restore after any kind of reconnect. Picks we already know stay
   * silent; a pick we learn about here for the first time is announced only
   * when it is the newest one and we were already synced.
   */
  private reconcile(snapshot: DraftSnapshot, at: number): Effect[] {
    const effects: Effect[] = [];
    const drift: DriftEntry[] = [];
    const firstLook = !this.hydrated;

    if (snapshot.phase !== this.state.phase) {
      drift.push({ field: 'phase', espn: snapshot.phase, presentation: this.state.phase });
    }

    // Phase first: a snapshot that says the draft is live starts us.
    if (snapshot.phase !== 'idle') {
      const before = this.state.phase;
      effects.push(...this.setPhase(snapshot.phase, at));
      if (
        snapshot.phase === 'in_progress' &&
        before !== 'in_progress' &&
        this.state.startedAt === null
      ) {
        this.state = { ...this.state, startedAt: at };
        effects.push({ type: 'DRAFT_STARTED', at });
      }
    }

    // Picks. Sort so history is applied in draft order.
    const incoming = [...snapshot.picks].sort((a, b) => a.overallPick - b.overallPick);
    const knownMax = this.state.picks.reduce((max, p) => Math.max(max, p.overallPick), 0);
    const newest = incoming.reduce((max, p) => Math.max(max, p.overallPick), 0);

    for (const pick of incoming) {
      // Announce at most one pick per reconcile: the newest one, and only when
      // we were already in sync (so a restore never replays the whole draft).
      const announceable = !firstLook && pick.overallPick === newest && newest > knownMax;
      effects.push(...this.acceptPick(pick, at, announceable));
    }

    if (this.state.phase === 'complete') {
      this.hydrated = true;
      return effects;
    }

    // Coordinates and who is on the clock: ESPN wins outright.
    const espnOverall = snapshot.overallPick;
    if (espnOverall !== null && isValidOverall(espnOverall)) {
      if (espnOverall !== this.state.overallPick) {
        drift.push({
          field: 'overallPick',
          espn: espnOverall,
          presentation: this.state.overallPick,
        });
      }
      const coords = coordsFromOverall(espnOverall);
      const espnTeam = snapshot.onTheClock ?? expectedTeamForOverall(espnOverall);
      if (
        snapshot.onTheClock &&
        this.state.onTheClock &&
        snapshot.onTheClock.fantasyTeamId !== this.state.onTheClock.fantasyTeamId
      ) {
        drift.push({
          field: 'onTheClock',
          espn: snapshot.onTheClock.fantasyTeamName,
          presentation: this.state.onTheClock.fantasyTeamName,
        });
      }
      const changed =
        espnOverall !== this.state.overallPick ||
        espnTeam?.fantasyTeamId !== this.state.onTheClock?.fantasyTeamId;
      if (changed) {
        this.state = {
          ...this.state,
          round: snapshot.round ?? coords.round,
          pickInRound: snapshot.pickInRound ?? coords.pickInRound,
          overallPick: espnOverall,
          onTheClock: espnTeam,
          onDeck: snapshot.onDeck ?? expectedTeamForOverall(espnOverall + 1),
          nextUp: expectedTeamForOverall(espnOverall + 2),
          updatedAt: at,
        };
        // Mark the on-the-clock announcement as spent so the live path does
        // not repeat what the reconcile just corrected.
        if (espnTeam) this.seen.add(`otc|${espnOverall}|${espnTeam.fantasyTeamId}`);
      }
    }

    if (snapshot.clockMs !== null) {
      this.state = {
        ...this.state,
        clock: applyEspnClock(
          this.state.clock,
          snapshot.clockMs,
          snapshot.clockRunning ?? this.state.clock.running,
          at,
        ),
        updatedAt: at,
      };
    }

    if (drift.length > 0 && !firstLook) {
      effects.push({ type: 'DRIFT_CORRECTED', entries: drift, at });
    }
    this.hydrated = true;
    return effects;
  }
}

/** Fill in fields ESPN rendered late without disturbing identity. */
function mergePick(existing: DraftPick, incoming: DraftPick): DraftPick {
  const player = { ...existing.player };
  let changed = false;
  for (const key of [
    'espnId',
    'headshotUrl',
    'teamLogoUrl',
    'nflTeamAbbr',
    'nflTeamName',
  ] as const) {
    if (!player[key] && incoming.player[key]) {
      player[key] = incoming.player[key];
      changed = true;
    }
  }
  if (player.position === 'UNKNOWN' && incoming.player.position !== 'UNKNOWN') {
    player.position = incoming.player.position;
    changed = true;
  }
  return changed ? { ...existing, player } : existing;
}
