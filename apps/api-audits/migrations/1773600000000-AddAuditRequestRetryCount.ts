import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditRequestRetryCount1773600000000 implements MigrationInterface {
  name = 'AddAuditRequestRetryCount1773600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      ADD COLUMN IF NOT EXISTS "retry_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_requests"
      DROP COLUMN IF EXISTS "retry_count"
    `);
  }
}
