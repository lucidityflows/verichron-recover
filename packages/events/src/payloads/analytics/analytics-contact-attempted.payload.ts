import { ActionType } from '@verichron/enums';

/**
 * Payload for CollectorDebtorContactAttempted event
 *
 * Published when a collector attempts to contact a debtor.
 * Used by api-workqueue to update last contact information.
 */
export interface CollectorDebtorContactAttemptedPayload {
  debtorId: string;
  organizationId: string;
  collectorUserId: string;
  actionType: ActionType;
  contactDate: string; // ISO 8601
  outcome?: string;
  notes?: string;
  nextActionDue?: string; // ISO 8601
  attemptedAt: string; // ISO 8601
}
