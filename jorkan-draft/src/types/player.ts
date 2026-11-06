/**
 * Player domain model.
 *
 * Everything here is filled from ESPN when ESPN exposes it. Nothing is
 * required except the name, because the presentation must degrade gracefully
 * rather than break when ESPN omits a field.
 */

/** Canonical fantasy positions used by this league. */
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'UNKNOWN';

export const POSITIONS: readonly Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'UNKNOWN'];

export interface Player {
  /** ESPN's player id when the DOM exposes it (used for dedupe + headshots). */
  espnId?: string;
  name: string;
  position: Position;
  /** Raw position text exactly as ESPN rendered it, kept for debugging. */
  rawPosition?: string;
  nflTeamAbbr?: string;
  nflTeamName?: string;
  headshotUrl?: string;
  teamLogoUrl?: string;
}

/**
 * ESPN writes positions several ways across the draft room ("D/ST", "DST",
 * "WR/TE", "PK"). Normalise once, at the parser boundary, so the rest of the
 * app can rely on the union type.
 */
export function normalizePosition(raw: string | null | undefined): Position {
  if (!raw) return 'UNKNOWN';
  const t = raw.toUpperCase().replace(/[^A-Z/]/g, '');
  if (!t) return 'UNKNOWN';
  if (t.startsWith('QB')) return 'QB';
  if (t.startsWith('RB') || t.startsWith('HB') || t.startsWith('FB')) return 'RB';
  if (t.startsWith('WR')) return 'WR';
  if (t.startsWith('TE')) return 'TE';
  if (t === 'K' || t.startsWith('PK') || t.startsWith('KICK')) return 'K';
  if (t.startsWith('D/ST') || t.startsWith('DST') || t.startsWith('DEF') || t === 'D') return 'DST';
  return 'UNKNOWN';
}

/** Stable key for a player even when ESPN gives us no id. */
export function playerKey(player: Pick<Player, 'espnId' | 'name' | 'position'>): string {
  if (player.espnId) return `espn:${player.espnId}`;
  const slug = player.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `name:${slug}:${player.position}`;
}
