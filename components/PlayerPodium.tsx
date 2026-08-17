// ----------------------------------------------------------------------
// Ranking de jugadores en formato pódium.
//
// Los tres primeros van sobre un podio (2º · 1º · 3º, con el campeón más
// alto y al centro); del cuarto en adelante, una lista ordenada.
//
// La imagen de cada jugador sale de su foto si la hay; si no, del escudo
// de su equipo; y si el equipo tampoco está, de una insignia con inicial.
// ----------------------------------------------------------------------

import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import TeamLogo from "./TeamLogo";
import { teamByName } from "@/lib/data";
import { parsePlayerName } from "@/lib/player-photos";
import { cn } from "@/lib/utils";

export interface PodiumEntry {
  id: string;
  /** Nombre tal como llega de Cloob (puede traer el dorsal pegado). */
  name: string;
  /** Nombre del club en Cloob. */
  club: string;
  points: number;
  /** URL de la foto del jugador, si la tenemos. */
  photo?: string | null;
}

/** Estilos por puesto del podio. */
const RANKS = {
  1: {
    ring: "ring-brand-gold/70",
    glow: "shadow-[0_0_28px_-6px_rgba(212,175,55,0.55)]",
    medal: "bg-brand-gold text-brand-navy-900",
    pedestal: "h-20 bg-gradient-to-b from-brand-gold/25 to-transparent border-brand-gold-600/50 dark:border-brand-gold/40",
    avatar: "h-24 w-24 md:h-28 md:w-28",
  },
  2: {
    ring: "ring-slate-300/60",
    glow: "",
    medal: "bg-slate-300 text-slate-900",
    pedestal: "h-14 bg-gradient-to-b from-white/12 to-transparent border-brand-navy/15 dark:border-white/20",
    avatar: "h-20 w-20 md:h-24 md:w-24",
  },
  3: {
    ring: "ring-amber-600/60",
    glow: "",
    medal: "bg-amber-600 text-brand-navy dark:text-white",
    pedestal: "h-10 bg-gradient-to-b from-amber-700/20 to-transparent border-amber-700/40",
    avatar: "h-20 w-20 md:h-24 md:w-24",
  },
} as const;

type RankKey = keyof typeof RANKS;

/** Retrato circular: foto → escudo del equipo → inicial. */
function Portrait({
  entry,
  size,
  ring,
  glow,
}: {
  entry: PodiumEntry;
  size: string;
  ring: string;
  glow?: string;
}) {
  const base = cn("relative overflow-hidden rounded-full ring-2", size, ring, glow);

  // El escudo hace de respaldo tanto si no hay foto como si la foto no
  // llega a cargar (algunas del roster de Cloob devuelven 403).
  const crest = (
    <div className={cn(base, "flex items-center justify-center bg-brand-navy/[0.04] dark:bg-white/5 p-3")}>
      <TeamLogo
        name={entry.club}
        className="h-full w-full border-0 bg-transparent"
        rounded="rounded-full"
      />
    </div>
  );

  if (!entry.photo) return crest;

  return (
    <div className={cn(base, "bg-brand-navy/[0.04] dark:bg-white/5")}>
      <PlayerAvatar
        src={entry.photo}
        alt={parsePlayerName(entry.name).name}
        className="h-full w-full object-cover"
        fallback={
          <div className="flex h-full w-full items-center justify-center p-3">
            <TeamLogo
              name={entry.club}
              className="h-full w-full border-0 bg-transparent"
              rounded="rounded-full"
            />
          </div>
        }
      />
    </div>
  );
}

function PodiumSpot({ entry, rank }: { entry: PodiumEntry; rank: RankKey }) {
  const s = RANKS[rank];
  const { name, number } = parsePlayerName(entry.name);
  const team = teamByName(entry.club);

  const card = (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <Portrait entry={entry} size={s.avatar} ring={s.ring} glow={s.glow} />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-black ring-2 ring-brand-navy-900",
            s.medal,
          )}
        >
          {rank}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate font-display text-base text-brand-navy dark:text-white md:text-lg">
          {name}
          {number && (
            <span className="ml-1.5 text-xs font-normal text-brand-navy/50 dark:text-white/40">
              #{number}
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-brand-navy/55 dark:text-white/50">
          <TeamLogo
            name={entry.club}
            team={team}
            className="h-4 w-4"
            rounded="rounded"
          />
          <span className="truncate">{team?.name ?? entry.club}</span>
        </p>
        <p className="mt-2">
          <span className="font-display text-3xl text-brand-gold-700 dark:text-brand-gold-300">
            {entry.points}
          </span>
          <span className="ml-1 text-[10px] uppercase text-brand-navy/55 dark:text-white/50">pts</span>
        </p>
      </div>

      {/* Escalón del podio */}
      <div
        className={cn(
          "mt-3 w-full rounded-t-lg border-x border-t",
          s.pedestal,
        )}
      />
    </div>
  );

  return team ? (
    <Link href={`/teams/${team.id}`} className="block transition-transform hover:-translate-y-1">
      {card}
    </Link>
  ) : (
    card
  );
}

export default function PlayerPodium({
  players,
  className,
}: {
  players: PodiumEntry[];
  className?: string;
}) {
  if (!players.length) return null;

  const [first, second, third, ...rest] = players;

  return (
    <div className={className}>
      {/* Podio — en móvil se apila 1º, 2º, 3º; en pantalla ancha 2º · 1º · 3º */}
      <div className="flex flex-col items-center gap-8 sm:grid sm:grid-cols-3 sm:items-end sm:gap-4">
        {second && (
          <div className="order-2 w-full max-w-[14rem] sm:order-1 sm:max-w-none">
            <PodiumSpot entry={second} rank={2} />
          </div>
        )}
        {first && (
          <div className="order-1 w-full max-w-[16rem] sm:order-2 sm:max-w-none">
            <PodiumSpot entry={first} rank={1} />
          </div>
        )}
        {third && (
          <div className="order-3 w-full max-w-[14rem] sm:order-3 sm:max-w-none">
            <PodiumSpot entry={third} rank={3} />
          </div>
        )}
      </div>

      {/* Del 4º en adelante */}
      {rest.length > 0 && (
        <ul className="mt-8 divide-y divide-brand-navy/[0.07] dark:divide-white/5 overflow-hidden rounded-xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          {rest.map((p, i) => {
            const { name, number } = parsePlayerName(p.name);
            const team = teamByName(p.club);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-navy/[0.04] hover:dark:bg-white/[0.04]"
              >
                <span className="w-6 shrink-0 text-center font-display text-lg text-brand-navy/50 dark:text-white/40">
                  {i + 4}
                </span>

                <PlayerAvatar
                  src={p.photo}
                  alt={name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/15"
                  fallback={
                    <TeamLogo
                      name={p.club}
                      team={team}
                      className="h-10 w-10"
                      rounded="rounded-full"
                    />
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-brand-navy dark:text-white">
                    {name}
                    {number && (
                      <span className="ml-1.5 text-xs text-brand-navy/50 dark:text-white/40">#{number}</span>
                    )}
                  </div>
                  <div className="truncate text-xs uppercase tracking-wider text-brand-navy/55 dark:text-white/50">
                    {team ? (
                      <Link
                        href={`/teams/${team.id}`}
                        className="hover:text-brand-gold-700 hover:dark:text-brand-gold-300"
                      >
                        {team.name}
                      </Link>
                    ) : (
                      p.club
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-display text-xl text-brand-navy dark:text-white">{p.points}</div>
                  <div className="text-[10px] uppercase text-brand-navy/55 dark:text-white/50">pts</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
