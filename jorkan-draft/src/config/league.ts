import type { League, FantasyTeam, RosterSlotDef } from '@/types/league';

/**
 * Starting lineup for the Jorkan League.
 * FLEX takes the ESPN-standard eligible positions (RB/WR/TE).
 */
export const STARTER_SLOTS: readonly RosterSlotDef[] = [
  { id: 'QB', label: 'QB', eligible: ['QB'] },
  { id: 'RB1', label: 'RB', eligible: ['RB'] },
  { id: 'RB2', label: 'RB', eligible: ['RB'] },
  { id: 'WR1', label: 'WR', eligible: ['WR'] },
  { id: 'WR2', label: 'WR', eligible: ['WR'] },
  { id: 'TE', label: 'TE', eligible: ['TE'] },
  { id: 'FLEX', label: 'FLEX', eligible: ['RB', 'WR', 'TE'] },
  { id: 'K', label: 'K', eligible: ['K'] },
  { id: 'DST', label: 'DEF', eligible: ['DST'] },
];

/*
 * Seven, not six, because ESPN drafts sixteen rounds.
 *
 * Read off the league's own feed in production: draftDetail.picks came back
 * with 192 slots, which is twelve teams by sixteen rounds. Nine starters and
 * seven on the bench is what sixteen picks fill.
 */
export const BENCH_SLOTS = 7;

/**
 * Official 2026 draft order. ESPN remains authoritative for who is actually on
 * the clock; this table is used for validation, fallback and presentation
 * (colours, manager names, on-deck lookahead before ESPN reports it).
 */
const TEAMS: readonly FantasyTeam[] = [
  {
    id: 'el-dandy',
    name: 'El Dandy',
    abbrev: 'DAN',
    draftSlot: 1,
    accentColor: '#A67512',
    manager: { id: 'guillermo-chu', name: 'Guillermo Chu', phonetic: 'Gee-YAIR-mo Choo' },
    aliases: ['el dandy', 'dandy'],
  },
  {
    id: 'hospital-nicolas-solano',
    name: 'Hospital Nicolas Solano',
    abbrev: 'HNS',
    draftSlot: 2,
    accentColor: '#20548C',
    manager: { id: 'gabriel-barrera', name: 'Gabriel Barrera', phonetic: 'Gah-bree-EL Bah-REH-rah' },
    aliases: ['hospital nicolas solano', 'hospital nicolás solano', 'hospital'],
    phonetic: 'Hospital Nee-ko-LAHS So-LAH-no',
  },
  {
    id: 'dubtown',
    name: 'Dubtown',
    abbrev: 'DUB',
    draftSlot: 3,
    accentColor: '#1C7548',
    manager: { id: 'ilan-minkowicz', name: 'Ilan Minkowicz', phonetic: 'EE-lahn Min-KOH-vitch' },
    aliases: ['dubtown', 'dub town'],
  },
  {
    id: 'los-chucha-de-sus-madres',
    name: 'los chucha de sus madres',
    abbrev: 'LCM',
    draftSlot: 4,
    accentColor: '#B04724',
    manager: { id: 'rolando-ng', name: 'Rolando Ng', phonetic: 'Ro-LAHN-do Eng' },
    aliases: ['los chucha de sus madres', 'chucha'],
    phonetic: 'lohs CHOO-cha deh soos MAH-drehs',
  },
  {
    id: 'eduardos-energetic-team',
    name: "Eduardo's Energetic Team",
    abbrev: 'EET',
    draftSlot: 5,
    accentColor: '#66499B',
    manager: { id: 'eduardo-diaz', name: 'Eduardo Diaz', phonetic: 'Eh-DWAR-do DEE-ahs' },
    aliases: ["eduardo's energetic team", 'eduardos energetic team', 'energetic'],
  },
  {
    id: 'el-loco',
    name: 'EL LOCO',
    abbrev: 'LOC',
    draftSlot: 6,
    accentColor: '#A22A1C',
    manager: { id: 'rodolfo-diaz', name: 'Rodolfo Diaz', phonetic: 'Ro-DOLE-fo DEE-ahs' },
    aliases: ['el loco', 'loco'],
    phonetic: 'el LOH-koh',
  },
  {
    id: 'nyc-dreams',
    name: 'NYC Dreams',
    abbrev: 'NYC',
    draftSlot: 7,
    accentColor: '#356FAF',
    manager: { id: 'joshua-perez', name: 'Joshua Perez', phonetic: 'JOSH-wah PEH-res' },
    aliases: ['nyc dreams', 'nyc'],
    phonetic: 'N Y C Dreams',
  },
  {
    id: 'los-buques-de-bugaba',
    name: 'LOS BUQES DE BUGABA',
    abbrev: 'LBB',
    draftSlot: 8,
    accentColor: '#0F7566',
    manager: { id: 'alejandro-parks', name: 'Alejandro Parks', phonetic: 'Ah-leh-HAHN-dro Parks' },
    aliases: ['los buques de bugaba', 'los buqes de bugaba', 'bugaba'],
    phonetic: 'lohs BOO-kehs deh boo-GAH-bah',
  },
  {
    id: 'los-badros',
    name: 'Los Badros',
    abbrev: 'BAD',
    draftSlot: 9,
    accentColor: '#A06C10',
    manager: { id: 'luis-rolon', name: 'Luis Rolon', phonetic: 'Loo-EES Ro-LOHN' },
    aliases: ['los badros', 'badros'],
    phonetic: 'lohs BAH-drohs',
  },
  {
    id: 'twisteens',
    name: 'twisteens',
    abbrev: 'TWS',
    draftSlot: 10,
    accentColor: '#9C3F7E',
    manager: { id: 'nikolas-rivera', name: 'Nikolas Rivera', phonetic: 'NEE-ko-lahs Ree-VEH-rah' },
    aliases: ['twisteens', 'twisteen'],
    phonetic: 'TWIS-teens',
  },
  {
    id: 'caleb-4-the-w',
    name: 'Caleb 4 the W',
    abbrev: 'C4W',
    draftSlot: 11,
    accentColor: '#465C6E',
    manager: { id: 'francisco-robles', name: 'Francisco Robles', phonetic: 'Frahn-SEES-ko ROH-blehs' },
    aliases: ['caleb 4 the w', 'caleb for the w', 'caleb'],
    phonetic: 'Caleb for the W',
  },
  {
    id: 'ardillas-de-betania',
    name: 'Ardillas de Betania',
    abbrev: 'ARD',
    draftSlot: 12,
    accentColor: '#4F7A1E',
    manager: { id: 'augusto-vergara', name: 'Augusto Vergara', phonetic: 'Ow-GOOS-toh Ver-GAH-rah' },
    aliases: ['ardillas de betania', 'ardillas'],
    phonetic: 'ar-DEE-yahs deh beh-TAH-nyah',
  },
];

