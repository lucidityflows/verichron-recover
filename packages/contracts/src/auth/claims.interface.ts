import {
  OrganizationRole,
  OrganizationPermission,
  UserType,
  DebtorPermission,
  PlatformRole,
  PlatformPermission
} from '@verichron/enums';


/**
 * The namespaced location for custom claims within the JWT payload.
 * Using a URI controlled by the application is a standard practice to prevent claim collisions.
 */
export const JWT_CLAIMS_NAMESPACE = 'https://verichroninc.com/claims';

/**
 * Defines the structure of the custom claims object inside the JWT.
 *
 * For ORG_USER tokens:
 * - organizationId: the user's organization (singular)
 * - roles: organization-scoped roles (ORG_ADMIN, ORG_MANAGER, etc.)
 * - permissions: organization-scoped permissions (orgs:read, users:write, etc.)
 *
 * For PLATFORM_USER tokens:
 * - organizationId: null (no org affiliation)
 * - platformRoles: platform-level roles (PLATFORM_ADMIN, PLATFORM_SUPPORT, etc.)
 * - platformPermissions: platform-level permissions (platform:orgs:create, etc.)
 *
 * For DEBTOR_USER tokens:
 * - organizationIds: array of organizations debtor has debts with (multi-org)
 * - debtorPermissions: debtor-specific permissions (debtor:self:read, etc.)
 * - isDebtor: flag for guard logic (always true for DEBTOR_USER userType)
 */
export interface CustomJWTClaims {
  /** Organization ID for org-scoped users, null for platform users */
  organizationId?: string | null;

  /** Organization IDs array for debtor users (multi-org access) */
  organizationIds?: string[];

  /** Organization-scoped roles (for ORG_USER tokens) */
  roles?: OrganizationRole[];

  /** Organization-scoped permissions (for ORG_USER tokens) */
  permissions?: OrganizationPermission[];

  /** Platform-level roles (for PLATFORM_USER tokens) */
  platformRoles?: PlatformRole[];

  /** Platform-level permissions (for PLATFORM_USER tokens) */
  platformPermissions?: PlatformPermission[];

  /** Debtor-specific permissions (for DEBTOR_USER tokens) */
  debtorPermissions?: DebtorPermission[];

  /** Flag indicating this is a debtor token (for DEBTOR_USER userType) */
  isDebtor?: boolean;
}

/**
 * Defines the complete structure of the JWT payload issued by the auth service.
 */
export interface JWTPayload {
  /** Subject (whom the token refers to - the user ID) */
  sub: string;

  /** User's email address (OIDC standard claim) */
  email: string;

  /** User's full name (OIDC standard claim) */
  name: string;

  /** Custom user type for client-side routing */
  userType: UserType;

  /** Issued at time (seconds since Unix epoch) - automatically added by JWT library */
  iat?: number;

  /** Expiration time (seconds since Unix epoch) - automatically added by JWT library */
  exp?: number;

  /** The namespaced object containing all custom Verichron claims */
  [JWT_CLAIMS_NAMESPACE]: CustomJWTClaims;
}
