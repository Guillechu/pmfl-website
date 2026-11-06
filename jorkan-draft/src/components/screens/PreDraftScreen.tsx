import { motion } from 'framer-motion';
import { LEAGUE } from '@/config/league';
import { LeagueMark } from '@/components/broadcast/LeagueMark';
import { StartCountdown } from '@/components/broadcast/StartCountdown';
import { PreDraftAmbience } from '@/components/broadcast/PreDraftAmbience';

/**
 * Everything before ESPN starts.
 *
 * ARM PRESENTATION is not a start button: it unlocks browser audio, warms up
 * speech synthesis and lets us go fullscreen. ESPN still decides when the
 * draft begins.
 */
export function PreDraftScreen({
  armed,
  onArm,
}: {
  armed: boolean;
  onArm: () => void;
}) {
  return (
    <div className="relative flex flex-1 flex-col px-[3.4rem] pb-[2rem] pt-[1.2rem]">
      <PreDraftAmbience />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-1 flex-col items-center justify-center"
      >
        <LeagueMark size="lg" />

        <h1 className="headline mt-[1.6rem] text-center text-tv-4xl leading-[0.86] text-ink">
          Draft de Fantasy
          <br />
          Football {LEAGUE.season}
        </h1>

        <div className="rule-gold mt-[1.4rem] w-[42rem]" />

        <div className="mt-[1.5rem]">
          <StartCountdown />
        </div>

        {!armed ? (
          <div className="mt-[2.4rem] flex flex-col items-center">
            <motion.button
              type="button"
              onClick={onArm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              className="relative overflow-hidden rounded-[0.4rem] border border-gold-600 bg-gold-500 px-[3.8rem] py-[1.15rem] font-display text-tv-xl font-bold uppercase tracking-[0.26em] text-paper shadow-panel"
            >
              <span className="relative">Empezar</span>
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-[2.4rem] flex flex-col items-center"
          >
            <div className="flex items-center gap-[0.8rem]">
              <span className="h-[0.55rem] w-[0.55rem] animate-pulse-urgent rounded-full bg-gold-500" />
              <p className="font-display text-tv-lg font-semibold uppercase tracking-[0.34em] text-gold-500">
                Esperando el draft
              </p>
            </div>
            {/*
              This used to name the team configured in slot 1 as the one who
              would open the draft. ESPN owns the draft order, not our config,
              and naming a team here states as fact something we have not read
              from ESPN - so it says the pick and lets ESPN name the team.
            */}
            <p className="mt-[0.9rem] max-w-[52rem] text-center text-tv-sm leading-relaxed text-ink/45">
              Esto arranca solo en cuanto ESPN ponga al primer equipo en el reloj.
            </p>
          </motion.div>
        )}
      </motion.div>

      <DraftOrder />
    </div>
  );
}

function DraftOrder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mt-[1.4rem] shrink-0"
    >
      <p className="eyebrow mb-[0.7rem] text-center">Orden oficial del draft 2026</p>
      <ol className="grid grid-cols-12 gap-[0.5rem]">
        {LEAGUE.teams.map((team) => (
          <li
            key={team.id}
            className="panel flex flex-col items-center gap-[0.2rem] px-[0.4rem] py-[0.55rem] text-center"
          >
            <span
              className="tabular font-display text-tv-md font-bold leading-none"
              style={{ color: team.accentColor }}
            >
              {team.draftSlot}
            </span>
            <span className="line-clamp-2 font-display text-tv-xs font-semibold uppercase leading-tight tracking-[0.05em] text-ink/85">
              {team.name}
            </span>
            <span className="truncate text-[0.62rem] uppercase tracking-[0.14em] text-ink/35">
              {team.manager.name}
            </span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
