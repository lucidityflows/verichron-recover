/**
 * Defines the standardized response structure from an email gateway.
 */
export interface EmailGatewayResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
