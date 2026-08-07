// ----------------------------------------------------------------------
// Helper para construir URLs de Cloudinary con optimización automática.
//
// El "cloud name" es público (aparece en todas las URLs de imagen), así
// que se puede usar en el cliente. La API key/secret NUNCA se usan aquí:
// solo sirven para SUBIR imágenes (script aparte), no para mostrarlas.
// ----------------------------------------------------------------------

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
