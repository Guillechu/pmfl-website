"use client";

import Link from "next/link";
import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import PlayerAvatar from "@/components/PlayerAvatar";

/**
 * Fila del roster.
 *
 * La posición sigue siendo texto libre: en Cloob es un campo del
 * formulario de inscripción y cada club lo escribe a su manera ("OL",
 * "DB-CB", "WR-D-B-QB"). Se muestra verbatim porque no hay catálogo con
 * el que corregirla.
 *
 * La estatura y el peso NO: llegan ya normalizados a metros y libras
 * (ver lib/measurements), así que la columna dice siempre lo mismo
 * venga el dato de Cloob o de data/players.json.
 */
export interface RosterRow {
  id: string;
  name: string;
  number: number;
  position: string;
  /** Estatura en metros, "1.74 m". Vacío si no consta. */
  height: string;
  /** Peso en libras, "168 lb". Vacío si no consta. */
  weight: string;
  photo?: string | null;
  /**
   * Id del jugador en Cloob, con el que se pide su ficha. Solo lo tienen
   * los inscritos ahí; quien solo está en data/players.json no tiene
   * estadísticas que enseñar, así que su fila no enlaza a ningún sitio.
   */
  profileId?: string | null;
}

export default function TeamRosterTable({ roster }: { roster: RosterRow[] }) {
  // La posición se oculta si nadie la tiene: es un dato accesorio. La
  // estatura y el peso se muestran siempre, aunque el equipo entero esté
  // sin rellenar, porque así se ve dónde falta en vez de desaparecer la
  // columna y parecer que el dato no existe en el sitio.
  const hasPosition = roster.some((p) => Boolean(p.position));

  const rosterCols: ColumnDef<RosterRow>[] = [
    {
      key: "photo",
      label: "Foto",
      align: "center",
      className: "w-20",
      render: (player) => {
        const avatar = (
          <PlayerAvatar
            src={player.photo}
            alt={player.name}
            className="mx-auto h-12 w-12 rounded-full border border-brand-navy/10 dark:border-white/10 object-cover"
            fallback={
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.05] dark:bg-white/[0.06] text-xs font-bold text-brand-navy/55 dark:text-white/50"
                aria-label={`Foto de ${player.name} no disponible`}
              >
                {player.name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </div>
            }
          />
        );

        return player.profileId ? (
          <Link
            href={`/players/${player.profileId}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block"
          >
            {avatar}
          </Link>
        ) : (
          avatar
        );
      },
    },
    {
      key: "number",
      label: "N.º",
      align: "center",
      sortable: true,
      // Quien no tiene dorsal asignado va al final de la lista, no al
      // principio como haría un 0.
      sortValue: (player) => player.number || Number.MAX_SAFE_INTEGER,
      className: "w-16",
      render: (player) => player.number || "—",
    },
    {
      key: "name",
      label: "Jugador",
      sortable: true,
      sortValue: (player) => player.name,
      render: (player) =>
        player.profileId ? (
          <Link
            href={`/players/${player.profileId}`}
            className="font-medium text-brand-navy underline-offset-4 transition-colors hover:text-brand-gold-700 hover:underline dark:text-white dark:hover:text-brand-gold-300"
          >
            {player.name}
          </Link>
        ) : (
          player.name
        ),
    },
  ];

  if (hasPosition) {
    rosterCols.push({
      key: "position",
      label: "Posición",
      sortable: true,
      sortValue: (player) => player.position,
      align: "center",
      render: (player) => player.position || "—",
    });
  }

  rosterCols.push({
    key: "height",
    label: "Estatura",
    align: "center",
    sortable: true,
    // Ordena por el número, no por el texto: "1.9 m" va después de
    // "1.75 m" alfabéticamente, que no es lo que espera nadie. Sin dato,
    // al final.
    sortValue: (player) => parseFloat(player.height) || 0,
    render: (player) => player.height || "—",
  });

  rosterCols.push({
    key: "weight",
    label: "Peso",
    align: "center",
    sortable: true,
    sortValue: (player) => parseInt(player.weight, 10) || 0,
    render: (player) => player.weight || "—",
  });

  return (
    <StatsTable
      columns={rosterCols}
      rows={roster}
      initialSort={{ key: "number", dir: "asc" }}
      emptyText="El roster oficial de este equipo se publicará próximamente."
    />
  );
}
