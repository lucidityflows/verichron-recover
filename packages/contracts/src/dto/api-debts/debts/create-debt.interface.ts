import { DebtStatus } from '@verichron/enums';

/**
 * Contract for creating a new debt record.
 *
 * Represents the data required to create a debt account in the system.
 * Used by both UI and API to ensure data consistency.
 */
export interface ICreateDebt {
  /**
   * Portfolio this debt belongs to
   */
  portfolioId: string;

  /**
   * Name of the original creditor who extended credit
   */
  originalCreditorName: string;

  /**
   * Unique account number from the original creditor
   */
  accountNumber: string;

  /**
   * Original principal amount (before interest/fees)
   */
  principalAmount: number;

  /**
   * Accrued interest amount (optional, defaults to 0)
   */
  interestAmount?: number;

  /**
   * Fees and charges amount (optional, defaults to 0)
   */
  feesAmount?: number;

  /**
   * Initial status for the debt
   */
  status: DebtStatus;

  /**
   * Date when the original debt was incurred (ISO 8601 date string)
   */
  originalDebtDate: string;

  /**
   * IDs of debtor profiles associated with this debt (co-debtors, co-signers)
   */
  debtorProfileIds: string[];

  /**
   * Optional notes or comments
   */
  notes?: string;
}
