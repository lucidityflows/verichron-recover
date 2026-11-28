/**
 * Payload for DebtorEmailUpdated event
 * Published by api-debtors when a debtor email changes
 */
export interface DebtorEmailUpdatedPayload {
  /** Unique debtor profile identifier */
  debtorProfileId: string;

  /** Email record identifier */
  emailId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when email was updated */
  updatedAt: string;

  /** Whether this is now the primary email */
  isPrimary: boolean;
}
