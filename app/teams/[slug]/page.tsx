import { notFound } from "next/navigation";
import Link from "next/link";
import { teams, getTeam, getTeamRoster, schedule } from "@/lib/data";
import TeamMark from "@/components/TeamMark";
import GameCard from "@/components/GameCard";
import TeamRosterTable from "@/components/TeamRosterTable";

export function generateStaticParams() {
  return teams.map((t) => ({ slug: t.id }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const team = getTeam(params.slug);

  return {
    title: team ? `${team.name} · PMFL` : "Team · PMFL",
  };
}

export default function TeamDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const team = getTeam(params.slug);

  if (!team) notFound();

  const roster = getTeamRoster(team.id);

  const teamGames = schedule
    .filter(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );

  return (
    <div className="container-page py-10">
      <Link
        href="/teams"
        className="text-sm text-brand-gold-300 hover:text-brand-gold-500"
      >
        ← All teams
      </Link>

      <header className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/10 md:p-10">
        <div className="flex flex-col items-center gap-10 md:flex-row">
          <TeamMark
            team={team}
            className="h-20 w-20 shrink-0 scale-[1.4] object-contain md:h-20 md:w-20"
          />

          <div className="min-w-0 text-center md:text-left">
            <h1 className="h-display text-4xl leading-tight text-slate-950 md:text-6xl">
              {team.name}
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              {team.city}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-slate-700">
          {team.description}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Record"
            value={`${team.record.wins}-${team.record.losses}`}
          />

          <Stat
            label="Puntos a favor"
            value={team.stats.pointsFor}
          />

          <Stat
            label="Puntos en contra"
            value={team.stats.pointsAgainst}
          />
        </div>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="card space-y-3 p-6 text-sm">
          <h2 className="h-display mb-2 text-xl text-white">
            Club Info
          </h2>

          <Row
            label="Head Coach"
            value={team.headCoach || "Próximamente"}
          />

          <Row
            label="Offensive Coordinator"
            value={team.offensiveCoordinator || "Próximamente"}
          />

          <Row label="City" value={team.city} />
        </aside>

        <div>
          <div className="mb-3">
            <h2 className="h-display text-xl text-white">
              Roster
            </h2>
          </div>

          <TeamRosterTable roster={roster} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h-display mb-3 text-xl text-white">
          Schedule
        </h2>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teamGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>

      <div className="font-display text-2xl tabular-nums text-slate-950">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
      <span className="text-white/60">{label}</span>

      <span className="text-right font-medium text-white">
        {value}
      </span>
    </div>
  );
}
