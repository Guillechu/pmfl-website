/**
 * Full-draft stress test.
 *
 *   npm run test:sim
 *
 * Runs the simulator and the state machine through every pick - with ESPN
 * misbehaving on purpose - and asserts the properties draft night depends on:
 * no duplicate announcements, no lost picks, correct snake order, rosters that
 * add up, and bounded memory.
 */
import { performance } from 'node:perf_hooks';
import { DraftMachine, type Effect } from '../src/core/draftMachine';
import { SimulatorProvider } from '../src/providers/SimulatorProvider';
import { LEAGUE, TOTAL_PICKS, teamBySlot } from '../src/config/league';
import { slotForOverall } from '../src/core/snake';
import { rostersByTeam } from '../src/core/selectors';
import { playerKey } from '../src/types/player';
import { MOCK_PLAYER_POOL } from '../src/data/mockPlayers';

interface Failure {
  check: string;
  detail: string;
}

const failures: Failure[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (!condition) failures.push({ check: name, detail });
}

async function run(label: string, options: Partial<ConstructorParameters<typeof SimulatorProvider>[0]>) {
  const machine = new DraftMachine();
  const provider = new SimulatorProvider({
    pickSeconds: LEAGUE.pickSeconds,
    minThinkMs: 4_000,
    maxThinkMs: 60_000,
    snapshotIntervalMs: 2_000,
    ...options,
  });

  const effects: Effect[] = [];
  const acceptedVia = { live: 0, reconcile: 0 };
  const unsubscribe = provider.subscribe((event) => {
    for (const effect of machine.apply(event)) {
      effects.push(effect);
      if (effect.type === 'PICK_ACCEPTED') {
        if (event.type === 'SNAPSHOT') acceptedVia.reconcile += 1;
        else acceptedVia.live += 1;
      }
    }
  });

  await provider.connect();
  provider.startDraft();

  const started = performance.now();
  // 1s of simulated time per step, capped well past a full draft.
  let steps = 0;
  const MAX_STEPS = 200_000;
  while (machine.getState().phase !== 'complete' && steps < MAX_STEPS) {
    provider.advance(1_000);
    steps += 1;
  }
  const elapsedMs = performance.now() - started;
  unsubscribe();
  provider.disconnect();

  const state = machine.getState();

  /* ---------------------------- assertions ---------------------------- */

  check(state.phase === 'complete', `${label}: draft completes`, `phase=${state.phase}`);
  check(
    state.picks.length === TOTAL_PICKS,
    `${label}: all ${TOTAL_PICKS} picks recorded`,
    `got ${state.picks.length}`,
  );

  // Every overall pick exactly once.
  const overallCounts = new Map<number, number>();
  for (const pick of state.picks) {
    overallCounts.set(pick.overallPick, (overallCounts.get(pick.overallPick) ?? 0) + 1);
  }
  const dupOverall = [...overallCounts.entries()].filter(([, n]) => n > 1);
  check(dupOverall.length === 0, `${label}: no duplicate overall picks`, JSON.stringify(dupOverall));
  const missing: number[] = [];
  for (let i = 1; i <= TOTAL_PICKS; i += 1) if (!overallCounts.has(i)) missing.push(i);
  check(missing.length === 0, `${label}: no missing picks`, `missing ${missing.slice(0, 10).join(',')}`);

  // A player can only be drafted once.
  const players = new Map<string, number>();
  for (const pick of state.picks) {
    const key = playerKey(pick.player);
    players.set(key, (players.get(key) ?? 0) + 1);
  }
  const dupPlayers = [...players.entries()].filter(([, n]) => n > 1);
  check(dupPlayers.length === 0, `${label}: no player drafted twice`, JSON.stringify(dupPlayers.slice(0, 5)));

  // Announcements: exactly one accepted-pick effect per overall pick.
  const accepted = effects.filter((e): e is Extract<Effect, { type: 'PICK_ACCEPTED' }> => e.type === 'PICK_ACCEPTED');
  const acceptedByOverall = new Map<number, number>();
  for (const effect of accepted) {
    acceptedByOverall.set(effect.pick.overallPick, (acceptedByOverall.get(effect.pick.overallPick) ?? 0) + 1);
  }
  const doubleAnnounced = [...acceptedByOverall.entries()].filter(([, n]) => n > 1);
  check(
    doubleAnnounced.length === 0,
    `${label}: no pick announced twice`,
    JSON.stringify(doubleAnnounced.slice(0, 5)),
  );
  check(
    accepted.length === TOTAL_PICKS,
    `${label}: one accept effect per pick`,
    `got ${accepted.length}`,
  );

  // On-the-clock announcements never repeat for the same pick+team.
  const otc = effects.filter((e): e is Extract<Effect, { type: 'ON_THE_CLOCK' }> => e.type === 'ON_THE_CLOCK');
  const otcKeys = new Set<string>();
  let otcDupes = 0;
  for (const effect of otc) {
    const key = `${effect.overallPick}|${effect.team.fantasyTeamId}`;
    if (otcKeys.has(key)) otcDupes += 1;
    otcKeys.add(key);
  }
  check(otcDupes === 0, `${label}: no repeated on-the-clock announcements`, `${otcDupes} repeats`);

  // Snake order: the configured draft order must match who actually picked.
  let orderErrors = 0;
  for (const pick of state.picks) {
    const expected = teamBySlot(slotForOverall(pick.overallPick));
    if (expected?.id !== pick.fantasyTeamId) orderErrors += 1;
  }
  check(orderErrors === 0, `${label}: snake order intact`, `${orderErrors} mismatches`);

  // Rosters add up.
  const rosters = rostersByTeam(state);
  let rosterErrors = '';
  for (const team of LEAGUE.teams) {
    const roster = rosters.get(team.id);
    const teamPicks = state.picks.filter((p) => p.fantasyTeamId === team.id);
    if (teamPicks.length !== LEAGUE.rounds) rosterErrors += `${team.abbrev}:${teamPicks.length} `;
    // Every drafted player must be visible somewhere on the roster card.
    const shown =
      (roster?.starters.filter((s) => s.pick !== null).length ?? 0) + (roster?.bench.length ?? 0);
    if (shown !== teamPicks.length) rosterErrors += `${team.abbrev}:shown${shown} `;
  }
  check(rosterErrors === '', `${label}: every team drafted ${LEAGUE.rounds} players`, rosterErrors);

  // Memory: the dedupe set must stay bounded, not grow with every render.
  const summary = machine.summary();
  check(summary.seenCount <= 1200, `${label}: dedupe set bounded`, `size ${summary.seenCount}`);

  console.log(
    `  ${label}: ${state.picks.length} picks, ${effects.length} effects, ` +
      `${acceptedVia.live} live / ${acceptedVia.reconcile} recovered by reconcile, ` +
      `${steps} sim steps, ${elapsedMs.toFixed(0)}ms`,
  );
}

