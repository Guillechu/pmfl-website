/**
 * End-to-end test of the real ESPN code path.
 *
 *   npm run test:espn-path
 *
 * Every other long-running test drives the simulator straight into the state
 * machine. On draft night the path is different and longer:
 *
 *   ESPN DOM -> parser snapshot -> background mirror + dedupe -> EVENTS
 *   -> the presentation's state machine
 *
 * This runs a full 180-pick draft through that whole chain, with ESPN
 * misbehaving (a fifth of live picks dropped, two fifths duplicated), and
 * asserts the properties the broadcast depends on.
 */
import { recordEspnStream } from './record-espn-stream';
import { DraftMachine, type Effect } from '../src/core/draftMachine';
import { LEAGUE, TOTAL_PICKS, teamBySlot } from '../src/config/league';
import { slotForOverall } from '../src/core/snake';
import { rostersByTeam } from '../src/core/selectors';
import { playerKey } from '../src/types/player';

const failures: string[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (!condition) failures.push(`${name} ${detail}`);
}

function main(): void {
  console.log('ESPN path test (parser shape -> background mirror -> presentation)');

  const stream = recordEspnStream();
  check(stream.picks === TOTAL_PICKS, 'extension mirrored every pick', `${stream.picks}`);

  const machine = new DraftMachine();
  const effects: Effect[] = [];
  const overallOverTime: number[] = [];

  for (const batch of stream.batches) {
    for (const event of batch) {
      effects.push(...machine.apply(event));
    }
    overallOverTime.push(machine.getState().overallPick);
  }

  const state = machine.getState();

  check(state.phase === 'complete', 'draft completes', state.phase);
  check(state.picks.length === TOTAL_PICKS, `all ${TOTAL_PICKS} picks on the board`, `${state.picks.length}`);

  // Exactly one accepted-pick effect per selection: this is what stops the
  // announcer reading the same pick twice.
  const accepted = effects.filter(
    (effect): effect is Extract<Effect, { type: 'PICK_ACCEPTED' }> => effect.type === 'PICK_ACCEPTED',
  );
  const perOverall = new Map<number, number>();
  for (const effect of accepted) {
    perOverall.set(effect.pick.overallPick, (perOverall.get(effect.pick.overallPick) ?? 0) + 1);
  }
  const doubled = [...perOverall.entries()].filter(([, count]) => count > 1);
  check(doubled.length === 0, 'no pick announced twice', JSON.stringify(doubled.slice(0, 5)));
  check(accepted.length === TOTAL_PICKS, 'one accept per pick', `${accepted.length}`);

  // No player twice, and the snake order intact.
  const players = new Set(state.picks.map((pick) => playerKey(pick.player)));
  check(players.size === TOTAL_PICKS, 'no player drafted twice', `${players.size} distinct`);
  let orderErrors = 0;
  for (const pick of state.picks) {
    if (teamBySlot(slotForOverall(pick.overallPick))?.id !== pick.fantasyTeamId) orderErrors += 1;
  }
  check(orderErrors === 0, 'snake order intact', `${orderErrors} mismatches`);

  // The broadcast must never move backwards: no viewer should ever see the draft
  // jump to an earlier pick.
  let regressions = 0;
  for (let i = 1; i < overallOverTime.length; i += 1) {
    const previous = overallOverTime[i - 1] ?? 0;
    const current = overallOverTime[i] ?? 0;
    // The final batches complete the draft, which stops advancing the pointer.
    if (current < previous && current !== 0) regressions += 1;
  }
  check(regressions === 0, 'the draft never moves backwards', `${regressions} regressions`);

  // On-the-clock calls: one per pick at most, never repeated for the same pick.
  const onTheClock = effects.filter(
    (effect): effect is Extract<Effect, { type: 'ON_THE_CLOCK' }> => effect.type === 'ON_THE_CLOCK',
  );
  const otcKeys = new Set(onTheClock.map((effect) => `${effect.overallPick}|${effect.team.fantasyTeamId}`));
  check(
    otcKeys.size === onTheClock.length,
    'no repeated on-the-clock calls',
    `${onTheClock.length - otcKeys.size} repeats`,
  );

  // Round changes: exactly one per round after the first.
  const roundChanges = effects.filter((effect) => effect.type === 'ROUND_CHANGED');
  check(
    roundChanges.length === LEAGUE.rounds - 1,
    `one round change per round after the first`,
    `${roundChanges.length} of ${LEAGUE.rounds - 1}`,
  );

  // Every team ends with a full, displayable roster.
  const rosters = rostersByTeam(state);
  let rosterErrors = '';
  for (const team of LEAGUE.teams) {
    const roster = rosters.get(team.id);
    const shown = (roster?.starters.filter((slot) => slot.pick).length ?? 0) + (roster?.bench.length ?? 0);
    if (shown !== LEAGUE.rounds) rosterErrors += `${team.abbrev}:${shown} `;
  }
  check(rosterErrors === '', `every team shows ${LEAGUE.rounds} players`, rosterErrors);

  const summary = machine.summary();
  check(summary.seenCount <= 1200, 'dedupe set stays bounded', `${summary.seenCount}`);

  const batchCount = stream.batches.length;
  const eventCount = stream.batches.reduce((total, batch) => total + batch.length, 0);
  console.log(
    `  replayed ${batchCount} bridge batches / ${eventCount} events -> ` +
      `${state.picks.length} picks, ${accepted.length} announcements, ${roundChanges.length} round changes`,
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) FAILED:`);
    for (const failure of failures) console.error(`  x ${failure}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main();
