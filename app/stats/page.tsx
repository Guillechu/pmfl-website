// Página de estadísticas — datos EN VIVO desde Cloob.
// Es un Server Component asíncrono: los datos se traen en el servidor
// (sin exponer la API al navegador) y se cachean/revalidan cada 60s.

import Link from "next/link";
import {
  getStandings,
  getTopScorers,
  getRecentResults,
  getStatLeaders,
  type CloobStanding,
} from "@/lib/cloob";
import { teamByName } from "@/lib/data";
import { fromCloob } from "@/lib/match";
import MatchCard from "@/components/MatchCard";
import PlayerPodium from "@/components/PlayerPodium";
import StatLeaderboards from "@/components/StatLeaderboards";
import TeamLogo from "@/components/TeamLogo";
import { getPlayerPhotoMap, photoFor } from "@/lib/player-photos";

export const revalidate = 60;

export const metadata = {
  title: "Rankings y Stats · PMFL",
  description:
    "Clasificación, líderes de anotación y resultados de la Panama Major Football League, en vivo.",
};

// -------- utilidades de presentación ---------------------------------

/** Nombre de equipo con su escudo; enlaza a su página si existe localmente. */
function TeamName({ name }: { name: string }) {
  const local = teamByName(name);
  const content = (
    <span className="flex items-center gap-3">
      <TeamLogo name={name} team={local} className="h-9 w-9" />
      <span className="font-medium text-white">{local?.name ?? name}</span>
    </span>
  );
  return local ? (
    <Link href={`/teams/${local.id}`} className="hover:text-brand-gold-300">
      {content}
    </Link>
  ) : (
    content
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-red/20 px-3 py-1 text-xs font-semibold text-brand-red-100 ring-1 ring-brand-red/40">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red" />
      </span>
      EN VIVO
    </span>
  );
}

// -------- secciones ---------------------------------------------------

function StandingsTable({ rows }: { rows: CloobStanding[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-white/60">
            <tr>
              <th className="w-10 px-3 py-3 text-center font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Equipo</th>
              <th className="px-3 py-3 text-center font-medium" title="Jugados">PJ</th>
              <th className="px-3 py-3 text-center font-medium" title="Ganados">G</th>
              <th className="px-3 py-3 text-center font-medium" title="Empatados">E</th>
              <th className="px-3 py-3 text-center font-medium" title="Perdidos">P</th>
              <th className="px-3 py-3 text-center font-medium" title="Puntos a favor">PF</th>
              <th className="px-3 py-3 text-center font-medium" title="Puntos en contra">PC</th>
              <th className="px-3 py-3 text-center font-medium" title="Diferencia">DIF</th>
              <th className="px-3 py-3 text-center font-semibold text-white/80" title="Puntos">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((t) => {
              const playoff = t.position <= 4; // top 4 → zona de playoffs
              return (
                <tr
                  key={t.name + t.position}
                  className="transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-3 py-3 text-center">
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
                        (playoff
                          ? "bg-brand-gold/20 text-brand-gold-300 ring-1 ring-brand-gold/40"
                          : "text-white/60")
                      }
                    >
                      {t.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TeamName name={t.name} />
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/80">{t.played}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/90">{t.won}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/70">{t.drawn}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/90">{t.lost}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/70">{t.pf}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/70">{t.pc}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-white/70">
                    {t.diff > 0 ? `+${t.diff}` : t.diff}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-lg font-black text-brand-gold-300">
                    {t.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/5 px-4 py-3 text-xs text-white/45">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-gold/60 align-middle" />
        Zona de playoffs (top 4)
      </p>
    </div>
  );
}

export default async function StatsPage() {
  const [standings, scorers, results, photos, statGroups] = await Promise.all([
    getStandings(),
    getTopScorers(10),
    getRecentResults(6),
    getPlayerPhotoMap(),
    getStatLeaders(),
  ]);

  const hasData = standings.length > 0;

  const podium = scorers.map((p) => ({
    id: p.playerId,
    name: p.playerName,
    club: p.clubName,
    points: p.totalPoints,
    photo: photoFor(photos, p.playerId, p.playerName),
  }));

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-widest text-brand-gold-300">
            Temporada · PMFL
          </p>
          {hasData && <LiveBadge />}
        </div>
        <h1 className="h-display text-4xl text-white md:text-5xl">Rankings y Stats</h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Clasificación, líderes de anotación y resultados oficiales,
          actualizados automáticamente.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 ring-1 ring-white/10">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold/70" />
          Estadísticas soportadas por Boowl App
        </p>
      </header>

      {!hasData ? (
        <div className="card p-10 text-center">
          <h3 className="text-2xl font-black text-white">
            Estadísticas próximamente
          </h3>
          <p className="mx-auto mt-3 max-w-md text-white/60">
            Los líderes y la clasificación oficial estarán disponibles cuando
            haya partidos registrados en la temporada.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Clasificación */}
          <section>
            <h2 className="mb-4 h-display text-2xl text-white">Clasificación</h2>
            <StandingsTable rows={standings} />
          </section>

          {/* Líderes de anotación — pódium */}
          {podium.length > 0 && (
            <section>
              <h2 className="mb-4 h-display text-2xl text-white">
                Líderes de anotación
              </h2>
              <div className="card px-4 py-8 md:px-8">
                <PlayerPodium players={podium} />
              </div>
            </section>
          )}

          {/* Líderes por categoría — todo lo que publica Cloob */}
          {statGroups.length > 0 && (
            <section>
              <h2 className="mb-1 h-display text-2xl text-white">
                Líderes por categoría
              </h2>
              <p className="mb-5 text-sm text-white/60">
                Top 3 de cada estadística.
              </p>
              <StatLeaderboards groups={statGroups} photos={photos} />
            </section>
          )}

          {/* Resultados recientes */}
          {results.length > 0 && (
            <section>
              <h2 className="mb-4 h-display text-2xl text-white">
                Resultados recientes
              </h2>
              {/* Misma tarjeta que el home y el calendario: escudos,
                  jornada y estado, sin duplicar maquetado. */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((m) => (
                  <MatchCard key={m.id} game={fromCloob(m)} />
                ))}
              </div>
            </section>
          )}

          {/* Crédito de la plataforma. El logo va en PNG con fondo
              transparente, para que se apoye sobre el navy del sitio sin
              recuadro; el nombre queda en el alt. */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-4 text-center text-xs text-white/40">
            <span>Datos oficiales proporcionados por la plataforma</span>
            <img
              src="/boowl.png"
              alt="Boowl"
              width={480}
              height={269}
              className="h-8 w-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
