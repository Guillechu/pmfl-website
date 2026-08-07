"use client";

import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import PlayerAvatar from "@/components/PlayerAvatar";

/**
 * Fila del roster.
 *
 * Posición, estatura y peso son TEXTO, no números tipados: en Cloob son
 * campos libres del formulario de inscripción y cada club los escribe a
 * su manera ("1.79", "310 lbs"). Se muestran verbatim en vez de
 * reinterpretarlos o añadirles unidades que nadie escribió.
 */
export interface RosterRow {
  id: string;
  name: string;
  number: number;
  position: string;
  height: string;
  weight: string;
  photo?: string | null;
}

export default function TeamRosterTable({ roster }: { roster: RosterRow[] }) {
  // Si ningún jugador tiene un dato, se oculta esa columna entera en vez
  // de dejar una tabla llena de guiones.
  const hasPosition = roster.some((p) => Boolean(p.position));
  const hasHeight = roster.some((p) => Boolean(p.height));
  const hasWeight = roster.some((p) => Boolean(p.weight));

  const rosterCols: ColumnDef<RosterRow>[] = [
    {
      key: "photo",
      label: "Foto",
      align: "center",
      className: "w-20",
      render: (player) => (
        <PlayerAvatar
          src={player.photo}
          alt={player.name}
          className="mx-auto h-12 w-12 rounded-full border border-white/10 object-cover"
          fallback={
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-bold text-white/50"
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
      ),
    },
    {
      key: "number",
      label: "N.º",
      align: "center",
      sortable: true,
      sortValue: (player) => player.number,
      className: "w-16",
    },
    {
      key: "name",
      label: "Jugador",
      sortable: true,
      sortValue: (player) => player.name,
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

  if (hasHeight) {
    rosterCols.push({
      key: "height",
      label: "Estatura",
      align: "center",
      render: (player) => player.height || "—",
    });
  }

  if (hasWeight) {
    rosterCols.push({
      key: "weight",
      label: "Peso",
      align: "center",
      render: (player) => player.weight || "—",
    });
  }

  return (
    <StatsTable
      columns={rosterCols}
      rows={roster}
      initialSort={{ key: "number", dir: "asc" }}
      emptyText="El roster oficial de este equipo se publicará próximamente."
    />
  );
}
