import { motion } from 'framer-motion';
import type { DraftState } from '@/types/draft';
import type { PresentationView } from '@/types/settings';
import { LEAGUE } from '@/config/league';
import { rostersByTeam } from '@/core/selectors';
import { BoardScreen } from './BoardScreen';
import { RostersScreen } from './RostersScreen';
import { POSITION_COLOR } from '@/components/player/PositionBadge';

/**
 * After ESPN reports the draft finished.
 *
 * Summary only - no grades, no winners: nothing is claimed that the app has
 * not actually measured.
 */
export function CompleteScreen({ state, view }: { state: DraftState; view: PresentationView }) {
  if (view === 'board') return <BoardScreen state={state} />;
  if (view === 'rosters') return <RostersScreen state={state} />;
  return <Summary state={state} />;
}

function Summary({ state }: { state: DraftState }) {
  const rosters = rostersByTeam(state);
  const firstRound = state.picks.filter((pick) => pick.round === 1);
  const positionCounts = state.picks.reduce<Record<string, number>>((acc, pick) => {
    acc[pick.player.position] = (acc[pick.player.position] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden p-[1.6rem]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <p className="font-display text-tv-md font-semibold uppercase tracking-[0.5em] text-gold-500">
          {LEAGUE.name}
        </p>
        <h1 className="headline mt-[0.4rem] text-tv-3xl leading-none text-ink">
          {LEAGUE.season} Draft Complete
        </h1>
        <div className="rule-gold mt-[1rem] w-[40rem]" />
      </motion.div>

      <div className="mt-[1.6rem] grid w-full grid-cols-[1.15fr_0.85fr] gap-[1.2rem]">
        <section className="panel px-[1.2rem] py-[0.9rem]">
          <span className="eyebrow">Round 1</span>
          <ol className="mt-[0.6rem] grid grid-cols-2 gap-x-[1.4rem] gap-y-[0.28rem]">
            {firstRound.map((pick) => (
              <li key={pick.eventId} className="flex items-baseline gap-[0.5rem]">
                <span className="tabular w-[2.4rem] font-display text-tv-sm font-bold text-gold-500">
                  1.{String(pick.pickInRound).padStart(2, '0')}
                </span>
                <span className="truncate font-display text-tv-sm font-semibold uppercase text-ink">
                  {pick.player.name}
                </span>
                <span
                  className="shrink-0 font-display text-tv-xs uppercase"
                  style={{ color: POSITION_COLOR[pick.player.position] }}
                >
                  {pick.player.position}
                </span>
                <span className="truncate text-tv-xs uppercase tracking-[0.1em] text-ink/35">
                  {pick.fantasyTeamName}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel px-[1.2rem] py-[0.9rem]">
          <span className="eyebrow">Resumen del draft</span>
          <dl className="mt-[0.7rem] grid grid-cols-2 gap-[0.7rem]">
            <SummaryStat label="Picks totales" value={`${state.picks.length}`} />
            <SummaryStat label="Rondas" value={`${LEAGUE.rounds}`} />
            <SummaryStat label="Equipos" value={`${LEAGUE.teamCount}`} />
            <SummaryStat
              label="Rosters completos"
              value={`${
                [...rosters.values()].filter(
                  (roster) =>
                    roster.starters.filter((s) => s.pick).length + roster.bench.length >= LEAGUE.rounds,
                ).length
              }/${LEAGUE.teamCount}`}
            />
          </dl>

          <div className="mt-[1rem]">
            <span className="eyebrow">Por posición</span>
            <div className="mt-[0.5rem] flex flex-wrap gap-[0.4rem]">
              {Object.entries(positionCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([position, count]) => (
                  <span
                    key={position}
                    className="rounded-[0.2rem] px-[0.55rem] py-[0.2rem] font-display text-tv-xs font-semibold uppercase tracking-[0.12em]"
                    style={{
                      backgroundColor: `${POSITION_COLOR[position as keyof typeof POSITION_COLOR] ?? '#888'}22`,
                      color: POSITION_COLOR[position as keyof typeof POSITION_COLOR] ?? '#888',
                    }}
                  >
                    {position} {count}
                  </span>
                ))}
            </div>
          </div>
        </section>
      </div>

      <p className="mt-auto font-display text-tv-xs uppercase tracking-[0.3em] text-ink/30">
        Press 2 for the final board &middot; 3 for team rosters
      </p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.25rem] border border-ink/8 bg-ink/[0.03] px-[0.7rem] py-[0.5rem]">
      <dt className="font-display text-tv-xs uppercase tracking-[0.22em] text-ink/40">{label}</dt>
      <dd className="tabular headline mt-[0.1rem] text-tv-lg text-ink">{value}</dd>
    </div>
  );
}
