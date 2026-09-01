import type { DraftPick } from '@/types/draft';
import { LEAGUE, resolveTeam, teamBySlot } from '@/config/league';
import { normalizePosition } from '@/types/player';
import { makeEventId } from '@/core/dedupe';
import { coordsFromOverall, isValidOverall, slotForOverall } from '@/core/snake';
import { espnHeadshotUrl, nflLogoUrl, resolveNflTeam } from '@/data/nflTeams';

/**
 * ESPN's own read-only draft feed.
 *
 * The draft room renders only the picks it currently has on screen: the strip
 * along the top is the picks still *to come*, and a real 2026 room went a
 * whole practice draft without a single completed selection appearing
 * anywhere in the DOM we can reach. Reading the board off the screen would
 * mean asking the commissioner to keep a particular panel open all night, and
 * missing every pick made while it was not.
 *
 * So we ask ESPN the same question ESPN's own draft room asks: the league's
 * draft detail, straight from the API the room itself is built on. That keeps
 * ESPN the single source of truth for every pick, which is the whole point of
 * this project.
 *
 * Rules this file keeps, without exception:
 *
 *   - GET only. Nothing here can make, change or undo a pick. The host is
 *     ESPN's read replica ("lm-api-reads"), which has no write endpoints.
 *   - It runs in the content script, on the draft room's own origin, so the
 *     browser attaches whatever session the commissioner already has open.
 *     We never read a cookie, never store one, never send one anywhere, and
 *     never ask for ESPN credentials.
 *   - Nothing leaves the machine. The answer goes to the local presentation
 *     and nowhere else.
 *   - Every failure is silent and non-fatal: the DOM parser keeps running and
 *     the presentation keeps working with whatever it already has.
 */

const READ_HOST = 'https://lm-api-reads.fantasy.espn.com';
const FFL = (season: number): string => `${READ_HOST}/apis/v3/games/ffl/seasons/${season}`;
/** A draft feed older than this is refetched rather than reused. */
const REQUEST_TIMEOUT_MS = 6000;

export interface ApiDraftState {
  picks: DraftPick[];
  drafted: boolean;
  inProgress: boolean;
  /** Player ids ESPN reported that we could not put a name to. */
  unnamed: number[];
  warnings: string[];
}

/* --------------------------- ESPN id tables --------------------------- */

/** ESPN's fantasy position ids. Stable for as long as the game has existed. */
const POSITION_BY_ID: Record<number, string> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'D/ST',
};

/** ESPN's pro-team ids, in ESPN's own numbering (0 is free agent). */
const PRO_TEAM_BY_ID: Record<number, string> = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET',
  9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN',
  17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC',
  25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WSH', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};

/* ------------------------------- fetching ------------------------------ */

/** An error that remembers whether ESPN actually answered, and how. */
class FeedError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

async function request(url: string, credentials: RequestCredentials, filter?: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials,
      signal: controller.signal,
      headers: filter === undefined ? {} : { 'x-fantasy-filter': JSON.stringify(filter) },
    });
    if (!response.ok) throw new FeedError(`HTTP ${response.status}`, response.status);
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof FeedError) throw error;
    // fetch rejects without a status for a network failure and for every CORS
    // refusal alike; the browser deliberately does not say which.
    throw new FeedError(error instanceof Error ? error.message : String(error), null);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One read, tried with and then without the browser's ESPN session.
 *
 * A private league needs the credentialed request. A public one may be served
 * with `Access-Control-Allow-Origin: *`, which the browser flatly refuses to
 * combine with credentials - so the credentialed attempt fails with no status
 * at all and the same URL succeeds the moment we stop asking for the session.
 * Retrying is pointless once ESPN has actually answered: a 404 stays a 404.
 */
