/**
 * Defines the high-level type of a user account.
 * This is used in the JWT `userType` claim for broad client-side routing.
 */
export enum UserType {
  /** A user who operates at the SaaS platform level (Platform Admin, Support). */
  PLATFORM_USER = 'PLATFORM_USER',

  /** A user who is an employee or member of an organization. */
  ORG_USER = 'ORG_USER',

  /** A user who is a debtor, managing their own debts. */
  DEBTOR_USER = 'DEBTOR_USER',
}