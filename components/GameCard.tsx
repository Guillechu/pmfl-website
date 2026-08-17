import Link from "next/link";
import type { Game } from "@/lib/types";
import { getTeam } from "@/lib/data";
import { formatGameDate, cn } from "@/lib/utils";
import TeamMark from "./TeamMark";
import Badge from "./ui/Badge";

export default function GameCard({ game }: { game: Game }) {
  const home = getTeam(game.homeTeamId);
  const away = getTeam(game.awayTeamId);
  if (!home || !away) return null;

  const isFinal = game.status === "final";
  const homeWon = isFinal && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = isFinal && (game.awayScore ?? 0) > (game.homeScore ?? 0);

  return (
    <article className="card card-hover p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="muted">Week {game.week}</Badge>
        {isFinal ? (
          <Badge variant="success">Final</Badge>
        ) : game.status === "live" ? (
          <Badge variant="red">Live</Badge>
        ) : (
          <span className="text-xs text-brand-navy/60 dark:text-white/60">{formatGameDate(game.date)}</span>
        )}
      </div>

      <Row team={away} label="AWAY" score={game.awayScore} dimmed={isFinal && !awayWon} winner={awayWon} />
      <div className="my-2 h-px bg-brand-navy/[0.07] dark:bg-white/10" />
      <Row team={home} label="HOME" score={game.homeScore} dimmed={isFinal && !homeWon} winner={homeWon} />

      <div className="mt-4 flex items-center justify-between text-xs text-brand-navy/55 dark:text-white/50">
        <span>{game.venue}</span>
        <Link
          href={`/teams/${home.id}`}
          className="text-brand-gold-700 dark:text-brand-gold-300 hover:text-brand-gold-700 hover:dark:text-brand-gold-500 transition-colors"
        >
          Team page →
        </Link>
      </div>
    </article>
  );
}

function Row({
  team,
  label,
  score,
  dimmed,
  winner,
}: {
  team: ReturnType<typeof getTeam>;
  label: string;
  score: number | null;
  dimmed?: boolean;
  winner?: boolean;
}) {
  if (!team) return null;
  return (
    <div className={cn("flex items-center gap-3", dimmed && "opacity-60")}>
      <TeamMark team={team} className="h-10 w-10 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-brand-navy/50 dark:text-white/40">{label}</div>
        <div className={cn("font-display text-base text-brand-navy dark:text-white truncate", winner && "text-brand-gold-700 dark:text-brand-gold-300")}>
          {team.name}
        </div>
      </div>
      <div className={cn("font-display text-2xl tabular-nums", winner ? "text-brand-gold-700 dark:text-brand-gold-300" : "text-brand-navy dark:text-white")}>
        {score ?? "—"}
      </div>
    </div>
  );
}
