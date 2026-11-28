import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArchivalAndComplianceTables1773300000000 implements MigrationInterface {
  name = 'AddArchivalAndComplianceTables1773300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_archives" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "range_start" TIMESTAMPTZ NOT NULL,
        "range_end" TIMESTAMPTZ NOT NULL,
        "object_key" character varying(512) NOT NULL,
        "record_count" integer NOT NULL,
        "checksum" character varying(128) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_archives" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_audit_archives_org_range"
      ON "audit_archives" ("organization_id", "range_start", "range_end")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_compliance_briefs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "brief_date" date NOT NULL,
        "total_logs" integer NOT NULL,
        "anomaly_count" integer NOT NULL,
        "risk_score" integer NOT NULL,
        "top_actions" jsonb NOT NULL,
        "summary" jsonb,
        "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_compliance_briefs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_audit_compliance_briefs_org_date"
      ON "audit_compliance_briefs" ("organization_id", "brief_date")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_compliance_briefs_org_generated"
      ON "audit_compliance_briefs" ("organization_id", "generated_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_compliance_briefs_org_generated"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_compliance_briefs_org_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_compliance_briefs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_archives_org_range"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_archives"`);
  }
}
