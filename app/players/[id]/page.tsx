// Ficha individual de un jugador.
//
// Nace de una carencia concreta de /stats: Cloob solo publica el top 3 de
// cada categoría, así que de los más de 350 inscritos apenas dos docenas
// aparecían en algún sitio. Esta página pide la ficha del jugador
// (getPlayerProfile), que sí existe para todos, y se llega a ella desde
// el roster de su equipo.

import { notFound } from "next/navigation";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import TeamLogo from "@/components/TeamLogo";
import { getPlayerProfile, type CloobPlayerStats } from "@/lib/cloob";
import { players, teamByName } from "@/lib/data";
import { toMeters, toPounds } from "@/lib/measurements";
import { slugify } from "@/lib/utils";

export const revalidate = 60;

// Son 350+ jugadores y la mayoría no se visita nunca: se generan bajo
// demanda y luego quedan cacheadas por ISR.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const player = await getPlayerProfile(params.id).catch(() => null);

  return {
    title: player ? `${player.name} · PMFL` : "Jugador · PMFL",
    description: player
      ? `Estadísticas de ${player.name} (${player.teamName}) en la temporada 2026 de la PMFL.`
      : undefined,
  };
}

/**
 * Qué se enseña de cada grupo y cómo se llama en español. El orden es el
 * de la ficha: primero lo que hizo con el balón.
 */
const GRUPOS: Array<{
  label: string;
  stats: Array<{ key: keyof CloobPlayerStats; label: string }>;
}> = [
  {
    label: "Ataque",
    stats: [
      { key: "pass_yds", label: "Yardas de pase" },
      { key: "pass_tds", label: "TD de pase" },
      { key: "completions", label: "Pases completos" },
      { key: "interceptions_thrown", label: "Intercepciones lanzadas" },
      { key: "rush_yds", label: "Yardas por tierra" },
      { key: "rush_tds", label: "TD por tierra" },
      { key: "rec_yds", label: "Yardas por recepción" },
      { key: "receptions", label: "Recepciones" },
      { key: "rec_tds", label: "TD por recepción" },
    ],
  },
  {
    label: "Defensa",
    stats: [
      { key: "tackles", label: "Tacleadas" },
      { key: "sacks", label: "Capturas (sacks)" },
      { key: "interceptions", label: "Intercepciones" },
      { key: "pass_deflected", label: "Pases desviados" },
      { key: "fumbles_forced", label: "Balones forzados" },
      { key: "fumbles_recovered", label: "Balones recuperados" },
      { key: "def_tds", label: "TD defensivos" },
    ],
  },
  {
    label: "Equipos especiales",
    stats: [
      { key: "fg_made", label: "Goles de campo" },
      { key: "extra_points", label: "Puntos extra" },
      { key: "return_yds", label: "Yardas en retorno" },
      { key: "return_tds", label: "TD en retorno" },
    ],
  },
];

const FECHA = new Intl.DateTimeFormat("es-PA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Panama",
});

