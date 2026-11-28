/**
 * Contract interface for creating a scheduled payment transaction.
 *
 * Internal interface for creating scheduled payment transactions.
 * Called by the payment plans module, not directly by API clients.
 */
export interface ICreateScheduledPayment {
  /**
   * Payment plan UUID
   */
  paymentPlanId: string;

  /**
   * Debt UUID (optional - can be retrieved from plan)
   */
  debtId?: string;

  /**
   * Debtor UUID (optional - can be retrieved from plan)
   */
  debtorId?: string;

  /**
   * Payment amount (typically the installment amount)
   */
  amount: number;

  /**
   * Tokenized payment method from the payment plan
   */
  paymentMethodToken: string;
}
