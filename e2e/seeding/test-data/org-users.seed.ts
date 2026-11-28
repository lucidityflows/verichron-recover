/**
 * Test Data: Organization Users
 *
 * Creates test users for UI development and integration testing.
 * All users have password: Password123!
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@verichron/enums';
import { log } from '../../helpers/logger';
import { TestOrganization } from './organizations.seed';
import { OrgRolesResult } from '../core/org-roles.seed';

export const TEST_USER_PASSWORD = 'Password123!';

interface UserConfig {
  email: string;
  firstName: string;
  lastName: string;
  role: 'orgAdmin' | 'orgManager' | 'orgTeamLead' | 'orgCollector' | 'orgViewer' | 'orgUser';
}

export async function seedOrgUsers(
  organization: TestOrganization,
  orgRoles: OrgRolesResult,
  usersDataSource: DataSource,
  users: UserConfig[]
): Promise<Array<{ id: string; email: string; role: string }>> {
  log(`  👥 Creating users for ${organization.name}...`, 'cyan');

  const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);
  const createdUsers: Array<{ id: string; email: string; role: string }> = [];

  for (const userConfig of users) {
    // Find or create user
    let user = await usersDataSource.query(
      `SELECT id, email FROM users WHERE email = $1`,
      [userConfig.email]
    );

    if (!user || user.length === 0) {
      const result = await usersDataSource.query(
        `INSERT INTO users (email, first_name, last_name, middle_name, suffix, password_hash, status, invitation_token, invitation_expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, NULL, $4, $5, NULL, NULL, NOW(), NOW())
         RETURNING id, email`,
        [userConfig.email, userConfig.firstName, userConfig.lastName, passwordHash, UserStatus.ACTIVE]
      );
      user = result[0];
      log(`    ✅ Created user: ${userConfig.email}`, 'reset');
    } else {
      user = user[0];
    }

    // Determine role
    const roleMap = {
      orgAdmin: orgRoles.orgAdmin,
      orgManager: orgRoles.orgManager,
      orgTeamLead: orgRoles.orgTeamLead,
      orgCollector: orgRoles.orgCollector,
      orgViewer: orgRoles.orgViewer,
      orgUser: orgRoles.orgCollector, // Use collector for "user" role (legacy)
    };

    const role = roleMap[userConfig.role];

    // Create membership
    const existingMembership = await usersDataSource.query(
      `SELECT 1 FROM user_memberships WHERE user_id = $1 AND organization_id = $2`,
      [user.id, organization.id]
    );

    if (!existingMembership || existingMembership.length === 0) {
      await usersDataSource.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [user.id, organization.id, organization.name, role.id]
      );
      log(`    → ${userConfig.role} in ${organization.name}`, 'reset');
    }

    createdUsers.push({ ...user, role: userConfig.role });
  }

  log(`  ✅ Created ${users.length} users for ${organization.name}`, 'green');

  return createdUsers;
}

export async function seedMultiOrgUser(
  organizations: { org: TestOrganization; roles: OrgRolesResult; roleType: 'orgAdmin' | 'orgUser' }[],
  usersDataSource: DataSource
): Promise<{ id: string; email: string }> {
  log('  👤 Creating multi-org user (Peter Parker)...', 'cyan');

  const email = 'peter.parker@verichron.com';
  const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);

  // Find or create user
  let user = await usersDataSource.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [email]
  );

  if (!user || user.length === 0) {
    const result = await usersDataSource.query(
      `INSERT INTO users (email, first_name, last_name, middle_name, suffix, password_hash, status, invitation_token, invitation_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, NULL, NULL, NOW(), NOW())
       RETURNING id, email`,
      [email, 'Peter', 'Parker', passwordHash, UserStatus.ACTIVE]
    );
    user = result[0];
    log(`    ✅ Created user: ${email}`, 'reset');
  } else {
    user = user[0];
  }

  // Create memberships in multiple orgs
  for (const { org, roles, roleType } of organizations) {
    const role = roleType === 'orgAdmin' ? roles.orgAdmin : roles.orgCollector;

    const existingMembership = await usersDataSource.query(
      `SELECT 1 FROM user_memberships WHERE user_id = $1 AND organization_id = $2`,
      [user.id, org.id]
    );

    if (!existingMembership || existingMembership.length === 0) {
      await usersDataSource.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [user.id, org.id, org.name, role.id]
      );
      log(`    → ${roleType} in ${org.name}`, 'reset');
    }
  }

  log('  ✅ Multi-org user created', 'green');

  return user;
}
