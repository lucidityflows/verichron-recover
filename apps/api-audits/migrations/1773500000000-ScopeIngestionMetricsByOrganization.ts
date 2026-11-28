import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeIngestionMetricsByOrganization1773500000000 implements MigrationInterface {
  name = 'ScopeIngestionMetricsByOrganization1773500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      ADD COLUMN IF NOT EXISTS "organization_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "audit_ingestion_daily"
      SET "organization_id" = '00000000-0000-0000-0000-000000000000'
      WHERE "organization_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      ALTER COLUMN "organization_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      DROP CONSTRAINT IF EXISTS "PK_audit_ingestion_daily"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      ADD CONSTRAINT "PK_audit_ingestion_daily_org_date"
      PRIMARY KEY ("organization_id", "metric_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      DROP CONSTRAINT IF EXISTS "PK_audit_ingestion_daily_org_date"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      DROP COLUMN IF EXISTS "organization_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_ingestion_daily"
      ADD CONSTRAINT "PK_audit_ingestion_daily"
      PRIMARY KEY ("metric_date")
    `);
  }
}
