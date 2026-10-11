import type { DraftPick } from '@/types/draft';
import { playerKey } from '@/types/player';

/**
 * Duplicate protection.
 *
 * ESPN's React tree re-renders the same pick repeatedly, and our own
 * reconcile loop re-reads history every couple of seconds. A pick must never
 * be processed - and above all never announced - twice, so identity is
 * derived deterministically from the pick itself rather than from when we
 * happened to see it:
 *
 *   leagueId + overallPick + playerId + draftingTeam
 */
export function makeEventId(input: {
  leagueId: string;
  overallPick: number;
  player: Parameters<typeof playerKey>[0];
  fantasyTeamId: string;
}): string {
  return [
    input.leagueId,
    String(input.overallPick).padStart(3, '0'),
    playerKey(input.player),
    input.fantasyTeamId,
  ].join('|');
}

export function pickEventId(leagueId: string, pick: Omit<DraftPick, 'eventId'>): string {
  return makeEventId({
    leagueId,
    overallPick: pick.overallPick,
    player: pick.player,
    fantasyTeamId: pick.fantasyTeamId,
  });
}

/**
 * Bounded set of already-processed event ids. Bounded because the
 * presentation runs for hours: a set that only ever grows is a leak, even a
 * slow one.
 */
export class SeenEvents {
  private readonly ids = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly limit = 1000) {}

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /** Returns true if this id is new (and records it). */
  add(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);
    this.order.push(id);
    if (this.order.length > this.limit) {
      const evicted = this.order.shift();
      if (evicted !== undefined) this.ids.delete(evicted);
    }
    return true;
  }

  clear(): void {
    this.ids.clear();
    this.order.length = 0;
  }

  get size(): number {
    return this.ids.size;
  }

  toArray(): string[] {
    return [...this.order];
  }

  static from(ids: readonly string[], limit = 1000): SeenEvents {
    const set = new SeenEvents(limit);
    for (const id of ids) set.add(id);
    return set;
  }
}
