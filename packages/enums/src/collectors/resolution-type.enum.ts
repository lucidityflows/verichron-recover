/**
 * Type of work queue item resolution
 */
export enum ResolutionType {
  /**
   * Debt paid in full
   */
  PAID_IN_FULL = 'PAID_IN_FULL',

  /**
   * Payment plan established and active
   */
  PAYMENT_PLAN = 'PAYMENT_PLAN',

  /**
   * Debt settled for less than full amount
   */
  SETTLED = 'SETTLED',

  /**
   * Dispute filed by debtor
   */
  DISPUTED = 'DISPUTED',

  /**
   * Transferred to another collector or agency
   */
  TRANSFERRED = 'TRANSFERRED',

  /**
   * Written off as uncollectible
   */
  WRITTEN_OFF = 'WRITTEN_OFF',

  /**
   * Account placed on hold (bankruptcy, deceased, etc.)
   */
  ON_HOLD = 'ON_HOLD',

  /**
   * Debtor proved debt is invalid
   */
  INVALID_DEBT = 'INVALID_DEBT',

  /**
   * Debtor outside statute of limitations
   */
  STATUTE_EXPIRED = 'STATUTE_EXPIRED',

  /**
   * Contact ceased per debtor request (FDCPA)
   */
  CEASE_AND_DESIST = 'CEASE_AND_DESIST',
}
