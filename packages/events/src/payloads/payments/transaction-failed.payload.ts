/**
 * Transaction Failed Event Payload
 * 
 * Published when a payment transaction fails to process.
 * Consumers: api-communications (notify debtor), plans module (retry logic)
 */
export interface TransactionFailedPayload {
  /**
   * UUID of the failed transaction
   */
  transactionId: string;

  /**
   * UUID of the organization that owns this transaction
   */
  organizationId: string;

  /**
   * UUID of the debt account the payment was for (if applicable)
   */
  debtId: string | null;

  /**
   * UUID of the payment plan this transaction belongs to (if applicable)
   */
  paymentPlanId: string | null;

  /**
   * UUID of the debtor who attempted the payment (nullable)
   */
  debtorId: string | null;

  /**
   * Payment amount that failed to process
   */
  amount: number;

  /**
   * Reason for the failure from the payment gateway (nullable)
   */
  failureReason: string | null;

  /**
   * Timestamp when the payment failed
   */
  failedAt: string;
}

