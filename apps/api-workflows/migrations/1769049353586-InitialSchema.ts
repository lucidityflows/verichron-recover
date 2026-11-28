import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769049353586 implements MigrationInterface {
    name = 'InitialSchema1769049353586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workflow_templates_trigger_type_enum" AS ENUM('ACCOUNT_AGE', 'PAYMENT_PROMISE_BROKEN', 'CONTACT_ATTEMPT_FAILED', 'HIGH_BALANCE', 'COMPLIANCE_ALERT', 'COLLECTOR_CAPACITY', 'TIME_BASED', 'CUSTOM', 'DEBT_CREATED', 'PAYMENT_RECEIVED')`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_templates_default_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TABLE "workflow_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "category" character varying(50) NOT NULL, "trigger_type" "public"."workflow_templates_trigger_type_enum" NOT NULL, "default_conditions" jsonb NOT NULL DEFAULT '[]', "default_actions" jsonb NOT NULL DEFAULT '[]', "default_priority" "public"."workflow_templates_default_priority_enum" NOT NULL DEFAULT 'MEDIUM', "is_system_template" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_de336a1fce23ad3261d49423eae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_875a90b33ebf729b78e031e81c" ON "workflow_templates" ("category", "is_system_template") `);
        await queryRunner.query(`CREATE TYPE "public"."escalation_rules_escalate_to_enum" AS ENUM('MANAGER', 'SENIOR_COLLECTOR', 'CUSTOM_ROLE')`);
        await queryRunner.query(`CREATE TYPE "public"."escalation_rules_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TABLE "escalation_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "enabled" boolean NOT NULL DEFAULT true, "trigger_conditions" jsonb NOT NULL, "escalate_to" "public"."escalation_rules_escalate_to_enum" NOT NULL, "escalation_targets" jsonb NOT NULL, "notification_methods" jsonb NOT NULL, "priority" "public"."escalation_rules_priority_enum" NOT NULL DEFAULT 'MEDIUM', "cooldown_hours" integer NOT NULL DEFAULT '24', "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "execution_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_d4674a40130565f540dd2d59884" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b8d7d7358db445f791a82990c7" ON "escalation_rules" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TYPE "public"."escalation_executions_target_entity_type_enum" AS ENUM('DEBTOR', 'ACCOUNT', 'COLLECTOR', 'PORTFOLIO', 'DEBT')`);
        await queryRunner.query(`CREATE TABLE "escalation_executions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "rule_id" uuid NOT NULL, "target_entity_id" uuid NOT NULL, "target_entity_type" "public"."escalation_executions_target_entity_type_enum" NOT NULL, "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a86d1432b2e8b279b8d3ab978a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e920f831b60abbe8cb60b49a5a" ON "escalation_executions" ("organization_id", "rule_id", "target_entity_id", "executed_at") `);
        await queryRunner.query(`CREATE TYPE "public"."workflow_rules_trigger_type_enum" AS ENUM('ACCOUNT_AGE', 'PAYMENT_PROMISE_BROKEN', 'CONTACT_ATTEMPT_FAILED', 'HIGH_BALANCE', 'COMPLIANCE_ALERT', 'COLLECTOR_CAPACITY', 'TIME_BASED', 'CUSTOM', 'DEBT_CREATED', 'PAYMENT_RECEIVED')`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_rules_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TABLE "workflow_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "trigger_type" "public"."workflow_rules_trigger_type_enum" NOT NULL, "conditions" jsonb NOT NULL, "actions" jsonb NOT NULL, "priority" "public"."workflow_rules_priority_enum" NOT NULL DEFAULT 'MEDIUM', "enabled" boolean NOT NULL DEFAULT false, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "execution_count" integer NOT NULL DEFAULT '0', "last_executed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_dd025a6c088de783ca30ec12979" UNIQUE ("organization_id", "name"), CONSTRAINT "PK_5b645c11994279ad47dc41291d8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."AutoAssignmentStrategy" AS ENUM('ROUND_ROBIN', 'LEAST_WORKLOAD', 'SKILL_BASED', 'GEOGRAPHIC', 'CUSTOM')`);
        await queryRunner.query(`CREATE TABLE "auto_assignment_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "enabled" boolean NOT NULL DEFAULT true, "strategy" "public"."AutoAssignmentStrategy" NOT NULL, "filters" jsonb NOT NULL, "collector_pool" jsonb NOT NULL, "exclude_collectors" jsonb, "max_assignments_per_day" integer, "workload_threshold" integer, "last_assigned_collector_id" uuid, "daily_assignment_counts" jsonb NOT NULL DEFAULT '{}', "total_assignments" integer NOT NULL DEFAULT '0', "consecutive_failures" integer NOT NULL DEFAULT '0', "auto_disabled" boolean NOT NULL DEFAULT false, "auto_disabled_at" TIMESTAMP WITH TIME ZONE, "auto_disabled_reason" text, "delay_minutes" integer, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_06a66c1fe4f43c8697e6059eb8a" UNIQUE ("organization_id", "name"), CONSTRAINT "PK_aab503c412a5b2a910ba6989101" PRIMARY KEY ("id")); COMMENT ON COLUMN "auto_assignment_configs"."daily_assignment_counts" IS 'Tracks assignments per collector per day: { collectorId: { "2025-01-15": 5 } }'`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_executions_target_entity_type_enum" AS ENUM('DEBTOR', 'ACCOUNT', 'COLLECTOR', 'PORTFOLIO', 'DEBT')`);
        await queryRunner.query(`CREATE TYPE "public"."workflow_executions_status_enum" AS ENUM('COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'RUNNING', 'PENDING')`);
        await queryRunner.query(`CREATE TABLE "workflow_executions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "rule_id" uuid, "rule_name" character varying(255) NOT NULL, "triggered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "triggered_by" character varying(255) NOT NULL, "target_entity_type" "public"."workflow_executions_target_entity_type_enum" NOT NULL, "target_entity_id" uuid NOT NULL, "target_entity_name" character varying(255), "actions_executed" jsonb NOT NULL, "status" "public"."workflow_executions_status_enum" NOT NULL, "duration_ms" integer, "error_message" text, "correlation_id" character varying(255), CONSTRAINT "PK_9d49b5c86c267d902145ed42c9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_workflow_executions_correlation" ON "workflow_executions" ("correlation_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_deed08caf2fd68cd3120499de9" ON "workflow_executions" ("organization_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_bb08cf7b92297ecc061d985178" ON "workflow_executions" ("organization_id", "rule_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_65497262c0cc370febcbccc030" ON "workflow_executions" ("organization_id", "triggered_at") `);
        await queryRunner.query(`ALTER TABLE "escalation_executions" ADD CONSTRAINT "FK_0e7d17e8f4ba1e2a93fa7b14786" FOREIGN KEY ("rule_id") REFERENCES "escalation_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "escalation_executions" DROP CONSTRAINT "FK_0e7d17e8f4ba1e2a93fa7b14786"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65497262c0cc370febcbccc030"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb08cf7b92297ecc061d985178"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_deed08caf2fd68cd3120499de9"`);
        await queryRunner.query(`DROP INDEX "public"."idx_workflow_executions_correlation"`);
        await queryRunner.query(`DROP TABLE "workflow_executions"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_executions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_executions_target_entity_type_enum"`);
        await queryRunner.query(`DROP TABLE "auto_assignment_configs"`);
        await queryRunner.query(`DROP TYPE "public"."AutoAssignmentStrategy"`);
        await queryRunner.query(`DROP TABLE "workflow_rules"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_rules_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_rules_trigger_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e920f831b60abbe8cb60b49a5a"`);
        await queryRunner.query(`DROP TABLE "escalation_executions"`);
        await queryRunner.query(`DROP TYPE "public"."escalation_executions_target_entity_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8d7d7358db445f791a82990c7"`);
        await queryRunner.query(`DROP TABLE "escalation_rules"`);
        await queryRunner.query(`DROP TYPE "public"."escalation_rules_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."escalation_rules_escalate_to_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_875a90b33ebf729b78e031e81c"`);
        await queryRunner.query(`DROP TABLE "workflow_templates"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_templates_default_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workflow_templates_trigger_type_enum"`);
    }

}
