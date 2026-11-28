import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables before each test file
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Increase timeout for integration tests
jest.setTimeout(60000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests (comment out to debug)
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};
