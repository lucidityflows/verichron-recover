/**
 * SMS Reply Received Event Payload
 *
 * Published when a debtor replies to an SMS sent by the collection system.
 * This is a strong engagement signal indicating the debtor is actively communicating.
 *
 * Consumers: api-collectors (record response, update tracking)
 */
export interface SmsReplyReceivedPayload {
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
   * Reply message content
   */
  replyContent: string;

  /**
   * Phone number the reply was sent from (debtor's phone)
   */
  fromPhone: string;

  /**
   * Phone number the reply was sent to (collector's number)
   */
  toPhone: string;

  /**
   * Provider message SID/ID for tracking
   */
  providerMessageId?: string;

  /**
   * Media URLs if debtor sent MMS with attachments
   */
  mediaUrls?: string[];
}
