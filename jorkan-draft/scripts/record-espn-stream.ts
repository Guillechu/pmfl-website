/**
 * Records the exact event stream the extension would broadcast for a full
 * draft.
 *
 * The simulator stands in for ESPN's DOM, but everything downstream is the
 * production pipeline: snapshots in the parser's output shape, folded through
 * the background's real mirror and deduplication, producing the EVENTS
 * batches the bridge sends to the page.
 *
 * Used by scripts/test-espn-path.ts to drive the presentation's real ESPN
 * code path without a live draft room.
 */
import { SimulatorProvider } from '../src/providers/SimulatorProvider';
import { applySnapshot, emptyMirror } from '../extension/src/mirror';
import { TOTAL_PICKS } from '../src/config/league';
import type { ParseMeta } from '../shared/protocol';
import type { ProviderEvent } from '../src/types/events';

const meta: ParseMeta = {
  parserVersion: 'recorder',
  strategies: { phase: 'text', picks: 'dom-rows' },
  confidence: 0.9,
  warnings: [],
  durationMs: 8,
};

export interface RecordedStream {
  picks: number;
  batches: ProviderEvent[][];
}

export function recordEspnStream(
  options: { dropRate?: number; duplicateRate?: number; seed?: number } = {},
): RecordedStream {
  const provider = new SimulatorProvider({
    dropRate: options.dropRate ?? 0.2,
    duplicateRate: options.duplicateRate ?? 0.4,
    snapshotIntervalMs: 1500,
    seed: options.seed ?? 31337,
  });

  const mirror = emptyMirror();
  const seen = new Set<string>();
  const batches: ProviderEvent[][] = [];

  // The extension only ever learns about the draft through snapshots, exactly
  // as the content script's parser feeds it.
  provider.subscribe((event) => {
    if (event.type !== 'SNAPSHOT') return;
    const result = applySnapshot(mirror, seen, event.snapshot, meta, {
      snapshotTail: 40,
      bestConfidence: 0.9,
      now: Date.now(),
    });
    if (result.accepted && result.events.length > 0) batches.push(result.events);
  });

  void provider.connect();
  provider.startDraft();
  for (let i = 0; i < 20_000 && mirror.picks.length < TOTAL_PICKS; i += 1) {
    provider.advance(1000);
  }
  provider.disconnect();

  return { picks: mirror.picks.length, batches };
}
