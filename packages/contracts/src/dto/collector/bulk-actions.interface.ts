import { BulkActionType, WorkQueuePriority } from '@verichron/enums';

/**
 * Request to perform bulk action on work queue items
 */
export interface IBulkAction {
  itemIds: string[];
  actionType: BulkActionType;
  assignData?: IBulkAssignData;
  tagData?: IBulkTagData;
  deferData?: IBulkDeferData;
  priorityData?: IBulkPriorityData;
}

/**
 * Bulk assignment data
 */
export interface IBulkAssignData {
  assignToUserId: string;
}

/**
 * Bulk tag data
 */
export interface IBulkTagData {
  tags: string[];
}

/**
 * Bulk defer data
 */
export interface IBulkDeferData {
  deferUntil: Date;
  reason: string;
}

/**
 * Bulk priority change data
 */
export interface IBulkPriorityData {
  priority: WorkQueuePriority;
}

/**
 * Response after bulk action
 */
export interface IBulkActionResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
}
