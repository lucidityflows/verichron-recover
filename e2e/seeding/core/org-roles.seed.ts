/**
 * Core Seeding: Organization Roles
 *
 * Creates system roles for a specific organization using role templates.
 * These are required for the system to function but are scoped per-organization.
 */

import { DataSource } from 'typeorm';
import { ORG_ROLE_TEMPLATES } from '../../../apps/api-users/src/rbac/role-templates';
import { log } from '../../helpers/logger';

export interface OrgRolesResult {
  orgAdmin: { id: string; name: string };
  orgManager: { id: string; name: string };
  orgTeamLead: { id: string; name: string };
  orgCollector: { id: string; name: string };
  orgViewer: { id: string; name: string };
  debtor: { id: string; name: string };
}

export async function seedOrgRoles(
  organizationId: string,
  organizationName: string,
  usersDataSource: DataSource
): Promise<OrgRolesResult> {
  log(`  🎭 Creating org roles for: ${organizationName}`, 'cyan');

  const roles: OrgRolesResult = {} as OrgRolesResult;

  // Create each org role from templates
  for (const [key, template] of Object.entries(ORG_ROLE_TEMPLATES)) {
    const { permissions, ...roleFields } = template;

    // Find or create role
    let role = await usersDataSource.query(
      `SELECT id, name FROM roles WHERE name = $1 AND organization_id = $2`,
      [template.name, organizationId]
    );

    if (!role || role.length === 0) {
      const result = await usersDataSource.query(
        `INSERT INTO roles (name, description, is_system_role, organization_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name`,
        [roleFields.name, roleFields.description, roleFields.isSystemRole, organizationId]
      );
      role = result[0];
      log(`    ✅ Created role: ${template.name}`, 'reset');
    } else {
      role = role[0];
    }

    // Assign permissions
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

    // Map to result object
    if (key === 'ORG_ADMIN') roles.orgAdmin = role;
    else if (key === 'ORG_MANAGER') roles.orgManager = role;
    else if (key === 'ORG_TEAM_LEAD') roles.orgTeamLead = role;
    else if (key === 'ORG_COLLECTOR') roles.orgCollector = role;
    else if (key === 'ORG_VIEWER') roles.orgViewer = role;
    else if (key === 'DEBTOR') roles.debtor = role;
  }

  log(`  ✅ Created ${Object.keys(ORG_ROLE_TEMPLATES).length} org roles`, 'green');

  return roles;
}
