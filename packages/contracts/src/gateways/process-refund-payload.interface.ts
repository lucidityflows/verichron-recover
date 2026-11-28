/**
 * Defines the payload structure for processing a refund through a gateway.
 */
export interface ProcessRefundPayload {
  amount: number;
  originalGatewayTransactionId: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}
