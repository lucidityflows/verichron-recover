

/**
 * Payload for DebtorAddressUpdated event
 * Published by api-debtors when a debtor address changes
 */
export interface DebtorAddressUpdatedPayload {
  /** Unique debtor profile identifier */
  debtorProfileId: string;

  /** Address record identifier */
  addressId: string;

  /** Organization context */
  organizationId: string;

  /** Timestamp when address was updated */
  updatedAt: string;

  /** Whether this is now the primary address */
  isPrimary: boolean;
}