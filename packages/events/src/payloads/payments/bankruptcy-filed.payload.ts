import { BankruptcyChapter } from '@verichron/enums';

/**
 * Payload for BankruptcyFiled event
 *
 * CRITICAL: This event triggers automatic stay enforcement.
 * All collection activities MUST cease immediately upon receipt.
 */
export interface BankruptcyFiledPayload {
  bankruptcyFilingId: string;
  debtorProfileId: string;
  debtId: string | null;
  organizationId: string;
  chapter: BankruptcyChapter;
  caseNumber: string;
  courtDistrict: string;
  filingDate: string;
  debtIncludedInSchedules: boolean;
  filedAt: string;
}
