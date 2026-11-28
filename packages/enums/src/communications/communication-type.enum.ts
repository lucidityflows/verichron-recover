/**
 * Communication Type Enum
 *
 * Types of communication channels available for debtor contact.
 */
export enum CommunicationType {
  /**
   * Email communication
   */
  EMAIL = 'EMAIL',

  /**
   * SMS text message
   */
  SMS = 'SMS',

  /**
   * Physical letter
   */
  LETTER = 'LETTER',

  /**
   * Phone call (manual or automated)
   */
  CALL = 'CALL',
}
