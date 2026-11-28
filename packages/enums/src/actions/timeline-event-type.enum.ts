/**
 * Timeline event types for debtor focus view
 * Used for UI categorization and display
 */
export enum TimelineEventType {
  /**
   * Contact attempt (call, email, SMS, letter)
   */
  CONTACT_ATTEMPT = 'CONTACT_ATTEMPT',

  /**
   * Payment received
   */
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',

  /**
   * Note added to account
   */
  NOTE_ADDED = 'NOTE_ADDED',

  /**
   * Debt or account status changed
   */
  STATUS_CHANGE = 'STATUS_CHANGE',

  /**
   * Document uploaded to account
   */
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',

  /**
   * Dispute filed by debtor
   */
  DISPUTE_FILED = 'DISPUTE_FILED',

  /**
   * Automated system action performed
   */
  AUTOMATED_ACTION = 'AUTOMATED_ACTION',

  /**
   * Follow-up action scheduled
   */
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',

  /**
   * Payment plan created or modified
   */
  PAYMENT_PLAN_CREATED = 'PAYMENT_PLAN_CREATED',

  /**
   * Assignment changed
   */
  ASSIGNMENT_CHANGED = 'ASSIGNMENT_CHANGED',
}
