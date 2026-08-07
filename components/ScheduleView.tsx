"use client";

// Vista del calendario: filtros por jornada y equipo + agrupación por
// jornada. Recibe los partidos ya normalizados (lib/match.ts), así que
// funciona igual con los datos de Cloob que con el JSON de respaldo.

import { useMemo, useState } from "react";
import MatchCard from "@/components/MatchCard";
import EmptyState from "@/components/ui/EmptyState";
import type { UiGame } from "@/lib/match";
import { groupByWeek } from "@/lib/match";

const SELECT_CLASS =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50";

export default function ScheduleView({ games }: { games: UiGame[] }) {
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);

  // Jornadas y equipos disponibles se derivan de los propios partidos:
  // así el filtro nunca ofrece opciones vacías.
  const weeks = useMemo(
    () =>
      [...new Set(games.map((g) => g.week).filter((w): w is number => w !== null))].sort(
        (a, b) => a - b,
      ),
    [games],
  );

  const teamNames = useMemo(() => {
    const names = new Set<string>();
    for (const g of games) {
      names.add(g.home.team?.name ?? g.home.name);
      names.add(g.away.team?.name ?? g.away.name);
    }
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  }, [games]);

  const hasPlayoffs = useMemo(() => games.some((g) => g.week === null), [games]);

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (weekFilter === "playoffs") {
        if (g.week !== null) return false;
      } else if (weekFilter !== "all" && g.week !== Number(weekFilter)) {
        return false;
      }
      if (teamFilter !== "all") {
        const home = g.home.team?.name ?? g.home.name;
        const away = g.away.team?.name ?? g.away.name;
        if (home !== teamFilter && away !== teamFilter) return false;
      }
      if (onlyUpcoming && g.state === "final") return false;
      return true;
    });
  }, [games, weekFilter, teamFilter, onlyUpcoming]);

  const grouped = useMemo(() => groupByWeek(filtered), [filtered]);

  return (
    <>
      <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrar por jornada"
        >
          <option value="all">Todas las jornadas</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              Jornada {w}
            </option>
          ))}
          {hasPlayoffs && <option value="playoffs">Playoffs y Final</option>}
        </select>

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrar por equipo"
        >
          <option value="all">Todos los equipos</option>
          {teamNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70 sm:ml-auto">
          <input
            type="checkbox"
            checked={onlyUpcoming}
            onChange={(e) => setOnlyUpcoming(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-brand-red"
          />
          Solo por jugar
        </label>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          title="No hay partidos que coincidan"
          description="Prueba con otra jornada o equipo."
        />
      ) : (
        <div className="space-y-10">
          {grouped.map(([week, list]) => (
            <section key={week ?? "playoffs"}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="h-display text-2xl text-white">
                  {week === null ? "Playoffs y Gran Final" : `Jornada ${week}`}
                </h2>
                <span className="text-xs text-white/50">
                  {list.length} {list.length === 1 ? "partido" : "partidos"}
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {list.map((g) => (
                  <MatchCard key={g.id} game={g} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
