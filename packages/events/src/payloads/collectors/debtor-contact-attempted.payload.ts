import { ActionType, CallOutcome } from '@verichron/enums';

/**
 * Payload for COLLECTORS.DEBTOR_CONTACT_ATTEMPTED event
 * Published by: api-collectors
 * Consumed by: api-collectors (response tracking), api-analytics
 */
export interface DebtorContactAttemptedPayload {
  /**
   * UUID of the debtor
   */
  debtorId: string;

  /**
   * UUID of the organization
   */
  organizationId: string;

  /**
   * UUID of the collector user
   */
  collectorUserId: string;

  /**
   * Type of contact attempt
   */
  actionType: ActionType;

  /**
   * Date/time when contact was attempted (ISO 8601)
   */
  contactDate: string;

  /**
   * Outcome of the attempt (for calls)
   */
  outcome?: CallOutcome;

  /**
   * Additional notes
   */
  notes?: string;

  /**
   * Timestamp of next scheduled action (ISO 8601)
   */
  nextActionDue?: string;

  /**
   * Timestamp when event was generated (ISO 8601)
   */
  attemptedAt: string;
}
