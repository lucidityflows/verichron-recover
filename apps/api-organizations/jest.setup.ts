import 'reflect-metadata';

/**
 * Jest setup file to conditionally silence console output during tests.
 */

// Unless ENABLE_TEST_LOGGING is explicitly set to 'true', mock all console methods
// to prevent noisy logs during test runs, especially for expected errors.
if (process.env.ENABLE_TEST_LOGGING !== 'true') {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
}
