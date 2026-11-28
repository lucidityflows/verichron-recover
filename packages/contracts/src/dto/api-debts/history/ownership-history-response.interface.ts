/**
 * Contract for ownership history record response.
 */
export interface IOwnershipHistoryResponse {
  /**
   * Unique history record identifier
   */
  id: string;

  /**
   * Debt ID this record belongs to
   */
  debtId: string;

  /**
   * Organization that owned the debt
   */
  organizationId: string;

  /**
   * Date when organization acquired the debt (ISO 8601 date string)
   */
  acquiredDate: string;

  /**
   * Date when organization sold the debt (ISO 8601 date string, null if current owner)
   */
  soldDate: string | null;

  /**
   * Source of acquisition
   */
  source: string;

  /**
   * Computed: Number of days owned (null if still owned)
   */
  daysOwned: number | null;

  /**
   * Record creation timestamp (ISO 8601)
   */
  createdAt: string;
}
