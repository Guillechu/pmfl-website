import { notFound } from "next/navigation";
import Link from "next/link";
import { teams, getTeam, getTeamRoster, schedule } from "@/lib/data";
import TeamMark from "@/components/TeamMark";
import GameCard from "@/components/GameCard";
import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import type { Player } from "@/lib/types";

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

  const rosterCols: ColumnDef<Player>[] = [
    {
      key: "number",
      label: "#",
      align: "center",
      sortable: true,
      sortValue: (p) => p.number,
      className: "w-12",
    },
    {
      key: "name",
      label: "Player",
      sortable: true,
      sortValue: (p) => p.name,
    },
    {
      key: "position",
      label: "Pos",
      sortable: true,
      sortValue: (p) => p.position,
      align: "center",
    },
    {
      key: "height",
      label: "HT",
      align: "center",
    },
    {
      key: "weight",
      label: "WT",
      align: "center",
      render: (p) => `${p.weight} lbs`,
    },
    {
      key: "age",
      label: "Age",
      align: "center",
      sortable: true,
      sortValue: (p) => p.age,
    },
  ];

  return (
    <div className="container-page py-10">
      <Link
        href="/teams"
        className="text-sm text-brand-gold-300 hover:text-brand-gold-500"
      >
        ← All teams
      </Link>

      <header
        className="mt-4 rounded-2xl border border-white/10 p-6 md:p-10 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor} 0%, #03080F 80%)`,
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-10">
          <TeamMark
            team={team}
            className="h-20 w-20 md:h-20 md:w-20 shrink-0 scale-[1.4] object-contain"
          />

          <div className="min-w-0 text-center md:text-left">
            <h1 className="h-display text-4xl md:text-6xl text-white leading-tight">
              {team.name}
            </h1>

            <p className="text-white/75 mt-2 text-lg">
              {team.city}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-white/85">
          {team.description}
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            label="Record"
            value={`${team.record.wins}-${team.record.losses}`}
          />

          <Stat
            label="Points For"
            value={team.stats.pointsFor}
          />

          <Stat
            label="Points Against"
            value={team.stats.pointsAgainst}
          />
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_2fr] gap-6 mt-8">
        <aside className="card p-6 space-y-3 text-sm">
          <h2 className="h-display text-xl text-white mb-2">
            Club Info
          </h2>

          <Row
            label="Head Coach"
            value={team.headCoach || "Próximamente"}
          />

          <Row label="City" value={team.city} />
        </aside>

        <div>
          <h2 className="h-display text-xl text-white mb-3">
            Roster
          </h2>

          {roster.length > 0 ? (
            <StatsTable
              columns={rosterCols}
              rows={roster}
              initialSort={{ key: "number", dir: "asc" }}
              emptyText="No roster on file."
            />
          ) : (
            <div className="card p-10 text-center">
              <h3 className="text-2xl font-black text-white">
                Roster próximamente
              </h3>

              <p className="mt-3 text-white/60">
                El roster oficial será anunciado antes del
                inicio de la temporada 2026.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h-display text-xl text-white mb-3">
          Schedule
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
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
    <div className="rounded-lg bg-black/30 border border-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-widest text-white/60">
        {label}
      </div>

      <div className="font-display text-2xl text-white tabular-nums">
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

      <span className="text-white font-medium text-right">
        {value}
      </span>
    </div>
  );
}