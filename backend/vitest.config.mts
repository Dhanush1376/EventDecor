import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Keep unit tests hermetic: no DB/Redis connections should be opened.
    // Integration tests that need infrastructure belong in tests/integration
    // behind an explicit script.
    testTimeout: 10000,
  },
});
