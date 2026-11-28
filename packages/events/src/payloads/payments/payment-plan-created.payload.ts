import { PaymentFrequency } from '@verichron/enums';

/**
 * Payload for TRANSACTIONS.PAYMENT_PLAN_CREATED event
 * Published by: api-transactions
 * Consumed by: api-collectors (response tracking), api-analytics
 */
export interface PaymentPlanCreatedPayload {
  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor (internal ID)
   */
  debtorId: string;

  /**
   * UUID of the debtor profile
   */
  debtorProfileId: string;

  /**
   * UUID of the payment plan
   */
  paymentPlanId: string;

  /**
   * Start date of the plan (ISO 8601)
   */
  startDate: string;

  /**
   * End date of the plan (ISO 8601)
   */
  endDate: string;

  /**
   * Amount of each installment (in cents)
   */
  installmentAmount: number;

  /**
   * Payment frequency (e.g., weekly, monthly)
   */
  frequency: PaymentFrequency;

  /**
   * Total amount of the payment plan (in cents)
   */
  totalAmount: number;

  /**
   * Timestamp when plan was created (ISO 8601)
   */
  createdAt: string;
}
