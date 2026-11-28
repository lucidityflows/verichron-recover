import { IPortfolioPerformanceResponse } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_PORTFOLIO_PERFORMANCE_COMPLETED event
 * Published by the AnalyticsPortfolioPerformanceOrchestrator when portfolio performance has been aggregated.
 */
export interface AnalyticsPortfolioPerformanceCompletedPayload {
  organizationId: string;
  correlationId: string;
  data?: IPortfolioPerformanceResponse;
  error?: string;
}
