import type { AnalyticsCollectorLeaderboardCompletedPayload } from '@verichron/events';
import { TrendGranularity } from '@verichron/enums';
import { IsUUID, IsOptional, IsEnum, IsNumber, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CollectorLeaderboardResponseDto } from '../../../dashboards/collectors/dto/collector-leaderboard-response.dto';

export class AnalyticsCollectorLeaderboardCompletedDto implements AnalyticsCollectorLeaderboardCompletedPayload {
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

  @IsOptional()
  @ValidateNested()
  @Type(() => CollectorLeaderboardResponseDto)
  leaderboard?: CollectorLeaderboardResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
