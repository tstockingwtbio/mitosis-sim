import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under any repo path
// and inside a Google Sites iframe embed.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  server: { port: 5173, strictPort: true },
});
