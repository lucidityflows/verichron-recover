import { IRecoveryTrendDataPoint } from './recovery-trend-data-point.interface';

export interface IRecoveryTrendsResponse {
  orgId: string;
  startDate: string;
  endDate: string;
  granularity: string;
  groupBy?: string;
  // Single series (when groupBy = 'NONE' or not specified)
  trends?: IRecoveryTrendDataPoint[];
  // Multiple series (when groupBy is set to DEBT_CATEGORY or PORTFOLIO)
  trendsByGroup?: Record<string, IRecoveryTrendDataPoint[]>;
  totalCollected: string;
  avgRecoveryRate: number;
  generatedAt: string;
}
