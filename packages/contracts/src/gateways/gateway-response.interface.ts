/**
 * Gateway Response Interface
 * 
 * Standardized response format from payment gateway operations.
 * Used to abstract provider-specific responses into a common format.
 */
export interface GatewayResponse {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Gateway's unique transaction ID (e.g., Stripe charge ID)
   * Present on successful payment operations
   */
  transactionId?: string;

  /**
   * Gateway's unique refund ID (e.g., Stripe refund ID)
   * Present on successful refund operations
   */
  refundId?: string;

  /**
   * Human-readable failure reason if operation failed
   */
  failureReason?: string;

  /**
   * Raw response from the gateway for debugging purposes
   * Should not be exposed to end users
   */
  rawResponse?: any;
}