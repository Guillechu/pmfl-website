// ----------------------------------------------------------------------
// Cloudinary del lado servidor: firma de subidas y Admin API.
//
// No usamos el SDK de Cloudinary a propósito: todo lo que necesitamos son
// dos cosas que el runtime ya trae —un SHA-1 (node:crypto) para firmar y
// fetch para el Admin API—, así el proyecto no gana dependencias.
//
// LA API SECRET NUNCA SALE DE AQUÍ. El navegador solo recibe una firma
// de un solo uso, atada a la carpeta y a un timestamp.
// ----------------------------------------------------------------------

import crypto from "node:crypto";

export const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";
/** Carpeta raíz del proyecto en Cloudinary (aísla PMFL de otros sitios). */
export const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER ?? "pmfl";

/** Etiqueta de caché de los listados de Cloudinary (ver revalidateTag). */
export const ALBUMS_TAG = "cloudinary-albums";

export const cloudinaryConfigured = Boolean(
  CLOUD_NAME && API_KEY && API_SECRET,
);

/** Datos públicos que sí puede ver el navegador. */
export function publicConfig() {
  return { cloudName: CLOUD_NAME, apiKey: API_KEY, rootFolder: ROOT_FOLDER };
}

/**
 * Firma para una subida directa desde el navegador.
 *
 * Cloudinary exige SHA-1 de los parámetros ordenados alfabéticamente
 * (`clave=valor` unidos por `&`) con la api_secret pegada al final.
 */
export function signUpload(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(toSign + API_SECRET)
    .digest("hex");
}

/** Cabecera de autenticación básica del Admin API. */
function adminAuth(): string {
  return (
    "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")
  );
}

/**
 * Llamada al Admin API de Cloudinary.
 *
 * `revalidate` controla el caché de Next: 0 = siempre fresco (usado por el
 * panel), > 0 = cacheado (usado por la galería pública).
 */
async function adminApi<T>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "DELETE";
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    revalidate?: number;
  } = {},
): Promise<T> {
  const { method = "GET", query, body, revalidate = 0 } = opts;
  const url = new URL(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${path}`,
  );
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: adminAuth(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    // La etiqueta permite refrescar la galería al instante después de
    // subir fotos (revalidateTag), sin esperar a que expire el caché.
    ...(revalidate > 0
      ? { next: { revalidate, tags: [ALBUMS_TAG] } }
      : { cache: "no-store" as const }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } })?.error?.message ??
      `HTTP ${res.status}`;
    throw new Error(`Cloudinary: ${msg}`);
  }
  return json as T;
}

// -------- álbumes (carpetas dentro de ROOT_FOLDER) --------------------

export interface CloudinaryAsset {
  public_id: string;
  width: number;
  height: number;
  created_at: string;
  asset_folder?: string;
  folder?: string;
  /**
   * Ojo: Cloudinary devuelve el context con DOS formas distintas. Al
   * subir viene anidado (`{custom: {...}}`) y en la API de búsqueda viene
   * plano (`{name: "..."}`). Usa contextOf() en vez de leerlo a mano.
   */
  context?: Record<string, unknown>;
}

/** Pares clave/valor del context, sin importar en qué forma vengan. */
export function contextOf(a: CloudinaryAsset): Record<string, string> {
  const ctx = a.context;
  if (!ctx) return {};
  const inner = (ctx.custom ?? ctx) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(inner)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Crea la carpeta del álbum. Idempotente: si ya existe, no falla. */
export async function createFolder(slug: string): Promise<void> {
  await adminApi(`folders/${ROOT_FOLDER}/${slug}`, { method: "POST" });
}

/** Lista las subcarpetas de ROOT_FOLDER (un álbum por carpeta). */
export async function listFolders(revalidate = 0): Promise<string[]> {
  const data = await adminApi<{ folders?: Array<{ name: string }> }>(
    `folders/${ROOT_FOLDER}`,
    { revalidate },
  );
  return (data.folders ?? []).map((f) => f.name);
}

/**
 * Todas las fotos bajo ROOT_FOLDER, más recientes primero.
 *
 * `max_results` topa en 500 por página, así que paginamos con el cursor
 * hasta traerlas todas (o hasta `hardLimit`, por seguridad).
 */
export async function listAssets(
  revalidate = 0,
  hardLimit = 2000,
): Promise<CloudinaryAsset[]> {
  const out: CloudinaryAsset[] = [];
  let cursor: string | undefined;

  do {
    const data = await adminApi<{
      resources?: CloudinaryAsset[];
      next_cursor?: string;
    }>("resources/search", {
      method: "POST",
      body: {
        expression: `folder:${ROOT_FOLDER}/*`,
        sort_by: [{ created_at: "desc" }],
        max_results: 500,
        with_field: ["context"],
        ...(cursor ? { next_cursor: cursor } : {}),
      },
      revalidate,
    });
    out.push(...(data.resources ?? []));
    cursor = data.next_cursor;
  } while (cursor && out.length < hardLimit);

  return out;
}

/**
 * Fotos de UNA sola carpeta (p. ej. pmfl/jugadores). Más barato que
 * listAssets cuando solo interesa un álbum concreto.
 */
export async function listAssetsInAlbum(
  slug: string,
  revalidate = 300,
): Promise<CloudinaryAsset[]> {
  const data = await adminApi<{ resources?: CloudinaryAsset[] }>(
    "resources/search",
    {
      method: "POST",
      body: {
        expression: `folder:${ROOT_FOLDER}/${slug}`,
        max_results: 500,
        with_field: ["context"],
      },
      revalidate,
    },
  );
  return data.resources ?? [];
}

/**
 * Cambia el `context` de un asset ya subido (pares clave=valor).
 * Sirve para editar los datos de un patrocinador sin volver a subir el
 * logo. Reemplaza el context completo, no lo fusiona.
 */
export async function updateAssetContext(
  publicId: string,
  context: Record<string, string>,
): Promise<void> {
  const pairs = Object.entries(context)
    // | y = son los separadores del formato, no pueden ir en los valores.
    .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, " ")}`)
    .join("|");

  const url = new URL(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload/${publicId}`,
  );
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: adminAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ context: pairs }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(`Cloudinary: ${json?.error?.message ?? `HTTP ${res.status}`}`);
  }
}

/** Borra una foto por su public_id. */
export async function deleteAsset(publicId: string): Promise<void> {
  // El endpoint acepta varios public_ids; mandamos uno.
  await adminApi("resources/image/upload", {
    method: "DELETE",
    query: { "public_ids[]": publicId },
  });
}
