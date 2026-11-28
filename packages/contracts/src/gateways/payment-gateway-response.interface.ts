/**
 * Defines the standardized response structure from a payment gateway.
 */
export interface PaymentGatewayResponse {
  success: boolean;
  transactionId?: string; // ID for a successful charge or refund
  failureReason?: string;
  rawResponse?: any; // Raw response object from the third-party provider
}
