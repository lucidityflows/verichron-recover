

/**
 * Payload for DebtorUpdated event
 * Published by api-debtors when a debtor profile is modified
 */
export interface DebtorUpdatedPayload {
  /** Unique debtor identifier */
  debtorId: string;
  
  /** Organization context for the update */
  organizationId: string;
  
  /** Timestamp when debtor was updated */
  updatedAt: string;
  
  /** Fields that were updated */
  updatedFields: string[];
}