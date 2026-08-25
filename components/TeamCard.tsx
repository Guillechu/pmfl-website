import Link from "next/link";
import type { Team } from "@/lib/types";
import TeamMark from "./TeamMark";
import Badge from "./ui/Badge";

/**
 * Récord y puntos traídos EN VIVO de Cloob. Cuando llegan mandan sobre
 * data/teams.json: ese JSON está a cero y nadie lo actualiza a mano, así
 * que dejarlo mandar hacía que todos los equipos salieran "0-0" aunque
 * ya hubieran jugado. Es el mismo criterio que usa la ficha del equipo.
 */
export interface LiveTeamRecord {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

export default function TeamCard({
  team,
  live,
}: {
  team: Team;
  live?: LiveTeamRecord | null;
}) {
  const wins = live?.wins ?? team.record.wins;
  const losses = live?.losses ?? team.record.losses;
  const ties = live?.ties ?? team.record.ties;
  const pointsFor = live?.pointsFor ?? team.stats.pointsFor;
  const pointsAgainst = live?.pointsAgainst ?? team.stats.pointsAgainst;

  return (
    <Link
      href={`/teams/${team.id}`}
      className="card card-hover p-5 flex flex-col gap-4 group animate-fade-up"
    >
      <div className="flex items-start gap-4">
        <TeamMark team={team} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="h-display text-lg text-brand-navy dark:text-white truncate group-hover:text-brand-gold-700 group-hover:dark:text-brand-gold-300 transition-colors">
              {team.name}
            </h3>
            <Badge variant="navy">{team.conference}</Badge>
          </div>
          <p className="text-xs text-brand-navy/60 dark:text-white/60 mt-0.5">{team.city}</p>
          <p className="text-sm text-brand-navy/70 dark:text-white/70 mt-2 line-clamp-2">{team.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-brand-navy/10 dark:border-white/10 text-center">
        <Stat label="Record" value={ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`} />
        <Stat label="PF" value={pointsFor} />
        <Stat label="PA" value={pointsAgainst} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-brand-navy/55 dark:text-white/50">{label}</div>
      <div className="font-display text-lg text-brand-navy dark:text-white">{value}</div>
    </div>
  );
}
