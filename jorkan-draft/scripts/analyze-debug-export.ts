/**
 * Reads a debug export from a real ESPN draft room and says what the parser
 * managed to read, what it missed, and what the page actually looked like.
 *
 *   npm run analyze:debug -- path/to/jorkan-draft-debug-....json
 *
 * Accepts either export: the one from the presentation's commissioner panel
 * or the one from the extension popup.
 */
import { readFileSync } from 'node:fs';
import type { DebugEntry } from '../shared/protocol';

interface ParseData {
  page?: Record<string, unknown>;
  strategies?: Record<string, string>;
  confidence?: number;
  durationMs?: number;
  warnings?: string[];
  probeSource?: string;
  probePaths?: string[];
  api?: {
    picks?: number;
    unnamed?: number[];
    drafted?: boolean | null;
    inProgress?: boolean | null;
    error?: string | null;
  };
  snapshot?: {
    phase?: string;
    round?: number | null;
    pickInRound?: number | null;
    overallPick?: number | null;
    clockMs?: number | null;
    onTheClock?: string | null;
    pickCount?: number;
    lastPick?: unknown;
  };
}

interface DomSampleData {
  tag?: string;
  attributes?: Record<string, string>;
  text?: string;
  html?: string;
}

/** The fields the presentation needs; anything missing here is the work. */
const FIELDS = ['phase', 'clock', 'coords', 'onTheClock', 'onDeck', 'picks'] as const;

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: npm run analyze:debug -- <export.json>');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    exportedAt?: string;
    entries?: DebugEntry[];
    state?: Record<string, unknown>;
    status?: Record<string, unknown>;
    presentation?: Record<string, unknown>;
  };
  const entries = raw.entries ?? [];
  if (entries.length === 0) {
    console.error('No entries in this export. Was debug capture switched on before the draft ran?');
    process.exit(1);
  }

  const parses = entries.filter((e) => e.kind === 'parse');
  const samples = entries.filter((e) => e.kind === 'dom-sample');
  const errors = entries.filter((e) => e.kind === 'error');

  header('EXPORT');
  console.log(`  exported at    ${raw.exportedAt ?? 'unknown'}`);
  console.log(`  entries        ${entries.length} (${parses.length} parses, ${samples.length} DOM samples, ${errors.length} errors)`);
  if (entries.length > 1) {
    const first = entries[0]?.at ?? 0;
    const last = entries[entries.length - 1]?.at ?? 0;
    console.log(`  span           ${((last - first) / 1000).toFixed(0)}s`);
  }
  const state = (raw.state ?? {}) as Record<string, unknown>;
  if (state['extensionVersion']) console.log(`  extension      ${String(state['extensionVersion'])}`);
  const meta = state['meta'] as { parserVersion?: string } | undefined;
  if (meta?.parserVersion) console.log(`  parser         ${meta.parserVersion}`);
  if (state['leagueId']) console.log(`  league         ${String(state['leagueId'])}`);

  /* ------------------------- what the parser read ------------------------ */

  /*
   * Coverage is measured against the parses where the field could exist at
   * all. A pre-draft room has no clock, no team on the clock and no picks, so
   * counting those passes against the parser would report a healthy read as a
   * failure - and send us hunting for a bug that is not there.
   */
  const livePasses = parses.filter(
    (entry) => (entry.data as ParseData | undefined)?.snapshot?.phase === 'in_progress',
  );
  header(
    `FIELD COVERAGE  (${parses.length} parses, ${livePasses.length} of them with the draft live)`,
  );
  const strategyHits = new Map<string, Map<string, number>>();
  for (const entry of parses) {
    const data = entry.data as ParseData | undefined;
    for (const [field, strategy] of Object.entries(data?.strategies ?? {})) {
      if (!strategyHits.has(field)) strategyHits.set(field, new Map());
      const byStrategy = strategyHits.get(field)!;
      byStrategy.set(strategy, (byStrategy.get(strategy) ?? 0) + 1);
    }
  }
  /** phase is readable at any time; the rest only once the draft is running. */
  const LIVE_ONLY = new Set(['clock', 'coords', 'onTheClock', 'onDeck', 'picks']);
  for (const field of FIELDS) {
    const byStrategy = strategyHits.get(field);
    const total = [...(byStrategy?.values() ?? [])].reduce((a, b) => a + b, 0);
    const denominator = LIVE_ONLY.has(field) ? livePasses.length : parses.length;
    const scope = LIVE_ONLY.has(field) ? 'live' : 'all ';
    const pct = denominator === 0 ? null : Math.round((Math.min(total, denominator) / denominator) * 100);
    const mark = pct === null ? 'no data ' : pct === 0 ? 'MISSING ' : pct < 80 ? 'partial ' : 'ok      ';
    const detail = byStrategy
      ? [...byStrategy.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} x${n}`).join(', ')
      : 'never read';
    const shown = pct === null ? ' n/a' : `${String(pct).padStart(3)}%`;
    console.log(`  ${mark}${field.padEnd(11)} ${shown} of ${scope}  ${detail}`);
  }

  /* ------------------------ did ESPN expose state? ----------------------- */

  header('ESPN PAGE STATE  (the most reliable source, when the page exposes it)');
  const probeSources = new Map<string, number>();
  const probePaths = new Set<string>();
  for (const entry of parses) {
    const data = entry.data as ParseData | undefined;
    probeSources.set(data?.probeSource ?? 'none', (probeSources.get(data?.probeSource ?? 'none') ?? 0) + 1);
    for (const p of data?.probePaths ?? []) probePaths.add(p);
  }
  for (const [source, count] of [...probeSources.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source === 'none' ? 'not found' : source}  (x${count})`);
  }
  if (probePaths.size > 0) {
    console.log('  draft-shaped paths seen on the page:');
    for (const p of [...probePaths].slice(0, 25)) console.log(`    ${p}`);
  }

  /* ------------------------- ESPN's draft feed --------------------------- */

  header("ESPN DRAFT FEED  (where the completed board comes from)");
  const feedErrors = new Map<string, number>();
  const unnamed = new Set<number>();
  let bestFeedPicks = 0;
  let feedSeen = false;
  for (const entry of parses) {
    const api = (entry.data as ParseData | undefined)?.api;
    if (!api) continue;
    feedSeen = true;
    bestFeedPicks = Math.max(bestFeedPicks, api.picks ?? 0);
    if (api.error) feedErrors.set(api.error, (feedErrors.get(api.error) ?? 0) + 1);
    for (const id of api.unnamed ?? []) unnamed.add(id);
  }
  if (!feedSeen) {
    console.log('  this capture predates the draft feed - reload the extension and capture again');
  } else {
    console.log(`  picks read from ESPN's feed: ${bestFeedPicks}`);
    if (feedErrors.size === 0 && bestFeedPicks > 0) console.log('  the feed answered; the board is ESPN\'s own record');
    for (const [error, count] of [...feedErrors.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ERROR (x${count}) ${error}`);
    }
    if (bestFeedPicks === 0 && feedErrors.size === 0) {
      console.log('  the feed answered but reported no picks - check the league id and season in the URL');
    }
    if (unnamed.size > 0) {
      console.log(`  player ids ESPN would not name (held back rather than announced): ${[...unnamed].join(', ')}`);
    }
  }

  /* ---------------------------- state timeline --------------------------- */

  header('TIMELINE  (only the moments something changed)');
  let previous = '';
  let shown = 0;
  for (const entry of parses) {
    const snapshot = (entry.data as ParseData | undefined)?.snapshot;
    if (!snapshot) continue;
    const line = [
      `phase=${snapshot.phase ?? '?'}`,
      `r=${snapshot.round ?? '-'}`,
      `p=${snapshot.pickInRound ?? '-'}`,
      `overall=${snapshot.overallPick ?? '-'}`,
      `clock=${snapshot.clockMs === null || snapshot.clockMs === undefined ? '-' : Math.round(snapshot.clockMs / 1000) + 's'}`,
      `otc=${snapshot.onTheClock ?? '-'}`,
      `picks=${snapshot.pickCount ?? 0}`,
    ].join('  ');
    if (line === previous) continue;
    previous = line;
    shown += 1;
    if (shown > 60) continue;
    console.log(`  ${new Date(entry.at).toISOString().slice(11, 19)}  ${line}`);
  }
  if (shown > 60) console.log(`  ... and ${shown - 60} more changes`);
  if (shown === 0) console.log('  the parser never read a state - see DOM samples below');

  /* ------------------------------- problems ------------------------------ */

  header('WARNINGS AND ERRORS');
  const warnings = new Map<string, number>();
  for (const entry of parses) {
    for (const w of (entry.data as ParseData | undefined)?.warnings ?? []) {
      warnings.set(w, (warnings.get(w) ?? 0) + 1);
    }
  }
  if (warnings.size === 0 && errors.length === 0) console.log('  none');
  for (const [warning, count] of warnings) console.log(`  warn  (x${count}) ${warning}`);
  for (const error of errors.slice(0, 10)) console.log(`  error ${error.message}`);

  /* ----------------------------- performance ----------------------------- */

  const durations = parses
    .map((e) => (e.data as ParseData | undefined)?.durationMs ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  if (durations.length > 0) {
    header('PARSE COST ON THE REAL PAGE');
    const median = durations[Math.floor(durations.length / 2)] ?? 0;
    const worst = durations[durations.length - 1] ?? 0;
    console.log(`  median ${median}ms, worst ${worst}ms over ${durations.length} parses`);
    if (worst > 60) console.log('  NOTE: worst case is high enough to be felt in the ESPN tab.');
  }

  /* ---------------------------- the actual DOM --------------------------- */

  header('DOM SAMPLES  (what the draft room actually renders)');
  const byRegion = new Map<string, DebugEntry[]>();
  for (const sample of samples) {
    const label = sample.message.replace(/^region:/, '');
    if (!byRegion.has(label)) byRegion.set(label, []);
    byRegion.get(label)!.push(sample);
  }
  if (byRegion.size === 0) console.log('  none captured');
  for (const [label, group] of byRegion) {
    const latest = group[group.length - 1];
    const data = latest?.data as DomSampleData | undefined;
    console.log(`\n  --- ${label} (x${group.length}) ---`);
    console.log(`  tag        <${data?.tag ?? '?'}>`);
    const attrs = Object.entries(data?.attributes ?? {});
    if (attrs.length > 0) {
      console.log(`  attributes ${attrs.map(([k, v]) => `${k}="${v}"`).join(' ')}`);
    }
    console.log(`  text       ${(data?.text ?? '').slice(0, 200)}`);
    if (data?.html) {
      console.log('  html:');
      for (const line of wrap(data.html, 100).slice(0, 12)) console.log(`    ${line}`);
    }
  }

  /* ------------------------------ conclusion ----------------------------- */

  header('WHAT NEEDS FIXING');
  const broken = FIELDS.filter((field) => {
    if (LIVE_ONLY.has(field) && livePasses.length === 0) return false;
    const total = [...(strategyHits.get(field)?.values() ?? [])].reduce((a, b) => a + b, 0);
    return total === 0;
  });
  const liveParses = livePasses;
  if (liveParses.length === 0) {
    console.log('  The draft was never seen live in this capture (no in_progress parse).');
    console.log('  Field coverage above therefore only reflects the pre-draft room.');
  }
  if (broken.length === 0) {
    console.log('  Every field was read at least once.');
  } else {
    for (const field of broken) console.log(`  ${field} was never read - needs a selector from the DOM samples above`);
  }
}

function header(title: string): void {
  console.log(`\n${'='.repeat(78)}\n${title}\n${'='.repeat(78)}`);
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += width) out.push(text.slice(i, i + width));
  return out;
}

main();
