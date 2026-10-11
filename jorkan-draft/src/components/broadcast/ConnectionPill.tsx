import type { SyncStatus } from '@/types/sync';
import { cn } from '@/lib/cn';

const LABEL: Record<SyncStatus['connection'], string> = {
  connected: 'ESPN SYNCED',
  connecting: 'CONNECTING',
  stale: 'ESPN STALE',
  disconnected: 'NO ESPN LINK',
};

const TONE: Record<SyncStatus['connection'], string> = {
  connected: 'text-emerald-800 border-emerald-700/30 bg-emerald-700/[0.08]',
  connecting: 'text-volt-600 border-volt-500/40 bg-volt-500/10',
  stale: 'text-gold-600 border-gold-500/40 bg-gold-500/10',
  disconnected: 'text-alert-500 border-alert-500/40 bg-alert-500/10',
};

export function ConnectionPill({ status, className }: { status: SyncStatus; className?: string }) {
  const simulated = status.provider === 'simulator';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[0.4rem] rounded-full border px-[0.7rem] py-[0.22rem]',
        simulated ? 'border-volt-400/40 bg-volt-500/10 text-volt-600' : TONE[status.connection],
        className,
      )}
    >
      <span
        className={cn(
          'h-[0.42rem] w-[0.42rem] rounded-full bg-current',
          status.connection === 'connected' || simulated ? '' : 'animate-pulse-urgent',
        )}
      />
      <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.22em]">
        {simulated ? 'SIMULATOR' : LABEL[status.connection]}
      </span>
    </div>
  );
}
