// Índice del buscador: solo los campos que necesita <SearchBar/>.
//
// Existe para NO empaquetar data/*.json en el bundle de cliente. El
// buscador vive en el Navbar, o sea en todas las páginas, y al importar
// un JSON se incluye entero (webpack no poda dentro de los datos): eran
// ~110 KB de jugadores, galería y calendario en cada carga.
//
// force-static: se genera una vez al construir y se sirve desde el CDN.

import { NextResponse } from "next/server";
import { teams, players } from "@/lib/data";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      city: t.city,
      abbreviation: t.abbreviation,
      conference: t.conference ?? "",
    })),
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      teamId: p.teamId,
      position: p.position,
    })),
  });
}
