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

/**
 * "RND 9 of 16" - the round header a real 2026 ESPN draft room renders.
 *
 * Anchored to the whole string on purpose. The header sits immediately beside
 * the pick clock, and an unanchored match on a wrapper holding both would read
 * "RND 9 of 1600:30" as a sixteen-hundred round draft.
 */
export const RND_OF = /^\s*RND\s*(\d{1,2})\s*of\s*(\d{1,2})\s*$/i;

/**
 * "On the Clock: Pick 104" - ESPN's current-pick module.
 *
 * Verified against a real draft room: the number is the *overall* pick, not
 * the slot within the round. The number is closed with a negative lookahead
 * rather than a word boundary because ESPN's module runs the team name
 * straight on after it ("...Pick 104LOS BUQES DE BUGABA"), where there is no
 * boundary between the digits and the letters at all.
 */
export const ON_CLOCK_PICK = /on\s+the\s+clock:?\s*pick\s*#?\s*(\d{1,3})(?!\d)/i;

/** "PICK 25" - one cell of ESPN's upcoming-picks strip. */
export const PICK_STRIP = /^\s*PICK\s*#?\s*(\d{1,3})\s*$/i;

/** "Round 3", "ROUND 3 OF 15", "R3". */
export const ROUND = /\bround\s*(\d{1,2})\b/i;
export const ROUND_SHORT = /^R(\d{1,2})$/i;

/** "Pick 7", "Pick 7 of 12", "7th pick". */
export const PICK_IN_ROUND = /\bpick\s*(?:#\s*)?(\d{1,3})\b/i;

/**
 * "3.07" / "Pick 3.07" - a fully qualified pick coordinate.
 *
 * Anchored to the start of the row on purpose. A draft room is full of
 * decimal numbers (projections, averages, percentages), and an unanchored
 * match would happily read "Proj 12.4" as round 12, pick 4 and invent a pick
 * that never happened.
 */
export const PICK_COORD = /^\s*(?:pick\s*#?\s*)?(\d{1,2})\s*[.–-]\s*(\d{1,2})(?!\d)/i;
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
/*
 * The club abbreviation is matched case-insensitively: ESPN renders it upper
 * case in some views and title case ("Cin", "SF") in others, and requiring
 * upper case made every title-cased row invisible. Whatever matches is still
 * validated against the real NFL club list before it is used.
 */
export const POSITION_TEAM =
  /\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b\s*[,|/–-]?\s*\b([A-Za-z]{2,4})?\b/;
export const TEAM_POSITION =
  /\b([A-Za-z]{2,4})\b\s*[,|/–-]?\s*\b(QB|RB|WR|TE|K|PK|D\/ST|DST|DEF)\b/;

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
