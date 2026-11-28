import type { AnalyticsCollectorLeaderboardRequestedPayload } from '@verichron/events';
import { TrendGranularity } from '@verichron/enums';
import { IsUUID, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class AnalyticsCollectorLeaderboardRequestedDto implements AnalyticsCollectorLeaderboardRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  collectorUserId: string;

  @IsEnum(TrendGranularity)
  period: TrendGranularity;

  @IsNumber()
  @Min(1)
  pageSize: number;

  @IsUUID()
  @IsOptional()
  correlationId?: string;
}
