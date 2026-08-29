// ----------------------------------------------------------------------
// Estatura y peso del roster, siempre en las mismas unidades: metros y
// libras.
//
// Los valores llegan de dos sitios y ninguno obliga a un formato.
// data/players.json los trae ya limpios ("1.76 m", 300), pero en Cloob
// son campos libres del formulario de inscripción y cada club escribe lo
// que quiere: "1,74", "174 cm", "5'10\"", "76 kg", "310 lbs". Antes se
// mostraban verbatim, así que la columna podía mezclar tres unidades.
// Aquí se convierten al leerlos y la tabla dice siempre lo mismo.
//
// Lo que no se entiende NO se inventa: devuelve "" y la tabla pinta un
// guion. Es preferible a enseñar una cifra que nadie escribió.
// ----------------------------------------------------------------------

const PIE_EN_METROS = 0.3048;
const PULGADA_EN_METROS = 0.0254;
const KILO_EN_LIBRAS = 2.2046226;

/** Primer número del texto, aceptando la coma decimal que se usa aquí. */
function primerNumero(texto: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(texto);
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Estatura a metros, con dos decimales ("1.74 m").
 *
 * Acepta metros, centímetros y pies/pulgadas. Un número suelto se
 * interpreta por su magnitud: 1,2-2,4 son metros y 120-250 son
 * centímetros, rangos que no se solapan. Fuera de ahí no hay forma de
 * saber qué quiso decir el club, así que se descarta.
 */
export function toMeters(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const texto = String(raw).trim().toLowerCase();
  if (!texto) return "";

  // Pies y pulgadas: 5'10", 5' 10, 6 ft 2 in, 5-10.
  const pies = /^(\d)\s*(?:'|′|ft|pies?|-)\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:"|″|''|in|pulg)?$/.exec(
    texto,
  );
  if (pies) {
    const ft = Number(pies[1]);
    const inch = pies[2] ? Number(pies[2].replace(",", ".")) : 0;
    if (ft >= 4 && ft <= 7 && inch < 12) {
      return `${(ft * PIE_EN_METROS + inch * PULGADA_EN_METROS).toFixed(2)} m`;
    }
    return "";
  }

  const n = primerNumero(texto);
  if (n === null) return "";

  // La unidad escrita manda sobre la magnitud.
  if (/\bcm\b|centim/.test(texto)) {
    return n >= 120 && n <= 250 ? `${(n / 100).toFixed(2)} m` : "";
  }
  if (/\bm\b|metro/.test(texto)) {
    return n >= 1.2 && n <= 2.4 ? `${n.toFixed(2)} m` : "";
  }

  if (n >= 1.2 && n <= 2.4) return `${n.toFixed(2)} m`;
  if (n >= 120 && n <= 250) return `${(n / 100).toFixed(2)} m`;
  return "";
}

/**
 * Peso a libras enteras ("168 lb").
 *
 * Un número suelto son libras, que es lo que usa el football y lo que
 * hay en data/players.json. Con una excepción: por debajo de 110 lb no
 * hay jugador adulto —el más ligero de la liga pesa 120—, así que un
 * número tan bajo solo puede ser un club que escribió kilos sin decirlo.
 */
export function toPounds(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const texto = String(raw).trim().toLowerCase();
  if (!texto) return "";

  const n = primerNumero(texto);
  if (n === null || n <= 0) return "";

  const enKilos = /\bkg\b|kilo/.test(texto) || (!/\blbs?\b|libra/.test(texto) && n < 110);
  const libras = enKilos ? n * KILO_EN_LIBRAS : n;

  // Fuera de este rango es un error de tecleo, no un jugador.
  if (libras < 90 || libras > 500) return "";
  return `${Math.round(libras)} lb`;
}
