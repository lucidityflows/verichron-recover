import { AnalyticsPortfolioPerformanceCompletedPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { IPortfolioPerformanceResponse } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_PORTFOLIO_PERFORMANCE_COMPLETED event
 *
 * Published by event-orchestrator when portfolio performance has been aggregated.
 * Consumed by api-organizations to return data to the client.
 */
export class AnalyticsPortfolioPerformanceCompletedDto implements AnalyticsPortfolioPerformanceCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsOptional()
  @IsObject()
  data?: IPortfolioPerformanceResponse;

  @IsOptional()
  @IsString()
  error?: string;
}
