import type { DraftState } from '@/types/draft';
import type { PresentationView } from '@/types/settings';
import type { SyncStatus } from '@/types/sync';
import { LEAGUE } from '@/config/league';
import { LeagueMark } from './LeagueMark';
import { ConnectionPill } from './ConnectionPill';
import { cn } from '@/lib/cn';

const VIEWS: { id: PresentationView; label: string; key: string }[] = [
  { id: 'live', label: 'Live', key: '1' },
  { id: 'board', label: 'Board', key: '2' },
  { id: 'rosters', label: 'Rosters', key: '3' },
];

export function HeaderBar({
  state,
  status,
  view,
  onViewChange,
}: {
  state: DraftState;
  status: SyncStatus;
  view: PresentationView;
  onViewChange: (view: PresentationView) => void;
}) {
  return (
    <header className="flex h-[5.4rem] shrink-0 items-center justify-between border-b border-white/10 bg-pitch-900/70 px-[1.6rem] backdrop-blur">
      <LeagueMark />

      <div className="flex items-center gap-[2.4rem]">
        <Stat label="Round" value={`${state.round}`} sub={`of ${LEAGUE.rounds}`} />
        <Divider />
        <Stat label="Pick" value={`${state.pickInRound}`} sub={`of ${LEAGUE.teamCount}`} />
        <Divider />
        <Stat label="Overall" value={`${state.overallPick}`} sub={`of ${LEAGUE.rounds * LEAGUE.teamCount}`} accent />
      </div>

      <div className="flex items-center gap-[1rem]">
        <nav className="flex items-center gap-[0.3rem] rounded-full border border-white/10 bg-white/[0.04] p-[0.2rem]">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'rounded-full px-[0.85rem] py-[0.28rem] font-display text-tv-xs font-semibold uppercase tracking-[0.2em] transition-colors',
                view === item.id
                  ? 'bg-gold-500 text-pitch-950'
                  : 'text-white/55 hover:text-white',
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <ConnectionPill status={status} />
      </div>
    </header>
  );
}

function Divider() {
  return <span className="h-[2.2rem] w-px bg-white/10" />;
}

function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.3em] text-white/40">
        {label}
      </span>
      <div className="mt-[0.22rem] flex items-baseline gap-[0.3rem]">
        <span
          className={cn('tabular headline text-tv-lg', accent ? 'text-gold-500' : 'text-white')}
        >
          {value}
        </span>
        {sub ? <span className="text-tv-xs text-white/35">{sub}</span> : null}
      </div>
    </div>
  );
}
