import type { DraftPick } from '@/types/draft';
import type { RosterSlotDef } from '@/types/league';
import type { Position } from '@/types/player';
import { BENCH_SLOTS, STARTER_SLOTS } from '@/config/league';

/**
 * Lineup assignment for presentation.
 *
 * ESPN does not tell us which starting slot a pick is destined for, and
 * guessing wrong looks worse than not guessing, so this is deliberately
 * simple and explainable: dedicated slots fill in draft order, FLEX takes the
 * best leftover RB/WR/TE, everything else is bench. It is a display of what
 * the roster looks like, not a lineup decision.
 */

export interface StarterAssignment {
  slot: RosterSlotDef;
  pick: DraftPick | null;
}

export interface TeamRoster {
  starters: StarterAssignment[];
  /** Every player not in a starting slot. Never truncated - a drafted player
   *  must always appear somewhere on screen. */
  bench: DraftPick[];
  /** Nominal bench size, so the UI can render empty slots. */
  benchSlots: number;
  /** How many bench players exceed the nominal bench (a lopsided roster). */
  overflowCount: number;
  countsByPosition: Record<Position, number>;
}

const DEDICATED = STARTER_SLOTS.filter((slot) => slot.id !== 'FLEX');
const FLEX_SLOT = STARTER_SLOTS.find((slot) => slot.id === 'FLEX');

export function buildRoster(picks: readonly DraftPick[]): TeamRoster {
  const ordered = [...picks].sort((a, b) => a.overallPick - b.overallPick);
  const assigned = new Map<string, DraftPick>();
  const used = new Set<DraftPick>();

  // Pass 1: dedicated starting slots, first come first served.
  for (const pick of ordered) {
    const slot = DEDICATED.find(
      (candidate) => !assigned.has(candidate.id) && candidate.eligible.includes(pick.player.position),
    );
    if (slot) {
      assigned.set(slot.id, pick);
      used.add(pick);
    }
  }

  // Pass 2: FLEX takes the earliest remaining eligible skill player.
  if (FLEX_SLOT) {
    const flexPick = ordered.find(
      (pick) => !used.has(pick) && FLEX_SLOT.eligible.includes(pick.player.position),
    );
    if (flexPick) {
      assigned.set(FLEX_SLOT.id, flexPick);
      used.add(flexPick);
    }
  }

  const bench = ordered.filter((pick) => !used.has(pick));

  const countsByPosition: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DST: 0,
    UNKNOWN: 0,
  };
  for (const pick of ordered) countsByPosition[pick.player.position] += 1;

  return {
    starters: STARTER_SLOTS.map((slot) => ({ slot, pick: assigned.get(slot.id) ?? null })),
    bench,
    benchSlots: BENCH_SLOTS,
    overflowCount: Math.max(0, bench.length - BENCH_SLOTS),
    countsByPosition,
  };
}

export function emptyRoster(): TeamRoster {
  return buildRoster([]);
}
