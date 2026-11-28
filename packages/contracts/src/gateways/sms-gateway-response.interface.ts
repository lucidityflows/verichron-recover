/**
 * Defines the standardized response structure from an SMS gateway.
 */
export interface SmsGatewayResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
