/**
 * User account status enum
 * Used across the users microservice to track user account states
 *
 * - PENDING: User was explicitly invited and must activate with invitation token
 * - PROVISIONAL: User was auto-created for debtor invitation, awaiting acceptance
 * - ACTIVE: User has activated their account and can log in
 * - INACTIVE: User account has been deactivated
 * - SUSPENDED: User account has been suspended
 */
export enum UserStatus {
    PENDING = 'PENDING',
    PROVISIONAL = 'PROVISIONAL',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED'
}