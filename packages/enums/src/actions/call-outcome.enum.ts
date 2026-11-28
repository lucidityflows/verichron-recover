/**
 * Possible outcomes from a phone call attempt
 */
export enum CallOutcome {
  /**
   * Successfully spoke with the debtor
   */
  SPOKE_TO_DEBTOR = 'SPOKE_TO_DEBTOR',

  /**
   * Spoke to a third party (relative, employer, etc.)
   */
  SPOKE_TO_THIRD_PARTY = 'SPOKE_TO_THIRD_PARTY',

  /**
   * No answer received
   */
  NO_ANSWER = 'NO_ANSWER',

  /**
   * Left voicemail message
   */
  LEFT_VOICEMAIL = 'LEFT_VOICEMAIL',

  /**
   * Debtor refused to engage or hung up
   */
  REFUSED_TO_ENGAGE = 'REFUSED_TO_ENGAGE',

  /**
   * Debtor promised to make payment
   */
  PROMISED_PAYMENT = 'PROMISED_PAYMENT',

  /**
   * Debtor raised a dispute
   */
  DISPUTE_RAISED = 'DISPUTE_RAISED',

  /**
   * Number is disconnected or invalid
   */
  DISCONNECTED = 'DISCONNECTED',

  /**
   * Wrong number reached
   */
  WRONG_NUMBER = 'WRONG_NUMBER',
}
