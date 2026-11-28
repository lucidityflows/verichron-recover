import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769049116315 implements MigrationInterface {
    name = 'InitialSchema1769049116315'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_25d24010f53bb80b78e412c965" ON "role_permissions" ("role_id", "permission_id") `);
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "description" character varying(500) NOT NULL, "resource" character varying(50) NOT NULL, "action" character varying(50) NOT NULL, "scope" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_89456a09b598ce8915c702c528" ON "permissions" ("resource") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8dad765629e83229da6feda1c1" ON "permissions" ("code") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid, "name" character varying(100) NOT NULL, "description" character varying(500), "is_system_role" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_roles_platform_name_unique" ON "roles" ("name") WHERE "organization_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8bdcf7999d2e71031da1f4869a" ON "roles" ("organization_id", "name") `);
        await queryRunner.query(`CREATE TYPE "public"."user_phone_numbers_category_enum" AS ENUM('MOBILE', 'HOME', 'WORK', 'BUSINESS', 'FAX', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "user_phone_numbers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "phone_number" character varying(20) NOT NULL, "category" "public"."user_phone_numbers_category_enum" NOT NULL DEFAULT 'MOBILE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_32a353dc3e448f6e0862c8e262c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "organization_id" uuid, "organization_name" character varying(255), "role_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5da67bb31a58da5c021ed713860" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b284a3c0fa5be3890a9490aec8" ON "user_memberships" ("user_id") WHERE "organization_id" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_08f74064f9282aa22580390f82" ON "user_memberships" ("user_id", "organization_id") WHERE "organization_id" IS NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."user_emails_email_category_enum" AS ENUM('GENERAL', 'BILLING', 'SUPPORT', 'LEGAL', 'TECHNICAL', 'WORK')`);
        await queryRunner.query(`CREATE TABLE "user_emails" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "email_category" "public"."user_emails_email_category_enum" NOT NULL DEFAULT 'GENERAL', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3ef6c4be97ba94ea3ba65362ad0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_addresses_address_category_enum" AS ENUM('RESIDENCE_PRIMARY', 'RESIDENCE_SECONDARY', 'PLACE_OF_EMPLOYMENT', 'RELATIVE', 'PO_BOX', 'LEGAL_CORRESPONDENCE', 'HEADQUARTERS', 'BRANCH')`);
        await queryRunner.query(`CREATE TABLE "user_addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "street1" character varying(255) NOT NULL, "street2" character varying(255), "street3" character varying(255), "city" character varying(100) NOT NULL, "state" character varying(2) NOT NULL, "postal_code" character varying(10) NOT NULL, "country" character varying(2) NOT NULL DEFAULT 'US', "latitude" numeric(10,7), "longitude" numeric(10,7), "is_primary" boolean NOT NULL DEFAULT false, "address_category" "public"."user_addresses_address_category_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8abbeb5e3239ff7877088ffc25b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING', 'PROVISIONAL', 'ACTIVE', 'INACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(255) NOT NULL, "middle_name" character varying(255), "last_name" character varying(255) NOT NULL, "suffix" character varying(255), "email" character varying(255) NOT NULL, "password_hash" character varying, "status" "public"."users_status_enum" NOT NULL DEFAULT 'PENDING', "invitation_token" character varying, "invitation_expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_phone_numbers" ADD CONSTRAINT "FK_09e3ef5c2ea46be2ff6725ca7c2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_b369bfb0586d848e7f52f47d492" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_memberships" ADD CONSTRAINT "FK_b3bbda58bad0be2a12a6b39c84b" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_emails" ADD CONSTRAINT "FK_2e88b95787b903d46ab3cc3eb91" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_addresses" ADD CONSTRAINT "FK_7a5100ce0548ef27a6f1533a5ce" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_addresses" DROP CONSTRAINT "FK_7a5100ce0548ef27a6f1533a5ce"`);
        await queryRunner.query(`ALTER TABLE "user_emails" DROP CONSTRAINT "FK_2e88b95787b903d46ab3cc3eb91"`);
        await queryRunner.query(`ALTER TABLE "user_memberships" DROP CONSTRAINT "FK_b3bbda58bad0be2a12a6b39c84b"`);
        await queryRunner.query(`ALTER TABLE "user_memberships" DROP CONSTRAINT "FK_b369bfb0586d848e7f52f47d492"`);
        await queryRunner.query(`ALTER TABLE "user_phone_numbers" DROP CONSTRAINT "FK_09e3ef5c2ea46be2ff6725ca7c2"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TABLE "user_addresses"`);
        await queryRunner.query(`DROP TYPE "public"."user_addresses_address_category_enum"`);
        await queryRunner.query(`DROP TABLE "user_emails"`);
        await queryRunner.query(`DROP TYPE "public"."user_emails_email_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08f74064f9282aa22580390f82"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b284a3c0fa5be3890a9490aec8"`);
        await queryRunner.query(`DROP TABLE "user_memberships"`);
        await queryRunner.query(`DROP TABLE "user_phone_numbers"`);
        await queryRunner.query(`DROP TYPE "public"."user_phone_numbers_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8bdcf7999d2e71031da1f4869a"`);
        await queryRunner.query(`DROP INDEX "public"."idx_roles_platform_name_unique"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8dad765629e83229da6feda1c1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89456a09b598ce8915c702c528"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25d24010f53bb80b78e412c965"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
    }

}
