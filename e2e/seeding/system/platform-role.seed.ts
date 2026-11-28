/**
 * System Seeding: Platform Admin Role
 *
 * Seeds the PLATFORM_ADMIN role (organizationId = null).
 * This is system configuration, not test data.
 */

import { DataSource } from 'typeorm';
import { PLATFORM_ADMIN_ROLE_TEMPLATE } from '../../../apps/api-users/src/rbac/role-templates';
import { log } from '../../helpers/logger';

export async function seedPlatformRole(usersDataSource: DataSource): Promise<{ id: string; name: string }> {
  log('  👑 Seeding platform admin role...', 'cyan');

  const { permissions, ...roleFields } = PLATFORM_ADMIN_ROLE_TEMPLATE;

  // Find or create platform admin role
  let role = await usersDataSource.query(
    `SELECT id, name FROM roles WHERE name = $1 AND organization_id IS NULL`,
    [PLATFORM_ADMIN_ROLE_TEMPLATE.name]
  );

  if (!role || role.length === 0) {
    const result = await usersDataSource.query(
      `INSERT INTO roles (name, description, is_system_role, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, NOW(), NOW())
       RETURNING id, name`,
      [roleFields.name, roleFields.description, roleFields.isSystemRole]
    );
    role = result[0];
    log(`    ✅ Created platform role: ${PLATFORM_ADMIN_ROLE_TEMPLATE.name}`, 'green');
  } else {
    role = role[0];
  }

  // Assign permissions to platform admin role
  for (const permCode of permissions) {
    const permission = await usersDataSource.query(
      `SELECT id FROM permissions WHERE code = $1`,
      [permCode]
    );

    if (!permission || permission.length === 0) {
      log(`    ⚠️  Permission not found: ${permCode}`, 'yellow');
      continue;
    }

    const existingAssignment = await usersDataSource.query(
      `SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
      [role.id, permission[0].id]
    );

    if (!existingAssignment || existingAssignment.length === 0) {
      await usersDataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
        [role.id, permission[0].id]
      );
    }
  }

  log(`  ✅ Platform role configured with ${permissions.length} permissions`, 'green');

  return role;
}
