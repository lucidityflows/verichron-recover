import type { SortOrder, PaymentStatus, PaymentType } from "@verichron/enums";

/**
 * Contract interface for querying transactions with filters and pagination.
 */
export interface IQueryTransactions {
  /**
   * Page number for pagination
   */
  page?: number;

  /**
   * Number of results per page
   */
  pageSize?: number;

  /**
   * Field to sort by
   */
  sortBy?: string;

  /**
   * Sort order
   */
  sortOrder?: SortOrder;

  /**
   * Filter by debt UUID
   */
  debtId?: string;

  /**
   * Filter by debtor UUID
   */
  debtorId?: string;

  /**
   * Filter by payment plan UUID
   */
  paymentPlanId?: string;

  /**
   * Filter by transaction status
   */
  status?: PaymentStatus;

  /**
   * Filter by transaction type
   */
  type?: PaymentType;

  /**
   * Filter by transactions created on or after this date
   */
  dateFrom?: string;

  /**
   * Filter by transactions created on or before this date
   */
  dateTo?: string;
}
