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
      key: "photo",
      label: "Foto",
      align: "center",
      className: "w-20",
      render: (p) =>
        p.photo ? (
          <img
            src={p.photo}
            alt={p.name}
            className="mx-auto h-12 w-12 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-bold text-white/50"
            aria-label={`Foto de ${p.name} no disponible`}
          >
            {p.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </div>
        ),
    },
    {
      key: "number",
      label: "N.º",
      align: "center",
      sortable: true,
      sortValue: (p) => p.number,
      className: "w-16",
    },
    {
      key: "name",
      label: "Jugador",
      sortable: true,
      sortValue: (p) => p.name,
    },
    {
      key: "position",
      label: "Posición",
      sortable: true,
      sortValue: (p) => p.position,
      align: "center",
      render: (p) => p.position === "TBD" ? "Por definir" : p.position,
    },
    {
      key: "height",
      label: "Estatura",
      align: "center",
    },
    {
      key: "weight",
      label: "Peso",
      align: "center",
      render: (p) => `${p.weight} lb`,
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
          <div className="mb-3">
            <h2 className="h-display text-xl text-white">
              Roster
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Jugadores ordenados por número de jersey.
            </p>
          </div>

          <StatsTable
            columns={rosterCols}
            rows={roster}
            initialSort={{ key: "number", dir: "asc" }}
            emptyText="El roster oficial de este equipo se publicará próximamente."
          />
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
