/**
 * Extension mirror tests.
 *
 *   npm run test:extension
 *
 * Covers the logic that decides what is new about an ESPN read: duplicate
 * protection under React re-render storms, ESPN correcting itself, phase
 * transitions, and restoring a mirror after the service worker recycles.
 */
import { applySnapshot, emptyMirror, type Mirror } from '../extension/src/mirror';
import type { DraftPick, DraftSnapshot } from '../src/types/draft';
import type { ParseMeta } from '../shared/protocol';
import type { ProviderEvent } from '../src/types/events';
import { LEAGUE, teamBySlot } from '../src/config/league';
import { makeEventId } from '../src/core/dedupe';
import { coordsFromOverall, slotForOverall } from '../src/core/snake';
import { MOCK_PLAYER_POOL } from '../src/data/mockPlayers';

const failures: string[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (!condition) failures.push(`${name} ${detail}`);
}

const meta = (confidence = 0.9): ParseMeta => ({
  parserVersion: 'test',
  strategies: {},
  confidence,
  warnings: [],
  durationMs: 1,
});

function pickAt(overallPick: number): DraftPick {
  const coords = coordsFromOverall(overallPick);
  const team = teamBySlot(slotForOverall(overallPick));
  const player = MOCK_PLAYER_POOL[overallPick - 1];
  if (!team || !player) throw new Error(`no fixture data for pick ${overallPick}`);
  return {
    overallPick,
    round: coords.round,
    pickInRound: coords.pickInRound,
    player,
    fantasyTeamId: team.id,
    fantasyTeamName: team.name,
    managerName: team.manager.name,
    timestamp: Date.now(),
    eventId: makeEventId({
      leagueId: LEAGUE.espnLeagueId,
      overallPick,
      player,
      fantasyTeamId: team.id,
    }),
  };
}

function snapshotFor(overallPick: number, picks: DraftPick[], phase: DraftSnapshot['phase'] = 'in_progress'): DraftSnapshot {
  const coords = coordsFromOverall(overallPick);
  const team = teamBySlot(slotForOverall(overallPick));
  return {
    phase,
    leagueId: LEAGUE.espnLeagueId,
    round: coords.round,
    pickInRound: coords.pickInRound,
    overallPick,
    onTheClock: team
      ? { fantasyTeamId: team.id, fantasyTeamName: team.name, managerName: team.manager.name }
      : null,
    onDeck: null,
    clockMs: 300_000,
    clockRunning: true,
    picks,
    capturedAt: Date.now(),
  };
}

function fold(mirror: Mirror, seen: Set<string>, snapshot: DraftSnapshot, confidence = 0.9): ProviderEvent[] {
  return applySnapshot(mirror, seen, snapshot, meta(confidence), {
    snapshotTail: 40,
    bestConfidence: 0.9,
    now: Date.now(),
  }).events;
}

function countPicks(events: ProviderEvent[]): number {
  return events.filter((event) => event.type === 'PICK_MADE').length;
}

/* ----------------------------- the scenarios ---------------------------- */

function reRenderStorm(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const picks = [pickAt(1)];

  let total = 0;
  // ESPN re-renders the same state forty times, as React does.
  for (let i = 0; i < 40; i += 1) {
    total += countPicks(fold(mirror, seen, snapshotFor(2, picks)));
  }
  check(total === 1, 'storm: pick emitted exactly once', `emitted ${total} times`);
  check(mirror.picks.length === 1, 'storm: mirror holds one pick', `${mirror.picks.length}`);
}

function growingHistory(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const picks: DraftPick[] = [];
  let emitted = 0;

  for (let overall = 1; overall <= 60; overall += 1) {
    picks.push(pickAt(overall));
    // Each read repeats history several times, exactly like the real room.
    for (let repeat = 0; repeat < 3; repeat += 1) {
      emitted += countPicks(fold(mirror, seen, snapshotFor(overall + 1, picks.slice(-30))));
    }
  }
  check(emitted === 60, 'history: 60 picks emitted once each', `emitted ${emitted}`);
  check(mirror.picks.length === 60, 'history: mirror holds 60 picks', `${mirror.picks.length}`);
  const ids = new Set(mirror.picks.map((pick) => pick.eventId));
  check(ids.size === 60, 'history: no duplicate ids', `${ids.size}`);
}

