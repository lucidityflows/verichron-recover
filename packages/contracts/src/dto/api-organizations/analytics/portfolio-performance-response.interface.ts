import { IPortfolioPerformance } from './portfolio-performance.interface';

/**
 * Portfolio Performance analytics response
 *
 * NOTE: Currency fields (totalInvested, totalPaymentsCollected) are strings.
 * See CURRENCY FIELD RATIONALE in IPortfolioPerformance interface for detailed explanation.
 */
export interface IPortfolioPerformanceResponse {
  /** Organization ID */
  orgId: string;

  /** Total number of portfolios (before pagination) */
  totalPortfolios: number;

  /** Portfolio performance data (paginated) */
  portfolios: IPortfolioPerformance[];

  /**
   * Overall recovery rate across all portfolios (percentage 0-100)
   * Calculated: (totalPaymentsCollected / sum of all principals) * 100
   */
  overallRecoveryRate: number;

  /**
   * Total amount invested across all portfolios as decimal string
   * Sum of all portfolio purchase prices
   * Example: "2500000.00"
   */
  totalInvested: string;

  /**
   * Total amount collected across all portfolios as decimal string
   * Sum of all payments received
   * Example: "950000.00"
   */
  totalPaymentsCollected: string;

  /** Current page number (1-indexed) */
  page: number;

  /** Number of portfolios per page */
  pageSize: number;

  /** Total number of pages available */
  totalPages: number;

  /** ISO 8601 timestamp when report was generated */
  generatedAt: string;
}
