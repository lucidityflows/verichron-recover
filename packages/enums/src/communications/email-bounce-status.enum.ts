/**
 * Status of an email's deliverability, indicating bounce or validity.
 */
export enum EmailBounceStatus {
  VALID = 'VALID',
  BOUNCED = 'BOUNCED',
  SOFT_BOUNCE = 'SOFT_BOUNCE',
  HARD_BOUNCE = 'HARD_BOUNCE', // Corrected from HARD_BOUNCE
  COMPLAINED = 'COMPLAINED',
  UNKNOWN = 'UNKNOWN',
}
