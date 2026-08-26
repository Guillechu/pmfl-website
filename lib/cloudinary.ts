// ----------------------------------------------------------------------
// Helper para construir URLs de Cloudinary con optimización automática.
//
// El "cloud name" es público (aparece en todas las URLs de imagen), así
// que se puede usar en el cliente. La API key/secret NUNCA se usan aquí:
// solo sirven para SUBIR imágenes (script aparte), no para mostrarlas.
// ----------------------------------------------------------------------

import { slugify } from "@/lib/utils";

const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "muaeugzh";

const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

interface CldOptions {
  /** Ancho objetivo en px. */
  width?: number;
  /** Modo de recorte (c_...). "limit" conserva proporción sin ampliar. */
  crop?: "limit" | "fill" | "scale";
  /** Relación de aspecto para c_fill (ej. "1:1"). */
  aspect?: string;
  /** Difuminado para placeholders (px). */
  blur?: number;
}

/**
 * Devuelve una URL optimizada. `f_auto` elige el mejor formato (WebP/AVIF)
 * y `q_auto` la mejor calidad/peso automáticamente.
 */
export function cldUrl(publicId: string, opts: CldOptions = {}): string {
  const t: string[] = ["f_auto", "q_auto"];
  if (opts.crop) t.push(`c_${opts.crop}`);
  if (opts.width) t.push(`w_${opts.width}`);
  if (opts.aspect) t.push(`ar_${opts.aspect}`);
  if (opts.blur) t.push(`e_blur:${opts.blur}`, "q_10");
  return `${BASE}/${t.join(",")}/${publicId}`;
}

/** Miniatura para la cuadrícula (conserva proporción). */
export function cldThumb(publicId: string, width = 600): string {
  return cldUrl(publicId, { width, crop: "limit" });
}

/** Imagen grande para el lightbox. */
export function cldFull(publicId: string, width = 1600): string {
  return cldUrl(publicId, { width, crop: "limit" });
}

/** Placeholder minúsculo y difuminado (carga instantánea). */
export function cldBlur(publicId: string): string {
  return cldUrl(publicId, { width: 40, crop: "limit", blur: 1000 });
}

/**
 * URL de DESCARGA: el archivo original, tal cual se subió.
 *
 * Ojo con lo que NO lleva: ni `f_auto` ni `q_auto`. Esas dos son perfectas
 * para MOSTRAR la foto —pesan la cuarta parte y en pantalla se ven igual—,
 * pero aplicadas a la descarga devuelven un WebP recomprimido. Medido sobre
 * una foto real de la galería: el original son 6.8 MB y con `f_auto,q_auto`
 * bajaban 1.4 MB. No se pierde nitidez ni resolución, se pierde el detalle
 * fino (la trama del uniforme, el grano), que es justo lo que se nota al
 * mirar la foto de cerca. Sin transformación, Cloudinary sirve el archivo
 * original byte por byte.
 *
 * `fl_attachment` marca la respuesta como descarga y le pone nombre. Hace
 * falta porque el atributo `download` de un <a> se ignora cuando el enlace
 * apunta a otro dominio: sin esto el navegador abría la foto en una pestaña
 * en vez de guardarla, y había que recurrir a "guardar como".
 */
export function cldDownload(publicId: string): string {
  // El nombre viaja dentro de la ruta de transformación, donde la coma
  // separa parámetros y el punto marca el formato: hay que dejarlo en
  // letras, números y guiones. slugify() ya hace justo eso.
  const name = slugify(publicId) || "pmfl";
  return `${BASE}/fl_attachment:${name}/${publicId}`;
}
