// ----------------------------------------------------------------------
// Sesión autenticada contra Cloob (solo servidor).
//
// Algunos datos que la liga necesita —la posición de cada jugador, por
// ejemplo— no están en la API pública de Cloob: exigen sesión iniciada.
// Este módulo hace el login con la cuenta de la liga y guarda la cookie
// de sesión para reutilizarla.
//
// El flujo de Cloob tiene dos pasos:
//   1. loginUnified(email, password) → temporary_token + lista de
//      "contextos" (los roles/clubes a los que pertenece la cuenta).
//   2. selectContext(temporary_token, context_id) → deja la sesión lista.
// La autenticación viaja por COOKIE (su web usa credentials: "include");
// no hay cabecera Authorization.
//
// Si no hay credenciales configuradas, o el login falla, todo el sitio
// sigue funcionando con los datos públicos: esto solo añade extras.
// ----------------------------------------------------------------------

const ENDPOINT = "https://api-gateway.cloobfootball.com/graphql";

const EMAIL = process.env.CLOOB_EMAIL ?? "";
const PASSWORD = process.env.CLOOB_PASSWORD ?? "";
/** Opcional: fijar qué contexto usar si la cuenta tiene varios. */
const FORCED_CONTEXT = process.env.CLOOB_CONTEXT_ID ?? "";

export const cloobAuthConfigured = Boolean(EMAIL && PASSWORD);

/** La sesión dura de sobra; la renovamos cada 30 min por si acaso. */
const SESSION_TTL_MS = 30 * 60 * 1000;

interface CloobContext {
  id: string;
  role: string | null;
  clubname: string | null;
  club_id: string | null;
  is_tournament: boolean | null;
  name: string | null;
  league_name: string | null;
}

interface Session {
  cookie: string;
  context: CloobContext | null;
  createdAt: number;
}

// Caché en memoria del proceso. Si hay varias instancias, cada una hace
// su propio login: son dos peticiones cada media hora, es asumible.
let cached: Session | null = null;
let inFlight: Promise<Session | null> | null = null;

const Q_LOGIN = `mutation LoginUnified($input: LoginInput!) {
  loginUnified(input: $input) {
    success
    message
    temporary_token
    contexts { id role clubname club_id is_tournament name league_name }
  }
}`;

const Q_SELECT = `mutation SelectContext($temporaryToken: String!, $contextId: String!) {
  selectContext(temporary_token: $temporaryToken, context_id: $contextId) {
    success
    message
  }
}`;

/** "sid=abc; Path=/; HttpOnly" → "sid=abc" */
function cookiePairs(setCookies: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of setCookies) {
    const first = raw.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) out.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
  }
  return out;
}

function serialize(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function post(
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
  cookie?: string,
) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client": "web",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ operationName, query, variables }),
    // Sin `cache: "no-store"` a propósito: Next no cachea peticiones POST,
    // así que estas ya son siempre frescas, y marcar no-store convertiría
    // en dinámicas las páginas que se generan estáticamente (/teams/…).
    // La sesión se reutiliza desde memoria, no desde el caché de fetch.
  });

  // Node 20 expone getSetCookie(); si no, caemos al header plano.
  const setCookies: string[] =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie === "function"
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : ([res.headers.get("set-cookie")].filter(Boolean) as string[]);

  const json = await res.json().catch(() => null);
  return { ok: res.ok, json, setCookies };
}

/** Elige el contexto: el forzado por env, si no uno de torneo/liga. */
function pickContext(contexts: CloobContext[]): CloobContext | null {
  if (!contexts.length) return null;
  if (FORCED_CONTEXT) {
    const forced = contexts.find((c) => c.id === FORCED_CONTEXT);
    if (forced) return forced;
    console.warn(
      `[cloob-auth] CLOOB_CONTEXT_ID=${FORCED_CONTEXT} no existe. Contextos: ` +
        contexts.map((c) => `${c.id} (${c.role} ${c.clubname ?? c.league_name ?? ""})`).join(", "),
    );
  }
  // Un contexto de torneo/liga ve todos los clubes; el de un club, solo el suyo.
  return contexts.find((c) => c.is_tournament) ?? contexts[0];
}

