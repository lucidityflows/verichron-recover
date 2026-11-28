/**
 * Defines the structure for an email payload to be sent via a gateway.
 */
export interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  customArgs?: Record<string, string>;
}
