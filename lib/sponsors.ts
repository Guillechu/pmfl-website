// ----------------------------------------------------------------------
// Patrocinadores.
//
// Se guardan en Cloudinary, en la carpeta pmfl/patrocinadores: cada logo
// ES el patrocinador, y su nombre, categoría, enlace y orden viven en el
// `context` de la propia imagen. Así se administran desde /admin sin
// tocar archivos ni reconstruir la imagen Docker.
//
// Si Cloudinary no responde —o todavía no hay ninguno subido— se usa
// data/sponsors.json, el listado de siempre. La página nunca queda vacía.
// ----------------------------------------------------------------------

import type { Sponsor, SponsorCategory } from "./types";
import { sponsors as staticSponsors } from "./data";
import { cldUrl } from "./cloudinary";
import {
  cloudinaryConfigured,
  contextOf,
  listAssetsInAlbum,
  type CloudinaryAsset,
} from "./cloudinary-server";

/** Carpeta de Cloudinary: pmfl/patrocinadores. */
export const SPONSORS_ALBUM = "patrocinadores";

/** Las tres categorías que sabe pintar el sitio. */
export const SPONSOR_CATEGORIES: SponsorCategory[] = [
  "Patrocinadores",
  "Alianzas",
  "Team Partners",
];

/** Patrocinador tal como lo maneja el panel (con su id de Cloudinary). */
export interface ManagedSponsor extends Sponsor {
  /** public_id en Cloudinary. Vacío si viene del JSON estático. */
  publicId: string;
  order: number;
  /** true si se puede editar/borrar desde el panel. */
  editable: boolean;
}

function normalizeCategory(raw: string | undefined): SponsorCategory {
  const found = SPONSOR_CATEGORIES.find(
    (c) => c.toLowerCase() === (raw ?? "").trim().toLowerCase(),
  );
  return found ?? "Patrocinadores";
}

function fromAsset(a: CloudinaryAsset): ManagedSponsor {
  const ctx = contextOf(a);
  const name = ctx.name?.trim() || a.public_id.split("/").pop() || "Sin nombre";
  const order = Number(ctx.order);

  return {
    id: a.public_id,
    publicId: a.public_id,
    name,
    category: normalizeCategory(ctx.category),
    url: ctx.url?.trim() || "#",
    // Ancho generoso: los "Patrocinadores" se pintan hasta 440 px.
    logo: cldUrl(a.public_id, { width: 600, crop: "limit" }),
    order: Number.isFinite(order) ? order : 100,
    editable: true,
  };
}

/**
 * Nombre normalizado para comparar el listado de Cloudinary con el de
 * /data: sin tildes, sin mayúsculas y sin signos. "Seco Épico" y
 * "seco epic" no deben contar como dos patrocinadores distintos.
 */
function claveNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function fromStatic(s: Sponsor, i: number): ManagedSponsor {
  return { ...s, publicId: "", order: 100 + i, editable: false };
}

/**
 * Todos los patrocinadores, ordenados por su campo `order` y, a igualdad,
 * por nombre.
 *
 * @param revalidate segundos de caché (0 = siempre fresco, para el panel).
 */
export async function getSponsors(revalidate = 60): Promise<ManagedSponsor[]> {
  let managed: ManagedSponsor[] = [];

  if (cloudinaryConfigured) {
    try {
      const assets = await listAssetsInAlbum(SPONSORS_ALBUM, revalidate);
      managed = assets.map(fromAsset);
    } catch (err) {
      console.error("[sponsors] no se pudieron leer de Cloudinary:", err);
    }
  }

  // Cloudinary manda, pero NUNCA recorta.
  //
  // Antes esto era todo o nada: en cuanto Cloudinary devolvía un solo
  // patrocinador, los de data/sponsors.json se descartaban enteros. Al
  // configurarse Cloudinary, el sitio pasó de 42 patrocinadores a los 16
  // que había subidos y desaparecieron 26 sin que nadie tocara código.
  //
  // Ahora se combinan: los de Cloudinary primero, y detrás los del JSON
  // que todavía no se han subido allí, emparejando por nombre para no
  // duplicar a nadie.
  const yaEnCloudinary = new Set(managed.map((m) => claveNombre(m.name)));
  const pendientes = staticSponsors
    .map(fromStatic)
    .filter((s) => !yaEnCloudinary.has(claveNombre(s.name)));

  return [...managed, ...pendientes].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"),
  );
}

/** Los mismos datos, con la forma que esperan los componentes públicos. */
export async function getPublicSponsors(revalidate = 60): Promise<Sponsor[]> {
  const list = await getSponsors(revalidate);
  return list.map(({ id, name, category, url, logo }) => ({
    id,
    name,
    category,
    url,
    logo,
  }));
}
