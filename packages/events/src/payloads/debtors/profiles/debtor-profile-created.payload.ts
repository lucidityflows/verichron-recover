/**
 * Payload for DebtorProfileCreated event
 * Published by api-debtors when a new debtor profile is created
 */
export interface DebtorProfileCreatedPayload {
  /** Unique profile identifier */
  profileId: string;

  /** Identity this profile belongs to */
  identityId: string;

  /** Organization that owns this profile */
  organizationId: string;

  /** Timestamp when profile was created */
  createdAt: string;
}
