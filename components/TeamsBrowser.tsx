"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/lib/types";
import TeamCard, { type LiveTeamRecord } from "./TeamCard";
import EmptyState from "./ui/EmptyState";

/**
 * Buscador + rejilla de equipos. Vive aparte de la página porque la
 * página es un Server Component (necesita pedirle el récord a Cloob) y
 * el filtro de búsqueda necesita estado en el navegador.
 */
export default function TeamsBrowser({
  teams,
  live,
}: {
  teams: Team[];
  live: Record<string, LiveTeamRecord>;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      if (q.trim()) {
        const needle = q.toLowerCase();
        if (
          !t.name.toLowerCase().includes(needle) &&
          !t.city.toLowerCase().includes(needle) &&
          !t.abbreviation.toLowerCase().includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [q, teams]);

  return (
    <>
      <div className="card p-4 mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white bg-brand-red px-4 py-2 rounded-full">
            Equipos
          </span>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar equipos..."
          className="md:w-72 rounded-md bg-brand-navy/[0.04] dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 px-3 py-2 text-sm text-brand-navy dark:text-white placeholder-brand-navy/40 dark:placeholder-white/40 outline-none focus:border-brand-gold/50"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No se encontraron equipos"
          description="Intenta borrar la búsqueda o escribir otro nombre."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TeamCard key={t.id} team={t} live={live[t.id]} />
          ))}
        </div>
      )}
    </>
  );
}
