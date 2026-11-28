/**
 * Communication Provider Enum
 *
 * Defines the external gateway providers used for dispatching communications.
 */
export enum CommunicationProvider {
  /**
   * SendGrid - Email gateway
   */
  SENDGRID = 'SENDGRID',

  /**
   * Twilio - SMS gateway
   */
  TWILIO = 'TWILIO',

  /**
   * Mock provider - Used for testing
   */
  MOCK = 'MOCK',
}
