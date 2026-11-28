import { IPortfolioPerformanceQuery } from '@verichron/contracts';

/**
 * Payload for ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED event
 * Published by api-organizations when portfolio performance analytics are requested.
 */
export interface AnalyticsPortfolioPerformanceRequestedPayload {
  organizationId: string;
  correlationId: string;
  query: IPortfolioPerformanceQuery;
}
