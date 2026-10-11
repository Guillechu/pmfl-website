import { LEAGUE } from '@/config/league';

/**
 * Snake-draft arithmetic.
 *
 * ESPN remains authoritative for who is actually on the clock. These helpers
 * exist to validate what ESPN reports, to fill in on-deck / next-up before
 * ESPN renders them, and to reconstruct a pick's coordinates when ESPN gives
 * us only one of (round, pickInRound, overallPick).
 */

export interface PickCoords {
  round: number;
  pickInRound: number;
  overallPick: number;
}

const TEAMS = LEAGUE.teamCount;
const ROUNDS = LEAGUE.rounds;
export const LAST_OVERALL_PICK = TEAMS * ROUNDS;

export function overallFrom(round: number, pickInRound: number, teams = TEAMS): number {
  return (round - 1) * teams + pickInRound;
}

export function coordsFromOverall(overallPick: number, teams = TEAMS): PickCoords {
  const round = Math.floor((overallPick - 1) / teams) + 1;
  const pickInRound = ((overallPick - 1) % teams) + 1;
  return { round, pickInRound, overallPick };
}

/** Draft slot (1..12, the round-1 order) that owns a given pick in a round. */
export function slotForPick(round: number, pickInRound: number, teams = TEAMS): number {
  return round % 2 === 1 ? pickInRound : teams - pickInRound + 1;
}

export function slotForOverall(overallPick: number, teams = TEAMS): number {
  const { round, pickInRound } = coordsFromOverall(overallPick, teams);
  return slotForPick(round, pickInRound, teams);
}

/** Full expected running order, slot numbers, from overall pick 1 to the end. */
export function expectedSlotOrder(teams = TEAMS, rounds = ROUNDS): number[] {
  const order: number[] = [];
  for (let overall = 1; overall <= teams * rounds; overall += 1) {
    order.push(slotForOverall(overall, teams));
  }
  return order;
}

/** Normalise a partial set of coordinates into a complete, consistent one. */
export function reconcileCoords(
  partial: { round?: number | null; pickInRound?: number | null; overallPick?: number | null },
  teams = TEAMS,
): PickCoords | null {
  const { round, pickInRound, overallPick } = partial;
  if (overallPick && overallPick > 0) {
    const derived = coordsFromOverall(overallPick, teams);
    // Trust ESPN's overall pick, but keep round/pickInRound if they agree.
    if (round && pickInRound && overallFrom(round, pickInRound, teams) === overallPick) {
      return { round, pickInRound, overallPick };
    }
    return derived;
  }
  if (round && round > 0 && pickInRound && pickInRound > 0) {
    return { round, pickInRound, overallPick: overallFrom(round, pickInRound, teams) };
  }
  return null;
}

export function isValidOverall(overallPick: number, teams = TEAMS, rounds = ROUNDS): boolean {
  return Number.isInteger(overallPick) && overallPick >= 1 && overallPick <= teams * rounds;
}
