import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Simple platform admin factory for Test 1
 * Creates platform admin user (no organization)
 */
export async function createTestPlatformAdmin(dataSource: DataSource): Promise<{
  id: string;
  email: string;
  password: string;
}> {
  // Find or create platform admin role
  let platformAdminRole = await dataSource.query(
    `SELECT id FROM roles WHERE name = 'PLATFORM_ADMIN' AND organization_id IS NULL LIMIT 1`,
  );

  let roleId: string;

  if (platformAdminRole.length === 0) {
    const [newRole] = await dataSource.query(
      `INSERT INTO roles (name, description, is_system_role, organization_id, created_at, updated_at)
       VALUES ('PLATFORM_ADMIN', 'Platform Administrator', true, NULL, NOW(), NOW())
       RETURNING id`,
    );
    roleId = newRole.id;
  } else {
    roleId = platformAdminRole[0].id;
  }

  // Create platform admin user
  const userId = `platform-admin-${Date.now()}`;
  const email = 'platform.admin@test.com';
  const password = 'PlatformAdmin123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  await dataSource.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [userId, email, hashedPassword, 'Platform', 'Admin', 'ACTIVE'],
  );

  // Create membership (platform admin has no organization_id)
  await dataSource.query(
    `INSERT INTO user_memberships (user_id, organization_id, role_id, created_at, updated_at)
     VALUES ($1, NULL, $2, NOW(), NOW())`,
    [userId, roleId],
  );

  return {
    id: userId,
    email,
    password,
  };
}
