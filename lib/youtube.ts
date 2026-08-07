// ----------------------------------------------------------------------
// Vídeos del canal de YouTube de la PMFL (@pmfl).
//
// Se leen del canal directamente, así que un vídeo nuevo aparece en el
// sitio solo — sin editar JSON ni reconstruir la imagen.
//
// Dos fuentes, en este orden:
//   1. La página del canal (ytInitialData) + su paginación interna. Es la
//      única forma de traer el archivo COMPLETO (hoy ~150 vídeos, de 2018
//      en adelante) sin clave de API.
//   2. Si eso falla —YouTube cambia su maquetado de vez en cuando—, el
//      feed RSS oficial, que siempre funciona pero solo da los 15 últimos.
//
// El año y la jornada salen del título, que la liga escribe con un
// formato constante:
//     PMFL RAPTORS VS WOLFPACK SEMANA 8 2025
//     PMFL RAPTORS VS SAINTS WEEK 7 2024      (temporadas viejas, en inglés)
//     PMFL RAPTORS VS FRAILES SEMI FINAL 2025
// No hay nada que configurar para 2026: en cuanto se suba un vídeo con
// "SEMANA N 2026" se agrupa solo bajo su año y su jornada.
// ----------------------------------------------------------------------

/** Canal @pmfl. Configurable por si algún día cambia. */
const CHANNEL_ID =
  process.env.YOUTUBE_CHANNEL_ID ?? "UCBUlU2N-7PYZ5Wi_UBJnLOw";

/** Un vídeo nuevo tarda como mucho esto en salir en el sitio. */
const REVALIDATE = Number(process.env.YOUTUBE_REVALIDATE ?? 3600);

/** Tope de páginas del canal (30 vídeos por página). */
const MAX_PAGES = 8;

export interface Video {
  id: string;
  title: string;
  /** Miniatura de YouTube (siempre disponible a partir del id). */
  thumbnail: string;
  url: string;
  /** Año extraído del título. null si no lo dice. */
  year: number | null;
  /** Número de jornada. null en playoffs o vídeos sueltos. */
  week: number | null;
  /** Etiqueta de fase cuando no hay jornada: "Final", "Semifinal"… */
  stage: string | null;
}

export interface VideoGroup {
  /** "Jornada 8", "Playoffs"… */
  label: string;
  /** Para ordenar: la jornada N, o un número alto en los playoffs. */
  order: number;
  videos: Video[];
}

export interface VideoYear {
  year: number;
  total: number;
  groups: VideoGroup[];
}

// -------- interpretación del título -----------------------------------

function parseTitle(title: string): Pick<Video, "year" | "week" | "stage"> {
  const t = title.toUpperCase();

  // Año: el último 20XX que aparezca (los títulos lo ponen al final).
  const years = [...t.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  const year = years.length ? years[years.length - 1] : null;

  // Jornada: "SEMANA 8" o "WEEK 8".
  const week = /\b(?:SEMANA|WEEK|JORNADA)\s*(\d{1,2})\b/.exec(t);

  // Fase, cuando no es jornada regular.
  let stage: string | null = null;
  if (/\bSEMI\s*-?\s*FINAL(?:ES)?\b/.test(t)) stage = "Semifinales";
  else if (/\bGRAN\s+FINAL\b|\bFINAL\b/.test(t)) stage = "Final";
  else if (/\bPLAYOFFS?\b/.test(t)) stage = "Playoffs";

  return { year, week: week ? Number(week[1]) : null, stage };
}

/**
 * ¿Es un vídeo de partido? La sección se llama "Videos de los Partidos",
 * así que dejamos fuera entrevistas, resúmenes del combine y similares.
 * Cuenta como partido si enfrenta a dos equipos (VS) o si menciona una
 * jornada o una fase.
 */
function isMatchVideo(title: string, parsed: ReturnType<typeof parseTitle>): boolean {
  const t = title.toUpperCase();
  if (/\bVS\b|\bVS\.\b/.test(t)) return true;
  return parsed.week !== null || parsed.stage !== null;
}

function toVideo(id: string, title: string): Video {
  const parsed = parseTitle(title);
  return {
    id,
    title: title.replace(/\s+/g, " ").trim(),
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
    ...parsed,
  };
}

// -------- fuente 1: la página del canal -------------------------------

/** Recolecta las tarjetas de vídeo del JSON que YouTube incrusta. */
function collectCards(node: unknown, out: Array<Record<string, unknown>>): void {
  if (Array.isArray(node)) {
    for (const v of node) collectCards(v, out);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.lockupViewModel) out.push(obj.lockupViewModel as Record<string, unknown>);
    if (obj.videoRenderer) out.push(obj.videoRenderer as Record<string, unknown>);
    for (const v of Object.values(obj)) collectCards(v, out);
  }
}