function espnCorrection(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const original = pickAt(1);
  fold(mirror, seen, snapshotFor(2, [original]));

  // ESPN re-renders pick 1 with a different player (a correction, not a new pick).
  const replacement: DraftPick = { ...pickAt(2), overallPick: 1, round: 1, pickInRound: 1 };
  const events = fold(mirror, seen, snapshotFor(2, [replacement]));

  check(countPicks(events) === 1, 'correction: emits one pick', `${countPicks(events)}`);
  check(mirror.picks.length === 1, 'correction: does not duplicate the slot', `${mirror.picks.length}`);
  check(
    mirror.picks[0]?.player.name === replacement.player.name,
    'correction: ESPN wins',
    mirror.picks[0]?.player.name ?? '',
  );
}

function phaseTransitions(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const kinds = (events: ProviderEvent[]) => events.map((event) => event.type);

  check(
    kinds(fold(mirror, seen, snapshotFor(1, [], 'waiting'))).includes('DRAFT_WAITING'),
    'phase: waiting reported',
  );
  check(
    kinds(fold(mirror, seen, snapshotFor(1, [], 'in_progress'))).includes('DRAFT_STARTED'),
    'phase: start reported',
  );
  check(
    !kinds(fold(mirror, seen, snapshotFor(1, [], 'in_progress'))).includes('DRAFT_STARTED'),
    'phase: start reported only once',
  );
  check(
    kinds(fold(mirror, seen, snapshotFor(1, [], 'paused'))).includes('DRAFT_PAUSED'),
    'phase: pause reported',
  );
  check(
    kinds(fold(mirror, seen, snapshotFor(1, [], 'in_progress'))).includes('DRAFT_RESUMED'),
    'phase: resume reported as resume, not restart',
  );
  check(
    kinds(fold(mirror, seen, snapshotFor(1, [], 'complete'))).includes('DRAFT_COMPLETE'),
    'phase: completion reported',
  );
  // A stale read arriving after completion must not reopen the draft.
  check(
    !kinds(fold(mirror, seen, snapshotFor(1, [], 'in_progress'))).includes('DRAFT_STARTED'),
    'phase: a completed draft stays complete',
  );
}

function lowConfidenceFrame(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  fold(mirror, seen, snapshotFor(5, [pickAt(1), pickAt(2), pickAt(3), pickAt(4)]));

  // An iframe that can see almost nothing reports an empty draft.
  const blind: DraftSnapshot = {
    phase: 'idle',
    leagueId: null,
    round: null,
    pickInRound: null,
    overallPick: null,
    onTheClock: null,
    onDeck: null,
    clockMs: null,
    clockRunning: null,
    picks: [],
    capturedAt: Date.now(),
  };
  const result = applySnapshot(mirror, seen, blind, meta(0.05), {
    snapshotTail: 40,
    bestConfidence: 0.9,
    now: Date.now(),
  });
  check(!result.accepted, 'blind frame: ignored');
  check(mirror.picks.length === 4, 'blind frame: mirror untouched', `${mirror.picks.length}`);
}

function serviceWorkerRestart(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const picks = Array.from({ length: 25 }, (_, index) => pickAt(index + 1));
  fold(mirror, seen, snapshotFor(26, picks));

  // Chrome recycles the worker; we reload the persisted mirror.
  const persisted: Mirror = JSON.parse(JSON.stringify({ ...mirror, seen: [...seen] }));
  const restoredSeen = new Set(persisted.seen);

  const events = fold(persisted, restoredSeen, snapshotFor(26, picks));
  check(countPicks(events) === 0, 'restart: nothing replayed', `${countPicks(events)} replayed`);
  check(persisted.picks.length === 25, 'restart: board intact', `${persisted.picks.length}`);

  // And a genuinely new pick after the restart still comes through.
  const next = fold(persisted, restoredSeen, snapshotFor(27, [...picks, pickAt(26)]));
  check(countPicks(next) === 1, 'restart: new picks still detected', `${countPicks(next)}`);
}

