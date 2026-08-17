"use client";

import { useMemo, useState } from "react";
import { teams } from "@/lib/data";
import TeamCard from "@/components/TeamCard";
import EmptyState from "@/components/ui/EmptyState";

export default function TeamsPage() {
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
  }, [q]);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
          Liga
        </p>
        <h1 className="h-display text-4xl md:text-5xl text-brand-navy dark:text-white">
          Equipos
        </h1>
        <p className="mt-2 text-brand-navy/70 dark:text-white/70 max-w-2xl">
          Los equipos de la PMFL representan el talento, la pasión y la competitividad del fútbol americano en Panamá.
        </p>
      </header>

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
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}