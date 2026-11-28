/**
 * Payment Status Enum
 *
 * Defines the lifecycle states of a payment.
 * Transitions: PENDING → PROCESSING → SUCCEEDED/FAILED
 * SUCCEEDED transactions can later become REFUNDED
 */
export enum PaymentStatus {
  /**
   * Payment has been created but not yet sent to gateway
   */
  PENDING = 'PENDING',

  /**
   * Payment is being processed by the payment gateway
   */
  PROCESSING = 'PROCESSING',

  /**
   * Payment completed successfully
   * This is an immutable terminal state (except for refunds)
   */
  SUCCEEDED = 'SUCCEEDED',

  /**
   * Payment failed (declined, error, etc.)
   * This is an immutable terminal state
   */
  FAILED = 'FAILED',

  /**
   * Original payment transaction that has been refunded
   * Applied to SUCCEEDED transactions after a refund is processed
   */
  REFUNDED = 'REFUNDED',
}
