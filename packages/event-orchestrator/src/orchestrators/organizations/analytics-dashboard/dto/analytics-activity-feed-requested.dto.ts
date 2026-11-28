import { IsString, IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { AnalyticsActivityFeedRequestedPayload } from '@verichron/events';

export class AnalyticsActivityFeedRequestedDto implements AnalyticsActivityFeedRequestedPayload {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
