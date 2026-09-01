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
