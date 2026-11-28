import type { DocumentType, SortOrder } from "@verichron/enums";

/**
 * Contract interface for querying transaction documents with filters and pagination.
 *
 * All filters are optional and combined with AND logic.
 */
export interface IQueryTransactionDocuments {
  /**
   * Page number for pagination
   */
  page?: number;

  /**
   * Number of results per page
   */
  pageSize?: number;

  /**
   * Filter by debtor ID
   */
  debtorId?: string;

  /**
   * Filter by document type
   */
  documentType?: DocumentType;

  /**
   * Filter by associated payment plan ID
   */
  associatedPlanId?: string;

  /**
   * Filter by associated transaction ID
   */
  associatedTransactionId?: string;

  /**
   * Filter by associated debt ID
   */
  associatedDebtId?: string;

  /**
   * Filter by documents created on or after this date
   */
  dateFrom?: string;

  /**
   * Filter by documents created on or before this date
   */
  dateTo?: string;

  /**
   * Field to sort by
   */
  sortBy?: string;

  /**
   * Sort order
   */
  sortOrder?: SortOrder;
}
