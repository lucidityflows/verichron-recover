import { DataSource, DataSourceOptions } from 'typeorm';
import 'dotenv/config'; // Loads .env file for local CLI usage

/**
 * TypeORM CLI DataSource for api-debtors service
 *
 * This configuration is ONLY for the TypeORM CLI to run migrations.
 * The runtime configuration is in app.module.ts using TypeOrmModule.forRootAsync.
 *
 * Each microservice owns its own database and entities - no cross-service dependencies.
 */

// Ensure that DATABASE_URL is loaded from your environment or .env file
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
    'Example: postgresql://devuser:devpassword@localhost:5432/voice_db'
  );
}

const isCompiled = __filename.endsWith('.js');

const config: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,

  // Point to the TS entities for THIS service only.
  entities: [isCompiled ? 'dist/src/**/*.entity.js' : 'src/**/*.entity.ts'],

  // Point to the TS migrations for THIS service only.
  migrations: [isCompiled ? 'dist/migrations/**/*.js' : 'migrations/**/*.ts'],

  // Never auto-sync in production - use migrations
  synchronize: false,

  // Logging for CLI operations
  logging: ['error', 'warn', 'migration'],
};

export default new DataSource(config);