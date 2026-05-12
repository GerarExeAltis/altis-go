import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    include: [
      'tests/edge-functions/**/*.test.ts',
      'cli/tests/**/*.test.ts',
      'tests/components/**/*.test.{ts,tsx}',
    ],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environmentMatchGlobs: [
      ['tests/components/**', 'happy-dom'],
      ['**', 'node'],
    ],
    setupFiles: [
      './tests/edge-functions/helpers/setup.ts',
      './tests/components/setup.tsx',
    ],
  },
});
