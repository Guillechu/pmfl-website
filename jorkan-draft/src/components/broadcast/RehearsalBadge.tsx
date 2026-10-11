import { activeLeagueId, isRehearsal } from '@/config/rehearsal';
import { useSyncStatus } from '@/state/hooks';

/**
 * A page pointed at a mock draft says so, permanently.
 *
 * The whole point of this broadcast is that what it shows is the draft. A
 * rehearsal left open on the television - a URL with ?liga= still on it from
 * the night before - would look exactly like the real thing, which is the one
 * confusion the show cannot afford. So it is marked, in the corner, for as
 * long as the page is reading anything other than the league's own draft.
 *
 * It also carries what the feed said, which the broadcast itself deliberately
 * does not. A mock room ESPN will not serve to a signed-out reader answers 404
 * and the waiting screen looks identical to a rehearsal that simply has not
 * started - so during a rehearsal, and only then, the reason is on screen.
 */
export function RehearsalBadge() {
  const status = useSyncStatus();
  if (!isRehearsal()) return null;

  const problem = status.connection === 'connected' ? null : (status.errors[0] ?? null);

  return (
    <div className="pointer-events-none absolute right-[1rem] top-[1rem] z-50 max-w-[26rem] rounded-[0.3rem] border border-alert-600 bg-alert-500 px-[0.9rem] py-[0.35rem] shadow-panel">
      <p className="font-display text-tv-xs font-bold uppercase tracking-[0.22em] text-paper">
        Ensayo &middot; no es el draft real
      </p>
      <p className="text-center font-display text-[0.6rem] uppercase tracking-[0.16em] text-paper/70">
        liga {activeLeagueId()}
      </p>
      {problem ? (
        <p className="mt-[0.3rem] border-t border-paper/25 pt-[0.3rem] text-[0.6rem] leading-snug text-paper/90">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
