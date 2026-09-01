import { LEAGUE } from './league';

/**
 * The clock before the clock.
 *
 * The draft's start time is a fact about the league, not a trigger: nothing
 * here starts the presentation, and nothing here talks to ESPN. It answers
 * two questions - how long until we are due to start, and is it time for the
 * music yet - so the waiting screen has something to show and the music comes
 * up on its own a few minutes out.
 */

/** Scheduled start as a timestamp, or null when the league has no date set. */
export function scheduledStartMs(): number | null {
  if (!LEAGUE.scheduledStart) return null;
  const at = Date.parse(LEAGUE.scheduledStart);
  return Number.isFinite(at) ? at : null;
}

/** Milliseconds until the scheduled start. Negative once it has passed. */
export function msUntilStart(now: number = Date.now()): number | null {
  const at = scheduledStartMs();
  return at === null ? null : at - now;
}

/**
 * Milliseconds until the music should come up.
 *
 * Zero when that moment has already arrived - including when there is no
 * schedule at all, where the honest answer is "now", since the operator
 * arming the presentation is then the only signal we have.
 */
export function msUntilMusic(now: number = Date.now()): number {
  const at = scheduledStartMs();
  if (at === null) return 0;
  return Math.max(0, at - LEAGUE.musicLeadMinutes * 60_000 - now);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True once the scheduled time has come and gone. */
  overdue: boolean;
}

export function countdownParts(ms: number): CountdownParts {
  const overdue = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    overdue,
  };
}

/** The start time written out for the screen, in the viewer's own timezone. */
export function scheduledStartLabel(): string | null {
  const at = scheduledStartMs();
  if (at === null) return null;
  return new Date(at).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}
