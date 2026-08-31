import type { DraftPick, DraftSnapshot } from '@/types/draft';
import type { Player, Position } from '@/types/player';
import type { ProviderKind } from '@/types/sync';
import { LEAGUE, TOTAL_PICKS, teamBySlot } from '@/config/league';
import { MOCK_PLAYER_POOL } from '@/data/mockPlayers';
import { makeEventId } from '@/core/dedupe';
import { coordsFromOverall, slotForOverall } from '@/core/snake';
import { BaseProvider } from './DraftProvider';

/**
 * Fake ESPN.
 *
 * Emits exactly the event shapes the real ESPN provider emits, so the whole
 * presentation - state machine, audio, animation - can be developed and
 * stress-tested with no live draft. It can also misbehave on purpose:
 * `dropRate` drops live pick events so the reconcile path has to catch them,
 * and `duplicateRate` re-sends events so duplicate protection is exercised.
 *
 * Time is driven through `advance(deltaMs)` so tests can run 180 picks
 * instantly while the UI drives it from a real interval.
 */

export interface SimulatorOptions {
  /** Simulated seconds on the clock per pick. Defaults to the league's 5:00. */
  pickSeconds: number;
  /** Simulated ms multiplier applied to real time when running live. */
  speed: number;
  /** Fastest / slowest a manager takes to pick, in simulated ms. */
  minThinkMs: number;
  maxThinkMs: number;
  /** Probability (0..1) that a live PICK_MADE event is dropped. */
  dropRate: number;
  /** Probability (0..1) that an event is delivered twice. */
  duplicateRate: number;
  /** How often a full SNAPSHOT is emitted, in simulated ms. */
  snapshotIntervalMs: number;
  seed: number;
}

export const DEFAULT_SIMULATOR_OPTIONS: SimulatorOptions = {
  pickSeconds: LEAGUE.pickSeconds,
  speed: 12,
  minThinkMs: 6_000,
  maxThinkMs: 40_000,
  dropRate: 0,
  duplicateRate: 0,
  snapshotIntervalMs: 2_000,
  seed: 20260101,
};

type SimPhase = 'waiting' | 'running' | 'paused' | 'complete';

