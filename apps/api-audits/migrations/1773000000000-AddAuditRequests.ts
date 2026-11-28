import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditRequests1773000000000 implements MigrationInterface {
  name = 'AddAuditRequests1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "request_type" character varying(64) NOT NULL,
        "status" character varying(16) NOT NULL,
        "filters" jsonb,
        "format" character varying(16) NOT NULL DEFAULT 'JSON',
        "requested_by" jsonb NOT NULL,
        "record_count" integer,
        "artifact_url" text,
        "artifact_checksum" character varying(128),
        "artifact_mime_type" character varying(128),
        "artifact_size_bytes" integer,
        "artifact_data" jsonb,
        "error_message" text,
        "started_at" TIMESTAMPTZ,
        "completed_at" TIMESTAMPTZ,
        "expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_requests" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_audit_requests_status"
          CHECK ("status" IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_requests_org_created"
      ON "audit_requests" ("organization_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_requests_org_status"
      ON "audit_requests" ("organization_id", "status", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_requests_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_requests_org_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_requests"`);
  }
}
