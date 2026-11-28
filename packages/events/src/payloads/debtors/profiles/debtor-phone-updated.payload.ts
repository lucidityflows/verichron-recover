/**
 * Payload for DebtorPhoneUpdated event
 * Published by api-debtors when a debtor phone changes
 */
export interface DebtorPhoneUpdatedPayload {
  /** Unique debtor profile identifier */
  debtorProfileId: string;

  /** Phone record identifier */
  phoneId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when phone was updated */
  updatedAt: string;

  /** Whether this is now the primary phone */
  isPrimary: boolean;
}
