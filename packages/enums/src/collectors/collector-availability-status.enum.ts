/**
 * Collector availability status enumeration
 * Tracks whether a collector is currently available for new assignments
 */
export enum CollectorAvailabilityStatus {
  /**
   * Collector is available and can receive new assignments
   */
  AVAILABLE = 'AVAILABLE',

  /**
   * Collector is busy with current work but still logged in
   */
  BUSY = 'BUSY',

  /**
   * Collector is on break (lunch, coffee, etc.)
   */
  ON_BREAK = 'ON_BREAK',

  /**
   * Collector is offline/logged out
   */
  OFFLINE = 'OFFLINE',
}
