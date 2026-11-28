import { TrendGranularity, AnalyticsGroupBy } from "@verichron/enums";
import { IBaseAnalyticsFilters } from './base-analytics-filters.interface';

export interface IRecoveryTrendsQuery extends IBaseAnalyticsFilters {
  granularity?: TrendGranularity;
  groupBy?: AnalyticsGroupBy;
}
