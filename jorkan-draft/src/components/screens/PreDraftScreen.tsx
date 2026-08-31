import { motion } from 'framer-motion';
import type { SyncStatus } from '@/types/sync';
import { LEAGUE } from '@/config/league';
import { LeagueMark } from '@/components/broadcast/LeagueMark';
import { cn } from '@/lib/cn';

/**
 * Everything before ESPN starts.
 *
 * ARM PRESENTATION is not a start button: it unlocks browser audio, warms up
 * speech synthesis and lets us go fullscreen. ESPN still decides when the
 * draft begins.
 */
export function PreDraftScreen({
  armed,
  status,
  onArm,
}: {
  armed: boolean;
  status: SyncStatus;
  onArm: () => void;
}) {
  const connected = status.connection === 'connected';

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-[4rem]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <LeagueMark size="lg" />

        <h1 className="headline mt-[1.6rem] text-center text-tv-4xl leading-[0.86] text-white">
          {LEAGUE.season} Fantasy
          <br />
          Football Draft
        </h1>

        <div className="rule-gold mt-[1.4rem] w-[42rem]" />

        <div className="mt-[1.6rem] flex items-center gap-[1.4rem]">
          <StatusChip
            label={connected ? 'Connected to ESPN' : 'Waiting for ESPN link'}
            tone={connected ? 'good' : 'idle'}
          />
          <StatusChip
            label={armed ? 'Presentation armed' : 'Presentation not armed'}
            tone={armed ? 'good' : 'idle'}
          />
          <StatusChip label="Waiting for ESPN draft" tone="pending" />
        </div>

        {!armed ? (
          <div className="mt-[2.4rem] flex flex-col items-center">
            <motion.button
              type="button"
              onClick={onArm}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
              className="relative overflow-hidden rounded-[0.4rem] border border-gold-500/60 bg-gold-500 px-[3.4rem] py-[1.05rem] font-display text-tv-lg font-bold uppercase tracking-[0.26em] text-pitch-950 shadow-glow"
            >
              <span className="absolute inset-0 -translate-x-full animate-sheen bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <span className="relative">Arm Presentation</span>
            </motion.button>
            <p className="mt-[1rem] max-w-[46rem] text-center text-tv-sm leading-relaxed text-white/45">
              This unlocks browser audio, warms up the announcer and allows fullscreen.
              It does not start the draft &mdash; ESPN does that.
            </p>
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
                Waiting for ESPN draft
              </p>
            </div>
            <p className="mt-[0.9rem] max-w-[52rem] text-center text-tv-sm leading-relaxed text-white/45">
              The presentation starts by itself the moment ESPN puts
              {' '}
              <span className="text-white/70">{LEAGUE.teams[0]?.name}</span>
              {' '}on the clock for pick 1.01.
            </p>
          </motion.div>
        )}
      </motion.div>

      <DraftOrder />
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'good' | 'idle' | 'pending' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-[0.5rem] rounded-full border px-[1rem] py-[0.3rem]',
        tone === 'good' && 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
        tone === 'idle' && 'border-white/15 bg-white/[0.04] text-white/50',
        tone === 'pending' && 'border-gold-500/40 bg-gold-500/10 text-gold-400',
      )}
    >
      <span className="h-[0.4rem] w-[0.4rem] rounded-full bg-current" />
      <span className="font-display text-tv-xs font-semibold uppercase tracking-[0.24em]">
        {label}
      </span>
    </div>
  );
}

function DraftOrder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-x-[3.4rem] bottom-[2.4rem]"
    >
      <p className="eyebrow mb-[0.7rem] text-center">Official 2026 Draft Order</p>
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
            <span className="line-clamp-2 font-display text-tv-xs font-semibold uppercase leading-tight tracking-[0.05em] text-white/85">
              {team.name}
            </span>
            <span className="truncate text-[0.62rem] uppercase tracking-[0.14em] text-white/35">
              {team.manager.name}
            </span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
