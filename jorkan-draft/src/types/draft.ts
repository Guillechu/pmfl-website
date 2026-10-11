import type { Player } from './player';
import type { TeamRef } from './league';

export type DraftPhase =
  /** Nothing connected yet. */
  | 'idle'
  /** Connected to ESPN, ESPN has not started the draft. */
  | 'waiting'
  /** ESPN draft is live. */
  | 'in_progress'
  /** ESPN reports the draft paused by the commissioner. */
  | 'paused'
  /** ESPN reports the draft finished. */
  | 'complete';

export interface DraftPick {
  overallPick: number;
  round: number;
  pickInRound: number;
  player: Player;
  fantasyTeamId: string;
  fantasyTeamName: string;
  managerName?: string;
  timestamp: number;
  /**
   * Deterministic identity used to guarantee a pick is never processed - or
   * announced - twice. See core/dedupe.ts.
   */
  eventId: string;
  /** ESPN marked this as an autopick / autodraft selection, when detectable. */
  autoPick?: boolean;
  /** True when the pick was reconstructed from ESPN history rather than seen live. */
  backfilled?: boolean;
}

export type ClockSource = 'espn' | 'interpolated' | 'unknown';

export interface ClockState {
  /** Milliseconds left on ESPN's clock. null when ESPN has not shown a clock. */
  remainingMs: number | null;
  /** Full pick length in ms, from league config, used for the progress ring. */
  totalMs: number;
  running: boolean;
  source: ClockSource;
  /** Date.now() of the last authoritative ESPN clock reading. */
  lastEspnUpdate: number | null;
  /** ESPN's raw clock text, kept for the debug panel. */
  raw?: string;
}

export interface DraftState {
  phase: DraftPhase;
  leagueId: string;
  round: number;
  pickInRound: number;
  overallPick: number;
  onTheClock: TeamRef | null;
  onDeck: TeamRef | null;
  nextUp: TeamRef | null;
  clock: ClockState;
  /** Every pick, ordered by overall pick ascending. */
  picks: readonly DraftPick[];
  /** Wall-clock time of the last pick processed. */
  lastPickAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
}

/** A full authoritative picture of the draft, used for reconcile / restore. */
export interface DraftSnapshot {
  phase: DraftPhase;
  leagueId: string | null;
  round: number | null;
  pickInRound: number | null;
  overallPick: number | null;
  onTheClock: TeamRef | null;
  onDeck: TeamRef | null;
  clockMs: number | null;
  clockRunning: boolean | null;
  /** Picks ESPN currently shows, ascending by overall pick. May be partial. */
  picks: readonly DraftPick[];
  capturedAt: number;
}
