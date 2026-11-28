/**
 * Defines the payload structure for processing a payment through a gateway.
 */
export interface ProcessPaymentPayload {
  amount: number;
  currency?: string;
  paymentMethodToken: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}
