

/**
 * Payload for DebtorCreated event
 * Published by api-debtors when a new debtor profile is created
 */
export interface DebtorCreatedPayload {
  /** Unique debtor identifier */
  debtorId: string;
  
  /** Organization that has access to this debtor */
  organizationId: string;
  
  /** Timestamp when debtor was created */
  createdAt: string;
}