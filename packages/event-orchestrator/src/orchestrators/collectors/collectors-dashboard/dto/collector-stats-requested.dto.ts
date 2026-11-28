import { IsString, IsUUID, IsOptional, IsISO8601 } from 'class-validator';
import type { AnalyticsCollectorStatsRequestedPayload } from '@verichron/events';

/**
 * Analytics Collector Stats Requested Event Payload
 *
 * Published by api-collectors when requesting collector performance statistics.
 * Triggers event orchestrator to fetch stats from api-communications, api-transactions, and api-collectors.
 */
export class AnalyticsCollectorStatsRequestedDto implements AnalyticsCollectorStatsRequestedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  collectorUserId!: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
