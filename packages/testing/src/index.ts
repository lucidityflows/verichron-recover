import { type ConsoleLogger, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';

/**
 * A mock logger that does nothing.
 * Used to silence noisy NestJS logs during unit tests.
 */
export const silentLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
} as unknown as ConsoleLogger;

/**
 * Helper to create a TestingModule with the silent logger pre-configured.
 * 
 * @example
 * const module = await createSilentTestingModule({
 *   providers: [MyService],
 * }).compile();
 */
export const createSilentTestingModule = (metadata: ModuleMetadata): TestingModuleBuilder => {
  return Test.createTestingModule(metadata).setLogger(silentLogger);
};