/**
 * Reconnect behaviour: joining a draft already in progress must restore the
 * board silently, and re-reading the same ESPN state must change nothing.
 */
function reconnectChecks(): void {
  const seed = new DraftMachine();
  const provider = new SimulatorProvider({ dropRate: 0, duplicateRate: 0, seed: 777 });
  provider.subscribe((event) => seed.apply(event));
  void provider.connect();
  provider.startDraft();
  for (let i = 0; i < 3000 && seed.getState().picks.length < 40; i += 1) provider.advance(1_000);
  provider.disconnect();

  const midDraft = seed.getState();
  check(midDraft.picks.length >= 40, 'reconnect: seeded a mid-draft state', `${midDraft.picks.length} picks`);

  // A fresh presentation (page refresh, extension reload) sees one snapshot.
  const restored = new DraftMachine();
  const snapshot = {
    phase: 'in_progress' as const,
    leagueId: LEAGUE.espnLeagueId,
    round: midDraft.round,
    pickInRound: midDraft.pickInRound,
    overallPick: midDraft.overallPick,
    onTheClock: midDraft.onTheClock,
    onDeck: midDraft.onDeck,
    clockMs: 214_000,
    clockRunning: true,
    picks: midDraft.picks,
    capturedAt: Date.now(),
  };
  const restoreEffects = restored.apply({ type: 'SNAPSHOT', at: Date.now(), snapshot });
  const announced = restoreEffects.filter((e) => e.type === 'PICK_ACCEPTED' && e.live);
  check(announced.length === 0, 'reconnect: restore announces nothing', `${announced.length} announced`);
  check(
    restored.getState().picks.length === midDraft.picks.length,
    'reconnect: full board restored',
    `${restored.getState().picks.length} vs ${midDraft.picks.length}`,
  );
  check(
    restored.getState().overallPick === midDraft.overallPick,
    'reconnect: on the right pick',
    `${restored.getState().overallPick} vs ${midDraft.overallPick}`,
  );

  // ESPN re-renders: the same snapshot ten more times must be a no-op.
  let replayEffects = 0;
  for (let i = 0; i < 10; i += 1) {
    replayEffects += restored.apply({ type: 'SNAPSHOT', at: Date.now(), snapshot }).length;
  }
  check(replayEffects === 0, 'reconnect: replayed snapshots are inert', `${replayEffects} effects`);

  // And a live re-send of the last pick must not re-announce it.
  const lastKnown = midDraft.picks[midDraft.picks.length - 1];
  if (lastKnown) {
    const dupEffects = restored.apply({ type: 'PICK_MADE', at: Date.now(), pick: { ...lastKnown } });
    check(dupEffects.length === 0, 'reconnect: duplicate live pick ignored', `${dupEffects.length} effects`);
  }
  console.log('  reconnect: restored 40+ picks silently, replays inert');
}

