import { IBaseAnalyticsFilters } from './base-analytics-filters.interface';
import { PortfolioSortField, SortOrder } from '@verichron/enums';

/**
 * Query parameters for Portfolio Performance analytics
 */
export interface IPortfolioPerformanceQuery extends IBaseAnalyticsFilters {
  /**
   * Sort field for portfolio ranking
   * @default PortfolioSortField.RECOVERY_RATE
   */
  sortBy?: PortfolioSortField;

  /**
   * Sort order
   * @default SortOrder.DESC
   */
  sortOrder?: SortOrder;

  /**
   * Page number for pagination
   * @default 1
   */
  page?: number;

  /**
   * Number of portfolios per page
   * @default 20
   */
  pageSize?: number;
}
