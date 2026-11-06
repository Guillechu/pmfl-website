import type { DraftState } from '@/types/draft';
import { OnTheClockPanel } from '@/components/broadcast/OnTheClockPanel';
import { ClockPanel } from '@/components/broadcast/ClockPanel';
import { RecentPicksPanel } from '@/components/broadcast/RecentPicksPanel';
import { UpNextStrip } from '@/components/broadcast/UpNextStrip';
import { progress, recentPicks } from '@/core/selectors';

/** The default screen: who is picking, how long they have, what just happened. */
export function LiveScreen({ state }: { state: DraftState }) {
  const recent = recentPicks(state, 5);
  const { made, total } = progress(state);

  return (
    <div className="flex flex-1 flex-col gap-[1.1rem] p-[1.5rem]">
      <div className="grid flex-1 grid-cols-[1.55fr_1fr_1.1fr] gap-[1.1rem]">
        <OnTheClockPanel state={state} />
        <ClockPanel clock={state.clock} paused={state.phase === 'paused'} />
        <RecentPicksPanel picks={recent} />
      </div>
      <div className="h-[7rem] shrink-0">
        <UpNextStrip state={state} made={made} total={total} />
      </div>
    </div>
  );
}
