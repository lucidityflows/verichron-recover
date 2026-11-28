import { DebtStatus } from '@verichron/enums';

/**
 * Payload for DebtStatusChanged event
 *
 * Published when debt status transitions through its lifecycle.
 * This is more significant than a simple update as it represents
 * workflow state changes that other services may care about.
 */
export interface DebtStatusChangedPayload {
  debtId: string;
  organizationId: string;
  portfolioId: string;
  oldStatus: DebtStatus;
  newStatus: DebtStatus;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
}
