/**
 * Reset Database Script for api-audits
 *
 * Truncates all tables except migrations table.
 * Used by Cloud Run Jobs for staging data reset.
 *
 * Usage: npx ts-node src/scripts/reset-database.ts
 * Or after build: node dist/src/scripts/reset-database.js
 */

import dataSource from '../../datasource';

async function resetDatabase() {
  console.log('='.repeat(50));
  console.log('Resetting api-audits database');
  console.log('='.repeat(50));

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    const queryRunner = dataSource.createQueryRunner();

    const tables = await queryRunner.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename != 'migrations'
    `);

    if (tables.length === 0) {
      console.log('No tables to truncate');
    } else {
      console.log(`Found ${tables.length} tables to truncate`);

      const tableNames = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(', ');
      console.log(`Truncating tables: ${tableNames}`);

      await queryRunner.query(`TRUNCATE TABLE ${tableNames} CASCADE`);

      console.log(`Truncated ${tables.length} tables`);
    }

    await queryRunner.release();
    await dataSource.destroy();

    console.log('');
    console.log('Reset complete!');
    process.exit(0);
  } catch (error) {
    // Check for "database does not exist" error (PostgreSQL error code 3D000)
    if (error && typeof error === 'object' && 'code' in error && error.code === '3D000') {
      console.log('');
      console.log('SKIPPED: Database does not exist yet.');
      console.log('Run migrations first to create the database.');
      process.exit(0); // Exit success - nothing to reset
    }
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
