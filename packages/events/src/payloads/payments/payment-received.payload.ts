import { PaymentMethod } from '@verichron/enums';

/**
 * Payload for PaymentReceived event
 * Published when a payment is successfully received and processed.
 * Consumers: api-collectors (response tracking), api-workflows
 */
export interface PaymentReceivedPayload {
  /**
   * UUID of the payment/transaction
   */
  paymentId: string;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor who made the payment
   */
  debtorId: string;

  /**
   * UUID of the specific debt this payment applies to
   */
  debtId: string;

  /**
   * Payment amount (in cents)
   */
  amount: number;

  /**
   * Currency code (ISO 4217)
   */
  currency: string;

  /**
   * Method of payment (e.g., VISA, ACH, CASH)
   */
  paymentMethod: PaymentMethod;

  /**
   * Timestamp when payment was received (ISO 8601)
   */
  receivedAt: string;
}