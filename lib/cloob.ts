// ----------------------------------------------------------------------
// Cliente de SOLO LECTURA para la API pública de Cloob (GraphQL).
//
// Trae la clasificación, los líderes de puntos y los resultados del
// torneo PMFL directamente desde el sistema Cloob, para no tener que
// editar los JSON a mano. No requiere autenticación (son consultas
// públicas, las mismas que usa https://app.cloobfootball.com/live/pmfl).
//
// Se ejecuta SIEMPRE en el servidor (Server Components / route handlers).
// Las respuestas se cachean con revalidación (ISR) para que la página
// cargue rápido y no saturemos la API de Cloob.
//
// Configuración por variables de entorno (ver .env.example):
//   CLOOB_TOURNAMENT_ID  → id del torneo en Cloob
//   CLOOB_CATEGORY_ID    → id de la categoría/división
//   CLOOB_REVALIDATE     → segundos de caché (por defecto 60)
// ----------------------------------------------------------------------

import { slugify } from "./utils";
import { cloobAuthConfigured, gqlAuthed } from "./cloob-auth";

const ENDPOINT = "https://api-gateway.cloobfootball.com/graphql";

// Valores por defecto = temporada en curso (2026). Importan porque el
// `next build` prerenderiza las páginas y en ese momento todavía no hay
// .env: si aquí quedara una temporada vieja, la primera carga mostraría
// datos caducados hasta que ISR revalidara.
const TOURNAMENT_ID =
  process.env.CLOOB_TOURNAMENT_ID ?? "9b6db3f2-8418-4661-b0e0-e4390ca760a4";
const CATEGORY_ID =
  process.env.CLOOB_CATEGORY_ID ?? "3f04084c-a069-4325-a02f-73dbb4a54049";
const REVALIDATE = Number(process.env.CLOOB_REVALIDATE ?? 60);

// -------- tipos que exponemos al resto de la app ----------------------

export interface CloobStanding {
  name: string;
  /** Identificador del club en Cloob (sirve para pedir su roster). */
  club_id?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pf: number; // puntos a favor
  pc: number; // puntos en contra
  diff: number;
  points: number;
  position: number;
}

export interface CloobScorer {
  playerId: string;
  playerName: string;
  clubName: string;
  totalPoints: number;
}

export interface CloobMatch {
  id: string;
  day: string; // "DD-MM-YYYY"
  date: Date | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  title: string;
  type: string; // "GROUP" | "ROUND"
  startHour: string;
  /** Número de jornada (Cloob lo llama "schedule"). null en playoffs. */
  week: number | null;
  /** Sede del partido. */
  venue: string;
  /** Ids de club en Cloob (para pedir sus rosters). */
  homeClubId: string | null;
  awayClubId: string | null;
  /** false en los cruces de playoff que todavía no tienen rivales. */
  hasTeams: boolean;
  /** Estado normalizado a partir de status + marcador. */
  state: "scheduled" | "live" | "final";
}

// -------- helper genérico de consulta ---------------------------------

