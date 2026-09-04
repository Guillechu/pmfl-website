import { motion, AnimatePresence } from 'framer-motion';
import { useDraft, useNow } from '@/state/hooks';
import { LEAGUE } from '@/config/league';

/**
 * Says when the draft is running and the feed is not keeping up.
 *
 * ESPN's public feed is read without a session, and it has never been seen
 * carrying a draft as it happens - a mock room of this league reported the
 * draft in progress while every pick slot stayed empty. If that is what
 * happens on the night, the presentation does not go blank: it names whoever
 * owns pick 1, puts them on the clock, and sits there looking perfectly alive
 * for four hours. A frozen screen that looks correct is worse than a broken
 * one, because nobody goes to fix it.
 *
 * So: a pick may take at most the league's own pick clock, and ESPN picks for
 * anyone who runs out of time. If that much time and half again passes with
 * no pick landing, the feed is not delivering, and it says so.
 */
const GRACE_MS = LEAGUE.pickSeconds * 1000 * 1.6;

export function FeedStalled() {
  const state = useDraft();
  const live = state.phase === 'in_progress';
  const now = useNow(live);

  // Since the last pick, or since the draft began when none has landed yet.
  const since = state.lastPickAt ?? state.startedAt;
  const stalled = live && since !== null && now - since > GRACE_MS;
  const minutes = since === null ? 0 : Math.floor((now - since) / 60_000);

  return (
    <AnimatePresence>
      {stalled ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="pointer-events-none absolute bottom-[1rem] left-[1rem] z-50 max-w-[30rem] rounded-[0.3rem] border border-alert-600 bg-alert-500 px-[1rem] py-[0.55rem] shadow-panel"
        >
          <p className="font-display text-tv-xs font-bold uppercase tracking-[0.22em] text-paper">
            Sin picks desde hace {minutes} min
          </p>
          <p className="mt-[0.25rem] text-[0.68rem] leading-snug text-paper/90">
            ESPN dice que el draft esta en curso pero no esta entregando los picks.
            Lo que se ve en pantalla puede estar congelado.
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
