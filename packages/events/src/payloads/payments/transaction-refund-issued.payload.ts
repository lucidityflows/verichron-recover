/**
 * Refund Issued Event Payload
 * 
 * Published when a refund transaction is successfully processed.
 * Consumers: api-debts (update debt balance), api-communications (send confirmation)
 */
export interface TransactionRefundIssuedPayload {
  /**
   * UUID of the refund transaction
   */
  refundTransactionId: string;

  /**
   * UUID of the original payment transaction being refunded
   */
  originalTransactionId: string;

  /**
   * UUID of the organization that owns this refund
   */
  organizationId: string;

  /**
   * UUID of the debt account the refund applies to (if applicable)
   */
  debtId: string | null;

  /**
   * UUID of the debtor receiving the refund (nullable)
   */
  debtorId: string | null;

  /**
   * Refund amount issued
   */
  amount: number;

  /**
   * Reason for the refund
   */
  reason: string;

  /**
   * External gateway refund ID for reference (nullable)
   */
  gatewayRefundId: string | null;

  /**
   * Timestamp when the refund was issued
   */
  issuedAt: string;
}