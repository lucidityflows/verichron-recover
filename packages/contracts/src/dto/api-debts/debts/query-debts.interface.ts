import { SortOrder, DebtStatus } from '@verichron/enums';

/**
 * Contract for querying debts with filters and pagination.
 *
 * All fields are optional - used to build filtered queries.
 */
export interface IQueryDebts {
  /**
   * Filter by debt status (single or multiple)
   */
  status?: DebtStatus | DebtStatus[];

  /**
   * Filter by portfolio ID
   */
  portfolioId?: string;

  /**
   * Filter by minimum current balance
   */
  minBalance?: number;

  /**
   * Filter by maximum current balance
   */
  maxBalance?: number;

  /**
   * Search across account number and creditor name
   */
  search?: string;

  /**
   * Filter by debtor ID (finds debts associated with this debtor)
   */
  debtorId?: string;

  /**
   * Page number (1-indexed, defaults to 1)
   */
  page?: number;

  /**
   * Number of results per page (defaults to 20, max 100)
   */
  limit?: number;

  /**
   * Field to sort by (defaults to created_at)
   */
  orderBy?: string;

  /**
   * Sort order (defaults to DESC)
   */
  order?: SortOrder;
}
