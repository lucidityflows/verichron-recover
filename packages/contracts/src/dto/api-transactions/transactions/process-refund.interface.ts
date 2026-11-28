/**
 * Contract interface for processing a refund.
 *
 * If amount is not specified, the full original transaction amount will be refunded.
 */
export interface IProcessRefund {
  /**
   * Amount to refund (defaults to full transaction amount if not specified)
   */
  amount?: number;

  /**
   * Reason for issuing the refund
   */
  reason: string;
}
