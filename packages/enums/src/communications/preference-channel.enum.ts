/**
 * Preference Channel Enum
 *
 * Represents communication channels that debtors can control via preferences.
 * These are channels where debtors can opt-in/opt-out and set delivery preferences.
 *
 * - EMAIL: Can opt-out, set preferred times, etc.
 * - SMS: Can opt-out (TCPA requirements), set preferred times
 * - LETTER: Can opt-out, set mailing preferences
 *
 * Note: CALL is NOT included because calls have different regulatory requirements
 * (FDCPA Section 805) and are typically handled through do-not-call lists rather
 * than preference channels.
 */
export enum PreferenceChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  LETTER = 'LETTER',
}
