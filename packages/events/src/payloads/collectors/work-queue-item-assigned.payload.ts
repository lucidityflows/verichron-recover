/**
 * Payload for COLLECTORS.WORK_QUEUE_ITEM_ASSIGNED event
 * Published by: api-automations or api-collectors (manual)
 * Consumed by: api-collectors (response tracking), api-notifications
 */
export interface WorkQueueItemAssignedPayload {
  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the collector user assigned to the item
   */
  collectorId: string;

  /**
   * UUID of the target entity (debtor or account)
   */
  targetEntityId: string;

  /**
   * Type of target entity
   */
  targetEntityType: 'DEBTOR' | 'ACCOUNT';

  /**
   * System or user who performed the assignment
   */
  assignedBy: string;

  /**
   * Reason for assignment (description or strategy name)
   */
  assignmentReason: string;
}
