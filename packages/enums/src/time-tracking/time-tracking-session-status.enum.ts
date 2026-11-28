/**
 * Time Tracking Session Status
 *
 * Represents the current state of a collector's time tracking session.
 */
export enum TimeTrackingSessionStatus {
  /**
   * Session is currently active - collector is working
   */
  ACTIVE = 'ACTIVE',

  /**
   * Session is paused - collector is on break or idle
   */
  PAUSED = 'PAUSED',

  /**
   * Session has been completed/ended
   */
  COMPLETED = 'COMPLETED',
}
