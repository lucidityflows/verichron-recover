import { DataSource } from 'typeorm';
import { faker } from '../../../utils/faker';

/**
 * Role Factory
 * Creates roles and manages permissions
 */

export interface CreateRoleOptions {
  id?: string;
  name?: string;
  description?: string;
  organizationId?: string | null;
  isSystemRole?: boolean;
  permissions?: readonly string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  organizationId: string | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a role with default values
   */
  async createRole(options: CreateRoleOptions = {}): Promise<Role> {
    const id = options.id || faker.uuid();
    const name = options.name || `ROLE_${Date.now()}`;
    const description = options.description || `Test role ${name}`;
    const organizationId = options.organizationId === undefined ? null : options.organizationId;
    const isSystemRole = options.isSystemRole || false;

    const [role] = await this.dataSource.query(
      `INSERT INTO roles (id, name, description, organization_id, is_system_role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, description, organization_id as "organizationId", is_system_role as "isSystemRole", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, name, description, organizationId, isSystemRole],
    );

    // Add permissions if provided
    if (options.permissions && options.permissions.length > 0) {
      await this.addPermissionsToRole(id, options.permissions);
    }

    return role;
  }

  /**
   * Create platform admin role (system role, no org)
   */
  async createPlatformAdminRole(): Promise<Role> {
    return this.createRole({
      name: 'PLATFORM_ADMIN',
      description: 'Platform Administrator',
      organizationId: null,
      isSystemRole: true,
      permissions: [
        'platform:orgs:create',
        'platform:orgs:read',
        'platform:orgs:update',
        'platform:orgs:delete',
        'platform:orgs:suspend',
        'platform:users:manage',
        'platform:metrics:view',
      ],
    });
  }

  /**
   * Create organization admin role
   */
  async createOrgAdminRole(organizationId: string): Promise<Role> {
    return this.createRole({
      name: 'ORG_ADMIN',
      description: 'Organization Administrator',
      organizationId,
      isSystemRole: true, // System role - cannot be deleted
      permissions: [
        'orgs:read',
        'orgs:write',
        'orgs:settings:read',
        'orgs:settings:write',
        'users:read',
        'users:write',
        'users:delete',
        'users:roles:assign',
        'debts:read',
        'debts:write',
        'debts:delete',
        'debtors:read',
        'debtors:write',
        'debtors:delete',
        'workflows:rules:create',
        'workflows:rules:view',
        'workflows:rules:edit',
        'workflows:rules:delete',
        'workflows:rules:toggle',
        'workflows:executions:view',
        'workflows:analytics:view',
        'workflows:auto-assignment:manage',
        'workflows:auto-assignment:view',
        'workflows:escalations:manage',
        'workflows:escalations:view',
        'workflows:templates:view',
      ],
    });
  }

  /**
   * Create organization user role (limited permissions)
   */
  async createOrgUserRole(organizationId: string): Promise<Role> {
    return this.createRole({
      name: 'ORG_USER',
      description: 'Organization User',
      organizationId,
      isSystemRole: true, // System role - cannot be deleted
      permissions: [
        'debts:read',
        'debtors:read',
      ],
    });
  }

  /**
   * Add permissions to a role
   */
  async addPermissionsToRole(roleId: string, permissions: readonly string[]): Promise<void> {
    for (const permission of permissions) {
      // Get or create permission
      const permissionId = await this.ensurePermission(permission);

      // Link role to permission
      await this.dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permissionId],
      );
    }
  }

  /**
   * Remove permissions from a role
   */
  async removePermissionsFromRole(roleId: string, permissions: readonly string[]): Promise<void> {
    const permissionIds = await Promise.all(
      permissions.map(p => this.ensurePermission(p))
    );

    await this.dataSource.query(
      `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = ANY($2)`,
      [roleId, permissionIds],
    );
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string): Promise<string[]> {
    const results = await this.dataSource.query(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [roleId],
    );
    return results.map((r: any) => r.name);
  }

  /**
   * Find role by name and organization
   */
  async findByName(name: string, organizationId: string | null = null): Promise<Role | null> {
    const [role] = await this.dataSource.query(
      `SELECT id, name, description, organization_id as "organizationId", is_system_role as "isSystemRole", created_at as "createdAt", updated_at as "updatedAt"
       FROM roles WHERE name = $1 AND organization_id IS NOT DISTINCT FROM $2`,
      [name, organizationId],
    );
    return role || null;
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<Role | null> {
    const [role] = await this.dataSource.query(
      `SELECT id, name, description, organization_id as "organizationId", is_system_role as "isSystemRole", created_at as "createdAt", updated_at as "updatedAt"
       FROM roles WHERE id = $1`,
      [id],
    );
    return role || null;
  }

  /**
   * Helper: Ensure permission exists
   */
  private async ensurePermission(permissionCode: string): Promise<string> {
    const [existingPermission] = await this.dataSource.query(
      `SELECT id FROM permissions WHERE code = $1 LIMIT 1`,
      [permissionCode],
    );

    if (existingPermission) {
      return existingPermission.id;
    }

    // Parse permission code (e.g., "org:create" -> resource: "org", action: "create")
    const [resource, action] = permissionCode.split(':');

    const [newPermission] = await this.dataSource.query(
      `INSERT INTO permissions (id, code, description, resource, action, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        faker.uuid(),
        permissionCode,
        `Permission: ${permissionCode}`,
        resource,
        action,
      ],
    );

    return newPermission.id;
  }
}

/**
 * Factory creator function
 */
export function createRoleFactory(dataSource: DataSource): RoleFactory {
  return new RoleFactory(dataSource);
}