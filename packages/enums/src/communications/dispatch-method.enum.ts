/**
 * Dispatch Method Enum
 *
 * Represents communication channels that can be AUTOMATED via gateway APIs.
 * These are methods that the dispatch service can send programmatically.
 *
 * - EMAIL: Automated via SendGrid/similar
 * - SMS: Automated via Twilio/similar
 * - LETTER: Automated via Lob.com/similar print-and-mail services
 *
 * Note: CALL is NOT included because it's a manual action by collectors,
 * not something that can be dispatched through an API gateway.
 */
export enum DispatchMethod {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  LETTER = 'LETTER',
}
