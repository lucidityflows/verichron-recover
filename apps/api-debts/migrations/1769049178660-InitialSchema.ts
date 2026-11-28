import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769049178660 implements MigrationInterface {
    name = 'InitialSchema1769049178660'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_portfolio_permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "portfolio_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6031ac61e7619be316ca72f643b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f73ed695710fe3acac444c9621" ON "user_portfolio_permission" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_fd9d0de023c938ef15144d5a37" ON "user_portfolio_permission" ("portfolio_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6a2f463e4db795401eac92cc5d" ON "user_portfolio_permission" ("user_id", "portfolio_id") `);
        await queryRunner.query(`CREATE TYPE "public"."portfolios_status_enum" AS ENUM('SOLD', 'PROVISIONING', 'ACTIVE', 'CLOSED')`);
        await queryRunner.query(`CREATE TYPE "public"."portfolios_primary_debt_category_enum" AS ENUM('CREDIT_CARD', 'AUTO_LOAN', 'MEDICAL', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'UTILITY', 'TELECOM', 'MORTGAGE', 'PAYDAY_LOAN', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "portfolios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "status" "public"."portfolios_status_enum" NOT NULL DEFAULT 'PROVISIONING', "purchase_date" date NOT NULL, "purchase_price" numeric(15,2) NOT NULL, "total_principal" numeric(15,2) NOT NULL, "source" character varying(500) NOT NULL, "primary_debt_category" "public"."portfolios_primary_debt_category_enum", "portfolio_tags" text array NOT NULL DEFAULT '{}', "business_description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_488aa6e9b219d1d9087126871ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_65069afee6b9b25d530da60fc6" ON "portfolios" ("organization_id", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_bba8cc9e082bafdd036fae36ca" ON "portfolios" ("organization_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."import_jobs_status_enum" AS ENUM('PENDING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "import_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "portfolio_name" character varying(255) NOT NULL, "file_location" character varying(500) NOT NULL, "status" "public"."import_jobs_status_enum" NOT NULL DEFAULT 'PENDING', "total_rows" integer, "processed_rows" integer NOT NULL DEFAULT '0', "error_message" text, "portfolio_id" uuid, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4d206c602f173f98e4bb85819a3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a147b5422aa71aa4cd2abaa5e5" ON "import_jobs" ("organization_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_a322bf37f4f4d2a75fb3efc99c" ON "import_jobs" ("organization_id", "status") `);
        await queryRunner.query(`CREATE TABLE "debt_ownership_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "debt_id" uuid NOT NULL, "organization_id" uuid NOT NULL, "acquired_date" date NOT NULL, "sold_date" date, "source" character varying(500) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6918589261731173b1fd683a7a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ed88e6a6da03e7b951c8bd9cf" ON "debt_ownership_history" ("debt_id", "sold_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8d76451da1e0ce45ae19264b4" ON "debt_ownership_history" ("organization_id", "acquired_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_3448b6b279d33ccae87fe4d550" ON "debt_ownership_history" ("debt_id", "acquired_date") `);
        await queryRunner.query(`CREATE TABLE "debt_debtor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "debt_id" uuid NOT NULL, "debtor_profile_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18a3fe61642f2f136a019f5795e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e7a1ba97fb13c3e091352b8317" ON "debt_debtor" ("debtor_profile_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c8a6deead6589224fc9ec6d8c8" ON "debt_debtor" ("debt_id", "debtor_profile_id") `);
        await queryRunner.query(`CREATE TYPE "public"."debts_status_enum" AS ENUM('IMPORTED', 'ACTIVE', 'IN_COLLECTION', 'PAYMENT_PLAN', 'SETTLED', 'PAID_IN_FULL', 'SOLD', 'CHARGED_OFF')`);
        await queryRunner.query(`CREATE TYPE "public"."debts_debt_category_enum" AS ENUM('CREDIT_CARD', 'AUTO_LOAN', 'MEDICAL', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'UTILITY', 'TELECOM', 'MORTGAGE', 'PAYDAY_LOAN', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "debts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "portfolio_id" uuid NOT NULL, "original_creditor_name" character varying(255) NOT NULL, "account_number" character varying(100) NOT NULL, "principal_amount" numeric(12,2) NOT NULL, "interest_amount" numeric(12,2) NOT NULL DEFAULT '0', "fees_amount" numeric(12,2) NOT NULL DEFAULT '0', "current_balance" numeric(12,2) NOT NULL, "status" "public"."debts_status_enum" NOT NULL DEFAULT 'IMPORTED', "debt_category" "public"."debts_debt_category_enum" NOT NULL DEFAULT 'OTHER', "debt_subcategory" character varying(100), "original_debt_date" date NOT NULL, "last_payment_date" date, "notes" text, "is_disputed" boolean NOT NULL DEFAULT false, "disputed_at" TIMESTAMP, "dispute_reason" text, "first_delinquency_date" date, "placement_date" date, "charge_off_date" date, "last_transaction_date" date, "last_contact_date" date, "statute_of_limitations_date" date, "statute_of_limitations_state" character varying(2), "creditor_id" uuid, "import_notes" text, "import_batch_id" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4bd9f54aab9e59628a3a2657fa1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b72052272dec2ba2d63f3ddf63" ON "debts" ("organization_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_81b0955065835032d58d21f974" ON "debts" ("organization_id", "portfolio_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f1d8fd5f6ee0b411d5dca4406" ON "debts" ("organization_id", "account_number") `);
        await queryRunner.query(`CREATE TABLE "global_creditors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "canonical_name" character varying NOT NULL, "verified_ein" character varying, "known_aliases" text array NOT NULL DEFAULT '{}', "is_reference_only" boolean NOT NULL DEFAULT true, "industry" character varying(100), "created_by_platform_user_id" character varying, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8718b2247a1840fc2236127c1c3" UNIQUE ("canonical_name"), CONSTRAINT "UQ_cdbf3d2ef0facb5eccec135094d" UNIQUE ("verified_ein"), CONSTRAINT "PK_de205e227c30106e45a3a965097" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "creditors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "legal_name" character varying(255) NOT NULL, "normalized_name" character varying(255) NOT NULL, "ein" character varying(10), "dba_name" character varying(255), "street1" character varying(255), "street2" character varying(255), "street3" character varying(255), "city" character varying(100), "state" character varying(2), "postal_code" character varying(10), "country" character varying(2) NOT NULL DEFAULT 'US', "latitude" numeric(10,7), "longitude" numeric(10,7), "is_master_record" boolean NOT NULL DEFAULT true, "master_creditor_id" uuid, "match_confidence_score" numeric(5,2), "ein_verified" boolean NOT NULL DEFAULT false, "global_creditor_id" uuid, "is_platform_verified" boolean NOT NULL DEFAULT false, "global_link_confidence" numeric(5,2), "has_unresolved_conflict" boolean NOT NULL DEFAULT false, "hygiene_score" integer, "industry" character varying(100), "debt_count" integer NOT NULL DEFAULT '0', "total_principal" numeric(15,2) NOT NULL DEFAULT '0', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9777671a9b8e6ad08eb63b80ce5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_131cf6284b0643ef873bff0164" ON "creditors" ("organization_id", "normalized_name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8ca66a89a7abb7cdbe560bb3c3" ON "creditors" ("organization_id", "ein") WHERE ein IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "creditor_conflicts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "raw_creditor_name" character varying(255) NOT NULL, "normalized_name" character varying(255) NOT NULL, "source_import_id" uuid, "suggested_master_ids" jsonb NOT NULL, "confidence_scores" jsonb NOT NULL, "ai_match_reason" text, "is_platform_match" boolean NOT NULL DEFAULT false, "status" character varying(50) NOT NULL DEFAULT 'MEDIUM_CONFIDENCE', "resolved_by_user_id" uuid, "resolved_at" TIMESTAMP, "resolution" jsonb, "debt_count" integer NOT NULL DEFAULT '0', "total_principal_affected" numeric(15,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7068aafa6ac954a557435a6880b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_02e8b8324dd9b4d6e0b330e987" ON "creditor_conflicts" ("organization_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5b1a3179bde028fb5eccf2978" ON "creditor_conflicts" ("organization_id", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."charge_off_history_reason_enum" AS ENUM('DELINQUENCY_180_DAYS', 'BANKRUPTCY', 'DECEASED', 'FRAUD_IDENTITY_THEFT', 'STATUTE_OF_LIMITATIONS', 'SETTLEMENT_WRITE_OFF', 'UNCOLLECTIBLE', 'DISPUTE_RESOLVED_DEBTOR_FAVOR', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "charge_off_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "debt_id" uuid NOT NULL, "charge_off_date" date NOT NULL, "reason" "public"."charge_off_history_reason_enum" NOT NULL, "principal_balance" numeric(12,2) NOT NULL, "interest_balance" numeric(12,2) NOT NULL DEFAULT '0', "fees_balance" numeric(12,2) NOT NULL DEFAULT '0', "total_charged_off" numeric(12,2) NOT NULL, "days_delinquent" integer NOT NULL, "is_reversed" boolean NOT NULL DEFAULT false, "reversal_date" date, "reversal_reason" character varying(255), "recovered_amount" numeric(12,2), "recovered_date" date, "reported_to_credit_bureaus" boolean NOT NULL DEFAULT false, "credit_bureau_report_date" date, "notes" text, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7efe703be64230223eca78d520e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_54d872220bcb31a156c8a92459" ON "charge_off_history" ("charge_off_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_f2068184db910d0d78d6d91fe4" ON "charge_off_history" ("organization_id", "debt_id") `);
        await queryRunner.query(`ALTER TABLE "user_portfolio_permission" ADD CONSTRAINT "FK_fd9d0de023c938ef15144d5a371" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "debt_debtor" ADD CONSTRAINT "FK_79fa693fada2d3b84f1a95f649c" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "debts" ADD CONSTRAINT "FK_707d0db5e404a6731d96b1f4014" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "debts" DROP CONSTRAINT "FK_707d0db5e404a6731d96b1f4014"`);
        await queryRunner.query(`ALTER TABLE "debt_debtor" DROP CONSTRAINT "FK_79fa693fada2d3b84f1a95f649c"`);
        await queryRunner.query(`ALTER TABLE "user_portfolio_permission" DROP CONSTRAINT "FK_fd9d0de023c938ef15144d5a371"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2068184db910d0d78d6d91fe4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54d872220bcb31a156c8a92459"`);
        await queryRunner.query(`DROP TABLE "charge_off_history"`);
        await queryRunner.query(`DROP TYPE "public"."charge_off_history_reason_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5b1a3179bde028fb5eccf2978"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_02e8b8324dd9b4d6e0b330e987"`);
        await queryRunner.query(`DROP TABLE "creditor_conflicts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ca66a89a7abb7cdbe560bb3c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_131cf6284b0643ef873bff0164"`);
        await queryRunner.query(`DROP TABLE "creditors"`);
        await queryRunner.query(`DROP TABLE "global_creditors"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f1d8fd5f6ee0b411d5dca4406"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_81b0955065835032d58d21f974"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b72052272dec2ba2d63f3ddf63"`);
        await queryRunner.query(`DROP TABLE "debts"`);
        await queryRunner.query(`DROP TYPE "public"."debts_debt_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."debts_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8a6deead6589224fc9ec6d8c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e7a1ba97fb13c3e091352b8317"`);
        await queryRunner.query(`DROP TABLE "debt_debtor"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3448b6b279d33ccae87fe4d550"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8d76451da1e0ce45ae19264b4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ed88e6a6da03e7b951c8bd9cf"`);
        await queryRunner.query(`DROP TABLE "debt_ownership_history"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a322bf37f4f4d2a75fb3efc99c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a147b5422aa71aa4cd2abaa5e5"`);
        await queryRunner.query(`DROP TABLE "import_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."import_jobs_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bba8cc9e082bafdd036fae36ca"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65069afee6b9b25d530da60fc6"`);
        await queryRunner.query(`DROP TABLE "portfolios"`);
        await queryRunner.query(`DROP TYPE "public"."portfolios_primary_debt_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."portfolios_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a2f463e4db795401eac92cc5d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fd9d0de023c938ef15144d5a37"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f73ed695710fe3acac444c9621"`);
        await queryRunner.query(`DROP TABLE "user_portfolio_permission"`);
    }

}
