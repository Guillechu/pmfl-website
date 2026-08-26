// ----------------------------------------------------------------------
// Preparación de fotos en el navegador, antes de subirlas a Cloudinary.
//
// Cloudinary tiene un tope DURO por imagen que no depende de nuestro
// código: en el plan gratuito son 10 MB y 25 megapíxeles (consultable en
// `GET /usage` → `media_limits`). Las cámaras del fotógrafo sacan JPEG de
// 20-30 MB, así que Cloudinary los rechazaba con "File size too large".
//
// Reducimos aquí para que quepan, pero con una regla: primero se sacrifica
// calidad de compresión, nunca resolución. Un JPEG de 24 MP al 90 % ronda
// los 7 MB y entra bajo el tope conservando todos los píxeles; bajarlo a
// 4000 px, como se hacía antes, tiraba la mitad de la foto sin necesidad y
// de forma irreversible.
//
// Lo que este archivo NO puede evitar: el canvas devuelve píxeles pelados,
// así que la copia reencodeada pierde el EXIF (cámara, fecha, autor) y el
// perfil de color del original. Por eso solo se toca lo que no cabe: si el
// archivo ya entra bajo el tope se sube tal cual, con sus metadatos. La
// mejor foto es siempre la que no pasa por aquí — si el fotógrafo exporta
// al 90 % en vez del 100 %, sus archivos bajan de 20 MB a ~7 MB y esta
// función ni se activa.
// ----------------------------------------------------------------------

/** Tope real de Cloudinary por imagen (plan gratuito). */
export const CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024;

/** Objetivo al reducir: con margen, para no rozar el tope. */
const TARGET_BYTES = 9 * 1024 * 1024;

/** Tope de píxeles de Cloudinary (25 MP). */
const MAX_PIXELS = 25_000_000;

/**
 * Intentos, de mejor a peor. Se para en el primero que quepa.
 *
 * El orden importa y antes estaba mal: el primer escalón bajaba ya a
 * 4000 px, así que una foto de 24 MP perdía la mitad de sus píxeles para
 * siempre aunque hubiese cabido de sobra solo tocando la calidad. En la
 * galería quedaron 55 fotos clavadas en 4000 px por esto.
 *
 * Ahora se agota la calidad ANTES que la resolución: un JPEG de 24 MP a
 * calidad 0.90 ronda los 7 MB, entra bajo el tope y conserva todos los
 * píxeles. Solo si ni al 0.85 cabe —panorámicas, ráfagas gigantes— se
 * empieza a recortar tamaño, y en escalones suaves.
 */
const STEPS: Array<{ maxEdge: number; quality: number }> = [
  // Resolución nativa (topada a 25 MP por Cloudinary, ver MAX_PIXELS).
  { maxEdge: Infinity, quality: 0.95 },
  { maxEdge: Infinity, quality: 0.9 },
  { maxEdge: Infinity, quality: 0.85 },
  // Último recurso: aquí sí se pierden píxeles.
  { maxEdge: 5000, quality: 0.88 },
  { maxEdge: 4000, quality: 0.86 },
  { maxEdge: 3200, quality: 0.84 },
  { maxEdge: 2600, quality: 0.82 },
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
    let canvas: HTMLCanvasElement | null = null;
    let dibujadoW = 0;
    let dibujadoH = 0;
    let ultimaCalidad = Infinity;

    try {
      for (const step of STEPS) {
        // Nunca ampliamos, y de paso respetamos el tope de megapíxeles.
        const scale = Math.min(
          1,
          step.maxEdge / Math.max(img.w, img.h),
          Math.sqrt(MAX_PIXELS / (img.w * img.h)),
        );
        const w = Math.max(1, Math.round(img.w * scale));
        const h = Math.max(1, Math.round(img.h * scale));

        // Si la foto ya era pequeña, varios escalones dan el mismo tamaño.
        // Reintentar ahí con MÁS calidad que la que acaba de no caber solo
        // gastaría segundos: el archivo saldría aún más grande.
        if (w === dibujadoW && h === dibujadoH && step.quality >= ultimaCalidad) {
          continue;
        }

        // Los tres primeros escalones comparten tamaño y solo cambian la
        // calidad: redibujar 25 MP cada vez costaría segundos de más.
        if (!canvas || w !== dibujadoW || h !== dibujadoH) {
          canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("El navegador no pudo preparar la imagen");
          ctx.drawImage(img.src, 0, 0, w, h);
          dibujadoW = w;
          dibujadoH = h;
        }

        const blob = await toBlob(canvas, step.quality);
        ultimaCalidad = step.quality;
        if (!blob) continue;

        best = blob;
        if (blob.size <= TARGET_BYTES) break;
      }
    } finally {
      // Safari no suelta la memoria del canvas hasta que se vacía.
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
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
