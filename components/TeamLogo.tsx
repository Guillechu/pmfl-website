// Logo de equipo, único para todo el sitio.
//
// Si el equipo existe en /data usa su escudo real. Si viene de Cloob y no
// lo tenemos localmente (p. ej. un club que jugó una temporada anterior),
// cae en una insignia con la inicial y un color estable derivado del
// nombre — nunca un hueco vacío.
//
// Sin hooks a propósito: así sirve igual en Server y en Client Components.

import Image from "next/image";
import type { Team } from "@/lib/types";
import { teamByName } from "@/lib/data";
import { cn } from "@/lib/utils";

const BADGE_COLORS = [
  "#C8102E", "#0B1F3A", "#D4AF37", "#1e7f4f",
  "#5b2a86", "#b5651d", "#0e7490", "#9d174d",
];

/** Color estable a partir del nombre (el mismo equipo, siempre igual). */
function colorFor(name: string, team?: Team): string {
  if (team?.primaryColor) return team.primaryColor;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

export default function TeamLogo({
  name,
  team,
  className = "h-10 w-10",
  rounded = "rounded-lg",
}: {
  /** Nombre del equipo (el de Cloob sirve). */
  name: string;
  /** Equipo local ya resuelto. Si no se pasa, se busca por nombre. */
  team?: Team;
  className?: string;
  rounded?: string;
}) {
  const resolved = team ?? teamByName(name);

  // Rival aún sin decidir (cruces de playoff): un hueco neutro, no una
  // inicial de colores que parezca un equipo real.
  if (!name || name === "Por definir") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-dashed border-white/20 bg-white/[0.03] text-white/30",
          rounded,
          className,
        )}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }

  if (resolved?.logo) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-white/10 bg-white/5",
          rounded,
          className,
        )}
      >
        <Image
          src={resolved.logo}
          alt={`Escudo de ${resolved.name}`}
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      </div>
    );
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-black text-white ring-1 ring-white/20",
        rounded,
        className,
      )}
      style={{ backgroundColor: colorFor(name, resolved) }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
