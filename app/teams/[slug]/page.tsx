import { notFound } from "next/navigation";
import Link from "next/link";
import { teams, getTeam, getTeamRoster, schedule } from "@/lib/data";
import TeamMark from "@/components/TeamMark";
import MatchCard from "@/components/MatchCard";
import TeamRosterTable, { type RosterRow } from "@/components/TeamRosterTable";
import { InstagramIcon } from "@/components/SocialIcons";
import { getClubRosterByName, getMatches } from "@/lib/cloob";
import { fromCloob, fromLocal } from "@/lib/match";
import { slugify } from "@/lib/utils";
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
    height: p.height ?? "",
    weight: p.weight ? `${p.weight} lb` : "",
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
      height: c.height || match?.height || "",
      weight: c.weight || (match?.weight ? `${match.weight} lb` : ""),
      // La foto oficial de Cloob gana; si no tiene, la local.
      photo: c.avatar ?? match?.photo,
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

  const [cloobRoster, cloobMatches] = await Promise.all([
    getClubRosterByName(team.name).catch(() => []),
    getMatches().catch(() => []),
  ]);

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
        className="text-sm text-brand-gold-300 hover:text-brand-gold-500"
      >
        ← Todos los equipos
      </Link>

      <header
        className="mt-4 rounded-2xl border border-white/10 p-6 md:p-10 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor} 0%, #03080F 80%)`,
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-10">
          <TeamMark
            team={team}
            className="h-20 w-20 md:h-20 md:w-20 shrink-0 scale-[1.4] object-contain"
          />

          <div className="min-w-0 text-center md:text-left">
            <h1 className="h-display text-4xl md:text-6xl text-white leading-tight">
              {team.name}
            </h1>

            <p className="text-white/75 mt-2 text-lg">
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

        <p className="mt-6 max-w-3xl text-white/85">
          {team.description}
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            label="Record"
            value={`${team.record.wins}-${team.record.losses}`}
          />

          <Stat
            label="Puntos a favor"
            value={team.stats.pointsFor}
          />

          <Stat
            label="Puntos en contra"
            value={team.stats.pointsAgainst}
          />
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_2fr] gap-6 mt-8">
        <aside className="card p-6 text-sm">
          <h2 className="h-display text-xl text-white">Club Info</h2>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-brand-gold-300">
            Directivos
          </h3>
          <div className="mt-2 space-y-2">
            <Row label="Directivo" value={team.directivo || "Por confirmar"} />
            <Row label="GM" value={team.gm || "Por confirmar"} />
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-gold-300">
            Cuerpo Técnico
          </h3>
          <div className="mt-2 space-y-2">
            <Row label="Head Coach" value={team.headCoach || "Por confirmar"} />
            <Row
              label="Offensive Coordinator"
              value={team.offensiveCoordinator || "Por confirmar"}
            />
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-brand-gold-300">
            Club
          </h3>
          <div className="mt-2 space-y-2">
            <Row label="Ciudad" value={team.city} />
          </div>
        </aside>

        <div>
          <div className="mb-3">
            <h2 className="h-display text-xl text-white">
              Roster
            </h2>
          </div>

          <TeamRosterTable roster={roster} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h-display text-xl text-white mb-3">
          Calendario del equipo
        </h2>

        {teamGames.length === 0 ? (
          <div className="card p-8 text-center text-white/60">
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
    <div className="rounded-lg bg-black/30 border border-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-[10px] uppercase tracking-widest text-white/60">
        {label}
      </div>

      <div className="font-display text-2xl text-white tabular-nums">
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
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
      <span className="text-white/60">{label}</span>

      <span className="text-white font-medium text-right">
        {value}
      </span>
    </div>
  );
}
