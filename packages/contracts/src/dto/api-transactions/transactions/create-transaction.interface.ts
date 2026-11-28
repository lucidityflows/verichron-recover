/**
 * Contract interface for creating a one-time payment transaction.
 *
 * All payment methods must be tokenized client-side before submission.
 */
export interface ICreateTransaction {
  /**
   * UUID of the debt account this payment applies to
   */
  debtId: string;

  /**
   * UUID of the debtor making the payment (optional)
   */
  debtorId?: string;

  /**
   * Payment amount in USD (must be positive with up to 2 decimal places)
   */
  amount: number;

  /**
   * Tokenized payment method reference (e.g., from Stripe.js tokenization)
   * NEVER send raw card data
   */
  paymentMethodToken: string;

  /**
   * Optional metadata to attach to the transaction (e.g., IP address, user agent)
   */
  metadata?: Record<string, any>;
}
