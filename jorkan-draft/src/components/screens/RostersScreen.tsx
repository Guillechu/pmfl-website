import type { DraftState } from '@/types/draft';
import { LEAGUE } from '@/config/league';
import { rostersByTeam } from '@/core/selectors';
import type { TeamRoster } from '@/core/rosterAssign';
import { POSITION_COLOR } from '@/components/player/PositionBadge';
import { cn } from '@/lib/cn';

/** One card per fantasy team, starters then bench, filled from ESPN picks. */
export function RostersScreen({ state }: { state: DraftState }) {
  const rosters = rostersByTeam(state);

  return (
    <div className="grid flex-1 grid-cols-6 grid-rows-2 gap-[0.6rem] overflow-hidden p-[0.9rem]">
      {LEAGUE.teams.map((team) => {
        const roster = rosters.get(team.id);
        const onClock = state.onTheClock?.fantasyTeamId === team.id;
        return (
          <section
            key={team.id}
            className={cn(
              'panel flex min-h-0 flex-col overflow-hidden px-[0.55rem] py-[0.45rem]',
              onClock && 'border-gold-500/50',
            )}
            style={{ borderTop: `2px solid ${team.accentColor}` }}
          >
            <header className="flex items-baseline justify-between gap-[0.3rem]">
              <span
                className="truncate font-display text-tv-sm font-bold uppercase leading-none"
                style={{ color: team.accentColor }}
              >
                {team.name}
              </span>
              <span className="tabular shrink-0 text-[0.62rem] text-ink/35">
                {roster ? roster.starters.filter((s) => s.pick).length + roster.bench.length : 0}/
                {LEAGUE.rounds}
              </span>
            </header>

            <ul className="mt-[0.3rem] flex min-h-0 flex-1 flex-col gap-[0.1rem] overflow-hidden">
              {roster?.starters.map((assignment) => (
                <li
                  key={assignment.slot.id}
                  className="flex items-center gap-[0.3rem] border-b border-ink/5 py-[0.09rem]"
                >
                  <span className="w-[2rem] shrink-0 font-display text-[0.62rem] font-bold uppercase tracking-[0.1em] text-ink/40">
                    {assignment.slot.label}
                  </span>
                  {assignment.pick ? (
                    <>
                      <span
                        className="h-[0.55rem] w-[0.13rem] shrink-0 rounded"
                        style={{ backgroundColor: POSITION_COLOR[assignment.pick.player.position] }}
                      />
                      <span className="truncate font-display text-[0.72rem] font-medium uppercase tracking-[0.02em] text-ink/90">
                        {assignment.pick.player.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[0.66rem] italic text-ink/18">vacío</span>
                  )}
                </li>
              ))}

              <li className="pt-[0.18rem]">
                <span className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-ink/30">
                  Bench
                </span>
              </li>
              {benchRows(roster).map((entry) => (
                <li key={entry.key} className="flex items-center gap-[0.3rem] py-[0.06rem]">
                  <span className="w-[2rem] shrink-0 text-right font-display text-[0.6rem] uppercase text-ink/25">
                    {entry.pick?.player.position ?? ''}
                  </span>
                  {entry.pick ? (
                    <span className="truncate text-[0.68rem] uppercase tracking-[0.02em] text-ink/55">
                      {entry.pick.player.name}
                    </span>
                  ) : (
                    <span className="text-[0.64rem] italic text-ink/12">vacío</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}


/** Six bench rows always, so every card keeps the same shape on the TV. */
function benchRows(roster: TeamRoster | undefined): { key: string; pick: TeamRoster['bench'][number] | null }[] {
  const filled = (roster?.bench ?? []).map((pick) => ({ key: pick.eventId, pick }));
  const slots = Math.max(roster?.benchSlots ?? 6, filled.length);
  return Array.from({ length: slots }, (_, index) => filled[index] ?? { key: `bench-${index}`, pick: null });
}
