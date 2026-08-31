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
          className="pointer-events-none absolute inset-x-0 top-[5.4rem] z-30"
        >
          <div className="relative overflow-hidden border-y border-gold-500/40 bg-pitch-900/96 px-[2.6rem] py-[0.55rem] shadow-glow">
            <div className="absolute inset-0 -translate-x-full animate-sheen bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="relative flex items-baseline justify-center gap-[0.9rem]">
              <span className="font-display text-tv-sm font-semibold uppercase tracking-[0.34em] text-gold-500">
                Round
              </span>
              <span className="headline tabular text-tv-xl text-white">{round}</span>
              <span className="font-display text-tv-sm uppercase tracking-[0.28em] text-white/40">
                of {LEAGUE.rounds}
              </span>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
