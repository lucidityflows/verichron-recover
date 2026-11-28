/**
 * System Roles
 *
 * Platform roles (organizationId = null) are created for platform admins.
 * Organization roles are created during organization onboarding.
 * For local development, they are seeded tied to "Debt Lucidity Solutions Inc."
 */

import { DEFAULT_DEBTOR_PERMISSIONS, PlatformPermission } from '@verichron/enums';

// Organization ID for Debt Lucidity Solutions Inc. (local dev)
export const Verichron_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Platform-level roles (organizationId = null)
 * These are for platform administrators who operate across all organizations
 */
export const PLATFORM_ROLES = [
  {
    name: 'PLATFORM_ADMIN',
    description: 'Platform administrator with full system access across all organizations',
    isSystemRole: true,
    organizationId: null, // Platform-level role
    permissions: [
      PlatformPermission.ORGS_CREATE,
      PlatformPermission.ORGS_DELETE,
      PlatformPermission.ORGS_UPDATE,
      PlatformPermission.ORGS_SUSPEND,
      PlatformPermission.ORGS_MANAGE,
      PlatformPermission.USERS_MANAGE,
      PlatformPermission.USERS_IMPERSONATE,
      PlatformPermission.ROLES_MANAGE,
      PlatformPermission.SYSTEM_SETTINGS,
      PlatformPermission.AUDIT_VIEW,
    ],
  },
];

export const SYSTEM_ROLES = [
  {
    name: 'Organization Admin',
    description: 'Full control over the organization resources',
    isSystemRole: true,
    organizationId: Verichron_ORGANIZATION_ID,
    permissions: [
      // All permissions - Organization Admin has full access
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'role:create',
      'role:read',
      'role:update',
      'role:delete',
      'role:assign',
      'permission:read',
      'debt:create',
      'debt:read',
      'debt:update',
      'debt:update:notes',
      'debt:delete',
      'debtor:create',
      'debtor:read',
      'debtor:update',
      'debtor:delete',
      'portfolio:create',
      'portfolio:read',
      'portfolio:update',
      'portfolio:delete',
      'portfolio:assign',
      'portfolio:transfer',
      'payment:create',
      'payment:read',
      'payment_plan:create',
      'payment_plan:read',
      'payment_plan:approve',
      'payment_plan:cancel',
      'import:create',
      'import:read',
      'report:read',
    ],
  },
  {
    name: 'Manager',
    description: 'Manages users and oversees collection activities without full admin rights',
    isSystemRole: true,
    organizationId: Verichron_ORGANIZATION_ID,
    permissions: [
      'user:read',
      'user:create',
      'user:update',
      'role:read',
      'role:assign',
      'debt:read',
      'debtor:read',
      'portfolio:read',
      'portfolio:assign',
      'report:read',
    ],
  },
  {
    name: 'Collector',
    description: 'Primary operational user, can only interact with assigned portfolios',
    isSystemRole: true,
    organizationId: Verichron_ORGANIZATION_ID,
    permissions: [
      'debt:read',
      'debt:update:notes',
      'debtor:read',
      'portfolio:read',
      'payment:create',
      'payment_plan:create',
    ],
  },
  {
    name: 'DEBTOR',
    description: 'Debtor user with access to their own debt information across organizations',
    isSystemRole: true,
    organizationId: Verichron_ORGANIZATION_ID,
    permissions: DEFAULT_DEBTOR_PERMISSIONS,
  },
];
