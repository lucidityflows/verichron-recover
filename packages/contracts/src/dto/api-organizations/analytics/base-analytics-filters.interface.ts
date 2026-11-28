import { DebtCategory, DebtStatus } from '@verichron/enums';

/**
 * Base Analytics Filters Interface
 * Common filtering parameters used across all analytics endpoints
 */
export interface IBaseAnalyticsFilters {
  // Time range
  startDate?: string;
  endDate?: string;

  // Portfolio filtering
  portfolioId?: string;
  portfolioTag?: string[];

  // Debt filtering
  debtCategory?: DebtCategory;
  debtStatus?: DebtStatus[];
}
