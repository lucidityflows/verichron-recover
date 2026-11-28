import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateTeams1734624000000 implements MigrationInterface {
  name = 'CreateTeams1734624000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create teams table
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "manager_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teams_organization_name" UNIQUE ("organization_id", "name")
      )
    `);

    // Create indexes for teams table
    await queryRunner.query(`CREATE INDEX "IDX_teams_organization_id" ON "teams" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_teams_manager_user_id" ON "teams" ("manager_user_id")`);

    // Add foreign key constraint to organizations table
    await queryRunner.query(`
      ALTER TABLE "teams"
      ADD CONSTRAINT "FK_teams_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE
    `);

    // Create team_members table (junction table for multi-team membership)
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "team_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "role_on_team" character varying(50) NOT NULL DEFAULT 'member',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("team_id", "user_id"),
        CONSTRAINT "UQ_team_members_team_user" UNIQUE ("team_id", "user_id"),
        CONSTRAINT "CHK_team_members_role" CHECK ("role_on_team" IN ('member', 'lead', 'manager'))
      )
    `);

    // Create indexes for team_members table
    await queryRunner.query(`CREATE INDEX "IDX_team_members_user_id" ON "team_members" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_team_members_team_id" ON "team_members" ("team_id")`);

    // Add foreign key constraint to teams table
    await queryRunner.query(`
      ALTER TABLE "team_members"
      ADD CONSTRAINT "FK_team_members_team"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id")
      ON DELETE CASCADE
    `);

    // Note: We intentionally do NOT add a foreign key to users table since it lives in api-users (different bounded context)
    // User existence validation will be handled at the application layer via service-to-service calls
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
