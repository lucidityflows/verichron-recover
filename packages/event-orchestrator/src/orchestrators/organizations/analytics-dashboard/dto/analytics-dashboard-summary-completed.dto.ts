import { AnalyticsDashboardSummaryCompletedPayload, DashboardSummaryPayload } from '@verichron/events';
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for ANALYTICS_DASHBOARD_SUMMARY_COMPLETED event
 *
 * Published by the AnalyticsOrchestrator when a dashboard summary has been aggregated.
 * Validated by api-organizations when received.
 */
export class AnalyticsDashboardSummaryCompletedDto implements AnalyticsDashboardSummaryCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  @IsOptional()
  summary?: DashboardSummaryPayload;

  @IsString()
  @IsOptional()
  error?: string;
}
