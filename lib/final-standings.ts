import type { CloobStanding } from "./cloob";
import { finalStandingsOrder } from "./data";
import { slugify } from "./utils";

export interface FinalStanding extends CloobStanding {
  /** "Campeón", "Subcampeón", "Semifinalista"… solo en la clasificación final. */
  titulo?: string;
}

/** true cuando la temporada ya tiene clasificación final. */
export const isFinalStandings = finalStandingsOrder.length > 0;

/**
 * Clasificación final: los equipos de clasificacionFinal en
 * data/playoffs.json (campeón, subcampeón, semifinalistas) arriba y en ese
 * orden; el resto, en el de la temporada regular. Los números (récord,
 * puntos, diferencia) siguen siendo los de Cloob; solo cambia el puesto.
 */
export function withFinalOrder(rows: CloobStanding[]): FinalStanding[] {
  if (!isFinalStandings) return rows;
  const key = (n: string) => slugify(n);
  const head = finalStandingsOrder.flatMap((o) => {
    const row = rows.find((r) => key(r.name) === key(o.equipo));
    return row ? [{ ...row, titulo: o.titulo }] : [];
  });
  const rest = rows.filter(
    (r) => !finalStandingsOrder.some((o) => key(o.equipo) === key(r.name)),
  );
  return [...head, ...rest].map((r, i) => ({ ...r, position: i + 1 }));
}
