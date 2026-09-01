import { motion } from 'framer-motion';
import type { DraftState } from '@/types/draft';
import { teamById } from '@/config/league';
import { picksByTeam, rostersByTeam } from '@/core/selectors';
import { POSITION_COLOR } from '@/components/player/PositionBadge';
import { cn } from '@/lib/cn';

/**
 * Who ESPN says is picking. The single most important thing on the screen
 * after the clock.
 */
export function OnTheClockPanel({ state }: { state: DraftState }) {
  const team = teamById(state.onTheClock?.fantasyTeamId);
  const accent = team?.accentColor ?? '#A67512';
  const name = state.onTheClock?.fantasyTeamName ?? 'Waiting for ESPN';
  const manager = state.onTheClock?.managerName;

  return (
    <section className="panel relative flex h-full flex-col gap-[1.4rem] overflow-hidden px-[1.6rem] py-[1.2rem]">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[0.32rem]"
        style={{ backgroundColor: accent }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[46%] opacity-[0.10]"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)` }}
      />

      <div className="relative flex items-center justify-between">
        {state.phase === 'paused' ? (
          <span className="eyebrow animate-pulse-urgent text-gold-600">Draft paused by ESPN</span>
        ) : (
          <span className="eyebrow">On the Clock</span>
        )}
        <div className="flex items-baseline gap-[0.55rem] font-display uppercase tracking-[0.2em]">
          <span className="text-tv-xs text-ink/45">Pick</span>
          <span className="tabular text-tv-md font-bold text-ink">
            {state.round}.{String(state.pickInRound).padStart(2, '0')}
          </span>
          <span className="text-tv-xs text-ink/45">Overall</span>
          <span className="tabular text-tv-md font-bold text-gold-500">{state.overallPick}</span>
        </div>
      </div>

      {/* Remount-on-key rather than AnimatePresence: an exit-then-enter queue
          can stall on a burst of picks, and this panel must never be blank. */}
      <motion.div
        key={state.onTheClock?.fantasyTeamId ?? 'none'}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex-1 flex items-center"
      >
        <div className="flex items-center gap-[1rem]">
            {team ? (
              <div
                className="flex h-[4.2rem] w-[4.2rem] shrink-0 items-center justify-center rounded-[0.35rem] font-display text-tv-lg font-bold"
                style={{ backgroundColor: accent, color: '#FFFFFF', border: `1px solid ${accent}` }}
              >
                {team.abbrev}
              </div>
            ) : null}
            <div className="min-w-0">
              <h2
                className={cn(
                  'headline line-clamp-2 leading-[0.92] text-ink',
                  name.length > 26 ? 'text-tv-xl' : name.length > 18 ? 'text-tv-2xl' : 'text-tv-3xl',
                )}
              >
                {name}
              </h2>
              {manager ? (
                <p className="mt-[0.2rem] font-display text-tv-md font-medium uppercase tracking-[0.16em] text-ink/55">
                  {manager}
                </p>
              ) : null}
            </div>
          </div>
      </motion.div>

      <RosterSoFar state={state} accent={accent} />
    </section>
  );
}


/**
 * What the team on the clock already has. Keeps the panel informative between
 * picks and shows the room what the manager still needs.
 */
function RosterSoFar({ state, accent }: { state: DraftState; accent: string }) {
  const teamId = state.onTheClock?.fantasyTeamId;
  if (!teamId) return null;
  const roster = rostersByTeam(state).get(teamId);
  const picks = picksByTeam(state).get(teamId) ?? [];
  if (!roster) return null;

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Roster so far</span>
        <span className="tabular font-display text-tv-xs uppercase tracking-[0.2em] text-ink/35">
          {picks.length} selected
        </span>
      </div>

      <div className="mt-[0.5rem] flex flex-wrap gap-[0.34rem]">
        {roster.starters.map((assignment) => (
          <span
            key={assignment.slot.id}
            className={cn(
              'flex items-center gap-[0.3rem] rounded-[0.2rem] border px-[0.5rem] py-[0.22rem] font-display text-tv-xs font-semibold uppercase tracking-[0.1em]',
              assignment.pick
                ? 'border-ink/10 bg-ink/[0.05] text-ink/85'
                : 'border-dashed border-ink/12 text-ink/25',
            )}
          >
            <span
              style={{
                color: assignment.pick
                  ? POSITION_COLOR[assignment.pick.player.position]
                  : 'rgba(22,34,47,0.25)',
              }}
            >
              {assignment.slot.label}
            </span>
            {assignment.pick ? (
              <span className="max-w-[9rem] truncate text-ink/80">
                {shortName(assignment.pick.player.name)}
              </span>
            ) : null}
          </span>
        ))}
        {roster.bench.length > 0 ? (
          <span
            className="rounded-[0.2rem] border px-[0.5rem] py-[0.22rem] font-display text-tv-xs font-semibold uppercase tracking-[0.1em]"
            style={{ borderColor: `${accent}55`, color: accent }}
          >
            Bench {roster.bench.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** "Ja'Marr Chase" -> "J. Chase" so a chip never wraps on the TV. */
function shortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  const first = parts[0] ?? '';
  return `${first.charAt(0)}. ${parts.slice(1).join(' ')}`;
}
