/**
 * Communication Clicked Event Payload
 *
 * Published when a webhook from SendGrid reports that a recipient has clicked a tracked link
 * (email only). This tracks a higher level of engagement.
 *
 * Consumers: api-collectors (prioritize follow-ups), analytics systems (measure CTA effectiveness)
 */
export interface CommunicationClickedPayload {
  /**
   * UUID of the communication log entry
   */
  logId: string;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor
   */
  debtorId: string;

  /**
   * Timestamp when clicked (ISO 8601)
   */
  clickedAt: string;

  /**
   * URL that was clicked
   */
  url: string;
}
