import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769049313076 implements MigrationInterface {
    name = 'InitialSchema1769049313076'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "twilio_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "account_sid" character varying(255) NOT NULL, "auth_token" character varying(512) NOT NULL, "api_key_sid" character varying(255) NOT NULL, "api_key_secret" character varying(512) NOT NULL, "outgoing_application_sid" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aa1aef5b3eb39f9c6e5153b6a8e" PRIMARY KEY ("id")); COMMENT ON COLUMN "twilio_configs"."auth_token" IS 'This value is encrypted at rest'; COMMENT ON COLUMN "twilio_configs"."api_key_secret" IS 'This value is encrypted at rest'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ff12562bfcdcc85c3151bea4e1" ON "twilio_configs" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."call_logs_status_enum" AS ENUM('QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELED', 'NO_ANSWER', 'BUSY')`);
        await queryRunner.query(`CREATE TYPE "public"."call_logs_disposition_enum" AS ENUM('LEFT_VOICEMAIL', 'PROMISE_TO_PAY', 'WRONG_NUMBER', 'DISPUTE', 'CALL_BACK', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "call_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "debtor_id" uuid NOT NULL, "agent_id" uuid NOT NULL, "provider_sid" character varying(255) NOT NULL, "from_number" character varying(20) NOT NULL, "to_number" character varying(20) NOT NULL, "status" "public"."call_logs_status_enum" NOT NULL DEFAULT 'QUEUED', "duration" integer, "disposition" "public"."call_logs_disposition_enum", "recording_url" character varying(1024), "cost" numeric(10,4), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_41ccd10750cb129089608980101" UNIQUE ("provider_sid"), CONSTRAINT "PK_aa08476bcc13bfdf394261761e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d595851b68e454abfe56e022e7" ON "call_logs" ("organization_id", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d595851b68e454abfe56e022e7"`);
        await queryRunner.query(`DROP TABLE "call_logs"`);
        await queryRunner.query(`DROP TYPE "public"."call_logs_disposition_enum"`);
        await queryRunner.query(`DROP TYPE "public"."call_logs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff12562bfcdcc85c3151bea4e1"`);
        await queryRunner.query(`DROP TABLE "twilio_configs"`);
    }

}
