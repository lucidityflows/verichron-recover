
/**
 * Contract for creating an ownership history record.
 *
 * Represents a period of ownership for a debt.
 * Used internally by imports and portfolios modules.
 */
export interface ICreateOwnershipHistory {
  /**
   * Debt ID this history record belongs to
   */
  debtId: string;

  /**
   * Organization ID that owned the debt during this period
   */
  organizationId: string;

  /**
   * Date when organization acquired the debt (ISO 8601 date string)
   */
  acquiredDate: string;

  /**
   * Date when organization sold the debt (ISO 8601 date string, null if current owner)
   */
  soldDate?: string | null;

  /**
   * Source of acquisition (e.g., "PORTFOLIO_IMPORT", "PORTFOLIO_TRANSFER")
   */
  source: string;
}



