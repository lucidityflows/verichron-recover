import type { AnalyticsCollectorStatsCompletedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CollectorStatsResponseDto } from '../../../dashboards/collectors/dto/collector-stats-response.dto';

export class AnalyticsCollectorStatsCompletedDto implements AnalyticsCollectorStatsCompletedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  collectorUserId: string;

  @IsString()
  periodStart: string;

  @IsString()
  periodEnd: string;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CollectorStatsResponseDto)
  stats?: CollectorStatsResponseDto;

  @IsString()
  @IsOptional()
  error?: string;
}
