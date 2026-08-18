// ----------------------------------------------------------------------
// Shared domain types for PMFL data
// Edit /data/*.json to update content. Types here describe that shape.
// ----------------------------------------------------------------------

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface TeamStatsBlock {
  pointsFor: number;
  pointsAgainst: number;
  yardsPerGame: number;
  turnoverDiff: number;
}

/**
 * Miembro del cuerpo técnico. El cargo va tal y como lo escribió el club
 * en el roster oficial ("DL/OL Coach", "Coach Ofensivo", "Asistente Head
 * Coach"…): cada uno usa su propia nomenclatura y no se reinterpreta.
 */
export interface Coach {
  name: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference?: "Pacific" | "Atlantic";
  founded?: number;
  headCoach?: string;
  offensiveCoordinator?: string;
  /** Cuerpo técnico completo, con el head coach primero. */
  coachingStaff?: Coach[];
  stadium?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo: string;
  /** Instagram profile URL */
  instagram?: string;
  /** Directivo principal del club */
  directivo?: string;
  /** Gerente general (GM) */
  gm?: string;
  record: TeamRecord;
  stats: TeamStatsBlock;
  description: string;
}

export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "DE" | "LB" | "CB" | "S" | "K" | "P" | "TBD";

export interface PlayerStats {
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  rushingYards?: number;
  rushingTDs?: number;
  receivingYards?: number;
  receivingTDs?: number;
  receptions?: number;
  tackles?: number;
  sacks?: number;
  ints?: number;
  passDeflections?: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  height: string;
  weight: number;
  age?: number;
  photo?: string;
  stats: PlayerStats;
}

export type GameStatus = "scheduled" | "live" | "final" | "postponed";

export interface Game {
  id: string;
  week: number;
  date: string; // ISO
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
}

export interface MediaItem {
  id: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
  category: string;
  team?: string;
  description?: string;
  /** External article/news link (used instead of the YouTube URL) */
  link?: string;
  /** Local video file path (e.g. /videos/foo.mp4) */
  video?: string;
}

export interface Media {
  playOfTheWeek: MediaItem;
  /** Partidos y transmisiones de YouTube, en su propia sección. */
  videos?: MediaItem[];
  highlights: MediaItem[];
}

export interface GalleryImage {
  id: string;
  title?: string;
  /** Ruta local (legado). Vacío cuando la imagen vive en Cloudinary. */
  src?: string;
  /** public_id en Cloudinary (p. ej. "pmfl/combine-2026/combine-1"). */
  publicId?: string;
  /** Dimensiones originales (para reservar el espacio y evitar saltos). */
  width?: number;
  height?: number;
  alt: string;
  category: string;
}

export type SponsorCategory = "Patrocinadores" | "Alianzas" | "Team Partners";

export interface Sponsor {
  id: string;
  name: string;
  category: SponsorCategory;
  url: string;
  /** "" when we don't have the logo yet */
  logo: string;
}

export interface StatsLeaders {
  season: string;
  leaders: Record<string, string[]>;
  notes?: string;
}

// Links que se actualizan cada semana (live de YouTube + boletos Ticketpluss).
// Editar /data/weekly.json para cambiarlos.
export interface WeeklyPanel {
  url: string;
  label: string;
  note: string;
  image: string;
}

/**
 * Noticia destacada en el inicio. Apunta a un medio externo: la imagen se
 * sirve desde el propio medio y siempre se muestra la fuente, porque el
 * contenido no es nuestro.
 */
export interface NewsPanel {
  url: string;
  /** Medio que publica ("TVN-2 · TVMax"). */
  source: string;
  /** ISO, para ordenar o comparar. */
  date: string;
  /** Fecha ya escrita para mostrar. */
  dateLabel: string;
  title: string;
  summary: string;
  image: string;
}

/**
 * Resumen editorial de una jornada para el inicio. Los marcadores se
 * escriben a mano: es una nota sobre una jornada concreta y debe seguir
 * diciendo lo mismo aunque la clasificación en vivo avance.
 */
export interface ResultsPanel {
  /** Línea pequeña de contexto: jornada, fecha y sede. */
  eyebrow: string;
  title: string;
  summary: string;
  /** Foto de cabecera, opcional. */
  image?: string;
  imageAlt?: string;
  /** Ruta interna a la que lleva la tarjeta. */
  url: string;
  linkLabel: string;
  partidos: Array<{
    casa: string;
    marcadorCasa: number;
    visita: string;
    marcadorVisita: number;
  }>;
}

export interface WeeklyLinks {
  resultados?: ResultsPanel;
  news?: NewsPanel;
  /** Alimenta el botón Tickets del menú. */
  tickets: WeeklyPanel;
}
