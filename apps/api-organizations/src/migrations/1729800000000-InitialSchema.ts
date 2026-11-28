import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class InitialSchema1729800000000 implements MigrationInterface {
  name = 'InitialSchema1729800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "displayName" character varying(255),
        "organizationType" character varying NOT NULL,
        "parentOrganizationId" uuid,
        "taxId" character varying(50),
        "status" character varying NOT NULL DEFAULT 'PROVISIONING',
        "settings" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for organizations
    await queryRunner.query(`CREATE INDEX "IDX_organizations_name" ON "organizations" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_organizations_organizationType" ON "organizations" ("organizationType")`);
    await queryRunner.query(`CREATE INDEX "IDX_organizations_status" ON "organizations" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_organizations_parentOrganizationId" ON "organizations" ("parentOrganizationId")`);

    // Add self-referencing foreign key for parent organization
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD CONSTRAINT "FK_organizations_parentOrganization"
      FOREIGN KEY ("parentOrganizationId") REFERENCES "organizations"("id")
      ON DELETE SET NULL
    `);

    // Create organization_addresses table
    await queryRunner.query(`
      CREATE TABLE "organization_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "street1" character varying(255) NOT NULL,
        "street2" character varying(255),
        "street3" character varying(255),
        "city" character varying(100) NOT NULL,
        "state" character varying(50) NOT NULL,
        "postalCode" character varying(20) NOT NULL,
        "country" character varying(2) NOT NULL DEFAULT 'US',
        "latitude" numeric(10,8),
        "longitude" numeric(11,8),
        "isPrimary" boolean NOT NULL DEFAULT false,
        "addressCategory" character varying(50),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_addresses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_organization_addresses_organizationId" ON "organization_addresses" ("organizationId")`);
    await queryRunner.query(`
      ALTER TABLE "organization_addresses"
      ADD CONSTRAINT "FK_organization_addresses_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Create organization_emails table
    await queryRunner.query(`
      CREATE TABLE "organization_emails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "isVerified" boolean NOT NULL DEFAULT true,
        "emailCategory" character varying(50),
        "validFrom" TIMESTAMP,
        "validTo" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_emails" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_organization_emails_organizationId" ON "organization_emails" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_organization_emails_email" ON "organization_emails" ("email")`);
    await queryRunner.query(`
      ALTER TABLE "organization_emails"
      ADD CONSTRAINT "FK_organization_emails_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Create organization_phone_numbers table
    await queryRunner.query(`
      CREATE TABLE "organization_phone_numbers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "phoneNumber" character varying(20) NOT NULL,
        "extension" character varying(10),
        "isPrimary" boolean NOT NULL DEFAULT false,
        "isVerified" boolean NOT NULL DEFAULT true,
        "phoneCategory" character varying(50),
        "validFrom" TIMESTAMP,
        "validTo" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_phone_numbers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_organization_phone_numbers_organizationId" ON "organization_phone_numbers" ("organizationId")`);
    await queryRunner.query(`
      ALTER TABLE "organization_phone_numbers"
      ADD CONSTRAINT "FK_organization_phone_numbers_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE "organization_phone_numbers"`);
    await queryRunner.query(`DROP TABLE "organization_emails"`);
    await queryRunner.query(`DROP TABLE "organization_addresses"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
  }
}
