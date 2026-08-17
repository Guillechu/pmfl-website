// Calendario — Server Component. Los partidos se traen EN VIVO desde Cloob
// (marcador, estado, jornada y sede reales) y se cachean 60 s. Si el torneo
// de la temporada todavía no tiene partidos cargados en Cloob, se muestra
// el calendario previsto de data/schedule.json.

import { getMatches } from "@/lib/cloob";
import { schedule } from "@/lib/data";
import { fromCloob, fromLocal } from "@/lib/match";
import ScheduleView from "@/components/ScheduleView";

export const revalidate = 60;

export const metadata = {
  title: "Calendario · PMFL",
  description:
    "Calendario completo de la Panama Major Football League: jornadas, horarios, sedes y resultados.",
};

// Playoffs previstos — solo se muestran con el calendario de respaldo.
// Cuando los datos vienen de Cloob, las rondas reales llegan como partidos.
const PLAYOFFS_PREVISTOS = [
  { label: "Semifinal", date: "Sábado 24 oct · 5:00 PM", home: "Clasificado 3", away: "Clasificado 2" },
  { label: "Semifinal", date: "Sábado 24 oct · 8:00 PM", home: "Clasificado 4", away: "Clasificado 1" },
  { label: "Gran Final", date: "Sábado 31 oct · 7:00 PM", home: "Ganador Semifinal 1", away: "Ganador Semifinal 2" },
];

export default async function SchedulePage() {
  const cloob = await getMatches();
  const live = cloob.length > 0;
  const games = live ? cloob.map(fromCloob) : schedule.map(fromLocal);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Temporada 2026
          </p>
          {!live && (
            <span className="pill bg-brand-navy/[0.04] dark:bg-white/5 text-brand-navy/55 dark:text-white/50">Calendario previsto</span>
          )}
        </div>
        <h1 className="h-display text-4xl text-brand-navy dark:text-white md:text-5xl">Calendario</h1>
        <p className="mt-2 max-w-2xl text-brand-navy/70 dark:text-white/70">
          {live
            ? "Jornadas, horarios, sedes y resultados oficiales, actualizados automáticamente."
            : "Calendario previsto de la temporada. Los horarios y resultados oficiales aparecerán aquí en cuanto arranque el torneo."}
        </p>
      </header>

      <ScheduleView games={games} />

      {/* Playoffs por clasificar (solo en modo respaldo) */}
      {!live && (
        <section className="mt-12">
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="h-display text-2xl text-brand-navy dark:text-white">Playoffs y Gran Final</h2>
            <span className="text-xs text-brand-navy/55 dark:text-white/50">Por clasificar</span>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PLAYOFFS_PREVISTOS.map((p, i) => (
              <article key={i} className="card p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={
                      "pill " +
                      (p.label === "Gran Final"
                        ? "bg-brand-gold-600/15 dark:bg-brand-gold/20 text-brand-gold-700 dark:text-brand-gold-300 ring-1 ring-brand-gold-600/40 dark:ring-brand-gold/40"
                        : "bg-brand-navy/[0.07] dark:bg-white/10 text-brand-navy/75 dark:text-white/80")
                    }
                  >
                    {p.label}
                  </span>
                  <span className="text-xs text-brand-navy/55 dark:text-white/50">{p.date}</span>
                </div>
                <div className="mt-4 space-y-1 text-center">
                  <p className="font-display text-lg text-brand-navy dark:text-white">{p.away}</p>
                  <p className="text-xs text-brand-navy/50 dark:text-white/40">vs</p>
                  <p className="font-display text-lg text-brand-navy dark:text-white">{p.home}</p>
                </div>
                <p className="mt-4 text-center text-xs text-brand-navy/55 dark:text-white/50">
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
