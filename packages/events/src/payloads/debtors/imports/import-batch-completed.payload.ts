/**
 * Debtor mapping for a successfully processed debtor
 */
export interface DebtorMapping {
  /** Idempotency key used during import */
  debtorKey: string;

  /** DebtorIdentity ID (global unique identity) */
  debtorIdentityId: string;

  /** DebtorProfile ID (organization-specific profile) */
  debtorProfileId: string;

  /** Debt IDs associated with this debtor */
  debtIds: string[];

  /** Whether a new DebtorIdentity was created */
  isNewIdentity: boolean;

  /** Whether a new DebtorProfile was created */
  isNewProfile: boolean;
}

/**
 * Error information for a failed debtor
 */
export interface DebtorProcessingError {
  /** Idempotency key of the failed debtor */
  debtorKey: string;

  /** Error message */
  error: string;

  /** Debt IDs that couldn't be linked */
  debtIds: string[];

  /** Whether this error is retryable */
  willRetry: boolean;
}

/**
 * Payload for ImportBatchCompleted event
 * Published by api-debtors when a batch of debtors from a portfolio import has been processed
 */
export interface ImportBatchCompletedPayload {
  /** Import job identifier from api-debts */
  importJobId: string;

  /** Organization importing the portfolio */
  organizationId: string;

  /** Portfolio being imported */
  portfolioId: string;

  /** Batch number (0-indexed) */
  batchNumber: number;

  /** Total debtors in this batch */
  totalProcessed: number;

  /** Number of debtors successfully created/updated */
  successCount: number;

  /** Number of debtors that failed processing */
  failureCount: number;

  /** Mappings of debtors to identities and profiles */
  debtorMappings: DebtorMapping[];

  /** Errors that occurred during processing */
  errors: DebtorProcessingError[];

  /** Timestamp when batch completed */
  completedAt: string;
}
