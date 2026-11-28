import type { GatewayResponse } from './gateway-response.interface';
import type { ProcessPaymentDto } from './process-payment.dto';

/**
 * Payment Provider Interface
 *
 * Contract that all payment gateway providers must implement.
 * This allows for easy swapping of payment providers (Stripe, PayPal, Plaid, etc.)
 * without changing business logic.
 *
 * Design Pattern: Strategy Pattern
 * - Defines a family of algorithms (payment providers)
 * - Makes them interchangeable
 * - Allows the algorithm to vary independently from clients that use it
 */
export interface IPaymentProvider {
  /**
   * Process a payment charge
   *
   * @param paymentDto Payment details
   * @returns Standardized gateway response
   */
  charge(paymentDto: ProcessPaymentDto): Promise<GatewayResponse>;

  /**
   * Process a refund
   *
   * @param refundDto Refund details
   * @returns Standardized gateway response
   */
  refund(refundDto: any): Promise<GatewayResponse>;

  /**
   * Verify webhook signature (optional - not all providers have webhooks)
   *
   * @param payload Raw request body
   * @param signature Signature header value
   * @returns Parsed and verified event
   */
  verifyWebhookSignature?(payload: string | Buffer, signature: string): any;
}
