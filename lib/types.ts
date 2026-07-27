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

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
  conference?: "Pacific" | "Atlantic";
  founded?: number;
  headCoach?: string;
  offensiveCoordinator?: string;
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
  highlights: MediaItem[];
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: "Games" | "Training" | "Fans";
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

export interface WeeklyLinks {
  youtubeLive: WeeklyPanel;
  tickets: WeeklyPanel;
}
