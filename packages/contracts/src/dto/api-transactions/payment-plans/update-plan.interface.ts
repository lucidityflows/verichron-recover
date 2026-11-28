import type { PaymentFrequency } from "@verichron/enums";

/**
 * Contract interface for updating an existing payment plan.
 *
 * Only DRAFT plans can be updated.
 * All fields are optional (partial update).
 */
export interface IUpdatePlan {
  /**
   * Array of debt UUIDs to consolidate into this payment plan
   */
  debtIds?: string[];

  /**
   * Number of installment payments
   */
  numberOfInstallments?: number;

  /**
   * Payment frequency for scheduled installments
   */
  frequency?: PaymentFrequency;

  /**
   * Date of the first scheduled payment (must be a future date)
   */
  startDate?: string;

  /**
   * Tokenized payment method for scheduled payments
   */
  paymentMethodToken?: string;

  /**
   * Optional metadata to attach to the payment plan
   */
  metadata?: Record<string, any>;
}
