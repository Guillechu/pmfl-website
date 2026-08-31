import { LEAGUE, TOTAL_PICKS } from '@/config/league';

/** Phase 1 scaffold check: config, types, Tailwind tokens and fonts render. */
export default function App() {
  return (
    <div className="h-full w-full overflow-hidden bg-pitch-950 bg-field-glow p-[2rem]">
      <p className="eyebrow">{LEAGUE.name}</p>
      <h1 className="headline text-tv-3xl text-white">
        {LEAGUE.season} Fantasy Football Draft
      </h1>
      <div className="rule-gold my-[1rem]" />
      <p className="text-tv-md text-white/70 tabular">
        {LEAGUE.teamCount} teams &middot; {LEAGUE.rounds} rounds &middot; {TOTAL_PICKS} picks
      </p>
      <ol className="mt-[1.5rem] grid grid-cols-4 gap-[0.75rem]">
        {LEAGUE.teams.map((team) => (
          <li key={team.id} className="panel p-[0.75rem]">
            <div className="flex items-baseline gap-[0.5rem]">
              <span className="headline text-tv-md tabular" style={{ color: team.accentColor }}>
                {String(team.draftSlot).padStart(2, '0')}
              </span>
              <span className="headline text-tv-sm text-white">{team.name}</span>
            </div>
            <p className="text-tv-xs uppercase tracking-[0.2em] text-white/45">
              {team.manager.name}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