async function doLogin(): Promise<Session | null> {
  const login = await post("LoginUnified", Q_LOGIN, {
    input: { email: EMAIL, password: PASSWORD },
  });

  const data = login.json?.data?.loginUnified;
  if (!data?.success) {
    const code = login.json?.errors?.[0]?.extensions?.code ?? "sin detalle";
    console.error(`[cloob-auth] login falló (${code}). Se seguirá con datos públicos.`);
    return null;
  }

  const jar = cookiePairs(login.setCookies);

  // Cuentas con un solo rol (como la de la liga) entran directas: el
  // login ya deja las cookies `token`/`refresh_token` y no devuelve ni
  // temporary_token ni contextos. En ese caso no hay segundo paso.
  const contexts = (data.contexts ?? []) as CloobContext[];
  const needsContext = Boolean(data.temporary_token) && contexts.length > 0;

  let context: CloobContext | null = null;

  if (needsContext) {
    context = pickContext(contexts);
    const select = await post(
      "SelectContext",
      Q_SELECT,
      { temporaryToken: data.temporary_token, contextId: context!.id },
      serialize(jar),
    );

    if (!select.json?.data?.selectContext?.success) {
      const msg = select.json?.data?.selectContext?.message ?? "sin detalle";
      console.error(`[cloob-auth] selectContext falló: ${msg}`);
      return null;
    }

    // Las cookies del segundo paso pisan a las del primero.
    for (const [k, v] of cookiePairs(select.setCookies)) jar.set(k, v);
  }

  if (jar.size === 0) {
    console.error("[cloob-auth] el login no devolvió cookies de sesión.");
    return null;
  }

  console.info(
    context
      ? `[cloob-auth] sesión iniciada como ${context.role ?? "?"} ` +
          `(${context.clubname ?? context.league_name ?? context.name ?? "sin nombre"})`
      : "[cloob-auth] sesión iniciada (cuenta de un solo contexto).",
  );

  return { cookie: serialize(jar), context, createdAt: Date.now() };
}

/**
 * Cookie de sesión lista para usar, o null si no hay credenciales o el
 * login falla. Reutiliza la sesión mientras siga fresca y evita logins
 * simultáneos.
 */
export async function getCloobSession(): Promise<Session | null> {
  if (!cloobAuthConfigured) return null;

  if (cached && Date.now() - cached.createdAt < SESSION_TTL_MS) return cached;
  if (inFlight) return inFlight;

  inFlight = doLogin()
    .then((s) => {
      cached = s;
      return s;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Fuerza un login nuevo (se usa cuando una consulta responde 401). */
export function invalidateCloobSession(): void {
  cached = null;
}

/**
 * Consulta autenticada. Si la sesión caducó (NOT_LOGGED_IN) reintenta una
 * vez con sesión nueva. Devuelve null si no se pudo autenticar.
 */
export async function gqlAuthed<T>(
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
  retry = true,
): Promise<T | null> {
  const session = await getCloobSession();
  if (!session) return null;

  const res = await post(operationName, query, variables, session.cookie);
  const errors = res.json?.errors as
    | Array<{ extensions?: { code?: string } }>
    | undefined;

  if (errors?.some((e) => e.extensions?.code === "NOT_LOGGED_IN")) {
    if (!retry) {
      console.error(`[cloob-auth] ${operationName}: sesión rechazada dos veces.`);
      return null;
    }
    invalidateCloobSession();
    return gqlAuthed<T>(operationName, query, variables, false);
  }

  if (errors?.length) {
    console.error(
      `[cloob-auth] ${operationName} devolvió errores:`,
      errors.map((e) => e.extensions?.code ?? "?").join(", "),
    );
    return null;
  }

  return (res.json?.data ?? null) as T | null;
}
