import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/edge-functions/helpers/setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    include: ['tests/edge-functions/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
