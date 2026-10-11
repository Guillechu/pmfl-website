import type { DraftPick, DraftState } from '@/types/draft';
import type { FantasyTeam } from '@/types/league';
import { LEAGUE, TOTAL_PICKS, teamBySlot } from '@/config/league';
import { buildRoster, type TeamRoster } from './rosterAssign';
import { slotForOverall } from './snake';

/**
 * Derived views over draft state. Memoised on the state object identity so a
 * 60fps render loop over 180 picks does not rebuild the board every frame.
 */

function memo1<A extends object, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new WeakMap<A, R>();
  return (arg: A) => {
    const hit = cache.get(arg);
    if (hit !== undefined) return hit;
    const value = fn(arg);
    cache.set(arg, value);
    return value;
  };
}

export const picksByTeam = memo1((state: DraftState): Map<string, DraftPick[]> => {
  const map = new Map<string, DraftPick[]>();
  for (const team of LEAGUE.teams) map.set(team.id, []);
  for (const pick of state.picks) {
    const list = map.get(pick.fantasyTeamId);
    if (list) list.push(pick);
    else map.set(pick.fantasyTeamId, [pick]);
  }
  return map;
});

export const rostersByTeam = memo1((state: DraftState): Map<string, TeamRoster> => {
  const byTeam = picksByTeam(state);
  const map = new Map<string, TeamRoster>();
  for (const team of LEAGUE.teams) map.set(team.id, buildRoster(byTeam.get(team.id) ?? []));
  return map;
});

export interface BoardCell {
  round: number;
  slot: number;
  overallPick: number;
  pick: DraftPick | null;
  isCurrent: boolean;
}

/** rounds x teams grid, column index = draft slot - 1. */
export const draftBoard = memo1((state: DraftState): BoardCell[][] => {
  const byOverall = new Map(state.picks.map((pick) => [pick.overallPick, pick]));
  const rows: BoardCell[][] = [];
  for (let round = 1; round <= LEAGUE.rounds; round += 1) {
    const row: BoardCell[] = [];
    for (let slot = 1; slot <= LEAGUE.teamCount; slot += 1) {
      // In an even round the slot picks later, so find its overall pick.
      const pickInRound = round % 2 === 1 ? slot : LEAGUE.teamCount - slot + 1;
      const overallPick = (round - 1) * LEAGUE.teamCount + pickInRound;
      row.push({
        round,
        slot,
        overallPick,
        pick: byOverall.get(overallPick) ?? null,
        isCurrent: overallPick === state.overallPick,
      });
    }
    rows.push(row);
  }
  return rows;
});

export function recentPicks(state: DraftState, count = 6): DraftPick[] {
  const picks = state.picks;
  return picks.slice(Math.max(0, picks.length - count)).reverse();
}

export function lastPick(state: DraftState): DraftPick | null {
  return state.picks.length > 0 ? (state.picks[state.picks.length - 1] ?? null) : null;
}

export function progress(state: DraftState): { made: number; total: number; ratio: number } {
  const made = state.picks.length;
  return { made, total: TOTAL_PICKS, ratio: TOTAL_PICKS === 0 ? 0 : made / TOTAL_PICKS };
}

export function teamForOverall(overallPick: number): FantasyTeam | undefined {
  return teamBySlot(slotForOverall(overallPick));
}

/** Upcoming picks after the current one, for the on-deck strip. */
export function upcoming(state: DraftState, count = 3): { overallPick: number; team: FantasyTeam | undefined }[] {
  const out: { overallPick: number; team: FantasyTeam | undefined }[] = [];
  for (let i = 1; i <= count; i += 1) {
    const overallPick = state.overallPick + i;
    if (overallPick > TOTAL_PICKS) break;
    out.push({ overallPick, team: teamForOverall(overallPick) });
  }
  return out;
}
