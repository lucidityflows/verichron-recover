import { CommunicationProvider } from '@verichron/enums';

/**
 * Communication Delivered Event Payload
 *
 * Published when a webhook from a gateway confirms successful delivery to the recipient's
 * device or mail server. This is a key metric for deliverability.
 *
 * Consumers: api-collectors (engagement tracking), analytics systems
 */
export interface CommunicationDeliveredPayload {
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
   * Provider that confirmed delivery
   */
  provider: CommunicationProvider;

  /**
   * Timestamp when delivered (ISO 8601)
   */
  deliveredAt: string;
}