async function getJson(url: string, filter?: unknown): Promise<unknown> {
  try {
    return await request(url, 'include', filter);
  } catch (error) {
    const status = error instanceof FeedError ? error.status : 0;
    if (status !== null) throw error;
    return request(url, 'omit', filter);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** The field names of an object, for saying what shape ESPN answered in. */
function keysOf(value: Record<string, unknown> | null): string {
  if (!value) return 'none';
  return Object.keys(value).slice(0, 8).join(', ') || 'none';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

/* ------------------------------ the client ----------------------------- */

interface PlayerRef {
  name: string;
  position: string | null;
  proTeam: string | null;
}

export class EspnDraftApi {
  private readonly players = new Map<number, PlayerRef>();
  /** Ids ESPN has already told us it does not know, so we stop asking. */
  private readonly unknownPlayers = new Set<number>();
  private teamNames = new Map<number, string>();
  private lastError: string | null = null;

  constructor(
    private readonly leagueId: string,
    private readonly season: number = LEAGUE.season,
  ) {}

  get error(): string | null {
    return this.lastError;
  }

  /** Everything ESPN has drafted so far, as presentation-ready picks. */
  async read(): Promise<ApiDraftState | null> {
    let payload: unknown;
    try {
      payload = await getJson(
        `${FFL(this.season)}/segments/0/leagues/${encodeURIComponent(this.leagueId)}?view=mDraftDetail&view=mTeam`,
      );
    } catch (error) {
      const status = error instanceof FeedError ? error.status : null;
      this.lastError =
        status === 404
          ? `league ${this.leagueId} not found in ESPN's ${this.season} draft feed`
          : status === 401 || status === 403
            ? `ESPN refused the draft feed (${status}) - is this the league you are signed in to?`
            : status === null
              ? `could not reach ESPN's draft feed (blocked or offline)`
              : `HTTP ${status}`;
      return null;
    }
    this.lastError = null;

    const root = asRecord(payload);
    if (!root) return null;

    this.readTeams(root);

    const detail = asRecord(root['draftDetail']);
    const rawPicks = Array.isArray(detail?.['picks']) ? (detail['picks'] as unknown[]) : [];
    const warnings: string[] = [];

    const wanted = new Set<number>();
    for (const raw of rawPicks) {
      const row = asRecord(raw);
      const playerId = asNumber(row?.['playerId']);
      if (playerId && !this.players.has(playerId) && !this.unknownPlayers.has(playerId)) wanted.add(playerId);
    }
    if (wanted.size > 0) await this.loadPlayers([...wanted], warnings);

    const picks: DraftPick[] = [];
    const unnamed: number[] = [];
    for (const raw of rawPicks) {
      const built = this.toPick(asRecord(raw), warnings, unnamed);
      if (built) picks.push(built);
    }
    picks.sort((a, b) => a.overallPick - b.overallPick);

    return {
      picks,
      drafted: detail?.['drafted'] === true,
      inProgress: detail?.['inProgress'] === true,
      unnamed,
      warnings,
    };
  }

  /** ESPN's team list, so a pick is credited to the team ESPN says made it. */
  private readTeams(root: Record<string, unknown>): void {
    const teams = Array.isArray(root['teams']) ? (root['teams'] as unknown[]) : [];
    if (teams.length === 0) return;
    const next = new Map<number, string>();
    for (const raw of teams) {
      const team = asRecord(raw);
      const id = asNumber(team?.['id']);
      if (!id || !team) continue;
      const name =
        (typeof team['name'] === 'string' && team['name'].trim()) ||
        [team['location'], team['nickname']].filter((part) => typeof part === 'string').join(' ').trim() ||
        (typeof team['abbrev'] === 'string' ? team['abbrev'] : '');
      if (name) next.set(id, name);
    }
    if (next.size > 0) this.teamNames = next;
  }

  /**
   * Names for the ids ESPN just reported.
   *
   * Asked for by id rather than by pulling the whole player universe: the
   * draft only ever needs the few hundred players actually taken.
   */
  private async loadPlayers(ids: number[], warnings: string[]): Promise<void> {
    try {
      const payload = await getJson(
        `${FFL(this.season)}/segments/0/leagues/${encodeURIComponent(this.leagueId)}?view=kona_player_info`,
        { players: { filterIds: { value: ids }, limit: ids.length } },
      );
      const root = asRecord(payload);
      const entries = Array.isArray(root?.['players']) ? (root['players'] as unknown[]) : [];
      /*
       * If ESPN answers in a shape we do not read, the only symptom is an
       * empty board, and the cause is invisible from the outside. Naming the
       * shape - keys only, never values - turns that into one line the popup
       * can show, instead of a debug export and a round trip.
       */
      if (entries.length === 0) {
        warnings.push(`player lookup answered with no players (top-level keys: ${keysOf(root)})`);
      }
      const before = this.players.size;
      for (const entry of entries) {
        const wrapper = asRecord(entry);
        const player = asRecord(wrapper?.['player']) ?? wrapper;
        const id = asNumber(player?.['id']) ?? asNumber(wrapper?.['id']);
        const name = typeof player?.['fullName'] === 'string' ? player['fullName'] : null;
        if (!id || !name) continue;
        const positionId = asNumber(player?.['defaultPositionId']);
        const proTeamId = asNumber(player?.['proTeamId']);
        this.players.set(id, {
          name,
          position: positionId !== null ? (POSITION_BY_ID[positionId] ?? null) : null,
          proTeam: proTeamId !== null ? (PRO_TEAM_BY_ID[proTeamId] ?? null) : null,
        });
      }
      if (entries.length > 0 && this.players.size === before) {
        warnings.push(
          `player lookup named none of ${entries.length} entries (entry keys: ${keysOf(asRecord(entries[0]))})`,
        );
      }
    } catch (error) {
      warnings.push(`player lookup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Whatever ESPN's fantasy view did not answer, try its public athlete
    // endpoint one at a time. A handful of misses is normal; a flood is not,
    // so the count is bounded rather than looping over a whole draft.
    const missing = ids.filter((id) => !this.players.has(id)).slice(0, 8);
    for (const id of missing) {
      const found = await this.athlete(id);
      if (found) this.players.set(id, found);
      else this.unknownPlayers.add(id);
    }
  }

  private async athlete(id: number): Promise<PlayerRef | null> {
    try {
      const payload = await getJson(
        `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}`,
      );
      const root = asRecord(payload);
      const athlete = asRecord(root?.['athlete']) ?? root;
      const name = typeof athlete?.['fullName'] === 'string' ? athlete['fullName'] : null;
      if (!name) return null;
      const position = asRecord(athlete?.['position'])?.['abbreviation'];
      const proTeam = asRecord(athlete?.['team'])?.['abbreviation'];
      return {
        name,
        position: typeof position === 'string' ? position : null,
        proTeam: typeof proTeam === 'string' ? proTeam : null,
      };
    } catch {
      return null;
    }
  }

  private toPick(
    row: Record<string, unknown> | null,
    warnings: string[],
    unnamed: number[],
  ): DraftPick | null {
    if (!row) return null;
    const overallPick = asNumber(row['overallPickNumber']);
    const playerId = asNumber(row['playerId']);
    if (!overallPick || !playerId || !isValidOverall(overallPick)) return null;

    const player = this.players.get(playerId);
    /*
     * A drafted player has a name and a position. Anything less is not ready
     * to go on television - "TEAM, --, FREE AGENT" is worse than nothing, and
     * worse than the same pick arriving a poll later once ESPN has told us
     * who it is. The popup reports how many are being held back, so this
     * never fails silently.
     */
    if (!player || !player.name.trim() || !player.position) {
      unnamed.push(playerId);
      return null;
    }

    const coords = coordsFromOverall(overallPick);
    const espnTeamId = asNumber(row['teamId']);
    const espnTeamName = espnTeamId !== null ? this.teamNames.get(espnTeamId) : undefined;
    const team = resolveTeam(espnTeamName ?? null) ?? teamBySlot(slotForOverall(overallPick));
    if (!team) return null;
    if (espnTeamName && !resolveTeam(espnTeamName)) {
      warnings.push(`ESPN team "${espnTeamName}" does not match any configured team`);
    }

    const nfl = resolveNflTeam(player.proTeam);
    const headshot = espnHeadshotUrl(String(playerId));
    const logo = nfl ? nflLogoUrl(nfl.abbr) : undefined;
    const autoPick = (asNumber(row['autoDraftTypeId']) ?? 0) > 0;

    const pick: Omit<DraftPick, 'eventId' | 'timestamp'> = {
      overallPick,
      round: asNumber(row['roundId']) ?? coords.round,
      pickInRound: asNumber(row['roundPickNumber']) ?? coords.pickInRound,
      player: {
        name: player.name,
        position: normalizePosition(player.position),
        ...(player.position ? { rawPosition: player.position } : {}),
        espnId: String(playerId),
        ...(nfl ? { nflTeamAbbr: nfl.abbr, nflTeamName: nfl.name } : {}),
        ...(headshot ? { headshotUrl: headshot } : {}),
        ...(logo ? { teamLogoUrl: logo } : {}),
      },
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.manager.name,
      ...(autoPick ? { autoPick: true } : {}),
    };

    return {
      ...pick,
      timestamp: Date.now(),
      eventId: makeEventId({
        leagueId: this.leagueId,
        overallPick,
        player: pick.player,
        fantasyTeamId: pick.fantasyTeamId,
      }),
    };
  }
}
