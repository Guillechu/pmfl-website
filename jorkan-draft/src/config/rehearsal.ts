import { LEAGUE } from './league';

/**
 * Rehearsing on the television, with a mock draft.
 *
 * An ESPN mock draft is not an event inside your league: it is its own
 * throwaway league with its own id, created when somebody joins a lobby and
 * gone afterwards. Five of them from this league's own rehearsals had the ids
 * 1487959344, 1386961282, 2036757808, 1315548369 and 1536170687 - not one of
 * them the Jorkan League. Nothing about a mock ever appears in the real
 * league's feed, so no amount of watching it will find one.
 *
 * That leaves pointing the page at a mock deliberately: open it with
 * ?liga=<id> and the id from the mock draft room's own URL. The real league
 * stays the default, and a page reading anything else says so on screen, so a
 * rehearsal left open can never be mistaken for draft night.
 */

const PARAMS = ['liga', 'league'];

/** A league id shaped the way ESPN's are, and nothing else. */
function sane(value: string | null): string | null {
  return value && /^\d{4,16}$/.test(value) ? value : null;
}

/** The league this page is reading, which is the real one unless asked. */
export function activeLeagueId(search = typeof window === 'undefined' ? '' : window.location.search): string {
  const params = new URLSearchParams(search);
  for (const name of PARAMS) {
    const id = sane(params.get(name));
    if (id) return id;
  }
  return LEAGUE.espnLeagueId;
}

/** True when the page is pointed at something other than the league's draft. */
export function isRehearsal(search?: string): boolean {
  return activeLeagueId(search) !== LEAGUE.espnLeagueId;
}
