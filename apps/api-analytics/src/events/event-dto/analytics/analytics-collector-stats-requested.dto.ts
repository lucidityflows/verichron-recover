import type { AnalyticsCollectorStatsRequestedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AnalyticsCollectorStatsRequestedDto implements AnalyticsCollectorStatsRequestedPayload {
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
}
