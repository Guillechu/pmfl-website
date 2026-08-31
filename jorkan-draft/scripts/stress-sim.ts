/**
 * Full-draft stress test.
 *
 *   npm run test:sim
 *
 * Runs the simulator and the state machine through all 180 picks - with ESPN
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
  // 1s of simulated time per step, capped well past a full 180-pick draft.
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

async function main(): Promise<void> {
  console.log('Jorkan draft simulation stress test');

  await run('clean run', { dropRate: 0, duplicateRate: 0, seed: 20260101 });
  await run('duplicate storm', { dropRate: 0, duplicateRate: 0.6, seed: 424242 });
  await run('dropped events', { dropRate: 0.25, duplicateRate: 0.2, seed: 987654 });
  await run('hostile', { dropRate: 0.5, duplicateRate: 0.9, seed: 13579 });

  reconnectChecks();

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
