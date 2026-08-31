import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

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
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: { port: 5173, strictPort: true },
  build: { outDir: 'dist', sourcemap: true, target: 'es2022' },
});
