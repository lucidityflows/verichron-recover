import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769049150574 implements MigrationInterface {
    name = 'InitialSchema1769049150574'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "description" text, "manager_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ba6a9c2e4799922a90245a5661a" UNIQUE ("organization_id", "name"), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fdc736f761896ccc179c823a78" ON "teams" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2c8e981d6db469a2d0fac955df" ON "teams" ("manager_user_id") `);
        await queryRunner.query(`CREATE TABLE "team_members" ("team_id" uuid NOT NULL, "user_id" uuid NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "role_on_team" character varying(50) NOT NULL DEFAULT 'MEMBER', "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1d3c06a8217a8785e2af0ec4ab8" UNIQUE ("team_id", "user_id"), CONSTRAINT "PK_1d3c06a8217a8785e2af0ec4ab8" PRIMARY KEY ("team_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2bf4967c8c2a6b845dadfbf3d" ON "team_members" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "portfolio_team_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "portfolio_id" uuid NOT NULL, "team_id" uuid NOT NULL, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_abe740aa3181121cc7faf878ff5" UNIQUE ("organization_id", "portfolio_id", "team_id"), CONSTRAINT "PK_de22a5b4a08909b94ec1d5852a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f4de3c6b20b714faeee227b802" ON "portfolio_team_assignments" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f6d16aa911b8d2da5dbf05ff68" ON "portfolio_team_assignments" ("portfolio_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2b97c2e178e940860c2af1c7be" ON "portfolio_team_assignments" ("team_id") `);
        await queryRunner.query(`CREATE TABLE "settlement_authority_matrices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "min_balance" numeric(15,2) NOT NULL DEFAULT '0', "max_balance" numeric(15,2), "min_age_days" integer NOT NULL DEFAULT '0', "max_age_days" integer, "max_discount_percent" numeric(5,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f8ac49fa44225533c3aabb41788" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d1b7be49c18f49e0f1bf6f70aa" ON "settlement_authority_matrices" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."approval_thresholds_role_type_enum" AS ENUM('COLLECTOR', 'TEAM_LEAD', 'MANAGER')`);
        await queryRunner.query(`CREATE TABLE "approval_thresholds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "role_type" "public"."approval_thresholds_role_type_enum" NOT NULL, "max_discount_percent" numeric(5,2) NOT NULL, "max_dollar_amount" numeric(15,2), "max_plan_duration_months" integer NOT NULL DEFAULT '12', "min_down_payment_percent" numeric(5,2) NOT NULL DEFAULT '10', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6f239e76728e6a9549dc22d080e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa66c701213dcf61ab62dc4f53" ON "approval_thresholds" ("organization_id", "role_type") `);
        await queryRunner.query(`CREATE TYPE "public"."organizations_organization_type_enum" AS ENUM('COLLECTION_AGENCY', 'CREDITOR', 'PARTNER')`);
        await queryRunner.query(`CREATE TYPE "public"."organizations_status_enum" AS ENUM('PROVISIONING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "display_name" character varying(255), "organization_type" "public"."organizations_organization_type_enum" NOT NULL, "parent_organization_id" uuid, "tax_id" character varying(50), "status" "public"."organizations_status_enum" NOT NULL DEFAULT 'PROVISIONING', "settings" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_by" uuid, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b2942c2abac6a57dffac221431" ON "organizations" ("parent_organization_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3770f157bd77d83ab022e92fc" ON "organizations" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_a33ff82a9315b6022aa92bec74" ON "organizations" ("organization_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_9b7ca6d30b94fef571cff87688" ON "organizations" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."organization_phone_numbers_category_enum" AS ENUM('MOBILE', 'HOME', 'WORK', 'BUSINESS', 'FAX', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "organization_phone_numbers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "phone_number" character varying(20) NOT NULL, "extension" character varying(10), "is_primary" boolean NOT NULL DEFAULT false, "is_verified" boolean NOT NULL DEFAULT true, "category" "public"."organization_phone_numbers_category_enum" NOT NULL, "valid_from" TIMESTAMP, "valid_to" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e540a550f5da03e419be46598b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5d60cd122254a247ede98e80ba" ON "organization_phone_numbers" ("phone_number") `);
        await queryRunner.query(`CREATE INDEX "IDX_f00207d9bbd0f29b8b703465c5" ON "organization_phone_numbers" ("organization_id", "is_primary") `);
        await queryRunner.query(`CREATE INDEX "IDX_716e6c50be49840f95c634c442" ON "organization_phone_numbers" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."organization_emails_email_category_enum" AS ENUM('GENERAL', 'BILLING', 'SUPPORT', 'LEGAL', 'TECHNICAL', 'WORK')`);
        await queryRunner.query(`CREATE TABLE "organization_emails" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "is_verified" boolean NOT NULL DEFAULT true, "email_category" "public"."organization_emails_email_category_enum" NOT NULL DEFAULT 'GENERAL', "valid_from" TIMESTAMP, "valid_to" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid, CONSTRAINT "PK_5191f041e36dfb37192a97337d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_652ff1c0949075e4748ea06c5f" ON "organization_emails" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_16e6de9714589e8918e2f80dec" ON "organization_emails" ("organization_id", "is_primary") `);
        await queryRunner.query(`CREATE INDEX "IDX_53f646ca489e36b6d07153b68e" ON "organization_emails" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."organization_addresses_address_category_enum" AS ENUM('RESIDENCE_PRIMARY', 'RESIDENCE_SECONDARY', 'PLACE_OF_EMPLOYMENT', 'RELATIVE', 'PO_BOX', 'LEGAL_CORRESPONDENCE', 'HEADQUARTERS', 'BRANCH')`);
        await queryRunner.query(`CREATE TABLE "organization_addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "street1" character varying(255) NOT NULL, "street2" character varying(255), "street3" character varying(255), "city" character varying(100) NOT NULL, "state" character varying(2) NOT NULL, "postal_code" character varying(10) NOT NULL, "country" character varying(2) NOT NULL DEFAULT 'US', "latitude" numeric(10,7), "longitude" numeric(10,7), "is_primary" boolean NOT NULL DEFAULT false, "address_category" "public"."organization_addresses_address_category_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "organizationId" uuid, CONSTRAINT "PK_cb9df8649d3c06d470b5d1b9031" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2b47f25cd5622ee2d1479f5c1a" ON "organization_addresses" ("organization_id", "address_category") `);
        await queryRunner.query(`CREATE INDEX "IDX_c50de83b3f0d4437eb7c4c3525" ON "organization_addresses" ("organization_id", "is_primary") `);
        await queryRunner.query(`CREATE INDEX "IDX_0ad7ae19234b12ccc19f5ed641" ON "organization_addresses" ("organization_id") `);
        await queryRunner.query(`CREATE TABLE "organization_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "user_id" uuid NOT NULL, "action" character varying(100) NOT NULL, "entity_name" character varying(100) NOT NULL, "entity_id" uuid, "previous_state" jsonb, "new_state" jsonb, "reason_code" character varying(50) NOT NULL, "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6075f8a564952502b6302672f7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6d0a20b45cc1e41e9412c12251" ON "organization_audit_logs" ("entity_name", "entity_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c46ff24da2a89c30fcd816ff73" ON "organization_audit_logs" ("organization_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portfolio_team_assignments" ADD CONSTRAINT "FK_2b97c2e178e940860c2af1c7bea" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_b2942c2abac6a57dffac221431f" FOREIGN KEY ("parent_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_phone_numbers" ADD CONSTRAINT "FK_716e6c50be49840f95c634c4421" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_emails" ADD CONSTRAINT "FK_45ccdd24208d38105f77fab13ae" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_addresses" ADD CONSTRAINT "FK_b12f41a9261199673487b594508" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_addresses" DROP CONSTRAINT "FK_b12f41a9261199673487b594508"`);
        await queryRunner.query(`ALTER TABLE "organization_emails" DROP CONSTRAINT "FK_45ccdd24208d38105f77fab13ae"`);
        await queryRunner.query(`ALTER TABLE "organization_phone_numbers" DROP CONSTRAINT "FK_716e6c50be49840f95c634c4421"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT "FK_b2942c2abac6a57dffac221431f"`);
        await queryRunner.query(`ALTER TABLE "portfolio_team_assignments" DROP CONSTRAINT "FK_2b97c2e178e940860c2af1c7bea"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c46ff24da2a89c30fcd816ff73"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d0a20b45cc1e41e9412c12251"`);
        await queryRunner.query(`DROP TABLE "organization_audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ad7ae19234b12ccc19f5ed641"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c50de83b3f0d4437eb7c4c3525"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b47f25cd5622ee2d1479f5c1a"`);
        await queryRunner.query(`DROP TABLE "organization_addresses"`);
        await queryRunner.query(`DROP TYPE "public"."organization_addresses_address_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_53f646ca489e36b6d07153b68e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16e6de9714589e8918e2f80dec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_652ff1c0949075e4748ea06c5f"`);
        await queryRunner.query(`DROP TABLE "organization_emails"`);
        await queryRunner.query(`DROP TYPE "public"."organization_emails_email_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_716e6c50be49840f95c634c442"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f00207d9bbd0f29b8b703465c5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d60cd122254a247ede98e80ba"`);
        await queryRunner.query(`DROP TABLE "organization_phone_numbers"`);
        await queryRunner.query(`DROP TYPE "public"."organization_phone_numbers_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9b7ca6d30b94fef571cff87688"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a33ff82a9315b6022aa92bec74"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3770f157bd77d83ab022e92fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b2942c2abac6a57dffac221431"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP TYPE "public"."organizations_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."organizations_organization_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa66c701213dcf61ab62dc4f53"`);
        await queryRunner.query(`DROP TABLE "approval_thresholds"`);
        await queryRunner.query(`DROP TYPE "public"."approval_thresholds_role_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1b7be49c18f49e0f1bf6f70aa"`);
        await queryRunner.query(`DROP TABLE "settlement_authority_matrices"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2b97c2e178e940860c2af1c7be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6d16aa911b8d2da5dbf05ff68"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f4de3c6b20b714faeee227b802"`);
        await queryRunner.query(`DROP TABLE "portfolio_team_assignments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2bf4967c8c2a6b845dadfbf3d"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c8e981d6db469a2d0fac955df"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fdc736f761896ccc179c823a78"`);
        await queryRunner.query(`DROP TABLE "teams"`);
    }

}