export default async function PlayerPage({
  params,
}: {
  params: { id: string };
}) {
  const player = await getPlayerProfile(params.id).catch(() => null);

  if (!player) notFound();

  const team = teamByName(player.teamName);

  // Estatura, peso y foto no están en la ficha de Cloob; se completan
  // desde /data emparejando por nombre, igual que hace el roster.
  const local = players.find((p) => slugify(p.name) === slugify(player.name));
  const height = toMeters(local?.height);
  const weight = toPounds(local?.weight);

  // Solo se pintan los grupos en los que hizo algo: un liniero no tiene
  // por qué enseñar nueve ceros de ataque.
  const grupos = GRUPOS.map((g) => ({
    label: g.label,
    stats: g.stats.filter((s) => Number(player.stats[s.key]) > 0),
  })).filter((g) => g.stats.length > 0);

  return (
    <div className="container-page py-10">
      <Link
        href={team ? `/teams/${team.id}` : "/teams"}
        className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
      >
        ← {team ? `Roster de ${team.name}` : "Todos los equipos"}
      </Link>

      <header className="relative mt-4 overflow-hidden rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-white via-white to-brand-navy/[0.06] p-6 shadow-card md:p-10 dark:border-white/10 dark:from-brand-navy-700 dark:via-brand-navy-800 dark:to-brand-navy-900 dark:shadow-cardDark">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <PlayerAvatar
            src={local?.photo}
            alt={player.name}
            className="h-24 w-24 shrink-0 rounded-full border border-brand-navy/10 object-cover dark:border-white/10"
            fallback={
              <TeamLogo
                name={player.teamName}
                team={team}
                className="h-24 w-24 shrink-0"
              />
            }
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {player.number && (
                <span className="font-display text-2xl text-brand-gold-700 dark:text-brand-gold-300">
                  #{player.number}
                </span>
              )}
              {player.mvps > 0 && (
                <span className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
                  MVP ×{player.mvps}
                </span>
              )}
            </div>

            <h1 className="mt-1 h-display text-3xl leading-tight text-brand-navy dark:text-white md:text-5xl">
              {player.name}
            </h1>

            {team ? (
              <Link
                href={`/teams/${team.id}`}
                className="mt-2 inline-flex items-center gap-2 text-brand-navy/70 transition-colors hover:text-brand-gold-700 dark:text-white/75 dark:hover:text-brand-gold-300"
              >
                <TeamLogo name={player.teamName} team={team} className="h-6 w-6" />
                {team.name}
              </Link>
            ) : (
              <p className="mt-2 text-brand-navy/70 dark:text-white/75">
                {player.teamName}
              </p>
            )}

            {(height || weight) && (
              <p className="mt-2 text-sm text-brand-navy/60 dark:text-white/60">
                {[height, weight].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra label="Partidos jugados" value={player.played} />
          <Cifra label="Puntos" value={player.stats.total_points ?? 0} />
          <Cifra label="Touchdowns" value={player.stats.total_tds ?? 0} />
          <Cifra label="MVP del partido" value={player.mvps} />
        </div>
      </header>

      {player.highlights.length > 0 && (
        <section className="mt-8">
          <h2 className="h-display text-xl text-brand-navy dark:text-white">
            Lo más destacado
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {player.highlights.map((h) => (
              <div key={h.key} className="card p-5">
                <div className="font-display text-3xl tabular-nums text-brand-gold-700 dark:text-brand-gold-300">
                  {h.value}
                </div>
                <div className="mt-1 text-sm text-brand-navy/70 dark:text-white/70">
                  {h.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="h-display text-xl text-brand-navy dark:text-white">
          Estadísticas de la temporada
        </h2>

        {grupos.length === 0 ? (
          <div className="card mt-3 p-8 text-center text-brand-navy/60 dark:text-white/60">
            {player.played === 0
              ? `${player.name} todavía no ha disputado ningún partido esta temporada.`
              : `${player.name} ha jugado ${player.played} ${
                  player.played === 1 ? "partido" : "partidos"
                }, pero aún no tiene estadísticas registradas.`}
          </div>
        ) : (
          <div className="mt-3 grid gap-5 lg:grid-cols-3">
            {grupos.map((g) => (
              <div key={g.label} className="card p-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
                  {g.label}
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {g.stats.map((s) => (
                    <div
                      key={String(s.key)}
                      className="flex justify-between gap-4 border-b border-brand-navy/[0.07] pb-2 last:border-0 dark:border-white/5"
                    >
                      <dt className="text-brand-navy/60 dark:text-white/60">
                        {s.label}
                      </dt>
                      <dd className="font-medium tabular-nums text-brand-navy dark:text-white">
                        {player.stats[s.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {player.matches.length > 0 && (
        <section className="mt-8">
          <h2 className="h-display text-xl text-brand-navy dark:text-white">
            Historial de partidos
          </h2>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {player.matches.map((m) => {
              const gano = (m.own ?? 0) > (m.rival ?? 0);
              const empate = m.own === m.rival;
              return (
                <div key={m.matchId} className="card p-5">
                  <div className="flex items-center justify-between gap-3 text-xs text-brand-navy/60 dark:text-white/60">
                    <span>{m.date ? FECHA.format(m.date) : ""}</span>
                    {m.isMvp && (
                      <span className="rounded-full bg-brand-red px-2 py-0.5 font-semibold text-white">
                        MVP
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-brand-navy/70 dark:text-white/70">
                      vs {m.rivalName}
                    </span>
                    <span
                      className={
                        "font-display text-xl tabular-nums " +
                        (empate
                          ? "text-brand-navy/60 dark:text-white/60"
                          : gano
                            ? "text-brand-gold-700 dark:text-brand-gold-300"
                            : "text-brand-navy/55 dark:text-white/50")
                      }
                    >
                      {m.own}–{m.rival}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-brand-navy/50 dark:text-white/40">
        Estadísticas oficiales de la liga, actualizadas automáticamente.
      </p>
    </div>
  );
}

function Cifra({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-brand-navy/[0.05] px-4 py-3 backdrop-blur-sm dark:bg-black/30">
      <div className="text-[10px] uppercase tracking-widest text-brand-navy/60 dark:text-white/60">
        {label}
      </div>
      <div className="font-display text-2xl tabular-nums text-brand-navy dark:text-white">
        {value}
      </div>
    </div>
  );
}
