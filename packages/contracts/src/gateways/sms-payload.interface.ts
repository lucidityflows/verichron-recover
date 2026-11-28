/**
 * Defines the structure for an SMS payload to be sent via a gateway.
 */
export interface SmsPayload {
  to: string;
  body: string;
  from?: string;
}
