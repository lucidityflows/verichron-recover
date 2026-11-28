import { AnalyticsPortfolioPerformanceRequestedPayload } from '@verichron/events';
import { IsString, IsUUID, IsObject } from 'class-validator';
import { IPortfolioPerformanceQuery } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_PORTFOLIO_PERFORMANCE_REQUESTED event
 *
 * Published by api-organizations when portfolio performance is requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsPortfolioPerformanceRequestedDto implements AnalyticsPortfolioPerformanceRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  query: IPortfolioPerformanceQuery;
}
