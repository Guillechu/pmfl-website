// ----------------------------------------------------------------------
// Álbumes de la galería.
//
// Un álbum = una subcarpeta de CLOUDINARY_FOLDER (p. ej. pmfl/jornada-1).
// Se leen EN VIVO desde Cloudinary, así que las fotos que sube el
// fotógrafo aparecen en el sitio sin tocar código ni reconstruir la imagen.
//
// Si Cloudinary no está configurado o falla, se cae a data/gallery.json
// (el listado curado del Combine 2026) para que la página nunca quede vacía.
// ----------------------------------------------------------------------

import type { GalleryImage } from "./types";
import { gallery as staticGallery } from "./data";
import {
  ROOT_FOLDER,
  cloudinaryConfigured,
  contextOf,
  listAssets,
  listFolders,
  type CloudinaryAsset,
} from "./cloudinary-server";

export interface Album {
  /** Carpeta: "jornada-1". */
  slug: string;
  /** Nombre a mostrar: "Jornada 1". */
  title: string;
  /** Fecha de la foto más reciente (ISO), para ordenar. */
  latest: string | null;
  photos: GalleryImage[];
}

/** "jornada-1" → "Jornada 1"; "combine-2026" → "Combine 2026". */
export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Carpeta del asset: preferimos asset_folder y si no, la ruta del public_id. */
function folderOf(a: CloudinaryAsset): string {
  if (a.asset_folder) return a.asset_folder;
  if (a.folder) return a.folder;
  const parts = a.public_id.split("/");
  return parts.slice(0, -1).join("/");
}

/** Último segmento de la carpeta = slug del álbum. */
function slugOf(a: CloudinaryAsset): string {
  const folder = folderOf(a);
  const rel = folder.startsWith(`${ROOT_FOLDER}/`)
    ? folder.slice(ROOT_FOLDER.length + 1)
    : folder;
  // Si alguien anida más (pmfl/2026/jornada-1), tomamos el último nivel.
  return rel.split("/").filter(Boolean).pop() ?? "general";
}

/** Álbumes a partir de data/gallery.json (respaldo). */
function albumsFromStatic(): Album[] {
  const byCategory = new Map<string, GalleryImage[]>();
  for (const img of staticGallery) {
    const key = img.category || "General";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(img);
  }
  return [...byCategory.entries()].map(([title, photos]) => ({
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    latest: null,
    photos,
  }));
}

/**
 * Todos los álbumes con sus fotos, el más reciente primero.
 *
 * @param revalidate segundos de caché de las llamadas a Cloudinary
 *                   (0 = siempre fresco, para el panel del fotógrafo).
 * @param includeEmpty incluir carpetas sin fotos (útil en el panel, para
 *                   que un álbum recién creado ya se pueda seleccionar).
 */
export async function getAlbums(
  revalidate = 60,
  includeEmpty = false,
): Promise<Album[]> {
  if (!cloudinaryConfigured) return albumsFromStatic();

  try {
    const [assets, folders] = await Promise.all([
      listAssets(revalidate),
      includeEmpty ? listFolders(revalidate) : Promise.resolve<string[]>([]),
    ]);

    const map = new Map<string, Album>();

    const ensure = (slug: string) => {
      if (!map.has(slug)) {
        map.set(slug, {
          slug,
          title: titleFromSlug(slug),
          latest: null,
          photos: [],
        });
      }
      return map.get(slug)!;
    };

    for (const slug of folders) ensure(slug);

    for (const a of assets) {
      const slug = slugOf(a);
      const album = ensure(slug);

      // El nombre lo puede fijar el panel al subir (context album=...).
      const custom = contextOf(a);
      if (custom.album) album.title = custom.album;

      album.photos.push({
        id: a.public_id,
        publicId: a.public_id,
        width: a.width,
        height: a.height,
        alt: custom.alt || `Foto de ${album.title} — PMFL`,
        category: album.title,
      });

      if (!album.latest || a.created_at > album.latest) {
        album.latest = a.created_at;
      }
    }

    // La categoría de cada foto debe reflejar el título final del álbum
    // (puede haberse fijado después de crear las primeras fotos).
    const albums = [...map.values()].map((al) => ({
      ...al,
      photos: al.photos.map((p) => ({ ...p, category: al.title })),
    }));

    // Álbum con fotos más recientes primero; los vacíos, al final.
    albums.sort((a, b) => {
      if (!a.latest && !b.latest) return a.title.localeCompare(b.title, "es");
      if (!a.latest) return 1;
      if (!b.latest) return -1;
      return b.latest.localeCompare(a.latest);
    });

    if (albums.length === 0) return albumsFromStatic();
    return albums;
  } catch (err) {
    console.error("[albums] no se pudieron leer de Cloudinary:", err);
    return albumsFromStatic();
  }
}
