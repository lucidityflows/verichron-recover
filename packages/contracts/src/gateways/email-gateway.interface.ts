import type { EmailGatewayResponse } from './email-gateway-response.interface';
import type { EmailPayload } from './email-payload.interface';

export interface IEmailGateway {
  send(payload: EmailPayload): Promise<EmailGatewayResponse>;

  /**
   * Verifies the signature of an incoming webhook request.
   * This is optional as the verification may be handled in a dedicated controller or middleware.
   * @param body The raw request body.
   * @param signature The signature from the request headers.
   * @returns True if the signature is valid, false otherwise.
   */
  verifyWebhookSignature?(body: any, signature: string): boolean;
}
