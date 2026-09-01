import type { DraftState } from '@/types/draft';
import type { TeamRef } from '@/types/league';
import { teamById } from '@/config/league';
import { cn } from '@/lib/cn';

/** ON DECK / NEXT UP, plus how far through the draft we are. */
export function UpNextStrip({ state, made, total }: { state: DraftState; made: number; total: number }) {
  return (
    <div className="grid h-full grid-cols-[1.2fr_1fr] gap-[0.8rem]">
      <UpNextCard label="On Deck" team={state.onDeck} emphasis />
      <section className="panel flex flex-col justify-center gap-[0.5rem] px-[1.1rem] py-[0.7rem]">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Draft Progress</span>
          <span className="tabular font-display text-tv-md font-bold text-ink">
            {made}
            <span className="text-ink/40"> / {total}</span>
          </span>
        </div>
        <div className="h-[0.42rem] w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-500 transition-[width] duration-500"
            style={{ width: `${total === 0 ? 0 : (made / total) * 100}%` }}
          />
        </div>
        <div className="font-display text-tv-xs uppercase tracking-[0.2em] text-ink/40">
          {total - made} picks remaining
        </div>
      </section>
    </div>
  );
}

function UpNextCard({
  label,
  team,
  emphasis = false,
}: {
  label: string;
  team: TeamRef | null;
  emphasis?: boolean;
}) {
  const config = teamById(team?.fantasyTeamId);
  const accent = config?.accentColor ?? 'rgba(22,34,47,0.35)';
  return (
    <section
      className={cn(
        'panel relative flex flex-col justify-center overflow-hidden px-[1.1rem] py-[0.7rem]',
        emphasis && 'border-ink/15',
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[0.2rem]"
        style={{ backgroundColor: accent, opacity: emphasis ? 1 : 0.55 }}
      />
      <span className="eyebrow">{label}</span>
      <div className="mt-[0.28rem] flex items-center gap-[0.6rem]">
        {config ? (
          <span
            className="flex h-[2.1rem] w-[2.1rem] shrink-0 items-center justify-center rounded-[0.25rem] font-display text-tv-sm font-bold"
            style={{ backgroundColor: accent, color: '#FFFFFF' }}
          >
            {config.abbrev}
          </span>
        ) : null}
        <div className="min-w-0">
          <p
            className={cn(
              'truncate font-display font-bold uppercase leading-none text-ink',
              emphasis ? 'text-tv-lg' : 'text-tv-md',
            )}
          >
            {team?.fantasyTeamName ?? '--'}
          </p>
          {team?.managerName ? (
            <p className="truncate text-tv-xs uppercase tracking-[0.18em] text-ink/40">
              {team.managerName}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
