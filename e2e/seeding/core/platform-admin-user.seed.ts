/**
 * Core Seeding: Platform Admin User
 *
 * Creates the default platform administrator user for testing.
 * This is test data, NOT production data.
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@verichron/enums';
import { log } from '../../helpers/logger';

// Standard test credentials
export const PLATFORM_ADMIN_EMAIL = 'platform.admin@verichron.com';
export const PLATFORM_ADMIN_PASSWORD = 'Password123!';

export async function seedPlatformAdminUser(usersDataSource: DataSource): Promise<{ id: string; email: string }> {
  log('  👤 Creating platform admin user...', 'cyan');

  // Find platform admin role
  const platformAdminRole = await usersDataSource.query(
    `SELECT id FROM roles WHERE name = $1 AND organization_id IS NULL`,
    ['PLATFORM_ADMIN']
  );

  if (!platformAdminRole || platformAdminRole.length === 0) {
    throw new Error('PLATFORM_ADMIN role not found! Run system seeding first.');
  }

  // Find or create platform admin user
  let platformAdminUser = await usersDataSource.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [PLATFORM_ADMIN_EMAIL]
  );

  if (!platformAdminUser || platformAdminUser.length === 0) {
    const passwordHash = await bcrypt.hash(PLATFORM_ADMIN_PASSWORD, 10);

    const result = await usersDataSource.query(
      `INSERT INTO users (email, first_name, last_name, middle_name, suffix, password_hash, status, invitation_token, invitation_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, NULL, NULL, NOW(), NOW())
       RETURNING id, email`,
      [PLATFORM_ADMIN_EMAIL, 'Platform', 'Admin', passwordHash, UserStatus.ACTIVE]
    );

    platformAdminUser = result[0];
    log(`    ✅ Created user: ${PLATFORM_ADMIN_EMAIL}`, 'green');
  } else {
    platformAdminUser = platformAdminUser[0];
  }

  // Ensure platform admin membership exists
  const existingMembership = await usersDataSource.query(
    `SELECT 1 FROM user_memberships WHERE user_id = $1 AND role_id = $2`,
    [platformAdminUser.id, platformAdminRole[0].id]
  );

  if (!existingMembership || existingMembership.length === 0) {
    await usersDataSource.query(
      `INSERT INTO user_memberships (user_id, role_id, organization_id, organization_name, created_at, updated_at)
       VALUES ($1, $2, NULL, NULL, NOW(), NOW())`,
      [platformAdminUser.id, platformAdminRole[0].id]
    );
    log(`    ✅ Assigned PLATFORM_ADMIN role`, 'reset');
  }

  log(`  ✅ Platform admin ready: ${PLATFORM_ADMIN_EMAIL}`, 'green');

  return platformAdminUser;
}
