/**
 * Work queue item status enumeration
 * Tracks the lifecycle state of a work queue item
 */
export enum WorkQueueItemStatus {
  /**
   * New item, not yet actioned
   */
  NEW = 'NEW',

  /**
   * Collector is actively working this item
   */
  IN_PROGRESS = 'IN_PROGRESS',

  /**
   * Follow-up has been scheduled for this item
   */
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',

  /**
   * Work on this item is complete
   */
  COMPLETED = 'COMPLETED',

  /**
   * Item has been deferred to a future date
   */
  DEFERRED = 'DEFERRED',

  /**
   * Item was skipped by collector
   */
  SKIPPED = 'SKIPPED',

  /**
   * Item is on hold pending resolution
   */
  ON_HOLD = 'ON_HOLD',
}
