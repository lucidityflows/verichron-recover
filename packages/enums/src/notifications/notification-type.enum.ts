/**
 * Notification type enumeration
 * Defines the types of notifications that can be sent to collectors
 */
export enum NotificationType {
  /**
   * New work queue item has been assigned to collector
   */
  WORK_ITEM_ASSIGNED = 'WORK_ITEM_ASSIGNED',

  /**
   * High-priority item added to queue
   */
  HIGH_PRIORITY_ITEM = 'HIGH_PRIORITY_ITEM',

  /**
   * Follow-up action is due soon
   */
  FOLLOW_UP_DUE = 'FOLLOW_UP_DUE',

  /**
   * Manager has escalated an item to collector
   */
  MANAGER_ESCALATION = 'MANAGER_ESCALATION',

  /**
   * Collector achieved a performance milestone
   */
  PERFORMANCE_MILESTONE = 'PERFORMANCE_MILESTONE',

  /**
   * Work queue item has been reassigned to another collector
   */
  WORK_ITEM_REASSIGNED = 'WORK_ITEM_REASSIGNED',

  /**
   * Payment received on assigned account
   */
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',

  /**
   * Debtor responded to outreach
   */
  DEBTOR_RESPONSE = 'DEBTOR_RESPONSE',
}
