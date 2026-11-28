import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * Test database configuration using SQLite in-memory database
 * This provides fast, isolated testing without requiring a real PostgreSQL instance
 */
export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [join(__dirname, '..', 'src', '**', '*.entity.{ts,js}')],
  synchronize: true, // Auto-create schema in tests
  logging: false,
  dropSchema: true, // Drop schema before each test run
} as any;

/**
 * Get a unique test database configuration for isolated tests
 * Useful when running tests in parallel
 */
export function getTestDatabaseConfig(
  databaseName?: string,
): TypeOrmModuleOptions {
  return {
    ...testDatabaseConfig,
    database: databaseName || ':memory:',
  } as any;
}
