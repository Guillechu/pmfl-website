/**
 * ESPN draft-feed client tests.
 *
 *   npm run test:espn-api
 *
 * IMPORTANT, and stated plainly: the payloads below are this project's model
 * of ESPN's response, not a recording of one. They exercise the mapping from
 * a draft-detail document to presentation-ready picks - ids to names, ESPN
 * team ids to Jorkan teams, autopick flags, snake coordinates, and the
 * refusal to announce a player we cannot name. They do NOT prove ESPN's live
 * response looks like this. That is only proven by a real draft, and the
 * extension reports which source the board came from so it is obvious at a
 * glance whether it did.
 */
import { EspnDraftApi } from '../extension/src/content/espnDraftApi';
import { LEAGUE } from '../src/config/league';

const failures: string[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    failures.push(name);
  }
}

/** ESPN's own team ids, in this league's configured draft order. */
const TEAMS = LEAGUE.teams
  .slice()
  .sort((a, b) => a.draftSlot - b.draftSlot)
  .map((team, index) => ({ id: index + 1, name: team.name, abbrev: team.abbrev }));

const PLAYERS: Record<number, { fullName: string; defaultPositionId: number; proTeamId: number }> = {
  4362628: { fullName: "Ja'Marr Chase", defaultPositionId: 3, proTeamId: 4 },
  4035538: { fullName: 'David Montgomery', defaultPositionId: 2, proTeamId: 34 },
  3040151: { fullName: 'George Kittle', defaultPositionId: 4, proTeamId: 25 },
};
/** A player ESPN reports a pick for but will not name. */
const UNKNOWN_PLAYER_ID = 9999999;

function draftDetail(): unknown {
  const picks = [
    { overallPickNumber: 1, roundId: 1, roundPickNumber: 1, playerId: 4362628, teamId: 1, autoDraftTypeId: 0 },
    { overallPickNumber: 2, roundId: 1, roundPickNumber: 2, playerId: 4035538, teamId: 2, autoDraftTypeId: 1 },
    { overallPickNumber: 13, roundId: 2, roundPickNumber: 1, playerId: 3040151, teamId: 12, autoDraftTypeId: 0 },
    { overallPickNumber: 14, roundId: 2, roundPickNumber: 2, playerId: UNKNOWN_PLAYER_ID, teamId: 11, autoDraftTypeId: 0 },
  ];
  return { draftDetail: { drafted: false, inProgress: true, picks }, teams: TEAMS };
}

let athleteCalls = 0;

function installFetch(): void {
  (globalThis as { fetch: unknown }).fetch = async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as unknown as Response;

    if (url.includes('site.web.api.espn.com')) {
      athleteCalls += 1;
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    }
    if (url.includes('view=kona_player_info')) {
      const filter = JSON.parse(String((init?.headers as Record<string, string>)['x-fantasy-filter']));
      const ids = filter.players.filterIds.value as number[];
      return json({
        players: ids
          .filter((id) => PLAYERS[id])
          .map((id) => ({ id, player: { id, ...PLAYERS[id] } })),
      });
    }
    if (url.includes('view=mDraftDetail')) return json(draftDetail());
    throw new Error(`unexpected request: ${url}`);
  };
}

