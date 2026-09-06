/**
 * NFL team reference data.
 *
 * Logos come from ESPN's own public team-logo CDN, matching the source of
 * truth we already read the draft from. If ESPN gives us a logo URL directly
 * in the draft room we prefer that; this is the fallback.
 */
export interface NflTeam {
  abbr: string;
  name: string;
  location: string;
  nickname: string;
  primary: string;
  secondary: string;
}

const T = (
  abbr: string,
  location: string,
  nickname: string,
  primary: string,
  secondary: string,
): NflTeam => ({ abbr, location, nickname, name: `${location} ${nickname}`, primary, secondary });

export const NFL_TEAMS: readonly NflTeam[] = [
  T('ARI', 'Arizona', 'Cardinals', '#97233F', '#000000'),
  T('ATL', 'Atlanta', 'Falcons', '#A71930', '#000000'),
  T('BAL', 'Baltimore', 'Ravens', '#241773', '#9E7C0C'),
  T('BUF', 'Buffalo', 'Bills', '#00338D', '#C60C30'),
  T('CAR', 'Carolina', 'Panthers', '#0085CA', '#101820'),
  T('CHI', 'Chicago', 'Bears', '#0B162A', '#C83803'),
  T('CIN', 'Cincinnati', 'Bengals', '#FB4F14', '#000000'),
  T('CLE', 'Cleveland', 'Browns', '#311D00', '#FF3C00'),
  T('DAL', 'Dallas', 'Cowboys', '#041E42', '#869397'),
  T('DEN', 'Denver', 'Broncos', '#FB4F14', '#002244'),
  T('DET', 'Detroit', 'Lions', '#0076B6', '#B0B7BC'),
  T('GB', 'Green Bay', 'Packers', '#203731', '#FFB612'),
  T('HOU', 'Houston', 'Texans', '#03202F', '#A71930'),
  T('IND', 'Indianapolis', 'Colts', '#002C5F', '#A2AAAD'),
  T('JAX', 'Jacksonville', 'Jaguars', '#006778', '#D7A22A'),
  T('KC', 'Kansas City', 'Chiefs', '#E31837', '#FFB81C'),
  T('LAC', 'Los Angeles', 'Chargers', '#0080C6', '#FFC20E'),
  T('LAR', 'Los Angeles', 'Rams', '#003594', '#FFA300'),
  T('LV', 'Las Vegas', 'Raiders', '#000000', '#A5ACAF'),
  T('MIA', 'Miami', 'Dolphins', '#008E97', '#FC4C02'),
  T('MIN', 'Minnesota', 'Vikings', '#4F2683', '#FFC62F'),
  T('NE', 'New England', 'Patriots', '#002244', '#C60C30'),
  T('NO', 'New Orleans', 'Saints', '#D3BC8D', '#101820'),
  T('NYG', 'New York', 'Giants', '#0B2265', '#A71930'),
  T('NYJ', 'New York', 'Jets', '#125740', '#000000'),
  T('PHI', 'Philadelphia', 'Eagles', '#004C54', '#A5ACAF'),
  T('PIT', 'Pittsburgh', 'Steelers', '#FFB612', '#101820'),
  T('SEA', 'Seattle', 'Seahawks', '#002244', '#69BE28'),
  T('SF', 'San Francisco', '49ers', '#AA0000', '#B3995D'),
  T('TB', 'Tampa Bay', 'Buccaneers', '#D50A0A', '#0A0A08'),
  T('TEN', 'Tennessee', 'Titans', '#0C2340', '#4B92DB'),
  T('WSH', 'Washington', 'Commanders', '#5A1414', '#FFB612'),
];

/** ESPN uses a couple of legacy abbreviations; map them to ours. */
const ALIASES: Record<string, string> = {
  WAS: 'WSH',
  JAC: 'JAX',
  LA: 'LAR',
  SD: 'LAC',
  OAK: 'LV',
  STL: 'LAR',
  GNB: 'GB',
  KAN: 'KC',
  NWE: 'NE',
  NOR: 'NO',
  SFO: 'SF',
  TAM: 'TB',
  LVR: 'LV',
};

const BY_ABBR = new Map(NFL_TEAMS.map((t) => [t.abbr, t]));
const BY_NAME = new Map(NFL_TEAMS.map((t) => [t.name.toLowerCase(), t]));
const BY_NICK = new Map(NFL_TEAMS.map((t) => [t.nickname.toLowerCase(), t]));

export function nflTeamByAbbr(abbr: string | null | undefined): NflTeam | undefined {
  if (!abbr) return undefined;
  const key = abbr.trim().toUpperCase();
  return BY_ABBR.get(key) ?? BY_ABBR.get(ALIASES[key] ?? '');
}

export function nflTeamByName(name: string | null | undefined): NflTeam | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return BY_NAME.get(key) ?? BY_NICK.get(key);
}

/** Resolve from whatever ESPN gave us: abbreviation, nickname or full name. */
export function resolveNflTeam(value: string | null | undefined): NflTeam | undefined {
  return nflTeamByAbbr(value) ?? nflTeamByName(value);
}

/** ESPN's public team logo CDN. */
export function nflLogoUrl(abbr: string | null | undefined, size = 500): string | undefined {
  const team = nflTeamByAbbr(abbr);
  if (!team) return undefined;
  return `https://a.espncdn.com/i/teamlogos/nfl/${size}/${team.abbr.toLowerCase()}.png`;
}

/** ESPN's public headshot CDN, keyed by ESPN player id. */
export function espnHeadshotUrl(espnId: string | null | undefined): string | undefined {
  if (!espnId || !/^\d+$/.test(espnId)) return undefined;
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
}
