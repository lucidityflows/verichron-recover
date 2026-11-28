import type { SmsGatewayResponse } from './sms-gateway-response.interface';
import type { SmsPayload } from './sms-payload.interface';

export interface ISmsGateway {
  send(payload: SmsPayload): Promise<SmsGatewayResponse>;

  /**
   * Verifies the signature of an incoming webhook request.
   * This is optional as the verification may be handled in a dedicated controller or middleware.
   * @param url The full request URL.
   * @param params The request parameters or body.
   * @param signature The signature from the request headers.
   * @returns True if the signature is valid, false otherwise.
   */
  verifyWebhookSignature?(url: string, params: any, signature: string): boolean;
}
