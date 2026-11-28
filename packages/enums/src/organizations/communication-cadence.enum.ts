/**
 * Communication cadence for organization settings
 * Defines how frequently the organization communicates with debtors
 */
export enum CommunicationCadence {
  /**
   * Daily communication attempts
   */
  DAILY = 'DAILY',

  /**
   * Weekly communication attempts
   */
  WEEKLY = 'WEEKLY',

  /**
   * Bi-weekly (every two weeks) communication attempts
   */
  BIWEEKLY = 'BIWEEKLY',

  /**
   * Monthly communication attempts
   */
  MONTHLY = 'MONTHLY',
}
