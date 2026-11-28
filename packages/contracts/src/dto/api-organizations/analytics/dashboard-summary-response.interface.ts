import { ITimeFramedMetric } from './time-framed-metric.interface';
import { IStatusCounts } from './status-counts.interface';
import { ITopPortfolio } from './top-portfolio.interface';

export interface IDashboardSummaryResponse {
  totalPortfolios: number;
  totalDebts: number;
  totalDebtors: number;
  totalInvested: ITimeFramedMetric[];
  totalCollected: ITimeFramedMetric[];
  totalOutstanding: number;
  overallRecoveryRate: number;
  statusCounts: IStatusCounts;
  todayCollections: number;
  todayPaymentPlans: number;
  todayContacts: number;
  yesterdayCollections: number;
  yesterdayPaymentPlans: number;
  yesterdayContacts: number;
  topPortfolios: ITopPortfolio[];
  generatedAt: Date;
}
