import { AnimatePresence, motion } from 'framer-motion';
import type { RevealState } from '@/state/uiState';
import { teamById } from '@/config/league';
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot';
import { NflTeamMark } from '@/components/player/NflTeamMark';
import { PositionBadge, POSITION_COLOR } from '@/components/player/PositionBadge';

/**
 * The moment of the broadcast: "THE PICK IS IN", then the player card.
 *
 * Timing is driven by the runtime, not by this component, so the announcer and
 * the sound effects stay locked to the same clock as the animation.
 */
export function PickReveal({ reveal }: { reveal: RevealState | null }) {
  return (
    <AnimatePresence>
      {reveal ? (
        <motion.div
          key={reveal.pick.eventId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-paper/97"
        >
          {reveal.stage === 'incoming' ? <IncomingCard /> : <PlayerCard reveal={reveal} />}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function IncomingCard() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.04, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      className="relative overflow-hidden px-[4rem] py-[2rem]"
    >
      <div className="relative text-center">
        <p className="font-display text-tv-md font-semibold uppercase tracking-[0.5em] text-gold-500">
          Jorkan League
        </p>
        <h1 className="headline mt-[0.6rem] text-tv-4xl leading-[0.9] text-ink">
          The Pick Is In
        </h1>
        <div className="rule-gold mx-auto mt-[1.2rem] w-[26rem]" />
      </div>
    </motion.div>
  );
}

function PlayerCard({ reveal }: { reveal: RevealState }) {
  const { pick } = reveal;
  const team = teamById(pick.fantasyTeamId);
  const accent = team?.accentColor ?? '#A67512';
  const positionColor = POSITION_COLOR[pick.player.position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex w-[86rem] items-stretch gap-[2.4rem] rounded-[0.6rem] border border-ink/12 bg-surface-900/90 p-[2rem] shadow-panel"
      style={{ boxShadow: `0 2rem 6rem -1rem #000, inset 0 0 0 1px ${accent}22` }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[0.6rem] opacity-40"
        style={{
          background: `radial-gradient(ellipse 60% 100% at 0% 50%, ${positionColor}33 0%, transparent 60%)`,
        }}
      />

      <PlayerHeadshot
        player={pick.player}
        accent={positionColor}
        className="relative h-[24rem] w-[19rem] shrink-0 border border-ink/10"
      />

      <div className="relative flex min-w-0 flex-1 flex-col justify-between py-[0.3rem]">
        <div>
          <div className="flex items-center gap-[0.8rem]">
            <span className="font-display text-tv-sm font-semibold uppercase tracking-[0.4em] text-gold-500">
              Round {pick.round} &middot; Pick {pick.pickInRound} &middot; Overall {pick.overallPick}
            </span>
          </div>
          <motion.h1
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="headline mt-[0.5rem] break-words text-tv-3xl leading-[0.88] text-ink"
          >
            {pick.player.name}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-[0.9rem] flex items-center gap-[1rem]"
          >
            <PositionBadge position={pick.player.position} className="px-[0.8rem] py-[0.3rem] text-tv-md" />
            <NflTeamMark
              abbr={pick.player.nflTeamAbbr}
              logoUrl={pick.player.teamLogoUrl}
              className="h-[3rem] w-[3rem]"
            />
            <span className="font-display text-tv-lg font-semibold uppercase tracking-[0.06em] text-ink/80">
              {pick.player.nflTeamName ?? pick.player.nflTeamAbbr ?? 'Free Agent'}
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-[1.4rem] rounded-[0.35rem] border-l-[0.28rem] bg-ink/[0.04] px-[1.2rem] py-[0.8rem]"
          style={{ borderLeftColor: accent }}
        >
          <p className="font-display text-tv-xs font-semibold uppercase tracking-[0.36em] text-ink/45">
            Selected by
          </p>
          <div className="mt-[0.24rem] flex items-baseline gap-[0.9rem]">
            <h2 className="headline text-tv-xl leading-none text-ink">{pick.fantasyTeamName}</h2>
            {pick.managerName ? (
              <span className="font-display text-tv-md uppercase tracking-[0.16em] text-ink/50">
                {pick.managerName}
              </span>
            ) : null}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
