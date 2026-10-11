import type { DraftState } from '@/types/draft';
import { LEAGUE } from '@/config/league';
import { draftBoard } from '@/core/selectors';
import { POSITION_COLOR } from '@/components/player/PositionBadge';
import { cn } from '@/lib/cn';

/** The full 15 x 12 draft board, one column per fantasy team. */
export function BoardScreen({ state }: { state: DraftState }) {
  const rows = draftBoard(state);

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-[1rem]">
      <div className="grid shrink-0 grid-cols-[3.2rem_repeat(12,minmax(0,1fr))] gap-[0.28rem] pb-[0.35rem]">
        <div />
        {LEAGUE.teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col items-center justify-center rounded-[0.22rem] px-[0.2rem] py-[0.32rem]"
            style={{ backgroundColor: team.accentColor, borderTop: `2px solid ${team.accentColor}` }}
          >
            <span className="font-display text-tv-sm font-bold uppercase leading-none text-paper">
              {team.abbrev}
            </span>
            <span className="mt-[0.1rem] truncate text-[0.6rem] uppercase tracking-[0.1em] text-paper/70">
              {team.manager.name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[0.28rem]">
        {rows.map((row) => (
          <div
            key={row[0]?.round}
            className="grid min-h-0 flex-1 grid-cols-[3.2rem_repeat(12,minmax(0,1fr))] gap-[0.28rem]"
          >
            <div className="flex items-center justify-center rounded-[0.2rem] bg-ink/[0.04]">
              <span className="tabular font-display text-tv-sm font-bold text-ink/55">
                {row[0]?.round}
              </span>
            </div>
            {row.map((cell) => (
              <BoardCellView key={cell.overallPick} cell={cell} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardCellView({ cell }: { cell: ReturnType<typeof draftBoard>[number][number] }) {
  const pick = cell.pick;
  const color = pick ? POSITION_COLOR[pick.player.position] : undefined;

  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col justify-center overflow-hidden rounded-[0.2rem] border px-[0.4rem] py-[0.18rem]',
        pick ? 'border-ink/8 bg-ink/[0.045]' : 'border-ink/5 bg-ink/[0.015]',
        cell.isCurrent && !pick && 'border-gold-500/70 bg-gold-500/10',
      )}
      style={pick ? { borderLeft: `0.18rem solid ${color}` } : undefined}
    >
      {pick ? (
        <>
          <span className="truncate font-display text-tv-xs font-semibold uppercase leading-tight tracking-[0.02em] text-ink/92">
            {pick.player.name}
          </span>
          <span className="truncate text-[0.6rem] uppercase tracking-[0.1em] text-ink/40">
            <span style={{ color }}>{pick.player.position}</span>
            {pick.player.nflTeamAbbr ? ` · ${pick.player.nflTeamAbbr}` : ''}
            {` · ${pick.overallPick}`}
          </span>
        </>
      ) : cell.isCurrent ? (
        <span className="animate-pulse-urgent text-center font-display text-tv-xs font-bold uppercase tracking-[0.18em] text-gold-600">
          On the clock
        </span>
      ) : (
        <span className="tabular text-center text-[0.62rem] text-ink/15">{cell.overallPick}</span>
      )}
    </div>
  );
}
