import { defineConfig } from 'vitest/config';

export default defineConfig({
  // relative asset paths so the build works from any folder (e.g. GitHub Pages later)
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
});
