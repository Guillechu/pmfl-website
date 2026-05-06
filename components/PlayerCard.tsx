import type { Player } from "@/lib/types";
import { getTeam } from "@/lib/data";
import TeamMark from "./TeamMark";

export default function PlayerCard({
  player,
  highlightStat,
}: {
  player: Player;
  /** A stat key from player.stats to display prominently. */
  highlightStat?: keyof Player["stats"];
}) {
  const team = getTeam(player.teamId);
  const value = highlightStat ? player.stats[highlightStat] : undefined;

  return (
    <div className="card card-hover p-5 flex items-center gap-4 animate-fade-up">
      {team && <TeamMark team={team} className="h-14 w-14 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl text-brand-gold-300">#{player.number}</span>
          <h4 className="font-semibold text-white truncate">{player.name}</h4>
        </div>
        <p className="text-xs text-white/60">
          {player.position} · {team?.name ?? "Free Agent"}
        </p>
      </div>
      {value !== undefined && (
        <div className="text-right">
          <div className="font-display text-2xl text-white tabular-nums">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            {String(highlightStat)}
          </div>
        </div>
      )}
    </div>
  );
}
