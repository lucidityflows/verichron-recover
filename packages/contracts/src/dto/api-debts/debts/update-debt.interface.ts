import { DebtStatus } from '@verichron/enums';

/**
 * Contract for updating a debt record.
 *
 * All fields are optional - only provided fields will be updated.
 * Some fields may be restricted based on user permissions.
 */
export interface IUpdateDebt {
  /**
   * Update debt status (must follow valid status transitions)
   */
  status?: DebtStatus;

  /**
   * Update interest amount (requires debt:update permission)
   */
  interestAmount?: number;

  /**
   * Update fees amount (requires debt:update permission)
   */
  feesAmount?: number;

  /**
   * Update notes (allowed with debt:update:notes permission)
   */
  notes?: string;
}
