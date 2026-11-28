/**
 * Types of actions that can be logged for a debtor
 */
export enum ActionType {
  /**
   * General note or comment
   */
  NOTE = 'NOTE',

  /**
   * Phone call attempt or completion
   */
  CALL = 'CALL',

  /**
   * Email sent or received
   */
  EMAIL = 'EMAIL',

  /**
   * SMS/text message sent
   */
  SMS = 'SMS',

  /**
   * Physical letter sent
   */
  LETTER = 'LETTER',

  /**
   * Payment received or logged
   */
  PAYMENT = 'PAYMENT',

  /**
   * Payment plan setup or modified
   */
  PAYMENT_PLAN_SETUP = 'PAYMENT_PLAN_SETUP',

  /**
   * Dispute filed by debtor
   */
  DISPUTE_FILED = 'DISPUTE_FILED',

  /**
   * Follow-up action scheduled
   */
  FOLLOW_UP = 'FOLLOW_UP',

  /**
   * Account deferred for future action
   */
  DEFER = 'DEFER',

  /**
   * Tag added or removed
   */
  TAG = 'TAG',

  /**
   * Account assigned to collector
   */
  ASSIGN = 'ASSIGN',

  /**
   * Settlement request submitted for approval
   */
  SETTLEMENT_REQUEST = 'SETTLEMENT_REQUEST',

  /**
   * Settlement request approved by team lead
   */
  SETTLEMENT_APPROVED = 'SETTLEMENT_APPROVED',

  /**
   * Settlement request rejected by team lead
   */
  SETTLEMENT_REJECTED = 'SETTLEMENT_REJECTED',

  PROMISE = 'PROMISE'
}
