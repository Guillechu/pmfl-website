import Link from "next/link";
import type { Team } from "@/lib/types";
import TeamMark from "./TeamMark";
import Badge from "./ui/Badge";

export default function TeamCard({ team }: { team: Team }) {
  const { wins, losses, ties } = team.record;
  return (
    <Link
      href={`/teams/${team.id}`}
      className="card card-hover p-5 flex flex-col gap-4 group animate-fade-up"
    >
      <div className="flex items-start gap-4">
        <TeamMark team={team} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="h-display text-lg text-white truncate group-hover:text-brand-gold-300 transition-colors">
              {team.name}
            </h3>
            <Badge variant="navy">{team.conference}</Badge>
          </div>
          <p className="text-xs text-white/60 mt-0.5">{team.city}</p>
          <p className="text-sm text-white/70 mt-2 line-clamp-2">{team.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
        <Stat label="Record" value={ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`} />
        <Stat label="PF" value={team.stats.pointsFor} />
        <Stat label="PA" value={team.stats.pointsAgainst} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="font-display text-lg text-white">{value}</div>
    </div>
  );
}
