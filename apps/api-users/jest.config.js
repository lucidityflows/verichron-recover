/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  verbose: true,
  silent: true,
  moduleNameMapper: {
    '^@verichron/api-users/(.*)$': '<rootDir>/$1',
    '^@verichron/auth': '<rootDir>/../../../packages/auth/src',
    '^@verichron/error-handling': '<rootDir>/../../../packages/error-handling/src',
    '^@verichron/event-publisher': '<rootDir>/../../../packages/event-publisher/src',
    '^@verichron/event-subscriber': '<rootDir>/../../../packages/event-subscriber/src',
    '^@verichron/event-orchestrator': '<rootDir>/../../../packages/event-orchestrator/src',
    '^@verichron/events': '<rootDir>/../../../packages/events/src',
    '^@verichron/enums': '<rootDir>/../../../packages/enums/src',
    '^@verichron/contracts': '<rootDir>/../../../packages/contracts/src',
    '^@verichron/testing': '<rootDir>/../../../packages/testing/src',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.pnpm|uuid)',
  ],
};
