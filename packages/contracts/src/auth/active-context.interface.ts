import {
  PlatformRole,
  PlatformPermission,
  OrganizationRole,
  OrganizationPermission,
  DebtorPermission
} from '@verichron/enums';

/**
 * Active context attached to the request by OrgContextGuard
 *
 * This is a discriminated union based on type:
 * - PLATFORM_USER: Platform user context (orgId = null, cross-org access)
 * - ORG_USER: Org user context (orgId = string, single-org access)
 * - DEBTOR_USER: Debtor user context (userId + organizationIds array, multi-org self-access)
 *
 * This ensures type safety - you cannot mix platform, org, and debtor permissions.
 */
export type ActiveContext =
  | PlatformUserContext
  | OrganizationUserContext
  | DebtorUserContext;

/**
 * Context for platform users
 * Platform users operate without organizational affiliation
 */
export interface PlatformUserContext {
  /** Discriminator for type narrowing */
  type: 'PLATFORM_USER';

  /** Always null for platform users */
  orgId: null;

  /** Platform-level roles (PLATFORM_ADMIN, PLATFORM_SUPPORT, etc.) */
  roles: PlatformRole[];

  /** Platform-level permissions (platform:orgs:create, etc.) */
  permissions: PlatformPermission[];
}

/**
 * Context for organization users
 * Org users operate within a specific organization
 */
export interface OrganizationUserContext {
  /** Discriminator for type narrowing */
  type: 'ORG_USER';

  /** The organization ID this user belongs to */
  orgId: string;

  /** Organization-scoped roles (ORG_ADMIN, ORG_MANAGER, etc.) */
  roles: OrganizationRole[];

  /** Organization-scoped permissions (orgs:read, users:write, etc.) */
  permissions: OrganizationPermission[];
}

/**
 * Context for debtor users
 * Debtors can access their own data across multiple organizations
 *
 * CRITICAL SECURITY:
 * - Debtors ONLY access data where debtor_user_id = userId
 * - organizationIds limits scope to orgs they have memberships in
 * - Cannot access other debtors' data, even in same orgs
 */
export interface DebtorUserContext {
  /** Discriminator for type narrowing */
  type: 'DEBTOR_USER';

  /** The debtor's user ID (used for ownership checks) */
  userId: string;

  /**
   * Array of organization IDs the debtor has debts with
   * Queries filter: WHERE debtor_user_id = userId AND org_id IN (organizationIds)
   */
  organizationIds: string[];

  /** Debtor-specific permissions (all self-scoped) */
  permissions: DebtorPermission[];
}

// Legacy aliases for backward compatibility (where needed during migration)
export type PlatformAdminContext = PlatformUserContext;
export type DebtorContext = DebtorUserContext;