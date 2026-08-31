import { motion } from 'framer-motion';
import type { ClockState } from '@/types/draft';
import { displayedMs, formatClock, urgencyFor, type UrgencyLevel } from '@/core/clock';
import { useNow } from '@/state/hooks';
import { cn } from '@/lib/cn';

const TONE: Record<UrgencyLevel, { text: string; bar: string; ring: string; label: string }> = {
  normal: { text: 'text-white', bar: 'bg-volt-500', ring: 'shadow-glow-volt', label: 'text-white/50' },
  warn: { text: 'text-gold-400', bar: 'bg-gold-500', ring: 'shadow-glow', label: 'text-gold-400/70' },
  urgent: { text: 'text-gold-400', bar: 'bg-gold-400', ring: 'shadow-glow', label: 'text-gold-400/80' },
  critical: { text: 'text-alert-400', bar: 'bg-alert-500', ring: 'shadow-glow', label: 'text-alert-400' },
};

/**
 * The clock ESPN owns.
 *
 * We render ESPN's last reading, interpolated locally between updates purely
 * so the digits do not sit frozen. Nothing here can change the draft: when the
 * clock hits zero, whatever ESPN does next is what happens.
 */
export function ClockPanel({ clock, paused }: { clock: ClockState; paused: boolean }) {
  const now = useNow(clock.running);
  const ms = displayedMs(clock, now);
  const urgency = paused ? 'normal' : urgencyFor(ms);
  const tone = TONE[urgency];
  const ratio = ms === null ? 0 : Math.max(0, Math.min(1, ms / clock.totalMs));

  return (
    <section className="panel flex h-full flex-col justify-between overflow-hidden px-[1.4rem] py-[1.1rem]">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Time Remaining</span>
        {paused ? (
          <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
            Paused
          </span>
        ) : clock.source === 'unknown' ? (
          <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.24em] text-white/40">
            Waiting
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-center">
        <motion.div
          key={urgency}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className={cn(
            'headline tabular text-tv-4xl leading-none',
            tone.text,
            urgency === 'critical' && !paused && 'animate-pulse-urgent',
          )}
          style={{ textShadow: '0 0.15rem 1.6rem rgba(0,0,0,0.65)' }}
        >
          {formatClock(ms)}
        </motion.div>
      </div>

      <div className="relative h-[0.5rem] w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', tone.bar)}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ ease: 'linear', duration: 0.12 }}
        />
      </div>
    </section>
  );
}
