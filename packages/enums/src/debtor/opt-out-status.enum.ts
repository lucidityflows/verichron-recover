/**
 * Debtor opt-out status for communications
 * FDCPA compliance tracking
 */
export enum OptOutStatus {
  /**
   * No opt-out requests
   */
  NONE = 'NONE',

  /**
   * Opted out of email communications
   */
  EMAIL_OPT_OUT = 'EMAIL_OPT_OUT',

  /**
   * Opted out of SMS communications
   */
  SMS_OPT_OUT = 'SMS_OPT_OUT',

  /**
   * Opted out of phone calls (cease and desist)
   */
  CALL_OPT_OUT = 'CALL_OPT_OUT',

  /**
   * Opted out of all communications
   */
  ALL_OPT_OUT = 'ALL_OPT_OUT',
}
