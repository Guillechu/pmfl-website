import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import TeamLogo from "./TeamLogo";
import { teamByName } from "@/lib/data";
import { parsePlayerName } from "@/lib/player-photos";
import { cn } from "@/lib/utils";
import type { CloobPlayerProfile, CloobPlayerStats } from "@/lib/cloob";
import type { MvpRacePanel } from "@/lib/types";

/**
 * Carrera por el MVP en el inicio, en el orden que se fija en
 * data/weekly.json: los tres primeros destacados con foto grande y del
 * cuarto en adelante en lista. Los MVP de partido y las cifras salen en
 * vivo de la ficha de Cloob de cada uno, así que avanzan solos jornada a
 * jornada; lo que se edita a mano es quién va y en qué puesto.
 *
 * No es un enlace entero como ResultsCard: cada jugador lleva a su
 * propia ficha, y un enlace no puede ir dentro de otro.
 */

export interface MvpCandidate {
  /** Puesto en la carrera (el de data/weekly.json, empezando en 1). */
  puesto: number;
  profile: CloobPlayerProfile;
  /** Retrato del roster de Cloob, si lo tiene. */
  photo: string | null;
  /** Foto de acción para los destacados, si se ha puesto. */
  foto?: string;
  fotoAlt?: string;
  stats: Array<keyof CloobPlayerStats>;
}

const ETIQUETAS: Partial<Record<keyof CloobPlayerStats, string>> = {
  total_points: "Puntos",
  total_tds: "Touchdowns",
  pass_yds: "Yardas de pase",
  pass_tds: "TD de pase",
  completions: "Pases completos",
  rush_yds: "Yardas por tierra",
  rush_tds: "TD por tierra",
  rec_yds: "Yardas por recepción",
  receptions: "Recepciones",
  rec_tds: "TD por recepción",
  tackles: "Tacleadas",
  sacks: "Capturas",
  interceptions: "Intercepciones",
  fumbles_forced: "Balones forzados",
  return_yds: "Yardas en retorno",
  return_tds: "TD en retorno",
};

/** Medalla de los tres primeros, los mismos colores del podio. */
const MEDALLAS = [
  "bg-brand-gold text-brand-navy-900",
  "bg-slate-300 text-slate-900",
  "bg-amber-600 text-brand-navy dark:text-white",
];

const valor = (c: MvpCandidate, key: keyof CloobPlayerStats) =>
  Number(c.profile.stats[key]) || 0;

function Equipo({ c }: { c: MvpCandidate }) {
  const team = teamByName(c.profile.teamName);
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs uppercase tracking-wider text-brand-navy/55 dark:text-white/50">
      <TeamLogo name={c.profile.teamName} team={team} className="h-4 w-4 shrink-0" rounded="rounded" />
      <span className="truncate">{team?.name ?? c.profile.teamName}</span>
    </span>
  );
}

function Mvps({ c }: { c: MvpCandidate }) {
  if (c.profile.mvps <= 0) return null;
  return (
    <span className="shrink-0 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-semibold text-white">
      MVP ×{c.profile.mvps}
    </span>
  );
}

