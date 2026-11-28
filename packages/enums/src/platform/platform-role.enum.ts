/**
 * Platform-level roles
 *
 * Platform admins operate without organizational context (organizationId = null).
 * These roles have system-wide access and can manage the entire platform.
 */
export enum PlatformRole {
  /**
   * Platform administrator - full system access
   * Can onboard new organizations, manage all users, access all data
   */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',

  /**
   * Platform viewer - read-only system access
   * Can view all organizations and data but cannot make changes
   */
  PLATFORM_VIEWER = 'PLATFORM_VIEWER',

  /**
   * Platform support staff - limited system access
   * Can assist with support requests and view organization data
   */
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
}
