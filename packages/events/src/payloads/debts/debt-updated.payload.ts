import { DebtStatus } from '@verichron/enums';

/**
 * Payload for DebtUpdated event
 *
 * Published when any mutable debt field is updated.
 * This is a catch-all event for property modifications.
 */
export interface DebtUpdatedPayload {
  debtId: string;
  organizationId: string;
  portfolioId: string;
  updatedBy: string;
  updatedAt: string;
  // Optional fields that might have been updated
  interestAmount?: string;
  feesAmount?: string;
  notes?: string | null;
  status?: DebtStatus;
}
