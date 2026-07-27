// ----------------------------------------------------------------------
// Centralized data accessors. Pages import from here so we can swap the
// JSON source for an API later without touching components.
// ----------------------------------------------------------------------

import teamsJson from "@/data/teams.json";
import playersJson from "@/data/players.json";
import statsJson from "@/data/stats.json";
import scheduleJson from "@/data/schedule.json";
import mediaJson from "@/data/media.json";
import galleryJson from "@/data/gallery.json";
import sponsorsJson from "@/data/sponsors.json";
import weeklyJson from "@/data/weekly.json";

import type {
  Team,
  Player,
  Game,
  Media,
  GalleryImage,
  Sponsor,
  StatsLeaders,
  WeeklyLinks,
} from "./types";

export const teams: Team[] = teamsJson as Team[];
export const players: Player[] = playersJson as Player[];
export const schedule: Game[] = scheduleJson as Game[];
export const media: Media = mediaJson as Media;
export const gallery: GalleryImage[] = galleryJson as GalleryImage[];
export const sponsors: Sponsor[] = sponsorsJson as Sponsor[];
export const statsLeaders: StatsLeaders = statsJson as StatsLeaders;
export const weekly: WeeklyLinks = weeklyJson as WeeklyLinks;

// -------- helpers ----------------------------------------------------

export function getTeam(id: string): Team | undefined {
  return teams.find((t) => t.id === id);
}

export function getTeamRoster(teamId: string): Player[] {
  return players.filter((p) => p.teamId === teamId);
}

export function getPlayer(id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

export function teamWinPct(t: Team): number {
  const games = t.record.wins + t.record.losses + t.record.ties;
  if (!games) return 0;
  return (t.record.wins + t.record.ties * 0.5) / games;
}

/** Sorted standings, best record first. */
export function standings(): Team[] {
  return [...teams].sort((a, b) => {
    const diff = teamWinPct(b) - teamWinPct(a);
    if (diff !== 0) return diff;
    return b.stats.pointsFor - b.stats.pointsAgainst - (a.stats.pointsFor - a.stats.pointsAgainst);
  });
}

export function gamesByWeek(): Record<number, Game[]> {
  return schedule.reduce<Record<number, Game[]>>((acc, g) => {
    (acc[g.week] ??= []).push(g);
    return acc;
  }, {});
}

export function nextGames(limit = 3): Game[] {
  const now = new Date();
  return schedule
    .filter((g) => g.status === "scheduled" && new Date(g.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);
}

export function recentResults(limit = 3): Game[] {
  return schedule
    .filter((g) => g.status === "final")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/** Top players by a numeric stat key (descending). */
export function topByStat(key: keyof Player["stats"], limit = 10): Player[] {
  return [...players]
    .filter((p) => typeof p.stats[key] === "number")
    .sort((a, b) => (b.stats[key] as number) - (a.stats[key] as number))
    .slice(0, limit);
}
