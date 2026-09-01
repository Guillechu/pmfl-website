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

interface ParseResultShape {
  snapshot: {
    phase: string;
    round: number | null;
    pickInRound: number | null;
    overallPick: number | null;
    clockMs: number | null;
    onTheClock: { fantasyTeamName: string } | null;
    onDeck: { fantasyTeamName: string } | null;
    picks: unknown[];
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
      `(globalThis as any).__jorkanParse = () => parseDraftRoom({ leagueId: '1314329848', probe: null, previous: null });\n`,
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
  check(meta.durationMs < 60, 'parse stays cheap', `${meta.durationMs}ms`);

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
  await browser2.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s): ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll ESPN fixture checks passed.');
}

void main();
