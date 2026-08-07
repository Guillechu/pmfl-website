// ----------------------------------------------------------------------
// Fotos de jugadores.
//
// Fuente principal: EL ROSTER DE CLOOB. Cada jugador inscrito puede tener
// su foto oficial (`avatar_url`), y su id coincide con el que devuelve el
// ranking de anotadores, así que el emparejamiento es exacto — nada de
// adivinar por nombre.
//
// Respaldos, por si un jugador no tiene foto cargada en Cloob:
//   2. Álbum "Jugadores" de Cloudinary, emparejado por nombre de archivo.
//   3. data/players.json (campo `photo`).
//   4. Sin foto → quien la pinte usa el escudo del equipo.
//
// Nota: los LOGOS de equipo no salen de Cloob. Todas sus consultas que
// exponen `logo` exigen sesión iniciada, así que los escudos vienen de
// /public/teams (ver components/TeamLogo.tsx).
// ----------------------------------------------------------------------

import { players } from "./data";
import { slugify } from "./utils";
import { cldUrl } from "./cloudinary";
import { getRosterById } from "./cloob";
import { cloudinaryConfigured, listAssetsInAlbum } from "./cloudinary-server";

/** Carpeta de Cloudinary donde van los retratos: pmfl/jugadores. */
export const PLAYERS_ALBUM = "jugadores";

/**
 * Limpia el nombre que devuelve Cloob.
 *
 * Llegan cosas como "BRUNO HERNANDEZ  #17", "#87 Jose murillo" o con
 * tabuladores. Devolvemos el nombre limpio y el dorsal por separado.
 */
export function parsePlayerName(raw: string): { name: string; number: string | null } {
  const collapsed = (raw ?? "").replace(/\s+/g, " ").trim();
  const numMatch = collapsed.match(/#\s*(\d+)/);
  const name = collapsed.replace(/#\s*\d+/g, "").replace(/\s+/g, " ").trim();
  return { name: name || collapsed, number: numMatch ? numMatch[1] : null };
}

/** Clave de búsqueda: "Bruno Hernández" y "BRUNO HERNANDEZ" coinciden. */
function keyOf(name: string): string {
  return slugify(parsePlayerName(name).name);
}

export interface PlayerPhotos {
  /** id de Cloob → foto oficial del roster. */
  byId: Map<string, string>;
  /** nombre normalizado → foto (Cloudinary o local). */
  byName: Map<string, string>;
}

/**
 * Construye las tablas de fotos. Las tres fuentes se piden en paralelo y
 * ninguna es obligatoria: si una falla, se sigue con las demás.
 */
export async function getPlayerPhotoMap(): Promise<PlayerPhotos> {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();

  // 3) Fotos locales (las de menor prioridad, se pueden sobreescribir).
  for (const p of players) {
    if (p.photo) byName.set(keyOf(p.name), p.photo);
  }

  const [roster, assets] = await Promise.all([
    getRosterById().catch((err) => {
      console.error("[player-photos] roster de Cloob no disponible:", err);
      return new Map<string, { avatar: string | null; name: string }>();
    }),
    cloudinaryConfigured
      ? listAssetsInAlbum(PLAYERS_ALBUM, 300).catch((err) => {
          console.error("[player-photos] álbum de retratos no disponible:", err);
          return [];
        })
      : Promise.resolve([]),
  ]);

  // 2) Álbum de Cloudinary: pmfl/jugadores/rafael-borges → "rafael-borges".
  for (const a of assets) {
    const filename = a.public_id.split("/").pop() ?? "";
    if (!filename) continue;
    byName.set(
      slugify(filename),
      cldUrl(a.public_id, { width: 400, crop: "fill", aspect: "1:1" }),
    );
  }

  // 1) Roster de Cloob: la fuente principal, emparejada por id.
  for (const [id, p] of roster) {
    if (p.avatar) {
      byId.set(id, p.avatar);
      // También por nombre, por si el ranking trae un id distinto.
      byName.set(keyOf(p.name), p.avatar);
    }
  }

  return { byId, byName };
}

/**
 * Foto de un jugador: primero por su id de Cloob (exacto), y si no la
 * tiene, por nombre. Devuelve null cuando no hay ninguna.
 */
export function photoFor(
  photos: PlayerPhotos,
  playerId: string | null | undefined,
  playerName: string,
): string | null {
  if (playerId && photos.byId.has(playerId)) return photos.byId.get(playerId)!;
  return photos.byName.get(keyOf(playerName)) ?? null;
}
