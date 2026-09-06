import { AnimatePresence, motion } from 'framer-motion';
import type { DraftPick } from '@/types/draft';
import { PositionBadge } from '@/components/player/PositionBadge';
import { NflTeamMark } from '@/components/player/NflTeamMark';
import { teamById } from '@/config/league';

/** The last handful of selections, newest first. */
export function RecentPicksPanel({ picks }: { picks: readonly DraftPick[] }) {
  return (
    <section className="panel flex h-full flex-col overflow-hidden px-[1.1rem] py-[1rem]">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Últimos picks</span>
        <span className="font-display text-tv-xs uppercase tracking-[0.24em] text-ink/35">
          {picks.length > 0 ? 'Live' : 'Todavía no hay picks'}
        </span>
      </div>

      <ul className="mt-[0.7rem] flex flex-1 flex-col gap-[0.42rem]">
        <AnimatePresence initial={false}>
          {picks.map((pick, index) => (
            <motion.li
              key={pick.eventId}
              layout
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: index === 0 ? 1 : 0.86 - index * 0.1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-[0.6rem] rounded-[0.28rem] border border-ink/5 bg-ink/[0.03] px-[0.6rem] py-[0.38rem]"
            >
              <span className="tabular w-[2.6rem] shrink-0 font-display text-tv-sm font-semibold text-gold-500">
                {pick.round}.{String(pick.pickInRound).padStart(2, '0')}
              </span>
              <PositionBadge position={pick.player.position} className="w-[2.1rem] py-[0.16rem] text-tv-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-tv-sm font-semibold uppercase tracking-[0.03em] text-ink">
                  {pick.player.name}
                </p>
                <p className="truncate text-tv-xs uppercase tracking-[0.14em] text-ink/40">
                  {teamById(pick.fantasyTeamId)?.abbrev ?? ''} &middot; {pick.fantasyTeamName}
                </p>
              </div>
              <NflTeamMark
                abbr={pick.player.nflTeamAbbr}
                logoUrl={pick.player.teamLogoUrl}
                className="h-[1.5rem] w-[1.5rem] text-tv-xs"
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
