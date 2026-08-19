// ----------------------------------------------------------------------
// Preparación de fotos en el navegador, antes de subirlas a Cloudinary.
//
// Cloudinary tiene un tope DURO por imagen que no depende de nuestro
// código: en el plan gratuito son 10 MB y 25 megapíxeles (consultable en
// `GET /usage` → `media_limits`). Las cámaras del fotógrafo sacan JPEG de
// 20-30 MB, así que Cloudinary los rechazaba con "File size too large".
//
// En vez de pedirle que exporte más pequeño, reducimos aquí: el archivo
// se redibuja en un canvas a 4000 px de lado mayor y se reencoda en JPEG
// de alta calidad. Un JPEG de 25 MB baja a 3-4 MB sin diferencia visible:
// la galería sirve 600 px en la cuadrícula y 1600 px en el visor, y hasta
// la descarga a tamaño completo se queda muy por encima de lo que un
// navegador muestra. Solo se toca lo que no cabe; lo que ya pesa poco se
// sube tal cual, con sus metadatos intactos.
// ----------------------------------------------------------------------

/** Tope real de Cloudinary por imagen (plan gratuito). */
export const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024;

/** Objetivo al reducir: con margen, para no rozar el tope. */
const TARGET_BYTES = 9 * 1024 * 1024;

/** Tope de píxeles de Cloudinary (25 MP). */
const MAX_PIXELS = 25_000_000;

/**
 * Intentos, de mejor a peor. Se para en el primero que quepa, así que una
 * foto normal de 24 MP sale en el primer intento y solo las bestias
 * (panorámicas, ráfagas a 60 MP) llegan a bajar de resolución.
 */
const STEPS = [
  { maxEdge: 4000, quality: 0.92 },
  { maxEdge: 4000, quality: 0.85 },
  { maxEdge: 3200, quality: 0.85 },
  { maxEdge: 2600, quality: 0.82 },
  { maxEdge: 2000, quality: 0.8 },
];

export interface PreparedFile {
  file: File;
  /** true si hubo que reencodear. */
  shrunk: boolean;
  originalSize: number;
}

interface Decoded {
  src: CanvasImageSource;
  w: number;
  h: number;
  release: () => void;
}

/**
 * Decodifica el archivo respetando la orientación EXIF. Sin esto, las
 * fotos verticales de cámara salen tumbadas al pasar por el canvas.
 */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { src: bmp, w: bmp.width, h: bmp.height, release: () => bmp.close() };
    } catch {
      // Navegador sin soporte de la opción: seguimos con <img>, que ya
      // aplica la orientación por su cuenta.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      src: img,
      w: img.naturalWidth,
      h: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** "IMG_1234.CR2.png" → "IMG_1234.CR2.jpg" (el nombre base no cambia). */
function jpegName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

export async function prepareForUpload(file: File): Promise<PreparedFile> {
  if (file.size <= TARGET_BYTES) {
    return { file, shrunk: false, originalSize: file.size };
  }

  const img = await decode(file);
  try {
    if (!img.w || !img.h) throw new Error("No se pudo leer la imagen");

    let best: Blob | null = null;
    for (const step of STEPS) {
      // Nunca ampliamos, y de paso respetamos el tope de megapíxeles.
      const scale = Math.min(
        1,
        step.maxEdge / Math.max(img.w, img.h),
        Math.sqrt(MAX_PIXELS / (img.w * img.h)),
      );
      const w = Math.max(1, Math.round(img.w * scale));
      const h = Math.max(1, Math.round(img.h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("El navegador no pudo preparar la imagen");
      ctx.drawImage(img.src, 0, 0, w, h);

      const blob = await toBlob(canvas, step.quality);
      // Safari no suelta la memoria del canvas hasta que se vacía.
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) continue;

      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }

    if (!best || best.size > CLOUDINARY_MAX_BYTES) {
      throw new Error("Demasiado grande incluso reducida");
    }

    return {
      file: new File([best], jpegName(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      }),
      shrunk: true,
      originalSize: file.size,
    };
  } finally {
    img.release();
  }
}
