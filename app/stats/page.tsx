"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { teams, players, getTeam, standings, teamWinPct } from "@/lib/data";
import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import type { Player, Team, Position } from "@/lib/types";

type Tab = "team" | "passing" | "rushing" | "receiving" | "tackles" | "interceptions";

const TABS: { id: Tab; label: string }[] = [
  { id: "team",          label: "Team Rankings" },
  { id: "passing",       label: "Passing" },
  { id: "rushing",       label: "Rushing" },
  { id: "receiving",     label: "Receiving" },
  { id: "tackles",       label: "Tackles" },
  { id: "interceptions", label: "Interceptions" },
];

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("team");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");

  const teamCols: ColumnDef<Team>[] = [
    { key: "rank", label: "#", align: "center", className: "w-10",
      render: (t) => standings().findIndex((s) => s.id === t.id) + 1 },
    { key: "name", label: "Team", sortable: true,
      render: (t) => (
        <Link href={`/teams/${t.id}`} className="font-medium text-white hover:text-brand-gold-300">
          {t.name}
        </Link>
      ),
      sortValue: (t) => t.name },
    { key: "conference", label: "Conf", sortable: true, sortValue: (t) => t.conference },
    { key: "wins", label: "W", align: "center", sortable: true, sortValue: (t) => t.record.wins, render: (t) => t.record.wins },
    { key: "losses", label: "L", align: "center", sortable: true, sortValue: (t) => t.record.losses, render: (t) => t.record.losses },
    { key: "pct", label: "PCT", align: "right", sortable: true, sortValue: (t) => teamWinPct(t),
      render: (t) => teamWinPct(t).toFixed(3) },
    { key: "pf", label: "PF", align: "right", sortable: true, sortValue: (t) => t.stats.pointsFor, render: (t) => t.stats.pointsFor },
    { key: "pa", label: "PA", align: "right", sortable: true, sortValue: (t) => t.stats.pointsAgainst, render: (t) => t.stats.pointsAgainst },
    { key: "ypg", label: "Yds/G", align: "right", sortable: true, sortValue: (t) => t.stats.yardsPerGame, render: (t) => t.stats.yardsPerGame },
    { key: "to", label: "TO Diff", align: "right", sortable: true, sortValue: (t) => t.stats.turnoverDiff,
      render: (t) => t.stats.turnoverDiff > 0 ? `+${t.stats.turnoverDiff}` : t.stats.turnoverDiff },
  ];

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (teamFilter !== "all" && p.teamId !== teamFilter) return false;
      if (positionFilter !== "all" && p.position !== positionFilter) return false;
      return true;
    });
  }, [teamFilter, positionFilter]);

  const playerCommonCols: ColumnDef<Player>[] = [
    { key: "name", label: "Player", sortable: true, sortValue: (p) => p.name,
      render: (p) => (
        <Link href={`/teams/${p.teamId}`} className="font-medium text-white hover:text-brand-gold-300">
          #{p.number} {p.name}
        </Link>
      ) },
    { key: "team", label: "Team",
      render: (p) => getTeam(p.teamId)?.abbreviation ?? "—",
      sortable: true, sortValue: (p) => getTeam(p.teamId)?.abbreviation ?? "" },
    { key: "position", label: "Pos", align: "center", sortable: true, sortValue: (p) => p.position },
  ];

  const statCols: Record<Exclude<Tab, "team">, ColumnDef<Player>[]> = {
    passing: [
      ...playerCommonCols,
      { key: "passingYards", label: "YDS", align: "right", sortable: true, sortValue: (p) => p.stats.passingYards ?? 0, render: (p) => p.stats.passingYards ?? "—" },
      { key: "passingTDs", label: "TD", align: "right", sortable: true, sortValue: (p) => p.stats.passingTDs ?? 0, render: (p) => p.stats.passingTDs ?? "—" },
      { key: "interceptions", label: "INT", align: "right", sortable: true, sortValue: (p) => p.stats.interceptions ?? 0, render: (p) => p.stats.interceptions ?? "—" },
    ],
    rushing: [
      ...playerCommonCols,
      { key: "rushingYards", label: "YDS", align: "right", sortable: true, sortValue: (p) => p.stats.rushingYards ?? 0, render: (p) => p.stats.rushingYards ?? "—" },
      { key: "rushingTDs", label: "TD", align: "right", sortable: true, sortValue: (p) => p.stats.rushingTDs ?? 0, render: (p) => p.stats.rushingTDs ?? "—" },
    ],
    receiving: [
      ...playerCommonCols,
      { key: "receivingYards", label: "YDS", align: "right", sortable: true, sortValue: (p) => p.stats.receivingYards ?? 0, render: (p) => p.stats.receivingYards ?? "—" },
      { key: "receptions", label: "REC", align: "right", sortable: true, sortValue: (p) => p.stats.receptions ?? 0, render: (p) => p.stats.receptions ?? "—" },
      { key: "receivingTDs", label: "TD", align: "right", sortable: true, sortValue: (p) => p.stats.receivingTDs ?? 0, render: (p) => p.stats.receivingTDs ?? "—" },
    ],
    tackles: [
      ...playerCommonCols,
      { key: "tackles", label: "TKL", align: "right", sortable: true, sortValue: (p) => p.stats.tackles ?? 0, render: (p) => p.stats.tackles ?? "—" },
      { key: "sacks", label: "SACK", align: "right", sortable: true, sortValue: (p) => p.stats.sacks ?? 0, render: (p) => p.stats.sacks ?? "—" },
    ],
    interceptions: [
      ...playerCommonCols,
      { key: "ints", label: "INT", align: "right", sortable: true, sortValue: (p) => p.stats.ints ?? 0, render: (p) => p.stats.ints ?? "—" },
      { key: "passDeflections", label: "PD", align: "right", sortable: true, sortValue: (p) => p.stats.passDeflections ?? 0, render: (p) => p.stats.passDeflections ?? "—" },
    ],
  };

  // Filter by stat relevance for player tabs
  const playerRows = useMemo(() => {
    if (tab === "team") return [] as Player[];
    const map: Record<Exclude<Tab, "team">, (p: Player) => boolean> = {
      passing:       (p) => (p.stats.passingYards ?? 0) > 0,
      rushing:       (p) => (p.stats.rushingYards ?? 0) > 0,
      receiving:     (p) => (p.stats.receivingYards ?? 0) > 0,
      tackles:       (p) => (p.stats.tackles ?? 0) > 0,
      interceptions: (p) => (p.stats.ints ?? 0) > 0,
    };
    return filteredPlayers.filter(map[tab]);
  }, [tab, filteredPlayers]);

  const allPositions: Position[] = ["QB", "RB", "WR", "TE", "OL", "DL", "DE", "LB", "CB", "S"];

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">2026 Season</p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Stats &amp; Rankings</h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Sortable team standings and individual leaders across the major statistical categories.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "rounded-full px-4 py-1.5 text-sm transition-colors " +
              (tab === t.id
                ? "bg-brand-red text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "team" && (
        <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
          >
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
          >
            <option value="all">All positions</option>
            {allPositions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {tab === "team" ? (
        <StatsTable
          columns={teamCols}
          rows={standings()}
          initialSort={{ key: "pct", dir: "desc" }}
        />
      ) : (
        <StatsTable
          columns={statCols[tab]}
          rows={playerRows}
          initialSort={{
            key:
              tab === "passing" ? "passingYards"
              : tab === "rushing" ? "rushingYards"
              : tab === "receiving" ? "receivingYards"
              : tab === "tackles" ? "tackles"
              : "ints",
            dir: "desc",
          }}
          emptyText="No players match the current filters."
        />
      )}
    </div>
  );
}
