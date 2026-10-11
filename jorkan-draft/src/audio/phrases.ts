import type { DraftPick } from '@/types/draft';
import type { TeamRef } from '@/types/league';
import type { Position } from '@/types/player';
import { LEAGUE } from '@/config/league';

/**
 * What the announcer says.
 *
 * Professional draft-broadcast register, generic rather than an impression of
 * any particular broadcaster. The formal opening is used where it lands - the
 * first picks of the draft and the top of each round - and a tighter form
 * everywhere else, because 180 identical long sentences would drag.
 */

const POSITION_WORD: Record<Position, string> = {
  QB: 'quarterback',
  RB: 'running back',
  WR: 'wide receiver',
  TE: 'tight end',
  K: 'kicker',
  DST: 'defense',
  UNKNOWN: '',
};

const SMALL_ORDINALS = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

export function ordinal(value: number): string {
  const word = SMALL_ORDINALS[value];
  if (word) return word;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function playerClause(pick: DraftPick): string {
  const parts = [pick.player.name];
  const position = POSITION_WORD[pick.player.position];
  if (pick.player.position === 'DST') {
    // "Denver Broncos D/ST" already carries the club; do not say it twice.
    return pick.player.name.replace(/\s*D\/ST\s*$/i, ' defense');
  }
  if (position) parts.push(position);
  if (pick.player.nflTeamName) parts.push(pick.player.nflTeamName);
  return parts.join(', ');
}

/** The full broadcast sentence, used for the marquee picks. */
export function formalPickLine(pick: DraftPick): string {
  return (
    `With the ${ordinal(pick.overallPick)} pick in the ${LEAGUE.season} ${LEAGUE.name} draft, ` +
    `${pick.fantasyTeamName} selects ${playerClause(pick)}.`
  );
}

/** The tighter sentence used for the body of the draft. */
export function shortPickLine(pick: DraftPick): string {
  return (
    `Round ${pick.round}, pick ${pick.pickInRound}. ` +
    `${pick.fantasyTeamName} selects ${playerClause(pick)}.`
  );
}

export function pickLine(pick: DraftPick): string {
  const marquee = pick.overallPick <= 3 || pick.pickInRound === 1 || pick.overallPick === LEAGUE.rounds * LEAGUE.teamCount;
  return marquee ? formalPickLine(pick) : shortPickLine(pick);
}

export function onTheClockLine(team: TeamRef, round: number, pickInRound: number): string {
  if (round === 1 && pickInRound === 1) {
    return `${team.fantasyTeamName} is on the clock with the first pick of the ${LEAGUE.season} ${LEAGUE.name} draft.`;
  }
  return `${team.fantasyTeamName} is on the clock.`;
}

export function roundLine(round: number): string {
  if (round >= LEAGUE.rounds) return `We are into the final round, round ${round}.`;
  return `That is a wrap on round ${round - 1}. Round ${round} is underway.`;
}

export function draftStartLine(): string {
  return `Welcome to the ${LEAGUE.season} ${LEAGUE.name} fantasy football draft. We are on the clock.`;
}

export function draftCompleteLine(): string {
  return `That is a wrap. The ${LEAGUE.season} ${LEAGUE.name} draft is complete. All ${
    LEAGUE.rounds * LEAGUE.teamCount
  } picks are in.`;
}
