/**
 * Email Reply Received Event Payload
 *
 * Published when a debtor replies to an email sent by the collection system.
 * This is a strong engagement signal indicating the debtor is actively communicating.
 *
 * Consumers: api-collectors (record response, update tracking)
 */
export interface EmailReplyReceivedPayload {
  /**
   * UUID of the original communication log entry that was replied to
   */
  logId: string;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor who sent the reply
   */
  debtorId: string;

  /**
   * Timestamp when reply was received (ISO 8601)
   */
  repliedAt: string;

  /**
   * Subject line of the reply email
   */
  subject?: string;

  /**
   * Reply content/body (may be truncated for event size)
   */
  replyContent?: string;

  /**
   * Email address the reply was sent from
   */
  fromEmail: string;

  /**
   * Email address the reply was sent to (collector's address)
   */
  toEmail: string;

  /**
   * Provider message ID for tracking
   */
  providerMessageId?: string;
}
