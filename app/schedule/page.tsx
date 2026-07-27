"use client";

import { useMemo, useState } from "react";
import { schedule, teams, gamesByWeek } from "@/lib/data";
import GameCard from "@/components/GameCard";
import EmptyState from "@/components/ui/EmptyState";

// Playoffs y Gran Final (equipos por clasificar) — no son partidos de datos.
const PLAYOFFS = [
  { label: "Semifinal", date: "Sábado 24 oct · 5:00 PM", home: "Clasificado 3", away: "Clasificado 2" },
  { label: "Semifinal", date: "Sábado 24 oct · 8:00 PM", home: "Clasificado 4", away: "Clasificado 1" },
  { label: "Gran Final", date: "Sábado 31 oct · 7:00 PM", home: "Ganador Semifinal 1", away: "Ganador Semifinal 2" },
];

export default function SchedulePage() {
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  const weeks = Object.keys(gamesByWeek())
    .map(Number)
    .sort((a, b) => a - b);

  const filtered = useMemo(() => {
    return schedule.filter((g) => {
      if (weekFilter !== "all" && g.week !== Number(weekFilter)) return false;
      if (teamFilter !== "all" && g.homeTeamId !== teamFilter && g.awayTeamId !== teamFilter) return false;
      return true;
    });
  }, [weekFilter, teamFilter]);

  // Group by week for display
  const grouped = useMemo(() => {
    const m = new Map<number, typeof filtered>();
    for (const g of filtered) {
      if (!m.has(g.week)) m.set(g.week, []);
      m.get(g.week)!.push(g);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [filtered]);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-300">Temporada 2026</p>
        <h1 className="h-display text-4xl md:text-5xl text-white">Calendario</h1>
        <p className="mt-2 text-white/70 max-w-2xl">
          Calendario completo de la temporada — filtra por semana o equipo para encontrar lo que buscas.
        </p>
      </header>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
        >
          <option value="all">Todas las semanas</option>
          {weeks.map((w) => <option key={w} value={w}>Semana {w}</option>)}
        </select>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/50"
        >
          <option value="all">Todos los equipos</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="No hay partidos que coincidan" description="Prueba con otra semana o equipo." />
      ) : (
        <div className="space-y-10">
          {grouped.map(([week, games]) => (
            <section key={week}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="h-display text-2xl text-white">Semana {week}</h2>
                <span className="text-xs text-white/50">
                  {games.length} {games.length === 1 ? "partido" : "partidos"}
                </span>
                {week === 2 && (
                  <span className="ml-auto text-xs text-brand-gold-300">
                    Sáb 28 ago · Semana de descanso (BYE)
                  </span>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {games.map((g) => <GameCard key={g.id} game={g} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Playoffs y Gran Final */}
      {(weekFilter === "all" || Number(weekFilter) >= 10) && teamFilter === "all" && (
        <section className="mt-12">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="h-display text-2xl text-white">Playoffs y Gran Final</h2>
            <span className="text-xs text-white/50">Por clasificar</span>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PLAYOFFS.map((p, i) => (
              <article key={i} className="card p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={
                      "pill " +
                      (p.label === "Gran Final"
                        ? "bg-brand-gold/20 text-brand-gold-300 ring-1 ring-brand-gold/40"
                        : "bg-white/10 text-white/80")
                    }
                  >
                    {p.label}
                  </span>
                  <span className="text-xs text-white/50">{p.date}</span>
                </div>
                <div className="mt-4 space-y-1 text-center">
                  <p className="font-display text-lg text-white">{p.away}</p>
                  <p className="text-xs text-white/40">vs</p>
                  <p className="font-display text-lg text-white">{p.home}</p>
                </div>
                <p className="mt-4 text-center text-xs text-white/50">
                  Estadio Emilio Royo
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
