import { IsString, IsUUID, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { TrendGranularity } from '@verichron/enums';
import type { AnalyticsCollectorLeaderboardRequestedPayload } from '@verichron/events';

/**
 * Analytics Collector Leaderboard Requested Event Payload
 *
 * Published by api-collectors when requesting leaderboard rankings.
 * Triggers event orchestrator to aggregate and rank all collectors in the organization.
 *
 * Team Filtering:
 * - If teamId is provided, leaderboard is filtered to only include team members
 * - Orchestrator queries api-organizations for team membership
 */
export class AnalyticsCollectorLeaderboardRequestedDto implements AnalyticsCollectorLeaderboardRequestedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  collectorUserId!: string;

  @IsEnum(TrendGranularity)
  period!: TrendGranularity;

  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize!: number;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
