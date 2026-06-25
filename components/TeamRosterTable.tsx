"use client";

import StatsTable, { type ColumnDef } from "@/components/StatsTable";
import type { Player } from "@/lib/types";

export default function TeamRosterTable({ roster }: { roster: Player[] }) {
  const rosterCols: ColumnDef<Player>[] = [
    {
      key: "photo",
      label: "Foto",
      align: "center",
      className: "w-20",
      render: (player) =>
        player.photo ? (
          <img
            src={player.photo}
            alt={player.name}
            className="mx-auto h-12 w-12 rounded-full border border-white/10 object-cover"
          />
        ) : (
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
    {
      key: "position",
      label: "Posición",
      sortable: true,
      sortValue: (player) => player.position,
      align: "center",
      render: (player) =>
        player.position === "TBD" ? "Por definir" : player.position,
    },
    {
      key: "height",
      label: "Estatura",
      align: "center",
    },
    {
      key: "weight",
      label: "Peso",
      align: "center",
      render: (player) => `${player.weight} lb`,
    },
  ];

  return (
    <StatsTable
      columns={rosterCols}
      rows={roster}
      initialSort={{ key: "number", dir: "asc" }}
      emptyText="El roster oficial de este equipo se publicará próximamente."
    />
  );
}
