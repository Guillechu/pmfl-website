/**
 * Builds the Chrome extension into extension/dist.
 *
 *   npm run build:extension     one-off build
 *   npm run watch:extension     rebuild on change
 *
 * Then load extension/dist as an unpacked extension in chrome://extensions.
 */
import { build, context } from 'esbuild';
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'extension/dist');
const watch = process.argv.includes('--watch');

/** Each entry point becomes one self-contained bundle the manifest names. */
const ENTRIES = {
  background: 'extension/src/background.ts',
  'espn-observer': 'extension/src/content/espnDraftObserver.ts',
  'espn-probe': 'extension/src/content/mainWorldProbe.ts',
  'presentation-bridge': 'extension/src/bridge/presentationBridge.ts',
  popup: 'extension/src/popup/popup.ts',
};

const shared = {
  bundle: true,
  format: 'esm',
  target: 'chrome114',
  platform: 'browser',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  legalComments: 'none',
  logLevel: 'info',
  // The extension shares the app's league config, normalisation and dedupe
  // rules so the two halves can never disagree about what a pick is.
  alias: {
    '@': resolve(root, 'src'),
    '@shared': resolve(root, 'shared'),
  },
  define: {
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
  },
  entryPoints: Object.entries(ENTRIES).map(([out, file]) => ({ in: resolve(root, file), out })),
  outdir,
};

async function copyStatic() {
  await mkdir(outdir, { recursive: true });
  const manifest = JSON.parse(await readFile(resolve(root, 'extension/manifest.json'), 'utf8'));
  await writeFile(resolve(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await cp(resolve(root, 'extension/src/popup/popup.html'), resolve(outdir, 'popup.html'));
  await cp(resolve(root, 'extension/icon128.png'), resolve(outdir, 'icon128.png')).catch(() => {});
  return manifest.version;
}

async function main() {
  if (!watch) await rm(outdir, { recursive: true, force: true });
  const version = await copyStatic();

  if (watch) {
    const ctx = await context(shared);
    await ctx.watch();
    console.log(`[extension] watching - output in extension/dist (v${version})`);
    return;
  }

  await build(shared);
  console.log(`[extension] built v${version} -> extension/dist`);
  console.log('[extension] load it: chrome://extensions -> Developer mode -> Load unpacked -> extension/dist');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
