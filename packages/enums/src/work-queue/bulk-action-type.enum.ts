/**
 * Bulk action types available for work queue items
 */
export enum BulkActionType {
  /**
   * Assign items to a specific collector
   */
  ASSIGN = 'ASSIGN',

  /**
   * Mark selected items as complete
   */
  MARK_COMPLETE = 'MARK_COMPLETE',

  /**
   * Add tags to selected items
   */
  ADD_TAG = 'ADD_TAG',

  /**
   * Remove tags from selected items
   */
  REMOVE_TAG = 'REMOVE_TAG',

  /**
   * Defer items to a future date
   */
  DEFER = 'DEFER',

  /**
   * Skip selected items
   */
  SKIP = 'SKIP',

  /**
   * Change priority level of items
   */
  CHANGE_PRIORITY = 'CHANGE_PRIORITY',
}