/**
 * Joining mid-draft with only recent history.
 *
 * ESPN's draft room only ever shows the last stretch of picks, so a
 * presentation that connects at pick 100 legitimately has no record of picks
 * 1-60. The next live pick must still move the clock forward - not back to
 * the lowest slot it happens to be missing.
 */
/**
 * A finished rehearsal must not end the real draft before it starts.
 *
 * "A completed draft never un-completes" is the right rule for a stale read
 * and the wrong one for a new draft room: a mock draft run to its last pick left
 * the presentation complete and deaf to the clock, the round, the board, the
 * rosters and every pick of the night that followed.
 */
function newLeagueChecks(): void {
  const machine = new DraftMachine();
  const now = Date.now();
  const full = Array.from({ length: TOTAL_PICKS }, (_, index) => samplePick(index + 1));

  const snapshotOf = (leagueId: string, overall: number, picks: ReturnType<typeof samplePick>[]) => ({
    type: 'SNAPSHOT' as const,
    at: now,
    snapshot: {
      phase: 'in_progress' as const,
      leagueId,
      round: coordsOf(overall).round,
      pickInRound: coordsOf(overall).pickInRound,
      overallPick: overall,
      onTheClock: teamRefFor(overall),
      onDeck: teamRefFor(overall + 1),
      clockMs: 300_000,
      clockRunning: true,
      picks,
      capturedAt: now,
    },
  });

  machine.apply(snapshotOf('mock-848693692', TOTAL_PICKS, full));
  check(machine.getState().phase === 'complete', 'new league: the rehearsal completes', machine.getState().phase);

  machine.apply(snapshotOf(LEAGUE.espnLeagueId, 2, [samplePick(1)]));
  const state = machine.getState();
  check(state.phase === 'in_progress', 'new league: the real draft is live again', state.phase);
  check(state.leagueId === LEAGUE.espnLeagueId, 'new league: the league follows ESPN', state.leagueId);
  check(state.picks.length === 1, 'new league: the rehearsal board is gone', `${state.picks.length} picks`);
  check(state.overallPick === 2, 'new league: back on the clock', `${state.overallPick}`);

  // And the next real pick is announced, which is the whole point.
  const effects = machine.apply({ type: 'PICK_MADE', at: now, pick: samplePick(2) });
  const announced = effects.filter((e) => e.type === 'PICK_ACCEPTED' && e.live);
  check(announced.length === 1, 'new league: the next pick is announced', `${announced.length}`);
}

