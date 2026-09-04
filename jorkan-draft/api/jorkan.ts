/**
 * Read-only window onto the Jorkan League's ESPN draft.
 *
 * A serverless function, deployed alongside this site. The presentation runs
 * in a browser that is not signed in to ESPN - a television, a phone - so it
 * cannot call ESPN itself: the browser blocks the cross-origin read. This
 * makes the same call from the server, where there is no such rule, and hands
 * the answer back unchanged.
 *
 * What it deliberately is not:
 *   - It is not an open proxy. One league, one season, and a fixed list of
 *     views; anything else is refused.
 *   - It never sends a cookie, a token or an Authorization header, and never
 *     asks the caller for one. The league is readable without a session,
 *     which is the only reason this works at all.
 *   - It never writes. ESPN's read host has no write endpoints.
 */

export const config = { runtime: 'edge' };

/** The Jorkan League on ESPN. Mirrors src/config/league.ts. */
const LEAGUE_ID = '1314329848';
const SEASON = 2026;

/**
 * A mock draft is its own throwaway league on ESPN, never an event inside
 * yours, so rehearsing on the television means naming that league. `league`
 * accepts an id shaped the way ESPN's are and nothing else; anything else
 * falls back to the real one. The read is the same read either way: public,
 * GET only, no credential.
 */
function leagueFrom(params: URLSearchParams): string {
  const asked = params.get('league');
  return asked && /^\d{4,16}$/.test(asked) ? asked : LEAGUE_ID;
}

/**
 * Which season to read. The presentation never asks for anything but this
 * one; a past season is readable so that a finished draft can be used to
 * establish what ESPN does and does not hand to a reader with no session,
 * which is not a question that can wait until draft night to be answered.
 */
function seasonFrom(params: URLSearchParams): number {
  const asked = Number(params.get('season'));
  return Number.isInteger(asked) && asked >= 2015 && asked <= SEASON ? asked : SEASON;
}

const READ_HOST = 'https://lm-api-reads.fantasy.espn.com';

/**
 * The only views the presentation asks for.
 *
 * `mRoster` is here because `mDraftDetail` cannot be trusted to carry a draft
 * as it happens: read without a session, a mock room in progress answered with
 * all 192 slots still empty minutes in. A drafted player lands on his team's
 * roster, so the rosters are the second place to look for the same fact.
 */
const ALLOWED_VIEWS = new Set(['mDraftDetail', 'mTeam', 'mRoster', 'kona_player_info']);

const TIMEOUT_MS = 8000;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // The draft moves every few seconds; a cached answer is a wrong one.
      'cache-control': 'no-store, max-age=0',
    },
  });

export default async function handler(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const views = params.getAll('view');
  if (views.length === 0 || views.some((view) => !ALLOWED_VIEWS.has(view))) {
    return json({ error: 'unsupported view', allowed: [...ALLOWED_VIEWS] }, 400);
  }

  const target = new URL(
    `${READ_HOST}/apis/v3/games/ffl/seasons/${seasonFrom(params)}/segments/0/leagues/${leagueFrom(params)}`,
  );
  for (const view of views) target.searchParams.append('view', view);

  // Player names come back under a filter ESPN reads from a header. It is the
  // caller's list of player ids and nothing else; it is parsed here so a
  // malformed one is refused rather than passed on.
  const headers: Record<string, string> = { accept: 'application/json' };
  const filter = params.get('filter');
  if (filter) {
    try {
      JSON.parse(filter);
    } catch {
      return json({ error: 'filter is not valid JSON' }, 400);
    }
    headers['x-fantasy-filter'] = filter;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(target.toString(), {
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      return json({ error: `ESPN answered ${response.status}`, status: response.status }, 502);
    }
    return json(await response.json(), 200);
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return json({ error: aborted ? 'ESPN did not answer in time' : 'could not reach ESPN' }, 504);
  } finally {
    clearTimeout(timer);
  }
}
