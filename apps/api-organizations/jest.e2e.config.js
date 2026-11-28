/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.e2e-spec\.ts$',
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
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage-e2e',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@verichron/api-organizations/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|bcrypt|@nestjs|typeorm)/)',
  ],
  testTimeout: 30000, // E2E tests may take longer
};