function partialHistoryChecks(): void {
  const machine = new DraftMachine();
  const now = Date.now();

  // Restore from a snapshot carrying only picks 61-100.
  const recent = Array.from({ length: 40 }, (_, index) => samplePick(index + 61));
  machine.apply({
    type: 'SNAPSHOT',
    at: now,
    snapshot: {
      phase: 'in_progress',
      leagueId: LEAGUE.espnLeagueId,
      round: coordsOf(101).round,
      pickInRound: coordsOf(101).pickInRound,
      overallPick: 101,
      onTheClock: teamRefFor(101),
      onDeck: teamRefFor(102),
      clockMs: 300_000,
      clockRunning: true,
      picks: recent,
      capturedAt: now,
    },
  });

  check(machine.getState().overallPick === 101, 'partial: restored on pick 101', `${machine.getState().overallPick}`);

  // A live pick arrives for 101.
  const effects = machine.apply({ type: 'PICK_MADE', at: now, pick: samplePick(101) });
  const state = machine.getState();

  check(
    state.overallPick === 102,
    'partial: advances to the next pick, not to a gap',
    `landed on ${state.overallPick}`,
  );
  check(
    state.round === coordsOf(102).round,
    'partial: round does not jump backwards',
    `round ${state.round}`,
  );
  const roundChanges = effects.filter((effect) => effect.type === 'ROUND_CHANGED');
  check(
    roundChanges.length === 0,
    'partial: no bogus round-change announcement',
    JSON.stringify(roundChanges),
  );
  check(
    state.onTheClock?.fantasyTeamId === teamRefFor(102)?.fantasyTeamId,
    'partial: correct team on the clock',
    state.onTheClock?.fantasyTeamName ?? 'none',
  );

  // A late backfill for an old slot must not drag the draft backwards either.
  machine.apply({ type: 'PICK_MADE', at: now, pick: samplePick(45) });
  check(
    machine.getState().overallPick === 102,
    'partial: a late old pick does not rewind the draft',
    `${machine.getState().overallPick}`,
  );

  // The final pick completes the draft even with gaps in the board.
  machine.apply({ type: 'PICK_MADE', at: now, pick: samplePick(TOTAL_PICKS) });
  check(
    machine.getState().phase === 'complete',
    'partial: final pick completes the draft',
    machine.getState().phase,
  );

  console.log('  partial history: advances forward, no rewind, completes on the final pick');
  console.log('  new league: a finished rehearsal does not end the real draft');
}

function coordsOf(overall: number) {
  return { round: Math.floor((overall - 1) / LEAGUE.teamCount) + 1, pickInRound: ((overall - 1) % LEAGUE.teamCount) + 1 };
}

function teamRefFor(overall: number) {
  const team = teamBySlot(slotForOverall(overall));
  return team
    ? { fantasyTeamId: team.id, fantasyTeamName: team.name, managerName: team.manager.name }
    : null;
}

function samplePick(overall: number) {
  const coords = coordsOf(overall);
  const team = teamBySlot(slotForOverall(overall));
  const player = MOCK_PLAYER_POOL[overall % MOCK_PLAYER_POOL.length];
  if (!team || !player) throw new Error(`no fixture for pick ${overall}`);
  return {
    overallPick: overall,
    round: coords.round,
    pickInRound: coords.pickInRound,
    player,
    fantasyTeamId: team.id,
    fantasyTeamName: team.name,
    managerName: team.manager.name,
    timestamp: Date.now(),
    eventId: `${LEAGUE.espnLeagueId}|${String(overall).padStart(3, '0')}|${playerKey(player)}|${team.id}`,
  };
}

async function main(): Promise<void> {
  console.log('Jorkan draft simulation stress test');

  await run('clean run', { dropRate: 0, duplicateRate: 0, seed: 20260101 });
  await run('duplicate storm', { dropRate: 0, duplicateRate: 0.6, seed: 424242 });
  await run('dropped events', { dropRate: 0.25, duplicateRate: 0.2, seed: 987654 });
  await run('hostile', { dropRate: 0.5, duplicateRate: 0.9, seed: 13579 });

  reconnectChecks();
  partialHistoryChecks();
  newLeagueChecks();

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) FAILED:`);
    for (const failure of failures) console.error(`  x ${failure.check} ${failure.detail}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
