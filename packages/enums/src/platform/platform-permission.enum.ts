/**
 * Platform-level permissions
 *
 * These permissions are system-wide capabilities that platform admins can have.
 * They operate outside of organization context and affect the entire platform.
 */
export enum PlatformPermission {
  /**
   * Create new organizations in the system
   */
  ORGS_CREATE = 'platform:orgs:create',

  /**
   * Read organization details across the platform
   */
  ORGS_READ = 'platform:orgs:read',

  /**
   * Delete organizations from the system
   */
  ORGS_DELETE = 'platform:orgs:delete',

  /**
   * Update organization settings and configuration
   */
  ORGS_UPDATE = 'platform:orgs:update',

  /**
   * Suspend organizations (temporary disable)
   */
  ORGS_SUSPEND = 'platform:orgs:suspend',

  /**
   * Full organization management (create, read, update, delete, suspend)
   */
  ORGS_MANAGE = 'platform:orgs:manage',

  /**
   * Manage users across all organizations
   */
  USERS_MANAGE = 'platform:users:manage',

  /**
   * Impersonate users for support and debugging
   */
  USERS_IMPERSONATE = 'platform:users:impersonate',

  /**
   * Manage debtors across all organizations
   */
  DEBTORS_MANAGE = 'platform:debtors:manage',

  /**
   * Manage platform and organization roles
   */
  ROLES_MANAGE = 'platform:roles:manage',

  /**
   * Access and modify system-wide settings
   */
  SYSTEM_SETTINGS = 'platform:system:settings',

  /**
   * View audit logs and system activity
   */
  AUDIT_VIEW = 'platform:audit:view',

  /**
   * Manage debts and portfolios across the platform (Master Creditors, Ingestion)
   */
  DEBTS_MANAGE = 'platform:debts:manage',

  /**
   * Manage teams within an organization (create, update, delete, assign members)
   */
  TEAMS_MANAGE = 'platform:teams:manage',
}
