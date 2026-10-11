/**
 * Parser tests against real ESPN 2026 draft-room markup.
 *
 *   npm run test:espn-fixture
 *
 * fixtures/espn-2026-draft-room.html is captured outerHTML from a live Jorkan
 * League practice draft, not markup anyone wrote to make a test pass. The
 * parser is bundled exactly as the extension ships it and run inside a real
 * Chromium, because the readings under test depend on layout and on
 * TreeWalker semantics that a lightweight DOM does not reproduce.
 *
 * Needs a Chromium: playwright-core plus either PLAYWRIGHT_BROWSERS_PATH or an
 * installed Chrome. Without one the script says so and exits 0 rather than
 * failing a build for a missing browser.
 */
import { build } from 'esbuild';
import { readFile, readdir, writeFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = resolve(root, 'fixtures/espn-2026-draft-room.html');
const furniture = resolve(root, 'fixtures/espn-2026-furniture.html');
const pickHistory = resolve(root, 'fixtures/espn-2026-pick-history.html');

interface ParseResultShape {
  snapshot: {
    phase: string;
    round: number | null;
    pickInRound: number | null;
    overallPick: number | null;
    clockMs: number | null;
    onTheClock: { fantasyTeamName: string } | null;
    onDeck: { fantasyTeamName: string } | null;
    picks: {
      overallPick: number;
      round: number;
      pickInRound: number;
      fantasyTeamName: string;
      player: { name: string; position: string; nflTeamAbbr?: string; espnId?: string };
    }[];
  };
  meta: { strategies: Record<string, string>; confidence: number; warnings: string[]; durationMs: number };
}

const failures: string[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    failures.push(name);
  }
}

async function bundleParser(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'jorkan-parser-'));
  const entry = join(dir, 'entry.ts');
  await writeFile(
    entry,
    `import { parseDraftRoom } from '${resolve(root, 'extension/src/content/espnParser.ts').replace(/\\/g, '/')}';\n` +
      `(globalThis as any).__jorkanParse = () => parseDraftRoom({ leagueId: '1314329848', probe: null, previous: null });\n` +
      `(globalThis as any).__jorkanParseWithFeed = (n: number) => parseDraftRoom({\n` +
      `  leagueId: '1314329848', probe: null, previous: null,\n` +
      `  apiPicks: Array.from({ length: n }, (_unused, i) => ({\n` +
      `    overallPick: i + 1, round: Math.floor(i / 12) + 1, pickInRound: (i % 12) + 1,\n` +
      `    player: { name: 'Fed Player ' + (i + 1), position: 'WR' as const, espnId: String(1000 + i) },\n` +
      `    fantasyTeamId: 'el-dandy', fantasyTeamName: 'El Dandy', managerName: 'Guillermo Chu',\n` +
      `    timestamp: 0, eventId: 'feed|' + (i + 1),\n` +
      `  })),\n` +
      `});\n` +
      // ESPN randomises the draft order, so the table in our config can be
      // wrong all night. This parses a page with nothing on it that names a
      // team, handing in ESPN's order instead.
      `(globalThis as any).__jorkanParseWithOrder = (overall: number, teamName: string) => parseDraftRoom({\n` +
      `  leagueId: '1314329848', probe: null, previous: null,\n` +
      `  apiOrder: [\n` +
      `    { overallPick: overall, team: { fantasyTeamId: 'x', fantasyTeamName: teamName } },\n` +
      `    { overallPick: overall + 1, team: { fantasyTeamId: 'y', fantasyTeamName: 'On Deck FC' } },\n` +
      `  ],\n` +
      `});\n`,
  );
  const out = join(dir, 'parser.js');
  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome114',
    logLevel: 'silent',
    alias: { '@': resolve(root, 'src'), '@shared': resolve(root, 'shared') },
    define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true' },
  });
  return readFile(out, 'utf8');
}

/** Chromium builds sitting in PLAYWRIGHT_BROWSERS_PATH, newest first. */
async function localChromiums(): Promise<string[]> {
  const base = process.env['PLAYWRIGHT_BROWSERS_PATH'];
  if (!base) return [];
  let names: string[];
  try {
    names = await readdir(base);
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const name of names.sort().reverse()) {
    for (const leaf of ['chrome-linux/chrome', 'chrome-win/chrome.exe', 'chrome-linux/headless_shell']) {
      const candidate = join(base, name, leaf);
      if (existsSync(candidate)) found.push(candidate);
    }
  }
  return found;
}

