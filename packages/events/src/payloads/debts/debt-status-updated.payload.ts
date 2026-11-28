import { DebtStatus } from '@verichron/enums';

/**
 * Payload for DebtStatusUpdated event
 */
export interface DebtStatusUpdatedPayload {
  debtId: string;
  oldStatus: DebtStatus;
  newStatus: DebtStatus;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}
