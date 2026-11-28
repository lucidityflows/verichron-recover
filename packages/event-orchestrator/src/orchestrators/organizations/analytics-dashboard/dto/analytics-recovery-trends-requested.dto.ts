import { AnalyticsRecoveryTrendsRequestedPayload } from '@verichron/events';
import { IsString, IsUUID, IsObject } from 'class-validator';
import { IRecoveryTrendsQuery } from '@verichron/contracts';

/**
 * DTO for ANALYTICS_RECOVERY_TRENDS_REQUESTED event
 *
 * Published by api-organizations when recovery trends are requested.
 * Validated by event-orchestrator before processing.
 */
export class AnalyticsRecoveryTrendsRequestedDto implements AnalyticsRecoveryTrendsRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsString()
  correlationId: string;

  @IsObject()
  query: IRecoveryTrendsQuery;
}
