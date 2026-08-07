// Tarjeta de partido única para todo el sitio: sirve igual para los datos
// en vivo de Cloob y para el calendario estático (ver lib/match.ts).
//
// Muestra jornada, estado (EN VIVO / Final / fecha), escudos, marcador y
// sede. Si el equipo existe en /data enlaza a su página.

import type { UiGame, UiGameSide } from "@/lib/match";
import { weekLabel } from "@/lib/match";
import { formatGameDate, cn } from "@/lib/utils";
import TeamLogo from "./TeamLogo";
import Badge from "./ui/Badge";

export default function MatchCard({ game }: { game: UiGame }) {
  const isFinal = game.state === "final";
  const isLive = game.state === "live";
  const homeWon = isFinal && (game.home.score ?? 0) > (game.away.score ?? 0);
  const awayWon = isFinal && (game.away.score ?? 0) > (game.home.score ?? 0);
  const tied =
    isFinal &&
    game.home.score !== null &&
    game.home.score === game.away.score;

  return (
    <article
      className={cn(
        "card card-hover animate-fade-up p-5",
        isLive && "border-brand-red/50 shadow-glow",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge variant={game.label ? "gold" : "muted"}>{weekLabel(game)}</Badge>

        {isLive ? (
          <span className="pill bg-brand-red text-white">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            EN VIVO
          </span>
        ) : isFinal ? (
          <Badge variant="success">{tied ? "Empate" : "Final"}</Badge>
        ) : (
          <span className="text-xs text-white/60">
            {game.date ? formatGameDate(game.date.toISOString()) : "Por definir"}
          </span>
        )}
      </div>

      <Row side={game.away} label="VISITA" dimmed={isFinal && !awayWon && !tied} winner={awayWon} showScore={!!(isFinal || isLive)} />
      <div className="my-2 h-px bg-white/10" />
      <Row side={game.home} label="CASA" dimmed={isFinal && !homeWon && !tied} winner={homeWon} showScore={!!(isFinal || isLive)} />

      <div className="mt-4 text-xs text-white/50">
        <span className="truncate">{game.venue || "Sede por confirmar"}</span>
      </div>
    </article>
  );
}

function Row({
  side,
  label,
  dimmed,
  winner,
  showScore,
}: {
  side: UiGameSide;
  label: string;
  dimmed?: boolean;
  winner?: boolean;
  showScore?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", dimmed && "opacity-60")}>
      <TeamLogo name={side.name} team={side.team} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </div>
        <div
          className={cn(
            "truncate font-display text-base text-white",
            winner && "text-brand-gold-300",
          )}
        >
          {side.team?.name ?? side.name}
        </div>
      </div>
      <div
        className={cn(
          "font-display text-2xl tabular-nums",
          winner ? "text-brand-gold-300" : "text-white",
        )}
      >
        {showScore ? (side.score ?? 0) : "—"}
      </div>
    </div>
  );
}
