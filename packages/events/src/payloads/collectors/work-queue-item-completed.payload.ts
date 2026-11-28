import { ResolutionType } from '@verichron/enums';

/**
 * Payload for COLLECTORS.WORK_QUEUE_ITEM_COMPLETED event
 * Published when a work queue item is resolved/completed.
 * Consumers: api-collectors (response tracking), api-analytics
 */
export interface WorkQueueItemCompletedPayload {
  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the completed work queue item
   */
  workQueueItemId: string;

  /**
   * UUID of the debtor associated with the work queue item
   */
  debtorId: string;

  /**
   * UUID of the collector user who completed the item
   */
  collectorUserId: string;

  /**
   * Timestamp when item was completed (ISO 8601)
   */
  completedAt: string;

  /**
   * How the item was resolved
   */
  resolutionType: ResolutionType;

  /**
   * Optional outcome description
   */
  outcome?: string;
}
