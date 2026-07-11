import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    setupFiles: ['tests/integration/env.setup.ts'],
    // Integration specs boot an in-memory Mongo replica set and share a single
    // Mongoose connection, so specs must not run against it in parallel.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
