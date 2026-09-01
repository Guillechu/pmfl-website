import type { DraftSnapshot } from '@/types/draft';
import type { ProviderKind } from '@/types/sync';
import type { ParseMeta } from '@shared/protocol';
import { LEAGUE, TOTAL_PICKS } from '@/config/league';
import { coordsFromOverall } from '@/core/snake';
import { debugLog } from '@/debug/logger';
import { EspnDraftApi } from '../../extension/src/content/espnDraftApi';
import { applySnapshot, emptyMirror, type Mirror } from '../../extension/src/mirror';
import { BaseProvider } from './DraftProvider';

/**
 * ESPN without the extension.
 *
 * The extension exists because a draft room is a web page only a signed-in
 * browser can see. But this league is readable from ESPN's public feed with
 * no session at all, which means a television or a phone can watch the draft
 * with nothing installed - so long as something makes the call from a server,
 * since a browser will not let a page read another site directly. That is
 * what /api/jorkan does, and this is the provider that talks to it.
 *
 * Dedupe, backfill and event ordering are not reimplemented here: the same
 * mirror the extension uses is run locally, so a pick is announced exactly
 * once by exactly the same rules.
 *
 * What it cannot do: ESPN's public feed carries no pick clock. There is no
 * countdown on this path, and no ticking under the last five seconds, because
 * the number simply is not there and inventing one would put a wrong clock on
 * the television.
 */

/** How often the feed is read. ESPN's draft moves in minutes, not seconds. */
const POLL_MS = 2500;
/** Path of the server-side reader; see app/api/jorkan/route.ts. */
export const HOSTED_READER_PATH = '/api/jorkan';

const SNAPSHOT_TAIL = 40;

export class HostedEspnProvider extends BaseProvider {
  readonly kind: ProviderKind = 'espn';

  private readonly api: EspnDraftApi;
  private readonly mirror: Mirror = emptyMirror();
  private readonly seen = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private reading = false;

  constructor(readerPath: string = HOSTED_READER_PATH) {
    super();
    this.api = new EspnDraftApi(LEAGUE.espnLeagueId, LEAGUE.season, readerPath);
    this.mirror.leagueId = LEAGUE.espnLeagueId;
  }

  async connect(): Promise<void> {
    this.patchStatus({ connection: 'connecting', provider: 'espn' });
    await this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
  }

  override disconnect(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    super.disconnect();
  }

  async resync(): Promise<DraftSnapshot | null> {
    await this.poll();
    return this.snapshot;
  }

  /** One read of the feed, folded into the mirror exactly as the extension does. */
  private async poll(): Promise<void> {
    // A slow answer must never stack another read on top of it.
    if (this.reading) return;
    this.reading = true;
    try {
      const state = await this.api.read();
      if (!state) {
        this.patchStatus({
          connection: 'disconnected',
          errors: this.api.error ? [this.api.error] : ['ESPN did not answer'],
        });
        return;
      }

      const snapshot = this.toSnapshot(state);
      const result = applySnapshot(this.mirror, this.seen, snapshot, this.meta(state), {
        snapshotTail: SNAPSHOT_TAIL,
        bestConfidence: null,
        now: Date.now(),
      });
      if (!result.accepted) return;

      this.snapshot = snapshot;
      /*
       * A block of history rather than live play - opening the page when the
       * draft is already at pick 40. One SNAPSHOT fills the board silently
       * instead of forty announcements nobody was there to hear.
       */
      if (result.backfilled) {
        this.emit({ type: 'SNAPSHOT', at: Date.now(), snapshot: { ...snapshot, picks: this.mirror.picks } });
      }
      for (const event of result.events) this.emit(event);
      this.patchStatus({ connection: 'connected', lastEventAt: Date.now(), errors: [] });
    } catch (error) {
      debugLog('error', `hosted feed: ${String(error)}`);
      this.patchStatus({ connection: 'disconnected', errors: [String(error)] });
    } finally {
      this.reading = false;
    }
  }

  /** The feed, read as a picture of the draft. */
  private toSnapshot(state: Awaited<ReturnType<EspnDraftApi['read']>>): DraftSnapshot {
    const feed = state!;
    const taken = new Set(feed.picks.map((pick) => pick.overallPick));
    // The next slot nobody has used yet is whose turn it is. Counting picks
    // would be wrong the moment ESPN reports them out of order.
    let overallPick: number | null = null;
    for (let pick = 1; pick <= TOTAL_PICKS; pick += 1) {
      if (!taken.has(pick)) {
        overallPick = pick;
        break;
      }
    }

    const byOverall = new Map(feed.order.map((slot) => [slot.overallPick, slot.team]));
    const coords = overallPick === null ? null : coordsFromOverall(overallPick);

    return {
      phase: feed.drafted ? 'complete' : feed.inProgress ? 'in_progress' : 'waiting',
      leagueId: LEAGUE.espnLeagueId,
      round: coords?.round ?? null,
      pickInRound: coords?.pickInRound ?? null,
      overallPick,
      // Who is up comes from ESPN's own order, never from our config.
      onTheClock: overallPick === null ? null : byOverall.get(overallPick) ?? null,
      onDeck: overallPick === null ? null : byOverall.get(overallPick + 1) ?? null,
      // ESPN's public feed has no clock in it. Saying nothing is the honest
      // answer; the presentation shows no countdown rather than a made-up one.
      clockMs: null,
      clockRunning: null,
      picks: feed.picks,
      capturedAt: Date.now(),
    };
  }

  private meta(state: NonNullable<Awaited<ReturnType<EspnDraftApi['read']>>>): ParseMeta {
    return {
      parserVersion: 'hosted-feed-1',
      strategies: { picks: 'espn-feed', coords: 'espn-feed', onTheClock: 'espn-feed-order' },
      // The feed is ESPN's own answer rather than a reading of a page, so
      // there is nothing here to be unsure about: it either answered or it
      // did not.
      confidence: 1,
      warnings: state.warnings,
      durationMs: 0,
      feed: {
        picks: state.picks.length,
        unnamed: state.unnamed.length,
        placeholders: state.placeholders,
        error: this.api.error,
      },
    };
  }
}
