/**
 * Organization lifecycle status
 */
export enum OrganizationStatus {
  /**
   * Organization is being provisioned (initial setup in progress)
   */
  PROVISIONING = 'PROVISIONING',

  /**
   * Organization is active and operational
   */
  ACTIVE = 'ACTIVE',

  /**
   * Organization has been deactivated (soft delete)
   */
  INACTIVE = 'INACTIVE',

  /**
   * Organization access has been suspended (e.g., non-payment, TOS violation)
   */
  SUSPENDED = 'SUSPENDED',

  /**
   * Organization provisioning or operation has failed
   */
  FAILED = 'FAILED',
}