/** Saca id y título de una tarjeta, sea del formato nuevo o del viejo. */
function readCard(card: Record<string, unknown>): { id: string; title: string } | null {
  // Formato nuevo (lockupViewModel)
  const contentId = card.contentId as string | undefined;
  const metadata = (card.metadata as Record<string, unknown> | undefined)?.
    lockupMetadataViewModel as Record<string, unknown> | undefined;
  const newTitle = (metadata?.title as Record<string, unknown> | undefined)?.content as
    | string
    | undefined;
  if (contentId && newTitle) return { id: contentId, title: newTitle };

  // Formato clásico (videoRenderer)
  const videoId = card.videoId as string | undefined;
  const titleObj = card.title as Record<string, unknown> | undefined;
  const runs = titleObj?.runs as Array<{ text?: string }> | undefined;
  const simple = titleObj?.simpleText as string | undefined;
  const oldTitle = simple ?? runs?.map((r) => r.text ?? "").join("");
  if (videoId && oldTitle) return { id: videoId, title: oldTitle };

  return null;
}

/** Primer token de paginación que aparezca en la respuesta. */
function findToken(payload: unknown): string | null {
  const s = JSON.stringify(payload);
  const m = /"continuationCommand":\{"token":"([^"]+)"/.exec(s);
  return m ? m[1] : null;
}

async function fetchFromChannel(): Promise<Video[]> {
  const res = await fetch(
    `https://www.youtube.com/channel/${CHANNEL_ID}/videos`,
    {
      headers: {
        // Sin un User-Agent de navegador YouTube devuelve una página distinta.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        "Accept-Language": "es",
      },
      next: { revalidate: REVALIDATE },
    },
  );
  if (!res.ok) throw new Error(`canal → HTTP ${res.status}`);
  const html = await res.text();

  const dataMatch = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html);
  if (!dataMatch) throw new Error("no se encontró ytInitialData");

  const clientVersion =
    /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1] ?? "2.20240101.00.00";

  const first = JSON.parse(dataMatch[1]) as unknown;
  const cards: Array<Record<string, unknown>> = [];
  collectCards(first, cards);

  let token = findToken(first);
  let pages = 1;

  while (token && pages < MAX_PAGES) {
    const cont = await fetch(
      "https://www.youtube.com/youtubei/v1/browse?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "WEB", clientVersion, hl: "es" } },
          continuation: token,
        }),
        next: { revalidate: REVALIDATE },
      },
    );
    if (!cont.ok) break;

    const payload = (await cont.json()) as unknown;
    const before = cards.length;
    collectCards(payload, cards);
    if (cards.length === before) break; // página vacía: se acabó

    token = findToken(payload);
    pages++;
  }

  const seen = new Set<string>();
  const videos: Video[] = [];
  for (const card of cards) {
    const read = readCard(card);
    if (!read || seen.has(read.id)) continue;
    seen.add(read.id);
    videos.push(toVideo(read.id, read.title));
  }
  return videos;
}

// -------- fuente 2: RSS (respaldo) ------------------------------------

async function fetchFromRss(): Promise<Video[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    { next: { revalidate: REVALIDATE } },
  );
  if (!res.ok) throw new Error(`RSS → HTTP ${res.status}`);
  const xml = await res.text();

  const videos: Video[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const entry of entries) {
    const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1];
    const title = /<title>([^<]*)<\/title>/.exec(entry)?.[1];
    if (id && title) videos.push(toVideo(id, decodeXml(title)));
  }
  return videos;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// -------- API pública del módulo --------------------------------------

/** Todos los vídeos del canal, sin agrupar. [] si nada responde. */
export async function getChannelVideos(): Promise<Video[]> {
  try {
    const videos = await fetchFromChannel();
    if (videos.length) return videos;
    console.warn("[youtube] el canal no devolvió vídeos; probando el RSS");
  } catch (err) {
    console.error("[youtube] no se pudo leer el canal:", err);
  }

  try {
    return await fetchFromRss();
  } catch (err) {
    console.error("[youtube] el RSS tampoco respondió:", err);
    return [];
  }
}

/**
 * Vídeos de partidos agrupados por año y, dentro de cada año, por jornada
 * (las fases finales van al final). Años de más reciente a más antiguo.
 */
export async function getMatchVideosByYear(): Promise<VideoYear[]> {
  const videos = (await getChannelVideos()).filter((v) =>
    isMatchVideo(v.title, v),
  );

  const byYear = new Map<number, Video[]>();
  for (const v of videos) {
    if (v.year === null) continue; // sin año no se puede clasificar
    if (!byYear.has(v.year)) byYear.set(v.year, []);
    byYear.get(v.year)!.push(v);
  }

  // Orden de las fases finales dentro del año.
  const stageOrder: Record<string, number> = {
    Playoffs: 900,
    Semifinales: 950,
    Final: 999,
  };

  const years: VideoYear[] = [...byYear.entries()]
    .map(([year, list]) => {
      const groups = new Map<string, VideoGroup>();

      for (const v of list) {
        const label =
          v.week !== null ? `Jornada ${v.week}` : (v.stage ?? "Otros");
        const order =
          v.week !== null ? v.week : (stageOrder[v.stage ?? ""] ?? 800);

        if (!groups.has(label)) groups.set(label, { label, order, videos: [] });
        groups.get(label)!.videos.push(v);
      }

      return {
        year,
        total: list.length,
        groups: [...groups.values()].sort((a, b) => a.order - b.order),
      };
    })
    .sort((a, b) => b.year - a.year);

  return years;
}
