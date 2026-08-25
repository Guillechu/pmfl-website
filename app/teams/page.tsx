// Listado de equipos. El récord y los puntos vienen EN VIVO de Cloob,
// igual que la clasificación del inicio y la ficha de cada equipo;
// data/teams.json solo sirve de respaldo (sus cifras están a cero y no
// se actualizan solas, que es lo que dejaba todas las tarjetas en 0-0).
//
// La página es un Server Component para poder llamar a Cloob sin exponer
// la API al navegador; el buscador vive en TeamsBrowser.

import { teams, teamByName } from "@/lib/data";
import { getStandings } from "@/lib/cloob";
import TeamsBrowser from "@/components/TeamsBrowser";
import type { LiveTeamRecord } from "@/components/TeamCard";

export const revalidate = 60;

export const metadata = {
  title: "Equipos · PMFL",
  description:
    "Los equipos de la Panama Major Football League, con su récord y sus puntos al día.",
};

export default async function TeamsPage() {
  // Si Cloob falla, cada tarjeta cae sola a lo que haya en /data.
  const standings = await getStandings().catch(() => []);

  const live: Record<string, LiveTeamRecord> = {};
  for (const fila of standings) {
    const local = teamByName(fila.name);
    if (!local) continue; // equipo que está en Cloob pero no en /data
    live[local.id] = {
      wins: fila.won,
      losses: fila.lost,
      ties: fila.drawn,
      pointsFor: fila.pf,
      pointsAgainst: fila.pc,
    };
  }

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

      <TeamsBrowser teams={teams} live={live} />
    </div>
  );
}
