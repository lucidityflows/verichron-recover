import { CallbackRequestSource, WorkQueuePriority } from '@verichron/enums';

/**
 * Callback Requested Event Payload
 *
 * Published when a debtor requests a callback, either through:
 * - Replying to SMS/email with callback keywords
 * - Using IVR callback option during voice call
 * - Submitting callback request through debtor portal
 *
 * This is a strong engagement signal and requires collector follow-up.
 *
 * Consumers: api-collectors (record response, create task), api-workflows (auto-assignment)
 */
export interface CallbackRequestedPayload {
  /**
   * UUID of the original communication (if callback was requested via email/SMS reply)
   * Null if requested through other channels (portal, IVR)
   */
  logId: string | null;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the debtor requesting callback
   */
  debtorId: string;

  /**
   * Timestamp when callback was requested (ISO 8601)
   */
  requestedAt: string;

  /**
   * Source channel where callback was requested
   */
  requestSource: CallbackRequestSource;

  /**
   * Phone number to call back (may differ from primary contact)
   */
  callbackPhone?: string;

  /**
   * Preferred callback time/window requested by debtor
   */
  preferredCallbackTime?: string;

  /**
   * Reason for callback or debtor's message
   */
  callbackReason?: string;

  /**
   * Urgency level of callback request
   */
  urgency?: WorkQueuePriority;

  /**
   * Additional metadata (e.g., IVR option selected, portal form data)
   */
  metadata?: Record<string, any>;
}
