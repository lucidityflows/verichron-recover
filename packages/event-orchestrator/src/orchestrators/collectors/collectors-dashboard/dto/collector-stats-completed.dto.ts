import { IsString, IsUUID, IsOptional, IsObject, IsISO8601 } from 'class-validator';
import type { AnalyticsCollectorStatsCompletedPayload, CollectorStats } from '@verichron/events';

/**
 * Analytics Collector Stats Completed Event Payload
 *
 * Published by event orchestrator after aggregating collector stats from all services.
 * Contains comprehensive performance metrics for the collector.
 */
export class AnalyticsCollectorStatsCompletedDto implements AnalyticsCollectorStatsCompletedPayload {
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

  @IsObject()
  @IsOptional()
  stats?: CollectorStats;

  @IsString()
  @IsOptional()
  error?: string;
}