async function gql<T>(
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
  revalidate: number = REVALIDATE,
): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client": "web" },
      body: JSON.stringify({ operationName, query, variables }),
      // ISR: cachea el resultado y lo revalida cada `revalidate` segundos.
      next: { revalidate },
    });
    if (!res.ok) {
      console.error(`[cloob] ${operationName} → HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    if (json.errors) {
      console.error(`[cloob] ${operationName} → errores`, json.errors);
      return null;
    }
    return json.data as T;
  } catch (err) {
    console.error(`[cloob] ${operationName} → excepción`, err);
    return null;
  }
}

/**
 * "DD-MM-YYYY" + "HH:MM" → Date.
 *
 * Cloob entrega la fecha y la hora por separado y sin zona. Los partidos
 * son en Panamá (UTC-5, sin horario de verano), así que fijamos el offset
 * explícitamente: así el instante es el mismo en el servidor y en el
 * navegador, sin importar la zona del contenedor.
 */
function toDate(day: string, startHour?: string | null): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(day || "");
  if (!m) return null;
  const [, d, mo, y] = m;
  const hm = /^(\d{1,2}):(\d{2})/.exec(startHour || "");
  const hh = hm ? hm[1].padStart(2, "0") : "00";
  const mm = hm ? hm[2] : "00";
  const parsed = new Date(`${y}-${mo}-${d}T${hh}:${mm}:00-05:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ======================================================================
//  Consultas
// ======================================================================

const Q_STANDINGS = `query getTournamentCategorySchema($input: GetTournamentCategorySchemaInput!) {
  getTournamentCategorySchema(input: $input) {
    success
    schema {
      groups_teams {
        name club_id played won drawn lost pf pc points diff position
      }
    }
  }
}`;

/** Clasificación / tabla de posiciones, ordenada por posición. */
export async function getStandings(): Promise<CloobStanding[]> {
  const data = await gql<{
    getTournamentCategorySchema?: {
      schema?: { groups_teams?: CloobStanding[] };
    };
  }>("getTournamentCategorySchema", Q_STANDINGS, {
    input: { tournament_id: TOURNAMENT_ID, category_id: CATEGORY_ID },
  });

  const teams = data?.getTournamentCategorySchema?.schema?.groups_teams ?? [];
  return [...teams].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
}

const Q_SCORERS = `query getTournamentBestPlayersByField($input: getTournamentBestPlayersInput!) {
  getTournamentBestPlayersByField(input: $input) {
    success
    best_players_stats_field {
      points { player_id player_name club_name total_points }
    }
  }
}`;

/** Líderes de anotación (más puntos en el torneo). */
export async function getTopScorers(limit = 10): Promise<CloobScorer[]> {
  const data = await gql<{
    getTournamentBestPlayersByField?: {
      best_players_stats_field?: {
        points?: Array<{
          player_id: string;
          player_name: string;
          club_name: string;
          total_points: number;
        }>;
      };
    };
  }>("getTournamentBestPlayersByField", Q_SCORERS, {
    input: { tournament_id: TOURNAMENT_ID, category_id: CATEGORY_ID },
  });

  const points =
    data?.getTournamentBestPlayersByField?.best_players_stats_field?.points ?? [];

  return points
    .map((p) => ({
      playerId: p.player_id,
      // Los nombres vienen con "\t" y el dorsal pegado; los limpiamos.
      playerName: p.player_name.replace(/\s+/g, " ").trim(),
      clubName: p.club_name,
      totalPoints: p.total_points,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

// ======================================================================
//  Líderes por categoría estadística
// ======================================================================

export interface StatLeader {
  playerId: string;
  playerName: string;
  clubName: string;
  value: number;
}

export interface StatCategory {
  key: string;
  label: string;
  leaders: StatLeader[];
}

export interface StatGroup {
  key: string;
  label: string;
  categories: StatCategory[];
}

/**
 * Catálogo de tablas que publicamos, con su ruta dentro de la respuesta
 * de Cloob y su nombre en español.
 *
 * Cloob devuelve muchas más (yardas de fumble, bloqueos, safeties…);
 * aquí están las que cuentan para el aficionado. Las que no tengan datos
 * se descartan solas, así que en pretemporada no aparece nada vacío.
 */
const STAT_CATALOG: Array<{
  key: string;
  label: string;
  categories: Array<{ path: string; label: string }>;
}> = [
  {
    key: "ofensiva",
    label: "Ofensiva",
    categories: [
      { path: "offense.passing.yds", label: "Yardas de pase" },
      { path: "offense.passing.tds", label: "TD de pase" },
      { path: "offense.passing.completes", label: "Pases completos" },
      { path: "offense.rushing.yds", label: "Yardas por tierra" },
      { path: "offense.rushing.tds", label: "TD por tierra" },
      { path: "offense.receiving.yds", label: "Yardas por recepción" },
      { path: "offense.receiving.receptions", label: "Recepciones" },
      { path: "offense.receiving.tds", label: "TD por recepción" },
    ],
  },
  {
    key: "defensiva",
    label: "Defensiva",
    categories: [
      { path: "defense.tackling.tackles_alone", label: "Tacleadas" },
      { path: "defense.tackling.sacks", label: "Capturas (sacks)" },
      { path: "defense.tackling.tackle_for_loss", label: "Tacleadas para pérdida" },
      { path: "defense.passing.number", label: "Intercepciones" },
      { path: "defense.passing.pass_deflected", label: "Pases desviados" },
      { path: "defense.fumbles.fumbles_recovery", label: "Balones recuperados" },
      { path: "defense.fumbles.fumbles_force", label: "Balones forzados" },
    ],
  },
  {
    key: "especiales",
    label: "Equipos especiales",
    categories: [
      { path: "special_teams.extra_points.total", label: "Puntos extra" },
      { path: "special_teams.kick_returns.yds", label: "Yardas en retorno de patada" },
      { path: "special_teams.punt_returns.yds", label: "Yardas en retorno de despeje" },
      { path: "special_teams.kicking.yds", label: "Yardas de gol de campo" },
      { path: "special_teams.punting.yds", label: "Yardas de despeje" },
    ],
  },
];

/** Bloque de campos que Cloob repite en cada categoría. */
const LEAF = "{ player_id player_name club_name stat }";

/** Construye la consulta a partir del catálogo, sin escribirla a mano. */
function buildStatsQuery(): string {
  // Agrupa las rutas por su prefijo para no repetir niveles:
  // "offense.passing.yds" → offense { passing { yds {...} } }
  const tree: Record<string, unknown> = {};
  for (const group of STAT_CATALOG) {
    for (const cat of group.categories) {
      let node = tree;
      const parts = cat.path.split(".");
      for (const part of parts.slice(0, -1)) {
        node[part] = (node[part] as Record<string, unknown>) ?? {};
        node = node[part] as Record<string, unknown>;
      }
      node[parts[parts.length - 1]] = LEAF;
    }
  }
  const render = (node: Record<string, unknown>): string =>
    Object.entries(node)
      .map(([k, v]) =>
        typeof v === "string"
          ? `${k} ${v}`
          : `${k} { ${render(v as Record<string, unknown>)} }`,
      )
      .join(" ");

  return `query getTournamentBestPlayersByField($input: getTournamentBestPlayersInput!) {
    getTournamentBestPlayersByField(input: $input) {
      success
      best_players_stats_field { ${render(tree)} }
    }
  }`;
}

const Q_STAT_LEADERS = buildStatsQuery();

/**
 * Líderes de cada categoría (Cloob devuelve el top 3 de cada una).
 * Descarta las tablas sin datos y los grupos que se quedan vacíos.
 */
export async function getStatLeaders(): Promise<StatGroup[]> {
  const data = await gql<{
    getTournamentBestPlayersByField?: {
      best_players_stats_field?: Record<string, unknown>;
    };
  }>("getTournamentBestPlayersByField", Q_STAT_LEADERS, {
    input: { tournament_id: TOURNAMENT_ID, category_id: CATEGORY_ID },
  });

  const root = data?.getTournamentBestPlayersByField?.best_players_stats_field;
  if (!root) return [];

  const at = (path: string): unknown =>
    path.split(".").reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      root,
    );

  const groups: StatGroup[] = [];

  for (const group of STAT_CATALOG) {
    const categories: StatCategory[] = [];

    for (const cat of group.categories) {
      const raw = at(cat.path);
      if (!Array.isArray(raw) || raw.length === 0) continue;

      const leaders = raw
        .map((r) => {
          const row = r as {
            player_id?: string;
            player_name?: string;
            club_name?: string;
            stat?: number | string;
          };
          return {
            playerId: row.player_id ?? "",
            playerName: (row.player_name ?? "").replace(/\s+/g, " ").trim(),
            clubName: row.club_name ?? "",
            value: Number(row.stat) || 0,
          };
        })
        .filter((l) => l.playerName && l.value > 0)
        .sort((a, b) => b.value - a.value);

      if (leaders.length) categories.push({ key: cat.path, label: cat.label, leaders });
    }

    if (categories.length) groups.push({ key: group.key, label: group.label, categories });
  }

  return groups;
}

const Q_MATCHES = `query getTournamentMatches($input: GetTournamentMatchesInput!) {
  getTournamentMatches(input: $input) {
    success
    total
    matches {
      id day start_hour end_hour field_name type title status schedule
      team_1 { club_id name score }
      team_2 { club_id name score }
    }
  }
}`;

interface RawMatch {
  id: string;
  day: string;
  start_hour: string | null;
  end_hour: string | null;
  field_name: string | null;
  type: string;
  title: string;
  status: string | null;
  schedule: number | null;
  team_1: { club_id: string | null; name: string; score: string | null } | null;
  team_2: { club_id: string | null; name: string; score: string | null } | null;
}

function toScore(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza el estado del partido. Cloob usa "FINISHED" para los jugados;
 * los demás valores (SCHEDULED, PENDING, PLAYING…) los tratamos como
 * "por jugar" o "en vivo" según el propio estado, no según el marcador
 * (un partido puede ir 0-0 y estar en curso).
 */
function toState(
  status: string | null | undefined,
  hasScore: boolean,
): CloobMatch["state"] {
  const s = (status || "").toUpperCase();
  if (s === "FINISHED" || s === "FINISH" || s === "ENDED") return "final";
  if (s === "PLAYING" || s === "LIVE" || s === "IN_PROGRESS") return "live";
  if (s) return "scheduled";
  // Sin estado: nos guiamos por el marcador.
  return hasScore ? "final" : "scheduled";
}

/**
 * Todos los partidos del torneo, jugados y por jugar, ordenados por fecha.
 *
 * Usa `getTournamentMatches`, que además del marcador trae el estado, la
 * jornada (`schedule`), la sede y la hora — todo lo que necesita el
 * calendario del sitio.
 */
export async function getMatches(): Promise<CloobMatch[]> {
  const data = await gql<{
    getTournamentMatches?: { matches?: RawMatch[] };
  }>("getTournamentMatches", Q_MATCHES, {
    input: { tournament_id: TOURNAMENT_ID, category_id: CATEGORY_ID },
  });

  const matches = data?.getTournamentMatches?.matches ?? [];

  return matches
    .map((m) => {
      const homeScore = toScore(m.team_1?.score);
      const awayScore = toScore(m.team_2?.score);
      return {
        id: m.id,
        day: m.day,
        date: toDate(m.day, m.start_hour),
        // En los cruces de playoff que aún no tienen rival, Cloob manda
        // el equipo en null. Lo decimos con palabras en vez de dejar el
        // hueco vacío.
        homeTeam: m.team_1?.name || "Por definir",
        awayTeam: m.team_2?.name || "Por definir",
        homeScore,
        awayScore,
        title: m.title,
        type: m.type,
        startHour: m.start_hour ?? "",
        week: typeof m.schedule === "number" ? m.schedule : null,
        // Sin inventar sede: los cruces por definir vienen sin campo.
        venue: m.field_name || "",
        homeClubId: m.team_1?.club_id ?? null,
        awayClubId: m.team_2?.club_id ?? null,
        hasTeams: Boolean(m.team_1?.name && m.team_2?.name),
        state: toState(m.status, homeScore !== null && awayScore !== null),
      };
    })
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
}

/** Resultados más recientes primero (partidos ya jugados). */
export async function getRecentResults(limit = 6): Promise<CloobMatch[]> {
  const all = await getMatches();
  return all
    .filter((m) => m.state === "final")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, limit);
}

// ======================================================================
//  Roster: jugadores inscritos, con su foto oficial
// ======================================================================

const Q_TEAM_MEMBERS = `query getTournamentTeamMembers($input: GetTournamentTeamMembersInput!) {
  getTournamentTeamMembers(input: $input) {
    success
    categories_public {
      id
      category
      players { id name avatar_url number }
    }
  }
}`;

/**
 * Caché del roster. Corto a propósito: en pretemporada los clubes están
 * inscribiendo jugadores y hay que ver el alta en un par de minutos, no
 * en diez.
 */
const ROSTER_REVALIDATE = 120;

export interface CloobRosterPlayer {
  id: string;
  name: string;
  /** Foto oficial subida al sistema de la liga. null si no tiene. */
  avatar: string | null;
  number: string | null;
  clubName: string;
  /**
   * Posición, estatura y peso. Solo llegan con sesión iniciada (la API
   * pública no los da), así que son null sin credenciales de Cloob.
   *
   * Son texto libre tal como los escribió el club en la inscripción
   * ("OL", "1.79", "310 lbs"): se muestran verbatim, sin inventar
   * unidades ni reinterpretar el valor.
   */
  position: string | null;
  height: string | null;
  weight: string | null;
}

// -------- datos que exigen sesión iniciada ----------------------------

const Q_CLUB_INFO = `query getTournamentClubInfo($input: GetTournamentClubInfoInput!) {
  getTournamentClubInfo(input: $input) {
    success
    club_info {
      club_id
      category_id
      players_registered {
        player_id
        name
        surname
        number
        position
        avatar_url
        is_deleted
        form_fields { name value }
      }
    }
  }
}`;

interface RegisteredPlayer {
  player_id: string;
  name: string | null;
  surname: string | null;
  number: string | null;
  position: string | null;
  avatar_url: string | null;
  is_deleted: boolean | null;
  form_fields: Array<{ name: string | null; value: string | null }> | null;
}

/**
 * Posición, estatura y peso NO son campos fijos de Cloob: son campos del
 * formulario de inscripción que define cada torneo, y llegan en
 * `form_fields` como pares nombre/valor ("Posición" → "OL").
 *
 * Los buscamos por nombre normalizado y aceptamos también el nombre en
 * inglés, por si algún día cambian el formulario.
 */
function formValue(p: RegisteredPlayer, ...names: string[]): string | null {
  const wanted = new Set(names.map((n) => slugify(n)));
  for (const f of p.form_fields ?? []) {
    if (f?.name && wanted.has(slugify(f.name))) {
      const v = (f.value ?? "").trim();
      if (v) return v;
    }
  }
  return null;
}

/**
 * Ficha privada del club: posición y dorsal de cada inscrito.
 *
 * Devuelve un mapa nombre-normalizado → datos. Usamos el nombre y no el
 * id porque `players_registered.player_id` es el id de la inscripción,
 * que no siempre coincide con el del roster público.
 */
// Estas peticiones van con cookie, así que no pasan por el caché de
// fetch de Next: memorizamos el resultado aquí el mismo tiempo que el
// roster, para no repetir la llamada en cada regeneración de página.
const registrationsCache = new Map<
  string,
  { at: number; data: Map<string, RegisteredPlayer> }
>();

async function getClubRegistrations(
  clubId: string,
): Promise<Map<string, RegisteredPlayer>> {
  const map = new Map<string, RegisteredPlayer>();
  if (!cloobAuthConfigured) return map;

  const hit = registrationsCache.get(clubId);
  if (hit && Date.now() - hit.at < ROSTER_REVALIDATE * 1000) return hit.data;

  const data = await gqlAuthed<{
    getTournamentClubInfo?: {
      success: boolean;
      club_info?: Array<{
        club_id: string;
        category_id: string;
        players_registered?: RegisteredPlayer[];
      }> | {
        club_id: string;
        category_id: string;
        players_registered?: RegisteredPlayer[];
      };
    };
  }>("getTournamentClubInfo", Q_CLUB_INFO, {
    input: { tournament_id: TOURNAMENT_ID, club_id: clubId },
  });

  const info = data?.getTournamentClubInfo?.club_info;
  if (!info) return map;

  // Cloob devuelve un objeto o una lista según el club; normalizamos.
  const blocks = Array.isArray(info) ? info : [info];

  for (const block of blocks) {
    // Si viene la categoría, nos quedamos con la que usa el sitio.
    if (block.category_id && block.category_id !== CATEGORY_ID) continue;
    for (const p of block.players_registered ?? []) {
      if (p.is_deleted) continue;
      const full = [p.name, p.surname].filter(Boolean).join(" ").trim();
      if (full) map.set(slugify(full), p);
    }
  }

  registrationsCache.set(clubId, { at: Date.now(), data: map });
  return map;
}

/** Roster de un club concreto. */
async function getClubRoster(
  clubId: string,
  clubName: string,
): Promise<CloobRosterPlayer[]> {
  const data = await gql<{
    getTournamentTeamMembers?: {
      categories_public?: Array<{
        id: string;
        category: string;
        players?: Array<{
          id: string;
          name: string;
          avatar_url: string | null;
          number: string | null;
        }>;
      }>;
    };
  }>(
    "getTournamentTeamMembers",
    Q_TEAM_MEMBERS,
    { input: { tournament_id: TOURNAMENT_ID, team_id: clubId } },
    ROSTER_REVALIDATE,
  );

  const cats = data?.getTournamentTeamMembers?.categories_public ?? [];
  // Nos quedamos con la categoría configurada; si el club no la tiene,
  // usamos todas (mejor eso que quedarnos sin jugadores).
  const ofCategory = cats.filter((c) => c.id === CATEGORY_ID);
  const use = ofCategory.length > 0 ? ofCategory : cats;

  // Con credenciales, la ficha privada del club añade la posición.
  const registrations = await getClubRegistrations(clubId).catch((err) => {
    console.error(`[cloob] ficha privada de ${clubName} falló`, err);
    return new Map<string, RegisteredPlayer>();
  });

  return use.flatMap((c) =>
    (c.players ?? []).map((p) => {
      const reg = registrations.get(slugify(p.name));
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar_url || reg?.avatar_url || null,
        number: p.number ?? reg?.number ?? null,
        clubName,
        position: reg
          ? reg.position || formValue(reg, "Posición", "Position")
          : null,
        height: reg ? formValue(reg, "Estatura", "Height", "Altura") : null,
        weight: reg ? formValue(reg, "Peso", "Weight") : null,
      };
    }),
  );
}

/**
 * Roster de un club buscándolo por su nombre (el del sitio o el de Cloob:
 * se comparan normalizados, así "Águilas Doradas" encuentra a "ÁGUILAS
 * DORADAS"). Devuelve [] si ese club no juega el torneo actual.
 */
export async function getClubRosterByName(
  teamName: string,
): Promise<CloobRosterPlayer[]> {
  const key = slugify(teamName);

  const standings = await getStandings();
  let clubId: string | null = null;
  let clubName = teamName;

  const fromStandings = standings.find(
    (s) => s.club_id && slugify(s.name) === key,
  );
  if (fromStandings?.club_id) {
    clubId = fromStandings.club_id;
    clubName = fromStandings.name;
  } else {
    // Sin clasificación todavía: los ids salen de los partidos.
    const matches = await getMatches();
    for (const m of matches) {
      if (m.homeClubId && slugify(m.homeTeam) === key) {
        clubId = m.homeClubId;
        clubName = m.homeTeam;
        break;
      }
      if (m.awayClubId && slugify(m.awayTeam) === key) {
        clubId = m.awayClubId;
        clubName = m.awayTeam;
        break;
      }
    }
  }

  if (!clubId) return [];
  return getClubRoster(clubId, clubName);
}

/**
 * Todos los jugadores del torneo, indexados por su id de Cloob.
 *
 * Los clubes salen de la clasificación (que ya trae `club_id`); si aún no
 * hay clasificación, se deducen de los partidos. Después se pide el roster
 * de cada club en paralelo.
 */
export async function getRosterById(): Promise<Map<string, CloobRosterPlayer>> {
  const standings = await getStandings();

  let clubs = standings
    .filter((s) => s.club_id)
    .map((s) => ({ id: s.club_id as string, name: s.name }));

  if (clubs.length === 0) {
    const matches = await getMatches();
    const seen = new Map<string, string>();
    for (const m of matches) {
      if (m.homeClubId) seen.set(m.homeClubId, m.homeTeam);
      if (m.awayClubId) seen.set(m.awayClubId, m.awayTeam);
    }
    clubs = [...seen.entries()].map(([id, name]) => ({ id, name }));
  }

  const rosters = await Promise.all(
    clubs.map((c) =>
      getClubRoster(c.id, c.name).catch((err) => {
        console.error(`[cloob] roster de ${c.name} falló`, err);
        return [] as CloobRosterPlayer[];
      }),
    ),
  );

  const map = new Map<string, CloobRosterPlayer>();
  for (const p of rosters.flat()) map.set(p.id, p);
  return map;
}

/**
 * Próximos partidos: los que aún no se han jugado, del más cercano al más
 * lejano. Incluye los que están en vivo (van primero) y descarta los que
 * ya pasaron de fecha aunque Cloob no les haya puesto marcador todavía.
 */
export async function getUpcomingMatches(limit = 3): Promise<CloobMatch[]> {
  const all = await getMatches();
  const now = Date.now();
  // Margen de 3 h: un partido que empezó hace poco sigue siendo "de hoy".
  const cutoff = now - 3 * 60 * 60 * 1000;

  return all
    .filter((m) => m.state !== "final")
    // Los cruces de playoff sin rivales ni fecha no son un "próximo
    // partido" que anunciar: salen en el calendario, no aquí.
    .filter((m) => m.hasTeams && m.date !== null)
    .filter((m) => (m.date as Date).getTime() >= cutoff)
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === "live" ? -1 : 1;
      return (a.date as Date).getTime() - (b.date as Date).getTime();
    })
    .slice(0, limit);
}