/**
 * Switching the television on at pick 104.
 *
 * ESPN hands us the whole board at once. That is history, not live play: the
 * board must fill in silently and the broadcast must not try to announce a
 * hundred picks that happened before anyone was watching. The very next pick
 * is live again.
 */
function joiningMidDraft(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  const history = Array.from({ length: 103 }, (_, index) => pickAt(index + 1));

  const result = applySnapshot(mirror, seen, snapshotFor(104, history), meta(), {
    snapshotTail: 40,
    bestConfidence: null,
    now: Date.now(),
  });
  check(result.backfilled, 'mid-draft join: recognised as history');
  check(countPicks(result.events) === 0, 'mid-draft join: nothing announced', `${countPicks(result.events)}`);
  check(mirror.picks.length === 103, 'mid-draft join: board filled', `${mirror.picks.length}`);

  const live = applySnapshot(mirror, seen, snapshotFor(105, [...history, pickAt(104)]), meta(), {
    snapshotTail: 40,
    bestConfidence: null,
    now: Date.now(),
  });
  check(!live.backfilled, 'mid-draft join: the next pick is live play');
  check(countPicks(live.events) === 1, 'mid-draft join: the next pick is announced', `${countPicks(live.events)}`);
}

/**
 * A rehearsal, then the real thing.
 *
 * Every ESPN mock draft has its own league id. Picks from one room piling up
 * on the next is what filled the board to 180 and made the presentation
 * declare a draft that had barely started already over - after which it
 * ignored the clock, the round, the board, the rosters and every new pick.
 */
function rehearsalThenTheRealDraft(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();

  // A full mock draft in some other league.
  const rehearsal = Array.from({ length: 180 }, (_, index) => pickAt(index + 1));
  const mock = snapshotFor(180, rehearsal);
  mock.leagueId = 'mock-2036757808';
  applySnapshot(mirror, seen, mock, meta(), { snapshotTail: 40, bestConfidence: null, now: Date.now() });
  check(mirror.picks.length === 180, 'rehearsal: the mock board fills', `${mirror.picks.length}`);

  // Then the real draft room, one pick in.
  const real = snapshotFor(2, [pickAt(1)]);
  real.leagueId = LEAGUE.espnLeagueId;
  const result = applySnapshot(mirror, seen, real, meta(), {
    snapshotTail: 40,
    bestConfidence: null,
    now: Date.now(),
  });
  check(mirror.leagueId === LEAGUE.espnLeagueId, 'real draft: the league switches', String(mirror.leagueId));
  check(mirror.picks.length === 1, 'real draft: the mock board is gone', `${mirror.picks.length} picks`);
  check(countPicks(result.events) === 1, 'real draft: its first pick is live', `${countPicks(result.events)}`);
  check(!result.backfilled, 'real draft: one pick is not history');
}

function clockChatter(): void {
  const mirror = emptyMirror();
  const seen = new Set<string>();
  let clockEvents = 0;
  for (let i = 0; i < 20; i += 1) {
    const snapshot = snapshotFor(1, []);
    // The same second, read over and over: not news.
    snapshot.clockMs = 300_000;
    clockEvents += fold(mirror, seen, snapshot).filter((event) => event.type === 'CLOCK').length;
  }
  check(clockEvents === 1, 'clock: unchanged clock reported once', `${clockEvents} events`);
}

function main(): void {
  console.log('Extension mirror tests');
  reRenderStorm();
  growingHistory();
  espnCorrection();
  phaseTransitions();
  lowConfidenceFrame();
  serviceWorkerRestart();
  joiningMidDraft();
  rehearsalThenTheRealDraft();
  clockChatter();

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) FAILED:`);
    for (const failure of failures) console.error(`  x ${failure}`);
    process.exit(1);
  }
  console.log(
    '  storm, history, correction, phases, blind frame, worker restart, mid-draft join, ' +
      'league switch, clock: all pass',
  );
  console.log('\nAll checks passed.');
}

main();
