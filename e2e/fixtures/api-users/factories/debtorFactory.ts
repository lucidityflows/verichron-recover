import { DataSource } from 'typeorm';
import { faker } from '../../../utils/faker';
import { DEFAULT_DEBTOR_PERMISSIONS } from '@verichron/enums';

/**
 * Debtor Factory
 * Creates debtor users with multi-organization access patterns
 */

export interface CreateDebtorOptions {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  status?: string;
  organizationIds?: string[]; // Multi-org access
  organizationNames?: string[]; // Matching org names
}

export interface DebtorUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string; // Plain password for testing
  passwordHash: string;
  status: string;
  roleId: string; // DEBTOR role ID
  organizationIds: string[];
  organizationNames: string[];
  debtorPermissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class DebtorFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a DEBTOR role (system-level, multi-org)
   */
  async createDebtorRole(): Promise<{ id: string; name: string }> {
    // Check if DEBTOR role already exists
    const [existingRole] = await this.dataSource.query(
      `SELECT id, name FROM roles WHERE name = 'DEBTOR' AND organization_id IS NULL`,
    );

    if (existingRole) {
      return existingRole;
    }

    // Create DEBTOR role
    const [role] = await this.dataSource.query(
      `INSERT INTO roles (id, name, description, organization_id, is_system_role, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, true, NOW(), NOW())
       RETURNING id, name`,
      [
        faker.uuid(),
        'DEBTOR',
        'Debtor user with self-service access to their own debt information across multiple organizations',
      ],
    );

    // Add debtor permissions
    for (const permission of DEFAULT_DEBTOR_PERMISSIONS) {
      await this.ensureDebtorPermission(permission, role.id);
    }

    return role;
  }

  /**
   * Create a debtor user with multi-organization access
   */
  async createDebtor(options: CreateDebtorOptions = {}): Promise<DebtorUser> {
    const bcrypt = require('bcrypt');

    const id = options.id || faker.uuid();
    const email = options.email || faker.email('debtor');
    const firstName = options.firstName || faker.person.firstName();
    const lastName = options.lastName || faker.person.lastName();
    const password = options.password || 'Debtor123!';
    const status = options.status || 'ACTIVE';
    const passwordHash = await bcrypt.hash(password, 10);

    // Ensure DEBTOR role exists
    const debtorRole = await this.createDebtorRole();

    // Create user
    await this.dataSource.query(
      `INSERT INTO users (id, email, first_name, last_name, password_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [id, email, firstName, lastName, passwordHash, status],
    );

    // Create memberships for all specified organizations
    const organizationIds = options.organizationIds || [];
    const organizationNames = options.organizationNames || [];

    for (let i = 0; i < organizationIds.length; i++) {
      await this.createDebtorMembership({
        userId: id,
        organizationId: organizationIds[i],
        organizationName: organizationNames[i] || `Organization ${i + 1}`,
        roleId: debtorRole.id,
      });
    }

    return {
      id,
      email,
      firstName,
      lastName,
      password,
      passwordHash,
      status,
      roleId: debtorRole.id,
      organizationIds,
      organizationNames,
      debtorPermissions: DEFAULT_DEBTOR_PERMISSIONS as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create a debtor membership for a specific organization
   */
  async createDebtorMembership(membership: {
    userId: string;
    organizationId: string;
    organizationName: string;
    roleId: string;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [
        membership.userId,
        membership.organizationId,
        membership.organizationName,
        membership.roleId,
      ],
    );
  }

  /**
   * Add organization access to an existing debtor
   */
  async addOrganizationAccess(
    userId: string,
    organizationId: string,
    organizationName: string,
  ): Promise<void> {
    const debtorRole = await this.createDebtorRole();

    await this.createDebtorMembership({
      userId,
      organizationId,
      organizationName,
      roleId: debtorRole.id,
    });
  }

  /**
   * Remove organization access from a debtor
   */
  async removeOrganizationAccess(userId: string, organizationId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM user_memberships WHERE user_id = $1 AND organization_id = $2`,
      [userId, organizationId],
    );
  }

  /**
   * Get all organizations a debtor has access to
   */
  async getDebtorOrganizations(userId: string): Promise<Array<{ organizationId: string; organizationName: string }>> {
    const results = await this.dataSource.query(
      `SELECT organization_id as "organizationId", organization_name as "organizationName"
       FROM user_memberships
       WHERE user_id = $1 AND organization_id IS NOT NULL
       ORDER BY created_at ASC`,
      [userId],
    );

    return results;
  }

  /**
   * Helper: Ensure debtor permission exists and link to role
   */
  private async ensureDebtorPermission(permissionCode: string, roleId: string): Promise<string> {
    // Check if permission exists
    const [existingPermission] = await this.dataSource.query(
      `SELECT id FROM permissions WHERE code = $1`,
      [permissionCode],
    );

    let permissionId: string;

    if (existingPermission) {
      permissionId = existingPermission.id;
    } else {
      // Parse permission code (e.g., "debtor:self:read" -> resource: "debtor", action: "self:read")
      const parts = permissionCode.split(':');
      const resource = parts[0];
      const action = parts.slice(1).join(':');

      // Create permission
      const [newPermission] = await this.dataSource.query(
        `INSERT INTO permissions (id, code, description, resource, action, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [
          faker.uuid(),
          permissionCode,
          `Debtor permission: ${permissionCode}`,
          resource,
          action,
        ],
      );
      permissionId = newPermission.id;
    }

    // Link permission to role
    await this.dataSource.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [roleId, permissionId],
    );

    return permissionId;
  }
}

/**
 * Factory creator function
 */
export function createDebtorFactory(dataSource: DataSource): DebtorFactory {
  return new DebtorFactory(dataSource);
}