export const LEAGUE: League = {
  id: 'jorkan-2026',
  name: 'Jorkan League',
  season: 2026,
  espnLeagueId: '1314329848',
  espnLeagueUrl: 'https://fantasy.espn.com/football/league?leagueId=1314329848',
  teamCount: 12,
  /*
   * Sixteen rounds, 192 picks.
   *
   * Fifteen was our own assumption and it was wrong. ESPN's feed for this
   * league returns 192 pick slots, and the draft-room header reads "RND 9 of
   * 16" - a warning the parser had been raising all along, against a number
   * nobody had gone back and corrected. At fifteen the presentation would
   * have declared the draft finished twelve picks early and thrown away
   * every one after that.
   */
  rounds: 16,
  rosterSize: 16,
  pickSeconds: 300,
  draftType: 'snake',
  // Sunday 6 September 2026, 5pm, Panama time (UTC-5 all year, no daylight
  // saving to trip over). Change this one line if the league moves the date.
  scheduledStart: '2026-09-06T17:00:00-05:00',
  musicLeadMinutes: 10,
  starters: STARTER_SLOTS,
  benchSlots: BENCH_SLOTS,
  teams: TEAMS,
};

export const TOTAL_PICKS = LEAGUE.teamCount * LEAGUE.rounds;

const BY_ID = new Map(TEAMS.map((t) => [t.id, t]));
const BY_SLOT = new Map(TEAMS.map((t) => [t.draftSlot, t]));

export function teamById(id: string | null | undefined): FantasyTeam | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function teamBySlot(slot: number): FantasyTeam | undefined {
  return BY_SLOT.get(slot);
}

/** Normalised text key used for fuzzy matching ESPN team text back to config. */
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const NAME_INDEX = new Map<string, FantasyTeam>();
for (const team of TEAMS) {
  NAME_INDEX.set(normalizeName(team.name), team);
  NAME_INDEX.set(normalizeName(team.abbrev), team);
  NAME_INDEX.set(normalizeName(team.manager.name), team);
  for (const alias of team.aliases ?? []) NAME_INDEX.set(normalizeName(alias), team);
}

/**
 * Every configured team the text could be referring to, best match first.
 *
 * A parser needs to know when text is ambiguous: a container holding both
 * "El Dandy is on the clock" and "Hospital Nicolas Solano on deck" matches two
 * teams, and guessing between them silently puts the wrong name on the TV.
 */
export function resolveAllTeams(text: string | null | undefined): FantasyTeam[] {
  if (!text) return [];
  const key = normalizeName(text);
  if (!key) return [];

  const exact = NAME_INDEX.get(key);
  if (exact) return [exact];

  const matches = new Map<FantasyTeam, number>();
  for (const [name, team] of NAME_INDEX) {
    if (name.length < 4) continue;
    if (!key.includes(name) && !name.includes(key)) continue;
    // Longest matched alias wins: "los badros" beats "badros".
    matches.set(team, Math.max(matches.get(team) ?? 0, name.length));
  }
  return [...matches.entries()].sort((a, b) => b[1] - a[1]).map(([team]) => team);
}

/**
 * Resolve arbitrary ESPN text (team name, abbreviation, or manager name) to a
 * configured team. Exact match first, then the longest containment match, so a
 * renamed-on-ESPN team still lands on the right column.
 */
export function resolveTeam(text: string | null | undefined): FantasyTeam | undefined {
  return resolveAllTeams(text)[0];
}
