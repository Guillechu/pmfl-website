import { notFound } from "next/navigation";
import Link from "next/link";
import { teams, getTeam, getTeamRoster, schedule, teamByName } from "@/lib/data";
import TeamMark from "@/components/TeamMark";
import MatchCard from "@/components/MatchCard";
import TeamRosterTable, { type RosterRow } from "@/components/TeamRosterTable";
import { InstagramIcon } from "@/components/SocialIcons";
import { getClubRosterByName, getMatches, getStandings } from "@/lib/cloob";
import { fromCloob, fromLocal } from "@/lib/match";
import { slugify } from "@/lib/utils";
import { toMeters, toPounds } from "@/lib/measurements";
import type { Player } from "@/lib/types";

// El roster y el calendario vienen de Cloob; se revalidan solos.
export const revalidate = 60;

export function generateStaticParams() {
  return teams.map((t) => ({ slug: t.id }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const team = getTeam(params.slug);

  return {
    title: team ? `${team.name} · PMFL` : "Team · PMFL",
  };
}

/**
 * Roster oficial: manda Cloob (es donde los clubes inscriben). Posición,
 * estatura y peso salen de su formulario de inscripción; si un jugador
 * no los tiene rellenos ahí, se completan desde /data emparejando por
 * nombre. Si Cloob no tiene a nadie inscrito, se muestra el local.
 *
 * Cloob enriquece, pero NUNCA recorta: mientras los clubes terminan de
 * inscribirse, Cloob va muy por detrás del roster oficial de /data (un
 * club puede tener ahí un solo jugador). Quien esté en /data y todavía
 * no aparezca en Cloob se añade igualmente, emparejando por nombre para
 * no duplicar a nadie.
 */
function buildRoster(
  cloob: Awaited<ReturnType<typeof getClubRosterByName>>,
  local: Player[],
): RosterRow[] {
  const localRow = (p: Player): RosterRow => ({
    id: p.id,
    name: p.name,
    number: p.number,
    position: p.position && p.position !== "TBD" ? p.position : "",
    height: toMeters(p.height),
    weight: toPounds(p.weight),
    photo: p.photo,
  });

  if (cloob.length === 0) return local.map(localRow);

  const localByName = new Map(local.map((p) => [slugify(p.name), p]));
  const emparejados = new Set<string>();

  const inscritos = cloob.map((c) => {
    const clave = slugify(c.name);
    const match = localByName.get(clave);
    if (match) emparejados.add(clave);

    return {
      id: c.id,
      name: c.name,
      number: Number(c.number) || match?.number || 0,
      position:
        c.position ||
        (match?.position && match.position !== "TBD" ? match.position : ""),
      // Cloob manda, pero solo si lo que puso el club se entiende: un
      // "?" o un campo a medias no vale más que el dato de /data.
      height: toMeters(c.height) || toMeters(match?.height),
      weight: toPounds(c.weight) || toPounds(match?.weight),
      // La foto oficial de Cloob gana; si no tiene, la local.
      photo: c.avatar ?? match?.photo,
      // Inscrito en Cloob: su ficha existe y la fila enlaza a ella.
      profileId: c.id,
    };
  });

  const pendientes = local
    .filter((p) => !emparejados.has(slugify(p.name)))
    .map(localRow);

  return [...inscritos, ...pendientes];
}

export default async function TeamDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const team = getTeam(params.slug);

  if (!team) notFound();

  const [cloobRoster, cloobMatches, standings] = await Promise.all([
    getClubRosterByName(team.name).catch(() => []),
    getMatches().catch(() => []),
    getStandings().catch(() => []),
  ]);

  // Récord y puntos: manda Cloob, igual que la clasificación del inicio.
  // data/teams.json solo sirve de respaldo; sus cifras están a cero y se
  // quedaban ahí aunque el equipo ya hubiera jugado.
  const fila = standings.find((s) => teamByName(s.name)?.id === team.id);
  const record = fila
    ? `${fila.won}-${fila.lost}`
    : `${team.record.wins}-${team.record.losses}`;
  const puntosFavor = fila ? fila.pf : team.stats.pointsFor;
  const puntosContra = fila ? fila.pc : team.stats.pointsAgainst;

  const roster = buildRoster(cloobRoster, getTeamRoster(team.id));

  // Calendario del equipo: también desde Cloob, con respaldo al estático.
  const key = slugify(team.name);
  const cloobTeamGames = cloobMatches
    .filter((m) => slugify(m.homeTeam) === key || slugify(m.awayTeam) === key)
    .map(fromCloob);

  const localTeamGames = schedule
    .filter(
      (g) => g.homeTeamId === team.id || g.awayTeamId === team.id
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .map(fromLocal);

  const teamGames =
    cloobTeamGames.length > 0 ? cloobTeamGames : localTeamGames;

  return (
    <div className="container-page py-10">
      <Link
        href="/teams"
        className="text-sm text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500"
      >
        ← Todos los equipos
      </Link>

      {/* El fondo iba en un style en línea con team.primaryColor, que
          ningún equipo tiene definido: salía "linear-gradient(135deg,
          undefined 0%, …)", CSS inválido que el navegador descartaba. La
          cabecera llevaba sin fondo desde siempre y no se notaba porque
          coincidía con el de la página. Ahora es un degradado real y con
          una versión por tema. */}
      <header className="relative mt-4 overflow-hidden rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-white via-white to-brand-navy/[0.06] p-6 shadow-card md:p-10 dark:border-white/10 dark:from-brand-navy-700 dark:via-brand-navy-800 dark:to-brand-navy-900 dark:shadow-cardDark">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <TeamMark
            team={team}
            className="h-20 w-20 md:h-20 md:w-20 shrink-0 scale-[1.4] object-contain"
          />

          <div className="min-w-0 text-center md:text-left">
            <h1 className="h-display text-4xl md:text-6xl text-brand-navy dark:text-white leading-tight">
              {team.name}
            </h1>

            <p className="text-brand-navy/70 dark:text-white/75 mt-2 text-lg">
              {team.city}
            </p>

            {team.instagram && (
              <a
                href={team.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-sm text-white/85 transition-colors hover:border-white/50 hover:text-white"
                aria-label={`Instagram de ${team.name}`}
              >
                <InstagramIcon className="h-4 w-4" />
                Instagram
              </a>
            )}
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-brand-navy/80 dark:text-white/85">
          {team.description}
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Record" value={record} />

          <Stat label="Puntos a favor" value={puntosFavor} />

          <Stat label="Puntos en contra" value={puntosContra} />
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_2fr] gap-6 mt-8">
        <aside className="card p-6 text-sm">
          <h2 className="h-display text-xl text-brand-navy dark:text-white">Club Info</h2>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Directivos
          </h3>
          <div className="mt-2 space-y-2">
            <Row label="Directivo" value={team.directivo || "Por confirmar"} />
            <Row label="GM" value={team.gm || "Por confirmar"} />
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Cuerpo Técnico
          </h3>
          <div className="mt-2 space-y-2">
            {team.coachingStaff && team.coachingStaff.length > 0 ? (
              // Se lista el cuerpo técnico completo con el cargo que puso
              // cada club, en vez de encajarlo en dos casillas fijas.
              team.coachingStaff.map((coach, i) => (
                <Row
                  key={`${coach.name}-${i}`}
                  label={coach.role || "Coach"}
                  value={coach.name}
                />
              ))
            ) : (
              <>
                <Row
                  label="Head Coach"
                  value={team.headCoach || "Por confirmar"}
                />
                <Row
                  label="Offensive Coordinator"
                  value={team.offensiveCoordinator || "Por confirmar"}
                />
              </>
            )}
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-gold-700 dark:text-brand-gold-300">
            Club
          </h3>
          <div className="mt-2 space-y-2">
            <Row label="Ciudad" value={team.city} />
          </div>
        </aside>

        <div>
          <div className="mb-3">
            <h2 className="h-display text-xl text-brand-navy dark:text-white">
              Roster
            </h2>
          </div>

          <TeamRosterTable roster={roster} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h-display text-xl text-brand-navy dark:text-white mb-3">
          Calendario del equipo
        </h2>

        {teamGames.length === 0 ? (
          <div className="card p-8 text-center text-brand-navy/60 dark:text-white/60">
            El calendario de {team.name} estará disponible pronto.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teamGames.map((g) => (
              <MatchCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg bg-brand-navy/[0.05] dark:bg-black/30 border border-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-widest text-brand-navy/60 dark:text-white/60">
        {label}
      </div>

      <div className="font-display text-2xl text-brand-navy dark:text-white tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-brand-navy/[0.07] dark:border-white/5 pb-2 last:border-0">
      <span className="text-brand-navy/60 dark:text-white/60">{label}</span>

      <span className="text-brand-navy dark:text-white font-medium text-right">
        {value}
      </span>
    </div>
  );
}
