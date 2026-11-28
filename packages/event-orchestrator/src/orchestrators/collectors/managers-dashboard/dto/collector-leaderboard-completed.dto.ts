import { IsString, IsUUID, IsOptional, IsObject, IsEnum, IsNumber } from 'class-validator';
import { TrendGranularity } from '@verichron/enums';
import type { AnalyticsCollectorLeaderboardCompletedPayload, CollectorLeaderboard } from '@verichron/events';

/**
 * Analytics Collector Leaderboard Completed Event Payload
 *
 * Published by event orchestrator after aggregating and ranking collector performance.
 * Contains ranked list of collectors with performance metrics.
 */
export class AnalyticsCollectorLeaderboardCompletedDto implements AnalyticsCollectorLeaderboardCompletedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  collectorUserId!: string;

  @IsEnum(TrendGranularity)
  period!: TrendGranularity;

  @IsNumber()
  pageSize!: number;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsObject()
  @IsOptional()
  leaderboard?: CollectorLeaderboard;

  @IsString()
  @IsOptional()
  error?: string;
}
