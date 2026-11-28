import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Initial Schema for api-audits
 *
 * Creates the partitioned audit_logs table with:
 * - Monthly range partitioning on created_at
 * - Initial partitions for Jan, Feb, Mar 2026
 * - Indexes optimized for compliance queries
 *
 * IMPORTANT: This uses raw SQL because TypeORM does not support
 * PARTITION BY natively. The entity maps to this partitioned table.
 *
 * @see AUDITS-API-PROPOSAL.md Section A.2.2 for design rationale
 */
export class InitialSchema1769378196773 implements MigrationInterface {
    name = 'InitialSchema1769378196773'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable uuid-ossp extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ============================================================
        // PARTITIONED PARENT TABLE
        // ============================================================
        // Note: PRIMARY KEY must include the partition key (created_at)
        // This is a PostgreSQL requirement for partitioned tables
        await queryRunner.query(`
            CREATE TABLE "audit_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "event_id" uuid NOT NULL,
                "actor_snapshot" jsonb NOT NULL,
                "action" character varying(64) NOT NULL,
                "target_type" character varying(32) NOT NULL,
                "target_id" character varying(64) NOT NULL,
                "changes" jsonb,
                "metadata" jsonb,
                "prev_hash" character varying(64),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id", "created_at")
            ) PARTITION BY RANGE ("created_at")
        `);

        // ============================================================
        // PARTITIONS (Current + 3 months ahead)
        // ============================================================
        // January 2026 (current month)
        await queryRunner.query(`
            CREATE TABLE "audit_logs_y2026m01" PARTITION OF "audit_logs"
                FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00')
        `);

        // February 2026
        await queryRunner.query(`
            CREATE TABLE "audit_logs_y2026m02" PARTITION OF "audit_logs"
                FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00')
        `);

        // March 2026
        await queryRunner.query(`
            CREATE TABLE "audit_logs_y2026m03" PARTITION OF "audit_logs"
                FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00')
        `);

        // April 2026
        await queryRunner.query(`
            CREATE TABLE "audit_logs_y2026m04" PARTITION OF "audit_logs"
                FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00')
        `);

        // ============================================================
        // INDEXES
        // ============================================================
        // These are created on the parent table and automatically
        // propagate to all partitions (current and future)

        // Primary query pattern: time-based queries per tenant
        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_org_created"
                ON "audit_logs" ("organization_id", "created_at" DESC)
        `);

        // Entity history queries (chain of custody)
        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_org_target"
                ON "audit_logs" ("organization_id", "target_type", "target_id", "created_at" DESC)
        `);

        // Idempotency check (prevents duplicate event processing)
        // Note: Unique constraints on partitioned tables must include partition key
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_audit_logs_event_id"
                ON "audit_logs" ("event_id", "created_at")
        `);

        // Hash chain verification queries
        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_prev_hash"
                ON "audit_logs" ("prev_hash")
                WHERE "prev_hash" IS NOT NULL
        `);

        // Action-based queries (e.g., "show all DEBT.PAYMENT events")
        await queryRunner.query(`
            CREATE INDEX "IDX_audit_logs_action"
                ON "audit_logs" ("organization_id", "action", "created_at" DESC)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_prev_hash"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_event_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_org_target"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_org_created"`);

        // Drop partitions (must be done before parent)
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs_y2026m04"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs_y2026m03"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs_y2026m02"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs_y2026m01"`);

        // Drop parent table
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    }
}
