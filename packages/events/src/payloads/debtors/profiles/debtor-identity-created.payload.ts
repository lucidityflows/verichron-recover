/**
 * Payload for DebtorIdentityCreated event
 * Published by api-debtors when a new debtor identity is created
 */
export interface DebtorIdentityCreatedPayload {
  /** Unique identity identifier */
  identityId: string;

  /** Optional user ID if identity is linked to a user account */
  userId?: string;

  /** Timestamp when identity was created */
  createdAt: string;
}
