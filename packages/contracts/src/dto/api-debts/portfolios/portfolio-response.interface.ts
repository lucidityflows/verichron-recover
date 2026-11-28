import { PortfolioStatus } from "@verichron/enums";
import { IPaginatedResponse } from '../../core/pagination.interface';

/**
 * Contract for portfolio response data.
 *
 * Represents a complete portfolio record returned by the API.
 */
export interface IPortfolioResponse {
  /**
   * Unique portfolio identifier
   */
  id: string;

  /**
   * Organization that owns this portfolio
   */
  organizationId: string;

  /**
   * Portfolio name/identifier
   */
  name: string;

  /**
   * Portfolio status
   */
  status: PortfolioStatus;

  /**
   * Date when portfolio was acquired (ISO 8601 date string)
   */
  purchaseDate: string;

  /**
   * Amount paid to acquire the portfolio
   */
  purchasePrice: string;

  /**
   * Total principal of all debts in portfolio
   */
  totalPrincipal: string;

  /**
   * Source/origin of the portfolio
   */
  source: string;

  /**
   * Number of debts in this portfolio
   */
  debtCount: number;

  /**
   * Total current balance of all debts
   */
  totalCurrentBalance: string;

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
 * Contract for paginated portfolio query results.
 */
export interface IPaginatedPortfolioResponse extends IPaginatedResponse<IPortfolioResponse> {}

/**
 * Contract for portfolio user access information.
 */
export interface IPortfolioUserAccess {
  /**
   * User ID who has access
   */
  userId: string;

  /**
   * Timestamp when access was granted (ISO 8601)
   */
  grantedAt: string;
}
