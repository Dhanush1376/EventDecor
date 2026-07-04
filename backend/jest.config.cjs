/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  setupFiles: ['<rootDir>/src/__tests__/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupAfterEnv.ts'],
  clearMocks: true,
  forceExit: true,
  testTimeout: 15000,
};

