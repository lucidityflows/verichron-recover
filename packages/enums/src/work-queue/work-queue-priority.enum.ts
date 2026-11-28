/**
 * Work queue item priority levels
 * Used for visual indicators and sorting in the collector workstation
 */
export enum WorkQueuePriority {
  /**
   * Urgent priority - Requires immediate attention
   * Typically: High balance, long overdue, or compliance risk
   */
  URGENT = 'URGENT',

  /**
   * High priority - Should be addressed soon
   * Typically: Significant balance or moderately overdue
   */
  HIGH = 'HIGH',

  /**
   * Medium priority - Normal workflow priority
   * Typically: Standard accounts in the collection process
   */
  MEDIUM = 'MEDIUM',

  /**
   * Low priority - Can be deferred if needed
   * Typically: Small balances or recently added accounts
   */
  LOW = 'LOW',
}
