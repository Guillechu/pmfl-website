"use client";

import Link from "next/link";
import { standings, teamWinPct } from "@/lib/data";
import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import type { Team } from "@/lib/types";

export default function RankingsPage() {
  const rankedTeams = standings();

  const teamCols: ColumnDef<Team>[] = [
    {
      key: "rank",
      label: "#",
      align: "center",
      className: "w-12",
      render: (team) => rankedTeams.findIndex((item) => item.id === team.id) + 1,
    },
    {
      key: "name",
      label: "Equipo",
      sortable: true,
      sortValue: (team) => team.name,
      render: (team) => (
        <Link
          href={`/teams/${team.id}`}
          className="font-medium text-white hover:text-brand-gold-300"
        >
          {team.name}
        </Link>
      ),
    },
    {
      key: "wins",
      label: "G",
      align: "center",
      sortable: true,
      sortValue: (team) => team.record.wins,
      render: (team) => team.record.wins,
    },
    {
      key: "losses",
      label: "P",
      align: "center",
      sortable: true,
      sortValue: (team) => team.record.losses,
      render: (team) => team.record.losses,
    },
    {
      key: "pct",
      label: "Porcentaje",
      align: "right",
      sortable: true,
      sortValue: (team) => teamWinPct(team),
      render: (team) => teamWinPct(team).toFixed(3),
    },
  ];

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">
          Temporada 2026
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-white">
          Rankings
        </h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Clasificación oficial de los equipos de la PMFL.
        </p>
      </header>

      <StatsTable
        columns={teamCols}
        rows={rankedTeams}
        initialSort={{ key: "pct", dir: "desc" }}
        emptyText="Los rankings estarán disponibles próximamente."
      />
    </div>
  );
}
