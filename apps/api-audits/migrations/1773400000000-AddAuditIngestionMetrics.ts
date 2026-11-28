import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditIngestionMetrics1773400000000 implements MigrationInterface {
  name = 'AddAuditIngestionMetrics1773400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_ingestion_daily" (
        "metric_date" date NOT NULL,
        "ingested_count" integer NOT NULL DEFAULT 0,
        "duplicate_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_audit_ingestion_daily" PRIMARY KEY ("metric_date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_ingestion_daily"`);
  }
}