/** Uno de los tres primeros: foto vertical, medalla y tres cifras. */
function Destacado({ c }: { c: MvpCandidate }) {
  const { name } = parsePlayerName(c.profile.name);
  const team = teamByName(c.profile.teamName);
  const src = c.foto ?? c.photo;

  const escudo = (
    <div className="flex h-full w-full items-center justify-center bg-brand-navy/[0.04] p-10 dark:bg-white/5">
      <TeamLogo
        name={c.profile.teamName}
        team={team}
        className="h-full w-full border-0 bg-transparent"
        rounded="rounded-xl"
      />
    </div>
  );

  return (
    <Link
      href={`/players/${c.profile.playerId}`}
      className="group/mvp flex h-full gap-4 rounded-xl border border-brand-navy/10 bg-white p-3 transition-colors hover:border-brand-gold-600/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-gold/40 sm:block sm:p-0"
    >
      <div className="relative w-28 shrink-0 overflow-hidden rounded-lg sm:w-full sm:rounded-b-none sm:rounded-t-xl">
        <div className="aspect-[4/5]">
          {src ? (
            <PlayerAvatar
              src={src}
              alt={c.foto ? c.fotoAlt ?? name : name}
              className="h-full w-full object-cover transition duration-500 group-hover/mvp:scale-105"
              fallback={escudo}
            />
          ) : (
            escudo
          )}
        </div>
        <span
          className={cn(
            "absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-black shadow-md sm:left-3 sm:top-3 sm:h-10 sm:w-10 sm:text-base",
            MEDALLAS[c.puesto - 1] ?? MEDALLAS[2],
          )}
        >
          {c.puesto}
        </span>
      </div>

      <div className="min-w-0 flex-1 self-center sm:p-4">
        <p className="font-display text-lg leading-tight text-brand-navy dark:text-white md:text-xl">
          {name}
          {c.profile.number && (
            <span className="ml-1.5 text-xs font-normal text-brand-navy/50 dark:text-white/40">
              #{c.profile.number}
            </span>
          )}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <Equipo c={c} />
          <Mvps c={c} />
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 sm:grid sm:grid-cols-3 sm:gap-2">
          {c.stats.map((key) => (
            <div key={key}>
              <dd className="font-display text-xl tabular-nums text-brand-gold-700 dark:text-brand-gold-300 md:text-2xl">
                {valor(c, key)}
              </dd>
              <dt className="text-[10px] uppercase leading-tight text-brand-navy/55 dark:text-white/50">
                {ETIQUETAS[key] ?? key}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}

/** Del cuarto en adelante: una fila con retrato pequeño y sus cifras. */
function Fila({ c }: { c: MvpCandidate }) {
  const { name } = parsePlayerName(c.profile.name);
  const team = teamByName(c.profile.teamName);

  return (
    <Link
      href={`/players/${c.profile.playerId}`}
      className="flex items-center gap-3 rounded-xl border border-brand-navy/10 bg-white px-3 py-2.5 transition-colors hover:border-brand-gold-600/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-brand-gold/40"
    >
      <span className="w-6 shrink-0 text-center font-display text-lg text-brand-navy/50 dark:text-white/40">
        {c.puesto}
      </span>

      <PlayerAvatar
        src={c.photo}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
        fallback={
          <TeamLogo
            name={c.profile.teamName}
            team={team}
            className="h-10 w-10 shrink-0"
            rounded="rounded-full"
          />
        }
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-brand-navy dark:text-white">{name}</span>
          <Mvps c={c} />
        </div>
        <Equipo c={c} />
        <p className="mt-0.5 text-xs text-brand-navy/70 dark:text-white/70">
          {c.stats.map((key, i) => (
            <span key={key}>
              {i > 0 && <span className="text-brand-navy/30 dark:text-white/30"> · </span>}
              <span className="font-semibold tabular-nums text-brand-gold-700 dark:text-brand-gold-300">
                {valor(c, key)}
              </span>{" "}
              {(ETIQUETAS[key] ?? key).toLowerCase()}
            </span>
          ))}
        </p>
      </div>
    </Link>
  );
}

export default function MvpRace({
  data,
  candidates,
}: {
  data: MvpRacePanel;
  candidates: MvpCandidate[];
}) {
  if (!candidates.length) return null;

  const destacados = candidates.filter((c) => c.puesto <= 3);
  const resto = candidates.filter((c) => c.puesto > 3);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-white via-white to-brand-gold/[0.08] dark:border-white/10 dark:from-brand-navy-800 dark:via-brand-navy-900 dark:to-black">
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand-gold px-3 py-1 font-semibold text-brand-navy-900">
            🏆 CARRERA POR EL MVP
          </span>
          <span className="text-brand-navy/60 dark:text-white/60">{data.eyebrow}</span>
        </div>

        <h3 className="mt-3 h-display text-2xl leading-tight text-brand-navy dark:text-white md:text-3xl">
          {data.title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm text-brand-navy/70 dark:text-white/75">{data.summary}</p>

        <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {destacados.map((c) => (
            <li key={c.profile.playerId}>
              <Destacado c={c} />
            </li>
          ))}
        </ol>

        {resto.length > 0 && (
          <ol className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {resto.map((c) => (
              <li key={c.profile.playerId}>
                <Fila c={c} />
              </li>
            ))}
          </ol>
        )}

        <Link
          href={data.url}
          className="mt-5 inline-flex items-center gap-2 text-sm text-brand-gold-700 hover:text-brand-gold-800 dark:text-brand-gold-300 dark:hover:text-brand-gold-500"
        >
          {data.linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
