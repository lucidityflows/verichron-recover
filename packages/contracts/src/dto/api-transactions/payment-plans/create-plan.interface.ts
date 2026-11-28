import type { PaymentFrequency } from "@verichron/enums";

/**
 * Contract interface for creating a payment plan.
 *
 * Supports multi-debt consolidation via debtIds array.
 * The total amount and installment amount are calculated by the service.
 */
export interface ICreatePlan {
  /**
   * Array of debt UUIDs to consolidate into this payment plan
   */
  debtIds: string[];

  /**
   * Number of installment payments
   */
  numberOfInstallments: number;

  /**
   * Payment frequency for scheduled installments
   */
  frequency: PaymentFrequency;

  /**
   * Date of the first scheduled payment (must be a future date)
   */
  startDate: string;

  /**
   * Tokenized payment method for scheduled payments (from Stripe.js or similar)
   */
  paymentMethodToken: string;

  /**
   * Optional down payment amount to be charged immediately upon plan activation
   */
  downPayment?: number;

  /**
   * Optional metadata to attach to the payment plan
   */
  metadata?: Record<string, any>;
}
