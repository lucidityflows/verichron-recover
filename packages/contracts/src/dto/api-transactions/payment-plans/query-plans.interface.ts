import type { PaymentPlanStatus, SortOrder } from "@verichron/enums";

/**
 * Contract interface for querying payment plans with filters and pagination.
 */
export interface IQueryPlans {
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
   * Filter by debtor UUID
   */
  debtorId?: string;

  /**
   * Filter by payment plan status
   */
  status?: PaymentPlanStatus;

  /**
   * Filter by plans created on or after this date
   */
  dateFrom?: string;

  /**
   * Filter by plans created on or before this date
   */
  dateTo?: string;
}
