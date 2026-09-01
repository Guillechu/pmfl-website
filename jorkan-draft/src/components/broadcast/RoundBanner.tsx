import { AnimatePresence, motion } from 'framer-motion';
import { LEAGUE } from '@/config/league';

/** Brief full-width banner when ESPN turns the snake into a new round. */
export function RoundBanner({ round }: { round: number | null }) {
  return (
    <AnimatePresence>
      {round !== null ? (
        <motion.div
          key={round}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-x-0 top-[6.2rem] z-30 flex justify-center"
        >
          {/*
            Solid, and only as wide as its own words. It used to be a
            full-width band whose white showed the clock straight through it,
            so the round and the countdown fought each other in the middle of
            the screen. A small opaque chyron cannot do that.
          */}
          <div className="flex items-baseline gap-[0.8rem] rounded-[0.3rem] bg-ink px-[1.8rem] py-[0.5rem] shadow-panel">
            <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.34em] text-gold-300">
              Round
            </span>
            <span className="headline tabular text-tv-lg text-paper">{round}</span>
            <span className="font-display text-tv-xs uppercase tracking-[0.28em] text-paper/50">
              of {LEAGUE.rounds}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
