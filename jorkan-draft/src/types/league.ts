import type { Position } from './player';

export interface Manager {
  id: string;
  name: string;
  /** Optional phonetic respelling handed to the announcer (see config/pronunciations). */
  phonetic?: string;
}

/** A starting lineup slot definition (QB, RB, FLEX, ...). */
export interface RosterSlotDef {
  /** Unique within the lineup, e.g. "RB1", "FLEX". */
  id: string;
  label: string;
  /** Positions ESPN allows in this slot. */
  eligible: readonly Position[];
}

export interface FantasyTeam {
  /** Stable internal slug. Never changes, even if ESPN renames the team. */
  id: string;
  /** Official ESPN team name. */
  name: string;
  /** Short form for the draft board column header. */
  abbrev: string;
  manager: Manager;
  /** 1-based position in round 1 of the snake. */
  draftSlot: number;
  /** ESPN's numeric team id, learned from the draft room when available. */
  espnTeamId?: number;
  /** Accent colour used for this team's board column / lower third. */
  accentColor: string;
  /**
   * Alternate spellings we may see in the ESPN DOM (abbreviations, owner
   * names, casing variants). Used to match ESPN text back to a known team.
   */
  aliases?: readonly string[];
  /** Optional phonetic respelling for the announcer. */
  phonetic?: string;
}

export interface League {
  id: string;
  name: string;
  season: number;
  espnLeagueId: string;
  espnLeagueUrl: string;
  teamCount: number;
  rounds: number;
  rosterSize: number;
  /** Seconds ESPN gives each manager per pick. Display only - ESPN owns the clock. */
  pickSeconds: number;
  draftType: 'snake';
  starters: readonly RosterSlotDef[];
  benchSlots: number;
  teams: readonly FantasyTeam[];
}

/** Lightweight reference to a fantasy team, used all over the draft state. */
export interface TeamRef {
  fantasyTeamId: string;
  fantasyTeamName: string;
  managerName?: string;
}
