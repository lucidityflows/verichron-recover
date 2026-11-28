/**
 * Communication Status Enum
 *
 * Tracks the lifecycle status of a communication.
 */
export enum CommunicationStatus {
  /**
   * Communication is being sent to gateway
   */
  SENDING = 'SENDING',

  /**
   * Communication was sent to gateway
   */
  SENT = 'SENT',

  /**
   * Communication was delivered to recipient
   */
  DELIVERED = 'DELIVERED',

  /**
   * Communication failed to send
   */
  FAILED = 'FAILED',

  /**
   * Email was opened by recipient
   */
  OPENED = 'OPENED',

  /**
   * Link in email was clicked
   */
  CLICKED = 'CLICKED',

  /**
   * Communication was blocked due to compliance rules
   */
  BLOCKED = 'BLOCKED',
}
