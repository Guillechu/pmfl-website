import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { PRESENTATION_PORT } from './shared/protocol';

// The presentation is a single-page app; Vite's SPA fallback means
// http://localhost:5173/presentation serves the same index.html.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  // Only the presentation is a Vite app. Without this, Vite's dependency
  // scanner also crawls extension/src/popup/popup.html and fixtures/*.html and
  // reports that it cannot resolve popup.js - which is true, and harmless,
  // because esbuild builds the popup separately into extension/dist. The
  // server worked anyway, but it greeted every start with a red error.
  optimizeDeps: { entries: ['index.html'] },
  server: {
    // strictPort matters for more than convenience: the extension bridge only
    // attaches on this exact port, so the server must never silently move.
    port: Number(PRESENTATION_PORT),
    strictPort: true,
    host: 'localhost',
  },
  preview: { port: Number(PRESENTATION_PORT), strictPort: true },
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
});
