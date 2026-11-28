import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditEventDedup1773100000000 implements MigrationInterface {
  name = 'AddAuditEventDedup1773100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_event_dedup" (
        "event_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_audit_event_dedup_event_id" PRIMARY KEY ("event_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_event_dedup"`);
  }
}