async function main(): Promise<void> {
  console.log('ESPN draft-feed client tests');
  installFetch();

  const api = new EspnDraftApi('1314329848', 2026);
  const state = await api.read();
  if (!state) {
    console.error('  FAIL read() returned nothing');
    process.exit(1);
  }

  check(state.inProgress, 'reports the draft as in progress');
  check(state.picks.length === 3, 'three named picks', `${state.picks.length}`);
  check(state.unnamed.includes(UNKNOWN_PLAYER_ID), 'the unnameable player is reported, not announced');

  const first = state.picks[0];
  check(first?.player.name === "Ja'Marr Chase", 'player named from ESPN', String(first?.player.name));
  check(first?.player.position === 'WR', 'position mapped from ESPN id', String(first?.player.position));
  check(first?.player.nflTeamAbbr === 'CIN', 'club mapped from ESPN id', String(first?.player.nflTeamAbbr));
  check(
    first?.player.headshotUrl?.includes('4362628') === true,
    'headshot derived from the ESPN player id',
    String(first?.player.headshotUrl),
  );
  const slotOne = LEAGUE.teams.find((team) => team.draftSlot === 1);
  check(first?.fantasyTeamId === slotOne?.id, 'credited to the team ESPN named', String(first?.fantasyTeamName));
  check(first?.autoPick === undefined, 'a manual pick is not flagged as autopick');
  check(state.picks[1]?.autoPick === true, 'an ESPN autopick is flagged');

  const secondRound = state.picks[2];
  check(secondRound?.overallPick === 13, 'overall pick preserved', String(secondRound?.overallPick));
  check(secondRound?.round === 2 && secondRound.pickInRound === 1, 'snake coordinates preserved');
  const slotTwelve = LEAGUE.teams.find((team) => team.draftSlot === 12);
  check(
    secondRound?.fantasyTeamId === slotTwelve?.id,
    'the snake turn is credited correctly',
    String(secondRound?.fantasyTeamName),
  );

  const ids = new Set(state.picks.map((pick) => pick.eventId));
  check(ids.size === state.picks.length, 'every pick has its own event id');

  // Second read: the names are cached and the unknown id is not chased again.
  const before = athleteCalls;
  await api.read();
  check(athleteCalls === before, 'a player ESPN cannot name is only chased once', `${athleteCalls - before} extra`);

  // ESPN's own "no player here" marker, which a practice room returned for
  // all 180 of its slots while the draft was on pick 27. Left unchecked it
  // put a player called " Team" at position "-" on the board 26 times.
  (globalThis as { fetch: unknown }).fetch = async (input: unknown) => {
    const url = String(input);
    const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as unknown as Response;
    if (url.includes('site.web.api.espn.com')) {
      return json({ athlete: { fullName: ' Team', position: { abbreviation: '-' } } });
    }
    if (url.includes('view=kona_player_info')) return json({ players: [] });
    return json({
      draftDetail: {
        drafted: false,
        inProgress: true,
        picks: Array.from({ length: 24 }, (_unused, i) => ({
          overallPickNumber: i + 1,
          roundId: Math.floor(i / 12) + 1,
          roundPickNumber: (i % 12) + 1,
          playerId: -1,
          teamId: (i % 12) + 1,
          autoDraftTypeId: 0,
        })),
      },
      teams: TEAMS,
    });
  };
  const empty = await new EspnDraftApi('1487959344', 2026).read();
  check(empty?.picks.length === 0, 'ESPN\'s empty slots are not picks', `${empty?.picks.length}`);
  check(empty?.placeholders === 24, 'and are counted so the popup can show it', `${empty?.placeholders}`);
  check(empty?.unnamed.length === 0, 'and are not mistaken for unnameable players', JSON.stringify(empty?.unnamed));
  check(
    empty?.warnings.some((w) => w.includes('not carrying who was drafted')) === true,
    'and the feed is called out as carrying no players',
    JSON.stringify(empty?.warnings),
  );

  // A pick ESPN names but cannot place: no position, no club. "TEAM, --,
  // FREE AGENT" reached a live television before this was a rule.
  const NAMELESS = 5551234;
  (globalThis as { fetch: unknown }).fetch = async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as unknown as Response;
    if (url.includes('site.web.api.espn.com')) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    if (url.includes('view=kona_player_info')) {
      const filter = JSON.parse(String((init?.headers as Record<string, string>)['x-fantasy-filter']));
      const ids = filter.players.filterIds.value as number[];
      return json({
        players: ids.map((id) =>
          id === NAMELESS
            ? { id, player: { id, fullName: 'Placeholder Entry' } }
            : { id, player: { id, ...PLAYERS[id] } },
        ),
      });
    }
    return json({
      draftDetail: {
        drafted: false,
        inProgress: true,
        picks: [
          { overallPickNumber: 1, roundId: 1, roundPickNumber: 1, playerId: 4362628, teamId: 1, autoDraftTypeId: 0 },
          { overallPickNumber: 2, roundId: 1, roundPickNumber: 2, playerId: NAMELESS, teamId: 2, autoDraftTypeId: 0 },
        ],
      },
      teams: TEAMS,
    });
  };
  const placeholder = await new EspnDraftApi('1314329848', 2026).read();
  check(placeholder?.picks.length === 1, 'a pick with no position is held back', `${placeholder?.picks.length}`);
  check(
    placeholder?.unnamed.includes(NAMELESS) === true,
    'and is reported so the popup can show it',
    JSON.stringify(placeholder?.unnamed),
  );

  // ESPN answering in a shape we do not read: the only symptom is an empty
  // board, so the shape itself has to reach the popup.
  (globalThis as { fetch: unknown }).fetch = async (input: unknown) => {
    const url = String(input);
    const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as unknown as Response;
    if (url.includes('site.web.api.espn.com')) return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    if (url.includes('view=kona_player_info')) return json({ playerPool: [], messages: [] });
    return json({
      draftDetail: {
        drafted: false,
        inProgress: true,
        picks: [{ overallPickNumber: 1, roundId: 1, roundPickNumber: 1, playerId: 4362628, teamId: 1, autoDraftTypeId: 0 }],
      },
      teams: TEAMS,
    });
  };
  const oddShape = await new EspnDraftApi('1314329848', 2026).read();
  check(oddShape?.picks.length === 0, 'an unreadable answer yields no picks', `${oddShape?.picks.length}`);
  check(
    oddShape?.warnings.some((w) => w.includes('playerPool')) === true,
    'and names the shape ESPN answered in',
    JSON.stringify(oddShape?.warnings),
  );

  // A public league served with `Access-Control-Allow-Origin: *`: the browser
  // refuses the credentialed request outright, and the same URL works the
  // moment we stop asking for the session.
  const seen: string[] = [];
  (globalThis as { fetch: unknown }).fetch = async (input: unknown, init?: RequestInit) => {
    const credentials = String(init?.credentials);
    seen.push(credentials);
    if (credentials === 'include') throw new TypeError('Failed to fetch');
    const url = String(input);
    const json = (value: unknown) => ({ ok: true, status: 200, json: async () => value }) as unknown as Response;
    if (url.includes('view=kona_player_info')) {
      const filter = JSON.parse(String((init?.headers as Record<string, string>)['x-fantasy-filter']));
      const ids = filter.players.filterIds.value as number[];
      return json({ players: ids.filter((id) => PLAYERS[id]).map((id) => ({ id, player: { id, ...PLAYERS[id] } })) });
    }
    if (url.includes('view=mDraftDetail')) return json(draftDetail());
    throw new Error(`unexpected request: ${url}`);
  };
  const publicLeague = await new EspnDraftApi('2036757808', 2026).read();
  check(publicLeague !== null, 'a CORS refusal is retried without the session');
  check(publicLeague?.picks.length === 3, 'and the picks come through', `${publicLeague?.picks.length}`);
  check(seen[0] === 'include' && seen[1] === 'omit', 'the session is tried first', seen.slice(0, 2).join(' then '));

  // ESPN answering "no such league" is final; there is nothing to retry.
  const attempts: string[] = [];
  (globalThis as { fetch: unknown }).fetch = async (_input: unknown, init?: RequestInit) => {
    attempts.push(String(init?.credentials));
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
  };
  const missing = new EspnDraftApi('nope', 2026);
  check((await missing.read()) === null, 'a missing league reads as nothing');
  check(attempts.length === 1, 'a 404 is not retried', `${attempts.length} attempts`);
  check(
    missing.error?.includes('not found') === true,
    'and says so in words the popup can show',
    String(missing.error),
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s): ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll ESPN draft-feed checks passed.');
  console.log('Note: this proves our mapping, not ESPN\'s live response shape.');
}

void main();
