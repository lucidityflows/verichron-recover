module.exports = {
  displayName: 'E2E Integration Tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/journeys/**/*.e2e.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@e2e/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/setup/jest-setup.ts'],
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  verbose: true,
  bail: false,
  collectCoverage: false,
};
