import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditRequestArtifactFields1773200000000 implements MigrationInterface {
  name = 'AddAuditRequestArtifactFields1773200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      ADD COLUMN IF NOT EXISTS "artifact_mime_type" character varying(128)
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      ADD COLUMN IF NOT EXISTS "artifact_size_bytes" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      ADD COLUMN IF NOT EXISTS "artifact_data" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      DROP COLUMN IF EXISTS "artifact_data"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      DROP COLUMN IF EXISTS "artifact_size_bytes"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      DROP COLUMN IF EXISTS "artifact_mime_type"
    `);
  }
}
