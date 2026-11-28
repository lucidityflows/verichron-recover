import { PortfolioStatus } from "@verichron/enums";

/**
 * Contract for querying portfolios with filters and pagination.
 *
 * All fields are optional - used to build filtered queries.
 */
export interface IQueryPortfolios {
  /**
   * Filter by portfolio status (single or multiple)
   */
  status?: PortfolioStatus | PortfolioStatus[];

  /**
   * Filter by minimum purchase price
   */
  minPurchasePrice?: number;

  /**
   * Filter by maximum purchase price
   */
  maxPurchasePrice?: number;

  /**
   * Search across portfolio name and source
   */
  search?: string;

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
  order?: 'ASC' | 'DESC';
}
