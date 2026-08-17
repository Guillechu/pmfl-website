// Tablas de líderes por categoría (ofensiva, defensiva, especiales).
//
// Cloob publica el top 3 de cada categoría; cada tarjeta muestra ese
// podio en pequeño, con la foto del jugador y, si no tiene, el escudo
// de su equipo — la misma regla que el pódium de anotadores.

import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import TeamLogo from "./TeamLogo";
import type { StatGroup } from "@/lib/cloob";
import type { PlayerPhotos } from "@/lib/player-photos";
import { parsePlayerName, photoFor } from "@/lib/player-photos";
import { teamByName } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Color del puesto: oro, plata, bronce. */
const RANK_COLOR = [
  "text-brand-gold-700 dark:text-brand-gold-300",
  "text-slate-600 dark:text-slate-300",
  "text-amber-600",
] as const;

export default function StatLeaderboards({
  groups,
  photos,
}: {
  groups: StatGroup[];
  photos: PlayerPhotos;
}) {
  if (!groups.length) return null;

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-700 dark:text-brand-gold-300">
            {group.label}
            <span className="h-px flex-1 bg-brand-navy/[0.07] dark:bg-white/10" />
          </h3>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.categories.map((cat) => (
              <div key={cat.key} className="card p-4">
                <h4 className="mb-3 truncate text-sm font-semibold text-brand-navy/85 dark:text-white/90">
                  {cat.label}
                </h4>

                <ol className="space-y-2">
                  {cat.leaders.slice(0, 3).map((leader, i) => {
                    const { name, number } = parsePlayerName(leader.playerName);
                    const team = teamByName(leader.clubName);
                    const photo = photoFor(photos, leader.playerId, leader.playerName);

                    return (
                      <li
                        key={`${leader.playerId}-${i}`}
                        className="flex items-center gap-2.5"
                      >
                        <span
                          className={cn(
                            "w-3 shrink-0 text-center font-display text-sm",
                            RANK_COLOR[i] ?? "text-brand-navy/50 dark:text-white/40",
                          )}
                        >
                          {i + 1}
                        </span>

                        <PlayerAvatar
                          src={photo}
                          alt={name}
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/15"
                          fallback={
                            <TeamLogo
                              name={leader.clubName}
                              team={team}
                              className="h-8 w-8"
                              rounded="rounded-full"
                            />
                          }
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-brand-navy dark:text-white">
                            {name}
                            {number && (
                              <span className="ml-1 text-[10px] text-brand-navy/50 dark:text-white/40">
                                #{number}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[10px] uppercase tracking-wider text-brand-navy/50 dark:text-white/45">
                            {team ? (
                              <Link
                                href={`/teams/${team.id}`}
                                className="hover:text-brand-gold-700 hover:dark:text-brand-gold-300"
                              >
                                {team.name}
                              </Link>
                            ) : (
                              leader.clubName
                            )}
                          </div>
                        </div>

                        <span className="shrink-0 font-display text-lg tabular-nums text-brand-navy dark:text-white">
                          {leader.value}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
