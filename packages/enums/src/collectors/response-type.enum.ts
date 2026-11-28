/**
 * Type of debtor response
 */
export enum ResponseType {
  /**
   * Debtor answered phone call
   */
  ANSWERED_CALL = 'ANSWERED_CALL',

  /**
   * Debtor replied to email
   */
  EMAIL_REPLY = 'EMAIL_REPLY',

  /**
   * Debtor replied to SMS
   */
  SMS_REPLY = 'SMS_REPLY',

  /**
   * Debtor made a payment
   */
  PAYMENT = 'PAYMENT',

  /**
   * Debtor requested callback
   */
  CALLBACK_REQUEST = 'CALLBACK_REQUEST',

  /**
   * Debtor visited payment portal
   */
  PORTAL_VISIT = 'PORTAL_VISIT',

  /**
   * Debtor set up payment plan
   */
  PAYMENT_PLAN_SETUP = 'PAYMENT_PLAN_SETUP',

  /**
   * Debtor filed dispute
   */
  DISPUTE_FILED = 'DISPUTE_FILED',

  /**
   * Debtor requested verification
   */
  VERIFICATION_REQUEST = 'VERIFICATION_REQUEST',
}
