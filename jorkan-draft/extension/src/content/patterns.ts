/**
 * Text patterns the parser looks for in the draft room.
 *
 * Written to accept the several ways ESPN has historically phrased each
 * thing, because a draft room label is much more stable than the markup
 * around it - but not so loose that ordinary page copy matches by accident.
 */

/** "4:51", "04:51", "0:09" - a pick clock. */
export const CLOCK = /^(\d{1,2}):([0-5]\d)$/;

/** Same, but embedded in a longer string ("Time left 4:51"). */
export const CLOCK_LOOSE = /(?:^|[^\d:])(\d{1,2}):([0-5]\d)(?!\d)/;

/** "Round 3", "ROUND 3 OF 15", "R3". */
export const ROUND = /\bround\s*(\d{1,2})\b/i;
export const ROUND_SHORT = /^R(\d{1,2})$/i;

/** "Pick 7", "Pick 7 of 12", "7th pick". */
export const PICK_IN_ROUND = /\bpick\s*(?:#\s*)?(\d{1,3})\b/i;

/** "3.07" / "R3 P7" / "Pick 3.07" - a fully qualified pick coordinate. */
export const PICK_COORD = /\b(\d{1,2})\s*[.–-]\s*(\d{1,2})\b/;
export const PICK_COORD_RP = /\bR\s*(\d{1,2})\s*[,\s]*P\s*(\d{1,2})\b/i;

/** "Overall 43", "43rd overall", "#43 overall". */
export const OVERALL = /\b(?:overall\s*#?\s*(\d{1,3})|#?(\d{1,3})(?:st|nd|rd|th)?\s*overall)\b/i;

/** Phrases that mark whose turn it is. */
export const ON_THE_CLOCK = /on\s+the\s+clock/i;
export const ON_DECK = /on\s+deck/i;
export const UP_NEXT = /\bup\s+next\b|\bnext\s+up\b/i;

/** Draft lifecycle wording. */
export const DRAFT_NOT_STARTED = /draft\s+(?:has\s+)?not\s+(?:yet\s+)?(?:started|begun)|waiting\s+(?:for|on)\s+(?:the\s+)?(?:draft|commissioner)|draft\s+(?:starts|begins)\s+in|pre[-\s]?draft/i;
export const DRAFT_COMPLETE = /draft\s+(?:is\s+)?(?:complete|completed|over|has\s+ended|ended)|draft\s+results|the\s+draft\s+is\s+done/i;
export const DRAFT_PAUSED = /draft\s+(?:is\s+)?paused|paused\s+by\s+(?:the\s+)?commissioner|resume\s+draft/i;

/** "WR" / "RB" / "D/ST" possibly with an NFL team: "WR, CIN" or "CIN WR". */
export const POSITION_TEAM =
  /\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b\s*[,|/–-]?\s*\b([A-Z]{2,4})?\b/;
export const TEAM_POSITION =
  /\b([A-Z]{2,4})\b\s*[,|/–-]?\s*\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b/;

/** "selected", "drafted by", "selects" - links a player to a fantasy team. */
export const SELECTED_BY = /\b(?:selected|drafted)\s+by\b|\bselects\b/i;

/** Autopick / autodraft markers ESPN shows on picks made by the clock. */
export const AUTOPICK = /\bauto[-\s]?(?:pick|draft|drafted)\b/i;

export function matchClock(text: string): number | null {
  const strict = text.match(CLOCK);
  const loose = strict ?? text.match(CLOCK_LOOSE);
  if (!loose) return null;
  const minutes = Number(loose[1]);
  const seconds = Number(loose[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  // A draft clock is never longer than an hour; anything else is page furniture.
  if (minutes > 59) return null;
  return (minutes * 60 + seconds) * 1000;
}
