/**
 * Available sorting options for work queue items
 */
export enum WorkQueueSortBy {
  /**
   * Sort by calculated priority score (default)
   */
  PRIORITY_SCORE = 'PRIORITY_SCORE',

  /**
   * Sort by total balance owed
   */
  TOTAL_BALANCE = 'TOTAL_BALANCE',

  /**
   * Sort by days overdue
   */
  DAYS_OVERDUE = 'DAYS_OVERDUE',

  /**
   * Sort by next scheduled action due date
   */
  NEXT_ACTION_DUE = 'NEXT_ACTION_DUE',

  /**
   * Sort by last contact date (oldest first)
   */
  LAST_CONTACT_DATE = 'LAST_CONTACT_DATE',
}