/** Deterministic PRNG so a simulated draft can be replayed exactly. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POSITION_LIMITS: Record<Position, number> = {
  QB: 2,
  RB: 6,
  WR: 7,
  TE: 2,
  K: 1,
  DST: 1,
  UNKNOWN: 0,
};

export class SimulatorProvider extends BaseProvider {
  readonly kind: ProviderKind = 'simulator';

  private options: SimulatorOptions;
  private rng: () => number;
  private simPhase: SimPhase = 'waiting';
  private overallPick = 1;
  private clockMs: number;
  private thinkMs = 0;
  private elapsedInPickMs = 0;
  private sinceSnapshotMs = 0;
  private available: Player[] = [];
  private picks: DraftPick[] = [];
  private rosterCounts = new Map<string, Record<Position, number>>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private now = 0;

  constructor(options: Partial<SimulatorOptions> = {}) {
    super();
    this.options = { ...DEFAULT_SIMULATOR_OPTIONS, ...options };
    this.rng = mulberry32(this.options.seed);
    this.clockMs = this.options.pickSeconds * 1000;
    this.resetPool();
  }

  async connect(): Promise<void> {
    this.now = Date.now();
    this.patchStatus(
      {
        connection: 'connected',
        provider: 'simulator',
        observerActive: true,
        espnTabDetected: false,
        extensionVersion: 'simulator',
        parserConfidence: 1,
      },
      this.now,
    );
    this.emit({ type: 'DRAFT_WAITING', at: this.now });
    this.emitSnapshot();
  }

  override disconnect(): void {
    this.stopTimer();
    super.disconnect();
  }

  async resync(): Promise<DraftSnapshot | null> {
    this.emitSnapshot();
    return this.snapshot;
  }

  /* -------------------------- controls -------------------------- */

  /** ESPN "starting" the draft. This is what kicks the presentation off. */
  startDraft(): void {
    if (this.simPhase === 'running') return;
    this.simPhase = 'running';
    this.now = Date.now();
    this.emit({ type: 'DRAFT_STARTED', at: this.now });
    this.beginPick();
    this.startTimer();
  }

  pause(): void {
    if (this.simPhase !== 'running') return;
    this.simPhase = 'paused';
    this.emit({ type: 'DRAFT_PAUSED', at: Date.now() });
    this.emitClock();
  }

  resume(): void {
    if (this.simPhase !== 'paused') return;
    this.simPhase = 'running';
    this.emit({ type: 'DRAFT_RESUMED', at: Date.now() });
  }

  /** Force the current team to pick immediately. */
  pickNow(): void {
    if (this.simPhase !== 'running') return;
    this.makePick();
  }

  setOptions(patch: Partial<SimulatorOptions>): void {
    this.options = { ...this.options, ...patch };
    if (patch.seed !== undefined) this.rng = mulberry32(patch.seed);
  }

  getOptions(): SimulatorOptions {
    return this.options;
  }

  getSimPhase(): SimPhase {
    return this.simPhase;
  }

  reset(): void {
    this.stopTimer();
    this.simPhase = 'waiting';
    this.overallPick = 1;
    this.picks = [];
    this.elapsedInPickMs = 0;
    this.sinceSnapshotMs = 0;
    this.clockMs = this.options.pickSeconds * 1000;
    this.rng = mulberry32(this.options.seed);
    this.resetPool();
    this.now = Date.now();
    this.emit({ type: 'DRAFT_WAITING', at: this.now });
    this.emitSnapshot();
  }

  /* --------------------------- timing --------------------------- */

  private startTimer(): void {
    if (this.timer) return;
    const REAL_TICK_MS = 200;
    this.timer = setInterval(() => {
      this.advance(REAL_TICK_MS * this.options.speed);
    }, REAL_TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Advance simulated time. Called by the interval when running live, or
   * directly by tests to run a full draft in milliseconds.
   */
  advance(deltaMs: number): void {
    if (this.simPhase !== 'running') return;
    // Simulated time drives the draft clock; emitted timestamps stay on real
    // wall time, exactly like ESPN, so clock interpolation behaves correctly
    // even when a test fast-forwards a whole draft in a few milliseconds.
    this.now = Date.now();
    this.elapsedInPickMs += deltaMs;
    this.sinceSnapshotMs += deltaMs;
    this.clockMs = Math.max(0, this.clockMs - deltaMs);

    this.emitClock();

    if (this.sinceSnapshotMs >= this.options.snapshotIntervalMs) {
      this.sinceSnapshotMs = 0;
      this.emitSnapshot();
    }

    // ESPN autopicks when the clock expires; so do we.
    if (this.elapsedInPickMs >= this.thinkMs || this.clockMs <= 0) {
      this.makePick();
    }
  }

  /* --------------------------- draft ---------------------------- */

  private resetPool(): void {
    this.available = [...MOCK_PLAYER_POOL];
    this.rosterCounts.clear();
    for (const team of LEAGUE.teams) {
      this.rosterCounts.set(team.id, {
        QB: 0,
        RB: 0,
        WR: 0,
        TE: 0,
        K: 0,
        DST: 0,
        UNKNOWN: 0,
      });
    }
  }

  private beginPick(): void {
    const coords = coordsFromOverall(this.overallPick);
    const team = teamBySlot(slotForOverall(this.overallPick));
    if (!team) return;
    this.clockMs = this.options.pickSeconds * 1000;
    this.elapsedInPickMs = 0;
    const span = Math.max(0, this.options.maxThinkMs - this.options.minThinkMs);
    this.thinkMs = this.options.minThinkMs + this.rng() * span;

    const onDeckTeam = teamBySlot(slotForOverall(this.overallPick + 1));
    this.emit({
      type: 'ON_THE_CLOCK',
      at: this.now,
      round: coords.round,
      pickInRound: coords.pickInRound,
      overallPick: this.overallPick,
      team: {
        fantasyTeamId: team.id,
        fantasyTeamName: team.name,
        managerName: team.manager.name,
      },
      onDeck: onDeckTeam
        ? {
            fantasyTeamId: onDeckTeam.id,
            fantasyTeamName: onDeckTeam.name,
            managerName: onDeckTeam.manager.name,
          }
        : null,
    });
    this.emitClock();
  }

  private makePick(): void {
    const team = teamBySlot(slotForOverall(this.overallPick));
    if (!team) return;
    const coords = coordsFromOverall(this.overallPick);
    // The pool must never be able to stall the simulated draft: if we somehow
    // run the board dry, invent a filler so the run always reaches pick 180.
    const player: Player = this.choosePlayer(team.id, coords.round) ?? {
      name: `Undrafted Player ${this.overallPick}`,
      position: 'RB',
    };

    this.available = this.available.filter((candidate) => candidate !== player);
    const counts = this.rosterCounts.get(team.id);
    if (counts) counts[player.position] += 1;

    const pick: DraftPick = {
      overallPick: this.overallPick,
      round: coords.round,
      pickInRound: coords.pickInRound,
      player,
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.manager.name,
      timestamp: this.now,
      eventId: makeEventId({
        leagueId: LEAGUE.espnLeagueId,
        overallPick: this.overallPick,
        player,
        fantasyTeamId: team.id,
      }),
    };
    this.picks.push(pick);

    // Chaos: sometimes the live event never arrives and reconcile must catch it.
    const dropped = this.rng() < this.options.dropRate;
    if (!dropped) {
      this.emit({ type: 'PICK_MADE', at: this.now, pick });
      if (this.rng() < this.options.duplicateRate) {
        this.emit({ type: 'PICK_MADE', at: this.now, pick: { ...pick } });
      }
    }

    this.overallPick += 1;
    if (this.overallPick > TOTAL_PICKS) {
      this.simPhase = 'complete';
      this.stopTimer();
      this.emitSnapshot();
      this.emit({ type: 'DRAFT_COMPLETE', at: this.now });
      return;
    }
    this.beginPick();
  }

  /** Rough "best available that the roster still needs". */
  private choosePlayer(teamId: string, round: number): Player | null {
    const counts = this.rosterCounts.get(teamId);
    const roundsLeft = LEAGUE.rounds - round;
    const needsK = (counts?.K ?? 0) === 0;
    const needsDst = (counts?.DST ?? 0) === 0;

    // Kicker and defense go late, exactly like a real room; the other
    // required starters get filled before the roster runs out of rounds.
    if (needsK && roundsLeft <= 1) return this.take('K');
    if (needsDst && roundsLeft <= 2) return this.take('DST');
    if ((counts?.TE ?? 0) === 0 && roundsLeft <= 3) return this.take('TE');
    if ((counts?.QB ?? 0) === 0 && roundsLeft <= 4) return this.take('QB');

    for (const candidate of this.available) {
      if (candidate.position === 'K' || candidate.position === 'DST') continue;
      const used = counts?.[candidate.position] ?? 0;
      if (used >= POSITION_LIMITS[candidate.position]) continue;
      // A little noise so every simulated draft is not identical.
      if (this.rng() < 0.12) continue;
      return candidate;
    }
    return this.available.find((c) => c.position !== 'K' && c.position !== 'DST') ?? this.available[0] ?? null;
  }

  private take(position: Position): Player | null {
    return this.available.find((candidate) => candidate.position === position) ?? null;
  }

  /* --------------------------- output --------------------------- */

  private emitClock(): void {
    this.emit({
      type: 'CLOCK',
      at: this.now,
      remainingMs: this.clockMs,
      running: this.simPhase === 'running',
    });
  }

  private emitSnapshot(): void {
    const coords = coordsFromOverall(Math.min(this.overallPick, TOTAL_PICKS));
    const team = teamBySlot(slotForOverall(Math.min(this.overallPick, TOTAL_PICKS)));
    const onDeckTeam = teamBySlot(slotForOverall(Math.min(this.overallPick + 1, TOTAL_PICKS)));
    const complete = this.simPhase === 'complete';

    const snapshot: DraftSnapshot = {
      phase:
        complete
          ? 'complete'
          : this.simPhase === 'running'
            ? 'in_progress'
            : this.simPhase === 'paused'
              ? 'paused'
              : 'waiting',
      leagueId: LEAGUE.espnLeagueId,
      round: complete ? null : coords.round,
      pickInRound: complete ? null : coords.pickInRound,
      overallPick: complete ? null : this.overallPick,
      onTheClock:
        complete || !team
          ? null
          : {
              fantasyTeamId: team.id,
              fantasyTeamName: team.name,
              managerName: team.manager.name,
            },
      onDeck:
        complete || !onDeckTeam
          ? null
          : {
              fantasyTeamId: onDeckTeam.id,
              fantasyTeamName: onDeckTeam.name,
              managerName: onDeckTeam.manager.name,
            },
      clockMs: complete ? null : this.clockMs,
      clockRunning: this.simPhase === 'running',
      // ESPN's draft room only ever shows recent history; mirror that so the
      // reconcile path is exercised the way it will be in production.
      picks: this.picks.slice(-30),
      capturedAt: this.now,
    };
    this.snapshot = snapshot;
    this.emit({ type: 'SNAPSHOT', at: this.now, snapshot });
  }
}
