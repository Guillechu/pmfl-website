import type { ClockState } from '@/types/draft';
import { LEAGUE } from '@/config/league';

/**
 * Clock handling.
 *
 * ESPN owns the clock. We store the last authoritative reading plus the wall
 * time we received it, then interpolate locally only to make the digits tick
 * smoothly between ESPN updates. Every ESPN reading snaps us back.
 */

export const PICK_TOTAL_MS = LEAGUE.pickSeconds * 1000;

export function emptyClock(): ClockState {
  return {
    remainingMs: null,
    totalMs: PICK_TOTAL_MS,
    running: false,
    source: 'unknown',
    lastEspnUpdate: null,
  };
}

/** Apply an authoritative ESPN reading. */
export function applyEspnClock(
  clock: ClockState,
  remainingMs: number | null,
  running: boolean,
  at: number,
  raw?: string,
): ClockState {
  return {
    ...clock,
    remainingMs,
    running,
    source: remainingMs === null ? 'unknown' : 'espn',
    lastEspnUpdate: at,
    ...(raw !== undefined ? { raw } : {}),
  };
}

/**
 * What to render right now. Between ESPN updates we count down locally so the
 * TV never looks frozen; the moment ESPN speaks again we snap to its value.
 */
export function displayedMs(clock: ClockState, now: number): number | null {
  if (clock.remainingMs === null) return null;
  if (!clock.running || clock.lastEspnUpdate === null) return clock.remainingMs;
  const elapsed = now - clock.lastEspnUpdate;
  return Math.max(0, clock.remainingMs - elapsed);
}

/** True when we have not heard a clock value from ESPN for a worrying while. */
export function clockIsStale(clock: ClockState, now: number, thresholdMs = 8000): boolean {
  if (clock.lastEspnUpdate === null) return clock.remainingMs !== null;
  return now - clock.lastEspnUpdate > thresholdMs;
}

export function formatClock(ms: number | null): string {
  if (ms === null) return '--:--';
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export type UrgencyLevel = 'normal' | 'warn' | 'urgent' | 'critical';

/** Visual urgency tiers. Purely cosmetic - ESPN decides what expiry means. */
export function urgencyFor(ms: number | null): UrgencyLevel {
  if (ms === null) return 'normal';
  if (ms <= 10_000) return 'critical';
  if (ms <= 30_000) return 'urgent';
  if (ms <= 60_000) return 'warn';
  return 'normal';
}

/** Parse ESPN clock text ("4:51", "04:51", "0:09", ":09", "51") to ms. */
export function parseClockText(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/(\d{1,2})?\s*:\s*(\d{1,2})|^\s*(\d{1,3})\s*$/);
  if (!match) return null;
  if (match[3] !== undefined) {
    const seconds = Number(match[3]);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  }
  const minutes = Number(match[1] ?? 0);
  const seconds = Number(match[2] ?? 0);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) return null;
  return (minutes * 60 + seconds) * 1000;
}
