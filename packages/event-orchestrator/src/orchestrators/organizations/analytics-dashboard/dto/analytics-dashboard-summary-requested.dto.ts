import { AnalyticsDashboardSummaryRequestedPayload } from '@verichron/events';
import { IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * DTO for ANALYTICS_DASHBOARD_SUMMARY_REQUESTED event
 *
 * Published by api-organizations when a dashboard summary is requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsDashboardSummaryRequestedDto implements AnalyticsDashboardSummaryRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsString()
  @IsOptional()
  date?: string;
}
