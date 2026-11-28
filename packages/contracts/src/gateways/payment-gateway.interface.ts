/**
 * Defines the contract for a generic payment provider service.
 */
import type { PaymentGatewayResponse } from './payment-gateway-response.interface';
import type { ProcessPaymentPayload } from './process-payment-payload.interface';
import type { ProcessRefundPayload } from './process-refund-payload.interface';

export interface IPaymentProvider {
  /**
   * Processes a payment charge.
   * @param payload The payment details.
   * @returns A standardized payment gateway response.
   */
  charge(payload: ProcessPaymentPayload): Promise<PaymentGatewayResponse>;

  /**
   * Processes a refund.
   * @param payload The refund details.
   * @returns A standardized payment gateway response.
   */
  refund(payload: ProcessRefundPayload): Promise<PaymentGatewayResponse>;
}
