import { BankruptcyStatus } from '@verichron/enums';

/**
 * Payload for BankruptcyStatusUpdated event
 */
export interface BankruptcyStatusUpdatedPayload {
  bankruptcyFilingId: string;
  debtorProfileId: string;
  debtId: string | null;
  organizationId: string;
  caseNumber: string;
  oldStatus: BankruptcyStatus;
  newStatus: BankruptcyStatus;
  statusDate: string;
  debtDischarged: boolean;
  updatedAt: string;
}
