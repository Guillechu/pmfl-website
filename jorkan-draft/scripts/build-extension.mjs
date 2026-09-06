/**
 * Builds the Chrome extension into extension/dist.
 *
 *   npm run build:extension     one-off build
 *   npm run watch:extension     rebuild on change
 *
 * Then load extension/dist as an unpacked extension in chrome://extensions.
 */
import { build, context } from 'esbuild';
import { cp, mkdir, readFile, stat, writeFile, rm } from 'node:fs/promises';
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
  await cp(resolve(root, 'extension/icon128.png'), resolve(outdir, 'icon128.png'));
  return manifest;
}

/**
 * Every file the manifest names must actually be in dist.
 *
 * Chrome refuses to load an extension whose manifest points at something
 * missing, and it only finds out at "Load unpacked" time - which is the worst
 * possible moment. This build previously copied the icon with a .catch() that
 * swallowed the error, and shipped a dist that Chrome rejected outright.
 */
async function verifyManifest(manifest) {
  const referenced = new Set();
  if (manifest.background?.service_worker) referenced.add(manifest.background.service_worker);
  if (manifest.action?.default_popup) referenced.add(manifest.action.default_popup);
  for (const entry of manifest.content_scripts ?? []) {
    for (const file of entry.js ?? []) referenced.add(file);
    for (const file of entry.css ?? []) referenced.add(file);
  }
  for (const file of Object.values(manifest.icons ?? {})) referenced.add(file);
  for (const file of Object.values(manifest.action?.default_icon ?? {})) referenced.add(file);
  for (const entry of manifest.web_accessible_resources ?? []) {
    for (const file of entry.resources ?? []) referenced.add(file);
  }

  const missing = [];
  for (const file of referenced) {
    try {
      await stat(resolve(outdir, file));
    } catch {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `manifest references ${missing.length} file(s) that are not in extension/dist: ${missing.join(', ')}\n` +
        'Chrome would refuse to load this extension.',
    );
  }
  console.log(`[extension] manifest verified: ${referenced.size} referenced files all present`);
}

async function main() {
  if (!watch) await rm(outdir, { recursive: true, force: true });
  const manifest = await copyStatic();

  if (watch) {
    const ctx = await context(shared);
    await ctx.watch();
    await verifyManifest(manifest);
    console.log(`[extension] watching - output in extension/dist (v${manifest.version})`);
    return;
  }

  await build(shared);
  await verifyManifest(manifest);
  console.log(`[extension] built v${manifest.version} -> extension/dist`);
  console.log('[extension] load it: chrome://extensions -> Developer mode -> Load unpacked -> extension/dist');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
