// ----------------------------------------------------------------------
// Modelo único de partido para la interfaz.
//
// El sitio tiene dos fuentes de partidos:
//   1. Cloob (en vivo) — la buena: marcador, estado, jornada y sede reales.
//   2. data/schedule.json (estático) — respaldo mientras el torneo de la
//      temporada no esté cargado en Cloob.
//
// Ambas se normalizan a `UiGame` para que las páginas y <MatchCard/> no
// tengan que saber de dónde vino cada partido.
// ----------------------------------------------------------------------

import type { CloobMatch } from "./cloob";
import type { Game, Team } from "./types";
import { getTeam, teamByName } from "./data";

export interface UiGameSide {
  /** Nombre a mostrar. */
  name: string;
  /** Equipo local del /data (para logo y enlace); undefined si no cuadra. */
  team?: Team;
  score: number | null;
}

export interface UiGame {
  id: string;
  /** Jornada. null en playoffs/finales. */
  week: number | null;
  /** Etiqueta alternativa a "Jornada N" (p. ej. "Final", "Semifinales"). */
  label?: string;
  /** Instante de inicio, o null si la fuente no lo da. */
  date: Date | null;
  venue: string;
  home: UiGameSide;
  away: UiGameSide;
  state: "scheduled" | "live" | "final";
  source: "cloob" | "local";
}

/** Partido de Cloob → UiGame. */
export function fromCloob(m: CloobMatch): UiGame {
  return {
    id: m.id,
    week: m.week,
    // En playoffs Cloob no numera la jornada y el título ya dice qué es.
    label: m.type === "ROUND" ? m.title : undefined,
    date: m.date,
    venue: m.venue,
    home: {
      name: m.homeTeam,
      team: teamByName(m.homeTeam),
      score: m.homeScore,
    },
    away: {
      name: m.awayTeam,
      team: teamByName(m.awayTeam),
      score: m.awayScore,
    },
    state: m.state,
    source: "cloob",
  };
}

/** Partido del JSON estático → UiGame. */
export function fromLocal(g: Game): UiGame {
  const home = getTeam(g.homeTeamId);
  const away = getTeam(g.awayTeamId);
  return {
    id: g.id,
    week: g.week,
    date: g.date ? new Date(g.date) : null,
    venue: g.venue,
    home: { name: home?.name ?? g.homeTeamId, team: home, score: g.homeScore },
    away: { name: away?.name ?? g.awayTeamId, team: away, score: g.awayScore },
    state:
      g.status === "final"
        ? "final"
        : g.status === "live"
          ? "live"
          : "scheduled",
    source: "local",
  };
}

/** Etiqueta de la jornada: "Jornada 3", "Final", o "Partido". */
export function weekLabel(g: UiGame): string {
  if (g.label) return g.label;
  if (g.week !== null) return `Jornada ${g.week}`;
  return "Partido";
}

/** Agrupa por jornada, ordenado; los playoffs (week null) van al final. */
export function groupByWeek(games: UiGame[]): Array<[number | null, UiGame[]]> {
  const m = new Map<number | null, UiGame[]>();
  for (const g of games) {
    const key = g.week ?? null;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(g);
  }
  return [...m.entries()].sort(([a], [b]) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
}