async function launch() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    return null;
  }
  const attempts: Record<string, unknown>[] = [
    ...(await localChromiums()).map((executablePath) => ({ executablePath })),
    { channel: 'chrome' },
    { channel: 'msedge' },
    {},
  ];
  for (const options of attempts) {
    try {
      return await chromium.launch({ ...options, args: ['--no-sandbox'] } as never);
    } catch {
      continue;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const browser = await launch();
  if (!browser) {
    console.log('espn fixture: no Chromium available, skipping (install playwright-core or Chrome to run it)');
    return;
  }
  const script = await bundleParser();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(fixture).href);
  await page.addScriptTag({ content: script });
  const result = (await page.evaluate('__jorkanParse()')) as ParseResultShape;

  /*
   * The same page, handed a feed that claims the whole draft is done.
   *
   * A live practice room on pick 13 had ESPN's feed return all 180 picks,
   * named and complete. The room is on pick 104 here, so 103 picks have
   * happened and 77 have not, whatever the feed says.
   */
  const flooded = (await page.evaluate(`__jorkanParseWithFeed(180)`)) as ParseResultShape;
  const browser2 = browser;

  const { snapshot, meta } = result;
  console.log('\nESPN 2026 draft-room fixture (captured at overall pick 104)');
  console.log('  strategies:', JSON.stringify(meta.strategies));
  console.log('  snapshot:', JSON.stringify({
    phase: snapshot.phase,
    round: snapshot.round,
    pickInRound: snapshot.pickInRound,
    overallPick: snapshot.overallPick,
    clockMs: snapshot.clockMs,
    onTheClock: snapshot.onTheClock?.fantasyTeamName ?? null,
    onDeck: snapshot.onDeck?.fantasyTeamName ?? null,
  }));
  if (meta.warnings.length) console.log('  warnings:', meta.warnings);
  console.log('');

  check(snapshot.phase === 'in_progress', 'phase is in_progress', snapshot.phase);
  check(snapshot.overallPick === 104, 'overall pick 104 read from ESPN', String(snapshot.overallPick));
  check(snapshot.round === 9, 'round 9', String(snapshot.round));
  check(snapshot.pickInRound === 8, 'pick 8 of the round', String(snapshot.pickInRound));
  check(meta.strategies['coords'] === 'dom-current-pick', 'coords come from ESPN, not the configured order', meta.strategies['coords'] ?? 'none');
  check(
    snapshot.onTheClock?.fantasyTeamName === 'LOS BUQES DE BUGABA',
    'team on the clock read from ESPN',
    String(snapshot.onTheClock?.fantasyTeamName),
  );
  check(meta.strategies['onTheClock'] === 'dom-current-pick', 'on the clock is a reading, not a fallback', meta.strategies['onTheClock'] ?? 'none');
  check(snapshot.clockMs === 30_000, 'pick clock reads 00:30', String(snapshot.clockMs));
  check(meta.strategies['clock'] === 'text', 'clock is a reading', meta.strategies['clock'] ?? 'none');
  check(snapshot.onDeck?.fantasyTeamName === 'Los Badros', 'on deck read from the pick strip', String(snapshot.onDeck?.fantasyTeamName));
  check(meta.strategies['onDeck'] === 'dom-pick-strip', 'on deck is a reading, not a fallback', meta.strategies['onDeck'] ?? 'none');
  check(snapshot.picks.length === 0, 'no picks invented from the players grid', String(snapshot.picks.length));
  check(
    flooded.snapshot.picks.length === 103,
    'a feed claiming a finished draft is trimmed to what has happened',
    `${flooded.snapshot.picks.length} kept`,
  );
  check(
    flooded.meta.warnings.some((w) => w.includes('on the clock')),
    'and says so',
    JSON.stringify(flooded.meta.warnings),
  );
  check(flooded.snapshot.phase === 'in_progress', 'the draft is not declared over', flooded.snapshot.phase);
  check(meta.durationMs < 60, 'parse stays cheap', `${meta.durationMs}ms`);

  // ESPN's Pick History panel, which is where the board comes from in a room
  // whose draft feed carries no players.
  const third = await browser2.newPage();
  await third.goto(pathToFileURL(pickHistory).href);
  await third.addScriptTag({ content: script });
  const history = (await third.evaluate('__jorkanParse()')) as ParseResultShape;
  console.log('\nESPN Pick History panel (captured text, reconstructed markup)');
  console.log('  picks:', JSON.stringify(history.snapshot.picks.map((p) => `${p.round}.${p.pickInRound} ${p.player.name} ${p.player.position} ${p.player.nflTeamAbbr} -> ${p.fantasyTeamName}`), null, 1));
  check(history.snapshot.picks.length === 5, 'every pick history row is read', `${history.snapshot.picks.length}`);
  check(history.meta.strategies['picks'] === 'dom-pick-history', 'and is recorded as such', history.meta.strategies['picks'] ?? 'none');
  const first = history.snapshot.picks[0];
  check(first?.player.name === 'Jahmyr Gibbs', 'the player is named', String(first?.player.name));
  check(first?.player.position === 'RB', 'the position is read', String(first?.player.position));
  check(first?.player.nflTeamAbbr === 'DET', 'the NFL club is read', String(first?.player.nflTeamAbbr));
  check(first?.fantasyTeamName === 'El Dandy', 'the drafting team is read', String(first?.fantasyTeamName));
  check(first?.player.espnId === '4429795', 'the ESPN player id comes off the headshot', String(first?.player.espnId));
  check(
    history.snapshot.picks.every((p) => p.player.name !== 'Jahmyr Gibbs' || p.overallPick === 1),
    'the hidden Players tab is not read as a board',
  );
  const dst = history.snapshot.picks.find((p) => p.overallPick === 13);
  check(dst?.player.position === 'DST', 'a defence is read as a defence', String(dst?.player.position));
  await third.close();

  // Page furniture must never become a pick.
  const second = await browser2.newPage();
  await second.goto(pathToFileURL(furniture).href);
  await second.addScriptTag({ content: script });
  const furnitureResult = (await second.evaluate('__jorkanParse()')) as ParseResultShape;
  console.log('\nPage furniture (synthesized adversarial case)');
  console.log('  picks read:', JSON.stringify(furnitureResult.snapshot.picks));
  check(
    furnitureResult.snapshot.picks.length === 0,
    'no pick is invented out of page furniture',
    `${furnitureResult.snapshot.picks.length} invented`,
  );
  /*
   * A page that says which pick it is but not whose.
   *
   * The configured order gives pick 5 to Eduardo's Energetic Team. ESPN
   * randomises the real order, so the only trustworthy answer is the one
   * ESPN's own feed gives - and getting this wrong is what put the wrong
   * team on the clock at the start of a real draft.
   */
  const noTeamPage = await browser2.newPage();
  await noTeamPage.goto(pathToFileURL(resolve(root, 'fixtures/espn-2026-no-team-on-clock.html')).href);
  await noTeamPage.addScriptTag({ content: script });

  const withOrder = (await noTeamPage.evaluate(
    `__jorkanParseWithOrder(5, 'LOS BUQES DE BUGABA')`,
  )) as ParseResultShape;
  console.log('\nA page that names the pick but not the team');
  console.log('  on the clock:', withOrder.snapshot.onTheClock?.fantasyTeamName ?? null,
    `(${withOrder.meta.strategies['onTheClock'] ?? 'none'})`);
  check(
    withOrder.snapshot.overallPick === 5,
    'the pick number is still read from the page',
    String(withOrder.snapshot.overallPick),
  );
  check(
    withOrder.meta.strategies['onTheClock'] === 'espn-draft-order',
    "ESPN's own order answers who is on the clock",
    withOrder.meta.strategies['onTheClock'] ?? 'none',
  );
  check(
    withOrder.snapshot.onTheClock?.fantasyTeamName === 'LOS BUQES DE BUGABA',
    'and it is ESPN\'s team, not the one our config has in that slot',
    withOrder.snapshot.onTheClock?.fantasyTeamName ?? 'none',
  );
  check(
    withOrder.snapshot.onDeck?.fantasyTeamName === 'On Deck FC',
    'on deck comes from the same order',
    withOrder.snapshot.onDeck?.fantasyTeamName ?? 'none',
  );

  const withoutOrder = (await noTeamPage.evaluate('__jorkanParse()')) as ParseResultShape;
  check(
    withoutOrder.meta.strategies['onTheClock'] === 'configured-draft-order',
    'with no feed at all it falls back to our config',
    withoutOrder.meta.strategies['onTheClock'] ?? 'none',
  );
  check(
    withoutOrder.meta.warnings.some((warning) => warning.includes('our config')),
    'and says out loud that it is guessing',
    JSON.stringify(withoutOrder.meta.warnings),
  );

  await browser2.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s): ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll ESPN fixture checks passed.');
}

void main();
