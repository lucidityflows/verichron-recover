import { IBaseAnalyticsFilters } from './base-analytics-filters.interface';
import { FlowDimension } from '@verichron/enums';

/**
 * Query parameters for Flow Analytics (Sankey diagram)
 */
export interface IFlowAnalyticsQuery extends IBaseAnalyticsFilters {
  /**
   * Flow dimension to visualize
   * - PAYMENT_METHOD: Group transactions by payment method
   * - DEBT_CATEGORY: Group debts by category
   * - PORTFOLIO: Group debts by portfolio
   * - STATE: Group by debtor state (requires api-debtors integration)
   * - STATUS_TRANSITION: Show debt status transitions over time
   */
  view: FlowDimension;

  /**
   * Minimum flow value to display (filters small flows)
   * @default 0
   */
  minValue?: number;
}
