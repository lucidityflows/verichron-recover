/**
 * Communication Opened Event Payload
 *
 * Published when a webhook from SendGrid reports that the tracking pixel in an email
 * has been fired (email only). This is a powerful signal for engagement tracking.
 *
 * Consumers: api-collectors (prioritize follow-ups), analytics systems
 */
export interface CommunicationOpenedPayload {
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
   * Timestamp when opened (ISO 8601)
   */
  openedAt: string;

  /**
   * IP address of the recipient (if available)
   */
  ipAddress?: string;

  /**
   * User agent string (if available)
   */
  userAgent?: string;
}
