/**
 * Transaction Succeeded Event Payload
 * 
 * Published when a payment transaction completes successfully.
 * Consumers: api-debts (update debt balance), api-communications (send receipt)
 */
export interface TransactionSucceededPayload {
  /**
   * UUID of the successful transaction
   */
  transactionId: string;

  /**
   * UUID of the organization that owns this transaction
   */
  organizationId: string;

  /**
   * UUID of the debt account the payment applied to (if applicable)
   */
  debtId: string | null;

  /**
   * UUID of the payment plan this transaction belongs to (if applicable)
   */
  paymentPlanId: string | null;

  /**
   * UUID of the debtor who made the payment (nullable)
   */
  debtorId: string | null;

  /**
   * Payment amount that was successfully processed
   */
  amount: number;

  /**
   * External gateway transaction ID for reference (nullable)
   */
  gatewayTransactionId: string | null;

  /**
   * Timestamp when the payment succeeded
   */
  succeededAt: string;
}

