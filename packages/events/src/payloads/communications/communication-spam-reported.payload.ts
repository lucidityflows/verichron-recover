/**
 * Communication Spam Reported Event Payload
 *
 * Published when a webhook from SendGrid indicates a recipient has marked an email as spam.
 * Provides critical feedback signal for deliverability and list health.
 *
 * Consumers: api-debtors (auto-add to do-not-contact), analytics systems (deliverability metrics)
 */
export interface CommunicationSpamReportedPayload {
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
   * Timestamp when spam report occurred (ISO 8601)
   */
  reportedAt: string;
}
