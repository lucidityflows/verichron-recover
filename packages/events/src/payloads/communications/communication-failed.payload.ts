import { CommunicationProvider } from '@verichron/enums';

/**
 * Communication Failed Event Payload
 *
 * Published when a webhook from a gateway reports a permanent delivery failure
 * (e.g., invalid email, unreachable number), or if the initial dispatch to the gateway fails.
 *
 * Consumers: api-collectors (flag invalid contact), api-debtors (update contact info status)
 */
export interface CommunicationFailedPayload {
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
   * Provider that reported failure
   */
  provider: CommunicationProvider;

  /**
   * Timestamp when failure occurred (ISO 8601)
   */
  failedAt: string;

  /**
   * Human-readable failure reason
   */
  reason: string;

  /**
   * Provider-specific error code (if available)
   */
  errorCode?: string;

  /**
   * Whether this failure is retryable
   */
  isRetryable: boolean;
}
