// ----------------------------------------------------------------------
// Sesiones de los paneles privados.
//
// Hay dos áreas, cada una con su contraseña:
//   · "foto"  → /adminfoto, para el equipo de fotografía (álbumes y fotos)
//   · "admin" → /admin, para la liga (patrocinadores)
//
// El rol viaja dentro de la cookie, firmada con HMAC-SHA256: no hace falta
// base de datos. El contenido del token no es secreto (dice quién es y
// hasta cuándo), pero no se puede falsificar sin SESSION_SECRET.
//
// "admin" puede hacer todo lo que puede "foto"; al revés no.
// ----------------------------------------------------------------------

import crypto from "node:crypto";

export const COOKIE_NAME = "pmfl_admin";
/** Duración de la sesión: 12 h (una jornada de trabajo). */
const MAX_AGE_SECONDS = 12 * 60 * 60;

const SECRET = process.env.SESSION_SECRET ?? "";
/** Contraseña del equipo de fotografía. */
const PHOTO_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
/**
 * Contraseña de la liga. Si no se define, se usa la de fotografía: así el
 * sitio sigue funcionando tras actualizar, aunque conviene ponerle una
 * propia para que el fotógrafo no pueda tocar patrocinadores.
 */
const ADMIN_PASSWORD = process.env.ADMIN_LIGA_PASSWORD || PHOTO_PASSWORD;

export type Role = "foto" | "admin";

export const photoConfigured = Boolean(SECRET && PHOTO_PASSWORD);
export const adminConfigured = Boolean(SECRET && ADMIN_PASSWORD);
/** Compatibilidad con el código que preguntaba por una sola configuración. */
export const anyConfigured = photoConfigured || adminConfigured;

interface Payload {
  role: Role;
  iat: number;
  exp: number;
}

/** Compara en tiempo constante, para no filtrar la contraseña por timing. */
function matches(candidate: string, expected: string): boolean {
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Comprueba la contraseña para el área pedida y devuelve el rol que
 * corresponde. La contraseña de la liga también abre el área de fotos.
 */
export function resolveRole(area: Role, password: string): Role | null {
  if (matches(password, ADMIN_PASSWORD)) return "admin";
  if (area === "foto" && matches(password, PHOTO_PASSWORD)) return "foto";
  return null;
}

export function createToken(role: Role): string {
  const now = Date.now();
  const payload: Payload = { role, iat: now, exp: now + MAX_AGE_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/** Devuelve el rol de la sesión, o null si la cookie no vale o caducó. */
export function sessionRole(token: string | undefined): Role | null {
  if (!token || !SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as Payload;
    if (typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    return payload.role === "admin" || payload.role === "foto"
      ? payload.role
      : null;
  } catch {
    return null;
  }
}

/** ¿La sesión sirve para el área pedida? "admin" vale para todo. */
export function hasAccess(token: string | undefined, area: Role): boolean {
  const role = sessionRole(token);
  if (!role) return false;
  return role === "admin" || role === area;
}

/**
 * ¿La petición llegó por HTTPS? Detrás del túnel de Cloudflare el TLS
 * termina antes del contenedor, así que hay que mirar la cabecera.
 */
export function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

/**
 * Opciones de la cookie de sesión (las mismas al crear y al borrar).
 *
 * `secure` se decide por petición y no por NODE_ENV: así el panel también
 * funciona mientras se prueba por http://<ip>:8096, antes de que el
 * dominio esté publicado.
 */
export function cookieOptions(secure: boolean, maxAge = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}
