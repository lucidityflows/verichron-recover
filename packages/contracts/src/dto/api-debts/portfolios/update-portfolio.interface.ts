import { PortfolioStatus } from "@verichron/enums";

/**
 * Contract for updating a portfolio record.
 *
 * All fields are optional - only provided fields will be updated.
 */
export interface IUpdatePortfolio {
  /**
   * Update portfolio name
   */
  name?: string;

  /**
   * Update purchase date (ISO 8601 date string)
   */
  purchaseDate?: string;

  /**
   * Update purchase price
   */
  purchasePrice?: number;

  /**
   * Update total principal (recalculated when debts change)
   */
  totalPrincipal?: number;

  /**
   * Update source information
   */
  source?: string;

  /**
   * Update status (must follow valid status transitions)
   */
  status?: PortfolioStatus;
}
