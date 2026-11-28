import { CommunicationType, CommunicationProvider } from '@verichron/enums';

/**
 * Communication Dispatched Event Payload
 *
 * Published when a message is successfully handed off to a gateway (e.g., SendGrid, Twilio).
 * This is the first step in the communication audit trail.
 *
 * Consumers: api-collectors (track outreach), analytics systems
 */
export interface CommunicationDispatchedPayload {
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
   * Type of communication
   */
  type: CommunicationType;

  /**
   * Provider used for dispatch
   */
  provider: CommunicationProvider;

  /**
   * Provider-specific message ID for tracking
   */
  providerMessageId: string;

  /**
   * Timestamp when dispatched (ISO 8601)
   */
  dispatchedAt: string;

  /**
   * Optional collector user ID if this was a collector-initiated communication
   */
  collectorUserId?: string;
}
