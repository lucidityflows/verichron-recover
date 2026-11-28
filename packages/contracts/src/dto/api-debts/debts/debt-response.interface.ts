import { DebtStatus } from '@verichron/enums';
import { IPaginatedResponse } from '../../core/pagination.interface';

/**
 * Contract for debt response data.
 *
 * Represents a complete debt record returned by the API.
 */
export interface IDebtResponse {
  /**
   * Unique debt identifier
   */
  id: string;

  /**
   * Organization that owns this debt
   */
  organizationId: string;

  /**
   * Portfolio this debt belongs to
   */
  portfolioId: string;

  /**
   * Original creditor name
   */
  originalCreditorName: string;

  /**
   * Account number from original creditor
   */
  accountNumber: string;

  /**
   * Principal amount (original debt amount)
   */
  principalAmount: string;

  /**
   * Accrued interest amount
   */
  interestAmount: string;

  /**
   * Fees and charges
   */
  feesAmount: string;

  /**
   * Current outstanding balance (calculated)
   */
  currentBalance: string;

  /**
   * Current debt status
   */
  status: DebtStatus;

  /**
   * Date when original debt was incurred (ISO 8601)
   */
  originalDebtDate: string;

  /**
   * Date of last payment received (ISO 8601, null if no payments)
   */
  lastPaymentDate: string | null;

  /**
   * IDs of associated debtor profiles
   */
  debtorProfileIds: string[];

  /**
   * Optional notes
   */
  notes: string | null;

  /**
   * Record creation timestamp (ISO 8601)
   */
  createdAt: string;

  /**
   * Record last update timestamp (ISO 8601)
   */
  updatedAt: string;
}

/**
 * Contract for paginated debt query results.
 */
export interface IPaginatedDebtResponse extends IPaginatedResponse<IDebtResponse> {}
